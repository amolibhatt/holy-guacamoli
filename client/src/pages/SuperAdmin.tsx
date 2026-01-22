import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  Users, Grid3X3, BarChart3, Shield, ArrowLeft,
  Trash2, MoreHorizontal,
  TrendingUp, Gamepad2, Clock, Activity, Heart,
  Globe, Lock, ListOrdered, RefreshCw,
  ChevronRight, Plus, Download, Pencil
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GameStatus, BoardVisibility } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import type { Board, GameType, BoardCategoryWithCount, Question } from "@shared/schema";
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
  
  // Game management state - which game is selected for management
  const [selectedGameSlug, setSelectedGameSlug] = useState<string | null>(null);
  
  // Starter Pack editing state
  const [editingPackId, setEditingPackId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showAllPromotableBoards, setShowAllPromotableBoards] = useState(false);
  const [demotePackId, setDemotePackId] = useState<number | null>(null);

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

  // Fetch categories for the selected Starter Pack
  const { data: packCategories = [], isLoading: loadingPackCategories } = useQuery<BoardCategoryWithCount[]>({
    queryKey: ['/api/boards', editingPackId, 'categories'],
    enabled: !!editingPackId,
  });

  // Fetch questions for selected category
  const { data: categoryQuestions = [], isLoading: loadingQuestions } = useQuery<Question[]>({
    queryKey: ['/api/board-categories', selectedCategoryId, 'questions'],
    enabled: !!selectedCategoryId,
  });

  const updateGameTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { hostEnabled?: boolean; playerEnabled?: boolean; status?: GameStatus } }) => {
      await apiRequest('PATCH', `/api/super-admin/game-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/game-types'] });
      queryClient.invalidateQueries({ queryKey: ['/api/game-types'] });
      toast({ title: "Game updated" });
    },
    onError: () => {
      toast({ title: "Couldn't update game", description: "Please try again.", variant: "destructive" });
    },
  });

  const toggleGlobalBoardMutation = useMutation({
    mutationFn: async ({ boardId, isGlobal }: { boardId: number; isGlobal: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/boards/${boardId}/global`, { isGlobal });
      return isGlobal;
    },
    onSuccess: (wasAdded) => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] });
      toast({ title: wasAdded ? "Promoted to Global Grid" : "Removed from Global Grids" });
      setShowAllPromotableBoards(false);
      setDemotePackId(null);
    },
    onError: () => {
      toast({ title: "Couldn't update grid", description: "Please try again.", variant: "destructive" });
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

  const seedDatabaseMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/super-admin/seed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/game-types'] });
      queryClient.invalidateQueries({ queryKey: ['/api/game-types'] });
      toast({ title: "Database seeded", description: "Missing game types have been added." });
    },
    onError: () => {
      toast({ title: "Seed failed", description: "Please try again.", variant: "destructive" });
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
      <AppHeader
        title="Super Admin"
        subtitle="Platform Management"
        backHref="/"
        rightContent={
          <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
            Super Admin
          </Badge>
        }
      />

      <main className="p-6 max-w-7xl mx-auto">
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-xl">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="grids" className="gap-2">
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline">All Grids</span>
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
                  color="from-blue-500 to-cyan-500"
                  isLoading={isLoadingStats}
                />
                <StatCard
                  title="Total Grids"
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

          <TabsContent value="grids" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">All Grids</h2>
                <Badge variant="secondary">{allBoards.length} grids</Badge>
              </div>

              {isLoadingBoards ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : allBoards.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No grids found. Users can create grids from the Admin panel.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {allBoards.map((board: any) => {
                    const isComplete = board.categoryCount >= 5 && board.questionCount >= 25;
                    return (
                      <Card key={board.id} className="hover-elevate">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium truncate">{board.name}</span>
                                {isComplete ? (
                                  <Badge className="bg-green-500/20 text-green-600 text-xs">Complete</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-600 text-xs">
                                    {board.categoryCount}/5 categories, {board.questionCount}/25 questions
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Owner: {board.ownerEmail || 'Unknown'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link href={`/admin?game=${board.id}`}>
                                <Button variant="outline" size="sm">
                                  <Pencil className="w-3 h-3 mr-1" />
                                  Edit
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
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="games" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Game selector header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">Games</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => seedDatabaseMutation.mutate()}
                  disabled={seedDatabaseMutation.isPending}
                  data-testid="button-sync-games"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${seedDatabaseMutation.isPending ? 'animate-spin' : ''}`} />
                  Sync Games
                </Button>
              </div>

              {isLoadingGameTypes ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {gameTypes.map((gameType) => {
                    const isSelected = selectedGameSlug === gameType.slug;
                    const starterPacks = allBoards.filter((b: any) => b.isGlobal);
                    const completePacks = starterPacks.filter((b: any) => b.categoryCount >= 5 && b.questionCount >= 25);
                    
                    return (
                      <Card key={gameType.id} className={`transition-all ${isSelected ? 'border-primary' : ''}`}>
                        <CardContent className="p-0">
                          {/* Game header - always visible */}
                          <div 
                            className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => setSelectedGameSlug(isSelected ? null : gameType.slug)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedGameSlug(isSelected ? null : gameType.slug);
                              }
                            }}
                            aria-expanded={isSelected}
                            data-testid={`game-row-${gameType.slug}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                  gameType.slug === 'sequence_squeeze'
                                      ? 'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500'
                                      : 'bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-500'
                                }`}>
                                  {gameType.slug === 'sequence_squeeze' ? (
                                    <ListOrdered className="w-6 h-6 text-white" />
                                  ) : (
                                    <Heart className="w-6 h-6 text-white" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg text-foreground">{gameType.displayName}</h3>
                                    {(gameType as any).status === 'coming_soon' && (
                                      <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                                    )}
                                    {(gameType as any).status === 'hidden' && (
                                      <Badge variant="outline" className="text-xs text-muted-foreground">Hidden</Badge>
                                    )}
                                    {(gameType as any).status === 'active' && (
                                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">Active</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{gameType.description || 'No description'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                              </div>
                            </div>
                          </div>
                          
                          {/* Expanded game management */}
                          {isSelected && (
                            <div className="border-t border-border p-4 bg-muted/20">
                              {/* Game settings row */}
                              <div className="flex flex-wrap gap-6 mb-6 pb-4 border-b border-border">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-muted-foreground">Status:</span>
                                  <Select
                                    value={(gameType as any).status || 'active'}
                                    onValueChange={(value: GameStatus) => {
                                      updateGameTypeMutation.mutate({
                                        id: gameType.id,
                                        data: { status: value }
                                      });
                                    }}
                                    disabled={updateGameTypeMutation.isPending}
                                  >
                                    <SelectTrigger className="w-[130px]" data-testid={`select-status-${gameType.slug}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="coming_soon">Coming Soon</SelectItem>
                                      <SelectItem value="hidden">Hidden</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-muted-foreground">Show to Hosts:</span>
                                  <Switch
                                    checked={gameType.hostEnabled}
                                    onCheckedChange={(checked) => {
                                      updateGameTypeMutation.mutate({
                                        id: gameType.id,
                                        data: { hostEnabled: checked }
                                      });
                                    }}
                                    disabled={updateGameTypeMutation.isPending}
                                    data-testid={`switch-host-${gameType.slug}`}
                                  />
                                </div>
                              </div>
                              
                              {/* Game-specific content */}
                              {gameType.slug === 'sequence_squeeze' && (
                                <div className="text-center py-6 text-muted-foreground">
                                  Sequence Squeeze content is managed per-game session. No global content to configure.
                                </div>
                              )}
                              
                              {gameType.slug === 'double_dip' && (
                                <div className="text-center py-6 text-muted-foreground">
                                  Double Dip uses AI-generated questions. No manual content management needed.
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {gameTypes.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No games found. Click "Sync Games" to add them.
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

      <AlertDialog open={!!demotePackId} onOpenChange={(open) => !toggleGlobalBoardMutation.isPending && !open && setDemotePackId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Global Grid</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this grid from Global Grids. You can promote it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleGlobalBoardMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              disabled={toggleGlobalBoardMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (demotePackId) {
                  toggleGlobalBoardMutation.mutate({ boardId: demotePackId, isGlobal: false });
                }
              }}
            >
              {toggleGlobalBoardMutation.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showAllPromotableBoards} onOpenChange={(open) => !toggleGlobalBoardMutation.isPending && setShowAllPromotableBoards(open)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Promote to Global Grid</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {allBoards.filter((b: any) => !b.isGlobal).map((board: any) => (
              <div key={board.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/50">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{board.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {board.categoryCount} categories, {board.questionCount} questions
                  </div>
                  <div className="text-xs text-muted-foreground/70 truncate">
                    by {board.ownerName || board.ownerEmail}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    toggleGlobalBoardMutation.mutate({ boardId: board.id, isGlobal: true });
                  }}
                  disabled={toggleGlobalBoardMutation.isPending}
                  data-testid={`button-promote-dialog-${board.id}`}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {toggleGlobalBoardMutation.isPending ? 'Promoting...' : 'Promote'}
                </Button>
              </div>
            ))}
            {allBoards.filter((b: any) => !b.isGlobal).length === 0 && (
              <p className="text-center text-muted-foreground py-4">No grids available to promote</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
