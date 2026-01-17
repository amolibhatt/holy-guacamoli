import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, ArrowRight, Users, Shuffle, FolderPlus } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { BuzzkillLogo } from "@/components/BuzzkillLogo";
import { useLocation } from "wouter";
import type { Board } from "@shared/schema";
import { motion } from "framer-motion";

interface PresetBoard extends Board {
  categoryCount: number;
  totalQuestions: number;
  isComplete: boolean;
  isPlayable: boolean;
}

interface CustomBoard extends Board {
  categoryCount: number;
  totalQuestions: number;
  isComplete: boolean;
  isPlayable: boolean;
}


export default function HostGridOfGrudges() {
  const [, setLocation] = useLocation();

  const { data: presetBoards = [], isLoading: isLoadingPresets } = useQuery<PresetBoard[]>({
    queryKey: ['/api/buzzkill/preset-boards'],
  });

  const { data: customBoards = [], isLoading: isLoadingBoards } = useQuery<CustomBoard[]>({
    queryKey: ['/api/buzzkill/custom-boards'],
  });

  const isLoading = isLoadingPresets || isLoadingBoards;

  const handleDailySmash = () => {
    setLocation('/buzzkill/daily-smash');
  };

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
          <motion.div 
            className="flex justify-center mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <BuzzkillLogo size="xl" showText animate />
          </motion.div>
          
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-8">
              <motion.button
                onClick={handleDailySmash}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.99 }}
                className="w-full relative flex flex-col p-8 bg-gradient-to-br from-primary/20 via-secondary/15 to-accent/20 border-2 border-primary/40 rounded-2xl text-left transition-all hover:border-primary hover:shadow-2xl hover:shadow-primary/20 group overflow-hidden"
                data-testid="button-daily-smash"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-secondary/20 to-transparent rounded-tr-full" />
                
                <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
                    <Shuffle className="w-8 h-8 text-white" />
                  </div>
                  <ArrowRight className="w-6 h-6 text-primary group-hover:translate-x-2 transition-transform" />
                </div>
                
                <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors mb-2 relative z-10">
                  Shuffle Play
                </h3>
                <p className="text-muted-foreground relative z-10 max-w-lg">
                  A balanced mix of 5 categories - one from each group. 
                  Fresh picks every game, never repeating until all are played!
                </p>
                
                <div className="mt-6 flex items-center gap-4 text-sm relative z-10">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/50 border border-border">
                    <Grid3X3 className="w-4 h-4 text-primary" />
                    <span className="font-medium">5 Categories</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/50 border border-border">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="font-medium">Multiplayer</span>
                  </div>
                </div>
              </motion.button>

              {presetBoards.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 px-1">
                    <Grid3X3 className="w-5 h-5 text-muted-foreground" />
                    Starter Packs
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {presetBoards.map((board, index) => {
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
                          disabled={!board.isPlayable}
                          className={`relative flex flex-col p-4 bg-gradient-to-br ${style.bg} rounded-xl text-left transition-all border ${style.border} group overflow-hidden ${
                            board.isPlayable 
                              ? "cursor-pointer hover:shadow-lg" 
                              : "opacity-50 cursor-not-allowed"
                          }`}
                          data-testid={`button-preset-${board.id}`}
                        >
                          <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${style.accent} to-transparent rounded-bl-full`} />
                          <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className={`text-lg font-bold text-foreground ${style.text} transition-colors`}>
                              {board.name}
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                          </div>
                          
                          <div className="text-xs text-muted-foreground relative z-10">
                            {board.description}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 px-1">
                  <FolderPlus className="w-5 h-5 text-cyan-500" />
                  My Boards
                </h2>
                
                {customBoards.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {customBoards.map((board, index) => {
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
                          disabled={!board.isPlayable}
                          className={`relative flex flex-col p-4 bg-gradient-to-br ${style.bg} rounded-xl text-left transition-all border ${style.border} group overflow-hidden ${
                            board.isPlayable 
                              ? "cursor-pointer hover:shadow-lg" 
                              : "opacity-50 cursor-not-allowed"
                          }`}
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
                            {board.categoryCount} categories, {board.totalQuestions} questions
                          </div>
                          
                          {!board.isComplete && board.isPlayable && (
                            <div className="mt-2 text-[10px] text-amber-500 relative z-10">
                              Incomplete board
                            </div>
                          )}
                          {!board.isPlayable && (
                            <div className="mt-2 text-[10px] text-muted-foreground relative z-10">
                              Add categories first
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground px-1">
                    Boards you create in Admin will appear here.
                  </div>
                )}
              </div>
            </div>
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
