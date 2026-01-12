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
  accentColor: string;
}> = {
  grid_of_grudges: {
    icon: Grid3X3,
    gradient: "from-[#2BB769] via-[#4AB2FF] to-[#2BB769]",
    shadowColor: "shadow-[#2BB769]/30",
    hoverBorder: "hover:border-[#2BB769]/50 hover:shadow-[#2BB769]/20",
    route: "/host/buzzkill",
    playerCount: "Multiplayer",
    accentColor: "#2BB769",
  },
  double_dip: {
    icon: Heart,
    gradient: "from-[#FF6B8A] via-[#FFE66D] to-[#FF6B8A]",
    shadowColor: "shadow-[#FF6B8A]/30",
    hoverBorder: "hover:border-[#FF6B8A]/50 hover:shadow-[#FF6B8A]/20",
    route: "/host/double-dip",
    playerCount: "2 Players",
    accentColor: "#FF6B8A",
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#2BB769]/5 via-transparent to-[#FF6B8A]/5 pointer-events-none" />
      
      <header className="border-b border-[#2BB769]/20 bg-white/70 dark:bg-[#1A2E1C]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Party Avocado Mascot */}
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              animate={{ y: [0, -3, 0] }}
              transition={{ y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-[#2BB769] rounded-full blur-xl opacity-30 scale-110" />
              <svg viewBox="0 0 64 72" className="w-12 h-12 relative z-10 drop-shadow-lg">
                {/* Avocado body */}
                <path d="M32 18 C18 18 8 32 8 50 C8 68 18 72 32 72 C46 72 56 68 56 50 C56 32 46 18 32 18Z" fill="url(#avoSkinFiesta)" />
                <ellipse cx="32" cy="52" rx="18" ry="17" fill="#F7F1E5" />
                <circle cx="32" cy="56" r="10" fill="url(#avoPitFiesta)" />
                <ellipse cx="28" cy="53" rx="3.5" ry="4" fill="#E8C9A0" opacity="0.4" />
                {/* Eyes */}
                <circle cx="24" cy="44" r="4" fill="#1A2E1C" />
                <circle cx="40" cy="44" r="4" fill="#1A2E1C" />
                <circle cx="25.5" cy="42.5" r="1.5" fill="white" />
                <circle cx="41.5" cy="42.5" r="1.5" fill="white" />
                {/* Big smile */}
                <path d="M24 52 Q32 60 40 52" stroke="#1A2E1C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                {/* Rosy cheeks */}
                <circle cx="18" cy="50" r="4" fill="#FF6B8A" opacity="0.5" />
                <circle cx="46" cy="50" r="4" fill="#FF6B8A" opacity="0.5" />
                {/* Party hat */}
                <path d="M20 18 L32 0 L44 18" fill="url(#partyHatFiesta)" />
                <circle cx="32" cy="0" r="4" fill="#FFE66D" />
                <circle cx="32" cy="0" r="2" fill="#FF6B8A" />
                {/* Hat stripes */}
                <line x1="26" y1="10" x2="26" y2="15" stroke="white" strokeWidth="2" opacity="0.8" />
                <line x1="32" y1="6" x2="32" y2="12" stroke="white" strokeWidth="2" opacity="0.8" />
                <line x1="38" y1="10" x2="38" y2="15" stroke="white" strokeWidth="2" opacity="0.8" />
                <defs>
                  <linearGradient id="avoSkinFiesta" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2BB769" />
                    <stop offset="100%" stopColor="#1A8F4A" />
                  </linearGradient>
                  <linearGradient id="avoPitFiesta" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#C9A66B" />
                    <stop offset="100%" stopColor="#8B6914" />
                  </linearGradient>
                  <linearGradient id="partyHatFiesta" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FF6B8A" />
                    <stop offset="50%" stopColor="#FFE66D" />
                    <stop offset="100%" stopColor="#4AB2FF" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Floating confetti */}
              <motion.div 
                className="absolute -top-1 -left-2 w-2 h-2 rounded-full bg-[#FF6B8A]"
                animate={{ y: [0, -8, 0], opacity: [0.6, 1, 0.6], rotate: [0, 180, 360] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div 
                className="absolute -top-2 -right-1 w-1.5 h-1.5 rounded-full bg-[#4AB2FF]"
                animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
              />
              <motion.div 
                className="absolute top-1 -right-3 w-2 h-2 rounded-full bg-[#FFE66D]"
                animate={{ y: [0, -5, 0], rotate: [0, -180, -360] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: 0.6 }}
              />
            </motion.div>
            
            {/* Logo Text */}
            <div className="flex flex-col">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                <span className="text-[#1A2E1C] dark:text-white">Holy </span>
                <span className="text-[#2BB769]">Guac</span>
                <span className="text-[#1A2E1C] dark:text-white">Amoli</span>
                <span className="text-[#FF6B8A]">!</span>
              </h1>
              <span className="text-xs text-muted-foreground tracking-wide">Game Host Dashboard</span>
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#2BB769]/10 via-[#4AB2FF]/10 to-[#FF6B8A]/10 border border-[#2BB769]/20 mb-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                <PartyPopper className="w-5 h-5 text-[#FF6B8A]" />
              </motion.div>
              <span className="text-sm font-semibold text-[#1A2E1C] dark:text-white">Welcome back, <span className="text-[#2BB769]">{user?.firstName || 'Host'}</span>!</span>
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ duration: 3, repeat: Infinity }}>
                <Sparkles className="w-5 h-5 text-[#FFE66D]" />
              </motion.div>
            </motion.div>
            
            <h2 className="text-4xl md:text-5xl font-black mb-3">
              <span className="text-[#1A2E1C] dark:text-white">Choose Your </span>
              <span className="bg-gradient-to-r from-[#2BB769] via-[#4AB2FF] to-[#FF6B8A] bg-clip-text text-transparent">Game</span>
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
                    className={`relative flex flex-col p-8 bg-white dark:bg-[#1A2E1C]/60 border-2 rounded-2xl text-left transition-all group overflow-hidden ${
                      isComingSoon 
                        ? 'opacity-60 cursor-not-allowed border-border' 
                        : `hover:shadow-2xl border-[#2BB769]/20 ${config.hoverBorder}`
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
