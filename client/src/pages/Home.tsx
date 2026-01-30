import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, ArrowRight, Sparkles, PartyPopper, Users, ChevronRight, ListOrdered, Trophy, Clock, Brain, Play, Zap } from "lucide-react";
import { AvocadoIcon } from "@/components/AvocadoIcon";
import { AppHeader } from "@/components/AppHeader";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import LandingPage from "./LandingPage";
import type { GameType } from "@shared/schema";
import { motion } from "framer-motion";

const GUIDE_STEPS = [
  {
    title: "Pick a Game",
    description: "Choose from our growing collection of party games",
    icon: Grid3X3,
  },
  {
    title: "Create Content",
    description: "Build your game with custom questions, prompts, and challenges",
    icon: Sparkles,
  },
  {
    title: "Start Hosting",
    description: "Launch your game and invite players to join",
    icon: Users,
  },
  {
    title: "Run the Show!",
    description: "Control the game, reveal content, and keep score",
    icon: Trophy,
  },
];

const GAME_CONFIG: Record<string, { 
  icon: typeof Grid3X3; 
  gradient: string; 
  bgGradient: string;
  shadowColor: string;
  route: string;
  playerCount: string;
  accentColor: string;
  iconBg: string;
  status?: string;
}> = {
  blitzgrid: {
    icon: Grid3X3,
    gradient: "from-violet-500 via-purple-500 to-indigo-500",
    bgGradient: "from-violet-500/5 via-purple-500/5 to-indigo-500/5",
    shadowColor: "shadow-purple-500/20",
    route: "/host/blitzgrid",
    playerCount: "2-10 players",
    accentColor: "#8B5CF6",
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
  },
  sequence_squeeze: {
    icon: ListOrdered,
    gradient: "from-emerald-400 via-teal-500 to-cyan-500",
    bgGradient: "from-emerald-500/5 via-teal-500/5 to-cyan-500/5",
    shadowColor: "shadow-teal-500/20",
    route: "/host/genetic-sort",
    playerCount: "2-20 players",
    accentColor: "#14B8A6",
    iconBg: "bg-gradient-to-br from-emerald-400 to-teal-500",
  },
  psyop: {
    icon: Brain,
    gradient: "from-rose-400 via-pink-500 to-fuchsia-500",
    bgGradient: "from-rose-500/5 via-pink-500/5 to-fuchsia-500/5",
    shadowColor: "shadow-pink-500/20",
    route: "/host/psyop",
    playerCount: "4-12 players",
    accentColor: "#EC4899",
    iconBg: "bg-gradient-to-br from-rose-400 to-pink-500",
  },
};

