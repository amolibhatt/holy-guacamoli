import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "compact";
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
        {/* Toxic lime glow */}
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Halo gradient - toxic lime */}
        <linearGradient id={`${id}-halo`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#39FF14" />
          <stop offset="100%" stopColor="#84cc16" />
        </linearGradient>
        
        {/* Skin - deep hass green */}
        <linearGradient id={`${id}-skin`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#365314" />
          <stop offset="100%" stopColor="#1a2e05" />
        </linearGradient>
        
        {/* Flesh gradient - toxic lime to avocado */}
        <linearGradient id={`${id}-flesh`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#39FF14" />
          <stop offset="40%" stopColor="#a3e635" />
          <stop offset="100%" stopColor="#65a30d" />
        </linearGradient>
        
        {/* Pit gradient - warm brown */}
        <radialGradient id={`${id}-pit`} cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#A1887F" />
          <stop offset="100%" stopColor="#5D4037" />
        </radialGradient>
      </defs>
      
      {/* Outer glow */}
      <ellipse cx="40" cy="52" rx="28" ry="36" fill="#39FF14" opacity="0.15" filter={`url(#${id}-glow)`}/>
      
      {/* Halo - toxic lime */}
      <ellipse 
        cx="40" 
        cy="8" 
        rx="14" 
        ry="4" 
        fill="none" 
        stroke={`url(#${id}-halo)`}
        strokeWidth="3"
      />
      
      {/* Avocado Body - deep hass green skin */}
      <ellipse cx="40" cy="52" rx="24" ry="32" fill={`url(#${id}-skin)`}/>
      
      {/* Avocado flesh - toxic lime gradient */}
      <ellipse cx="40" cy="54" rx="18" ry="25" fill={`url(#${id}-flesh)`}/>
      
      {/* Pit - radial gradient */}
      <ellipse cx="40" cy="62" rx="10" ry="13" fill={`url(#${id}-pit)`}/>
      
      {/* Pit highlight */}
      <ellipse cx="37" cy="58" rx="4" ry="5" fill="#BCAAA4" opacity="0.4"/>
      
      {/* Happy closed eyes */}
      <path 
        d="M28 42 Q32 37 36 42" 
        stroke="#1a2e05" 
        strokeWidth="2.5" 
        fill="none" 
        strokeLinecap="round"
      />
      <path 
        d="M44 42 Q48 37 52 42" 
        stroke="#1a2e05" 
        strokeWidth="2.5" 
        fill="none" 
        strokeLinecap="round"
      />
      
      {/* Rosy cheeks - subtle fuchsia accent */}
      <ellipse cx="24" cy="48" rx="4" ry="2.5" fill="#d946ef" opacity="0.4"/>
      <ellipse cx="56" cy="48" rx="4" ry="2.5" fill="#d946ef" opacity="0.4"/>
      
      {/* Smile */}
      <path 
        d="M34 52 Q40 58 46 52" 
        stroke="#1a2e05" 
        strokeWidth="2" 
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
    xl: { text: "text-3xl sm:text-4xl", icon: 72, gap: "gap-4" },
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
          className="absolute inset-0 blur-md opacity-60"
          aria-hidden="true"
        >
          <span style={{ color: '#39FF14' }}>Holy Guac</span>
          <span style={{ color: '#d946ef' }}>Amoli!</span>
        </span>
        
        {/* Main text */}
        <span className="relative">
          <span style={{ color: '#39FF14' }}>Holy </span>
          <span style={{ color: '#a3e635' }}>Guac</span>
          <span style={{ color: '#d946ef' }}>Amoli!</span>
        </span>
      </h1>
    </motion.div>
  );
}
