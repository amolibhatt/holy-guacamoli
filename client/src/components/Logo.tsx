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
      height={size} 
      viewBox="0 0 64 72" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Halo */}
      <ellipse 
        cx="32" 
        cy="10" 
        rx="12" 
        ry="4" 
        fill="none" 
        stroke="#fcd34d" 
        strokeWidth="3"
      />
      
      {/* Left Wing */}
      <g transform="translate(2, 28)">
        <path 
          d="M12 8 Q6 4 2 8 Q-2 12 2 16 Q6 20 10 16 Q8 12 12 8" 
          fill="white" 
          stroke="#e5e7eb" 
          strokeWidth="1"
        />
        <path 
          d="M10 10 Q6 8 4 10 Q2 12 4 14 Q6 16 8 14" 
          fill="white" 
          stroke="#e5e7eb" 
          strokeWidth="0.5"
        />
      </g>
      
      {/* Right Wing */}
      <g transform="translate(50, 28) scale(-1, 1)">
        <path 
          d="M12 8 Q6 4 2 8 Q-2 12 2 16 Q6 20 10 16 Q8 12 12 8" 
          fill="white" 
          stroke="#e5e7eb" 
          strokeWidth="1"
        />
        <path 
          d="M10 10 Q6 8 4 10 Q2 12 4 14 Q6 16 8 14" 
          fill="white" 
          stroke="#e5e7eb" 
          strokeWidth="0.5"
        />
      </g>
      
      {/* Avocado Body - outer dark green */}
      <ellipse cx="32" cy="42" rx="18" ry="24" fill="#4a7c23"/>
      
      {/* Avocado Body - inner light green */}
      <ellipse cx="32" cy="44" rx="14" ry="19" fill="#c7e5a0"/>
      
      {/* Pit */}
      <ellipse cx="32" cy="52" rx="8" ry="10" fill="#8b5a2b"/>
      <ellipse cx="30" cy="50" rx="2" ry="3" fill="#a0724a" opacity="0.6"/>
      
      {/* Happy closed eyes - curved lines */}
      <path 
        d="M24 36 Q26 33 28 36" 
        stroke="#4a7c23" 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round"
      />
      <path 
        d="M36 36 Q38 33 40 36" 
        stroke="#4a7c23" 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round"
      />
      
      {/* Rosy cheeks */}
      <circle cx="22" cy="40" r="3" fill="#ffb6c1" opacity="0.5"/>
      <circle cx="42" cy="40" r="3" fill="#ffb6c1" opacity="0.5"/>
      
      {/* Small smile */}
      <path 
        d="M29 43 Q32 46 35 43" 
        stroke="#4a7c23" 
        strokeWidth="1.5" 
        fill="none" 
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ size = "md" }: LogoProps) {
  const sizeConfig = {
    sm: { text: "text-lg", icon: 36, gap: "gap-2" },
    md: { text: "text-xl sm:text-2xl", icon: 44, gap: "gap-2" },
    lg: { text: "text-2xl sm:text-3xl", icon: 56, gap: "gap-3" },
    compact: { text: "text-sm", icon: 28, gap: "gap-1" }
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
