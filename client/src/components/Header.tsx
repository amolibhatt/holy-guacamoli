import { Link } from "wouter";
import { Home } from "lucide-react";
import { AvocadoIcon } from "./AvocadoIcon";
import { motion } from "framer-motion";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer hover:opacity-90 transition-opacity">
          <motion.div 
            className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300"
            animate={{ rotate: [0, -3, 3, -3, 0], y: [0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <AvocadoIcon className="w-8 h-8 drop-shadow-md" />
          </motion.div>
          <span className="font-display font-bold text-2xl text-foreground hidden sm:block">
            Holy <span className="bg-gradient-to-r from-green-500 via-emerald-400 to-lime-400 bg-clip-text text-transparent">GuacAmoli!</span>
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
