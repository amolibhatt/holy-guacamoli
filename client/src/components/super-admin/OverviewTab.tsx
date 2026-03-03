import { useState } from "react";
import {
  Activity, Zap, Users, Target, Crown, TrendingUp, TrendingDown,
  RefreshCw, Grid3X3, ListOrdered, Brain, Clock, Image, Megaphone,
  Download, AlertTriangle, Check, X, Eye, Trash2, Send, Gamepad2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {
  ComprehensiveDashboard,
  FlaggedBoardWithOwner,
  Announcement,
} from "./types";
import { formatRelativeDate, getGameModeLabel } from "./types";

interface OverviewTabProps {
  dashboard: ComprehensiveDashboard | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  flaggedBoards: FlaggedBoardWithOwner[];
  isLoadingFlagged: boolean;
  isErrorFlagged: boolean;
  refetchFlagged: () => void;
  announcements: Announcement[];
  isLoadingAnnouncements: boolean;
  isErrorAnnouncements: boolean;
  refetchAnnouncements: () => void;
  onDeleteAnnouncement: (id: number) => void;
  onApproveBoard: (id: number) => void;
  onRejectBoard: (id: number) => void;
  onCreateAnnouncement: (data: { title: string; message: string; type: string }) => void;
  isExporting: boolean;
  onExportData: () => void;
  deleteAnnouncementPending: boolean;
  updateModerationPending: boolean;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} data-testid="button-retry">
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}

