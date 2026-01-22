import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, ArrowRight, Lock, Sparkles, PartyPopper, Users, ChevronRight, Heart, ListOrdered, Trophy, Clock } from "lucide-react";
import { AvocadoIcon } from "@/components/AvocadoIcon";
import { AppHeader } from "@/components/AppHeader";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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
  status?: string;
}> = {
  blitzgrid: {
    icon: Grid3X3,
    gradient: "from-violet-500 via-purple-500 to-indigo-500",
    shadowColor: "shadow-purple-500/30",
    hoverBorder: "hover:border-purple-400/50 hover:shadow-purple-500/20",
    route: "/host/blitzgrid",
    playerCount: "Multiplayer",
    accentColor: "#8B5CF6",
  },
  sequence_squeeze: {
    icon: ListOrdered,
    gradient: "from-emerald-400 via-teal-500 to-cyan-500",
    shadowColor: "shadow-teal-500/30",
    hoverBorder: "hover:border-teal-400/50 hover:shadow-teal-500/20",
    route: "/host/sequence-squeeze",
    playerCount: "Multiplayer",
    accentColor: "#14B8A6",
    status: "coming_soon",
  },
  double_dip: {
    icon: Heart,
    gradient: "from-rose-400 via-pink-500 to-fuchsia-500",
    shadowColor: "shadow-pink-500/30",
    hoverBorder: "hover:border-pink-400/50 hover:shadow-pink-500/20",
    route: "/host/double-dip",
    playerCount: "2 Players",
    accentColor: "#EC4899",
  },
};

export default function Home() {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showGuide, setShowGuide] = useState(false);

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
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-pink-500/5 pointer-events-none" />
      
      <AppHeader 
        showAdminButton={true}
        showHelpButton={true}
        showLogout={true}
        onHelpClick={() => setShowGuide(true)}
      />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <motion.div 
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 border border-violet-300/30 dark:border-violet-500/30 shadow-lg shadow-violet-500/10 mb-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <PartyPopper className="w-5 h-5 text-fuchsia-500" />
              </motion.div>
              <span className="text-sm font-semibold text-foreground">Welcome back, <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">{user?.firstName || 'Host'}</span>!</span>
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <Sparkles className="w-5 h-5 text-amber-500" />
              </motion.div>
            </motion.div>
            
            <h2 className="text-4xl md:text-5xl font-black mb-3">
              <span className="text-foreground">Choose Your </span>
              <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Game</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Pick a game mode and let the fiesta begin
            </p>
          </motion.div>

          {isLoadingGames ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : gameTypes.length === 0 ? (
            <motion.div 
              className="text-center py-16 px-8 bg-gradient-to-b from-card to-card/60 rounded-2xl border border-border"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <AvocadoIcon className="w-10 h-10 opacity-40" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">No games available</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Contact the administrator to enable game modes
              </p>
            </motion.div>
          ) : (
            <div className="flex flex-wrap justify-center gap-6 mb-12">
              {gameTypes.filter(g => GAME_CONFIG[g.slug]).map((game, index) => {
                const config = GAME_CONFIG[game.slug] || {
                  icon: Grid3X3,
                  gradient: "from-primary to-secondary",
                  shadowColor: "shadow-primary/20",
                  hoverBorder: "hover:border-primary/50 hover:shadow-primary/10",
                  route: "/",
                  playerCount: "Multiplayer",
                };
                const Icon = config.icon;
                const isComingSoon = (game as any).status === 'coming_soon' || config.status === 'coming_soon';

                return (
                  <motion.button
                    key={game.id}
                    onClick={() => !isComingSoon && setLocation(config.route)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                    whileHover={isComingSoon ? {} : { scale: 1.02, y: -4 }}
                    whileTap={isComingSoon ? {} : { scale: 0.98 }}
                    disabled={isComingSoon}
                    className={`relative flex flex-col p-8 bg-card border-2 rounded-2xl text-left transition-all group overflow-hidden max-w-md w-full ${
                      isComingSoon 
                        ? 'opacity-60 cursor-not-allowed border-border' 
                        : `hover:shadow-2xl border-border ${config.hoverBorder}`
                    }`}
                    data-testid={`button-game-${game.slug}`}
                  >
                    <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl ${config.gradient} ${isComingSoon ? 'opacity-5' : 'opacity-15'} rounded-bl-full`} />
                    
                    {isComingSoon && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Coming Soon
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between gap-3 mb-6">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${config.gradient} ${isComingSoon ? 'opacity-50' : ''} flex items-center justify-center shadow-lg ${config.shadowColor}`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      {!isComingSoon && (
                        <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                      )}
                    </div>
                    
                    <h3 className={`text-2xl font-bold mb-2 ${isComingSoon ? 'text-foreground/60' : 'text-foreground'}`}>
                      {game.displayName}
                    </h3>
                    
                    <p className={`mb-6 flex-1 ${isComingSoon ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                      {game.description}
                    </p>
                    
                    <div className="pt-4 border-t border-border/50 flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{config.playerCount}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

        </div>
      </main>
      
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur px-6 py-4 text-center">
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
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
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
              </div>
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
