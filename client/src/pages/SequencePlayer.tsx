import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { ListOrdered, Wifi, WifiOff, Trophy, Check, X, RotateCcw, Undo2, Sparkles, RefreshCw, Crown, Star, Medal, Lock, Volume2, VolumeX, LogOut, ChevronDown, ChevronUp, Hash } from "lucide-react";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";
import { PLAYER_AVATARS, type AvatarId } from "@shared/schema";
import { Logo } from "@/components/Logo";
import { soundManager } from "@/lib/sounds";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
type GamePhase = "waiting" | "animatedReveal" | "playing" | "submitted" | "revealing" | "results" | "leaderboard" | "gameComplete";

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  score: number;
}

interface Question {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  hint?: string;
}

function FullScreenFlash({ show, color }: { show: boolean; color: string }) {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!show || prefersReducedMotion) return null;
  return (
    <motion.div
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed inset-0 z-[200] pointer-events-none ${color}`}
    />
  );
}

function getSession() {
  try {
    const sequenceData = localStorage.getItem("sequence-session");
    if (sequenceData) return JSON.parse(sequenceData);
    const buzzerData = localStorage.getItem("buzzer-session");
    if (buzzerData) return JSON.parse(buzzerData);
    return null;
  } catch { return null; }
}

function saveSession(roomCode: string, playerName: string, playerId: string, avatar: string) {
  try {
    localStorage.setItem("sequence-session", JSON.stringify({ roomCode, playerName, playerId, avatar }));
  } catch {}
}

function clearSession() {
  try { localStorage.removeItem("sequence-session"); } catch {}
}

export default function SequencePlayer() {
  const params = useParams<{ code?: string }>();
  const { toast } = useToast();
  const savedSession = getSession();
  
  const [roomCode, setRoomCode] = useState(params.code || savedSession?.roomCode || "");
  const [playerName, setPlayerName] = useState(savedSession?.playerName || "");
  const [playerId, setPlayerId] = useState<string | null>(savedSession?.playerId || null);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(savedSession?.avatar || "cat");
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [phase, setPhase] = useState<GamePhase>("waiting");
  
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<string[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [correctOrder, setCorrectOrder] = useState<string[] | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(1);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [winner, setWinner] = useState<LeaderboardEntry | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showCorrectFlash, setShowCorrectFlash] = useState(false);
  const [showWrongFlash, setShowWrongFlash] = useState(false);
  const [showSubmitFlash, setShowSubmitFlash] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);
  
  const hasCodeFromUrl = !!params.code;
  
  const wsRef = useRef<WebSocket | null>(null);
  const selectedSequenceRef = useRef<string[]>([]);
  const playerIdRef = useRef<string | null>(playerId);
  const joinedRef = useRef(false);
  const shouldReconnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevScoreRef = useRef(0);

  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);
  useEffect(() => { joinedRef.current = joined; }, [joined]);

  useEffect(() => {
    const unsub = soundManager.subscribe(() => setSoundEnabled(soundManager.isEnabled()));
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (myScore !== prevScoreRef.current && joined) {
      const delta = myScore - prevScoreRef.current;
      if (delta > 0) {
        toast({ title: `+${delta} points!`, duration: 2000 });
      } else if (delta < 0) {
        toast({ title: `${delta} points`, variant: "destructive", duration: 2000 });
      }
    }
    prevScoreRef.current = myScore;
  }, [myScore, toast, joined]);

  const clearAllTimers = useCallback(() => {
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
    if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    setReconnectCountdown(null);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setStatus("connecting");
    clearAllTimers();
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      reconnectAttemptsRef.current = 0;
      setReconnectCountdown(null);
      ws.send(JSON.stringify({
        type: "sequence:player:join",
        code: roomCode.toUpperCase(),
        name: playerName,
        avatar: selectedAvatar,
        playerId: playerIdRef.current || undefined,
      }));

      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 10000);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "pong":
          break;

        case "sequence:joined":
          joinedRef.current = true;
          setJoined(true);
          setPlayerId(data.playerId);
          playerIdRef.current = data.playerId;
          saveSession(roomCode.toUpperCase(), playerName, data.playerId, selectedAvatar);
          if (data.score !== undefined) {
            prevScoreRef.current = data.score;
            setMyScore(data.score);
          }
          setPhase("waiting");
          break;
          
        case "sequence:animatedReveal":
          setCurrentQuestion(data.question);
          setSelectedSequence([]);
          selectedSequenceRef.current = [];
          setPhase("animatedReveal");
          setIsCorrect(null);
          setCorrectOrder(null);
          setRank(null);
          if (data.questionIndex) setCurrentQuestionIndex(data.questionIndex);
          if (data.totalQuestions) setTotalQuestions(data.totalQuestions);
          soundManager.play('whoosh', 0.4);
          try { navigator.vibrate?.([100, 50, 100]); } catch {}
          break;
          
        case "sequence:question:start":
          setCurrentQuestion(data.question);
          setSelectedSequence([]);
          selectedSequenceRef.current = [];
          setQuestionStartTime(Date.now());
          setPhase("playing");
          setIsCorrect(null);
          setCorrectOrder(null);
          setRank(null);
          if (data.questionIndex) setCurrentQuestionIndex(data.questionIndex);
          if (data.totalQuestions) setTotalQuestions(data.totalQuestions);
          soundManager.play('swoosh', 0.4);
          try { navigator.vibrate?.(100); } catch {}
          break;
          
        case "sequence:reveal": {
          setCorrectOrder(data.correctOrder);
          setPhase("revealing");
          setQuestionStartTime(null);
          const isAnswerCorrect = data.rank != null;
          setIsCorrect(isAnswerCorrect);
          if (data.rank) setRank(data.rank);
          if (data.leaderboard) setLeaderboard(data.leaderboard);
          if (data.myScore !== undefined) setMyScore(data.myScore);
          if (data.winner) setWinner(data.winner);
          if (isAnswerCorrect && data.rank === 1) {
            setShowCorrectFlash(true);
            setTimeout(() => setShowCorrectFlash(false), 700);
            soundManager.play('fanfare', 0.6);
            confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
            try { navigator.vibrate?.([100, 50, 100, 50, 200]); } catch {}
          } else if (isAnswerCorrect) {
            setShowCorrectFlash(true);
            setTimeout(() => setShowCorrectFlash(false), 700);
            soundManager.play('chime', 0.5);
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          } else {
            setShowWrongFlash(true);
            setTimeout(() => setShowWrongFlash(false), 700);
            soundManager.play('buzz', 0.3);
            try { navigator.vibrate?.([50, 30, 50]); } catch {}
          }
          break;
        }
          
        case "sequence:results":
          setPhase("results");
          if (data.rank !== undefined) setRank(data.rank);
          if (data.leaderboard) setLeaderboard(data.leaderboard);
          if (data.myScore !== undefined) setMyScore(data.myScore);
          break;
        
        case "sequence:leaderboard":
          setPhase("leaderboard");
          if (data.leaderboard) setLeaderboard(data.leaderboard);
          if (data.myScore !== undefined) setMyScore(data.myScore);
          soundManager.play('drumroll', 0.3);
          break;
          
        case "sequence:gameComplete":
          setPhase("gameComplete");
          if (data.leaderboard) setLeaderboard(data.leaderboard);
          if (data.winner) setWinner(data.winner);
          if (data.myScore !== undefined) setMyScore(data.myScore);
          if (data.leaderboard?.[0]?.playerId === playerIdRef.current) {
            soundManager.play('victory', 0.6);
            confetti({ particleCount: 300, spread: 180, origin: { y: 0.4 } });
            try { navigator.vibrate?.([200, 100, 200, 100, 400]); } catch {}
          } else {
            soundManager.play('applause', 0.4);
          }
          break;

        case "sequence:pointsAdjusted":
          if (data.newScore !== undefined) setMyScore(data.newScore);
          break;

        case "sequence:phaseSync":
          if (data.questionIndex) setCurrentQuestionIndex(data.questionIndex);
          if (data.totalQuestions) setTotalQuestions(data.totalQuestions);
          if (data.phase === 'playing' && data.question) {
            setCurrentQuestion(data.question);
            setSelectedSequence([]);
            selectedSequenceRef.current = [];
            setQuestionStartTime(Date.now());
            setPhase("playing");
            setIsCorrect(null);
            setCorrectOrder(null);
            setRank(null);
          } else if (data.phase === 'animatedReveal' && data.question) {
            setCurrentQuestion(data.question);
            setSelectedSequence([]);
            selectedSequenceRef.current = [];
            setPhase("animatedReveal");
            setIsCorrect(null);
            setCorrectOrder(null);
            setRank(null);
          } else if (data.phase === 'revealing') {
            if (data.correctOrder) setCorrectOrder(data.correctOrder);
            setIsCorrect(data.rank != null);
            if (data.rank !== undefined) setRank(data.rank);
            if (data.leaderboard) setLeaderboard(data.leaderboard);
            if (data.myScore !== undefined) setMyScore(data.myScore);
            setPhase("revealing");
          } else if (data.phase === 'leaderboard' && data.leaderboard) {
            setLeaderboard(data.leaderboard);
            if (data.myScore !== undefined) setMyScore(data.myScore);
            setPhase("leaderboard");
          } else if (data.phase === 'gameComplete' && data.leaderboard) {
            setLeaderboard(data.leaderboard);
            if (data.winner) setWinner(data.winner);
            if (data.myScore !== undefined) setMyScore(data.myScore);
            setPhase("gameComplete");
          }
          break;

        case "host:disconnected":
          toast({ title: "Host disconnected", description: "Waiting for host to reconnect...", variant: "destructive" });
          break;

        case "host:reconnected":
          toast({ title: "Host reconnected", description: "Game continues!" });
          break;
          
        case "sequence:scoresReset":
          prevScoreRef.current = 0;
          setMyScore(0);
          setLeaderboard([]);
          setPhase("waiting");
          setCurrentQuestion(null);
          setSelectedSequence([]);
          selectedSequenceRef.current = [];
          setCorrectOrder(null);
          setIsCorrect(null);
          setRank(null);
          setWinner(null);
          setCurrentQuestionIndex(1);
          setTotalQuestions(1);
          setQuestionStartTime(null);
          break;
          
        case "sequence:reset":
          setPhase("waiting");
          setCurrentQuestion(null);
          setSelectedSequence([]);
          selectedSequenceRef.current = [];
          setCorrectOrder(null);
          setIsCorrect(null);
          setRank(null);
          setWinner(null);
          setQuestionStartTime(null);
          break;
          
        case "error":
          if (data.message?.toLowerCase().includes("room not found")) {
            shouldReconnectRef.current = false;
            clearSession();
            setJoined(false);
            setStatus("disconnected");
            setPhase("waiting");
            if (wsRef.current) {
              wsRef.current.close();
              wsRef.current = null;
            }
          } else {
            setStatus("error");
          }
          toast({
            title: "Connection issue",
            description: data.message || "Please check your connection.",
            variant: "destructive",
          });
          break;
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }

      if (!joinedRef.current || !shouldReconnectRef.current) {
        return;
      }

      const attempts = reconnectAttemptsRef.current;
      if (attempts >= 5) {
        toast({ title: "Connection lost", description: "Could not reconnect. Try joining again.", variant: "destructive" });
        return;
      }

      const delay = Math.min(2000 * Math.pow(1.5, attempts), 15000);
      reconnectAttemptsRef.current = attempts + 1;

      let remaining = Math.ceil(delay / 1000);
      setReconnectCountdown(remaining);
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          setReconnectCountdown(null);
        } else {
          setReconnectCountdown(remaining);
        }
      }, 1000);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = () => {
      setStatus("error");
    };
  }, [roomCode, playerName, selectedAvatar, toast, clearAllTimers]);

  const handleLetterTap = (letter: string) => {
    if (phase !== "playing") return;
    if (status !== "connected") return;
    if (selectedSequence.length >= 4) return;
    if (selectedSequence.includes(letter)) return;
    
    const newSequence = [...selectedSequence, letter];
    setSelectedSequence(newSequence);
    selectedSequenceRef.current = newSequence;
    
    soundManager.play('click', 0.3);
    try { navigator.vibrate?.(30); } catch {}
    
    if (newSequence.length === 4) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const timeMs = questionStartTime ? Date.now() - questionStartTime : 0;
        wsRef.current.send(JSON.stringify({
          type: "sequence:player:submit",
          sequence: newSequence,
          timeMs,
        }));
        setPhase("submitted");
        setShowSubmitFlash(true);
        setTimeout(() => setShowSubmitFlash(false), 500);
        soundManager.play('pop', 0.4);
        try { navigator.vibrate?.(50); } catch {}
      } else {
        toast({ title: "Connection lost", description: "Your answer couldn't be sent. Try reconnecting.", variant: "destructive" });
      }
    }
  };

  const undoLastTap = () => {
    if (selectedSequence.length === 0) return;
    const newSequence = selectedSequence.slice(0, -1);
    setSelectedSequence(newSequence);
    selectedSequenceRef.current = newSequence;
    soundManager.play('whoosh', 0.2);
    try { navigator.vibrate?.(20); } catch {}
  };

  const resetSelection = () => {
    setSelectedSequence([]);
    selectedSequenceRef.current = [];
    soundManager.play('whoosh', 0.2);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || !playerName.trim()) return;
    shouldReconnectRef.current = true;
    reconnectAttemptsRef.current = 0;
    connect();
  };

  const handleLeaveGame = () => {
    shouldReconnectRef.current = false;
    joinedRef.current = false;
    clearAllTimers();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    clearSession();
    setJoined(false);
    setPlayerId(null);
    playerIdRef.current = null;
    setStatus("disconnected");
    setPhase("waiting");
    setMyScore(0);
    prevScoreRef.current = 0;
    setLeaderboard([]);
    setCurrentQuestion(null);
    setSelectedSequence([]);
    selectedSequenceRef.current = [];
    setCorrectOrder(null);
    setIsCorrect(null);
    setRank(null);
    setWinner(null);
    setShowLeaderboard(false);
    setCurrentQuestionIndex(1);
    setTotalQuestions(1);
    setQuestionStartTime(null);
  };

  const handleManualReconnect = () => {
    clearAllTimers();
    reconnectAttemptsRef.current = 0;
    shouldReconnectRef.current = true;
    connect();
  };

  const toggleSound = () => {
    soundManager.toggle();
  };

  useEffect(() => {
    return () => {
      clearAllTimers();
      if (wsRef.current) wsRef.current.close();
    };
  }, [clearAllTimers]);

  const myAvatar = PLAYER_AVATARS.find(a => a.id === selectedAvatar)?.emoji || "?";

  const renderGameHeader = () => (
    <>
      <header className="px-4 py-3 flex items-center justify-between gap-2 bg-teal-950/80 backdrop-blur-xl border-b border-teal-500/20 shadow-lg" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2">
          {status === "connected" && <Wifi className="w-4 h-4 text-teal-400 shrink-0" data-testid="status-connected" />}
          {status === "connecting" && <RefreshCw className="w-4 h-4 animate-spin text-teal-400 shrink-0" data-testid="status-connecting" />}
          {status === "disconnected" && <WifiOff className="w-4 h-4 text-red-400 shrink-0" data-testid="status-disconnected" />}
          {status === "error" && <WifiOff className="w-4 h-4 text-red-400 shrink-0" data-testid="status-error" />}

          <div className="flex items-center gap-1 px-2 py-0.5 bg-teal-500/20 rounded-md border border-teal-500/30">
            <Hash className="w-3 h-3 text-teal-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-teal-300" data-testid="text-room-code">{roomCode.toUpperCase()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            key={myScore}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="px-2 py-0.5 bg-teal-500/20 rounded-md border border-teal-500/30"
          >
            <span className="text-sm font-bold text-teal-300" data-testid="text-score">{myScore} pts</span>
          </motion.div>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleSound}
            className="text-teal-300"
            data-testid="button-toggle-sound"
            aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 shrink-0" /> : <VolumeX className="w-4 h-4 shrink-0" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleLeaveGame}
            className="text-red-400"
            data-testid="button-leave-game"
            aria-label="Leave game"
          >
            <LogOut className="w-4 h-4 shrink-0" />
          </Button>
        </div>
      </header>
      <div className="px-4 py-1.5 flex items-center justify-between bg-teal-950/40 border-b border-teal-500/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-teal-500/30 flex items-center justify-center text-sm shrink-0">
            {myAvatar}
          </div>
          <span className="text-sm text-white/60 truncate" data-testid="text-player-name">{playerName}</span>
        </div>
        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="flex items-center gap-1 text-xs text-teal-300/70"
          data-testid="button-toggle-leaderboard"
        >
          <Trophy className="w-3 h-3 shrink-0" />
          Scores
          {showLeaderboard ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
        </button>
      </div>
      <AnimatePresence>
        {showLeaderboard && leaderboard.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-teal-950/60 border-b border-teal-500/10"
          >
            <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
              {leaderboard.map((entry, idx) => {
                const isMe = entry.playerId === playerId;
                const avatar = PLAYER_AVATARS.find(a => a.id === entry.playerAvatar)?.emoji || "?";
                return (
                  <motion.div
                    key={entry.playerId}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-md ${
                      isMe ? 'bg-teal-500/25 border border-teal-400/40' :
                      idx === 0 ? 'bg-amber-500/15' :
                      'bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-white/50 w-4 text-right shrink-0">{idx + 1}</span>
                      <span className="text-sm shrink-0">{avatar}</span>
                      <span className="text-sm text-white truncate">{entry.playerName}</span>
                      {isMe && <Badge className="bg-teal-500 text-[10px] px-1 py-0 shrink-0">You</Badge>}
                    </div>
                    <span className="text-sm font-bold text-teal-300 shrink-0">{entry.score}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {reconnectCountdown !== null && (
        <div className="px-4 py-2 bg-amber-900/60 border-b border-amber-500/30 flex items-center justify-between">
          <span className="text-sm text-amber-200">Reconnecting in {reconnectCountdown}s...</span>
          <Button size="sm" variant="outline" className="text-amber-200 border-amber-500/30" onClick={handleManualReconnect} data-testid="button-reconnect">
            <RefreshCw className="w-3 h-3 mr-1 shrink-0" />Reconnect Now
          </Button>
        </div>
      )}
      {status === "disconnected" && reconnectCountdown === null && joined && reconnectAttemptsRef.current >= 5 && (
        <div className="px-4 py-2 bg-red-900/60 border-b border-red-500/30 flex items-center justify-between">
          <span className="text-sm text-red-200">Connection lost</span>
          <Button size="sm" variant="outline" className="text-red-200 border-red-500/30" onClick={handleManualReconnect} data-testid="button-reconnect-retry">
            <RefreshCw className="w-3 h-3 mr-1 shrink-0" />Try Again
          </Button>
        </div>
      )}
    </>
  );

  if (!joined) {
    return (
      <div className="min-h-screen bg-teal-900 flex flex-col items-center justify-center p-6">
        <div className="w-full flex justify-center pb-4">
          <Logo size="compact" />
        </div>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-teal-500 flex items-center justify-center shadow-xl">
              <ListOrdered className="w-10 h-10 text-white shrink-0" aria-hidden="true" />
            </div>
            {hasCodeFromUrl ? (
              <>
                <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-game-title">You're Invited!</h1>
                <p className="text-teal-200" data-testid="text-game-tagline">Just enter your name to join</p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-game-title">Sort Circuit</h1>
                <p className="text-teal-200" data-testid="text-game-tagline">Arrange fast. Win first.</p>
              </>
            )}
          </div>

          <form onSubmit={handleJoin} className="space-y-4" data-testid="form-join">
            {hasCodeFromUrl ? (
              <div className="text-center py-3 px-4 bg-teal-500/20 rounded-lg border border-teal-500/30" data-testid="display-room-code">
                <p className="text-xs text-teal-300 uppercase tracking-wide mb-1">Room Code</p>
                <p className="text-3xl font-mono font-bold text-teal-400 tracking-widest">{roomCode}</p>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-teal-200 mb-1.5 block">Room Code</label>
                <Input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-center text-2xl font-mono tracking-widest"
                  maxLength={4}
                  required
                  data-testid="input-room-code"
                />
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-teal-200 mb-1.5 block">Your Name</label>
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                maxLength={20}
                required
                data-testid="input-player-name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-teal-200 mb-1.5 block">Pick Your Avatar</label>
              <div className="grid grid-cols-6 gap-2">
                {PLAYER_AVATARS.slice(0, 12).map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.id)}
                    className={`p-2 rounded-lg transition-all ${
                      selectedAvatar === avatar.id
                        ? 'bg-teal-500 ring-2 ring-white scale-110'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                    data-testid={`button-avatar-${avatar.id}`}
                  >
                    <span className="text-2xl">{avatar.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg bg-teal-500 text-white"
              disabled={status === "connecting"}
              data-testid="button-join-game"
            >
              {status === "connecting" ? "Connecting..." : "Join Game"}
            </Button>
          </form>

          <div className="flex justify-center mt-4">
            {status === "connected" ? (
              <Badge className="bg-teal-500 gap-1" data-testid="badge-connected"><Wifi className="w-3 h-3 shrink-0" aria-hidden="true" />Connected</Badge>
            ) : status === "error" ? (
              <Badge variant="destructive" className="gap-1" data-testid="badge-error"><WifiOff className="w-3 h-3 shrink-0" aria-hidden="true" />Error</Badge>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-900 flex flex-col" data-testid="page-sequence-player">
      <FullScreenFlash show={showCorrectFlash} color="bg-cyan-400/50" />
      <FullScreenFlash show={showWrongFlash} color="bg-red-500/40" />
      <FullScreenFlash show={showSubmitFlash} color="bg-teal-400/30" />

      <div className="w-full flex justify-center pt-3 pb-1">
        <Logo size="compact" />
      </div>
      {renderGameHeader()}

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {phase === "waiting" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-teal-500/20 flex items-center justify-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                <Sparkles className="w-12 h-12 text-teal-400 shrink-0" aria-hidden="true" />
              </motion.div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2" data-testid="text-waiting">Waiting for host...</h2>
            <p className="text-teal-200">Get ready to arrange the sequence!</p>
            <motion.div
              className="flex justify-center gap-2 mt-4"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <div className="w-2 h-2 rounded-full bg-teal-400" />
            </motion.div>
          </motion.div>
        )}

        {phase === "animatedReveal" && currentQuestion && (
          <div 
            className="fixed inset-0 z-[100]"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-teal-700 pb-safe"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="mb-8"
              >
                <Lock className="w-20 h-20 text-white/80 shrink-0" aria-hidden="true" />
              </motion.div>
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-4xl font-black text-white text-center mb-4"
              >
                QUESTION {currentQuestionIndex}/{totalQuestions}
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl text-white/90 font-semibold text-center px-4 max-w-md"
              >
                {currentQuestion.question}
              </motion.p>
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="mt-8 text-lg text-white/70"
              >
                Get ready to tap...
              </motion.p>
            </motion.div>
          </div>
        )}

        {(phase === "playing" || phase === "submitted") && currentQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary" className="bg-white/10 text-white gap-1" data-testid="badge-question-progress">
                Q{currentQuestionIndex}/{totalQuestions}
              </Badge>
              <Badge variant="secondary" className={`${phase === "submitted" ? "bg-cyan-500/30 text-cyan-300 border-cyan-400/50" : "bg-white/10 text-white"}`} data-testid="badge-status">
                {phase === "submitted" ? "LOCKED IN" : "Tap 1-2-3-4"}
              </Badge>
            </div>

            <Card className="p-4 bg-white/10 border-white/20">
              <h3 className="text-lg font-semibold text-white text-center mb-4">
                {currentQuestion.question}
              </h3>
              {currentQuestion.hint && (
                <p className="text-sm text-teal-200 text-center italic">{currentQuestion.hint}</p>
              )}
            </Card>

            <div className="grid grid-cols-2 gap-3">
              {["A", "B", "C", "D"].map((letter) => {
                const option = currentQuestion[`option${letter}` as keyof Question] as string;
                const isSelected = selectedSequence.includes(letter);
                const position = selectedSequence.indexOf(letter);
                const circledNumbers = ["①", "②", "③", "④"];
                
                return (
                  <motion.button
                    key={letter}
                    onClick={() => handleLetterTap(letter)}
                    disabled={phase === "submitted" || isSelected}
                    whileTap={{ scale: 0.95 }}
                    className={`relative p-4 rounded-xl transition-all min-h-[100px] ${
                      isSelected
                        ? 'bg-cyan-500 text-white ring-2 ring-cyan-300'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    } ${phase === "submitted" ? 'opacity-60' : ''}`}
                    data-testid={`button-option-${letter}`}
                  >
                    {isSelected && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-cyan-600 flex items-center justify-center text-xl font-bold shadow-lg">
                        {circledNumbers[position]}
                      </div>
                    )}
                    <div className="text-3xl font-black mb-1">{letter}</div>
                    <div className="text-sm opacity-90 line-clamp-2">{option}</div>
                  </motion.button>
                );
              })}
            </div>

            {selectedSequence.length > 0 && selectedSequence.length < 4 && phase === "playing" && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 border-white/20 text-white"
                  onClick={undoLastTap}
                  data-testid="button-undo-last"
                >
                  <Undo2 className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                  Undo Last
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 border-white/20 text-white"
                  onClick={resetSelection}
                  data-testid="button-reset-selection"
                >
                  <RotateCcw className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                  Reset All
                </Button>
              </div>
            )}

            {selectedSequence.length > 0 && (
              <div className="text-center">
                <p className="text-sm text-teal-200 mb-2">Your sequence:</p>
                <div className="flex justify-center gap-2">
                  {selectedSequence.map((letter, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-10 h-10 rounded-lg bg-cyan-500 flex items-center justify-center text-white font-bold"
                    >
                      {letter}
                    </motion.div>
                  ))}
                  {[...Array(4 - selectedSequence.length)].map((_, idx) => (
                    <div key={`empty-${idx}`} className="w-10 h-10 rounded-lg border-2 border-dashed border-white/30" />
                  ))}
                </div>
              </div>
            )}

            {phase === "submitted" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-12 h-12 mx-auto mb-2 bg-cyan-500/20 rounded-full flex items-center justify-center"
                >
                  <Check className="w-6 h-6 text-cyan-400 shrink-0" />
                </motion.div>
                <p className="text-cyan-300 text-sm font-medium">Locked in! Waiting for others...</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === "revealing" && correctOrder && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
                isCorrect ? 'bg-cyan-500' : 'bg-red-600'
              }`}
              data-testid={`icon-result-${isCorrect ? 'correct' : 'wrong'}`}
            >
              {isCorrect ? (
                <Check className="w-12 h-12 text-white shrink-0" aria-hidden="true" />
              ) : (
                <X className="w-12 h-12 text-white shrink-0" aria-hidden="true" />
              )}
            </motion.div>
            <h2 className={`text-3xl font-bold mb-4 ${isCorrect ? 'text-cyan-400' : 'text-red-400'}`}>
              {isCorrect ? "SYSTEM STABLE" : "CIRCUIT BLOWN"}
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-teal-200 mb-2">Correct order:</p>
              <div className="flex justify-center gap-2">
                {correctOrder.map((letter, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.2 }}
                    className="w-12 h-12 rounded-lg bg-teal-500 flex items-center justify-center text-white text-xl font-bold"
                  >
                    {letter}
                  </motion.div>
                ))}
              </div>
            </div>

            {rank && rank <= 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-4"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30" data-testid="badge-rank">
                  <Trophy className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
                  <span className="font-bold text-amber-400">
                    {rank === 1 ? "1st Place!" : rank === 2 ? "2nd Place!" : "3rd Place!"}
                  </span>
                </div>
              </motion.div>
            )}

            {selectedSequence.length > 0 && (
              <div>
                <p className="text-sm text-teal-200/70 mb-2">Your answer:</p>
                <div className="flex justify-center gap-2">
                  {selectedSequence.map((letter, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                        letter === correctOrder[idx] ? 'bg-emerald-500/50 text-emerald-300' : 'bg-red-500/50 text-red-300'
                      }`}
                    >
                      {letter}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm text-teal-200/50 mt-6">Waiting for host to continue...</p>
          </motion.div>
        )}

        {phase === "results" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            {rank === 1 && (
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="mb-4"
              >
                <Trophy className="w-16 h-16 text-amber-400 mx-auto shrink-0" aria-hidden="true" />
              </motion.div>
            )}
            <h2 className="text-2xl font-bold text-white mb-2">
              {rank === 1 ? "You won!" : rank ? `You finished #${rank}` : "Round complete!"}
            </h2>
            <p className="text-teal-200">Waiting for next question...</p>
            <motion.div
              className="flex justify-center gap-2 mt-4"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <div className="w-2 h-2 rounded-full bg-teal-400" />
            </motion.div>
          </motion.div>
        )}
        
        {phase === "leaderboard" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center w-full max-w-sm"
          >
            <Trophy className="w-16 h-16 mx-auto text-amber-400 mb-4 shrink-0" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-white mb-6" data-testid="text-leaderboard-title">Leaderboard</h2>
            <div className="space-y-2 mb-6">
              {leaderboard.map((entry, idx) => {
                const isMe = entry.playerId === playerId;
                const avatar = PLAYER_AVATARS.find(a => a.id === entry.playerAvatar)?.emoji || "?";
                return (
                  <motion.div
                    key={entry.playerId}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isMe ? 'bg-teal-500/30 border-2 border-teal-400' :
                      idx === 0 ? 'bg-amber-500/20' :
                      idx === 1 ? 'bg-slate-400/20' :
                      idx === 2 ? 'bg-orange-600/20' :
                      'bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl font-black text-white/80 shrink-0">{idx + 1}</span>
                      {idx === 0 && <Crown className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />}
                      {idx === 1 && <Medal className="w-5 h-5 text-slate-300 shrink-0" aria-hidden="true" />}
                      {idx === 2 && <Medal className="w-5 h-5 text-orange-400 shrink-0" aria-hidden="true" />}
                      <span className="text-lg shrink-0">{avatar}</span>
                      <span className="font-semibold text-white truncate" title={entry.playerName}>{entry.playerName}</span>
                      {isMe && <Badge className="bg-teal-500 text-xs shrink-0" data-testid="badge-you">You</Badge>}
                    </div>
                    <span className="font-bold text-white">{entry.score} pts</span>
                  </motion.div>
                );
              })}
            </div>
            <p className="text-teal-200/60 text-sm">Waiting for next round...</p>
          </motion.div>
        )}
        
        {phase === "gameComplete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center w-full max-w-sm"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Trophy className="w-24 h-24 mx-auto text-amber-400 mb-4 shrink-0" aria-hidden="true" />
            </motion.div>
            <h1 className="text-4xl font-black text-white mb-2" data-testid="text-game-over">GAME OVER!</h1>
            
            {leaderboard[0] && (
              <div className="mb-6">
                <h2 className="text-xl text-amber-400 font-bold">WINNER</h2>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-3xl">{PLAYER_AVATARS.find(a => a.id === leaderboard[0].playerAvatar)?.emoji || "?"}</span>
                  <p className="text-3xl font-black text-white">{leaderboard[0].playerName}</p>
                </div>
                <p className="text-teal-200">{leaderboard[0].score} points</p>
              </div>
            )}

            {leaderboard[0]?.playerId === playerId && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mb-6 inline-block px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"
              >
                <span className="text-xl font-black text-white">YOU WON!</span>
              </motion.div>
            )}

            <div className="space-y-2 mb-6">
              <h3 className="text-sm font-semibold text-teal-200">Final Standings</h3>
              {leaderboard.slice(0, 5).map((entry, idx) => {
                const isMe = entry.playerId === playerId;
                const avatar = PLAYER_AVATARS.find(a => a.id === entry.playerAvatar)?.emoji || "?";
                return (
                  <motion.div
                    key={entry.playerId}
                    initial={{ x: -15, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isMe ? 'bg-teal-500/30 border border-teal-400' : 'bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white/70">{idx + 1}.</span>
                      <span className="text-lg">{avatar}</span>
                      <span className="text-white">{entry.playerName}</span>
                    </div>
                    <span className="font-bold text-white">{entry.score}</span>
                  </motion.div>
                );
              })}
            </div>
            
            <p className="text-teal-200/50 text-sm">Thanks for playing!</p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
