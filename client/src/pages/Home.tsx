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
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center bg-card shadow-lg shadow-green-500/20 border-2 border-green-500/30 relative overflow-visible"
              whileHover={{ scale: 1.15, rotate: 8 }}
              whileTap={{ scale: 0.9 }}
              animate={{ 
                y: [0, -5, 0],
                rotate: [0, 3, 0, -3, 0]
              }}
              transition={{ 
                y: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 5, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <svg viewBox="0 0 64 72" className="w-10 h-10 drop-shadow-md">
                {/* Confetti pieces */}
                <motion.circle cx="8" cy="20" r="2" fill="#FFE66D" animate={{ y: [0, 3, 0], opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.5, repeat: Infinity }} />
                <motion.circle cx="56" cy="18" r="2.5" fill="#FF6B9D" animate={{ y: [0, -3, 0], opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity, delay: 0.3 }} />
                <motion.circle cx="12" cy="35" r="1.5" fill="#4ADE80" animate={{ x: [0, 2, 0], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.5 }} />
                <motion.circle cx="52" cy="40" r="2" fill="#60A5FA" animate={{ y: [0, 2, 0], opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.2 }} />
                <motion.rect x="4" y="28" width="3" height="6" rx="1" fill="#FFE66D" transform="rotate(-20 4 28)" animate={{ rotate: [-20, -10, -20] }} transition={{ duration: 2, repeat: Infinity }} />
                <motion.rect x="55" y="30" width="3" height="5" rx="1" fill="#FF6B9D" transform="rotate(15 55 30)" animate={{ rotate: [15, 25, 15] }} transition={{ duration: 2.5, repeat: Infinity }} />
                {/* Sparkles */}
                <motion.path d="M5 15 L6 12 L7 15 L10 16 L7 17 L6 20 L5 17 L2 16 Z" fill="#FFE66D" animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 1, repeat: Infinity }} />
                <motion.path d="M58 45 L59 42 L60 45 L63 46 L60 47 L59 50 L58 47 L55 46 Z" fill="#4ADE80" animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} />
                {/* Avocado body */}
                <path d="M32 20 C20 20 10 33 10 49 C10 67 20 72 32 72 C44 72 54 67 54 49 C54 33 44 20 32 20Z" fill="url(#avoSkinHome)" />
                <ellipse cx="32" cy="52" rx="17" ry="16" fill="#FFF8E1" />
                <circle cx="32" cy="56" r="9" fill="url(#avoPitHome)" />
                <ellipse cx="29" cy="54" rx="3" ry="3.5" fill="#E8C9A0" opacity="0.5" />
                {/* Eyes */}
                <circle cx="25" cy="46" r="3.5" fill="#2D2D2D" />
                <circle cx="39" cy="46" r="3.5" fill="#2D2D2D" />
                <circle cx="26" cy="45" r="1.3" fill="white" />
                <circle cx="40" cy="45" r="1.3" fill="white" />
                {/* Smile */}
                <path d="M27 52 Q32 56 37 52" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" fill="none" />
                {/* Cheeks */}
                <circle cx="20" cy="50" r="3.5" fill="#FFB6C1" opacity="0.6" />
                <circle cx="44" cy="50" r="3.5" fill="#FFB6C1" opacity="0.6" />
                {/* Party hat */}
                <path d="M22 20 L32 2 L42 20" fill="url(#partyHatHome)" stroke="#FFF" strokeWidth="1" />
                <circle cx="32" cy="2" r="3" fill="#FFE66D" />
                <circle cx="32" cy="2" r="1.5" fill="#FF6B9D" />
                <line x1="27" y1="12" x2="27" y2="16" stroke="#FFF" strokeWidth="1.5" opacity="0.7" />
                <line x1="32" y1="10" x2="32" y2="14" stroke="#FFF" strokeWidth="1.5" opacity="0.7" />
                <line x1="37" y1="12" x2="37" y2="16" stroke="#FFF" strokeWidth="1.5" opacity="0.7" />
                {/* Gradients */}
                <defs>
                  <linearGradient id="avoSkinHome" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22C55E" />
                    <stop offset="50%" stopColor="#16A34A" />
                    <stop offset="100%" stopColor="#15803D" />
                  </linearGradient>
                  <linearGradient id="avoPitHome" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D4A574" />
                    <stop offset="100%" stopColor="#8B5A2B" />
                  </linearGradient>
                  <linearGradient id="partyHatHome" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FF6B9D" />
                    <stop offset="33%" stopColor="#FFE66D" />
                    <stop offset="66%" stopColor="#60A5FA" />
                    <stop offset="100%" stopColor="#4ADE80" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Holy <span className="text-green-500 dark:text-green-400">Guac</span>Amoli!
              </h1>
              <span className="text-xs text-muted-foreground">Game Host Dashboard</span>
            </div>
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <PartyPopper className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Welcome back, {user?.firstName || 'Host'}!</span>
              <Sparkles className="w-4 h-4 text-green-500" />
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
