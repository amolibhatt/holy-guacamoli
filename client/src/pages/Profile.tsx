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
  List, AlertCircle, RefreshCw
} from "lucide-react";
import type { PlayerProfile, Badge as BadgeType } from "@shared/schema";

const GAME_CONFIG: Record<string, { 
  icon: React.ComponentType<{ className?: string }>;
  name: string;
}> = {
  blitzgrid: { icon: Grid3X3, name: "BlitzGrid" },
  sequence_squeeze: { icon: List, name: "Sort Circuit" },
  psyop: { icon: Brain, name: "PsyOp" },
  timewarp: { icon: Clock, name: "Past Forward" },
  memenoharm: { icon: Smile, name: "Meme No Harm" },
};

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles, Crown, Award, Trophy, Grid3X3, Zap, Flame, Shuffle, ListOrdered,
  Eye, Shield, Clock, Hourglass, Laugh,
};

function getBadgeIcon(iconName: string) {
  return BADGE_ICONS[iconName] || Award;
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
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted" data-testid="stat-total-games">
                <div className="text-3xl font-bold text-foreground" data-testid="text-games-count">
                  {profile?.totals.gamesPlayed || 0}
                </div>
                <div className="text-sm text-muted-foreground" data-testid="text-games-label">Games Played</div>
              </div>
              <div className="p-4 rounded-lg bg-muted" data-testid="stat-total-wins">
                <div className="text-3xl font-bold text-foreground" data-testid="text-wins-count">
                  {profile?.totals.gamesWon || 0}
                </div>
                <div className="text-sm text-muted-foreground" data-testid="text-wins-label">Wins</div>
              </div>
              <div className="p-4 rounded-lg bg-muted" data-testid="stat-total-badges">
                <div className="text-3xl font-bold text-foreground" data-testid="text-badges-count">
                  {profile?.badges.length || 0}
                </div>
                <div className="text-sm text-muted-foreground" data-testid="text-badges-label">Badges</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-badges">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="text-badges-title">
              <Trophy className="h-5 w-5" />
              <span data-testid="text-badges-heading">Badges</span>
            </CardTitle>
            <CardDescription data-testid="text-badges-progress">
              Earned {profile?.badges.length || 0} of {allBadges?.length || 0} badges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {allBadges?.map(badge => {
                const Icon = getBadgeIcon(badge.icon);
                const isEarned = earnedBadgeIds.has(badge.id);
                return (
                  <div
                    key={badge.id}
                    data-testid={`badge-item-${badge.slug}`}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      isEarned 
                        ? 'bg-accent border-border' 
                        : 'bg-muted/50 border-muted opacity-50'
                    }`}
                  >
                    <Icon 
                      className={`h-8 w-8 mx-auto mb-2 ${isEarned ? 'text-foreground' : 'text-muted-foreground'}`} 
                      data-testid={`badge-icon-${badge.slug}`}
                    />
                    <div 
                      className={`font-medium text-sm ${isEarned ? 'text-foreground' : 'text-muted-foreground'}`}
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
                return (
                  <div
                    key={stat.gameSlug}
                    data-testid={`stat-game-${stat.gameSlug}`}
                    className="flex items-center gap-4 p-4 rounded-lg border"
                  >
                    <div className="p-3 rounded-lg bg-muted" data-testid={`stat-icon-${stat.gameSlug}`}>
                      <Icon className="h-6 w-6 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground" data-testid={`stat-name-${stat.gameSlug}`}>
                        {config.name}
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid={`stat-summary-${stat.gameSlug}`}>
                        {stat.gamesPlayed} games, {stat.gamesWon} wins
                      </div>
                    </div>
                    <div className="text-right">
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
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {config && (
                          <div className="p-2 rounded bg-background" data-testid={`history-icon-${index}`}>
                            <config.icon className="h-4 w-4 text-foreground" />
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
                      <div className="flex items-center gap-3">
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
