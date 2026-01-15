import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, ArrowRight, Users, Shuffle, Sparkles, FolderPlus } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useLocation } from "wouter";
import type { Category, Board } from "@shared/schema";
import { motion } from "framer-motion";

const SOURCE_GROUPS = ["A", "B", "C", "D", "E"] as const;

interface CategoryGroup {
  groups: Record<string, Category[]>;
  sourceGroups: string[];
}

interface CustomBoard extends Board {
  categoryCount: number;
  totalQuestions: number;
  isReady: boolean;
}


export default function HostGridOfGrudges() {
  const [, setLocation] = useLocation();

  const { data: categoryGroups, isLoading: isLoadingGroups } = useQuery<CategoryGroup>({
    queryKey: ['/api/buzzkill/category-groups'],
  });

  const { data: customBoards = [], isLoading: isLoadingBoards } = useQuery<CustomBoard[]>({
    queryKey: ['/api/buzzkill/custom-boards'],
  });

  const isLoading = isLoadingGroups || isLoadingBoards;

  const handleSelectSourceGroup = (group: string) => {
    setLocation(`/buzzkill/themed/${group}`);
  };

  const handleDailySmash = () => {
    setLocation('/buzzkill/daily-smash');
  };

  const getGroupCount = (group: string) => {
    return categoryGroups?.groups[group]?.length || 0;
  };

  const getGroupCategories = (group: string) => {
    return categoryGroups?.groups[group] || [];
  };

  const groupColors: Record<string, string> = {
    A: "from-rose-500/20 to-rose-600/10 border-rose-500/30 hover:border-rose-500/60",
    B: "from-amber-500/20 to-amber-600/10 border-amber-500/30 hover:border-amber-500/60",
    C: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:border-emerald-500/60",
    D: "from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-500/60",
    E: "from-purple-500/20 to-purple-600/10 border-purple-500/30 hover:border-purple-500/60",
  };

  const groupTextColors: Record<string, string> = {
    A: "text-rose-400",
    B: "text-amber-400",
    C: "text-emerald-400",
    D: "text-blue-400",
    E: "text-purple-400",
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

              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 px-1">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Themed Groups
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {SOURCE_GROUPS.map((group, index) => {
                    const count = getGroupCount(group);
                    const categories = getGroupCategories(group);
                    
                    return (
                      <motion.button
                        key={group}
                        onClick={() => handleSelectSourceGroup(group)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.03, y: -4 }}
                        whileTap={{ scale: 0.97 }}
                        disabled={count === 0}
                        className={`relative flex flex-col p-5 bg-gradient-to-br ${groupColors[group]} rounded-xl text-left transition-all border-2 group overflow-hidden ${count === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-lg"}`}
                        data-testid={`button-group-${group}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className={`text-3xl font-black ${groupTextColors[group]}`}>
                            {group}
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                        </div>
                        
                        <div className="text-sm font-medium text-foreground mb-1">
                          {count} {count === 1 ? "Category" : "Categories"}
                        </div>
                        
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {categories.slice(0, 2).map(c => c.name).join(", ")}
                          {categories.length > 2 && "..."}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {customBoards.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 px-1">
                    <FolderPlus className="w-5 h-5 text-primary" />
                    Custom Boards
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {customBoards.map((board, index) => (
                      <motion.button
                        key={board.id}
                        onClick={() => setLocation(`/board/${board.id}`)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={!board.isReady}
                        className={`relative flex flex-col p-5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl text-left transition-all border-2 group overflow-hidden ${
                          board.isReady 
                            ? "border-primary/30 hover:border-primary/60 cursor-pointer hover:shadow-lg" 
                            : "border-border/50 opacity-60 cursor-not-allowed"
                        }`}
                        data-testid={`button-board-${board.id}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Grid3X3 className="w-5 h-5 text-primary" />
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                        </div>
                        
                        <div className="font-semibold text-foreground mb-1 truncate">
                          {board.name}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          {board.categoryCount} categories, {board.totalQuestions} questions
                        </div>
                        
                        {!board.isReady && (
                          <div className="mt-2 text-xs text-amber-500">
                            Not ready - needs 5 categories with 5 questions each
                          </div>
                        )}
                      </motion.button>
                    ))}
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
