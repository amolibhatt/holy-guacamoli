import { motion } from "framer-motion";
import { 
  Trophy, Cake, Umbrella, Briefcase, Dog, Cat, Rocket, Music, Leaf,
  Star
} from "lucide-react";

interface ThemePreviewProps {
  themeId: string;
  className?: string;
}

const themeConfigs: Record<string, { 
  gradient: string; 
  iconColor: string;
  glowColor: string;
}> = {
  sports: {
    gradient: "from-emerald-200 via-emerald-300 to-emerald-400",
    iconColor: "#065f46",
    glowColor: "rgba(110, 231, 183, 0.4)"
  },
  birthday: {
    gradient: "from-pink-200 via-pink-300 to-pink-400",
    iconColor: "#9d174d",
    glowColor: "rgba(249, 168, 212, 0.4)"
  },
  beach: {
    gradient: "from-cyan-200 via-cyan-300 to-cyan-400",
    iconColor: "#155e75",
    glowColor: "rgba(103, 232, 249, 0.4)"
  },
  office: {
    gradient: "from-slate-200 via-slate-300 to-slate-400",
    iconColor: "#334155",
    glowColor: "rgba(148, 163, 184, 0.4)"
  },
  dogs: {
    gradient: "from-amber-200 via-amber-300 to-amber-400",
    iconColor: "#92400e",
    glowColor: "rgba(251, 191, 36, 0.4)"
  },
  cats: {
    gradient: "from-violet-200 via-violet-300 to-violet-400",
    iconColor: "#5b21b6",
    glowColor: "rgba(167, 139, 250, 0.4)"
  },
  space: {
    gradient: "from-indigo-800 via-indigo-900 to-violet-900",
    iconColor: "#e0e7ff",
    glowColor: "rgba(139, 92, 246, 0.4)"
  },
  music: {
    gradient: "from-rose-200 via-rose-300 to-rose-400",
    iconColor: "#9f1239",
    glowColor: "rgba(251, 113, 133, 0.4)"
  },
  nature: {
    gradient: "from-green-200 via-green-300 to-green-400",
    iconColor: "#166534",
    glowColor: "rgba(74, 222, 128, 0.4)"
  },
};

const getIcon = (themeId: string, size: "sm" | "lg" = "sm") => {
  const iconSize = size === "lg" ? "w-8 h-8" : "w-4 h-4";
  const config = themeConfigs[themeId];
  const color = config?.iconColor || "#374151";
  
  const props = { className: iconSize, style: { color } };
  
  switch (themeId) {
    case "sports": return <Trophy {...props} />;
    case "birthday": return <Cake {...props} />;
    case "beach": return <Umbrella {...props} />;
    case "office": return <Briefcase {...props} />;
    case "dogs": return <Dog {...props} />;
    case "cats": return <Cat {...props} />;
    case "space": return <Rocket {...props} />;
    case "music": return <Music {...props} />;
    case "nature": return <Leaf {...props} />;
    default: return <Star {...props} />;
  }
};

export function ThemePreview({ themeId, className = "" }: ThemePreviewProps) {
  const config = themeConfigs[themeId] || themeConfigs.birthday;
  
  return (
    <div 
      className={`relative w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br ${config.gradient} ${className}`}
      style={{ boxShadow: `0 4px 12px ${config.glowColor}` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ 
            scale: [1, 1.08, 1],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut"
          }}
        >
          {getIcon(themeId, "sm")}
        </motion.div>
      </div>
    </div>
  );
}

export function ThemePreviewLarge({ themeId, className = "" }: ThemePreviewProps) {
  const config = themeConfigs[themeId] || themeConfigs.birthday;
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative w-full h-24 rounded-xl overflow-hidden bg-gradient-to-br ${config.gradient} ${className}`}
      style={{ boxShadow: `0 8px 24px ${config.glowColor}` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ 
            y: [0, -4, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            duration: 2.5, 
            repeat: Infinity, 
            ease: "easeInOut"
          }}
        >
          {getIcon(themeId, "lg")}
        </motion.div>
      </div>
    </motion.div>
  );
}
