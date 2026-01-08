import { useState } from "react";
import { Question } from "@shared/schema";
import { useVerifyAnswer } from "@/hooks/use-quiz";
import { useScore } from "./ScoreContext";
import { CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface QuestionCardProps {
  question: Question;
  isLocked: boolean;
  onComplete?: () => void;
}

export function QuestionCard({ question, isLocked, onComplete }: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);

  const { addScore, markQuestionCompleted, completedQuestions } = useScore();
  const verifyMutation = useVerifyAnswer();
  const { toast } = useToast();

  const isCompleted = completedQuestions.includes(question.id);

  const handleOptionClick = async (option: string) => {
    if (isAnswered || isCompleted || isLocked) return;
    
    setSelectedOption(option);
    setIsAnswered(true);

    try {
      const result = await verifyMutation.mutateAsync({
        questionId: question.id,
        answer: option,
      });

      setIsCorrect(result.correct);
      setCorrectAnswer(result.correctAnswer);
      
      if (result.correct) {
        addScore(result.points);
        toast({
          title: "Correct!",
          description: `You earned ${result.points} points.`,
          variant: "default",
          className: "bg-green-500 text-white border-none",
        });
      } else {
        toast({
          title: "Incorrect",
          description: `The correct answer was ${result.correctAnswer}.`,
          variant: "destructive",
        });
      }
      
      markQuestionCompleted(question.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong validating your answer.",
        variant: "destructive",
      });
      setIsAnswered(false);
    }
  };

  const options = question.options as string[];

  if (isCompleted && !isAnswered) {
    return (
      <div className="bg-muted/30 border border-muted rounded-2xl p-6 opacity-60">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-bold text-muted-foreground">Completed</h3>
        </div>
        <p className="text-muted-foreground">{question.question}</p>
      </div>
    );
  }

  return (
    <div className="relative bg-card overflow-hidden">
      <div className="bg-primary/10 px-6 py-4 border-b flex items-center justify-between gap-4">
        <span className="text-primary font-bold text-lg">{question.points} Points</span>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-semibold text-foreground mb-6 leading-relaxed">
          {question.question}
        </h3>

        <div className="space-y-3">
          {options.map((option, idx) => {
            let optionStateClass = "bg-secondary/5 hover:bg-secondary/10 border-transparent text-foreground";
            
            if (isAnswered) {
              if (option === correctAnswer) {
                optionStateClass = "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-900 dark:text-green-100 font-medium";
              } else if (option === selectedOption && !isCorrect) {
                optionStateClass = "bg-red-100 dark:bg-red-900/30 border-red-500 text-red-900 dark:text-red-100";
              } else {
                optionStateClass = "opacity-50 grayscale";
              }
            } else if (selectedOption === option) {
              optionStateClass = "bg-primary/10 border-primary text-primary font-medium";
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(option)}
                disabled={isAnswered || isLocked}
                data-testid={`button-option-${idx}`}
                className={`
                  w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200 flex items-center justify-between
                  ${optionStateClass}
                `}
              >
                <span>{option}</span>
                {isAnswered && option === correctAnswer && (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
                {isAnswered && option === selectedOption && !isCorrect && (
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className={`px-6 py-4 ${isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} border-t ${isCorrect ? 'border-green-100 dark:border-green-800' : 'border-red-100 dark:border-red-800'}`}
          >
            <div className="flex items-center justify-between gap-4">
              <p className={`text-sm font-medium ${isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                {isCorrect ? "Brilliant! You got it right." : "Oops! Better luck next time."}
              </p>
              {onComplete && (
                <Button variant="outline" size="sm" onClick={onComplete} data-testid="button-continue">
                  Continue
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
