import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Users, Play, Trophy, ChevronDown, Clock } from "lucide-react";

interface GameAnalyticsSummary {
  totalSessions: number;
  completedSessions: number;
  totalPlayers: number;
  avgPlayersPerSession: number;
  lastPlayedAt: string | null;
  topQuestions?: Array<{ questionId: number; questionText: string; timesPlayed: number }>;
}

interface GameAnalyticsPanelProps {
  endpoint: string;
  gameName: string;
  accentColor: string;
  isAuthenticated: boolean;
}

export function GameAnalyticsPanel({ endpoint, gameName, accentColor, isAuthenticated }: GameAnalyticsPanelProps) {
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { data: analytics, isLoading } = useQuery<GameAnalyticsSummary>({
    queryKey: [endpoint],
    enabled: isAuthenticated && showAnalytics,
  });

  return (
    <div className="mt-8">
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setShowAnalytics(!showAnalytics)}
        data-testid="button-toggle-analytics"
      >
        <span className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 shrink-0" aria-hidden="true" />
          {gameName} Analytics
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${showAnalytics ? 'rotate-180' : ''}`} aria-hidden="true" />
      </Button>

      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4">
              {isLoading ? (
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : analytics ? (
                <>
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                    <Card data-testid="stat-total-sessions">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Play className={`w-4 h-4 ${accentColor} shrink-0`} aria-hidden="true" />
                          <span className="text-xs text-muted-foreground">Sessions</span>
                        </div>
                        <p className="text-2xl font-bold" data-testid="value-total-sessions">{analytics.totalSessions}</p>
                      </CardContent>
                    </Card>
                    <Card data-testid="stat-completions">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
                          <span className="text-xs text-muted-foreground">Completed</span>
                        </div>
                        <p className="text-2xl font-bold" data-testid="value-completions">{analytics.completedSessions}</p>
                      </CardContent>
                    </Card>
                    <Card data-testid="stat-total-players">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-green-500 shrink-0" aria-hidden="true" />
                          <span className="text-xs text-muted-foreground">Players</span>
                        </div>
                        <p className="text-2xl font-bold" data-testid="value-total-players">{analytics.totalPlayers}</p>
                      </CardContent>
                    </Card>
                    <Card data-testid="stat-avg-players">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-blue-500 shrink-0" aria-hidden="true" />
                          <span className="text-xs text-muted-foreground">Avg/Game</span>
                        </div>
                        <p className="text-2xl font-bold" data-testid="value-avg-players">{analytics.avgPlayersPerSession}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {analytics.lastPlayedAt && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                      Last played {new Date(analytics.lastPlayedAt).toLocaleDateString()}
                    </p>
                  )}

                  {analytics.topQuestions && analytics.topQuestions.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Most Played Questions</p>
                      <div className="space-y-2">
                        {analytics.topQuestions.map((q, i) => (
                          <div
                            key={q.questionId}
                            className="flex items-center justify-between gap-2 text-sm"
                            data-testid={`analytics-question-${q.questionId}`}
                          >
                            <span className="truncate min-w-0">{q.questionText}</span>
                            <Badge variant={i === 0 ? "default" : "secondary"} className="text-xs shrink-0">
                              {q.timesPlayed}x
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analytics.totalSessions === 0 && (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2 shrink-0" aria-hidden="true" />
                        <p className="text-sm text-muted-foreground">No game data yet. Start playing to see analytics!</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
