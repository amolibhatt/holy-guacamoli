import { motion } from "framer-motion";

interface AvocadoIconProps {
  className?: string;
}

export function AvocadoIcon({ className = "w-7 h-7" }: AvocadoIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="12" cy="13" rx="8" ry="10" fill="#5D8C3E" />
      <ellipse cx="12" cy="14" rx="5.5" ry="7" fill="#C4D66E" />
      <circle cx="12" cy="15" r="3.5" fill="#6B4423" />
      <ellipse cx="11" cy="14" rx="1" ry="1.5" fill="#8B5A2B" opacity="0.6" />
    </svg>
  );
}

export function AnimatedAvocadoIcon({ className = "w-7 h-7" }: AvocadoIconProps) {
  return (
    <motion.div
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <AvocadoIcon className={className} />
    </motion.div>
  );
}
