import { useBoards, useBoardCategories, useBoard } from "@/hooks/use-quiz";
import { Loader2, Settings, Maximize2, Minimize2, Sparkles, Star, ArrowLeft, Grid3X3 } from "lucide-react";
import { AvocadoIcon } from "@/components/AvocadoIcon";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CategoryColumn } from "@/components/CategoryColumn";
import { Scoreboard } from "@/components/Scoreboard";
import { VictoryScreen } from "@/components/VictoryScreen";
import { ThemeSelector } from "@/components/ThemeSelector";
import { BuzzerPanel, BuzzerPanelHandle } from "@/components/BuzzerPanel";
import { useScore } from "@/components/ScoreContext";
import { useTheme } from "@/context/ThemeContext";
import type { Question, Board } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const { data: boards, isLoading: isLoadingBoards } = useBoards();
  const { data: selectedBoard } = useBoard(selectedBoardId);
  const { data: categories, isLoading: isLoadingCategories, error } = useBoardCategories(selectedBoardId);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const { gameEnded, resetGameEnd } = useScore();
  const { colors } = useTheme();
  const buzzerRef = useRef<BuzzerPanelHandle>(null);

  useEffect(() => {
    if (gameEnded) {
      setShowVictory(true);
    }
  }, [gameEnded]);

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
    setSelectedQuestion(null);
    buzzerRef.current?.lock();
  };

  const pointValues = selectedBoard?.pointValues || [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  if (isLoadingBoards) {
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
          Loading boards...
        </motion.p>
      </div>
    );
  }

  if (!selectedBoardId) {
    return (
      <div className="min-h-screen gradient-game grid-bg flex flex-col">
        <header className="border-b border-primary/20 bg-card/40 backdrop-blur-xl sticky top-0 z-50">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <motion.div 
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <motion.div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-green-600 via-green-500 to-lime-400"
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
                  Select a Board
                </motion.span>
                <h1 className="text-2xl font-black tracking-tight leading-tight text-white text-glow">
                  Holy GuacAmoli!
                </h1>
              </div>
            </motion.div>
            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <ThemeSelector />
              <Link href="/admin">
                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10" data-testid="button-admin">
                  <Settings className="w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </header>

        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="max-w-4xl w-full">
            {boards && boards.length > 0 ? (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {boards.map((board, idx) => (
                  <motion.button
                    key={board.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => setSelectedBoardId(board.id)}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-6 text-left transition-all group"
                    data-testid={`button-board-${board.id}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Grid3X3 className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                        {board.name}
                      </h3>
                    </div>
                    {board.description && (
                      <p className="text-white/60 text-sm mb-3">{board.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {board.pointValues.map((pv) => (
                        <span key={pv} className="px-2 py-1 bg-white/10 rounded text-xs text-white/70">
                          {pv}
                        </span>
                      ))}
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                className="text-center py-20 px-8 bg-white/5 rounded-3xl border border-white/10"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Grid3X3 className="w-16 h-16 text-white/30 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white">No boards yet</h3>
                <p className="text-white/50 mt-2 mb-6">Create your first board in the admin panel</p>
                <Link href="/admin">
                  <Button className="bg-white text-black hover:bg-white/90 glow-primary" data-testid="button-go-admin">
                    Go to Admin
                  </Button>
                </Link>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (isLoadingCategories) {
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

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 gradient-game">
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4 text-white">
          <span className="text-3xl font-bold">!</span>
        </div>
        <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
        <p className="text-muted-foreground mt-2">Could not load categories.</p>
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
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedBoardId(null)}
              className="text-white/60 hover:text-white hover:bg-white/10"
              data-testid="button-back-to-boards"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="relative">
              <motion.div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-green-600 via-green-500 to-lime-400"
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
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.4, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Star className="w-5 h-5 text-lime-300 fill-lime-300 drop-shadow-lg" />
              </motion.div>
              <motion.div
                className="absolute -top-1 -left-2"
                animate={{ 
                  rotate: [0, -360],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
              >
                <Star className="w-4 h-4 text-green-300 fill-green-300" />
              </motion.div>
              <motion.div
                className="absolute -bottom-1 -left-1"
                animate={{ 
                  y: [0, -10, 0],
                  opacity: [0.6, 1, 0.6],
                  rotate: [0, 15, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              >
                <Sparkles className="w-5 h-5 text-lime-400" />
              </motion.div>
              <motion.div
                className="absolute -bottom-2 -right-1"
                animate={{ 
                  y: [0, -8, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ duration: 1.8, repeat: Infinity, delay: 0.8 }}
              >
                <Sparkles className="w-4 h-4 text-green-400" />
              </motion.div>
            </div>
            <div className="flex flex-col">
              <motion.span 
                className="text-[10px] font-bold text-white/50 tracking-[0.3em] uppercase"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {selectedBoard?.name || "Playing"}
              </motion.span>
              <h1 className="text-2xl font-black tracking-tight leading-tight text-white text-glow">
                Holy GuacAmoli!
              </h1>
            </div>
          </motion.div>
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <ThemeSelector />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleFullscreen}
              className="text-white/60 hover:text-white hover:bg-white/10"
              data-testid="button-fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10" data-testid="button-admin">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-6 flex flex-col">
        {categories && categories.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col"
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
              <p className="text-white/50 mt-2 mb-6">Create your first category to get started</p>
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
            <DialogContent className="max-w-3xl p-0 overflow-hidden border-white/20 bg-black/95 backdrop-blur-xl">
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
