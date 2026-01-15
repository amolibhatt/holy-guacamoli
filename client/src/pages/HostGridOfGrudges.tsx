import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, ArrowRight, Users, Shuffle, Sparkles, FolderPlus } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
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

const BOARD_COLORS: Record<string, { gradient: string; border: string; text: string }> = {
  // Hex codes
  "#ef4444": { gradient: "from-red-500/20 to-red-600/10", border: "border-red-500/30 hover:border-red-500/60", text: "text-red-400" },
  "#f97316": { gradient: "from-orange-500/20 to-orange-600/10", border: "border-orange-500/30 hover:border-orange-500/60", text: "text-orange-400" },
  "#eab308": { gradient: "from-yellow-500/20 to-yellow-600/10", border: "border-yellow-500/30 hover:border-yellow-500/60", text: "text-yellow-400" },
  "#22c55e": { gradient: "from-green-500/20 to-green-600/10", border: "border-green-500/30 hover:border-green-500/60", text: "text-green-400" },
  "#06b6d4": { gradient: "from-cyan-500/20 to-cyan-600/10", border: "border-cyan-500/30 hover:border-cyan-500/60", text: "text-cyan-400" },
  "#3b82f6": { gradient: "from-blue-500/20 to-blue-600/10", border: "border-blue-500/30 hover:border-blue-500/60", text: "text-blue-400" },
  "#8b5cf6": { gradient: "from-violet-500/20 to-violet-600/10", border: "border-violet-500/30 hover:border-violet-500/60", text: "text-violet-400" },
  "#ec4899": { gradient: "from-pink-500/20 to-pink-600/10", border: "border-pink-500/30 hover:border-pink-500/60", text: "text-pink-400" },
  // Color names
  "red": { gradient: "from-rose-500/20 to-rose-600/10", border: "border-rose-500/30 hover:border-rose-500/60", text: "text-rose-400" },
  "orange": { gradient: "from-amber-500/20 to-amber-600/10", border: "border-amber-500/30 hover:border-amber-500/60", text: "text-amber-400" },
  "yellow": { gradient: "from-yellow-500/20 to-yellow-600/10", border: "border-yellow-500/30 hover:border-yellow-500/60", text: "text-yellow-400" },
  "green": { gradient: "from-emerald-500/20 to-emerald-600/10", border: "border-emerald-500/30 hover:border-emerald-500/60", text: "text-emerald-400" },
  "cyan": { gradient: "from-cyan-500/20 to-cyan-600/10", border: "border-cyan-500/30 hover:border-cyan-500/60", text: "text-cyan-400" },
  "blue": { gradient: "from-blue-500/20 to-blue-600/10", border: "border-blue-500/30 hover:border-blue-500/60", text: "text-blue-400" },
  "violet": { gradient: "from-purple-500/20 to-purple-600/10", border: "border-purple-500/30 hover:border-purple-500/60", text: "text-purple-400" },
  "pink": { gradient: "from-pink-500/20 to-pink-600/10", border: "border-pink-500/30 hover:border-pink-500/60", text: "text-pink-400" },
};

const DEFAULT_COLOR = { gradient: "from-cyan-500/20 to-cyan-600/10", border: "border-cyan-500/30 hover:border-cyan-500/60", text: "text-cyan-400" };

const getBoardColor = (colorCode: string | null) => {
  if (!colorCode) return DEFAULT_COLOR;
  return BOARD_COLORS[colorCode] || DEFAULT_COLOR;
};


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
                  Daily Smash
                </h3>
                <p className="text-muted-foreground relative z-10 max-w-lg">
                  A perfectly balanced mix of 5 categories - one from each group. 
                  Fresh selection every game, never repeating until all are played!
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
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Themed Boards
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {presetBoards.map((board, index) => {
                      const colors = getBoardColor(board.colorCode);
                      return (
                        <motion.button
                          key={board.id}
                          onClick={() => setLocation(`/board/${board.id}`)}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.03, y: -4 }}
                          whileTap={{ scale: 0.97 }}
                          disabled={!board.isPlayable}
                          className={`relative flex flex-col p-5 bg-gradient-to-br ${colors.gradient} rounded-xl text-left transition-all border-2 group overflow-hidden ${
                            board.isPlayable 
                              ? `${colors.border} cursor-pointer hover:shadow-lg` 
                              : "border-border/50 opacity-50 cursor-not-allowed"
                          }`}
                          data-testid={`button-preset-${board.id}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className={`text-2xl font-black ${colors.text}`}>
                              {board.name.split(' ')[0]}
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                          </div>
                          
                          <div className="text-sm font-medium text-foreground mb-1 truncate">
                            {board.name}
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {board.categoryCount} Categories
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {customBoards.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 px-1">
                    <FolderPlus className="w-5 h-5 text-cyan-500" />
                    Custom Boards
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {customBoards.map((board, index) => {
                      const colors = getBoardColor(board.colorCode);
                      return (
                        <motion.button
                          key={board.id}
                          onClick={() => setLocation(`/board/${board.id}`)}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.03, y: -4 }}
                          whileTap={{ scale: 0.97 }}
                          disabled={!board.isPlayable}
                          className={`relative flex flex-col p-5 bg-gradient-to-br ${colors.gradient} rounded-xl text-left transition-all border-2 group overflow-hidden ${
                            board.isPlayable 
                              ? `${colors.border} cursor-pointer hover:shadow-lg` 
                              : "border-border/50 opacity-50 cursor-not-allowed"
                          }`}
                          data-testid={`button-board-${board.id}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className={`text-3xl font-black ${colors.text}`}>
                              {board.name.charAt(0).toUpperCase()}
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                          </div>
                          
                          <div className="text-sm font-medium text-foreground mb-1 truncate">
                            {board.name}
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {board.categoryCount} cats, {board.totalQuestions} Qs
                          </div>
                          
                          {!board.isComplete && board.isPlayable && (
                            <div className="mt-2 text-[10px] text-amber-500">
                              Incomplete board
                            </div>
                          )}
                          {!board.isPlayable && (
                            <div className="mt-2 text-[10px] text-muted-foreground">
                              Add categories first
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}
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
