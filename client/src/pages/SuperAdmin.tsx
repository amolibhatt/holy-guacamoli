import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Shield, Trash2, TrendingUp, TrendingDown,
  Gamepad2, Clock, Activity, ListOrdered, Grid3X3,
  Search, RefreshCw, ChevronDown, Star, Trophy,
  Megaphone, Flag, Download, Send, User, Play, Image, Brain,
  BarChart3, Zap, Crown, Target, Calendar, Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface BlitzgridQuestionWithCreator {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
  imageUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  categoryId: number;
  category: { id: number; name: string } | null;
  board: { id: number; name: string; userId: string | null } | null;
  creator: QuestionCreator | null;
}

interface BlitzgridGrid {
  id: number;
  name: string;
  description: string | null;
  theme: string | null;
  userId: string | null;
  isStarterPack: boolean;
  isGlobal: boolean;
  createdAt: string;
  ownerEmail: string;
  ownerName: string | null;
  categoryCount: number;
  questionCount: number;
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

export default function SuperAdmin() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteBoardId, setDeleteBoardId] = useState<number | null>(null);
  const [expandedGameSlug, setExpandedGameSlug] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementType, setAnnouncementType] = useState<"info" | "warning" | "success">("info");
  const [isExporting, setIsExporting] = useState(false);
  const [sequenceSearch, setSequenceSearch] = useState("");
  const [psyopSearch, setPsyopSearch] = useState("");
  const [blitzgridSearch, setBlitzgridSearch] = useState("");

  const { data: dashboard, isLoading: isLoadingDashboard, isError: isErrorDashboard, refetch: refetchDashboard } = useQuery<ComprehensiveDashboard>({
    queryKey: ['/api/super-admin/dashboard'],
    refetchInterval: 30000,
  });

  const { data: allUsers = [], isLoading: isLoadingUsers, isError: isErrorUsers } = useQuery<UserWithStats[]>({
    queryKey: ['/api/super-admin/users'],
  });

  const { data: allSessions = [], isLoading: isLoadingSessions, isError: isErrorSessions } = useQuery<GameSessionDetailed[]>({
    queryKey: ['/api/super-admin/sessions'],
  });

  const { data: gameTypes = [], isLoading: isLoadingGameTypes, isError: isErrorGameTypes } = useQuery<GameType[]>({
    queryKey: ['/api/super-admin/game-types'],
  });

  const { data: announcements = [], isLoading: isLoadingAnnouncements, isError: isErrorAnnouncements } = useQuery<Announcement[]>({
    queryKey: ['/api/super-admin/announcements'],
  });

  const { data: flaggedBoards = [], isError: isErrorFlagged } = useQuery<Board[]>({
    queryKey: ['/api/super-admin/boards/flagged'],
  });

  const { data: sequenceQuestions = [], isLoading: isLoadingSequenceQuestions } = useQuery<SequenceQuestionWithCreator[]>({
    queryKey: ['/api/super-admin/questions/sequence'],
    enabled: expandedGameSlug === 'sequence_squeeze',
  });

  const { data: psyopQuestions = [], isLoading: isLoadingPsyopQuestions } = useQuery<PsyopQuestionWithCreator[]>({
    queryKey: ['/api/super-admin/questions/psyop'],
    enabled: expandedGameSlug === 'psyop',
  });

  const { data: blitzgridQuestions = [], isLoading: isLoadingBlitzgridQuestions } = useQuery<BlitzgridQuestionWithCreator[]>({
    queryKey: ['/api/super-admin/questions/blitzgrid'],
    enabled: expandedGameSlug === 'blitzgrid',
  });

  const { data: allBoards = [], isLoading: isLoadingBlitzgridGrids } = useQuery<BoardWithOwner[]>({
    queryKey: ['/api/super-admin/boards'],
    enabled: expandedGameSlug === 'blitzgrid',
  });

  const blitzgridGrids = allBoards.filter(b => b.theme === 'blitzgrid');

  const updateGameTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { hostEnabled?: boolean; playerEnabled?: boolean; status?: GameStatus } }) => {
      await apiRequest('PATCH', `/api/super-admin/game-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/game-types'] });
      queryClient.invalidateQueries({ queryKey: ['/api/game-types'] });
      queryClient.invalidateQueries({ queryKey: ['/api/game-types/homepage'] });
      toast({ title: "Game updated" });
    },
    onError: () => {
      toast({ title: "Couldn't update game", description: "Please try again.", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/api/super-admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "User deleted successfully" });
      setDeleteUserId(null);
    },
    onError: () => {
      toast({ title: "Couldn't delete user", description: "Please try again.", variant: "destructive" });
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: number) => {
      await apiRequest('DELETE', `/api/super-admin/boards/${boardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards/flagged'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Grid deleted successfully" });
      setDeleteBoardId(null);
    },
    onError: () => {
      toast({ title: "Couldn't delete grid", description: "Please try again.", variant: "destructive" });
    },
  });

  const toggleStarterPackMutation = useMutation({
    mutationFn: async ({ boardId, isStarterPack }: { boardId: number; isStarterPack: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/boards/${boardId}/starter-pack`, { isStarterPack });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Starter pack status updated" });
    },
    onError: () => {
      toast({ title: "Couldn't update starter pack status", description: "Please try again.", variant: "destructive" });
    },
  });

  const toggleSequenceStarterPackMutation = useMutation({
    mutationFn: async ({ questionId, isStarterPack }: { questionId: number; isStarterPack: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/questions/sequence/${questionId}/starter-pack`, { isStarterPack });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/sequence'] });
      toast({ title: "Starter pack status updated" });
    },
    onError: () => {
      toast({ title: "Couldn't update starter pack status", variant: "destructive" });
    },
  });

  const togglePsyopStarterPackMutation = useMutation({
    mutationFn: async ({ questionId, isStarterPack }: { questionId: number; isStarterPack: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/questions/psyop/${questionId}/starter-pack`, { isStarterPack });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/psyop'] });
      toast({ title: "Starter pack status updated" });
    },
    onError: () => {
      toast({ title: "Couldn't update starter pack status", variant: "destructive" });
    },
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
      toast({ title: "Announcement sent" });
    },
    onError: () => {
      toast({ title: "Couldn't create announcement", variant: "destructive" });
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/super-admin/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/announcements'] });
      toast({ title: "Announcement deleted" });
    },
    onError: () => {
      toast({ title: "Couldn't delete announcement", variant: "destructive" });
    },
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
    onError: () => {
      toast({ title: "Couldn't update role", variant: "destructive" });
    },
  });

  const updateModerationMutation = useMutation({
    mutationFn: async ({ boardId, data }: { boardId: number; data: { moderationStatus: string } }) => {
      await apiRequest('PATCH', `/api/super-admin/boards/${boardId}/moderation`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards/flagged'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Moderation status updated" });
    },
    onError: () => {
      toast({ title: "Couldn't update moderation status", variant: "destructive" });
    },
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

  const getGameGradient = (slug: string) => {
    switch (slug) {
      case 'blitzgrid': return 'from-rose-500 to-fuchsia-500';
      case 'sequence_squeeze': return 'from-emerald-500 to-cyan-500';
      case 'psyop': return 'from-violet-500 to-indigo-500';
      case 'timewarp': return 'from-sky-500 to-blue-500';
      case 'memenoharm': return 'from-amber-500 to-orange-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

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
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <RefreshCw className="w-6 h-6 text-destructive" />
      </div>
      <p className="text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );

  const TrendIndicator = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
    if (value === 0) return null;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${value > 0 ? 'text-green-500' : 'text-red-500'}`}>
        {value > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {value > 0 ? '+' : ''}{value}{suffix}
      </span>
    );
  };

  const StatCard = ({ title, value, change, icon: Icon, color, subtitle }: { 
    title: string; value: number | string; change?: number; icon: any; color: string; subtitle?: string 
  }) => (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5`} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold">{value}</p>
              {change !== undefined && <TrendIndicator value={change} />}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const filteredSessions = allSessions.filter(s => {
    if (!sessionSearch.trim()) return true;
    const searchLower = sessionSearch.toLowerCase();
    const hostName = `${s.host?.firstName || ''} ${s.host?.lastName || ''}`.toLowerCase();
    return (
      s.code.toLowerCase().includes(searchLower) ||
      hostName.includes(searchLower) ||
      s.host?.email?.toLowerCase().includes(searchLower) ||
      s.players.some(p => p.name.toLowerCase().includes(searchLower))
    );
  });

  const filteredUsers = allUsers.filter(u => {
    if (!userSearch.trim()) return true;
    const searchLower = userSearch.toLowerCase();
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    return (
      u.email.toLowerCase().includes(searchLower) ||
      u.firstName?.toLowerCase().includes(searchLower) ||
      u.lastName?.toLowerCase().includes(searchLower) ||
      fullName.includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen gradient-game">
      <AppHeader minimal backHref="/" title="Super Admin" />

      <main className="px-4 py-6 max-w-6xl mx-auto w-full">
        <Tabs defaultValue="overview" className="w-full">
          <div className="flex items-center justify-between gap-4 mb-6">
            <TabsList className="bg-background/50 backdrop-blur">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <BarChart3 className="w-4 h-4 mr-2" />Overview
              </TabsTrigger>
              <TabsTrigger value="sessions" data-testid="tab-sessions">
                <Play className="w-4 h-4 mr-2" />Sessions
              </TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users">
                <Users className="w-4 h-4 mr-2" />Users
              </TabsTrigger>
              <TabsTrigger value="content" data-testid="tab-content">
                <Gamepad2 className="w-4 h-4 mr-2" />Content
              </TabsTrigger>
              <TabsTrigger value="tools" data-testid="tab-tools">
                <Megaphone className="w-4 h-4 mr-2" />Tools
              </TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                refetchDashboard();
                queryClient.invalidateQueries({ queryKey: ['/api/super-admin/sessions'] });
                queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
              }}
              data-testid="button-refresh-all"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Live Activity */}
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground">Live</span>
                </div>
                {isErrorFlagged ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Flag className="w-3 h-3 mr-1" />Flagged status unavailable
                  </Badge>
                ) : flaggedBoards.length > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    <Flag className="w-3 h-3 mr-1" />{flaggedBoards.length} flagged
                  </Badge>
                )}
              </div>

              {isLoadingDashboard ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : isErrorDashboard ? (
                <ErrorState message="Couldn't load dashboard stats" onRetry={() => refetchDashboard()} />
              ) : dashboard && (
                <>
                  {/* Real-time Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard 
                      title="Active Games" 
                      value={dashboard.realtime.activeGames} 
                      icon={Zap} 
                      color="from-green-500 to-emerald-500"
                      subtitle="games in progress"
                    />
                    <StatCard 
                      title="Active Players" 
                      value={dashboard.realtime.activePlayers} 
                      icon={Users} 
                      color="from-blue-500 to-cyan-500"
                      subtitle="connected"
                    />
                    <StatCard 
                      title="Games Today" 
                      value={dashboard.today.games} 
                      change={dashboard.today.gamesChange}
                      icon={Play} 
                      color="from-pink-500 to-rose-500"
                      subtitle="vs yesterday"
                    />
                    <StatCard 
                      title="Players Today" 
                      value={dashboard.today.players} 
                      change={dashboard.today.playersChange}
                      icon={Target} 
                      color="from-violet-500 to-purple-500"
                      subtitle="vs yesterday"
                    />
                  </div>

                  {/* Weekly Summary */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-amber-500" />This Week
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-amber-500">{dashboard.week.games}</p>
                          <p className="text-sm text-muted-foreground">Games Played</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-emerald-500">{dashboard.week.players}</p>
                          <p className="text-sm text-muted-foreground">Players Joined</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-violet-500">{dashboard.week.newUsers}</p>
                          <p className="text-sm text-muted-foreground">New Users</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Leaderboards */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Crown className="w-5 h-5 text-amber-500" />Top Hosts This Week
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {dashboard.topHostsWeek.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">No hosts this week</p>
                        ) : (
                          <div className="space-y-2">
                            {dashboard.topHostsWeek.map((host, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-gray-300 text-gray-700' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'}`}>
                                    {idx + 1}
                                  </span>
                                  <span className="font-medium truncate max-w-[150px]" title={host.name}>{host.name}</span>
                                </div>
                                <Badge variant="secondary">{host.games} games</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-fuchsia-500" />Popular Grids This Week
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {dashboard.popularGridsWeek.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">No grids played this week</p>
                        ) : (
                          <div className="space-y-2">
                            {dashboard.popularGridsWeek.map((grid, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-fuchsia-500 text-white' : idx === 1 ? 'bg-gray-300 text-gray-700' : idx === 2 ? 'bg-fuchsia-700 text-white' : 'bg-muted text-muted-foreground'}`}>
                                    {idx + 1}
                                  </span>
                                  <span className="font-medium truncate max-w-[150px]" title={grid.name}>{grid.name}</span>
                                </div>
                                <Badge variant="secondary">{grid.plays} plays</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Platform Totals & Performance */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Hash className="w-5 h-5 text-cyan-500" />Platform Totals
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xl font-bold">{dashboard.totals.users}</p>
                            <p className="text-xs text-muted-foreground">Total Users</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xl font-bold">{dashboard.totals.sessions}</p>
                            <p className="text-xs text-muted-foreground">Total Sessions</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xl font-bold">{dashboard.totals.boards}</p>
                            <p className="text-xs text-muted-foreground">BlitzGrid Grids</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xl font-bold">{dashboard.totals.blitzgridQuestions + dashboard.totals.sortCircuitQuestions + dashboard.totals.psyopQuestions}</p>
                            <p className="text-xs text-muted-foreground">Total Questions</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Starter Packs: <span className="font-medium text-foreground">{dashboard.totals.starterPacks}</span></span>
                          <span className="text-muted-foreground">User Roles: <span className="font-medium text-foreground">{dashboard.usersByRole.admin || 0} admins, {dashboard.usersByRole.user || 0} users</span></span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Activity className="w-5 h-5 text-emerald-500" />Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Game Completion Rate</span>
                              <span className="font-medium">{dashboard.performance.completionRate}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${dashboard.performance.completionRate}%` }} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-muted/50 text-center">
                              <p className="text-xl font-bold text-amber-500">{dashboard.performance.avgScore}</p>
                              <p className="text-xs text-muted-foreground">Avg Score</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 text-center">
                              <p className="text-xl font-bold text-pink-500">{dashboard.performance.highScore}</p>
                              <p className="text-xs text-muted-foreground">High Score</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                </>
              )}
            </motion.div>
          </TabsContent>

          {/* SESSIONS TAB */}
          <TabsContent value="sessions">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Type room code (e.g. ABCD), host email, or player name..."
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-session-search"
                  />
                </div>
                <Badge variant="secondary">{filteredSessions.length} sessions</Badge>
              </div>

              {isLoadingSessions ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
              ) : isErrorSessions ? (
                <ErrorState message="Couldn't load sessions" onRetry={() => queryClient.invalidateQueries({ queryKey: ['/api/super-admin/sessions'] })} />
              ) : filteredSessions.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No sessions found</CardContent></Card>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredSessions.map((session) => (
                    <Card key={session.id} data-testid={`session-card-${session.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Badge variant={session.state === 'ended' ? 'secondary' : session.state === 'active' ? 'default' : 'outline'} className={session.state === 'active' ? 'bg-green-500' : ''}>
                              {session.state}
                            </Badge>
                            <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{session.code}</span>
                            <span className="text-xs text-muted-foreground">{formatRelativeDate(session.createdAt)}</span>
                          </div>
                          <Badge variant="outline">{session.playerCount} player{session.playerCount !== 1 ? 's' : ''}</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Host: </span>
                            <span className="font-medium">
                              {session.host?.firstName || session.host?.lastName 
                                ? `${session.host.firstName || ''} ${session.host.lastName || ''}`.trim()
                                : session.host?.email || 'Unknown'}
                            </span>
                          </div>
                          {session.winner && (
                            <div className="flex items-center gap-1">
                              <Trophy className="w-4 h-4 text-amber-500" />
                              <span className="font-medium text-amber-500">{session.winner.name}</span>
                              <span className="text-muted-foreground">({session.winner.score} pts)</span>
                            </div>
                          )}
                        </div>

                        {session.players.length > 0 && (
                          <div className="mt-3 pt-3 border-t flex flex-wrap gap-1">
                            {session.players.slice(0, 10).map((player) => (
                              <Badge key={player.id} variant="outline" className="text-xs">
                                {player.name}: {player.score}
                              </Badge>
                            ))}
                            {session.players.length > 10 && (
                              <Badge variant="outline" className="text-xs">+{session.players.length - 10} more</Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-user-search"
                  />
                </div>
                <Badge variant="secondary">{filteredUsers.length} users</Badge>
              </div>

              {isLoadingUsers ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
              ) : isErrorUsers ? (
                <ErrorState message="Couldn't load users" onRetry={() => queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] })} />
              ) : filteredUsers.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No users found</CardContent></Card>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredUsers.slice(0, 50).map((u) => {
                    const isUserExpanded = expandedUserId === u.id;
                    return (
                      <Card key={u.id} data-testid={`user-card-${u.id}`}>
                        <div 
                          className="p-3 flex items-center justify-between gap-4 cursor-pointer hover-elevate"
                          onClick={() => setExpandedUserId(isUserExpanded ? null : u.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                              {u.firstName?.[0] || u.email[0].toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="font-medium truncate max-w-[150px]">{u.firstName || 'User'} {u.lastName || ''}</span>
                                <Badge variant={u.role === 'super_admin' ? 'destructive' : u.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                  {u.role}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs">{u.gamesHosted} games</Badge>
                            <Badge variant="outline" className="text-xs">{u.boardCount} grids</Badge>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isUserExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {isUserExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t"
                            >
                              <div className="p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                  <Select value={u.role} onValueChange={(role) => updateRoleMutation.mutate({ userId: u.id, role })}>
                                    <SelectTrigger className="w-[140px]" data-testid={`select-role-${u.id}`}>
                                      <SelectValue placeholder="Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="super_admin">Super Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => { e.stopPropagation(); setDeleteUserId(u.id); }}
                                    data-testid={`button-delete-user-${u.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                
                                {u.recentSessions?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Recent Sessions</p>
                                    <div className="flex flex-wrap gap-1">
                                      {u.recentSessions.slice(0, 5).map((s) => (
                                        <Badge key={s.id} variant="outline" className="text-xs">
                                          {s.code} · {s.playerCount}p · {formatRelativeDate(s.createdAt)}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    );
                  })}
                  {filteredUsers.length > 50 && (
                    <p className="text-center text-muted-foreground text-sm py-2">Showing 50 of {filteredUsers.length} users</p>
                  )}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* CONTENT TAB */}
          <TabsContent value="content">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Flagged Content Alert */}
              {flaggedBoards.length > 0 && (
                <Card className="border-amber-500/50 bg-amber-50/30 dark:bg-amber-900/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Flag className="w-4 h-4 text-amber-500" />Needs Review ({flaggedBoards.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {flaggedBoards.slice(0, 5).map((board) => (
                        <div key={board.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-background">
                          <span className="text-sm font-medium truncate flex-1">{board.name}</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => updateModerationMutation.mutate({ boardId: board.id, data: { moderationStatus: 'approved' } })}>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => setDeleteBoardId(board.id)}>Remove</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Games List */}
              {isLoadingGameTypes ? (
                <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
              ) : isErrorGameTypes ? (
                <ErrorState message="Couldn't load games" onRetry={() => queryClient.invalidateQueries({ queryKey: ['/api/super-admin/game-types'] })} />
              ) : (
                <div className="space-y-4">
                  {gameTypes.map((gameType) => {
                    const isExpanded = expandedGameSlug === gameType.slug;
                    const GameIcon = getGameIcon(gameType.slug);
                    const gradient = getGameGradient(gameType.slug);
                    const status = gameType.status || 'active';
                    
                    return (
                      <Card key={gameType.id} className={isExpanded ? 'border-primary' : ''}>
                        <div 
                          className="p-4 flex items-center justify-between gap-4 cursor-pointer hover-elevate"
                          onClick={() => setExpandedGameSlug(isExpanded ? null : gameType.slug)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                              <GameIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{gameType.displayName}</h3>
                              <p className="text-xs text-muted-foreground">{gameType.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={status === 'active' ? 'default' : status === 'coming_soon' ? 'secondary' : 'outline'}>
                              {status}
                            </Badge>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t"
                            >
                              <div className="p-4 space-y-4">
                                <div className="flex items-center gap-2">
                                  <Select value={status} onValueChange={(v: GameStatus) => updateGameTypeMutation.mutate({ id: gameType.id, data: { status: v } })}>
                                    <SelectTrigger className="w-[140px]">
                                      <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="coming_soon">Coming Soon</SelectItem>
                                      <SelectItem value="hidden">Hidden</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Questions for this game */}
                                {gameType.slug === 'sequence_squeeze' && (
                                  <div className="space-y-2">
                                    <div className="relative">
                                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                      <Input placeholder="Search Sort Circuit questions..." value={sequenceSearch} onChange={(e) => setSequenceSearch(e.target.value)} className="pl-9" />
                                    </div>
                                    {isLoadingSequenceQuestions ? (
                                      <Skeleton className="h-20" />
                                    ) : (
                                      <div className="max-h-[300px] overflow-y-auto space-y-1">
                                        {sequenceQuestions.filter(q => !sequenceSearch || q.title.toLowerCase().includes(sequenceSearch.toLowerCase())).slice(0, 20).map((q) => (
                                          <div key={q.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                                            <span className="truncate flex-1">{q.title}</span>
                                            <div className="flex items-center gap-1">
                                              {q.isStarterPack && <Star className="w-3 h-3 text-amber-500" />}
                                              <Button size="sm" variant="ghost" onClick={() => toggleSequenceStarterPackMutation.mutate({ questionId: q.id, isStarterPack: !q.isStarterPack })}>
                                                {q.isStarterPack ? 'Unmark' : 'Starter'}
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {gameType.slug === 'psyop' && (
                                  <div className="space-y-2">
                                    <div className="relative">
                                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                      <Input placeholder="Search PsyOp questions..." value={psyopSearch} onChange={(e) => setPsyopSearch(e.target.value)} className="pl-9" />
                                    </div>
                                    {isLoadingPsyopQuestions ? (
                                      <Skeleton className="h-20" />
                                    ) : (
                                      <div className="max-h-[300px] overflow-y-auto space-y-1">
                                        {psyopQuestions.filter(q => !psyopSearch || q.factText.toLowerCase().includes(psyopSearch.toLowerCase())).slice(0, 20).map((q) => (
                                          <div key={q.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                                            <span className="truncate flex-1">{q.factText}</span>
                                            <div className="flex items-center gap-1">
                                              {q.isStarterPack && <Star className="w-3 h-3 text-amber-500" />}
                                              <Button size="sm" variant="ghost" onClick={() => togglePsyopStarterPackMutation.mutate({ questionId: q.id, isStarterPack: !q.isStarterPack })}>
                                                {q.isStarterPack ? 'Unmark' : 'Starter'}
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {gameType.slug === 'blitzgrid' && (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm text-muted-foreground">All BlitzGrid grids with starter pack controls</p>
                                      <Badge variant="secondary">{blitzgridGrids.length} grids</Badge>
                                    </div>
                                    <div className="relative">
                                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                      <Input placeholder="Search grids by name..." value={blitzgridSearch} onChange={(e) => setBlitzgridSearch(e.target.value)} className="pl-9" />
                                    </div>
                                    {isLoadingBlitzgridGrids ? (
                                      <Skeleton className="h-20" />
                                    ) : blitzgridGrids.length === 0 ? (
                                      <p className="text-sm text-muted-foreground text-center py-4">No BlitzGrid grids found</p>
                                    ) : (
                                      <div className="max-h-[400px] overflow-y-auto space-y-2">
                                        {blitzgridGrids.filter(g => !blitzgridSearch || g.name.toLowerCase().includes(blitzgridSearch.toLowerCase())).map((grid) => (
                                          <div key={grid.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 gap-3">
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-2">
                                                <span className="font-medium truncate">{grid.name}</span>
                                                {grid.isStarterPack && <Star className="w-4 h-4 text-amber-500 shrink-0" />}
                                              </div>
                                              <div className="text-xs text-muted-foreground mt-0.5">
                                                {grid.ownerName || grid.ownerEmail} · {grid.categoryCount} categories · {grid.questionCount} questions
                                              </div>
                                            </div>
                                            <Button 
                                              size="sm" 
                                              variant={grid.isStarterPack ? "default" : "outline"}
                                              onClick={() => toggleStarterPackMutation.mutate({ boardId: grid.id, isStarterPack: !grid.isStarterPack })}
                                              disabled={toggleStarterPackMutation.isPending}
                                            >
                                              {grid.isStarterPack ? 'Remove Starter' : 'Make Starter'}
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* TOOLS TAB */}
          <TabsContent value="tools">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-violet-500" />Announcements
                  </CardTitle>
                  <CardDescription>Broadcast messages to all users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Title" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} data-testid="input-announcement-title" />
                  <Input placeholder="Message" value={announcementMessage} onChange={(e) => setAnnouncementMessage(e.target.value)} data-testid="input-announcement-message" />
                  <Select value={announcementType} onValueChange={(v: "info" | "warning" | "success") => setAnnouncementType(v)}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="w-full" disabled={!announcementTitle || !announcementMessage || createAnnouncementMutation.isPending} onClick={() => createAnnouncementMutation.mutate({ title: announcementTitle, message: announcementMessage, type: announcementType })} data-testid="button-send-announcement">
                    <Send className="w-4 h-4 mr-2" />{createAnnouncementMutation.isPending ? 'Sending...' : 'Broadcast'}
                  </Button>
                  
                  {isLoadingAnnouncements ? (
                    <Skeleton className="h-12" />
                  ) : isErrorAnnouncements ? (
                    <p className="text-sm text-destructive text-center py-2">Couldn't load announcements</p>
                  ) : announcements.length > 0 && (
                    <div className="pt-3 border-t space-y-2 max-h-[200px] overflow-y-auto">
                      {announcements.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/50">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{a.title}</p>
                              <Badge variant={a.type === 'warning' ? 'destructive' : a.type === 'success' ? 'default' : 'secondary'} className={`text-xs ${a.type === 'success' ? 'bg-green-500' : ''}`}>{a.type}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{formatRelativeDate(a.createdAt)}</p>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => deleteAnnouncementMutation.mutate(a.id)} disabled={deleteAnnouncementMutation.isPending}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-teal-500" />Data Export
                  </CardTitle>
                  <CardDescription>Download all platform data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Export all users, sessions, boards, and questions as JSON for backup or analysis.</p>
                  <Button className="w-full" variant="outline" onClick={handleExportData} disabled={isExporting} data-testid="button-export-data">
                    {isExporting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    {isExporting ? 'Exporting...' : 'Export All Data'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete User Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the user and all their content. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => deleteUserId && deleteUserMutation.mutate(deleteUserId)} disabled={deleteUserMutation.isPending}>
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Board Dialog */}
      <AlertDialog open={!!deleteBoardId} onOpenChange={() => setDeleteBoardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Grid?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the grid and all its categories and questions.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => deleteBoardId && deleteBoardMutation.mutate(deleteBoardId)} disabled={deleteBoardMutation.isPending}>
              {deleteBoardMutation.isPending ? 'Deleting...' : 'Delete Grid'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
