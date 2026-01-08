import { useState, useEffect } from "react";
import { Question } from "@shared/schema";
import { useScore } from "./ScoreContext";
import { CheckCircle2, XCircle, Eye, EyeOff, Timer, Sparkles } from "lucide-react";
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
      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
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
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative bg-slate-900 overflow-hidden"
    >
      <AnimatePresence>
        {awardedTo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-green-500/90 backdrop-blur"
          >
            <div className="text-center">
              <Sparkles className="w-16 h-16 text-white mx-auto mb-4 animate-pulse" />
              <h2 className="text-3xl font-bold text-white">{awardedTo} got it!</h2>
              <p className="text-xl text-white/80 mt-2">+{question.points} points</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between gap-4">
        <span className="font-bold text-2xl text-white">{question.points} Points</span>
        <div className="flex items-center gap-2">
          {timer !== null && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`
                px-4 py-1 rounded-full font-mono text-xl font-bold
                ${timer <= 5 ? 'bg-red-500 animate-pulse' : 'bg-white/20'}
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

      <div className="p-6">
        <motion.h3 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-xl font-medium text-white mb-6 leading-relaxed"
        >
          {question.question}
        </motion.h3>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {options.map((option, idx) => (
            <motion.div
              key={idx}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className={`
                px-4 py-3 rounded-xl text-center font-medium transition-all duration-300
                ${showAnswer && option === correctAnswer
                  ? 'bg-green-500/20 border-2 border-green-500 text-green-400 scale-105 shadow-lg shadow-green-500/20'
                  : 'bg-slate-800 border-2 border-slate-700 text-slate-300'
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
              className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 overflow-hidden"
            >
              <p className="text-green-400 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Answer: {correctAnswer}
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
            className="border-slate-600 text-slate-300"
          >
            <Timer className="w-4 h-4 mr-1" />
            30s
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => startTimer(60)}
            disabled={isTimerRunning}
            className="border-slate-600 text-slate-300"
          >
            <Timer className="w-4 h-4 mr-1" />
            60s
          </Button>
          {isTimerRunning && (
            <Button
              variant="outline"
              size="sm"
              onClick={stopTimer}
              className="border-red-600 text-red-400"
            >
              Stop
            </Button>
          )}
        </div>

        {contestants.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-400 mb-3">Award or deduct points:</p>
            {contestants.map((contestant, idx) => (
              <motion.div
                key={contestant.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
                className="flex items-center justify-between gap-3 p-3 bg-slate-800/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-white">{contestant.name}</span>
                  <span className="text-sm text-slate-500">({contestant.score} pts)</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAward(contestant.id, contestant.name)}
                    className="bg-green-600 hover:bg-green-500 text-white"
                    data-testid={`button-award-${contestant.id}`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    +{question.points}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDeduct(contestant.id)}
                    className="bg-red-600 hover:bg-red-500 text-white"
                    data-testid={`button-deduct-${contestant.id}`}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    -{question.points}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500">
            Add players from the scoreboard to award points
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t border-slate-700">
          <Button 
            variant="outline" 
            onClick={handleNoAnswer} 
            className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
            data-testid="button-close-question"
          >
            Close Question
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
