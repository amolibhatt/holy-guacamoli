import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, XCircle, Wifi, WifiOff, Trophy, Clock, RefreshCw, Star, Sparkles, Users, ChevronUp, ChevronDown, Volume2, VolumeX } from "lucide-react";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";
import { soundManager } from "@/lib/sounds";
import { InstallPrompt } from "@/components/InstallPrompt";

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

function saveSession(roomCode: string, playerName: string, playerId: string) {
  try {
    localStorage.setItem("buzzer-session", JSON.stringify({ roomCode, playerName, playerId }));
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
  const [playerId, setPlayerId] = useState<string | null>(savedSession?.playerId || null);
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [buzzerLocked, setBuzzerLocked] = useState(true);
  const [buzzPosition, setBuzzPosition] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; points: number } | null>(null);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [showBuzzFlash, setShowBuzzFlash] = useState(false);
  const [showCorrectFlash, setShowCorrectFlash] = useState(false);
  const [showWrongFlash, setShowWrongFlash] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Array<{ id: string; name: string; score: number }>>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const wsRef = useRef<WebSocket | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const joinedRef = useRef(false);
  const shouldReconnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const playerIdRef = useRef<string | null>(playerId);

  const connect = useCallback((isReconnect = false) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

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
        playerId: isReconnect ? playerId : undefined,
      }));
      
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 10000);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "joined":
          setJoined(true);
          joinedRef.current = true;
          setPlayerId(data.playerId);
          playerIdRef.current = data.playerId;
          setBuzzerLocked(data.buzzerLocked);
          if (data.score !== undefined) setScore(data.score);
          saveSession(roomCode.toUpperCase(), playerName, data.playerId);
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
            setLeaderboard(data.players.map((p: any) => ({ id: p.id, name: p.name, score: p.score })));
          }
          break;
        case "error":
          setStatus("error");
          if (data.message === "Room not found") {
            clearSession();
          }
          toast({
            title: "Error",
            description: data.message,
            variant: "destructive",
          });
          break;
        case "kicked":
          clearSession();
          setJoined(false);
          joinedRef.current = false;
          shouldReconnectRef.current = false;
          setStatus("disconnected");
          toast({
            title: "Removed from game",
            description: "The host removed you from the game.",
            variant: "destructive",
          });
          break;
        case "room:closed":
          clearSession();
          setJoined(false);
          joinedRef.current = false;
          shouldReconnectRef.current = false;
          setStatus("disconnected");
          toast({
            title: "Game ended",
            description: data.reason || "The game room has been closed.",
            variant: "destructive",
          });
          break;
        case "buzzer:unlocked":
          setBuzzerLocked(false);
          setHasBuzzed(false);
          setBuzzPosition(null);
          setFeedback(null);
          soundManager.play('whoosh', 0.4);
          try { navigator.vibrate?.(50); } catch {}
          break;
        case "buzzer:locked":
          setBuzzerLocked(true);
          soundManager.play('click', 0.3);
          break;
        case "buzzer:reset":
          setHasBuzzed(false);
          setBuzzPosition(null);
          setFeedback(null);
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
      }
    };

    ws.onclose = () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      if (joinedRef.current && shouldReconnectRef.current && reconnectAttemptsRef.current < 5) {
        setStatus("reconnecting");
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
        const seconds = Math.ceil(delay / 1000);
        setReconnectCountdown(seconds);
        
        countdownIntervalRef.current = setInterval(() => {
          setReconnectCountdown(prev => {
            if (prev !== null && prev > 1) return prev - 1;
            return prev;
          });
        }, 1000);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          setReconnectCountdown(null);
          reconnectAttemptsRef.current++;
          setReconnectAttempts(reconnectAttemptsRef.current);
          connect(true);
        }, delay);
      } else if (joinedRef.current) {
        setStatus("disconnected");
      } else {
        setStatus("disconnected");
        setJoined(false);
        joinedRef.current = false;
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };
  }, [roomCode, playerName, playerId]);

  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    return soundManager.subscribe(() => {
      setSoundEnabled(soundManager.isEnabled());
    });
  }, []);

  const handleToggleSound = () => {
    soundManager.toggle();
  };

  const handleLeaveGame = () => {
    clearSession();
    shouldReconnectRef.current = false;
    joinedRef.current = false;
    wsRef.current?.close();
    setJoined(false);
    setPlayerId(null);
    setStatus("disconnected");
  };

  const handleManualReconnect = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setReconnectCountdown(null);
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
    shouldReconnectRef.current = true;
    setStatus("connecting");
    connect(true);
  };

  const handleJoin = () => {
    if (roomCode.trim() && playerName.trim()) {
      setStatus("connecting");
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

  if (!joined) {
    return (
      <div className="min-h-screen gradient-game flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="w-full max-w-sm p-6 bg-card/90 backdrop-blur border-primary/30">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center mx-auto">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mt-4">Join Game</h1>
              <p className="text-muted-foreground text-sm mt-1">Enter the room code to play</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Room Code</label>
                <Input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABCD"
                  className="text-center text-2xl font-mono tracking-widest uppercase"
                  maxLength={4}
                  data-testid="input-room-code"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Your Name</label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  data-testid="input-player-name"
                />
              </div>
              <Button
                onClick={handleJoin}
                disabled={!roomCode.trim() || !playerName.trim() || status === "connecting"}
                className="w-full gradient-header text-white font-bold"
                size="lg"
                data-testid="button-join-game"
              >
                {status === "connecting" ? "Connecting..." : "Join Game"}
              </Button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {status === "connected" && <><Wifi className="w-4 h-4 text-primary" /> Connected</>}
              {status === "disconnected" && <><WifiOff className="w-4 h-4" /> Not connected</>}
              {status === "reconnecting" && <><RefreshCw className="w-4 h-4 animate-spin text-yellow-500" /> Reconnecting...</>}
              {status === "error" && <><WifiOff className="w-4 h-4 text-red-500" /> Connection error</>}
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-game flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <InstallPrompt />
      <FullScreenFlash show={showBuzzFlash} color="bg-amber-400/60" />
      <FullScreenFlash show={showCorrectFlash} color="bg-green-400/60" />
      <FullScreenFlash show={showWrongFlash} color="bg-red-400/60" />
      
      <header className="px-4 py-3 flex items-center justify-between bg-card/80 backdrop-blur-xl border-b border-primary/20 shadow-lg" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {status === "connected" && <Wifi className="w-4 h-4 text-green-500" />}
            {status === "reconnecting" && <RefreshCw className="w-4 h-4 animate-spin text-yellow-500" />}
            {status === "disconnected" && <WifiOff className="w-4 h-4 text-red-500" />}
            <span className="font-mono font-bold text-lg text-foreground">{roomCode}</span>
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
            className="h-8 w-8"
            data-testid="button-toggle-sound"
            title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleLeaveGame} className="text-xs text-muted-foreground hover:text-destructive" data-testid="button-leave-game">
            Leave
          </Button>
        </div>
      </header>
      
      <div className="px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/10 flex items-center justify-between">
        <span className="text-lg font-bold text-foreground">{playerName}</span>
        {leaderboard.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="gap-1 text-xs"
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
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-400 text-black' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className={`font-medium ${player.id === playerId ? 'text-primary' : 'text-foreground'}`}>
                      {player.name}
                      {player.id === playerId && <span className="text-xs ml-1">(you)</span>}
                    </span>
                  </div>
                  <span className="font-bold text-foreground">{player.score}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {status === "reconnecting" && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 text-center text-sm text-foreground">
          <RefreshCw className="w-4 h-4 inline-block mr-2 animate-spin" />
          Connection lost. Reconnecting in {reconnectCountdown ?? '...'}s (Attempt {reconnectAttempts + 1}/5)
        </div>
      )}

      {status === "disconnected" && (
        <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-3 text-center">
          <p className="text-sm text-foreground mb-2">
            {reconnectAttempts >= 5 
              ? "Connection lost after multiple attempts" 
              : "Connection lost"}
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
          {feedback ? (
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
                  <XCircle className="w-32 h-32 text-red-400 mx-auto" />
                  <h2 className="text-4xl font-black text-red-400 mt-4">Wrong</h2>
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
                  >
                    <Star className="absolute -top-2 -right-2 w-10 h-10 text-yellow-300 fill-yellow-300" />
                    <Star className="absolute -top-4 left-4 w-6 h-6 text-yellow-200 fill-yellow-200" />
                    <span className="text-7xl font-black text-white drop-shadow-lg">#1</span>
                  </motion.div>
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-black text-primary mt-6"
                  >
                    You Buzzed First!
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg text-muted-foreground mt-2 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5 text-primary" />
                    Get ready to answer!
                  </motion.p>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-40 h-40 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center mx-auto"
                  >
                    <span className="text-6xl font-black text-white">#{buzzPosition}</span>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground mt-4">
                    You're #{buzzPosition} in line
                  </h2>
                  <p className="text-muted-foreground mt-2">Waiting for your turn...</p>
                </>
              )}
            </motion.div>
          ) : buzzerLocked ? (
            <motion.div
              key="locked"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
              role="status"
              aria-live="polite"
            >
              <motion.div 
                animate={{ opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-56 h-56 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 border-4 border-dashed border-muted-foreground/20 flex items-center justify-center mx-auto"
              >
                <Clock className="w-20 h-20 text-muted-foreground/40" />
              </motion.div>
              <h2 className="text-2xl font-bold text-muted-foreground mt-6">Get Ready...</h2>
              <p className="text-muted-foreground mt-2 max-w-xs mx-auto">The host is setting up the next question. Be ready to buzz!</p>
            </motion.div>
          ) : (
            <motion.div
              key="buzzer"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.02 }}
                onClick={handleBuzz}
                className="w-72 h-72 rounded-full gradient-header flex flex-col items-center justify-center shadow-2xl active:shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-primary/50 relative overflow-visible"
                data-testid="button-buzz"
                aria-label="Buzz in - tap to answer"
                role="button"
              >
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-primary/20 -z-10"
                />
                <Zap className="w-24 h-24 text-white mb-2" aria-hidden="true" />
                <span className="text-white text-xl font-black tracking-wide">BUZZ!</span>
              </motion.button>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-primary font-medium mt-6 text-lg"
              >
                Tap fast to answer first!
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-4 text-center border-t border-border/30 bg-card/40 backdrop-blur" role="status" aria-live="polite" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-center gap-3">
          <div className={`w-3 h-3 rounded-full ${buzzerLocked ? "bg-muted-foreground/50" : "bg-green-500 animate-pulse"}`} />
          <span className={`text-sm font-medium ${buzzerLocked ? "text-muted-foreground" : "text-primary font-bold"}`}>
            {buzzerLocked ? "Waiting for next question..." : "TAP THE BUZZER!"}
          </span>
        </div>
      </footer>
    </div>
  );
}
