import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { PsyOpQuestionAdmin } from "@/components/PsyOpQuestionAdmin";
import { Button } from "@/components/ui/button";
import { Loader2, Grid3X3, ListOrdered, Eye } from "lucide-react";

export default function PsyOpAdmin() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-psyop-admin">
      <div className="fixed inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />
      
      <AppHeader
        title="Content Admin"
        backHref="/"
      />

      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4">
          <nav className="flex flex-wrap gap-1">
            <Link href="/admin/games">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground"
                data-testid="tab-blitzgrid"
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Blitzgrid
              </Button>
            </Link>
            <Link href="/admin/genetic-sort">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground"
                data-testid="tab-genetic-sort"
              >
                <ListOrdered className="w-4 h-4 mr-2" />
                Genetic Sort
              </Button>
            </Link>
            <Link href="/admin/psyop">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-primary text-foreground"
                data-testid="tab-psyop"
              >
                <Eye className="w-4 h-4 mr-2" />
                PsyOp
              </Button>
            </Link>
          </nav>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">PsyOp Questions</h1>
          <p className="text-muted-foreground text-sm">Create fill-in-the-blank facts for the lie-guessing game</p>
        </div>
        <PsyOpQuestionAdmin />
      </main>
    </div>
  );
}
