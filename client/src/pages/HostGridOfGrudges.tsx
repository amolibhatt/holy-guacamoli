import { useQuery } from "@tanstack/react-query";
import { Loader2, Settings, Grid3X3, ArrowRight, Users } from "lucide-react";
import { AvocadoIcon } from "@/components/AvocadoIcon";
import { AppHeader } from "@/components/AppHeader";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import type { Board } from "@shared/schema";
import { motion } from "framer-motion";

export default function HostGridOfGrudges() {
  const [, setLocation] = useLocation();

  const { data: boards = [], isLoading } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
  });

  const handleSelectBoard = (board: Board) => {
    setLocation(`/board/${board.id}`);
  };

  return (
    <div className="min-h-screen gradient-game grid-bg flex flex-col">
      <AppHeader 
        title="Buzzkill"
        subtitle="Select a board"
        backHref="/"
        rightContent={
          <Link href="/admin?game=buzzkill">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-manage-boards">
              <Settings className="w-4 h-4" />
              Manage Boards
            </Button>
          </Link>
        }
      />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
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
