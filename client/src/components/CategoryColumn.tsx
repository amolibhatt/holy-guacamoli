import { useState } from "react";
import { useQuestionsByBoardCategory } from "@/hooks/use-quiz";
import { useScore } from "@/components/ScoreContext";
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
  boardCategoryId: number;
  onSelect: (question: Question) => void;
  delay: number;
}


function FlipCard({ scoreValue, question, isCompleted, boardCategoryId, onSelect, delay }: FlipCardProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hasQuestion = !!question;

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
      className="flex-1 min-h-[52px] lg:min-h-[64px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.button
        whileHover={hasQuestion && !isCompleted ? { 
          scale: 1.08, 
          y: -6,
          rotateX: 5,
          rotateY: 8,
        } : undefined}
        whileTap={hasQuestion && !isCompleted ? { scale: 0.92 } : undefined}
        className={`
          w-full h-full flex items-center justify-center rounded-xl font-black text-2xl lg:text-3xl transition-all relative overflow-hidden
          ${!hasQuestion 
            ? 'bg-primary/5 text-primary/20 cursor-not-allowed border border-primary/10' 
            : isCompleted 
              ? 'completed-cell text-primary/50 cursor-not-allowed border border-primary/20' 
              : 'bg-gradient-to-br from-gray-900 to-black text-primary cursor-pointer border-2 border-primary/50 shadow-lg shadow-primary/30 hover:shadow-xl hover:border-primary/70'
          }
        `}
        onClick={handleClick}
        disabled={!hasQuestion || isCompleted}
        data-testid={`cell-${boardCategoryId}-${scoreValue}`}
        style={{ backfaceVisibility: "hidden" }}
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
  const { data: questions, isLoading } = useQuestionsByBoardCategory(boardCategory.id);
  const { completedQuestions } = useScore();
  
  const scoreValues = pointValues || DEFAULT_SCORE_VALUES;
  
  const questionsByPoints = (questions || []).reduce((acc, q) => {
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
        className={`text-white py-4 px-3 text-center rounded-t-2xl min-h-[80px] flex items-center justify-center relative overflow-visible transition-all ${
          allCompleted 
            ? 'gradient-gold' 
            : 'gradient-header'
        }`}
      >
        {allCompleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 left-2"
          >
            <Check className="w-5 h-5 text-white drop-shadow" aria-label="Category completed" />
          </motion.div>
        )}
        <h2 
          className="font-black text-sm lg:text-base leading-tight uppercase tracking-wide relative z-10 drop-shadow-lg break-words hyphens-auto" 
          data-testid={`text-category-${boardCategory.id}`}
        >
          {boardCategory.category.name}
        </h2>
        {allCompleted && (
          <span className="sr-only">Completed</span>
        )}
      </div>
      
      <div className="flex flex-col gap-2 mt-2 flex-1">
        {scoreValues.map((scoreValue, idx) => {
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
              boardCategoryId={boardCategory.id}
              onSelect={onSelectQuestion}
              delay={idx * 0.03}
            />
          );
        })}
      </div>
    </div>
  );
}
