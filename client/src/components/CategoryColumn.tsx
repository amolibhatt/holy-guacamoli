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
    <div className="flex flex-col min-w-[120px]">
      <div className="bg-[#1e5a6e] text-white py-3 px-2 text-center border-r border-[#17495a] last:border-r-0">
        <h2 className="font-bold text-sm md:text-base truncate" data-testid={`text-category-${category.id}`}>
          {category.name}
        </h2>
      </div>
      
      <div className="flex flex-col">
        {SCORE_VALUES.map((scoreValue) => {
          const question = questionsByPoints[scoreValue];
          const hasQuestion = !!question;
          const isCompleted = question ? completedQuestions.includes(question.id) : false;

          if (isLoading) {
            return <Skeleton key={scoreValue} className="h-12 w-full" />;
          }

          return (
            <button
              key={scoreValue}
              className={`
                w-full py-3 text-center transition-all duration-200 border-b border-border/50
                ${!hasQuestion 
                  ? 'bg-muted/20 text-muted-foreground/50 cursor-not-allowed' 
                  : isCompleted 
                    ? 'bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50' 
                    : 'bg-card hover:bg-accent/20 cursor-pointer text-foreground'
                }
              `}
              onClick={() => hasQuestion && !isCompleted && onSelectQuestion(question)}
              disabled={!hasQuestion || isCompleted}
              data-testid={`cell-${category.id}-${scoreValue}`}
            >
              {isCompleted ? (
                <span className="text-lg font-semibold line-through">{scoreValue}</span>
              ) : (
                <span className="text-lg font-semibold">{scoreValue}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
