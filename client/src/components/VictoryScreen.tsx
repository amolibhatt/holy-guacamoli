import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown, Sparkles, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScore } from "./ScoreContext";
import confetti from "canvas-confetti";
import { soundManager } from "@/lib/sounds";
import { ShareableResultsCard } from "./ShareableResultsCard";

interface VictoryScreenProps {
  onClose: () => void;
}

const PLAYER_EMOJIS = ["🎮", "🎯", "🎪", "🎨", "🎭", "🎬", "🎤", "🎧", "🎸", "🎺", "🎻", "🥁", "🎲", "🎰", "🎳"];

function useCountUp(end: number, duration: number = 2000, startDelay: number = 0) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const delayTimer = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(delayTimer);
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;
    
    const startTime = Date.now();
    const startValue = 0;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (end - startValue) * eased);
      setCount(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [end, duration, started]);

  return count;
}

function fireworksBurst(timerRefs: { current: ReturnType<typeof setTimeout>[] }) {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
  
  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
  
  // Multiple bursts from different positions
  timerRefs.current.push(setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 80,
      origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0.2, 0.4) },
      colors: ['#FFD700', '#FFA500', '#FF6B6B', '#FFE66D']
    });
  }, 0));
  
  timerRefs.current.push(setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 80,
      origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0.2, 0.4) },
      colors: ['#FFD700', '#FFA500', '#FF6B6B', '#FFE66D']
    });
  }, 200));
  
  timerRefs.current.push(setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 120,
      origin: { x: 0.5, y: 0.3 },
      colors: ['#FFD700', '#FFFFFF', '#C44AF5', '#4ADEBC']
    });
  }, 400));

  // Star-shaped confetti
  timerRefs.current.push(setTimeout(() => {
    confetti({
      particleCount: 50,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      shapes: ['star'],
      colors: ['#FFD700', '#FFA500'],
      scalar: 1.5
    });
  }, 600));
}

