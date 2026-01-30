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
      {/* Party Hat */}
      <defs>
        <linearGradient id="hatGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF69B4" />
          <stop offset="50%" stopColor="#BC13FE" />
          <stop offset="100%" stopColor="#8B008B" />
        </linearGradient>
        <filter id="hatGlow">
          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="eyeGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Party Hat - Metallic Magenta */}
      <path 
        d="M32 4 L42 20 L22 20 Z" 
        fill="url(#hatGradient)" 
        filter="url(#hatGlow)"
        stroke="#FF00FF"
        strokeWidth="0.5"
      />
      {/* Hat pom-pom */}
      <circle cx="32" cy="4" r="3" fill="#FF00FF" filter="url(#hatGlow)" />
      {/* Hat stripes */}
      <path d="M27 16 L32 8 L37 16" stroke="#FFD700" strokeWidth="1" fill="none" opacity="0.6" />
      
      {/* Avocado Body */}
      <ellipse 
        cx="32" 
        cy="40" 
        rx="18" 
        ry="22" 
        fill="#2D5016"
      />
      {/* Avocado inner (lighter green) */}
      <ellipse 
        cx="32" 
        cy="42" 
        rx="14" 
        ry="17" 
        fill="#8FBC3A"
      />
      {/* Avocado pit */}
      <ellipse 
        cx="32" 
        cy="48" 
        rx="7" 
        ry="9" 
        fill="#5D4E37"
      />
      
      {/* Glowing Neon Green Eyes */}
      <g filter="url(#eyeGlow)">
        {/* Left Eye */}
        <ellipse cx="26" cy="36" rx="4" ry="5" fill="#0a0a0a" />
        <ellipse cx="26" cy="36" rx="2.5" ry="3" fill="#39FF14" />
        <ellipse cx="25" cy="35" rx="1" ry="1.5" fill="#AAFFAA" />
        
        {/* Right Eye */}
        <ellipse cx="38" cy="36" rx="4" ry="5" fill="#0a0a0a" />
        <ellipse cx="38" cy="36" rx="2.5" ry="3" fill="#39FF14" />
        <ellipse cx="37" cy="35" rx="1" ry="1.5" fill="#AAFFAA" />
      </g>
      
      {/* Smile */}
      <path 
        d="M28 44 Q32 48 36 44" 
        stroke="#2D5016" 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ size = "md" }: LogoProps) {
  const sizeConfig = {
    sm: { text: "text-lg", icon: 28, gap: "gap-2" },
    md: { text: "text-xl sm:text-2xl", icon: 36, gap: "gap-2" },
    lg: { text: "text-2xl sm:text-3xl", icon: 44, gap: "gap-3" },
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
        {/* Chromatic aberration layers */}
        <span 
          className="absolute inset-0 opacity-70"
          style={{ 
            color: '#00FFFF', 
            transform: 'translateX(-2px)',
            clipPath: 'inset(0 0 0 0)',
          }}
          aria-hidden="true"
        >
          Holy GuacAmoli!
        </span>
        <span 
          className="absolute inset-0 opacity-70"
          style={{ 
            color: '#FF0080', 
            transform: 'translateX(2px)',
            clipPath: 'inset(0 0 0 0)',
          }}
          aria-hidden="true"
        >
          Holy GuacAmoli!
        </span>
        
        {/* Main text */}
        <span className="relative">
          <span className="text-white">Holy </span>
          <span style={{ color: '#39FF14' }}>Guac</span>
          <span style={{ color: '#BC13FE' }}>Amoli!</span>
        </span>
      </h1>
    </motion.div>
  );
}
