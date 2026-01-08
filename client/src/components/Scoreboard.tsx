import { useState } from "react";
import { useScore } from "./ScoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, Plus, X, RotateCcw, Crown, TrendingUp, TrendingDown } from "lucide-react";
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
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-700 p-4"
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h2 className="font-bold text-lg text-white">Scoreboard</h2>
        </div>
        {contestants.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetGame} 
            className="text-slate-400 hover:text-white hover:bg-slate-700"
            data-testid="button-reset-game"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Add player..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
          data-testid="input-contestant-name"
        />
        <Button 
          onClick={handleAdd} 
          size="icon" 
          className="bg-blue-600 hover:bg-blue-500 shrink-0"
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`
                  flex items-center justify-between gap-2 p-3 rounded-xl transition-colors
                  ${idx === 0 && contestant.score > 0 
                    ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' 
                    : 'bg-slate-700/50'
                  }
                `}
                data-testid={`contestant-${contestant.id}`}
              >
                <div className="flex items-center gap-3">
                  {idx === 0 && contestant.score > 0 ? (
                    <motion.div
                      initial={{ rotate: -20 }}
                      animate={{ rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Crown className="w-5 h-5 text-yellow-400" />
                    </motion.div>
                  ) : (
                    <span className="text-lg font-bold text-slate-500 w-5 text-center">{idx + 1}</span>
                  )}
                  <span className="font-medium text-white">{contestant.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <motion.span 
                    key={contestant.score}
                    initial={{ scale: 1.3, color: contestant.score >= 0 ? '#10B981' : '#EF4444' }}
                    animate={{ scale: 1, color: contestant.score < 0 ? '#F87171' : idx === 0 && contestant.score > 0 ? '#FBBF24' : '#FFFFFF' }}
                    className="text-2xl font-bold tabular-nums"
                  >
                    {contestant.score}
                  </motion.span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
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
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-slate-500 text-sm py-6"
          >
            Add players to start the game
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
