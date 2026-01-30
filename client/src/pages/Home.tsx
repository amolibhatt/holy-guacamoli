import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, ArrowRight, Sparkles, PartyPopper, Users, ChevronRight, ListOrdered, Crown, Clock, Brain, Play, Heart, Lock } from "lucide-react";
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
  route: string;
  accentColor: string;
  glowColor: string;
  tagline: string;
  rotation: number;
  scale: number;
}> = {
  blitzgrid: {
    icon: Grid3X3,
    gradient: "from-pink-500 via-fuchsia-500 to-rose-500",
    route: "/host/blitzgrid",
    accentColor: "#ec4899",
    glowColor: "rgba(236, 72, 153, 0.5)",
    tagline: "SMASH. BUZZ. WIN.",
    rotation: 0,
    scale: 1,
  },
  sequence_squeeze: {
    icon: ListOrdered,
    gradient: "from-green-400 via-lime-400 to-emerald-400",
    route: "/host/genetic-sort",
    accentColor: "#39FF14",
    glowColor: "rgba(57, 255, 20, 0.5)",
    tagline: "CHAOS → ORDER",
    rotation: 0,
    scale: 1,
  },
  psyop: {
    icon: Brain,
    gradient: "from-violet-600 via-purple-500 to-fuchsia-500",
    route: "/host/psyop",
    accentColor: "#a855f7",
    glowColor: "rgba(168, 85, 247, 0.5)",
    tagline: "LIE. DETECT. DESTROY.",
    rotation: 0,
    scale: 1,
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
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden overflow-y-auto relative">
      {/* Deep space mesh gradient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[150%] h-[150%] -top-1/4 -left-1/4"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 20% 40%, rgba(88, 28, 135, 0.4) 0%, transparent 50%),
              radial-gradient(ellipse 60% 80% at 80% 20%, rgba(30, 58, 138, 0.35) 0%, transparent 50%),
              radial-gradient(ellipse 50% 60% at 40% 80%, rgba(91, 33, 182, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse 70% 40% at 70% 70%, rgba(29, 78, 216, 0.25) 0%, transparent 50%),
              radial-gradient(ellipse 40% 50% at 10% 60%, rgba(124, 58, 237, 0.2) 0%, transparent 50%)
            `,
          }}
          animate={{
            x: ["0%", "3%", "0%", "-2%", "0%"],
            y: ["0%", "-2%", "1%", "2%", "0%"],
            rotate: [0, 1, 0, -1, 0],
          }}
          transition={{
            duration: 120,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute w-[120%] h-[120%] -top-[10%] -left-[10%]"
          style={{
            background: `
              radial-gradient(ellipse 50% 70% at 60% 30%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse 80% 40% at 30% 70%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)
            `,
          }}
          animate={{
            x: ["0%", "-2%", "1%", "2%", "0%"],
            y: ["0%", "2%", "-1%", "-2%", "0%"],
          }}
          transition={{
            duration: 90,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
      
      <AppHeader 
        showAdminButton={true}
        showHelpButton={true}
        showLogout={true}
        onHelpClick={() => setShowGuide(true)}
      />

      <main className="flex-1 px-4 md:px-6 py-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          
          {/* Hero Section - System Login Feel */}
          <motion.section 
            className="text-center mb-14"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* System greeting */}
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <span className="text-white/40 text-sm md:text-base font-mono tracking-widest uppercase">
                // SYSTEM ACTIVE
              </span>
            </motion.div>
            
            {/* Personal greeting - the soul */}
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <span className="text-white/60">What's up, </span>
              <span 
                style={{ 
                  background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 40px rgba(168, 85, 247, 0.5)'
                }}
              >
                {user?.firstName || 'Legend'}
              </span>
            </motion.h1>
            
            {/* Subtitle */}
            <motion.p 
              className="text-base md:text-lg text-white/40 max-w-md mx-auto mb-6 font-mono"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Pick your game. Rally your crew.
            </motion.p>
            
            {/* Big chaos line */}
            <motion.div
              className="relative inline-block"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5, type: "spring" }}
            >
              <h2 
                className="text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight"
                style={{ 
                  fontFamily: 'var(--font-display)',
                  background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #14b8a6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Let the chaos begin.
              </h2>
              {/* Underline glow */}
              <motion.div 
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                initial={{ width: 0 }}
                animate={{ width: "80%" }}
                transition={{ delay: 0.6, duration: 0.8 }}
              />
            </motion.div>
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
                const isComingSoon = (game as any).status === 'coming_soon';
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
                    className="relative group overflow-visible"
                  >
                    {/* BLOOM GLOW - lights up background */}
                    <motion.div
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{
                        background: `radial-gradient(ellipse at center, ${config.glowColor} 0%, transparent 70%)`,
                        filter: 'blur(40px)',
                        transform: 'scale(1.3)',
                      }}
                      animate={{
                        opacity: isHovered && !isComingSoon ? 0.8 : 0.3,
                      }}
                      transition={{ duration: 0.3 }}
                    />
                    
                    <motion.button
                      onClick={() => !isComingSoon && setLocation(config.route)}
                      onMouseEnter={() => setHoveredCard(game.slug)}
                      onMouseLeave={() => setHoveredCard(null)}
                      whileHover={isComingSoon ? {} : { 
                        scale: 1.05, 
                        y: -8,
                        transition: { duration: 0.2, type: "spring", stiffness: 300 } 
                      }}
                      whileTap={isComingSoon ? {} : { scale: 0.98 }}
                      disabled={isComingSoon}
                      className={`relative flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl text-center w-full min-h-[220px] overflow-hidden ${
                        isComingSoon ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      style={{
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: `2px solid ${isHovered && !isComingSoon ? config.accentColor : 'rgba(255,255,255,0.1)'}`,
                        boxShadow: isHovered && !isComingSoon 
                          ? `0 0 40px ${config.accentColor}50, 0 0 80px ${config.accentColor}20, inset 0 0 30px ${config.accentColor}10`
                          : `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`,
                        transition: 'border-color 0.3s, box-shadow 0.3s'
                      }}
                      data-testid={`button-game-${game.slug}`}
                    >
                      {/* Subtle inner glow on edges */}
                      <div 
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{
                          background: `linear-gradient(135deg, ${config.accentColor}08 0%, transparent 50%, ${config.accentColor}05 100%)`
                        }}
                      />
                      
                      {/* Coming Soon Badge */}
                      {isComingSoon && (
                        <div className="absolute top-3 right-3 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-[10px] font-black text-white/60 uppercase tracking-widest flex items-center gap-1.5 border border-white/10">
                          <Clock className="w-3 h-3" />
                          SOON
                        </div>
                      )}
                      
                      {/* Icon with neon glow */}
                      <motion.div 
                        className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center mb-4"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: `2px solid ${config.accentColor}`,
                          boxShadow: isHovered && !isComingSoon
                            ? `0 0 30px ${config.accentColor}80, 0 0 60px ${config.accentColor}40, inset 0 0 20px ${config.accentColor}30`
                            : `0 0 20px ${config.accentColor}40, inset 0 0 15px ${config.accentColor}15`
                        }}
                        animate={isHovered && !isComingSoon ? { 
                          scale: 1.15,
                          y: -4
                        } : { 
                          scale: 1,
                          y: 0
                        }}
                        transition={{ duration: 0.2, type: "spring", stiffness: 400 }}
                      >
                        <Icon 
                          className="w-8 h-8 md:w-10 md:h-10" 
                          style={{ 
                            color: config.accentColor,
                            filter: `drop-shadow(0 0 12px ${config.accentColor})`
                          }}
                          strokeWidth={2.5} 
                        />
                      </motion.div>
                      
                      {/* Game name */}
                      <h3 
                        className="relative text-2xl md:text-3xl font-black tracking-tight uppercase"
                        style={{ 
                          color: config.accentColor,
                          textShadow: `0 0 30px ${config.accentColor}60`
                        }}
                      >
                        {game.displayName}
                      </h3>
                      
                      {/* Tagline */}
                      <p className="relative text-xs md:text-sm font-medium text-white/50 tracking-widest mt-2 uppercase">
                        {config.tagline}
                      </p>
                      
                      {/* Arrow indicator - appears on hover */}
                      <motion.div 
                        className="absolute bottom-4 right-4"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ 
                          opacity: isHovered && !isComingSoon ? 1 : 0,
                          x: isHovered && !isComingSoon ? 0 : -10
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <ArrowRight 
                          className="w-6 h-6" 
                          style={{ color: config.accentColor }}
                          strokeWidth={2.5} 
                        />
                      </motion.div>
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Coming Soon Card */}
          <motion.div 
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div 
              className="relative flex flex-col items-center justify-center p-8 rounded-2xl text-center min-h-[140px] overflow-hidden cursor-not-allowed"
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(255,255,255,0.05)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
              }}
            >
              {/* Lock icon */}
              <div 
                className="relative w-12 h-12 rounded-lg flex items-center justify-center mb-3"
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 0 15px rgba(255,255,255,0.05)'
                }}
              >
                <Lock className="w-6 h-6 text-white/30" strokeWidth={2} />
              </div>
              
              {/* Coming Soon text */}
              <h3 className="text-lg font-bold text-white/30 tracking-widest uppercase">
                More coming soon...
              </h3>
            </div>
          </motion.div>

        </div>
      </main>
      

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
              className="flex-1 gap-2 bg-gradient-to-r from-rose-300 via-pink-300 to-fuchsia-300 text-white shadow-lg shadow-pink-300/30" 
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
