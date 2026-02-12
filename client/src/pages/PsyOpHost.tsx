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
  Eye, Play, Users, Trophy, Loader2, Check,
  Crown, RefreshCw, ArrowLeft, Shuffle, Folder, HelpCircle,
  SkipForward, WifiOff, CheckCheck, User, Link2, MessageCircle,
  Sparkles, Target, Award, Zap
} from "lucide-react";
import { PLAYER_AVATARS } from "@shared/schema";
import { QRCodeSVG } from "qrcode.react";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { GameRulesSheet } from "@/components/GameRules";
import { neonColorConfig, BOARD_COLORS } from "@/lib/boardColors";
import type { PsyopQuestion } from "@shared/schema";

type GameState = "setup" | "waiting" | "animatedReveal" | "submitting" | "voting" | "revealing" | "roundLeaderboard" | "finished";
type AnimationStage = "teaser" | "questionDrop";

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
  liesBelieved: number;
  truthsSpotted: number;
  timesFooled: number;
  roundDelta?: number;
}

interface LieRecord {
  lieText: string;
  liarName: string;
  liarAvatar: string;
  fooledCount: number;
  questionText: string;
}

function fisherYatesShuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function CategoryCard({ category, count, index, neon, onClick }: {
  category: string;
  count: number;
  index: number;
  neon: typeof neonColorConfig[keyof typeof neonColorConfig];
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 + index * 0.05 }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full group text-left p-5 rounded-xl arcade-surface transition-all duration-200"
      style={{
        border: `1px solid ${isHovered ? neon.border : 'var(--arcade-border)'}`,
        boxShadow: isHovered
          ? `0 0 25px ${neon.glow}, 0 0 40px ${neon.shadowColor}, inset 0 0 0 1px ${neon.border}`
          : `0 0 8px ${neon.glow}`,
      }}
      data-testid={`button-category-${category}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0"
          style={{
            border: `2px solid ${neon.border}`,
            boxShadow: isHovered ? `0 0 15px ${neon.shadowColor}` : `0 0 8px ${neon.glow}`,
          }}
        >
          <Folder className="w-6 h-6 shrink-0" style={{ color: neon.icon }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="font-black truncate uppercase tracking-wide transition-colors duration-200 text-base"
            style={{
              fontFamily: "'Archivo Black', 'Impact', sans-serif",
              color: isHovered ? neon.text : 'var(--arcade-text)',
              textShadow: isHovered ? `0 0 12px ${neon.shadowColor}` : 'none',
            }}
            title={category}
          >
            {category}
          </h3>
          <p className="text-xs text-white/40 mt-1">
            {count} question{count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

export default function PsyOpHost() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [gameState, setGameState] = useState<GameState>("setup");
  const [showRules, setShowRules] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PsyopQuestion | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedQuestions, setSelectedQuestions] = useState<PsyopQuestion[]>([]);
  const [submissions, setSubmissions] = useState<PlayerSubmission[]>([]);
  const [voteOptions, setVoteOptions] = useState<VoteOption[]>([]);
  const [votes, setVotes] = useState<PlayerVote[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [players, setPlayers] = useState<{ id: string; name: string; avatar?: string }[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [hostDisconnected, setHostDisconnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [animationStage, setAnimationStage] = useState<AnimationStage>("teaser");
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [allLies, setAllLies] = useState<LieRecord[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameStateRef = useRef<GameState>("setup");
  const roomCodeRef = useRef<string | null>(null);
  const selectedQuestionsRef = useRef<PsyopQuestion[]>([]);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
  useEffect(() => { selectedQuestionsRef.current = selectedQuestions; }, [selectedQuestions]);

  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<PsyopQuestion[]>({
    queryKey: ["/api/psyop/questions"],
    enabled: isAuthenticated,
  });

  const connectWebSocket = useCallback((isReconnect = false) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onopen = () => {
      setHostDisconnected(false);
      reconnectAttemptsRef.current = 0;

      if (isReconnect && roomCodeRef.current) {
        socket.send(JSON.stringify({
          type: "psyop:host:rejoin",
          code: roomCodeRef.current,
          hostId: user?.id?.toString() || 'anonymous',
        }));
      } else {
        socket.send(JSON.stringify({
          type: "psyop:host:create",
          hostId: user?.id?.toString() || 'anonymous',
        }));
      }
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
          case "psyop:host:rejoined": {
            if (data.players) {
              setPlayers(data.players
                .filter((p: any) => p.isConnected)
                .map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  avatar: p.avatar,
                })));
            }
            if (data.submissions) {
              setSubmissions(data.submissions);
            }
            if (data.voteOptions) {
              setVoteOptions(data.voteOptions.map((o: any) => ({
                id: o.id,
                text: o.text,
                isTruth: o.isTruth ?? false,
                submitterId: o.submitterId,
                submitterName: o.submitterName,
              })));
            }
            if (data.votes) {
              setVotes(data.votes);
            }
            if (data.currentQuestion) {
              setCurrentQuestion(data.currentQuestion as PsyopQuestion);
            }
            if (data.questionIndex !== undefined) {
              setCurrentQuestionIndex(data.questionIndex);
            }
            if (data.leaderboard && data.leaderboard.length > 0) {
              setLeaderboard(data.leaderboard);
            }
            const phase = data.phase as GameState;
            if (phase && phase !== "setup") {
              setGameState(phase);
            }
            toast({ title: "Reconnected to game!" });
            break;
          }
          case "room:notFound":
            setHostDisconnected(false);
            reconnectAttemptsRef.current = 5;
            toast({
              title: "Room expired",
              description: "The game room was lost. Please start a new game.",
              variant: "destructive",
            });
            setGameState("setup");
            setRoomCode(null);
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
      const currentState = gameStateRef.current;
      if (currentState !== "setup" && currentState !== "finished") {
        setHostDisconnected(true);
        const attempts = reconnectAttemptsRef.current;
        if (attempts < 5) {
          reconnectAttemptsRef.current = attempts + 1;
          const delay = Math.min(2000 * Math.pow(1.5, attempts), 15000);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket(true);
          }, delay);
        } else {
          toast({
            title: "Connection lost",
            description: "Could not reconnect to the game server.",
            variant: "destructive",
          });
        }
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    wsRef.current = socket;
    setWs(socket);
    return socket;
  }, [toast, user?.id]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      wsRef.current?.close();
    };
  }, []);

  const activePlayerCount = players.length;

  const copyJoinLink = useCallback(() => {
    const url = roomCode ? `${window.location.origin}/play/${roomCode}` : "";
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast({ title: "Link copied!" });
      setTimeout(() => setCopied(false), 2000);
    });
  }, [roomCode, toast]);

  const startGame = useCallback(() => {
    if (selectedQuestions.length === 0) {
      toast({ title: "Select at least one question", variant: "destructive" });
      return;
    }
    if (players.length < 2) {
      toast({ title: "Need at least 2 players", variant: "destructive" });
      return;
    }
    
    setLeaderboard(players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      playerAvatar: p.avatar || "",
      score: 0,
      liesBelieved: 0,
      truthsSpotted: 0,
      timesFooled: 0,
    })));
    setAllLies([]);
    
    setCurrentQuestionIndex(0);
    setCurrentQuestion(selectedQuestions[0]);
    startAnimatedReveal(selectedQuestions[0], 0);
  }, [selectedQuestions, players, toast]);

  const startAnimatedReveal = useCallback((question: PsyopQuestion, qIndex: number) => {
    setCurrentQuestion(question);
    setCurrentQuestionIndex(qIndex);
    setAnimationStage("teaser");
    setGameState("animatedReveal");
    
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    animationTimerRef.current = setTimeout(() => {
      setAnimationStage("questionDrop");
      animationTimerRef.current = setTimeout(() => {
        startSubmissionPhase(question, qIndex);
      }, 2500);
    }, 2000);
  }, []);

  const skipAnimation = useCallback(() => {
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    if (currentQuestion) {
      startSubmissionPhase(currentQuestion, currentQuestionIndex);
    }
  }, [currentQuestion, currentQuestionIndex]);

  const startSubmissionPhase = useCallback((question: PsyopQuestion, qIndex?: number) => {
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
        correctAnswer: question.correctAnswer,
      },
      questionIndex: qIndex ?? currentQuestionIndex,
      totalQuestions: selectedQuestionsRef.current.length,
    }));
  }, [ws, currentQuestionIndex]);

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
    
    const shuffled = fisherYatesShuffle(options);
    setVoteOptions(shuffled);
    setGameState("voting");
    
    ws?.send(JSON.stringify({
      type: "psyop:start:voting",
      options: shuffled.map(o => ({ id: o.id, text: o.text })),
      fullOptions: shuffled.map(o => ({
        id: o.id,
        text: o.text,
        isTruth: o.isTruth,
        submitterId: o.submitterId,
        submitterName: o.submitterName,
      })),
    }));
  }, [currentQuestion, submissions, ws]);

  const moveToRevealing = useCallback(() => {
    setGameState("revealing");
    
    const scores: Record<string, number> = {};
    const roundLiesBelieved: Record<string, number> = {};
    const roundTruthsSpotted: Record<string, number> = {};
    const roundTimesFooled: Record<string, number> = {};
    
    votes.forEach(vote => {
      const votedOption = voteOptions.find(o => o.id === vote.votedForId);
      if (votedOption?.isTruth) {
        scores[vote.voterId] = (scores[vote.voterId] || 0) + 10;
        roundTruthsSpotted[vote.voterId] = (roundTruthsSpotted[vote.voterId] || 0) + 1;
      } else if (votedOption?.submitterId) {
        scores[votedOption.submitterId] = (scores[votedOption.submitterId] || 0) + 5;
        roundLiesBelieved[votedOption.submitterId] = (roundLiesBelieved[votedOption.submitterId] || 0) + 1;
        roundTimesFooled[vote.voterId] = (roundTimesFooled[vote.voterId] || 0) + 1;
      }
    });

    const newLieRecords: LieRecord[] = voteOptions
      .filter(o => !o.isTruth && o.submitterId && o.submitterName)
      .map(o => {
        const fooledCount = votes.filter(v => v.votedForId === o.id).length;
        const liarEntry = leaderboard.find(e => e.playerId === o.submitterId);
        return {
          lieText: o.text,
          liarName: o.submitterName!,
          liarAvatar: liarEntry?.playerAvatar || "",
          fooledCount,
          questionText: currentQuestion?.factText || "",
        };
      })
      .filter(r => r.fooledCount > 0);
    setAllLies(prev => [...prev, ...newLieRecords]);
    
    setLeaderboard(prev => {
      const updated = prev.map(e => ({ ...e, roundDelta: 0 }));
      Object.entries(scores).forEach(([playerId, points]) => {
        const existing = updated.find(e => e.playerId === playerId);
        if (existing) {
          existing.score += points;
          existing.roundDelta = points;
        }
      });
      Object.entries(roundLiesBelieved).forEach(([playerId, count]) => {
        const existing = updated.find(e => e.playerId === playerId);
        if (existing) existing.liesBelieved += count;
      });
      Object.entries(roundTruthsSpotted).forEach(([playerId, count]) => {
        const existing = updated.find(e => e.playerId === playerId);
        if (existing) existing.truthsSpotted += count;
      });
      Object.entries(roundTimesFooled).forEach(([playerId, count]) => {
        const existing = updated.find(e => e.playerId === playerId);
        if (existing) existing.timesFooled += count;
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
      roundLiesBelieved,
      roundTruthsSpotted,
    }));
  }, [votes, voteOptions, currentQuestion, ws, leaderboard]);

  useEffect(() => {
    if (ws && leaderboard.length > 0 && gameState !== "setup" && gameState !== "waiting") {
      ws.send(JSON.stringify({
        type: "psyop:sync:leaderboard",
        leaderboard,
      }));
    }
  }, [leaderboard, ws, gameState]);

  useEffect(() => {
    if (gameState === "submitting" && activePlayerCount > 0 && submissions.length >= activePlayerCount) {
      moveToVoting();
    }
  }, [gameState, activePlayerCount, submissions.length, moveToVoting]);

  const expectedVoters = activePlayerCount;
  useEffect(() => {
    if (gameState === "voting" && expectedVoters > 0 && votes.length >= expectedVoters) {
      moveToRevealing();
    }
  }, [gameState, expectedVoters, votes.length, moveToRevealing]);

  const showRoundLeaderboard = useCallback(() => {
    setGameState("roundLeaderboard");
  }, []);

  const nextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= selectedQuestions.length) {
      setGameState("finished");
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
    } else {
      startAnimatedReveal(selectedQuestions[nextIndex], nextIndex);
    }
  }, [currentQuestionIndex, selectedQuestions, startAnimatedReveal]);

  const skipQuestion = useCallback(() => {
    ws?.send(JSON.stringify({ type: "psyop:skip" }));
    nextQuestion();
  }, [nextQuestion, ws]);

  const startRematch = useCallback(() => {
    if (selectedQuestions.length === 0) {
      window.location.reload();
      return;
    }
    const reshuffled = fisherYatesShuffle(selectedQuestions);
    setSelectedQuestions(reshuffled);
    setLeaderboard(prev => prev.map(e => ({
      ...e,
      score: 0,
      liesBelieved: 0,
      truthsSpotted: 0,
      timesFooled: 0,
      roundDelta: 0,
    })));
    setAllLies([]);
    setSubmissions([]);
    setVotes([]);
    setVoteOptions([]);
    setCurrentQuestionIndex(0);
    setCurrentQuestion(reshuffled[0]);
    startAnimatedReveal(reshuffled[0], 0);

    ws?.send(JSON.stringify({ type: "psyop:rematch" }));
  }, [selectedQuestions, ws, startAnimatedReveal]);

  const categories = Array.from(new Set(questions.map(q => q.category).filter(Boolean))) as string[];
  
  const selectCategoryAndStart = (category: string) => {
    const categoryQuestions = questions.filter(q => q.category === category);
    const shuffled = fisherYatesShuffle(categoryQuestions);
    const selected = shuffled.slice(0, Math.min(5, shuffled.length));
    setSelectedQuestions(selected);
    connectWebSocket();
  };
  
  const shuffleAndStart = () => {
    const shuffled = fisherYatesShuffle(questions);
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to host games. Admin access is required.
          </p>
          <a href="/" className="text-primary hover:underline">Back to Home</a>
        </div>
      </div>
    );
  }

  const joinUrl = roomCode ? `${window.location.origin}/play/${roomCode}` : "";

  return (
    <div className="min-h-screen arcade-bg flex flex-col relative" data-testid="page-psyop-host">
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute w-full h-full opacity-[0.03]"
          style={{
            background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.5) 2px, rgba(255, 255, 255, 0.5) 4px)`,
          }}
        />
        <div 
          className="absolute w-full h-full"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 100% 100%, rgba(109, 40, 217, 0.05) 0%, transparent 50%)
            `,
          }}
        />
      </div>
      
      <AppHeader minimal backHref="/" title="PsyOp" />

      {hostDisconnected && (
        <div className="fixed top-16 left-0 right-0 z-50 bg-destructive/90 text-destructive-foreground text-center py-2 px-4 text-sm flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          Reconnecting to server...
        </div>
      )}

      <main className="flex-1 max-w-2xl mx-auto px-4 py-6 relative z-10 w-full">
        {gameState === "setup" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {isLoadingQuestions ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-xl arcade-surface border border-white/10 animate-pulse" />
                ))}
              </div>
            ) : questions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <div 
                  className="w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-5"
                  style={{ border: '2px solid var(--arcade-border)' }}
                >
                  <Eye className="w-10 h-10 text-white/30 shrink-0" />
                </div>
                <h3 
                  className="text-2xl font-black mb-3 text-white uppercase tracking-wide"
                  style={{ 
                    fontFamily: "'Archivo Black', 'Impact', sans-serif",
                    textShadow: '0 0 10px rgba(139, 92, 246, 0.3)',
                  }}
                >
                  No Questions Yet
                </h3>
                <p className="text-white/50 max-w-sm mx-auto mb-6">
                  Create some questions to start deceiving your friends
                </p>
                <Button
                  onClick={() => setLocation("/admin/psyop")}
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold uppercase tracking-wide shadow-lg shadow-violet-500/25"
                  data-testid="button-create-questions"
                >
                  <Sparkles className="w-4 h-4 mr-2 shrink-0" />
                  Create Questions
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <motion.button
                    onClick={shuffleAndStart}
                    className="w-full flex items-center justify-between gap-4 p-5 rounded-xl text-left relative overflow-hidden group hover-elevate"
                    style={{
                      background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.12) 0%, rgba(139, 92, 246, 0.06) 100%)',
                      border: '1px solid rgba(167, 139, 250, 0.4)',
                    }}
                    data-testid="button-shuffle-all"
                  >
                    <motion.div 
                      className="absolute inset-0 rounded-xl"
                      animate={{
                        boxShadow: [
                          'inset 0 0 20px rgba(167, 139, 250, 0.1), 0 0 20px rgba(167, 139, 250, 0.15)',
                          'inset 0 0 30px rgba(167, 139, 250, 0.2), 0 0 40px rgba(167, 139, 250, 0.25)',
                          'inset 0 0 20px rgba(167, 139, 250, 0.1), 0 0 20px rgba(167, 139, 250, 0.15)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-400/20 to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                    />
                    
                    <div className="relative flex items-center gap-4">
                      <motion.div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)' }}
                        animate={{
                          boxShadow: [
                            '0 0 15px rgba(167, 139, 250, 0.5)',
                            '0 0 30px rgba(167, 139, 250, 0.8)',
                            '0 0 15px rgba(167, 139, 250, 0.5)',
                          ],
                          scale: [1, 1.05, 1],
                        }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Shuffle className="w-6 h-6 text-white shrink-0" />
                      </motion.div>
                      <div>
                        <h3 
                          className="font-black uppercase tracking-wide text-lg text-violet-300 transition-colors"
                          style={{ 
                            fontFamily: "'Archivo Black', 'Impact', sans-serif",
                            textShadow: '0 0 15px rgba(167, 139, 250, 0.5)',
                          }}
                        >
                          Shuffle Play
                        </h3>
                        <p className="text-white/40 text-sm">5 random questions from all categories</p>
                      </div>
                    </div>
                    
                    <div className="relative text-right">
                      <span className="text-white/40 text-sm">
                        {questions.length} question{questions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </motion.button>
                </motion.div>

                {categories.length > 0 && (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    <div className="flex items-center gap-4 mb-5">
                      <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest whitespace-nowrap">Categories</h2>
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-violet-500/50 via-violet-500/20 to-transparent" />
                    </div>
                    <div className="space-y-3">
                      {categories.map((category, idx) => {
                        const count = questions.filter(q => q.category === category).length;
                        const neonColors = [
                          neonColorConfig.violet,
                          neonColorConfig.rose,
                          neonColorConfig.teal,
                          neonColorConfig.sky,
                          neonColorConfig.orange,
                          neonColorConfig.lime,
                        ];
                        const neon = neonColors[idx % neonColors.length];
                        return (
                          <CategoryCard
                            key={category}
                            category={category}
                            count={count}
                            index={idx}
                            neon={neon}
                            onClick={() => selectCategoryAndStart(category)}
                          />
                        );
                      })}
                    </div>
                  </motion.section>
                )}
              </div>
            )}
          </motion.div>
        )}

        {gameState === "waiting" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="text-center">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Step 1</p>
              <h2 
                className="text-2xl font-black uppercase tracking-wide text-violet-300"
                style={{ 
                  fontFamily: "'Archivo Black', 'Impact', sans-serif",
                  textShadow: '0 0 20px rgba(167, 139, 250, 0.6)',
                }}
              >
                Enlisting
              </h2>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex flex-col items-center p-4 arcade-surface rounded-xl md:w-80 shrink-0 space-y-4" style={{ border: '1px solid var(--arcade-border)' }}>
                <div className="bg-white p-3 rounded-lg" data-testid="container-qr-code">
                  <QRCodeSVG value={joinUrl} size={120} />
                </div>

                <div className="text-center">
                  <p className="text-white/40 text-[10px] uppercase tracking-wide">Room Code</p>
                  <p className="font-mono font-black text-2xl tracking-widest text-white" data-testid="text-room-code">
                    {roomCode}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={copyJoinLink}
                    data-testid="button-copy-link"
                  >
                    {copied ? <CheckCheck className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy Link'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2 text-purple-400"
                    disabled={!roomCode}
                    onClick={() => {
                      if (!roomCode) return;
                      const message = `Join my PsyOp game!\n\nRoom Code: ${roomCode}\n${joinUrl}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                    }}
                    data-testid="button-share-whatsapp"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </Button>
                </div>

                <Button
                  onClick={startGame}
                  disabled={players.length < 2}
                  className="w-full gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold shadow-lg shadow-violet-500/25"
                  data-testid="button-start-game"
                >
                  <Play className="w-5 h-5" />
                  Start Game ({selectedQuestions.length} questions)
                </Button>

                {players.length === 0 && (
                  <p className="text-[10px] text-white/40">Waiting for players...</p>
                )}
                {players.length > 0 && players.length < 2 && (
                  <p className="text-[10px] text-white/40">
                    Need {2 - players.length} more player{2 - players.length !== 1 ? 's' : ''} to start
                  </p>
                )}
              </div>

              <div className="flex-1 min-h-[280px] arcade-surface rounded-xl p-5" style={{ border: '1px solid var(--arcade-border)' }}>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="flex items-center gap-2 text-sm font-bold text-white/70 uppercase tracking-wider">
                    <Users className="w-4 h-4 text-violet-400" />
                    Players
                  </span>
                  <Badge
                    variant="secondary"
                    className={players.length > 0 ? "bg-violet-500/25 text-violet-300" : ""}
                    data-testid="badge-player-count"
                  >
                    {players.length}
                  </Badge>
                </div>
                {players.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8" data-testid="card-players-empty">
                    <Users className="w-8 h-8 text-white/20 mb-2" />
                    <p className="text-sm text-white/40">Waiting for players to join...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="card-players">
                    <AnimatePresence>
                      {players.map((p) => {
                        const avatarData = PLAYER_AVATARS.find(a => a.id === p.avatar);
                        return (
                          <motion.div
                            key={p.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="flex flex-col items-center p-3 rounded-lg"
                            style={{ border: '1px solid var(--arcade-border)' }}
                            data-testid={`player-card-${p.id}`}
                          >
                            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center mb-1">
                              {avatarData
                                ? <span className="text-lg" aria-label={avatarData.label}>{avatarData.emoji}</span>
                                : <User className="w-4 h-4 text-violet-300" />
                              }
                            </div>
                            <span className="font-medium text-xs text-center truncate w-full text-white" data-testid={`text-player-name-${p.id}`} title={p.name}>
                              {p.name}
                            </span>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
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
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-purple-500/10 blur-3xl" />
                  <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-violet-500/10 blur-3xl" />
                </div>
                <div className="text-center text-white relative z-10">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="mb-6"
                  >
                    <Eye className="w-16 h-16 mx-auto text-purple-400" />
                  </motion.div>
                  <h1
                    className="text-5xl md:text-7xl font-black mb-4"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                    data-testid="text-question-teaser"
                  >
                    Question {currentQuestionIndex + 1}
                  </h1>
                  <p className="text-2xl md:text-3xl text-white/60">Get Ready...</p>
                </div>
                <Button variant="ghost" className="absolute bottom-8 right-8 text-slate-400" onClick={skipAnimation} data-testid="button-skip-animation">
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
                className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f] px-8"
              >
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-violet-500/5 blur-3xl" />
                </div>
                <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-center max-w-3xl relative z-10">
                  <div className="text-3xl md:text-5xl font-bold text-white leading-relaxed" data-testid="text-question-drop">
                    {renderFactWithBlank(currentQuestion.factText)}
                  </div>
                  <p className="text-white/40 mt-6 text-sm">Write a lie that fools everyone...</p>
                </motion.div>
                <Button variant="ghost" className="absolute bottom-8 right-8 text-slate-400" onClick={skipAnimation} data-testid="button-skip-animation">
                  <SkipForward className="w-4 h-4 mr-2" />
                  Skip
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {(gameState === "submitting" || gameState === "voting") && currentQuestion && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestionIndex + 1) / selectedQuestions.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-sm text-muted-foreground font-mono" data-testid="text-progress">{currentQuestionIndex + 1}/{selectedQuestions.length}</span>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="outline" data-testid="badge-question-number">
                    Question {currentQuestionIndex + 1} of {selectedQuestions.length}
                  </Badge>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {gameState === "submitting" ? "Write your lie" : "Find the truth"}
                    </Badge>
                    <Button onClick={skipQuestion} variant="outline" size="sm" className="gap-1" data-testid="button-skip-question">
                      <SkipForward className="w-3 h-3" />
                      Skip
                    </Button>
                  </div>
                </div>

                <div className="text-center py-6">
                  <div className="text-2xl font-medium leading-relaxed">
                    {renderFactWithBlank(currentQuestion.factText)}
                  </div>
                </div>

                {gameState === "submitting" && (
                  <div className="border-t pt-4">
                    <div className="text-sm text-muted-foreground mb-3">
                      Waiting for all players to submit... ({submissions.length}/{activePlayerCount})
                    </div>
                    <Progress value={activePlayerCount > 0 ? (submissions.length / activePlayerCount) * 100 : 0} className="h-2 mb-4" />
                    <div className="flex flex-wrap gap-2">
                      {players.map(p => {
                        const hasSubmitted = submissions.some(s => s.playerId === p.id);
                        return (
                          <Badge key={p.id} variant={hasSubmitted ? "default" : "outline"} className="gap-1">
                            {hasSubmitted && <Check className="w-3 h-3" />}
                            {p.name}
                            {hasSubmitted && " ...Dipped!"}
                          </Badge>
                        );
                      })}
                    </div>
                    {submissions.length > 0 && submissions.length < activePlayerCount && (
                      <Button onClick={moveToVoting} variant="outline" className="mt-4 gap-2" data-testid="button-force-voting">
                        Continue with {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
                      </Button>
                    )}
                  </div>
                )}

                {gameState === "voting" && (
                  <div className="border-t pt-4 space-y-3">
                    <div className="text-sm font-medium mb-2">Which one is the truth?</div>
                    {voteOptions.map((option, i) => (
                      <div key={option.id} className="p-3 border rounded-lg bg-card/50">
                        <span className="font-bold mr-2 text-purple-600 dark:text-purple-400">{String.fromCharCode(65 + i)}.</span>
                        {option.text}
                      </div>
                    ))}
                    <div className="text-sm text-muted-foreground mt-4">
                      Waiting for all votes... ({votes.length}/{expectedVoters})
                    </div>
                    <Progress value={expectedVoters > 0 ? (votes.length / expectedVoters) * 100 : 0} className="h-2" />
                    {votes.length > 0 && votes.length < expectedVoters && (
                      <Button onClick={moveToRevealing} variant="outline" className="mt-4 gap-2" data-testid="button-force-reveal">
                        Reveal with {votes.length} vote{votes.length !== 1 ? 's' : ''}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {gameState === "revealing" && currentQuestion && (() => {
          const maxVotes = Math.max(1, ...voteOptions.map(o => votes.filter(v => v.votedForId === o.id).length));
          const topLiar = voteOptions
            .filter(o => !o.isTruth && o.submitterName)
            .map(o => ({ ...o, fooled: votes.filter(v => v.votedForId === o.id).length }))
            .sort((a, b) => b.fooled - a.fooled)[0];

          return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">The truth was</div>
                    <div className="text-2xl font-medium leading-relaxed">
                      {renderFactWithBlank(currentQuestion.factText, currentQuestion.correctAnswer, true)}
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    {voteOptions.map((option) => {
                      const votesForThis = votes.filter(v => v.votedForId === option.id);
                      const barWidth = maxVotes > 0 ? (votesForThis.length / maxVotes) * 100 : 0;
                      return (
                        <motion.div
                          key={option.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`p-4 border rounded-lg relative overflow-hidden ${option.isTruth ? 'border-green-500 bg-green-500/10' : 'bg-card/50'}`}
                          data-testid={`reveal-option-${option.id}`}
                        >
                          <motion.div
                            className={`absolute inset-y-0 left-0 ${option.isTruth ? 'bg-green-500/15' : 'bg-purple-500/10'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                          />
                          <div className="relative z-10">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {option.isTruth && <Check className="w-4 h-4 text-green-500" />}
                                <span className={option.isTruth ? 'font-bold text-green-600 dark:text-green-400' : ''}>
                                  {option.text}
                                </span>
                              </div>
                              <Badge variant={option.isTruth ? "default" : "secondary"} className="text-xs">
                                {votesForThis.length} vote{votesForThis.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            {votesForThis.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {votesForThis.map(v => (
                                  <Badge key={v.voterId} variant="outline" className="text-xs">{v.voterName}</Badge>
                                ))}
                              </div>
                            )}
                            {!option.isTruth && option.submitterName && (
                              <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                Lie by {option.submitterName}
                                {votesForThis.length > 0 && <span className="text-purple-500 font-medium ml-1">+{votesForThis.length * 5} pts</span>}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {topLiar && topLiar.fooled > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 }}
                      className="flex items-center justify-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg"
                      data-testid="callout-master-liar"
                    >
                      <Award className="w-5 h-5 text-purple-400" />
                      <span className="text-sm font-medium">
                        <span className="text-purple-400">{topLiar.submitterName}</span> fooled {topLiar.fooled} player{topLiar.fooled !== 1 ? 's' : ''}!
                      </span>
                    </motion.div>
                  )}

                  <Button onClick={showRoundLeaderboard} size="lg" className="w-full gap-2" data-testid="button-show-standings">
                    <Trophy className="w-5 h-5" />
                    See Standings
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })()}

        {gameState === "roundLeaderboard" && (() => {
          const roundMvp = leaderboard.reduce((best, entry) => 
            (entry.roundDelta ?? 0) > (best?.roundDelta ?? 0) ? entry : best, leaderboard[0]);
          const mvpAvatar = PLAYER_AVATARS.find(a => a.id === roundMvp?.playerAvatar);

          return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">After Question {currentQuestionIndex + 1}</p>
              <h2 className="text-2xl font-bold">Standings</h2>
            </div>

            {roundMvp && (roundMvp.roundDelta ?? 0) > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg"
                data-testid="callout-round-mvp"
              >
                <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
                  {mvpAvatar
                    ? <span className="text-xl" aria-label={mvpAvatar.label}>{mvpAvatar.emoji}</span>
                    : <Zap className="w-5 h-5 text-yellow-500" />
                  }
                </div>
                <div className="text-left">
                  <div className="text-xs uppercase tracking-wider text-yellow-500 font-medium">Round MVP</div>
                  <div className="font-bold">{roundMvp.playerName} <span className="text-green-500">+{roundMvp.roundDelta}</span></div>
                </div>
              </motion.div>
            )}

            <Card>
              <CardContent className="pt-6 space-y-3">
                {leaderboard.map((entry, i) => {
                  const avatarData = PLAYER_AVATARS.find(a => a.id === entry.playerAvatar);
                  return (
                    <motion.div
                      key={entry.playerId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`p-4 border rounded-lg flex items-center gap-4 ${i === 0 ? 'border-purple-500/50 bg-purple-500/10' : 'bg-card/50'}`}
                      data-testid={`round-lb-${entry.playerId}`}
                    >
                      <div className="text-lg font-bold w-6 text-center text-muted-foreground">
                        {i === 0 ? <Crown className="w-5 h-5 text-yellow-500 mx-auto" /> : `${i + 1}`}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0">
                        {avatarData
                          ? <span className="text-base" aria-label={avatarData.label}>{avatarData.emoji}</span>
                          : <User className="w-4 h-4 text-purple-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{entry.playerName}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold">{entry.score}</div>
                        {(entry.roundDelta ?? 0) > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-green-500 font-medium"
                          >
                            +{entry.roundDelta}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>

            <Button onClick={nextQuestion} size="lg" className="w-full gap-2" data-testid="button-next-question">
              {currentQuestionIndex + 1 >= selectedQuestions.length ? (
                <><Trophy className="w-5 h-5" /> See Final Results</>
              ) : (
                <><Play className="w-5 h-5" /> Next Question</>
              )}
            </Button>
          </motion.div>
          );
        })()}

        {gameState === "finished" && (() => {
          const masterLiar = [...leaderboard].sort((a, b) => b.liesBelieved - a.liesBelieved)[0];
          const truthSeeker = [...leaderboard].sort((a, b) => b.truthsSpotted - a.truthsSpotted)[0];
          const mostGullible = [...leaderboard].sort((a, b) => b.timesFooled - a.timesFooled)[0];
          const lieOfTheGame = allLies.length > 0 ? [...allLies].sort((a, b) => b.fooledCount - a.fooledCount)[0] : null;

          const awards = [
            masterLiar && masterLiar.liesBelieved > 0 ? { key: "master-liar", icon: Eye, color: "purple", title: "Master Liar", name: masterLiar.playerName, detail: `${masterLiar.liesBelieved} lie${masterLiar.liesBelieved !== 1 ? 's' : ''} believed` } : null,
            truthSeeker && truthSeeker.truthsSpotted > 0 ? { key: "truth-seeker", icon: Target, color: "green", title: "Truth Seeker", name: truthSeeker.playerName, detail: `${truthSeeker.truthsSpotted} truth${truthSeeker.truthsSpotted !== 1 ? 's' : ''} found` } : null,
            mostGullible && mostGullible.timesFooled > 0 ? { key: "most-gullible", icon: Sparkles, color: "orange", title: "Most Gullible", name: mostGullible.playerName, detail: `Fooled ${mostGullible.timesFooled} time${mostGullible.timesFooled !== 1 ? 's' : ''}` } : null,
          ].filter(Boolean) as { key: string; icon: typeof Eye; color: string; title: string; name: string; detail: string }[];

          const colorMap: Record<string, string> = {
            purple: "text-purple-400",
            green: "text-green-400",
            orange: "text-orange-400",
          };

          return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="text-center">
                <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                  <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-4" />
                </motion.div>
                <h1 className="text-4xl font-black mb-1">GAME OVER!</h1>
                {leaderboard[0] && (
                  <>
                    <h2 className="text-xl font-bold text-yellow-500">WINNER</h2>
                    <p className="text-2xl font-black">{leaderboard[0].playerName}</p>
                    <p className="text-muted-foreground">{leaderboard[0].score} points</p>
                  </>
                )}
              </div>

              {awards.length > 0 && (
                <div className={`grid gap-3 ${awards.length === 1 ? 'grid-cols-1' : awards.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {awards.map((award, idx) => (
                    <motion.div
                      key={award.key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + idx * 0.15 }}
                    >
                      <Card data-testid={`award-${award.key}`}>
                        <CardContent className="pt-4 text-center">
                          <award.icon className={`w-7 h-7 mx-auto ${colorMap[award.color] || 'text-muted-foreground'} mb-2`} />
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{award.title}</div>
                          <div className="font-bold text-sm">{award.name}</div>
                          <div className="text-xs text-muted-foreground">{award.detail}</div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}

              {lieOfTheGame && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Card data-testid="award-lie-of-the-game">
                    <CardContent className="pt-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0 mt-0.5">
                          <Award className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Lie of the Game</div>
                          <p className="text-lg font-bold leading-snug mb-1">"{lieOfTheGame.lieText}"</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>by <span className="font-medium text-foreground">{lieOfTheGame.liarName}</span></span>
                            <span className="text-purple-400 font-medium">Fooled {lieOfTheGame.fooledCount} player{lieOfTheGame.fooledCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Final Standings</h3>
                  <div className="space-y-3">
                    {leaderboard.map((entry, i) => {
                      const avatarData = PLAYER_AVATARS.find(a => a.id === entry.playerAvatar);
                      return (
                        <div
                          key={entry.playerId}
                          className={`p-3 rounded-lg ${i === 0 ? 'bg-yellow-500/10 border border-yellow-500/50' : 'bg-muted/30'}`}
                          data-testid={`final-standings-${entry.playerId}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-lg w-6">{i === 0 ? <Crown className="w-5 h-5 text-yellow-500" /> : `${i + 1}.`}</span>
                              <div className="w-7 h-7 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0">
                                {avatarData
                                  ? <span className="text-sm" aria-label={avatarData.label}>{avatarData.emoji}</span>
                                  : <User className="w-3.5 h-3.5 text-purple-400" />
                                }
                              </div>
                              <span className="font-semibold">{entry.playerName}</span>
                            </div>
                            <span className="font-bold text-lg">{entry.score} pts</span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs ml-9">
                            {entry.truthsSpotted > 0 && (
                              <span className="px-2 py-0.5 bg-green-500/20 rounded">{entry.truthsSpotted} truth{entry.truthsSpotted !== 1 ? 's' : ''} found</span>
                            )}
                            {entry.liesBelieved > 0 && (
                              <span className="px-2 py-0.5 bg-purple-500/20 rounded">{entry.liesBelieved} lie{entry.liesBelieved !== 1 ? 's' : ''} believed</span>
                            )}
                            {entry.timesFooled > 0 && (
                              <span className="px-2 py-0.5 bg-orange-500/20 rounded">Fooled {entry.timesFooled} time{entry.timesFooled !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-2 justify-center">
                <Button onClick={() => setLocation("/")} variant="outline" className="gap-2" data-testid="button-back-home">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Button>
                <Button onClick={startRematch} className="gap-2" data-testid="button-rematch">
                  <RefreshCw className="w-4 h-4" />
                  Rematch
                </Button>
              </div>
            </motion.div>
          );
        })()}
      </main>
      
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-20 right-4 z-40 rounded-full shadow-lg bg-background/80 backdrop-blur-sm"
        onClick={() => setShowRules(true)}
        title="How to Play"
        data-testid="button-rules-psyop"
      >
        <HelpCircle className="w-5 h-5" />
      </Button>
      
      <GameRulesSheet 
        gameSlug="psyop" 
        open={showRules} 
        onOpenChange={setShowRules} 
      />
      
      <AppFooter />
    </div>
  );
}
