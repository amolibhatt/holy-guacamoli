import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Loader2, Settings, Maximize2, Minimize2, Sun, Moon, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AvocadoIcon } from "@/components/AvocadoIcon";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { QuestionCard } from "@/components/QuestionCard";
import { CategoryColumn } from "@/components/CategoryColumn";
import { Scoreboard } from "@/components/Scoreboard";
import { VictoryScreen } from "@/components/VictoryScreen";
import { BuzzerPanel, BuzzerPanelHandle, BuzzEvent } from "@/components/BuzzerPanel";
import { useScore } from "@/components/ScoreContext";
import { useAuth } from "@/hooks/use-auth";
import type { Question, Board, BoardCategoryWithCount } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

export default function PlayBoard() {
  const { boardId } = useParams<{ boardId: string }>();
  const { isAuthenticated } = useAuth();
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
    if (board?.id) {
      buzzerRef.current?.setBoard(board.id);
    }
  }, [board?.id]);

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
    setSelectedQuestion(null);
    buzzerRef.current?.lock();
  };

  const pointValues = board?.pointValues || [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <p className="text-muted-foreground">Please log in to play</p>
        <Link href="/">
          <Button className="mt-4">Go Home</Button>
        </Link>
      </div>
    );
  }

  if (isLoadingBoard || isLoadingCategories) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-primary/20 bg-card/40 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 flex flex-col" role="main" aria-label="Loading game board">
          <div className="flex gap-4 justify-center flex-wrap">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col gap-2 w-40">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
        <AvocadoIcon className="w-20 h-20 opacity-30 mb-6" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Board not found</h2>
        <p className="text-muted-foreground mb-6">This board doesn't exist or was deleted</p>
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
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <AppHeader
        title="Buzzkill"
        subtitle={board.name}
        backHref="/host/buzzkill"
        themed={true}
        showAdminButton={true}
        adminHref="/admin?game=buzzkill"
        rightContent={
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFullscreen}
            className="hidden sm:flex text-muted-foreground hover:text-foreground"
            data-testid="button-fullscreen"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        }
      />

      <main className="flex-1 p-2 sm:p-4 lg:p-6 flex flex-col relative overflow-auto" role="main" aria-label="Game board">
        {categories && categories.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col relative z-10"
          >
            <div 
              className="flex-1 grid gap-2 sm:gap-3 lg:gap-4"
              style={{
                gridTemplateColumns: `repeat(${Math.min(categories.length, 6)}, minmax(0, 1fr))`
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
                    colorCode={board?.colorCode || undefined}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <motion.div 
              className="text-center py-20 px-8 bg-card rounded-3xl border border-border max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <AvocadoIcon className="w-16 h-16 opacity-30 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-foreground">No categories yet</h3>
              <p className="text-muted-foreground mt-2 mb-6">Add categories to this board in the admin panel</p>
              <Link href="/admin">
                <Button data-testid="button-go-admin">
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
            <DialogContent className="max-w-3xl p-0 overflow-hidden border-border bg-card backdrop-blur-xl" aria-describedby={undefined}>
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
                  onAwardPoints={(playerId, points) => buzzerRef.current?.updateScore(playerId, points)}
                  onDeductPoints={(playerId, points) => buzzerRef.current?.updateScore(playerId, points)}
                  onCompleteQuestion={(questionId, playerId, points) => buzzerRef.current?.completeQuestion(questionId, playerId, points)}
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
