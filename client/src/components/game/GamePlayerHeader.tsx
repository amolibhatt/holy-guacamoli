import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Wifi, WifiOff, RefreshCw, Volume2, VolumeX, LogOut } from "lucide-react";
import type { ConnectionStatus } from "./types";

interface GamePlayerHeaderProps {
  status: ConnectionStatus;
  roomCode: string;
  score: number;
  onLeave: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export function GamePlayerHeader({
  status,
  roomCode,
  score,
  onLeave,
  soundEnabled,
  onToggleSound,
}: GamePlayerHeaderProps) {
  return (
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
        {onToggleSound && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggleSound}
            data-testid="button-toggle-sound"
            aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 shrink-0" /> : <VolumeX className="w-4 h-4 shrink-0" />}
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={onLeave}
          className="text-rose-500"
          data-testid="button-leave-game"
          aria-label="Leave game"
        >
          <LogOut className="w-4 h-4 shrink-0" />
        </Button>
      </div>
    </header>
  );
}
