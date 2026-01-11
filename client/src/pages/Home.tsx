import { useQuery } from "@tanstack/react-query";
import { Loader2, Settings, ArrowLeft, Grid3X3, LogOut, Sun, Moon, Zap, Skull, ArrowRight } from "lucide-react";
import { AvocadoIcon } from "@/components/AvocadoIcon";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/use-auth";
import LandingPage from "./LandingPage";
import type { Game, GameMode } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

interface GameModeOption {
  mode: GameMode;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Grid3X3;
  color: string;
  route: (gameId: number) => string;
}

const GAME_MODES: GameModeOption[] = [
  {
    mode: 'board',
    title: 'Grid of Grudges',
    subtitle: 'Classic Jeopardy',
    description: 'Pick categories and point values from the board. Buzz in to answer!',
    icon: Grid3X3,
    color: 'from-violet-500 to-purple-600',
    route: (id) => `/grudges/${id}`,
  },
  {
    mode: 'submission',
    title: "The Liar's Lobby",
    subtitle: 'Bluff & Vote',
    description: 'Submit fake answers and try to fool others. Vote for the truth!',
    icon: Skull,
    color: 'from-pink-500 to-rose-600',
    route: (id) => `/liars/${id}`,
  },
  {
    mode: 'rapid_fire',
    title: 'Brain Rot Blitz',
    subtitle: 'Speed Round',
    description: 'Answer as fast as you can! Build streaks for multiplier bonuses.',
    icon: Zap,
    color: 'from-amber-500 to-orange-600',
    route: (id) => `/blitz/${id}`,
  },
];

export default function Home() {
  const { user, isLoading: isAuthLoading, isAuthenticated, logout, isLoggingOut } = useAuth();
  const { colorMode, toggleColorMode } = useTheme();
  const [, setLocation] = useLocation();
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

  const { data: games = [], isLoading: isLoadingGames } = useQuery<Game[]>({
    queryKey: ['/api/games'],
    enabled: isAuthenticated,
  });

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-game">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-white/60 mt-4">Loading...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  const filteredGames = selectedMode 
    ? games.filter(g => g.mode === selectedMode)
    : [];

  const selectedModeConfig = GAME_MODES.find(m => m.mode === selectedMode);

  const handleSelectGame = (game: Game) => {
    const modeConfig = GAME_MODES.find(m => m.mode === game.mode);
    if (modeConfig) {
      setLocation(modeConfig.route(game.id));
    }
  };

  return (
    <div className="min-h-screen gradient-game grid-bg flex flex-col">
      <header className="border-b border-primary/20 bg-card/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {selectedMode && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedMode(null)}
                className="text-primary/80 hover:text-primary hover:bg-primary/10"
                data-testid="button-back-modes"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="relative">
              <motion.div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-black border border-white/20"
                animate={{ 
                  rotate: [0, -5, 5, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <AvocadoIcon className="w-8 h-8 drop-shadow-lg" />
                </motion.div>
              </motion.div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tight leading-tight text-white text-glow">
                Holy GuacAmoli!
              </h1>
              <motion.span 
                className="text-[10px] font-bold text-white/50 tracking-[0.2em] uppercase"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Amoli's Birthday Trivia
              </motion.span>
            </div>
          </motion.div>
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary/80 hover:text-primary hover:bg-primary/10" 
              onClick={toggleColorMode}
              data-testid="button-color-mode"
            >
              {colorMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="text-primary/80 hover:text-primary hover:bg-primary/10" data-testid="button-admin">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white/60 hover:text-white hover:bg-white/10" 
              data-testid="button-logout"
              onClick={() => logout()}
              disabled={isLoggingOut}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {!selectedMode ? (
            <motion.div
              key="modes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-4xl"
            >
              <div className="text-center mb-10">
                {user && (
                  <p className="text-white/60 text-sm mb-2">
                    Welcome, {user.firstName || user.email || 'Host'}!
                  </p>
                )}
                <motion.h2 
                  className="text-4xl md:text-5xl font-black text-white mb-3 text-glow"
                >
                  Choose Your Game
                </motion.h2>
                <p className="text-white/60 text-lg">Select a game mode to get started</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {GAME_MODES.map((mode, idx) => {
                  const Icon = mode.icon;
                  const modeGames = games.filter(g => g.mode === mode.mode);
                  return (
                    <motion.button
                      key={mode.mode}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      whileHover={{ scale: 1.03, y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedMode(mode.mode)}
                      className="relative group text-left"
                      data-testid={`button-mode-${mode.mode}`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity`} />
                      <div className="relative bg-card/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full flex flex-col group-hover:border-white/30 transition-colors">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-4`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">{mode.title}</h3>
                        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">{mode.subtitle}</p>
                        <p className="text-white/60 text-sm flex-1">{mode.description}</p>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                          <span className="text-xs text-white/40">{modeGames.length} game{modeGames.length !== 1 ? 's' : ''}</span>
                          <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white/80 transition-colors" />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="games"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <div className="text-center mb-10">
                {selectedModeConfig && (
                  <>
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedModeConfig.color} flex items-center justify-center mx-auto mb-4`}>
                      <selectedModeConfig.icon className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2">{selectedModeConfig.title}</h2>
                    <p className="text-white/60">Select a game to play</p>
                  </>
                )}
              </div>

              {isLoadingGames ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredGames.length === 0 ? (
                <motion.div 
                  className="text-center py-12 px-8 bg-card/60 rounded-2xl border border-white/10"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <AvocadoIcon className="w-16 h-16 opacity-30 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No games yet</h3>
                  <p className="text-white/50 mb-6">Create a {selectedModeConfig?.title} game in the admin panel</p>
                  <Link href="/admin/games">
                    <Button className="gap-2" data-testid="button-create-game">
                      <Settings className="w-4 h-4" />
                      Go to Game Manager
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {filteredGames.map((game, idx) => (
                    <motion.button
                      key={game.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ x: 8 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectGame(game)}
                      className="w-full flex items-center gap-4 px-6 py-4 bg-card/60 backdrop-blur-sm border border-primary/20 rounded-xl text-left transition-all hover:bg-card/80 hover:border-primary/50 group"
                      data-testid={`button-game-${game.id}`}
                    >
                      {selectedModeConfig && (
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selectedModeConfig.color} flex items-center justify-center`}>
                          <selectedModeConfig.icon className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                          {game.name}
                        </h3>
                      </div>
                      <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-primary transition-colors" />
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
