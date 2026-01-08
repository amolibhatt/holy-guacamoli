import { useState, useEffect } from "react";
import { Question } from "@shared/schema";
import { useScore } from "./ScoreContext";
import { CheckCircle2, XCircle, Eye, EyeOff, Timer, X, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

interface QuestionCardProps {
  question: Question;
  isLocked: boolean;
  onComplete?: () => void;
}

export function QuestionCard({ question, isLocked, onComplete }: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [awardedTo, setAwardedTo] = useState<string | null>(null);
  const { contestants, awardPoints, deductPoints, markQuestionCompleted } = useScore();

  const correctAnswer = (question as any).correctAnswer;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setShowAnswer(!showAnswer);
      }
      if (e.key === 't' || e.key === 'T') {
        if (!isTimerRunning) startTimer(30);
        else stopTimer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, isTimerRunning]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timer !== null && timer > 0) {
      interval = setInterval(() => {
        setTimer(t => (t !== null && t > 0) ? t - 1 : 0);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  const startTimer = (seconds: number) => {
    setTimer(seconds);
    setIsTimerRunning(true);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
  };

  const handleAward = (contestantId: string, contestantName: string) => {
    setAwardedTo(contestantName);
    awardPoints(contestantId, question.points);
    
    confetti({
      particleCount: 200,
      spread: 120,
      origin: { y: 0.5 },
      colors: ['#FF6B6B', '#FF8E53', '#FFD93D', '#C44AF5', '#4ADEBC']
    });

    setTimeout(() => {
      markQuestionCompleted(question.id);
      onComplete?.();
    }, 2000);
  };

  const handleDeduct = (contestantId: string) => {
    deductPoints(contestantId, question.points);
  };

  const handleNoAnswer = () => {
    markQuestionCompleted(question.id);
    onComplete?.();
  };

  return (
    <div className="relative overflow-hidden bg-background">
      <AnimatePresence>
        {awardedTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center gradient-header"
          >
            <motion.div 
              className="text-center"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                <Trophy className="w-24 h-24 text-white mx-auto mb-4 drop-shadow-lg" />
              </motion.div>
              <h2 className="text-5xl font-black text-white drop-shadow-lg">{awardedTo}</h2>
              <motion.p 
                className="text-4xl font-bold text-white/90 mt-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                +{question.points} points!
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="gradient-header px-6 py-5 flex items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute inset-0 shimmer" />
        <motion.div
          className="absolute top-2 left-2"
          animate={{ rotate: 360, scale: [1, 1.3, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Sparkles className="w-4 h-4 text-yellow-200/50" />
        </motion.div>
        <motion.span 
          className="text-5xl font-black text-white drop-shadow-lg relative z-10"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          {question.points}
        </motion.span>
        <div className="flex items-center gap-3 relative z-10">
          {timer !== null && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`
                w-16 h-16 rounded-full flex items-center justify-center font-mono text-2xl font-black
                ${timer <= 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-white/20 text-white'}
              `}
            >
              {timer}
            </motion.div>
          )}
          <Button
            size="lg"
            onClick={() => setShowAnswer(!showAnswer)}
            className={showAnswer 
              ? "bg-white/20 text-white hover:bg-white/30" 
              : "gradient-gold text-purple-900 font-bold glow-gold"
            }
            data-testid="button-toggle-answer"
          >
            {showAnswer ? <EyeOff className="w-5 h-5 mr-2" /> : <Eye className="w-5 h-5 mr-2" />}
            {showAnswer ? "Hide" : "Reveal"}
          </Button>
        </div>
      </div>

      <div className="p-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="min-h-[120px] flex items-center justify-center mb-8"
        >
          <h3 className="text-2xl lg:text-3xl font-semibold text-foreground text-center leading-relaxed">
            {question.question}
          </h3>
        </motion.div>

        <AnimatePresence>
          {showAnswer && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, rotateX: -20 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotateX: 20 }}
              className="gradient-header rounded-2xl p-6 mb-8 glow-primary"
            >
              <p className="text-white font-bold text-xl flex items-center justify-center gap-3 drop-shadow">
                <CheckCircle2 className="w-7 h-7" />
                {correctAnswer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center gap-3 mb-8">
          {[15, 30, 60].map((secs, idx) => (
            <motion.div
              key={secs}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
            >
              <Button
                variant="outline"
                onClick={() => startTimer(secs)}
                disabled={isTimerRunning}
                className="border-primary/40 text-foreground hover:bg-primary/20"
              >
                <Timer className="w-4 h-4 mr-2" />
                {secs}s
              </Button>
            </motion.div>
          ))}
          {isTimerRunning && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Button
                variant="outline"
                onClick={stopTimer}
                className="border-red-500/50 text-red-400 hover:bg-red-500/20"
              >
                Stop
              </Button>
            </motion.div>
          )}
        </div>

        {contestants.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {contestants.map((contestant, idx) => (
              <motion.div
                key={contestant.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="bg-card rounded-xl p-4 border border-primary/30"
              >
                <div className="text-center mb-3">
                  <span className="font-bold text-foreground text-lg">{contestant.name}</span>
                  <span className="block text-sm text-muted-foreground">{contestant.score} pts</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAward(contestant.id, contestant.name)}
                    className="flex-1 gradient-header text-white font-bold glow-primary"
                    data-testid={`button-award-${contestant.id}`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    +{question.points}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDeduct(contestant.id)}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400"
                    data-testid={`button-deduct-${contestant.id}`}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground bg-card rounded-xl border border-dashed border-primary/30">
            Add players from the scoreboard to award points
          </div>
        )}

        <div className="flex justify-center mt-8 pt-6 border-t border-border">
          <Button 
            variant="ghost" 
            size="lg"
            onClick={handleNoAnswer}
            className="text-muted-foreground hover:text-foreground hover:bg-white/10"
            data-testid="button-close-question"
          >
            <X className="w-5 h-5 mr-2" />
            No Answer / Skip
          </Button>
        </div>
      </div>

      <div className="bg-card/50 px-6 py-3 text-center text-xs text-muted-foreground border-t border-border">
        Keyboard: <kbd className="px-1.5 py-0.5 bg-primary/20 rounded text-primary font-mono">R</kbd> Reveal
        <span className="mx-3">|</span>
        <kbd className="px-1.5 py-0.5 bg-primary/20 rounded text-primary font-mono">T</kbd> Timer
        <span className="mx-3">|</span>
        <kbd className="px-1.5 py-0.5 bg-primary/20 rounded text-primary font-mono">Esc</kbd> Close
      </div>
    </div>
  );
}
