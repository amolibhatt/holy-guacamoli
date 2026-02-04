import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, BarChart3, Shield, ArrowLeft,
  Trash2, MoreHorizontal, Pencil,
  TrendingUp, Gamepad2, Clock, Activity,
  ListOrdered, Grid3X3, Search, RefreshCw,
  ChevronRight, Star, ChevronDown, Database,
  Megaphone, Flag, Heart, AlertTriangle,
  Download, Send, UserCheck, Zap, Trophy,
  Calendar, LogIn, User, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { GameStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import type { Board, GameType } from "@shared/schema";
import type { SafeUser } from "@shared/models/auth";

interface PlatformStats {
  totalUsers: number;
  totalBoards: number;
  totalQuestions: number;
  totalGamesPlayed: number;
  activeSessionsToday: number;
  newUsersThisWeek: number;
}

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

interface DetailedSession {
  id: number;
  code: string;
  hostId: string;
  currentMode: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  host: { id: string; username: string; email: string | null };
  players: SessionPlayer[];
  playerCount: number;
  winner: SessionPlayer | null;
}

interface BoardWithOwner extends Board {
  ownerEmail: string;
  ownerName: string;
  questionCount: number;
  categoryCount: number;
}

interface DetailedAnalytics {
  dau: number;
  wau: number;
  mau: number;
  weeklyPlayers: number;
  avgPlayersPerSession: number;
  activeSessions: number;
  endedSessions: number;
  totalSessionsThisMonth: number;
}

interface RoomStats {
  sessionsToday: number;
  playersToday: number;
  activeRooms: number;
}

interface DatabaseStats {
  users: number;
  boards: number;
  categories: number;
  questions: number;
  sessions: number;
  players: number;
  gameTypes: number;
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
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOrder: string[];
  hint: string | null;
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

export default function SuperAdmin() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteBoardId, setDeleteBoardId] = useState<number | null>(null);
  const [expandedGameSlug, setExpandedGameSlug] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [gridSearch, setGridSearch] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementType, setAnnouncementType] = useState<"info" | "warning" | "success">("info");
  const [isExporting, setIsExporting] = useState(false);
  const [sequenceSearch, setSequenceSearch] = useState("");
  const [psyopSearch, setPsyopSearch] = useState("");
  const [blitzgridSearch, setBlitzgridSearch] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: stats, isLoading: isLoadingStats } = useQuery<PlatformStats>({
    queryKey: ['/api/super-admin/stats'],
  });

  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery<UserWithStats[]>({
    queryKey: ['/api/super-admin/users'],
  });

  const { data: allBoards = [], isLoading: isLoadingBoards } = useQuery<BoardWithOwner[]>({
    queryKey: ['/api/super-admin/boards'],
  });

  const { data: gameTypes = [], isLoading: isLoadingGameTypes } = useQuery<GameType[]>({
    queryKey: ['/api/super-admin/game-types'],
  });

  const { data: detailedAnalytics, isLoading: isLoadingAnalytics } = useQuery<DetailedAnalytics>({
    queryKey: ['/api/super-admin/analytics'],
  });

  const { data: roomStats, isLoading: isLoadingRoomStats } = useQuery<RoomStats>({
    queryKey: ['/api/super-admin/room-stats'],
  });

  const { data: dbStats, isLoading: isLoadingDbStats } = useQuery<DatabaseStats>({
    queryKey: ['/api/super-admin/db-stats'],
  });

  const { data: announcements = [], isLoading: isLoadingAnnouncements } = useQuery<Announcement[]>({
    queryKey: ['/api/super-admin/announcements'],
  });

  const { data: flaggedBoards = [], isLoading: isLoadingFlagged } = useQuery<Board[]>({
    queryKey: ['/api/super-admin/boards/flagged'],
  });

  const { data: allSessions = [], isLoading: isLoadingSessions } = useQuery<DetailedSession[]>({
    queryKey: ['/api/super-admin/sessions'],
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
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/stats'] });
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

  const updateModerationMutation = useMutation({
    mutationFn: async ({ boardId, data }: { boardId: number; data: { moderationStatus?: string; isFeatured?: boolean } }) => {
      await apiRequest('PATCH', `/api/super-admin/boards/${boardId}/moderation`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards/flagged'] });
      toast({ title: "Board status updated" });
    },
    onError: () => {
      toast({ title: "Couldn't update board", variant: "destructive" });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest('PATCH', `/api/super-admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      toast({ title: "User role updated" });
    },
    onError: () => {
      toast({ title: "Couldn't update role", variant: "destructive" });
    },
  });

  const deleteBlitzgridQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      await apiRequest('DELETE', `/api/super-admin/questions/blitzgrid/${questionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/blitzgrid'] });
      toast({ title: "Question deleted" });
    },
    onError: () => {
      toast({ title: "Couldn't delete question", variant: "destructive" });
    },
  });

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await apiRequest('GET', '/api/super-admin/export');
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `platform-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Data exported successfully" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen gradient-game flex items-center justify-center">
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen gradient-game flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access this page. This area is restricted to super administrators only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getGameIcon = (slug: string) => {
    switch (slug) {
      case 'blitzgrid': return Grid3X3;
      case 'sequence_squeeze': return ListOrdered;
      case 'psyop': return Shield;
      default: return Gamepad2;
    }
  };

  const getGameGradient = (slug: string) => {
    switch (slug) {
      case 'blitzgrid': return 'from-rose-300 via-pink-300 to-fuchsia-300';
      case 'sequence_squeeze': return 'from-emerald-300 via-teal-300 to-cyan-300';
      case 'psyop': return 'from-violet-300 via-purple-300 to-indigo-300';
      default: return 'from-amber-300 via-yellow-300 to-orange-300';
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

  return (
    <div className="min-h-screen gradient-game">
      <AppHeader minimal backHref="/" title="Super Admin" />

      <main className="px-4 py-6 max-w-4xl mx-auto w-full">
        <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="dashboard" className="gap-2" data-testid="tab-dashboard">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-2" data-testid="tab-content">
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline">Content</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Platform Dashboard</h2>
                  <p className="text-sm text-muted-foreground mt-1">Overview, users, and sessions in one place</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/super-admin/stats'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/super-admin/sessions'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/super-admin/analytics'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/super-admin/room-stats'] });
                  }}
                  data-testid="button-refresh-dashboard"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                  title="Total Users"
                  value={stats?.totalUsers ?? 0}
                  icon={Users}
                  color="from-emerald-300 via-teal-300 to-cyan-300"
                  isLoading={isLoadingStats}
                />
                <StatCard
                  title="Total Grids"
                  value={stats?.totalBoards ?? 0}
                  icon={Grid3X3}
                  color="from-rose-300 via-pink-300 to-fuchsia-300"
                  isLoading={isLoadingStats}
                />
                <StatCard
                  title="Questions"
                  value={stats?.totalQuestions ?? 0}
                  icon={Activity}
                  color="from-violet-300 via-purple-300 to-indigo-300"
                  isLoading={isLoadingStats}
                />
                <StatCard
                  title="Games Played"
                  value={stats?.totalGamesPlayed ?? 0}
                  icon={Gamepad2}
                  color="from-amber-300 via-yellow-300 to-amber-300"
                  isLoading={isLoadingStats}
                />
                <StatCard
                  title="Sessions Today"
                  value={stats?.activeSessionsToday ?? 0}
                  icon={Clock}
                  color="from-rose-300 via-pink-300 to-fuchsia-300"
                  isLoading={isLoadingStats}
                />
                <StatCard
                  title="New This Week"
                  value={stats?.newUsersThisWeek ?? 0}
                  icon={TrendingUp}
                  color="from-violet-300 via-purple-300 to-indigo-300"
                  isLoading={isLoadingStats}
                />
              </div>

              <h3 className="text-xl font-semibold text-foreground mt-8 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Live Activity
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {isLoadingRoomStats ? (
                  [1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-8 w-16 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <>
                    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                      <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{roomStats?.activeRooms ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Active Rooms</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20">
                      <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">{roomStats?.sessionsToday ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Sessions Today</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
                      <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">{roomStats?.playersToday ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Players Today</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-4">User Engagement (Active Users)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {isLoadingAnalytics ? (
                  [1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-16 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <>
                    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Daily Active</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{detailedAnalytics?.dau ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Hosts today</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Weekly Active</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{detailedAnalytics?.wau ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Last 7 days</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Monthly Active</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{detailedAnalytics?.mau ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Last 30 days</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Session Analytics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {isLoadingAnalytics ? (
                  [1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <div>
                            <Skeleton className="h-7 w-12 mb-1" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                            <Activity className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{detailedAnalytics?.activeSessions ?? 0}</p>
                            <p className="text-sm text-muted-foreground">Active Sessions</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                            <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{detailedAnalytics?.endedSessions ?? 0}</p>
                            <p className="text-sm text-muted-foreground">Ended Sessions</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{detailedAnalytics?.totalSessionsThisMonth ?? 0}</p>
                            <p className="text-sm text-muted-foreground">This Month</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                            <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{detailedAnalytics?.avgPlayersPerSession ?? 0}</p>
                            <p className="text-sm text-muted-foreground">Avg Players/Session</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
              
              {/* Users Section */}
              <Card className="mt-6">
                <CardHeader 
                  className="cursor-pointer hover-elevate"
                  onClick={() => setExpandedUserId(expandedUserId === 'section' ? null : 'section')}
                  onKeyDown={(e) => e.key === 'Enter' && setExpandedUserId(expandedUserId === 'section' ? null : 'section')}
                  tabIndex={0}
                  role="button"
                  aria-expanded={expandedUserId === 'section'}
                  data-testid="section-users-toggle"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-violet-500" />
                      <div>
                        <CardTitle className="text-lg">Users</CardTitle>
                        <CardDescription>Manage accounts and roles</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{allUsers.length} users</Badge>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedUserId === 'section' ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CardHeader>
                <AnimatePresence>
                  {expandedUserId === 'section' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-2 mb-4">
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
                        </div>
                        
                        {isLoadingUsers ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                          </div>
                        ) : (() => {
                          const filteredUsers = allUsers.filter((u) => {
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
                          
                          if (filteredUsers.length === 0) {
                            return <p className="text-center text-muted-foreground py-6">No users found</p>;
                          }
                          
                          return (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                              {filteredUsers.slice(0, 20).map((u) => {
                                const isUserExpanded = expandedUserId === u.id;
                                return (
                                <div key={u.id} className="rounded-lg border bg-muted/30" data-testid={`user-row-${u.id}`}>
                                  <div 
                                    className="p-3 flex items-center justify-between gap-4 cursor-pointer hover-elevate"
                                    onClick={() => setExpandedUserId(isUserExpanded ? null : u.id)}
                                    data-testid={`button-toggle-user-${u.id}`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                                        {u.firstName?.[0] || u.email[0].toUpperCase()}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                                          <span className="font-medium truncate max-w-[150px]" title={`${u.firstName || 'User'} ${u.lastName || ''}`}>{u.firstName || 'User'} {u.lastName || ''}</span>
                                          {u.role === 'super_admin' && <Badge className="bg-purple-500/20 text-purple-600 text-xs shrink-0"><Shield className="w-3 h-3 mr-1" />Super</Badge>}
                                          {u.role === 'admin' && <Badge className="bg-blue-500/20 text-blue-600 text-xs shrink-0">Admin</Badge>}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={`${u.email} • Last login: ${formatRelativeDate(u.lastLoginAt)}`}>{u.email} • Last login: {formatRelativeDate(u.lastLoginAt)}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                      <div className="text-center">
                                        <div className="font-bold">{u.boardCount}</div>
                                        <div className="text-xs text-muted-foreground">Grids</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-bold">{u.gamesHosted}</div>
                                        <div className="text-xs text-muted-foreground">Games</div>
                                      </div>
                                      {u.role !== 'super_admin' && (
                                        <>
                                          <Select
                                            value={u.role || 'user'}
                                            onValueChange={(role) => updateUserRoleMutation.mutate({ userId: u.id, role })}
                                            disabled={updateUserRoleMutation.isPending}
                                          >
                                            <SelectTrigger className="w-[90px] h-8" data-testid={`select-role-${u.id}`} onClick={(e) => e.stopPropagation()}>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="user">User</SelectItem>
                                              <SelectItem value="admin">Admin</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteUserId(u.id); }} data-testid={`button-delete-user-${u.id}`}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                          </Button>
                                        </>
                                      )}
                                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isUserExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                  </div>
                                  <AnimatePresence>
                                    {isUserExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="p-3 pt-0 border-t bg-background/50">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                            <div>
                                              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                                <Grid3X3 className="w-4 h-4 text-rose-500" />
                                                Grids ({u.boards?.length || 0})
                                              </h5>
                                              {u.boards?.length > 0 ? (
                                                <div className="space-y-1">
                                                  {u.boards.slice(0, 5).map((b) => (
                                                    <div key={b.id} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50 text-sm min-w-0">
                                                      <span className="truncate flex-1 min-w-0 max-w-[150px]" title={b.name}>{b.name}</span>
                                                      <span className="text-xs text-muted-foreground shrink-0">{formatRelativeDate(b.createdAt)}</span>
                                                    </div>
                                                  ))}
                                                  {u.boards.length > 5 && (
                                                    <p className="text-xs text-muted-foreground text-center">+{u.boards.length - 5} more</p>
                                                  )}
                                                </div>
                                              ) : (
                                                <p className="text-xs text-muted-foreground">No grids yet</p>
                                              )}
                                            </div>
                                            <div>
                                              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                                <Play className="w-4 h-4 text-emerald-500" />
                                                Recent Sessions ({u.recentSessions?.length || 0})
                                              </h5>
                                              {u.recentSessions?.length > 0 ? (
                                                <div className="space-y-1">
                                                  {u.recentSessions.slice(0, 5).map((s) => {
                                                    const winner = s.players?.length > 0 
                                                      ? s.players.reduce((max, p) => p.score > max.score ? p : max, s.players[0])
                                                      : null;
                                                    return (
                                                      <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm gap-2 min-w-0">
                                                        <Badge variant={s.state === 'active' ? 'default' : 'secondary'} className={`text-xs shrink-0 ${s.state === 'active' ? 'bg-green-500' : ''}`}>
                                                          {s.code}
                                                        </Badge>
                                                        <span className="flex-1 text-xs text-muted-foreground truncate min-w-0 max-w-[150px]" title={winner ? `${s.playerCount} players • Winner: ${winner.name}` : `${s.playerCount} players`}>
                                                          {s.playerCount} players
                                                          {winner && ` • Winner: ${winner.name}`}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground shrink-0">{formatRelativeDate(s.createdAt)}</span>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              ) : (
                                                <p className="text-xs text-muted-foreground">No sessions yet</p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );})}
                              {filteredUsers.length > 20 && (
                                <p className="text-center text-muted-foreground text-sm py-2">
                                  Showing 20 of {filteredUsers.length} users
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
              
              {/* Sessions Section */}
              <Card className="mt-4">
                <CardHeader 
                  className="cursor-pointer hover-elevate"
                  onClick={() => setExpandedSessionId(expandedSessionId === 'section' ? null : 'section')}
                  onKeyDown={(e) => e.key === 'Enter' && setExpandedSessionId(expandedSessionId === 'section' ? null : 'section')}
                  tabIndex={0}
                  role="button"
                  aria-expanded={expandedSessionId === 'section'}
                  data-testid="section-sessions-toggle"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Play className="w-5 h-5 text-emerald-500" />
                      <div>
                        <CardTitle className="text-lg">Sessions</CardTitle>
                        <CardDescription>Recent multiplayer games</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{allSessions.length} sessions</Badge>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSessionId === 'section' ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CardHeader>
                <AnimatePresence>
                  {expandedSessionId === 'section' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by code or host..."
                              value={sessionSearch}
                              onChange={(e) => setSessionSearch(e.target.value)}
                              className="pl-9"
                              data-testid="input-session-search"
                            />
                          </div>
                        </div>
                        
                        {isLoadingSessions ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                          </div>
                        ) : (() => {
                          const filteredSessions = allSessions.filter((s) => {
                            if (!sessionSearch.trim()) return true;
                            const searchLower = sessionSearch.toLowerCase();
                            return (
                              s.code.toLowerCase().includes(searchLower) ||
                              s.host?.username?.toLowerCase().includes(searchLower) ||
                              s.host?.email?.toLowerCase().includes(searchLower)
                            );
                          });
                          
                          if (filteredSessions.length === 0) {
                            return <p className="text-center text-muted-foreground py-6">No sessions found</p>;
                          }
                          
                          return (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                              {filteredSessions.slice(0, 20).map((session) => {
                                const winner = session.players.length > 0 
                                  ? session.players.reduce((max, p) => p.score > max.score ? p : max, session.players[0])
                                  : null;
                                
                                return (
                                  <div key={session.id} className="p-3 rounded-lg border bg-muted/30" data-testid={`session-row-${session.id}`}>
                                    <div className="flex items-center justify-between gap-4 flex-wrap min-w-0">
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <Badge variant={session.state === 'active' ? 'default' : 'secondary'} className={`shrink-0 ${session.state === 'active' ? 'bg-green-500' : ''}`}>
                                          {session.code}
                                        </Badge>
                                        <span className="text-sm truncate max-w-[150px]" title={`Host: ${session.host?.username || session.host?.email || 'Unknown'}`}>Host: {session.host?.username || session.host?.email || 'Unknown'}</span>
                                        <Badge variant="outline" className="text-xs capitalize shrink-0">{session.state}</Badge>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Users className="w-3 h-3" /> {session.playerCount}
                                        </span>
                                        <span>{formatRelativeDate(session.createdAt)}</span>
                                      </div>
                                    </div>
                                    {winner && (
                                      <div className="mt-2 pt-2 border-t flex items-center gap-2 flex-wrap min-w-0">
                                        <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span className="text-sm font-medium truncate max-w-[100px]" title={winner.name}>{winner.name}</span>
                                        <span className="text-xs text-muted-foreground shrink-0">({winner.score} pts)</span>
                                        {session.players.filter(p => p.id !== winner.id).slice(0, 3).map((p) => (
                                          <Badge key={p.id} variant="secondary" className="text-xs max-w-[100px]" title={`${p.name}: ${p.score}`}>
                                            <span className="truncate max-w-[60px]" title={p.name}>{p.name}</span>: {p.score}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {filteredSessions.length > 20 && (
                                <p className="text-center text-muted-foreground text-sm py-2">
                                  Showing 20 of {filteredSessions.length} sessions
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Game Content</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage games, view questions, and control starter packs</p>
              </div>

              {isLoadingGameTypes ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {gameTypes.map((gameType) => {
                    const isExpanded = expandedGameSlug === gameType.slug;
                    const GameIcon = getGameIcon(gameType.slug);
                    const gradient = getGameGradient(gameType.slug);
                    const status = gameType.status || 'active';
                    
                    return (
                      <Card key={gameType.id} className={`transition-all ${isExpanded ? 'border-primary' : ''}`}>
                        <CardContent className="p-0">
                          <div 
                            className="p-4 cursor-pointer hover-elevate transition-colors rounded-lg"
                            onClick={() => setExpandedGameSlug(isExpanded ? null : gameType.slug)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setExpandedGameSlug(isExpanded ? null : gameType.slug);
                              }
                            }}
                            aria-expanded={isExpanded}
                            data-testid={`button-toggle-game-${gameType.slug}`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient}`}>
                                  <GameIcon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                                    <h3 className="font-semibold text-lg text-foreground">{gameType.displayName}</h3>
                                    {status === 'coming_soon' && (
                                      <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                                    )}
                                    {status === 'hidden' && (
                                      <Badge variant="outline" className="text-xs text-muted-foreground">Hidden</Badge>
                                    )}
                                    {status === 'active' && (
                                      <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 text-xs">Active</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{gameType.description || 'No description'}</p>
                                </div>
                              </div>
                              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-border p-4 bg-muted/20">
                                  <div className="flex items-center gap-4 mb-4">
                                    <span className="text-sm text-muted-foreground">Status:</span>
                                    <Select
                                      value={status}
                                      onValueChange={(value: GameStatus) => {
                                        updateGameTypeMutation.mutate({
                                          id: gameType.id,
                                          data: { status: value }
                                        });
                                      }}
                                      disabled={updateGameTypeMutation.isPending}
                                    >
                                      <SelectTrigger className="w-[140px]" data-testid={`select-status-${gameType.slug}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="coming_soon">Coming Soon</SelectItem>
                                        <SelectItem value="hidden">Hidden</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {gameType.slug === 'blitzgrid' && (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between gap-4 flex-wrap min-w-0">
                                        <h4 className="font-medium text-foreground shrink-0">All Grids</h4>
                                        <div className="flex items-center gap-2">
                                          <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                              placeholder="Search grids..."
                                              value={gridSearch}
                                              onChange={(e) => setGridSearch(e.target.value)}
                                              className="pl-8 h-8 w-[160px] text-sm"
                                              data-testid="input-grid-search"
                                            />
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] })}
                                            data-testid="button-refresh-grids"
                                          >
                                            <RefreshCw className="w-4 h-4" />
                                          </Button>
                                          <Badge variant="secondary">{allBoards.length} total</Badge>
                                        </div>
                                      </div>
                                      
                                      {isLoadingBoards ? (
                                        <Skeleton className="h-20 w-full" />
                                      ) : allBoards.length === 0 ? (
                                        <div className="text-center py-6 text-muted-foreground">
                                          No grids created yet.
                                        </div>
                                      ) : (() => {
                                        const filteredGrids = allBoards.filter((board) => {
                                          if (!gridSearch.trim()) return true;
                                          const searchLower = gridSearch.toLowerCase();
                                          return (
                                            board.name.toLowerCase().includes(searchLower) ||
                                            board.ownerEmail?.toLowerCase().includes(searchLower) ||
                                            board.ownerName?.toLowerCase().includes(searchLower)
                                          );
                                        });
                                        
                                        if (filteredGrids.length === 0) {
                                          return (
                                            <div className="text-center py-6 text-muted-foreground text-sm">
                                              No grids match "{gridSearch}"
                                            </div>
                                          );
                                        }
                                        
                                        return (
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                          {filteredGrids.map((board) => {
                                            const isComplete = board.categoryCount >= 5 && board.questionCount >= 25;
                                            const isStarterPack = board.isStarterPack ?? false;
                                            return (
                                              <div key={board.id} className="flex items-center justify-between gap-3 p-3 bg-background rounded-lg border" data-testid={`grid-row-${board.id}`}>
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                    <span className="font-medium truncate max-w-[200px]" title={board.name}>{board.name}</span>
                                                    {isComplete ? (
                                                      <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 text-xs">Complete</Badge>
                                                    ) : (
                                                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
                                                        {board.categoryCount}/5 categories
                                                      </Badge>
                                                    )}
                                                    {isStarterPack && (
                                                      <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                                                        <Star className="w-3 h-3 mr-1" />
                                                        Starter
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  <div className="text-xs text-muted-foreground">
                                                    {board.ownerEmail || 'Unknown owner'}
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Button
                                                    variant={isStarterPack ? "default" : "outline"}
                                                    size="icon"
                                                    onClick={() => toggleStarterPackMutation.mutate({ 
                                                      boardId: board.id, 
                                                      isStarterPack: !isStarterPack 
                                                    })}
                                                    disabled={toggleStarterPackMutation.isPending || !isComplete}
                                                    title={!isComplete ? "Grid must be complete" : "Toggle starter pack"}
                                                    data-testid={`button-starter-pack-${board.id}`}
                                                  >
                                                    <Star className={`w-4 h-4 ${isStarterPack ? 'fill-current' : ''}`} />
                                                  </Button>
                                                  <Link href={`/blitzgrid/admin?grid=${board.id}`}>
                                                    <Button variant="ghost" size="icon" data-testid={`button-edit-grid-${board.id}`}>
                                                      <Pencil className="w-4 h-4" />
                                                    </Button>
                                                  </Link>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteBoardId(board.id)}
                                                    data-testid={`button-delete-grid-${board.id}`}
                                                  >
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                  </Button>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                        );
                                      })()}
                                      
                                      <div className="mt-6 pt-4 border-t">
                                        <div className="flex items-center justify-between gap-4 flex-wrap min-w-0 mb-3">
                                          <h4 className="font-medium text-foreground shrink-0">All Questions</h4>
                                          <div className="flex items-center gap-2">
                                            <div className="relative">
                                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                              <Input
                                                placeholder="Search questions..."
                                                value={blitzgridSearch}
                                                onChange={(e) => setBlitzgridSearch(e.target.value)}
                                                className="pl-8 h-8 w-[160px] text-sm"
                                                data-testid="input-blitzgrid-search"
                                              />
                                            </div>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/blitzgrid'] })}
                                              data-testid="button-refresh-blitzgrid-questions"
                                            >
                                              <RefreshCw className="w-4 h-4" />
                                            </Button>
                                            {isLoadingBlitzgridQuestions ? (
                                              <Skeleton className="h-5 w-16" />
                                            ) : (
                                              <Badge variant="secondary">{blitzgridQuestions.length} total</Badge>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {isLoadingBlitzgridQuestions ? (
                                          <div className="space-y-2">
                                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                                          </div>
                                        ) : (() => {
                                          const filteredBlitzgrid = blitzgridQuestions.filter((q) => {
                                            if (!blitzgridSearch.trim()) return true;
                                            const searchLower = blitzgridSearch.toLowerCase();
                                            return (
                                              q.question.toLowerCase().includes(searchLower) ||
                                              q.category?.name?.toLowerCase().includes(searchLower) ||
                                              q.board?.name?.toLowerCase().includes(searchLower) ||
                                              q.creator?.username?.toLowerCase().includes(searchLower) ||
                                              q.creator?.email?.toLowerCase().includes(searchLower)
                                            );
                                          });
                                          
                                          if (filteredBlitzgrid.length === 0) {
                                            return (
                                              <div className="text-center py-6 text-muted-foreground">
                                                {blitzgridSearch ? `No questions match "${blitzgridSearch}"` : 'No questions created yet.'}
                                              </div>
                                            );
                                          }
                                          
                                          return (
                                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                            {filteredBlitzgrid.slice(0, 50).map((q) => (
                                              <div key={q.id} className="flex items-center justify-between gap-3 p-3 bg-background rounded-lg border" data-testid={`blitzgrid-question-row-${q.id}`}>
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                    <span className="font-medium truncate max-w-[250px]" title={q.question}>{q.question}</span>
                                                    <Badge variant="outline" className="text-xs">{q.points}pts</Badge>
                                                  </div>
                                                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap min-w-0">
                                                    {q.board && <span className="truncate max-w-[100px]" title={q.board.name}>{q.board.name}</span>}
                                                    {q.category && <span className="truncate max-w-[100px]" title={q.category.name}>• {q.category.name}</span>}
                                                    <span className="truncate max-w-[120px]" title={q.creator?.username || q.creator?.email || 'System'}>• {q.creator?.username || q.creator?.email || 'System'}</span>
                                                  </div>
                                                </div>
                                                <Button
                                                  size="icon"
                                                  variant="ghost"
                                                  onClick={() => deleteBlitzgridQuestionMutation.mutate(q.id)}
                                                  disabled={deleteBlitzgridQuestionMutation.isPending}
                                                  data-testid={`button-delete-blitzgrid-question-${q.id}`}
                                                >
                                                  <Trash2 className="w-4 h-4 text-destructive shrink-0" aria-hidden="true" />
                                                </Button>
                                              </div>
                                            ))}
                                            {filteredBlitzgrid.length > 50 && (
                                              <p className="text-center text-muted-foreground text-sm py-2">
                                                Showing 50 of {filteredBlitzgrid.length} questions
                                              </p>
                                            )}
                                          </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {gameType.slug === 'sequence_squeeze' && (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between gap-4 flex-wrap min-w-0">
                                        <h4 className="font-medium text-foreground shrink-0">Sort Circuit Questions</h4>
                                        <div className="flex items-center gap-2">
                                          <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                              placeholder="Search questions..."
                                              value={sequenceSearch}
                                              onChange={(e) => setSequenceSearch(e.target.value)}
                                              className="pl-8 h-8 w-[160px] text-sm"
                                              data-testid="input-sequence-search"
                                            />
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/sequence'] })}
                                            data-testid="button-refresh-sequence-questions"
                                          >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                          </Button>
                                          <Badge variant="secondary">{sequenceQuestions.length} total</Badge>
                                        </div>
                                      </div>
                                      
                                      {isLoadingSequenceQuestions ? (
                                        <div className="space-y-2">
                                          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                                        </div>
                                      ) : (() => {
                                        const filteredSequence = sequenceQuestions.filter((q) => {
                                          if (!sequenceSearch.trim()) return true;
                                          const searchLower = sequenceSearch.toLowerCase();
                                          return (
                                            q.question.toLowerCase().includes(searchLower) ||
                                            q.creator?.username?.toLowerCase().includes(searchLower) ||
                                            q.creator?.email?.toLowerCase().includes(searchLower)
                                          );
                                        });
                                        
                                        if (filteredSequence.length === 0) {
                                          return (
                                            <div className="text-center py-6 text-muted-foreground">
                                              {sequenceSearch ? `No questions match "${sequenceSearch}"` : 'No questions created yet.'}
                                            </div>
                                          );
                                        }
                                        
                                        return (
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                          {filteredSequence.map((q) => (
                                            <div key={q.id} className="flex items-center justify-between gap-3 p-3 bg-background rounded-lg border" data-testid={`sequence-question-row-${q.id}`}>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                  <span className="font-medium truncate max-w-[250px]" title={q.question}>{q.question}</span>
                                                  {q.isStarterPack && (
                                                    <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                                                      <Star className="w-3 h-3 mr-1" />
                                                      Starter
                                                    </Badge>
                                                  )}
                                                  {!q.isActive && (
                                                    <Badge variant="outline" className="text-xs">Inactive</Badge>
                                                  )}
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 min-w-0">
                                                  <User className="w-3 h-3 shrink-0" />
                                                  <span className="truncate max-w-[150px]" title={q.creator?.username || q.creator?.email || 'System'}>{q.creator?.username || q.creator?.email || 'System'}</span>
                                                </div>
                                              </div>
                                              <Button
                                                variant={q.isStarterPack ? "default" : "outline"}
                                                size="icon"
                                                onClick={() => toggleSequenceStarterPackMutation.mutate({ 
                                                  questionId: q.id, 
                                                  isStarterPack: !q.isStarterPack 
                                                })}
                                                disabled={toggleSequenceStarterPackMutation.isPending}
                                                title="Toggle starter pack"
                                                data-testid={`button-starter-pack-sequence-${q.id}`}
                                              >
                                                <Star className={`w-4 h-4 ${q.isStarterPack ? 'fill-current' : ''}`} />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {gameType.slug === 'psyop' && (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between gap-4 flex-wrap min-w-0">
                                        <h4 className="font-medium text-foreground shrink-0">PsyOp Questions</h4>
                                        <div className="flex items-center gap-2">
                                          <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                              placeholder="Search questions..."
                                              value={psyopSearch}
                                              onChange={(e) => setPsyopSearch(e.target.value)}
                                              className="pl-8 h-8 w-[160px] text-sm"
                                              data-testid="input-psyop-search"
                                            />
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/psyop'] })}
                                            data-testid="button-refresh-psyop-questions"
                                          >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                          </Button>
                                          <Badge variant="secondary">{psyopQuestions.length} total</Badge>
                                        </div>
                                      </div>
                                      
                                      {isLoadingPsyopQuestions ? (
                                        <div className="space-y-2">
                                          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                                        </div>
                                      ) : (() => {
                                        const filteredPsyop = psyopQuestions.filter((q) => {
                                          if (!psyopSearch.trim()) return true;
                                          const searchLower = psyopSearch.toLowerCase();
                                          return (
                                            q.factText.toLowerCase().includes(searchLower) ||
                                            q.category?.toLowerCase().includes(searchLower) ||
                                            q.creator?.username?.toLowerCase().includes(searchLower) ||
                                            q.creator?.email?.toLowerCase().includes(searchLower)
                                          );
                                        });
                                        
                                        if (filteredPsyop.length === 0) {
                                          return (
                                            <div className="text-center py-6 text-muted-foreground">
                                              {psyopSearch ? `No questions match "${psyopSearch}"` : 'No questions created yet.'}
                                            </div>
                                          );
                                        }
                                        
                                        return (
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                          {filteredPsyop.map((q) => (
                                            <div key={q.id} className="flex items-center justify-between gap-3 p-3 bg-background rounded-lg border" data-testid={`psyop-question-row-${q.id}`}>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                  <span className="font-medium truncate max-w-[250px]" title={q.factText}>{q.factText}</span>
                                                  {q.isStarterPack && (
                                                    <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                                                      <Star className="w-3 h-3 mr-1" />
                                                      Starter
                                                    </Badge>
                                                  )}
                                                  {!q.isActive && (
                                                    <Badge variant="outline" className="text-xs">Inactive</Badge>
                                                  )}
                                                  {q.category && (
                                                    <Badge variant="secondary" className="text-xs">{q.category}</Badge>
                                                  )}
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 min-w-0">
                                                  <User className="w-3 h-3 shrink-0" />
                                                  <span className="truncate max-w-[150px]" title={q.creator?.username || q.creator?.email || 'System'}>{q.creator?.username || q.creator?.email || 'System'}</span>
                                                </div>
                                              </div>
                                              <Button
                                                variant={q.isStarterPack ? "default" : "outline"}
                                                size="icon"
                                                onClick={() => togglePsyopStarterPackMutation.mutate({ 
                                                  questionId: q.id, 
                                                  isStarterPack: !q.isStarterPack 
                                                })}
                                                disabled={togglePsyopStarterPackMutation.isPending}
                                                title="Toggle starter pack"
                                                data-testid={`button-starter-pack-psyop-${q.id}`}
                                              >
                                                <Star className={`w-4 h-4 ${q.isStarterPack ? 'fill-current' : ''}`} />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {gameTypes.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No games configured.
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Settings & Tools</h2>
                  <p className="text-sm text-muted-foreground mt-1">System health, announcements, and data management</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Database className="w-5 h-5 text-teal-500" />
                      Database Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingDbStats ? (
                      <div className="space-y-2">
                        {[1, 2, 3, 4].map((i) => (
                          <Skeleton key={i} className="h-5 w-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Users', value: dbStats?.users ?? 0, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
                          { label: 'Grids', value: dbStats?.boards ?? 0, color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' },
                          { label: 'Categories', value: dbStats?.categories ?? 0, color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' },
                          { label: 'Questions', value: dbStats?.questions ?? 0, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
                          { label: 'Sessions', value: dbStats?.sessions ?? 0, color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
                          { label: 'Players', value: dbStats?.players ?? 0, color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300' },
                        ].map((stat) => (
                          <div key={stat.label} className={`p-2 rounded-lg ${stat.color}`}>
                            <p className="text-xl font-bold">{stat.value.toLocaleString()}</p>
                            <p className="text-xs opacity-80">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Flag className="w-5 h-5 text-amber-500" />
                      Flagged Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingFlagged ? (
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    ) : flaggedBoards.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">All content looks good!</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {flaggedBoards.map((board) => (
                          <div key={board.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                            <span className="text-sm font-medium truncate flex-1 min-w-0 max-w-[200px]" title={board.name}>{board.name}</span>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateModerationMutation.mutate({ boardId: board.id, data: { moderationStatus: 'approved' } })}
                                disabled={updateModerationMutation.isPending}
                                data-testid={`button-approve-board-${board.id}`}
                              >
                                {updateModerationMutation.isPending ? '...' : 'Approve'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteBoardId(board.id)}
                                disabled={deleteBoardMutation.isPending}
                                data-testid={`button-delete-flagged-${board.id}`}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Megaphone className="w-5 h-5 text-violet-500" />
                      Announcements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      placeholder="Title"
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      data-testid="input-announcement-title"
                    />
                    <Input
                      placeholder="Message"
                      value={announcementMessage}
                      onChange={(e) => setAnnouncementMessage(e.target.value)}
                      data-testid="input-announcement-message"
                    />
                    <Select value={announcementType} onValueChange={(v: "info" | "warning" | "success") => setAnnouncementType(v)}>
                      <SelectTrigger data-testid="select-announcement-type">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      className="w-full"
                      disabled={!announcementTitle || !announcementMessage || createAnnouncementMutation.isPending}
                      onClick={() => createAnnouncementMutation.mutate({ title: announcementTitle, message: announcementMessage, type: announcementType })}
                      data-testid="button-send-announcement"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {createAnnouncementMutation.isPending ? 'Sending...' : 'Broadcast'}
                    </Button>
                    
                    {isLoadingAnnouncements ? (
                      <Skeleton className="h-12 w-full" />
                    ) : announcements.length > 0 && (
                      <div className="pt-3 border-t space-y-2 max-h-[150px] overflow-y-auto">
                        {announcements.map((a) => (
                          <div key={a.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/50">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-sm font-medium truncate max-w-[150px]" title={a.title}>{a.title}</p>
                                <Badge 
                                  variant={a.type === 'warning' ? 'destructive' : a.type === 'success' ? 'default' : 'secondary'}
                                  className={`text-xs ${a.type === 'success' ? 'bg-green-500' : ''}`}
                                >
                                  {a.type}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteAnnouncementMutation.mutate(a.id)}
                              disabled={deleteAnnouncementMutation.isPending}
                              data-testid={`button-delete-announcement-${a.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Download className="w-5 h-5 text-teal-500" />
                      Data Export
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Download all platform data for backup or analysis.
                    </p>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleExportData}
                      disabled={isExporting}
                      data-testid="button-export-data"
                    >
                      {isExporting ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      {isExporting ? 'Exporting...' : 'Export All Data (JSON)'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !deleteUserMutation.isPending && !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user and all their grids, categories, and questions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending} data-testid="button-cancel-delete-user">Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteUserMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteUserId) {
                  deleteUserMutation.mutate(deleteUserId);
                }
              }}
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteBoardId} onOpenChange={(open) => !deleteBoardMutation.isPending && !open && setDeleteBoardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Grid</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the grid and all its categories and questions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBoardMutation.isPending} data-testid="button-cancel-delete-grid">Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteBoardMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteBoardId) {
                  deleteBoardMutation.mutate(deleteBoardId);
                }
              }}
              data-testid="button-confirm-delete-grid"
            >
              {deleteBoardMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  isLoading 
}: { 
  title: string; 
  value: number; 
  icon: typeof Users; 
  color: string;
  isLoading: boolean;
}) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-2xl font-bold text-foreground">{value}</div>
            )}
            <div className="text-xs text-muted-foreground">{title}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
