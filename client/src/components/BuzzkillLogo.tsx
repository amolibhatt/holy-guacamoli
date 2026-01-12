import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

interface BuzzkillLogoProps {
  size?: "sm" | "md" | "lg";
  themed?: boolean;
  animate?: boolean;
  className?: string;
}

export function BuzzkillLogo({ 
  size = "md", 
  themed = false,
  animate = true,
  className = "" 
}: BuzzkillLogoProps) {
  const { colors, decor } = useTheme();
  
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  };

  const skinColors = themed 
    ? { start: colors.gradient1, end: colors.gradient2 }
    : { start: "#8B5CF6", end: "#7C3AED" };
  
  const hatColors = themed
    ? { start: colors.gradient1, middle: colors.accent, end: colors.gradient3 }
    : { start: "#EC4899", middle: "#FBBF24", end: "#8B5CF6" };
  
  const cheekColor = themed ? colors.accent : "#EC4899";
  const glowColor = themed ? colors.gradient1 : "#8B5CF6";

  const ThemeIcon = themed && decor.icons[0] ? decor.icons[0] : null;

  const logoContent = (
    <>
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-30 scale-110" 
        style={{ backgroundColor: glowColor }}
      />
      <svg viewBox="0 0 64 72" className={`${sizeClasses[size]} relative z-10 drop-shadow-lg ${className}`}>
        <defs>
          <linearGradient id={`avoSkin-${themed ? 'themed' : 'universal'}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={skinColors.start} />
            <stop offset="100%" stopColor={skinColors.end} />
          </linearGradient>
          <linearGradient id={`avoPit-${themed ? 'themed' : 'universal'}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4A574" />
            <stop offset="100%" stopColor="#8B5A2B" />
          </linearGradient>
          <linearGradient id={`partyHat-${themed ? 'themed' : 'universal'}`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={hatColors.start} />
            <stop offset="50%" stopColor={hatColors.middle} />
            <stop offset="100%" stopColor={hatColors.end} />
          </linearGradient>
        </defs>
        
        <path 
          d="M32 18 C18 18 8 32 8 50 C8 68 18 72 32 72 C46 72 56 68 56 50 C56 32 46 18 32 18Z" 
          fill={`url(#avoSkin-${themed ? 'themed' : 'universal'})`} 
        />
        <ellipse cx="32" cy="52" rx="18" ry="17" fill="#FFF8E1" />
        <circle cx="32" cy="56" r="10" fill={`url(#avoPit-${themed ? 'themed' : 'universal'})`} />
        <ellipse cx="28" cy="53" rx="3.5" ry="4" fill="#E8C9A0" opacity="0.4" />
        
        <circle cx="24" cy="44" r="4" fill="#1A1A2E" />
        <circle cx="40" cy="44" r="4" fill="#1A1A2E" />
        <circle cx="25.5" cy="42.5" r="1.5" fill="white" />
        <circle cx="41.5" cy="42.5" r="1.5" fill="white" />
        
        <path d="M24 52 Q32 60 40 52" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        
        <circle cx="18" cy="50" r="4" fill={cheekColor} opacity="0.5" />
        <circle cx="46" cy="50" r="4" fill={cheekColor} opacity="0.5" />
        
        <path d="M20 18 L32 0 L44 18" fill={`url(#partyHat-${themed ? 'themed' : 'universal'})`} />
        <circle cx="32" cy="0" r="4" fill="#FBBF24" />
        <circle cx="32" cy="0" r="2" fill={cheekColor} />
        
        <line x1="26" y1="10" x2="26" y2="15" stroke="white" strokeWidth="2" opacity="0.8" />
        <line x1="32" y1="6" x2="32" y2="12" stroke="white" strokeWidth="2" opacity="0.8" />
        <line x1="38" y1="10" x2="38" y2="15" stroke="white" strokeWidth="2" opacity="0.8" />
      </svg>
      
      {themed && ThemeIcon && (
        <motion.div 
          className="absolute -top-1 -right-1 p-1 rounded-full"
          style={{ backgroundColor: colors.gradient1, color: 'white' }}
          animate={animate ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ThemeIcon className="w-3 h-3" />
        </motion.div>
      )}
      
      {!themed && (
        <>
          <motion.div 
            className="absolute -top-1 -left-2 w-2 h-2 rounded-full bg-pink-500"
            animate={animate ? { y: [0, -8, 0], opacity: [0.6, 1, 0.6], rotate: [0, 180, 360] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div 
            className="absolute -top-2 -right-1 w-1.5 h-1.5 rounded-full bg-violet-500"
            animate={animate ? { y: [0, -6, 0], opacity: [0.5, 1, 0.5] } : {}}
            transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
          />
          <motion.div 
            className="absolute top-1 -right-3 w-2 h-2 rounded-full bg-amber-400"
            animate={animate ? { y: [0, -5, 0], rotate: [0, -180, -360] } : {}}
            transition={{ duration: 2.2, repeat: Infinity, delay: 0.6 }}
          />
        </>
      )}
    </>
  );

  if (animate) {
    return (
      <motion.div 
        className="relative"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        animate={{ y: [0, -3, 0] }}
        transition={{ y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
      >
        {logoContent}
      </motion.div>
    );
  }

  return <div className="relative">{logoContent}</div>;
}
