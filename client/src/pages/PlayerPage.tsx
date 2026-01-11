import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, CheckCircle2, XCircle, Wifi, WifiOff, Trophy, Clock, RefreshCw } from "lucide-react";
import confetti from "canvas-confetti";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error" | "reconnecting";

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

export default function PlayerPage() {
  const params = useParams<{ code?: string }>();
  const [, setLocation] = useLocation();
  const savedSession = getSession();
  const [roomCode, setRoomCode] = useState(params.code || savedSession?.roomCode || "");
  const [playerName, setPlayerName] = useState(savedSession?.playerName || "");
  const [playerId, setPlayerId] = useState<string | null>(savedSession?.playerId || null);
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [buzzerLocked, setBuzzerLocked] = useState(true);
  const [buzzPosition, setBuzzPosition] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; points: number } | null>(null);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const joinedRef = useRef(false);
  const shouldReconnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);

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
          setBuzzerLocked(data.buzzerLocked);
          saveSession(roomCode.toUpperCase(), playerName, data.playerId);
          break;
        case "error":
          setStatus("error");
          if (data.message === "Room not found") {
            clearSession();
          }
          alert(data.message);
          break;
        case "kicked":
          clearSession();
          setJoined(false);
          joinedRef.current = false;
          shouldReconnectRef.current = false;
          setStatus("disconnected");
          alert("You were removed from the game by the host.");
          break;
        case "buzzer:unlocked":
          setBuzzerLocked(false);
          setHasBuzzed(false);
          setBuzzPosition(null);
          setFeedback(null);
          break;
        case "buzzer:locked":
          setBuzzerLocked(true);
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
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
          break;
        case "pong":
          break;
      }
    };

    ws.onclose = () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      
      if (joinedRef.current && shouldReconnectRef.current && reconnectAttemptsRef.current < 5) {
        setStatus("reconnecting");
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          setReconnectAttempts(reconnectAttemptsRef.current);
          connect(true);
        }, delay);
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
      wsRef.current?.close();
    };
  }, []);

  const handleLeaveGame = () => {
    clearSession();
    shouldReconnectRef.current = false;
    joinedRef.current = false;
    wsRef.current?.close();
    setJoined(false);
    setPlayerId(null);
    setStatus("disconnected");
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
      try {
        navigator.vibrate?.(100);
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
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-block"
              >
                <Zap className="w-16 h-16 text-yellow-400 mx-auto" />
              </motion.div>
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
    <div className="min-h-screen gradient-game flex flex-col">
      <header className="p-4 flex items-center justify-between bg-card/40 backdrop-blur border-b border-primary/20">
        <div>
          <span className="text-xs text-muted-foreground">Room</span>
          <span className="ml-2 font-mono font-bold text-foreground">{roomCode}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{playerName}</span>
          {status === "connected" && <Wifi className="w-4 h-4 text-primary" />}
          {status === "reconnecting" && <RefreshCw className="w-4 h-4 animate-spin text-yellow-500" />}
          {status === "disconnected" && <WifiOff className="w-4 h-4 text-red-500" />}
          <Button size="sm" variant="ghost" onClick={handleLeaveGame} className="text-xs text-muted-foreground" data-testid="button-leave-game">
            Leave
          </Button>
        </div>
      </header>

      {status === "reconnecting" && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 text-center text-sm text-yellow-200">
          <RefreshCw className="w-4 h-4 inline-block mr-2 animate-spin" />
          Connection lost. Reconnecting... (Attempt {reconnectAttempts + 1}/5)
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
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className={`w-40 h-40 rounded-full flex items-center justify-center mx-auto ${
                  buzzPosition === 1 ? "gradient-gold" : "bg-white/20"
                }`}
              >
                <span className="text-6xl font-black">#{buzzPosition}</span>
              </motion.div>
              <p className="text-xl text-foreground mt-4">
                {buzzPosition === 1 ? "You buzzed first!" : `You're #${buzzPosition} in line`}
              </p>
              <p className="text-muted-foreground mt-2">Waiting for host...</p>
            </motion.div>
          ) : buzzerLocked ? (
            <motion.div
              key="locked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
              role="status"
              aria-live="polite"
            >
              <div className="w-48 h-48 rounded-full bg-muted/30 border-4 border-dashed border-muted-foreground/30 flex items-center justify-center mx-auto">
                <Clock className="w-16 h-16 text-muted-foreground opacity-50" />
              </div>
              <h2 className="text-xl font-bold text-muted-foreground mt-4">Buzzer Locked</h2>
              <p className="text-sm text-muted-foreground mt-1">Wait for host to open a question</p>
            </motion.div>
          ) : (
            <motion.button
              key="buzzer"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleBuzz}
              className="w-64 h-64 rounded-full gradient-header flex items-center justify-center shadow-2xl active:shadow-lg transition-shadow focus:outline-none focus:ring-4 focus:ring-primary/50"
              data-testid="button-buzz"
              aria-label="Buzz in - tap to answer"
              role="button"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Zap className="w-24 h-24 text-white" aria-hidden="true" />
              </motion.div>
            </motion.button>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-4 text-center" role="status" aria-live="polite">
        <span className={`text-sm font-medium ${buzzerLocked ? "text-muted-foreground" : "text-primary"}`}>
          {buzzerLocked ? "Buzzer locked - waiting for host" : "Buzzer ready - tap to answer!"}
        </span>
      </footer>
    </div>
  );
}
