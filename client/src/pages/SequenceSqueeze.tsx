import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { 
  ListOrdered, Play, Pause, Users, QrCode, Timer, 
  Trophy, Plus, Trash2, Edit, Check, X, Loader2, Clock, Zap,
  ChevronDown, ChevronUp, Sparkles, Crown, RefreshCw, SkipForward,
  Volume2, VolumeX, Medal, Star
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AppHeader } from "@/components/AppHeader";
import type { SequenceQuestion, SequenceSession, SequenceSubmission } from "@shared/schema";

type GameState = "setup" | "waiting" | "animatedReveal" | "playing" | "revealing" | "leaderboard" | "gameComplete" | "results";
type AnimationStage = "teaser" | "questionDrop" | "optionPulse" | null;

interface PlayerSubmission {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  sequence: string[];
  timeMs: number;
  isCorrect?: boolean;
}

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  score: number;
}

interface WinnerInfo {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  timeMs: number;
}

export default function SequenceSqueeze() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState>("setup");
  const [animationStage, setAnimationStage] = useState<AnimationStage>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<SequenceQuestion | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(1);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<PlayerSubmission[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<SequenceQuestion | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [players, setPlayers] = useState<{ id: string; name: string; avatar?: string }[]>([]);
  const [winner, setWinner] = useState<WinnerInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const submissionsRef = useRef<PlayerSubmission[]>([]);
  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<SequenceQuestion[]>({
    queryKey: ["/api/sequence-squeeze/questions"],
    enabled: isAuthenticated,
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: Omit<SequenceQuestion, "id" | "createdAt">) => {
      return apiRequest("POST", "/api/sequence-squeeze/questions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequence-squeeze/questions"] });
      setShowCreateDialog(false);
      toast({ title: "Question created!" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/sequence-squeeze/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequence-squeeze/questions"] });
      toast({ title: "Question deleted" });
    },
  });

  const connectWebSocket = useCallback((continueFromBuzzkill: boolean = false) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    const existingRoomCode = continueFromBuzzkill ? localStorage.getItem("buzzer-room-code") : null;

    socket.onopen = () => {
      if (existingRoomCode) {
        socket.send(JSON.stringify({ type: "host:join", code: existingRoomCode }));
      } else {
        socket.send(JSON.stringify({ type: "sequence:host:create" }));
      }
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case "room:joined":
          socket.send(JSON.stringify({ type: "sequence:host:switchMode" }));
          break;
        case "room:notFound":
          localStorage.removeItem("buzzer-room-code");
          socket.send(JSON.stringify({ type: "sequence:host:create" }));
          break;
        case "sequence:mode:switched":
          setRoomCode(data.code);
          setGameState("waiting");
          if (data.players && data.players.length > 0) {
            setPlayers(data.players.map((p: any) => ({
              id: p.playerId,
              name: p.playerName,
              avatar: p.playerAvatar,
            })));
            setLeaderboard(data.players.map((p: any) => ({
              playerId: p.playerId,
              playerName: p.playerName,
              playerAvatar: p.playerAvatar,
              score: p.score,
            })));
            toast({ 
              title: "Game ready!", 
              description: `${data.players.length} player${data.players.length !== 1 ? 's' : ''} connected with scores` 
            });
          }
          break;
        case "sequence:room:created":
          setRoomCode(data.code);
          setGameState("waiting");
          break;
        case "sequence:player:joined":
          toast({ title: `${data.playerName} joined!` });
          setPlayers(prev => [...prev.filter(p => p.id !== data.playerId), { 
            id: data.playerId, 
            name: data.playerName, 
            avatar: data.playerAvatar 
          }]);
          break;
        case "sequence:animatedReveal:started":
          setGameState("animatedReveal");
          setAnimationStage("teaser");
          setCurrentQuestionIndex(data.questionIndex || 1);
          setTotalQuestions(data.totalQuestions || 1);
          if (data.question) {
            setCurrentQuestion(prev => prev || data.question);
          }
          playAudio("countdown");
          setTimeout(() => setAnimationStage("questionDrop"), 2000);
          setTimeout(() => {
            setAnimationStage("optionPulse");
            playAudio("whoosh");
          }, 3000);
          break;
        case "sequence:answering:started":
          setGameState("playing");
          setAnimationStage(null);
          if (data.endTime) {
            setEndTime(data.endTime);
          }
          break;
        case "sequence:submission":
          setSubmissions(prev => {
            const newSubmissions = [...prev, data.submission];
            submissionsRef.current = newSubmissions;
            return newSubmissions;
          });
          break;
        case "sequence:round:started":
          if (data.endTime) {
            setEndTime(data.endTime);
          }
          break;
        case "sequence:reveal:complete":
          setGameState("revealing");
          playAudio("buzzer");
          if (data.submissions) {
            setSubmissions(data.submissions);
            submissionsRef.current = data.submissions;
          }
          if (data.winner) {
            setWinner(data.winner);
            confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
          } else {
            setWinner(null);
          }
          if (data.leaderboard) {
            setLeaderboard(data.leaderboard);
          }
          if (data.currentQuestionIndex) {
            setCurrentQuestionIndex(data.currentQuestionIndex);
          }
          if (data.totalQuestions) {
            setTotalQuestions(data.totalQuestions);
          }
          break;
        case "sequence:leaderboard":
          setGameState("leaderboard");
          if (data.leaderboard) {
            setLeaderboard(data.leaderboard);
          }
          break;
        case "sequence:gameComplete":
          setGameState("gameComplete");
          if (data.leaderboard) {
            setLeaderboard(data.leaderboard);
          }
          if (data.globalWinner) {
            setWinner(data.globalWinner);
            confetti({ particleCount: 300, spread: 180, origin: { y: 0.4 } });
          }
          break;
        case "sequence:scoresReset":
          setLeaderboard([]);
          toast({ title: "Scores reset!" });
          break;
        case "player:left":
          toast({ title: `${data.playerName} left the game` });
          setPlayers(prev => prev.filter(p => p.id !== data.playerId));
          break;
      }
    };

    socket.onclose = () => {
      setRoomCode(null);
      setGameState("setup");
    };

    setWs(socket);
  }, [toast]);

  const audioContextRef = useRef<AudioContext | null>(null);
  
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);
  
  const playAudio = useCallback((type: "countdown" | "whoosh" | "buzzer" | "winner") => {
    if (!audioEnabled) return;
    try {
      const ctx = getAudioContext();
      const frequencies: Record<string, { freqs: number[]; type: OscillatorType; duration: number }> = {
        countdown: { freqs: [440, 520, 600], type: "sine", duration: 0.1 },
        whoosh: { freqs: [800, 600, 400, 300], type: "sine", duration: 0.08 },
        buzzer: { freqs: [300, 200, 150], type: "sawtooth", duration: 0.15 },
        winner: { freqs: [523, 659, 784, 880, 1047], type: "sine", duration: 0.12 },
      };
      const config = frequencies[type] || frequencies.countdown;
      config.freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = config.type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * config.duration);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * config.duration + config.duration * 0.9);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * config.duration);
        osc.stop(ctx.currentTime + i * config.duration + config.duration);
      });
    } catch {}
  }, [audioEnabled, getAudioContext]);

  const startQuestion = (question: SequenceQuestion, idx?: number) => {
    const questionIdx = idx !== undefined ? idx + 1 : currentQuestionIndex;
    setCurrentQuestion(question);
    setSubmissions([]);
    submissionsRef.current = [];
    setTimerSeconds(15);
    setEndTime(null);
    setWinner(null);
    setCurrentQuestionIndex(questionIdx);
    setTotalQuestions(questions.length);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: "sequence:host:startQuestion", 
        question: {
          id: question.id,
          question: question.question,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          hint: question.hint,
        },
        correctOrder: question.correctOrder,
        questionIndex: questionIdx,
        totalQuestions: questions.length,
      }));
    }
  };

  const revealAnswer = useCallback(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "sequence:host:reveal" }));
  }, [ws]);

  const showResults = () => {
    setGameState("results");
  };

  const resetGame = useCallback(() => {
    setCurrentQuestion(null);
    setSubmissions([]);
    submissionsRef.current = [];
    setGameState("waiting");
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "sequence:host:reset" }));
    }
  }, [ws]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === "playing" && endTime) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setTimerSeconds(remaining);
      };
      updateTimer();
      interval = setInterval(updateTimer, 200);
    }
    return () => {
      clearInterval(interval);
    };
  }, [gameState, endTime]);

  useEffect(() => {
    return () => {
      if (ws) ws.close();
    };
  }, [ws]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  const joinUrl = `${window.location.origin}/sequence/${roomCode}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

      <AppHeader
        title="Sequence Squeeze"
        subtitle="Put it in order, fast!"
        backHref="/"
        rightContent={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setAudioEnabled(!audioEnabled);
                if (!audioEnabled) getAudioContext();
              }}
              data-testid="button-audio-toggle"
            >
              {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
            </Button>
            {roomCode && (
              <>
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm font-mono">
                  <span className="text-muted-foreground">Room:</span>
                  <span className="text-foreground font-bold">{roomCode}</span>
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => setShowQR(true)} data-testid="button-qr">
                  <QrCode className="w-5 h-5" />
                </Button>
              </>
            )}
          </>
        }
      />

      <main className="p-6 max-w-5xl mx-auto">
        {gameState === "setup" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-28 h-28 mx-auto mb-8 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-teal-500/40">
              <ListOrdered className="w-14 h-14 text-white" />
            </div>
            <h2 className="text-4xl font-black mb-3">Sequence Squeeze</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Put it in order, fast!
            </p>
            
            {isLoadingQuestions ? (
              <Skeleton className="h-14 w-48 mx-auto" />
            ) : questions.length === 0 ? (
              <p className="text-muted-foreground mb-4">No questions available. Add some in the Admin panel.</p>
            ) : (
              <div className="space-y-4">
                <Badge variant="secondary" className="text-base px-4 py-2">
                  {questions.length} question{questions.length !== 1 ? 's' : ''} ready
                </Badge>
                
                {localStorage.getItem("buzzer-room-code") ? (
                  <div className="flex flex-col gap-3 items-center">
                    <Button 
                      size="lg"
                      className="h-14 px-8 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-teal-500/30"
                      onClick={() => connectWebSocket(true)}
                      data-testid="button-continue-buzzkill"
                    >
                      <Play className="w-6 h-6 mr-2" />
                      Continue from Buzzkill
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Players and scores will carry over
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => connectWebSocket(false)}
                      data-testid="button-start-fresh"
                    >
                      Start Fresh Game
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Button 
                      size="lg"
                      className="h-14 px-8 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-teal-500/30"
                      onClick={() => connectWebSocket(false)}
                      data-testid="button-start-game"
                    >
                      <Play className="w-6 h-6 mr-2" />
                      Start Game
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {gameState === "waiting" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-teal-500/30">
              <Users className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Waiting for Players</h2>
            <p className="text-muted-foreground mb-4">
              Room Code: <span className="font-mono font-bold text-foreground text-xl">{roomCode}</span>
            </p>

            <div className="flex items-center justify-center gap-4 mb-6">
              <Button
                variant="outline"
                onClick={() => setShowQR(true)}
                className="gap-2"
                data-testid="button-show-qr"
              >
                <QrCode className="w-4 h-4" />
                Show QR Code
              </Button>
              <Badge className="bg-emerald-500 gap-1 text-sm px-3 py-1.5">
                <Users className="w-3 h-3" />
                {players.length} player{players.length !== 1 ? 's' : ''} connected
              </Badge>
            </div>

            {players.length > 0 && (
              <div className="mb-6">
                <div className="flex flex-wrap justify-center gap-2">
                  {players.map(p => {
                    const playerScore = leaderboard.find(l => l.playerId === p.id)?.score;
                    return (
                      <Badge key={p.id} variant="secondary" className="gap-1">
                        {p.name}
                        {playerScore !== undefined && playerScore > 0 && (
                          <span className="text-emerald-500 font-bold ml-1">({playerScore})</span>
                        )}
                      </Badge>
                    );
                  })}
                </div>
                {leaderboard.length > 0 && leaderboard.some(l => l.score > 0) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Scores imported from Buzzkill
                  </p>
                )}
              </div>
            )}

            <Button 
              size="lg"
              className="h-14 px-8 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-teal-500/30"
              onClick={() => {
                if (questions.length > 0) {
                  startQuestion(questions[0], 0);
                }
              }}
              disabled={players.length === 0 || questions.length === 0}
              data-testid="button-begin-game"
            >
              <Play className="w-6 h-6 mr-2" />
              Begin Game ({questions.length} questions)
            </Button>
            {players.length === 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                Waiting for at least 1 player to join...
              </p>
            )}
          </motion.div>
        )}

        {gameState === "animatedReveal" && currentQuestion && (
          <AnimatePresence mode="wait">
            {animationStage === "teaser" && (
              <motion.div
                key="teaser"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-teal-600 via-cyan-600 to-emerald-600"
              >
                <div className="text-center text-white">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <Sparkles className="w-16 h-16 mx-auto mb-4" />
                  </motion.div>
                  <h1 className="text-5xl md:text-7xl font-black mb-4">
                    QUESTION {currentQuestionIndex}/{totalQuestions}
                  </h1>
                  <p className="text-2xl md:text-3xl font-bold opacity-90">
                    PREPARE YOUR FINGERS
                  </p>
                </div>
              </motion.div>
            )}
            
            {animationStage === "questionDrop" && (
              <motion.div
                key="questionDrop"
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
              >
                <motion.h2
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="text-3xl md:text-5xl font-black text-white text-center px-8 max-w-4xl"
                >
                  {currentQuestion.question}
                </motion.h2>
              </motion.div>
            )}
            
            {animationStage === "optionPulse" && (
              <motion.div
                key="optionPulse"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4"
              >
                <motion.h2
                  className="text-2xl md:text-4xl font-bold text-white text-center mb-8 max-w-3xl"
                >
                  {currentQuestion.question}
                </motion.h2>
                <div className="grid grid-cols-2 gap-4 max-w-2xl w-full">
                  {["A", "B", "C", "D"].map((letter, i) => {
                    const option = currentQuestion[`option${letter}` as keyof SequenceQuestion] as string;
                    return (
                      <motion.div
                        key={letter}
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: i * 0.15, type: "spring", stiffness: 300 }}
                        className="p-6 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl text-white text-center shadow-xl"
                      >
                        <div className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto mb-3 text-2xl font-black">
                          {letter}
                        </div>
                        <p className="text-lg font-semibold">{option}</p>
                      </motion.div>
                    );
                  })}
                </div>
                <p className="text-white/60 mt-6 text-sm">Get ready to tap...</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {gameState === "playing" && currentQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline">Q{currentQuestionIndex}/{totalQuestions}</Badge>
                <Badge variant="secondary" className="gap-1">
                  <Users className="w-4 h-4" />
                  {submissions.length} submitted
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-orange-500" />
                  <span className={`text-3xl font-mono font-bold ${timerSeconds <= 5 ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
                    {timerSeconds}s
                  </span>
                </div>
              </div>
            </div>
            
            <Progress value={((15 - timerSeconds) / 15) * 100} className="h-3 bg-muted" />

            <Card className="p-8 text-center bg-gradient-to-br from-card to-muted/50">
              <h2 className="text-3xl font-bold mb-8">{currentQuestion.question}</h2>
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {["A", "B", "C", "D"].map((letter) => {
                  const option = currentQuestion[`option${letter}` as keyof SequenceQuestion] as string;
                  return (
                    <motion.div
                      key={letter}
                      whileHover={{ scale: 1.02 }}
                      className="p-6 bg-card rounded-xl border-2 border-border shadow-lg"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center mx-auto mb-3 text-xl font-bold shadow-md">
                        {letter}
                      </div>
                      <p className="text-lg font-medium">{option}</p>
                    </motion.div>
                  );
                })}
              </div>
              {currentQuestion.hint && (
                <p className="mt-6 text-muted-foreground italic">Hint: {currentQuestion.hint}</p>
              )}
            </Card>

            <div className="flex justify-center gap-3">
              <Button size="lg" variant="destructive" onClick={revealAnswer} data-testid="button-reveal">
                <Zap className="w-5 h-5 mr-2" />
                Force Reveal Now
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => {
                  revealAnswer();
                  const nextIdx = currentQuestionIndex;
                  if (nextIdx < questions.length) {
                    setTimeout(() => startQuestion(questions[nextIdx], nextIdx), 3000);
                  }
                }}
                data-testid="button-skip"
              >
                <SkipForward className="w-5 h-5 mr-2" />
                Skip Question
              </Button>
            </div>
          </motion.div>
        )}

        {gameState === "revealing" && currentQuestion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {winner && (
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="text-center py-6 px-8 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 rounded-2xl border-2 border-amber-500/30"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 0.5, repeat: 3 }}
                >
                  <Crown className="w-16 h-16 mx-auto text-amber-500 mb-2" />
                </motion.div>
                <h2 className="text-3xl font-black text-amber-600 dark:text-amber-400">FASTEST FINGER!</h2>
                <p className="text-2xl font-bold mt-2">{winner.playerName}</p>
                <p className="text-muted-foreground">{(winner.timeMs / 1000).toFixed(2)} seconds</p>
                <Badge className="mt-2 bg-amber-500">+10 points</Badge>
              </motion.div>
            )}

            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Correct Order</h2>
              <div className="flex justify-center gap-3 py-4">
                {(currentQuestion.correctOrder as string[]).map((letter, idx) => {
                  const option = currentQuestion[`option${letter}` as keyof SequenceQuestion] as string;
                  return (
                    <motion.div
                      key={letter}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.2 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-xl font-bold shadow-lg">
                        {letter}
                      </div>
                      <p className="mt-2 text-xs font-medium max-w-20 truncate">{option}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                  <Medal className="w-4 h-4 text-amber-500" />
                  Top 3 Leaderboard
                </h3>
                {leaderboard.length === 0 ? (
                  <p className="text-muted-foreground text-center py-2 text-sm">No scores yet</p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.slice(0, 3).map((entry, idx) => (
                      <div
                        key={entry.playerId}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          idx === 0 ? 'bg-amber-500/10 border border-amber-500/30' :
                          idx === 1 ? 'bg-slate-400/10 border border-slate-400/30' :
                          'bg-orange-600/10 border border-orange-600/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {idx === 0 && <Star className="w-4 h-4 text-amber-500" />}
                          {idx === 1 && <Star className="w-4 h-4 text-slate-400" />}
                          {idx === 2 && <Star className="w-4 h-4 text-orange-600" />}
                          <span className="font-medium text-sm">{entry.playerName}</span>
                        </div>
                        <span className="font-bold text-sm">{entry.score} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                  <Trophy className="w-4 h-4 text-teal-500" />
                  Round Results
                </h3>
                {submissions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-2 text-sm">No submissions</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {submissions
                      .sort((a, b) => {
                        if (a.isCorrect && !b.isCorrect) return -1;
                        if (!a.isCorrect && b.isCorrect) return 1;
                        return a.timeMs - b.timeMs;
                      })
                      .map((sub, idx) => (
                        <div
                          key={sub.playerId}
                          className={`flex items-center justify-between p-2 rounded text-sm ${
                            sub.isCorrect ? 'bg-emerald-500/10' : 'bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {idx === 0 && sub.isCorrect && <Crown className="w-3 h-3 text-amber-500" />}
                            <span className="font-medium">{sub.playerName}</span>
                            {sub.isCorrect ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <X className="w-3 h-3 text-destructive" />
                            )}
                          </div>
                          <span className="text-muted-foreground text-xs">{(sub.timeMs / 1000).toFixed(2)}s</span>
                        </div>
                      ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="flex justify-center gap-3 flex-wrap">
              <Button onClick={resetGame} data-testid="button-next">
                <RefreshCw className="w-4 h-4 mr-2" />
                Next Question
              </Button>
              <Button 
                variant="outline" 
                onClick={() => ws?.send(JSON.stringify({ type: "sequence:host:showLeaderboard" }))}
                data-testid="button-show-leaderboard"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Full Leaderboard
              </Button>
              {currentQuestionIndex >= totalQuestions && (
                <Button 
                  variant="secondary"
                  onClick={() => ws?.send(JSON.stringify({ type: "sequence:host:endGame" }))}
                  data-testid="button-end-game"
                >
                  <Star className="w-4 h-4 mr-2" />
                  End Game
                </Button>
              )}
            </div>
          </motion.div>
        )}
        
        {gameState === "leaderboard" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <Trophy className="w-16 h-16 mx-auto text-amber-500 mb-4" />
            <h2 className="text-3xl font-bold mb-6">Session Leaderboard</h2>
            <Card className="max-w-md mx-auto p-6">
              {leaderboard.length === 0 ? (
                <p className="text-muted-foreground">No scores yet</p>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry, idx) => (
                    <motion.div
                      key={entry.playerId}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        idx === 0 ? 'bg-amber-500/20 border-2 border-amber-500' :
                        idx === 1 ? 'bg-slate-400/20 border border-slate-400' :
                        idx === 2 ? 'bg-orange-600/20 border border-orange-600' :
                        'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black">{idx + 1}</span>
                        <span className="font-semibold">{entry.playerName}</span>
                      </div>
                      <span className="text-xl font-bold">{entry.score} pts</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={resetGame} data-testid="button-continue">
                Continue Playing
              </Button>
              <Button 
                variant="secondary"
                onClick={() => ws?.send(JSON.stringify({ type: "sequence:host:endGame" }))}
                data-testid="button-end-game-lb"
              >
                End Game
              </Button>
            </div>
          </motion.div>
        )}
        
        {gameState === "gameComplete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Trophy className="w-24 h-24 mx-auto text-amber-500 mb-4" />
            </motion.div>
            <h1 className="text-4xl font-black mb-2">GAME OVER!</h1>
            {leaderboard[0] && (
              <>
                <h2 className="text-2xl font-bold text-amber-500 mb-1">WINNER</h2>
                <p className="text-3xl font-black">{leaderboard[0].playerName}</p>
                <p className="text-xl text-muted-foreground">{leaderboard[0].score} points</p>
              </>
            )}
            <Card className="max-w-md mx-auto mt-8 p-6">
              <h3 className="font-semibold mb-4">Final Standings</h3>
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => (
                  <div
                    key={entry.playerId}
                    className={`flex items-center justify-between p-2 rounded ${
                      idx === 0 ? 'bg-amber-500/20' : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{idx + 1}.</span>
                      <span>{entry.playerName}</span>
                    </div>
                    <span className="font-bold">{entry.score} pts</span>
                  </div>
                ))}
              </div>
            </Card>
            <div className="mt-8">
              <Button 
                size="lg"
                onClick={() => {
                  ws?.send(JSON.stringify({ type: "sequence:host:resetScores" }));
                  setGameState("waiting");
                  setLeaderboard([]);
                }}
                data-testid="button-new-game"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Start New Game
              </Button>
            </div>
          </motion.div>
        )}
      </main>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Question</DialogTitle>
            <DialogDescription>
              Add a new sequence question for players to solve
            </DialogDescription>
          </DialogHeader>
          <CreateQuestionForm
            onSubmit={(data) => createQuestionMutation.mutate(data)}
            isLoading={createQuestionMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join the Game</DialogTitle>
            <DialogDescription>Scan this QR code or use the room code</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <QRCodeSVG value={joinUrl} size={256} />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Room Code</p>
              <p className="text-4xl font-mono font-bold">{roomCode}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateQuestionForm({ onSubmit, isLoading }: {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOrder, setCorrectOrder] = useState<string[]>([]);
  const [hint, setHint] = useState("");

  const handleLetterClick = (letter: string) => {
    if (correctOrder.includes(letter)) {
      setCorrectOrder(correctOrder.filter(l => l !== letter));
    } else if (correctOrder.length < 4) {
      setCorrectOrder([...correctOrder, letter]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (correctOrder.length !== 4) return;
    
    onSubmit({
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOrder,
      hint: hint || null,
      isActive: true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Question</label>
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., Put these years in order from earliest to latest:"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {["A", "B", "C", "D"].map((letter) => (
          <div key={letter}>
            <label className="text-sm font-medium mb-1.5 block">Option {letter}</label>
            <Input
              value={letter === "A" ? optionA : letter === "B" ? optionB : letter === "C" ? optionC : optionD}
              onChange={(e) => {
                if (letter === "A") setOptionA(e.target.value);
                else if (letter === "B") setOptionB(e.target.value);
                else if (letter === "C") setOptionC(e.target.value);
                else setOptionD(e.target.value);
              }}
              placeholder={`Option ${letter}`}
              required
            />
          </div>
        ))}
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Correct Order (tap in order)</label>
        <div className="flex gap-2 mb-2">
          {["A", "B", "C", "D"].map((letter) => (
            <Button
              key={letter}
              type="button"
              variant={correctOrder.includes(letter) ? "default" : "outline"}
              className="w-10 h-10"
              onClick={() => handleLetterClick(letter)}
            >
              {letter}
            </Button>
          ))}
        </div>
        {correctOrder.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Order: {correctOrder.join(" → ")}
            {correctOrder.length < 4 && " (tap more)"}
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Hint (optional)</label>
        <Input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="A helpful hint for players"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading || correctOrder.length !== 4}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Question"}
      </Button>
    </form>
  );
}
