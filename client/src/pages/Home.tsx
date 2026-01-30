import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, ArrowRight, Sparkles, PartyPopper, Users, ChevronRight, ListOrdered, Trophy, Clock, Brain } from "lucide-react";
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
  shadowColor: string;
  hoverBorder: string;
  route: string;
  playerCount: string;
  accentColor: string;
  glowColor: string;
  status?: string;
}> = {
  blitzgrid: {
    icon: Grid3X3,
    gradient: "from-violet-500 via-purple-500 to-indigo-500",
    shadowColor: "shadow-purple-500/30",
    hoverBorder: "hover:border-purple-400/50",
    route: "/host/blitzgrid",
    playerCount: "Multiplayer",
    accentColor: "#8B5CF6",
    glowColor: "purple",
  },
  sequence_squeeze: {
    icon: ListOrdered,
    gradient: "from-emerald-400 via-teal-500 to-cyan-500",
    shadowColor: "shadow-teal-500/30",
    hoverBorder: "hover:border-teal-400/50",
    route: "/host/genetic-sort",
    playerCount: "Multiplayer",
    accentColor: "#14B8A6",
    glowColor: "teal",
  },
  psyop: {
    icon: Brain,
    gradient: "from-rose-400 via-pink-500 to-fuchsia-500",
    shadowColor: "shadow-pink-500/30",
    hoverBorder: "hover:border-pink-400/50",
    route: "/host/psyop",
    playerCount: "Multiplayer",
    accentColor: "#EC4899",
    glowColor: "pink",
  },
};

