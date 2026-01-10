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
};

type SoundName = keyof typeof SOUND_URLS;

class SoundManager {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  constructor() {
    Object.entries(SOUND_URLS).forEach(([name, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.audioCache.set(name, audio);
    });
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
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

export const soundManager = new SoundManager();
export type { SoundName };
