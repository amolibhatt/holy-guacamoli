import { useQuestions } from "@/hooks/use-quiz";
import { useScore } from "@/components/ScoreContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category, Question } from "@shared/schema";
import { motion } from "framer-motion";

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
      <div className="gradient-category text-white py-4 px-3 text-center rounded-t-xl shadow-lg">
        <h2 
          className="font-bold text-sm leading-tight line-clamp-2 uppercase tracking-wide" 
          data-testid={`text-category-${category.id}`}
        >
          {category.name}
        </h2>
      </div>
      
      <div className="flex flex-col gap-2 mt-2">
        {SCORE_VALUES.map((scoreValue, idx) => {
          const question = questionsByPoints[scoreValue];
          const hasQuestion = !!question;
          const isCompleted = question ? completedQuestions.includes(question.id) : false;

          if (isLoading) {
            return <Skeleton key={scoreValue} className="h-14 w-full rounded-xl bg-muted/30" />;
          }

          return (
            <motion.button
              key={scoreValue}
              whileHover={hasQuestion && !isCompleted ? { scale: 1.03 } : undefined}
              whileTap={hasQuestion && !isCompleted ? { scale: 0.98 } : undefined}
              className={`
                w-full py-3.5 text-center rounded-xl font-bold text-xl transition-all duration-200
                ${!hasQuestion 
                  ? 'bg-muted/20 text-muted-foreground/30 cursor-not-allowed border border-border/30' 
                  : isCompleted 
                    ? 'bg-muted/10 text-muted-foreground/20 cursor-not-allowed border border-border/20' 
                    : 'bg-primary/90 text-white cursor-pointer cell-glow hover:bg-primary hover:glow-primary border border-primary/50'
                }
              `}
              onClick={() => hasQuestion && !isCompleted && onSelectQuestion(question)}
              disabled={!hasQuestion || isCompleted}
              data-testid={`cell-${category.id}-${scoreValue}`}
            >
              {isCompleted ? (
                <span className="opacity-30">{scoreValue}</span>
              ) : (
                <span className={hasQuestion ? 'text-glow' : ''}>{scoreValue}</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
