import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Settings, Grid3X3, LogOut, Sun, Moon, ArrowRight, Zap, Trophy, Clock, Lock, Sparkles, PartyPopper, Users, HelpCircle, ChevronRight, Shield, Heart } from "lucide-react";
import { AvocadoIcon } from "@/components/AvocadoIcon";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTheme } from "@/context/ThemeContext";
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
}> = {
  grid_of_grudges: {
    icon: Grid3X3,
    gradient: "from-blue-500 via-indigo-500 to-violet-500",
    shadowColor: "shadow-indigo-500/30",
    hoverBorder: "hover:border-indigo-400/50 hover:shadow-indigo-500/20",
    route: "/host/buzzkill",
    playerCount: "Multiplayer",
  },
  double_dip: {
    icon: Heart,
    gradient: "from-rose-400 via-pink-500 to-fuchsia-500",
    shadowColor: "shadow-pink-500/30",
    hoverBorder: "hover:border-pink-400/50 hover:shadow-pink-500/20",
    route: "/host/double-dip",
    playerCount: "2 Players",
  },
};

export default function Home() {
  const { user, isLoading: isAuthLoading, isAuthenticated, logout, isLoggingOut } = useAuth();
  const { colorMode, toggleColorMode } = useTheme();
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
    <div className="min-h-screen gradient-game grid-bg flex flex-col">
      <header className="border-b border-primary/20 bg-card/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-foreground">
              Holy <span className="text-primary">Guac</span>Amoli!
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-primary" 
              onClick={() => setShowGuide(true)}
              data-testid="button-help"
              aria-label="How to host"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-foreground" 
              onClick={toggleColorMode}
              data-testid="button-color-mode"
              aria-label={colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {colorMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" data-testid="button-admin" aria-label="Admin settings">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
            {user?.role === 'super_admin' && (
              <Link href="/admin/super">
                <Button variant="ghost" size="icon" className="text-purple-500 hover:text-purple-400" data-testid="button-super-admin" aria-label="Super admin panel">
                  <Shield className="w-5 h-5" />
                </Button>
              </Link>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-destructive" 
              data-testid="button-logout"
              onClick={() => logout()}
              disabled={isLoggingOut}
              aria-label="Log out"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 mb-6"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <PartyPopper className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Welcome back, {user?.firstName || 'Host'}!</span>
              <Sparkles className="w-4 h-4 text-teal-500" />
            </motion.div>
            
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-3">
              Choose Your Game
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Pick a game mode and get ready to host
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {gameTypes.map((game, index) => {
                const config = GAME_CONFIG[game.slug] || {
                  icon: Grid3X3,
                  gradient: "from-primary to-secondary",
                  shadowColor: "shadow-primary/20",
                  hoverBorder: "hover:border-primary/50 hover:shadow-primary/10",
                  route: "/",
                  playerCount: "Multiplayer",
                };
                const Icon = config.icon;
                const isComingSoon = (game as any).status === 'coming_soon';

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
                    className={`relative flex flex-col p-8 bg-card border border-border rounded-xl text-left transition-all group overflow-hidden ${
                      isComingSoon 
                        ? 'opacity-60 cursor-not-allowed' 
                        : `hover:shadow-xl ${config.hoverBorder}`
                    }`}
                    data-testid={`button-game-${game.slug}`}
                  >
                    <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl ${config.gradient} ${isComingSoon ? 'opacity-5' : 'opacity-10'} rounded-bl-full`} />
                    
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm font-medium text-muted-foreground px-3">More Game Modes Coming Soon</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative flex flex-col items-center gap-3 p-6 bg-card/30 border border-dashed border-border rounded-xl text-center">
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Soon
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-amber-500/60" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-foreground/60 mb-1">Speed Round</h4>
                  <p className="text-muted-foreground/60 text-xs">Race against the clock with rapid-fire questions</p>
                </div>
              </div>

              <div className="relative flex flex-col items-center gap-3 p-6 bg-card/30 border border-dashed border-border rounded-xl text-center">
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Soon
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-violet-500/60" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-foreground/60 mb-1">Tournament</h4>
                  <p className="text-muted-foreground/60 text-xs">Bracket-style elimination competition</p>
                </div>
              </div>

              <div className="relative flex flex-col items-center gap-3 p-6 bg-card/30 border border-dashed border-border rounded-xl text-center">
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Soon
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-cyan-500/60" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-foreground/60 mb-1">Daily Challenge</h4>
                  <p className="text-muted-foreground/60 text-xs">New curated questions every day</p>
                </div>
              </div>
            </div>
          </motion.div>
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
