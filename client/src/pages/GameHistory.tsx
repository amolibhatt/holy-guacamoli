import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, Calendar, Trophy, LayoutGrid, Gamepad2 } from "lucide-react";
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
              <CardTitle className="text-lg truncate">
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
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Winner</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">{getAvatar(winner.avatar)}</span>
                <span className="font-semibold truncate">{winner.name}</span>
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
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-4">{idx + 2}.</span>
                  <span className="text-lg">{getAvatar(player.avatar)}</span>
                  <span className="font-medium truncate">{player.name}</span>
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

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex justify-between">
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
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();

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
        <AppHeader />
        <div className="container py-8">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p>Please log in to view game history.</p>
            <Link href="/login">
              <Button className="mt-4">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-game-history">
      <AppHeader />
      
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="button-back-admin">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Game History</h1>
              <p className="text-muted-foreground text-sm">
                See all your past games, who played, and final scores
              </p>
            </div>
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
                  <p className="text-2xl font-bold">{completedGames.length}</p>
                  <p className="text-sm text-muted-foreground">Games Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics?.totalPlayers || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Players</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Gamepad2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{gamesWithPlayers.length}</p>
                  <p className="text-sm text-muted-foreground">Games Played</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : gamesWithPlayers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {gamesWithPlayers.map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <LayoutGrid className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No games played yet</h3>
              <p className="text-muted-foreground mb-4">
                Start a game to see your history here
              </p>
              <Link href="/">
                <Button data-testid="button-start-game">Start a Game</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
