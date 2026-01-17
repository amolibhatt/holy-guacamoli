import { motion } from "framer-motion";

interface AvocadoIconProps {
  className?: string;
  animate?: boolean;
  showParticles?: boolean;
}

export function AvocadoIcon({ 
  className = "w-7 h-7", 
  animate = false,
  showParticles = false 
}: AvocadoIconProps) {
  const particles = showParticles && (
    <>
      <motion.circle 
        cx="8" cy="20" r="2" fill="#8B5CF6"
        animate={animate ? { y: [0, -4, 0], opacity: [0.6, 1, 0.6] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.circle 
        cx="56" cy="18" r="2.5" fill="#D946EF"
        animate={animate ? { y: [0, -5, 0], opacity: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 2.2, repeat: Infinity, delay: 0.3 }}
      />
      <motion.circle 
        cx="12" cy="35" r="1.5" fill="#FBBF24"
        animate={animate ? { y: [0, -3, 0], scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 1.8, repeat: Infinity, delay: 0.6 }}
      />
      <motion.circle 
        cx="52" cy="40" r="2" fill="#EC4899"
        animate={animate ? { y: [0, -4, 0], opacity: [0.6, 1, 0.6] } : {}}
        transition={{ duration: 2.4, repeat: Infinity, delay: 0.2 }}
      />
      <motion.circle 
        cx="6" cy="50" r="1.5" fill="#F59E0B"
        animate={animate ? { y: [0, -3, 0] } : {}}
        transition={{ duration: 1.6, repeat: Infinity, delay: 0.8 }}
      />
      <motion.circle 
        cx="58" cy="55" r="2" fill="#A855F7"
        animate={animate ? { y: [0, -4, 0], opacity: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 2.6, repeat: Infinity, delay: 0.4 }}
      />
    </>
  );

  return (
    <svg
      viewBox="0 0 64 72"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="avoSkinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="40%" stopColor="#A855F7" />
          <stop offset="70%" stopColor="#D946EF" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="avoFleshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFDE7" />
          <stop offset="50%" stopColor="#FFF8E1" />
          <stop offset="100%" stopColor="#FFE0B2" />
        </linearGradient>
        <linearGradient id="avoPitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4A574" />
          <stop offset="100%" stopColor="#8B5A2B" />
        </linearGradient>
        <linearGradient id="partyHatGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="30%" stopColor="#D946EF" />
          <stop offset="60%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
        <linearGradient id="pompomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#8B5CF6" floodOpacity="0.3"/>
        </filter>
      </defs>
      
      {particles}
      
      <g filter="url(#glowFilter)">
        <path d="M5 15 L6 12 L7 15 L10 16 L7 17 L6 20 L5 17 L2 16 Z" fill="#FBBF24" />
        <path d="M58 45 L59 42 L60 45 L63 46 L60 47 L59 50 L58 47 L55 46 Z" fill="#FBBF24" />
        <path d="M10 60 L11 58 L12 60 L14 61 L12 62 L11 64 L10 62 L8 61 Z" fill="#FFF" />
        <path d="M54 12 L55 10 L56 12 L58 13 L56 14 L55 16 L54 14 L52 13 Z" fill="#FFF" />
      </g>
      
      <path
        d="M32 20 C20 20 10 33 10 49 C10 67 20 72 32 72 C44 72 54 67 54 49 C54 33 44 20 32 20Z"
        fill="url(#avoSkinGradient)"
        filter="url(#shadowFilter)"
      />
      
      <ellipse cx="32" cy="52" rx="17" ry="16" fill="url(#avoFleshGradient)" />
      
      <circle cx="32" cy="56" r="9" fill="url(#avoPitGradient)" />
      <ellipse cx="29" cy="54" rx="3" ry="3.5" fill="#E8C9A0" opacity="0.5" />
      
      <circle cx="25" cy="46" r="3.5" fill="#1A1A2E" />
      <circle cx="39" cy="46" r="3.5" fill="#1A1A2E" />
      <circle cx="26" cy="45" r="1.5" fill="white" />
      <circle cx="40" cy="45" r="1.5" fill="white" />
      
      <path
        d="M27 52 Q32 56 37 52"
        stroke="#1A1A2E"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      
      <circle cx="20" cy="50" r="3.5" fill="#EC4899" opacity="0.5" />
      <circle cx="44" cy="50" r="3.5" fill="#EC4899" opacity="0.5" />
      
      <path
        d="M22 20 L32 2 L42 20"
        fill="url(#partyHatGradient)"
      />
      <line x1="27" y1="14" x2="27" y2="18" stroke="white" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
      <line x1="32" y1="10" x2="32" y2="15" stroke="white" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
      <line x1="37" y1="14" x2="37" y2="18" stroke="white" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
      
      <circle cx="32" cy="2" r="4" fill="url(#pompomGradient)" />
      <circle cx="32" cy="2" r="2" fill="#EC4899" />
    </svg>
  );
}

interface AnimatedLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export function AnimatedLogo({ 
  size = "md", 
  showText = true,
  className = ""
}: AnimatedLogoProps) {
  const sizeConfig = {
    sm: { icon: "w-10 h-10", container: "w-12 h-12", text: "text-xl", tagline: "text-[10px]" },
    md: { icon: "w-12 h-12", container: "w-16 h-16", text: "text-2xl", tagline: "text-xs" },
    lg: { icon: "w-16 h-16", container: "w-20 h-20", text: "text-3xl", tagline: "text-xs" },
    xl: { icon: "w-20 h-20", container: "w-24 h-24", text: "text-4xl", tagline: "text-sm" }
  };

  const config = sizeConfig[size];

  return (
    <motion.div 
      className={`flex items-center gap-4 ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className={`${config.container} relative rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 flex items-center justify-center shadow-xl overflow-visible`}
        animate={{ 
          rotate: [0, -3, 3, -3, 0],
          scale: [1, 1.02, 1]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.08 }}
      >
        <motion.div 
          className="absolute inset-0 rounded-2xl blur-xl opacity-50"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #D946EF, #F59E0B)" }}
          animate={{ opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <AvocadoIcon className={`${config.icon} drop-shadow-lg relative z-10`} animate showParticles={false} />
        
        <motion.div 
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400"
          animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.div 
          className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-fuchsia-400"
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
        />
      </motion.div>

      {showText && (
        <motion.div 
          className="flex flex-col"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <motion.h1 
            className={`${config.text} font-black leading-tight`}
            animate={{ 
              textShadow: [
                "0 0 10px rgba(139, 92, 246, 0.2)",
                "0 0 20px rgba(217, 70, 239, 0.3)",
                "0 0 10px rgba(139, 92, 246, 0.2)"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="text-foreground">Holy </span>
            <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
              GuacAmoli!
            </span>
          </motion.h1>
          <motion.p 
            className={`${config.tagline} uppercase tracking-[0.2em] font-semibold bg-gradient-to-r from-fuchsia-500 to-amber-500 bg-clip-text text-transparent`}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            Dip into the facts!
          </motion.p>
        </motion.div>
      )}
    </motion.div>
  );
}
