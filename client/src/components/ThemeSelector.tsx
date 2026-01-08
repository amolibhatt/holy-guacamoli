import { useTheme, ThemeName, THEMES } from "@/context/ThemeContext";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { motion } from "framer-motion";

const THEME_LABELS: Record<ThemeName, string> = {
  birthday: 'Birthday',
  holiday: 'Holiday',
  sports: 'Sports',
  ocean: 'Ocean',
  neon: 'Neon',
};

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white/60 hover:text-white hover:bg-white/10"
          data-testid="button-theme-selector"
        >
          <Palette className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="space-y-1">
          {(Object.keys(THEMES) as ThemeName[]).map((themeName) => {
            const colors = THEMES[themeName];
            return (
              <motion.button
                key={themeName}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setTheme(themeName)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                  ${theme === themeName ? 'bg-primary/20' : 'hover:bg-white/5'}
                `}
              >
                <div 
                  className="w-6 h-6 rounded-full"
                  style={{ 
                    background: `linear-gradient(135deg, ${colors.gradient1} 0%, ${colors.gradient2} 50%, ${colors.gradient3} 100%)` 
                  }}
                />
                <span className={`text-sm font-medium ${theme === themeName ? 'text-primary' : 'text-foreground'}`}>
                  {THEME_LABELS[themeName]}
                </span>
              </motion.button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
