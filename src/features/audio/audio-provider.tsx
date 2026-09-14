'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
type Cue = 'select' | 'open' | 'close' | 'boot';
const AudioContextState = createContext<{
  enabled: boolean;
  toggle: () => void;
  play: (cue: Cue) => void;
}>({ enabled: false, toggle: () => {}, play: () => {} });
export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const last = useRef(0);
  useEffect(
    () => () => {
      void context.current?.close();
    },
    [],
  );
  function play(cue: Cue, force = false) {
    if (!enabled && !force) return;
    const now = Date.now();
    if (now - last.current < 65) return;
    last.current = now;
    try {
      const audio = context.current ?? new AudioContext();
      context.current = audio;
      void audio.resume();
      const notes =
        cue === 'boot'
          ? [261.63, 392, 523.25, 659.25]
          : cue === 'open'
            ? [440, 659.25]
            : cue === 'close'
              ? [392, 293.66]
              : [740];
      notes.forEach((hz, i) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        const time = audio.currentTime + i * (cue === 'boot' ? 0.115 : 0.04);
        const duration = cue === 'boot' ? 0.6 : 0.13;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(hz, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(cue === 'boot' ? 0.028 : 0.018, time + 0.009);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(time);
        osc.stop(time + duration + 0.01);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      });
    } catch {}
  }
  function toggle() {
    if (!enabled) play('open', true);
    setEnabled(!enabled);
  }
  return (
    <AudioContextState.Provider value={{ enabled, toggle, play }}>
      {children}
    </AudioContextState.Provider>
  );
}
export const useSound = () => useContext(AudioContextState);