function GameCardSkeleton() {
  return (
    <div className="relative flex flex-col p-6 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl w-full overflow-hidden">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-14 h-14 rounded-2xl" />
        <div className="flex-1">
          <Skeleton className="h-5 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
}

export default function Home() {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showGuide, setShowGuide] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const { data: gameTypes = [], isLoading: isLoadingGames } = useQuery<(GameType & { status?: string })[]>({
    queryKey: ['/api/game-types/homepage'],
    queryFn: async () => {
      const res = await fetch('/api/game-types/homepage');
      return res.json();
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const hasSeenGuide = localStorage.getItem('hasSeenHostGuide');
        if (!hasSeenGuide && isAuthenticated) {
          setShowGuide(true);
        }
      }
    } catch {}
  }, [isAuthenticated]);

  const handleCloseGuide = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenHostGuide', 'true');
      }
    } catch {}
    setShowGuide(false);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-primary" />
        </motion.div>
        <p className="text-muted-foreground mt-4 text-sm">Loading your games...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-pink-500/5 via-transparent to-transparent" />
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>
      
      <AppHeader 
        showAdminButton={true}
        showHelpButton={true}
        showLogout={true}
        onHelpClick={() => setShowGuide(true)}
      />

      <main className="flex-1 px-4 md:px-6 py-8 overflow-y-auto relative">
        <div className="max-w-5xl mx-auto">
          
          <motion.section 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-medium mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Zap className="w-3 h-3" />
              Ready to play
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-5xl font-black mb-3 tracking-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <span className="text-foreground">Hey </span>
              <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
                {user?.firstName || 'there'}
              </span>
              <span className="text-foreground">!</span>
            </motion.h1>
            
            <motion.p 
              className="text-muted-foreground text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Pick a game and let's get this party started
            </motion.p>
          </motion.section>

          {isLoadingGames ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                >
                  <GameCardSkeleton />
                </motion.div>
              ))}
            </div>
          ) : gameTypes.length === 0 ? (
            <motion.div 
              className="text-center py-16 px-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto mb-6">
                <AvocadoIcon className="w-12 h-12 opacity-40" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">No Games Available</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                Games will appear here once your admin enables them
              </p>
              <Button variant="outline" className="gap-2" data-testid="button-empty-state">
                <PartyPopper className="w-4 h-4" />
                Check Back Later
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {gameTypes.filter(g => GAME_CONFIG[g.slug]).map((game, index) => {
                const config = GAME_CONFIG[game.slug];
                const Icon = config.icon;
                const isComingSoon = (game as any).status === 'coming_soon' || config.status === 'coming_soon';
                const isHovered = hoveredCard === game.slug;

                return (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      delay: 0.25 + index * 0.1,
                      type: "spring",
                      stiffness: 100,
                      damping: 15
                    }}
                    className="relative"
                  >
                    <motion.button
                      onClick={() => !isComingSoon && setLocation(config.route)}
                      onMouseEnter={() => setHoveredCard(game.slug)}
                      onMouseLeave={() => setHoveredCard(null)}
                      whileHover={isComingSoon ? {} : { y: -4, transition: { duration: 0.2 } }}
                      whileTap={isComingSoon ? {} : { scale: 0.98 }}
                      disabled={isComingSoon}
                      className={`relative flex flex-col p-6 rounded-2xl text-left transition-all duration-300 w-full overflow-visible ${
                        isComingSoon 
                          ? 'opacity-40 cursor-not-allowed bg-card/30 border border-border/30' 
                          : 'bg-card/80 backdrop-blur-sm border border-border/50 hover-elevate active-elevate-2'
                      }`}
                      style={{
                        boxShadow: isHovered && !isComingSoon 
                          ? `0 20px 40px -15px ${config.accentColor}20, 0 0 0 1px ${config.accentColor}15`
                          : undefined
                      }}
                      data-testid={`button-game-${game.slug}`}
                    >
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${config.bgGradient} opacity-0 transition-opacity duration-300 ${isHovered && !isComingSoon ? 'opacity-100' : ''}`} />
                      
                      {isComingSoon && (
                        <div className="absolute top-4 right-4 px-2.5 py-1 bg-muted rounded-full text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex flex-wrap items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Soon
                        </div>
                      )}
                      
                      <div className="relative flex flex-wrap items-start gap-4 mb-4">
                        <motion.div 
                          className={`w-14 h-14 rounded-2xl ${config.iconBg} flex items-center justify-center shadow-lg ${config.shadowColor}`}
                          animate={isHovered && !isComingSoon ? { scale: 1.05, rotate: 3 } : { scale: 1, rotate: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Icon className="w-7 h-7 text-white" />
                        </motion.div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-foreground truncate">
                            {game.displayName}
                          </h3>
                          <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1">
                            <Users className="w-3 h-3" />
                            {config.playerCount}
                          </p>
                        </div>
                      </div>
                      
                      <p className="relative text-sm text-muted-foreground mb-5 line-clamp-2 flex-1">
                        {game.description}
                      </p>
                      
                      {!isComingSoon && (
                        <motion.div 
                          className={`relative flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all ${
                            isHovered 
                              ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg ${config.shadowColor}` 
                              : 'bg-muted text-muted-foreground'
                          }`}
                          animate={isHovered ? { scale: 1.02 } : { scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Play className="w-4 h-4" fill={isHovered ? "currentColor" : "none"} />
                          <span>{isHovered ? 'Start Game' : 'Play'}</span>
                          <ArrowRight className={`w-4 h-4 transition-transform ${isHovered ? 'translate-x-0.5' : ''}`} />
                        </motion.div>
                      )}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          )}

          <motion.div 
            className="mt-10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-xs text-muted-foreground/60">
              More games coming soon
            </p>
          </motion.div>

        </div>
      </main>
      
      <footer className="border-t border-border/30 bg-card/20 backdrop-blur-sm px-6 py-3 text-center">
        <p className="text-xs text-muted-foreground/60">
          Made with love for Amoli
        </p>
      </footer>

      <Dialog open={showGuide} onOpenChange={(open) => !open && handleCloseGuide()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AvocadoIcon className="w-6 h-6" />
              How to Host a Game
            </DialogTitle>
            <DialogDescription>
              Follow these simple steps to run your game night
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {GUIDE_STEPS.map((step, index) => (
              <motion.div 
                key={index} 
                className="flex flex-wrap items-start gap-3 p-3 rounded-xl bg-muted/50"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                  <step.icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Step {index + 1}</span>
                  </div>
                  <h4 className="font-semibold text-foreground">{step.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={handleCloseGuide} className="flex-1" data-testid="button-close-guide">
              Got it!
            </Button>
            <Button className="flex-1 gap-2" onClick={handleCloseGuide} data-testid="button-start-hosting">
              Let's Go <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
