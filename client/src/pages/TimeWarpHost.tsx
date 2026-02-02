import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { 
  Loader2, Plus, Trash2, X, Clock, Users, GripVertical,
  Check, ChevronRight, RotateCcw, Image as ImageIcon, Play,
  ArrowUpDown, Trophy, Sparkles
} from "lucide-react";
import type { TimeWarpQuestion } from "@shared/schema";

type Player = {
  id: string;
  name: string;
  score: number;
};

type GameState = "setup" | "playing" | "finished";

const ERA_FILTERS = {
  past: "sepia brightness-90",
  present: "",
  future: "hue-rotate-180 saturate-150 brightness-110",
};

export default function TimeWarpHost() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState>("setup");
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [showImage, setShowImage] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [hasReversed, setHasReversed] = useState(false);
  const [showReverseAnimation, setShowReverseAnimation] = useState(false);
  const [questionOrder, setQuestionOrder] = useState<number[]>([]);

  const { data: questions = [], isLoading } = useQuery<TimeWarpQuestion[]>({
    queryKey: ["/api/timewarp/questions"],
  });

  useEffect(() => {
    if (questions.length > 0 && questionOrder.length === 0) {
      setQuestionOrder(questions.map(q => q.id));
    }
  }, [questions, questionOrder.length]);

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    if (players.some(p => p.name.toLowerCase() === newPlayerName.toLowerCase())) {
      toast({ title: "Player already exists", variant: "destructive" });
      return;
    }
    setPlayers([...players, { 
      id: crypto.randomUUID(), 
      name: newPlayerName.trim(), 
      score: 0 
    }]);
    setNewPlayerName("");
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const startGame = () => {
    if (players.length < 2) {
      toast({ title: "Need at least 2 players", variant: "destructive" });
      return;
    }
    if (questions.length === 0) {
      toast({ title: "No questions available", variant: "destructive" });
      return;
    }
    const shuffled = [...questions.map(q => q.id)].sort(() => Math.random() - 0.5);
    setQuestionOrder(shuffled);
    setGameState("playing");
    setCurrentPlayerIdx(0);
    setCurrentQuestionIdx(0);
    setShowImage(false);
    setShowAnswer(false);
    setHasReversed(false);
  };

  const currentQuestion = questions.find(q => q.id === questionOrder[currentQuestionIdx]);
  const currentPlayer = players[currentPlayerIdx];
  const midpoint = Math.floor(questionOrder.length / 2);

  const handleCorrect = () => {
    setPlayers(players.map(p => 
      p.id === currentPlayer.id ? { ...p, score: p.score + 10 } : p
    ));
    nextQuestion();
  };

  const handlePass = () => {
    const nextIdx = (currentPlayerIdx + 1) % players.length;
    setCurrentPlayerIdx(nextIdx);
  };

  const nextQuestion = () => {
    const nextQIdx = currentQuestionIdx + 1;
    
    if (nextQIdx === midpoint && !hasReversed && questionOrder.length >= 4) {
      setShowReverseAnimation(true);
      setTimeout(() => {
        setPlayers([...players].reverse());
        setHasReversed(true);
        setShowReverseAnimation(false);
        setCurrentQuestionIdx(nextQIdx);
        setCurrentPlayerIdx(0);
        setShowImage(false);
        setShowAnswer(false);
      }, 3000);
      return;
    }

    if (nextQIdx >= questionOrder.length) {
      setGameState("finished");
      return;
    }

    setCurrentQuestionIdx(nextQIdx);
    setCurrentPlayerIdx(0);
    setShowImage(false);
    setShowAnswer(false);
  };

  const resetGame = () => {
    setGameState("setup");
    setPlayers(players.map(p => ({ ...p, score: 0 })));
    setCurrentPlayerIdx(0);
    setCurrentQuestionIdx(0);
    setShowImage(false);
    setShowAnswer(false);
    setHasReversed(false);
    setQuestionOrder([]);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  // TIME WARP ANIMATION
  if (showReverseAnimation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ scale: 0, rotate: 0 }}
          animate={{ scale: [0, 1.2, 1], rotate: [0, 360, 720] }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
          className="text-center"
        >
          <Clock className="w-24 h-24 mx-auto mb-6 text-cyan-500" />
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-4xl md:text-6xl font-black text-cyan-500 uppercase tracking-widest"
          >
            TIME WARP
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-2xl md:text-3xl text-muted-foreground mt-4 font-bold"
          >
            ORDER REVERSED!
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.8 }}
            className="mt-6"
          >
            <ArrowUpDown className="w-16 h-16 mx-auto text-cyan-500 animate-bounce" />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // FINISHED STATE
  if (gameState === "finished") {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];

    return (
      <div className="min-h-screen bg-background flex flex-col" data-testid="page-timewarp-finished">
        <AppHeader minimal backHref="/" title="Time Warp - Game Over" />
        
        <main className="max-w-2xl mx-auto px-4 py-12 flex-1 w-full">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center mb-8"
          >
            <Trophy className="w-20 h-20 mx-auto text-cyan-500 mb-4" />
            <h1 className="text-3xl font-bold mb-2">Game Over!</h1>
            <p className="text-xl text-muted-foreground">
              {winner.name} wins with {winner.score} points!
            </p>
          </motion.div>

          <Card>
            <CardHeader>
              <CardTitle>Final Scores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sortedPlayers.map((player, idx) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    idx === 0 ? 'bg-cyan-500/20' : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-muted-foreground">#{idx + 1}</span>
                    <span className="font-semibold">{player.name}</span>
                  </div>
                  <Badge variant={idx === 0 ? "default" : "secondary"} className="text-lg px-3">
                    {player.score} pts
                  </Badge>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-4 mt-8 justify-center">
            <Button variant="outline" onClick={resetGame} data-testid="button-play-again">
              <RotateCcw className="w-4 h-4 mr-2" />
              Play Again
            </Button>
            <Link href="/">
              <Button data-testid="button-back-home">Back to Home</Button>
            </Link>
          </div>
        </main>
        
        <AppFooter />
      </div>
    );
  }

  // SETUP STATE
  if (gameState === "setup") {
    return (
      <div className="min-h-screen bg-background flex flex-col" data-testid="page-timewarp-setup">
        <AppHeader minimal backHref="/" title="Time Warp" />

        <main className="max-w-2xl mx-auto px-4 py-6 flex-1 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                  Start a Time Warp Game
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No questions available</p>
                    <Button onClick={() => setLocation("/admin/timewarp")} className="mt-4" data-testid="button-create-questions">
                      Create Questions
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-cyan-500" />
                        </div>
                        <div>
                          <div className="font-semibold">{questions.length} Questions Ready</div>
                          <div className="text-sm text-muted-foreground">
                            Questions will be shuffled at game start
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {questions.length >= 4 && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                        <Sparkles className="w-4 h-4 text-cyan-500" />
                        At question #{midpoint}, player order will reverse!
                      </div>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation("/admin/timewarp")}
                    >
                      Manage Questions
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Players ({players.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                    placeholder="Enter player name"
                    data-testid="input-player-name"
                  />
                  <Button onClick={addPlayer} data-testid="button-add-player">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {players.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground mb-2">Drag to reorder turn sequence:</p>
                    <Reorder.Group
                      axis="y"
                      values={players}
                      onReorder={setPlayers}
                      className="space-y-2"
                    >
                      {players.map((player, idx) => (
                        <Reorder.Item
                          key={player.id}
                          value={player}
                          className="flex items-center gap-2 p-3 bg-muted rounded-lg cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground w-6">#{idx + 1}</span>
                          <span className="flex-1 font-medium">{player.name}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => removePlayer(player.id)}
                            data-testid={`button-remove-player-${idx}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </div>
                )}

                {players.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Add at least 2 players to start
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button 
                onClick={startGame} 
                disabled={players.length < 2 || questions.length === 0}
                className="gap-2"
                data-testid="button-start-game"
              >
                <Play className="w-4 h-4" />
                Start Game
              </Button>
            </div>
          </motion.div>
        </main>

        <AppFooter />
      </div>
    );
  }

  // PLAYING STATE
  return (
    <div className="min-h-screen bg-[#0d0d12] text-white" data-testid="page-timewarp-playing">
      <div className="flex h-screen">
        <div className="flex-1 flex flex-col p-4 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Clock className="w-8 h-8 text-cyan-500" />
              <div>
                <h1 className="text-xl font-bold">Time Warp</h1>
                <p className="text-sm text-white/50">
                  Question {currentQuestionIdx + 1} of {questionOrder.length}
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={resetGame} className="text-white/50 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <motion.div
            key={currentPlayer?.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-6"
          >
            <p className="text-white/50 text-sm uppercase tracking-wider mb-1">Current Turn</p>
            <h2 className="text-3xl md:text-4xl font-black text-cyan-400">
              {currentPlayer?.name}
            </h2>
          </motion.div>

          <div className="flex-1 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {!showImage ? (
                <motion.div
                  key="reveal-button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Button
                    size="lg"
                    onClick={() => setShowImage(true)}
                    className="text-xl px-12 py-8 bg-cyan-600 hover:bg-cyan-700"
                    data-testid="button-show-image"
                  >
                    <ImageIcon className="w-6 h-6 mr-3" />
                    Show Image
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="image"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative max-w-2xl w-full"
                >
                  <div className="rounded-xl overflow-hidden shadow-2xl">
                    <img
                      src={currentQuestion?.imageUrl}
                      alt="Guess this!"
                      className={`w-full h-auto ${ERA_FILTERS[currentQuestion?.era as keyof typeof ERA_FILTERS] || ''}`}
                    />
                  </div>
                  {currentQuestion?.hint && (
                    <p className="text-center mt-4 text-white/60 text-sm">
                      Hint: {currentQuestion.hint}
                    </p>
                  )}
                  {showAnswer && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-xl"
                    >
                      <p className="text-3xl md:text-4xl font-bold text-cyan-400">
                        {currentQuestion?.answer}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {showImage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-4 justify-center mt-6"
            >
              {!showAnswer && (
                <Button
                  variant="outline"
                  onClick={() => setShowAnswer(true)}
                  className="border-white/20 text-white"
                  data-testid="button-reveal-answer"
                >
                  Reveal Answer
                </Button>
              )}
              <Button
                onClick={handleCorrect}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                data-testid="button-correct"
              >
                <Check className="w-5 h-5" />
                Correct (+10 pts)
              </Button>
              <Button
                onClick={handlePass}
                variant="secondary"
                className="gap-2"
                data-testid="button-pass"
              >
                <ChevronRight className="w-5 h-5" />
                Pass
              </Button>
            </motion.div>
          )}
        </div>

        <div className="w-64 bg-white/5 border-l border-white/10 p-4 hidden md:block">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-cyan-500" />
            Scoreboard
          </h3>
          <div className="space-y-2">
            {[...players].sort((a, b) => b.score - a.score).map((player, idx) => (
              <motion.div
                key={player.id}
                layout
                className={`p-3 rounded-lg ${
                  player.id === currentPlayer?.id 
                    ? 'bg-cyan-500/20 ring-1 ring-cyan-500' 
                    : 'bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {idx === 0 && <Trophy className="w-4 h-4 text-cyan-500" />}
                    <span className={player.id === currentPlayer?.id ? 'font-bold' : ''}>
                      {player.name}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {player.score}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-xs text-white/40 mb-2">Turn Order:</p>
            <div className="space-y-1">
              {players.map((player, idx) => (
                <div 
                  key={player.id}
                  className={`text-sm ${idx === currentPlayerIdx ? 'text-cyan-400 font-bold' : 'text-white/40'}`}
                >
                  {idx + 1}. {player.name} {idx === currentPlayerIdx && '←'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
