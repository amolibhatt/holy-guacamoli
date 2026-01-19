import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, ArrowRight, LogIn, Sparkles, PartyPopper, Zap } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useLocation, Link } from "wouter";
import type { Board } from "@shared/schema";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface BoardWithStatus extends Board {
  categoryCount: number;
  totalQuestions: number;
  isComplete: boolean;
  isPlayable: boolean;
}

export default function HostGridOfGrudges() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const { data: boards = [], isLoading } = useQuery<BoardWithStatus[]>({
    queryKey: ['/api/buzzkill/boards'],
    enabled: isAuthenticated,
  });

  const playableBoards = boards.filter(b => b.isPlayable);

  return (
    <div className="min-h-screen gradient-game grid-bg flex flex-col">
      <AppHeader 
        title="Buzzkill"
        subtitle="Choose your challenge"
        backHref="/"
        showAdminButton
        adminHref="/admin?game=buzzkill"
      />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <LogIn className="w-12 h-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">Sign in to play</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Log in to access game boards.
              </p>
              <Link href="/login">
                <Button size="lg" data-testid="button-login">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </Link>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : playableBoards.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 px-1">
                <Grid3X3 className="w-5 h-5 text-muted-foreground" />
                Game Boards
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {playableBoards.map((board, index) => {
                  const gradients = [
                    { bg: 'from-violet-500/20 via-purple-500/15 to-fuchsia-500/20', border: 'border-violet-500/30 hover:border-violet-400/60', accent: 'from-violet-500/15', text: 'group-hover:text-violet-600' },
                    { bg: 'from-fuchsia-500/20 via-pink-500/15 to-rose-500/20', border: 'border-fuchsia-500/30 hover:border-fuchsia-400/60', accent: 'from-fuchsia-500/15', text: 'group-hover:text-fuchsia-600' },
                    { bg: 'from-amber-500/20 via-orange-500/15 to-yellow-500/20', border: 'border-amber-500/30 hover:border-amber-400/60', accent: 'from-amber-500/15', text: 'group-hover:text-amber-600' },
                    { bg: 'from-teal-500/20 via-cyan-500/15 to-sky-500/20', border: 'border-teal-500/30 hover:border-teal-400/60', accent: 'from-teal-500/15', text: 'group-hover:text-teal-600' },
                    { bg: 'from-sky-500/20 via-blue-500/15 to-indigo-500/20', border: 'border-sky-500/30 hover:border-sky-400/60', accent: 'from-sky-500/15', text: 'group-hover:text-sky-600' },
                  ];
                  const style = gradients[index % gradients.length];
                  return (
                    <motion.button
                      key={board.id}
                      onClick={() => setLocation(`/board/${board.id}`)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex flex-col p-4 bg-gradient-to-br ${style.bg} rounded-xl text-left transition-all border ${style.border} group overflow-hidden cursor-pointer hover:shadow-lg`}
                      data-testid={`button-board-${board.id}`}
                    >
                      <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${style.accent} to-transparent rounded-bl-full`} />
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className={`text-lg font-bold text-foreground ${style.text} transition-colors`}>
                          {board.name}
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                      </div>
                      
                      <div className="text-xs text-muted-foreground relative z-10">
                        {board.description || `${board.categoryCount} categories`}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ) : (
            <motion.div 
              className="flex flex-col items-center justify-center py-16 space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <PartyPopper className="w-16 h-16 text-primary" />
                </motion.div>
                <motion.div
                  className="absolute -top-2 -right-2"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                </motion.div>
                <motion.div
                  className="absolute -bottom-1 -left-2"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
                >
                  <Zap className="w-5 h-5 text-orange-500" />
                </motion.div>
              </div>
              
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Ready to quiz?
                </h2>
                <p className="text-muted-foreground text-center max-w-sm">
                  No boards yet! Create one in Admin to start the fun.
                </p>
              </div>
              
              <Link href="/admin">
                <Button size="lg" className="gap-2 group">
                  <Sparkles className="w-4 h-4" />
                  Create Your First Board
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </motion.div>
          )}
        </div>
      </main>
      
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Made with love for Amoli's Birthday
        </p>
      </footer>
    </div>
  );
}
