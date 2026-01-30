import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, ArrowRight, Sparkles, PartyPopper, Users, ChevronRight, ListOrdered, Trophy, Clock, Brain, Play, Zap, Star, Flame, Crown } from "lucide-react";
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
    title: "Pick Your Arena",
    description: "Choose from our collection of handcrafted party experiences",
    icon: Grid3X3,
  },
  {
    title: "Craft Your Game",
    description: "Add your own questions, inside jokes, and personal touches",
    icon: Sparkles,
  },
  {
    title: "Rally Your Crew",
    description: "Share the join code and watch your friends pile in",
    icon: Users,
  },
  {
    title: "Own the Night",
    description: "Host like a pro, drop the reveals, crown your champions",
    icon: Crown,
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
  tagline: string;
  description: string;
}> = {
  blitzgrid: {
    icon: Grid3X3,
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    bgGradient: "from-amber-500/10 via-orange-500/8 to-rose-500/5",
    shadowColor: "shadow-orange-500/30",
    route: "/host/blitzgrid",
    playerCount: "2-10 players",
    accentColor: "#F97316",
    iconBg: "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500",
    tagline: "The Grid Awaits",
    description: "5 categories. 25 questions. One champion. Race against the clock to decode clues and dominate the board.",
  },
  sequence_squeeze: {
    icon: ListOrdered,
    gradient: "from-emerald-400 via-teal-500 to-cyan-500",
    bgGradient: "from-emerald-500/10 via-teal-500/8 to-cyan-500/5",
    shadowColor: "shadow-teal-500/30",
    route: "/host/genetic-sort",
    playerCount: "2-20 players",
    accentColor: "#14B8A6",
    iconBg: "bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500",
    tagline: "Order From Chaos",
    description: "Four items. One correct sequence. The fastest brain wins. Can you crack the pattern before anyone else?",
  },
  psyop: {
    icon: Brain,
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    bgGradient: "from-violet-500/10 via-purple-500/8 to-fuchsia-500/5",
    shadowColor: "shadow-purple-500/30",
    route: "/host/psyop",
    playerCount: "4-12 players",
    accentColor: "#A855F7",
    iconBg: "bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500",
    tagline: "Truth or Bluff",
    description: "Craft the perfect lie. Fool your friends. Sniff out the truth. The best deceiver takes it all.",
  },
};

