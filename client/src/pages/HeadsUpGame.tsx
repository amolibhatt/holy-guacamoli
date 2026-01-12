import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Play, Pause, RotateCcw, Check, X, ChevronLeft, ChevronRight, Timer } from "lucide-react";
import { Link, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import type { Game, HeadsUpDeck, HeadsUpCard } from "@shared/schema";

type GameState = "idle" | "playing" | "paused" | "finished";

export default function HeadsUpGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { colorMode, toggleColorMode } = useTheme();
  
  const [selectedDeckIndex, setSelectedDeckIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState({ correct: 0, skipped: 0 });
  const [shuffledCards, setShuffledCards] = useState<HeadsUpCard[]>([]);

  const { data: game } = useQuery<Game>({
    queryKey: ['/api/games', gameId],
    enabled: !!gameId && isAuthenticated,
  });

  const { data: gameDecks = [] } = useQuery<{ id: number; gameId: number; deckId: number; position: number; deck: HeadsUpDeck }[]>({
    queryKey: ['/api/games', gameId, 'decks'],
    enabled: !!gameId && isAuthenticated,
  });

  const currentDeck = gameDecks[selectedDeckIndex]?.deck;

  const { data: cards = [] } = useQuery<HeadsUpCard[]>({
    queryKey: ['/api/heads-up-decks', currentDeck?.id, 'cards'],
    enabled: !!currentDeck?.id,
  });

  const shuffleCards = useCallback(() => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
  }, [cards]);

  useEffect(() => {
    if (cards.length > 0) {
      shuffleCards();
    }
  }, [cards, shuffleCards]);

  useEffect(() => {
    if (currentDeck) {
      setTimeLeft(currentDeck.timerSeconds);
    }
  }, [currentDeck]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (gameState === "playing" && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState("finished");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, timeLeft]);

  const startGame = () => {
    shuffleCards();
    setCurrentCardIndex(0);
    setScore({ correct: 0, skipped: 0 });
    setTimeLeft(currentDeck?.timerSeconds || 60);
    setGameState("playing");
  };

  const pauseGame = () => {
    setGameState("paused");
  };

  const resumeGame = () => {
    setGameState("playing");
  };

  const resetGame = () => {
    setGameState("idle");
    setCurrentCardIndex(0);
    setScore({ correct: 0, skipped: 0 });
    setTimeLeft(currentDeck?.timerSeconds || 60);
  };

  const markCorrect = () => {
    setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    nextCard();
  };

  const markSkipped = () => {
    setScore(prev => ({ ...prev, skipped: prev.skipped + 1 }));
    nextCard();
  };

  const nextCard = () => {
    if (currentCardIndex < shuffledCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setGameState("finished");
    }
  };

  const currentCard = shuffledCards[currentCardIndex];

  if (!game || gameDecks.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h2 className="text-xl font-bold text-foreground mb-4">No decks in this game</h2>
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
      <AppHeader
        title="Heads Up"
        subtitle={game.name}
        backHref="/admin/games"
      />

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {gameState === "idle" && (
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide text-center">
                Select Deck
              </h2>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={selectedDeckIndex === 0}
                  onClick={() => setSelectedDeckIndex(prev => prev - 1)}
                  data-testid="button-prev-deck"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Card className="flex-1 p-6 text-center">
                  <h3 className="text-xl font-bold text-foreground">{currentDeck?.name}</h3>
                  <p className="text-muted-foreground">{cards.length} cards • {currentDeck?.timerSeconds}s</p>
                </Card>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={selectedDeckIndex === gameDecks.length - 1}
                  onClick={() => setSelectedDeckIndex(prev => prev + 1)}
                  data-testid="button-next-deck"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full gap-2"
              onClick={startGame}
              disabled={cards.length === 0}
              data-testid="button-start-game"
            >
              <Play className="w-5 h-5" />
              Start Game
            </Button>
          </div>
        )}

        {(gameState === "playing" || gameState === "paused") && currentCard && (
          <div className="w-full max-w-md space-y-6">
            <div className="flex items-center justify-between px-4">
              <div className="text-sm text-muted-foreground">
                Card {currentCardIndex + 1} / {shuffledCards.length}
              </div>
              <div className={`flex items-center gap-2 text-2xl font-bold ${timeLeft <= 10 ? 'text-destructive' : 'text-foreground'}`}>
                <Timer className="w-6 h-6" />
                {timeLeft}s
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard.id}
                initial={{ opacity: 0, y: 50, rotateX: -15 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: -50, rotateX: 15 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-8 min-h-[200px] flex items-center justify-center bg-primary/10 border-2 border-primary">
                  <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground">
                    {gameState === "paused" ? "PAUSED" : currentCard.prompt}
                  </h2>
                </Card>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-center gap-4">
              {gameState === "playing" ? (
                <>
                  <Button
                    size="lg"
                    variant="destructive"
                    className="flex-1 h-16 text-lg gap-2"
                    onClick={markSkipped}
                    data-testid="button-skip"
                  >
                    <X className="w-6 h-6" />
                    Skip
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-16 w-16"
                    onClick={pauseGame}
                    data-testid="button-pause"
                  >
                    <Pause className="w-6 h-6" />
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 h-16 text-lg gap-2 bg-primary hover:bg-primary/90"
                    onClick={markCorrect}
                    data-testid="button-correct"
                  >
                    <Check className="w-6 h-6" />
                    Correct
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 h-16 text-lg gap-2"
                    onClick={resetGame}
                    data-testid="button-reset"
                  >
                    <RotateCcw className="w-6 h-6" />
                    Reset
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 h-16 text-lg gap-2"
                    onClick={resumeGame}
                    data-testid="button-resume"
                  >
                    <Play className="w-6 h-6" />
                    Resume
                  </Button>
                </>
              )}
            </div>

            <div className="flex justify-center gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">{score.correct}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-destructive">{score.skipped}</div>
                <div className="text-sm text-muted-foreground">Skipped</div>
              </div>
            </div>
          </div>
        )}

        {gameState === "finished" && (
          <div className="w-full max-w-md space-y-6 text-center">
            <h2 className="text-2xl font-bold text-foreground">Round Complete!</h2>
            
            <Card className="p-8">
              <div className="space-y-4">
                <div className="flex justify-center gap-12">
                  <div>
                    <div className="text-5xl font-bold text-primary">{score.correct}</div>
                    <div className="text-sm text-muted-foreground">Correct</div>
                  </div>
                  <div>
                    <div className="text-5xl font-bold text-destructive">{score.skipped}</div>
                    <div className="text-sm text-muted-foreground">Skipped</div>
                  </div>
                </div>
                <p className="text-lg text-muted-foreground">
                  You got {score.correct} out of {score.correct + score.skipped} cards!
                </p>
              </div>
            </Card>

            <div className="flex gap-4">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 gap-2"
                onClick={resetGame}
                data-testid="button-new-round"
              >
                <RotateCcw className="w-5 h-5" />
                New Round
              </Button>
              <Link href="/admin/games" className="flex-1">
                <Button size="lg" variant="default" className="w-full gap-2" data-testid="button-back-to-games">
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
