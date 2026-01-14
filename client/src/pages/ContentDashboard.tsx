import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Layers, Grid3X3, ArrowLeft, Plus, Trash2, Pencil, X, Check,
  Shield, Eye, EyeOff, BarChart3, Loader2, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import type { Board, Category, Question } from "@shared/schema";

interface ContentStats {
  totalBoards: number;
  totalCategories: number;
  activeCategories: number;
  readyToPlay: number;
  totalQuestions: number;
}

interface CategoryWithBoard extends Category {
  boardName: string;
  questionCount: number;
}

interface BoardWithCategories extends Board {
  categories: CategoryWithBoard[];
  totalQuestions: number;
}

export default function ContentDashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showNewBoardForm, setShowNewBoardForm] = useState(false);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardColor, setNewBoardColor] = useState("#6366f1");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [assignToBoardId, setAssignToBoardId] = useState<number | null>(null);

  const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
  const [editBoardName, setEditBoardName] = useState("");
  const [editBoardColor, setEditBoardColor] = useState("");

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  const [deleteBoardId, setDeleteBoardId] = useState<number | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);

  const { data: stats, isLoading: isLoadingStats } = useQuery<ContentStats>({
    queryKey: ['/api/buzzkill/content-stats'],
  });

  const { data: boards = [], isLoading: isLoadingBoards } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
  });

  const { data: allCategories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const createBoardMutation = useMutation({
    mutationFn: async (data: { name: string; colorCode: string }) => {
      return apiRequest('POST', '/api/boards', {
        name: data.name,
        description: '',
        pointValues: [10, 20, 30, 40, 50],
        colorCode: data.colorCode,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/buzzkill/content-stats'] });
      setNewBoardName("");
      setNewBoardColor("#6366f1");
      setShowNewBoardForm(false);
      toast({ title: "Board created!" });
    },
    onError: () => {
      toast({ title: "Couldn't create board", description: "Please try again.", variant: "destructive" });
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: async ({ id, name, colorCode }: { id: number; name: string; colorCode: string }) => {
      return apiRequest('PUT', `/api/boards/${id}`, { name, colorCode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      setEditingBoardId(null);
      toast({ title: "Board updated!" });
    },
    onError: () => {
      toast({ title: "Couldn't update board", description: "Please try again.", variant: "destructive" });
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: number) => {
      await apiRequest('DELETE', `/api/boards/${boardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/buzzkill/content-stats'] });
      setDeleteBoardId(null);
      if (selectedBoardId === deleteBoardId) {
        setSelectedBoardId(null);
      }
      toast({ title: "Board deleted!" });
    },
    onError: () => {
      toast({ title: "Couldn't delete board", description: "Please try again.", variant: "destructive" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; boardId?: number }) => {
      const response = await apiRequest('POST', '/api/categories', { name: data.name });
      const category = await response.json();
      if (data.boardId && category?.id) {
        await apiRequest('POST', `/api/boards/${data.boardId}/categories`, { categoryId: category.id });
      }
      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/buzzkill/content-stats'] });
      setNewCategoryName("");
      setAssignToBoardId(null);
      setShowNewCategoryForm(false);
      toast({ title: "Category created!" });
    },
    onError: () => {
      toast({ title: "Couldn't create category", description: "Please try again.", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name, isActive }: { id: number; name?: string; isActive?: boolean }) => {
      return apiRequest('PUT', `/api/categories/${id}`, { name, isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/buzzkill/content-stats'] });
      setEditingCategoryId(null);
      toast({ title: "Category updated!" });
    },
    onError: () => {
      toast({ title: "Couldn't update category", description: "Please try again.", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      await apiRequest('DELETE', `/api/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/buzzkill/content-stats'] });
      setDeleteCategoryId(null);
      if (selectedCategoryId === deleteCategoryId) {
        setSelectedCategoryId(null);
      }
      toast({ title: "Category deleted!" });
    },
    onError: () => {
      toast({ title: "Couldn't delete category", description: "Please try again.", variant: "destructive" });
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

  return (
    <div className="min-h-screen gradient-game">
      <AppHeader
        title="Content Dashboard"
        subtitle="Manage Boards, Categories & Questions"
        backHref="/admin/super"
        rightContent={
          <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
            Super Admin
          </Badge>
        }
      />

      <main className="p-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard
              title="Boards"
              value={stats?.totalBoards ?? 0}
              icon={Grid3X3}
              color="from-blue-500 to-cyan-500"
              isLoading={isLoadingStats}
            />
            <StatCard
              title="Categories"
              value={stats?.totalCategories ?? 0}
              icon={Layers}
              color="from-green-500 to-emerald-500"
              isLoading={isLoadingStats}
            />
            <StatCard
              title="Active"
              value={stats?.activeCategories ?? 0}
              icon={Eye}
              color="from-purple-500 to-pink-500"
              isLoading={isLoadingStats}
            />
            <StatCard
              title="Ready to Play"
              value={stats?.readyToPlay ?? 0}
              icon={Check}
              color="from-orange-500 to-amber-500"
              isLoading={isLoadingStats}
            />
            <StatCard
              title="Questions"
              value={stats?.totalQuestions ?? 0}
              icon={BarChart3}
              color="from-red-500 to-rose-500"
              isLoading={isLoadingStats}
            />
          </div>
        </motion.div>

        <Tabs defaultValue="boards" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="boards" className="gap-2" data-testid="tab-boards">
              <Grid3X3 className="w-4 h-4" />
              Boards
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2" data-testid="tab-categories">
              <Layers className="w-4 h-4" />
              Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="boards" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Boards</h2>
                <Button
                  onClick={() => setShowNewBoardForm(true)}
                  disabled={showNewBoardForm}
                  data-testid="button-new-board"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Board
                </Button>
              </div>

              {showNewBoardForm && (
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        placeholder="Board name..."
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        className="max-w-xs"
                        data-testid="input-new-board-name"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Color:</span>
                        <input
                          type="color"
                          value={newBoardColor}
                          onChange={(e) => setNewBoardColor(e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer"
                          data-testid="input-new-board-color"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => createBoardMutation.mutate({ name: newBoardName, colorCode: newBoardColor })}
                          disabled={!newBoardName.trim() || createBoardMutation.isPending}
                          data-testid="button-save-new-board"
                        >
                          {createBoardMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setShowNewBoardForm(false);
                            setNewBoardName("");
                          }}
                          data-testid="button-cancel-new-board"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isLoadingBoards ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {boards.map((board) => (
                    <Card
                      key={board.id}
                      className={`hover-elevate cursor-pointer ${selectedBoardId === board.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setSelectedBoardId(selectedBoardId === board.id ? null : board.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: board.colorCode || '#6366f1' }}
                            >
                              <Grid3X3 className="w-5 h-5 text-white" />
                            </div>
                            {editingBoardId === board.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editBoardName}
                                  onChange={(e) => setEditBoardName(e.target.value)}
                                  className="w-40"
                                  onClick={(e) => e.stopPropagation()}
                                  data-testid={`input-edit-board-${board.id}`}
                                />
                                <input
                                  type="color"
                                  value={editBoardColor}
                                  onChange={(e) => setEditBoardColor(e.target.value)}
                                  className="w-8 h-8 rounded cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                  data-testid={`input-edit-board-color-${board.id}`}
                                />
                                <Button
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateBoardMutation.mutate({
                                      id: board.id,
                                      name: editBoardName,
                                      colorCode: editBoardColor,
                                    });
                                  }}
                                  disabled={updateBoardMutation.isPending}
                                  data-testid={`button-save-edit-board-${board.id}`}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingBoardId(null);
                                  }}
                                  data-testid={`button-cancel-edit-board-${board.id}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <div className="font-medium text-foreground">{board.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {(board.pointValues as number[])?.length || 0} point values
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {editingBoardId !== board.id && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingBoardId(board.id);
                                    setEditBoardName(board.name);
                                    setEditBoardColor(board.colorCode || '#6366f1');
                                  }}
                                  data-testid={`button-edit-board-${board.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteBoardId(board.id);
                                  }}
                                  data-testid={`button-delete-board-${board.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </>
                            )}
                            <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${selectedBoardId === board.id ? 'rotate-90' : ''}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {boards.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No boards yet. Create your first board to get started.
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Categories</h2>
                <Button
                  onClick={() => setShowNewCategoryForm(true)}
                  disabled={showNewCategoryForm}
                  data-testid="button-new-category"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Category
                </Button>
              </div>

              {showNewCategoryForm && (
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        placeholder="Category name..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="max-w-xs"
                        data-testid="input-new-category-name"
                      />
                      <Select
                        value={assignToBoardId?.toString() || "none"}
                        onValueChange={(v) => setAssignToBoardId(v === "none" ? null : parseInt(v))}
                      >
                        <SelectTrigger className="w-[200px]" data-testid="select-assign-board">
                          <SelectValue placeholder="Assign to board..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No board (unassigned)</SelectItem>
                          {boards.map((board) => (
                            <SelectItem key={board.id} value={board.id.toString()}>
                              {board.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => createCategoryMutation.mutate({
                            name: newCategoryName,
                            boardId: assignToBoardId || undefined,
                          })}
                          disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                          data-testid="button-save-new-category"
                        >
                          {createCategoryMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setShowNewCategoryForm(false);
                            setNewCategoryName("");
                            setAssignToBoardId(null);
                          }}
                          data-testid="button-cancel-new-category"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isLoadingCategories ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {allCategories.map((category) => (
                    <Card
                      key={category.id}
                      className={`hover-elevate ${!category.isActive ? 'opacity-60' : ''}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${category.isActive ? 'bg-primary/20' : 'bg-muted'}`}>
                              <Layers className={`w-5 h-5 ${category.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            {editingCategoryId === category.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editCategoryName}
                                  onChange={(e) => setEditCategoryName(e.target.value)}
                                  className="w-40"
                                  data-testid={`input-edit-category-${category.id}`}
                                />
                                <Button
                                  size="icon"
                                  onClick={() => updateCategoryMutation.mutate({
                                    id: category.id,
                                    name: editCategoryName,
                                  })}
                                  disabled={updateCategoryMutation.isPending}
                                  data-testid={`button-save-edit-category-${category.id}`}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setEditingCategoryId(null)}
                                  data-testid={`button-cancel-edit-category-${category.id}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <div className="font-medium text-foreground flex items-center gap-2">
                                  {category.name}
                                  {!category.isActive && (
                                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Source Group: {category.sourceGroup || 'None'}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Active</span>
                              <Switch
                                checked={category.isActive}
                                onCheckedChange={(checked) =>
                                  updateCategoryMutation.mutate({
                                    id: category.id,
                                    isActive: checked,
                                  })
                                }
                                data-testid={`switch-category-active-${category.id}`}
                              />
                            </div>
                            {editingCategoryId !== category.id && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingCategoryId(category.id);
                                    setEditCategoryName(category.name);
                                  }}
                                  data-testid={`button-edit-category-${category.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setDeleteCategoryId(category.id)}
                                  data-testid={`button-delete-category-${category.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {allCategories.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No categories yet. Create your first category to get started.
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={deleteBoardId !== null} onOpenChange={(open) => !open && setDeleteBoardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this board and all its category links. Categories themselves won't be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-board">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBoardId && deleteBoardMutation.mutate(deleteBoardId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-board"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteCategoryId !== null} onOpenChange={(open) => !open && setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category and all its questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-category">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCategoryId && deleteCategoryMutation.mutate(deleteCategoryId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-category"
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
  isLoading,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
  isLoading: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            {isLoading ? (
              <Skeleton className="w-12 h-6" />
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
