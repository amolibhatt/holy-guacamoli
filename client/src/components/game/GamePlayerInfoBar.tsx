import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Trophy, ChevronUp, ChevronDown, Crown } from "lucide-react";
import { PLAYER_AVATARS, type AvatarId } from "@shared/schema";
import type { LeaderboardEntry } from "./types";

interface GamePlayerInfoBarProps {
  playerName: string;
  avatar: AvatarId;
  leaderboard: LeaderboardEntry[];
  playerId: string | null;
  showLeaderboard: boolean;
  onToggleLeaderboard: () => void;
}

export function GamePlayerInfoBar({
  playerName,
  avatar,
  leaderboard,
  playerId,
  showLeaderboard,
  onToggleLeaderboard,
}: GamePlayerInfoBarProps) {
  const avatarEmoji = PLAYER_AVATARS.find(a => a.id === avatar)?.emoji || "?";

  return (
    <>
      <div className="px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm shrink-0">
            {avatarEmoji}
          </div>
          <span className="text-lg font-bold text-foreground truncate min-w-0 flex-1" title={playerName}>{playerName}</span>
        </div>
        {leaderboard.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleLeaderboard}
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
              {[...leaderboard].sort((a, b) => b.score - a.score).map((entry, idx) => {
                const isMe = entry.playerId === playerId;
                const entryAvatar = PLAYER_AVATARS.find(a => a.id === entry.playerAvatar)?.emoji || PLAYER_AVATARS[0].emoji;
                return (
                  <div
                    key={entry.playerId}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                      isMe ? 'bg-primary/20 border border-primary/30' :
                      idx === 0 ? 'bg-yellow-500/15' :
                      'bg-muted/30'
                    }`}
                    data-testid={`leaderboard-player-${entry.playerId}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-lg flex-shrink-0">{entryAvatar}</span>
                      <span className={`font-medium truncate min-w-0 flex-1 ${isMe ? 'text-primary' : 'text-foreground'}`} title={entry.playerName}>
                        {entry.playerName}
                        {isMe && <span className="text-xs ml-1">(you)</span>}
                      </span>
                    </div>
                    <span className="font-bold text-foreground flex-shrink-0">{entry.score}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
