import { useTheme } from "@/context/ThemeContext";
import { motion } from "framer-motion";

interface ThemeDecorationsProps {
  placement: 'header' | 'board' | 'corner';
  className?: string;
}

export function ThemeDecorations({ placement, className = "" }: ThemeDecorationsProps) {
  const { decor, colors } = useTheme();
  const [Icon1, Icon2, Icon3, Icon4] = decor.icons;

  if (placement === 'header') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {decor.icons.slice(0, 2).map((Icon, i) => (
          <motion.div
            key={i}
            animate={{ 
              rotate: [0, i % 2 === 0 ? 10 : -10, 0],
              y: [0, -3, 0]
            }}
            transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
            style={{ color: colors.gradient1 }}
          >
            <Icon className="w-4 h-4" />
          </motion.div>
        ))}
      </div>
    );
  }

  if (placement === 'corner') {
    return (
      <>
        <motion.div
          className={`absolute -top-2 -right-2 ${className}`}
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.3, 1]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ color: colors.gradient1 }}
        >
          <Icon1 className="w-5 h-5 drop-shadow-lg" />
        </motion.div>
        <motion.div
          className="absolute -top-1 -left-2"
          animate={{ 
            rotate: [0, -360],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
          style={{ color: colors.gradient2 }}
        >
          <Icon2 className="w-4 h-4" />
        </motion.div>
        <motion.div
          className="absolute -bottom-1 -left-1"
          animate={{ 
            y: [0, -8, 0],
            opacity: [0.6, 1, 0.6],
            rotate: [0, 15, 0]
          }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          style={{ color: colors.gradient3 }}
        >
          <Icon3 className="w-5 h-5" />
        </motion.div>
        <motion.div
          className="absolute -bottom-2 -right-1"
          animate={{ 
            y: [0, -6, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ duration: 1.8, repeat: Infinity, delay: 0.8 }}
          style={{ color: colors.accent }}
        >
          <Icon4 className="w-4 h-4" />
        </motion.div>
      </>
    );
  }

  if (placement === 'board') {
    return (
      <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
        <motion.div
          className="absolute top-4 left-4"
          animate={{ rotate: 360, opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ color: colors.gradient1 }}
        >
          <Icon1 className="w-12 h-12" />
        </motion.div>
        <motion.div
          className="absolute top-8 right-8"
          animate={{ rotate: -360, opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          style={{ color: colors.gradient2 }}
        >
          <Icon2 className="w-16 h-16" />
        </motion.div>
        <motion.div
          className="absolute bottom-12 left-12"
          animate={{ rotate: 360, opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ color: colors.gradient3 }}
        >
          <Icon3 className="w-20 h-20" />
        </motion.div>
        <motion.div
          className="absolute bottom-8 right-16"
          animate={{ rotate: -360, opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          style={{ color: colors.accent }}
        >
          <Icon4 className="w-14 h-14" />
        </motion.div>
      </div>
    );
  }

  return null;
}
