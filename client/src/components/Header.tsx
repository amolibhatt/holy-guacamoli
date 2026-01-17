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
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 relative overflow-visible"
            whileHover={{ rotate: [-2, 2, -2, 0] }}
            transition={{ duration: 0.4 }}
          >
            <motion.div 
              className="absolute inset-0 rounded-xl blur-md opacity-40"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #D946EF)" }}
            />
            <AvocadoIcon className="w-6 h-6 relative z-10" />
          </motion.div>
          <span className="font-display font-bold text-2xl text-foreground hidden sm:block">
            Holy <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">GuacAmoli!</span>
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
