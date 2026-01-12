import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { 
  Cake, PartyPopper, Gift, Sparkles,
  TreePine, Bell, Snowflake, Star,
  Trophy, Medal, Target, Zap,
  Waves, Shell, Anchor, Sun,
  Bolt, Orbit, CircleDot, Flame,
  Goal, Flag, Timer, Users,
  LucideIcon
} from "lucide-react";

export type ThemeName = 'birthday' | 'holiday' | 'sports' | 'ocean' | 'neon' | 'football';

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
    gradient1: '#8B5CF6',
    gradient2: '#A78BFA',
    gradient3: '#C4B5FD',
    accent: '#FB7185',
    glow: 'rgba(139, 92, 246, 0.4)',
    primaryHsl: '255 80% 62%',
  },
  holiday: {
    gradient1: '#DC2626',
    gradient2: '#B91C1C',
    gradient3: '#7F1D1D',
    accent: '#FDE68A',
    glow: 'rgba(220, 38, 38, 0.4)',
    primaryHsl: '0 72% 51%',
  },
  sports: {
    gradient1: '#2563EB',
    gradient2: '#1D4ED8',
    gradient3: '#1E40AF',
    accent: '#FACC15',
    glow: 'rgba(37, 99, 235, 0.4)',
    primaryHsl: '221 82% 56%',
  },
  ocean: {
    gradient1: '#0EA5E9',
    gradient2: '#0284C7',
    gradient3: '#0369A1',
    accent: '#22D3EE',
    glow: 'rgba(14, 165, 233, 0.4)',
    primaryHsl: '200 88% 52%',
  },
  neon: {
    gradient1: '#EC4899',
    gradient2: '#A855F7',
    gradient3: '#6366F1',
    accent: '#4ADE80',
    glow: 'rgba(236, 72, 153, 0.4)',
    primaryHsl: '322 95% 58%',
  },
  football: {
    gradient1: '#22C55E',
    gradient2: '#16A34A',
    gradient3: '#15803D',
    accent: '#D97706',
    glow: 'rgba(34, 197, 94, 0.4)',
    primaryHsl: '142 70% 50%',
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
  football: {
    icons: [Goal, Trophy, Flag, Timer],
    label: 'Football',
    emoji: '⚽',
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
    if (savedTheme && (savedTheme === 'birthday' || savedTheme === 'holiday' || savedTheme === 'sports' || savedTheme === 'ocean' || savedTheme === 'neon' || savedTheme === 'football')) {
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
