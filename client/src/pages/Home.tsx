import { useCategories } from "@/hooks/use-quiz";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CategoryColumn } from "@/components/CategoryColumn";
import { Scoreboard } from "@/components/Scoreboard";
import type { Question } from "@shared/schema";

export default function Home() {
  const { data: categories, isLoading: isLoadingCategories, error } = useCategories();
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const handleQuestionComplete = () => {
    setSelectedQuestion(null);
  };

  if (isLoadingCategories) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Loading trivia board...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4 text-destructive">
          <span className="text-2xl font-bold">!</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground">Something went wrong</h2>
        <p className="text-muted-foreground mt-2">Could not load categories. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4">
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="xl:w-64 shrink-0">
            <Scoreboard />
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-foreground mb-4 text-center">
              Trivia Challenge
            </h1>

            {categories && categories.length > 0 ? (
              <div className="overflow-x-auto pb-2">
                <div 
                  className="grid border border-border rounded-lg overflow-hidden"
                  style={{ 
                    gridTemplateColumns: `repeat(${categories.length}, minmax(90px, 1fr))`,
                    minWidth: `${categories.length * 90}px`
                  }}
                >
                  {categories.map((category) => (
                    <CategoryColumn 
                      key={category.id} 
                      category={category}
                      onSelectQuestion={setSelectedQuestion}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border">
                <h3 className="text-xl font-bold text-muted-foreground">No categories available yet</h3>
                <p className="text-muted-foreground mt-2">Check back soon for new content!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={selectedQuestion !== null} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
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
