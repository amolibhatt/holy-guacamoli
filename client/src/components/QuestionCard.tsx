import { useState, useEffect } from "react";
import { Question } from "@shared/schema";
import { useScore } from "./ScoreContext";
import { useTheme } from "@/context/ThemeContext";
import { CheckCircle2, XCircle, Eye, EyeOff, Timer, X, Trophy, Sparkles, Star, Zap, Bell, Plus, Minus, Users } from "lucide-react";
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
  position: number;
  timestamp: number;
}

interface QuestionCardProps {
  question: Question;
  isLocked: boolean;
  onComplete?: () => void;
  buzzQueue?: BuzzEvent[];
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

export function QuestionCard({ question, isLocked, onComplete, buzzQueue = [] }: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [awardedTo, setAwardedTo] = useState<string | null>(null);
  const { contestants, awardPoints, deductPoints, markQuestionCompleted } = useScore();
  const { colors } = useTheme();

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
    soundManager.play('correct', 0.6);
    
    confetti({
      particleCount: 200,
      spread: 120,
      origin: { y: 0.5 },
      colors: [colors.gradient1, colors.gradient2, colors.gradient3, colors.accent, '#FFE66D']
    });

    setTimeout(() => {
      markQuestionCompleted(question.id);
      onComplete?.();
    }, 2000);
  };

  const handleDeduct = (contestantId: string) => {
    deductPoints(contestantId, question.points);
    soundManager.play('wrong', 0.5);
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
            className="border-white/40 text-white hover:bg-white/20"
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
                ${timer <= 3 ? 'bg-red-500 text-white border-red-300 animate-pulse shadow-lg shadow-red-500/50' : 'bg-white/20 text-white border-white/30'}
              `}
            >
              {timer}
            </motion.div>
          )}
          {isTimerRunning && (
            <Button
              variant="outline"
              onClick={stopTimer}
              className="border-red-400/50 text-red-300 hover:bg-red-500/20"
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
              ? "bg-white/20 text-white hover:bg-white/30 border-2 border-white/30" 
              : "bg-gradient-to-r from-white via-gray-100 to-white text-black font-bold shadow-lg shadow-white/50 hover:shadow-xl border-2 border-white/50"
            }
            data-testid="button-toggle-answer"
          >
            {showAnswer ? <EyeOff className="w-5 h-5 mr-2" /> : <Eye className="w-5 h-5 mr-2" />}
            {showAnswer ? "Hide" : "Reveal"}
          </Button>
        </div>
      </div>

      <div className="p-4">
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
                    className={`px-4 py-2 rounded-full text-sm font-bold ${
                      idx === 0
                        ? "gradient-gold text-purple-900 shadow-lg"
                        : "bg-white/10 text-foreground border border-white/20"
                    }`}
                  >
                    #{buzz.position} {buzz.playerName}
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
                  <span className="font-bold text-foreground text-base block">{contestant.name}</span>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deductPoints(contestant.id, question.points)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      data-testid={`button-adjust-minus-${contestant.id}`}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-lg font-semibold text-primary min-w-[60px]">{contestant.score}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => awardPoints(contestant.id, question.points)}
                      className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      data-testid={`button-adjust-plus-${contestant.id}`}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
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
                    onClick={() => handleDeduct(contestant.id)}
                    data-testid={`button-deduct-${contestant.id}`}
                  >
                    <XCircle className="w-4 h-4" />
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
