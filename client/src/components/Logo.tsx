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
      {/* Halo - bright golden */}
      <ellipse 
        cx="40" 
        cy="12" 
        rx="14" 
        ry="5" 
        fill="none" 
        stroke="#FFD700" 
        strokeWidth="4"
      />
      <ellipse 
        cx="40" 
        cy="12" 
        rx="14" 
        ry="5" 
        fill="none" 
        stroke="#FFF59D" 
        strokeWidth="2"
        opacity="0.7"
      />
      
      {/* Left Wing - clean white with definition */}
      <g transform="translate(-2, 32)">
        <ellipse cx="16" cy="12" rx="14" ry="8" fill="white"/>
        <ellipse cx="12" cy="10" rx="8" ry="5" fill="#f8fafc"/>
        <ellipse cx="18" cy="14" rx="6" ry="4" fill="#f1f5f9"/>
      </g>
      
      {/* Right Wing */}
      <g transform="translate(52, 32)">
        <ellipse cx="14" cy="12" rx="14" ry="8" fill="white"/>
        <ellipse cx="18" cy="10" rx="8" ry="5" fill="#f8fafc"/>
        <ellipse cx="12" cy="14" rx="6" ry="4" fill="#f1f5f9"/>
      </g>
      
      {/* Avocado Body - dark green outer skin */}
      <ellipse cx="40" cy="52" rx="22" ry="30" fill="#2D5016"/>
      
      {/* Avocado flesh - bright lime green */}
      <ellipse cx="40" cy="54" rx="17" ry="24" fill="#A8E063"/>
      
      {/* Inner gradient for depth */}
      <ellipse cx="40" cy="52" rx="14" ry="20" fill="#C5F288" opacity="0.6"/>
      
      {/* Pit - rich brown */}
      <ellipse cx="40" cy="62" rx="9" ry="12" fill="#8B4513"/>
      {/* Pit highlight */}
      <ellipse cx="37" cy="58" rx="3" ry="4" fill="#A0522D" opacity="0.7"/>
      
      {/* Happy closed eyes - clean arcs */}
      <path 
        d="M28 42 Q32 37 36 42" 
        stroke="#2D5016" 
        strokeWidth="2.5" 
        fill="none" 
        strokeLinecap="round"
      />
      <path 
        d="M44 42 Q48 37 52 42" 
        stroke="#2D5016" 
        strokeWidth="2.5" 
        fill="none" 
        strokeLinecap="round"
      />
      
      {/* Rosy cheeks - soft pink */}
      <ellipse cx="25" cy="47" rx="4" ry="3" fill="#FFB7C5" opacity="0.7"/>
      <ellipse cx="55" cy="47" rx="4" ry="3" fill="#FFB7C5" opacity="0.7"/>
      
      {/* Cute smile */}
      <path 
        d="M35 50 Q40 55 45 50" 
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
