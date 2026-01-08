import { useQuestions } from "@/hooks/use-quiz";
import { useScore } from "@/components/ScoreContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category, Question } from "@shared/schema";

const SCORE_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

interface CategoryColumnProps {
  category: Category;
  onSelectQuestion: (question: Question) => void;
}

export function CategoryColumn({ category, onSelectQuestion }: CategoryColumnProps) {
  const { data: questions, isLoading } = useQuestions(category.id);
  const { completedQuestions } = useScore();
  
  const questionsByPoints = (questions || []).reduce((acc, q) => {
    acc[q.points] = q;
    return acc;
  }, {} as Record<number, Question>);

  return (
    <div className="flex flex-col">
      <div className="bg-[#1a4f5f] text-white py-2 px-1 text-center border-r border-[#134451] last:border-r-0 min-h-[52px] flex items-center justify-center">
        <h2 className="font-bold text-xs leading-tight line-clamp-2" data-testid={`text-category-${category.id}`}>
          {category.name}
        </h2>
      </div>
      
      <div className="flex flex-col">
        {SCORE_VALUES.map((scoreValue) => {
          const question = questionsByPoints[scoreValue];
          const hasQuestion = !!question;
          const isCompleted = question ? completedQuestions.includes(question.id) : false;

          if (isLoading) {
            return <Skeleton key={scoreValue} className="h-10 w-full" />;
          }

          return (
            <button
              key={scoreValue}
              className={`
                w-full py-2 text-center transition-all duration-200 border-b border-r border-border/30 last:border-r-0
                ${!hasQuestion 
                  ? 'bg-muted/20 text-muted-foreground/40 cursor-not-allowed' 
                  : isCompleted 
                    ? 'bg-muted/40 text-muted-foreground/50 cursor-not-allowed' 
                    : 'bg-card hover:bg-primary/20 cursor-pointer text-foreground font-semibold'
                }
              `}
              onClick={() => hasQuestion && !isCompleted && onSelectQuestion(question)}
              disabled={!hasQuestion || isCompleted}
              data-testid={`cell-${category.id}-${scoreValue}`}
            >
              {isCompleted ? (
                <span className="text-base line-through opacity-50">{scoreValue}</span>
              ) : (
                <span className="text-base">{scoreValue}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
