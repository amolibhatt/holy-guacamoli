import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, Brain, Users, Clock, Smile, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { GAME_RULES } from "@/components/GameRules";

// Custom ABC icon for Sort Circuit
function AbcListIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <text x="3" y="8" fontSize="6" fontWeight="bold" fill="currentColor" stroke="none">A</text>
      <text x="3" y="15" fontSize="6" fontWeight="bold" fill="currentColor" stroke="none">B</text>
      <text x="3" y="22" fontSize="6" fontWeight="bold" fill="currentColor" stroke="none">C</text>
      <line x1="12" y1="6" x2="21" y2="6" />
      <line x1="12" y1="12" x2="21" y2="12" />
      <line x1="12" y1="18" x2="21" y2="18" />
    </svg>
  );
}
import { AppFooter } from "@/components/AppFooter";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import LandingPage from "./LandingPage";
import type { GameType } from "@shared/schema";
import { motion } from "framer-motion";

const GAME_CONFIG: Record<string, { 
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; 
  route: string;
  accentColor: string;
  tagline: string;
  howItWorks: string;
  players: string;
  badge?: string;
}> = {
  blitzgrid: {
    icon: Grid3X3,
    route: "/host/blitzgrid",
    accentColor: "#e879f9",
    tagline: "Trivia Throwdown",
    howItWorks: "Buzz in. Nail it. Take the points.",
    players: "2-8 players",
    badge: "Fan Favorite",
  },
  sequence_squeeze: {
    icon: AbcListIcon,
    route: "/host/sort-circuit",
    accentColor: "#22d3ee",
    tagline: "Speed Sorting",
    howItWorks: "Put things in order. Fastest wins!",
    players: "2-20 players",
  },
  psyop: {
    icon: Brain,
    route: "/host/psyop",
    accentColor: "#8b5cf6",
    tagline: "Lie & Spy",
    howItWorks: "Make up answers. Fool your friends!",
    players: "3-10 players",
  },
  timewarp: {
    icon: Clock,
    route: "/pastforward/host",
    accentColor: "#f97316",
    tagline: "Era Exploration",
    howItWorks: "Guess era-filtered images. Halfway through, order reverses!",
    players: "2-10 players",
  },
  memenoharm: {
    icon: Smile,
    route: "/memenoharm/host",
    accentColor: "#22c55e",
    tagline: "Meme Matchup",
    howItWorks: "Pick the perfect meme. Vote for the funniest!",
    players: "3-10 players",
    badge: "New",
  },
};

function GameCardSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center p-6 lg:p-8 bg-[#0d0d12] border border-white/10 rounded-xl animate-pulse min-h-[200px] lg:min-h-[280px]">
      <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-white/10 mb-4 lg:mb-6" />
      <div className="h-6 w-28 lg:w-32 bg-white/10 rounded mb-2 lg:mb-3" />
      <div className="h-4 w-36 lg:w-40 bg-white/5 rounded mb-2" />
      <div className="h-3 w-20 bg-white/5 rounded" />
    </div>
  );
}

