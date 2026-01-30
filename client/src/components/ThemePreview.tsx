import { motion } from "framer-motion";
import { 
  Zap, Sun, Sparkles, Waves, Candy, TreePine, Star, Flame, Gamepad, Circle
} from "lucide-react";

interface ThemePreviewProps {
  themeId: string;
  className?: string;
}

// Matching the new creative themes from GRID_THEMES in Blitzgrid.tsx
const themeConfigs: Record<string, { 
  background: string;
  glowColor: string;
  iconColor: string;
}> = {
  neon: {
    background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 30%, #16213e 60%, #0f3460 100%)",
    glowColor: "rgba(0, 255, 245, 0.4)",
    iconColor: "#00fff5"
  },
  sunset: {
    background: "linear-gradient(135deg, #ff6b35 0%, #f7931e 25%, #ffcc02 50%, #ff6b6b 100%)",
    glowColor: "rgba(255, 107, 53, 0.4)",
    iconColor: "#fff"
  },
  aurora: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #6B8DD6 50%, #8E37D7 75%, #00d4ff 100%)",
    glowColor: "rgba(118, 75, 162, 0.4)",
    iconColor: "#fff"
  },
  ocean: {
    background: "linear-gradient(180deg, #0077b6 0%, #023e8a 40%, #03045e 100%)",
    glowColor: "rgba(0, 119, 182, 0.4)",
    iconColor: "#90e0ef"
  },
  candy: {
    background: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 25%, #fecfef 50%, #ff9a9e 75%, #fad0c4 100%)",
    glowColor: "rgba(255, 154, 158, 0.4)",
    iconColor: "#fff"
  },
  forest: {
    background: "linear-gradient(135deg, #134e5e 0%, #1a5d3a 50%, #2d5a27 100%)",
    glowColor: "rgba(45, 90, 39, 0.4)",
    iconColor: "#a8e6cf"
  },
  galaxy: {
    background: "linear-gradient(135deg, #0c0c1e 0%, #1a1a3e 25%, #2d1b4e 50%, #1e3a5f 75%, #0c0c1e 100%)",
    glowColor: "rgba(139, 92, 246, 0.4)",
    iconColor: "#ffd700"
  },
  fire: {
    background: "linear-gradient(135deg, #f12711 0%, #f5af19 50%, #f12711 100%)",
    glowColor: "rgba(245, 175, 25, 0.4)",
    iconColor: "#fff"
  },
  retro: {
    background: "linear-gradient(135deg, #ff00ff 0%, #00ffff 50%, #ff00ff 100%)",
    glowColor: "rgba(255, 0, 255, 0.4)",
    iconColor: "#fff"
  },
  minimal: {
    background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 50%, #ffffff 100%)",
    glowColor: "rgba(153, 153, 153, 0.3)",
    iconColor: "#333"
  },
};

const getIcon = (themeId: string, size: "sm" | "lg" = "sm", iconColor: string = "#fff") => {
  const iconSize = size === "lg" ? "w-8 h-8" : "w-5 h-5";
  const props = { className: iconSize, style: { color: iconColor } };
  
  switch (themeId) {
    case "neon": return <Zap {...props} />;
    case "sunset": return <Sun {...props} />;
    case "aurora": return <Sparkles {...props} />;
    case "ocean": return <Waves {...props} />;
    case "candy": return <Candy {...props} />;
    case "forest": return <TreePine {...props} />;
    case "galaxy": return <Star {...props} />;
    case "fire": return <Flame {...props} />;
    case "retro": return <Gamepad {...props} />;
    case "minimal": return <Circle {...props} />;
    default: return <Star {...props} />;
  }
};

export function ThemePreview({ themeId, className = "" }: ThemePreviewProps) {
  const config = themeConfigs[themeId] || themeConfigs.aurora;
  
  return (
    <div 
      className={`relative w-10 h-10 rounded-xl overflow-hidden ${className}`}
      style={{ 
        background: config.background,
        boxShadow: `0 4px 16px ${config.glowColor}` 
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {getIcon(themeId, "sm", config.iconColor)}
        </motion.div>
      </div>
    </div>
  );
}

export function ThemePreviewLarge({ themeId, className = "" }: ThemePreviewProps) {
  const config = themeConfigs[themeId] || themeConfigs.aurora;
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative w-full h-24 rounded-2xl overflow-hidden ${className}`}
      style={{ 
        background: config.background,
        boxShadow: `0 8px 32px ${config.glowColor}` 
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ y: [0, -4, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {getIcon(themeId, "lg", config.iconColor)}
        </motion.div>
      </div>
    </motion.div>
  );
}
