import { useState, useEffect } from "react";
import { Question } from "@shared/schema";
import { useScore } from "./ScoreContext";
import { CheckCircle2, XCircle, Eye, EyeOff, Timer, Sparkles, X, Trophy } from "lucide-react";
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
      colors: ['#ffffff', '#cccccc', '#999999']
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
    <div className="relative overflow-hidden bg-black">
      <AnimatePresence>
        {awardedTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-white"
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
                <Trophy className="w-24 h-24 text-black mx-auto mb-4" />
              </motion.div>
              <h2 className="text-5xl font-black text-black">{awardedTo}</h2>
              <motion.p 
                className="text-4xl font-bold text-black/70 mt-2"
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

      <div className="bg-white px-6 py-5 flex items-center justify-between gap-4">
        <motion.span 
          className="text-5xl font-black text-black"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
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
                w-16 h-16 rounded-full flex items-center justify-center font-mono text-2xl font-black border-4
                ${timer <= 5 ? 'border-black bg-black text-white animate-pulse' : 'border-black/20 text-black'}
              `}
            >
              {timer}
            </motion.div>
          )}
          <Button
            size="lg"
            onClick={() => setShowAnswer(!showAnswer)}
            className={showAnswer 
              ? "bg-black/10 text-black hover:bg-black/20" 
              : "bg-black text-white hover:bg-black/90"
            }
            data-testid="button-toggle-answer"
          >
            {showAnswer ? <EyeOff className="w-5 h-5 mr-2" /> : <Eye className="w-5 h-5 mr-2" />}
            {showAnswer ? "Hide" : "Reveal"}
          </Button>
        </div>
      </div>

      <div className="p-8 bg-black">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="min-h-[120px] flex items-center justify-center mb-8"
        >
          <h3 className="text-2xl lg:text-3xl font-semibold text-white text-center leading-relaxed">
            {question.question}
          </h3>
        </motion.div>

        <AnimatePresence>
          {showAnswer && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, rotateX: -20 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotateX: 20 }}
              className="bg-white rounded-2xl p-6 mb-8"
            >
              <p className="text-black font-bold text-xl flex items-center justify-center gap-3">
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
                className="border-white/30 text-white hover:bg-white/10"
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
                className="border-white/50 text-white hover:bg-white/10"
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
                className="bg-white/10 rounded-xl p-4 border border-white/20"
              >
                <div className="text-center mb-3">
                  <span className="font-bold text-white text-lg">{contestant.name}</span>
                  <span className="block text-sm text-white/50">{contestant.score} pts</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAward(contestant.id, contestant.name)}
                    className="flex-1 bg-white text-black hover:bg-white/90 font-bold"
                    data-testid={`button-award-${contestant.id}`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    +{question.points}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDeduct(contestant.id)}
                    className="bg-white/20 hover:bg-white/30 text-white"
                    data-testid={`button-deduct-${contestant.id}`}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-white/50 bg-white/5 rounded-xl border border-dashed border-white/20">
            Add players from the scoreboard to award points
          </div>
        )}

        <div className="flex justify-center mt-8 pt-6 border-t border-white/10">
          <Button 
            variant="ghost" 
            size="lg"
            onClick={handleNoAnswer}
            className="text-white/50 hover:text-white hover:bg-white/10"
            data-testid="button-close-question"
          >
            <X className="w-5 h-5 mr-2" />
            No Answer / Skip
          </Button>
        </div>
      </div>

      <div className="bg-white/5 px-6 py-3 text-center text-xs text-white/40 border-t border-white/10">
        Keyboard: <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white font-mono">R</kbd> Reveal
        <span className="mx-3">|</span>
        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white font-mono">T</kbd> Timer
        <span className="mx-3">|</span>
        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white font-mono">Esc</kbd> Close
      </div>
    </div>
  );
}
