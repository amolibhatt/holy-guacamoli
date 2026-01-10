import { useParams, Redirect } from "wouter";
import { useCategory } from "@/hooks/use-quiz";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function CategoryPage() {
  const params = useParams();
  const id = Number(params.id);
  
  const { data: category, isLoading } = useCategory(id);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!category) {
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
        <span className="font-medium">Back to Game</span>
      </Link>

      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
          {category.name}
        </h1>
        {category.description && (
          <p className="text-lg text-muted-foreground max-w-xl">
            {category.description}
          </p>
        )}
      </div>

      <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed">
        <p className="text-muted-foreground">
          This category is a template. Select a board from the home page to play!
        </p>
        <Link href="/" className="mt-4 inline-block">
          <button className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 transition-all duration-200" data-testid="button-go-home">
            Go to Game
          </button>
        </Link>
      </div>
    </div>
  );
}
