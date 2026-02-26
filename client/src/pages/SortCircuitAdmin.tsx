import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { SequenceSqueezeAdmin } from "@/components/SequenceSqueezeAdmin";
import { GameAnalyticsPanel } from "@/components/GameAnalyticsPanel";
import { Button } from "@/components/ui/button";
import { Loader2, Grid3X3, ListOrdered, Eye, Clock, Smile } from "lucide-react";

export default function SortCircuitAdmin() {
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground shrink-0" aria-hidden="true" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  // Access denied for non-admin users
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page. Admin access is required.
          </p>
          <a href="/" className="text-primary hover:underline">Back to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-sort-circuit-admin">
      <div className="fixed inset-0 bg-gradient-to-br from-teal-300/5 via-transparent to-teal-300/5 pointer-events-none" />
      
      <AppHeader minimal backHref="/" title="Sort Circuit Admin" />

      <div className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-4 w-full">
          <nav className="flex gap-1">
            <Link href="/admin/games">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-blitzgrid"
              >
                <Grid3X3 className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                BlitzGrid
              </Button>
            </Link>
            <Link href="/admin/sort-circuit">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-primary text-foreground"
                data-testid="tab-sort-circuit"
              >
                <ListOrdered className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                Sort Circuit
              </Button>
            </Link>
            <Link href="/admin/psyop">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-psyop"
              >
                <Eye className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                PsyOp
              </Button>
            </Link>
            <Link href="/admin/memenoharm">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-memenoharm"
              >
                <Smile className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                Meme No Harm
              </Button>
            </Link>
            <Link href="/admin/pastforward">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-timewarp"
              >
                <Clock className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                Past Forward
              </Button>
            </Link>
          </nav>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Sort Circuit Questions</h1>
          <p className="text-muted-foreground text-sm">Create and manage ordering questions</p>
        </div>
        <SequenceSqueezeAdmin />
        <GameAnalyticsPanel
          endpoint="/api/sortcircuit/analytics"
          gameName="Sort Circuit"
          accentColor="text-teal-500"
          isAuthenticated={isAuthenticated}
        />
      </main>
    </div>
  );
}
