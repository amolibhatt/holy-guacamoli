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
  Download, Send, UserCheck, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
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

interface UserWithStats extends SafeUser {
  boardCount: number;
  questionCount: number;
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

export default function SuperAdmin() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteBoardId, setDeleteBoardId] = useState<number | null>(null);
  const [expandedGameSlug, setExpandedGameSlug] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [gridSearch, setGridSearch] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [activeTab, setActiveTab] = useState("analytics");

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

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: { title: string; message: string; type?: string }) => {
      await apiRequest('POST', '/api/super-admin/announcements', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/announcements'] });
      setAnnouncementTitle("");
      setAnnouncementMessage("");
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

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/super-admin/export');
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `platform-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Data exported successfully" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
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
              <Button className="w-full">
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

  return (
    <div className="min-h-screen gradient-game">
      <AppHeader minimal backHref="/" title="Super Admin" />

      <main className="px-4 py-6 max-w-6xl mx-auto w-full">
        <Tabs defaultValue="analytics" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 max-w-3xl">
            <TabsTrigger value="analytics" className="gap-2" data-testid="tab-analytics">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-2" data-testid="tab-games">
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline">Games</span>
            </TabsTrigger>
            <TabsTrigger value="grids" className="gap-2" data-testid="tab-grids">
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline">Grids</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2" data-testid="tab-system">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2" data-testid="tab-actions">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Actions</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-2xl font-bold text-foreground">Platform Overview</h2>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/super-admin/stats'] });
                  }}
                  data-testid="button-refresh-analytics"
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

              <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">User Engagement (Active Users)</h3>
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

              <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Session & Player Stats</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {isLoadingRoomStats ? (
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
                            <p className="text-2xl font-bold">{roomStats?.sessionsToday ?? 0}</p>
                            <p className="text-sm text-muted-foreground">Sessions Today</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                            <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{roomStats?.playersToday ?? 0}</p>
                            <p className="text-sm text-muted-foreground">Players Today</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <Gamepad2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{roomStats?.activeRooms ?? 0}</p>
                            <p className="text-sm text-muted-foreground">Active Rooms</p>
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
            </motion.div>
          </TabsContent>

          <TabsContent value="games" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-6">Game Management</h2>

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
                            data-testid={`game-row-${gameType.slug}`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient}`}>
                                  <GameIcon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
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
                                      <div className="flex items-center justify-between gap-4">
                                        <h4 className="font-medium text-foreground">All Grids</h4>
                                        <Badge variant="secondary">{allBoards.length} total</Badge>
                                      </div>
                                      
                                      {isLoadingBoards ? (
                                        <Skeleton className="h-20 w-full" />
                                      ) : allBoards.length === 0 ? (
                                        <div className="text-center py-6 text-muted-foreground">
                                          No grids created yet.
                                        </div>
                                      ) : (
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                          {allBoards.map((board) => {
                                            const isComplete = board.categoryCount >= 5 && board.questionCount >= 25;
                                            const isStarterPack = board.isStarterPack ?? false;
                                            return (
                                              <div key={board.id} className="flex items-center justify-between gap-3 p-3 bg-background rounded-lg border">
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium truncate">{board.name}</span>
                                                    {isComplete ? (
                                                      <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 text-xs">Complete</Badge>
                                                    ) : (
                                                      <Badge variant="outline" className="text-amber-600 dark:text-amber-400 text-xs">
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
                                                  <Link href={`/admin?game=${board.id}`}>
                                                    <Button variant="ghost" size="icon">
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
                                      )}
                                    </div>
                                  )}
                                  
                                  {gameType.slug === 'sequence_squeeze' && (
                                    <div className="text-center py-4 text-muted-foreground">
                                      Content is created per-session during gameplay.
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

          <TabsContent value="grids" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <h2 className="text-2xl font-bold text-foreground">All Grids</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search grids..."
                      value={gridSearch}
                      onChange={(e) => setGridSearch(e.target.value)}
                      className="pl-9 w-[200px]"
                      data-testid="input-grid-search"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] });
                    }}
                    data-testid="button-refresh-grids"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Badge variant="secondary">{allBoards.length} grids</Badge>
                </div>
              </div>

              {isLoadingBoards ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : allBoards.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No grids created yet.
                  </CardContent>
                </Card>
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
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No grids match "{gridSearch}"
                      </CardContent>
                    </Card>
                  );
                }
                
                return (
                  <div className="space-y-2">
                    {filteredGrids.map((board) => {
                      const isComplete = board.categoryCount >= 5 && board.questionCount >= 25;
                      const isStarterPack = board.isStarterPack ?? false;
                      return (
                        <Card key={board.id} className="hover-elevate">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-foreground truncate">{board.name}</span>
                                  {isComplete ? (
                                    <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 text-xs">Complete</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-amber-600 dark:text-amber-400 text-xs">
                                      {board.categoryCount}/5 categories, {board.questionCount}/25 questions
                                    </Badge>
                                  )}
                                  {isStarterPack && (
                                    <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                                      <Star className="w-3 h-3 mr-1" />
                                      Starter
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  Owner: {board.ownerName || board.ownerEmail || 'Unknown'}
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
                                  data-testid={`button-starter-pack-grid-${board.id}`}
                                >
                                  <Star className={`w-4 h-4 ${isStarterPack ? 'fill-current' : ''}`} />
                                </Button>
                                <Link href={`/admin?game=${board.id}`}>
                                  <Button variant="ghost" size="icon">
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteBoardId(board.id)}
                                  data-testid={`button-delete-grid-tab-${board.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}
            </motion.div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <h2 className="text-2xl font-bold text-foreground">User Management</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9 w-[200px]"
                      data-testid="input-user-search"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/stats'] });
                    }}
                    data-testid="button-refresh-users"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Badge variant="secondary">{allUsers.length} users</Badge>
                </div>
              </div>

              {isLoadingUsers ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : allUsers.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No users found.
                  </CardContent>
                </Card>
              ) : (() => {
                const filteredUsers = allUsers.filter((u) => {
                  if (!userSearch.trim()) return true;
                  const searchLower = userSearch.toLowerCase();
                  return (
                    u.email.toLowerCase().includes(searchLower) ||
                    u.firstName?.toLowerCase().includes(searchLower) ||
                    u.lastName?.toLowerCase().includes(searchLower)
                  );
                });
                
                if (filteredUsers.length === 0) {
                  return (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No users match "{userSearch}"
                      </CardContent>
                    </Card>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {filteredUsers.map((u) => (
                      <Card key={u.id} className="hover-elevate">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-lg font-bold text-primary">
                                {u.firstName?.[0] || u.email[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {u.firstName} {u.lastName}
                                </span>
                                {u.role === 'super_admin' && (
                                  <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-xs">
                                    Super Admin
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">{u.email}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right text-sm">
                              <div className="text-foreground">{u.boardCount} grids</div>
                              <div className="text-muted-foreground">{u.questionCount} questions</div>
                            </div>
                            {u.role !== 'super_admin' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setDeleteUserId(u.id)}
                                    data-testid={`button-delete-user-${u.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  </div>
                );
              })()}
            </motion.div>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-6">System Health</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-teal-500" />
                      Database Stats
                    </CardTitle>
                    <CardDescription>Current table sizes and record counts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingDbStats ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                          <Skeleton key={i} className="h-5 w-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[
                          { label: 'Users', value: dbStats?.users ?? 0, color: 'text-emerald-600' },
                          { label: 'Boards', value: dbStats?.boards ?? 0, color: 'text-rose-600' },
                          { label: 'Categories', value: dbStats?.categories ?? 0, color: 'text-violet-600' },
                          { label: 'Questions', value: dbStats?.questions ?? 0, color: 'text-amber-600' },
                          { label: 'Sessions', value: dbStats?.sessions ?? 0, color: 'text-teal-600' },
                          { label: 'Players', value: dbStats?.players ?? 0, color: 'text-pink-600' },
                          { label: 'Game Types', value: dbStats?.gameTypes ?? 0, color: 'text-indigo-600' },
                        ].map((stat) => (
                          <div key={stat.label} className="flex justify-between items-center">
                            <span className="text-muted-foreground">{stat.label}</span>
                            <span className={`font-semibold ${stat.color} dark:opacity-80`}>{stat.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flag className="w-5 h-5 text-amber-500" />
                      Flagged Content
                    </CardTitle>
                    <CardDescription>Boards requiring moderation review</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingFlagged ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    ) : flaggedBoards.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No flagged content</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {flaggedBoards.slice(0, 5).map((board) => (
                          <div key={board.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                            <span className="text-sm font-medium">{board.name}</span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateModerationMutation.mutate({ boardId: board.id, data: { moderationStatus: 'approved' } })}
                                data-testid={`button-approve-board-${board.id}`}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteBoardId(board.id)}
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
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-6">Quick Actions</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-violet-500" />
                      Broadcast Announcement
                    </CardTitle>
                    <CardDescription>Send a message to all users</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      placeholder="Announcement title"
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      data-testid="input-announcement-title"
                    />
                    <Input
                      placeholder="Announcement message"
                      value={announcementMessage}
                      onChange={(e) => setAnnouncementMessage(e.target.value)}
                      data-testid="input-announcement-message"
                    />
                    <Button
                      className="w-full"
                      disabled={!announcementTitle || !announcementMessage || createAnnouncementMutation.isPending}
                      onClick={() => createAnnouncementMutation.mutate({ title: announcementTitle, message: announcementMessage })}
                      data-testid="button-send-announcement"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {createAnnouncementMutation.isPending ? 'Sending...' : 'Send Announcement'}
                    </Button>
                    
                    {isLoadingAnnouncements ? (
                      <div className="mt-4 pt-4 border-t space-y-2">
                        <Skeleton className="h-4 w-32" />
                        {[1, 2].map((i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : announcements.length > 0 && (
                      <div className="mt-4 pt-4 border-t space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Recent Announcements</p>
                        {announcements.slice(0, 3).map((a) => (
                          <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div>
                              <p className="text-sm font-medium">{a.title}</p>
                              <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</p>
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
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="w-5 h-5 text-teal-500" />
                      Data Export
                    </CardTitle>
                    <CardDescription>Export platform data for backup or analysis</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Download a complete snapshot of all users, boards, categories, and questions.
                    </p>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleExportData}
                      data-testid="button-export-data"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export All Data (JSON)
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
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteUserMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteUserId) {
                  deleteUserMutation.mutate(deleteUserId);
                }
              }}
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
            <AlertDialogCancel disabled={deleteBoardMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteBoardMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteBoardId) {
                  deleteBoardMutation.mutate(deleteBoardId);
                }
              }}
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
