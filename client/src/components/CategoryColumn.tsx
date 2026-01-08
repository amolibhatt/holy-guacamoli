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
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-3 px-2 text-center min-h-[56px] flex items-center justify-center rounded-t-lg">
        <h2 className="font-semibold text-sm leading-tight line-clamp-2" data-testid={`text-category-${category.id}`}>
          {category.name}
        </h2>
      </div>
      
      <div className="flex flex-col gap-1 mt-1">
        {SCORE_VALUES.map((scoreValue) => {
          const question = questionsByPoints[scoreValue];
          const hasQuestion = !!question;
          const isCompleted = question ? completedQuestions.includes(question.id) : false;

          if (isLoading) {
            return <Skeleton key={scoreValue} className="h-12 w-full rounded-lg bg-slate-700" />;
          }

          return (
            <button
              key={scoreValue}
              className={`
                w-full py-3 text-center rounded-lg font-bold text-lg transition-all duration-200
                ${!hasQuestion 
                  ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed' 
                  : isCompleted 
                    ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed' 
                    : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-400 hover:to-blue-500 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 cursor-pointer active:scale-100'
                }
              `}
              onClick={() => hasQuestion && !isCompleted && onSelectQuestion(question)}
              disabled={!hasQuestion || isCompleted}
              data-testid={`cell-${category.id}-${scoreValue}`}
            >
              {isCompleted ? (
                <span className="opacity-40">{scoreValue}</span>
              ) : (
                <span>{scoreValue}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
