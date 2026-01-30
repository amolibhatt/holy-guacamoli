import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, ListOrdered, Brain, Users } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import LandingPage from "./LandingPage";
import type { GameType } from "@shared/schema";
import { motion } from "framer-motion";

const GAME_CONFIG: Record<string, { 
  icon: typeof Grid3X3; 
  route: string;
  accentColor: string;
  description: string;
  players: string;
}> = {
  blitzgrid: {
    icon: Grid3X3,
    route: "/host/blitzgrid",
    accentColor: "#e879f9",
    description: "Think fast. Buzz faster. Dominate the grid.",
    players: "2-8 players",
  },
  sequence_squeeze: {
    icon: ListOrdered,
    route: "/host/genetic-sort",
    accentColor: "#22d3ee",
    description: "Put items in the right order before time runs out.",
    players: "2-20 players",
  },
  psyop: {
    icon: Brain,
    route: "/host/psyop",
    accentColor: "#8b5cf6",
    description: "Spot the liar hiding among your friends.",
    players: "3-10 players",
  },
};

function GameCardSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center p-6 lg:p-8 bg-[#0d0d12] border border-[#333] rounded-xl animate-pulse min-h-[200px] lg:min-h-[280px]">
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

  const { data: gameTypes = [], isLoading: isLoadingGames } = useQuery<(GameType & { status?: string })[]>({
    queryKey: ['/api/game-types/homepage'],
    queryFn: async () => {
      const res = await fetch('/api/game-types/homepage');
      return res.json();
    },
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

      <main className="flex-1 px-4 lg:px-6 py-8 lg:py-12 flex items-center justify-center">
        <div className="w-full max-w-5xl mx-auto">
          
          {/* Container frame for game cards */}
          <div className="p-4 lg:p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
            {/* Game Cards - 3 column grid on large screens */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
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
                const isComingSoon = (game as any).status === 'coming_soon';
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
                    className={`flex flex-col items-center justify-center text-center p-6 lg:p-8 rounded-xl bg-[#0d0d12] transition-all duration-200 min-h-[200px] lg:min-h-[280px] ${
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
                    {/* Icon */}
                    <div 
                      className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl flex items-center justify-center mb-4 lg:mb-6 transition-all duration-200"
                      style={{
                        border: `2px solid ${config.accentColor}`,
                        boxShadow: isHovered ? `0 0 25px ${config.accentColor}60` : `0 0 15px ${config.accentColor}30`,
                      }}
                    >
                      <Icon 
                        className="w-6 h-6 lg:w-7 lg:h-7" 
                        style={{ color: config.accentColor }}
                      />
                    </div>
                    
                    {/* Title */}
                    <h3 
                      className="text-xl lg:text-2xl mb-2 text-white uppercase tracking-wide"
                      style={{ fontFamily: "'Archivo Black', 'Impact', sans-serif" }}
                      data-testid={`text-game-title-${game.slug}`}
                    >
                      {game.displayName}
                    </h3>
                    
                    {/* Description */}
                    <p 
                      className="text-white/70 text-sm mb-4 leading-relaxed"
                      data-testid={`text-game-description-${game.slug}`}
                    >
                      {config.description}
                    </p>
                    
                    {/* Player count */}
                    <div 
                      className="flex items-center gap-2 text-white/50 text-xs"
                      data-testid={`text-game-players-${game.slug}`}
                    >
                      <Users className="w-3 h-3" />
                      <span>{config.players}</span>
                    </div>
                  </motion.button>
                );
              })
            )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
