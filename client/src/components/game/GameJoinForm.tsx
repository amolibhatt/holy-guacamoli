import { type ReactNode, type FormEvent, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { PLAYER_AVATARS, type AvatarId } from "@shared/schema";
import { Logo } from "@/components/Logo";
import type { ConnectionStatus } from "./types";

interface GameJoinFormProps {
  icon: ReactNode;
  title: string;
  inviteTitle?: string;
  subtitle: string;
  inviteSubtitle?: string;
  hasCodeFromUrl: boolean;
  roomCode: string;
  onRoomCodeChange: (code: string) => void;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  selectedAvatar: AvatarId;
  onAvatarSelect: (id: AvatarId) => void;
  onSubmit: (e: FormEvent) => void;
  status: ConnectionStatus;
  nameInputRef?: RefObject<HTMLInputElement>;
}

export function GameJoinForm({
  icon,
  title,
  inviteTitle = "You're Invited!",
  subtitle,
  inviteSubtitle = "Just enter your name to join",
  hasCodeFromUrl,
  roomCode,
  onRoomCodeChange,
  playerName,
  onPlayerNameChange,
  selectedAvatar,
  onAvatarSelect,
  onSubmit,
  status,
  nameInputRef,
}: GameJoinFormProps) {
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center mx-auto">
              {icon}
            </div>
            <h1 className="text-2xl font-bold text-foreground mt-4" data-testid="text-game-title">
              {hasCodeFromUrl ? inviteTitle : title}
            </h1>
            <p className="text-muted-foreground text-sm mt-1" data-testid="text-game-tagline">
              {hasCodeFromUrl ? inviteSubtitle : subtitle}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" data-testid="form-join">
            {hasCodeFromUrl ? (
              <div className="text-center py-3 px-4 bg-primary/10 rounded-lg border border-primary/20" data-testid="display-room-code">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Room Code</p>
                <p className="text-3xl font-mono font-bold text-primary tracking-widest">{roomCode}</p>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-foreground">Room Code</label>
                <Input
                  value={roomCode}
                  onChange={(e) => onRoomCodeChange(e.target.value.toUpperCase())}
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
                onChange={(e) => onPlayerNameChange(e.target.value)}
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
                    onClick={() => onAvatarSelect(avatar.id)}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      selectedAvatar === avatar.id
                        ? 'bg-primary/20 ring-2 ring-primary scale-110'
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                    title={avatar.label}
                    data-testid={`avatar-${avatar.id}`}
                    aria-label={`Select ${avatar.label} avatar`}
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
