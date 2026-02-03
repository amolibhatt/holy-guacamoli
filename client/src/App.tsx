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
const BlitzgridAdmin = lazy(() => import("@/pages/BlitzgridAdmin"));
const SuperAdmin = lazy(() => import("@/pages/SuperAdmin"));
const SortCircuit = lazy(() => import("@/pages/SequenceSqueeze"));
const SortCircuitPlayer = lazy(() => import("@/pages/SequencePlayer"));
const SortCircuitAdmin = lazy(() => import("@/pages/SortCircuitAdmin"));
const PsyOpAdmin = lazy(() => import("@/pages/PsyOpAdmin"));
const PsyOpHost = lazy(() => import("@/pages/PsyOpHost"));
const TimeWarpAdmin = lazy(() => import("@/pages/TimeWarpAdmin"));
const TimeWarpHost = lazy(() => import("@/pages/TimeWarpHost"));
const GameHistory = lazy(() => import("@/pages/GameHistory"));
const Blitzgrid = lazy(() => import("@/pages/Blitzgrid"));
const Pricing = lazy(() => import("@/pages/Pricing"));

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
        <Route path="/admin/games" component={BlitzgridAdmin} />
        <Route path="/admin/super" component={SuperAdmin} />
        <Route path="/admin/history" component={GameHistory} />
        <Route path="/play/:code?" component={PlayerPage} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/host/sort-circuit" component={SortCircuit} />
        <Route path="/host/sequence-squeeze" component={SortCircuit} />
        <Route path="/admin/sort-circuit" component={SortCircuitAdmin} />
        <Route path="/admin/psyop" component={PsyOpAdmin} />
        <Route path="/host/psyop" component={PsyOpHost} />
        <Route path="/admin/pastforward" component={TimeWarpAdmin} />
        <Route path="/pastforward/host" component={TimeWarpHost} />
        <Route path="/sortcircuit/:code?" component={SortCircuitPlayer} />
        <Route path="/host/blitzgrid" component={Blitzgrid} />
        <Route path="/pricing" component={Pricing} />
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
