import { Link } from "wouter";
import { Home } from "lucide-react";
import { AvocadoIcon } from "./AvocadoIcon";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl gradient-header flex items-center justify-center shadow-lg glow-primary group-hover:scale-105 transition-transform duration-300">
            <AvocadoIcon className="w-6 h-6" />
          </div>
          <span className="font-display font-bold text-2xl text-foreground hidden sm:block">
            Holy <span className="text-primary">GuacAmoli!</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/">
             <div className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
               <Home className="w-5 h-5" />
             </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