export function VictoryScreen({ onClose }: VictoryScreenProps) {
  const { contestants, resetGame, resetGameEnd } = useScore();
  const [revealPhase, setRevealPhase] = useState(0);
  const [showShareCard, setShowShareCard] = useState(false);

  const sortedContestants = [...contestants].sort((a, b) => b.score - a.score);
  const winner = sortedContestants[0];
  const runnerUp = sortedContestants[1];
  const thirdPlace = sortedContestants[2];

  const getPlayerEmoji = (index: number) => PLAYER_EMOJIS[index % PLAYER_EMOJIS.length];

  const thirdScore = useCountUp(thirdPlace?.score || 0, 1500, 1000);
  const secondScore = useCountUp(runnerUp?.score || 0, 1500, 3000);
  const winnerScore = useCountUp(winner?.score || 0, 2000, 6000);



  useEffect(() => {
    // Phase 0: Initial (0ms)
    // Phase 1: Show 3rd place (500ms)
    // Phase 2: Show 2nd place (2500ms)
    // Phase 3: Drumroll pause (4500ms)
    // Phase 4: Winner reveal with fireworks (6000ms)
    
    const timerRefs: { current: ReturnType<typeof setTimeout>[] } = { current: [] };
    let confettiInterval: ReturnType<typeof setInterval> | null = null;
    
    timerRefs.current.push(setTimeout(() => setRevealPhase(1), 500));
    timerRefs.current.push(setTimeout(() => setRevealPhase(2), 2500));
    timerRefs.current.push(setTimeout(() => {
      setRevealPhase(3);
      soundManager.play('tick', 0.3);
    }, 4500));
    timerRefs.current.push(setTimeout(() => {
      setRevealPhase(4);
      soundManager.play('victory', 0.6);
      fireworksBurst(timerRefs);
    }, 6000));

    // Continuous confetti after reveal
    timerRefs.current.push(setTimeout(() => {
      const duration = 4000;
      const animationEnd = Date.now() + duration;
      confettiInterval = setInterval(() => {
        if (Date.now() > animationEnd) {
          if (confettiInterval) clearInterval(confettiInterval);
          return;
        }
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD93D', '#FF6B6B', '#C44AF5', '#4ADEBC']
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD93D', '#FF6B6B', '#C44AF5', '#4ADEBC']
        });
      }, 80);
    }, 6500));

    return () => {
      timerRefs.current.forEach(clearTimeout);
      if (confettiInterval) clearInterval(confettiInterval);
    };
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
    >
      <div className="text-center p-4 md:p-8 max-w-4xl w-full mx-4">
        {/* Title */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white/80 mb-2">Final Results</h2>
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-white/60">Who will take the crown?</span>
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </div>
        </motion.div>

        {/* 3D Podium */}
        <div className="relative flex items-end justify-center gap-2 md:gap-4 mb-8 h-[320px] md:h-[380px]">
          {/* 2nd Place - Left */}
          <AnimatePresence>
            {revealPhase >= 2 && runnerUp && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                className="flex flex-col items-center"
              >
                {/* Player */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="mb-2"
                >
                  <div 
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-lg border-4 border-gray-300"
                    style={{ backgroundColor: runnerUp.color }}
                  >
                    {getPlayerEmoji(contestants.findIndex(c => c.name === runnerUp.name))}
                  </div>
                  <div className="text-white font-bold text-sm md:text-base mt-1 truncate max-w-[80px] md:max-w-[100px]">
                    {runnerUp.name}
                  </div>
                  <motion.div 
                    className="text-2xl md:text-3xl font-black text-gray-300"
                    key={secondScore}
                  >
                    {secondScore}
                  </motion.div>
                </motion.div>
                {/* Podium */}
                <div className="w-20 md:w-28 h-24 md:h-32 bg-gradient-to-b from-gray-400 to-gray-600 rounded-t-lg flex items-center justify-center shadow-xl border-t-4 border-gray-300">
                  <span className="text-4xl md:text-5xl font-black text-white/80">2</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 1st Place - Center (elevated) */}
          <AnimatePresence>
            {revealPhase >= 4 && winner && (
              <motion.div
                initial={{ y: 150, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 80, damping: 12 }}
                className="flex flex-col items-center relative z-10"
              >
                {/* Winner Spotlight Glow */}
                <motion.div
                  className="absolute -inset-8 rounded-full"
                  animate={{
                    boxShadow: [
                      "0 0 40px 10px rgba(255, 215, 0, 0.3)",
                      "0 0 60px 20px rgba(255, 215, 0, 0.5)",
                      "0 0 40px 10px rgba(255, 215, 0, 0.3)"
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                
                {/* Crown */}
                <motion.div
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Crown className="w-10 h-10 md:w-12 md:h-12 text-yellow-400 mx-auto drop-shadow-lg" />
                </motion.div>
                
                {/* Player */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="relative"
                >
                  {/* Pulsing ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-yellow-400"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <div 
                    className="w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-4xl md:text-5xl shadow-2xl border-4 border-yellow-400 relative z-10"
                    style={{ backgroundColor: winner.color }}
                  >
                    {getPlayerEmoji(contestants.findIndex(c => c.name === winner.name))}
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-2"
                >
                  <div className="text-white font-black text-lg md:text-xl">{winner.name}</div>
                  <motion.div 
                    className="text-4xl md:text-5xl font-black text-yellow-400 drop-shadow-lg"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                  >
                    {winnerScore}
                  </motion.div>
                </motion.div>
                
                {/* Podium */}
                <div className="w-24 md:w-36 h-36 md:h-48 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-700 rounded-t-lg flex items-center justify-center shadow-2xl border-t-4 border-yellow-300 mt-2">
                  <div className="flex flex-col items-center">
                    <Trophy className="w-8 h-8 md:w-10 md:h-10 text-yellow-900 mb-1" />
                    <span className="text-5xl md:text-6xl font-black text-yellow-900">1</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3rd Place - Right */}
          <AnimatePresence>
            {revealPhase >= 1 && thirdPlace && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                className="flex flex-col items-center"
              >
                {/* Player */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="mb-2"
                >
                  <div 
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-2xl md:text-3xl shadow-lg border-4 border-amber-600"
                    style={{ backgroundColor: thirdPlace.color }}
                  >
                    {getPlayerEmoji(contestants.findIndex(c => c.name === thirdPlace.name))}
                  </div>
                  <div className="text-white font-bold text-sm md:text-base mt-1 truncate max-w-[80px] md:max-w-[100px]">
                    {thirdPlace.name}
                  </div>
                  <motion.div 
                    className="text-xl md:text-2xl font-black text-amber-500"
                    key={thirdScore}
                  >
                    {thirdScore}
                  </motion.div>
                </motion.div>
                {/* Podium */}
                <div className="w-18 md:w-24 h-16 md:h-20 bg-gradient-to-b from-amber-600 to-amber-800 rounded-t-lg flex items-center justify-center shadow-xl border-t-4 border-amber-500">
                  <span className="text-3xl md:text-4xl font-black text-white/80">3</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drumroll Phase */}
          <AnimatePresence>
            {revealPhase === 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                  className="text-center"
                >
                  <div className="text-6xl md:text-8xl">🥁</div>
                  <motion.p 
                    className="text-white text-xl md:text-2xl font-bold mt-2"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    And the winner is...
                  </motion.p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Other contestants */}
        {revealPhase >= 4 && sortedContestants.length > 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-2 mb-6"
          >
            {sortedContestants.slice(3).map((c, i) => (
              <div 
                key={c.name}
                className="bg-white/10 backdrop-blur px-3 py-2 rounded-lg border border-white/20 flex items-center gap-2"
              >
                <span className="text-lg">{getPlayerEmoji(contestants.findIndex(x => x.name === c.name))}</span>
                <span className="text-white/80 font-medium">{c.name}</span>
                <span className="text-white/60">{c.score} pts</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Actions */}
        <AnimatePresence>
          {revealPhase >= 4 && !showShareCard && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="flex justify-center gap-3 flex-wrap">
                <Button
                  size="lg"
                  onClick={() => setShowShareCard(true)}
                  className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-bold shadow-lg hover:shadow-xl"
                  data-testid="button-create-share-image"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Share Results
                </Button>
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Share Card Modal */}
        <AnimatePresence>
          {showShareCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowShareCard(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowShareCard(false)}
                  className="absolute -top-12 right-0 text-white/70 hover:text-white hover:bg-white/10"
                  data-testid="button-close-share-modal"
                  aria-label="Close share modal"
                >
                  <X className="w-5 h-5" />
                </Button>
                <ShareableResultsCard 
                  contestants={contestants} 
                  onClose={() => setShowShareCard(false)} 
                />
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={() => setShowShareCard(false)}
                    className="text-white/70 hover:text-white"
                    data-testid="button-back-to-results"
                  >
                    Back to Results
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
