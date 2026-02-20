import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface GameWaitingScreenProps {
  title?: string;
  subtitle?: string;
}

export function GameWaitingScreen({
  title = "Waiting for host...",
  subtitle = "Get ready to play!",
}: GameWaitingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/15 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
          <Sparkles className="w-12 h-12 text-primary shrink-0" aria-hidden="true" />
        </motion.div>
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-waiting">{title}</h2>
      <p className="text-muted-foreground">{subtitle}</p>
      <motion.div
        className="flex justify-center gap-2 mt-4"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div className="w-2 h-2 rounded-full bg-primary" />
        <div className="w-2 h-2 rounded-full bg-primary" />
        <div className="w-2 h-2 rounded-full bg-primary" />
      </motion.div>
    </motion.div>
  );
}
