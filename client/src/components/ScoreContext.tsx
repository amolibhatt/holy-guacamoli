import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { particles } from "@/lib/particles";

const AVATAR_COLORS = [
  '#FF6B6B', '#FF8E53', '#FFD93D', '#60A5FA', '#3B82F6', 
  '#8B5CF6', '#EC4899', '#F472B6', '#F97316', '#6366F1'
];

export interface Contestant {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  color: string;
  previousRank?: number;
}

interface ScoreChange {
  contestantId: string;
  points: number;
  type: 'award' | 'deduct';
  previousScore: number;
  timestamp: number;
}

interface ScoreContextType {
  contestants: Contestant[];
  addContestant: (name: string) => void;
  addContestantWithId: (id: string, name: string, score?: number, avatar?: string) => void;
  removeContestant: (id: string) => void;
  awardPoints: (contestantId: string, points: number) => void;
  deductPoints: (contestantId: string, points: number) => void;
  completedQuestions: number[];
  markQuestionCompleted: (questionId: number) => void;
  resetGame: () => void;
  updateContestantColor: (id: string, color: string) => void;
  gameEnded: boolean;
  endGame: () => void;
  resetGameEnd: () => void;
  syncContestantScore: (id: string, score: number) => void;
  setCompletedQuestionsFromServer: (questionIds: number[]) => void;
  initializeFromSession: (players: { id: string; name: string; score: number }[], completedQuestionIds: number[]) => void;
  undoLastScoreChange: () => ScoreChange | null;
  lastScoreChange: ScoreChange | null;
}

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

export function ScoreProvider({ children }: { children: ReactNode }) {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [completedQuestions, setCompletedQuestions] = useState<number[]>([]);
  const [gameEnded, setGameEnded] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<ScoreChange[]>([]);

  const addContestant = (name: string) => {
    const id = crypto.randomUUID();
    const colorIndex = contestants.length % AVATAR_COLORS.length;
    setContestants((prev) => [...prev, { 
      id, 
      name, 
      score: 0, 
      color: AVATAR_COLORS[colorIndex] 
    }]);
  };

  const addContestantWithId = (id: string, name: string, score: number = 0, avatar?: string) => {
    setContestants((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (existing) {
        if (existing.score !== score || (avatar && existing.avatar !== avatar)) {
          return prev.map((c) => (c.id === id ? { ...c, score, avatar: avatar || c.avatar } : c));
        }
        return prev;
      }
      const colorIndex = prev.length % AVATAR_COLORS.length;
      return [...prev, { id, name, avatar, score, color: AVATAR_COLORS[colorIndex] }];
    });
  };

  const removeContestant = (id: string) => {
    setContestants((prev) => prev.filter((c) => c.id !== id));
  };

  const awardPoints = (contestantId: string, points: number) => {
    setContestants((prev) => {
      const contestant = prev.find(c => c.id === contestantId);
      if (contestant) {
        setScoreHistory(history => [...history.slice(-19), { 
          contestantId, 
          points, 
          type: 'award', 
          previousScore: contestant.score,
          timestamp: Date.now() 
        }]);
      }
      
      const oldSorted = [...prev].sort((a, b) => b.score - a.score);
      const oldRanks = new Map(oldSorted.map((c, idx) => [c.id, idx]));
      
      const updated = prev.map((c) => {
        if (c.id === contestantId) {
          const newScore = c.score + points;
          setTimeout(() => particles.milestone(newScore), 100);
          return { ...c, score: newScore };
        }
        return c;
      });
      
      return updated.map(c => ({
        ...c,
        previousRank: oldRanks.get(c.id) ?? 0
      }));
    });
  };

  const deductPoints = (contestantId: string, points: number) => {
    setContestants((prev) => {
      const contestant = prev.find(c => c.id === contestantId);
      if (contestant) {
        setScoreHistory(history => [...history.slice(-19), { 
          contestantId, 
          points, 
          type: 'deduct', 
          previousScore: contestant.score,
          timestamp: Date.now() 
        }]);
      }
      
      const oldSorted = [...prev].sort((a, b) => b.score - a.score);
      const oldRanks = new Map(oldSorted.map((c, idx) => [c.id, idx]));
      
      const updated = prev.map((c) =>
        c.id === contestantId ? { ...c, score: c.score - points } : c
      );
      
      return updated.map(c => ({
        ...c,
        previousRank: oldRanks.get(c.id) ?? 0
      }));
    });
  };

  const undoLastScoreChange = (): ScoreChange | null => {
    if (scoreHistory.length === 0) return null;
    
    const lastChange = scoreHistory[scoreHistory.length - 1];
    setScoreHistory(prev => prev.slice(0, -1));
    
    // Restore to exact previous score (safer than arithmetic reversal)
    setContestants(prev => {
      const oldSorted = [...prev].sort((a, b) => b.score - a.score);
      const oldRanks = new Map(oldSorted.map((c, idx) => [c.id, idx]));
      
      return prev.map(c => ({
        ...c,
        score: c.id === lastChange.contestantId ? lastChange.previousScore : c.score,
        previousRank: oldRanks.get(c.id) ?? 0
      }));
    });
    
    return lastChange;
  };

  const lastScoreChange = scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1] : null;

  const updateContestantColor = (id: string, color: string) => {
    setContestants((prev) =>
      prev.map((c) => (c.id === id ? { ...c, color } : c))
    );
  };

  const markQuestionCompleted = (questionId: number) => {
    setCompletedQuestions((prev) => 
      prev.includes(questionId) ? prev : [...prev, questionId]
    );
  };

  const resetGame = () => {
    setContestants((prev) => prev.map((c) => ({ ...c, score: 0, previousRank: undefined })));
    setCompletedQuestions([]);
    setGameEnded(false);
    setScoreHistory([]);
  };

  const endGame = () => setGameEnded(true);
  const resetGameEnd = () => setGameEnded(false);

  const syncContestantScore = (id: string, score: number) => {
    setScoreHistory([]);
    setContestants((prev) =>
      prev.map((c) => (c.id === id ? { ...c, score } : c))
    );
  };

  const setCompletedQuestionsFromServer = (questionIds: number[]) => {
    setCompletedQuestions(questionIds);
  };

  const initializeFromSession = (
    players: { id: string; name: string; score: number }[],
    completedQuestionIds: number[]
  ) => {
    setScoreHistory([]);
    setContestants(
      players.map((p, idx) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      }))
    );
    setCompletedQuestions(completedQuestionIds);
  };

  return (
    <ScoreContext.Provider
      value={{
        contestants,
        addContestant,
        addContestantWithId,
        removeContestant,
        awardPoints,
        deductPoints,
        completedQuestions,
        markQuestionCompleted,
        resetGame,
        updateContestantColor,
        gameEnded,
        endGame,
        resetGameEnd,
        syncContestantScore,
        setCompletedQuestionsFromServer,
        initializeFromSession,
        undoLastScoreChange,
        lastScoreChange,
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

export { AVATAR_COLORS };
