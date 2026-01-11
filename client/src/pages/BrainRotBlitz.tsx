import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Sun, Moon, Play, Pause, RotateCcw, Check, X, Zap, Timer } from "lucide-react";
import { Link, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/context/ThemeContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Game, Board, BoardCategoryWithCount, Question, RapidFireSettings } from "@shared/schema";

type GameState = "idle" | "playing" | "paused" | "finished";

const DEFAULT_SETTINGS: RapidFireSettings = {
  timerSeconds: 60,
  basePoints: 10,
  multiplierIncrement: 0.5,
  maxMultiplier: 5,
  resetOnWrong: true,
};

export default function BrainRotBlitz() {
  const { gameId } = useParams<{ gameId: string }>();
  const { isAuthenticated } = useAuth();
  const { colorMode, toggleColorMode } = useTheme();
  
  const [gameState, setGameState] = useState<GameState>("idle");
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [showAnswer, setShowAnswer] = useState(false);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, skipped: 0 });

  const { data: game } = useQuery<Game>({
    queryKey: ['/api/games', gameId],
    enabled: !!gameId && isAuthenticated,
  });

  const settings: RapidFireSettings = useMemo(() => {
    if (game?.settings && typeof game.settings === 'object') {
      return { ...DEFAULT_SETTINGS, ...game.settings } as RapidFireSettings;
    }
    return DEFAULT_SETTINGS;
  }, [game?.settings]);

  const { data: gameBoards = [] } = useQuery<{ id: number; gameId: number; boardId: number; position: number; board: Board }[]>({
    queryKey: ['/api/games', gameId, 'boards'],
    enabled: !!gameId && isAuthenticated,
  });

  const selectedBoard = gameBoards[0]?.board;

  const { data: boardCategories = [] } = useQuery<BoardCategoryWithCount[]>({
    queryKey: ['/api/boards', selectedBoard?.id, 'categories'],
    enabled: !!selectedBoard?.id,
  });

  const { data: allQuestions = [] } = useQuery<Question[]>({
    queryKey: ['/api/boards', selectedBoard?.id, 'all-questions-blitz'],
    queryFn: async () => {
      const questions: Question[] = [];
      for (const bc of boardCategories) {
        const res = await fetch(`/api/board-categories/${bc.id}/questions`);
        if (res.ok) {
          const data = await res.json();
          questions.push(...data);
        }
      }
      return questions;
    },
    enabled: boardCategories.length > 0,
  });

  const shuffleQuestions = useCallback(() => {
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    setShuffledQuestions(shuffled);
  }, [allQuestions]);

  useEffect(() => {
    if (allQuestions.length > 0) {
      shuffleQuestions();
    }
  }, [allQuestions, shuffleQuestions]);

  useEffect(() => {
    setTimeLeft(settings.timerSeconds);
  }, [settings.timerSeconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (gameState === "playing" && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState("finished");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, timeLeft]);

  const startGame = () => {
    shuffleQuestions();
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setMultiplier(1);
    setTimeLeft(settings.timerSeconds);
    setStats({ correct: 0, wrong: 0, skipped: 0 });
    setShowAnswer(false);
    setGameState("playing");
  };

  const pauseGame = () => {
    setGameState("paused");
  };

  const resumeGame = () => {
    setGameState("playing");
  };

  const resetGame = () => {
    setGameState("idle");
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setMultiplier(1);
    setTimeLeft(settings.timerSeconds);
    setStats({ correct: 0, wrong: 0, skipped: 0 });
    setShowAnswer(false);
  };

  const markCorrect = () => {
    const points = Math.round(settings.basePoints * multiplier);
    setScore(prev => prev + points);
    setStreak(prev => prev + 1);
    setMultiplier(prev => Math.min(prev + settings.multiplierIncrement, settings.maxMultiplier));
    setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    nextQuestion();
  };

  const markWrong = () => {
    if (settings.resetOnWrong) {
      setStreak(0);
      setMultiplier(1);
    }
    setStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
    nextQuestion();
  };

  const skipQuestion = () => {
    setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
    nextQuestion();
  };

  const nextQuestion = () => {
    setShowAnswer(false);
    if (currentIndex < shuffledQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
      shuffleQuestions();
    }
  };

  const currentQuestion = shuffledQuestions[currentIndex];
  const timerProgress = (timeLeft / settings.timerSeconds) * 100;

  if (!game || !selectedBoard || shuffledQuestions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h2 className="text-xl font-bold text-foreground mb-4">
          {!selectedBoard ? "No board configured for this game" : "No questions available"}
        </h2>
        <Link href="/admin/games">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Games
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Link href="/admin/games">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            {game.name}
          </h1>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleColorMode}
            data-testid="button-color-mode"
          >
            {colorMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {gameState === "idle" && (
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="space-y-2">
              <Zap className="w-16 h-16 text-primary mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">Brain Rot Blitz</h2>
              <p className="text-muted-foreground">Answer as many questions as you can!</p>
            </div>

            <Card className="p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time Limit</span>
                <span className="font-medium text-foreground">{settings.timerSeconds} seconds</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Points</span>
                <span className="font-medium text-foreground">{settings.basePoints} per question</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max Multiplier</span>
                <span className="font-medium text-foreground">{settings.maxMultiplier}x</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Questions Available</span>
                <span className="font-medium text-foreground">{shuffledQuestions.length}</span>
              </div>
            </Card>

            <Button
              size="lg"
              className="w-full gap-2"
              onClick={startGame}
              data-testid="button-start-game"
            >
              <Play className="w-5 h-5" />
              Start Blitz!
            </Button>
          </div>
        )}

        {(gameState === "playing" || gameState === "paused") && currentQuestion && (
          <div className="w-full max-w-2xl space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-muted-foreground" />
                  <span className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-destructive' : 'text-foreground'}`}>
                    {timeLeft}s
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Multiplier</p>
                    <p className="text-xl font-bold text-primary">{multiplier.toFixed(1)}x</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="text-xl font-bold text-foreground">{score}</p>
                  </div>
                </div>
              </div>
              <Progress value={timerProgress} className="h-2" />
            </div>

            {streak > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                  <Zap className="w-4 h-4" />
                  {streak} streak!
                </span>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-6 min-h-[200px]">
                  {gameState === "paused" ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-2xl font-bold text-muted-foreground">PAUSED</p>
                    </div>
                  ) : (
                    <div className="prose dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {currentQuestion.question}
                      </ReactMarkdown>
                    </div>
                  )}
                </Card>
              </motion.div>
            </AnimatePresence>

            {showAnswer && gameState === "playing" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-4 bg-primary/10 border-2 border-primary">
                  <p className="text-sm text-muted-foreground mb-1">Answer:</p>
                  <p className="text-lg font-bold text-foreground">{currentQuestion.correctAnswer}</p>
                </Card>
              </motion.div>
            )}

            <div className="flex items-center justify-center gap-3">
              {gameState === "playing" ? (
                <>
                  {!showAnswer ? (
                    <>
                      <Button
                        size="lg"
                        variant="secondary"
                        className="flex-1 h-14"
                        onClick={skipQuestion}
                        data-testid="button-skip"
                      >
                        Skip
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-14 w-14"
                        onClick={pauseGame}
                        data-testid="button-pause"
                      >
                        <Pause className="w-6 h-6" />
                      </Button>
                      <Button
                        size="lg"
                        className="flex-1 h-14"
                        onClick={() => setShowAnswer(true)}
                        data-testid="button-reveal"
                      >
                        Reveal Answer
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="lg"
                        variant="destructive"
                        className="flex-1 h-14 gap-2"
                        onClick={markWrong}
                        data-testid="button-wrong"
                      >
                        <X className="w-5 h-5" />
                        Wrong
                      </Button>
                      <Button
                        size="lg"
                        className="flex-1 h-14 gap-2"
                        onClick={markCorrect}
                        data-testid="button-correct"
                      >
                        <Check className="w-5 h-5" />
                        Correct (+{Math.round(settings.basePoints * multiplier)})
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 h-14 gap-2"
                    onClick={resetGame}
                    data-testid="button-reset"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Reset
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 h-14 gap-2"
                    onClick={resumeGame}
                    data-testid="button-resume"
                  >
                    <Play className="w-5 h-5" />
                    Resume
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {gameState === "finished" && (
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="space-y-2">
              <Zap className="w-16 h-16 text-primary mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">Time's Up!</h2>
            </div>
            
            <Card className="p-8">
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground">Final Score</p>
                  <p className="text-5xl font-bold text-primary">{score}</p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.correct}</p>
                    <p className="text-xs text-muted-foreground">Correct</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-destructive">{stats.wrong}</p>
                    <p className="text-xs text-muted-foreground">Wrong</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-muted-foreground">{stats.skipped}</p>
                    <p className="text-xs text-muted-foreground">Skipped</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex gap-4">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 gap-2"
                onClick={startGame}
                data-testid="button-play-again"
              >
                <RotateCcw className="w-5 h-5" />
                Play Again
              </Button>
              <Link href="/admin/games" className="flex-1">
                <Button size="lg" variant="default" className="w-full gap-2" data-testid="button-back-to-games">
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
