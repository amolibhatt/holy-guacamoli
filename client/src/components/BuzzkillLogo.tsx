import { motion } from "framer-motion";

interface BuzzkillLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  animate?: boolean;
  className?: string;
  showText?: boolean;
}

export function BuzzkillLogo({ 
  size = "md", 
  animate = true,
  className = "",
  showText = false
}: BuzzkillLogoProps) {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-14 h-14", 
    lg: "w-20 h-20",
    xl: "w-28 h-28"
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-5xl"
  };

  const logoContent = (
    <div className="relative">
      <motion.div 
        className="absolute inset-0 rounded-full blur-2xl opacity-40 scale-125" 
        style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #D946EF 50%, #F59E0B 100%)" }}
        animate={animate ? { 
          scale: [1.2, 1.4, 1.2],
          opacity: [0.3, 0.5, 0.3]
        } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <svg viewBox="0 0 64 80" className={`${sizeClasses[size]} relative z-10 drop-shadow-lg ${className}`}>
        <defs>
          <linearGradient id="avoSkinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="avoPitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4A574" />
            <stop offset="100%" stopColor="#8B5A2B" />
          </linearGradient>
          <linearGradient id="partyHatGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="35%" stopColor="#D946EF" />
            <stop offset="65%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id="pompomGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <path 
          d="M32 24 C16 24 6 40 6 58 C6 76 18 80 32 80 C46 80 58 76 58 58 C58 40 48 24 32 24Z" 
          fill="url(#avoSkinGrad)"
          filter="url(#glow)"
        />
        
        <ellipse cx="32" cy="58" rx="18" ry="17" fill="#FFF8E1" />
        <circle cx="32" cy="62" r="10" fill="url(#avoPitGrad)" />
        <ellipse cx="28" cy="59" rx="3" ry="3.5" fill="#E8C9A0" opacity="0.5" />
        
        <motion.g
          animate={animate ? { y: [0, -1, 0] } : {}}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
        >
          <circle cx="24" cy="48" r="4.5" fill="#1A1A2E" />
          <circle cx="40" cy="48" r="4.5" fill="#1A1A2E" />
          <circle cx="25.5" cy="46" r="2" fill="white" />
          <circle cx="41.5" cy="46" r="2" fill="white" />
        </motion.g>
        
        <motion.path 
          d="M24 56 Q32 64 40 56" 
          stroke="#1A1A2E" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          fill="none"
          animate={animate ? { d: ["M24 56 Q32 64 40 56", "M24 56 Q32 66 40 56", "M24 56 Q32 64 40 56"] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        <motion.circle 
          cx="17" cy="54" r="4.5" fill="#EC4899" opacity="0.5"
          animate={animate ? { opacity: [0.4, 0.6, 0.4] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.circle 
          cx="47" cy="54" r="4.5" fill="#EC4899" opacity="0.5"
          animate={animate ? { opacity: [0.4, 0.6, 0.4] } : {}}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
        />
        
        <motion.g
          animate={animate ? { rotate: [-3, 3, -3], y: [0, -1, 0] } : {}}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "32px 24px" }}
        >
          <path d="M18 24 L32 2 L46 24" fill="url(#partyHatGrad)" />
          <line x1="22" y1="20" x2="22" y2="12" stroke="white" strokeWidth="2.5" opacity="0.6" strokeLinecap="round" />
          <line x1="32" y1="18" x2="32" y2="8" stroke="white" strokeWidth="2.5" opacity="0.6" strokeLinecap="round" />
          <line x1="42" y1="20" x2="42" y2="12" stroke="white" strokeWidth="2.5" opacity="0.6" strokeLinecap="round" />
          
          <motion.circle 
            cx="32" cy="2" r="5" 
            fill="url(#pompomGrad)"
            animate={animate ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        </motion.g>
      </svg>
      
      <motion.div 
        className="absolute -top-2 -left-3 w-2.5 h-2.5 rounded-full"
        style={{ background: "linear-gradient(135deg, #EC4899, #D946EF)" }}
        animate={animate ? { 
          y: [0, -12, 0], 
          x: [0, -4, 0],
          opacity: [0.8, 1, 0.8], 
          rotate: [0, 180, 360],
          scale: [1, 1.2, 1]
        } : {}}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
      <motion.div 
        className="absolute -top-3 right-0 w-2 h-2 rounded-full"
        style={{ background: "linear-gradient(135deg, #8B5CF6, #A855F7)" }}
        animate={animate ? { 
          y: [0, -10, 0], 
          x: [0, 4, 0],
          opacity: [0.6, 1, 0.6] 
        } : {}}
        transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
      />
      <motion.div 
        className="absolute top-2 -right-4 w-2.5 h-2.5 rounded-full"
        style={{ background: "linear-gradient(135deg, #FBBF24, #F59E0B)" }}
        animate={animate ? { 
          y: [0, -8, 0], 
          rotate: [0, -180, -360],
          scale: [1, 1.3, 1]
        } : {}}
        transition={{ duration: 2.8, repeat: Infinity, delay: 0.8 }}
      />
      <motion.div 
        className="absolute bottom-4 -left-2 w-1.5 h-1.5 rounded-full bg-fuchsia-400"
        animate={animate ? { 
          y: [0, -6, 0], 
          opacity: [0.5, 1, 0.5]
        } : {}}
        transition={{ duration: 1.8, repeat: Infinity, delay: 1.2 }}
      />
      <motion.div 
        className="absolute bottom-6 -right-2 w-1.5 h-1.5 rounded-full bg-violet-400"
        animate={animate ? { 
          y: [0, -5, 0], 
          opacity: [0.5, 1, 0.5]
        } : {}}
        transition={{ duration: 2.2, repeat: Infinity, delay: 0.6 }}
      />
    </div>
  );

  const textContent = showText && (
    <motion.div 
      className="flex flex-col items-start"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <motion.h1 
        className={`${textSizes[size]} font-black tracking-tight leading-none`}
        animate={animate ? { 
          textShadow: [
            "0 0 20px rgba(139, 92, 246, 0.3)",
            "0 0 35px rgba(217, 70, 239, 0.5)",
            "0 0 20px rgba(139, 92, 246, 0.3)"
          ]
        } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
          Buzz
        </span>
        <motion.span 
          className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 bg-clip-text text-transparent"
          animate={animate ? { opacity: [1, 0.85, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        >
          kill
        </motion.span>
      </motion.h1>
      <motion.p 
        className="text-xs text-muted-foreground mt-0.5 tracking-wide"
        animate={animate ? { opacity: [0.6, 1, 0.6] } : {}}
        transition={{ duration: 3, repeat: Infinity }}
      >
        Party Quiz Game
      </motion.p>
    </motion.div>
  );

  if (animate) {
    return (
      <motion.div 
        className="relative flex items-center gap-3"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        animate={{ y: [0, -4, 0] }}
        transition={{ y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
      >
        {logoContent}
        {textContent}
      </motion.div>
    );
  }

  return (
    <div className="relative flex items-center gap-3">
      {logoContent}
      {textContent}
    </div>
  );
}
