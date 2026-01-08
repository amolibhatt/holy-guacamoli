import { useCategories } from "@/hooks/use-quiz";
import { Loader2, Settings, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CategoryColumn } from "@/components/CategoryColumn";
import { Scoreboard } from "@/components/Scoreboard";
import type { Question } from "@shared/schema";
import { motion } from "framer-motion";

export default function Home() {
  const { data: categories, isLoading: isLoadingCategories, error } = useCategories();
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const handleQuestionComplete = () => {
    setSelectedQuestion(null);
  };

  if (isLoadingCategories) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-game">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground mt-4 animate-pulse">Loading game board...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 gradient-game">
        <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4 text-destructive">
          <span className="text-2xl font-bold">!</span>
        </div>
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground mt-2">Could not load categories.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-game grid-bg">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-header flex items-center justify-center glow-primary">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Trivia Challenge</h1>
              <p className="text-xs text-muted-foreground">Select a category and point value</p>
            </div>
          </div>
          <Link href="/admin">
            <Button variant="outline" size="sm" className="border-border/60" data-testid="button-admin">
              <Settings className="w-4 h-4 mr-2" />
              Admin
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto p-4 lg:p-6">
        <div className="grid lg:grid-cols-[280px,1fr] gap-6">
          <aside className="order-2 lg:order-1">
            <div className="lg:sticky lg:top-20">
              <Scoreboard />
            </div>
          </aside>
          
          <main className="order-1 lg:order-2">
            {categories && categories.length > 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-x-auto pb-4"
              >
                <div 
                  className="grid gap-3"
                  style={{ 
                    gridTemplateColumns: `repeat(${categories.length}, minmax(140px, 1fr))`,
                    minWidth: `${categories.length * 150}px`
                  }}
                >
                  {categories.map((category, idx) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
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
              <div className="text-center py-20 bg-card/50 rounded-2xl border border-border">
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold text-muted-foreground">No categories yet</h3>
                <p className="text-muted-foreground mt-2">Add some in the Admin panel</p>
                <Link href="/admin">
                  <Button className="mt-4 gradient-header" data-testid="button-go-admin">
                    Go to Admin
                  </Button>
                </Link>
              </div>
            )}
          </main>
        </div>
      </div>

      <Dialog open={selectedQuestion !== null} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-border bg-card">
          {selectedQuestion && (
            <QuestionCard
              question={selectedQuestion}
              isLocked={false}
              onComplete={handleQuestionComplete}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
