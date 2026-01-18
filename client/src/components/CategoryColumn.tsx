import { useState } from "react";
import { useQuestionsByCategory } from "@/hooks/use-quiz";
import { useScore } from "@/components/ScoreContext";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Skeleton } from "@/components/ui/skeleton";
import type { BoardCategoryWithCategory, Question } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { soundManager } from "@/lib/sounds";
import { particles } from "@/lib/particles";

const DEFAULT_SCORE_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

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
  const [isHovered, setIsHovered] = useState(false);
  const hasQuestion = !!question;
  const prefersReducedMotion = useReducedMotion();

  const handleClick = (e: React.MouseEvent) => {
    if (hasQuestion && !isCompleted && !isFlipping) {
      setIsFlipping(true);
      soundManager.play('whoosh', 0.4);
      particles.burst(e.clientX, e.clientY);
      
      setTimeout(() => {
        soundManager.play('pop', 0.3);
        onSelect(question);
        setIsFlipping(false);
      }, 400);
    }
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, rotateY: -90 }}
      animate={prefersReducedMotion 
        ? { opacity: 1 }
        : { opacity: 1, scale: 1, rotateY: isFlipping ? 180 : 0 }
      }
      transition={prefersReducedMotion 
        ? { duration: 0.1 }
        : { delay, rotateY: { duration: 0.4, ease: "easeInOut" } }
      }
      style={prefersReducedMotion ? undefined : { perspective: 1000, transformStyle: "preserve-3d" }}
      className="flex-1 min-h-[44px] sm:min-h-[52px] lg:min-h-[64px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.button
        whileHover={hasQuestion && !isCompleted && !prefersReducedMotion ? { 
          scale: 1.03
        } : undefined}
        whileTap={hasQuestion && !isCompleted && !prefersReducedMotion ? { scale: 0.97 } : undefined}
        className={`
          w-full h-full flex items-center justify-center rounded-xl font-black text-xl sm:text-2xl lg:text-3xl transition-all relative overflow-hidden
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
          ${!hasQuestion 
            ? 'bg-muted text-muted-foreground/30 cursor-not-allowed border border-border' 
            : isCompleted 
              ? 'completed-cell text-primary/50 cursor-not-allowed border border-primary/20' 
              : 'bg-card text-primary cursor-pointer border-2 border-primary/50 shadow-lg shadow-primary/20 hover:shadow-xl hover:border-primary/70'
          }
        `}
        onClick={handleClick}
        disabled={!hasQuestion || isCompleted}
        data-testid={`cell-${categoryId}-${scoreValue}`}
        style={{ backfaceVisibility: "hidden" }}
        aria-label={isCompleted ? `${scoreValue} points - completed` : hasQuestion ? `${scoreValue} points - click to reveal question` : `${scoreValue} points - no question`}
      >
        {hasQuestion && !isCompleted && isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-primary/10 pointer-events-none"
          />
        )}

        <AnimatePresence mode="wait">
          {isCompleted ? (
            <motion.div
              key="completed"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex items-center gap-1 text-primary"
            >
              <Check className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.span
              key="value"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="drop-shadow-lg relative z-10"
            >
              {scoreValue}
            </motion.span>
          )}
        </AnimatePresence>
        
      </motion.button>
    </motion.div>
  );
}

interface CategoryColumnProps {
  boardCategory: BoardCategoryWithCategory;
  onSelectQuestion: (question: Question) => void;
  pointValues?: number[];
}

export function CategoryColumn({ boardCategory, onSelectQuestion, pointValues }: CategoryColumnProps) {
  const { data: questions, isLoading } = useQuestionsByCategory(boardCategory.categoryId);
  const { completedQuestions } = useScore();
  
  const scoreValues = pointValues || DEFAULT_SCORE_VALUES;
  
  const questionsByPoints = (questions || []).reduce((acc: Record<number, Question>, q: Question) => {
    acc[q.points] = q;
    return acc;
  }, {} as Record<number, Question>);

  const completedCount = scoreValues.filter(sv => {
    const q = questionsByPoints[sv];
    return q && completedQuestions.includes(q.id);
  }).length;
  
  const totalQuestions = scoreValues.filter(sv => questionsByPoints[sv]).length;
  const allCompleted = totalQuestions > 0 && completedCount === totalQuestions;

  return (
    <div className="flex flex-col h-full">
      <div 
        className={`text-white px-2 sm:px-3 text-center rounded-t-xl sm:rounded-t-2xl h-[70px] sm:h-[90px] lg:h-[100px] flex items-center justify-center relative overflow-hidden transition-all ${
          allCompleted 
            ? 'gradient-gold' 
            : 'gradient-header'
        }`}
        role="heading"
        aria-level={2}
      >
        {allCompleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 left-1 sm:top-2 sm:left-2"
          >
            <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow" aria-label="Category completed" />
          </motion.div>
        )}
        <div className="flex flex-col items-center justify-center gap-0.5">
          <h2 
            className="font-black text-xs sm:text-sm lg:text-base leading-tight uppercase tracking-wide relative z-10 drop-shadow-lg line-clamp-2" 
            data-testid={`text-category-${boardCategory.id}`}
            title={boardCategory.category.name}
          >
            {boardCategory.category.name}
          </h2>
          {boardCategory.category.rule && (
            <p className="text-[9px] sm:text-[10px] lg:text-xs px-1 opacity-90 font-semibold drop-shadow italic">
              {boardCategory.category.rule}
            </p>
          )}
        </div>
        {allCompleted && (
          <span className="sr-only">Completed</span>
        )}
      </div>
      
      <div className="flex flex-col gap-2 mt-2 flex-1">
        {scoreValues.map((scoreValue, idx) => {
          const question = questionsByPoints[scoreValue];
          const isCompleted = question ? completedQuestions.includes(question.id) : false;

          if (isLoading) {
            return <Skeleton key={scoreValue} className="flex-1 min-h-[48px] rounded-lg bg-muted" />;
          }

          return (
            <FlipCard
              key={scoreValue}
              scoreValue={scoreValue}
              question={question}
              isCompleted={isCompleted}
              categoryId={boardCategory.categoryId}
              onSelect={onSelectQuestion}
              delay={idx * 0.03}
            />
          );
        })}
      </div>
    </div>
  );
}
