import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "compact";
  showSparkles?: boolean;
  variant?: "light" | "dark";
}

function HolyAvocado({ size = 40 }: { size?: number }) {
  const id = `avocado-${Math.random().toString(36).slice(2, 9)}`;
  
  return (
    <svg 
      width={size} 
      height={size * 1.1} 
      viewBox="0 0 80 88" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        {/* Halo gradient - golden shimmer */}
        <linearGradient id={`${id}-halo`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFA500" />
        </linearGradient>
        
        {/* Flesh gradient - vibrant lime */}
        <linearGradient id={`${id}-flesh`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#76FF03" />
          <stop offset="50%" stopColor="#64DD17" />
          <stop offset="100%" stopColor="#AEEA00" />
        </linearGradient>
        
        {/* Pit gradient - warm brown */}
        <radialGradient id={`${id}-pit`} cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#A1887F" />
          <stop offset="100%" stopColor="#5D4037" />
        </radialGradient>
      </defs>
      
      {/* Halo - golden gradient */}
      <ellipse 
        cx="40" 
        cy="10" 
        rx="15" 
        ry="5" 
        fill="none" 
        stroke={`url(#${id}-halo)`}
        strokeWidth="4"
      />
      
      {/* Left Wing */}
      <ellipse cx="12" cy="44" rx="12" ry="10" fill="white" opacity="0.95"/>
      
      {/* Right Wing */}
      <ellipse cx="68" cy="44" rx="12" ry="10" fill="white" opacity="0.95"/>
      
      {/* Avocado Body - solid dark green skin */}
      <ellipse cx="40" cy="52" rx="24" ry="32" fill="#2D5016"/>
      
      {/* Avocado flesh - vibrant gradient */}
      <ellipse cx="40" cy="54" rx="18" ry="25" fill={`url(#${id}-flesh)`}/>
      
      {/* Pit - radial gradient */}
      <ellipse cx="40" cy="62" rx="10" ry="13" fill={`url(#${id}-pit)`}/>
      
      {/* Happy closed eyes */}
      <path 
        d="M28 40 Q32 35 36 40" 
        stroke="#1B5E20" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
      />
      <path 
        d="M44 40 Q48 35 52 40" 
        stroke="#1B5E20" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
      />
      
      {/* Rosy cheeks */}
      <ellipse cx="24" cy="46" rx="5" ry="3" fill="#F48FB1" opacity="0.6"/>
      <ellipse cx="56" cy="46" rx="5" ry="3" fill="#F48FB1" opacity="0.6"/>
      
      {/* Smile */}
      <path 
        d="M34 50 Q40 56 46 50" 
        stroke="#1B5E20" 
        strokeWidth="2.5" 
        fill="none" 
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ size = "md" }: LogoProps) {
  const sizeConfig = {
    sm: { text: "text-lg", icon: 40, gap: "gap-2" },
    md: { text: "text-xl sm:text-2xl", icon: 48, gap: "gap-3" },
    lg: { text: "text-2xl sm:text-3xl", icon: 60, gap: "gap-3" },
    compact: { text: "text-sm", icon: 32, gap: "gap-1.5" }
  };

  const config = sizeConfig[size];

  return (
    <motion.div 
      className={`flex items-center ${config.gap}`}
      whileHover={{ scale: 1.02 }}
    >
      <HolyAvocado size={config.icon} />
      
      <h1 
        className={`${config.text} font-black tracking-tight leading-none relative`}
        style={{ fontFamily: "'Archivo Black', 'Impact', sans-serif" }}
      >
        {/* Glow layer */}
        <span 
          className="absolute inset-0 blur-sm opacity-50"
          aria-hidden="true"
        >
          <span style={{ color: '#39FF14' }}>Holy </span>
          <span style={{ color: '#39FF14' }}>Guac</span>
          <span style={{ color: '#BC13FE' }}>Amoli!</span>
        </span>
        
        {/* Main text - segmented colors */}
        <span className="relative">
          <span className="text-white">Holy </span>
          <span style={{ color: '#39FF14' }}>Guac</span>
          <span style={{ color: '#BC13FE' }}>Amoli!</span>
        </span>
      </h1>
    </motion.div>
  );
}
