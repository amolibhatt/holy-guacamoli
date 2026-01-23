import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { AvocadoIcon } from "./AvocadoIcon";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "compact";
  showSparkles?: boolean;
  variant?: "light" | "dark";
}

export function Logo({ size = "md", showSparkles = true, variant = "dark" }: LogoProps) {
  const sizeConfig = {
    sm: {
      container: "w-7 h-7",
      icon: "w-6 h-6",
      text: "text-lg",
      holy: "text-foreground",
      sparkle1: "w-2 h-2",
      sparkle2: "w-1.5 h-1.5",
      gap: "gap-1.5"
    },
    md: {
      container: "w-9 h-9",
      icon: "w-8 h-8",
      text: "text-2xl sm:text-3xl",
      holy: "text-foreground",
      sparkle1: "w-2.5 h-2.5",
      sparkle2: "w-2 h-2",
      gap: "gap-2"
    },
    lg: {
      container: "w-12 h-12",
      icon: "w-10 h-10",
      text: "text-3xl sm:text-4xl",
      holy: "text-foreground",
      sparkle1: "w-3 h-3",
      sparkle2: "w-2.5 h-2.5",
      gap: "gap-3"
    },
    compact: {
      container: "w-7 h-7",
      icon: "w-6 h-6",
      text: "text-sm",
      holy: "text-[10px]",
      sparkle1: "w-2 h-2",
      sparkle2: "w-1.5 h-1.5",
      gap: "gap-1"
    }
  };

  const config = sizeConfig[size];
  const textColor = variant === "light" ? "text-white" : "text-foreground";
  const holyColor = variant === "light" ? "text-emerald-400" : config.holy;

  return (
    <div className={`flex items-center ${config.gap} group`}>
      <motion.div 
        className={`${config.container} flex items-center justify-center relative`}
        animate={{ 
          rotate: [0, -5, 5, -5, 0], 
          y: [0, -2, 0],
          scale: [1, 1.02, 1]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ 
          scale: 1.1, 
          rotate: [0, -10, 10, -10, 0],
          transition: { duration: 0.4 }
        }}
      >
        <motion.div 
          className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 via-emerald-300 to-lime-400 opacity-0 group-hover:opacity-40 blur-md"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        {showSparkles && (
          <>
            <motion.span
              className="absolute -top-0.5 right-0 text-yellow-400 z-20"
              animate={{ 
                scale: [0.8, 1.2, 0.8],
                rotate: [0, 180, 360],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className={config.sparkle1} />
            </motion.span>
            <motion.span
              className="absolute bottom-0 left-0 text-lime-400 z-20"
              animate={{ 
                scale: [0.6, 1, 0.6],
                rotate: [360, 180, 0],
                opacity: [0.3, 0.9, 0.3]
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            >
              <Sparkles className={config.sparkle2} />
            </motion.span>
          </>
        )}
        <AvocadoIcon className={`${config.icon} drop-shadow-lg relative z-10`} />
      </motion.div>
      
      <motion.h1 
        className={`${config.text} font-black tracking-tight leading-none flex items-center`}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <motion.span 
          className={textColor}
          whileHover={{ scale: 1.05 }}
        >
          Holy{' '}
        </motion.span>
        <motion.span 
          className="bg-gradient-to-r from-green-500 via-emerald-400 to-lime-400 bg-clip-text text-transparent bg-[length:200%_auto] relative"
          animate={{ 
            backgroundPosition: ['0% center', '100% center', '0% center']
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          whileHover={{ 
            scale: 1.05,
            textShadow: "0 0 20px rgba(34, 197, 94, 0.5)"
          }}
        >
          GuacAmoli!
          {showSparkles && (
            <motion.span 
              className="absolute -top-0.5 -right-1 text-yellow-400"
              animate={{ 
                scale: [1, 1.3, 1],
                rotate: [0, 15, -15, 0],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className={config.sparkle1} />
            </motion.span>
          )}
        </motion.span>
      </motion.h1>
    </div>
  );
}
