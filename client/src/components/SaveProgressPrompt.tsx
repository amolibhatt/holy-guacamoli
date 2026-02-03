import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy, Star, User, X, Sparkles } from "lucide-react";

interface SaveProgressPromptProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    gamesPlayed: number;
    totalPoints: number;
    badges: number;
    dominantTrait?: string | null;
  };
}

const TRAIT_DESCRIPTIONS: Record<string, { title: string; emoji: string }> = {
  brain_trust: { title: "The Brain Trust", emoji: "🧠" },
  lucky_guesser: { title: "The Lucky Guesser", emoji: "🍀" },
  speed_demon: { title: "The Speed Demon", emoji: "⚡" },
  careful_thinker: { title: "The Careful Thinker", emoji: "🤔" },
  perfectionist: { title: "The Perfectionist", emoji: "✨" },
  chaos_agent: { title: "The Chaos Agent", emoji: "🌪️" },
  master_manipulator: { title: "The Master Manipulator", emoji: "🎭" },
  bs_detector: { title: "The BS Detector", emoji: "🔍" },
  honest_abe: { title: "The Honest Abe", emoji: "🎩" },
  comedy_genius: { title: "The Comedy Genius", emoji: "😂" },
  hivemind: { title: "The Hivemind", emoji: "🐝" },
};

export function SaveProgressPrompt({ isOpen, onClose, stats }: SaveProgressPromptProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveProgress = () => {
    setIsLoading(true);
    // Redirect to auth flow - the guest ID will be automatically merged after login
    window.location.href = "/api/login";
  };

  const traitInfo = stats.dominantTrait 
    ? TRAIT_DESCRIPTIONS[stats.dominantTrait] 
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="w-full max-w-md relative overflow-hidden">
              {/* Decorative gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 dark:from-violet-900/20 dark:via-purple-900/20 dark:to-fuchsia-900/20" />
              
              {/* Floating sparkles */}
              <div className="absolute top-4 right-8 text-yellow-500 animate-pulse">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="absolute top-12 right-16 text-pink-500 animate-pulse delay-150">
                <Star className="w-4 h-4" />
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute top-2 right-2 z-10"
                data-testid="button-close-save-prompt"
              >
                <X className="w-4 h-4" />
              </Button>
              
              <CardHeader className="relative text-center pt-8">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Don't Lose Your Progress!</CardTitle>
                <CardDescription className="text-base mt-2">
                  You've been crushing it! Create an account to save everything.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="relative space-y-6 pb-8">
                {/* Stats summary */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-white/50 dark:bg-black/20">
                    <Trophy className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                    <div className="text-xl font-bold" data-testid="text-games-played">
                      {stats.gamesPlayed}
                    </div>
                    <div className="text-xs text-muted-foreground">Games</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/50 dark:bg-black/20">
                    <Star className="w-5 h-5 mx-auto mb-1 text-violet-500" />
                    <div className="text-xl font-bold" data-testid="text-total-points">
                      {stats.totalPoints.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Points</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/50 dark:bg-black/20">
                    <Sparkles className="w-5 h-5 mx-auto mb-1 text-pink-500" />
                    <div className="text-xl font-bold" data-testid="text-badges-earned">
                      {stats.badges}
                    </div>
                    <div className="text-xs text-muted-foreground">Badges</div>
                  </div>
                </div>
                
                {/* Personality teaser */}
                {traitInfo && (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 text-center">
                    <div className="text-2xl mb-1">{traitInfo.emoji}</div>
                    <div className="font-medium" data-testid="text-personality-trait">
                      Your personality: {traitInfo.title}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Save to see your full profile!
                    </div>
                  </div>
                )}
                
                {/* CTA buttons */}
                <div className="space-y-3">
                  <Button 
                    onClick={handleSaveProgress}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
                    data-testid="button-save-progress"
                  >
                    {isLoading ? "Redirecting..." : "Save My Progress"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={onClose}
                    className="w-full"
                    data-testid="button-continue-as-guest"
                  >
                    Continue as Guest
                  </Button>
                </div>
                
                <p className="text-xs text-center text-muted-foreground">
                  Sign in with Google, GitHub, or email
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
