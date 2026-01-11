import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Sun, Moon, Users, Volume2 } from "lucide-react";
import { Link, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/context/ThemeContext";
import { useScore, Contestant } from "@/components/ScoreContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PLAYER_AVATARS, type Game, type Board, type BoardCategoryWithCount, type Question } from "@shared/schema";

export default function GridOfGrudges() {
  const { gameId } = useParams<{ gameId: string }>();
  const { isAuthenticated } = useAuth();
  const { colorMode, toggleColorMode } = useTheme();
  const { contestants, awardPoints, deductPoints, completedQuestions, markQuestionCompleted } = useScore();
  
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [buzzerWinner, setBuzzerWinner] = useState<string | null>(null);

  const { data: game } = useQuery<Game>({
    queryKey: ['/api/games', gameId],
    enabled: !!gameId && isAuthenticated,
  });

  const { data: gameBoards = [] } = useQuery<{ id: number; gameId: number; boardId: number; position: number; board: Board }[]>({
    queryKey: ['/api/games', gameId, 'boards'],
    enabled: !!gameId && isAuthenticated,
  });

  const selectedBoard = gameBoards[0]?.board;

  const { data: boardCategories = [] } = useQuery<BoardCategoryWithCount[]>({
    queryKey: ['/api/boards', selectedBoard?.id, 'categories'],
    enabled: !!selectedBoard?.id,
  });

  const { data: allQuestions = [] } = useQuery<Question[]>({
    queryKey: ['/api/boards', selectedBoard?.id, 'all-questions'],
    queryFn: async () => {
      const questions: Question[] = [];
      for (const bc of boardCategories) {
        const res = await fetch(`/api/board-categories/${bc.id}/questions`);
        if (res.ok) {
          const data = await res.json();
          questions.push(...data);
        }
      }
      return questions;
    },
    enabled: boardCategories.length > 0,
  });

  const pointValues = selectedBoard?.pointValues || [100, 200, 300, 400, 500];

  const getQuestion = (boardCategoryId: number, points: number) => {
    return allQuestions.find(q => q.boardCategoryId === boardCategoryId && q.points === points);
  };

  const isQuestionCompleted = (questionId: number) => {
    return completedQuestions.includes(questionId);
  };

  const handleCellClick = (boardCategoryId: number, points: number) => {
    const question = getQuestion(boardCategoryId, points);
    if (question && !isQuestionCompleted(question.id)) {
      setSelectedQuestion(question);
      setShowAnswer(false);
      setBuzzerWinner(null);
    }
  };

  const handleAwardPoints = (contestantId: string) => {
    if (selectedQuestion) {
      awardPoints(contestantId, selectedQuestion.points);
      markQuestionCompleted(selectedQuestion.id);
      setSelectedQuestion(null);
    }
  };

  const handleDeductPoints = (contestantId: string) => {
    if (selectedQuestion) {
      deductPoints(contestantId, selectedQuestion.points);
    }
  };

  const handleNoAnswer = () => {
    if (selectedQuestion) {
      markQuestionCompleted(selectedQuestion.id);
      setSelectedQuestion(null);
    }
  };

  if (!game || !selectedBoard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h2 className="text-xl font-bold text-foreground mb-4">No board configured for this game</h2>
        <Link href="/admin/games">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Games
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/admin/games">
            <Button variant="ghost" size="icon" data-testid="button-back" aria-label="Back to games">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-foreground">{game.name}</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground" aria-label={`${contestants.length} contestants`}>
              <Users className="w-4 h-4" />
              {contestants.length}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleColorMode}
              data-testid="button-color-mode"
              aria-label={colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {colorMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-7xl mx-auto w-full">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${boardCategories.length}, minmax(0, 1fr))` }}>
          {boardCategories.map(bc => (
            <div key={bc.id} className="text-center p-3 bg-primary/20 rounded-t-lg border border-primary/30">
              <h3 className="font-bold text-foreground text-sm md:text-base truncate">{bc.category.name}</h3>
            </div>
          ))}

          {pointValues.map(points => (
            boardCategories.map(bc => {
              const question = getQuestion(bc.id, points);
              const completed = question ? isQuestionCompleted(question.id) : false;
              const hasQuestion = !!question;

              return (
                <motion.button
                  key={`${bc.id}-${points}`}
                  className={`aspect-square flex items-center justify-center text-xl md:text-2xl font-bold rounded-lg border transition-all ${
                    completed
                      ? 'bg-muted/30 border-muted text-muted-foreground cursor-default'
                      : hasQuestion
                      ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 cursor-pointer'
                      : 'bg-muted/10 border-muted/30 text-muted-foreground/50 cursor-not-allowed'
                  }`}
                  onClick={() => handleCellClick(bc.id, points)}
                  disabled={completed || !hasQuestion}
                  whileHover={hasQuestion && !completed ? { scale: 1.02 } : {}}
                  whileTap={hasQuestion && !completed ? { scale: 0.98 } : {}}
                  data-testid={`cell-${bc.id}-${points}`}
                >
                  {completed ? '' : points}
                </motion.button>
              );
            })
          ))}
        </div>

        {contestants.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-4 justify-center">
            {contestants.map((c: Contestant) => (
              <Card key={c.id} className="p-4 min-w-[120px] text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-xl">{PLAYER_AVATARS.find(a => a.id === c.avatar)?.emoji || PLAYER_AVATARS[0].emoji}</span>
                  <p className="font-medium text-foreground">{c.name}</p>
                </div>
                <p className="text-2xl font-bold text-primary">{c.score}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedQuestion} onOpenChange={() => setSelectedQuestion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedQuestion?.points} Points</span>
              {buzzerWinner && (
                <span className="text-primary">Buzzed: {buzzerWinner}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="p-6 bg-muted/20 rounded-lg min-h-[150px] prose dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {selectedQuestion?.question || ''}
              </ReactMarkdown>
            </div>

            {!showAnswer ? (
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setShowAnswer(true)}
                data-testid="button-show-answer"
              >
                Show Answer
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                  <p className="text-sm text-muted-foreground mb-1">Answer:</p>
                  <p className="text-xl font-bold text-foreground">{selectedQuestion?.correctAnswer}</p>
                </div>

                {contestants.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Award points to:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {contestants.map((c: Contestant) => (
                        <div key={c.id} className="flex gap-1">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleAwardPoints(c.id)}
                            data-testid={`button-award-${c.id}`}
                          >
                            +{selectedQuestion?.points} {PLAYER_AVATARS.find(a => a.id === c.avatar)?.emoji || PLAYER_AVATARS[0].emoji} {c.name}
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeductPoints(c.id)}
                            data-testid={`button-deduct-${c.id}`}
                          >
                            -{selectedQuestion?.points}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handleNoAnswer}
                      data-testid="button-no-answer"
                    >
                      No Correct Answer
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={handleNoAnswer}
                    data-testid="button-close-question"
                  >
                    Close
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
