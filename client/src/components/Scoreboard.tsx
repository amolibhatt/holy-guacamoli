import { useState } from "react";
import { useScore } from "./ScoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, RotateCcw, Crown } from "lucide-react";
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
    <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add player..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-36 h-9 bg-input border-border text-sm"
            data-testid="input-contestant-name"
          />
          <Button 
            onClick={handleAdd} 
            size="sm"
            className="gradient-header h-9"
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
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap
                    ${idx === 0 && contestant.score > 0 
                      ? 'gradient-gold animate-pulse-glow' 
                      : 'bg-muted/30 border border-border/50'
                    }
                  `}
                  data-testid={`contestant-${contestant.id}`}
                >
                  {idx === 0 && contestant.score > 0 && (
                    <Crown className="w-4 h-4 text-amber-900" />
                  )}
                  <span className={`font-semibold ${idx === 0 && contestant.score > 0 ? 'text-amber-900' : 'text-foreground'}`}>
                    {contestant.name}
                  </span>
                  <motion.span 
                    key={contestant.score}
                    initial={{ scale: 1.5 }}
                    animate={{ scale: 1 }}
                    className={`text-xl font-black tabular-nums ${
                      contestant.score < 0 ? 'text-destructive' : 
                      idx === 0 && contestant.score > 0 ? 'text-amber-900' : 'text-primary'
                    }`}
                  >
                    {contestant.score}
                  </motion.span>
                  <button
                    className={`opacity-50 hover:opacity-100 transition-opacity ${idx === 0 && contestant.score > 0 ? 'text-amber-900' : 'text-muted-foreground hover:text-destructive'}`}
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
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetGame} 
            className="text-muted-foreground shrink-0"
            data-testid="button-reset-game"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
