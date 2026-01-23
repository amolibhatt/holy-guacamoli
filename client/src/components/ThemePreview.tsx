import { motion } from "framer-motion";
import { 
  Trophy, Cake, Umbrella, Briefcase, Dog, Cat, Rocket, Music, Leaf,
  Star, Waves, Coffee, Headphones, Bird, Flower2
} from "lucide-react";

interface ThemePreviewProps {
  themeId: string;
  className?: string;
}

const themeConfigs: Record<string, { 
  gradient: string; 
  elements: Array<{ icon: string; color: string; x: number; y: number; delay: number }>;
}> = {
  sports: {
    gradient: "from-emerald-600 via-green-500 to-emerald-700",
    elements: [
      { icon: "ball", color: "white", x: 20, y: 30, delay: 0 },
      { icon: "trophy", color: "#fbbf24", x: 70, y: 60, delay: 0.2 },
    ]
  },
  birthday: {
    gradient: "from-pink-400 via-purple-400 to-indigo-400",
    elements: [
      { icon: "cake", color: "#fbbf24", x: 50, y: 50, delay: 0 },
      { icon: "star", color: "#f472b6", x: 20, y: 30, delay: 0.1 },
      { icon: "star", color: "#a78bfa", x: 80, y: 25, delay: 0.2 },
    ]
  },
  beach: {
    gradient: "from-cyan-400 via-blue-400 to-teal-300",
    elements: [
      { icon: "umbrella", color: "#f97316", x: 60, y: 40, delay: 0 },
      { icon: "waves", color: "#22d3ee", x: 30, y: 70, delay: 0.15 },
    ]
  },
  office: {
    gradient: "from-slate-600 via-gray-500 to-slate-700",
    elements: [
      { icon: "briefcase", color: "#94a3b8", x: 50, y: 45, delay: 0 },
      { icon: "coffee", color: "#a16207", x: 75, y: 65, delay: 0.1 },
    ]
  },
  dogs: {
    gradient: "from-amber-600 via-yellow-500 to-orange-500",
    elements: [
      { icon: "dog", color: "#92400e", x: 50, y: 50, delay: 0 },
      { icon: "bone", color: "white", x: 25, y: 35, delay: 0.2 },
    ]
  },
  cats: {
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    elements: [
      { icon: "cat", color: "#1e1b4b", x: 50, y: 50, delay: 0 },
      { icon: "yarn", color: "#f472b6", x: 75, y: 65, delay: 0.15 },
    ]
  },
  space: {
    gradient: "from-indigo-900 via-purple-900 to-slate-900",
    elements: [
      { icon: "rocket", color: "#f97316", x: 50, y: 40, delay: 0 },
      { icon: "star", color: "#fbbf24", x: 20, y: 25, delay: 0.1 },
      { icon: "star", color: "#22d3ee", x: 80, y: 60, delay: 0.2 },
    ]
  },
  music: {
    gradient: "from-rose-500 via-pink-500 to-orange-400",
    elements: [
      { icon: "music", color: "white", x: 50, y: 45, delay: 0 },
      { icon: "headphones", color: "#1e1b4b", x: 25, y: 60, delay: 0.15 },
    ]
  },
  nature: {
    gradient: "from-green-500 via-emerald-400 to-teal-400",
    elements: [
      { icon: "leaf", color: "#166534", x: 50, y: 45, delay: 0 },
      { icon: "bird", color: "#0284c7", x: 75, y: 30, delay: 0.1 },
      { icon: "flower", color: "#ec4899", x: 25, y: 65, delay: 0.2 },
    ]
  },
};

const renderIcon = (icon: string, color: string, isLarge: boolean = false) => {
  const iconSize = isLarge ? 20 : 12;
  const className = isLarge ? "w-5 h-5" : "w-3 h-3";
  const props = { className, style: { color }, size: iconSize };
  
  switch (icon) {
    case "ball":
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="white" stroke="#ccc" strokeWidth="1"/>
          <path d="M12 2 L12 22 M2 12 L22 12" stroke="#ccc" strokeWidth="0.5" opacity="0.5"/>
        </svg>
      );
    case "bone":
      return (
        <svg width={iconSize} height={iconSize * 0.5} viewBox="0 0 24 12">
          <ellipse cx="3" cy="3" rx="3" ry="3" fill="white"/>
          <ellipse cx="3" cy="9" rx="3" ry="3" fill="white"/>
          <ellipse cx="21" cy="3" rx="3" ry="3" fill="white"/>
          <ellipse cx="21" cy="9" rx="3" ry="3" fill="white"/>
          <rect x="3" y="4" width="18" height="4" fill="white"/>
        </svg>
      );
    case "yarn":
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill={color}/>
          <path d="M6 8 Q12 4 18 8 Q12 12 6 8" fill="none" stroke="white" strokeWidth="1" opacity="0.5"/>
        </svg>
      );
    case "trophy": return <Trophy {...props} />;
    case "cake": return <Cake {...props} />;
    case "umbrella": return <Umbrella {...props} />;
    case "briefcase": return <Briefcase {...props} />;
    case "dog": return <Dog {...props} />;
    case "cat": return <Cat {...props} />;
    case "rocket": return <Rocket {...props} />;
    case "music": return <Music {...props} />;
    case "leaf": return <Leaf {...props} />;
    case "star": return <Star {...props} />;
    case "waves": return <Waves {...props} />;
    case "coffee": return <Coffee {...props} />;
    case "headphones": return <Headphones {...props} />;
    case "bird": return <Bird {...props} />;
    case "flower": return <Flower2 {...props} />;
    default: return null;
  }
};

export function ThemePreview({ themeId, className = "" }: ThemePreviewProps) {
  const config = themeConfigs[themeId] || themeConfigs.birthday;
  
  return (
    <div 
      className={`relative w-10 h-10 rounded-md overflow-hidden bg-gradient-to-br ${config.gradient} ${className}`}
    >
      {config.elements.map((el, idx) => (
        <motion.div
          key={idx}
          className="absolute"
          style={{ left: `${el.x}%`, top: `${el.y}%`, transform: 'translate(-50%, -50%)' }}
          animate={{ 
            y: [0, -2, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            delay: el.delay,
            ease: "easeInOut"
          }}
        >
          {renderIcon(el.icon, el.color, false)}
        </motion.div>
      ))}
    </div>
  );
}

export function ThemePreviewLarge({ themeId, className = "" }: ThemePreviewProps) {
  const config = themeConfigs[themeId] || themeConfigs.birthday;
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative w-full h-24 rounded-lg overflow-hidden bg-gradient-to-br ${config.gradient} ${className}`}
    >
      {config.elements.map((el, idx) => (
        <motion.div
          key={idx}
          className="absolute"
          style={{ left: `${el.x}%`, top: `${el.y}%`, transform: 'translate(-50%, -50%)' }}
          animate={{ 
            y: [0, -6, 0],
            scale: [1, 1.15, 1],
            rotate: el.icon === 'star' ? [0, 180, 360] : 0,
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            delay: el.delay,
            ease: "easeInOut"
          }}
        >
          {renderIcon(el.icon, el.color, true)}
        </motion.div>
      ))}
    </motion.div>
  );
}
