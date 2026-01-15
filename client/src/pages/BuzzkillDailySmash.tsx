import { Loader2, Shuffle, Play, RefreshCcw } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import type { Category } from "@shared/schema";
import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { BuzzerPanel, BuzzerPanelHandle } from "@/components/BuzzerPanel";

interface MashedResult {
  categories: Category[];
  wasReset: boolean;
  message: string;
}

export default function BuzzkillDailySmash() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const [mashedBoard, setMashedBoard] = useState<MashedResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [localSessionId, setLocalSessionId] = useState<number | null>(null);
  const buzzerRef = useRef<BuzzerPanelHandle>(null);
  
  const params = new URLSearchParams(searchString);
  const urlSessionId = params.get("session");
  const sessionId = urlSessionId ? Number(urlSessionId) : localSessionId;
  
  // Poll for session ID from BuzzerPanel
  useEffect(() => {
    const checkSession = () => {
      const id = buzzerRef.current?.getSessionId();
      if (id && !localSessionId) {
        setLocalSessionId(id);
      }
    };
    const interval = setInterval(checkSession, 500);
    return () => clearInterval(interval);
  }, [localSessionId]);

  const generateBoard = async () => {
    if (!sessionId) {
      toast({
        title: "No active session",
        description: "Please start a game room first from the Buzzer Panel",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch(`/api/buzzkill/shuffle/${sessionId}`, {
        method: "POST",
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to generate" }));
        toast({
          title: "Cannot Generate Board",
          description: errorData.message || "Failed to generate board",
          variant: "destructive",
        });
        return;
      }
      
      const result: MashedResult = await res.json();
      setMashedBoard(result);
      setHasGenerated(true);
      
      if (result.wasReset) {
        toast({
          title: "Vault Reset!",
          description: result.message,
        });
      } else if (result.categories.length < 5) {
        toast({
          title: "Board Generated",
          description: `Only ${result.categories.length} categories available. Add more categories to source groups in Admin.`,
        });
      } else {
        toast({
          title: "Board Generated!",
          description: `${result.categories.length} categories ready to play`,
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to generate board. Check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const startGame = () => {
    if (!mashedBoard?.categories.length) return;
    const categoryIds = mashedBoard.categories.map(c => c.id).join(",");
    setLocation(`/buzzkill/play?categories=${categoryIds}`);
  };

  const groupColors: Record<string, string> = {
    A: "from-rose-500/30 to-rose-600/10 border-rose-500/40",
    B: "from-amber-500/30 to-amber-600/10 border-amber-500/40",
    C: "from-emerald-500/30 to-emerald-600/10 border-emerald-500/40",
    D: "from-blue-500/30 to-blue-600/10 border-blue-500/40",
    E: "from-purple-500/30 to-purple-600/10 border-purple-500/40",
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
        title="Shuffle Play"
        subtitle={sessionId ? "Session active" : "Generate your mix"}
        backHref="/buzzkill"
        showAdminButton
        adminHref="/admin?game=buzzkill"
      />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          {!hasGenerated ? (
            <motion.div 
              className="text-center py-12 px-8 bg-gradient-to-b from-card to-card/60 rounded-2xl border border-border"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
                <Shuffle className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Ready to Shuffle?</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Generate a balanced board with one category from each group. 
                Categories won't repeat until you've played through all of them!
              </p>
              
              {!sessionId && (
                <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
                  Open the Buzzer Panel below to create a room first
                </div>
              )}
              
              <Button 
                size="lg" 
                className="gap-2" 
                onClick={generateBoard}
                disabled={isGenerating || !sessionId}
                data-testid="button-generate"
              >
                {isGenerating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Shuffle className="w-5 h-5" />
                )}
                Generate My Board
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Your Categories</h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={generateBoard}
                  disabled={isGenerating}
                  data-testid="button-regenerate"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="w-4 h-4" />
                  )}
                  Regenerate
                </Button>
              </div>
              
              <div className="grid gap-3">
                {mashedBoard?.categories.map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-xl bg-gradient-to-r ${groupColors[category.sourceGroup || 'A']} border flex items-center gap-4`}
                    data-testid={`category-${category.id}`}
                  >
                    <div className={`text-2xl font-black ${groupTextColors[category.sourceGroup || 'A']}`}>
                      {category.sourceGroup}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{category.name}</h3>
                      {category.rule && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{category.rule}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <Button 
                size="lg" 
                className="w-full gap-2" 
                onClick={startGame}
                data-testid="button-start-game"
              >
                <Play className="w-5 h-5" />
                Start Playing
              </Button>
            </div>
          )}
        </div>
      </main>
      
      <footer className="border-t border-border/50 bg-card/80 backdrop-blur p-4">
        <BuzzerPanel ref={buzzerRef} />
      </footer>
    </div>
  );
}
