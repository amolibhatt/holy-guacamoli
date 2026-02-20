import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal } from "lucide-react";
import { PLAYER_AVATARS } from "@shared/schema";
import type { LeaderboardEntry } from "./types";

interface GameLeaderboardViewProps {
  leaderboard: LeaderboardEntry[];
  playerId: string | null;
  title?: string;
  subtitle?: string;
}

export function GameLeaderboardView({
  leaderboard,
  playerId,
  title = "Leaderboard",
  subtitle = "Waiting for next round...",
}: GameLeaderboardViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center w-full max-w-sm"
    >
      <Trophy className="w-16 h-16 mx-auto text-amber-400 mb-4 shrink-0" aria-hidden="true" />
      <h2 className="text-2xl font-bold text-foreground mb-6" data-testid="text-leaderboard-title">{title}</h2>
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
                isMe ? 'bg-primary/20 border-2 border-primary' :
                idx === 0 ? 'bg-amber-500/20' :
                idx === 1 ? 'bg-slate-400/15' :
                idx === 2 ? 'bg-orange-600/15' :
                'bg-muted/30'
              }`}
              data-testid={`leaderboard-entry-${entry.playerId}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl font-black text-muted-foreground shrink-0">{idx + 1}</span>
                {idx === 0 && <Crown className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />}
                {idx === 1 && <Medal className="w-5 h-5 text-slate-300 shrink-0" aria-hidden="true" />}
                {idx === 2 && <Medal className="w-5 h-5 text-orange-400 shrink-0" aria-hidden="true" />}
                <span className="text-lg shrink-0">{avatar}</span>
                <span className="font-semibold text-foreground truncate" title={entry.playerName}>{entry.playerName}</span>
                {isMe && <Badge className="text-xs shrink-0" data-testid="badge-you">You</Badge>}
              </div>
              <span className="font-bold text-foreground">{entry.score} pts</span>
            </motion.div>
          );
        })}
      </div>
      <p className="text-muted-foreground text-sm">{subtitle}</p>
    </motion.div>
  );
}
