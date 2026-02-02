import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { 
  Loader2, Plus, Trash2, X, Clock, Users, GripVertical,
  Check, ChevronRight, RotateCcw, Image as ImageIcon, Play,
  ArrowUpDown, Trophy, Sparkles, Zap
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

const ERA_COLORS = {
  past: { bg: "from-amber-600 to-orange-700", text: "text-amber-400", glow: "shadow-amber-500/30" },
  present: { bg: "from-emerald-500 to-teal-600", text: "text-emerald-400", glow: "shadow-emerald-500/30" },
  future: { bg: "from-violet-600 to-purple-700", text: "text-violet-400", glow: "shadow-violet-500/30" },
};

export default function TimeWarpHost() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Game state
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

  // Initialize question order when questions load
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
    // Shuffle questions
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
  const isAtMidpoint = currentQuestionIdx === midpoint && !hasReversed && questionOrder.length >= 4;

  const handleCorrect = () => {
    // Award 10 points
    setPlayers(players.map(p => 
      p.id === currentPlayer.id ? { ...p, score: p.score + 10 } : p
    ));
    nextQuestion();
  };

  const handlePass = () => {
    // Move to next player, same question
    moveToNextPlayer();
  };

  const moveToNextPlayer = () => {
    const nextIdx = (currentPlayerIdx + 1) % players.length;
    setCurrentPlayerIdx(nextIdx);
  };

  const nextQuestion = () => {
    const nextQIdx = currentQuestionIdx + 1;
    
    // Check if we've reached midpoint - trigger TIME WARP
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-950 via-black to-violet-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Clock className="w-12 h-12 text-amber-500" />
        </motion.div>
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
      <div className="min-h-screen bg-gradient-to-br from-amber-950 via-black to-violet-950 flex items-center justify-center overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-amber-500 rounded-full"
              initial={{ 
                x: Math.random() * window.innerWidth, 
                y: Math.random() * window.innerHeight,
                opacity: 0 
              }}
              animate={{ 
                y: [null, -100],
                opacity: [0, 1, 0],
              }}
              transition={{ 
                duration: 2,
                delay: i * 0.1,
                repeat: Infinity,
              }}
            />
          ))}
        </div>
        
        <motion.div
          initial={{ scale: 0, rotate: 0 }}
          animate={{ 
            scale: [0, 1.2, 1],
            rotate: [0, 360, 720],
          }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
          className="text-center relative z-10"
        >
          <motion.div
            animate={{
              filter: [
                "drop-shadow(0 0 20px #f59e0b)",
                "drop-shadow(0 0 60px #8b5cf6)",
                "drop-shadow(0 0 20px #f59e0b)",
              ],
            }}
            transition={{ duration: 0.5, repeat: 5 }}
          >
            <Clock className="w-32 h-32 mx-auto mb-6 text-amber-500" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-violet-500 to-amber-400 uppercase tracking-widest"
          >
            TIME WARP
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-3xl md:text-4xl text-violet-400 mt-4 font-bold"
          >
            ORDER REVERSED!
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.8 }}
            className="mt-8"
          >
            <ArrowUpDown className="w-20 h-20 mx-auto text-amber-400 animate-bounce" />
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
      <div className="min-h-screen bg-gradient-to-br from-amber-950 via-black to-violet-950 text-white" data-testid="page-timewarp-finished">
        {/* Celebratory particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{ 
                background: i % 2 === 0 ? '#f59e0b' : '#8b5cf6',
                left: `${Math.random() * 100}%`
              }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ 
                y: window.innerHeight + 20,
                opacity: [0, 1, 1, 0],
                rotate: 360,
              }}
              transition={{ 
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
              }}
            />
          ))}
        </div>

        <AppHeader minimal backHref="/" title="Time Warp - Game Over" />
        
        <main className="max-w-2xl mx-auto px-4 py-12 relative z-10">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 10 }}
            className="text-center mb-10"
          >
            <div className="relative inline-block">
              <Trophy className="w-24 h-24 mx-auto text-amber-500 drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]" />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -inset-4 bg-amber-500/20 rounded-full blur-xl"
              />
            </div>
            <h1 className="text-4xl font-black mt-6 mb-3 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-violet-400">
              Game Over!
            </h1>
            <p className="text-2xl text-white/80">
              <span className="text-amber-400 font-bold">{winner.name}</span> wins with{" "}
              <span className="text-violet-400 font-bold">{winner.score}</span> points!
            </p>
          </motion.div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Final Scores
            </h2>
            <div className="space-y-3">
              {sortedPlayers.map((player, idx) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.15 }}
                  className={`flex items-center justify-between p-4 rounded-xl ${
                    idx === 0 
                      ? 'bg-gradient-to-r from-amber-500/30 to-violet-500/30 ring-2 ring-amber-500/50' 
                      : idx === 1
                      ? 'bg-white/10'
                      : idx === 2
                      ? 'bg-white/5'
                      : 'bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-3xl font-black ${
                      idx === 0 ? 'text-amber-400' : 
                      idx === 1 ? 'text-gray-300' : 
                      idx === 2 ? 'text-amber-700' : 'text-white/30'
                    }`}>
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-lg">{player.name}</span>
                    {idx === 0 && <Trophy className="w-5 h-5 text-amber-500" />}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`text-lg px-4 py-1 ${
                      idx === 0 ? 'bg-amber-500 text-black' : ''
                    }`}
                  >
                    {player.score} pts
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 mt-10 justify-center">
            <Button 
              variant="outline" 
              onClick={resetGame} 
              className="border-white/20 text-white hover:bg-white/10"
              data-testid="button-play-again"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Play Again
            </Button>
            <Link href="/">
              <Button 
                className="bg-gradient-to-r from-amber-500 to-violet-500 hover:from-amber-600 hover:to-violet-600 text-white"
                data-testid="button-back-home"
              >
                Back to Home
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // SETUP STATE
  if (gameState === "setup") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-950 via-black to-violet-950 text-white" data-testid="page-timewarp-setup">
        {/* Animated background grid */}
        <div className="fixed inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.1)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>
        
        {/* Floating orbs */}
        <motion.div
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="fixed top-20 left-20 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity }}
          className="fixed bottom-20 right-20 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl pointer-events-none"
        />
        
        <AppHeader minimal backHref="/" title="Time Warp - Setup" />

        <main className="max-w-2xl mx-auto px-4 py-8 relative z-10">
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="relative inline-block mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-4 bg-gradient-to-r from-amber-500/30 to-violet-500/30 rounded-full blur-xl"
              />
              <Clock className="w-20 h-20 text-amber-500 relative drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-white to-violet-400">
              Time Warp
            </h1>
            <p className="text-white/60 text-lg">Add players and arrange the turn order</p>
          </motion.div>

          {/* Players Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-amber-500" />
                </div>
                <h2 className="text-xl font-bold">Players ({players.length})</h2>
              </div>
              
              <div className="flex gap-3 mb-5">
                <Input
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                  placeholder="Enter player name"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  data-testid="input-player-name"
                />
                <Button 
                  onClick={addPlayer} 
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                  data-testid="button-add-player"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {players.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-white/40 mb-3 flex items-center gap-2">
                    <GripVertical className="w-4 h-4" />
                    Drag to reorder turn sequence
                  </p>
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
                        className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/15 rounded-xl cursor-grab active:cursor-grabbing transition-colors border border-white/5"
                      >
                        <GripVertical className="w-4 h-4 text-white/30" />
                        <span className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-amber-500 to-violet-500 rounded-full text-sm font-bold text-black">
                          {idx + 1}
                        </span>
                        <span className="flex-1 font-medium">{player.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-white/50 hover:text-red-400 hover:bg-red-500/20"
                          onClick={() => removePlayer(player.id)}
                          data-testid={`button-remove-player-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </div>
              )}

              {players.length === 0 && (
                <div className="text-center py-8 text-white/40">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Add at least 2 players to start</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Questions Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <ImageIcon className="w-5 h-5 text-violet-500" />
                </div>
                <h2 className="text-xl font-bold">Questions ({questions.length})</h2>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 text-white/30" />
                  <p className="text-white/40 mb-4">No questions available</p>
                  <Link href="/admin/timewarp">
                    <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Questions
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-white/60">
                    <span className="text-violet-400 font-bold">{questions.length}</span> questions ready. Questions will be shuffled at game start.
                  </p>
                  {questions.length >= 4 && (
                    <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                      <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                      <p className="text-sm text-amber-400">
                        At question #{Math.floor(questions.length / 2)}, player order will reverse!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-4 justify-center"
          >
            <Link href="/admin/timewarp">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Manage Questions
              </Button>
            </Link>
            <Button 
              onClick={startGame} 
              disabled={players.length < 2 || questions.length === 0}
              className="gap-2 bg-gradient-to-r from-amber-500 to-violet-500 hover:from-amber-600 hover:to-violet-600 text-white shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:shadow-none"
              data-testid="button-start-game"
            >
              <Play className="w-4 h-4" />
              Start Game
            </Button>
          </motion.div>
        </main>
      </div>
    );
  }

  // PLAYING STATE
  const eraColors = ERA_COLORS[currentQuestion?.era as keyof typeof ERA_COLORS] || ERA_COLORS.present;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-black to-violet-950 text-white" data-testid="page-timewarp-playing">
      {/* Dynamic era-based background glow */}
      <motion.div
        key={currentQuestion?.era}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`fixed inset-0 pointer-events-none`}
      >
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b ${eraColors.bg} opacity-20 blur-[100px] rounded-full`} />
      </motion.div>

      <div className="flex h-screen relative z-10">
        {/* Main Game Area */}
        <div className="flex-1 flex flex-col p-4 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-amber-500/20 rounded-xl">
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Time Warp</h1>
                <p className="text-sm text-white/50">
                  Question {currentQuestionIdx + 1} of {questionOrder.length}
                  {currentQuestion?.era && (
                    <Badge variant="outline" className={`ml-2 ${eraColors.text} border-current text-xs`}>
                      {currentQuestion.era.toUpperCase()}
                    </Badge>
                  )}
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={resetGame} className="text-white/50 hover:text-white hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-violet-500"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestionIdx + 1) / questionOrder.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            {!hasReversed && midpoint > 0 && (
              <div className="flex justify-center mt-2">
                <span className="text-xs text-white/40">
                  {midpoint - currentQuestionIdx} questions until TIME WARP
                </span>
              </div>
            )}
          </div>

          {/* Current Player Spotlight */}
          <motion.div
            key={currentPlayer?.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-8"
          >
            <p className="text-white/40 text-sm uppercase tracking-widest mb-2">Current Turn</p>
            <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-white to-violet-400">
              {currentPlayer?.name}
            </h2>
          </motion.div>

          {/* Image Display */}
          <div className="flex-1 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {!showImage ? (
                <motion.div
                  key="reveal-button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center"
                >
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        "0 0 30px rgba(245,158,11,0.3)",
                        "0 0 60px rgba(139,92,246,0.3)",
                        "0 0 30px rgba(245,158,11,0.3)",
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="inline-block rounded-2xl"
                  >
                    <Button
                      size="lg"
                      onClick={() => setShowImage(true)}
                      className="text-xl px-16 py-10 bg-gradient-to-r from-amber-500 to-violet-500 hover:from-amber-600 hover:to-violet-600 rounded-2xl"
                      data-testid="button-show-image"
                    >
                      <ImageIcon className="w-8 h-8 mr-4" />
                      Reveal Image
                    </Button>
                  </motion.div>
                  <p className="mt-4 text-white/40 text-sm">Click to show the mystery image</p>
                </motion.div>
              ) : (
                <motion.div
                  key="image"
                  initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="relative max-w-2xl w-full"
                >
                  <div className={`rounded-2xl overflow-hidden shadow-2xl ${eraColors.glow} shadow-2xl ring-2 ring-white/10`}>
                    <img
                      src={currentQuestion?.imageUrl}
                      alt="Guess this!"
                      className={`w-full h-auto ${ERA_FILTERS[currentQuestion?.era as keyof typeof ERA_FILTERS] || ''}`}
                    />
                  </div>
                  {currentQuestion?.hint && !showAnswer && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center mt-4"
                    >
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/60 text-sm">
                        <Sparkles className="w-4 h-4" />
                        Hint: {currentQuestion.hint}
                      </span>
                    </motion.div>
                  )}
                  {showAnswer && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-2xl backdrop-blur-sm"
                    >
                      <div className="text-center">
                        <Check className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
                        <p className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-violet-400">
                          {currentQuestion?.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          {showImage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-4 justify-center mt-8"
            >
              {!showAnswer && (
                <Button
                  variant="outline"
                  onClick={() => setShowAnswer(true)}
                  className="border-white/20 text-white hover:bg-white/10"
                  data-testid="button-reveal-answer"
                >
                  Reveal Answer
                </Button>
              )}
              <Button
                onClick={handleCorrect}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/25"
                data-testid="button-correct"
              >
                <Check className="w-5 h-5" />
                Correct (+10 pts)
              </Button>
              <Button
                onClick={handlePass}
                variant="secondary"
                className="gap-2 bg-white/10 hover:bg-white/20 text-white"
                data-testid="button-pass"
              >
                <ChevronRight className="w-5 h-5" />
                Pass
              </Button>
            </motion.div>
          )}
        </div>

        {/* Scoreboard Sidebar */}
        <div className="w-72 bg-white/5 backdrop-blur-sm border-l border-white/10 p-5 hidden md:flex flex-col">
          <h3 className="font-bold text-lg mb-5 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Scoreboard
          </h3>
          <div className="space-y-2 flex-1">
            {[...players].sort((a, b) => b.score - a.score).map((player, idx) => (
              <motion.div
                key={player.id}
                layout
                className={`p-3 rounded-xl transition-all ${
                  player.id === currentPlayer?.id 
                    ? 'bg-gradient-to-r from-amber-500/20 to-violet-500/20 ring-2 ring-amber-500/50' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {idx === 0 && <Trophy className="w-4 h-4 text-amber-500" />}
                    <span className={player.id === currentPlayer?.id ? 'font-bold' : 'text-white/80'}>
                      {player.name}
                    </span>
                  </div>
                  <Badge variant="secondary" className={`text-sm ${idx === 0 ? 'bg-amber-500 text-black' : ''}`}>
                    {player.score}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-auto pt-5 border-t border-white/10">
            <p className="text-xs text-white/40 mb-3 flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4" />
              Turn Order {hasReversed && <Badge variant="outline" className="text-violet-400 border-violet-400/50 text-xs">Reversed!</Badge>}
            </p>
            <div className="space-y-1">
              {players.map((player, idx) => (
                <div 
                  key={player.id}
                  className={`text-sm px-2 py-1 rounded ${
                    idx === currentPlayerIdx 
                      ? 'bg-amber-500/20 text-amber-400 font-bold' 
                      : 'text-white/40'
                  }`}
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
