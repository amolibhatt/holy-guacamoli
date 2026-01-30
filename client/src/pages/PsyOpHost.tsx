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
  Eye, Play, Users, QrCode, Timer, Trophy, Loader2, Clock,
  ChevronDown, ChevronUp, Crown, RefreshCw, SkipForward, ArrowLeft
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AppHeader } from "@/components/AppHeader";
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
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
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

  useEffect(() => {
    if (!endTime) return;
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        if (gameState === "submitting") {
          moveToVoting();
        } else if (gameState === "voting") {
          moveToRevealing();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [endTime, gameState]);

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
            setPlayers(prev => {
              if (prev.some(p => p.id === data.playerId)) return prev;
              return [...prev, { id: data.playerId, name: data.playerName, avatar: data.playerAvatar }];
            });
            toast({ title: `${data.playerName} joined!` });
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
    
    const deadline = Date.now() + timerSeconds * 1000;
    setEndTime(deadline);
    
    ws?.send(JSON.stringify({
      type: "psyop:start:submission",
      question: {
        id: question.id,
        factText: question.factText,
      },
      deadline,
    }));
  }, [timerSeconds, ws]);

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
    
    const deadline = Date.now() + timerSeconds * 1000;
    setEndTime(deadline);
    
    ws?.send(JSON.stringify({
      type: "psyop:start:voting",
      options: shuffled.map(o => ({ id: o.id, text: o.text })),
      deadline,
    }));
  }, [currentQuestion, submissions, timerSeconds, ws]);

  const moveToRevealing = useCallback(() => {
    setGameState("revealing");
    setEndTime(null);
    
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

  const toggleQuestionSelection = (question: PsyopQuestion) => {
    setSelectedQuestions(prev => {
      if (prev.some(q => q.id === question.id)) {
        return prev.filter(q => q.id !== question.id);
      }
      return [...prev, question];
    });
  };

  const renderFactWithBlank = (text: string, answer?: string, showAnswer = false) => {
    const parts = text.split('[BLANK]');
    if (parts.length < 2) return text;
    return (
      <span>
        {parts[0]}
        <span className={`px-3 py-1 mx-1 rounded-lg font-bold ${showAnswer ? 'bg-green-500/30 text-green-600 dark:text-green-400' : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'}`}>
          {showAnswer && answer ? answer : '______'}
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
      <div className="fixed inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />
      
      <AppHeader title="PsyOp" backHref="/" />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {gameState === "setup" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-500" />
                  Select Questions for PsyOp
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="text-sm text-muted-foreground">
                    {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-sm">Timer:</label>
                    <select 
                      value={timerSeconds} 
                      onChange={(e) => setTimerSeconds(parseInt(e.target.value))}
                      className="px-2 py-1 border rounded bg-background"
                      data-testid="select-timer"
                    >
                      <option value={15}>15s</option>
                      <option value={30}>30s</option>
                      <option value={45}>45s</option>
                      <option value={60}>60s</option>
                    </select>
                  </div>
                </div>

                {isLoadingQuestions ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
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
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {questions.map((q) => (
                      <div
                        key={q.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedQuestions.some(sq => sq.id === q.id)
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-border hover-elevate'
                        }`}
                        onClick={() => toggleQuestionSelection(q)}
                        data-testid={`question-select-${q.id}`}
                      >
                        <div className="text-sm">{renderFactWithBlank(q.factText, q.correctAnswer)}</div>
                        {q.category && (
                          <Badge variant="secondary" className="mt-2 text-xs">{q.category}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Button 
                  onClick={() => connectWebSocket()} 
                  disabled={selectedQuestions.length === 0}
                  className="w-full gap-2"
                  data-testid="button-create-room"
                >
                  <Play className="w-4 h-4" />
                  Create Room
                </Button>
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
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className={`font-mono text-lg ${timeLeft <= 5 ? 'text-destructive' : ''}`}>
                      {timeLeft}s
                    </span>
                  </div>
                </div>

                <Progress value={(timeLeft / timerSeconds) * 100} className="h-2" />

                <div className="text-center py-6">
                  <div className="text-2xl font-medium leading-relaxed">
                    {renderFactWithBlank(currentQuestion.factText)}
                  </div>
                </div>

                {gameState === "submitting" && (
                  <div className="border-t pt-4">
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Waiting for lies... ({submissions.length}/{players.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {players.map(p => (
                        <Badge 
                          key={p.id} 
                          variant={submissions.some(s => s.playerId === p.id) ? "default" : "outline"}
                        >
                          {p.name} {submissions.some(s => s.playerId === p.id) && '✓'}
                        </Badge>
                      ))}
                    </div>
                    <Button 
                      onClick={moveToVoting} 
                      variant="outline" 
                      className="mt-4 gap-2"
                      disabled={submissions.length === 0}
                      data-testid="button-skip-to-voting"
                    >
                      <SkipForward className="w-4 h-4" />
                      Skip to Voting
                    </Button>
                  </div>
                )}

                {gameState === "voting" && (
                  <div className="border-t pt-4 space-y-3">
                    <div className="text-sm font-medium mb-2">Vote for what you think is the truth:</div>
                    {voteOptions.map((option, i) => (
                      <div 
                        key={option.id}
                        className="p-3 border rounded-lg bg-card/50"
                      >
                        <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                        {option.text}
                      </div>
                    ))}
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {votes.length} vote{votes.length !== 1 ? 's' : ''} received
                    </div>
                    <Button 
                      onClick={moveToRevealing} 
                      variant="outline" 
                      className="gap-2"
                      data-testid="button-reveal-answer"
                    >
                      <SkipForward className="w-4 h-4" />
                      Reveal Answer
                    </Button>
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
    </div>
  );
}
