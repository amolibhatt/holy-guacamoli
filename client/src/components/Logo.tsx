import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "compact";
  showSparkles?: boolean;
  variant?: "light" | "dark";
}

function AvocadoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="hatGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e879f9" />
          <stop offset="50%" stopColor="#BC13FE" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
        <filter id="eyeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Party Hat - Metallic Magenta matching page accent */}
      <path 
        d="M32 6 L40 18 L24 18 Z" 
        fill="url(#hatGradient)"
      />
      <circle cx="32" cy="6" r="2" fill="#e879f9" />
      
      {/* Avocado Body - Dark to match page bg */}
      <ellipse cx="32" cy="40" rx="16" ry="20" fill="#1a1a1f" stroke="#333" strokeWidth="1"/>
      
      {/* Avocado inner */}
      <ellipse cx="32" cy="42" rx="12" ry="15" fill="#2a2a30"/>
      
      {/* Pit */}
      <ellipse cx="32" cy="46" rx="5" ry="7" fill="#1a1a1f" stroke="#333" strokeWidth="0.5"/>
      
      {/* Glowing Neon Green Eyes */}
      <g filter="url(#eyeGlow)">
        <circle cx="27" cy="35" r="3" fill="#39FF14" />
        <circle cx="37" cy="35" r="3" fill="#39FF14" />
        <circle cx="26" cy="34" r="1" fill="#aaffaa" />
        <circle cx="36" cy="34" r="1" fill="#aaffaa" />
      </g>
    </svg>
  );
}

export function Logo({ size = "md" }: LogoProps) {
  const sizeConfig = {
    sm: { text: "text-lg", icon: 28, gap: "gap-2" },
    md: { text: "text-xl sm:text-2xl", icon: 32, gap: "gap-2" },
    lg: { text: "text-2xl sm:text-3xl", icon: 40, gap: "gap-3" },
    compact: { text: "text-sm", icon: 20, gap: "gap-1" }
  };

  const config = sizeConfig[size];

  return (
    <motion.div 
      className={`flex items-center ${config.gap}`}
      whileHover={{ scale: 1.02 }}
    >
      <AvocadoIcon size={config.icon} />
      
      <h1 
        className={`${config.text} font-black tracking-tight leading-none relative`}
        style={{ fontFamily: "'Archivo Black', 'Impact', sans-serif" }}
      >
        {/* Subtle chromatic aberration - matches page glow style */}
        <span 
          className="absolute inset-0 opacity-40 blur-[0.5px]"
          style={{ 
            color: '#22d3ee', 
            transform: 'translateX(-1px)',
          }}
          aria-hidden="true"
        >
          Holy GuacAmoli!
        </span>
        <span 
          className="absolute inset-0 opacity-40 blur-[0.5px]"
          style={{ 
            color: '#e879f9', 
            transform: 'translateX(1px)',
          }}
          aria-hidden="true"
        >
          Holy GuacAmoli!
        </span>
        
        {/* Main text - same colors as page */}
        <span className="relative">
          <span className="text-white">Holy </span>
          <span style={{ color: '#39FF14' }}>Guac</span>
          <span style={{ color: '#BC13FE' }}>Amoli!</span>
        </span>
      </h1>
    </motion.div>
  );
}
