export type Cue = 'select' | 'open' | 'close' | 'boot';
export type SoundEngine = {
  context: AudioContext;
  play: (cue: Cue) => void;
  setMuted: (muted: boolean) => void;
};

/** Original synthesized score: glass attacks, a soft fifth, and a short stereo tail. */
export function createSoundEngine(): SoundEngine {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.55;
  master.connect(context.destination);
  const echo = context.createDelay(0.5);
  echo.delayTime.value = 0.19;
  const echoGain = context.createGain();
  echoGain.gain.value = 0.16;
  const echoPan = context.createStereoPanner();
  echoPan.pan.value = 0.45;
  echo.connect(echoGain).connect(echoPan).connect(master);

  function tone(hz: number, start: number, duration: number, level: number, pan = 0, soft = false) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const stereo = context.createStereoPanner();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(hz, start);
    oscillator.frequency.exponentialRampToValueAtTime(hz * 0.998, start + duration);
    stereo.pan.value = pan;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(level, start + (soft ? 0.24 : 0.008));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope).connect(stereo).connect(master);
    stereo.connect(echo);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      stereo.disconnect();
    };
  }

  function play(cue: Cue) {
    const now = context.currentTime + 0.012;
    if (cue === 'boot') {
      // An unresolved ninth gives the startup its spacious, early-console character.
      [146.83, 220, 293.66, 329.63].forEach((hz, i) => {
        tone(hz, now + i * 0.08, 2.7, 0.029, (i - 1.5) * 0.25, true);
        tone(hz * 1.004, now + i * 0.08, 2.4, 0.013, (1.5 - i) * 0.3, true);
      });
      [587.33, 880, 1174.66, 1318.51].forEach((hz, i) => {
        tone(hz, now + 0.38 + i * 0.18, 1.75, 0.034, -0.45 + i * 0.3);
        tone(hz * 2.001, now + 0.38 + i * 0.18, 0.65, 0.004, 0.2);
      });
      tone(659.25, now + 1.55, 1.2, 0.018, 0.2, true);
      return;
    }
    const notes = cue === 'open' ? [587.33, 880] : cue === 'close' ? [659.25, 440] : [1046.5];
    notes.forEach((hz, i) => {
      tone(hz, now + i * 0.042, cue === 'select' ? 0.095 : 0.2, 0.028, i ? 0.15 : -0.1);
      tone(hz * 2, now + i * 0.042, 0.07, 0.003);
    });
  }
  return {
    context,
    play,
    setMuted(muted) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(muted ? 0 : 0.55, context.currentTime, 0.015);
    },
  };
}
