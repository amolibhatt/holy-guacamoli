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
  AlertCircle, CheckCircle2, Eye, RotateCcw
} from "lucide-react";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
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
  const [playMode, setPlayMode] = useState(false);
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  
  // Form state
  const [showNewGridForm, setShowNewGridForm] = useState(false);
  const [newGridName, setNewGridName] = useState("");
  const [editingGridId, setEditingGridId] = useState<number | null>(null);
  const [editGridName, setEditGridName] = useState("");
  const [deleteGridId, setDeleteGridId] = useState<number | null>(null);
  
  // Question form state (keyed by "categoryId-points")
  const [questionForms, setQuestionForms] = useState<Record<string, { 
    question: string; 
    correctAnswer: string; 
    options: string[];
  }>>({});
  
  // New category form state
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

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

  // Create new category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async ({ gridId, name }: { gridId: number; name: string }) => {
      return apiRequest('POST', `/api/blitzgrid/grids/${gridId}/categories/create`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setNewCategoryName("");
      setShowNewCategoryForm(false);
      toast({ title: "Category created" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Couldn't create category", variant: "destructive" });
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
        <AppHeader showAdminButton adminHref="/admin/games" />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  // Grid detail view with inline categories and questions
  if (selectedGridId) {
    const grid = grids.find(g => g.id === selectedGridId);
    
    // GAMEPLAY MODE
    if (playMode && grid?.isActive) {
      const handleCellClick = (categoryId: number, points: number, question: Question) => {
        const cellKey = `${categoryId}-${points}`;
        if (!revealedCells.has(cellKey)) {
          setActiveQuestion(question);
          setShowAnswer(false);
        }
      };
      
      const handleRevealAnswer = () => {
        setShowAnswer(true);
        if (activeQuestion) {
          const cat = gridCategories.find(c => c.questions?.some(q => q.id === activeQuestion.id));
          if (cat) {
            const cellKey = `${cat.id}-${activeQuestion.points}`;
            setRevealedCells(prev => {
              const newSet = new Set(Array.from(prev));
              newSet.add(cellKey);
              return newSet;
            });
          }
        }
      };
      
      const handleCloseQuestion = () => {
        setActiveQuestion(null);
        setShowAnswer(false);
      };
      
      const resetGame = () => {
        setRevealedCells(new Set());
        toast({ title: "Game reset! All questions available again." });
      };
      
      return (
        <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900" data-testid="page-blitzgrid-play">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setPlayMode(false);
                  setSelectedGridId(null);
                }}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                data-testid="button-exit-play"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Exit Game
              </Button>
              <h1 className="text-2xl font-bold text-white">{grid.name}</h1>
              <Button
                variant="outline"
                onClick={resetGame}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                data-testid="button-reset-game"
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Reset
              </Button>
            </div>
            
            {/* Category Headers */}
            <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `repeat(${gridCategories.length}, minmax(0, 1fr))` }}>
              {gridCategories.map(category => (
                <div 
                  key={category.id} 
                  className="bg-purple-700/50 text-white text-center py-3 px-2 rounded-t-lg font-bold text-sm md:text-base truncate"
                >
                  {category.name}
                </div>
              ))}
            </div>
            
            {/* Question Grid - 5 rows (one per point value) */}
            {POINT_TIERS.map(points => (
              <div 
                key={points} 
                className="grid gap-2 mb-2" 
                style={{ gridTemplateColumns: `repeat(${gridCategories.length}, minmax(0, 1fr))` }}
              >
                {gridCategories.map(category => {
                  const question = category.questions?.find(q => q.points === points);
                  const cellKey = `${category.id}-${points}`;
                  const isRevealed = revealedCells.has(cellKey);
                  
                  return (
                    <motion.button
                      key={cellKey}
                      className={`
                        aspect-[4/3] rounded-lg font-bold text-2xl md:text-4xl transition-all
                        ${isRevealed 
                          ? 'bg-gray-700/50 text-gray-500 cursor-default' 
                          : 'bg-gradient-to-b from-blue-500 to-blue-700 text-yellow-300 hover:from-blue-400 hover:to-blue-600 cursor-pointer shadow-lg'
                        }
                      `}
                      onClick={() => question && !isRevealed && handleCellClick(category.id, points, question)}
                      disabled={isRevealed || !question}
                      whileHover={!isRevealed ? { scale: 1.02 } : {}}
                      whileTap={!isRevealed ? { scale: 0.98 } : {}}
                      data-testid={`cell-${category.id}-${points}`}
                    >
                      {isRevealed ? '' : `$${points}`}
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>
          
          {/* Question Modal */}
          <Dialog open={!!activeQuestion} onOpenChange={(open) => !open && handleCloseQuestion()}>
            <DialogContent className="max-w-2xl bg-gradient-to-b from-blue-800 to-blue-900 text-white border-blue-600">
              <DialogHeader>
                <DialogTitle className="text-yellow-300 text-3xl text-center">
                  ${activeQuestion?.points}
                </DialogTitle>
              </DialogHeader>
              <div className="py-8">
                <p className="text-xl md:text-2xl text-center font-medium">
                  {activeQuestion?.question}
                </p>
              </div>
              
              <AnimatePresence>
                {showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-600/30 border border-green-500 rounded-lg p-6 text-center"
                  >
                    <p className="text-sm text-green-300 mb-2">Answer</p>
                    <p className="text-2xl font-bold text-green-100">
                      {activeQuestion?.correctAnswer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <DialogFooter className="flex gap-2 sm:justify-center">
                {!showAnswer ? (
                  <Button 
                    onClick={handleRevealAnswer}
                    className="bg-yellow-500 text-black hover:bg-yellow-400"
                    data-testid="button-reveal-answer"
                  >
                    <Eye className="w-4 h-4 mr-2" /> Show Answer
                  </Button>
                ) : (
                  <Button 
                    onClick={handleCloseQuestion}
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                    data-testid="button-close-question"
                  >
                    Continue
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      );
    }
    
    // Helper to render question form for a category
    const renderQuestionSlot = (category: CategoryWithQuestions, points: number) => {
      const existingQuestion = category.questions?.find(q => q.points === points);
      const formKey = `${category.id}-${points}`;
      const formData = questionForms[formKey];
      const isEditing = !!formData;
      
      if (existingQuestion && !isEditing) {
        return (
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
            <div className="flex-1 min-w-0">
              <span className="font-medium text-xs text-muted-foreground mr-2">{points}pts:</span>
              <span className="truncate">{existingQuestion.question}</span>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button 
                size="icon" 
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setQuestionForms(prev => ({
                  ...prev,
                  [formKey]: {
                    question: existingQuestion.question,
                    correctAnswer: existingQuestion.correctAnswer,
                    options: existingQuestion.options || [],
                  }
                }))}
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost"
                className="h-6 w-6"
                onClick={() => deleteQuestionMutation.mutate(existingQuestion.id)}
                disabled={deleteQuestionMutation.isPending}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          </div>
        );
      }
      
      return (
        <div className="space-y-2 p-2 border border-dashed rounded">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs shrink-0">{points}pts</Badge>
            <Input
              placeholder="Question..."
              className="h-8 text-sm"
              value={formData?.question || ''}
              onChange={(e) => setQuestionForms(prev => ({
                ...prev,
                [formKey]: { ...prev[formKey] || { question: '', correctAnswer: '', options: [] }, question: e.target.value }
              }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Answer..."
              className="h-8 text-sm"
              value={formData?.correctAnswer || ''}
              onChange={(e) => setQuestionForms(prev => ({
                ...prev,
                [formKey]: { ...prev[formKey] || { question: '', correctAnswer: '', options: [] }, correctAnswer: e.target.value }
              }))}
            />
            <Button
              size="sm"
              className="h-8 shrink-0"
              onClick={() => {
                if (formData?.question && formData?.correctAnswer) {
                  saveQuestionMutation.mutate({
                    categoryId: category.id,
                    points,
                    question: formData.question,
                    correctAnswer: formData.correctAnswer,
                    options: formData.options || [],
                  });
                  setQuestionForms(prev => {
                    const newForms = { ...prev };
                    delete newForms[formKey];
                    return newForms;
                  });
                }
              }}
              disabled={!formData?.question || !formData?.correctAnswer || saveQuestionMutation.isPending}
            >
              {saveQuestionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      );
    };
    
    return (
      <div className="min-h-screen bg-background" data-testid="page-blitzgrid-grid">
        <AppHeader showAdminButton adminHref="/admin/games" />
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
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Ready to Play
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600">
                  <AlertCircle className="w-3 h-3 mr-1" /> Incomplete
                </Badge>
              )}
              {grid?.isActive && (
                <Button 
                  size="sm" 
                  data-testid="button-play-grid"
                  onClick={() => {
                    setPlayMode(true);
                    setRevealedCells(new Set());
                    setActiveQuestion(null);
                    setShowAnswer(false);
                  }}
                >
                  <Play className="w-4 h-4 mr-2" /> Play
                </Button>
              )}
            </div>
          </div>

          {/* New Category Form */}
          {gridCategories.length < 5 && (
            <Card className="mb-4">
              <CardContent className="py-3">
                {showNewCategoryForm ? (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Category name..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCategoryName.trim()) {
                          createCategoryMutation.mutate({ gridId: selectedGridId, name: newCategoryName.trim() });
                        }
                        if (e.key === 'Escape') {
                          setShowNewCategoryForm(false);
                          setNewCategoryName("");
                        }
                      }}
                      data-testid="input-category-name"
                    />
                    <Button
                      onClick={() => createCategoryMutation.mutate({ gridId: selectedGridId, name: newCategoryName.trim() })}
                      disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                      data-testid="button-create-category"
                    >
                      {createCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                    </Button>
                    <Button variant="ghost" onClick={() => { setShowNewCategoryForm(false); setNewCategoryName(""); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowNewCategoryForm(true)}
                    data-testid="button-new-category"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Category ({gridCategories.length}/5)
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Categories with inline questions */}
          {loadingCategories ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : gridCategories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-medium mb-2">No categories yet</h3>
                <p className="text-muted-foreground text-sm">Add your first category above to start building your grid</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {gridCategories.map(category => {
                const isExpanded = selectedCategoryId === category.id;
                
                return (
                  <Card key={category.id} className={isExpanded ? 'ring-2 ring-primary/20' : ''}>
                    <CardHeader 
                      className="cursor-pointer py-3"
                      onClick={() => setSelectedCategoryId(isExpanded ? null : category.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          <div>
                            <CardTitle className="text-base">{category.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {category.questionCount}/5 questions
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {category.questionCount >= 5 ? (
                            <Badge className="bg-green-500/20 text-green-600 text-xs">Complete</Badge>
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
                        </div>
                      </div>
                    </CardHeader>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="pt-0 space-y-2">
                            {POINT_TIERS.map(points => (
                              <div key={points}>
                                {renderQuestionSlot(category, points)}
                              </div>
                            ))}
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main grid list view
  return (
    <div className="min-h-screen bg-background" data-testid="page-blitzgrid">
      <AppHeader showAdminButton adminHref="/admin/games" />
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
                className={`hover-elevate transition-all ${grid.isActive ? 'cursor-pointer' : 'opacity-60'}`}
                onClick={() => {
                  if (grid.isActive) {
                    setSelectedGridId(grid.id);
                    setPlayMode(true);
                    setRevealedCells(new Set());
                    setActiveQuestion(null);
                    setShowAnswer(false);
                  } else {
                    toast({ title: "Grid not ready", description: "This grid needs 5 categories with 5 questions each." });
                  }
                }}
                data-testid={`card-grid-${grid.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 min-w-0 mb-3">
                    <Grid3X3 className="w-5 h-5 text-purple-500 shrink-0" />
                    <h3 className="font-semibold truncate">{grid.name}</h3>
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
