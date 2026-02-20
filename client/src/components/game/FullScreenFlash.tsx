import { motion } from "framer-motion";

interface FullScreenFlashProps {
  show: boolean;
  color: string;
}

export function FullScreenFlash({ show, color }: FullScreenFlashProps) {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!show || prefersReducedMotion) return null;
  return (
    <motion.div
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={`fixed inset-0 z-50 pointer-events-none ${color}`}
    />
  );
}
