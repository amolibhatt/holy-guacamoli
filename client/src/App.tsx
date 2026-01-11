import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScoreProvider } from "@/components/ScoreContext";
import { ThemeProvider } from "@/context/ThemeContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import CategoryPage from "@/pages/CategoryPage";
import Admin from "@/pages/Admin";
import PlayerPage from "@/pages/PlayerPage";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import GamesAdmin from "@/pages/GamesAdmin";
import HeadsUpGame from "@/pages/HeadsUpGame";
import GridOfGrudges from "@/pages/GridOfGrudges";
import PlayBoard from "@/pages/PlayBoard";
import SuperAdmin from "@/pages/SuperAdmin";
import CouplesGame from "@/pages/CouplesGame";
import HostGridOfGrudges from "@/pages/HostGridOfGrudges";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/host/grid-of-grudges" component={HostGridOfGrudges} />
      <Route path="/host/double-dip" component={CouplesGame} />
      <Route path="/category/:id" component={CategoryPage} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/games" component={GamesAdmin} />
      <Route path="/admin/super" component={SuperAdmin} />
      <Route path="/games" component={GamesAdmin} />
      <Route path="/board/:boardId" component={PlayBoard} />
      <Route path="/play/:code?" component={PlayerPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/heads-up/:gameId" component={HeadsUpGame} />
      <Route path="/grudges/:gameId" component={GridOfGrudges} />
      <Route path="/couples" component={CouplesGame} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <ScoreProvider>
            <Router />
            <Toaster />
          </ScoreProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
