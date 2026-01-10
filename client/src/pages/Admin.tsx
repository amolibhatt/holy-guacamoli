import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, FolderPlus, HelpCircle, ArrowLeft, Loader2, Pencil, X, Check, Image, Music, Grid3X3, Link2, Unlink, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import MDEditor from '@uiw/react-md-editor';
import type { Category, Question, Board, BoardCategoryWithCount } from "@shared/schema";

const ALL_POINT_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function Admin() {
  const { toast } = useToast();
  
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [selectedBoardCategoryId, setSelectedBoardCategoryId] = useState<number | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardPoints, setNewBoardPoints] = useState<number[]>([10, 20, 30, 40, 50]);
  const [showNewBoardForm, setShowNewBoardForm] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);

  const [newQuestion, setNewQuestion] = useState("");
  const [newCorrectAnswer, setNewCorrectAnswer] = useState("");
  const [newPoints, setNewPoints] = useState<number>(10);

  const [editQuestion, setEditQuestion] = useState("");
  const [editCorrectAnswer, setEditCorrectAnswer] = useState("");
  const [editPoints, setEditPoints] = useState<number>(10);

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const editAudioInputRef = useRef<HTMLInputElement>(null);

  const { data: boards = [], isLoading: loadingBoards } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
  });

  type BoardSummary = { id: number; name: string; categoryCount: number; categories: { id: number; name: string; questionCount: number; remaining: number }[] };
  const { data: boardSummaries = [] } = useQuery<BoardSummary[]>({
    queryKey: ['/api/boards/summary'],
  });

  const { data: allCategories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const selectedBoard = boards.find(b => b.id === selectedBoardId);
  const currentPointValues = selectedBoard?.pointValues || ALL_POINT_VALUES;

  const { data: boardCategories = [], isLoading: loadingBoardCategories } = useQuery<BoardCategoryWithCount[]>({
    queryKey: ['/api/boards', selectedBoardId, 'categories'],
    enabled: !!selectedBoardId,
  });

  const linkedCategoryIds = boardCategories.map(bc => bc.categoryId);
  const unlinkedCategories = allCategories.filter(c => !linkedCategoryIds.includes(c.id));

  const selectedBoardCategory = boardCategories.find(bc => bc.id === selectedBoardCategoryId);

  const { data: questions = [], isLoading: loadingQuestions } = useQuery<Question[]>({
    queryKey: ['/api/board-categories', selectedBoardCategoryId, 'questions'],
    enabled: !!selectedBoardCategoryId,
  });

  const usedPoints = questions.map(q => q.points);
  const availablePoints = currentPointValues.filter(pt => !usedPoints.includes(pt));

  useEffect(() => {
    if (availablePoints.length > 0 && !availablePoints.includes(newPoints)) {
      setNewPoints(availablePoints[0]);
    }
  }, [availablePoints, newPoints]);

  const createBoardMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; pointValues: number[] }) => {
      return apiRequest('POST', '/api/boards', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      setNewBoardName("");
      setNewBoardPoints([10, 20, 30, 40, 50]);
      setShowNewBoardForm(false);
      toast({ title: "Board created!" });
    },
    onError: () => {
      toast({ title: "Failed to create board", variant: "destructive" });
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/boards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      if (selectedBoardId) {
        setSelectedBoardId(null);
        setSelectedBoardCategoryId(null);
      }
      toast({ title: "Board deleted" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; imageUrl: string }) => {
      return apiRequest('POST', '/api/categories', data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setNewCategoryName("");
      setShowNewCategoryForm(false);
      toast({ title: "Category created!" });
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const createAndLinkCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; boardId: number }) => {
      const res = await apiRequest('POST', `/api/boards/${data.boardId}/categories/create-and-link`, { name: data.name });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create category");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      setNewCategoryName("");
      setShowNewCategoryForm(false);
      toast({ title: "Category created and linked!" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to create category", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      return apiRequest('PUT', `/api/categories/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      setEditingCategoryId(null);
      toast({ title: "Category updated!" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      toast({ title: "Category deleted" });
    },
  });

  const linkCategoryMutation = useMutation({
    mutationFn: async ({ boardId, categoryId }: { boardId: number; categoryId: number }) => {
      return apiRequest('POST', `/api/boards/${boardId}/categories`, { categoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      toast({ title: "Category linked!" });
    },
    onError: () => {
      toast({ title: "Failed to link category", variant: "destructive" });
    },
  });

  const unlinkCategoryMutation = useMutation({
    mutationFn: async (boardCategoryId: number) => {
      return apiRequest('DELETE', `/api/board-categories/${boardCategoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      if (selectedBoardCategoryId) {
        setSelectedBoardCategoryId(null);
      }
      toast({ title: "Category unlinked" });
    },
  });

  const reorderCategoriesMutation = useMutation({
    mutationFn: async ({ boardId, orderedIds }: { boardId: number; orderedIds: number[] }) => {
      return apiRequest('PUT', `/api/boards/${boardId}/categories/reorder`, { orderedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
    },
  });

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    if (!selectedBoardId) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= boardCategories.length) return;
    
    const newOrder = [...boardCategories];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    const orderedIds = newOrder.map(bc => bc.id);
    reorderCategoriesMutation.mutate({ boardId: selectedBoardId, orderedIds });
  };

  const createQuestionMutation = useMutation({
    mutationFn: async (data: { boardCategoryId: number; question: string; options: string[]; correctAnswer: string; points: number }) => {
      return apiRequest('POST', '/api/questions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/board-categories', selectedBoardCategoryId, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      setNewQuestion("");
      setNewCorrectAnswer("");
      setNewPoints(currentPointValues[0] || 10);
      toast({ title: "Question added!" });
    },
    onError: () => {
      toast({ title: "Failed to add question", variant: "destructive" });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; question?: string; correctAnswer?: string; points?: number }) => {
      return apiRequest('PUT', `/api/questions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/board-categories', selectedBoardCategoryId, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      setEditingQuestionId(null);
      toast({ title: "Question updated!" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/board-categories', selectedBoardCategoryId, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      toast({ title: "Question deleted" });
    },
  });

  const handleFileUpload = async (file: File, isEdit: boolean = false) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      let markdown = '';
      if (isImage) {
        markdown = `\n![${file.name}](${url})\n`;
      } else if (isAudio) {
        markdown = `\n<audio controls src="${url}"></audio>\n`;
      }
      if (isEdit) {
        setEditQuestion(prev => prev + markdown);
      } else {
        setNewQuestion(prev => prev + markdown);
      }
      toast({ title: "File uploaded!" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const handleCreateQuestion = () => {
    if (!selectedBoardCategoryId || !newQuestion.trim() || !newCorrectAnswer.trim() || questions.length >= 5) return;
    createQuestionMutation.mutate({
      boardCategoryId: selectedBoardCategoryId,
      question: newQuestion.trim(),
      options: [],
      correctAnswer: newCorrectAnswer.trim(),
      points: newPoints,
    });
  };

  const startEditingQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setEditQuestion(q.question);
    setEditCorrectAnswer(q.correctAnswer);
    setEditPoints(q.points);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          </div>
          {selectedBoard && (
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedBoard.name}</span>
              {selectedBoardCategory && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="font-medium text-primary">{selectedBoardCategory.category.name}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-80px)]">
          <div className="lg:col-span-4 space-y-4 overflow-y-auto">
            <Card className="bg-card border-border">
              <CardHeader className="py-3 px-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-foreground text-base">
                    <Grid3X3 className="w-4 h-4 text-primary" />
                    Boards
                  </CardTitle>
                  <Button
                    size="sm"
                    variant={showNewBoardForm ? "secondary" : "default"}
                    onClick={() => setShowNewBoardForm(!showNewBoardForm)}
                    data-testid="button-toggle-board-form"
                  >
                    {showNewBoardForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                <AnimatePresence>
                  {showNewBoardForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 p-3 bg-muted/20 rounded-lg border border-border"
                    >
                      <Input
                        placeholder="Board name"
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        data-testid="input-board-name"
                      />
                      <div className="flex flex-wrap gap-1">
                        {ALL_POINT_VALUES.map(pt => (
                          <Button
                            key={pt}
                            size="sm"
                            variant={newBoardPoints.includes(pt) ? "default" : "outline"}
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              if (newBoardPoints.includes(pt)) {
                                setNewBoardPoints(prev => prev.filter(p => p !== pt));
                              } else {
                                setNewBoardPoints(prev => [...prev, pt].sort((a, b) => a - b));
                              }
                            }}
                            data-testid={`button-point-${pt}`}
                          >
                            {pt}
                          </Button>
                        ))}
                      </div>
                      <Button
                        onClick={() => createBoardMutation.mutate({ name: newBoardName, description: '', pointValues: newBoardPoints })}
                        disabled={!newBoardName.trim() || newBoardPoints.length === 0}
                        className="w-full"
                        size="sm"
                        data-testid="button-create-board"
                      >
                        Create Board
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {loadingBoards ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                  ) : boards.map(board => {
                    const summary = boardSummaries.find(s => s.id === board.id);
                    const totalQuestions = summary?.categories.reduce((sum, c) => sum + c.questionCount, 0) || 0;
                    const maxQuestions = (summary?.categoryCount || 0) * 5;
                    return (
                      <div
                        key={board.id}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
                          selectedBoardId === board.id
                            ? 'bg-primary/20 border-2 border-primary'
                            : 'bg-muted/20 border border-border hover:bg-muted/30'
                        }`}
                        onClick={() => { setSelectedBoardId(board.id); setSelectedBoardCategoryId(null); }}
                        data-testid={`board-item-${board.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-foreground text-sm truncate block">{board.name}</span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`px-1.5 py-0.5 rounded ${(summary?.categoryCount || 0) >= 5 ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                              {summary?.categoryCount || 0}/5 cat
                            </span>
                            {maxQuestions > 0 && (
                              <span className={`px-1.5 py-0.5 rounded ${totalQuestions >= maxQuestions ? 'bg-green-500/20 text-green-600' : 'bg-orange-500/20 text-orange-600'}`}>
                                {totalQuestions}/{maxQuestions} Q
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); deleteBoardMutation.mutate(board.id); }}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          data-testid={`button-delete-board-${board.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                  {boards.length === 0 && !loadingBoards && (
                    <p className="text-center text-muted-foreground text-sm py-4">No boards yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="py-3 px-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-foreground text-base">
                    <FolderPlus className="w-4 h-4 text-primary" />
                    Categories
                    {selectedBoard && <span className="text-muted-foreground font-normal text-sm">for {selectedBoard.name}</span>}
                  </CardTitle>
                  {selectedBoardId && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${boardCategories.length >= 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {boardCategories.length}/5
                      </span>
                      <Button
                        size="sm"
                        variant={showNewCategoryForm ? "secondary" : "default"}
                        onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
                        disabled={boardCategories.length >= 5 && !showNewCategoryForm}
                        data-testid="button-toggle-category-form"
                      >
                        {showNewCategoryForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3">
                {!selectedBoardId ? (
                  <div className="text-center py-6">
                    <Grid3X3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Select a board first</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {showNewCategoryForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex gap-2"
                        >
                          <Input
                            placeholder="New category name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="flex-1"
                            data-testid="input-category-name"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newCategoryName.trim() && selectedBoardId && boardCategories.length < 5) {
                                createAndLinkCategoryMutation.mutate({ name: newCategoryName.trim(), boardId: selectedBoardId });
                              }
                            }}
                          />
                          <Button
                            onClick={() => createAndLinkCategoryMutation.mutate({ name: newCategoryName.trim(), boardId: selectedBoardId! })}
                            disabled={!newCategoryName.trim() || boardCategories.length >= 5}
                            size="sm"
                            data-testid="button-create-category"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {loadingBoardCategories ? (
                      <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
                    ) : (
                      <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                        <AnimatePresence mode="popLayout">
                          {boardCategories.map((bc, idx) => (
                            <motion.div
                              key={bc.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -50 }}
                              className={`flex items-center justify-between gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
                                selectedBoardCategoryId === bc.id
                                  ? 'bg-primary/20 border-2 border-primary'
                                  : 'bg-muted/20 border border-border hover:bg-muted/30'
                              }`}
                              onClick={() => setSelectedBoardCategoryId(bc.id)}
                              data-testid={`board-category-${bc.id}`}
                            >
                              <div className="flex flex-col gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => moveCategory(idx, 'up')}
                                  disabled={idx === 0}
                                  className="h-5 w-5 text-muted-foreground hover:text-primary disabled:opacity-30"
                                  title="Move up"
                                  data-testid={`button-move-up-${bc.id}`}
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => moveCategory(idx, 'down')}
                                  disabled={idx === boardCategories.length - 1}
                                  className="h-5 w-5 text-muted-foreground hover:text-primary disabled:opacity-30"
                                  title="Move down"
                                  data-testid={`button-move-down-${bc.id}`}
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="min-w-0 flex-1">
                                {editingCategoryId === bc.category.id ? (
                                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Input
                                      value={editCategoryName}
                                      onChange={(e) => setEditCategoryName(e.target.value)}
                                      className="h-7 text-sm"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          updateCategoryMutation.mutate({ id: bc.category.id, name: editCategoryName.trim() });
                                        } else if (e.key === 'Escape') {
                                          setEditingCategoryId(null);
                                        }
                                      }}
                                    />
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateCategoryMutation.mutate({ id: bc.category.id, name: editCategoryName.trim() })}>
                                      <Check className="w-3 h-3 text-green-500" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingCategoryId(null)}>
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-medium text-foreground text-sm truncate block">{bc.category.name}</span>
                                    <div className="text-xs text-muted-foreground">
                                      {bc.questionCount ?? 0} questions
                                    </div>
                                  </>
                                )}
                              </div>
                              {editingCategoryId !== bc.category.id && (
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(e) => { e.stopPropagation(); setEditingCategoryId(bc.category.id); setEditCategoryName(bc.category.name); }}
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    title="Edit category name"
                                    data-testid={`button-edit-category-${bc.category.id}`}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(e) => { e.stopPropagation(); unlinkCategoryMutation.mutate(bc.id); }}
                                    className="h-7 w-7 text-muted-foreground hover:text-orange-500"
                                    title="Unlink from this board"
                                    data-testid={`button-unlink-${bc.id}`}
                                  >
                                    <Unlink className="w-3.5 h-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        title="Delete category permanently"
                                        data-testid={`button-delete-category-${bc.category.id}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete "{bc.category.name}"?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete this category and all its questions from ALL boards. This cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          onClick={() => {
                                            if (selectedBoardCategoryId === bc.id) setSelectedBoardCategoryId(null);
                                            deleteCategoryMutation.mutate(bc.category.id);
                                          }}
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {boardCategories.length === 0 && (
                          <p className="text-center text-muted-foreground text-sm py-4">
                            No categories yet. Add one above!
                          </p>
                        )}
                      </div>
                    )}

                    {unlinkedCategories.length > 0 && boardCategories.length < 5 && (
                      <div className="pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Quick add existing:</p>
                        <div className="flex flex-wrap gap-1">
                          {unlinkedCategories.slice(0, 5).map(cat => (
                            <Button
                              key={cat.id}
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => linkCategoryMutation.mutate({ boardId: selectedBoardId!, categoryId: cat.id })}
                              data-testid={`button-quick-link-${cat.id}`}
                            >
                              <Plus className="w-3 h-3 mr-1" /> {cat.name}
                            </Button>
                          ))}
                          {unlinkedCategories.length > 5 && (
                            <span className="text-xs text-muted-foreground self-center">+{unlinkedCategories.length - 5} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <Card className="bg-card border-border h-full flex flex-col">
              <CardHeader className="py-3 px-4 border-b border-border shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-foreground text-base">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    Questions
                    {selectedBoardCategory && (
                      <span className="text-muted-foreground font-normal">
                        for "{selectedBoardCategory.category.name}"
                      </span>
                    )}
                  </CardTitle>
                  {selectedBoardCategoryId && (
                    <span className={`text-xs ${questions.length >= 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {questions.length}/5
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-1 overflow-hidden flex flex-col">
                {!selectedBoardCategoryId ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <FolderPlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">Select a category to manage questions</p>
                      <p className="text-muted-foreground/60 text-sm mt-1">Choose a board and category from the left panel</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="space-y-3 p-4 bg-muted/10 rounded-xl border border-border shrink-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-foreground">Add Question</span>
                        <span className="text-xs text-muted-foreground">(supports markdown)</span>
                        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                        <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                        <Button size="sm" variant="ghost" onClick={() => imageInputRef.current?.click()} className="h-7 text-muted-foreground hover:text-primary ml-auto">
                          <Image className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => audioInputRef.current?.click()} className="h-7 text-muted-foreground hover:text-primary">
                          <Music className="w-4 h-4" />
                        </Button>
                      </div>
                      <MDEditor value={newQuestion} onChange={(val) => setNewQuestion(val || "")} preview="edit" height={100} data-testid="input-new-question" />
                      <div className="flex gap-2">
                        <Input
                          placeholder="Correct answer"
                          value={newCorrectAnswer}
                          onChange={(e) => setNewCorrectAnswer(e.target.value)}
                          className="flex-1"
                          data-testid="input-correct-answer"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newQuestion.trim() && newCorrectAnswer.trim()) {
                              handleCreateQuestion();
                            }
                          }}
                        />
                        <Select value={String(newPoints)} onValueChange={(v) => setNewPoints(Number(v))} disabled={availablePoints.length === 0}>
                          <SelectTrigger className="w-24" data-testid="select-points">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePoints.map(pt => (
                              <SelectItem key={pt} value={String(pt)}>{pt} pts</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={handleCreateQuestion} disabled={!newQuestion.trim() || !newCorrectAnswer.trim() || availablePoints.length === 0} data-testid="button-add-question">
                          <Plus className="w-4 h-4 mr-2" /> Add
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto mt-4 space-y-2">
                      {loadingQuestions ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                      ) : (
                        <AnimatePresence mode="popLayout">
                          {questions.map((q, idx) => (
                            <motion.div
                              key={q.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -50 }}
                              className="p-4 bg-muted/10 rounded-xl border border-border"
                              data-testid={`question-${q.id}`}
                            >
                              {editingQuestionId === q.id ? (
                                <div className="space-y-3">
                                  <input ref={editImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], true)} />
                                  <input ref={editAudioInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], true)} />
                                  <MDEditor value={editQuestion} onChange={(val) => setEditQuestion(val || "")} preview="edit" height={100} />
                                  <div className="flex gap-2">
                                    <Input value={editCorrectAnswer} onChange={(e) => setEditCorrectAnswer(e.target.value)} placeholder="Answer" className="flex-1" />
                                    <Select value={String(editPoints)} onValueChange={(v) => setEditPoints(Number(v))}>
                                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {currentPointValues.filter(pt => pt === editPoints || !usedPoints.includes(pt)).map(pt => (
                                          <SelectItem key={pt} value={String(pt)}>{pt} pts</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setEditingQuestionId(null)}>Cancel</Button>
                                    <Button size="sm" onClick={() => updateQuestionMutation.mutate({ id: q.id, question: editQuestion, correctAnswer: editCorrectAnswer, points: editPoints })}>
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                                      <span className="px-2 py-0.5 text-xs font-bold bg-primary/20 text-primary rounded">{q.points} pts</span>
                                    </div>
                                    <p className="text-sm text-foreground">{q.question.replace(/!\[.*?\]\(.*?\)/g, '[image]').replace(/<audio.*?<\/audio>/g, '[audio]')}</p>
                                    <p className="text-xs text-green-500 mt-1">Answer: {q.correctAnswer}</p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button size="icon" variant="ghost" onClick={() => startEditingQuestion(q)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => deleteQuestionMutation.mutate(q.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                      {questions.length === 0 && !loadingQuestions && (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No questions yet</p>
                          <p className="text-muted-foreground/60 text-sm mt-1">Add your first question above</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
