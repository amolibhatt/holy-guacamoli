import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "compact";
  showSparkles?: boolean;
  variant?: "light" | "dark";
}

function AvocadoWithHat({ size = 32 }: { size?: number }) {
  const hatSize = size * 0.5;
  
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Party hat */}
      <svg 
        width={hatSize} 
        height={hatSize} 
        viewBox="0 0 24 24" 
        className="absolute -top-1 left-1/2 -translate-x-1/2 z-10"
        style={{ marginTop: -hatSize * 0.3 }}
      >
        <defs>
          <linearGradient id="partyHat" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0abfc" />
            <stop offset="50%" stopColor="#e879f9" />
            <stop offset="100%" stopColor="#c026d3" />
          </linearGradient>
        </defs>
        <path d="M12 2 L20 20 L4 20 Z" fill="url(#partyHat)" />
        <circle cx="12" cy="2" r="2" fill="#fef08a" />
      </svg>
      
      {/* Avocado emoji */}
      <span style={{ fontSize: size * 0.75 }} className="relative top-1">🥑</span>
    </div>
  );
}

export function Logo({ size = "md" }: LogoProps) {
  const sizeConfig = {
    sm: { text: "text-lg", icon: 28, gap: "gap-2" },
    md: { text: "text-xl sm:text-2xl", icon: 36, gap: "gap-2" },
    lg: { text: "text-2xl sm:text-3xl", icon: 44, gap: "gap-3" },
    compact: { text: "text-sm", icon: 22, gap: "gap-1" }
  };

  const config = sizeConfig[size];

  return (
    <motion.div 
      className={`flex items-center ${config.gap}`}
      whileHover={{ scale: 1.02 }}
    >
      <AvocadoWithHat size={config.icon} />
      
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
