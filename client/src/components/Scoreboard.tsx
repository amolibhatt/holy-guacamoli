import { useState } from "react";
import { useScore } from "./ScoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, Plus, X, RotateCcw, Crown, Users } from "lucide-react";
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
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="gradient-header px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white">Players</h2>
        </div>
        {contestants.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetGame} 
            className="text-white/80 hover:text-white hover:bg-white/20"
            data-testid="button-reset-game"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Player name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            data-testid="input-contestant-name"
          />
          <Button 
            onClick={handleAdd} 
            size="icon" 
            className="gradient-header shrink-0 glow-primary"
            data-testid="button-add-contestant"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <AnimatePresence mode="popLayout">
          {sortedContestants.length > 0 ? (
            <motion.div layout className="space-y-2">
              {sortedContestants.map((contestant, idx) => (
                <motion.div
                  key={contestant.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`
                    flex items-center justify-between gap-2 p-3 rounded-xl transition-all
                    ${idx === 0 && contestant.score > 0 
                      ? 'gradient-gold glow-gold' 
                      : 'bg-muted/30 border border-border/50'
                    }
                  `}
                  data-testid={`contestant-${contestant.id}`}
                >
                  <div className="flex items-center gap-3">
                    {idx === 0 && contestant.score > 0 ? (
                      <motion.div
                        initial={{ rotate: -20, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Crown className="w-5 h-5 text-amber-900" />
                      </motion.div>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground w-5 text-center">{idx + 1}</span>
                    )}
                    <span className={`font-semibold ${idx === 0 && contestant.score > 0 ? 'text-amber-900' : 'text-foreground'}`}>
                      {contestant.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.span 
                      key={contestant.score}
                      initial={{ scale: 1.4 }}
                      animate={{ scale: 1 }}
                      className={`text-2xl font-black tabular-nums ${
                        contestant.score < 0 ? 'text-destructive' : 
                        idx === 0 && contestant.score > 0 ? 'text-amber-900' : 'text-foreground'
                      }`}
                    >
                      ${contestant.score}
                    </motion.span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${idx === 0 && contestant.score > 0 ? 'text-amber-900/60 hover:text-amber-900 hover:bg-amber-900/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}`}
                      onClick={() => removeContestant(contestant.id)}
                      data-testid={`button-remove-${contestant.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Add players to start</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
