import { motion } from "framer-motion";
import { 
  Trophy, Cake, Umbrella, Briefcase, Dog, Cat, Rocket, Music, Leaf,
  Star
} from "lucide-react";

interface ThemePreviewProps {
  themeId: string;
  className?: string;
}

// Matching the refined pastel design from GRID_THEMES in Blitzgrid.tsx
const themeConfigs: Record<string, { 
  gradient: string; 
  glowColor: string;
}> = {
  sports: {
    gradient: "from-emerald-300 via-teal-300 to-teal-400",
    glowColor: "rgba(94, 234, 212, 0.3)"
  },
  birthday: {
    gradient: "from-rose-300 via-pink-300 to-fuchsia-300",
    glowColor: "rgba(249, 168, 212, 0.3)"
  },
  beach: {
    gradient: "from-cyan-300 via-sky-300 to-blue-300",
    glowColor: "rgba(125, 211, 252, 0.3)"
  },
  office: {
    gradient: "from-zinc-400 via-slate-400 to-stone-400",
    glowColor: "rgba(148, 163, 184, 0.3)"
  },
  dogs: {
    gradient: "from-yellow-300 via-amber-400 to-orange-400",
    glowColor: "rgba(251, 191, 36, 0.3)"
  },
  cats: {
    gradient: "from-violet-300 via-purple-400 to-violet-500",
    glowColor: "rgba(167, 139, 250, 0.3)"
  },
  space: {
    gradient: "from-indigo-400 via-purple-500 to-fuchsia-500",
    glowColor: "rgba(139, 92, 246, 0.3)"
  },
  music: {
    gradient: "from-rose-400 via-pink-400 to-fuchsia-400",
    glowColor: "rgba(244, 114, 182, 0.3)"
  },
  nature: {
    gradient: "from-green-300 via-emerald-300 to-teal-300",
    glowColor: "rgba(110, 231, 183, 0.3)"
  },
};

const getIcon = (themeId: string, size: "sm" | "lg" = "sm") => {
  const iconSize = size === "lg" ? "w-8 h-8" : "w-4 h-4";
  const props = { className: `${iconSize} text-white drop-shadow-sm` };
  
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
      className={`relative w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br ${config.gradient} ${className}`}
      style={{ boxShadow: `0 4px 12px ${config.glowColor}` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
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
      className={`relative w-full h-24 rounded-2xl overflow-hidden bg-gradient-to-br ${config.gradient} ${className}`}
      style={{ boxShadow: `0 8px 24px ${config.glowColor}` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-white/10 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ y: [0, -3, 0], scale: [1, 1.03, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {getIcon(themeId, "lg")}
        </motion.div>
      </div>
    </motion.div>
  );
}
