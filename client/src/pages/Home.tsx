import { useQuery } from "@tanstack/react-query";
import { Loader2, Settings, Grid3X3, LogOut, Sun, Moon, ArrowRight, Zap, Skull } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AvocadoIcon } from "@/components/AvocadoIcon";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/use-auth";
import LandingPage from "./LandingPage";
import type { Board } from "@shared/schema";
import { motion } from "framer-motion";
import { useState } from "react";

type GameMode = 'grid' | 'blitz' | 'liar' | null;

export default function Home() {
  const { user, isLoading: isAuthLoading, isAuthenticated, logout, isLoggingOut } = useAuth();
  const { colorMode, toggleColorMode } = useTheme();
  const [, setLocation] = useLocation();
  const [selectedMode, setSelectedMode] = useState<GameMode>(null);

  const { data: boards = [], isLoading: isLoadingBoards } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
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

  const handleSelectBoard = (board: Board) => {
    setLocation(`/board/${board.id}`);
  };

  const gameModes = [
    {
      id: 'grid' as GameMode,
      name: 'Grid of Grudges',
      description: 'Classic Jeopardy-style board game',
      icon: Grid3X3,
      gradient: 'from-violet-500 to-purple-600',
      available: true,
    },
    {
      id: 'blitz' as GameMode,
      name: 'Brain Rot Blitz',
      description: 'Rapid-fire trivia with multipliers',
      icon: Zap,
      gradient: 'from-amber-500 to-orange-600',
      available: false,
    },
    {
      id: 'liar' as GameMode,
      name: "Liar's Lobby",
      description: 'Bluff your way to victory',
      icon: Skull,
      gradient: 'from-rose-500 to-pink-600',
      available: false,
    },
  ];

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

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {user && (
            <motion.p 
              className="text-white/60 text-sm text-center mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Welcome, {user.firstName || user.email || 'Host'}!
            </motion.p>
          )}

          {selectedMode === null ? (
            <>
              <motion.div 
                className="text-center mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-3xl md:text-4xl font-black text-white mb-2 text-glow">Choose Your Game</h2>
                <p className="text-white/50">Select a game mode to play</p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {gameModes.map((mode, idx) => {
                  const Icon = mode.icon;
                  return (
                    <motion.div
                      key={mode.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Card 
                        className={`relative overflow-hidden border-2 transition-all duration-300 ${
                          mode.available 
                            ? 'cursor-pointer hover:scale-105 hover:border-primary/50 bg-card/60 border-primary/20' 
                            : 'opacity-60 cursor-not-allowed bg-card/30 border-white/10'
                        }`}
                        onClick={() => mode.available && setSelectedMode(mode.id)}
                        data-testid={`tile-${mode.id}`}
                      >
                        <CardContent className="p-6 text-center">
                          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center mx-auto mb-4`}>
                            <Icon className="w-8 h-8 text-white" />
                          </div>
                          <h3 className={`text-xl font-bold mb-2 ${mode.available ? 'text-white' : 'text-white/60'}`}>
                            {mode.name}
                          </h3>
                          <p className={`text-sm ${mode.available ? 'text-white/60' : 'text-white/40'}`}>
                            {mode.description}
                          </p>
                          {!mode.available && (
                            <Badge variant="secondary" className="mt-3">
                              Coming Soon
                            </Badge>
                          )}
                          {mode.available && (
                            <Button className="mt-4 gap-2" size="sm" data-testid={`button-play-${mode.id}`}>
                              Play Now
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </>
          ) : selectedMode === 'grid' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-lg mx-auto"
            >
              <Button 
                variant="ghost" 
                className="mb-6 text-white/60 hover:text-white gap-2"
                onClick={() => setSelectedMode(null)}
                data-testid="button-back-to-modes"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to Game Modes
              </Button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                  <Grid3X3 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2 text-glow">Grid of Grudges</h2>
                <p className="text-white/60">Select a board to play</p>
              </div>

              {isLoadingBoards ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : boards.length === 0 ? (
                <motion.div 
                  className="text-center py-12 px-8 bg-card/60 rounded-2xl border border-white/10"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <AvocadoIcon className="w-16 h-16 opacity-30 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No boards yet</h3>
                  <p className="text-white/50 mb-6">Create a board in the admin panel</p>
                  <Link href="/admin">
                    <Button className="gap-2" data-testid="button-create-board">
                      <Settings className="w-4 h-4" />
                      Go to Admin Panel
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {boards.map((board, idx) => (
                    <motion.button
                      key={board.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ x: 8 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectBoard(board)}
                      className="w-full flex items-center gap-4 px-6 py-4 bg-card/60 backdrop-blur-sm border border-primary/20 rounded-xl text-left transition-all hover:bg-card/80 hover:border-primary/50 group"
                      data-testid={`button-board-${board.id}`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Grid3X3 className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                          {board.name}
                        </h3>
                        {board.description && (
                          <p className="text-white/50 text-sm truncate">{board.description}</p>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-primary transition-colors" />
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
