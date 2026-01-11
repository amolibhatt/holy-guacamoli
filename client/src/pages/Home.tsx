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
        <p className="text-muted-foreground mt-4">Loading...</p>
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
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/80 to-secondary/80 border border-white/10">
              <AvocadoIcon className="w-7 h-7" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Holy GuacAmoli!
              </h1>
              <span className="text-xs text-muted-foreground">Dip into the facts!</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              className="text-muted-foreground hover:text-foreground hover:bg-foreground/10" 
              data-testid="button-logout"
              onClick={() => logout()}
              disabled={isLoggingOut}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {user && (
            <motion.p 
              className="text-muted-foreground text-sm text-center mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Welcome, {user.firstName || user.email || 'Host'}!
            </motion.p>
          )}

          {selectedMode === null ? (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-2">Choose Your Game</h2>
                <p className="text-muted-foreground">Select a game mode to play</p>
              </div>

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
                          <h3 className={`text-xl font-bold mb-2 ${mode.available ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {mode.name}
                          </h3>
                          <p className={`text-sm ${mode.available ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
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
                  className="text-muted-foreground hover:text-foreground gap-2"
                  onClick={() => setSelectedMode(null)}
                  data-testid="button-back-to-modes"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Back
                </Button>
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="gap-2 border-border text-muted-foreground hover:text-foreground hover:bg-foreground/10">
                    <Settings className="w-4 h-4" />
                    Manage Boards
                  </Button>
                </Link>
              </div>

              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
                  <Grid3X3 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-2">Grid of Grudges</h2>
                <p className="text-muted-foreground">Choose your battlefield</p>
              </div>

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
                  <h3 className="text-2xl font-bold text-foreground mb-3">No boards yet</h3>
                  <p className="text-muted-foreground mb-8 max-w-sm mx-auto">Create your first game board in the admin panel to get started</p>
                  <Link href="/admin">
                    <Button size="lg" className="gap-2" data-testid="button-create-board">
                      <Settings className="w-5 h-5" />
                      Create Your First Board
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {boards.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => handleSelectBoard(board)}
                      className="flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-xl text-center transition-all hover:border-primary/50 hover:bg-card/80 group"
                      data-testid={`button-board-${board.id}`}
                    >
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <Grid3X3 className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                          {board.name}
                        </h3>
                        {board.description ? (
                          <p className="text-muted-foreground text-sm">{board.description}</p>
                        ) : (
                          <p className="text-muted-foreground/60 text-sm">{(board.pointValues as number[])?.length || 5} point levels</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-primary mt-1">
                        <span className="text-sm font-medium">Play</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
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
