import { useState } from "react";
import { useScore } from "./ScoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, RotateCcw, Crown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Scoreboard() {
  const { contestants, addContestant, removeContestant, resetGame } = useScore();
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (newName.trim()) {
      addContestant(newName.trim());
      setNewName("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  const sortedContestants = [...contestants].sort((a, b) => b.score - a.score);

  return (
    <motion.div 
      className="bg-card/60 backdrop-blur-sm rounded-xl border border-primary/20 p-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add player..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-36 h-9 bg-white/10 border-primary/30 text-white placeholder:text-white/40 text-sm"
            data-testid="input-contestant-name"
          />
          <Button 
            onClick={handleAdd} 
            size="sm"
            className="gradient-header text-white hover:opacity-90 h-9 glow-primary"
            data-testid="button-add-contestant"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-x-auto">
          <AnimatePresence mode="popLayout">
            <motion.div layout className="flex items-center gap-2">
              {sortedContestants.map((contestant, idx) => (
                <motion.div
                  key={contestant.id}
                  layout
                  initial={{ opacity: 0, scale: 0.5, rotateY: -90 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotateY: 90 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap relative overflow-hidden
                    ${idx === 0 && contestant.score > 0 
                      ? 'gradient-gold text-purple-900 glow-gold' 
                      : 'bg-white/10 border border-primary/30 text-white'
                    }
                  `}
                  data-testid={`contestant-${contestant.id}`}
                >
                  {idx === 0 && contestant.score > 0 && (
                    <>
                      <motion.div
                        className="absolute inset-0 shimmer-color"
                      />
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Crown className="w-4 h-4 relative z-10" />
                      </motion.div>
                    </>
                  )}
                  <span className="font-semibold relative z-10">{contestant.name}</span>
                  <motion.span 
                    key={contestant.score}
                    initial={{ scale: 2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-xl font-black tabular-nums relative z-10"
                  >
                    {contestant.score}
                  </motion.span>
                  <button
                    className={`opacity-50 hover:opacity-100 transition-opacity relative z-10 ${
                      idx === 0 && contestant.score > 0 ? 'hover:text-purple-700' : 'hover:text-red-400'
                    }`}
                    onClick={() => removeContestant(contestant.id)}
                    data-testid={`button-remove-${contestant.id}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {contestants.length > 0 && (
          <motion.div
            whileHover={{ rotate: -180 }}
            transition={{ duration: 0.3 }}
          >
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetGame} 
              className="text-white/50 hover:text-white hover:bg-white/10 shrink-0"
              data-testid="button-reset-game"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
