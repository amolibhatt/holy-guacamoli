import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "compact";
  showSparkles?: boolean;
  variant?: "light" | "dark";
}

export function Logo({ size = "md", variant = "dark" }: LogoProps) {
  const sizeConfig = {
    sm: { text: "text-lg" },
    md: { text: "text-xl sm:text-2xl" },
    lg: { text: "text-2xl sm:text-3xl" },
    compact: { text: "text-sm" }
  };

  const config = sizeConfig[size];

  return (
    <motion.h1 
      className={`${config.text} font-black tracking-tight leading-none`}
      style={{ fontFamily: 'var(--font-display)' }}
      whileHover={{ scale: 1.02 }}
    >
      <span className="text-white">Holy </span>
      <span style={{ color: '#39FF14' }}>Guac</span>
      <span style={{ color: '#BC13FE' }}>Amoli!</span>
    </motion.h1>
  );
}
