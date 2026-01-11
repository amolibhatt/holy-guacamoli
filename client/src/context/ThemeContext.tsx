import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { 
  Cake, PartyPopper, Gift, Sparkles,
  TreePine, Bell, Snowflake, Star,
  Trophy, Medal, Target, Zap,
  Waves, Shell, Anchor, Sun,
  Bolt, Orbit, CircleDot, Flame,
  LucideIcon
} from "lucide-react";

export type ThemeName = 'birthday' | 'holiday' | 'sports' | 'ocean' | 'neon';

interface ThemeColors {
  gradient1: string;
  gradient2: string;
  gradient3: string;
  accent: string;
  glow: string;
  primaryHsl: string;
}

interface ThemeDecor {
  icons: LucideIcon[];
  label: string;
  emoji: string;
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  birthday: {
    gradient1: '#A855F7',
    gradient2: '#C084FC',
    gradient3: '#E879F9',
    accent: '#D946EF',
    glow: 'rgba(168, 85, 247, 0.4)',
    primaryHsl: '280 70% 60%',
  },
  holiday: {
    gradient1: '#DC2626',
    gradient2: '#B91C1C',
    gradient3: '#991B1B',
    accent: '#F59E0B',
    glow: 'rgba(220, 38, 38, 0.4)',
    primaryHsl: '0 72% 51%',
  },
  sports: {
    gradient1: '#3498DB',
    gradient2: '#2980B9',
    gradient3: '#1E3A5F',
    accent: '#F39C12',
    glow: 'rgba(52, 152, 219, 0.4)',
    primaryHsl: '204 70% 53%',
  },
  ocean: {
    gradient1: '#667eea',
    gradient2: '#764ba2',
    gradient3: '#6B8DD6',
    accent: '#00d2ff',
    glow: 'rgba(102, 126, 234, 0.4)',
    primaryHsl: '229 79% 66%',
  },
  neon: {
    gradient1: '#f72585',
    gradient2: '#7209b7',
    gradient3: '#3a0ca3',
    accent: '#4cc9f0',
    glow: 'rgba(247, 37, 133, 0.4)',
    primaryHsl: '333 93% 55%',
  },
};

export const THEME_DECOR: Record<ThemeName, ThemeDecor> = {
  birthday: {
    icons: [Cake, PartyPopper, Gift, Sparkles],
    label: 'Birthday',
    emoji: '🎂',
  },
  holiday: {
    icons: [TreePine, Bell, Snowflake, Star],
    label: 'Holiday',
    emoji: '🎄',
  },
  sports: {
    icons: [Trophy, Medal, Target, Zap],
    label: 'Sports',
    emoji: '🏆',
  },
  ocean: {
    icons: [Waves, Shell, Anchor, Sun],
    label: 'Ocean',
    emoji: '🌊',
  },
  neon: {
    icons: [Bolt, Orbit, CircleDot, Flame],
    label: 'Neon',
    emoji: '⚡',
  },
};

export type ColorMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  colors: ThemeColors;
  decor: ThemeDecor;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>('birthday');
  const [colorMode, setColorMode] = useState<ColorMode>('light');

  const toggleColorMode = () => {
    setColorMode(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('quiz-theme');
    if (savedTheme && (savedTheme === 'birthday' || savedTheme === 'holiday' || savedTheme === 'sports' || savedTheme === 'ocean' || savedTheme === 'neon')) {
      setTheme(savedTheme);
    }
    const savedColorMode = localStorage.getItem('quiz-color-mode');
    if (savedColorMode === 'light' || savedColorMode === 'dark') {
      setColorMode(savedColorMode);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setColorMode('dark');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('quiz-color-mode', colorMode);
    if (colorMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [colorMode]);

  useEffect(() => {
    localStorage.setItem('quiz-theme', theme);
    const colors = THEMES[theme];
    document.documentElement.style.setProperty('--theme-gradient-1', colors.gradient1);
    document.documentElement.style.setProperty('--theme-gradient-2', colors.gradient2);
    document.documentElement.style.setProperty('--theme-gradient-3', colors.gradient3);
    document.documentElement.style.setProperty('--theme-accent', colors.accent);
    document.documentElement.style.setProperty('--theme-glow', colors.glow);
    document.documentElement.style.setProperty('--primary', colors.primaryHsl);
    document.documentElement.style.setProperty('--ring', colors.primaryHsl);
    document.documentElement.style.setProperty('--sidebar-primary', colors.primaryHsl);
    document.documentElement.style.setProperty('--sidebar-ring', colors.primaryHsl);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      colors: THEMES[theme],
      decor: THEME_DECOR[theme],
      colorMode,
      setColorMode,
      toggleColorMode,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
