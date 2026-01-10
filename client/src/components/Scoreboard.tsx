import { useState } from "react";
import { useScore, AVATAR_COLORS } from "./ScoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, RotateCcw, Crown, Sparkles, Trophy, Volume2, VolumeX, Palette } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { soundManager } from "@/lib/sounds";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function Scoreboard() {
  const { contestants, addContestant, removeContestant, resetGame, updateContestantColor, endGame } = useScore();
  const [newName, setNewName] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleAdd = () => {
    if (newName.trim()) {
      soundManager.play('click', 0.3);
      addContestant(newName.trim());
      setNewName("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  const toggleSound = () => {
    const enabled = soundManager.toggle();
    setSoundEnabled(enabled);
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
          <LayoutGroup>
            <motion.div layout className="flex items-center gap-2">
              <AnimatePresence mode="popLayout">
                {sortedContestants.map((contestant, idx) => {
                  const rankChange = contestant.previousRank !== undefined 
                    ? contestant.previousRank - idx 
                    : 0;
                  
                  return (
                    <motion.div
                      key={contestant.id}
                      layout
                      layoutId={contestant.id}
                      initial={{ opacity: 0, scale: 0.5, rotateY: -90 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1, 
                        rotateY: 0,
                        y: rankChange !== 0 ? [rankChange > 0 ? -20 : 20, 0] : 0
                      }}
                      exit={{ opacity: 0, scale: 0.5, rotateY: 90 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 500, 
                        damping: 30,
                        layout: { type: "spring", stiffness: 300, damping: 25 }
                      }}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap relative overflow-hidden
                        ${idx === 0 && contestant.score > 0 
                          ? 'gradient-gold text-black glow-gold' 
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
                      
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white relative z-10 hover:ring-2 hover:ring-white/50 transition-all"
                            style={{ backgroundColor: contestant.color }}
                          >
                            {contestant.name.charAt(0).toUpperCase()}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" align="start">
                          <div className="flex gap-1 flex-wrap max-w-[140px]">
                            {AVATAR_COLORS.map((color) => (
                              <button
                                key={color}
                                className={`w-6 h-6 rounded-full hover:scale-110 transition-transform ${
                                  contestant.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : ''
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => updateContestantColor(contestant.id, color)}
                              />
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      <span className="font-semibold relative z-10">{contestant.name}</span>
                      <motion.span 
                        key={contestant.score}
                        initial={{ scale: 2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-xl font-black tabular-nums relative z-10"
                      >
                        {contestant.score}
                      </motion.span>
                      
                      {rankChange !== 0 && (
                        <motion.span
                          initial={{ opacity: 1, y: rankChange > 0 ? 10 : -10 }}
                          animate={{ opacity: 0, y: 0 }}
                          transition={{ duration: 1 }}
                          className={`absolute -top-3 right-2 text-xs font-bold ${
                            rankChange > 0 ? 'text-primary' : 'text-destructive'
                          }`}
                        >
                          {rankChange > 0 ? `+${rankChange}` : rankChange}
                        </motion.span>
                      )}

                      <button
                        className="opacity-50 hover:opacity-100 transition-opacity relative z-10 hover:text-red-400"
                        onClick={() => removeContestant(contestant.id)}
                        data-testid={`button-remove-${contestant.id}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSound}
            className="text-white/50 hover:text-white hover:bg-white/10"
            data-testid="button-toggle-sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          {contestants.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={endGame}
                className="text-yellow-400/70 hover:text-yellow-400 hover:bg-white/10"
                data-testid="button-end-game"
              >
                <Trophy className="w-4 h-4" />
              </Button>
              <motion.div
                whileHover={{ rotate: -180 }}
                transition={{ duration: 0.3 }}
              >
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={resetGame} 
                  className="text-white/50 hover:text-white hover:bg-white/10"
                  data-testid="button-reset-game"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
