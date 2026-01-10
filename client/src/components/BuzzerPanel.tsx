import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Users, Copy, Check, Lock, Unlock, RotateCcw, Wifi, WifiOff, QrCode, X } from "lucide-react";
import { soundManager } from "@/lib/sounds";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BuzzEvent {
  playerId: string;
  playerName: string;
  position: number;
  timestamp: number;
}

interface ConnectedPlayer {
  id: string;
  name: string;
}

export interface BuzzerPanelHandle {
  unlock: () => void;
  lock: () => void;
  reset: () => void;
}

export const BuzzerPanel = forwardRef<BuzzerPanelHandle>(function BuzzerPanel(_, ref) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [players, setPlayers] = useState<ConnectedPlayer[]>([]);
  const [buzzQueue, setBuzzQueue] = useState<BuzzEvent[]>([]);
  const [buzzerLocked, setBuzzerLocked] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (roomCode) {
        ws.send(JSON.stringify({ type: "host:join", code: roomCode }));
      } else {
        ws.send(JSON.stringify({ type: "host:create" }));
      }
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
          break;
        case "player:joined":
          setPlayers((prev) => [...prev, data.player]);
          soundManager.play("click", 0.3);
          break;
        case "player:left":
          setPlayers((prev) => prev.filter((p) => p.id !== data.playerId));
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
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };
  }, [roomCode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedCode = localStorage.getItem("buzzer-room-code");
        if (savedCode) {
          setRoomCode(savedCode);
        }
      } catch {}
    }
    connect();

    return () => {
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

  useImperativeHandle(ref, () => ({
    unlock: unlockBuzzer,
    lock: lockBuzzer,
    reset: resetBuzzer,
  }), [unlockBuzzer, lockBuzzer, resetBuzzer]);

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
            ) : (
              <WifiOff className="w-4 h-4 text-destructive" />
            )}
            <span className="font-mono font-bold text-lg text-foreground">{roomCode}</span>
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

          <Badge variant="secondary" className="gap-1">
            <Users className="w-3 h-3" />
            {players.length}
          </Badge>

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
              data-testid="button-reset-buzzer"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {buzzQueue.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-3 border-t border-border"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Buzz order:</span>
                {buzzQueue.map((buzz, idx) => (
                  <motion.div
                    key={buzz.playerId}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      idx === 0
                        ? "gradient-gold text-purple-900"
                        : "bg-white/10 text-foreground"
                    }`}
                  >
                    #{buzz.position} {buzz.playerName}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
