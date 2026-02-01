import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, ListOrdered, Brain, Users, Check, HelpCircle, ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import LandingPage from "./LandingPage";
import type { GameType } from "@shared/schema";
import { motion } from "framer-motion";

const GAME_CONFIG: Record<string, { 
  icon: typeof Grid3X3; 
  route: string;
  accentColor: string;
  tagline: string;
  howItWorks: string;
  players: string;
}> = {
  blitzgrid: {
    icon: Grid3X3,
    route: "/host/blitzgrid",
    accentColor: "#e879f9",
    tagline: "5x5 Trivia Showdown",
    howItWorks: "Pick categories, buzz in to answer, steal points from rivals. First to clear the grid wins!",
    players: "2-8 players",
  },
  sequence_squeeze: {
    icon: ListOrdered,
    route: "/host/sort-circuit",
    accentColor: "#22d3ee",
    tagline: "Race to Rank",
    howItWorks: "Drag items into the correct order before time runs out. Fastest correct answer wins the round!",
    players: "2-20 players",
  },
  psyop: {
    icon: Brain,
    route: "/host/psyop",
    accentColor: "#8b5cf6",
    tagline: "Bluff & Detect",
    howItWorks: "One player lies, everyone else tells the truth. Vote to catch the faker and earn points!",
    players: "3-10 players",
  },
};

function GameplayPreview({ slug, color }: { slug: string; color: string }) {
  if (slug === 'blitzgrid') {
    return (
      <div 
        className="grid grid-cols-3 gap-0.5 mb-3 opacity-60"
        data-testid="preview-blitzgrid"
      >
        {[...Array(9)].map((_, i) => (
          <div 
            key={i} 
            className="w-2.5 h-2.5 rounded-sm"
            style={{ 
              backgroundColor: [0, 4, 8].includes(i) ? color : 'rgba(255,255,255,0.2)',
              boxShadow: [0, 4, 8].includes(i) ? `0 0 4px ${color}` : 'none'
            }}
          />
        ))}
      </div>
    );
  }
  
  if (slug === 'sequence_squeeze') {
    return (
      <div 
        className="flex items-center gap-1 mb-3 opacity-60"
        data-testid="preview-sort-circuit"
      >
        {['C', 'A', 'B'].map((letter, i) => (
          <div 
            key={i}
            className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center"
            style={{ 
              border: `1px solid ${color}`,
              color: color,
              boxShadow: `0 0 4px ${color}40`
            }}
          >
            {letter}
          </div>
        ))}
        <ArrowRight className="w-3 h-3 mx-0.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
        {['A', 'B', 'C'].map((letter, i) => (
          <div 
            key={i}
            className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center"
            style={{ 
              backgroundColor: `${color}30`,
              border: `1px solid ${color}`,
              color: color,
            }}
          >
            {letter}
          </div>
        ))}
      </div>
    );
  }
  
  if (slug === 'psyop') {
    return (
      <div 
        className="flex items-center gap-1 mb-3 opacity-60"
        data-testid="preview-psyop"
      >
        {[true, true, false].map((isCheck, i) => (
          <div 
            key={i}
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ 
              border: `1px solid ${!isCheck ? color : 'rgba(255,255,255,0.3)'}`,
              boxShadow: !isCheck ? `0 0 6px ${color}` : 'none'
            }}
          >
            {isCheck ? (
              <Check className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
            ) : (
              <HelpCircle className="w-2.5 h-2.5" style={{ color }} />
            )}
          </div>
        ))}
      </div>
    );
  }
  
  return null;
}

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
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl lg:text-5xl font-black text-white uppercase tracking-wider mb-3"
              style={{ 
                fontFamily: "'Archivo Black', 'Impact', sans-serif",
                textShadow: '0 0 30px rgba(139, 92, 246, 0.5), 0 0 60px rgba(139, 92, 246, 0.3)',
              }}
              data-testid="text-main-title"
            >
              Let's Play
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-white/50 text-sm lg:text-base"
              data-testid="text-main-subtitle"
            >
              Tap a game and get the party started
            </motion.p>
          </div>

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
                    
                    {/* Gameplay preview hint */}
                    <GameplayPreview slug={game.slug} color={config.accentColor} />
                    
                    {/* Title with Neon Bleed */}
                    <h3 
                      className="text-xl lg:text-2xl mb-1 text-white uppercase tracking-widest relative"
                      style={{ 
                        fontFamily: "'Archivo Black', 'Impact', sans-serif",
                        textShadow: `0 0 10px ${config.accentColor}80, 0 0 20px ${config.accentColor}40, 0 0 30px ${config.accentColor}20`,
                      }}
                      data-testid={`text-game-title-${game.slug}`}
                    >
                      {game.displayName}
                    </h3>
                    
                    {/* Tagline */}
                    <p 
                      className="text-xs uppercase tracking-wider mb-3 font-semibold"
                      style={{ color: config.accentColor }}
                      data-testid={`text-game-tagline-${game.slug}`}
                    >
                      {config.tagline}
                    </p>
                    
                    {/* How it works */}
                    <p 
                      className="text-white/60 text-sm mb-4 leading-relaxed"
                      data-testid={`text-game-description-${game.slug}`}
                    >
                      {config.howItWorks}
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
      </main>
      
      <AppFooter />
    </div>
  );
}
