import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Users, Shield, Trash2, TrendingUp, TrendingDown,
  Gamepad2, Clock, Activity, ListOrdered, Grid3X3,
  Search, RefreshCw, Star, Megaphone, Download, 
  Send, User, Play, Image, Brain, Zap, Crown, Target, 
  Eye, EyeOff, Check, X, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GameStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import type { Board, GameType } from "@shared/schema";
import type { SafeUser } from "@shared/models/auth";

interface SessionPlayer {
  id: number;
  name: string;
  avatar: string;
  score: number;
  isConnected: boolean;
  joinedAt: string;
}

interface UserSession {
  id: number;
  code: string;
  state: string;
  currentMode: string;
  createdAt: string;
  updatedAt: string;
  playerCount: number;
  players: SessionPlayer[];
  winner: SessionPlayer | null;
}

interface UserBoard {
  id: number;
  name: string;
  theme: string | null;
  createdAt: string;
}

interface UserWithStats extends SafeUser {
  boardCount: number;
  boards: UserBoard[];
  gamesHosted: number;
  recentSessions: UserSession[];
}

interface BoardWithOwner extends Board {
  ownerEmail: string;
  ownerName: string;
  questionCount: number;
  categoryCount: number;
}

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
}

interface GameSessionDetailed {
  id: number;
  code: string;
  hostId: string;
  currentMode: string | null;
  state: string;
  createdAt: string;
  updatedAt: string;
  host: { id: string; firstName: string | null; lastName: string | null; email: string | null };
  players: { id: number; name: string; avatar: string; score: number; isConnected: boolean; joinedAt: string }[];
  playerCount: number;
  winner: { id: number; name: string; score: number } | null;
}

interface ComprehensiveDashboard {
  realtime: { activeGames: number; activePlayers: number };
  today: { games: number; players: number; newUsers: number; gamesChange: number; playersChange: number; usersChange: number };
  week: { games: number; players: number; newUsers: number };
  totals: { users: number; sessions: number; boards: number; blitzgridQuestions: number; sortCircuitQuestions: number; psyopQuestions: number; starterPacks: number; flaggedContent: number };
  usersByRole: Record<string, number>;
  recentActivity: { id: number; code: string; state: string; createdAt: string }[];
  topHostsWeek: { name: string; games: number }[];
  popularGridsWeek: { name: string; plays: number }[];
  performance: { avgScore: number; highScore: number; completionRate: number };
}

interface QuestionCreator {
  id: string;
  username: string;
  email: string | null;
}

interface SequenceQuestionWithCreator {
  id: number;
  userId: string | null;
  title: string;
  category: string | null;
  isActive: boolean;
  isStarterPack: boolean;
  createdAt: string;
  creator: QuestionCreator | null;
}

interface PsyopQuestionWithCreator {
  id: number;
  userId: string | null;
  factText: string;
  correctAnswer: string;
  category: string | null;
  isActive: boolean;
  isStarterPack: boolean;
  createdAt: string;
  creator: QuestionCreator | null;
}

