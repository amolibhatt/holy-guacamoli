import { motion } from "framer-motion";
import { NeonAvocadoIcon } from "./NeonAvocadoIcon";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "compact";
  showSparkles?: boolean;
  variant?: "light" | "dark";
}

export function Logo({ size = "md", variant = "dark" }: LogoProps) {
  const sizeConfig = {
    sm: {
      container: "w-8 h-8",
      icon: "w-7 h-7",
      text: "text-lg",
      gap: "gap-2"
    },
    md: {
      container: "w-10 h-10",
      icon: "w-9 h-9",
      text: "text-2xl sm:text-3xl",
      gap: "gap-2"
    },
    lg: {
      container: "w-14 h-14",
      icon: "w-12 h-12",
      text: "text-3xl sm:text-4xl",
      gap: "gap-3"
    },
    compact: {
      container: "w-8 h-8",
      icon: "w-7 h-7",
      text: "text-sm",
      gap: "gap-1.5"
    }
  };

  const config = sizeConfig[size];
  const textColor = variant === "light" ? "text-white" : "text-foreground";

  return (
    <div className={`flex items-center ${config.gap} group`}>
      <motion.div 
        className={`${config.container} flex items-center justify-center relative`}
        whileHover={{ 
          scale: 1.15,
          transition: { duration: 0.2 }
        }}
      >
        <NeonAvocadoIcon className={config.icon} animate={true} glitchIntensity="medium" />
      </motion.div>
      
      <motion.h1 
        className={`${config.text} font-black tracking-tight leading-none flex items-center glitch-text`}
        data-text="Holy GuacAmoli!"
        style={{ fontFamily: 'var(--font-display)' }}
        whileHover={{ scale: 1.05 }}
      >
        <span className={textColor}>
          Holy{' '}
        </span>
        <motion.span 
          className="bg-gradient-to-r from-teal-400 via-pink-500 to-purple-500 bg-clip-text text-transparent bg-[length:200%_auto] relative"
          animate={{ 
            backgroundPosition: ['0% center', '100% center', '0% center']
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          GuacAmoli!
        </motion.span>
      </motion.h1>
    </div>
  );
}
