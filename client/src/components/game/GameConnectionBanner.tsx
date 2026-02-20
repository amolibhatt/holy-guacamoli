import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import type { ConnectionStatus } from "./types";

interface GameConnectionBannerProps {
  status: ConnectionStatus;
  joined: boolean;
  reconnectCountdown: number | null;
  reconnectAttempts: number;
  maxAttempts?: number;
  onReconnect: () => void;
}

export function GameConnectionBanner({
  status,
  joined,
  reconnectCountdown,
  reconnectAttempts,
  maxAttempts = 5,
  onReconnect,
}: GameConnectionBannerProps) {
  if (status === "reconnecting") {
    return (
      <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 text-center text-sm text-foreground">
        <RefreshCw className="w-4 h-4 inline-block mr-2 animate-spin" />
        Reconnecting in {reconnectCountdown ?? '...'}s... (Attempt {reconnectAttempts}/{maxAttempts})
      </div>
    );
  }

  if (reconnectCountdown !== null && status !== "connected") {
    return (
      <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 flex items-center justify-between gap-2">
        <span className="text-sm text-foreground">Reconnecting in {reconnectCountdown}s... (Attempt {reconnectAttempts}/{maxAttempts})</span>
        <Button size="sm" variant="outline" onClick={onReconnect} data-testid="button-reconnect">
          <RefreshCw className="w-3 h-3 mr-1 shrink-0" />Reconnect Now
        </Button>
      </div>
    );
  }

  if (status === "disconnected" && joined) {
    return (
      <div className="bg-destructive/20 border-b border-destructive/30 px-4 py-3 text-center">
        <p className="text-sm text-foreground mb-2">
          {reconnectAttempts >= maxAttempts
            ? "Couldn't reconnect - tap below to try again"
            : "Disconnected from game"}
        </p>
        <Button
          size="sm"
          onClick={onReconnect}
          className="gap-2"
          data-testid="button-reconnect"
        >
          <RefreshCw className="w-4 h-4" />
          Reconnect
        </Button>
      </div>
    );
  }

  return null;
}
