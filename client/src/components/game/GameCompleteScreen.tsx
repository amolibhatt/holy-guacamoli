import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal } from "lucide-react";
import { PLAYER_AVATARS } from "@shared/schema";
import type { LeaderboardEntry } from "./types";

interface GameCompleteScreenProps {
  leaderboard: LeaderboardEntry[];
  playerId: string | null;
  myScore: number;
  title?: string;
  subtitle?: string;
}

export function GameCompleteScreen({
  leaderboard,
  playerId,
  myScore,
  title = "GAME OVER!",
  subtitle,
}: GameCompleteScreenProps) {
  const myRank = leaderboard.findIndex(e => e.playerId === playerId) + 1;
  const winner = leaderboard[0];
  const isWinner = winner?.playerId === playerId;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center w-full max-w-sm"
    >
      <motion.div
        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <Trophy className="w-24 h-24 mx-auto text-amber-400 mb-4 shrink-0" aria-hidden="true" />
      </motion.div>
      <h1 className="text-4xl font-black text-foreground mb-2" data-testid="text-game-over">{title}</h1>

      {winner && (
        <div className="mb-6">
          <h2 className="text-xl text-amber-400 font-bold">WINNER</h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-3xl">{PLAYER_AVATARS.find(a => a.id === winner.playerAvatar)?.emoji || "?"}</span>
            <p className="text-3xl font-black text-foreground">{winner.playerName}</p>
          </div>
          <p className="text-muted-foreground">{winner.score} points</p>
        </div>
      )}

      {isWinner && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-6 inline-block px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"
        >
          <span className="text-xl font-black text-white">YOU WON!</span>
        </motion.div>
      )}

      {subtitle && !isWinner && (
        <p className="text-muted-foreground mb-4">You finished #{myRank} with {myScore} points</p>
      )}

      <div className="space-y-2 mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground">Final Standings</h3>
        {leaderboard.slice(0, 5).map((entry, idx) => {
          const isMe = entry.playerId === playerId;
          const avatar = PLAYER_AVATARS.find(a => a.id === entry.playerAvatar)?.emoji || "?";
          return (
            <motion.div
              key={entry.playerId}
              initial={{ x: -15, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`flex items-center justify-between p-3 rounded-lg ${
                isMe ? 'bg-primary/20 border border-primary/30' :
                idx === 0 ? 'bg-amber-500/20' :
                idx === 1 ? 'bg-slate-400/15' :
                idx === 2 ? 'bg-orange-600/15' :
                'bg-muted/30'
              }`}
              data-testid={`player-result-${entry.playerId}`}
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

      <p className="text-muted-foreground text-sm">Thanks for playing!</p>
    </motion.div>
  );
}
