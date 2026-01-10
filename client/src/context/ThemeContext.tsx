import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type ThemeName = 'birthday' | 'holiday' | 'sports' | 'ocean' | 'neon';

interface ThemeColors {
  gradient1: string;
  gradient2: string;
  gradient3: string;
  accent: string;
  glow: string;
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  birthday: {
    gradient1: '#A855F7',
    gradient2: '#C084FC',
    gradient3: '#E879F9',
    accent: '#D946EF',
    glow: 'rgba(168, 85, 247, 0.4)',
  },
  holiday: {
    gradient1: '#2ECC71',
    gradient2: '#27AE60',
    gradient3: '#E74C3C',
    accent: '#F1C40F',
    glow: 'rgba(46, 204, 113, 0.4)',
  },
  sports: {
    gradient1: '#3498DB',
    gradient2: '#2980B9',
    gradient3: '#1ABC9C',
    accent: '#F39C12',
    glow: 'rgba(52, 152, 219, 0.4)',
  },
  ocean: {
    gradient1: '#667eea',
    gradient2: '#764ba2',
    gradient3: '#6B8DD6',
    accent: '#00d2ff',
    glow: 'rgba(102, 126, 234, 0.4)',
  },
  neon: {
    gradient1: '#f72585',
    gradient2: '#7209b7',
    gradient3: '#3a0ca3',
    accent: '#4cc9f0',
    glow: 'rgba(247, 37, 133, 0.4)',
  },
};

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('quiz-theme');
    return (saved as ThemeName) || 'birthday';
  });

  useEffect(() => {
    localStorage.setItem('quiz-theme', theme);
    const colors = THEMES[theme];
    document.documentElement.style.setProperty('--theme-gradient-1', colors.gradient1);
    document.documentElement.style.setProperty('--theme-gradient-2', colors.gradient2);
    document.documentElement.style.setProperty('--theme-gradient-3', colors.gradient3);
    document.documentElement.style.setProperty('--theme-accent', colors.accent);
    document.documentElement.style.setProperty('--theme-glow', colors.glow);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colors: THEMES[theme] }}>
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
