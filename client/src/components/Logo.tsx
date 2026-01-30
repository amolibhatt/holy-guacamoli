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
          <stop offset="0%" stopColor="#f0abfc" />
          <stop offset="50%" stopColor="#e879f9" />
          <stop offset="100%" stopColor="#c026d3" />
        </linearGradient>
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Party Hat */}
      <path 
        d="M32 8 L38 18 L26 18 Z" 
        fill="url(#hatGradient)"
      />
      <circle cx="32" cy="8" r="2" fill="#f0abfc" />
      
      {/* Avocado Body - Friendly green */}
      <ellipse cx="32" cy="40" rx="15" ry="18" fill="#4ade80"/>
      
      {/* Avocado inner - lighter */}
      <ellipse cx="32" cy="42" rx="11" ry="13" fill="#86efac"/>
      
      {/* Pit - warm brown */}
      <ellipse cx="32" cy="45" rx="5" ry="6" fill="#a16207"/>
      
      {/* Friendly Eyes - simple dots */}
      <g filter="url(#softGlow)">
        <circle cx="27" cy="36" r="2.5" fill="#0f172a" />
        <circle cx="37" cy="36" r="2.5" fill="#0f172a" />
        {/* Eye shine */}
        <circle cx="26" cy="35" r="0.8" fill="white" />
        <circle cx="36" cy="35" r="0.8" fill="white" />
      </g>
      
      {/* Cute smile */}
      <path 
        d="M28 42 Q32 46 36 42" 
        stroke="#0f172a" 
        strokeWidth="1.5" 
        fill="none" 
        strokeLinecap="round"
      />
      
      {/* Rosy cheeks */}
      <circle cx="24" cy="40" r="2" fill="#fda4af" opacity="0.6" />
      <circle cx="40" cy="40" r="2" fill="#fda4af" opacity="0.6" />
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
        {/* Subtle chromatic aberration */}
        <span 
          className="absolute inset-0 opacity-30 blur-[0.5px]"
          style={{ 
            color: '#22d3ee', 
            transform: 'translateX(-1px)',
          }}
          aria-hidden="true"
        >
          Holy GuacAmoli!
        </span>
        <span 
          className="absolute inset-0 opacity-30 blur-[0.5px]"
          style={{ 
            color: '#e879f9', 
            transform: 'translateX(1px)',
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
