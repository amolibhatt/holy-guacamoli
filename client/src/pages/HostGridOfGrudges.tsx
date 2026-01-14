import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Settings, Grid3X3, ArrowRight, Users, Shuffle, RefreshCcw, Check, LayoutGrid } from "lucide-react";
import { AvocadoIcon } from "@/components/AvocadoIcon";
import { AppHeader } from "@/components/AppHeader";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import type { Board, Category } from "@shared/schema";
import { motion } from "framer-motion";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const SOURCE_GROUPS = ["A", "B", "C", "D", "E"] as const;

interface CategoryGroup {
  groups: Record<string, Category[]>;
  sourceGroups: string[];
}

interface PlayedStatus {
  playedCategoryIds: number[];
  totalCategories: number;
  gamesPlayed: number;
}

interface MashedResult {
  categories: Category[];
  wasReset: boolean;
  message: string;
}

export default function HostGridOfGrudges() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMode, setSelectedMode] = useState<"boards" | "smart">("smart");

  const { data: boards = [], isLoading: boardsLoading } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
  });

  const { data: categoryGroups, isLoading: groupsLoading } = useQuery<CategoryGroup>({
    queryKey: ['/api/buzzkill/category-groups'],
  });

  const handleSelectBoard = (board: Board) => {
    setLocation(`/board/${board.id}`);
  };

  const handleSelectSourceGroup = (group: string) => {
    setLocation(`/buzzkill/themed/${group}`);
  };

  const handleDailySmash = () => {
    setLocation('/buzzkill/daily-smash');
  };

  const isLoading = boardsLoading || groupsLoading;

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
        rightContent={
          <div className="flex gap-2">
            <Button
              variant={selectedMode === "smart" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMode("smart")}
              className="gap-2"
              data-testid="button-mode-smart"
            >
              <Shuffle className="w-4 h-4" />
              Smart Mix
            </Button>
            <Button
              variant={selectedMode === "boards" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMode("boards")}
              className="gap-2"
              data-testid="button-mode-boards"
            >
              <LayoutGrid className="w-4 h-4" />
              Boards
            </Button>
            <Link href="/admin?game=buzzkill">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-manage-boards">
                <Settings className="w-4 h-4" />
                Manage
              </Button>
            </Link>
          </div>
        }
      />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : selectedMode === "smart" ? (
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
                  <LayoutGrid className="w-5 h-5 text-muted-foreground" />
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
            </div>
          ) : boards.length === 0 ? (
            <motion.div 
              className="text-center py-16 px-8 bg-gradient-to-b from-card to-card/60 rounded-2xl border border-border"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <AvocadoIcon className="w-10 h-10 opacity-40" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">No boards yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Create your first game board to start hosting trivia nights
              </p>
              <Link href="/admin?game=buzzkill">
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
                  transition={{ delay: index * 0.05 }}
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
