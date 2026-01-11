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
              >Dip into the facts!</motion.span>
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <Button 
                  variant="ghost" 
                  className="text-white/60 hover:text-white gap-2"
                  onClick={() => setSelectedMode(null)}
                  data-testid="button-back-to-modes"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Back
                </Button>
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="gap-2 border-white/20 text-white/60 hover:text-white hover:bg-white/10">
                    <Settings className="w-4 h-4" />
                    Manage Boards
                  </Button>
                </Link>
              </div>

              <motion.div 
                className="text-center mb-10"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <motion.div 
                  className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-purple-500/30"
                  animate={{ 
                    boxShadow: ['0 25px 50px -12px rgba(168, 85, 247, 0.3)', '0 25px 50px -12px rgba(168, 85, 247, 0.5)', '0 25px 50px -12px rgba(168, 85, 247, 0.3)']
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Grid3X3 className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-3 text-glow">Grid of Grudges</h2>
                <p className="text-white/50 text-lg">Choose your battlefield</p>
              </motion.div>

              {isLoadingBoards ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
              ) : boards.length === 0 ? (
                <motion.div 
                  className="text-center py-16 px-8 bg-gradient-to-b from-card/80 to-card/40 rounded-3xl border border-white/10 backdrop-blur-xl"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                    <AvocadoIcon className="w-14 h-14 opacity-40" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">No boards yet</h3>
                  <p className="text-white/50 mb-8 max-w-sm mx-auto">Create your first game board in the admin panel to get started</p>
                  <Link href="/admin">
                    <Button size="lg" className="gap-2" data-testid="button-create-board">
                      <Settings className="w-5 h-5" />
                      Create Your First Board
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {boards.map((board, idx) => (
                    <motion.button
                      key={board.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectBoard(board)}
                      className="relative overflow-hidden flex flex-col items-center gap-4 p-8 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-primary/20 rounded-2xl text-center transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 group"
                      data-testid={`button-board-${board.id}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <motion.div 
                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30"
                        whileHover={{ rotate: 5 }}
                      >
                        <Grid3X3 className="w-8 h-8 text-white" />
                      </motion.div>
                      <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-white group-hover:text-primary transition-colors mb-1">
                          {board.name}
                        </h3>
                        {board.description ? (
                          <p className="text-white/50 text-sm">{board.description}</p>
                        ) : (
                          <p className="text-white/30 text-sm">{(board.pointValues as number[])?.length || 5} point levels</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-primary/80 group-hover:text-primary transition-colors mt-2">
                        <span className="text-sm font-medium">Play Now</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
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
