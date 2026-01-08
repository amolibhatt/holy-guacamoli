import { createContext, useContext, useState, ReactNode } from "react";

export interface Contestant {
  id: string;
  name: string;
  score: number;
}

interface ScoreContextType {
  contestants: Contestant[];
  addContestant: (name: string) => void;
  removeContestant: (id: string) => void;
  awardPoints: (contestantId: string, points: number) => void;
  deductPoints: (contestantId: string, points: number) => void;
  completedQuestions: number[];
  markQuestionCompleted: (questionId: number) => void;
  resetGame: () => void;
}

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

export function ScoreProvider({ children }: { children: ReactNode }) {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [completedQuestions, setCompletedQuestions] = useState<number[]>([]);

  const addContestant = (name: string) => {
    const id = crypto.randomUUID();
    setContestants((prev) => [...prev, { id, name, score: 0 }]);
  };

  const removeContestant = (id: string) => {
    setContestants((prev) => prev.filter((c) => c.id !== id));
  };

  const awardPoints = (contestantId: string, points: number) => {
    setContestants((prev) =>
      prev.map((c) =>
        c.id === contestantId ? { ...c, score: c.score + points } : c
      )
    );
  };

  const deductPoints = (contestantId: string, points: number) => {
    setContestants((prev) =>
      prev.map((c) =>
        c.id === contestantId ? { ...c, score: c.score - points } : c
      )
    );
  };

  const markQuestionCompleted = (questionId: number) => {
    setCompletedQuestions((prev) => [...prev, questionId]);
  };

  const resetGame = () => {
    setContestants((prev) => prev.map((c) => ({ ...c, score: 0 })));
    setCompletedQuestions([]);
  };

  return (
    <ScoreContext.Provider
      value={{
        contestants,
        addContestant,
        removeContestant,
        awardPoints,
        deductPoints,
        completedQuestions,
        markQuestionCompleted,
        resetGame,
      }}
    >
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
