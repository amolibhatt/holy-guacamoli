import { useState, useEffect } from "react";
import { Question } from "@shared/schema";
import { useScore } from "./ScoreContext";
import { CheckCircle2, XCircle, Eye, EyeOff, Timer, Sparkles, X } from "lucide-react";
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
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#3B82F6', '#A855F7', '#FBBF24', '#10B981', '#EC4899']
    });

    setTimeout(() => {
      markQuestionCompleted(question.id);
      onComplete?.();
    }, 1800);
  };

  const handleDeduct = (contestantId: string) => {
    deductPoints(contestantId, question.points);
  };

  const handleNoAnswer = () => {
    markQuestionCompleted(question.id);
    onComplete?.();
  };

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence>
        {awardedTo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500"
          >
            <motion.div 
              className="text-center"
              initial={{ y: 50 }}
              animate={{ y: 0 }}
            >
              <Sparkles className="w-20 h-20 text-white mx-auto mb-4 animate-pulse" />
              <h2 className="text-4xl font-black text-white text-glow">{awardedTo}</h2>
              <p className="text-3xl font-bold text-white/90 mt-2">+{question.points} points!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="gradient-header px-6 py-5 flex items-center justify-between gap-4">
        <motion.span 
          className="text-4xl font-black text-white text-glow"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          {question.points}
        </motion.span>
        <div className="flex items-center gap-3">
          {timer !== null && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`
                w-14 h-14 rounded-full flex items-center justify-center font-mono text-2xl font-black
                ${timer <= 5 ? 'bg-destructive animate-pulse' : 'bg-white/20'}
                text-white
              `}
            >
              {timer}
            </motion.div>
          )}
          <Button
            size="lg"
            onClick={() => setShowAnswer(!showAnswer)}
            className={showAnswer ? "bg-white/20 hover:bg-white/30" : "gradient-gold text-amber-900 font-bold"}
            data-testid="button-toggle-answer"
          >
            {showAnswer ? <EyeOff className="w-5 h-5 mr-2" /> : <Eye className="w-5 h-5 mr-2" />}
            {showAnswer ? "Hide" : "Reveal"}
          </Button>
        </div>
      </div>

      <div className="p-8 bg-card">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-h-[120px] flex items-center justify-center mb-8"
        >
          <h3 className="text-2xl lg:text-3xl font-semibold text-foreground text-center leading-relaxed">
            {question.question}
          </h3>
        </motion.div>

        <AnimatePresence>
          {showAnswer && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-success/15 border-2 border-success rounded-2xl p-6 mb-8"
            >
              <p className="text-success font-bold text-xl flex items-center justify-center gap-3">
                <CheckCircle2 className="w-7 h-7" />
                {correctAnswer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center gap-3 mb-8">
          <Button
            variant="outline"
            onClick={() => startTimer(15)}
            disabled={isTimerRunning}
            className="border-border"
          >
            <Timer className="w-4 h-4 mr-2" />
            15s
          </Button>
          <Button
            variant="outline"
            onClick={() => startTimer(30)}
            disabled={isTimerRunning}
            className="border-border"
          >
            <Timer className="w-4 h-4 mr-2" />
            30s
          </Button>
          <Button
            variant="outline"
            onClick={() => startTimer(60)}
            disabled={isTimerRunning}
            className="border-border"
          >
            <Timer className="w-4 h-4 mr-2" />
            60s
          </Button>
          {isTimerRunning && (
            <Button
              variant="outline"
              onClick={stopTimer}
              className="border-destructive text-destructive"
            >
              Stop
            </Button>
          )}
        </div>

        {contestants.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {contestants.map((contestant, idx) => (
              <motion.div
                key={contestant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-muted/20 rounded-xl p-4 border border-border/50"
              >
                <div className="text-center mb-3">
                  <span className="font-bold text-foreground text-lg">{contestant.name}</span>
                  <span className="block text-sm text-muted-foreground">{contestant.score} pts</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAward(contestant.id, contestant.name)}
                    className="flex-1 bg-success hover:bg-success/90 text-white font-bold"
                    data-testid={`button-award-${contestant.id}`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    +{question.points}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDeduct(contestant.id)}
                    className="bg-destructive hover:bg-destructive/90 text-white"
                    data-testid={`button-deduct-${contestant.id}`}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
            Add players from the scoreboard to award points
          </div>
        )}

        <div className="flex justify-center mt-8 pt-6 border-t border-border">
          <Button 
            variant="ghost" 
            size="lg"
            onClick={handleNoAnswer}
            className="text-muted-foreground"
            data-testid="button-close-question"
          >
            <X className="w-5 h-5 mr-2" />
            No Answer / Skip
          </Button>
        </div>
      </div>

      <div className="bg-muted/20 px-6 py-3 text-center text-xs text-muted-foreground border-t border-border">
        Keyboard: <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground font-mono">R</kbd> Reveal
        <span className="mx-3">|</span>
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground font-mono">T</kbd> Timer
        <span className="mx-3">|</span>
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground font-mono">Esc</kbd> Close
      </div>
    </div>
  );
}
