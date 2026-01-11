import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Copy, Check, Lock, Unlock, RotateCcw, Wifi, WifiOff, QrCode, X, RefreshCw, Trash2 } from "lucide-react";
import { soundManager } from "@/lib/sounds";
import { useScore } from "@/components/ScoreContext";

export interface BuzzerPlayer {
  id: string;
  name: string;
}
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConnectedPlayer {
  id: string;
  name: string;
}

export interface BuzzEvent {
  playerId: string;
  playerName: string;
  position: number;
  timestamp: number;
}

export interface BuzzerPanelHandle {
  unlock: () => void;
  lock: () => void;
  reset: () => void;
  getPlayers: () => BuzzerPlayer[];
  getBuzzQueue: () => BuzzEvent[];
}

function getSavedRoomCode(): string | null {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem("buzzer-room-code");
    } catch {
      return null;
    }
  }
  return null;
}

export const BuzzerPanel = forwardRef<BuzzerPanelHandle>(function BuzzerPanel(_, ref) {
  const [roomCode, setRoomCode] = useState<string | null>(getSavedRoomCode);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [players, setPlayers] = useState<ConnectedPlayer[]>([]);
  const [buzzQueue, setBuzzQueue] = useState<BuzzEvent[]>([]);
  const [buzzerLocked, setBuzzerLocked] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const { addContestantWithId, removeContestant } = useScore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setReconnecting(false);
      reconnectAttemptsRef.current = 0;
      
      if (roomCode) {
        ws.send(JSON.stringify({ type: "host:join", code: roomCode }));
      } else {
        ws.send(JSON.stringify({ type: "host:create" }));
      }
      
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
        case "room:created":
          setRoomCode(data.code);
          localStorage.setItem("buzzer-room-code", data.code);
          break;
        case "room:joined":
          setRoomCode(data.code);
          setPlayers(data.players || []);
          if (data.buzzerLocked !== undefined) setBuzzerLocked(data.buzzerLocked);
          break;
        case "player:joined":
          setPlayers((prev) => {
            if (prev.some(p => p.id === data.player.id)) return prev;
            return [...prev, data.player];
          });
          addContestantWithId(data.player.id, data.player.name);
          soundManager.play("click", 0.3);
          break;
        case "player:left":
          setPlayers((prev) => prev.filter((p) => p.id !== data.playerId));
          removeContestant(data.playerId);
          break;
        case "player:buzzed":
          setBuzzQueue((prev) => [...prev, data]);
          if (data.position === 1) {
            soundManager.play("reveal", 0.5);
          }
          break;
        case "buzzer:reset":
          setBuzzQueue([]);
          break;
        case "sync:complete":
          soundManager.play("click", 0.3);
          break;
        case "pong":
          break;
        case "error":
          if (data.message === "Room not found") {
            localStorage.removeItem("buzzer-room-code");
            setRoomCode(null);
          }
          break;
      }
    };

    ws.onclose = () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      setConnected(false);
      
      if (roomCode && reconnectAttemptsRef.current < 5) {
        setReconnecting(true);
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    };
  }, [roomCode]);

  useEffect(() => {
    connect();

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, []);

  const unlockBuzzer = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "host:unlock" }));
      setBuzzerLocked(false);
      setBuzzQueue([]);
    }
  }, []);

  const lockBuzzer = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "host:lock" }));
      setBuzzerLocked(true);
    }
  }, []);

  const resetBuzzer = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "host:reset" }));
      setBuzzQueue([]);
    }
  }, []);

  const syncPlayers = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "host:sync" }));
    }
  }, []);

  const createNewRoom = useCallback(() => {
    localStorage.removeItem("buzzer-room-code");
    setRoomCode(null);
    setPlayers([]);
    setBuzzQueue([]);
    wsRef.current?.close();
    setTimeout(() => connect(), 100);
  }, [connect]);

  useImperativeHandle(ref, () => ({
    unlock: unlockBuzzer,
    lock: lockBuzzer,
    reset: resetBuzzer,
    getPlayers: () => players,
    getBuzzQueue: () => buzzQueue,
  }), [unlockBuzzer, lockBuzzer, resetBuzzer, players, buzzQueue]);

  const sendFeedback = (playerId: string, correct: boolean, points: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "host:feedback",
        playerId,
        correct,
        points,
      }));
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/play/${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const joinUrl = roomCode ? `${window.location.origin}/play/${roomCode}` : "";

  if (!roomCode) {
    return (
      <Card className="p-4 bg-card/60 border-primary/20">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Zap className="w-4 h-4" />
          <span>Setting up buzzer system...</span>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-3 bg-card/60 border-primary/20">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {connected ? (
              <Wifi className="w-4 h-4 text-primary" />
            ) : reconnecting ? (
              <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
            ) : (
              <WifiOff className="w-4 h-4 text-destructive" />
            )}
            <span className="font-mono font-bold text-lg text-foreground">{roomCode}</span>
            <span className="text-xs text-muted-foreground">({players.length} players)</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowQR(true)}
              className="gap-1"
              data-testid="button-show-qr"
            >
              <QrCode className="w-4 h-4" />
              QR
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={copyLink}
              className="gap-1"
              data-testid="button-copy-link"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {buzzerLocked ? (
              <Button
                size="sm"
                onClick={unlockBuzzer}
                className="gradient-header text-white gap-1"
                data-testid="button-unlock-buzzer"
              >
                <Unlock className="w-4 h-4" />
                Unlock
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                onClick={lockBuzzer}
                className="gap-1"
                data-testid="button-lock-buzzer"
              >
                <Lock className="w-4 h-4" />
                Lock
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={resetBuzzer}
              title="Reset buzzer queue"
              data-testid="button-reset-buzzer"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={syncPlayers}
              title="Re-sync all players (fixes frozen buzzers)"
              data-testid="button-sync-players"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={createNewRoom}
              title="Create new room"
              className="text-muted-foreground"
              data-testid="button-new-room"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join the Game</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={joinUrl} size={200} />
            </div>
            <div className="text-center">
              <p className="text-muted-foreground mb-2">Room Code</p>
              <p className="text-4xl font-mono font-bold tracking-widest">{roomCode}</p>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>Scan QR code or visit:</p>
              <p className="font-mono text-foreground">{joinUrl}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});
