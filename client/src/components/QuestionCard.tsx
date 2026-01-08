import { useState } from "react";
import { Question } from "@shared/schema";
import { useScore } from "./ScoreContext";
import { CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuestionCardProps {
  question: Question;
  isLocked: boolean;
  onComplete?: () => void;
}

export function QuestionCard({ question, isLocked, onComplete }: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const { contestants, awardPoints, deductPoints, markQuestionCompleted } = useScore();

  const options = question.options as string[];
  const correctAnswer = (question as any).correctAnswer || options[0];

  const handleAward = (contestantId: string) => {
    awardPoints(contestantId, question.points);
    markQuestionCompleted(question.id);
    onComplete?.();
  };

  const handleDeduct = (contestantId: string) => {
    deductPoints(contestantId, question.points);
  };

  const handleNoAnswer = () => {
    markQuestionCompleted(question.id);
    onComplete?.();
  };

  return (
    <div className="relative bg-card overflow-hidden">
      <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between gap-4">
        <span className="font-bold text-xl">{question.points} Points</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowAnswer(!showAnswer)}
          data-testid="button-toggle-answer"
        >
          {showAnswer ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {showAnswer ? "Hide Answer" : "Show Answer"}
        </Button>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-semibold text-foreground mb-6 leading-relaxed">
          {question.question}
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {options.map((option, idx) => (
            <div
              key={idx}
              className={`
                px-4 py-3 rounded-lg border-2 text-center
                ${showAnswer && option === correctAnswer
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-900 dark:text-green-100 font-bold'
                  : 'bg-secondary/5 border-transparent text-foreground'
                }
              `}
            >
              {option}
            </div>
          ))}
        </div>

        {showAnswer && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <p className="text-green-800 dark:text-green-200 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Correct Answer: {correctAnswer}
            </p>
          </div>
        )}

        {contestants.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground mb-2">Award or deduct points:</p>
            {contestants.map((contestant) => (
              <div
                key={contestant.id}
                className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">{contestant.name}</span>
                  <span className="text-sm text-muted-foreground">({contestant.score} pts)</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleAward(contestant.id)}
                    data-testid={`button-award-${contestant.id}`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    +{question.points}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeduct(contestant.id)}
                    data-testid={`button-deduct-${contestant.id}`}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    -{question.points}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            Add contestants from the scoreboard to award points
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t">
          <Button variant="outline" onClick={handleNoAnswer} data-testid="button-close-question">
            Close Question
          </Button>
        </div>
      </div>
    </div>
  );
}
