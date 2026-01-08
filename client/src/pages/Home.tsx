import { useCategories } from "@/hooks/use-quiz";
import { Loader2, Settings, Maximize2, Minimize2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CategoryColumn } from "@/components/CategoryColumn";
import { Scoreboard } from "@/components/Scoreboard";
import type { Question } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { data: categories, isLoading: isLoadingCategories, error } = useCategories();
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        setSelectedQuestion(null);
      }
      if (e.key === 'f' && !selectedQuestion) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedQuestion]);

  const handleQuestionComplete = () => {
    setSelectedQuestion(null);
  };

  if (isLoadingCategories) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-game">
        <div className="relative">
          <div className="absolute inset-0 blur-3xl bg-primary/30 rounded-full animate-pulse" />
          <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
        </div>
        <p className="text-muted-foreground mt-6 text-lg animate-pulse">Loading game board...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 gradient-game">
        <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center mb-4 text-destructive">
          <span className="text-3xl font-bold">!</span>
        </div>
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground mt-2">Could not load categories.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-game grid-bg flex flex-col">
      <header className="border-b border-border/30 bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-10 h-10 rounded-xl gradient-header flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.div>
            <h1 className="text-xl font-black tracking-tight">
              <span className="text-primary">AMOLI'S</span>
              <span className="text-foreground mx-1.5">BIRTHDAY</span>
              <span className="text-primary">TRIVIA</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleFullscreen}
              className="text-muted-foreground"
              data-testid="button-fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid="button-admin">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>
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
              className="flex-1 grid gap-2 lg:gap-3"
              style={{ 
                gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))`,
              }}
            >
              {categories.map((category, idx) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, type: "spring", stiffness: 100 }}
                  className="flex flex-col"
                >
                  <CategoryColumn 
                    category={category}
                    onSelectQuestion={setSelectedQuestion}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-20 px-8 bg-card/50 rounded-3xl border border-border max-w-md">
              <Sparkles className="w-16 h-16 text-primary/50 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-foreground">No categories yet</h3>
              <p className="text-muted-foreground mt-2 mb-6">Create your first category to get started</p>
              <Link href="/admin">
                <Button className="gradient-header glow-primary" data-testid="button-go-admin">
                  Go to Admin
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border/30 bg-card/30 backdrop-blur-md">
        <div className="p-4">
          <Scoreboard />
        </div>
      </footer>

      <AnimatePresence>
        {selectedQuestion && (
          <Dialog open={true} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden border-border bg-card">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <QuestionCard
                  question={selectedQuestion}
                  isLocked={false}
                  onComplete={handleQuestionComplete}
                />
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
