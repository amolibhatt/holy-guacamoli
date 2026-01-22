import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScoreProvider } from "@/components/ScoreContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import PlayerPage from "@/pages/PlayerPage";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

// Lazy load heavier components to reduce initial bundle size
const Admin = lazy(() => import("@/pages/Admin"));
const GamesAdmin = lazy(() => import("@/pages/GamesAdmin"));
const HeadsUpGame = lazy(() => import("@/pages/HeadsUpGame"));
const SuperAdmin = lazy(() => import("@/pages/SuperAdmin"));
const RelationshipHub = lazy(() => import("@/pages/RelationshipHub"));
const SequenceSqueeze = lazy(() => import("@/pages/SequenceSqueeze"));
const SequencePlayer = lazy(() => import("@/pages/SequencePlayer"));
const Vault = lazy(() => import("@/pages/Vault"));
const Storyboard = lazy(() => import("@/pages/Storyboard"));
const GameHistory = lazy(() => import("@/pages/GameHistory"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/host/double-dip" component={RelationshipHub} />
        <Route path="/admin" component={Admin} />
        <Route path="/admin/games" component={GamesAdmin} />
        <Route path="/admin/super" component={SuperAdmin} />
        <Route path="/admin/history" component={GameHistory} />
        <Route path="/games" component={GamesAdmin} />
        <Route path="/play/:code?" component={PlayerPage} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/heads-up/:gameId" component={HeadsUpGame} />
        <Route path="/couples" component={RelationshipHub} />
        <Route path="/couples/vault" component={Vault} />
        <Route path="/couples/storyboard" component={Storyboard} />
        <Route path="/host/sequence-squeeze" component={SequenceSqueeze} />
        <Route path="/sequence/:code?" component={SequencePlayer} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ScoreProvider>
            <Router />
            <Toaster />
          </ScoreProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
