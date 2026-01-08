import { useState } from "react";
import { useQuestions } from "@/hooks/use-quiz";
import { useScore } from "@/components/ScoreContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category, Question } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import { soundManager } from "@/lib/sounds";
import { particles } from "@/lib/particles";

const SCORE_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

interface FlipCardProps {
  scoreValue: number;
  question: Question | undefined;
  isCompleted: boolean;
  categoryId: number;
  onSelect: (question: Question) => void;
  delay: number;
}

function FlipCard({ scoreValue, question, isCompleted, categoryId, onSelect, delay }: FlipCardProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const hasQuestion = !!question;

  const handleClick = (e: React.MouseEvent) => {
    if (hasQuestion && !isCompleted && !isFlipping) {
      setIsFlipping(true);
      soundManager.play('click', 0.3);
      particles.sparkle(e.clientX, e.clientY);
      
      setTimeout(() => {
        onSelect(question);
        setIsFlipping(false);
      }, 400);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        rotateY: isFlipping ? 180 : 0 
      }}
      transition={{ 
        delay,
        rotateY: { duration: 0.4, ease: "easeInOut" }
      }}
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
      className="flex-1 min-h-[48px] lg:min-h-[56px]"
    >
      <motion.button
        whileHover={hasQuestion && !isCompleted ? { 
          scale: 1.05, 
          y: -4,
          rotateY: 10,
        } : undefined}
        whileTap={hasQuestion && !isCompleted ? { scale: 0.95 } : undefined}
        className={`
          w-full h-full flex items-center justify-center rounded-lg font-black text-xl lg:text-2xl transition-all relative
          ${!hasQuestion 
            ? 'bg-white/5 text-white/20 cursor-not-allowed' 
            : isCompleted 
              ? 'bg-white/5 text-white/10 cursor-not-allowed' 
              : 'bg-white/10 text-white cursor-pointer hover:bg-white/20 border border-white/10'
          }
        `}
        onClick={handleClick}
        disabled={!hasQuestion || isCompleted}
        data-testid={`cell-${categoryId}-${scoreValue}`}
        style={{ backfaceVisibility: "hidden" }}
      >
        <AnimatePresence mode="wait">
          {isCompleted ? (
            <motion.div
              key="completed"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1"
            >
              <Check className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.span
              key="value"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {scoreValue}
            </motion.span>
          )}
        </AnimatePresence>
        
        {hasQuestion && !isCompleted && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            animate={{ 
              boxShadow: [
                "0 0 0 0 rgba(255,255,255,0)",
                "0 0 20px 2px rgba(255,255,255,0.1)",
                "0 0 0 0 rgba(255,255,255,0)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>
    </motion.div>
  );
}

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

  const completedCount = SCORE_VALUES.filter(sv => {
    const q = questionsByPoints[sv];
    return q && completedQuestions.includes(q.id);
  }).length;
  
  const totalQuestions = SCORE_VALUES.filter(sv => questionsByPoints[sv]).length;
  const allCompleted = totalQuestions > 0 && completedCount === totalQuestions;

  return (
    <div className="flex flex-col h-full">
      <motion.div 
        className={`text-white py-4 px-3 text-center rounded-t-xl min-h-[72px] flex items-center justify-center relative overflow-visible ${
          allCompleted ? 'bg-green-600' : 'gradient-header'
        }`}
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
        {allCompleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 left-1"
          >
            <Check className="w-4 h-4 text-white" />
          </motion.div>
        )}
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
          const isCompleted = question ? completedQuestions.includes(question.id) : false;

          if (isLoading) {
            return <Skeleton key={scoreValue} className="flex-1 min-h-[48px] rounded-lg bg-white/5" />;
          }

          return (
            <FlipCard
              key={scoreValue}
              scoreValue={scoreValue}
              question={question}
              isCompleted={isCompleted}
              categoryId={category.id}
              onSelect={onSelectQuestion}
              delay={idx * 0.03}
            />
          );
        })}
      </div>
    </div>
  );
}
