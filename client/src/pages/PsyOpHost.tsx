import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { 
  Eye, Play, Users, QrCode, Trophy, Loader2, Check,
  Crown, RefreshCw, ArrowLeft, Shuffle, Folder
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import type { PsyopQuestion } from "@shared/schema";

type GameState = "setup" | "waiting" | "submitting" | "voting" | "revealing" | "leaderboard" | "finished";

interface PlayerSubmission {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  lieText: string;
}

interface VoteOption {
  id: string;
  text: string;
  isTruth: boolean;
  submitterId?: string;
  submitterName?: string;
}

interface PlayerVote {
  voterId: string;
  voterName: string;
  votedForId: string;
}

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  score: number;
}

export default function PsyOpHost() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState>("setup");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PsyopQuestion | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedQuestions, setSelectedQuestions] = useState<PsyopQuestion[]>([]);
  // No timers - game advances when everyone has submitted/voted
  const [submissions, setSubmissions] = useState<PlayerSubmission[]>([]);
  const [voteOptions, setVoteOptions] = useState<VoteOption[]>([]);
  const [votes, setVotes] = useState<PlayerVote[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [players, setPlayers] = useState<{ id: string; name: string; avatar?: string }[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<PsyopQuestion[]>({
    queryKey: ["/api/psyop/questions"],
    enabled: isAuthenticated,
  });

  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "psyop:host:create" }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case "psyop:room:created":
            setRoomCode(data.code);
            setGameState("waiting");
            localStorage.setItem("psyop-room-code", data.code);
            break;
          case "player:joined":
            if (data.player) {
              setPlayers(prev => {
                if (prev.some(p => p.id === data.player.id)) return prev;
                return [...prev, { id: data.player.id, name: data.player.name, avatar: data.player.avatar }];
              });
              toast({ title: `${data.player.name} joined!` });
            }
            break;
          case "player:left":
            setPlayers(prev => prev.filter(p => p.id !== data.playerId));
            break;
          case "psyop:submission":
            setSubmissions(prev => {
              if (prev.some(s => s.playerId === data.playerId)) return prev;
              return [...prev, {
                playerId: data.playerId,
                playerName: data.playerName,
                playerAvatar: data.playerAvatar,
                lieText: data.lieText,
              }];
            });
            break;
          case "psyop:vote":
            setVotes(prev => {
              if (prev.some(v => v.voterId === data.voterId)) return prev;
              return [...prev, {
                voterId: data.voterId,
                voterName: data.voterName,
                votedForId: data.votedForId,
              }];
            });
            break;
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket closed");
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    setWs(socket);
    return socket;
  }, [toast]);

  const startGame = useCallback(() => {
    if (selectedQuestions.length === 0) {
      toast({ title: "Select at least one question", variant: "destructive" });
      return;
    }
    if (players.length < 2) {
      toast({ title: "Need at least 2 players", variant: "destructive" });
      return;
    }
    
    setCurrentQuestionIndex(0);
    setCurrentQuestion(selectedQuestions[0]);
    startSubmissionPhase(selectedQuestions[0]);
  }, [selectedQuestions, players, toast]);

  const startSubmissionPhase = useCallback((question: PsyopQuestion) => {
    setCurrentQuestion(question);
    setSubmissions([]);
    setVotes([]);
    setVoteOptions([]);
    setGameState("submitting");
    
    ws?.send(JSON.stringify({
      type: "psyop:start:submission",
      question: {
        id: question.id,
        factText: question.factText,
      },
    }));
  }, [ws]);

  const moveToVoting = useCallback(() => {
    if (!currentQuestion) return;
    
    const options: VoteOption[] = [
      { id: "truth", text: currentQuestion.correctAnswer, isTruth: true },
      ...submissions.map(s => ({
        id: s.playerId,
        text: s.lieText,
        isTruth: false,
        submitterId: s.playerId,
        submitterName: s.playerName,
      })),
    ];
    
    const shuffled = options.sort(() => Math.random() - 0.5);
    setVoteOptions(shuffled);
    setGameState("voting");
    
    ws?.send(JSON.stringify({
      type: "psyop:start:voting",
      options: shuffled.map(o => ({ id: o.id, text: o.text })),
    }));
  }, [currentQuestion, submissions, ws]);

  const moveToRevealing = useCallback(() => {
    setGameState("revealing");
    
    const scores: Record<string, number> = {};
    
    votes.forEach(vote => {
      const votedOption = voteOptions.find(o => o.id === vote.votedForId);
      if (votedOption?.isTruth) {
        scores[vote.voterId] = (scores[vote.voterId] || 0) + 10;
      } else if (votedOption?.submitterId) {
        scores[votedOption.submitterId] = (scores[votedOption.submitterId] || 0) + 5;
      }
    });
    
    setLeaderboard(prev => {
      const updated = [...prev];
      Object.entries(scores).forEach(([playerId, points]) => {
        const existing = updated.find(e => e.playerId === playerId);
        if (existing) {
          existing.score += points;
        } else {
          const player = players.find(p => p.id === playerId);
          if (player) {
            updated.push({
              playerId,
              playerName: player.name,
              playerAvatar: player.avatar || "",
              score: points,
            });
          }
        }
      });
      return updated.sort((a, b) => b.score - a.score);
    });
    
    if (Object.values(scores).some(s => s >= 10)) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    
    ws?.send(JSON.stringify({
      type: "psyop:reveal",
      correctAnswer: currentQuestion?.correctAnswer,
      scores,
    }));
  }, [votes, voteOptions, players, currentQuestion, ws]);

  // Auto-advance when all players have submitted their lies
  useEffect(() => {
    if (gameState === "submitting" && players.length > 0 && submissions.length === players.length) {
      moveToVoting();
    }
  }, [gameState, players.length, submissions.length, moveToVoting]);

  // Auto-advance when all players have voted
  useEffect(() => {
    if (gameState === "voting" && players.length > 0 && votes.length === players.length) {
      moveToRevealing();
    }
  }, [gameState, players.length, votes.length, moveToRevealing]);

  const nextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= selectedQuestions.length) {
      setGameState("finished");
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
    } else {
      setCurrentQuestionIndex(nextIndex);
      startSubmissionPhase(selectedQuestions[nextIndex]);
    }
  }, [currentQuestionIndex, selectedQuestions, startSubmissionPhase]);

  // Get unique categories from questions
  const categories = Array.from(new Set(questions.map(q => q.category).filter(Boolean))) as string[];
  
  // Select questions by category and start room
  const selectCategoryAndStart = (category: string) => {
    const categoryQuestions = questions.filter(q => q.category === category);
    const shuffled = [...categoryQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(5, shuffled.length));
    setSelectedQuestions(selected);
    connectWebSocket();
  };
  
  // Shuffle all questions and start room
  const shuffleAndStart = () => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(5, shuffled.length));
    setSelectedQuestions(selected);
    connectWebSocket();
  };

  const renderFactWithBlank = (text: string, answer?: string, showAnswer = false) => {
    const parts = text.split('[REDACTED]');
    if (parts.length < 2) return text;
    return (
      <span>
        {parts[0]}
        <span className={`px-3 py-1 mx-1 rounded-lg font-bold ${showAnswer ? 'bg-green-500/30 text-green-600 dark:text-green-400' : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'}`}>
          {showAnswer && answer ? answer : '[REDACTED]'}
        </span>
        {parts[1]}
      </span>
    );
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  const joinUrl = roomCode ? `${window.location.origin}/play/${roomCode}` : "";

  return (
    <div className="min-h-screen bg-background" data-testid="page-psyop-host">
      <div className="fixed inset-0 bg-gradient-to-br from-violet-300/5 via-transparent to-purple-300/5 pointer-events-none" />
      
<AppHeader minimal backHref="/" title="PsyOp" />

      <main className="max-w-6xl mx-auto px-4 py-6 w-full">
        {gameState === "setup" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-500" />
                  Start a PsyOp Game
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingQuestions ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No questions available</p>
                    <Button onClick={() => setLocation("/admin/psyop")} className="mt-4" data-testid="button-create-questions">
                      Create Questions
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Shuffle All Option */}
                    <button
                      onClick={shuffleAndStart}
                      className="w-full p-4 border-2 border-dashed border-purple-300 rounded-xl hover-elevate active-elevate-2 transition-all text-left group"
                      data-testid="button-shuffle-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                          <Shuffle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">Shuffle Play</div>
                          <div className="text-sm text-muted-foreground">5 random questions from all categories</div>
                        </div>
                      </div>
                    </button>

                    {/* Category Options */}
                    {categories.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-muted-foreground">Or pick a category:</div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {categories.map((category) => {
                            const count = questions.filter(q => q.category === category).length;
                            return (
                              <button
                                key={category}
                                onClick={() => selectCategoryAndStart(category)}
                                className="p-4 border rounded-xl hover-elevate active-elevate-2 transition-all text-left"
                                data-testid={`button-category-${category}`}
                              >
                                <div className="flex items-center gap-3">
                                  <Folder className="w-5 h-5 text-purple-500" />
                                  <div>
                                    <div className="font-medium">{category}</div>
                                    <div className="text-xs text-muted-foreground">{count} question{count !== 1 ? 's' : ''}</div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {gameState === "waiting" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card>
              <CardContent className="pt-6 text-center space-y-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Room Code</div>
                  <div className="text-5xl font-bold tracking-widest text-purple-600 dark:text-purple-400">
                    {roomCode}
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => setShowQR(!showQR)} className="gap-2" data-testid="button-toggle-qr">
                    <QrCode className="w-4 h-4" />
                    {showQR ? 'Hide' : 'Show'} QR Code
                  </Button>
                </div>

                <AnimatePresence>
                  {showQR && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex justify-center py-4"
                    >
                      <div className="p-4 bg-white rounded-lg">
                        <QRCodeSVG value={joinUrl} size={180} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="text-sm text-muted-foreground">
                  Join at: <span className="font-mono">{joinUrl}</span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Users className="w-4 h-4" />
                    <span>{players.length} player{players.length !== 1 ? 's' : ''} joined</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-center">
                    {players.map(p => (
                      <Badge key={p.id} variant="secondary" className="py-1 px-3">
                        {p.avatar && <span className="mr-1">{p.avatar}</span>}
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={startGame} 
                  disabled={players.length < 2}
                  size="lg"
                  className="gap-2"
                  data-testid="button-start-game"
                >
                  <Play className="w-5 h-5" />
                  Start Game ({selectedQuestions.length} questions)
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {(gameState === "submitting" || gameState === "voting") && currentQuestion && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="outline">
                    Question {currentQuestionIndex + 1} of {selectedQuestions.length}
                  </Badge>
                  <Badge variant="secondary">
                    {gameState === "submitting" ? "Write your lie" : "Find the truth"}
                  </Badge>
                </div>

                <div className="text-center py-6">
                  <div className="text-2xl font-medium leading-relaxed">
                    {renderFactWithBlank(currentQuestion.factText)}
                  </div>
                </div>

                {gameState === "submitting" && (
                  <div className="border-t pt-4">
                    <div className="text-sm text-muted-foreground mb-3">
                      Waiting for all players to submit... ({submissions.length}/{players.length})
                    </div>
                    <Progress value={(submissions.length / players.length) * 100} className="h-2 mb-4" />
                    <div className="flex flex-wrap gap-2">
                      {players.map(p => {
                        const hasSubmitted = submissions.some(s => s.playerId === p.id);
                        return (
                          <Badge 
                            key={p.id} 
                            variant={hasSubmitted ? "default" : "outline"}
                            className="gap-1"
                          >
                            {hasSubmitted && <Check className="w-3 h-3" />}
                            {p.name}
                            {hasSubmitted && " ...Dipped!"}
                          </Badge>
                        );
                      })}
                    </div>
                    {submissions.length > 0 && submissions.length < players.length && (
                      <Button 
                        onClick={moveToVoting} 
                        variant="outline" 
                        className="mt-4 gap-2"
                        data-testid="button-force-voting"
                      >
                        Continue with {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
                      </Button>
                    )}
                  </div>
                )}

                {gameState === "voting" && (
                  <div className="border-t pt-4 space-y-3">
                    <div className="text-sm font-medium mb-2">Which one is the truth?</div>
                    {voteOptions.map((option, i) => (
                      <div 
                        key={option.id}
                        className="p-3 border rounded-lg bg-card/50"
                      >
                        <span className="font-bold mr-2 text-purple-600 dark:text-purple-400">{String.fromCharCode(65 + i)}.</span>
                        {option.text}
                      </div>
                    ))}
                    <div className="text-sm text-muted-foreground mt-4">
                      Waiting for all votes... ({votes.length}/{players.length})
                    </div>
                    <Progress value={(votes.length / players.length) * 100} className="h-2" />
                    {votes.length > 0 && votes.length < players.length && (
                      <Button 
                        onClick={moveToRevealing} 
                        variant="outline" 
                        className="mt-4 gap-2"
                        data-testid="button-force-reveal"
                      >
                        Reveal with {votes.length} vote{votes.length !== 1 ? 's' : ''}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {gameState === "revealing" && currentQuestion && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">The truth was:</div>
                  <div className="text-2xl font-medium leading-relaxed">
                    {renderFactWithBlank(currentQuestion.factText, currentQuestion.correctAnswer, true)}
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="text-sm font-medium mb-2">Results:</div>
                  {voteOptions.map((option) => {
                    const votesForThis = votes.filter(v => v.votedForId === option.id);
                    return (
                      <div 
                        key={option.id}
                        className={`p-3 border rounded-lg ${option.isTruth ? 'border-green-500 bg-green-500/10' : 'bg-card/50'}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={option.isTruth ? 'font-bold text-green-600 dark:text-green-400' : ''}>
                            {option.text}
                            {option.isTruth && ' ✓ TRUTH'}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {votesForThis.map(v => (
                              <Badge key={v.voterId} variant="secondary" className="text-xs">
                                {v.voterName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {!option.isTruth && option.submitterName && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Lie by: {option.submitterName} (+{votesForThis.length * 5} points)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Button onClick={nextQuestion} size="lg" className="w-full gap-2" data-testid="button-next-question">
                  {currentQuestionIndex + 1 >= selectedQuestions.length ? 'See Final Results' : 'Next Question'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {gameState === "finished" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card>
              <CardContent className="pt-6 text-center space-y-6">
                <Trophy className="w-16 h-16 mx-auto text-yellow-500" />
                <h2 className="text-2xl font-bold">Game Over!</h2>
                
                <div className="space-y-3">
                  {leaderboard.map((entry, i) => (
                    <div 
                      key={entry.playerId}
                      className={`p-4 border rounded-lg flex items-center gap-4 ${i === 0 ? 'border-yellow-500 bg-yellow-500/10' : ''}`}
                    >
                      <div className="text-2xl font-bold w-8">
                        {i === 0 && <Crown className="w-6 h-6 text-yellow-500" />}
                        {i > 0 && `#${i + 1}`}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{entry.playerName}</div>
                      </div>
                      <div className="text-xl font-bold">{entry.score} pts</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <Button onClick={() => setLocation("/")} variant="outline" className="gap-2" data-testid="button-back-home">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                  </Button>
                  <Button onClick={() => window.location.reload()} className="gap-2" data-testid="button-play-again">
                    <RefreshCw className="w-4 h-4" />
                    Play Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
      
      <AppFooter />
    </div>
  );
}
