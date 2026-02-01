import { useState } from "react";
import { useScore, AVATAR_COLORS } from "./ScoreContext";
import { Button } from "@/components/ui/button";
import { X, RotateCcw, Crown, Trophy, Volume2, VolumeX, Users, ChevronDown, ChevronUp, Undo2 } from "lucide-react";
import { PLAYER_AVATARS } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { soundManager } from "@/lib/sounds";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function Scoreboard() {
  const { contestants, removeContestant, resetGame, updateContestantColor, endGame, undoLastScoreChange, lastScoreChange } = useScore();
  const { toast } = useToast();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleUndo = () => {
    const undone = undoLastScoreChange();
    if (undone) {
      const contestant = contestants.find(c => c.id === undone.contestantId);
      toast({
        title: "Score undone",
        description: `Reversed ${undone.type === 'award' ? '+' : '-'}${undone.points} for ${contestant?.name || 'player'}`,
        duration: 2000,
      });
    }
  };

  const toggleSound = () => {
    const enabled = soundManager.toggle();
    setSoundEnabled(enabled);
  };

  const sortedContestants = [...contestants].sort((a, b) => b.score - a.score);

  return (
    <motion.div 
      className="bg-card/60 backdrop-blur-sm rounded-xl border border-primary/20 p-2 sm:p-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="sm:hidden p-1 h-7 focus-visible:ring-2 focus-visible:ring-primary"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse scoreboard" : "Expand scoreboard"}
          data-testid="button-toggle-scoreboard"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        <Badge variant="secondary" className="gap-1 shrink-0" aria-label={`${contestants.length} players`}>
          <Users className="w-3 h-3" aria-hidden="true" />
          {contestants.length}
        </Badge>
        <div className={`flex-1 overflow-x-auto ${!isExpanded ? 'hidden sm:block' : ''}`}>
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
                          : 'bg-primary/10 border border-primary/40 text-foreground'
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
                            className="w-7 h-7 rounded-full flex items-center justify-center text-base relative z-10 hover:ring-2 hover:ring-foreground/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                            style={{ 
                              backgroundColor: contestant.color,
                            }}
                            aria-label={`${contestant.name}'s avatar: click to change color`}
                          >
                            {PLAYER_AVATARS.find(a => a.id === contestant.avatar)?.emoji || contestant.name.charAt(0).toUpperCase()}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" align="start">
                          <div className="flex gap-1 flex-wrap max-w-[140px]">
                            {AVATAR_COLORS.map((color) => (
                              <button
                                key={color}
                                className={`w-6 h-6 rounded-full hover-elevate focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-colors ${
                                  contestant.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : ''
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => updateContestantColor(contestant.id, color)}
                                aria-label={`Select ${color} color`}
                                aria-pressed={contestant.color === color}
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
                        className="opacity-50 hover:opacity-100 transition-opacity relative z-10 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary rounded"
                        onClick={() => removeContestant(contestant.id)}
                        data-testid={`button-remove-${contestant.id}`}
                        aria-label={`Remove ${contestant.name}`}
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
        </div>

        <div className={`flex items-center gap-1 ${!isExpanded ? 'hidden sm:flex' : ''}`}>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSound}
            className="text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
            data-testid="button-toggle-sound"
            aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
            aria-pressed={soundEnabled}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" aria-hidden="true" /> : <VolumeX className="w-4 h-4" aria-hidden="true" />}
          </Button>

          {contestants.length > 0 && (
            <>
              {lastScoreChange && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUndo}
                  className="text-blue-400 focus-visible:ring-2 focus-visible:ring-primary"
                  data-testid="button-undo-score"
                  aria-label="Undo last score change"
                >
                  <Undo2 className="w-4 h-4" aria-hidden="true" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={endGame}
                className="text-yellow-400 focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="button-end-game"
                aria-label="End game and show results"
              >
                <Trophy className="w-4 h-4" aria-hidden="true" />
              </Button>
              <motion.div
                whileHover={{ rotate: -180 }}
                transition={{ duration: 0.3 }}
              >
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={resetGame} 
                  className="text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
                  data-testid="button-reset-game"
                  aria-label="Reset game scores"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
