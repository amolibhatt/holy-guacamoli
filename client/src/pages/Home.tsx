import { useCategories } from "@/hooks/use-quiz";
import { Loader2, Settings } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
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
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-slate-400 animate-pulse">Loading trivia board...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-400">
          <span className="text-2xl font-bold">!</span>
        </div>
        <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
        <p className="text-slate-400 mt-2">Could not load categories.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="p-4 lg:p-6">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="xl:w-72 shrink-0">
            <Scoreboard />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                  Trivia Challenge
                </h1>
                <p className="text-slate-400 mt-1">Select a category and point value</p>
              </div>
              <Link href="/admin">
                <Button variant="outline" className="border-slate-600 text-slate-300" data-testid="button-admin">
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
            </div>

            {categories && categories.length > 0 ? (
              <div className="overflow-x-auto pb-4">
                <div 
                  className="grid gap-1 min-w-max"
                  style={{ 
                    gridTemplateColumns: `repeat(${categories.length}, minmax(100px, 1fr))`,
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
              <div className="text-center py-20 bg-slate-800/50 rounded-2xl border border-slate-700">
                <h3 className="text-xl font-bold text-slate-400">No categories available yet</h3>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={selectedQuestion !== null} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-slate-700 bg-slate-900">
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
