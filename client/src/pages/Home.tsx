import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, ArrowRight, Sparkles, PartyPopper, Users, ChevronRight, ListOrdered, Crown, Clock, Brain, Play, Star, Heart } from "lucide-react";
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
  accentColor: string;
  iconBg: string;
  status?: string;
  tagline: string;
  description: string;
  borderColor: string;
}> = {
  blitzgrid: {
    icon: Grid3X3,
    gradient: "from-rose-300 via-pink-300 to-fuchsia-300",
    bgGradient: "from-rose-100/50 via-pink-100/40 to-fuchsia-100/30",
    shadowColor: "shadow-pink-300/40",
    route: "/host/blitzgrid",
    accentColor: "#F9A8D4",
    iconBg: "bg-gradient-to-br from-rose-300 via-pink-300 to-fuchsia-300",
    tagline: "The Grid Awaits",
    description: "5 categories. 25 questions. One champion. Race against the clock to decode clues and dominate the board.",
    borderColor: "border-pink-200/60",
  },
  sequence_squeeze: {
    icon: ListOrdered,
    gradient: "from-emerald-300 via-teal-300 to-cyan-300",
    bgGradient: "from-emerald-100/50 via-teal-100/40 to-cyan-100/30",
    shadowColor: "shadow-teal-300/40",
    route: "/host/genetic-sort",
    accentColor: "#5EEAD4",
    iconBg: "bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-300",
    tagline: "Order From Chaos",
    description: "Four items. One correct sequence. The fastest brain wins. Can you crack the pattern before anyone else?",
    borderColor: "border-teal-200/60",
  },
  psyop: {
    icon: Brain,
    gradient: "from-violet-300 via-purple-300 to-indigo-300",
    bgGradient: "from-violet-100/50 via-purple-100/40 to-indigo-100/30",
    shadowColor: "shadow-purple-300/40",
    route: "/host/psyop",
    accentColor: "#C4B5FD",
    iconBg: "bg-gradient-to-br from-violet-300 via-purple-300 to-indigo-300",
    tagline: "Truth or Bluff",
    description: "Craft the perfect lie. Fool your friends. Sniff out the truth. The best deceiver takes it all.",
    borderColor: "border-purple-200/60",
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
    <div className="min-h-screen bg-background flex flex-col overflow-hidden relative">
      <AppHeader 
        showAdminButton={true}
        showHelpButton={true}
        showLogout={true}
        onHelpClick={() => setShowGuide(true)}
      />

      <main className="flex-1 px-4 md:px-6 py-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          
          {/* Hero Section */}
          <motion.section 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Main heading */}
            <motion.h1 
              className="text-5xl md:text-6xl lg:text-7xl font-black mb-5 tracking-tight leading-[1.1]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
            >
              <span className="text-foreground">What's up, </span>
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-fuchsia-500 to-violet-500 bg-clip-text text-transparent">
                  {user?.firstName || 'Legend'}
                </span>
                <motion.span 
                  className="absolute -top-1 -right-5 text-xl"
                  animate={{ rotate: [0, 20, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 4 }}
                >
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
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
              <h3 className="text-2xl font-bold text-foreground mb-4">No Games Yet</h3>
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
                      delay: 0.3 + index * 0.1,
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
                      whileHover={isComingSoon ? {} : { y: -6, transition: { duration: 0.2 } }}
                      whileTap={isComingSoon ? {} : { scale: 0.98 }}
                      disabled={isComingSoon}
                      className={`relative flex flex-col p-6 rounded-3xl text-left transition-all duration-300 w-full overflow-hidden border ${
                        isComingSoon 
                          ? 'opacity-50 cursor-not-allowed bg-card/40 border-border/30' 
                          : `bg-card/80 dark:bg-card/60 backdrop-blur-sm ${config.borderColor}`
                      }`}
                      style={{
                        boxShadow: isHovered && !isComingSoon 
                          ? `0 20px 40px -12px ${config.accentColor}40`
                          : undefined
                      }}
                      data-testid={`button-game-${game.slug}`}
                    >
                      {/* Gradient background on hover */}
                      <motion.div 
                        className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${config.bgGradient}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isHovered && !isComingSoon ? 1 : 0.3 }}
                        transition={{ duration: 0.3 }}
                      />
                      
                      {/* Coming Soon Badge */}
                      {isComingSoon && (
                        <div className="absolute top-5 right-5 px-3 py-1.5 bg-muted rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex flex-wrap items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          Soon
                        </div>
                      )}
                      
                      {/* Card Header */}
                      <div className="relative flex flex-wrap items-start gap-4 mb-4">
                        <motion.div 
                          className={`w-14 h-14 rounded-2xl ${config.iconBg} flex items-center justify-center shadow-lg ${config.shadowColor}`}
                          animate={isHovered && !isComingSoon ? { 
                            scale: 1.05, 
                            rotate: 3
                          } : { 
                            scale: 1, 
                            rotate: 0 
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <Icon className="w-7 h-7 text-white drop-shadow-sm" />
                        </motion.div>
                        
                        <div className="flex-1 min-w-0 pt-1">
                          <h3 className="text-xl font-bold text-foreground">
                            {game.displayName}
                          </h3>
                        </div>
                      </div>
                      
                      {/* Tagline */}
                      <p className={`relative text-sm font-semibold mb-2 transition-colors duration-300 ${
                        isHovered && !isComingSoon 
                          ? 'text-foreground' 
                          : 'text-muted-foreground'
                      }`}>
                        {config.tagline}
                      </p>
                      
                      {/* Description */}
                      <p className="relative text-sm text-muted-foreground mb-5 leading-relaxed flex-1">
                        {config.description}
                      </p>
                      
                      {/* Play Button */}
                      {!isComingSoon && (
                        <motion.div 
                          className={`relative flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                            isHovered 
                              ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg ${config.shadowColor}` 
                              : 'bg-muted/60 text-foreground'
                          }`}
                          animate={isHovered ? { scale: 1.02 } : { scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Play className="w-4 h-4" fill={isHovered ? "currentColor" : "none"} />
                          <span>Play</span>
                          <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${isHovered ? 'translate-x-0.5' : ''}`} />
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
            className="mt-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <p className="text-sm text-muted-foreground/60">
              More games coming soon
            </p>
          </motion.div>

        </div>
      </main>
      
      {/* Footer */}
      <footer className="relative z-10 border-t border-border/10 px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-center">
          <p className="text-sm text-muted-foreground flex flex-wrap items-center justify-center gap-1">
            made with <Heart className="w-4 h-4 text-pink-500 fill-pink-500 inline" /> by <span className="font-semibold bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">Amoli</span>
          </p>
        </div>
      </footer>

      {/* Help Guide Dialog */}
      <Dialog open={showGuide} onOpenChange={(open) => !open && handleCloseGuide()}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-3 text-xl font-bold">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-300 via-pink-300 to-fuchsia-300 flex items-center justify-center shadow-lg shadow-pink-300/30">
                <Crown className="w-5 h-5 text-white" />
              </div>
              How to Host
            </DialogTitle>
            <DialogDescription className="text-base">
              Four steps to an amazing game night
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {GUIDE_STEPS.map((step, index) => (
              <motion.div 
                key={index} 
                className="flex flex-wrap items-start gap-4 p-4 rounded-2xl bg-muted/40 border border-border/30"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-100 via-pink-100 to-fuchsia-100 border border-pink-200/50 flex items-center justify-center shrink-0">
                  <step.icon className="w-5 h-5 text-pink-600" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-pink-600 uppercase tracking-widest">
                      Step {index + 1}
                    </span>
                  </div>
                  <h4 className="font-semibold text-foreground">{step.title}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="outline" onClick={handleCloseGuide} className="flex-1" data-testid="button-close-guide">
              Got It
            </Button>
            <Button 
              className="flex-1 gap-2 bg-gradient-to-r from-rose-400 via-pink-400 to-fuchsia-400 text-white shadow-lg shadow-pink-300/30" 
              onClick={handleCloseGuide} 
              data-testid="button-start-hosting"
            >
              Let's Go <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
