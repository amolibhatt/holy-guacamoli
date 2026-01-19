import { useState, useEffect, useRef } from "react";
import { Question, PLAYER_AVATARS } from "@shared/schema";
import { useScore } from "./ScoreContext";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { CheckCircle2, XCircle, Eye, EyeOff, Timer, X, Trophy, Zap, Users, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { soundManager } from "@/lib/sounds";


interface BuzzEvent {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  position: number;
  timestamp: number;
}

interface QuestionCardProps {
  question: Question;
  isLocked: boolean;
  onComplete?: () => void;
  buzzQueue?: BuzzEvent[];
  onAwardPoints?: (contestantId: string, points: number) => void;
  onDeductPoints?: (contestantId: string, points: number) => void;
  onCompleteQuestion?: (questionId: number, playerId?: string, points?: number) => void;
}

function AudioPlayer({ src }: { src: string }) {
  return (
    <div className="my-4 flex justify-center">
      <audio controls className="w-full max-w-md rounded-lg">
        <source src={src} />
        Your browser does not support audio.
      </audio>
    </div>
  );
}

function QuestionContent({ content }: { content: string }) {
  const audioRegex = /\[audio:(.*?)\]/g;
  const parts: (string | { type: 'audio'; src: string })[] = [];
  let lastIndex = 0;
  let match;

  while ((match = audioRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push({ type: 'audio', src: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return (
    <div className="prose prose-invert prose-lg max-w-none text-center">
      {parts.map((part, i) => {
        if (typeof part === 'string') {
          return (
            <ReactMarkdown
              key={i}
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                p: ({ children }) => <p className="text-xl lg:text-2xl font-semibold text-foreground leading-relaxed my-2">{children}</p>,
                strong: ({ children }) => <strong className="text-primary font-bold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                img: ({ src, alt }) => (
                  <img 
                    src={src} 
                    alt={alt || ''} 
                    className="max-w-full max-h-48 mx-auto rounded-xl my-4 shadow-lg object-contain"
                  />
                ),
              }}
            >
              {part}
            </ReactMarkdown>
          );
        } else {
          return <AudioPlayer key={i} src={part.src} />;
        }
      })}
    </div>
  );
}

export function QuestionCard({ question, isLocked, onComplete, buzzQueue = [], onAwardPoints, onDeductPoints, onCompleteQuestion }: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [awardedTo, setAwardedTo] = useState<string | null>(null);
  const [lastAwardedId, setLastAwardedId] = useState<string | null>(null);
  const [isDeduction, setIsDeduction] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { contestants, awardPoints, deductPoints, markQuestionCompleted } = useScore();
  const prefersReducedMotion = useReducedMotion();

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
    setLastAwardedId(contestantId);
    setIsDeduction(false);
    awardPoints(contestantId, question.points);
    onAwardPoints?.(contestantId, question.points);
    soundManager.play('correct', 0.6);
    
    if (!prefersReducedMotion) {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#8B5CF6', '#7C3AED', '#FBBF24', '#FFE66D']
      });
    }

    closeTimeoutRef.current = setTimeout(() => {
      markQuestionCompleted(question.id);
      onCompleteQuestion?.(question.id, contestantId, question.points);
      onComplete?.();
    }, 3000);
  };

  const handleDeduct = (contestantId: string, contestantName: string) => {
    setAwardedTo(contestantName);
    setLastAwardedId(contestantId);
    setIsDeduction(true);
    deductPoints(contestantId, question.points);
    onDeductPoints?.(contestantId, -question.points);
    soundManager.play('wrong', 0.5);
    
    closeTimeoutRef.current = setTimeout(() => {
      setAwardedTo(null);
      setLastAwardedId(null);
    }, 3000);
  };

  const handleUndo = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    
    if (lastAwardedId) {
      if (isDeduction) {
        awardPoints(lastAwardedId, question.points);
        onAwardPoints?.(lastAwardedId, question.points);
      } else {
        deductPoints(lastAwardedId, question.points);
        onDeductPoints?.(lastAwardedId, -question.points);
      }
    }
    
    setAwardedTo(null);
    setLastAwardedId(null);
    setIsDeduction(false);
  };

  const handleNoAnswer = () => {
    markQuestionCompleted(question.id);
    onCompleteQuestion?.(question.id);
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
            className={`absolute inset-0 z-50 flex items-center justify-center ${isDeduction ? 'bg-destructive' : 'gradient-header'}`}
          >
            <motion.div 
              className="text-center"
              initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0, rotate: -10 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, rotate: 0 }}
              transition={prefersReducedMotion ? { duration: 0.1 } : { type: "spring", stiffness: 200 }}
            >
              {isDeduction ? (
                <XCircle className="w-24 h-24 text-white mx-auto mb-4 drop-shadow-lg" />
              ) : (
                <Trophy className="w-24 h-24 text-white mx-auto mb-4 drop-shadow-lg" />
              )}
              <h2 className="text-5xl font-black text-white drop-shadow-lg">{awardedTo}</h2>
              <motion.p 
                className="text-4xl font-bold text-white/90 mt-2"
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: prefersReducedMotion ? 0 : 0.3 }}
              >
                {isDeduction ? '-' : '+'}{question.points} points
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-6"
              >
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleUndo}
                  className="bg-white/20 border-white/40 text-white hover:bg-white/30 gap-2"
                  data-testid="button-undo-award"
                >
                  <Undo2 className="w-5 h-5" />
                  Undo - Made a mistake?
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="gradient-header px-4 py-3 flex items-center justify-between gap-3">
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-4xl font-black text-white drop-shadow-lg">{question.points}</span>
          <span className="text-lg font-medium text-white/80">pts</span>
        </motion.div>
        <div className="flex items-center gap-3 relative z-10">
          <Button
            variant="outline"
            onClick={() => startTimer(7)}
            disabled={isTimerRunning}
            className="border-background/40 text-background bg-background/20 hover:bg-background/30 dark:border-white/40 dark:text-white dark:bg-transparent dark:hover:bg-white/20"
          >
            <Timer className="w-4 h-4 mr-2" />
            7s
          </Button>
          {timer !== null && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`
                w-14 h-14 rounded-full flex items-center justify-center font-mono text-2xl font-black border-4
                ${timer <= 3 ? 'bg-red-500 text-white border-red-300 animate-pulse shadow-lg shadow-red-500/50' : 'bg-background/20 text-background border-background/30 dark:bg-white/20 dark:text-white dark:border-white/30'}
              `}
            >
              {timer}
            </motion.div>
          )}
          {isTimerRunning && (
            <Button
              variant="outline"
              onClick={stopTimer}
              className="border-red-500 text-red-600 bg-red-100 hover:bg-red-200 dark:border-red-400/50 dark:text-red-300 dark:bg-transparent dark:hover:bg-red-500/20"
            >
              Stop
            </Button>
          )}
          <Button
            size="lg"
            onClick={() => {
              if (!showAnswer) {
                soundManager.play('reveal', 0.5);
              }
              setShowAnswer(!showAnswer);
            }}
            className={showAnswer 
              ? "bg-background/90 text-foreground hover:bg-background border-2 border-border font-bold" 
              : "bg-primary text-primary-foreground font-bold shadow-lg hover:bg-primary/90 border-2 border-primary"
            }
            data-testid="button-toggle-answer"
          >
            {showAnswer ? <EyeOff className="w-5 h-5 mr-2" /> : <Eye className="w-5 h-5 mr-2" />}
            {showAnswer ? "Hide" : "Reveal"}
          </Button>
        </div>
      </div>

      <div className="p-4">
        {question.imageUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-4"
          >
            <img 
              src={question.imageUrl} 
              alt="Question" 
              className="max-w-full max-h-64 rounded-xl shadow-lg object-contain"
            />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center mb-4"
        >
          <QuestionContent content={question.question} />
        </motion.div>

        <AnimatePresence>
          {showAnswer && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl p-5 mb-4 gradient-header border-2 border-white/20"
            >
              <div className="flex items-center justify-center gap-4">
                <CheckCircle2 className="w-8 h-8 text-white" />
                <p className="text-white font-bold text-2xl lg:text-3xl">
                  {correctAnswer}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {buzzQueue.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30"
            >
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">Buzz Order:</span>
                {buzzQueue.map((buzz, idx) => (
                  <motion.div
                    key={buzz.playerId}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${
                      idx === 0
                        ? "gradient-gold text-purple-900 shadow-lg"
                        : "bg-white/10 text-foreground border border-white/20"
                    }`}
                  >
                    <span>#{buzz.position}</span>
                    <span>{PLAYER_AVATARS.find(a => a.id === buzz.playerAvatar)?.emoji || "🎮"}</span>
                    <span>{buzz.playerName}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {contestants.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {contestants.map((contestant, idx) => (
              <motion.div
                key={contestant.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-card rounded-xl p-3 border border-primary/20 hover:border-primary/40 transition-colors"
              >
                <div className="text-center mb-3">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">{PLAYER_AVATARS.find(a => a.id === contestant.avatar)?.emoji || "🎮"}</span>
                    <span className="font-bold text-foreground text-base">{contestant.name}</span>
                  </div>
                  <span className="text-lg font-semibold text-primary">{contestant.score} pts</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAward(contestant.id, contestant.name)}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium"
                    data-testid={`button-award-${contestant.id}`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    +{question.points}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeduct(contestant.id, contestant.name)}
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
          <div className="text-center py-6 text-muted-foreground bg-card/50 rounded-xl border border-dashed border-border">
            <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
            <span className="text-sm">Add players to award points</span>
          </div>
        )}

        <div className="flex justify-center mt-4 pt-3 border-t border-border">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleNoAnswer}
            className="text-muted-foreground hover:text-foreground hover:bg-white/10"
            data-testid="button-close-question"
          >
            <X className="w-4 h-4 mr-1" />
            Skip
          </Button>
        </div>
      </div>

      <div className="bg-card/50 px-4 py-2 text-center text-xs text-muted-foreground border-t border-border">
        Keyboard: <kbd className="px-1.5 py-0.5 bg-primary/20 rounded text-primary font-mono">R</kbd> Reveal
        <span className="mx-3">|</span>
        <kbd className="px-1.5 py-0.5 bg-primary/20 rounded text-primary font-mono">T</kbd> Timer
        <span className="mx-3">|</span>
        <kbd className="px-1.5 py-0.5 bg-primary/20 rounded text-primary font-mono">Esc</kbd> Close
      </div>
    </div>
  );
}