function GameCardSkeleton() {
  return (
    <div className="relative flex flex-col p-8 bg-card border-2 border-border rounded-2xl max-w-md w-full overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-muted/20 to-transparent rounded-bl-full" />
      <div className="flex items-start justify-between gap-3 mb-6">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        <Skeleton className="w-6 h-6 rounded" />
      </div>
      <Skeleton className="h-8 w-3/4 mb-3" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3 mb-6" />
      <div className="pt-4 border-t border-border/50">
        <Skeleton className="h-4 w-24" />
      </div>
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
      <div className="min-h-screen flex flex-col items-center justify-center gradient-game">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground mt-4">Loading...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-pink-500/5 pointer-events-none" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>
      
      <AppHeader 
        showAdminButton={true}
        showHelpButton={true}
        showLogout={true}
        onHelpClick={() => setShowGuide(true)}
      />

      <main className="flex-1 p-6 overflow-y-auto relative">
        <div className="max-w-6xl mx-auto">
          
          <motion.section 
            className="text-center py-6 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.h1 
              className="text-3xl md:text-4xl font-black mb-2 leading-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <span className="text-foreground">Game Night, </span>
              <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
                Elevated
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Welcome back, <span className="font-semibold text-foreground">{user?.firstName || 'Host'}</span>
            </motion.p>
          </motion.section>

          {isLoadingGames ? (
            <div className="flex flex-wrap justify-center gap-8 mb-12">
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
              className="text-center py-20 px-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div 
                className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-500/10 to-pink-500/10 flex items-center justify-center mx-auto mb-8 relative"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <AvocadoIcon className="w-16 h-16 opacity-60" />
                <motion.div 
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </motion.div>
              </motion.div>
              <h3 className="text-3xl font-bold text-foreground mb-4">No Games Yet</h3>
              <p className="text-lg text-muted-foreground max-w-md mx-auto mb-8">
                Looks like the party hasn't started! Contact your admin to unlock some awesome games.
              </p>
              <Button variant="outline" size="lg" className="gap-2" data-testid="button-empty-state">
                <PartyPopper className="w-5 h-5" />
                Check Back Soon
              </Button>
            </motion.div>
          ) : (
            <div className="flex flex-wrap justify-center gap-8 mb-12">
              {gameTypes.filter(g => GAME_CONFIG[g.slug]).map((game, index) => {
                const config = GAME_CONFIG[game.slug];
                const Icon = config.icon;
                const isComingSoon = (game as any).status === 'coming_soon' || config.status === 'coming_soon';
                const isHovered = hoveredCard === game.slug;

                return (
                  <motion.button
                    key={game.id}
                    onClick={() => !isComingSoon && setLocation(config.route)}
                    onMouseEnter={() => setHoveredCard(game.slug)}
                    onMouseLeave={() => setHoveredCard(null)}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      delay: 0.8 + index * 0.15,
                      type: "spring",
                      stiffness: 100,
                      damping: 15
                    }}
                    whileHover={isComingSoon ? {} : { 
                      y: -8,
                      rotateX: 5,
                      rotateY: -2,
                      transition: { duration: 0.3 }
                    }}
                    whileTap={isComingSoon ? {} : { scale: 0.98 }}
                    disabled={isComingSoon}
                    style={{ 
                      perspective: "1000px",
                      transformStyle: "preserve-3d"
                    }}
                    className={`relative flex flex-col p-8 bg-card border-2 rounded-3xl text-left transition-all duration-300 group overflow-visible max-w-sm w-full ${
                      isComingSoon 
                        ? 'opacity-50 cursor-not-allowed border-border grayscale' 
                        : 'border-border hover-elevate active-elevate-2'
                    }`}
                    data-testid={`button-game-${game.slug}`}
                  >
                    {!isComingSoon && isHovered && (
                      <motion.div 
                        className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-[0.08] pointer-events-none`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.08 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                    
                    <div className={`absolute top-0 right-0 w-56 h-56 bg-gradient-to-bl ${config.gradient} ${isComingSoon ? 'opacity-5' : 'opacity-10'} rounded-bl-full transition-opacity duration-300 ${!isComingSoon && isHovered ? 'opacity-20' : ''}`} />
                    
                    {isComingSoon && (
                      <motion.div 
                        className="absolute top-4 right-4 px-3 py-1.5 bg-muted/80 backdrop-blur-sm rounded-full text-xs font-semibold text-muted-foreground flex items-center gap-1.5 border border-border/50"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 + index * 0.15 }}
                      >
                        <Clock className="w-3 h-3" />
                        Coming Soon
                      </motion.div>
                    )}
                    
                    <div className="flex items-start justify-between gap-3 mb-6">
                      <motion.div 
                        className={`w-18 h-18 rounded-2xl bg-gradient-to-br ${config.gradient} ${isComingSoon ? 'opacity-50' : ''} flex items-center justify-center shadow-xl ${config.shadowColor} relative`}
                        animate={!isComingSoon && isHovered ? { 
                          scale: [1, 1.05, 1],
                          rotate: [0, 5, -5, 0]
                        } : {}}
                        transition={{ duration: 0.6 }}
                        style={{ width: "72px", height: "72px" }}
                      >
                        {isHovered && !isComingSoon && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ 
                              duration: 20, 
                              repeat: Infinity, 
                              ease: "linear" 
                            }}
                            className="absolute inset-0 rounded-2xl border-2 border-white/20"
                            style={{ borderStyle: "dashed" }}
                          />
                        )}
                        <Icon className="w-9 h-9 text-white drop-shadow-lg" />
                      </motion.div>
                      {!isComingSoon && (
                        <motion.div
                          animate={isHovered ? { x: 4, scale: 1.1 } : { x: 0, scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </motion.div>
                      )}
                    </div>
                    
                    <h3 className={`text-2xl font-bold mb-3 ${isComingSoon ? 'text-foreground/50' : 'text-foreground'}`}>
                      {game.displayName}
                    </h3>
                    
                    <p className={`mb-6 flex-1 leading-relaxed ${isComingSoon ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                      {game.description}
                    </p>
                    
                    <div className="pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{config.playerCount}</span>
                      </div>
                      {!isComingSoon && (
                        <motion.span 
                          className="text-xs font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          animate={isHovered ? { x: [0, 3, 0] } : {}}
                          transition={{ duration: 0.6, repeat: Infinity }}
                        >
                          Click to play
                        </motion.span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

        </div>
      </main>
      
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm px-6 py-4 text-center relative">
        <p className="text-xs text-muted-foreground">
          Made with love for Amoli's Birthday
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
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <step.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">Step {index + 1}</span>
                  </div>
                  <h4 className="font-semibold text-foreground text-sm">{step.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={handleCloseGuide} className="flex-1" data-testid="button-close-guide">
              Got it!
            </Button>
            <Button className="flex-1 gap-2" onClick={handleCloseGuide} data-testid="button-start-hosting">
              Start Hosting <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
