import { motion } from "framer-motion";

interface NeonAvocadoIconProps {
  className?: string;
  animate?: boolean;
  glitchIntensity?: "low" | "medium" | "high";
}

export function NeonAvocadoIcon({ 
  className = "w-8 h-8", 
  animate = true,
  glitchIntensity = "medium"
}: NeonAvocadoIconProps) {
  const glitchConfig = {
    low: { offset: 1, duration: 4 },
    medium: { offset: 2, duration: 2.5 },
    high: { offset: 3, duration: 1.5 }
  };
  
  const config = glitchConfig[glitchIntensity];

  return (
    <motion.svg
      viewBox="0 0 64 72"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      animate={animate ? {
        filter: [
          "drop-shadow(0 0 8px #14b8a6) drop-shadow(0 0 15px #14b8a6)",
          "drop-shadow(0 0 12px #ec4899) drop-shadow(0 0 20px #ec4899)",
          "drop-shadow(0 0 8px #a855f7) drop-shadow(0 0 15px #a855f7)",
          "drop-shadow(0 0 8px #14b8a6) drop-shadow(0 0 15px #14b8a6)"
        ]
      } : {}}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6">
            <animate attributeName="stop-color" values="#14b8a6;#ec4899;#a855f7;#14b8a6" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="#ec4899">
            <animate attributeName="stop-color" values="#ec4899;#a855f7;#14b8a6;#ec4899" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#a855f7">
            <animate attributeName="stop-color" values="#a855f7;#14b8a6;#ec4899;#a855f7" dur="3s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
        
        <linearGradient id="neonGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ec4899">
            <animate attributeName="stop-color" values="#ec4899;#14b8a6;#a855f7;#ec4899" dur="2.5s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#14b8a6">
            <animate attributeName="stop-color" values="#14b8a6;#a855f7;#ec4899;#14b8a6" dur="2.5s" repeatCount="indefinite" />
          </stop>
        </linearGradient>

        <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        <filter id="glitchFilter" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="1" result="noise" seed="0">
            <animate attributeName="seed" values="0;100;0" dur={`${config.duration}s`} repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={config.offset} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      
      <g filter="url(#neonGlow)">
        <motion.g
          animate={animate ? {
            x: [-config.offset, config.offset, -config.offset/2, 0],
            opacity: [1, 0.8, 1, 1]
          } : {}}
          transition={{ duration: config.duration, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M32 22 C18 22 10 36 10 52 C10 66 19 70 32 70 C45 70 54 66 54 52 C54 36 46 22 32 22Z"
            fill="none"
            stroke="url(#neonGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </motion.g>
        
        <motion.g
          animate={animate ? {
            x: [config.offset, -config.offset, config.offset/2, 0],
            opacity: [0.6, 1, 0.8, 0.6]
          } : {}}
          transition={{ duration: config.duration * 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
          style={{ mixBlendMode: "screen" }}
        >
          <path
            d="M32 22 C18 22 10 36 10 52 C10 66 19 70 32 70 C45 70 54 66 54 52 C54 36 46 22 32 22Z"
            fill="none"
            stroke="#ec4899"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.5"
          />
        </motion.g>
        
        <ellipse 
          cx="32" cy="52" rx="16" ry="12" 
          fill="none" 
          stroke="url(#neonGradient2)" 
          strokeWidth="1.5"
          opacity="0.8"
        />
        
        <motion.ellipse 
          cx="32" cy="54" rx="8" ry="7" 
          fill="none" 
          stroke="url(#neonGradient)" 
          strokeWidth="2"
          animate={animate ? {
            scale: [1, 1.05, 1],
            opacity: [0.9, 1, 0.9]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        <motion.g
          animate={animate ? {
            y: [-1, 1, -1]
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <circle cx="25" cy="44" r="3" fill="none" stroke="url(#neonGradient)" strokeWidth="1.5" />
          <circle cx="39" cy="44" r="3" fill="none" stroke="url(#neonGradient)" strokeWidth="1.5" />
          
          <motion.circle 
            cx="25" cy="44" r="1.5" 
            fill="url(#neonGradient)"
            animate={animate ? { opacity: [0.8, 1, 0.8] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <motion.circle 
            cx="39" cy="44" r="1.5" 
            fill="url(#neonGradient)"
            animate={animate ? { opacity: [0.8, 1, 0.8] } : {}}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
        </motion.g>
        
        <path
          d="M27 50 Q32 54 37 50"
          stroke="url(#neonGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        
        <motion.g
          animate={animate ? {
            y: [-config.offset, config.offset, -config.offset]
          } : {}}
          transition={{ duration: config.duration * 0.7, repeat: Infinity }}
        >
          <path
            d="M20 22 L32 4 L44 22"
            fill="none"
            stroke="url(#neonGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          <line x1="24" y1="18" x2="28" y2="10" stroke="url(#neonGradient2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          <line x1="32" y1="16" x2="32" y2="8" stroke="url(#neonGradient2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          <line x1="40" y1="18" x2="36" y2="10" stroke="url(#neonGradient2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        </motion.g>
        
        <motion.circle 
          cx="32" cy="4" r="4" 
          fill="none" 
          stroke="url(#neonGradient)" 
          strokeWidth="2"
          animate={animate ? {
            scale: [1, 1.2, 1],
            opacity: [0.8, 1, 0.8]
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.circle 
          cx="32" cy="4" r="2" 
          fill="url(#neonGradient)"
          animate={animate ? {
            opacity: [0.6, 1, 0.6]
          } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </g>
      
      <motion.g
        animate={animate ? {
          opacity: [0, 0.3, 0],
          x: [0, config.offset * 2, 0]
        } : {}}
        transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 3 }}
      >
        <rect x="0" y="25" width="64" height="2" fill="#ec4899" opacity="0.5" />
        <rect x="0" y="45" width="64" height="1" fill="#14b8a6" opacity="0.4" />
        <rect x="0" y="60" width="64" height="1.5" fill="#a855f7" opacity="0.3" />
      </motion.g>
    </motion.svg>
  );
}
