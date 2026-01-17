import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Grid3X3, ArrowRight, Users, Shuffle, FolderPlus, Sparkles, User, Blend } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useLocation } from "wouter";
import type { Board } from "@shared/schema";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShuffleMode = "starter" | "personal" | "meld";

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
  const { toast } = useToast();
  const [isShuffling, setIsShuffling] = useState(false);
  const [showShuffleOptions, setShowShuffleOptions] = useState(false);
  const [shuffleMode, setShuffleMode] = useState<ShuffleMode>("starter");

  const { data: presetBoards = [], isLoading: isLoadingPresets } = useQuery<PresetBoard[]>({
    queryKey: ['/api/buzzkill/preset-boards'],
  });

  const { data: customBoards = [], isLoading: isLoadingBoards } = useQuery<CustomBoard[]>({
    queryKey: ['/api/buzzkill/custom-boards'],
  });

  const { data: shuffleStats, isLoading: isLoadingStats } = useQuery<{ globalLiveCount: number; personalLiveCount: number }>({
    queryKey: ['/api/buzzkill/shuffle-stats'],
  });
  
  const isLoading = isLoadingPresets || isLoadingBoards;
  const globalLive = shuffleStats?.globalLiveCount ?? 0;
  const personalLive = shuffleStats?.personalLiveCount ?? 0;
  const statsLoaded = !isLoadingStats && shuffleStats !== undefined;
  
  const canUseStarter = globalLive >= 5;
  const canUsePersonal = personalLive >= 5;
  const canUseMeld = (globalLive + personalLive) >= 5;
  
  const getLiveCategoryCount = (mode: ShuffleMode): number => {
    switch (mode) {
      case "starter": return globalLive;
      case "personal": return personalLive;
      case "meld": return globalLive + personalLive;
    }
  };

  const handleShuffleClick = () => {
    // Reset to first available mode when opening
    if (canUseStarter) setShuffleMode("starter");
    else if (canUseMeld) setShuffleMode("meld");
    else if (canUsePersonal) setShuffleMode("personal");
    setShowShuffleOptions(true);
  };

  const generateShuffleBoard = async () => {
    setShowShuffleOptions(false);
    setIsShuffling(true);
    try {
      const res = await fetch("/api/buzzkill/shuffle-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode: shuffleMode }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to generate" }));
        toast({
          title: "Cannot Generate Board",
          description: errorData.message || "Failed to generate shuffle board",
          variant: "destructive",
        });
        return;
      }
      
      const result = await res.json();
      setLocation(`/board/${result.boardId}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to generate board. Check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsShuffling(false);
    }
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
                onClick={handleShuffleClick}
                disabled={isShuffling}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: isShuffling ? 1 : 1.01, y: isShuffling ? 0 : -2 }}
                whileTap={{ scale: isShuffling ? 1 : 0.99 }}
                className={`w-full relative flex flex-col p-8 bg-gradient-to-br from-primary/20 via-secondary/15 to-accent/20 border-2 border-primary/40 rounded-2xl text-left transition-all hover:border-primary hover:shadow-2xl hover:shadow-primary/20 group overflow-hidden ${isShuffling ? 'opacity-80 cursor-wait' : ''}`}
                data-testid="button-daily-smash"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-secondary/20 to-transparent rounded-tr-full" />
                
                <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
                    {isShuffling ? (
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    ) : (
                      <Shuffle className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <ArrowRight className="w-6 h-6 text-primary group-hover:translate-x-2 transition-transform" />
                </div>
                
                <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors mb-2 relative z-10">
                  {isShuffling ? "Shuffling..." : "Shuffle Play"}
                </h3>
                <p className="text-muted-foreground relative z-10 max-w-lg">
                  {isShuffling ? "Generating your unique board..." : "A balanced mix of 5 categories - one from each group. Fresh picks every game, never repeating until all are played!"}
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
                
                {customBoards.filter(b => b.name !== "Shuffle Play").length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {customBoards.filter(b => b.name !== "Shuffle Play").map((board, index) => {
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

      <Dialog open={showShuffleOptions} onOpenChange={setShowShuffleOptions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-primary" />
              Shuffle Play
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Pick 5 random Live categories to create your game board.
            </p>
            
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => canUseStarter && setShuffleMode("starter")}
                disabled={!canUseStarter}
                className={cn(
                  "w-full p-4 rounded-lg border text-left transition-all",
                  shuffleMode === "starter" && canUseStarter
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : canUseStarter
                    ? "hover-elevate"
                    : "opacity-50 cursor-not-allowed"
                )}
                data-testid="option-starter"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Starter Packs</div>
                    <div className="text-xs text-muted-foreground">
                      {globalLive} Live categories from curated boards
                    </div>
                  </div>
                  {!canUseStarter && (
                    <span className="text-xs text-destructive">Need 5+</span>
                  )}
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => canUsePersonal && setShuffleMode("personal")}
                disabled={!canUsePersonal}
                className={cn(
                  "w-full p-4 rounded-lg border text-left transition-all",
                  shuffleMode === "personal" && canUsePersonal
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : canUsePersonal
                    ? "hover-elevate"
                    : "opacity-50 cursor-not-allowed"
                )}
                data-testid="option-personal"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <User className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">My Categories</div>
                    <div className="text-xs text-muted-foreground">
                      {personalLive} Live categories from your boards
                    </div>
                  </div>
                  {!canUsePersonal && (
                    <span className="text-xs text-destructive">Need 5+</span>
                  )}
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => canUseMeld && setShuffleMode("meld")}
                disabled={!canUseMeld}
                className={cn(
                  "w-full p-4 rounded-lg border text-left transition-all",
                  shuffleMode === "meld" && canUseMeld
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : canUseMeld
                    ? "hover-elevate"
                    : "opacity-50 cursor-not-allowed"
                )}
                data-testid="option-meld"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Blend className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Meld</div>
                    <div className="text-xs text-muted-foreground">
                      {globalLive + personalLive} Live categories from all sources
                    </div>
                  </div>
                  {!canUseMeld && (
                    <span className="text-xs text-destructive">Need 5+</span>
                  )}
                </div>
              </button>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={generateShuffleBoard}
              disabled={!statsLoaded || getLiveCategoryCount(shuffleMode) < 5}
              data-testid="button-shuffle-go"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              {!statsLoaded ? "Loading..." : "Generate Board"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
