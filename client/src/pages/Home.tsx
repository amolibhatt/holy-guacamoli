import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Settings, Grid3X3, LogOut, Sun, Moon, ArrowRight, Zap, Trophy, Clock, Lock, Sparkles, PartyPopper, Users, HelpCircle, ChevronRight } from "lucide-react";
import { AvocadoIcon } from "@/components/AvocadoIcon";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/use-auth";
import LandingPage from "./LandingPage";
import type { Board } from "@shared/schema";
import { motion } from "framer-motion";

const GUIDE_STEPS = [
  {
    title: "Create a Board",
    description: "Go to Admin Panel and create a new game board with your chosen point values (10-100)",
    icon: Grid3X3,
  },
  {
    title: "Add Categories",
    description: "Add 3-6 trivia categories to your board (e.g., Movies, History, Sports)",
    icon: Sparkles,
  },
  {
    title: "Write Questions",
    description: "Add 5 questions per category, one for each point value. Include the correct answer.",
    icon: HelpCircle,
  },
  {
    title: "Start the Game",
    description: "Click your board to launch it. Share the QR code for players to join on their phones.",
    icon: Users,
  },
  {
    title: "Host the Show!",
    description: "Click cells to reveal questions. When players buzz in, award or deduct points for answers.",
    icon: Trophy,
  },
];

export default function Home() {
  const { user, isLoading: isAuthLoading, isAuthenticated, logout, isLoggingOut } = useAuth();
  const { colorMode, toggleColorMode } = useTheme();
  const [, setLocation] = useLocation();
  const [showGuide, setShowGuide] = useState(false);

  const { data: boards = [], isLoading: isLoadingBoards } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
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

  return (
    <div className="min-h-screen gradient-game grid-bg flex flex-col">
      <header className="border-b border-primary/20 bg-card/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <AvocadoIcon className="w-6 h-6" />
            </motion.div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Holy GuacAmoli!
              </h1>
              <span className="text-xs text-muted-foreground">Game Host Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-primary" 
              onClick={() => setShowGuide(true)}
              data-testid="button-help"
              title="How to host"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-foreground" 
              onClick={toggleColorMode}
              data-testid="button-color-mode"
            >
              {colorMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" data-testid="button-admin">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-destructive" 
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
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <PartyPopper className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Welcome back, {user?.firstName || 'Host'}!</span>
              <Sparkles className="w-4 h-4 text-primary" />
            </motion.div>
            
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-3">
              Ready to Host?
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Pick a game mode and let the trivia showdown begin
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
                <Grid3X3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Grid of Grudges</h3>
                <p className="text-sm text-muted-foreground">Classic Jeopardy-style gameplay</p>
              </div>
            </div>

            {isLoadingBoards ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            ) : boards.length === 0 ? (
              <motion.div 
                className="text-center py-16 px-8 bg-gradient-to-b from-card to-card/60 rounded-2xl border border-border"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                  <AvocadoIcon className="w-10 h-10 opacity-40" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">No boards yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Create your first game board to start hosting trivia nights
                </p>
                <Link href="/admin">
                  <Button size="lg" className="gap-2" data-testid="button-create-board">
                    <Settings className="w-5 h-5" />
                    Create Your First Board
                  </Button>
                </Link>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {boards.map((board, index) => (
                  <motion.button
                    key={board.id}
                    onClick={() => handleSelectBoard(board)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative flex flex-col p-6 bg-card border border-border rounded-xl text-left transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 group overflow-hidden"
                    data-testid={`button-board-${board.id}`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
                    
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center group-hover:from-primary group-hover:to-secondary group-hover:border-transparent transition-all">
                        <Grid3X3 className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                      {board.name}
                    </h3>
                    
                    {board.description ? (
                      <p className="text-sm text-muted-foreground line-clamp-2">{board.description}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {(board.pointValues as number[])?.length || 5} point levels
                      </p>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>Multiplayer</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm font-medium text-muted-foreground px-3">More Game Modes Coming Soon</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative flex flex-col items-center gap-3 p-6 bg-card/30 border border-dashed border-border rounded-xl text-center">
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Soon
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-amber-500/60" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-foreground/60 mb-1">Speed Round</h4>
                  <p className="text-muted-foreground/60 text-xs">Race against the clock with rapid-fire questions</p>
                </div>
              </div>

              <div className="relative flex flex-col items-center gap-3 p-6 bg-card/30 border border-dashed border-border rounded-xl text-center">
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Soon
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-violet-500/60" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-foreground/60 mb-1">Tournament</h4>
                  <p className="text-muted-foreground/60 text-xs">Bracket-style elimination competition</p>
                </div>
              </div>

              <div className="relative flex flex-col items-center gap-3 p-6 bg-card/30 border border-dashed border-border rounded-xl text-center">
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Soon
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-cyan-500/60" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-foreground/60 mb-1">Daily Challenge</h4>
                  <p className="text-muted-foreground/60 text-xs">New curated questions every day</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Made with love for Amoli's Birthday
        </p>
      </footer>

      <Dialog open={showGuide} onOpenChange={(open) => !open && handleCloseGuide()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AvocadoIcon className="w-6 h-6" />
              How to Host a Game
            </DialogTitle>
            <DialogDescription>
              Follow these simple steps to run your trivia night
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {GUIDE_STEPS.map((step, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <step.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">Step {index + 1}</span>
                  </div>
                  <h4 className="font-semibold text-foreground text-sm">{step.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={handleCloseGuide} className="flex-1">
              Got it!
            </Button>
            <Link href="/admin" className="flex-1">
              <Button className="w-full gap-2" onClick={handleCloseGuide}>
                Go to Admin <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
