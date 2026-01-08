import { useCategories } from "@/hooks/use-quiz";
import { Loader2, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useScore } from "@/components/ScoreContext";
import { QuestionCard } from "@/components/QuestionCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CategoryColumn } from "@/components/CategoryColumn";
import type { Question } from "@shared/schema";

export default function Home() {
  const { data: categories, isLoading: isLoadingCategories, error } = useCategories();
  const { score } = useScore();
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const handleQuestionComplete = () => {
    setSelectedQuestion(null);
  };

  if (isLoadingCategories) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Loading amazing quizzes...</p>
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Trivia Quiz
        </h1>
        
        <Card className="inline-flex items-center gap-3 px-4 py-2 bg-card">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Score:</span>
            <span className="text-xl font-bold text-foreground" data-testid="text-total-score">{score}</span>
          </div>
        </Card>
      </div>

      {categories && categories.length > 0 ? (
        <div className="overflow-x-auto">
          <div 
            className="grid border border-border rounded-lg overflow-hidden"
            style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(120px, 1fr))` }}
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
