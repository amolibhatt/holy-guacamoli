import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "compact";
  showSparkles?: boolean;
  variant?: "light" | "dark";
}

export function Logo({ size = "md", variant = "dark" }: LogoProps) {
  const sizeConfig = {
    sm: {
      text: "text-lg",
      symbol: "text-xl",
      gap: "gap-1"
    },
    md: {
      text: "text-xl sm:text-2xl",
      symbol: "text-2xl sm:text-3xl",
      gap: "gap-1.5"
    },
    lg: {
      text: "text-2xl sm:text-3xl",
      symbol: "text-3xl sm:text-4xl",
      gap: "gap-2"
    },
    compact: {
      text: "text-sm",
      symbol: "text-base",
      gap: "gap-1"
    }
  };

  const config = sizeConfig[size];
  const textColor = variant === "light" ? "text-white" : "text-foreground";

  return (
    <div className={`flex items-center ${config.gap} group`}>
      {/* Abstract symbol - stylized "HG" monogram */}
      <motion.div 
        className="relative flex items-center justify-center"
        whileHover={{ scale: 1.1, transition: { duration: 0.2 } }}
      >
        <motion.svg
          viewBox="0 0 40 40"
          className={`${size === 'sm' || size === 'compact' ? 'w-7 h-7' : size === 'md' ? 'w-9 h-9' : 'w-11 h-11'}`}
          fill="none"
        >
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6">
                <animate attributeName="stop-color" values="#14b8a6;#ec4899;#a855f7;#14b8a6" dur="4s" repeatCount="indefinite" />
              </stop>
              <stop offset="50%" stopColor="#ec4899">
                <animate attributeName="stop-color" values="#ec4899;#a855f7;#14b8a6;#ec4899" dur="4s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#a855f7">
                <animate attributeName="stop-color" values="#a855f7;#14b8a6;#ec4899;#a855f7" dur="4s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
            <filter id="logoGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Abstract hexagon with inner design */}
          <g filter="url(#logoGlow)">
            {/* Outer hexagon */}
            <path
              d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z"
              fill="none"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Inner stylized "!" exclamation */}
            <motion.path
              d="M20 10 L20 24"
              stroke="url(#logoGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.circle
              cx="20"
              cy="30"
              r="2"
              fill="url(#logoGradient)"
              animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </g>
        </motion.svg>
      </motion.div>
      
      <motion.h1 
        className={`${config.text} font-black tracking-tighter leading-none flex items-baseline`}
        style={{ fontFamily: 'var(--font-display)' }}
        whileHover={{ scale: 1.02 }}
      >
        <span className={textColor}>
          HOLY
        </span>
        <motion.span 
          className="bg-gradient-to-r from-teal-400 via-pink-500 to-purple-500 bg-clip-text text-transparent bg-[length:200%_auto] ml-1"
          animate={{ 
            backgroundPosition: ['0% center', '100% center', '0% center']
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          GUAC
        </motion.span>
      </motion.h1>
    </div>
  );
}
