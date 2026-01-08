import { Link } from "wouter";
import { Trophy, Home } from "lucide-react";
import { useScore } from "./ScoreContext";

export function Header() {
  const { score } = useScore();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
            <span className="font-display font-bold text-xl">Q</span>
          </div>
          <span className="font-display font-bold text-2xl text-foreground hidden sm:block">
            Quiz<span className="text-primary">Master</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/">
             <div className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
               <Home className="w-5 h-5" />
             </div>
          </Link>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-secondary/10 text-secondary-foreground rounded-full border border-secondary/20 font-bold font-display">
            <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="tabular-nums">{score} pts</span>
          </div>
        </div>
      </div>
    </header>
  );
}
