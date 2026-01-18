import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Star, Crown, Sparkles, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScore, Contestant } from "./ScoreContext";
import confetti from "canvas-confetti";
import { soundManager } from "@/lib/sounds";
import { useToast } from "@/hooks/use-toast";

interface VictoryScreenProps {
  onClose: () => void;
}

export function VictoryScreen({ onClose }: VictoryScreenProps) {
  const { contestants, resetGame, resetGameEnd } = useScore();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const sortedContestants = [...contestants].sort((a, b) => b.score - a.score);
  const winner = sortedContestants[0];
  const runnerUp = sortedContestants[1];
  const thirdPlace = sortedContestants[2];

  const generateResultsText = () => {
    const date = new Date().toLocaleDateString();
    let text = `Holy GuacAmoli! Game Results - ${date}\n\n`;
    text += "Final Standings:\n";
    sortedContestants.forEach((c, i) => {
      const position = i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}th`;
      text += `${position} Place - ${c.name}: ${c.score} points\n`;
    });
    return text;
  };

  const handleCopyResults = async () => {
    try {
      await navigator.clipboard.writeText(generateResultsText());
      setCopied(true);
      toast({ title: "Results copied to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleShareResults = async () => {
    const text = generateResultsText();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Holy GuacAmoli! Results", text });
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          handleCopyResults();
        }
      }
    } else {
      handleCopyResults();
    }
  };

  useEffect(() => {
    soundManager.play('victory', 0.6);
    
    const duration = 5000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }
      
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD93D', '#FF6B6B', '#C44AF5', '#4ADEBC', '#FF8E53']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD93D', '#FF6B6B', '#C44AF5', '#4ADEBC', '#FF8E53']
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const handlePlayAgain = () => {
    resetGame();
    resetGameEnd();
    onClose();
  };

  const handleClose = () => {
    resetGameEnd();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        className="text-center p-8 max-w-2xl w-full mx-4"
      >
        <motion.div
          animate={{ 
            rotate: [0, -5, 5, -5, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-6"
        >
          <div className="relative inline-block">
            <Trophy className="w-32 h-32 text-yellow-400 mx-auto drop-shadow-lg" />
            <motion.div
              className="absolute -top-4 -right-4"
              animate={{ rotate: 360, scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-8 h-8 text-yellow-300" />
            </motion.div>
            <motion.div
              className="absolute -top-4 -left-4"
              animate={{ rotate: -360, scale: [1, 1.3, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Star className="w-8 h-8 text-primary" />
            </motion.div>
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-5xl md:text-7xl font-black text-white mb-4 drop-shadow-lg"
        >
          WINNER!
        </motion.h1>

        {winner && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-4 px-8 py-6 rounded-2xl gradient-gold">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-lg"
                style={{ backgroundColor: winner.color }}
              >
                {winner.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <Crown className="w-6 h-6 text-purple-800" />
                  <span className="text-3xl font-black text-purple-900">{winner.name}</span>
                </div>
                <span className="text-4xl font-black text-purple-800">{winner.score} points</span>
              </div>
            </div>
          </motion.div>
        )}

        {(runnerUp || thirdPlace) && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex justify-center gap-4 mb-8"
          >
            {runnerUp && (
              <div className="bg-white/10 backdrop-blur px-6 py-4 rounded-xl border border-white/20">
                <div className="text-silver text-sm font-semibold mb-1">2nd Place</div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: runnerUp.color }}
                  >
                    {runnerUp.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white font-bold">{runnerUp.name}</span>
                </div>
                <span className="text-white/70 text-xl font-bold">{runnerUp.score} pts</span>
              </div>
            )}
            {thirdPlace && (
              <div className="bg-white/10 backdrop-blur px-6 py-4 rounded-xl border border-white/20">
                <div className="text-amber-600 text-sm font-semibold mb-1">3rd Place</div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: thirdPlace.color }}
                  >
                    {thirdPlace.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white font-bold">{thirdPlace.name}</span>
                </div>
                <span className="text-white/70 text-xl font-bold">{thirdPlace.score} pts</span>
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex justify-center gap-3 flex-wrap">
            <Button
              size="lg"
              onClick={handlePlayAgain}
              className="gradient-header text-white font-bold glow-primary"
              data-testid="button-play-again"
            >
              Play Again
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleClose}
              className="border-white/30 text-white hover:bg-white/10"
              data-testid="button-close-victory"
            >
              Close
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyResults}
              className="text-white/70 hover:text-white hover:bg-white/10 gap-2"
              data-testid="button-copy-results"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Results"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleShareResults}
              className="text-white/70 hover:text-white hover:bg-white/10 gap-2"
              data-testid="button-share-results"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
