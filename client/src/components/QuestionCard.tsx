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

  const options = question.options as string[];
  const correctAnswer = (question as any).correctAnswer || options[0];

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
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3B82F6', '#A855F7', '#FBBF24', '#10B981']
    });

    setTimeout(() => {
      markQuestionCompleted(question.id);
      onComplete?.();
    }, 1500);
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
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600"
          >
            <div className="text-center">
              <Sparkles className="w-16 h-16 text-white mx-auto mb-4 animate-pulse" />
              <h2 className="text-3xl font-black text-white">{awardedTo} wins!</h2>
              <p className="text-2xl font-bold text-white/90 mt-2">+${question.points}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="gradient-header px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black text-white text-glow">${question.points}</span>
        </div>
        <div className="flex items-center gap-2">
          {timer !== null && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`
                px-4 py-1.5 rounded-full font-mono text-xl font-bold
                ${timer <= 5 ? 'bg-destructive animate-pulse' : 'bg-white/20'}
                text-white
              `}
            >
              {timer}s
            </motion.div>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAnswer(!showAnswer)}
            className="bg-white/20 hover:bg-white/30 text-white border-0"
            data-testid="button-toggle-answer"
          >
            {showAnswer ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showAnswer ? "Hide" : "Reveal"}
          </Button>
        </div>
      </div>

      <div className="p-6 bg-card">
        <motion.h3 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-xl font-semibold text-foreground mb-6 leading-relaxed"
        >
          {question.question}
        </motion.h3>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {options.map((option, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              className={`
                px-4 py-3 rounded-xl text-center font-semibold transition-all duration-300
                ${showAnswer && option === correctAnswer
                  ? 'bg-success/20 border-2 border-success text-success ring-2 ring-success/30'
                  : 'bg-muted/30 border-2 border-border text-foreground'
                }
              `}
            >
              {option}
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {showAnswer && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-success/10 border border-success/30 rounded-xl p-4 mb-6 overflow-hidden"
            >
              <p className="text-success font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Correct Answer: {correctAnswer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => startTimer(30)}
            disabled={isTimerRunning}
            className="border-border"
          >
            <Timer className="w-4 h-4 mr-1" />
            30s
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => startTimer(60)}
            disabled={isTimerRunning}
            className="border-border"
          >
            <Timer className="w-4 h-4 mr-1" />
            60s
          </Button>
          {isTimerRunning && (
            <Button
              variant="outline"
              size="sm"
              onClick={stopTimer}
              className="border-destructive text-destructive"
            >
              Stop
            </Button>
          )}
        </div>

        {contestants.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-3">Award or deduct points:</p>
            {contestants.map((contestant, idx) => (
              <motion.div
                key={contestant.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 + idx * 0.05 }}
                className="flex items-center justify-between gap-3 p-3 bg-muted/20 rounded-xl border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">{contestant.name}</span>
                  <span className="text-sm text-muted-foreground">(${contestant.score})</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAward(contestant.id, contestant.name)}
                    className="bg-success hover:bg-success/90 text-white"
                    data-testid={`button-award-${contestant.id}`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    +${question.points}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDeduct(contestant.id)}
                    className="bg-destructive hover:bg-destructive/90 text-white"
                    data-testid={`button-deduct-${contestant.id}`}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    -${question.points}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
            Add players from the scoreboard to award points
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t border-border">
          <Button 
            variant="ghost" 
            onClick={handleNoAnswer}
            className="text-muted-foreground"
            data-testid="button-close-question"
          >
            <X className="w-4 h-4 mr-2" />
            Close Question
          </Button>
        </div>
      </div>
    </div>
  );
}
