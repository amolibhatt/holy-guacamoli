import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Users, Play, Grid3X3 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import type { Category } from "@shared/schema";
import { motion } from "framer-motion";

interface ThemedResponse {
  group: string;
  categories: Category[];
}

const groupNames: Record<string, string> = {
  A: "Group A",
  B: "Group B",
  C: "Group C",
  D: "Group D",
  E: "Group E",
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

export default function BuzzkillThemed() {
  const params = useParams<{ group: string }>();
  const group = params.group?.toUpperCase() || "A";
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<ThemedResponse>({
    queryKey: ['/api/buzzkill/themed', group],
    queryFn: async () => {
      const res = await fetch(`/api/buzzkill/themed/${group}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const handleStartGame = (categoryId: number) => {
    setLocation(`/buzzkill/play?categories=${categoryId}`);
  };

  return (
    <div className="min-h-screen gradient-game grid-bg flex flex-col">
      <AppHeader 
        title={groupNames[group] || `Group ${group}`}
        subtitle={`${data?.categories.length || 0} categories`}
        backHref="/buzzkill"
      />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : !data?.categories.length ? (
            <motion.div 
              className="text-center py-16 px-8 bg-gradient-to-b from-card to-card/60 rounded-2xl border border-border"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${groupColors[group]} flex items-center justify-center mx-auto mb-6`}>
                <span className={`text-4xl font-black ${groupTextColors[group]}`}>{group}</span>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">No categories yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                No categories have been assigned to this group. Add categories in the admin panel.
              </p>
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {data.categories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-5 rounded-xl bg-gradient-to-r ${groupColors[group]} border flex items-center gap-4`}
                  data-testid={`category-${category.id}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-card/50 flex items-center justify-center">
                    <Grid3X3 className={`w-6 h-6 ${groupTextColors[group]}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{category.name}</h3>
                    {category.rule && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{category.rule}</p>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    className="gap-2"
                    onClick={() => handleStartGame(category.id)}
                    data-testid={`button-play-${category.id}`}
                  >
                    <Play className="w-4 h-4" />
                    Play
                  </Button>
                </motion.div>
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
