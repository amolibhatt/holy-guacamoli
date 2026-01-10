import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, FolderPlus, HelpCircle, ArrowLeft, Loader2, Zap, Pencil, X, Check, Image, Music, Grid3X3, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import MDEditor from '@uiw/react-md-editor';
import type { Category, Question, Board } from "@shared/schema";

const ALL_POINT_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function Admin() {
  const { toast } = useToast();
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [showBoardsSection, setShowBoardsSection] = useState(true);

  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");
  const [newBoardPoints, setNewBoardPoints] = useState<number[]>([10, 20, 30, 40, 50]);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");

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

  const { data: allCategories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const unassignedCategories = allCategories.filter(c => !c.boardId);

  const selectedBoard = boards.find(b => b.id === selectedBoardId);
  const currentPointValues = selectedBoard?.pointValues || ALL_POINT_VALUES;

  const { data: categories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/boards', selectedBoardId, 'categories'],
    enabled: !!selectedBoardId,
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, boardId, name }: { id: number; boardId?: number | null; name?: string }) => {
      return apiRequest('PUT', `/api/categories/${id}`, { boardId, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setEditingCategoryId(null);
      toast({ title: "Category updated!" });
    },
  });

  const { data: questions = [], isLoading: loadingQuestions } = useQuery<Question[]>({
    queryKey: ['/api/categories', selectedCategoryId, 'questions'],
    enabled: !!selectedCategoryId,
  });

  const createBoardMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; pointValues: number[] }) => {
      return apiRequest('POST', '/api/boards', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      setNewBoardName("");
      setNewBoardDesc("");
      setNewBoardPoints([10, 20, 30, 40, 50]);
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
        setSelectedCategoryId(null);
      }
      toast({ title: "Board deleted" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; imageUrl: string; boardId: number }) => {
      return apiRequest('POST', '/api/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      setNewCategoryName("");
      setNewCategoryDesc("");
      toast({ title: "Category created!" });
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      if (selectedCategoryId) {
        setSelectedCategoryId(null);
      }
      toast({ title: "Category deleted" });
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: { categoryId: number; question: string; options: string[]; correctAnswer: string; points: number }) => {
      return apiRequest('POST', '/api/questions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', selectedCategoryId, 'questions'] });
      setNewQuestion("");
      setNewCorrectAnswer("");
      setNewPoints(10);
      toast({ title: "Question added!" });
    },
    onError: () => {
      toast({ title: "Failed to add question", variant: "destructive" });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { question?: string; correctAnswer?: string; points?: number } }) => {
      return apiRequest('PUT', `/api/questions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', selectedCategoryId, 'questions'] });
      setEditingQuestionId(null);
      toast({ title: "Question updated!" });
    },
    onError: () => {
      toast({ title: "Failed to update question", variant: "destructive" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', selectedCategoryId, 'questions'] });
      toast({ title: "Question deleted" });
    },
  });

  const handleFileUpload = async (file: File, isEdit: boolean = false) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (data.url) {
        const isImage = file.type.startsWith('image/');
        const isAudio = file.type.startsWith('audio/');
        
        let markdown = '';
        if (isImage) {
          markdown = `\n![${file.name}](${data.url})\n`;
        } else if (isAudio) {
          markdown = `\n[audio:${data.url}]\n`;
        }
        
        if (isEdit) {
          setEditQuestion(prev => prev + markdown);
        } else {
          setNewQuestion(prev => prev + markdown);
        }
        
        toast({ title: `${isImage ? 'Image' : 'Audio'} uploaded!` });
      }
    } catch (error) {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const handleCreateBoard = () => {
    if (!newBoardName.trim() || newBoardPoints.length === 0) return;
    createBoardMutation.mutate({
      name: newBoardName.trim(),
      description: newBoardDesc.trim() || "",
      pointValues: newBoardPoints.sort((a, b) => a - b),
    });
  };

  const togglePointValue = (pv: number) => {
    setNewBoardPoints(prev => 
      prev.includes(pv) 
        ? prev.filter(p => p !== pv)
        : [...prev, pv].sort((a, b) => a - b)
    );
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim() || !selectedBoardId) return;
    createCategoryMutation.mutate({
      name: newCategoryName.trim(),
      description: newCategoryDesc.trim() || "Trivia questions",
      imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
      boardId: selectedBoardId,
    });
  };

  const handleCreateQuestion = () => {
    if (!selectedCategoryId || !newQuestion.trim() || !newCorrectAnswer.trim()) {
      toast({ title: "Please fill in question and answer", variant: "destructive" });
      return;
    }
    createQuestionMutation.mutate({
      categoryId: selectedCategoryId,
      question: newQuestion.trim(),
      options: [newCorrectAnswer.trim()],
      correctAnswer: newCorrectAnswer.trim(),
      points: newPoints,
    });
  };

  const startEditing = (q: Question) => {
    setEditingQuestionId(q.id);
    setEditQuestion(q.question);
    setEditCorrectAnswer(q.correctAnswer);
    setEditPoints(q.points);
  };

  const handleUpdateQuestion = () => {
    if (!editingQuestionId) return;
    updateQuestionMutation.mutate({
      id: editingQuestionId,
      data: {
        question: editQuestion.trim(),
        correctAnswer: editCorrectAnswer.trim(),
        points: editPoints,
      },
    });
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="min-h-screen gradient-game grid-bg p-6" data-color-mode="dark">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-header flex items-center justify-center glow-primary">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-muted-foreground">Manage categories and questions</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-border" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Game
            </Button>
          </Link>
        </div>

        <Card className="bg-card border-border mb-6">
          <CardHeader className="border-b border-border cursor-pointer" onClick={() => setShowBoardsSection(!showBoardsSection)}>
            <CardTitle className="flex items-center justify-between text-foreground">
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-primary" />
                Game Boards
                {selectedBoard && <span className="text-sm font-normal text-muted-foreground ml-2">- {selectedBoard.name}</span>}
              </div>
              {showBoardsSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </CardTitle>
          </CardHeader>
          <AnimatePresence>
            {showBoardsSection && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <CardContent className="p-4 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Input
                        placeholder="Board name"
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        className="bg-input border-border"
                        data-testid="input-board-name"
                      />
                      <Input
                        placeholder="Description (optional)"
                        value={newBoardDesc}
                        onChange={(e) => setNewBoardDesc(e.target.value)}
                        className="bg-input border-border"
                        data-testid="input-board-desc"
                      />
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Point values:</span>
                        <div className="flex flex-wrap gap-1">
                          {ALL_POINT_VALUES.map((pv) => (
                            <Button
                              key={pv}
                              size="sm"
                              variant={newBoardPoints.includes(pv) ? "default" : "outline"}
                              onClick={() => togglePointValue(pv)}
                              className="h-7 px-2 text-xs"
                              data-testid={`button-point-${pv}`}
                            >
                              {pv}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Button
                        onClick={handleCreateBoard}
                        disabled={createBoardMutation.isPending || !newBoardName.trim() || newBoardPoints.length === 0}
                        className="w-full gradient-header glow-primary"
                        data-testid="button-create-board"
                      >
                        {createBoardMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Create Board
                      </Button>
                    </div>
                    <div className="border-l border-border pl-4">
                      {loadingBoards ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[250px] overflow-y-auto">
                          {boards.map((board) => (
                            <motion.div
                              key={board.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex items-center justify-between gap-2 p-3 rounded-xl cursor-pointer transition-all ${
                                selectedBoardId === board.id
                                  ? 'bg-primary/20 border-2 border-primary'
                                  : 'bg-muted/20 border border-border hover:bg-muted/30'
                              }`}
                              onClick={() => {
                                setSelectedBoardId(board.id);
                                setSelectedCategoryId(null);
                              }}
                              data-testid={`board-item-${board.id}`}
                            >
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-foreground block truncate">{board.name}</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {board.pointValues.map((pv) => (
                                    <span key={pv} className="text-xs bg-white/10 px-1.5 py-0.5 rounded">{pv}</span>
                                  ))}
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBoardMutation.mutate(board.id);
                                }}
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                data-testid={`button-delete-board-${board.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          ))}
                          {boards.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">No boards yet</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {unassignedCategories.length > 0 && (
          <Card className="bg-card border-border mb-6">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FolderPlus className="w-5 h-5 text-yellow-500" />
                Unassigned Categories
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">{unassignedCategories.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-3">These categories are not assigned to any board. Click a category to assign it to the selected board.</p>
              <div className="flex flex-wrap gap-2">
                {unassignedCategories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant="outline"
                    size="sm"
                    disabled={!selectedBoardId || updateCategoryMutation.isPending}
                    onClick={() => {
                      if (selectedBoardId) {
                        updateCategoryMutation.mutate({ id: cat.id, boardId: selectedBoardId });
                      }
                    }}
                    className="border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-500/10"
                    data-testid={`button-assign-category-${cat.id}`}
                  >
                    {cat.name}
                    {selectedBoardId && <Plus className="w-3 h-3 ml-1" />}
                  </Button>
                ))}
              </div>
              {!selectedBoardId && (
                <p className="text-xs text-muted-foreground mt-3">Select a board above to assign categories to it</p>
              )}
            </CardContent>
          </Card>
        )}

        {!selectedBoardId ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8">
              <div className="text-center">
                <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Select a board above to manage its categories and questions</p>
              </div>
            </CardContent>
          </Card>
        ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FolderPlus className="w-5 h-5 text-primary" />
                Categories
                <span className="text-sm font-normal text-muted-foreground">- {selectedBoard?.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3">
                <Input
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                  className="bg-input border-border"
                  data-testid="input-category-name"
                />
                <Input
                  placeholder="Description (optional)"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                  className="bg-input border-border"
                  data-testid="input-category-desc"
                />
                <Button
                  onClick={handleCreateCategory}
                  disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
                  className="w-full gradient-header glow-primary"
                  data-testid="button-create-category"
                >
                  {createCategoryMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Add Category
                </Button>
              </div>

              <div className="border-t border-border pt-4">
                {loadingCategories ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {categories.map((cat) => (
                        <motion.div
                          key={cat.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                          className={`flex items-center justify-between gap-2 p-3 rounded-xl cursor-pointer transition-all ${
                            selectedCategoryId === cat.id
                              ? 'bg-primary/20 border-2 border-primary'
                              : 'bg-muted/20 border border-border hover:bg-muted/30'
                          }`}
                          onClick={() => setSelectedCategoryId(cat.id)}
                          data-testid={`category-item-${cat.id}`}
                        >
                          {editingCategoryId === cat.id ? (
                            <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                className="flex-1 h-8"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && editCategoryName.trim()) {
                                    updateCategoryMutation.mutate({ id: cat.id, name: editCategoryName.trim() });
                                  } else if (e.key === 'Escape') {
                                    setEditingCategoryId(null);
                                  }
                                }}
                                data-testid={`input-edit-category-${cat.id}`}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (editCategoryName.trim()) {
                                    updateCategoryMutation.mutate({ id: cat.id, name: editCategoryName.trim() });
                                  }
                                }}
                                className="h-8 w-8 shrink-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                data-testid={`button-save-category-${cat.id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingCategoryId(null)}
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                data-testid={`button-cancel-edit-category-${cat.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="font-medium text-foreground truncate">{cat.name}</span>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCategoryId(cat.id);
                                    setEditCategoryName(cat.name);
                                  }}
                                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  data-testid={`button-edit-category-${cat.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCategoryMutation.mutate(cat.id);
                                  }}
                                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  data-testid={`button-delete-category-${cat.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </AnimatePresence>
                )}
                {categories.length === 0 && !loadingCategories && (
                  <p className="text-center text-muted-foreground py-8">No categories yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <HelpCircle className="w-5 h-5 text-primary" />
                Questions
                {selectedCategory && <span className="text-muted-foreground font-normal">- {selectedCategory.name}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {!selectedCategoryId ? (
                <div className="text-center py-12">
                  <FolderPlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Select a category to manage questions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3 p-4 bg-muted/10 rounded-xl border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-muted-foreground">Question (supports markdown, images, audio)</span>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      />
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => imageInputRef.current?.click()}
                        className="h-7 text-muted-foreground hover:text-primary"
                      >
                        <Image className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => audioInputRef.current?.click()}
                        className="h-7 text-muted-foreground hover:text-primary"
                      >
                        <Music className="w-4 h-4" />
                      </Button>
                    </div>
                    <MDEditor
                      value={newQuestion}
                      onChange={(val) => setNewQuestion(val || "")}
                      preview="edit"
                      height={150}
                      data-testid="input-question-text"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Correct answer"
                        value={newCorrectAnswer}
                        onChange={(e) => setNewCorrectAnswer(e.target.value)}
                        className="bg-input border-border"
                        data-testid="input-correct-answer"
                      />
                      <Select value={String(newPoints)} onValueChange={(v) => setNewPoints(Number(v))}>
                        <SelectTrigger className="bg-input border-border" data-testid="select-points">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currentPointValues.map((p) => (
                            <SelectItem key={p} value={String(p)}>{p} pts</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleCreateQuestion}
                      disabled={createQuestionMutation.isPending}
                      className="w-full gradient-header"
                      data-testid="button-add-question"
                    >
                      {createQuestionMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Add Question
                    </Button>
                  </div>

                  <div className="border-t border-border pt-4">
                    {loadingQuestions ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[350px] overflow-y-auto">
                        {questions.map((q) => (
                          <div
                            key={q.id}
                            className="p-3 bg-muted/20 rounded-xl border border-border"
                            data-testid={`question-item-${q.id}`}
                          >
                            {editingQuestionId === q.id ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <input
                                    ref={editImageInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], true)}
                                  />
                                  <input
                                    ref={editAudioInputRef}
                                    type="file"
                                    accept="audio/*"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], true)}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => editImageInputRef.current?.click()}
                                    className="h-7 text-muted-foreground hover:text-primary"
                                  >
                                    <Image className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => editAudioInputRef.current?.click()}
                                    className="h-7 text-muted-foreground hover:text-primary"
                                  >
                                    <Music className="w-4 h-4" />
                                  </Button>
                                </div>
                                <MDEditor
                                  value={editQuestion}
                                  onChange={(val) => setEditQuestion(val || "")}
                                  preview="edit"
                                  height={120}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    value={editCorrectAnswer}
                                    onChange={(e) => setEditCorrectAnswer(e.target.value)}
                                    className="bg-input border-border text-sm"
                                    placeholder="Answer"
                                  />
                                  <Select value={String(editPoints)} onValueChange={(v) => setEditPoints(Number(v))}>
                                    <SelectTrigger className="bg-input border-border">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {currentPointValues.map((p) => (
                                        <SelectItem key={p} value={String(p)}>{p} pts</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={handleUpdateQuestion}
                                    disabled={updateQuestionMutation.isPending}
                                    className="flex-1 bg-primary"
                                  >
                                    {updateQuestionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingQuestionId(null)}
                                    className="border-border"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-foreground text-sm line-clamp-2">{q.question.replace(/!\[.*?\]\(.*?\)/g, '[image]').replace(/\[audio:.*?\]/g, '[audio]')}</p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-xs font-medium text-primary">{q.points} pts</span>
                                    <span className="text-xs text-muted-foreground">Answer: {q.correctAnswer}</span>
                                  </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => startEditing(q)}
                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    data-testid={`button-edit-question-${q.id}`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => deleteQuestionMutation.mutate(q.id)}
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    data-testid={`button-delete-question-${q.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {questions.length === 0 && (
                          <p className="text-center text-muted-foreground py-6">No questions yet</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        )}
      </div>
    </div>
  );
}
