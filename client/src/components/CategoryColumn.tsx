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
      <motion.div 
        className="bg-white text-black py-4 px-2 text-center rounded-t-xl min-h-[72px] flex items-center justify-center relative overflow-hidden"
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <div className="absolute inset-0 shimmer" />
        <h2 
          className="font-black text-sm lg:text-base leading-tight line-clamp-2 uppercase tracking-wider relative z-10" 
          data-testid={`text-category-${category.id}`}
        >
          {category.name}
        </h2>
      </motion.div>
      
      <div className="flex flex-col gap-2 mt-2 flex-1">
        {SCORE_VALUES.map((scoreValue, idx) => {
          const question = questionsByPoints[scoreValue];
          const hasQuestion = !!question;
          const isCompleted = question ? completedQuestions.includes(question.id) : false;

          if (isLoading) {
            return <Skeleton key={scoreValue} className="flex-1 min-h-[48px] rounded-lg bg-white/5" />;
          }

          return (
            <motion.button
              key={scoreValue}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              whileHover={hasQuestion && !isCompleted ? { 
                scale: 1.05, 
                y: -4,
                boxShadow: "0 10px 40px rgba(255,255,255,0.2)"
              } : undefined}
              whileTap={hasQuestion && !isCompleted ? { scale: 0.95 } : undefined}
              className={`
                flex-1 min-h-[48px] lg:min-h-[56px] flex items-center justify-center rounded-lg font-black text-xl lg:text-2xl transition-colors relative overflow-hidden
                ${!hasQuestion 
                  ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                  : isCompleted 
                    ? 'bg-white/5 text-white/10 cursor-not-allowed' 
                    : 'bg-white text-black cursor-pointer'
                }
              `}
              onClick={() => hasQuestion && !isCompleted && onSelectQuestion(question)}
              disabled={!hasQuestion || isCompleted}
              data-testid={`cell-${category.id}-${scoreValue}`}
            >
              {hasQuestion && !isCompleted && (
                <motion.div 
                  className="absolute inset-0 shimmer"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <span className="relative z-10">{scoreValue}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