export default function Home() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [gameCode, setGameCode] = useState("");

  const handleJoinGame = () => {
    if (gameCode.trim()) {
      setLocation(`/play/${gameCode.trim().toUpperCase()}`);
    }
  };

  const { data: gameTypes = [], isLoading: isLoadingGames } = useQuery<(GameType & { status?: string })[]>({
    queryKey: ['/api/game-types/homepage'],
    enabled: isAuthenticated,
  });

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0f]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8 text-white/50" />
        </motion.div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Scanline background pattern */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute w-full h-full opacity-[0.03]"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.5) 2px,
              rgba(255, 255, 255, 0.5) 4px
            )`,
          }}
        />
        {/* Subtle color gradients */}
        <div 
          className="absolute w-full h-full"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% 0%, rgba(188, 19, 254, 0.06) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 100% 100%, rgba(57, 255, 20, 0.04) 0%, transparent 50%)
            `,
          }}
        />
      </div>
      
      <AppHeader minimal />

      <main className="max-w-5xl mx-auto px-4 py-4 lg:py-8 w-full flex-1">
        <div className="w-full">
          
          {/* Hero Section */}
          <motion.div 
            className="relative text-center mb-4 lg:mb-6 py-2 lg:py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Explosive background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  background: 'radial-gradient(circle, rgba(232,121,249,0.15) 0%, rgba(34,211,238,0.1) 40%, transparent 70%)',
                  filter: 'blur(40px)',
                }}
              />
            </div>

            {/* Sparkle particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    left: `${10 + (i * 7) % 80}%`,
                    top: `${15 + (i * 13) % 70}%`,
                    background: i % 3 === 0 ? '#e879f9' : i % 3 === 1 ? '#22d3ee' : '#a3e635',
                    boxShadow: `0 0 ${6 + i % 4}px currentColor`,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                    y: [0, -20, -40],
                  }}
                  transition={{
                    duration: 2 + (i % 3),
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>

            {/* Main title */}
            <motion.h1 
              className="relative text-2xl lg:text-4xl font-black mb-2"
              style={{ fontFamily: "'Archivo Black', sans-serif" }}
              data-testid="text-main-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <span className="bg-gradient-to-r from-fuchsia-400 via-cyan-300 to-lime-300 bg-clip-text text-transparent">
                Pick a game. Rally your crew.
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-white/80 text-lg lg:text-xl font-semibold tracking-wide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              data-testid="text-subtitle"
            >
              Let the chaos begin.
            </motion.p>
          </motion.div>

          {/* Join a Game - Playful */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <div 
              className="relative rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(163,230,53,0.1) 0%, rgba(34,211,238,0.05) 100%)',
                border: '1px solid rgba(163,230,53,0.3)',
                boxShadow: '0 0 20px rgba(163,230,53,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div className="flex items-center gap-3 shrink-0">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Play className="w-5 h-5 text-lime-400" aria-hidden="true" style={{ filter: 'drop-shadow(0 0 6px rgba(163,230,53,0.6))' }} />
                </motion.div>
                <span className="text-white font-semibold">Join a Game</span>
              </div>
              <div className="flex gap-2 flex-1 w-full sm:w-auto">
                <Input
                  placeholder="Enter code"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
                  className="flex-1 h-10 bg-black/40 border-lime-500/30 text-white text-sm placeholder:text-white/40 uppercase tracking-[0.3em] text-center font-mono focus:border-lime-400 focus:ring-lime-400/20"
                  maxLength={4}
                  data-testid="input-game-code"
                />
                <Button 
                  onClick={handleJoinGame}
                  disabled={!gameCode.trim()}
                  className="bg-lime-500 hover:bg-lime-400 text-black font-bold px-6 shadow-lg shadow-lime-500/20"
                  data-testid="button-join-game"
                >
                  Join
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Host a Game Section */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-1">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Users className="w-5 h-5 text-fuchsia-400" aria-hidden="true" style={{ filter: 'drop-shadow(0 0 6px rgba(232,121,249,0.6))' }} />
              </motion.div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">Host a Game</h2>
            </div>
            <p className="text-white/50 text-sm ml-8">Pick one and get a code to share with players</p>
          </motion.div>

          {/* Game Cards - 2 column grid on medium+ screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {isLoadingGames ? (
              <>
                <GameCardSkeleton />
                <GameCardSkeleton />
                <GameCardSkeleton />
              </>
            ) : gameTypes.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <p className="text-white/40">No games available yet.</p>
              </div>
            ) : (
              gameTypes.filter(g => GAME_CONFIG[g.slug]).map((game, index) => {
                const config = GAME_CONFIG[game.slug];
                const Icon = config.icon;
                const isComingSoon = game.status === 'coming_soon';
                const isHovered = hoveredCard === game.slug;

                return (
                  <motion.button
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                    }}
                    whileHover={{ scale: isComingSoon ? 1 : 1.02, y: isComingSoon ? 0 : -4 }}
                    whileTap={{ scale: isComingSoon ? 1 : 0.98 }}
                    transition={{ 
                      delay: index * 0.08,
                      type: "spring",
                      stiffness: 400,
                      damping: 25
                    }}
                    onMouseEnter={() => setHoveredCard(game.slug)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => !isComingSoon && setLocation(config.route)}
                    disabled={isComingSoon}
                    className={`group relative flex flex-col items-start text-left p-5 lg:p-6 rounded-2xl transition-all duration-300 min-h-[180px] ${
                      isComingSoon 
                        ? 'opacity-40 cursor-not-allowed' 
                        : 'cursor-pointer'
                    }`}
                    style={{
                      background: isHovered && !isComingSoon 
                        ? `linear-gradient(135deg, ${config.accentColor}15 0%, ${config.accentColor}05 100%)`
                        : 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                      border: isHovered && !isComingSoon 
                        ? `1px solid ${config.accentColor}40` 
                        : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isHovered && !isComingSoon 
                        ? `0 8px 32px ${config.accentColor}20, 0 0 0 1px ${config.accentColor}20 inset` 
                        : '0 4px 16px rgba(0,0,0,0.2)',
                    }}
                    data-testid={`button-game-${game.slug}`}
                  >
                    {/* Badge */}
                    {config.badge && (
                      <div 
                        className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{ 
                          backgroundColor: `${config.accentColor}20`,
                          color: config.accentColor,
                          border: `1px solid ${config.accentColor}30`,
                        }}
                        data-testid={`badge-${game.slug}`}
                      >
                        {config.badge}
                      </div>
                    )}
                    
                    {/* Header with Icon and Title */}
                    <div className="flex items-start gap-4 mb-3 w-full">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
                        style={{
                          background: `linear-gradient(135deg, ${config.accentColor}25 0%, ${config.accentColor}10 100%)`,
                          boxShadow: isHovered ? `0 0 20px ${config.accentColor}30` : 'none',
                        }}
                      >
                        <Icon 
                          className="w-6 h-6" 
                          style={{ color: config.accentColor }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 
                          className="text-lg lg:text-xl font-bold text-white mb-0.5"
                          data-testid={`text-game-title-${game.slug}`}
                        >
                          {game.displayName}
                        </h3>
                        <p 
                          className="text-xs font-medium"
                          style={{ color: config.accentColor }}
                          data-testid={`text-game-tagline-${game.slug}`}
                        >
                          {config.tagline}
                        </p>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <p 
                      className="text-white/50 text-sm leading-relaxed mb-4 flex-1"
                      data-testid={`text-game-description-${game.slug}`}
                    >
                      {GAME_RULES[game.slug]?.overview || config.howItWorks}
                    </p>
                    
                    {/* Footer: Player count & Duration */}
                    <div 
                      className="flex items-center gap-4 text-white/40 text-xs mt-auto"
                      data-testid={`text-game-players-${game.slug}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>{GAME_RULES[game.slug]?.players || config.players}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{GAME_RULES[game.slug]?.duration || "15-30 min"}</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>

        </div>
      </main>
      
      <AppFooter />
    </div>
  );
}
