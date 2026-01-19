import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Pencil, X, Check, HelpCircle, ChevronLeft, LayoutGrid, FolderOpen, History, CheckCircle, Link2, Unlink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import type { Category, Question, Board, BoardCategoryWithCount } from "@shared/schema";

const FIXED_POINT_VALUES = [10, 20, 30, 40, 50];

function ProgressBar({ value, max }: { value: number; max: number }) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  const isComplete = value >= max;
  
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div 
        className={`h-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : percent > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default function Admin() {
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"categories" | "boards">("categories");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newBoardName, setNewBoardName] = useState("");
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [showNewBoardForm, setShowNewBoardForm] = useState(false);
  
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  
  const [deleteCategoryConfirmId, setDeleteCategoryConfirmId] = useState<number | null>(null);
  const [deleteBoardConfirmId, setDeleteBoardConfirmId] = useState<number | null>(null);
  
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  
  // Data fetching
  type CategoryWithCount = Category & { questionCount: number };
  
  const { data: categories = [], isLoading: loadingCategories } = useQuery<CategoryWithCount[]>({
    queryKey: ['/api/categories/with-counts'],
    enabled: isAuthenticated,
  });
  
  const { data: boards = [], isLoading: loadingBoards } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
    enabled: isAuthenticated,
  });
  
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  
  const { data: categoryQuestions = [], isLoading: loadingQuestions } = useQuery<Question[]>({
    queryKey: ['/api/categories', selectedCategoryId, 'questions'],
    enabled: !!selectedCategoryId,
  });
  
  const usedPoints = categoryQuestions.map(q => q.points);
  const availablePoints = FIXED_POINT_VALUES.filter(p => !usedPoints.includes(p));
  
  const { data: boardCategories = [] } = useQuery<BoardCategoryWithCount[]>({
    queryKey: ['/api/boards', selectedBoardId, 'categories'],
    enabled: !!selectedBoardId,
  });
  
  // Get question counts directly from categories (they now include counts)
  const getCategoryQuestionCount = (categoryId: number) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.questionCount ?? 0;
  };
  
  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiRequest('POST', '/api/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories/with-counts'] });
      setNewCategoryName("");
      setShowNewCategoryForm(false);
      toast({ title: "Category created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    },
  });
  
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      return apiRequest('PUT', `/api/categories/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories/with-counts'] });
      setEditingCategoryId(null);
      toast({ title: "Category updated" });
    },
  });
  
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories/with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      if (selectedCategoryId === deleteCategoryConfirmId) setSelectedCategoryId(null);
      toast({ title: "Category deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Cannot delete", description: error.message, variant: "destructive" });
    },
  });
  
  const createBoardMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiRequest('POST', '/api/boards', { ...data, description: '', pointValues: FIXED_POINT_VALUES });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      setNewBoardName("");
      setShowNewBoardForm(false);
      toast({ title: "Board created" });
    },
  });
  
  const deleteBoardMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/boards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      if (selectedBoardId === deleteBoardConfirmId) setSelectedBoardId(null);
      toast({ title: "Board deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Cannot delete", description: error.message, variant: "destructive" });
    },
  });
  
  const linkCategoryMutation = useMutation({
    mutationFn: async ({ boardId, categoryId }: { boardId: number; categoryId: number }) => {
      return apiRequest('POST', `/api/boards/${boardId}/categories`, { categoryId, position: boardCategories.length });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      toast({ title: "Category linked" });
    },
    onError: (error: Error) => {
      toast({ title: "Cannot link", description: error.message, variant: "destructive" });
    },
  });
  
  const unlinkCategoryMutation = useMutation({
    mutationFn: async (boardCategoryId: number) => {
      return apiRequest('DELETE', `/api/board-categories/${boardCategoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      toast({ title: "Category unlinked" });
    },
  });
  
  const createQuestionMutation = useMutation({
    mutationFn: async (data: { categoryId: number; question: string; correctAnswer: string; points: number }) => {
      return apiRequest('POST', '/api/questions', { ...data, options: [] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', selectedCategoryId, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories/with-counts'] });
      setNewQuestion("");
      setNewAnswer("");
      toast({ title: "Question added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    },
  });
  
  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, question, correctAnswer }: { id: number; question: string; correctAnswer: string }) => {
      return apiRequest('PUT', `/api/questions/${id}`, { question, correctAnswer, options: [] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', selectedCategoryId, 'questions'] });
      setEditingQuestionId(null);
      setEditQuestion("");
      setEditAnswer("");
      toast({ title: "Question updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });
  
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', selectedCategoryId, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories/with-counts'] });
      toast({ title: "Question deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Cannot delete", description: error.message, variant: "destructive" });
    },
  });

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p>Please log in to access the admin panel.</p>
            <Link href="/login">
              <Button className="mt-4">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Category detail view
  if (selectedCategoryId && selectedCategory) {
    return (
      <div className="min-h-screen bg-background" data-testid="page-admin">
        <AppHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setSelectedCategoryId(null)} data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{selectedCategory.name}</h1>
              <p className="text-muted-foreground text-sm">{categoryQuestions.length}/5 questions</p>
            </div>
            <div className="ml-auto">
              <ProgressBar value={categoryQuestions.length} max={5} />
            </div>
          </div>
          
          <Card>
            <CardContent className="p-6 space-y-4">
              {loadingQuestions ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : (
                categoryQuestions.sort((a, b) => a.points - b.points).map(q => {
                  const isEditing = editingQuestionId === q.id;
                  
                  return (
                    <div key={q.id} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border">
                      <Badge variant="secondary" className="shrink-0">{q.points} pts</Badge>
                      {isEditing ? (
                        <div className="flex-1 space-y-2">
                          <Input
                            value={editQuestion}
                            onChange={(e) => setEditQuestion(e.target.value)}
                            placeholder="Question"
                            autoFocus
                          />
                          <Input
                            value={editAnswer}
                            onChange={(e) => setEditAnswer(e.target.value)}
                            placeholder="Answer"
                          />
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              onClick={() => updateQuestionMutation.mutate({ id: q.id, question: editQuestion.trim(), correctAnswer: editAnswer.trim() })}
                              disabled={!editQuestion.trim() || !editAnswer.trim() || updateQuestionMutation.isPending}
                            >
                              {updateQuestionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingQuestionId(null); setEditQuestion(""); setEditAnswer(""); }}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{q.question}</p>
                            <p className="text-xs text-primary mt-1">Answer: {q.correctAnswer}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => { setEditingQuestionId(q.id); setEditQuestion(q.question); setEditAnswer(q.correctAnswer); }}
                              className="text-muted-foreground"
                              data-testid={`button-edit-question-${q.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => deleteQuestionMutation.mutate(q.id)}
                              className="text-muted-foreground hover:text-destructive"
                              data-testid={`button-delete-question-${q.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
              
              {/* Add question form */}
              {availablePoints.length > 0 && (
                <div className="p-4 border-2 border-dashed border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge>{availablePoints[0]} pts</Badge>
                    <span className="text-sm text-muted-foreground">Next question</span>
                  </div>
                  <div className="space-y-3">
                    <Input
                      placeholder="Enter question..."
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      data-testid="input-question"
                    />
                    <Input
                      placeholder="Enter answer..."
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      data-testid="input-answer"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newQuestion.trim() && newAnswer.trim()) {
                          createQuestionMutation.mutate({
                            categoryId: selectedCategoryId,
                            question: newQuestion.trim(),
                            correctAnswer: newAnswer.trim(),
                            points: availablePoints[0],
                          });
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        if (newQuestion.trim() && newAnswer.trim()) {
                          createQuestionMutation.mutate({
                            categoryId: selectedCategoryId,
                            question: newQuestion.trim(),
                            correctAnswer: newAnswer.trim(),
                            points: availablePoints[0],
                          });
                        }
                      }}
                      disabled={!newQuestion.trim() || !newAnswer.trim() || createQuestionMutation.isPending}
                      className="w-full"
                      data-testid="button-add-question"
                    >
                      {createQuestionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      Add Question
                    </Button>
                  </div>
                </div>
              )}
              
              {availablePoints.length === 0 && (
                <div className="text-center py-6">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="font-medium text-emerald-600">Category complete!</p>
                  <p className="text-sm text-muted-foreground">All 5 questions are ready</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Board detail view
  if (selectedBoardId) {
    const selectedBoard = boards.find(b => b.id === selectedBoardId);
    const linkedCategoryIds = boardCategories.map(bc => bc.categoryId);
    const availableCategories = categories.filter(c => !linkedCategoryIds.includes(c.id));
    
    return (
      <div className="min-h-screen bg-background" data-testid="page-admin">
        <AppHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setSelectedBoardId(null)} data-testid="button-back-board">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{selectedBoard?.name || "Board"}</h1>
              <p className="text-muted-foreground text-sm">{boardCategories.length}/5 categories linked</p>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* Linked categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> Linked Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {boardCategories.length === 0 && (
                  <p className="text-muted-foreground text-sm py-4 text-center">No categories linked yet</p>
                )}
                {boardCategories.map(bc => {
                  const cat = categories.find(c => c.id === bc.categoryId);
                  const qCount = getCategoryQuestionCount(bc.categoryId);
                  return (
                    <div key={bc.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{cat?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{qCount}/5 questions</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => unlinkCategoryMutation.mutate(bc.id)}
                        className="text-muted-foreground hover:text-destructive"
                        data-testid={`button-unlink-${bc.id}`}
                      >
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            
            {/* Available categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" /> Available Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {availableCategories.length === 0 && (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    {categories.length === 0 ? "Create categories first" : "All categories are linked"}
                  </p>
                )}
                {availableCategories.map(cat => {
                  const qCount = getCategoryQuestionCount(cat.id);
                  const isComplete = qCount >= 5;
                  return (
                    <div key={cat.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{cat.name}</p>
                          {isComplete && <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{qCount}/5 questions</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => linkCategoryMutation.mutate({ boardId: selectedBoardId, categoryId: cat.id })}
                        disabled={boardCategories.length >= 5 || linkCategoryMutation.isPending}
                        data-testid={`button-link-${cat.id}`}
                      >
                        <Link2 className="w-4 h-4 mr-1" /> Link
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Main view with tabs
  return (
    <div className="min-h-screen bg-background" data-testid="page-admin">
      <AppHeader />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Content Manager</h1>
          <Link href="/admin/history">
            <Button variant="outline" size="sm" data-testid="button-history">
              <History className="w-4 h-4 mr-2" /> History
            </Button>
          </Link>
        </div>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "categories" | "boards")}>
          <TabsList className="mb-6">
            <TabsTrigger value="categories" className="gap-2" data-testid="tab-categories">
              <LayoutGrid className="w-4 h-4" /> Categories
            </TabsTrigger>
            <TabsTrigger value="boards" className="gap-2" data-testid="tab-boards">
              <FolderOpen className="w-4 h-4" /> Boards
            </TabsTrigger>
          </TabsList>
          
          {/* Categories Tab */}
          <TabsContent value="categories">
            <div className="flex items-center justify-between mb-4">
              <p className="text-muted-foreground">{categories.length} categories</p>
              <Button onClick={() => setShowNewCategoryForm(true)} size="sm" data-testid="button-new-category">
                <Plus className="w-4 h-4 mr-2" /> New Category
              </Button>
            </div>
            
            <AnimatePresence>
              {showNewCategoryForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Category name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newCategoryName.trim()) {
                              createCategoryMutation.mutate({ name: newCategoryName.trim() });
                            }
                            if (e.key === 'Escape') setShowNewCategoryForm(false);
                          }}
                          data-testid="input-category-name"
                        />
                        <Button 
                          onClick={() => createCategoryMutation.mutate({ name: newCategoryName.trim() })}
                          disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                          data-testid="button-create-category"
                        >
                          {createCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                        </Button>
                        <Button variant="ghost" onClick={() => setShowNewCategoryForm(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
            
            {loadingCategories ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <HelpCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No categories yet</h3>
                  <p className="text-muted-foreground text-sm mb-4">Create your first category to get started</p>
                  <Button onClick={() => setShowNewCategoryForm(true)} data-testid="button-create-first-category">
                    <Plus className="w-4 h-4 mr-2" /> Create Category
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories.map(cat => {
                  const qCount = getCategoryQuestionCount(cat.id);
                  const isComplete = qCount >= 5;
                  const isEditing = editingCategoryId === cat.id;
                  
                  return (
                    <Card 
                      key={cat.id} 
                      className={`hover-elevate cursor-pointer transition-all ${isComplete ? 'border-emerald-500/30' : ''}`}
                      onClick={() => !isEditing && setSelectedCategoryId(cat.id)}
                      data-testid={`card-category-${cat.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1 flex-1">
                              <Input
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                className="h-8"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') {
                                    updateCategoryMutation.mutate({ id: cat.id, name: editCategoryName.trim() });
                                  }
                                  if (e.key === 'Escape') setEditingCategoryId(null);
                                }}
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); updateCategoryMutation.mutate({ id: cat.id, name: editCategoryName.trim() }); }}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingCategoryId(null); }}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 min-w-0">
                                <h3 className="font-semibold truncate">{cat.name}</h3>
                                {isComplete && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7"
                                  onClick={(e) => { e.stopPropagation(); setEditingCategoryId(cat.id); setEditCategoryName(cat.name); }}
                                  data-testid={`button-edit-category-${cat.id}`}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => { e.stopPropagation(); setDeleteCategoryConfirmId(cat.id); }}
                                  data-testid={`button-delete-category-${cat.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Questions</span>
                            <span className={isComplete ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>{qCount}/5</span>
                          </div>
                          <ProgressBar value={qCount} max={5} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
          
          {/* Boards Tab */}
          <TabsContent value="boards">
            <div className="flex items-center justify-between mb-4">
              <p className="text-muted-foreground">{boards.length} boards</p>
              <Button onClick={() => setShowNewBoardForm(true)} size="sm" data-testid="button-new-board">
                <Plus className="w-4 h-4 mr-2" /> New Board
              </Button>
            </div>
            
            <AnimatePresence>
              {showNewBoardForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Board name"
                          value={newBoardName}
                          onChange={(e) => setNewBoardName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newBoardName.trim()) {
                              createBoardMutation.mutate({ name: newBoardName.trim() });
                            }
                            if (e.key === 'Escape') setShowNewBoardForm(false);
                          }}
                          data-testid="input-board-name"
                        />
                        <Button 
                          onClick={() => createBoardMutation.mutate({ name: newBoardName.trim() })}
                          disabled={!newBoardName.trim() || createBoardMutation.isPending}
                          data-testid="button-create-board"
                        >
                          {createBoardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                        </Button>
                        <Button variant="ghost" onClick={() => setShowNewBoardForm(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
            
            {loadingBoards ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
            ) : boards.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No boards yet</h3>
                  <p className="text-muted-foreground text-sm mb-4">Create a board to organize categories into a game</p>
                  <Button onClick={() => setShowNewBoardForm(true)} data-testid="button-create-first-board">
                    <Plus className="w-4 h-4 mr-2" /> Create Board
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {boards.map(board => (
                  <Card 
                    key={board.id} 
                    className="hover-elevate cursor-pointer"
                    onClick={() => setSelectedBoardId(board.id)}
                    data-testid={`card-board-${board.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-semibold truncate">{board.name}</h3>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={(e) => { e.stopPropagation(); setDeleteBoardConfirmId(board.id); }}
                          data-testid={`button-delete-board-${board.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">Click to manage categories</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Category Confirmation */}
      <AlertDialog open={deleteCategoryConfirmId !== null} onOpenChange={(open) => !open && setDeleteCategoryConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category and all its questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteCategoryConfirmId) {
                  deleteCategoryMutation.mutate(deleteCategoryConfirmId);
                  setDeleteCategoryConfirmId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Board Confirmation */}
      <AlertDialog open={deleteBoardConfirmId !== null} onOpenChange={(open) => !open && setDeleteBoardConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete this board. Categories and questions will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteBoardConfirmId) {
                  deleteBoardMutation.mutate(deleteBoardConfirmId);
                  setDeleteBoardConfirmId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
