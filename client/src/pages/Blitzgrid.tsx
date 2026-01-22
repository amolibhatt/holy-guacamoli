import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Pencil, Check, X, Grid3X3, 
  ChevronRight, ArrowLeft, Play, Loader2,
  AlertCircle, CheckCircle2
} from "lucide-react";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import type { Board, Category, Question } from "@shared/schema";

interface GridWithStats extends Board {
  categoryCount: number;
  questionCount: number;
  isActive: boolean;
}

interface CategoryWithQuestions extends Category {
  questionCount: number;
  questions: Question[];
}

const POINT_TIERS = [10, 20, 30, 40, 50];

export default function Blitzgrid() {
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  
  // View state
  const [selectedGridId, setSelectedGridId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  
  // Form state
  const [showNewGridForm, setShowNewGridForm] = useState(false);
  const [newGridName, setNewGridName] = useState("");
  const [editingGridId, setEditingGridId] = useState<number | null>(null);
  const [editGridName, setEditGridName] = useState("");
  const [deleteGridId, setDeleteGridId] = useState<number | null>(null);
  
  // Question form state
  const [questionForms, setQuestionForms] = useState<Record<number, { 
    question: string; 
    correctAnswer: string; 
    options: string[];
  }>>({});

  // Fetch all grids for current user
  const { data: grids = [], isLoading: loadingGrids } = useQuery<GridWithStats[]>({
    queryKey: ['/api/blitzgrid/grids'],
    enabled: isAuthenticated,
  });

  // Fetch categories for selected grid
  const { data: gridCategories = [], isLoading: loadingCategories } = useQuery<CategoryWithQuestions[]>({
    queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'],
    enabled: !!selectedGridId,
  });

  // Fetch all available categories
  const { data: allCategories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: !!selectedGridId,
  });

  // Create grid mutation
  const createGridMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest('POST', '/api/blitzgrid/grids', { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setNewGridName("");
      setShowNewGridForm(false);
      toast({ title: "Grid created" });
    },
    onError: () => {
      toast({ title: "Couldn't create grid", variant: "destructive" });
    },
  });

  // Update grid mutation
  const updateGridMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      return apiRequest('PATCH', `/api/blitzgrid/grids/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setEditingGridId(null);
      toast({ title: "Grid updated" });
    },
    onError: () => {
      toast({ title: "Couldn't update grid", variant: "destructive" });
    },
  });

  // Delete grid mutation
  const deleteGridMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/blitzgrid/grids/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setDeleteGridId(null);
      if (selectedGridId === deleteGridId) {
        setSelectedGridId(null);
      }
      toast({ title: "Grid deleted" });
    },
    onError: () => {
      toast({ title: "Couldn't delete grid", variant: "destructive" });
    },
  });

  // Add category to grid mutation
  const addCategoryMutation = useMutation({
    mutationFn: async ({ gridId, categoryId }: { gridId: number; categoryId: number }) => {
      return apiRequest('POST', `/api/blitzgrid/grids/${gridId}/categories`, { categoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      toast({ title: "Category added" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Couldn't add category", variant: "destructive" });
    },
  });

  // Remove category from grid mutation
  const removeCategoryMutation = useMutation({
    mutationFn: async ({ gridId, categoryId }: { gridId: number; categoryId: number }) => {
      return apiRequest('DELETE', `/api/blitzgrid/grids/${gridId}/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      toast({ title: "Category removed" });
    },
    onError: () => {
      toast({ title: "Couldn't remove category", variant: "destructive" });
    },
  });

  // Save question mutation
  const saveQuestionMutation = useMutation({
    mutationFn: async ({ categoryId, points, question, correctAnswer, options }: { 
      categoryId: number; 
      points: number; 
      question: string; 
      correctAnswer: string;
      options: string[];
    }) => {
      return apiRequest('POST', `/api/blitzgrid/categories/${categoryId}/questions`, { 
        points, question, correctAnswer, options 
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setQuestionForms(prev => {
        const newForms = { ...prev };
        delete newForms[variables.points];
        return newForms;
      });
      toast({ title: "Question saved" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Couldn't save question", variant: "destructive" });
    },
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      return apiRequest('DELETE', `/api/blitzgrid/questions/${questionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      toast({ title: "Question deleted" });
    },
    onError: () => {
      toast({ title: "Couldn't delete question", variant: "destructive" });
    },
  });

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  // Category detail view
  if (selectedGridId && selectedCategoryId) {
    const category = gridCategories.find(c => c.id === selectedCategoryId);
    const existingPoints = new Set(category?.questions?.map(q => q.points) || []);
    
    return (
      <div className="min-h-screen bg-background" data-testid="page-blitzgrid-category">
        <AppHeader />
        <div className="container mx-auto px-4 py-6">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedCategoryId(null)}
            className="mb-4"
            data-testid="button-back-to-grid"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Grid
          </Button>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">{category?.name || 'Category'}</h1>
              <p className="text-muted-foreground text-sm">
                {category?.questions?.length || 0}/5 questions · Points: {POINT_TIERS.join(', ')}
              </p>
            </div>
            {category?.questions?.length === 5 && (
              <Badge className="bg-green-500/20 text-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
              </Badge>
            )}
          </div>

          <div className="space-y-4">
            {POINT_TIERS.map(points => {
              const existingQuestion = category?.questions?.find(q => q.points === points);
              const formData = questionForms[points];
              const isEditing = !!formData;
              
              return (
                <Card key={points} className={existingQuestion ? 'border-green-500/30' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant={existingQuestion ? "default" : "outline"} className="text-lg px-3 py-1">
                        {points} pts
                      </Badge>
                      {existingQuestion && !isEditing && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setQuestionForms(prev => ({
                              ...prev,
                              [points]: {
                                question: existingQuestion.question,
                                correctAnswer: existingQuestion.correctAnswer,
                                options: existingQuestion.options || [],
                              }
                            }))}
                            data-testid={`button-edit-question-${points}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => deleteQuestionMutation.mutate(existingQuestion.id)}
                            disabled={deleteQuestionMutation.isPending}
                            data-testid={`button-delete-question-${points}`}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {existingQuestion && !isEditing ? (
                      <div>
                        <p className="font-medium mb-2">{existingQuestion.question}</p>
                        <p className="text-sm text-muted-foreground">
                          Answer: <span className="text-green-600 font-medium">{existingQuestion.correctAnswer}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Input
                          placeholder="Enter question..."
                          value={formData?.question || ''}
                          onChange={(e) => setQuestionForms(prev => ({
                            ...prev,
                            [points]: { ...prev[points] || { question: '', correctAnswer: '', options: [] }, question: e.target.value }
                          }))}
                          data-testid={`input-question-${points}`}
                        />
                        <Input
                          placeholder="Correct answer..."
                          value={formData?.correctAnswer || ''}
                          onChange={(e) => setQuestionForms(prev => ({
                            ...prev,
                            [points]: { ...prev[points] || { question: '', correctAnswer: '', options: [] }, correctAnswer: e.target.value }
                          }))}
                          data-testid={`input-answer-${points}`}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (formData?.question && formData?.correctAnswer && selectedCategoryId) {
                                saveQuestionMutation.mutate({
                                  categoryId: selectedCategoryId,
                                  points,
                                  question: formData.question,
                                  correctAnswer: formData.correctAnswer,
                                  options: formData.options || [],
                                });
                              }
                            }}
                            disabled={!formData?.question || !formData?.correctAnswer || saveQuestionMutation.isPending}
                            data-testid={`button-save-question-${points}`}
                          >
                            {saveQuestionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setQuestionForms(prev => {
                              const newForms = { ...prev };
                              delete newForms[points];
                              return newForms;
                            })}
                            data-testid={`button-cancel-question-${points}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Grid detail view
  if (selectedGridId) {
    const grid = grids.find(g => g.id === selectedGridId);
    const linkedCategoryIds = new Set(gridCategories.map(c => c.id));
    const availableCategories = allCategories.filter(c => !linkedCategoryIds.has(c.id));
    
    return (
      <div className="min-h-screen bg-background" data-testid="page-blitzgrid-grid">
        <AppHeader />
        <div className="container mx-auto px-4 py-6">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedGridId(null)}
            className="mb-4"
            data-testid="button-back-to-grids"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Grids
          </Button>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">{grid?.name || 'Grid'}</h1>
              <p className="text-muted-foreground text-sm">
                {gridCategories.length}/5 categories · {grid?.questionCount || 0}/25 questions
              </p>
            </div>
            <div className="flex items-center gap-2">
              {grid?.isActive ? (
                <Badge className="bg-green-500/20 text-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600">
                  <AlertCircle className="w-3 h-3 mr-1" /> Incomplete
                </Badge>
              )}
              {grid?.isActive && (
                <Button size="sm" data-testid="button-play-grid">
                  <Play className="w-4 h-4 mr-2" /> Play
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories ({gridCategories.length}/5)</CardTitle>
                <CardDescription>Each category needs 5 questions to be active</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCategories ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : gridCategories.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No categories yet. Add categories from the right panel.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {gridCategories.map(category => (
                      <div 
                        key={category.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedCategoryId(category.id)}
                        data-testid={`category-row-${category.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="font-medium">{category.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {category.questionCount}/5 questions
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {category.questionCount >= 5 ? (
                            <Badge className="bg-green-500/20 text-green-600 text-xs">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 text-xs">
                              {5 - category.questionCount} needed
                            </Badge>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCategoryMutation.mutate({ gridId: selectedGridId, categoryId: category.id });
                            }}
                            disabled={removeCategoryMutation.isPending}
                            data-testid={`button-remove-category-${category.id}`}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Category</CardTitle>
                <CardDescription>Select a category to add to this grid</CardDescription>
              </CardHeader>
              <CardContent>
                {gridCategories.length >= 5 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Maximum 5 categories reached
                  </p>
                ) : availableCategories.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No categories available. Create categories in the Games Admin.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableCategories.map(category => (
                      <Button
                        key={category.id}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => addCategoryMutation.mutate({ 
                          gridId: selectedGridId, 
                          categoryId: category.id 
                        })}
                        disabled={addCategoryMutation.isPending}
                        data-testid={`button-add-category-${category.id}`}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {category.name}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Main grid list view
  return (
    <div className="min-h-screen bg-background" data-testid="page-blitzgrid">
      <AppHeader />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Grid3X3 className="w-6 h-6 text-purple-500" />
              Blitzgrid
            </h1>
            <p className="text-muted-foreground text-sm">{grids.length} grids</p>
          </div>
          <Button onClick={() => setShowNewGridForm(true)} data-testid="button-new-grid">
            <Plus className="w-4 h-4 mr-2" /> New Grid
          </Button>
        </div>

        <AnimatePresence>
          {showNewGridForm && (
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
                      placeholder="Grid name..."
                      value={newGridName}
                      onChange={(e) => setNewGridName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newGridName.trim()) {
                          createGridMutation.mutate(newGridName.trim());
                        }
                        if (e.key === 'Escape') setShowNewGridForm(false);
                      }}
                      data-testid="input-grid-name"
                    />
                    <Button
                      onClick={() => createGridMutation.mutate(newGridName.trim())}
                      disabled={!newGridName.trim() || createGridMutation.isPending}
                      data-testid="button-create-grid"
                    >
                      {createGridMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowNewGridForm(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {loadingGrids ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : grids.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-medium mb-2">No grids yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Create your first Blitzgrid</p>
              <Button onClick={() => setShowNewGridForm(true)} data-testid="button-create-first-grid">
                <Plus className="w-4 h-4 mr-2" /> Create Grid
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {grids.map(grid => (
              <Card
                key={grid.id}
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => setSelectedGridId(grid.id)}
                data-testid={`card-grid-${grid.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    {editingGridId === grid.id ? (
                      <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editGridName}
                          onChange={(e) => setEditGridName(e.target.value)}
                          className="h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editGridName.trim()) {
                              updateGridMutation.mutate({ id: grid.id, name: editGridName.trim() });
                            } else if (e.key === 'Escape') {
                              setEditingGridId(null);
                            }
                          }}
                          data-testid={`input-edit-grid-${grid.id}`}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => {
                            if (editGridName.trim()) {
                              updateGridMutation.mutate({ id: grid.id, name: editGridName.trim() });
                            }
                          }}
                          disabled={!editGridName.trim() || updateGridMutation.isPending}
                          data-testid={`button-save-grid-${grid.id}`}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => setEditingGridId(null)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <Grid3X3 className="w-5 h-5 text-purple-500 shrink-0" />
                          <h3 className="font-semibold truncate">{grid.name}</h3>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGridId(grid.id);
                              setEditGridName(grid.name);
                            }}
                            data-testid={`button-edit-grid-${grid.id}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteGridId(grid.id);
                            }}
                            data-testid={`button-delete-grid-${grid.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {grid.categoryCount}/5 categories · {grid.questionCount}/25 questions
                    </p>
                    {grid.isActive ? (
                      <Badge className="bg-green-500/20 text-green-600 text-xs shrink-0">
                        <Play className="w-3 h-3 mr-1" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Incomplete
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteGridId !== null} onOpenChange={(open) => !open && setDeleteGridId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this grid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the grid and unlink all categories. Categories and questions will still exist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGridId && deleteGridMutation.mutate(deleteGridId)}
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
