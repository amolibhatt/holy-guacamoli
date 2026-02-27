let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function createOsc(ctx: AudioContext, type: OscillatorType, freq: number, start: number, dur: number, vol: number, dest: AudioNode) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + 0.01);
  gain.gain.setValueAtTime(vol, start + dur * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(start);
  osc.stop(start + dur);
}

function createNoise(ctx: AudioContext, start: number, dur: number, vol: number, dest: AudioNode) {
  const bufferSize = ctx.sampleRate * dur;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 3000;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  source.start(start);
  source.stop(start + dur);
}

class SoundManager {
  private enabled: boolean = true;
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('soundEnabled');
        if (stored !== null) {
          this.enabled = stored === 'true';
        }
      } catch {}
    }
  }

  play(name: SoundName, volume: number = 0.5) {
    if (!this.enabled) return;
    try {
      soundFunctions[name](volume);
    } catch {}
  }

  toggle() {
    this.enabled = !this.enabled;
    this.persistPreference();
    this.notifyListeners();
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.persistPreference();
    this.notifyListeners();
  }

  private persistPreference() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('soundEnabled', String(this.enabled));
      } catch {}
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(fn => fn());
  }
}

const soundFunctions: Record<string, (vol: number) => void> = {
  correct(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    createOsc(ctx, 'sine', 523, t, 0.12, vol * 0.5, ctx.destination);
    createOsc(ctx, 'sine', 659, t + 0.08, 0.12, vol * 0.5, ctx.destination);
    createOsc(ctx, 'sine', 784, t + 0.16, 0.18, vol * 0.45, ctx.destination);
  },
  wrong(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    createOsc(ctx, 'square', 200, t, 0.15, vol * 0.2, ctx.destination);
    createOsc(ctx, 'square', 160, t + 0.12, 0.2, vol * 0.15, ctx.destination);
  },
  reveal(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    createOsc(ctx, 'sine', 440, t, 0.08, vol * 0.3, ctx.destination);
    createOsc(ctx, 'sine', 554, t + 0.06, 0.08, vol * 0.3, ctx.destination);
    createOsc(ctx, 'sine', 659, t + 0.12, 0.15, vol * 0.25, ctx.destination);
  },
  tick(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    createOsc(ctx, 'sine', 880, t, 0.04, vol * 0.2, ctx.destination);
  },
  victory(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const notes = [523, 587, 659, 784, 880, 1047];
    notes.forEach((freq, i) => {
      createOsc(ctx, 'sine', freq, t + i * 0.1, 0.15, vol * 0.35, ctx.destination);
      createOsc(ctx, 'triangle', freq * 2, t + i * 0.1, 0.1, vol * 0.1, ctx.destination);
    });
  },
  click(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    createOsc(ctx, 'sine', 1200, t, 0.03, vol * 0.25, ctx.destination);
    createNoise(ctx, t, 0.02, vol * 0.1, ctx.destination);
  },
  whoosh(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(2000, t + 0.15);
    filter.Q.value = 2;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol * 0.15, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  },
  pop(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    createOsc(ctx, 'sine', 600, t, 0.06, vol * 0.35, ctx.destination);
    createOsc(ctx, 'sine', 900, t, 0.03, vol * 0.15, ctx.destination);
  },
  chime(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    createOsc(ctx, 'sine', 880, t, 0.15, vol * 0.3, ctx.destination);
    createOsc(ctx, 'sine', 1320, t + 0.05, 0.12, vol * 0.2, ctx.destination);
    createOsc(ctx, 'sine', 1760, t + 0.1, 0.2, vol * 0.15, ctx.destination);
  },
  buzz(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    createOsc(ctx, 'sawtooth', 150, t, 0.25, vol * 0.15, ctx.destination);
    createOsc(ctx, 'square', 120, t, 0.2, vol * 0.1, ctx.destination);
  },
  drumroll(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const duration = 1.8;
    const hits = 36;
    for (let i = 0; i < hits; i++) {
      const time = t + (i / hits) * duration;
      const intensity = 0.3 + (i / hits) * 0.7;
      createNoise(ctx, time, 0.04, vol * 0.12 * intensity, ctx.destination);
      createOsc(ctx, 'triangle', 120 + Math.random() * 40, time, 0.03, vol * 0.08 * intensity, ctx.destination);
    }
  },
  fanfare(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const melody: [number, number, number][] = [
      [523, 0, 0.2],
      [659, 0.18, 0.2],
      [784, 0.35, 0.2],
      [1047, 0.5, 0.4],
      [784, 0.85, 0.15],
      [1047, 1.0, 0.6],
    ];
    melody.forEach(([freq, offset, dur]) => {
      createOsc(ctx, 'sine', freq, t + offset, dur, vol * 0.3, ctx.destination);
      createOsc(ctx, 'triangle', freq, t + offset, dur * 0.8, vol * 0.12, ctx.destination);
      createOsc(ctx, 'sine', freq * 1.5, t + offset + 0.02, dur * 0.5, vol * 0.06, ctx.destination);
    });
    createOsc(ctx, 'sine', 1047 * 2, t + 1.0, 0.5, vol * 0.04, ctx.destination);
  },
  applause(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const duration = 2.5;
    const claps = 50;
    for (let i = 0; i < claps; i++) {
      const time = t + (i / claps) * duration + Math.random() * 0.06;
      const fadeIn = Math.min(1, (i / claps) * 3);
      const fadeOut = Math.min(1, ((claps - i) / claps) * 3);
      const amplitude = fadeIn * fadeOut;
      createNoise(ctx, time, 0.025 + Math.random() * 0.02, vol * 0.06 * amplitude, ctx.destination);
    }
  },
  countdown(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    createOsc(ctx, 'sine', 440, t, 0.1, vol * 0.4, ctx.destination);
  },
  swoosh(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(3000, t + 0.08);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.2);
    filter.Q.value = 3;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol * 0.12, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  },
  reaction(vol: number) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    createOsc(ctx, 'sine', 600, t, 0.08, vol * 0.25, ctx.destination);
    createOsc(ctx, 'sine', 800, t + 0.06, 0.1, vol * 0.2, ctx.destination);
  },
};

type SoundName = keyof typeof soundFunctions;

export const soundManager = new SoundManager();
export type { SoundName };

export function playWhoosh() {
  soundManager.play('whoosh', 0.4);
}

export function playCorrectDing() {
  soundManager.play('chime', 0.5);
}

export function playWrongBuzz() {
  soundManager.play('buzz', 0.4);
}

export function playRevealFlip() {
  soundManager.play('pop', 0.4);
}

export function playCelebration() {
  soundManager.play('victory', 0.6);
}

export function playBuzzerPress() {
  soundManager.play('click', 0.5);
}

export function playPointsAwarded(points: number) {
  if (points >= 40) {
    playCelebration();
  } else if (points >= 20) {
    playCorrectDing();
  } else {
    soundManager.play('pop', 0.4);
  }
}

export function playDrumroll() {
  soundManager.play('drumroll', 0.5);
}

export function playFanfare() {
  soundManager.play('fanfare', 0.6);
}

export function playApplause() {
  soundManager.play('applause', 0.4);
}

export function playReaction() {
  soundManager.play('reaction', 0.3);
}

export function playSwoosh() {
  soundManager.play('swoosh', 0.4);
}

export function playTimesUp() {
  soundManager.play('wrong', 0.6);
  setTimeout(() => soundManager.play('buzz', 0.5), 300);
}
