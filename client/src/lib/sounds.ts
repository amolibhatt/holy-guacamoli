const SOUND_URLS = {
  correct: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  wrong: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
  reveal: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  tick: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  victory: 'https://assets.mixkit.co/active_storage/sfx/1434/1434-preview.mp3',
  click: 'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3',
  whoosh: 'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3',
  pop: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
  chime: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  buzz: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  drumroll: 'https://assets.mixkit.co/active_storage/sfx/1201/1201-preview.mp3',
  fanfare: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  applause: 'https://assets.mixkit.co/active_storage/sfx/159/159-preview.mp3',
  countdown: 'https://assets.mixkit.co/active_storage/sfx/1085/1085-preview.mp3',
  swoosh: 'https://assets.mixkit.co/active_storage/sfx/2587/2587-preview.mp3',
  reaction: 'https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3',
};

type SoundName = keyof typeof SOUND_URLS;

class SoundManager {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private listeners: Set<() => void> = new Set();

  constructor() {
    Object.entries(SOUND_URLS).forEach(([name, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.audioCache.set(name, audio);
    });
    
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
    
    const audio = this.audioCache.get(name);
    if (audio) {
      audio.currentTime = 0;
      audio.volume = volume;
      audio.play().catch(() => {});
    }
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
