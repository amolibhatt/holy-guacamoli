import { useQuestions } from "@/hooks/use-quiz";
import { useScore } from "@/components/ScoreContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category, Question } from "@shared/schema";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { soundManager } from "@/lib/sounds";

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
        className="gradient-header text-white py-4 px-3 text-center rounded-t-xl min-h-[72px] flex items-center justify-center relative overflow-visible"
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <div className="absolute inset-0 shimmer rounded-t-xl overflow-hidden" />
        <motion.div
          className="absolute top-1 right-1"
          animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <Sparkles className="w-3 h-3 text-yellow-200/60" />
        </motion.div>
        <h2 
          className="font-black text-xs lg:text-sm leading-tight uppercase tracking-wide relative z-10 drop-shadow-lg break-words hyphens-auto" 
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
              } : undefined}
              whileTap={hasQuestion && !isCompleted ? { scale: 0.95 } : undefined}
              className={`
                flex-1 min-h-[48px] lg:min-h-[56px] flex items-center justify-center rounded-lg font-black text-xl lg:text-2xl transition-all
                ${!hasQuestion 
                  ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                  : isCompleted 
                    ? 'bg-white/5 text-white/10 cursor-not-allowed' 
                    : 'bg-white/10 text-white cursor-pointer hover:bg-white/20 border border-white/10'
                }
              `}
              onClick={() => {
                if (hasQuestion && !isCompleted) {
                  soundManager.play('click', 0.3);
                  onSelectQuestion(question);
                }
              }}
              disabled={!hasQuestion || isCompleted}
              data-testid={`cell-${category.id}-${scoreValue}`}
            >
              {scoreValue}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
