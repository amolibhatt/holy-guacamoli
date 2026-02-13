import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, XCircle, Wifi, WifiOff, Trophy, Clock, RefreshCw, Star, Sparkles, Users, ChevronUp, ChevronDown, Volume2, VolumeX, Lock, Grid3X3, Hand, Flame, Laugh, CircleDot, ThumbsUp, Eye, Check, Timer } from "lucide-react";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";
import { usePlayerProfile } from "@/hooks/use-player-profile";
import { soundManager } from "@/lib/sounds";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PLAYER_AVATARS, type AvatarId } from "@shared/schema";
import { Logo } from "@/components/Logo";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error" | "reconnecting";

function FullScreenFlash({ show, color }: { show: boolean; color: string }) {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!show || prefersReducedMotion) return null;
  return (
    <motion.div
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={`fixed inset-0 z-50 pointer-events-none ${color}`}
    />
  );
}

function getSession() {
  try {
    const data = localStorage.getItem("buzzer-session");
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function saveSession(roomCode: string, playerName: string, playerId: string, avatar: string, reconnectToken?: string) {
  try {
    localStorage.setItem("buzzer-session", JSON.stringify({ roomCode, playerName, playerId, avatar, reconnectToken }));
  } catch {}
}

function clearSession() {
  try { localStorage.removeItem("buzzer-session"); } catch {}
}

function getCodeFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('code') || '';
}

export default function PlayerPage() {
  const params = useParams<{ code?: string }>();
  const [, setLocation] = useLocation();
  const codeFromUrl = params.code || getCodeFromUrl();
  const { toast } = useToast();
  const savedSession = getSession();
  const [roomCode, setRoomCode] = useState(codeFromUrl || savedSession?.roomCode || "");
  const [playerName, setPlayerName] = useState(savedSession?.playerName || "");
  
  // Get player profile for stat tracking
  const { profile } = usePlayerProfile(playerName);
  const [playerId, setPlayerId] = useState<string | null>(savedSession?.playerId || null);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(savedSession?.avatar || "cat");
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [buzzerLocked, setBuzzerLocked] = useState(true);
  const [buzzPosition, setBuzzPosition] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; points: number } | null>(null);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [buzzerBlocked, setBuzzerBlocked] = useState(false); // Blocked after wrong answer
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [showBuzzFlash, setShowBuzzFlash] = useState(false);
  const [showCorrectFlash, setShowCorrectFlash] = useState(false);
  const [showWrongFlash, setShowWrongFlash] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Array<{ id: string; name: string; avatar?: string; score: number }>>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);
  const [hostPickingGrid, setHostPickingGrid] = useState(false);
  const [currentGridName, setCurrentGridName] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [gameMode, setGameMode] = useState<"buzzer" | "psyop">("buzzer");
  const [psyopPhase, setPsyopPhase] = useState<"idle" | "submitting" | "voting" | "revealed">("idle");
  const [psyopQuestion, setPsyopQuestion] = useState<{ id: number; factText: string } | null>(null);
  const [psyopOptions, setPsyopOptions] = useState<Array<{ id: string; text: string }>>([]);
  // No timers in PsyOp - game waits for everyone
  const [psyopSubmitted, setPsyopSubmitted] = useState(false);
  const [psyopVoted, setPsyopVoted] = useState(false);
  const [psyopLieText, setPsyopLieText] = useState("");
  const [psyopCorrectAnswer, setPsyopCorrectAnswer] = useState<string | null>(null);
  const [psyopRevealData, setPsyopRevealData] = useState<{ yourScore: number; foundTruth: boolean; yourLiesBelieved: number } | null>(null);
  const [psyopCountdown, setPsyopCountdown] = useState<number>(0);
  const psyopCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const joinedRef = useRef(false);
  const shouldReconnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const playerIdRef = useRef<string | null>(playerId);
  const reconnectTokenRef = useRef<string | null>(savedSession?.reconnectToken || null);

  const connect = useCallback((isReconnect = false) => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setStatus(isReconnect ? "reconnecting" : "connecting");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      setReconnectAttempts(0);
      reconnectAttemptsRef.current = 0;
      ws.send(JSON.stringify({
        type: "player:join",
        code: roomCode.toUpperCase(),
        name: playerName,
        avatar: selectedAvatar,
        playerId: playerIdRef.current || playerId || undefined,
        reconnectToken: reconnectTokenRef.current || undefined,
        profileId: profile?.profile?.id,
      }));
      
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 10000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
        case "joined":
          setJoined(true);
          joinedRef.current = true;
          setPlayerId(data.playerId);
          playerIdRef.current = data.playerId;
          if (data.reconnectToken) reconnectTokenRef.current = data.reconnectToken;
          setBuzzerLocked(data.buzzerLocked);
          setBuzzerBlocked(data.buzzerBlocked || false);
          if (data.score !== undefined) setScore(data.score);
          saveSession(roomCode.toUpperCase(), playerName, data.playerId, selectedAvatar, data.reconnectToken || reconnectTokenRef.current || undefined);
          break;
        case "score:updated":
          if (data.score !== undefined) {
            setScore((prevScore) => {
              const diff = data.score - prevScore;
              if (diff !== 0) {
                toast({
                  title: diff > 0 ? `+${diff} points!` : `${diff} points`,
                  description: diff > 0 ? "Great job!" : "Keep trying!",
                  duration: 2000,
                });
              }
              return data.score;
            });
          }
          break;
        case "scores:sync":
          const currentPlayerId = playerIdRef.current;
          const myScore = data.players?.find((p: any) => p.id === currentPlayerId)?.score;
          if (myScore !== undefined) setScore(myScore);
          if (data.players) {
            setLeaderboard(data.players.map((p: any) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score })));
          }
          break;
        case "error":
          if (data.message === "Room not found") {
            shouldReconnectRef.current = false;
            clearSession();
            setJoined(false);
            joinedRef.current = false;
            setStatus("disconnected");
            if (wsRef.current) {
              wsRef.current.close();
              wsRef.current = null;
            }
            toast({
              title: "Game not found",
              description: "Check the room code and try again. The game may have ended.",
              variant: "destructive",
            });
          } else if (data.message === "Invalid reconnect token") {
            shouldReconnectRef.current = false;
            clearSession();
            reconnectTokenRef.current = null;
            playerIdRef.current = null;
            setPlayerId(null);
            setJoined(false);
            joinedRef.current = false;
            setStatus("disconnected");
            if (wsRef.current) {
              wsRef.current.close();
              wsRef.current = null;
            }
            toast({
              title: "Session expired",
              description: "Please rejoin the game.",
              variant: "destructive",
            });
          } else {
            setStatus("error");
            toast({
              title: "Connection issue",
              description: data.message || "Please check your connection and try again.",
              variant: "destructive",
            });
          }
          break;
        case "kicked":
          clearSession();
          if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
          if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
          if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
          setJoined(false);
          joinedRef.current = false;
          shouldReconnectRef.current = false;
          setStatus("disconnected");
          setReconnectCountdown(null);
          toast({
            title: "Removed from game",
            description: "The host removed you from the game.",
            variant: "destructive",
          });
          break;
        case "room:closed":
          clearSession();
          if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
          if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
          if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
          setJoined(false);
          joinedRef.current = false;
          shouldReconnectRef.current = false;
          setStatus("disconnected");
          setHostPickingGrid(false);
          setReconnectCountdown(null);
          toast({
            title: "Game ended",
            description: data.reason || "The game room has been closed.",
            variant: "destructive",
          });
          break;
        case "host:pickingNextGrid":
          setHostPickingGrid(true);
          setBuzzerLocked(true);
          setHasBuzzed(false);
          setBuzzPosition(null);
          setFeedback(null);
          break;
        case "host:startNextGrid":
          setHostPickingGrid(false);
          setCurrentGridName(data.gridName || null);
          setBuzzerLocked(true);
          setHasBuzzed(false);
          setBuzzPosition(null);
          setFeedback(null);
          toast({
            title: "New grid starting!",
            description: data.gridName ? `Now playing: ${data.gridName}` : "Get ready!",
            duration: 3000,
          });
          break;
        case "buzzer:unlocked":
          setGameMode("buzzer");
          setPsyopPhase("idle");
          setPsyopQuestion(null);
          setPsyopOptions([]);
          setPsyopSubmitted(false);
          setPsyopVoted(false);
          setPsyopCorrectAnswer(null);
          setBuzzerLocked(false);
          setHasBuzzed(false);
          setBuzzPosition(null);
          setFeedback(null);
          // Only clear block state on new question
          if (data.newQuestion) {
            setBuzzerBlocked(false);
          }
          soundManager.play('whoosh', 0.4);
          try { navigator.vibrate?.(50); } catch {}
          break;
        case "buzzer:locked":
          setBuzzerLocked(true);
          setHasBuzzed(false);
          setBuzzPosition(null);
          soundManager.play('click', 0.3);
          break;
        case "buzzer:reset":
          setHasBuzzed(false);
          setBuzzPosition(null);
          setFeedback(null);
          break;
        case "buzzer:blocked":
          // Player answered wrong - blocked from buzzing again on this question
          setHasBuzzed(false);
          setBuzzPosition(null);
          setFeedback(null);
          setBuzzerBlocked(true);
          break;
        case "buzz:confirmed":
          setBuzzPosition(data.position);
          setHasBuzzed(true);
          break;
        case "feedback":
          setFeedback({ correct: data.correct, points: data.points });
          if (data.correct) {
            setShowCorrectFlash(true);
            setTimeout(() => setShowCorrectFlash(false), 500);
            soundManager.play('correct', 0.5);
            try { navigator.vibrate?.([100, 50, 100, 50, 200]); } catch {}
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!prefersReducedMotion) {
              confetti({
                particleCount: 100,
                spread: 90,
                origin: { y: 0.5 },
                colors: ['#FFD700', '#FFA500', '#FF6B6B', '#9B59B6', '#3498DB'],
              });
            }
          } else {
            setShowWrongFlash(true);
            setTimeout(() => setShowWrongFlash(false), 500);
            soundManager.play('wrong', 0.4);
            try { navigator.vibrate?.([200, 100, 200]); } catch {}
          }
          break;
        case "pong":
          break;
        case "host:disconnected":
          toast({
            title: "Host disconnected",
            description: "Waiting for host to reconnect...",
            variant: "destructive",
          });
          break;
        case "host:reconnected":
          // Host is back
          toast({
            title: "Host reconnected",
            description: "Game continues!",
          });
          break;
        case "room:modeChanged":
          if (data.mode === "sequence") {
            if (data.score !== undefined) setScore(data.score);
            setLocation(`/sortcircuit/${roomCode.toUpperCase()}`);
          }
          break;
        case "psyop:submission:start":
          setGameMode("psyop");
          setBuzzerLocked(true);
          setHasBuzzed(false);
          setBuzzPosition(null);
          setFeedback(null);
          setPsyopPhase("submitting");
          setPsyopQuestion(data.question);
          setPsyopSubmitted(false);
          setPsyopRevealData(null);
          setPsyopCorrectAnswer(null);
          if (data.timeLimit) startPsyopCountdown(data.timeLimit);
          break;
        case "psyop:voting:start":
          setGameMode("psyop");
          setPsyopPhase("voting");
          setPsyopOptions(data.options || []);
          setPsyopVoted(false);
          if (data.timeLimit) startPsyopCountdown(data.timeLimit);
          break;
        case "psyop:revealed": {
          stopPsyopCountdown();
          setPsyopPhase("revealed");
          setPsyopCorrectAnswer(data.correctAnswer);
          setPsyopRevealData({
            yourScore: data.yourScore || 0,
            foundTruth: data.foundTruth || false,
            yourLiesBelieved: data.yourLiesBelieved || 0,
          });
          if (data.yourScore && data.yourScore > 0) {
            setScore(prev => prev + data.yourScore);
            const descriptions: string[] = [];
            if (data.yourTruthsSpotted > 0) descriptions.push("You found the truth!");
            if (data.yourLiesBelieved > 0) descriptions.push(`Your lie fooled ${data.yourLiesBelieved} player${data.yourLiesBelieved !== 1 ? 's' : ''}!`);
            toast({
              title: `+${data.yourScore} points!`,
              description: descriptions.join(" ") || "Nice work!",
            });
          } else {
            toast({
              title: "No points this round",
              description: "Better luck next time!",
            });
          }
          break;
        }
        case "psyop:skipped":
          stopPsyopCountdown();
          setPsyopPhase("idle");
          setPsyopSubmitted(false);
          setPsyopVoted(false);
          setPsyopLieText("");
          setPsyopQuestion(null);
          setPsyopOptions([]);
          setPsyopCorrectAnswer(null);
          setPsyopRevealData(null);
          break;
        case "psyop:rematch":
          stopPsyopCountdown();
          setPsyopPhase("idle");
          setPsyopSubmitted(false);
          setPsyopVoted(false);
          setPsyopLieText("");
          setPsyopQuestion(null);
          setPsyopOptions([]);
          setPsyopCorrectAnswer(null);
          setPsyopRevealData(null);
          setScore(0);
          toast({
            title: "Rematch!",
            description: "New round starting...",
          });
          break;
        case "psyop:ended":
          setGameMode("buzzer");
          setPsyopPhase("idle");
          setPsyopQuestion(null);
          setPsyopOptions([]);
          break;
      }
      } catch { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
      if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
      if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
      setReconnectCountdown(null);

      if (!joinedRef.current || !shouldReconnectRef.current) {
        setStatus("disconnected");
        return;
      }

      const attempts = reconnectAttemptsRef.current;
      if (attempts >= 5) {
        setStatus("disconnected");
        toast({
          title: "Connection lost",
          description: "Could not reconnect. Try joining again.",
          variant: "destructive",
        });
        return;
      }

      setStatus("reconnecting");
      reconnectAttemptsRef.current = attempts + 1;
      setReconnectAttempts(attempts + 1);

      const delay = Math.min(2000 * Math.pow(1.5, attempts), 15000);
      let remaining = Math.ceil(delay / 1000);
      setReconnectCountdown(remaining);
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
          setReconnectCountdown(null);
        } else {
          setReconnectCountdown(remaining);
        }
      }, 1000);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect(true);
      }, delay);
    };

    ws.onerror = () => {
      setStatus("error");
    };
  }, [roomCode, playerName, playerId, selectedAvatar]);

  const startPsyopCountdown = useCallback((seconds: number) => {
    if (psyopCountdownRef.current) clearInterval(psyopCountdownRef.current);
    setPsyopCountdown(seconds);
    psyopCountdownRef.current = setInterval(() => {
      setPsyopCountdown(prev => {
        if (prev <= 1) {
          if (psyopCountdownRef.current) clearInterval(psyopCountdownRef.current);
          psyopCountdownRef.current = null;
          return 0;
        }
        if (prev <= 6) soundManager.play('tick', 0.2);
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopPsyopCountdown = useCallback(() => {
    if (psyopCountdownRef.current) clearInterval(psyopCountdownRef.current);
    psyopCountdownRef.current = null;
    setPsyopCountdown(0);
  }, []);

  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (psyopCountdownRef.current) clearInterval(psyopCountdownRef.current);
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = soundManager.subscribe(() => {
      setSoundEnabled(soundManager.isEnabled());
    });
    return () => { unsubscribe(); };
  }, []);

  const handleToggleSound = () => {
    soundManager.toggle();
  };

  const handleLeaveGame = () => {
    shouldReconnectRef.current = false;
    joinedRef.current = false;
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
    if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    clearSession();
    setJoined(false);
    setPlayerId(null);
    playerIdRef.current = null;
    setStatus("disconnected");
    setScore(0);
    setLeaderboard([]);
    setShowLeaderboard(false);
    setBuzzerLocked(true);
    setHasBuzzed(false);
    setBuzzPosition(null);
    setFeedback(null);
    setBuzzerBlocked(false);
    setHostPickingGrid(false);
    setCurrentGridName(null);
    setReconnectAttempts(0);
    reconnectAttemptsRef.current = 0;
    setReconnectCountdown(null);
    setGameMode("buzzer");
    setPsyopPhase("idle");
    setPsyopQuestion(null);
    setPsyopOptions([]);
    setPsyopSubmitted(false);
    setPsyopVoted(false);
    setPsyopLieText("");
    setPsyopCorrectAnswer(null);
  };

  const handleManualReconnect = () => {
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
    if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    setReconnectCountdown(null);
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
    shouldReconnectRef.current = true;
    connect(true);
  };

  const handleJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (roomCode.trim() && playerName.trim()) {
      shouldReconnectRef.current = true;
      reconnectAttemptsRef.current = 0;
      connect();
    }
  };

  const handleBuzz = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && !buzzerLocked && !hasBuzzed) {
      wsRef.current.send(JSON.stringify({ type: "player:buzz" }));
      setShowBuzzFlash(true);
      setTimeout(() => setShowBuzzFlash(false), 400);
      soundManager.play('buzz', 0.6);
      try {
        navigator.vibrate?.([50, 30, 100]);
      } catch {}
    }
  };

  const handleReaction = (reactionType: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "player:reaction", reactionType }));
      soundManager.play('pop', 0.3);
      try {
        navigator.vibrate?.([30]);
      } catch {}
    }
  };

  const nameInputRef = useRef<HTMLInputElement>(null);
  const hasCodeFromUrl = !!codeFromUrl;

  useEffect(() => {
    if (hasCodeFromUrl && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [hasCodeFromUrl]);

  if (!joined) {
    return (
      <div className="min-h-screen gradient-game flex flex-col items-center justify-center p-4">
        <div className="w-full flex justify-center pb-4">
          <Logo size="compact" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="w-full max-w-sm p-6 bg-card/90 backdrop-blur border-primary/30">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center mx-auto">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mt-4">
                {hasCodeFromUrl ? "You're Invited!" : "Join Game"}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {hasCodeFromUrl ? "Just enter your name to join" : "Enter the room code to play"}
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4" data-testid="form-join">
              {hasCodeFromUrl ? (
                <div className="text-center py-3 px-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Room Code</p>
                  <p className="text-3xl font-mono font-bold text-primary tracking-widest">{roomCode}</p>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-foreground">Room Code</label>
                  <Input
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="ABCD"
                    className="text-center text-2xl font-mono tracking-widest uppercase"
                    maxLength={4}
                    required
                    data-testid="input-room-code"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground">Your Name</label>
                <Input
                  ref={nameInputRef}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  required
                  data-testid="input-player-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Choose Your Avatar</label>
                <div className="grid grid-cols-6 gap-2">
                  {PLAYER_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar.id)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                        selectedAvatar === avatar.id
                          ? 'bg-primary/20 ring-2 ring-primary scale-110'
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                      title={avatar.label}
                      data-testid={`avatar-${avatar.id}`}
                    >
                      {avatar.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                type="submit"
                disabled={!roomCode.trim() || !playerName.trim() || status === "connecting"}
                className="w-full gradient-header text-white font-bold"
                size="lg"
                data-testid="button-join-game"
              >
                {status === "connecting" ? "Connecting..." : "Join Game"}
              </Button>
            </form>

            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {status === "connected" && <><Wifi className="w-4 h-4 text-primary" /> Connected</>}
              {status === "disconnected" && <><WifiOff className="w-4 h-4" /> Not connected</>}
              {status === "reconnecting" && <><RefreshCw className="w-4 h-4 animate-spin text-yellow-500" /> Reconnecting...</>}
              {status === "error" && <><WifiOff className="w-4 h-4 text-destructive" /> Connection error</>}
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-game flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="w-full flex justify-center pt-3 pb-1">
        <Logo size="compact" />
      </div>
      <InstallPrompt />
      <FullScreenFlash show={showBuzzFlash} color="bg-amber-400/60" />
      <FullScreenFlash show={showCorrectFlash} color="bg-emerald-400/60" />
      <FullScreenFlash show={showWrongFlash} color="bg-rose-400/60" />
      
      <header className="px-4 py-3 flex items-center justify-between gap-2 bg-card/80 backdrop-blur-xl border-b border-primary/20 shadow-lg" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {status === "connected" && <Wifi className="w-4 h-4 text-emerald-500 shrink-0" data-testid="status-connected" />}
            {status === "connecting" && <RefreshCw className="w-4 h-4 animate-spin text-primary shrink-0" data-testid="status-connecting" />}
            {status === "reconnecting" && <RefreshCw className="w-4 h-4 animate-spin text-amber-500 shrink-0" data-testid="status-reconnecting" />}
            {(status === "disconnected" || status === "error") && <WifiOff className="w-4 h-4 text-rose-500 shrink-0" data-testid="status-disconnected" />}
            <span className="font-mono font-bold text-lg text-foreground" data-testid="display-room-code">{roomCode}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.div 
            key={score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="px-4 py-1.5 bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 rounded-full"
          >
            <span className="text-2xl font-black text-primary" data-testid="text-player-score">{score}</span>
            <span className="text-xs text-muted-foreground ml-1">pts</span>
          </motion.div>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={handleToggleSound}
            data-testid="button-toggle-sound"
            aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleLeaveGame} className="text-xs text-muted-foreground" data-testid="button-leave-game">
            Leave
          </Button>
        </div>
      </header>
      
      <div className="px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/10 flex items-center justify-between gap-2">
        <span className="text-lg font-bold text-foreground truncate min-w-0 flex-1" title={playerName}>{playerName}</span>
        {leaderboard.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="gap-1 text-xs flex-shrink-0"
            data-testid="button-toggle-leaderboard"
          >
            <Users className="w-4 h-4" />
            Scores
            {showLeaderboard ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showLeaderboard && leaderboard.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 bg-card/50 border-b border-primary/10 space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Leaderboard</p>
              {[...leaderboard].sort((a, b) => b.score - a.score).map((player, idx) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                    player.id === playerId ? 'bg-primary/20 border border-primary/30' : 'bg-muted/30'
                  }`}
                  data-testid={`leaderboard-player-${player.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-lg flex-shrink-0">
                      {PLAYER_AVATARS.find(a => a.id === player.avatar)?.emoji || PLAYER_AVATARS[0].emoji}
                    </span>
                    <span className={`font-medium truncate min-w-0 flex-1 ${player.id === playerId ? 'text-primary' : 'text-foreground'}`} title={player.name}>
                      {player.name}
                      {player.id === playerId && <span className="text-xs ml-1">(you)</span>}
                    </span>
                  </div>
                  <span className="font-bold text-foreground flex-shrink-0">{player.score}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {status === "reconnecting" && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 text-center text-sm text-foreground">
          <RefreshCw className="w-4 h-4 inline-block mr-2 animate-spin" />
          Reconnecting in {reconnectCountdown ?? '...'}s... (Attempt {reconnectAttempts}/5)
        </div>
      )}

      {status === "disconnected" && (
        <div className="bg-destructive/20 border-b border-destructive/30 px-4 py-3 text-center">
          <p className="text-sm text-foreground mb-2">
            {reconnectAttempts >= 5 
              ? "Couldn't reconnect - tap below to try again" 
              : "Disconnected from game"}
          </p>
          <Button 
            size="sm" 
            onClick={handleManualReconnect}
            className="gap-2"
            data-testid="button-reconnect"
          >
            <RefreshCw className="w-4 h-4" />
            Reconnect
          </Button>
        </div>
      )}

      <main className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {gameMode === "psyop" && psyopPhase === "submitting" && psyopQuestion ? (
            <motion.div
              key="psyop-submit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md space-y-6"
            >
              {psyopCountdown > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center mb-4"
                >
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${psyopCountdown <= 10 ? 'border-red-500/50 bg-red-500/10' : 'border-purple-500/30 bg-purple-500/5'}`}>
                    <Timer className={`w-4 h-4 ${psyopCountdown <= 10 ? 'text-red-500' : 'text-purple-400'}`} />
                    <motion.span
                      key={psyopCountdown}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`text-xl font-black font-mono ${psyopCountdown <= 10 ? 'text-red-500' : 'text-purple-400'}`}
                      data-testid="text-player-countdown"
                    >
                      {psyopCountdown}
                    </motion.span>
                  </div>
                </motion.div>
              )}
              <Card className="border-purple-500/30">
                <div className="p-6 space-y-4">
                  <div className="text-center">
                    <h2 className="text-lg font-bold mb-2">Write a believable lie:</h2>
                    <p className="text-xl leading-relaxed">
                      {psyopQuestion.factText.includes('[REDACTED]') ? (
                        <>
                          {psyopQuestion.factText.split('[REDACTED]')[0]}
                          <span className="px-2 py-1 mx-1 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold">[REDACTED]</span>
                          {psyopQuestion.factText.split('[REDACTED]')[1]}
                        </>
                      ) : psyopQuestion.factText}
                    </p>
                  </div>

                  {psyopSubmitted ? (
                    <div className="text-center py-8">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Sparkles className="w-16 h-16 mx-auto text-purple-500 dark:text-purple-400 mb-4" />
                      </motion.div>
                      <p className="text-lg font-medium">Lie submitted!</p>
                      <p className="text-muted-foreground text-sm">Waiting for others...</p>
                    </div>
                  ) : (
                    <>
                      <Input
                        value={psyopLieText}
                        onChange={(e) => setPsyopLieText(e.target.value)}
                        placeholder="Enter a believable lie..."
                        className="text-lg"
                        maxLength={200}
                        data-testid="input-psyop-lie"
                      />
                      <Button
                        onClick={() => {
                          if (psyopLieText.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
                            wsRef.current.send(JSON.stringify({
                              type: "psyop:submit:lie",
                              lieText: psyopLieText.trim(),
                            }));
                            setPsyopSubmitted(true);
                            setPsyopLieText("");
                          }
                        }}
                        disabled={!psyopLieText.trim()}
                        className="w-full gap-2"
                        data-testid="button-submit-lie"
                      >
                        <Eye className="w-4 h-4" />
                        Submit Lie
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </motion.div>
          ) : gameMode === "psyop" && psyopPhase === "voting" && psyopOptions.length > 0 ? (
            <motion.div
              key="psyop-vote"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md space-y-4"
            >
              {psyopCountdown > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center mb-2"
                >
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${psyopCountdown <= 10 ? 'border-red-500/50 bg-red-500/10' : 'border-purple-500/30 bg-purple-500/5'}`}>
                    <Timer className={`w-4 h-4 ${psyopCountdown <= 10 ? 'text-red-500' : 'text-purple-400'}`} />
                    <motion.span
                      key={psyopCountdown}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`text-xl font-black font-mono ${psyopCountdown <= 10 ? 'text-red-500' : 'text-purple-400'}`}
                      data-testid="text-player-vote-countdown"
                    >
                      {psyopCountdown}
                    </motion.span>
                  </div>
                </motion.div>
              )}
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold">Which is the truth?</h2>
                <p className="text-muted-foreground text-sm">Tap the answer you think is real</p>
              </div>

              {psyopVoted ? (
                <div className="text-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Clock className="w-16 h-16 mx-auto text-purple-500 dark:text-purple-400 mb-4" />
                  </motion.div>
                  <p className="text-lg font-medium">Vote cast!</p>
                  <p className="text-muted-foreground text-sm">Waiting for reveal...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {psyopOptions.map((option, i) => (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => {
                        if (wsRef.current?.readyState === WebSocket.OPEN) {
                          wsRef.current.send(JSON.stringify({
                            type: "psyop:submit:vote",
                            votedForId: option.id,
                          }));
                          setPsyopVoted(true);
                        }
                      }}
                      className="w-full p-4 border rounded-lg text-left hover-elevate bg-card"
                      data-testid={`button-vote-${option.id}`}
                    >
                      <span className="font-bold mr-2 text-purple-600 dark:text-purple-400">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {option.text}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : gameMode === "psyop" && psyopPhase === "revealed" && psyopCorrectAnswer ? (
            <motion.div
              key="psyop-revealed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-4"
              data-testid="psyop-reveal-screen"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
              >
                {psyopRevealData?.foundTruth ? (
                  <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-10 h-10 text-green-500" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-3">
                    <XCircle className="w-10 h-10 text-red-400" />
                  </div>
                )}
              </motion.div>

              <div>
                <p className="text-sm font-medium mb-1" data-testid="text-vote-result">
                  {psyopRevealData?.foundTruth ? (
                    <span className="text-green-500">You found the truth!</span>
                  ) : (
                    <span className="text-red-400">You got tricked!</span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">The truth was</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-correct-answer">
                  {psyopCorrectAnswer}
                </p>
              </div>

              {psyopRevealData && psyopRevealData.yourLiesBelieved > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-md inline-block"
                  data-testid="text-lie-success"
                >
                  <span className="text-sm text-purple-400">
                    <Eye className="w-3.5 h-3.5 inline mr-1" />
                    Your lie fooled {psyopRevealData.yourLiesBelieved} player{psyopRevealData.yourLiesBelieved !== 1 ? 's' : ''}!
                  </span>
                </motion.div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                {psyopRevealData && psyopRevealData.yourScore > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="text-center px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-md"
                    data-testid="text-round-points"
                  >
                    <div className="text-lg font-bold text-green-500">+{psyopRevealData.yourScore}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">This Round</div>
                  </motion.div>
                )}
                <div className="text-center px-4 py-2 bg-muted/40 rounded-md" data-testid="text-total-score">
                  <div className="text-lg font-bold">{score}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
                </div>
              </div>

              <motion.p
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-sm text-muted-foreground pt-2"
              >
                Waiting for next question...
              </motion.p>
            </motion.div>
          ) : hostPickingGrid ? (
            <motion.div
              key="picking-grid"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-32 h-32 rounded-2xl bg-gradient-to-br from-rose-300 via-pink-300 to-fuchsia-300 flex items-center justify-center mx-auto shadow-2xl mb-6"
              >
                <Grid3X3 className="w-16 h-16 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-picking-grid-title">Getting Next Grid Ready</h2>
              <p className="text-muted-foreground" data-testid="text-picking-grid-subtitle">Host is selecting the next round...</p>
              {currentGridName && (
                <p className="text-sm text-muted-foreground/60 mt-2" data-testid="text-last-grid-name">Last played: {currentGridName}</p>
              )}
              <motion.div
                className="flex justify-center gap-2 mt-4"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div className="w-2 h-2 rounded-full bg-pink-400" />
                <div className="w-2 h-2 rounded-full bg-pink-400" />
                <div className="w-2 h-2 rounded-full bg-pink-400" />
              </motion.div>
            </motion.div>
          ) : feedback ? (
            <motion.div
              key="feedback"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="text-center"
            >
              {feedback.correct ? (
                <>
                  <motion.div
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5, repeat: 3 }}
                  >
                    <Trophy className="w-32 h-32 text-yellow-400 mx-auto" />
                  </motion.div>
                  <h2 className="text-4xl font-black text-primary mt-4">Correct!</h2>
                  <p className="text-2xl text-foreground mt-2">+{feedback.points} points</p>
                </>
              ) : (
                <>
                  <XCircle className="w-32 h-32 text-destructive mx-auto" />
                  <h2 className="text-4xl font-black text-destructive mt-4">Wrong</h2>
                </>
              )}
            </motion.div>
          ) : buzzPosition !== null ? (
            <motion.div
              key="buzzed"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-center"
            >
              {buzzPosition === 1 ? (
                <>
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-48 h-48 rounded-full gradient-gold flex items-center justify-center mx-auto shadow-2xl relative"
                    data-testid="buzzed-first-indicator"
                  >
                    <Star className="absolute -top-2 -right-2 w-10 h-10 text-yellow-300 fill-yellow-300" aria-hidden="true" />
                    <Star className="absolute -top-4 left-4 w-6 h-6 text-yellow-200 fill-yellow-200" aria-hidden="true" />
                    <span className="text-7xl font-black text-white drop-shadow-lg" data-testid="buzz-position-first">#1</span>
                  </motion.div>
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-black text-primary mt-6"
                    data-testid="buzzed-first-title"
                  >
                    You Buzzed First!
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg text-muted-foreground mt-2 flex items-center justify-center gap-2"
                    data-testid="buzzed-first-message"
                  >
                    <Sparkles className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                    Get ready to answer!
                  </motion.p>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-40 h-40 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center mx-auto"
                    data-testid="buzzed-waiting-indicator"
                  >
                    <span className="text-6xl font-black text-white" data-testid="buzz-position-value">#{buzzPosition}</span>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground mt-4" data-testid="buzzed-waiting-title">
                    You're #{buzzPosition} in line
                  </h2>
                  <p className="text-muted-foreground mt-2" data-testid="buzzed-waiting-message">Waiting for your turn...</p>
                </>
              )}
            </motion.div>
          ) : buzzerBlocked ? (
            <motion.div
              key="blocked"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center flex flex-col items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <motion.div 
                className="w-48 h-48 rounded-full bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 flex flex-col items-center justify-center mx-auto shadow-2xl border-4 border-slate-500/40 relative"
                style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), inset 0 -4px 12px rgba(0,0,0,0.2)' }}
              >
                <XCircle className="w-20 h-20 text-slate-400/80 drop-shadow-lg" aria-hidden="true" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mt-6" data-testid="buzzer-blocked-title">Already Tried</h2>
              <p className="text-muted-foreground mt-2 max-w-xs mx-auto text-base" data-testid="buzzer-blocked-message">Wait for the next question</p>
            </motion.div>
          ) : buzzerLocked ? (
            <motion.div
              key="locked"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center flex flex-col items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <motion.div 
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-72 h-72 rounded-full bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 flex flex-col items-center justify-center mx-auto shadow-2xl border-4 border-slate-400/40 relative"
                style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), inset 0 -4px 12px rgba(0,0,0,0.2)' }}
              >
                <motion.div
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Lock className="w-24 h-24 text-slate-300/80 mb-2 drop-shadow-lg" aria-hidden="true" />
                </motion.div>
                <span className="text-slate-300 text-2xl font-black tracking-wider" data-testid="buzzer-locked-label">LOCKED</span>
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mt-8" data-testid="buzzer-status-title">You're In!</h2>
              <p className="text-muted-foreground mt-2 max-w-xs mx-auto text-base" data-testid="buzzer-status-message">Buzzer unlocks when the host picks a question</p>
            </motion.div>
          ) : (
            <motion.div
              key="buzzer"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center flex flex-col items-center justify-center"
            >
              <motion.button
                whileTap={{ scale: 0.82 }}
                whileHover={{ scale: 1.03 }}
                onClick={handleBuzz}
                className="w-80 h-80 sm:w-72 sm:h-72 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 flex flex-col items-center justify-center shadow-2xl active:shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-amber-400/50 relative overflow-visible touch-manipulation"
                style={{ 
                  WebkitTapHighlightColor: 'transparent', 
                  minWidth: '280px', 
                  minHeight: '280px',
                  boxShadow: '0 25px 60px -12px rgba(251, 191, 36, 0.5), inset 0 -6px 16px rgba(0,0,0,0.15)'
                }}
                data-testid="button-buzz"
                aria-label="Buzz in - tap to answer"
                role="button"
              >
                {/* Triple pulse ring effect */}
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-4 border-amber-400 -z-10"
                />
                <motion.div
                  animate={{ scale: [1, 1.7, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.25 }}
                  className="absolute inset-0 rounded-full border-4 border-amber-300 -z-20"
                />
                <motion.div
                  animate={{ scale: [1, 1.9, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                  className="absolute inset-0 rounded-full border-4 border-amber-200 -z-30"
                />
                {/* Inner glow */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-yellow-300/30 to-transparent" />
                <Zap className="w-32 h-32 text-white drop-shadow-lg mb-1" aria-hidden="true" />
                <span className="text-white text-3xl font-black tracking-wider drop-shadow-md">BUZZ!</span>
              </motion.button>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-amber-600 dark:text-amber-400 font-bold mt-8 text-xl"
                data-testid="buzzer-hint"
              >
                Tap fast to answer first!
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Reaction buttons */}
      <div className="py-3 px-4 flex items-center justify-center gap-2">
        {[
          { type: 'clap', Icon: Hand, label: 'Clap', color: 'text-amber-400' },
          { type: 'fire', Icon: Flame, label: 'Fire', color: 'text-orange-500' },
          { type: 'laugh', Icon: Laugh, label: 'Laugh', color: 'text-yellow-400' },
          { type: 'wow', Icon: CircleDot, label: 'Wow', color: 'text-purple-400' },
          { type: 'thumbsup', Icon: ThumbsUp, label: 'Thumbs Up', color: 'text-emerald-400' },
        ].map(r => (
          <motion.button
            key={r.type}
            whileTap={{ scale: 0.8 }}
            onClick={() => handleReaction(r.type)}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label={r.label}
            data-testid={`button-reaction-${r.type}`}
          >
            <r.Icon className={`w-6 h-6 ${r.color}`} />
          </motion.button>
        ))}
      </div>

      <footer className="p-4 text-center border-t border-border/30 bg-card/40 backdrop-blur" role="status" aria-live="polite" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-center gap-3">
          <div className={`w-3 h-3 rounded-full shrink-0 ${hostPickingGrid ? "bg-purple-500 animate-pulse" : buzzerLocked ? "bg-muted-foreground/50" : "bg-emerald-500 animate-pulse"}`} data-testid="footer-status-dot" />
          <span className={`text-sm font-medium ${hostPickingGrid ? "text-purple-500 font-bold" : buzzerLocked ? "text-muted-foreground" : "text-primary font-bold"}`} data-testid="footer-status-text">
            {hostPickingGrid ? "Host choosing next grid..." : buzzerLocked ? "Waiting for next question..." : "TAP THE BUZZER!"}
          </span>
        </div>
      </footer>
    </div>
  );
}
