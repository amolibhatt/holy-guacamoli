import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Shield, Trash2, TrendingUp, TrendingDown,
  Gamepad2, Clock, Activity, ListOrdered, Grid3X3,
  Search, RefreshCw, ChevronDown, ChevronRight, Star,
  Megaphone, Flag, Download, Send, User, Play, Image, Brain,
  Zap, Crown, Target, Eye, EyeOff, Check, X, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  
  // UI state
  const [globalSearch, setGlobalSearch] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteBoardId, setDeleteBoardId] = useState<number | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  
  // Section visibility
  const [showUsers, setShowUsers] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [contentTab, setContentTab] = useState<'blitzgrid' | 'sequence' | 'psyop'>('blitzgrid');
  
  // Announcement form
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementType, setAnnouncementType] = useState<"info" | "warning" | "success">("info");
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  
  const [isExporting, setIsExporting] = useState(false);

  // Queries
  const { data: dashboard, isLoading: isLoadingDashboard, isError: isErrorDashboard, refetch: refetchDashboard } = useQuery<ComprehensiveDashboard>({
    queryKey: ['/api/super-admin/dashboard'],
    refetchInterval: 30000,
  });

  const { data: allUsers = [], isLoading: isLoadingUsers, isError: isErrorUsers, refetch: refetchUsers } = useQuery<UserWithStats[]>({
    queryKey: ['/api/super-admin/users'],
    enabled: showUsers || globalSearch.length > 0,
  });

  const { data: allSessions = [], isLoading: isLoadingSessions, isError: isErrorSessions, refetch: refetchSessions } = useQuery<GameSessionDetailed[]>({
    queryKey: ['/api/super-admin/sessions'],
    enabled: showSessions || globalSearch.length > 0,
  });

  const { data: gameTypes = [], isLoading: isLoadingGameTypes, isError: isErrorGameTypes, refetch: refetchGameTypes } = useQuery<GameType[]>({
    queryKey: ['/api/super-admin/game-types'],
    enabled: showGames,
  });

  const { data: flaggedBoards = [], isError: isErrorFlagged } = useQuery<Board[]>({
    queryKey: ['/api/super-admin/boards/flagged'],
  });

  const { data: allBoards = [], isLoading: isLoadingBoards, isError: isErrorBoards, refetch: refetchBoards } = useQuery<BoardWithOwner[]>({
    queryKey: ['/api/super-admin/boards'],
    enabled: showContent || globalSearch.length > 0,
  });

  const { data: announcements = [], isError: isErrorAnnouncements } = useQuery<Announcement[]>({
    queryKey: ['/api/super-admin/announcements'],
  });

  const { data: sequenceQuestions = [], isLoading: isLoadingSequence, isError: isErrorSequence, refetch: refetchSequence } = useQuery<SequenceQuestionWithCreator[]>({
    queryKey: ['/api/super-admin/questions/sequence'],
    enabled: showContent && contentTab === 'sequence',
  });

  const { data: psyopQuestions = [], isLoading: isLoadingPsyop, isError: isErrorPsyop, refetch: refetchPsyop } = useQuery<PsyopQuestionWithCreator[]>({
    queryKey: ['/api/super-admin/questions/psyop'],
    enabled: showContent && contentTab === 'psyop',
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

  // Helpers
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

  // Global search filtering
  const searchLower = globalSearch.toLowerCase().trim();
  
  const filteredUsers = searchLower ? allUsers.filter(u => {
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    return u.email.toLowerCase().includes(searchLower) || fullName.includes(searchLower);
  }) : [];

  const filteredSessions = searchLower ? allSessions.filter(s => {
    const hostName = `${s.host?.firstName || ''} ${s.host?.lastName || ''}`.toLowerCase();
    return s.code.toLowerCase().includes(searchLower) ||
      hostName.includes(searchLower) ||
      s.host?.email?.toLowerCase().includes(searchLower) ||
      s.players.some(p => p.name.toLowerCase().includes(searchLower));
  }) : [];

  const filteredBoards = searchLower ? allBoards.filter(b => 
    b.name.toLowerCase().includes(searchLower) ||
    b.ownerEmail?.toLowerCase().includes(searchLower)
  ) : [];

  const hasSearchResults = filteredUsers.length > 0 || filteredSessions.length > 0 || filteredBoards.length > 0;

  // Auth loading/check
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
        <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
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
      <AppHeader minimal backHref="/" title="Command Center" />

      <main className="px-4 py-6 max-w-5xl mx-auto space-y-6">
        
        {/* PULSE - Real-time health at a glance */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-white/70">Platform Pulse</span>
              </div>
              {flaggedBoards.length > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="w-3 h-3 mr-1" />{flaggedBoards.length} need review
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchDashboard()}
              className="text-white/50 hover:text-white"
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {isLoadingDashboard ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : isErrorDashboard ? (
            <Card className="border-destructive/50">
              <CardContent className="py-6 text-center">
                <p className="text-muted-foreground mb-3">Couldn't load dashboard</p>
                <Button variant="outline" size="sm" onClick={() => refetchDashboard()}>Try again</Button>
              </CardContent>
            </Card>
          ) : dashboard && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-white/60 uppercase tracking-wide">Live Now</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{dashboard.realtime.activeGames}</p>
                  <p className="text-xs text-white/50">games in progress</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-white/60 uppercase tracking-wide">Playing</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{dashboard.realtime.activePlayers}</p>
                  <p className="text-xs text-white/50">active players</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-white/60 uppercase tracking-wide">Today</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-white">{dashboard.today.games}</p>
                    <TrendBadge value={dashboard.today.gamesChange} />
                  </div>
                  <p className="text-xs text-white/50">games played</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-white/60 uppercase tracking-wide">Total</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{dashboard.totals.users}</p>
                  <p className="text-xs text-white/50">registered users</p>
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        {/* NEEDS ATTENTION - Flagged content requiring action */}
        {flaggedBoards.length > 0 && (
          <section>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-400">
                  <Flag className="w-5 h-5" />
                  Needs Review ({flaggedBoards.length})
                </CardTitle>
                <CardDescription>Content flagged for moderation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {flaggedBoards.slice(0, 5).map(board => (
                  <div key={board.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{board.name}</p>
                      <p className="text-xs text-muted-foreground">Grid ID: {board.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                        onClick={() => updateModerationMutation.mutate({ boardId: board.id, data: { moderationStatus: 'approved' } })}
                        data-testid={`button-approve-${board.id}`}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => setDeleteBoardId(board.id)}
                        data-testid={`button-reject-${board.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        {/* UNIVERSAL SEARCH */}
        <section>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search users, sessions, or content..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-12 h-12 text-base bg-background/50"
              data-testid="input-global-search"
            />
          </div>

          {/* Search Results */}
          <AnimatePresence>
            {searchLower && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-3"
              >
                {!hasSearchResults && (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No results for "{globalSearch}"
                    </CardContent>
                  </Card>
                )}

                {filteredUsers.length > 0 && (
                  <Card>
                    <CardHeader className="py-3 flex flex-row items-center justify-between gap-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" />Users ({filteredUsers.length})
                      </CardTitle>
                      {filteredUsers.length > 5 && (
                        <Button variant="ghost" size="sm" onClick={() => { setShowUsers(true); setGlobalSearch(''); }}>
                          View all
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {filteredUsers.slice(0, 5).map(u => (
                        <div key={u.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                          <div>
                            <p className="font-medium">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                          <Badge variant={u.role === 'super_admin' ? 'default' : u.role === 'admin' ? 'secondary' : 'outline'}>
                            {u.role}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {filteredSessions.length > 0 && (
                  <Card>
                    <CardHeader className="py-3 flex flex-row items-center justify-between gap-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Play className="w-4 h-4" />Sessions ({filteredSessions.length})
                      </CardTitle>
                      {filteredSessions.length > 5 && (
                        <Button variant="ghost" size="sm" onClick={() => { setShowSessions(true); setGlobalSearch(''); }}>
                          View all
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {filteredSessions.slice(0, 5).map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono">{s.code}</Badge>
                            <div>
                              <p className="text-sm">{s.host?.firstName || s.host?.email || 'Unknown host'}</p>
                              <p className="text-xs text-muted-foreground">{s.playerCount} players</p>
                            </div>
                          </div>
                          <Badge variant={s.state === 'playing' ? 'default' : 'secondary'}>{s.state}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {filteredBoards.length > 0 && (
                  <Card>
                    <CardHeader className="py-3 flex flex-row items-center justify-between gap-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Grid3X3 className="w-4 h-4" />Content ({filteredBoards.length})
                      </CardTitle>
                      {filteredBoards.length > 5 && (
                        <Button variant="ghost" size="sm" onClick={() => { setShowContent(true); setGlobalSearch(''); }}>
                          View all
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {filteredBoards.slice(0, 5).map(b => (
                        <div key={b.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                          <div>
                            <p className="font-medium">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{b.ownerEmail || 'System'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {b.isStarterPack && <Badge variant="secondary"><Star className="w-3 h-3 mr-1" />Starter</Badge>}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* QUICK ACTIONS */}
        <section className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
            className="gap-2"
            data-testid="button-announcement"
          >
            <Megaphone className="w-4 h-4" />
            {showAnnouncementForm ? 'Cancel' : 'Announcement'}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportData}
            disabled={isExporting}
            className="gap-2"
            data-testid="button-export"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export Data'}
          </Button>
        </section>

        {/* Announcement Form */}
        <AnimatePresence>
          {showAnnouncementForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Send Announcement</CardTitle>
                  <CardDescription>Broadcast a message to all users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Title"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    data-testid="input-announcement-title"
                  />
                  <Textarea
                    placeholder="Message..."
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    rows={3}
                    data-testid="input-announcement-message"
                  />
                  <div className="flex items-center gap-3">
                    <Select value={announcementType} onValueChange={(v: any) => setAnnouncementType(v)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => createAnnouncementMutation.mutate({ title: announcementTitle, message: announcementMessage, type: announcementType })}
                      disabled={!announcementTitle.trim() || !announcementMessage.trim() || createAnnouncementMutation.isPending}
                      data-testid="button-send-announcement"
                    >
                      <Send className="w-4 h-4 mr-2" />Send
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Announcements */}
        {announcements.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Active Announcements</span>
            </div>
            <div className="space-y-2">
              {announcements.map(a => (
                <Card key={a.id} className="bg-muted/20">
                  <CardContent className="py-3 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{a.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{a.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={a.type === 'warning' ? 'destructive' : a.type === 'success' ? 'default' : 'secondary'}>
                        {a.type}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteAnnouncementMutation.mutate(a.id)}
                        data-testid={`button-delete-announcement-${a.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* COLLAPSIBLE SECTIONS */}
        <div className="space-y-3">
          
          {/* Users Section */}
          <Collapsible open={showUsers} onOpenChange={setShowUsers}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-400" />
                      Users
                      {dashboard && <Badge variant="secondary" className="ml-2">{dashboard.totals.users}</Badge>}
                    </CardTitle>
                    {showUsers ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {isLoadingUsers ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
                    </div>
                  ) : isErrorUsers ? (
                    <ErrorState message="Couldn't load users" onRetry={() => refetchUsers()} />
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {allUsers.slice(0, 20).map(u => (
                        <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{u.firstName || ''} {u.lastName || ''}</p>
                              <Badge variant={u.role === 'super_admin' ? 'default' : u.role === 'admin' ? 'secondary' : 'outline'} className="text-xs">
                                {u.role}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {u.boardCount} grids • {u.gamesHosted} games hosted • Last login: {formatRelativeDate(u.lastLoginAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select 
                              value={u.role} 
                              onValueChange={(role) => updateRoleMutation.mutate({ userId: u.id, role })}
                            >
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            {u.id !== user?.id && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteUserId(u.id)}
                                data-testid={`button-delete-user-${u.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Sessions Section */}
          <Collapsible open={showSessions} onOpenChange={setShowSessions}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Play className="w-5 h-5 text-green-400" />
                      Sessions
                      {dashboard && <Badge variant="secondary" className="ml-2">{dashboard.totals.sessions}</Badge>}
                    </CardTitle>
                    {showSessions ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {isLoadingSessions ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
                    </div>
                  ) : isErrorSessions ? (
                    <ErrorState message="Couldn't load sessions" onRetry={() => refetchSessions()} />
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {allSessions.slice(0, 20).map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono text-base">{s.code}</Badge>
                            <div>
                              <p className="font-medium">
                                {s.host?.firstName && s.host?.lastName 
                                  ? `${s.host.firstName} ${s.host.lastName}`
                                  : s.host?.email || 'Unknown host'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {s.playerCount} players • {formatRelativeDate(s.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={s.state === 'playing' ? 'default' : s.state === 'waiting' ? 'secondary' : 'outline'}>
                              {s.state}
                            </Badge>
                            {s.winner && (
                              <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                                <Crown className="w-3 h-3 mr-1" />{s.winner.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Games Section */}
          <Collapsible open={showGames} onOpenChange={setShowGames}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Gamepad2 className="w-5 h-5 text-purple-400" />
                      Game Controls
                    </CardTitle>
                    {showGames ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {isLoadingGameTypes ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
                    </div>
                  ) : isErrorGameTypes ? (
                    <ErrorState message="Couldn't load game types" onRetry={() => refetchGameTypes()} />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {gameTypes.map(game => {
                        const Icon = getGameIcon(game.slug);
                        return (
                          <Card key={game.id} className="bg-muted/20">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center
                                  ${game.slug === 'blitzgrid' ? 'from-rose-500 to-fuchsia-500' :
                                    game.slug === 'sequence_squeeze' ? 'from-emerald-500 to-cyan-500' :
                                    game.slug === 'psyop' ? 'from-violet-500 to-indigo-500' : 'from-gray-500 to-slate-500'}`}>
                                  <Icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className="font-medium">{game.displayName}</p>
                                  <p className="text-xs text-muted-foreground">{game.slug}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Status</span>
                                <Select
                                  value={game.status}
                                  onValueChange={(status: GameStatus) => updateGameTypeMutation.mutate({ id: game.id, data: { status } })}
                                >
                                  <SelectTrigger className="w-32 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="coming_soon">Coming Soon</SelectItem>
                                    <SelectItem value="hidden">Hidden</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Content Section - All Game Types */}
          <Collapsible open={showContent} onOpenChange={setShowContent}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-400" />
                      Content & Starter Packs
                      {dashboard && <Badge variant="secondary" className="ml-2">{dashboard.totals.starterPacks}</Badge>}
                    </CardTitle>
                    {showContent ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-4">
                    Starter packs are automatically given to new users. Manage content for each game type.
                  </p>
                  
                  {/* Content Tabs */}
                  <div className="flex gap-2 mb-4">
                    <Button
                      size="sm"
                      variant={contentTab === 'blitzgrid' ? 'default' : 'outline'}
                      onClick={() => setContentTab('blitzgrid')}
                      className="gap-2"
                    >
                      <Grid3X3 className="w-4 h-4" />BlitzGrid
                      {dashboard && <Badge variant="secondary" className="ml-1">{dashboard.totals.blitzgridQuestions}</Badge>}
                    </Button>
                    <Button
                      size="sm"
                      variant={contentTab === 'sequence' ? 'default' : 'outline'}
                      onClick={() => setContentTab('sequence')}
                      className="gap-2"
                    >
                      <ListOrdered className="w-4 h-4" />Sort Circuit
                      {dashboard && <Badge variant="secondary" className="ml-1">{dashboard.totals.sortCircuitQuestions}</Badge>}
                    </Button>
                    <Button
                      size="sm"
                      variant={contentTab === 'psyop' ? 'default' : 'outline'}
                      onClick={() => setContentTab('psyop')}
                      className="gap-2"
                    >
                      <Brain className="w-4 h-4" />PsyOp
                      {dashboard && <Badge variant="secondary" className="ml-1">{dashboard.totals.psyopQuestions}</Badge>}
                    </Button>
                  </div>

                  {/* BlitzGrid Grids */}
                  {contentTab === 'blitzgrid' && (
                    isLoadingBoards ? (
                      <div className="space-y-2">
                        {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
                      </div>
                    ) : isErrorBoards ? (
                      <ErrorState message="Couldn't load grids" onRetry={() => refetchBoards()} />
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {allBoards
                          .filter(b => b.theme === 'blitzgrid')
                          .slice(0, 30)
                          .map(board => (
                            <div key={board.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{board.name}</p>
                                  {board.isStarterPack && (
                                    <Badge variant="default" className="bg-amber-500">
                                      <Star className="w-3 h-3 mr-1" />Starter
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {board.categoryCount} categories • {board.questionCount} questions • by {board.ownerEmail || 'System'}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant={board.isStarterPack ? "default" : "outline"}
                                onClick={() => toggleStarterPackMutation.mutate({ boardId: board.id, isStarterPack: !board.isStarterPack })}
                                disabled={toggleStarterPackMutation.isPending}
                                data-testid={`button-toggle-starter-${board.id}`}
                              >
                                {board.isStarterPack ? (
                                  <><Check className="w-4 h-4 mr-1" />Active</>
                                ) : (
                                  <><Star className="w-4 h-4 mr-1" />Make Starter</>
                                )}
                              </Button>
                            </div>
                          ))}
                      </div>
                    )
                  )}

                  {/* Sequence/Sort Circuit Questions */}
                  {contentTab === 'sequence' && (
                    isLoadingSequence ? (
                      <div className="space-y-2">
                        {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
                      </div>
                    ) : isErrorSequence ? (
                      <ErrorState message="Couldn't load questions" onRetry={() => refetchSequence()} />
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {sequenceQuestions.slice(0, 30).map(q => (
                          <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{q.title}</p>
                                {q.isStarterPack && (
                                  <Badge variant="default" className="bg-amber-500">
                                    <Star className="w-3 h-3 mr-1" />Starter
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {q.category || 'No category'} • by {q.creator?.email || 'Unknown'}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant={q.isStarterPack ? "default" : "outline"}
                              onClick={() => toggleSequenceStarterPackMutation.mutate({ questionId: q.id, isStarterPack: !q.isStarterPack })}
                              disabled={toggleSequenceStarterPackMutation.isPending}
                              data-testid={`button-toggle-sequence-${q.id}`}
                            >
                              {q.isStarterPack ? (
                                <><Check className="w-4 h-4 mr-1" />Active</>
                              ) : (
                                <><Star className="w-4 h-4 mr-1" />Make Starter</>
                              )}
                            </Button>
                          </div>
                        ))}
                        {sequenceQuestions.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No Sort Circuit questions yet</p>
                        )}
                      </div>
                    )
                  )}

                  {/* PsyOp Questions */}
                  {contentTab === 'psyop' && (
                    isLoadingPsyop ? (
                      <div className="space-y-2">
                        {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
                      </div>
                    ) : isErrorPsyop ? (
                      <ErrorState message="Couldn't load questions" onRetry={() => refetchPsyop()} />
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {psyopQuestions.slice(0, 30).map(q => (
                          <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{q.factText}</p>
                                {q.isStarterPack && (
                                  <Badge variant="default" className="bg-amber-500">
                                    <Star className="w-3 h-3 mr-1" />Starter
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Answer: {q.correctAnswer} • {q.category || 'No category'} • by {q.creator?.email || 'Unknown'}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant={q.isStarterPack ? "default" : "outline"}
                              onClick={() => togglePsyopStarterPackMutation.mutate({ questionId: q.id, isStarterPack: !q.isStarterPack })}
                              disabled={togglePsyopStarterPackMutation.isPending}
                              data-testid={`button-toggle-psyop-${q.id}`}
                            >
                              {q.isStarterPack ? (
                                <><Check className="w-4 h-4 mr-1" />Active</>
                              ) : (
                                <><Star className="w-4 h-4 mr-1" />Make Starter</>
                              )}
                            </Button>
                          </div>
                        ))}
                        {psyopQuestions.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No PsyOp questions yet</p>
                        )}
                      </div>
                    )
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Analytics Section */}
          <Collapsible open={showAnalytics} onOpenChange={setShowAnalytics}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-cyan-400" />
                      Analytics & Performance
                    </CardTitle>
                    {showAnalytics ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-6">
                  {dashboard ? (
                    <>
                      {/* Platform Totals */}
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Platform Totals</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 rounded-lg bg-muted/30 text-center">
                            <p className="text-xl font-bold">{dashboard.totals.users}</p>
                            <p className="text-xs text-muted-foreground">Users</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30 text-center">
                            <p className="text-xl font-bold">{dashboard.totals.sessions}</p>
                            <p className="text-xs text-muted-foreground">Sessions</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30 text-center">
                            <p className="text-xl font-bold">{dashboard.totals.boards}</p>
                            <p className="text-xs text-muted-foreground">Grids</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30 text-center">
                            <p className="text-xl font-bold">{dashboard.totals.starterPacks}</p>
                            <p className="text-xs text-muted-foreground">Starter Packs</p>
                          </div>
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Performance</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 rounded-lg bg-muted/30 text-center">
                            <p className="text-xl font-bold">{dashboard.performance.avgScore}</p>
                            <p className="text-xs text-muted-foreground">Avg Score</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30 text-center">
                            <p className="text-xl font-bold">{dashboard.performance.highScore}</p>
                            <p className="text-xs text-muted-foreground">High Score</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30 text-center">
                            <p className="text-xl font-bold">{dashboard.performance.completionRate}%</p>
                            <p className="text-xs text-muted-foreground">Completion Rate</p>
                          </div>
                        </div>
                      </div>

                      {/* This Week */}
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">This Week</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 rounded-lg bg-muted/30 text-center">
                            <p className="text-xl font-bold">{dashboard.week.games}</p>
                            <p className="text-xs text-muted-foreground">Games</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30 text-center">
                            <p className="text-xl font-bold">{dashboard.week.players}</p>
                            <p className="text-xs text-muted-foreground">Players</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30 text-center">
                            <p className="text-xl font-bold">{dashboard.week.newUsers}</p>
                            <p className="text-xs text-muted-foreground">New Users</p>
                          </div>
                        </div>
                      </div>

                      {/* Top Hosts & Popular Grids */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {dashboard.topHostsWeek.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Top Hosts This Week</h4>
                            <div className="space-y-2">
                              {dashboard.topHostsWeek.slice(0, 5).map((host, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30">
                                  <div className="flex items-center gap-2">
                                    {i === 0 && <Crown className="w-4 h-4 text-amber-400" />}
                                    <span className="text-sm">{host.name}</span>
                                  </div>
                                  <Badge variant="secondary">{host.games} games</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {dashboard.popularGridsWeek.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Popular Grids This Week</h4>
                            <div className="space-y-2">
                              {dashboard.popularGridsWeek.slice(0, 5).map((grid, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30">
                                  <div className="flex items-center gap-2">
                                    {i === 0 && <Target className="w-4 h-4 text-rose-400" />}
                                    <span className="text-sm truncate">{grid.name}</span>
                                  </div>
                                  <Badge variant="secondary">{grid.plays} plays</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Users by Role */}
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Users by Role</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(dashboard.usersByRole).map(([role, count]) => (
                            <Badge key={role} variant="outline" className="text-sm">
                              {role}: {count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : isErrorDashboard ? (
                    <ErrorState message="Couldn't load analytics" onRetry={() => refetchDashboard()} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Loading analytics...</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Delete User Dialog */}
        <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this user?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the user and all their content. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => deleteUserId && deleteUserMutation.mutate(deleteUserId)}
                disabled={deleteUserMutation.isPending}
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
              <AlertDialogTitle>Delete this content?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the grid and all its questions. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => deleteBoardId && deleteBoardMutation.mutate(deleteBoardId)}
                disabled={deleteBoardMutation.isPending}
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
