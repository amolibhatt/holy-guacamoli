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
    <div className="relative bg-slate-900 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between gap-4">
        <span className="font-bold text-2xl text-white">{question.points} Points</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowAnswer(!showAnswer)}
          className="bg-white/20 hover:bg-white/30 text-white border-0"
          data-testid="button-toggle-answer"
        >
          {showAnswer ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {showAnswer ? "Hide" : "Reveal"}
        </Button>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-medium text-white mb-6 leading-relaxed">
          {question.question}
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {options.map((option, idx) => (
            <div
              key={idx}
              className={`
                px-4 py-3 rounded-xl text-center font-medium transition-all
                ${showAnswer && option === correctAnswer
                  ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                  : 'bg-slate-800 border-2 border-slate-700 text-slate-300'
                }
              `}
            >
              {option}
            </div>
          ))}
        </div>

        {showAnswer && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
            <p className="text-green-400 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Answer: {correctAnswer}
            </p>
          </div>
        )}

        {contestants.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-400 mb-3">Award or deduct points:</p>
            {contestants.map((contestant) => (
              <div
                key={contestant.id}
                className="flex items-center justify-between gap-3 p-3 bg-slate-800/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-white">{contestant.name}</span>
                  <span className="text-sm text-slate-500">({contestant.score} pts)</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAward(contestant.id)}
                    className="bg-green-600 hover:bg-green-500 text-white"
                    data-testid={`button-award-${contestant.id}`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    +{question.points}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDeduct(contestant.id)}
                    className="bg-red-600 hover:bg-red-500 text-white"
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
          <div className="text-center py-4 text-slate-500">
            Add players from the scoreboard to award points
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t border-slate-700">
          <Button 
            variant="outline" 
            onClick={handleNoAnswer} 
            className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
            data-testid="button-close-question"
          >
            Close Question
          </Button>
        </div>
      </div>
    </div>
  );
}
