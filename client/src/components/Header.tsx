import { Link } from "wouter";
import { Home } from "lucide-react";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="cursor-pointer hover:opacity-90 transition-opacity">
          <Logo size="md" />
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
