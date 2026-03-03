import { useMemo } from "react";
import {
  Play, Search, RefreshCw, Grid3X3, ListOrdered,
  Brain, Clock, Image, Gamepad2, Users, Crown
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import type { GameSessionDetailed } from "./types";
import { getGameModeLabel, getHostDisplay, formatRelativeDate } from "./types";
import type { LucideIcon } from "lucide-react";

interface SessionsTabProps {
  sessions: GameSessionDetailed[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  sessionSearch: string;
  setSessionSearch: (val: string) => void;
  sessionModeFilter: string;
  setSessionModeFilter: (val: string) => void;
}

const ACTIVE_STATES = ["active", "waiting", "submitting", "voting", "revealing", "lobby", "selecting", "reveal"];

function getGameIcon(mode: string | null): LucideIcon {
  switch (mode) {
    case "buzzer": return Grid3X3;
    case "sequence_squeeze":
    case "sequence": return ListOrdered;
    case "psyop": return Brain;
    case "timewarp": return Clock;
    case "memenoharm":
    case "meme": return Image;
    default: return Gamepad2;
  }
}

function getStatusColor(state: string): string {
  if (ACTIVE_STATES.includes(state)) return "bg-green-500";
  if (state === "gameComplete") return "bg-amber-500";
  return "bg-gray-400";
}

const MODE_FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "BlitzGrid", value: "buzzer" },
  { label: "Sort Circuit", value: "sequence" },
  { label: "PsyOp", value: "psyop" },
  { label: "Meme No Harm", value: "meme" },
  { label: "Past Forward", value: "timewarp" },
];

export default function SessionsTab({
  sessions,
  isLoading,
  isError,
  refetch,
  sessionSearch,
  setSessionSearch,
  sessionModeFilter,
  setSessionModeFilter,
}: SessionsTabProps) {
  const activeCount = useMemo(
    () => sessions.filter((s) => ACTIVE_STATES.includes(s.state)).length,
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    let result = sessions;

    if (sessionModeFilter !== "all") {
      result = result.filter((s) => s.currentMode === sessionModeFilter);
    }

    if (sessionSearch.trim()) {
      const q = sessionSearch.toLowerCase();
      result = result.filter((s) => {
        if (s.code.toLowerCase().includes(q)) return true;
        const hostName = getHostDisplay(s.host).toLowerCase();
        if (hostName.includes(q)) return true;
        if (s.host?.email?.toLowerCase().includes(q)) return true;
        if (s.players.some((p) => p.name.toLowerCase().includes(q))) return true;
        if (getGameModeLabel(s.currentMode).toLowerCase().includes(q)) return true;
        return false;
      });
    }

    return result;
  }, [sessions, sessionModeFilter, sessionSearch]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Failed to load sessions.</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-3" data-testid="button-retry-sessions">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
          </span>
          <span className="text-sm font-medium" data-testid="text-active-sessions-count">
            {activeCount} session{activeCount !== 1 ? "s" : ""} active now
          </span>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {MODE_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={sessionModeFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSessionModeFilter(f.value)}
            className={sessionModeFilter === f.value ? "toggle-elevate toggle-elevated" : ""}
            data-testid={`button-filter-mode-${f.value}`}
          >
            {f.label}
          </Button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search code, host, player..."
            value={sessionSearch}
            onChange={(e) => setSessionSearch(e.target.value)}
            className="pl-9 w-56"
            data-testid="input-session-search"
          />
        </div>
        <Button size="icon" variant="outline" onClick={() => refetch()} data-testid="button-refresh-sessions">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="max-h-[600px] overflow-y-auto space-y-2">
        {filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Gamepad2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No sessions match your filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredSessions.map((session) => {
            const GameIcon = getGameIcon(session.currentMode);
            const statusColor = getStatusColor(session.state);
            const hostName = getHostDisplay(session.host);
            const isActive = ACTIVE_STATES.includes(session.state);

            return (
              <Card key={session.id} data-testid={`card-session-${session.id}`}>
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${statusColor} flex-shrink-0`} data-testid={`status-dot-${session.id}`} />

                  <span className="font-mono text-sm font-semibold min-w-[70px]" data-testid={`text-room-code-${session.id}`}>
                    {session.code}
                  </span>

                  <Badge variant="secondary" className="gap-1 no-default-active-elevate">
                    <GameIcon className="h-3 w-3" />
                    {getGameModeLabel(session.currentMode)}
                  </Badge>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid={`text-host-${session.id}`}>
                    <Play className="h-3 w-3" />
                    <span className="truncate max-w-[120px]">{hostName}</span>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid={`text-player-count-${session.id}`}>
                    <Users className="h-3 w-3" />
                    <span>{session.playerCount}</span>
                  </div>

                  {session.winner && (
                    <div className="flex items-center gap-1 text-sm" data-testid={`text-winner-${session.id}`}>
                      <Crown className="h-3 w-3 text-amber-500" />
                      <span className="truncate max-w-[100px]">{session.winner.name}</span>
                      <span className="text-muted-foreground">({session.winner.score})</span>
                    </div>
                  )}

                  <Badge
                    variant={isActive ? "default" : "outline"}
                    className="no-default-active-elevate"
                    data-testid={`badge-state-${session.id}`}
                  >
                    {session.state}
                  </Badge>

                  <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-time-${session.id}`}>
                    {formatRelativeDate(session.updatedAt || session.createdAt)}
                  </span>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