function TrendBadge({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  return (
    <Badge
      variant="secondary"
      className={`text-xs gap-1 ${isPositive ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
      data-testid={`trend-badge-${isPositive ? "up" : "down"}`}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? "+" : ""}{value}{suffix}
    </Badge>
  );
}

function getStatusColor(state: string): string {
  const active = ["playing", "active", "in_progress", "buzzer_open", "revealing", "showing_answer"];
  const waiting = ["waiting", "lobby", "pending"];
  if (active.includes(state)) return "bg-green-500";
  if (waiting.includes(state)) return "bg-amber-500";
  return "bg-gray-400";
}

function getModeIcon(mode: string | null | undefined) {
  switch (mode) {
    case "buzzer": return <Grid3X3 className="h-4 w-4" />;
    case "sequence": return <ListOrdered className="h-4 w-4" />;
    case "psyop": return <Brain className="h-4 w-4" />;
    case "timewarp": return <Clock className="h-4 w-4" />;
    case "meme": return <Image className="h-4 w-4" />;
    default: return <Gamepad2 className="h-4 w-4" />;
  }
}

export default function OverviewTab({
  dashboard,
  isLoading,
  isError,
  refetch,
  flaggedBoards,
  isLoadingFlagged,
  isErrorFlagged,
  refetchFlagged,
  announcements,
  isLoadingAnnouncements,
  isErrorAnnouncements,
  refetchAnnouncements,
  onDeleteAnnouncement,
  onApproveBoard,
  onRejectBoard,
  onCreateAnnouncement,
  isExporting,
  onExportData,
  deleteAnnouncementPending,
  updateModerationPending,
}: OverviewTabProps) {
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementType, setAnnouncementType] = useState<string>("info");

  const handleCreateAnnouncement = () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) return;
    onCreateAnnouncement({ title: announcementTitle, message: announcementMessage, type: announcementType });
    setAnnouncementTitle("");
    setAnnouncementMessage("");
    setAnnouncementType("info");
    setShowAnnouncementForm(false);
  };

  if (isError) {
    return <ErrorState message="Failed to load dashboard data" onRetry={refetch} />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="rounded-md bg-gradient-to-r from-purple-900 to-blue-900 p-6" data-testid="hero-section">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-semibold text-white/80">Real-Time Activity</h2>
            <p className="text-sm text-white/50 mt-1">Live platform status</p>
          </div>
          <div className="flex flex-wrap gap-8">
            <div className="flex items-center gap-3" data-testid="stat-active-games">
              <div className="relative">
                <span className="absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 bg-white/20" />
                ) : (
                  <span className="text-3xl font-bold text-white">{dashboard?.realtime.activeGames ?? 0}</span>
                )}
                <p className="text-xs text-white/60">Active Games</p>
              </div>
            </div>
            <div className="flex items-center gap-3" data-testid="stat-active-players">
              <Users className="h-6 w-6 text-white/70" />
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 bg-white/20" />
                ) : (
                  <span className="text-3xl font-bold text-white">{dashboard?.realtime.activePlayers ?? 0}</span>
                )}
                <p className="text-xs text-white/60">Active Players</p>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={refetch} data-testid="button-refresh-dashboard" className="text-white/70 hover:text-white">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="metric-games-today">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-muted/30 p-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  {isLoading ? <Skeleton className="h-7 w-12" /> : (
                    <p className="text-2xl font-bold">{dashboard?.today.games ?? 0}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Games Today</p>
                </div>
              </div>
              {!isLoading && dashboard && <TrendBadge value={dashboard.today.gamesChange} />}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="metric-players-today">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-muted/30 p-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  {isLoading ? <Skeleton className="h-7 w-12" /> : (
                    <p className="text-2xl font-bold">{dashboard?.today.players ?? 0}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Players Today</p>
                </div>
              </div>
              {!isLoading && dashboard && <TrendBadge value={dashboard.today.playersChange} />}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="metric-new-users">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-muted/30 p-2">
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                {isLoading ? <Skeleton className="h-7 w-12" /> : (
                  <p className="text-2xl font-bold">{dashboard?.week.newUsers ?? 0}</p>
                )}
                <p className="text-xs text-muted-foreground">New Users This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="metric-completion-rate">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-muted/30 p-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                {isLoading ? <Skeleton className="h-7 w-12" /> : (
                  <p className="text-2xl font-bold">{dashboard?.performance.completionRate ?? 0}%</p>
                )}
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flagged Content Alert */}
      {!isLoadingFlagged && flaggedBoards.length > 0 && (
        <Card className="border-amber-500/50" data-testid="flagged-content-alert">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">Flagged Content ({flaggedBoards.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {flaggedBoards.map((board) => (
              <div
                key={board.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/30 p-3"
                data-testid={`flagged-board-${board.id}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{board.name}</p>
                  <p className="text-xs text-muted-foreground">
                    by {board.ownerName || board.ownerEmail}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onApproveBoard(board.id)}
                    disabled={updateModerationPending}
                    data-testid={`button-approve-board-${board.id}`}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRejectBoard(board.id)}
                    disabled={updateModerationPending}
                    data-testid={`button-reject-board-${board.id}`}
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {isErrorFlagged && (
        <ErrorState message="Failed to load flagged content" onRetry={refetchFlagged} />
      )}

      {/* Two-Column Grid: Platform Totals + Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Platform Totals */}
        <Card data-testid="platform-totals">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Platform Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))
            ) : (
              <>
                <StatRow icon={<Users className="h-4 w-4" />} label="Total Users" value={dashboard?.totals.users ?? 0} />
                <StatRow icon={<Gamepad2 className="h-4 w-4" />} label="Total Sessions" value={dashboard?.totals.sessions ?? 0} />
                <StatRow icon={<Grid3X3 className="h-4 w-4" />} label="BlitzGrid Boards" value={dashboard?.totals.boards ?? 0} />
                <StatRow icon={<Grid3X3 className="h-4 w-4" />} label="BlitzGrid Questions" value={dashboard?.totals.blitzgridQuestions ?? 0} />
                <StatRow icon={<ListOrdered className="h-4 w-4" />} label="Sort Circuit Questions" value={dashboard?.totals.sortCircuitQuestions ?? 0} />
                <StatRow icon={<Brain className="h-4 w-4" />} label="PsyOp Questions" value={dashboard?.totals.psyopQuestions ?? 0} />
                <StatRow icon={<Clock className="h-4 w-4" />} label="Past Forward Questions" value={dashboard?.totals.timeWarpQuestions ?? 0} />
                <StatRow icon={<Image className="h-4 w-4" />} label="Meme Prompts" value={dashboard?.totals.memePrompts ?? 0} />
                <StatRow icon={<Image className="h-4 w-4" />} label="Meme Images" value={dashboard?.totals.memeImages ?? 0} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Performance */}
        <Card data-testid="performance-metrics">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))
            ) : (
              <>
                <PerformanceBar label="BlitzGrid Completion" value={dashboard?.performance.completionRate ?? 0} />
                <PerformanceBar label="Sort Circuit Accuracy" value={dashboard?.performance.sortCircuitAccuracy ?? 0} />
                <PerformanceBar label="Sort Circuit Completion" value={dashboard?.performance.sortCircuitCompletionRate ?? 0} />
                <PerformanceBar label="PsyOp Deception Rate" value={dashboard?.performance.psyopDeceptionRate ?? 0} />
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                    <span className="text-muted-foreground">Avg Score</span>
                    <span className="font-medium">{dashboard?.performance.avgScore ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                    <span className="text-muted-foreground">High Score</span>
                    <span className="font-medium">{dashboard?.performance.highScore ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                    <span className="text-muted-foreground">Past Forward Plays</span>
                    <span className="font-medium">{dashboard?.performance.timewarpTotalPlays ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                    <span className="text-muted-foreground">Meme Sessions</span>
                    <span className="font-medium">{dashboard?.performance.memeSessions ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                    <span className="text-muted-foreground">Meme Submissions</span>
                    <span className="font-medium">{dashboard?.performance.memeSubmissions ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                    <span className="text-muted-foreground">Meme Votes</span>
                    <span className="font-medium">{dashboard?.performance.memeVotes ?? 0}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leaderboards */}
      <div>
        <h3 className="text-base font-semibold mb-3">Leaderboards</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <LeaderboardCard
            title="Top Hosts"
            icon={<Crown className="h-4 w-4" />}
            items={(dashboard?.topHostsWeek ?? []).map(h => ({ name: h.name, value: `${h.games} games` }))}
            isLoading={isLoading}
            testId="leaderboard-top-hosts"
          />
          <LeaderboardCard
            title="Popular Grids"
            icon={<Grid3X3 className="h-4 w-4" />}
            items={(dashboard?.popularGridsWeek ?? []).map(g => ({ name: g.name, value: `${g.plays} plays` }))}
            isLoading={isLoading}
            testId="leaderboard-popular-grids"
          />
          <LeaderboardCard
            title="Popular Sort Circuit"
            icon={<ListOrdered className="h-4 w-4" />}
            items={(dashboard?.popularSortCircuitWeek ?? []).map(g => ({ name: g.name, value: `${g.plays} plays` }))}
            isLoading={isLoading}
            testId="leaderboard-sort-circuit"
          />
          <LeaderboardCard
            title="Popular PsyOp"
            icon={<Brain className="h-4 w-4" />}
            items={(dashboard?.popularPsyopWeek ?? []).map(g => ({ name: g.name, value: `${g.plays} plays` }))}
            isLoading={isLoading}
            testId="leaderboard-psyop"
          />
          <LeaderboardCard
            title="Past Forward"
            icon={<Clock className="h-4 w-4" />}
            items={(dashboard?.popularTimewarpWeek ?? []).map(g => ({ name: g.name, value: `${g.plays} plays` }))}
            isLoading={isLoading}
            testId="leaderboard-past-forward"
          />
          <LeaderboardCard
            title="Popular Meme"
            icon={<Image className="h-4 w-4" />}
            items={(dashboard?.popularMemeWeek ?? []).map(g => ({ name: g.name, value: `${g.plays} plays` }))}
            isLoading={isLoading}
            testId="leaderboard-meme"
          />
        </div>
      </div>

      {/* Activity Timeline */}
      <Card data-testid="activity-timeline">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (dashboard?.recentActivity ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
          ) : (
            <div className="relative space-y-0">
              {(dashboard?.recentActivity ?? []).slice(0, 15).map((session, idx) => (
                <div
                  key={session.id}
                  className="flex items-start gap-3 py-2.5"
                  data-testid={`activity-item-${session.id}`}
                >
                  <div className="flex flex-col items-center pt-1">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${getStatusColor(session.state)}`} />
                    {idx < (dashboard?.recentActivity ?? []).slice(0, 15).length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1 min-h-[16px]" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">{getModeIcon(session.mode)}</span>
                    <span className="text-sm font-mono font-medium" data-testid={`activity-code-${session.id}`}>{session.code}</span>
                    <Badge variant="secondary" className="text-xs">
                      {getGameModeLabel(session.mode ?? null)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {session.state}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatRelativeDate(session.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row: Announcements + Data Export */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Announcements */}
        <Card className="lg:col-span-2" data-testid="announcements-section">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Announcements</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
              data-testid="button-new-announcement"
            >
              <Megaphone className="mr-1 h-3.5 w-3.5" />
              {showAnnouncementForm ? "Cancel" : "New Announcement"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {showAnnouncementForm && (
              <div className="space-y-3 rounded-md border p-4" data-testid="announcement-form">
                <Input
                  placeholder="Title"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  data-testid="input-announcement-title"
                />
                <Textarea
                  placeholder="Message"
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  className="resize-none"
                  data-testid="input-announcement-message"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={announcementType} onValueChange={setAnnouncementType}>
                    <SelectTrigger className="w-32" data-testid="select-announcement-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleCreateAnnouncement}
                    disabled={!announcementTitle.trim() || !announcementMessage.trim()}
                    data-testid="button-submit-announcement"
                  >
                    <Send className="mr-1 h-3.5 w-3.5" />
                    Publish
                  </Button>
                </div>
              </div>
            )}

            {isErrorAnnouncements ? (
              <ErrorState message="Failed to load announcements" onRetry={refetchAnnouncements} />
            ) : isLoadingAnnouncements ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No announcements yet</p>
            ) : (
              announcements.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-md bg-muted/30 p-3"
                  data-testid={`announcement-${a.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{a.title}</p>
                      <Badge variant="secondary" className="text-xs">{a.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{a.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatRelativeDate(a.createdAt)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteAnnouncement(a.id)}
                    disabled={deleteAnnouncementPending}
                    data-testid={`button-delete-announcement-${a.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card data-testid="data-export-section">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Data Export</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Export all platform data including users, sessions, boards, and analytics.
            </p>
            <Button
              onClick={onExportData}
              disabled={isExporting}
              data-testid="button-export-data"
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export Data"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap rounded-md bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function PerformanceBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted/50">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function LeaderboardCard({
  title,
  icon,
  items,
  isLoading,
  testId,
}: {
  title: string;
  icon: React.ReactNode;
  items: { name: string; value: string }[];
  isLoading: boolean;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No data yet</p>
        ) : (
          <ol className="space-y-1.5">
            {items.slice(0, 5).map((item, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between gap-2 flex-wrap text-sm"
                data-testid={`${testId}-item-${idx}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-muted-foreground w-4 text-right">{idx + 1}.</span>
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{item.value}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
