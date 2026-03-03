import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Grid3X3, Brain, Clock, Smile, Trophy, Award, Sparkles, Crown,
  Zap, Shield, Eye, ListOrdered, Flame, Hourglass, Laugh, Shuffle,
  List, AlertCircle, RefreshCw, Target, TrendingUp, Star, Lock
} from "lucide-react";
import type { PlayerProfile, Badge as BadgeType } from "@shared/schema";

const GAME_CONFIG: Record<string, { 
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  color: string;
}> = {
  blitzgrid: { icon: Grid3X3, name: "BlitzGrid", color: "text-blue-500 dark:text-blue-400" },
  sequence_squeeze: { icon: List, name: "Sort Circuit", color: "text-emerald-500 dark:text-emerald-400" },
  psyop: { icon: Brain, name: "PsyOp", color: "text-purple-500 dark:text-purple-400" },
  timewarp: { icon: Clock, name: "Past Forward", color: "text-amber-500 dark:text-amber-400" },
  memenoharm: { icon: Smile, name: "Meme No Harm", color: "text-pink-500 dark:text-pink-400" },
};

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles, Crown, Award, Trophy, Grid3X3, Zap, Flame, Shuffle, ListOrdered,
  Eye, Shield, Clock, Hourglass, Laugh,
};

function getBadgeIcon(iconName: string) {
  return BADGE_ICONS[iconName] || Award;
}

function WinRateRing({ played, won }: { played: number; won: number }) {
  const rate = played > 0 ? Math.round((won / played) * 100) : 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" data-testid="win-rate-ring">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke="currentColor"
          className="text-muted"
          strokeWidth="8"
        />
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-foreground" data-testid="text-win-rate">{rate}%</span>
        <span className="text-xs text-muted-foreground">Win Rate</span>
      </div>
    </div>
  );
}

