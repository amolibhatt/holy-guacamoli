import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Calendar, Trophy, Gamepad2, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { PLAYER_AVATARS, type GameSessionWithDetails } from "@shared/schema";

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getAvatar(avatarId: string) {
  const avatar = PLAYER_AVATARS.find(a => a.id === avatarId);
  return avatar?.emoji || "🎮";
}

function SessionCard({ session }: { session: GameSessionWithDetails }) {
  const sortedPlayers = [...session.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const isCompleted = session.state === "ended";
  
  return (
    <Card className="hover-elevate transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-primary shrink-0" />
              <CardTitle className="text-lg truncate" title={session.boardName || "Quick Game"}>
                {session.boardName || "Quick Game"}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(session.createdAt)}</span>
            </div>
          </div>
          <Badge 
            variant={isCompleted ? "secondary" : "default"}
            className={`shrink-0 ${isCompleted ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" : ""}`}
          >
            {isCompleted ? "Completed" : session.state}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {winner && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/20">
              <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Winner</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">{getAvatar(winner.avatar)}</span>
                <span className="font-semibold truncate" title={winner.name}>{winner.name}</span>
              </div>
            </div>
            <Badge className="bg-amber-500 text-white">
              {winner.score} pts
            </Badge>
          </div>
        )}

        {sortedPlayers.length > 1 && (
          <div className="space-y-1.5">
            {sortedPlayers.slice(1).map((player, idx) => (
              <div 
                key={player.id} 
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-4">{idx + 2}.</span>
                  <span className="text-lg">{getAvatar(player.avatar)}</span>
                  <span className="font-medium truncate" title={player.name}>{player.name}</span>
                </div>
                <Badge variant="secondary">
                  {player.score} pts
                </Badge>
              </div>
            ))}
          </div>
        )}

        {session.playedCategories && session.playedCategories.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex flex-wrap gap-1.5">
              {session.playedCategories.slice(0, 3).map(cat => (
                <Badge key={cat.id} variant="outline" className="text-xs">
                  {cat.name}
                </Badge>
              ))}
              {session.playedCategories.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{session.playedCategories.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreTrend({ sessions }: { sessions: GameSessionWithDetails[] }) {
  const completedSessions = sessions
    .filter(s => s.state === "ended" && s.players.length > 0)
    .slice(0, 10)
    .reverse();

  if (completedSessions.length < 2) return null;

  const topScores = completedSessions.map(s => {
    const sorted = [...s.players].sort((a, b) => b.score - a.score);
    return sorted[0]?.score || 0;
  });
  const maxScore = Math.max(...topScores, 1);

  return (
    <Card data-testid="card-score-trend">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Score Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-20">
          {topScores.map((score, i) => {
            const height = Math.max((score / maxScore) * 100, 8);
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center"
                data-testid={`score-trend-bar-${i}`}
              >
                <div className="text-xs text-muted-foreground mb-1">{score}</div>
                <div
                  className="w-full rounded-sm bg-primary/80"
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-muted-foreground">Oldest</span>
          <span className="text-xs text-muted-foreground">Latest</span>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card data-testid="card-empty-history">
      <CardContent className="py-16 text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Gamepad2 className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2" data-testid="text-empty-title">
          No games played yet
        </h3>
        <p className="text-muted-foreground mb-2 max-w-sm mx-auto" data-testid="text-empty-description">
          Host your first game and the results will appear here. Track scores, see winners, and review game highlights.
        </p>
        <div className="flex flex-col items-center gap-3 mt-6">
          <Link href="/">
            <Button data-testid="button-start-game">
              Start a Game
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground">
            Games with players will show up automatically
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-24 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function GameHistory() {
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
  
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const { data: sessions, isLoading } = useQuery<GameSessionWithDetails[]>({
    queryKey: ["/api/host/sessions"],
    enabled: isAuthenticated,
  });

  const { data: analytics } = useQuery<{ totalSessions: number; totalPlayers: number; activeSessions: number }>({
    queryKey: ["/api/host/analytics"],
    enabled: isAuthenticated,
  });

  const gamesWithPlayers = sessions?.filter(s => s.players.length > 0) || [];
  const completedGames = gamesWithPlayers.filter(s => s.state === "ended");

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader minimal backHref="/" title="Game History" />
        <main className="max-w-4xl mx-auto px-4 py-6 w-full">
          <LoadingSkeleton />
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p>Please log in to view game history.</p>
            <Link href="/">
              <Button className="mt-4">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <h1 className="text-xl font-bold text-destructive">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
            <Link href="/">
              <Button variant="outline">Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-game-history">
      <AppHeader minimal backHref="/" title="Game History" />
      
      <main className="max-w-4xl mx-auto px-4 py-6 w-full space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Game History</h1>
            <p className="text-muted-foreground text-sm">
              See all your past games, who played, and final scores
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-completed-count">{completedGames.length}</p>
                  <p className="text-sm text-muted-foreground">Games Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-players-count">{analytics?.totalPlayers || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Players</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Gamepad2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-played-count">{gamesWithPlayers.length}</p>
                  <p className="text-sm text-muted-foreground">Games Played</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {!isLoading && gamesWithPlayers.length > 0 && (
          <ScoreTrend sessions={gamesWithPlayers} />
        )}

        {isLoading ? (
          <LoadingSkeleton />
        ) : gamesWithPlayers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {gamesWithPlayers.map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
