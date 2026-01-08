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
      <div className="gradient-header px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white">Players</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add player..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-40 h-8 bg-white/20 border-white/30 text-white placeholder:text-white/60 text-sm"
              data-testid="input-contestant-name"
            />
            <Button 
              onClick={handleAdd} 
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white h-8"
              data-testid="button-add-contestant"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {contestants.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetGame} 
              className="text-white/80 hover:text-white hover:bg-white/20 h-8"
              data-testid="button-reset-game"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        <AnimatePresence mode="popLayout">
          {sortedContestants.length > 0 ? (
            <motion.div layout className="flex flex-wrap gap-3">
              {sortedContestants.map((contestant, idx) => (
                <motion.div
                  key={contestant.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${idx === 0 && contestant.score > 0 
                      ? 'gradient-gold glow-gold' 
                      : 'bg-muted/30 border border-border/50'
                    }
                  `}
                  data-testid={`contestant-${contestant.id}`}
                >
                  <div className="flex items-center gap-2">
                    {idx === 0 && contestant.score > 0 ? (
                      <Crown className="w-5 h-5 text-amber-900" />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground w-5 text-center">{idx + 1}</span>
                    )}
                    <span className={`font-semibold ${idx === 0 && contestant.score > 0 ? 'text-amber-900' : 'text-foreground'}`}>
                      {contestant.name}
                    </span>
                  </div>
                  <motion.span 
                    key={contestant.score}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    className={`text-2xl font-black tabular-nums ${
                      contestant.score < 0 ? 'text-destructive' : 
                      idx === 0 && contestant.score > 0 ? 'text-amber-900' : 'text-foreground'
                    }`}
                  >
                    {contestant.score}
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
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-4"
            >
              <p className="text-muted-foreground text-sm">Add players to start the game</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
