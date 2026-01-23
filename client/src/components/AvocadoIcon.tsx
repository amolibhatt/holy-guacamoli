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
        cx="6" cy="22" r="2" fill="#FBBF24"
        animate={animate ? { y: [0, -4, 0], opacity: [0.6, 1, 0.6] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.circle 
        cx="58" cy="24" r="2.5" fill="#EC4899"
        animate={animate ? { y: [0, -5, 0], opacity: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 2.2, repeat: Infinity, delay: 0.3 }}
      />
      <motion.circle 
        cx="10" cy="55" r="1.5" fill="#A855F7"
        animate={animate ? { y: [0, -3, 0], scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 1.8, repeat: Infinity, delay: 0.6 }}
      />
      <motion.circle 
        cx="54" cy="58" r="2" fill="#FBBF24"
        animate={animate ? { y: [0, -4, 0], opacity: [0.6, 1, 0.6] } : {}}
        transition={{ duration: 2.4, repeat: Infinity, delay: 0.2 }}
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
        {/* Rich green avocado skin gradient */}
        <linearGradient id="avoSkinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="30%" stopColor="#22C55E" />
          <stop offset="70%" stopColor="#16A34A" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
        
        {/* Creamy avocado flesh gradient */}
        <linearGradient id="avoFleshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="40%" stopColor="#D9F99D" />
          <stop offset="100%" stopColor="#BEF264" />
        </linearGradient>
        
        {/* Brown pit gradient */}
        <radialGradient id="avoPitGradient" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#A16207" />
          <stop offset="50%" stopColor="#854D0E" />
          <stop offset="100%" stopColor="#713F12" />
        </radialGradient>
        
        {/* Festive party hat gradient */}
        <linearGradient id="partyHatGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        
        {/* Party hat stripes */}
        <linearGradient id="stripeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        
        {/* Pompom gradient */}
        <radialGradient id="pompomGradient" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="70%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
        
        {/* Glow effects */}
        <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Soft shadow */}
        <filter id="softShadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#16A34A" floodOpacity="0.4"/>
        </filter>
        
        {/* Inner glow for flesh */}
        <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feComposite in="blur" in2="SourceGraphic" operator="atop"/>
        </filter>
      </defs>
      
      {/* Particles */}
      {particles}
      
      {/* Sparkle stars */}
      <g filter="url(#glowFilter)">
        <path d="M8 18 L9 15 L10 18 L13 19 L10 20 L9 23 L8 20 L5 19 Z" fill="#FBBF24" opacity="0.9" />
        <path d="M56 50 L57 47 L58 50 L61 51 L58 52 L57 55 L56 52 L53 51 Z" fill="#FBBF24" opacity="0.9" />
        <path d="M12 62 L13 60 L14 62 L16 63 L14 64 L13 66 L12 64 L10 63 Z" fill="white" opacity="0.8" />
        <path d="M52 14 L53 12 L54 14 L56 15 L54 16 L53 18 L52 16 L50 15 Z" fill="white" opacity="0.8" />
      </g>
      
      {/* Main avocado body */}
      <path
        d="M32 22 C18 22 10 36 10 52 C10 66 19 70 32 70 C45 70 54 66 54 52 C54 36 46 22 32 22Z"
        fill="url(#avoSkinGradient)"
        filter="url(#softShadow)"
      />
      
      {/* Skin highlight */}
      <path
        d="M32 24 C22 24 15 34 14 48 C14 38 22 26 32 26 C42 26 48 36 48 48 C47 34 42 24 32 24Z"
        fill="white"
        opacity="0.15"
      />
      
      {/* Avocado flesh */}
      <ellipse cx="32" cy="52" rx="18" ry="14" fill="url(#avoFleshGradient)" />
      
      {/* Flesh highlight */}
      <ellipse cx="28" cy="48" rx="8" ry="5" fill="white" opacity="0.3" />
      
      {/* Pit with 3D effect */}
      <ellipse cx="32" cy="54" rx="9" ry="8" fill="url(#avoPitGradient)" />
      <ellipse cx="29" cy="51" rx="3" ry="2.5" fill="#CA8A04" opacity="0.5" />
      
      {/* Eyes */}
      <ellipse cx="25" cy="44" rx="4" ry="4.5" fill="white" />
      <ellipse cx="39" cy="44" rx="4" ry="4.5" fill="white" />
      <circle cx="25" cy="45" r="2.5" fill="#1F2937" />
      <circle cx="39" cy="45" r="2.5" fill="#1F2937" />
      <circle cx="26" cy="44" r="1" fill="white" />
      <circle cx="40" cy="44" r="1" fill="white" />
      
      {/* Happy smile */}
      <path
        d="M27 50 Q32 55 37 50"
        stroke="#1F2937"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Blush cheeks */}
      <ellipse cx="19" cy="48" rx="3.5" ry="2.5" fill="#FDA4AF" opacity="0.6" />
      <ellipse cx="45" cy="48" rx="3.5" ry="2.5" fill="#FDA4AF" opacity="0.6" />
      
      {/* Party hat */}
      <path
        d="M20 22 L32 2 L44 22"
        fill="url(#partyHatGradient)"
      />
      
      {/* Party hat stripes */}
      <path d="M24 18 L28 8" stroke="url(#stripeGradient)" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <path d="M32 16 L32 6" stroke="url(#stripeGradient)" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <path d="M40 18 L36 8" stroke="url(#stripeGradient)" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      
      {/* Hat trim */}
      <ellipse cx="32" cy="22" rx="12" ry="2" fill="#F472B6" opacity="0.6" />
      
      {/* Pompom with fluffy effect */}
      <circle cx="32" cy="2" r="5" fill="url(#pompomGradient)" />
      <circle cx="30" cy="0" r="2" fill="#FDE68A" opacity="0.8" />
      <circle cx="34" cy="3" r="1.5" fill="#FBBF24" opacity="0.7" />
      <circle cx="32" cy="1" r="1" fill="white" opacity="0.6" />
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
        className={`${config.container} relative flex items-center justify-center`}
        animate={{ 
          rotate: [0, -3, 3, -3, 0],
          y: [0, -4, 0]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.08 }}
      >
        <AvocadoIcon className={`${config.icon} drop-shadow-lg`} />
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
                "0 0 10px rgba(34, 197, 94, 0.2)",
                "0 0 20px rgba(34, 197, 94, 0.3)",
                "0 0 10px rgba(34, 197, 94, 0.2)"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="text-foreground">Holy </span>
            <span className="bg-gradient-to-r from-green-500 via-emerald-400 to-lime-400 bg-clip-text text-transparent relative">
              GuacAmoli!
              <motion.span 
                className="absolute -top-2 -right-4 text-yellow-400"
                animate={{ 
                  scale: [1, 1.3, 1],
                  rotate: [0, 15, -15, 0],
                  opacity: [0.6, 1, 0.6]
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              >
                ✨
              </motion.span>
              <motion.span 
                className="absolute -bottom-1 -left-3 text-lime-400"
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, -10, 10, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              >
                ✨
              </motion.span>
            </span>
          </motion.h1>
          <motion.p 
            className={`${config.tagline} uppercase tracking-[0.2em] font-semibold bg-gradient-to-r from-green-500 to-lime-400 bg-clip-text text-transparent`}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            Dip into the fun!
          </motion.p>
        </motion.div>
      )}
    </motion.div>
  );
}
