import { useCategories, useQuestions } from "@/hooks/use-quiz";
import { Loader2, Sparkles, Trophy, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { motion } from "framer-motion";
import { useScore } from "@/components/ScoreContext";
import { QuestionCard } from "@/components/QuestionCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category } from "@shared/schema";

const SCORE_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function CategoryColumn({ category }: { category: Category }) {
  const { data: questions, isLoading, error } = useQuestions(category.id);
  const { completedQuestions } = useScore();
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  
  const sortedQuestions = questions?.slice().sort((a, b) => a.points - b.points) || [];
  const selectedQuestion = sortedQuestions.find(q => q.id === selectedQuestionId);

  const handleQuestionComplete = () => {
    setSelectedQuestionId(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedQuestionId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Card className="bg-primary text-primary-foreground p-4 text-center">
        <h2 className="font-bold text-lg truncate" data-testid={`text-category-${category.id}`}>
          {category.name}
        </h2>
      </Card>
      
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {SCORE_VALUES.slice(0, 5).map((score) => (
            <Skeleton key={score} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Failed to load
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedQuestions.map((question, idx) => {
            const isCompleted = completedQuestions.includes(question.id);
            
            return (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <button
                  className={`
                    w-full p-6 text-center rounded-lg border transition-all duration-200
                    ${isCompleted 
                      ? 'bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50' 
                      : 'bg-card hover:bg-accent/10 hover:scale-105 cursor-pointer border-border'
                    }
                  `}
                  onClick={() => !isCompleted && setSelectedQuestionId(question.id)}
                  disabled={isCompleted}
                  data-testid={`card-question-${question.id}`}
                >
                  {isCompleted ? (
                    <div className="flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4" />
                      <span className="text-xl font-bold line-through">{question.points}</span>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-primary">{question.points}</span>
                  )}
                </button>
              </motion.div>
            );
          })}
          
          {sortedQuestions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No questions yet
            </div>
          )}
        </div>
      )}

      <Dialog open={selectedQuestionId !== null} onOpenChange={handleOpenChange}>
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

export default function Home() {
  const { data: categories, isLoading, error } = useCategories();
  const { score } = useScore();

  if (isLoading) {
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
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6">
          <Sparkles className="w-4 h-4" />
          <span>Trivia Challenge</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          Pick a Category & Score
        </h1>
        
        <p className="text-lg text-muted-foreground">
          Select any score card to answer a question and earn points!
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <Card className="inline-flex items-center gap-3 px-6 py-4 bg-card">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Your Score</p>
            <p className="text-3xl font-bold text-foreground" data-testid="text-total-score">{score}</p>
          </div>
        </Card>
      </div>

      <div 
        className="grid gap-4" 
        style={{ gridTemplateColumns: `repeat(${Math.min(categories?.length || 1, 4)}, minmax(200px, 1fr))` }}
      >
        {categories?.map((category) => (
          <CategoryColumn key={category.id} category={category} />
        ))}
      </div>
      
      {categories?.length === 0 && (
        <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border">
          <h3 className="text-xl font-bold text-muted-foreground">No categories available yet</h3>
          <p className="text-muted-foreground mt-2">Check back soon for new content!</p>
        </div>
      )}
    </div>
  );
}
