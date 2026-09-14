'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createSoundEngine, type Cue, type SoundEngine } from './sound-engine';
const PREFERENCE_KEY = 'matias.sound';
const AudioContextState = createContext<{
  enabled: boolean;
  toggle: () => void;
  play: (cue: Cue) => void;
}>({ enabled: true, toggle: () => {}, play: () => {} });
export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const engine = useRef<SoundEngine | null>(null);
  const pendingBootUntil = useRef(0);
  const pendingCue = useRef<{ cue: Cue; expiresAt: number } | null>(null);
  const last = useRef(0);

  const getEngine = useCallback(() => {
    engine.current ??= createSoundEngine();
    return engine.current;
  }, []);

  const playPending = useCallback((audio: SoundEngine) => {
    if (engine.current !== audio || audio.context.state !== 'running' || !enabledRef.current)
      return;
    const now = performance.now();
    const cue = pendingBootUntil.current > now ? 'boot' : pendingCue.current;
    pendingBootUntil.current = 0;
    pendingCue.current = null;
    if (cue === 'boot') {
      last.current = now;
      audio.play(cue);
    } else if (cue && cue.expiresAt > now) {
      last.current = now;
      audio.play(cue.cue);
    }
  }, []);

  const play = useCallback(
    (cue: Cue) => {
      try {
        // Children can request a cue before the provider's mount effect.
        let savedMute = false;
        try {
          savedMute = localStorage.getItem(PREFERENCE_KEY) === 'off';
        } catch {}
        if (!enabledRef.current || savedMute) return;
        const now = performance.now();
        if (cue !== 'boot' && now - last.current < 70) return;
        const audio = getEngine();
        if (audio.context.state !== 'running') {
          if (cue === 'boot') pendingBootUntil.current = now + 3600;
          else pendingCue.current = { cue, expiresAt: now + 250 };
          void audio.context
            .resume()
            .then(() => playPending(audio))
            .catch(() => {});
          return;
        }
        pendingBootUntil.current = 0;
        pendingCue.current = null;
        last.current = now;
        audio.play(cue);
      } catch {
        // Audio support or autoplay denial must never block navigation.
      }
    },
    [getEngine, playPending],
  );

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    pendingBootUntil.current = 0;
    pendingCue.current = null;
    try {
      localStorage.setItem(PREFERENCE_KEY, next ? 'on' : 'off');
    } catch {}
    engine.current?.setMuted(!next);
    if (next) play('open');
  }, [play]);

  useEffect(() => {
    let preference = true;
    try {
      preference = localStorage.getItem(PREFERENCE_KEY) !== 'off';
    } catch {}
    enabledRef.current = preference;
    engine.current?.setMuted(!preference);
    const frame = requestAnimationFrame(() => setEnabled(preference));
    const unlock = (event: Event) => {
      if (!enabledRef.current) return;
      if (event.target instanceof Element && event.target.closest('.sound-toggle, .startup-mute'))
        return;
      try {
        const audio = getEngine();
        void audio.context
          .resume()
          .then(() => playPending(audio))
          .catch(() => {});
      } catch {}
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      const audio = engine.current;
      engine.current = null;
      pendingBootUntil.current = 0;
      pendingCue.current = null;
      void audio?.context.close().catch(() => {});
    };
  }, [getEngine, playPending]);
  return (
    <AudioContextState.Provider value={{ enabled, toggle, play }}>
      {children}
    </AudioContextState.Provider>
  );
}
export const useSound = () => useContext(AudioContextState);
