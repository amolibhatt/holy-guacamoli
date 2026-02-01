import { Link } from "wouter";
import { Category } from "@shared/schema";
import { ArrowRight, Brain, Sparkles, Globe, Calculator, Music, History } from "lucide-react";
import { motion } from "framer-motion";

// Helper to get an icon based on category name
function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('science')) return <Brain className="w-8 h-8" />;
  if (lower.includes('history')) return <History className="w-8 h-8" />;
  if (lower.includes('geography')) return <Globe className="w-8 h-8" />;
  if (lower.includes('math')) return <Calculator className="w-8 h-8" />;
  if (lower.includes('music') || lower.includes('art')) return <Music className="w-8 h-8" />;
  return <Sparkles className="w-8 h-8" />;
}

// Use theme gradient class
function getGradientClass() {
  return "gradient-header";
}

interface CategoryCardProps {
  category: Category;
  index: number;
}

export function CategoryCard({ category, index }: CategoryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Link href={`/category/${category.id}`} className="block h-full group">
        <div className="h-full bg-card rounded-md overflow-hidden border border-border shadow-sm hover-elevate transition-all duration-300 flex flex-col">
          {/* Header/Image Area */}
          <div className={`h-32 ${getGradientClass()} relative overflow-hidden flex items-center justify-center p-6`}>
            {/* Decorative circles */}
            <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/20 rounded-full blur-xl" />
            <div className="absolute bottom-[-10px] left-[-10px] w-16 h-16 bg-white/10 rounded-full blur-lg" />
            
            <div className="text-white drop-shadow-md">
              {getCategoryIcon(category.name)}
            </div>
          </div>
          
          <div className="p-6 flex-1 flex flex-col">
            <h3 className="text-xl font-display font-bold text-foreground mb-2">
              {category.name}
            </h3>
            <p className="text-muted-foreground text-sm flex-1 mb-6 line-clamp-2">
              {category.description}
            </p>
            
            <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-border/50">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Start Quiz
              </span>
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
