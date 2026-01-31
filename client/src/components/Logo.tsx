import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "compact";
  variant?: "light" | "dark";
}

function HolyAvocado({ size = 40 }: { size?: number }) {
  const id = `avocado-${Math.random().toString(36).slice(2, 9)}`;
  
  return (
    <motion.svg 
      width={size} 
      height={size * 1.1} 
      viewBox="0 0 80 88" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      animate={{ 
        rotate: [0, -4, 4, -3, 3, 0],
        y: [0, -2, 0, -1, 0],
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut"
      }}
    >
      <defs>
        {/* Sparkle filter */}
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Halo gradient - golden party */}
        <linearGradient id={`${id}-halo`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        
        {/* Skin - deep hass green */}
        <linearGradient id={`${id}-skin`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#365314" />
          <stop offset="100%" stopColor="#1a2e05" />
        </linearGradient>
        
        {/* Flesh gradient - bright lime */}
        <linearGradient id={`${id}-flesh`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#39FF14" />
          <stop offset="40%" stopColor="#a3e635" />
          <stop offset="100%" stopColor="#65a30d" />
        </linearGradient>
      </defs>
      
      {/* Outer glow - pulsing */}
      <motion.ellipse 
        cx="40" cy="52" rx="28" ry="36" 
        fill="#39FF14" 
        opacity="0.1" 
        filter={`url(#${id}-glow)`}
        animate={{ opacity: [0.05, 0.15, 0.05] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {/* Party sparkles - keeping these! */}
      <motion.circle
        cx="12" cy="22" r="2.5"
        fill="#fbbf24"
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], y: [0, -3, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
      />
      <motion.circle
        cx="68" cy="18" r="2"
        fill="#f472b6"
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], y: [0, -2, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
      />
      <motion.circle
        cx="72" cy="48" r="2.5"
        fill="#39FF14"
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], x: [0, 2, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
      />
      <motion.circle
        cx="8" cy="58" r="2"
        fill="#fbbf24"
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], x: [0, -2, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
      />
      <motion.circle
        cx="25" cy="12" r="1.5"
        fill="#f472b6"
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.8 }}
      />
      <motion.circle
        cx="55" cy="10" r="1.5"
        fill="#a3e635"
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 1.2 }}
      />
      
      {/* Halo - golden shimmer with rotation */}
      <motion.ellipse 
        cx="40" 
        cy="8" 
        rx="14" 
        ry="4" 
        fill="none" 
        stroke={`url(#${id}-halo)`}
        strokeWidth="3"
        animate={{ 
          opacity: [0.6, 1, 0.6],
          scaleX: [1, 1.05, 1],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      
      {/* Avocado Body - deep hass green skin */}
      <ellipse cx="40" cy="52" rx="24" ry="32" fill={`url(#${id}-skin)`}/>
      
      {/* Avocado flesh - bright lime gradient */}
      <ellipse cx="40" cy="54" rx="18" ry="25" fill={`url(#${id}-flesh)`}/>
      
      {/* Big sparkly eyes with blink */}
      <motion.g
        animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
        transition={{ duration: 3, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
      >
        <ellipse cx="32" cy="42" rx="4" ry="5" fill="#1a2e05"/>
        <ellipse cx="48" cy="42" rx="4" ry="5" fill="#1a2e05"/>
        {/* Eye sparkles */}
        <circle cx="33" cy="40" r="1.5" fill="white"/>
        <circle cx="49" cy="40" r="1.5" fill="white"/>
      </motion.g>
      
      {/* Rosy cheeks - pulsing pink party blush */}
      <motion.ellipse 
        cx="22" cy="50" rx="5" ry="3" 
        fill="#f472b6" 
        animate={{ opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.ellipse 
        cx="58" cy="50" rx="5" ry="3" 
        fill="#f472b6" 
        animate={{ opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
      />
      
      {/* Big happy smile */}
      <path 
        d="M32 54 Q40 62 48 54" 
        stroke="#1a2e05" 
        strokeWidth="2.5" 
        fill="none" 
        strokeLinecap="round"
      />
    </motion.svg>
  );
}

export function Logo({ size = "md" }: LogoProps) {
  const sizeConfig = {
    sm: { text: "text-lg", icon: 40, gap: "gap-2" },
    md: { text: "text-xl sm:text-2xl", icon: 48, gap: "gap-3" },
    lg: { text: "text-2xl sm:text-3xl", icon: 60, gap: "gap-3" },
    xl: { text: "text-3xl sm:text-4xl", icon: 72, gap: "gap-4" },
    compact: { text: "text-sm", icon: 32, gap: "gap-1.5" }
  };

  const config = sizeConfig[size];

  return (
    <motion.div 
      className={`flex items-center ${config.gap}`}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400 }}
    >
      <HolyAvocado size={config.icon} />
      
      <h1 
        className={`${config.text} font-black tracking-tight leading-none relative whitespace-nowrap`}
        style={{ fontFamily: "'Archivo Black', 'Impact', sans-serif" }}
      >
        {/* Glow layer */}
        <span 
          className="absolute inset-0 blur-md opacity-40 whitespace-nowrap"
          aria-hidden="true"
        >
          <span className="text-white">Holy </span>
          <span style={{ color: '#a3e635' }}>Guac</span>
          <span style={{ color: '#f472b6' }}>Amoli!</span>
        </span>
        
        {/* Main text */}
        <span className="relative whitespace-nowrap">
          <span className="text-white">Holy </span>
          <span style={{ color: '#a3e635' }}>Guac</span>
          <motion.span 
            className="bg-gradient-to-r from-pink-400 via-rose-300 to-pink-400 bg-clip-text text-transparent inline"
            style={{ backgroundSize: '200% 100%' }}
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >Amoli!</motion.span>
        </span>
      </h1>
    </motion.div>
  );
}
