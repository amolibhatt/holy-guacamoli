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
  Trophy, Trash2, Edit, Check, X, Loader2, Clock, Zap,
  ChevronDown, ChevronUp, Sparkles, Crown, RefreshCw, SkipForward,
  Volume2, VolumeX, Medal, Star, User, Flame, Plus, Minus, Settings, HelpCircle
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { GameRulesSheet } from "@/components/GameRules";
import type { SequenceQuestion, SequenceSession, SequenceSubmission } from "@shared/schema";
import { PLAYER_AVATARS } from "@shared/schema";

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
  correctAnswers: number;
  wrongAnswers: number;
  avgTimeMs: number;
  currentStreak: number;
  bestStreak: number;
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
  const [showRules, setShowRules] = useState(false);
  const [animationStage, setAnimationStage] = useState<AnimationStage>(null);
  const [isPaused, setIsPaused] = useState(false);
  const animationTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<SequenceQuestion | null>(null);
  const [shuffledQuestion, setShuffledQuestion] = useState<{ optionA: string; optionB: string; optionC: string; optionD: string } | null>(null);
  const [shuffledCorrectOrder, setShuffledCorrectOrder] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(1);
  const [submissions, setSubmissions] = useState<PlayerSubmission[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<SequenceQuestion | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [players, setPlayers] = useState<{ id: string; name: string; avatar?: string }[]>([]);
  const [winner, setWinner] = useState<WinnerInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [pointsPerRound, setPointsPerRound] = useState(10);
  const [questionsToPlay, setQuestionsToPlay] = useState<number | null>(null);
  const [gameQuestions, setGameQuestions] = useState<SequenceQuestion[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const submissionsRef = useRef<PlayerSubmission[]>([]);
  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const hasAutoStartedRef = useRef(false);
  const elapsedTimerRef = useRef<number | null>(null);

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

  const connectWebSocket = useCallback((continueFromPrevious: boolean = false) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    const existingRoomCode = continueFromPrevious ? localStorage.getItem("buzzer-room-code") : null;

    socket.onopen = () => {
      if (existingRoomCode) {
        socket.send(JSON.stringify({ type: "host:join", code: existingRoomCode }));
      } else {
        socket.send(JSON.stringify({ type: "sequence:host:create" }));
      }
    };

    socket.onmessage = (event) => {
      try {
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
              score: p.score || 0,
              correctAnswers: p.correctAnswers || 0,
              wrongAnswers: p.wrongAnswers || 0,
              avgTimeMs: p.avgTimeMs || 0,
              currentStreak: p.currentStreak || 0,
              bestStreak: p.bestStreak || 0,
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
          playAudio("join");
          toast({ title: `${data.playerName} joined!` });
          setPlayers(prev => [...prev.filter(p => p.id !== data.playerId), { 
            id: data.playerId, 
            name: data.playerName, 
            avatar: data.playerAvatar 
          }]);
          break;
        case "sequence:question:started":
          setGameState("playing");
          setCurrentQuestionIndex(data.questionIndex || 1);
          setTotalQuestions(data.totalQuestions || 1);
          if (data.question) {
            setCurrentQuestion(prev => prev?.correctOrder ? prev : data.question);
          }
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
          animationTimeoutsRef.current.forEach(clearTimeout);
          animationTimeoutsRef.current = [];
          const t1 = setTimeout(() => setAnimationStage("questionDrop"), 1200);
          const t2 = setTimeout(() => {
            setAnimationStage("optionPulse");
            playAudio("whoosh");
          }, 2000);
          animationTimeoutsRef.current = [t1, t2];
          break;
        case "sequence:answering:started":
          setGameState("playing");
          setAnimationStage(null);
          break;
        case "sequence:submission":
          setSubmissions(prev => {
            const newSubmissions = [...prev, data.submission];
            submissionsRef.current = newSubmissions;
            return newSubmissions;
          });
          break;
        case "sequence:allSubmitted":
          socket.send(JSON.stringify({ type: "sequence:host:reveal" }));
          break;
        case "sequence:round:started":
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
            playAudio("correct");
            playAudio("winner");
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
        case "sequence:pointsAdjusted":
          if (data.leaderboard) {
            setLeaderboard(data.leaderboard);
          }
          toast({ 
            title: data.delta > 0 ? `+${data.delta} points awarded` : `${data.delta} points deducted`,
          });
          break;
        case "player:left":
          toast({ title: `${data.playerName} left the game` });
          setPlayers(prev => prev.filter(p => p.id !== data.playerId));
          break;
      }
      } catch { /* ignore parse errors */ }
    };

    socket.onclose = () => {
      setRoomCode(null);
      setGameState("setup");
      hasAutoStartedRef.current = false;
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
  
  const playAudio = useCallback((type: "countdown" | "whoosh" | "buzzer" | "winner" | "join" | "correct") => {
    if (!audioEnabled) return;
    try {
      const ctx = getAudioContext();
      const frequencies: Record<string, { freqs: number[]; type: OscillatorType; duration: number }> = {
        countdown: { freqs: [440, 520, 600], type: "sine", duration: 0.1 },
        whoosh: { freqs: [800, 600, 400, 300], type: "sine", duration: 0.08 },
        buzzer: { freqs: [300, 200, 150], type: "sawtooth", duration: 0.15 },
        winner: { freqs: [523, 659, 784, 880, 1047], type: "sine", duration: 0.12 },
        join: { freqs: [660, 880], type: "sine", duration: 0.08 },
        correct: { freqs: [523, 659, 784], type: "sine", duration: 0.1 },
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

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startQuestion = useCallback((question: SequenceQuestion, idx?: number) => {
    const questionIdx = idx !== undefined ? idx + 1 : currentQuestionIndex;
    setCurrentQuestion(question);
    setSubmissions([]);
    submissionsRef.current = [];
    setWinner(null);
    setCurrentQuestionIndex(questionIdx);

    const originalOptions = [
      { letter: "A", text: question.optionA },
      { letter: "B", text: question.optionB },
      { letter: "C", text: question.optionC },
      { letter: "D", text: question.optionD },
    ];
    const shuffledOptions = shuffleArray(originalOptions);
    
    const shuffledToOriginal: Record<string, string> = {};
    const letters = ["A", "B", "C", "D"];
    shuffledOptions.forEach((opt, i) => {
      shuffledToOriginal[letters[i]] = opt.letter;
    });

    const newShuffledCorrectOrder = question.correctOrder.map(origLetter => {
      const newLetter = letters.find(l => shuffledToOriginal[l] === origLetter);
      return newLetter || origLetter;
    });

    const newShuffledQuestion = {
      optionA: shuffledOptions[0].text,
      optionB: shuffledOptions[1].text,
      optionC: shuffledOptions[2].text,
      optionD: shuffledOptions[3].text,
    };
    
    setShuffledQuestion(newShuffledQuestion);
    setShuffledCorrectOrder(newShuffledCorrectOrder);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: "sequence:host:startQuestion", 
        question: {
          id: question.id,
          question: question.question,
          ...newShuffledQuestion,
          hint: question.hint,
        },
        correctOrder: newShuffledCorrectOrder,
        questionIndex: questionIdx,
        totalQuestions: totalQuestions,
        pointsPerRound,
      }));
    }
  }, [ws, pointsPerRound, totalQuestions, currentQuestionIndex]);

  const revealAnswer = useCallback(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "sequence:host:reveal" }));
  }, [ws]);

  const showResults = () => {
    setGameState("results");
  };

  const skipAnimation = useCallback(() => {
    animationTimeoutsRef.current.forEach(clearTimeout);
    animationTimeoutsRef.current = [];
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "sequence:host:startAnswering" }));
    }
    setGameState("playing");
    setAnimationStage(null);
  }, [ws]);

  const advanceToNextQuestion = useCallback(() => {
    setSubmissions([]);
    submissionsRef.current = [];
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "sequence:host:reset" }));
    }
    
    const nextIdx = currentQuestionIndex;
    if (nextIdx < gameQuestions.length) {
      startQuestion(gameQuestions[nextIdx], nextIdx);
    } else {
      setCurrentQuestion(null);
      setGameState("waiting");
    }
  }, [ws, currentQuestionIndex, gameQuestions, startQuestion]);

  const resetGame = useCallback(() => {
    setCurrentQuestion(null);
    setSubmissions([]);
    submissionsRef.current = [];
    setGameState("waiting");
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "sequence:host:reset" }));
    }
  }, [ws]);


  // Auto-create room on page load (skip intro)
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading && !ws && gameState === "setup" && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      connectWebSocket(false);
    }
  }, [isAuthenticated, isAuthLoading, ws, gameState, connectWebSocket]);

  useEffect(() => {
    return () => {
      if (ws) ws.close();
      animationTimeoutsRef.current.forEach(clearTimeout);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [ws]);

  useEffect(() => {
    if (gameState === "playing" || gameState === "animatedReveal") {
      setElapsedTime(0);
      elapsedTimerRef.current = window.setInterval(() => {
        setElapsedTime(t => t + 100);
      }, 100);
    } else {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    }
    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    };
  }, [gameState]);


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

  const joinUrl = `${window.location.origin}/sortcircuit/${roomCode}`;

  return (
    <div 
      className="h-screen overflow-hidden flex flex-col relative bg-[#0a0a0f] text-white" 
      style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)'
      }}
    >
      {/* Subtle neon corner gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-teal-500/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-500/5 blur-3xl" />
        <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-gradient-to-br from-teal-500/15 to-transparent blur-2xl" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500/15 to-transparent blur-2xl" />
        {/* Floating particles */}
        <motion.div 
          className="absolute top-1/4 right-[15%] w-2 h-2 rounded-full bg-teal-400/30"
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div 
          className="absolute top-1/3 left-[10%] w-1.5 h-1.5 rounded-full bg-cyan-400/30"
          animate={{ y: [0, -15, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-[20%] w-1 h-1 rounded-full bg-teal-400/40"
          animate={{ y: [0, -10, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        />
      </div>

      <AppHeader minimal backHref="/" title="Sort Circuit" />

      <main className="flex-1 flex flex-col min-h-0 px-4 py-4 max-w-6xl mx-auto w-full">
        {gameState === "setup" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-20"
          >
            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            <span className="ml-3 text-muted-foreground">Creating room...</span>
          </motion.div>
        )}

        {gameState === "waiting" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col min-h-0 relative z-10"
          >
            <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
              {/* Left: Join Section */}
              <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/10 md:w-80 shrink-0">
                {/* QR Code */}
                <div 
                  className="bg-white p-3 rounded-lg" 
                  data-testid="container-qr-code"
                >
                  <QRCodeSVG value={joinUrl} size={120} />
                </div>
                
                {/* Room code */}
                <div className="mt-3 text-center">
                  <p className="text-white/40 text-[10px] uppercase tracking-wide">Room Code</p>
                  <p 
                    className="font-mono font-black text-2xl tracking-widest text-white"
                    data-testid="text-room-code"
                  >
                    {roomCode}
                  </p>
                </div>

                {/* Start Button */}
                <Button 
                  className={`h-10 text-sm w-full mt-3 ${
                    players.length > 0 
                      ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0" 
                      : "bg-white/5 text-white/30 border border-white/10"
                  }`}
                  onClick={() => {
                    if (questions.length > 0) {
                      const count = questionsToPlay ?? questions.length;
                      const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, count);
                      setGameQuestions(shuffled);
                      setTotalQuestions(shuffled.length);
                      startQuestion(shuffled[0], 0);
                    }
                  }}
                  disabled={players.length === 0 || questions.length === 0}
                  data-testid="button-begin-game"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Begin Game
                </Button>
                
                {players.length === 0 && (
                  <p className="text-[10px] text-white/40 mt-1">Waiting for players...</p>
                )}

                {/* Settings */}
                <div className="mt-3 pt-3 border-t border-white/10 w-full space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-white/50">Questions</span>
                    <div className="flex items-center gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-white/60"
                        onClick={() => setQuestionsToPlay(q => Math.max(1, (q ?? questions.length) - 1))}
                        data-testid="button-questions-decrease"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="font-bold text-sm w-6 text-center text-white" data-testid="text-questions-count">
                        {questionsToPlay ?? questions.length}
                      </span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-white/60"
                        onClick={() => setQuestionsToPlay(q => Math.min(questions.length, (q ?? questions.length) + 1))}
                        data-testid="button-questions-increase"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-white/50">Points</span>
                    <div className="flex items-center gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-white/60"
                        onClick={() => setPointsPerRound(p => Math.max(5, p - 5))}
                        data-testid="button-points-decrease"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="font-bold text-sm w-6 text-center text-white" data-testid="text-points-per-round">{pointsPerRound}</span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-white/60"
                        onClick={() => setPointsPerRound(p => Math.min(50, p + 5))}
                        data-testid="button-points-increase"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Players */}
              <div className="flex-1 flex flex-col min-h-0 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2" data-testid="text-players-header">
                    <Users className="w-4 h-4 text-teal-400" />
                    Players
                  </h2>
                  <Badge 
                    className={`text-xs ${
                      players.length > 0 
                        ? "bg-teal-500/20 text-teal-300 border-teal-500/30" 
                        : "bg-white/10 text-white/50 border-white/20"
                    }`} 
                    data-testid="badge-player-count"
                  >
                    {players.length}
                  </Badge>
                </div>

                {players.length === 0 ? (
                  <div 
                    className="flex-1 flex flex-col items-center justify-center" 
                    data-testid="card-players-empty"
                  >
                    <Users className="w-8 h-8 text-white/20 mb-2" />
                    <p className="text-white/40 text-xs">Waiting for players...</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto min-h-0" data-testid="card-players">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      <AnimatePresence>
                        {players.map((p) => {
                          const playerData = leaderboard.find(l => l.playerId === p.id);
                          const playerScore = playerData?.score || 0;
                          const streak = playerData?.currentStreak || 0;
                          const avatarData = PLAYER_AVATARS.find(a => a.id === p.avatar);
                          return (
                            <motion.div 
                              key={p.id}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              className="flex flex-col items-center p-2 bg-white/5 rounded-lg border border-white/10"
                              data-testid={`player-card-${p.id}`}
                            >
                              <div className="text-2xl">
                                {avatarData?.emoji || <User className="w-6 h-6 text-teal-400" />}
                              </div>
                              <span className="font-medium text-[10px] text-center text-white truncate w-full" data-testid={`text-player-name-${p.id}`}>
                                {p.name}
                              </span>
                              {(playerScore > 0 || streak >= 2) && (
                                <div className="flex items-center gap-1">
                                  {playerScore > 0 && (
                                    <span className="text-[10px] text-teal-300" data-testid={`text-player-score-${p.id}`}>
                                      {playerScore}
                                    </span>
                                  )}
                                  {streak >= 2 && (
                                    <span className="inline-flex items-center text-[10px] text-amber-400">
                                      <Flame className="w-2 h-2" />
                                      {streak}
                                    </span>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
                className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]"
              >
                {/* Neon gradient overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-teal-500/10 blur-3xl" />
                  <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-cyan-500/10 blur-3xl" />
                </div>
                <div className="text-center text-white relative z-10">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="mb-6"
                  >
                    <Sparkles className="w-16 h-16 mx-auto text-cyan-400" />
                  </motion.div>
                  <h1 
                    className="text-5xl md:text-7xl font-black mb-4"
                    style={{
                      background: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    Question {currentQuestionIndex}
                  </h1>
                  <p className="text-2xl md:text-3xl text-white/60">
                    Get Ready...
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="absolute bottom-8 right-8 text-slate-400"
                  onClick={skipAnimation}
                  data-testid="button-skip-animation"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Skip
                </Button>
              </motion.div>
            )}
            
            {animationStage === "questionDrop" && (
              <motion.div
                key="questionDrop"
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-20 bg-[#0a0a0f]"
              >
                <motion.h2
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="text-3xl md:text-5xl font-black text-white text-center px-8 max-w-4xl"
                >
                  {currentQuestion.question}
                </motion.h2>
                <Button
                  variant="ghost"
                  className="absolute bottom-8 right-8 text-slate-400"
                  onClick={skipAnimation}
                  data-testid="button-skip-animation"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Skip
                </Button>
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
                        className="p-6 bg-white/5 backdrop-blur-sm rounded-xl text-white text-center border border-white/10"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
                          {letter}
                        </div>
                        <p className="text-lg font-semibold text-white">{option}</p>
                      </motion.div>
                    );
                  })}
                </div>
                <p className="text-white/50 mt-6 text-sm">
                  Preparing to sequence...
                </p>
                <Button
                  variant="ghost"
                  className="absolute bottom-8 right-8 text-slate-400"
                  onClick={skipAnimation}
                  data-testid="button-skip-animation"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Skip
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {gameState === "playing" && currentQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 relative z-10"
          >
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
                    style={{ width: `${(currentQuestionIndex / totalQuestions) * 100}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentQuestionIndex / totalQuestions) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-sm text-white/60 font-mono">{currentQuestionIndex}/{totalQuestions}</span>
              </div>
            </div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <Badge className="gap-1 font-mono bg-white/10 text-white/70 border border-white/20" data-testid="badge-elapsed-time">
                  <Clock className="w-4 h-4" />
                  {(elapsedTime / 1000).toFixed(1)}s
                </Badge>
                <Badge className="gap-1 bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  <Users className="w-4 h-4" />
                  {submissions.length}/{players.length} locked in
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="lg" variant="outline" onClick={() => setIsPaused(true)} data-testid="button-pause">
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </Button>
                <Button size="lg" variant="destructive" onClick={revealAnswer} data-testid="button-force-reveal-top">
                  <Zap className="w-5 h-5 mr-2" />
                  Force Reveal
                </Button>
              </div>
            </div>
            
            {/* Pause Overlay */}
            <AnimatePresence>
              {isPaused && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
                >
                  <div className="text-center text-white">
                    <Pause className="w-20 h-20 mx-auto mb-4 opacity-50" />
                    <h2 className="text-4xl font-bold mb-6">Game Paused</h2>
                    <Button size="lg" onClick={() => setIsPaused(false)} data-testid="button-resume">
                      <Play className="w-5 h-5 mr-2" />
                      Resume
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {submissions.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/10">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-white/80">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Live Ticker
                </h3>
                <div className="flex flex-wrap gap-2">
                  {submissions.map((sub) => {
                    const playerStats = leaderboard.find(l => l.playerId === sub.playerId);
                    const streak = playerStats?.currentStreak || 0;
                    return (
                      <motion.div
                        key={sub.playerId}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full"
                      >
                        <span className="font-medium text-sm text-white">{sub.playerName}</span>
                        <span className="text-xs text-white/50">LOCKED IN!</span>
                        <span className="text-xs font-mono text-cyan-400">({(sub.timeMs / 1000).toFixed(2)}s)</span>
                        {streak >= 2 && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-amber-500">
                            <Flame className="w-3 h-3" />
                            {streak}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-8 text-center bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <h2 className="text-3xl font-bold mb-8 text-white">{currentQuestion.question}</h2>
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {["A", "B", "C", "D"].map((letter) => {
                  const option = shuffledQuestion ? shuffledQuestion[`option${letter}` as keyof typeof shuffledQuestion] : currentQuestion[`option${letter}` as keyof SequenceQuestion] as string;
                  return (
                    <motion.div
                      key={letter}
                      whileHover={{ scale: 1.02 }}
                      className="p-6 bg-white/5 rounded-xl border border-white/10"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                        {letter}
                      </div>
                      <p className="text-lg font-medium text-white">{option}</p>
                    </motion.div>
                  );
                })}
              </div>
              {currentQuestion.hint && (
                <p className="mt-6 text-white/50 italic">Hint: {currentQuestion.hint}</p>
              )}
            </div>

            {submissions.length === 0 && (
              <div className="text-center py-4">
                <p className="text-white/40">
                  Waiting for players to lock in their sequences...
                </p>
              </div>
            )}
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
                <Badge className="mt-2 bg-amber-500">+{pointsPerRound} points</Badge>
              </motion.div>
            )}

            <div className="text-center">
              <h2 className="text-xl font-bold mb-4 text-white">Correct Order</h2>
              <div className="flex flex-col gap-3 max-w-md mx-auto">
                {shuffledCorrectOrder.length > 0 && shuffledQuestion && shuffledCorrectOrder.map((letter, idx) => {
                  const option = shuffledQuestion[`option${letter}` as keyof typeof shuffledQuestion] as string;
                  return (
                    <motion.div
                      key={letter}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.2 }}
                      className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center text-lg font-bold shadow-lg shrink-0">
                        {letter}
                      </div>
                      <p className="text-white font-medium text-left flex-1">{option}</p>
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
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-xs mr-2">{(sub.timeMs / 1000).toFixed(2)}s</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => ws?.send(JSON.stringify({ 
                                type: "sequence:host:adjustPoints", 
                                playerId: sub.playerId, 
                                delta: pointsPerRound 
                              }))}
                              data-testid={`button-award-${sub.playerId}`}
                            >
                              <Plus className="w-3 h-3 text-emerald-500" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => ws?.send(JSON.stringify({ 
                                type: "sequence:host:adjustPoints", 
                                playerId: sub.playerId, 
                                delta: -pointsPerRound 
                              }))}
                              data-testid={`button-deduct-${sub.playerId}`}
                            >
                              <Minus className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Everyone's Answers - Full Width */}
            <Card className="p-4 bg-white/5 border-white/10" data-testid="section-everyones-answers">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                <Users className="w-4 h-4 text-cyan-400" />
                Everyone's Answers
              </h3>
              {submissions.length === 0 ? (
                <p className="text-white/50 text-center py-4">No one submitted an answer</p>
              ) : (
                <div className="space-y-3">
                  {submissions
                    .sort((a, b) => {
                      if (a.isCorrect && !b.isCorrect) return -1;
                      if (!a.isCorrect && b.isCorrect) return 1;
                      return a.timeMs - b.timeMs;
                    })
                    .map((sub, idx) => {
                      const matchCount = sub.sequence.filter((letter, i) => letter === shuffledCorrectOrder[i]).length;
                      const avatarEmoji = sub.playerAvatar ? PLAYER_AVATARS.find(a => a.id === sub.playerAvatar)?.emoji : null;
                      return (
                        <motion.div
                          key={sub.playerId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`p-3 rounded-xl border ${
                            sub.isCorrect 
                              ? 'bg-emerald-500/10 border-emerald-500/30' 
                              : matchCount >= 3 
                                ? 'bg-amber-500/10 border-amber-500/30'
                                : 'bg-white/5 border-white/10'
                          }`}
                          data-testid={`player-answer-row-${sub.playerId}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              {avatarEmoji ? (
                                <span className="text-lg">{avatarEmoji}</span>
                              ) : (
                                <User className="w-5 h-5 text-white/60" />
                              )}
                              <span className="font-semibold text-white">{sub.playerName}</span>
                              {idx === 0 && sub.isCorrect && (
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Winner
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/50 font-mono">{(sub.timeMs / 1000).toFixed(2)}s</span>
                              {sub.isCorrect ? (
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                                  <Check className="w-3 h-3 mr-1" />
                                  Correct
                                </Badge>
                              ) : matchCount >= 3 ? (
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                                  So Close! ({matchCount}/4)
                                </Badge>
                              ) : (
                                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                                  <X className="w-3 h-3 mr-1" />
                                  {matchCount}/4 correct
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {sub.sequence.map((letter, i) => {
                              const isPositionCorrect = letter === shuffledCorrectOrder[i];
                              const option = shuffledQuestion ? shuffledQuestion[`option${letter}` as keyof typeof shuffledQuestion] : "";
                              return (
                                <div
                                  key={i}
                                  className={`flex-1 p-2 rounded-lg text-center transition-all ${
                                    isPositionCorrect 
                                      ? 'bg-emerald-500/30 border border-emerald-500/50' 
                                      : 'bg-red-500/20 border border-red-500/30'
                                  }`}
                                  data-testid={`sequence-cell-${sub.playerId}-${i}`}
                                  title={option}
                                >
                                  <div className={`text-lg font-bold ${isPositionCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                                    {letter}
                                  </div>
                                  <div className="text-[10px] text-white/50 truncate max-w-[60px]">
                                    {option}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              )}
            </Card>

            <div className="flex justify-center gap-3 flex-wrap">
              <Button onClick={advanceToNextQuestion} data-testid="button-next">
                <RefreshCw className="w-4 h-4 mr-2" />
                {currentQuestionIndex < totalQuestions ? "Next Question" : "Back to Lobby"}
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
            <h2 className="text-3xl font-bold mb-6">Scoreboard</h2>
            <Card className="max-w-2xl mx-auto p-6">
              {leaderboard.length === 0 ? (
                <p className="text-muted-foreground">No scores yet</p>
              ) : (
                <div className="space-y-4">
                  {leaderboard.map((entry, idx) => (
                    <motion.div
                      key={entry.playerId}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-4 rounded-lg ${
                        idx === 0 ? 'bg-amber-500/20 border-2 border-amber-500' :
                        idx === 1 ? 'bg-slate-400/20 border border-slate-400' :
                        idx === 2 ? 'bg-orange-600/20 border border-orange-600' :
                        'bg-muted/50'
                      }`}
                      data-testid={`scoreboard-entry-${entry.playerId}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-black">{idx + 1}</span>
                          <span className="text-xl font-semibold">{entry.playerName}</span>
                        </div>
                        <span className="text-2xl font-bold">{entry.score} pts</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded">
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>{entry.correctAnswers || 0} correct</span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-destructive/20 rounded">
                          <X className="w-3 h-3 text-destructive" />
                          <span>{entry.wrongAnswers || 0} wrong</span>
                        </div>
                        {entry.avgTimeMs > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span>{(entry.avgTimeMs / 1000).toFixed(1)}s avg</span>
                          </div>
                        )}
                        {entry.bestStreak > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 rounded">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span>{entry.bestStreak} best streak</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={advanceToNextQuestion} data-testid="button-continue">
                {currentQuestionIndex < totalQuestions ? "Next Question" : "Back to Lobby"}
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
            <Card className="max-w-2xl mx-auto mt-8 p-6">
              <h3 className="font-semibold mb-4 text-left">Final Standings</h3>
              <div className="space-y-3">
                {leaderboard.map((entry, idx) => (
                  <div
                    key={entry.playerId}
                    className={`p-3 rounded-lg text-left ${
                      idx === 0 ? 'bg-amber-500/20 border border-amber-500' : 'bg-muted/30'
                    }`}
                    data-testid={`final-standings-${entry.playerId}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{idx + 1}.</span>
                        <span className="font-semibold">{entry.playerName}</span>
                      </div>
                      <span className="font-bold text-lg">{entry.score} pts</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-emerald-500/20 rounded">{entry.correctAnswers || 0} correct</span>
                      <span className="px-2 py-0.5 bg-destructive/20 rounded">{entry.wrongAnswers || 0} wrong</span>
                      {entry.avgTimeMs > 0 && (
                        <span className="px-2 py-0.5 bg-blue-500/20 rounded">{(entry.avgTimeMs / 1000).toFixed(1)}s avg</span>
                      )}
                      {entry.bestStreak > 0 && (
                        <span className="px-2 py-0.5 bg-amber-500/20 rounded">{entry.bestStreak} streak</span>
                      )}
                    </div>
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
      
      {/* Floating Help Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-20 right-4 z-40 rounded-full shadow-lg bg-background/80 backdrop-blur-sm"
        onClick={() => setShowRules(true)}
        title="How to Play"
        data-testid="button-rules-sequence"
      >
        <HelpCircle className="w-5 h-5" />
      </Button>
      
      <GameRulesSheet 
        gameSlug="sequence_squeeze" 
        open={showRules} 
        onOpenChange={setShowRules} 
      />
      
      <AppFooter />
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
