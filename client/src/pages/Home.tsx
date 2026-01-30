import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, ListOrdered, Brain, ArrowRight, Users } from "lucide-react";
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
    description: "5x5 trivia grid. Race to buzz in and answer first.",
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
    <div className="p-6 bg-white/5 border border-white/10 rounded-xl animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-white/10" />
        <div className="flex-1">
          <div className="h-6 w-32 bg-white/10 rounded mb-2" />
          <div className="h-4 w-full bg-white/5 rounded mb-1" />
          <div className="h-4 w-2/3 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

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
      {/* Subtle background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute w-full h-full"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 100% 100%, rgba(34, 211, 238, 0.05) 0%, transparent 50%)
            `,
          }}
        />
      </div>
      
      <AppHeader minimal />

      <main className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          
          {/* Game Cards */}
          <div className="space-y-4">
            {isLoadingGames ? (
              <>
                <GameCardSkeleton />
                <GameCardSkeleton />
                <GameCardSkeleton />
              </>
            ) : gameTypes.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-white/40">No games available yet.</p>
              </div>
            ) : (
              gameTypes.filter(g => GAME_CONFIG[g.slug]).map((game, index) => {
                const config = GAME_CONFIG[game.slug];
                const Icon = config.icon;
                const isComingSoon = (game as any).status === 'coming_soon';

                return (
                  <motion.button
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => !isComingSoon && setLocation(config.route)}
                    disabled={isComingSoon}
                    className={`w-full text-left p-6 rounded-xl bg-card/50 border border-border hover-elevate active-elevate-2 ${
                      isComingSoon 
                        ? 'opacity-40 cursor-not-allowed' 
                        : 'cursor-pointer'
                    }`}
                    data-testid={`button-game-${game.slug}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon with colored border */}
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          border: `2px solid ${config.accentColor}`,
                          boxShadow: `0 0 12px ${config.accentColor}30`,
                        }}
                      >
                        <Icon 
                          className="w-5 h-5" 
                          style={{ color: config.accentColor }}
                        />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <h3 
                            className="text-lg font-bold text-foreground"
                            data-testid={`text-game-title-${game.slug}`}
                          >
                            {game.displayName}
                          </h3>
                          
                          <ArrowRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                        
                        <p 
                          className="text-muted-foreground text-sm mb-2"
                          data-testid={`text-game-description-${game.slug}`}
                        >
                          {config.description}
                        </p>
                        
                        <div 
                          className="flex items-center gap-2 text-muted-foreground/60 text-xs"
                          data-testid={`text-game-players-${game.slug}`}
                        >
                          <Users className="w-3 h-3" />
                          <span>{config.players}</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
