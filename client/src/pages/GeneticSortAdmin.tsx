import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { SequenceSqueezeAdmin } from "@/components/SequenceSqueezeAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export default function GeneticSortAdmin() {
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
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
      
      <AppHeader
        title="Genetic Sort Admin"
        subtitle="Create and manage ordering questions"
        backHref="/"
      />

      <main className="p-6 max-w-4xl mx-auto">
        <SequenceSqueezeAdmin />
      </main>
    </div>
  );
}
