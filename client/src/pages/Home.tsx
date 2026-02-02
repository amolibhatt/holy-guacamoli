import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, Brain, Users, Info } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { GameRulesSheet } from "@/components/GameRules";

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
  const [rulesGameSlug, setRulesGameSlug] = useState<string | null>(null);

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

      <main className="max-w-6xl mx-auto px-4 py-6 w-full">
        <div className="w-full">
          
          {/* Header */}
          <div className="text-center mb-8 lg:mb-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 
                className="text-sm lg:text-base font-medium text-white/50 tracking-wide"
                data-testid="text-main-title"
              >
                Pick a game. Rally your crew.
              </h1>
              <p 
                className="text-2xl lg:text-3xl font-black text-white uppercase tracking-widest mt-1"
                style={{ fontFamily: "'Archivo Black', sans-serif" }}
                data-testid="text-subtitle"
              >
                Let the chaos begin
              </p>
            </motion.div>
          </div>

          {/* Game Cards - 3 column grid on large screens */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
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
                      scale: isHovered && !isComingSoon ? 1.05 : 1,
                    }}
                    transition={{ 
                      delay: index * 0.1,
                      scale: { duration: 0.2 }
                    }}
                    onMouseEnter={() => setHoveredCard(game.slug)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => !isComingSoon && setLocation(config.route)}
                    disabled={isComingSoon}
                    className={`relative flex flex-col items-center justify-center text-center p-6 lg:p-8 rounded-xl bg-[#0d0d12] transition-all duration-200 min-h-[200px] lg:min-h-[280px] ${
                      isComingSoon 
                        ? 'opacity-40 cursor-not-allowed' 
                        : 'cursor-pointer'
                    }`}
                    style={{
                      border: isHovered && !isComingSoon 
                        ? `2px solid ${config.accentColor}` 
                        : '1px solid #333',
                      boxShadow: isHovered && !isComingSoon 
                        ? `0 0 20px ${config.accentColor}` 
                        : 'none',
                    }}
                    data-testid={`button-game-${game.slug}`}
                  >
                    {/* Info Button - How to Play */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRulesGameSlug(game.slug);
                      }}
                      className="absolute top-3 left-3 p-1.5 rounded-full bg-white/5 hover:bg-white/15 transition-colors z-10"
                      title="How to Play"
                      data-testid={`button-rules-${game.slug}`}
                    >
                      <Info className="w-4 h-4 text-white/50 hover:text-white/80" />
                    </button>
                    
                    {/* Badge */}
                    {config.badge && (
                      <motion.div 
                        className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        animate={{
                          boxShadow: [
                            `0 0 5px ${config.accentColor}40`,
                            `0 0 15px ${config.accentColor}60`,
                            `0 0 5px ${config.accentColor}40`,
                          ],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        style={{ 
                          backgroundColor: `${config.accentColor}20`,
                          color: config.accentColor,
                          border: `1px solid ${config.accentColor}40`,
                        }}
                        data-testid={`badge-${game.slug}`}
                      >
                        {config.badge}
                      </motion.div>
                    )}
                    
                    {/* Icon */}
                    <motion.div 
                      className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl flex items-center justify-center mb-4 lg:mb-6"
                      animate={{
                        scale: isHovered && !isComingSoon ? [1, 1.1, 1] : 1,
                        boxShadow: isHovered && !isComingSoon 
                          ? `0 0 30px ${config.accentColor}80, 0 0 60px ${config.accentColor}40`
                          : `0 0 15px ${config.accentColor}30`,
                      }}
                      transition={{
                        scale: { duration: 0.4, repeat: isHovered ? Infinity : 0, repeatDelay: 0.8 },
                        boxShadow: { duration: 0.2 },
                      }}
                      style={{
                        background: `linear-gradient(135deg, ${config.accentColor}30 0%, ${config.accentColor}10 100%)`,
                        border: `2px solid ${config.accentColor}`,
                      }}
                    >
                      <Icon 
                        className="w-6 h-6 lg:w-7 lg:h-7" 
                        style={{ color: config.accentColor }}
                      />
                    </motion.div>
                    
                    {/* Title with Neon Bleed */}
                    <h3 
                      className="text-xl lg:text-2xl mb-1 text-white uppercase tracking-widest relative"
                      style={{ 
                        fontFamily: "'Archivo Black', sans-serif",
                        textShadow: `0 0 10px ${config.accentColor}80, 0 0 20px ${config.accentColor}40, 0 0 30px ${config.accentColor}20`,
                      }}
                      data-testid={`text-game-title-${game.slug}`}
                    >
                      {game.displayName}
                    </h3>
                    
                    {/* Tagline */}
                    <p 
                      className="text-xs uppercase tracking-wider mb-2 font-semibold"
                      style={{ color: config.accentColor }}
                      data-testid={`text-game-tagline-${game.slug}`}
                    >
                      {config.tagline}
                    </p>
                    
                    {/* Description */}
                    <p 
                      className="text-white/50 text-xs mb-3 leading-relaxed"
                      data-testid={`text-game-description-${game.slug}`}
                    >
                      {config.howItWorks}
                    </p>
                    
                    {/* Player count */}
                    <div 
                      className="flex items-center gap-1.5 text-white/40 text-[10px]"
                      data-testid={`text-game-players-${game.slug}`}
                    >
                      <Users className="w-2.5 h-2.5" />
                      <span>{config.players}</span>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>

        </div>
      </main>
      
      <GameRulesSheet 
        gameSlug={rulesGameSlug} 
        open={rulesGameSlug !== null} 
        onOpenChange={(open) => !open && setRulesGameSlug(null)} 
      />
      
      <AppFooter />
    </div>
  );
}
