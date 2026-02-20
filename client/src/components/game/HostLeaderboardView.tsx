import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal } from "lucide-react";
import { PLAYER_AVATARS } from "@shared/schema";
import type { HostLeaderboardBase } from "./HostGameOverScreen";

interface HostLeaderboardViewProps<T extends HostLeaderboardBase> {
  leaderboard: T[];
  title?: string;
  renderRowExtras?: (entry: T, index: number) => ReactNode;
  actions?: ReactNode;
  emptyMessage?: string;
}

export function HostLeaderboardView<T extends HostLeaderboardBase>({
  leaderboard,
  title = "Scoreboard",
  renderRowExtras,
  actions,
  emptyMessage = "No scores yet",
}: HostLeaderboardViewProps<T>) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-8"
    >
      <Trophy className="w-16 h-16 mx-auto text-amber-400 mb-4 shrink-0" aria-hidden="true" />
      <h2 className="text-3xl font-bold mb-6" data-testid="text-scoreboard-title">{title}</h2>
      <Card className="max-w-2xl mx-auto p-6">
        {leaderboard.length === 0 ? (
          <p className="text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((entry, idx) => {
              const avatarData = PLAYER_AVATARS.find(a => a.id === entry.playerAvatar);
              return (
                <motion.div
                  key={entry.playerId}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-4 rounded-lg ${
                    idx === 0 ? 'bg-amber-500/20 border-2 border-amber-500' :
                    idx === 1 ? 'bg-slate-400/20 border border-slate-400' :
                    idx === 2 ? 'bg-orange-600/20 border border-orange-600' :
                    'bg-muted/50'
                  }`}
                  data-testid={`scoreboard-entry-${entry.playerId}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl font-black shrink-0">
                        {idx === 0 ? <Crown className="w-6 h-6 text-amber-400" aria-hidden="true" /> :
                         idx === 1 ? <Medal className="w-5 h-5 text-slate-300" aria-hidden="true" /> :
                         idx === 2 ? <Medal className="w-5 h-5 text-orange-400" aria-hidden="true" /> :
                         idx + 1}
                      </span>
                      {avatarData && (
                        <span className="text-xl shrink-0" aria-label={avatarData.label}>{avatarData.emoji}</span>
                      )}
                      <span className="text-xl font-semibold truncate">{entry.playerName}</span>
                    </div>
                    <span className="text-2xl font-bold shrink-0">{entry.score} pts</span>
                  </div>
                  {renderRowExtras && renderRowExtras(entry, idx)}
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>
      {actions && (
        <div className="mt-6 flex justify-center gap-3">
          {actions}
        </div>
      )}
    </motion.div>
  );
}
