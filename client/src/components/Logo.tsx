import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "compact";
  showSparkles?: boolean;
  variant?: "light" | "dark";
}

function HolyAvocado({ size = 40 }: { size?: number }) {
  return (
    <svg 
      width={size} 
      height={size * 1.1} 
      viewBox="0 0 80 88" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Halo - bright yellow gold */}
      <ellipse 
        cx="40" 
        cy="10" 
        rx="15" 
        ry="5" 
        fill="none" 
        stroke="#FFEB3B" 
        strokeWidth="5"
      />
      
      {/* Left Wing */}
      <ellipse cx="12" cy="44" rx="12" ry="10" fill="white"/>
      
      {/* Right Wing */}
      <ellipse cx="68" cy="44" rx="12" ry="10" fill="white"/>
      
      {/* Avocado Body - dark green skin */}
      <ellipse cx="40" cy="52" rx="24" ry="32" fill="#4CAF50"/>
      
      {/* Avocado flesh - bright yellow-green */}
      <ellipse cx="40" cy="54" rx="18" ry="25" fill="#CDDC39"/>
      
      {/* Pit - warm brown */}
      <ellipse cx="40" cy="62" rx="10" ry="13" fill="#795548"/>
      
      {/* Happy closed eyes */}
      <path 
        d="M28 40 Q32 35 36 40" 
        stroke="#2E7D32" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
      />
      <path 
        d="M44 40 Q48 35 52 40" 
        stroke="#2E7D32" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
      />
      
      {/* Rosy cheeks */}
      <ellipse cx="24" cy="46" rx="5" ry="3" fill="#F48FB1" opacity="0.8"/>
      <ellipse cx="56" cy="46" rx="5" ry="3" fill="#F48FB1" opacity="0.8"/>
      
      {/* Smile */}
      <path 
        d="M34 50 Q40 56 46 50" 
        stroke="#2E7D32" 
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
    md: { text: "text-xl sm:text-2xl", icon: 48, gap: "gap-2" },
    lg: { text: "text-2xl sm:text-3xl", icon: 60, gap: "gap-3" },
    compact: { text: "text-sm", icon: 32, gap: "gap-1" }
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