function StreakIndicator({ recentGames }: { recentGames: { placement: number | null }[] }) {
  const currentStreak = (() => {
    let streak = 0;
    for (const game of recentGames) {
      if (game.placement === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  })();

  const bestStreak = (() => {
    let best = 0;
    let current = 0;
    for (const game of recentGames) {
      if (game.placement === 1) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }
    return best;
  })();

  if (recentGames.length === 0) return null;

  return (
    <div className="flex items-center gap-4" data-testid="streak-indicator">
      <div className="flex items-center gap-2">
        <Flame className={`h-5 w-5 ${currentStreak > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground'}`} />
        <div>
          <div className="text-lg font-bold text-foreground" data-testid="text-current-streak">{currentStreak}</div>
          <div className="text-xs text-muted-foreground">Current Streak</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Star className={`h-5 w-5 ${bestStreak > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground'}`} />
        <div>
          <div className="text-lg font-bold text-foreground" data-testid="text-best-streak">{bestStreak}</div>
          <div className="text-xs text-muted-foreground">Best Streak</div>
        </div>
      </div>
    </div>
  );
}

function RecentTrend({ recentGames }: { recentGames: { placement: number | null; score: number }[] }) {
  if (recentGames.length === 0) return null;
  const last10 = recentGames.slice(0, 10).reverse();
  const maxScore = Math.max(...last10.map(g => g.score), 1);

  return (
    <div data-testid="recent-trend">
      <div className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        Recent Performance
      </div>
      <div className="flex items-end gap-1 h-16">
        {last10.map((game, i) => {
          const height = Math.max((game.score / maxScore) * 100, 8);
          const isWin = game.placement === 1;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1"
              data-testid={`trend-bar-${i}`}
            >
              <div
                className={`w-full rounded-sm ${isWin ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-muted-foreground">Oldest</span>
        <span className="text-xs text-muted-foreground">Latest</span>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
      <Skeleton className="h-48" />
      <Skeleton className="h-64" />
    </div>
  );
}

export default function Profile() {
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
  
  const { data: profile, isLoading: isProfileLoading, isError: isProfileError, refetch } = useQuery<PlayerProfile>({
    queryKey: ["/api/profile"],
    enabled: isAuthenticated,
  });
  
  const { data: allBadges } = useQuery<BadgeType[]>({
    queryKey: ["/api/badges"],
    enabled: isAuthenticated,
  });
  
  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <ProfileSkeleton />
        </main>
        <AppFooter />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl flex items-center justify-center">
          <Card className="w-full max-w-md text-center" data-testid="card-sign-in-prompt">
            <CardHeader>
              <CardTitle data-testid="text-sign-in-title">Sign in to view your profile</CardTitle>
              <CardDescription data-testid="text-sign-in-description">
                Track your game history, earn badges, and see your stats across all games.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }
  
  if (isProfileError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl flex items-center justify-center">
          <Card className="w-full max-w-md text-center" data-testid="card-profile-error">
            <CardHeader>
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <CardTitle data-testid="text-error-title">Couldn't load profile</CardTitle>
              <CardDescription data-testid="text-error-description">
                There was a problem loading your profile. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => refetch()} data-testid="button-retry">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }
  
  const earnedBadgeIds = new Set(profile?.badges.map(b => b.badgeId) || []);
  const earnedBadges = allBadges?.filter(b => earnedBadgeIds.has(b.id)) || [];
  const lockedBadges = allBadges?.filter(b => !earnedBadgeIds.has(b.id)) || [];
  
  const totalPlayed = profile?.totals.gamesPlayed || 0;
  const totalWon = profile?.totals.gamesWon || 0;
  const totalPoints = profile?.totals.totalPoints || 0;

  const personalBests = profile?.gameStats
    ?.filter(s => s.highestScore > 0)
    .sort((a, b) => b.highestScore - a.highestScore)
    .slice(0, 3) || [];
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Card data-testid="card-profile-summary">
          <CardHeader>
            <CardTitle className="text-2xl" data-testid="text-username">
              {profile?.user.firstName || user?.email?.split('@')[0] || 'Player'}
            </CardTitle>
            <CardDescription data-testid="text-email">{user?.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <WinRateRing played={totalPlayed} won={totalWon} />
              <div className="flex-1 grid grid-cols-3 gap-4 text-center w-full">
                <div className="p-4 rounded-lg bg-muted" data-testid="stat-total-games">
                  <div className="text-3xl font-bold text-foreground" data-testid="text-games-count">
                    {totalPlayed}
                  </div>
                  <div className="text-sm text-muted-foreground" data-testid="text-games-label">Games Played</div>
                </div>
                <div className="p-4 rounded-lg bg-muted" data-testid="stat-total-wins">
                  <div className="text-3xl font-bold text-foreground" data-testid="text-wins-count">
                    {totalWon}
                  </div>
                  <div className="text-sm text-muted-foreground" data-testid="text-wins-label">Wins</div>
                </div>
                <div className="p-4 rounded-lg bg-muted" data-testid="stat-total-points">
                  <div className="text-3xl font-bold text-foreground" data-testid="text-points-count">
                    {totalPoints.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground" data-testid="text-points-label">Total Points</div>
                </div>
              </div>
            </div>

            {profile?.recentGames && profile.recentGames.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row items-start gap-6">
                <StreakIndicator recentGames={profile.recentGames} />
                <div className="flex-1 w-full">
                  <RecentTrend recentGames={profile.recentGames} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {personalBests.length > 0 && (
          <Card data-testid="card-personal-bests">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="text-bests-title">
                <Target className="h-5 w-5" />
                <span>Personal Bests</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {personalBests.map((stat, i) => {
                  const config = GAME_CONFIG[stat.gameSlug];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <div
                      key={stat.gameSlug}
                      data-testid={`personal-best-${stat.gameSlug}`}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      <div className={`p-2 rounded-lg bg-muted`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground truncate">{config.name}</div>
                        <div className="text-lg font-bold text-foreground">{stat.highestScore.toLocaleString()}</div>
                      </div>
                      {i === 0 && (
                        <Crown className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card data-testid="card-badges">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="text-badges-title">
              <Trophy className="h-5 w-5" />
              <span data-testid="text-badges-heading">Badges</span>
            </CardTitle>
            <CardDescription data-testid="text-badges-progress">
              Earned {earnedBadges.length} of {allBadges?.length || 0} badges
            </CardDescription>
            {allBadges && allBadges.length > 0 && (
              <div className="w-full bg-muted rounded-full h-2 mt-2" data-testid="badges-progress-bar">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(earnedBadges.length / allBadges.length) * 100}%` }}
                  data-testid="badges-progress-fill"
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {earnedBadges.length > 0 && (
              <div>
                <div className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Earned
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {earnedBadges.map(badge => {
                    const Icon = getBadgeIcon(badge.icon);
                    return (
                      <div
                        key={badge.id}
                        data-testid={`badge-item-${badge.slug}`}
                        className="p-3 rounded-lg border bg-accent border-border text-center"
                      >
                        <Icon 
                          className="h-8 w-8 mx-auto mb-2 text-foreground" 
                          data-testid={`badge-icon-${badge.slug}`}
                        />
                        <div 
                          className="font-medium text-sm text-foreground"
                          data-testid={`badge-name-${badge.slug}`}
                        >
                          {badge.name}
                        </div>
                        <div 
                          className="text-xs text-muted-foreground mt-1"
                          data-testid={`badge-desc-${badge.slug}`}
                        >
                          {badge.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {lockedBadges.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Locked
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {lockedBadges.map(badge => {
                    const Icon = getBadgeIcon(badge.icon);
                    return (
                      <div
                        key={badge.id}
                        data-testid={`badge-item-${badge.slug}`}
                        className="p-3 rounded-lg border bg-muted/30 border-muted text-center opacity-50 grayscale"
                      >
                        <Icon 
                          className="h-8 w-8 mx-auto mb-2 text-muted-foreground" 
                          data-testid={`badge-icon-${badge.slug}`}
                        />
                        <div 
                          className="font-medium text-sm text-muted-foreground"
                          data-testid={`badge-name-${badge.slug}`}
                        >
                          {badge.name}
                        </div>
                        <div 
                          className="text-xs text-muted-foreground mt-1"
                          data-testid={`badge-desc-${badge.slug}`}
                        >
                          {badge.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {(!allBadges || allBadges.length === 0) && (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-badges">
                No badges available yet. Keep playing to unlock achievements!
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card data-testid="card-game-stats">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="text-stats-title">
              <Grid3X3 className="h-5 w-5" />
              <span data-testid="text-stats-heading">Game Stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.gameStats && profile.gameStats.length > 0 ? (
              profile.gameStats.map(stat => {
                const config = GAME_CONFIG[stat.gameSlug];
                if (!config) return null;
                const Icon = config.icon;
                const winRate = stat.gamesPlayed > 0 ? Math.round((stat.gamesWon / stat.gamesPlayed) * 100) : 0;
                return (
                  <div
                    key={stat.gameSlug}
                    data-testid={`stat-game-${stat.gameSlug}`}
                    className="p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-muted" data-testid={`stat-icon-${stat.gameSlug}`}>
                        <Icon className={`h-6 w-6 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground" data-testid={`stat-name-${stat.gameSlug}`}>
                          {config.name}
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid={`stat-summary-${stat.gameSlug}`}>
                          {stat.gamesPlayed} games, {stat.gamesWon} wins
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-foreground" data-testid={`stat-points-${stat.gameSlug}`}>
                          {stat.totalPoints.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground" data-testid={`stat-points-label-${stat.gameSlug}`}>
                          points
                        </div>
                      </div>
                      {stat.highestScore > 0 && (
                        <Badge variant="secondary" data-testid={`badge-best-${stat.gameSlug}`}>
                          Best: {stat.highestScore}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Win rate</span>
                        <span>{winRate}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5" data-testid={`win-rate-bar-${stat.gameSlug}`}>
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${winRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-games">
                No games played yet. Join a game to start tracking your stats!
              </div>
            )}
          </CardContent>
        </Card>
        
        {profile?.recentGames && profile.recentGames.length > 0 && (
          <Card data-testid="card-recent-games">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="text-recent-title">
                <Clock className="h-5 w-5" />
                <span data-testid="text-recent-heading">Recent Games</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {profile.recentGames.map((game, index) => {
                  const config = GAME_CONFIG[game.gameSlug];
                  return (
                    <div
                      key={index}
                      data-testid={`history-item-${index}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {config && (
                          <div className="p-2 rounded bg-background" data-testid={`history-icon-${index}`}>
                            <config.icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-foreground" data-testid={`history-name-${index}`}>
                            {config?.name || game.gameSlug}
                          </div>
                          <div className="text-xs text-muted-foreground" data-testid={`history-date-${index}`}>
                            {new Date(game.playedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {game.placement === 1 && (
                          <Badge data-testid={`placement-${index}-first`}>1st</Badge>
                        )}
                        {game.placement === 2 && (
                          <Badge variant="secondary" data-testid={`placement-${index}-second`}>2nd</Badge>
                        )}
                        {game.placement === 3 && (
                          <Badge variant="outline" data-testid={`placement-${index}-third`}>3rd</Badge>
                        )}
                        <span className="font-medium text-foreground" data-testid={`score-${index}`}>
                          {game.score} pts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
