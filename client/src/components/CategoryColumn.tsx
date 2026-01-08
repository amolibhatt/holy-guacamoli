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
    <div className="flex flex-col h-full">
      <div className="gradient-category text-white py-4 px-2 text-center rounded-t-xl shadow-lg min-h-[72px] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
        <h2 
          className="font-black text-sm lg:text-base leading-tight line-clamp-2 uppercase tracking-wider relative z-10" 
          data-testid={`text-category-${category.id}`}
        >
          {category.name}
        </h2>
      </div>
      
      <div className="flex flex-col gap-1.5 mt-1.5 flex-1">
        {SCORE_VALUES.map((scoreValue, idx) => {
          const question = questionsByPoints[scoreValue];
          const hasQuestion = !!question;
          const isCompleted = question ? completedQuestions.includes(question.id) : false;
          if (isLoading) {
            return <Skeleton key={scoreValue} className="flex-1 min-h-[48px] rounded-lg bg-muted/20" />;
          }

          return (
            <motion.button
              key={scoreValue}
              whileHover={hasQuestion && !isCompleted ? { scale: 1.02, y: -2 } : undefined}
              whileTap={hasQuestion && !isCompleted ? { scale: 0.98 } : undefined}
              className={`
                flex-1 min-h-[48px] lg:min-h-[56px] flex items-center justify-center rounded-lg font-black text-xl lg:text-2xl transition-all duration-200 relative overflow-hidden
                ${!hasQuestion 
                  ? 'bg-muted/10 text-muted-foreground/20 cursor-not-allowed' 
                  : isCompleted 
                    ? 'bg-muted/5 text-muted-foreground/10 cursor-not-allowed' 
                    : 'bg-primary text-white cursor-pointer cell-glow hover:glow-primary border border-primary/60'
                }
              `}
              onClick={() => hasQuestion && !isCompleted && onSelectQuestion(question)}
              disabled={!hasQuestion || isCompleted}
              data-testid={`cell-${category.id}-${scoreValue}`}
            >
              {hasQuestion && !isCompleted && (
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
              )}
              {isCompleted ? (
                <span className="opacity-20">{scoreValue}</span>
              ) : (
                <span className={hasQuestion ? 'text-glow relative z-10' : ''}>{scoreValue}</span>
              )}
                          </motion.button>
          );
        })}
      </div>
    </div>
  );
}
