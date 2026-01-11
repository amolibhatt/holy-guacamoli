import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Users, Grid3X3, BarChart3, ArrowLeft, Shield, 
  UserCheck, UserX, Trash2, Eye, MoreHorizontal,
  TrendingUp, Gamepad2, Clock, Activity, Heart, Grid2X2
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
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

export default function SuperAdmin() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteBoardId, setDeleteBoardId] = useState<number | null>(null);

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

  const updateGameTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { hostEnabled?: boolean; playerEnabled?: boolean } }) => {
      await apiRequest('PATCH', `/api/super-admin/game-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/game-types'] });
      toast({ title: "Game visibility updated" });
    },
    onError: () => {
      toast({ title: "Failed to update game", variant: "destructive" });
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
    },
    onError: () => {
      toast({ title: "Failed to delete user", variant: "destructive" });
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: number) => {
      await apiRequest('DELETE', `/api/super-admin/boards/${boardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/stats'] });
      toast({ title: "Board deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete board", variant: "destructive" });
    },
  });

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

  return (
    <div className="min-h-screen gradient-game">
      <header className="border-b border-primary/20 bg-card/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Super Admin</h1>
                <span className="text-xs text-muted-foreground">Platform Management</span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
            Super Admin
          </Badge>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-xl">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-2">
              <Gamepad2 className="w-4 h-4" />
              Games
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="boards" className="gap-2">
              <Grid3X3 className="w-4 h-4" />
              Boards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-4">Platform Overview</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                  title="Total Users"
                  value={stats?.totalUsers ?? 0}
                  icon={Users}
                  color="from-blue-500 to-cyan-500"
                  isLoading={isLoadingStats}
                />
                <StatCard
                  title="Total Boards"
                  value={stats?.totalBoards ?? 0}
                  icon={Grid3X3}
                  color="from-green-500 to-emerald-500"
                  isLoading={isLoadingStats}
                />
                <StatCard
                  title="Questions"
                  value={stats?.totalQuestions ?? 0}
                  icon={Activity}
                  color="from-purple-500 to-pink-500"
                  isLoading={isLoadingStats}
                />
                <StatCard
                  title="Games Played"
                  value={stats?.totalGamesPlayed ?? 0}
                  icon={Gamepad2}
                  color="from-orange-500 to-amber-500"
                  isLoading={isLoadingStats}
                />
                <StatCard
                  title="Sessions Today"
                  value={stats?.activeSessionsToday ?? 0}
                  icon={Clock}
                  color="from-red-500 to-rose-500"
                  isLoading={isLoadingStats}
                />
                <StatCard
                  title="New This Week"
                  value={stats?.newUsersThisWeek ?? 0}
                  icon={TrendingUp}
                  color="from-indigo-500 to-violet-500"
                  isLoading={isLoadingStats}
                />
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="games" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Game Visibility</h2>
                <Badge variant="secondary">{gameTypes.length} games</Badge>
              </div>

              <p className="text-muted-foreground mb-6">
                Control which games are visible to hosts and players. Disabled games won't appear in the game selection menu.
              </p>

              {isLoadingGameTypes ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {gameTypes.map((gameType) => (
                    <Card key={gameType.id} className="hover-elevate">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              gameType.slug === 'grid_of_grudges' 
                                ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                                : 'bg-gradient-to-br from-pink-500 to-rose-500'
                            }`}>
                              {gameType.slug === 'grid_of_grudges' ? (
                                <Grid2X2 className="w-6 h-6 text-white" />
                              ) : (
                                <Heart className="w-6 h-6 text-white" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-foreground">
                                {gameType.displayName}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {gameType.description || 'No description'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm text-muted-foreground">Show to Hosts</span>
                              <Switch
                                checked={gameType.hostEnabled}
                                onCheckedChange={(checked) => {
                                  updateGameTypeMutation.mutate({
                                    id: gameType.id,
                                    data: { hostEnabled: checked }
                                  });
                                }}
                                data-testid={`switch-host-${gameType.slug}`}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm text-muted-foreground">Show to Players</span>
                              <Switch
                                checked={gameType.playerEnabled}
                                onCheckedChange={(checked) => {
                                  updateGameTypeMutation.mutate({
                                    id: gameType.id,
                                    data: { playerEnabled: checked }
                                  });
                                }}
                                data-testid={`switch-player-${gameType.slug}`}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {gameTypes.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No games configured yet.
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">User Management</h2>
                <Badge variant="secondary">{allUsers.length} users</Badge>
              </div>

              {isLoadingUsers ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {allUsers.map((u) => (
                    <Card key={u.id} className="hover-elevate">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
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
                                  <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30 text-xs">
                                    Super Admin
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">{u.email}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right text-sm">
                              <div className="text-foreground">{u.boardCount} boards</div>
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
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="boards" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Board Moderation</h2>
                <Badge variant="secondary">{allBoards.length} boards</Badge>
              </div>

              {isLoadingBoards ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {allBoards.map((board) => (
                    <Card key={board.id} className="hover-elevate">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                              <Grid3X3 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{board.name}</div>
                              <div className="text-sm text-muted-foreground">
                                by {board.ownerName || board.ownerEmail}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right text-sm">
                              <div className="text-foreground">{board.categoryCount} categories</div>
                              <div className="text-muted-foreground">{board.questionCount} questions</div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setLocation(`/board/${board.id}`)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Board
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteBoardId(board.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Board
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {allBoards.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No boards have been created yet.
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user and all their boards, categories, and questions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteUserId) {
                  deleteUserMutation.mutate(deleteUserId);
                  setDeleteUserId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteBoardId} onOpenChange={() => setDeleteBoardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the board and all its categories and questions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteBoardId) {
                  deleteBoardMutation.mutate(deleteBoardId);
                  setDeleteBoardId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
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