export default function SuperAdmin() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [userSearch, setUserSearch] = useState("");
  const [contentSearch, setContentSearch] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteBoardId, setDeleteBoardId] = useState<number | null>(null);
  const [contentTab, setContentTab] = useState<'games' | 'blitzgrid' | 'sequence' | 'psyop'>('games');
  
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementType, setAnnouncementType] = useState<"info" | "warning" | "success">("info");
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Queries
  const { data: dashboard, isLoading: isLoadingDashboard, isError: isErrorDashboard, refetch: refetchDashboard } = useQuery<ComprehensiveDashboard>({
    queryKey: ['/api/super-admin/dashboard'],
    enabled: activeTab === 'overview',
    refetchInterval: activeTab === 'overview' ? 30000 : false,
  });

  const { data: allUsers = [], isLoading: isLoadingUsers, isError: isErrorUsers, refetch: refetchUsers } = useQuery<UserWithStats[]>({
    queryKey: ['/api/super-admin/users'],
    enabled: activeTab === 'users',
  });

  const { data: allSessions = [], isLoading: isLoadingSessions, isError: isErrorSessions, refetch: refetchSessions } = useQuery<GameSessionDetailed[]>({
    queryKey: ['/api/super-admin/sessions'],
    enabled: activeTab === 'sessions',
  });

  const { data: gameTypes = [], isLoading: isLoadingGameTypes, isError: isErrorGameTypes, refetch: refetchGameTypes } = useQuery<GameType[]>({
    queryKey: ['/api/super-admin/game-types'],
    enabled: activeTab === 'content',
  });

  const { data: flaggedBoards = [], isLoading: isLoadingFlagged, isError: isErrorFlagged, refetch: refetchFlagged } = useQuery<Board[]>({
    queryKey: ['/api/super-admin/boards/flagged'],
    enabled: activeTab === 'overview',
  });

  const { data: allBoards = [], isLoading: isLoadingBoards, isError: isErrorBoards, refetch: refetchBoards } = useQuery<BoardWithOwner[]>({
    queryKey: ['/api/super-admin/boards'],
    enabled: activeTab === 'content',
  });

  const { data: announcements = [], isLoading: isLoadingAnnouncements, isError: isErrorAnnouncements, refetch: refetchAnnouncements } = useQuery<Announcement[]>({
    queryKey: ['/api/super-admin/announcements'],
    enabled: activeTab === 'overview',
  });

  const { data: sequenceQuestions = [], isLoading: isLoadingSequence, isError: isErrorSequence, refetch: refetchSequence } = useQuery<SequenceQuestionWithCreator[]>({
    queryKey: ['/api/super-admin/questions/sequence'],
    enabled: activeTab === 'content' && contentTab === 'sequence',
  });

  const { data: psyopQuestions = [], isLoading: isLoadingPsyop, isError: isErrorPsyop, refetch: refetchPsyop } = useQuery<PsyopQuestionWithCreator[]>({
    queryKey: ['/api/super-admin/questions/psyop'],
    enabled: activeTab === 'content' && contentTab === 'psyop',
  });

  // Mutations
  const updateGameTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { hostEnabled?: boolean; playerEnabled?: boolean; status?: GameStatus } }) => {
      await apiRequest('PATCH', `/api/super-admin/game-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/game-types'] });
      queryClient.invalidateQueries({ queryKey: ['/api/game-types'] });
      toast({ title: "Game updated" });
    },
    onError: () => toast({ title: "Couldn't update game", variant: "destructive" }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/api/super-admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "User deleted" });
      setDeleteUserId(null);
    },
    onError: () => toast({ title: "Couldn't delete user", variant: "destructive" }),
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: number) => {
      await apiRequest('DELETE', `/api/super-admin/boards/${boardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards/flagged'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Content deleted" });
      setDeleteBoardId(null);
    },
    onError: () => toast({ title: "Couldn't delete content", variant: "destructive" }),
  });

  const toggleStarterPackMutation = useMutation({
    mutationFn: async ({ boardId, isStarterPack }: { boardId: number; isStarterPack: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/boards/${boardId}/starter-pack`, { isStarterPack });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Starter pack updated" });
    },
    onError: () => toast({ title: "Couldn't update starter pack", variant: "destructive" }),
  });

  const toggleSequenceStarterPackMutation = useMutation({
    mutationFn: async ({ questionId, isStarterPack }: { questionId: number; isStarterPack: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/questions/sequence/${questionId}/starter-pack`, { isStarterPack });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/sequence'] });
      toast({ title: "Starter pack updated" });
    },
    onError: () => toast({ title: "Couldn't update starter pack", variant: "destructive" }),
  });

  const togglePsyopStarterPackMutation = useMutation({
    mutationFn: async ({ questionId, isStarterPack }: { questionId: number; isStarterPack: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/questions/psyop/${questionId}/starter-pack`, { isStarterPack });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/psyop'] });
      toast({ title: "Starter pack updated" });
    },
    onError: () => toast({ title: "Couldn't update starter pack", variant: "destructive" }),
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: { title: string; message: string; type?: string }) => {
      await apiRequest('POST', '/api/super-admin/announcements', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/announcements'] });
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      setAnnouncementType("info");
      setShowAnnouncementForm(false);
      toast({ title: "Announcement sent" });
    },
    onError: () => toast({ title: "Couldn't send announcement", variant: "destructive" }),
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/super-admin/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/announcements'] });
      toast({ title: "Announcement deleted" });
    },
    onError: () => toast({ title: "Couldn't delete announcement", variant: "destructive" }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest('PATCH', `/api/super-admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Role updated" });
    },
    onError: () => toast({ title: "Couldn't update role", variant: "destructive" }),
  });

  const updateModerationMutation = useMutation({
    mutationFn: async ({ boardId, data }: { boardId: number; data: { moderationStatus: string } }) => {
      await apiRequest('PATCH', `/api/super-admin/boards/${boardId}/moderation`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards/flagged'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Content reviewed" });
    },
    onError: () => toast({ title: "Couldn't update status", variant: "destructive" }),
  });

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/super-admin/export', { credentials: 'include' });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `platform-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Data exported" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const formatRelativeDate = (dateStr: string | Date | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getGameIcon = (slug: string) => {
    switch (slug) {
      case 'blitzgrid': return Grid3X3;
      case 'sequence_squeeze': return ListOrdered;
      case 'psyop': return Brain;
      case 'timewarp': return Clock;
      case 'memenoharm': return Image;
      default: return Gamepad2;
    }
  };

  const getHostDisplay = (host: GameSessionDetailed['host']) => {
    if (host.firstName || host.lastName) {
      return `${host.firstName || ''} ${host.lastName || ''}`.trim();
    }
    if (host.email) return host.email;
    return `ID: ${host.id.slice(0, 8)}...`;
  };

  // Search filtering
  const filteredUsers = userSearch.trim() 
    ? allUsers.filter(u => {
        const search = userSearch.toLowerCase();
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        return u.email.toLowerCase().includes(search) || fullName.includes(search);
      })
    : allUsers;

  const filteredSessions = sessionSearch.trim()
    ? allSessions.filter(s => {
        const search = sessionSearch.toLowerCase();
        const hostName = `${s.host?.firstName || ''} ${s.host?.lastName || ''}`.toLowerCase();
        return s.code.toLowerCase().includes(search) ||
          hostName.includes(search) ||
          s.host?.email?.toLowerCase().includes(search) ||
          s.players.some(p => p.name.toLowerCase().includes(search));
      })
    : allSessions;

  const filteredBoards = contentSearch.trim() 
    ? allBoards.filter(b => 
        b.name.toLowerCase().includes(contentSearch.toLowerCase()) ||
        b.ownerEmail?.toLowerCase().includes(contentSearch.toLowerCase())
      )
    : allBoards;

  if (isAuthLoading) {
    return (
      <div className="min-h-screen gradient-game flex items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen gradient-game">
        <AppHeader minimal backHref="/" title="Access Denied" />
        <main className="px-4 py-8 max-w-md mx-auto text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold text-white mb-2">Super Admin Only</h1>
          <p className="text-white/70 mb-6">This area requires super admin privileges.</p>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </main>
      </div>
    );
  }

  const ErrorState = ({ message = "Couldn't load data", onRetry }: { message?: string; onRetry?: () => void }) => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <RefreshCw className="w-8 h-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} data-testid="button-retry">Try again</Button>
      )}
    </div>
  );

  const TrendBadge = ({ value }: { value: number }) => {
    if (value === 0) return null;
    return (
      <span className={`text-xs font-medium ${value > 0 ? 'text-green-400' : 'text-red-400'}`}>
        {value > 0 ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
        {value > 0 ? '+' : ''}{value}
      </span>
    );
  };

  return (
    <div className="min-h-screen gradient-game">
      <AppHeader minimal backHref="/" title="Super Admin" />

      <main className="px-4 py-6 max-w-5xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-black/20">
            <TabsTrigger value="overview" className="flex items-center gap-2" data-testid="tab-overview">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2" data-testid="tab-users">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2" data-testid="tab-content">
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline">Content</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2" data-testid="tab-sessions">
              <Play className="w-4 h-4" />
              <span className="hidden sm:inline">Sessions</span>
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB - Pulse + Analytics + Actions */}
          <TabsContent value="overview" className="space-y-6">
            {/* Live Pulse */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <CardTitle className="text-lg">Live Now</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => refetchDashboard()} data-testid="button-refresh-pulse">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingDashboard ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : isErrorDashboard ? (
                  <ErrorState message="Couldn't load stats" onRetry={() => refetchDashboard()} />
                ) : dashboard && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-muted-foreground">Active Games</span>
                      </div>
                      <p className="text-2xl font-bold text-green-400">{dashboard.realtime.activeGames}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-muted-foreground">Active Players</span>
                      </div>
                      <p className="text-2xl font-bold">{dashboard.realtime.activePlayers}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-muted-foreground">Games Today</span>
                      </div>
                      <p className="text-2xl font-bold">{dashboard.today.games}</p>
                      <TrendBadge value={dashboard.today.gamesChange} />
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-muted-foreground">Total Users</span>
                      </div>
                      <p className="text-2xl font-bold">{dashboard.totals.users}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Needs Review */}
            {(isLoadingFlagged || isErrorFlagged || flaggedBoards.length > 0) && (
              <Card className="border-amber-500/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <CardTitle className="text-lg">Needs Review</CardTitle>
                    {!isLoadingFlagged && <Badge variant="secondary">{flaggedBoards.length}</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingFlagged ? (
                    <div className="space-y-2">
                      {[1,2].map(i => <Skeleton key={i} className="h-14" />)}
                    </div>
                  ) : isErrorFlagged ? (
                    <ErrorState message="Couldn't load flagged content" onRetry={() => refetchFlagged()} />
                  ) : (
                  <div className="space-y-2">
                    {flaggedBoards.map(board => (
                      <div key={board.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <div>
                          <p className="font-medium">{board.name}</p>
                          <p className="text-xs text-muted-foreground">Flagged for review</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateModerationMutation.mutate({ boardId: board.id, data: { moderationStatus: 'approved' } })}
                            data-testid={`button-approve-${board.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteBoardId(board.id)}
                            data-testid={`button-reject-${board.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Analytics Summary */}
            {isLoadingDashboard && !dashboard ? (
              <div className="grid md:grid-cols-3 gap-4">
                {[1,2,3].map(i => (
                  <Card key={i}>
                    <CardHeader className="pb-2"><Skeleton className="h-4 w-20" /></CardHeader>
                    <CardContent className="space-y-2">
                      {[1,2,3].map(j => <Skeleton key={j} className="h-5 w-full" />)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : isErrorDashboard ? (
              <ErrorState message="Couldn't load analytics" onRetry={() => refetchDashboard()} />
            ) : dashboard && (
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">This Week</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Games</span>
                      <span className="font-bold">{dashboard.week.games}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Players</span>
                      <span className="font-bold">{dashboard.week.players}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">New Users</span>
                      <span className="font-bold">{dashboard.week.newUsers}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Platform Totals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Sessions</span>
                      <span className="font-bold">{dashboard.totals.sessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Grids</span>
                      <span className="font-bold">{dashboard.totals.boards}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Starter Packs</span>
                      <span className="font-bold">{dashboard.totals.starterPacks}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Score</span>
                      <span className="font-bold">{dashboard.performance.avgScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">High Score</span>
                      <span className="font-bold">{dashboard.performance.highScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Completion</span>
                      <span className="font-bold">{dashboard.performance.completionRate}%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Top Hosts & Popular Grids */}
            {isLoadingDashboard && !dashboard ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[1,2].map(i => (
                  <Card key={i}>
                    <CardHeader className="pb-3"><Skeleton className="h-5 w-24" /></CardHeader>
                    <CardContent className="space-y-2">
                      {[1,2,3].map(j => <Skeleton key={j} className="h-10 w-full" />)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : dashboard && !isErrorDashboard && (
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-400" /> Top Hosts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboard.topHostsWeek.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                    ) : (
                      <div className="space-y-2">
                        {dashboard.topHostsWeek.slice(0, 5).map((h, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-muted-foreground w-5">#{i + 1}</span>
                              <span className="text-sm">{h.name}</span>
                            </div>
                            <Badge variant="secondary">{h.games} games</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-400" /> Popular Grids
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboard.popularGridsWeek.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                    ) : (
                      <div className="space-y-2">
                        {dashboard.popularGridsWeek.slice(0, 5).map((g, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-muted-foreground w-5">#{i + 1}</span>
                              <span className="text-sm truncate">{g.name}</span>
                            </div>
                            <Badge variant="secondary">{g.plays} plays</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Megaphone className="w-5 h-5" /> Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAnnouncements ? (
                    <div className="space-y-2">
                      {[1,2].map(i => <Skeleton key={i} className="h-10" />)}
                    </div>
                  ) : isErrorAnnouncements ? (
                    <ErrorState message="Couldn't load announcements" onRetry={() => refetchAnnouncements()} />
                  ) : showAnnouncementForm ? (
                    <div className="space-y-3">
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
                        rows={2}
                        data-testid="input-announcement-message"
                      />
                      <Select value={announcementType} onValueChange={(v) => setAnnouncementType(v as typeof announcementType)}>
                        <SelectTrigger data-testid="select-announcement-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => createAnnouncementMutation.mutate({
                            title: announcementTitle,
                            message: announcementMessage,
                            type: announcementType
                          })}
                          disabled={!announcementTitle.trim() || !announcementMessage.trim()}
                          data-testid="button-send-announcement"
                        >
                          <Send className="w-4 h-4 mr-1" /> Send
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAnnouncementForm(false)} data-testid="button-cancel-announcement">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {announcements.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No active announcements</p>
                      ) : (
                        announcements.slice(0, 3).map(a => (
                          <div key={a.id} className="flex items-start justify-between p-2 rounded bg-muted/30">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{a.title}</p>
                              <p className="text-xs text-muted-foreground">{formatRelativeDate(a.createdAt)}</p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteAnnouncementMutation.mutate(a.id)}
                              data-testid={`button-delete-announcement-${a.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowAnnouncementForm(true)}
                        data-testid="button-new-announcement"
                      >
                        <Megaphone className="w-4 h-4 mr-1" /> New Announcement
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Download className="w-5 h-5" /> Data Export
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export all platform data as JSON.
                  </p>
                  <Button
                    onClick={handleExportData}
                    disabled={isExporting}
                    data-testid="button-export-data"
                  >
                    {isExporting ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Exporting...</>
                    ) : (
                      <><Download className="w-4 h-4 mr-2" /> Export All Data</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">All Users</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-9 w-40"
                        data-testid="input-search-users"
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => refetchUsers()} data-testid="button-refresh-users">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="space-y-2">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : isErrorUsers ? (
                  <ErrorState message="Couldn't load users" onRetry={() => refetchUsers()} />
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No users found</p>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : u.email}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Select
                            value={u.role}
                            onValueChange={(role) => updateRoleMutation.mutate({ userId: u.id, role })}
                          >
                            <SelectTrigger className="w-28 h-8" data-testid={`select-role-${u.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteUserId(u.id)}
                            disabled={u.id === user.id}
                            data-testid={`button-delete-user-${u.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONTENT TAB - Games + BlitzGrid + Sort Circuit + PsyOp */}
          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">Content & Games</CardTitle>
                  {contentTab !== 'games' && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={contentSearch}
                        onChange={(e) => setContentSearch(e.target.value)}
                        className="pl-9 w-40"
                        data-testid="input-search-content"
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Content Type Tabs */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={contentTab === 'games' ? 'default' : 'outline'}
                    onClick={() => setContentTab('games')}
                    data-testid="button-content-games"
                  >
                    <Gamepad2 className="w-4 h-4 mr-1" /> Games
                  </Button>
                  <Button
                    size="sm"
                    variant={contentTab === 'blitzgrid' ? 'default' : 'outline'}
                    onClick={() => setContentTab('blitzgrid')}
                    data-testid="button-content-blitzgrid"
                  >
                    <Grid3X3 className="w-4 h-4 mr-1" /> BlitzGrid
                  </Button>
                  <Button
                    size="sm"
                    variant={contentTab === 'sequence' ? 'default' : 'outline'}
                    onClick={() => setContentTab('sequence')}
                    data-testid="button-content-sequence"
                  >
                    <ListOrdered className="w-4 h-4 mr-1" /> Sort Circuit
                  </Button>
                  <Button
                    size="sm"
                    variant={contentTab === 'psyop' ? 'default' : 'outline'}
                    onClick={() => setContentTab('psyop')}
                    data-testid="button-content-psyop"
                  >
                    <Brain className="w-4 h-4 mr-1" /> PsyOp
                  </Button>
                </div>

                {/* Games Control */}
                {contentTab === 'games' && (
                  isLoadingGameTypes ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}
                    </div>
                  ) : isErrorGameTypes ? (
                    <ErrorState message="Couldn't load games" onRetry={() => refetchGameTypes()} />
                  ) : (
                    <div className="space-y-2">
                      {gameTypes.map(game => {
                        const Icon = getGameIcon(game.slug);
                        return (
                          <div key={game.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5" />
                              <div>
                                <p className="font-medium">{game.displayName}</p>
                                <p className="text-xs text-muted-foreground">{game.slug}</p>
                              </div>
                            </div>
                            <Select
                              value={game.status}
                              onValueChange={(status) => updateGameTypeMutation.mutate({
                                id: game.id,
                                data: { status: status as GameStatus }
                              })}
                            >
                              <SelectTrigger className="w-32 h-8" data-testid={`select-game-status-${game.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">
                                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Active</span>
                                </SelectItem>
                                <SelectItem value="hidden">
                                  <span className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> Hidden</span>
                                </SelectItem>
                                <SelectItem value="coming_soon">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Coming Soon</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {/* BlitzGrid Grids */}
                {contentTab === 'blitzgrid' && (
                  isLoadingBoards ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}
                    </div>
                  ) : isErrorBoards ? (
                    <ErrorState message="Couldn't load grids" onRetry={() => refetchBoards()} />
                  ) : filteredBoards.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No grids found</p>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {filteredBoards.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{b.name}</p>
                              {b.isStarterPack && <Badge variant="secondary"><Star className="w-3 h-3 mr-1" /> Starter</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              by {b.ownerName || b.ownerEmail} • {b.categoryCount} cat • {b.questionCount} Q
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant={b.isStarterPack ? 'secondary' : 'outline'}
                              onClick={() => toggleStarterPackMutation.mutate({ boardId: b.id, isStarterPack: !b.isStarterPack })}
                              data-testid={`button-starter-${b.id}`}
                            >
                              <Star className={`w-4 h-4 ${b.isStarterPack ? 'fill-current' : ''}`} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteBoardId(b.id)}
                              data-testid={`button-delete-board-${b.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Sort Circuit Questions */}
                {contentTab === 'sequence' && (
                  isLoadingSequence ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}
                    </div>
                  ) : isErrorSequence ? (
                    <ErrorState message="Couldn't load questions" onRetry={() => refetchSequence()} />
                  ) : sequenceQuestions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No questions found</p>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {sequenceQuestions.map(q => (
                        <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{q.title}</p>
                              {q.isStarterPack && <Badge variant="secondary"><Star className="w-3 h-3 mr-1" /> Starter</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              by {q.creator?.username || 'Unknown'} {q.category && `• ${q.category}`}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant={q.isStarterPack ? 'secondary' : 'outline'}
                            onClick={() => toggleSequenceStarterPackMutation.mutate({ questionId: q.id, isStarterPack: !q.isStarterPack })}
                            data-testid={`button-starter-seq-${q.id}`}
                          >
                            <Star className={`w-4 h-4 ${q.isStarterPack ? 'fill-current' : ''}`} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* PsyOp Questions */}
                {contentTab === 'psyop' && (
                  isLoadingPsyop ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}
                    </div>
                  ) : isErrorPsyop ? (
                    <ErrorState message="Couldn't load questions" onRetry={() => refetchPsyop()} />
                  ) : psyopQuestions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No questions found</p>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {psyopQuestions.map(q => (
                        <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{q.factText}</p>
                              {q.isStarterPack && <Badge variant="secondary"><Star className="w-3 h-3 mr-1" /> Starter</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              by {q.creator?.username || 'Unknown'} {q.category && `• ${q.category}`}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant={q.isStarterPack ? 'secondary' : 'outline'}
                            onClick={() => togglePsyopStarterPackMutation.mutate({ questionId: q.id, isStarterPack: !q.isStarterPack })}
                            data-testid={`button-starter-psyop-${q.id}`}
                          >
                            <Star className={`w-4 h-4 ${q.isStarterPack ? 'fill-current' : ''}`} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SESSIONS TAB */}
          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">Game Sessions</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={sessionSearch}
                        onChange={(e) => setSessionSearch(e.target.value)}
                        className="pl-9 w-40"
                        data-testid="input-search-sessions"
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => refetchSessions()} data-testid="button-refresh-sessions">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingSessions ? (
                  <div className="space-y-2">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : isErrorSessions ? (
                  <ErrorState message="Couldn't load sessions" onRetry={() => refetchSessions()} />
                ) : filteredSessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No sessions found</p>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredSessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="text-center flex-shrink-0">
                            <p className="font-mono font-bold text-lg">{s.code}</p>
                            <Badge variant={s.state === 'active' ? 'default' : 'outline'} className="text-xs">
                              {s.state}
                            </Badge>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {getHostDisplay(s.host)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.playerCount} players • {formatRelativeDate(s.createdAt)}
                            </p>
                          </div>
                        </div>
                        {s.winner && (
                          <Badge variant="secondary" className="flex-shrink-0">
                            <Crown className="w-3 h-3 mr-1" /> {s.winner.name}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete User Dialog */}
        <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the user and all their content.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => deleteUserId && deleteUserMutation.mutate(deleteUserId)}
                disabled={deleteUserMutation.isPending}
                data-testid="button-confirm-delete-user"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Board Dialog */}
        <AlertDialog open={!!deleteBoardId} onOpenChange={() => setDeleteBoardId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Content?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this content.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => deleteBoardId && deleteBoardMutation.mutate(deleteBoardId)}
                disabled={deleteBoardMutation.isPending}
                data-testid="button-confirm-delete-content"
              >
                {deleteBoardMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
