import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScoreProvider } from "@/components/ScoreContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import CategoryPage from "@/pages/CategoryPage";
import { Header } from "@/components/Header";

function Router() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <Header />
      <main>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/category/:id" component={CategoryPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      
      <footer className="py-8 text-center text-muted-foreground text-sm border-t mt-20">
        <div className="container mx-auto px-4">
          <p>© 2024 QuizMaster. Expand your horizons.</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ScoreProvider>
          <Router />
          <Toaster />
        </ScoreProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
