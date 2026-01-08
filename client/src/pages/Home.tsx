import { useCategories } from "@/hooks/use-quiz";
import { CategoryCard } from "@/components/CategoryCard";
import { Loader2, Sparkles } from "lucide-react";

export default function Home() {
  const { data: categories, isLoading, error } = useCategories();

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Loading amazing quizzes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
          <span className="text-2xl font-bold">!</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground">Something went wrong</h2>
        <p className="text-muted-foreground mt-2">Could not load categories. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6 animate-fade-in">
          <Sparkles className="w-4 h-4" />
          <span>Test Your Knowledge</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-6 leading-tight">
          Ready to Challenge <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Your Mind?</span>
        </h1>
        
        <p className="text-lg text-muted-foreground leading-relaxed">
          Choose a category below to start your journey. Earn points, 
          unlock achievements, and become the ultimate trivia master.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {categories?.map((category, index) => (
          <CategoryCard key={category.id} category={category} index={index} />
        ))}
      </div>
      
      {categories?.length === 0 && (
        <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border">
          <h3 className="text-xl font-bold text-muted-foreground">No categories available yet</h3>
          <p className="text-muted-foreground mt-2">Check back soon for new content!</p>
        </div>
      )}
    </div>
  );
}
