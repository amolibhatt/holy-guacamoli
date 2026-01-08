import { createContext, useContext, useState, ReactNode } from "react";

interface ScoreContextType {
  score: number;
  addScore: (points: number) => void;
  resetScore: () => void;
  completedQuestions: number[];
  markQuestionCompleted: (questionId: number) => void;
}

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

export function ScoreProvider({ children }: { children: ReactNode }) {
  const [score, setScore] = useState(0);
  const [completedQuestions, setCompletedQuestions] = useState<number[]>([]);

  const addScore = (points: number) => {
    setScore((prev) => prev + points);
  };

  const markQuestionCompleted = (questionId: number) => {
    setCompletedQuestions((prev) => [...prev, questionId]);
  };

  const resetScore = () => {
    setScore(0);
    setCompletedQuestions([]);
  };

  return (
    <ScoreContext.Provider value={{ score, addScore, resetScore, completedQuestions, markQuestionCompleted }}>
      {children}
    </ScoreContext.Provider>
  );
}

export function useScore() {
  const context = useContext(ScoreContext);
  if (context === undefined) {
    throw new Error("useScore must be used within a ScoreProvider");
  }
  return context;
}
