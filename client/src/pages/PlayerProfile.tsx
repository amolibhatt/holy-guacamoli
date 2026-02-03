import { usePlayerProfile } from "@/hooks/use-player-profile";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { 
  User, Trophy, Star, Sparkles, Zap, Target, 
  Clock, Brain, Flame, Medal, ArrowLeft, Clover, HelpCircle, Wind, Drama, Search, Award, Laugh, Users,
  Crown, Rocket, Palette, Gem, PartyPopper, type LucideIcon
} from "lucide-react";
import { Link } from "wouter";

// Map badge icon strings from server to lucide-react components
const BADGE_ICON_MAP: Record<string, LucideIcon> = {
  target: Target,
  brain: Brain,
  flame: Flame,
  crown: Crown,
  sparkles: Sparkles,
  zap: Zap,
  rocket: Rocket,
  drama: Drama,
  search: Search,
  palette: Palette,
  laugh: Laugh,
  trophy: Trophy,
  star: Star,
  "party-popper": PartyPopper,
  gem: Gem,
  users: Users,
};

const TRAIT_INFO: Record<string, { 
  title: string; 
  icon: React.ComponentType<{ className?: string }>; 
  color: string;
  description: string;
}> = {
  brain_trust: { 
    title: "The Brain Trust", 
    icon: Brain,
    color: "from-blue-500 to-cyan-500",
    description: "Your trivia knowledge is legendary. Others come to you for answers."
  },
  lucky_guesser: { 
    title: "The Lucky Guesser", 
    icon: Clover,
    color: "from-green-500 to-emerald-500",
    description: "Fortune favors the bold, and you're the boldest."
  },
  speed_demon: { 
    title: "The Speed Demon", 
    icon: Zap,
    color: "from-yellow-500 to-amber-500",
    description: "Lightning fast reflexes. You buzz in before others finish reading."
  },
  careful_thinker: { 
    title: "The Careful Thinker", 
    icon: HelpCircle,
    color: "from-purple-500 to-violet-500",
    description: "Slow and steady wins the race. You think before you answer."
  },
  perfectionist: { 
    title: "The Perfectionist", 
    icon: Target,
    color: "from-pink-500 to-rose-500",
    description: "Close is never good enough. You demand perfection from yourself."
  },
  chaos_agent: { 
    title: "The Chaos Agent", 
    icon: Wind,
    color: "from-red-500 to-orange-500",
    description: "You thrive in disorder. Others play to win; you play to play."
  },
  master_manipulator: { 
    title: "The Master Manipulator", 
    icon: Drama,
    color: "from-indigo-500 to-purple-500",
    description: "Deception is an art, and you're Picasso."
  },
  bs_detector: { 
    title: "The BS Detector", 
    icon: Search,
    color: "from-teal-500 to-cyan-500",
    description: "Nothing gets past you. You can smell a lie from a mile away."
  },
  honest_abe: { 
    title: "The Honest Abe", 
    icon: Award,
    color: "from-gray-500 to-slate-500",
    description: "Integrity is your middle name. You play it straight."
  },
  comedy_genius: { 
    title: "The Comedy Genius", 
    icon: Laugh,
    color: "from-amber-500 to-yellow-500",
    description: "You were born to make people laugh. Every game is your stage."
  },
  hivemind: { 
    title: "The Hivemind", 
    icon: Users,
    color: "from-orange-500 to-amber-500",
    description: "You know what the crowd wants. Your instincts are uncanny."
  },
};

// Keys match backend game slugs
const GAME_INFO: Record<string, { name: string; icon: typeof Brain; color: string }> = {
  blitzgrid: { name: "Blitzgrid", icon: Brain, color: "from-rose-400 to-fuchsia-500" },
  sequence_squeeze: { name: "Sort Circuit", icon: Target, color: "from-emerald-400 to-cyan-500" },
  psyop: { name: "PsyOp", icon: Zap, color: "from-violet-400 to-indigo-500" },
  timewarp: { name: "Past Forward", icon: Clock, color: "from-amber-400 to-orange-500" },
  memenoharm: { name: "Meme No Harm", icon: Sparkles, color: "from-pink-400 to-rose-500" },
};

