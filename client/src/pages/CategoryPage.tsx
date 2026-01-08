import { useParams, useLocation } from "wouter";
import { useCategory, useQuestions } from "@/hooks/use-quiz";
import { QuestionCard } from "@/components/QuestionCard";
import { Loader2, ArrowLeft, Trophy } from "lucide-react";
import { Link } from "wouter";
import { useScore } from "@/components/ScoreContext";
import { motion } from "framer-motion";

export default function CategoryPage() {
  const params = useParams();
  const id = Number(params.id);
  const { score } = useScore();
  
  const { data: category, isLoading: isLoadingCategory } = useCategory(id);
  const { data: questions, isLoading: isLoadingQuestions } = useQuestions(id);

  if (isLoadingCategory || isLoadingQuestions) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!category || !questions) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold">Category not found</h2>
        <Link href="/" className="text-primary hover:underline mt-4 inline-block">
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span className="font-medium">Back to Categories</span>
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            {category.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            {category.description}
          </p>
        </div>
        
        <div className="hidden md:block">
           <div className="bg-card px-6 py-4 rounded-2xl border shadow-sm text-center">
             <span className="block text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Questions</span>
             <span className="text-3xl font-display font-bold text-primary">{questions.length}</span>
           </div>
        </div>
      </div>

      <div className="grid gap-8">
        {questions.length > 0 ? (
          questions.map((question, idx) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="flex items-start gap-4">
                <div className="hidden sm:flex flex-col items-center pt-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {idx + 1}
                  </div>
                  {idx !== questions.length - 1 && (
                    <div className="w-0.5 h-full bg-border/50 my-2 min-h-[4rem]" />
                  )}
                </div>
                
                <div className="flex-1">
                  <QuestionCard 
                    question={question} 
                    isLocked={false} 
                  />
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-foreground">No questions yet</h3>
            <p className="text-muted-foreground">This category is coming soon!</p>
          </div>
        )}
      </div>

      <div className="mt-16 text-center">
        <Link href="/">
          <button className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
             Choose Another Category
          </button>
        </Link>
      </div>
    </div>
  );
}
