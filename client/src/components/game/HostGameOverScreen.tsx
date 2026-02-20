import { type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal } from "lucide-react";
import { PLAYER_AVATARS } from "@shared/schema";

export interface HostLeaderboardBase {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  score: number;
}

interface HostGameOverScreenProps<T extends HostLeaderboardBase> {
  leaderboard: T[];
  title?: string;
  renderRowExtras?: (entry: T, index: number) => ReactNode;
  extraSections?: ReactNode;
  actions?: ReactNode;
}

export function HostGameOverScreen<T extends HostLeaderboardBase>({
  leaderboard,
  title = "GAME OVER!",
  renderRowExtras,
  extraSections,
  actions,
}: HostGameOverScreenProps<T>) {
  const winner = leaderboard[0];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center">
        <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }}>
          <Trophy className="w-20 h-20 mx-auto text-amber-400 mb-4 shrink-0" aria-hidden="true" />
        </motion.div>
        <h1 className="text-4xl font-black mb-1" data-testid="text-game-over">{title}</h1>
        {winner && (
          <>
            <h2 className="text-xl font-bold text-amber-400">WINNER</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-3xl">{PLAYER_AVATARS.find(a => a.id === winner.playerAvatar)?.emoji || "🏆"}</span>
              <p className="text-2xl font-black text-foreground">{winner.playerName}</p>
            </div>
            <p className="text-muted-foreground">{winner.score} points</p>
          </>
        )}
      </div>

      {extraSections}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 shrink-0" aria-hidden="true" />
            Final Standings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaderboard.map((entry, idx) => {
              const avatarData = PLAYER_AVATARS.find(a => a.id === entry.playerAvatar);
              return (
                <motion.div
                  key={entry.playerId}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-3 rounded-lg ${
                    idx === 0 ? 'bg-amber-500/20 border border-amber-500/50' :
                    idx === 1 ? 'bg-slate-400/15' :
                    idx === 2 ? 'bg-orange-600/15' :
                    'bg-muted/30'
                  }`}
                  data-testid={`final-standings-${entry.playerId}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-bold text-lg w-6 shrink-0">
                        {idx === 0 ? <Crown className="w-5 h-5 text-amber-400" aria-hidden="true" /> :
                         idx === 1 ? <Medal className="w-5 h-5 text-slate-300" aria-hidden="true" /> :
                         idx === 2 ? <Medal className="w-5 h-5 text-orange-400" aria-hidden="true" /> :
                         `${idx + 1}.`}
                      </span>
                      {avatarData && (
                        <div className="w-7 h-7 rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
                          <span className="text-sm" aria-label={avatarData.label}>{avatarData.emoji}</span>
                        </div>
                      )}
                      <span className="font-semibold truncate">{entry.playerName}</span>
                    </div>
                    <span className="font-bold text-lg shrink-0">{entry.score} pts</span>
                  </div>
                  {renderRowExtras && (
                    <div className="ml-9">
                      {renderRowExtras(entry, idx)}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {actions && (
        <div className="flex flex-wrap gap-2 justify-center">
          {actions}
        </div>
      )}
    </motion.div>
  );
}