function GameCardSkeleton() {
  return (
    <div className="relative flex flex-col p-6 bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl w-full overflow-hidden">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        <div className="flex-1">
          <Skeleton className="h-5 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <Skeleton className="h-12 w-full rounded-xl" />
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
        <p className="text-muted-foreground mt-4 text-sm">Warming up the party...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Immersive background with animated gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Primary aurora gradient */}
        <motion.div 
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%]"
          animate={{
            background: [
              "radial-gradient(ellipse at 30% 20%, rgba(251,146,60,0.15) 0%, transparent 50%)",
              "radial-gradient(ellipse at 70% 30%, rgba(251,146,60,0.15) 0%, transparent 50%)",
              "radial-gradient(ellipse at 30% 20%, rgba(251,146,60,0.15) 0%, transparent 50%)",
            ]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Secondary glow */}
        <motion.div 
          className="absolute -bottom-1/2 -right-1/2 w-[200%] h-[200%]"
          animate={{
            background: [
              "radial-gradient(ellipse at 70% 80%, rgba(168,85,247,0.12) 0%, transparent 50%)",
              "radial-gradient(ellipse at 30% 70%, rgba(168,85,247,0.12) 0%, transparent 50%)",
              "radial-gradient(ellipse at 70% 80%, rgba(168,85,247,0.12) 0%, transparent 50%)",
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Accent shimmer */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        {/* Subtle grid texture */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>
      
      <AppHeader 
        showAdminButton={true}
        showHelpButton={true}
        showLogout={true}
        onHelpClick={() => setShowGuide(true)}
      />

      <main className="flex-1 px-4 md:px-6 py-10 overflow-y-auto relative z-10">
        <div className="max-w-5xl mx-auto">
          
          {/* Hero Section */}
          <motion.section 
            className="text-center mb-14"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Floating badge */}
            <motion.div
              className="inline-flex flex-wrap items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-sm font-semibold mb-6 backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Flame className="w-4 h-4" />
              </motion.div>
              Game Night Mode: Activated
            </motion.div>
            
            {/* Main heading */}
            <motion.h1 
              className="text-5xl md:text-6xl lg:text-7xl font-black mb-5 tracking-tight leading-[1.1]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
            >
              <span className="text-foreground">What's up, </span>
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
                  {user?.firstName || 'Legend'}
                </span>
                <motion.span 
                  className="absolute -top-1 -right-6 text-2xl"
                  animate={{ rotate: [0, 20, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 4 }}
                >
                  <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                </motion.span>
              </span>
            </motion.h1>
            
            {/* Subtitle */}
            <motion.p 
              className="text-xl md:text-2xl text-muted-foreground font-medium max-w-lg mx-auto"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
            >
              Pick your game. Rally your crew.
              <br />
              <span className="text-foreground font-semibold">Let the chaos begin.</span>
            </motion.p>
          </motion.section>

          {/* Game Cards Grid */}
          {isLoadingGames ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                >
                  <GameCardSkeleton />
                </motion.div>
              ))}
            </div>
          ) : gameTypes.length === 0 ? (
            <motion.div 
              className="text-center py-20 px-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto mb-8 shadow-xl">
                <AvocadoIcon className="w-14 h-14 opacity-40" />
              </div>
              <h3 className="text-3xl font-bold text-foreground mb-4">No Games Yet</h3>
              <p className="text-muted-foreground text-lg max-w-sm mx-auto mb-8">
                Games will appear here once they're ready to play
              </p>
              <Button variant="outline" size="lg" className="gap-2" data-testid="button-empty-state">
                <PartyPopper className="w-5 h-5" />
                Check Back Soon
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {gameTypes.filter(g => GAME_CONFIG[g.slug]).map((game, index) => {
                const config = GAME_CONFIG[game.slug];
                const Icon = config.icon;
                const isComingSoon = (game as any).status === 'coming_soon' || config.status === 'coming_soon';
                const isHovered = hoveredCard === game.slug;

                return (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      delay: 0.3 + index * 0.12,
                      type: "spring",
                      stiffness: 80,
                      damping: 15
                    }}
                    className="relative group"
                  >
                    <motion.button
                      onClick={() => !isComingSoon && setLocation(config.route)}
                      onMouseEnter={() => setHoveredCard(game.slug)}
                      onMouseLeave={() => setHoveredCard(null)}
                      whileHover={isComingSoon ? {} : { y: -8, transition: { duration: 0.25 } }}
                      whileTap={isComingSoon ? {} : { scale: 0.97 }}
                      disabled={isComingSoon}
                      className={`relative flex flex-col p-7 rounded-3xl text-left transition-all duration-400 w-full overflow-hidden ${
                        isComingSoon 
                          ? 'opacity-50 cursor-not-allowed bg-card/40 border border-border/30' 
                          : 'bg-card/90 backdrop-blur-md border border-border/40'
                      }`}
                      style={{
                        boxShadow: isHovered && !isComingSoon 
                          ? `0 25px 50px -12px ${config.accentColor}30, 0 0 0 1px ${config.accentColor}20, 0 0 80px -20px ${config.accentColor}15`
                          : '0 4px 20px -5px rgba(0,0,0,0.1)'
                      }}
                      data-testid={`button-game-${game.slug}`}
                    >
                      {/* Animated gradient background on hover */}
                      <motion.div 
                        className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${config.bgGradient}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isHovered && !isComingSoon ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                      />
                      
                      {/* Shimmer effect on hover */}
                      {isHovered && !isComingSoon && (
                        <motion.div 
                          className="absolute inset-0 rounded-3xl"
                          initial={{ opacity: 0, x: "-100%" }}
                          animate={{ opacity: 0.1, x: "100%" }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          style={{
                            background: `linear-gradient(90deg, transparent, ${config.accentColor}, transparent)`,
                          }}
                        />
                      )}
                      
                      {/* Coming Soon Badge */}
                      {isComingSoon && (
                        <div className="absolute top-5 right-5 px-3 py-1.5 bg-muted rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex flex-wrap items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          Soon
                        </div>
                      )}
                      
                      {/* Card Header */}
                      <div className="relative flex flex-wrap items-start gap-4 mb-5">
                        <motion.div 
                          className={`w-16 h-16 rounded-2xl ${config.iconBg} flex items-center justify-center shadow-xl ${config.shadowColor}`}
                          animate={isHovered && !isComingSoon ? { 
                            scale: 1.08, 
                            rotate: 5,
                            boxShadow: `0 20px 40px -10px ${config.accentColor}40`
                          } : { 
                            scale: 1, 
                            rotate: 0 
                          }}
                          transition={{ duration: 0.25 }}
                        >
                          <Icon className="w-8 h-8 text-white drop-shadow-lg" />
                        </motion.div>
                        
                        <div className="flex-1 min-w-0 pt-1">
                          <h3 className="text-xl font-extrabold text-foreground mb-1">
                            {game.displayName}
                          </h3>
                          <p className="text-xs font-semibold text-muted-foreground/80 flex flex-wrap items-center gap-1.5 uppercase tracking-wide">
                            <Users className="w-3.5 h-3.5" />
                            {config.playerCount}
                          </p>
                        </div>
                      </div>
                      
                      {/* Tagline */}
                      <motion.p 
                        className={`relative text-sm font-bold mb-2 transition-colors duration-300 ${
                          isHovered && !isComingSoon 
                            ? 'text-foreground' 
                            : 'text-muted-foreground'
                        }`}
                      >
                        {config.tagline}
                      </motion.p>
                      
                      {/* Description */}
                      <p className="relative text-sm text-muted-foreground/90 mb-6 leading-relaxed flex-1">
                        {config.description}
                      </p>
                      
                      {/* Play Button */}
                      {!isComingSoon && (
                        <motion.div 
                          className={`relative flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 ${
                            isHovered 
                              ? `bg-gradient-to-r ${config.gradient} text-white shadow-xl ${config.shadowColor}` 
                              : 'bg-muted/80 text-foreground'
                          }`}
                          animate={isHovered ? { scale: 1.02 } : { scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <motion.div
                            animate={isHovered ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.4 }}
                          >
                            <Play className="w-5 h-5" fill={isHovered ? "currentColor" : "none"} />
                          </motion.div>
                          <span className="text-base">{isHovered ? "Let's Go" : "Play Now"}</span>
                          <motion.div
                            animate={isHovered ? { x: [0, 4, 0] } : {}}
                            transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 0.8 }}
                          >
                            <ArrowRight className="w-5 h-5" />
                          </motion.div>
                        </motion.div>
                      )}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Bottom teaser */}
          <motion.div 
            className="mt-14 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <p className="text-sm text-muted-foreground/50 font-medium">
              More games brewing behind the scenes
            </p>
          </motion.div>

        </div>
      </main>
      
      {/* Footer */}
      <footer className="relative z-10 border-t border-border/20 bg-card/10 backdrop-blur-md px-6 py-4 text-center">
        <p className="text-sm text-muted-foreground/50 font-medium flex flex-wrap items-center justify-center gap-2">
          Crafted with 
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 inline" />
          </motion.span>
          for Amoli
        </p>
      </footer>

      {/* Help Guide Dialog */}
      <Dialog open={showGuide} onOpenChange={(open) => !open && handleCloseGuide()}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-3 text-2xl font-black">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Crown className="w-5 h-5 text-white" />
              </div>
              Host Like a Pro
            </DialogTitle>
            <DialogDescription className="text-base">
              Four steps to legendary game night status
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {GUIDE_STEPS.map((step, index) => (
              <motion.div 
                key={index} 
                className="flex flex-wrap items-start gap-4 p-4 rounded-2xl bg-muted/50 border border-border/30"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/20 flex items-center justify-center shrink-0">
                  <step.icon className="w-6 h-6 text-orange-500 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-orange-500 dark:text-orange-400 uppercase tracking-widest">
                      Step {index + 1}
                    </span>
                  </div>
                  <h4 className="font-bold text-foreground text-lg">{step.title}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={handleCloseGuide} className="flex-1 h-12 text-base" data-testid="button-close-guide">
              Got It
            </Button>
            <Button 
              className="flex-1 h-12 text-base gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/30" 
              onClick={handleCloseGuide} 
              data-testid="button-start-hosting"
            >
              Let's Go <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
