import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, BarChart3, Shield, ArrowLeft,
  Trash2, MoreHorizontal, Pencil,
  TrendingUp, Gamepad2, Clock, Activity, Heart,
  ListOrdered, Grid3X3,
  ChevronRight, Star, ChevronDown
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

export default function SuperAdmin() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteBoardId, setDeleteBoardId] = useState<number | null>(null);
  const [expandedGameSlug, setExpandedGameSlug] = useState<string | null>(null);

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
      case 'double_dip': return Heart;
      default: return Gamepad2;
    }
  };

  const getGameGradient = (slug: string) => {
    switch (slug) {
      case 'blitzgrid': return 'from-rose-300 via-pink-300 to-fuchsia-300';
      case 'sequence_squeeze': return 'from-emerald-300 via-teal-300 to-cyan-300';
      case 'double_dip': return 'from-rose-300 via-pink-300 to-fuchsia-300';
      default: return 'from-violet-300 via-purple-300 to-indigo-300';
    }
  };

  const blitzgrids = allBoards.filter((b: any) => b.theme === 'blitzgrid' || b.isBlitzgrid);

  return (
    <div className="min-h-screen gradient-game">
      <AppHeader minimal />

      <main className="p-6 max-w-7xl mx-auto">
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-2">
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline">Games</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-4">Platform Overview</h2>
              
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
                    const status = (gameType as any).status || 'active';
                    
                    return (
                      <Card key={gameType.id} className={`transition-all ${isExpanded ? 'border-primary' : ''}`}>
                        <CardContent className="p-0">
                          <div 
                            className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
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
                            <div className="flex items-center justify-between">
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
                                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">Active</Badge>
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
                                      <div className="flex items-center justify-between">
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
                                          {allBoards.map((board: any) => {
                                            const isComplete = board.categoryCount >= 5 && board.questionCount >= 25;
                                            const isStarterPack = board.isStarterPack ?? false;
                                            return (
                                              <div key={board.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium truncate">{board.name}</span>
                                                    {isComplete ? (
                                                      <Badge className="bg-green-500/20 text-green-600 text-xs">Complete</Badge>
                                                    ) : (
                                                      <Badge variant="outline" className="text-amber-600 text-xs">
                                                        {board.categoryCount}/5 categories
                                                      </Badge>
                                                    )}
                                                    {isStarterPack && (
                                                      <Badge className="bg-amber-500/20 text-amber-600 text-xs">
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
                                                    size="sm"
                                                    onClick={() => toggleStarterPackMutation.mutate({ 
                                                      boardId: board.id, 
                                                      isStarterPack: !isStarterPack 
                                                    })}
                                                    disabled={toggleStarterPackMutation.isPending || !isComplete}
                                                    title={!isComplete ? "Grid must be complete" : "Toggle starter pack"}
                                                    data-testid={`button-starter-pack-${board.id}`}
                                                  >
                                                    <Star className={`w-3 h-3 ${isStarterPack ? 'fill-current' : ''}`} />
                                                  </Button>
                                                  <Link href={`/admin?game=${board.id}`}>
                                                    <Button variant="ghost" size="sm">
                                                      <Pencil className="w-3 h-3" />
                                                    </Button>
                                                  </Link>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeleteBoardId(board.id)}
                                                    data-testid={`button-delete-grid-${board.id}`}
                                                  >
                                                    <Trash2 className="w-3 h-3 text-destructive" />
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
              ) : allUsers.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No users found.
                  </CardContent>
                </Card>
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
              )}
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
