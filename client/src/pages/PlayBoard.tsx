import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Loader2, Settings, Maximize2, Minimize2, ArrowLeft, Sun, Moon, Home } from "lucide-react";
import { AvocadoIcon } from "@/components/AvocadoIcon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { QuestionCard } from "@/components/QuestionCard";
import { CategoryColumn } from "@/components/CategoryColumn";
import { Scoreboard } from "@/components/Scoreboard";
import { VictoryScreen } from "@/components/VictoryScreen";
import { ThemeDecorations } from "@/components/ThemeDecorations";
import { BuzzerPanel, BuzzerPanelHandle, BuzzEvent } from "@/components/BuzzerPanel";
import { useScore } from "@/components/ScoreContext";
import { useTheme, ThemeName } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/use-auth";
import type { Question, Board, BoardCategoryWithCount } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

export default function PlayBoard() {
  const { boardId } = useParams<{ boardId: string }>();
  const { isAuthenticated } = useAuth();
  const { setTheme, colorMode, toggleColorMode } = useTheme();
  const { gameEnded, resetGameEnd, markQuestionCompleted } = useScore();
  
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const buzzerRef = useRef<BuzzerPanelHandle>(null);
  const [buzzQueue, setBuzzQueue] = useState<BuzzEvent[]>([]);

  const { data: board, isLoading: isLoadingBoard } = useQuery<Board>({
    queryKey: ['/api/boards', boardId],
    enabled: !!boardId && isAuthenticated,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<BoardCategoryWithCount[]>({
    queryKey: ['/api/boards', boardId, 'categories'],
    enabled: !!boardId && isAuthenticated,
  });

  useEffect(() => {
    if (board?.theme) {
      setTheme(board.theme as ThemeName);
    }
  }, [board?.theme, setTheme]);

  useEffect(() => {
    if (gameEnded) {
      setShowVictory(true);
    }
  }, [gameEnded]);

  useEffect(() => {
    if (!selectedQuestion) {
      setBuzzQueue([]);
      return;
    }
    const interval = setInterval(() => {
      const queue = buzzerRef.current?.getBuzzQueue() || [];
      setBuzzQueue(queue);
    }, 100);
    return () => clearInterval(interval);
  }, [selectedQuestion]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedQuestion) {
        handleCloseQuestion();
      }
      if (e.key === 'f' && !selectedQuestion) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedQuestion]);

  const handleSelectQuestion = (question: Question) => {
    setSelectedQuestion(question);
    buzzerRef.current?.unlock();
  };

  const handleCloseQuestion = () => {
    if (selectedQuestion) {
      markQuestionCompleted(selectedQuestion.id);
    }
    setSelectedQuestion(null);
    buzzerRef.current?.lock();
  };

  const pointValues = board?.pointValues || [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-game">
        <p className="text-white/60">Please log in to play</p>
        <Link href="/">
          <Button className="mt-4">Go Home</Button>
        </Link>
      </div>
    );
  }

  if (isLoadingBoard || isLoadingCategories) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-game">
        <motion.div 
          className="relative"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute inset-0 blur-3xl bg-white/20 rounded-full" />
          <Loader2 className="w-16 h-16 text-white animate-spin relative z-10" />
        </motion.div>
        <motion.p 
          className="text-muted-foreground mt-6 text-lg"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Loading game board...
        </motion.p>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-game p-8">
        <AvocadoIcon className="w-20 h-20 opacity-30 mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">Board not found</h2>
        <p className="text-white/50 mb-6">This board doesn't exist or was deleted</p>
        <Link href="/">
          <Button className="gap-2">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-game grid-bg flex flex-col overflow-hidden">
      <header className="border-b border-primary/20 bg-card/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-primary/80 hover:text-primary hover:bg-primary/10"
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="relative">
              <motion.div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-black border border-white/20"
                animate={{ 
                  rotate: [0, -5, 5, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <AvocadoIcon className="w-8 h-8 drop-shadow-lg" />
                </motion.div>
              </motion.div>
            </div>
            <div className="flex flex-col">
              <motion.span 
                className="text-[10px] font-bold text-white/50 tracking-[0.3em] uppercase"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {board.name}
              </motion.span>
              <h1 className="text-2xl font-black tracking-tight leading-tight text-white text-glow">
                Grid of Grudges
              </h1>
            </div>
          </motion.div>
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary/80 hover:text-primary hover:bg-primary/10" 
              onClick={toggleColorMode}
              data-testid="button-color-mode-game"
            >
              {colorMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleFullscreen}
              className="text-primary/80 hover:text-primary hover:bg-primary/10"
              data-testid="button-fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="text-primary/80 hover:text-primary hover:bg-primary/10" data-testid="button-admin">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-6 flex flex-col relative">
        <ThemeDecorations placement="board" />
        {categories && categories.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col relative z-10"
          >
            <div 
              className="flex-1 grid gap-3 lg:gap-4"
              style={{ 
                gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))`,
              }}
            >
              {categories.map((boardCategory, idx) => (
                <motion.div
                  key={boardCategory.id}
                  initial={{ opacity: 0, y: 60, rotateX: -15 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ 
                    delay: idx * 0.1, 
                    type: "spring", 
                    stiffness: 100,
                    damping: 15
                  }}
                  className="flex flex-col"
                >
                  <CategoryColumn 
                    boardCategory={boardCategory}
                    onSelectQuestion={handleSelectQuestion}
                    pointValues={pointValues}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <motion.div 
              className="text-center py-20 px-8 bg-white/5 rounded-3xl border border-white/10 max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <AvocadoIcon className="w-16 h-16 opacity-30 mx-auto mb-6" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white">No categories yet</h3>
              <p className="text-white/50 mt-2 mb-6">Add categories to this board in the admin panel</p>
              <Link href="/admin">
                <Button className="bg-white text-black hover:bg-white/90 glow-primary" data-testid="button-go-admin">
                  Go to Admin
                </Button>
              </Link>
            </motion.div>
          </div>
        )}
      </main>

      <footer className="border-t border-primary/20 bg-card/40 backdrop-blur-xl">
        <div className="p-4 space-y-3">
          <BuzzerPanel ref={buzzerRef} />
          <Scoreboard />
        </div>
      </footer>

      <AnimatePresence>
        {selectedQuestion && (
          <Dialog open={true} onOpenChange={(open) => !open && handleCloseQuestion()}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden border-white/20 bg-black/95 backdrop-blur-xl" aria-describedby={undefined}>
              <VisuallyHidden>
                <DialogTitle>Question</DialogTitle>
              </VisuallyHidden>
              <motion.div
                initial={{ scale: 0.8, opacity: 0, rotateY: -10 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                exit={{ scale: 0.8, opacity: 0, rotateY: 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <QuestionCard
                  question={selectedQuestion}
                  isLocked={false}
                  onComplete={handleCloseQuestion}
                  buzzQueue={buzzQueue}
                />
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVictory && (
          <VictoryScreen onClose={() => {
            setShowVictory(false);
            resetGameEnd();
          }} />
        )}
      </AnimatePresence>
    </div>
  );
}