export default function PlayerProfile() {
  const { profile, isLoading, isGuest } = usePlayerProfile();
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950 dark:via-purple-950 dark:to-fuchsia-950 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950 dark:via-purple-950 dark:to-fuchsia-950 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-8">
          <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <CardTitle className="mb-2">No Profile Yet</CardTitle>
          <CardDescription className="mb-6">
            Play some games to build your player profile!
          </CardDescription>
          <Link href="/">
            <Button data-testid="button-go-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Play
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { profile: playerData, stats, badges, personality } = profile;
  const dominantTrait = playerData.dominantTrait;
  const traitInfo = dominantTrait ? TRAIT_INFO[dominantTrait] : null;

  // Sort personality traits by score
  const sortedTraits = Object.entries(personality)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950 dark:via-purple-950 dark:to-fuchsia-950 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back button */}
        <Link href="/">
          <Button variant="ghost" className="mb-2" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
        </Link>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="relative overflow-hidden">
            {/* Gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${traitInfo?.color || 'from-violet-400 to-fuchsia-500'} opacity-10`} />
            
            <CardContent className="relative pt-8 pb-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Avatar */}
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${traitInfo?.color || 'from-violet-400 to-fuchsia-500'} flex items-center justify-center text-4xl text-white shadow-lg`}>
                  {traitInfo ? <traitInfo.icon className="w-12 h-12" /> : <User className="w-12 h-12" />}
                </div>
                
                {/* Info */}
                <div className="text-center md:text-left flex-1">
                  <h1 className="text-2xl font-bold" data-testid="text-player-name">
                    {playerData.displayName}
                  </h1>
                  {traitInfo && (
                    <p className="text-lg text-muted-foreground" data-testid="text-dominant-trait">
                      {traitInfo.title}
                    </p>
                  )}
                  {isGuest && (
                    <Badge variant="outline" className="mt-2">
                      Guest Player
                    </Badge>
                  )}
                </div>
                
                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold" data-testid="text-total-games">
                      {playerData.totalGamesPlayed}
                    </div>
                    <div className="text-xs text-muted-foreground">Games</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold" data-testid="text-total-wins">
                      {playerData.totalWins}
                    </div>
                    <div className="text-xs text-muted-foreground">Wins</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold" data-testid="text-total-points">
                      {playerData.totalPointsEarned.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Points</div>
                  </div>
                </div>
              </div>
              
              {/* Trait description */}
              {traitInfo && (
                <div className="mt-6 p-4 rounded-lg bg-white/50 dark:bg-black/20">
                  <p className="text-center text-muted-foreground italic" data-testid="text-trait-description">
                    "{traitInfo.description}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Personality Breakdown */}
        {sortedTraits.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  Your Personality DNA
                </CardTitle>
                <CardDescription>
                  What your gameplay reveals about you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedTraits.map(([trait, score], index) => {
                  const info = TRAIT_INFO[trait];
                  if (!info) return null;
                  
                  return (
                    <motion.div 
                      key={trait}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      className="space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <info.icon className="w-5 h-5" />
                          <span className="font-medium">{info.title}</span>
                        </div>
                        <span className="text-sm text-muted-foreground" data-testid={`text-trait-score-${trait}`}>
                          {score}%
                        </span>
                      </div>
                      <Progress value={score} className="h-2" />
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="w-5 h-5 text-amber-500" />
                Badges ({badges.length})
              </CardTitle>
              <CardDescription>
                Achievements unlocked through your gameplay
              </CardDescription>
            </CardHeader>
            <CardContent>
              {badges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No badges yet. Keep playing to earn some!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {badges.map((badge, index) => {
                    const BadgeIcon = BADGE_ICON_MAP[badge.definition.icon] || Trophy;
                    return (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 text-center hover-elevate"
                        data-testid={`badge-${badge.badgeType}`}
                      >
                        <div className="flex justify-center mb-2">
                          <BadgeIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="font-medium text-sm">{badge.definition.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {badge.definition.description}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Game Stats */}
        {stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-500" />
                  Game Stats
                </CardTitle>
                <CardDescription>
                  Your performance across all games
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.map((gameStat, index) => {
                    const gameInfo = GAME_INFO[gameStat.gameSlug];
                    if (!gameInfo) return null;
                    const GameIcon = gameInfo.icon;
                    
                    return (
                      <motion.div
                        key={gameStat.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="p-4 rounded-lg border"
                        data-testid={`game-stats-${gameStat.gameSlug}`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gameInfo.color} flex items-center justify-center`}>
                            <GameIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-medium">{gameInfo.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {gameStat.gamesPlayed} games played
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <div>
                            <div className="font-bold">{gameStat.gamesWon}</div>
                            <div className="text-xs text-muted-foreground">Wins</div>
                          </div>
                          <div>
                            <div className="font-bold">{gameStat.highestScore}</div>
                            <div className="text-xs text-muted-foreground">Best</div>
                          </div>
                          <div>
                            <div className="font-bold">
                              {gameStat.gamesPlayed > 0 
                                ? Math.round((gameStat.gamesWon / gameStat.gamesPlayed) * 100)
                                : 0}%
                            </div>
                            <div className="text-xs text-muted-foreground">Win %</div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Sign up prompt for guests */}
        {isGuest && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30" />
              <CardContent className="relative py-8 text-center">
                <Flame className="w-12 h-12 mx-auto mb-4 text-violet-500" />
                <h3 className="text-xl font-bold mb-2">Save Your Progress Forever</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create an account to keep your personality profile, badges, and stats across devices.
                </p>
                <Link href="/">
                  <Button 
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-500"
                    data-testid="button-create-account"
                  >
                    Create Account
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
