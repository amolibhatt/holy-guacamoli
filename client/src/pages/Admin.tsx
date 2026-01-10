import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, FolderPlus, HelpCircle, ArrowLeft, Loader2, Pencil, X, Check, Image, Music, Grid3X3, Link2, Unlink } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import MDEditor from '@uiw/react-md-editor';
import type { Category, Question, Board, BoardCategoryWithCategory } from "@shared/schema";

const ALL_POINT_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function Admin() {
  const { toast } = useToast();
  
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [selectedBoardCategoryId, setSelectedBoardCategoryId] = useState<number | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

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

  const { data: allCategories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const selectedBoard = boards.find(b => b.id === selectedBoardId);
  const currentPointValues = selectedBoard?.pointValues || ALL_POINT_VALUES;

  const { data: boardCategories = [], isLoading: loadingBoardCategories } = useQuery<BoardCategoryWithCategory[]>({
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
        setSelectedBoardCategoryId(null);
      }
      toast({ title: "Board deleted" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; imageUrl: string }) => {
      return apiRequest('POST', '/api/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setNewCategoryName("");
      setNewCategoryDesc("");
      toast({ title: "Category created!" });
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      return apiRequest('PUT', `/api/categories/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
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
      toast({ title: "Category deleted" });
    },
  });

  const linkCategoryMutation = useMutation({
    mutationFn: async ({ boardId, categoryId }: { boardId: number; categoryId: number }) => {
      return apiRequest('POST', `/api/boards/${boardId}/categories`, { categoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      toast({ title: "Category linked to board!" });
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
      if (selectedBoardCategoryId) {
        setSelectedBoardCategoryId(null);
      }
      toast({ title: "Category unlinked from board" });
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: { boardCategoryId: number; question: string; options: string[]; correctAnswer: string; points: number }) => {
      return apiRequest('POST', '/api/questions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/board-categories', selectedBoardCategoryId, 'questions'] });
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
    if (!selectedBoardCategoryId || !newQuestion.trim() || !newCorrectAnswer.trim()) return;
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
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border px-6 py-4">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Manage boards, categories, and questions</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Grid3X3 className="w-5 h-5 text-primary" />
                Boards
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="New board name"
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
                  onClick={() => createBoardMutation.mutate({ name: newBoardName, description: newBoardDesc, pointValues: newBoardPoints })}
                  disabled={!newBoardName.trim() || newBoardPoints.length === 0}
                  className="w-full"
                  data-testid="button-create-board"
                >
                  <Plus className="w-4 h-4 mr-2" /> Create Board
                </Button>
              </div>

              <div className="border-t border-border pt-4 space-y-2 max-h-[300px] overflow-y-auto">
                {loadingBoards ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : boards.map(board => (
                  <div
                    key={board.id}
                    className={`flex items-center justify-between gap-2 p-3 rounded-xl cursor-pointer transition-all ${
                      selectedBoardId === board.id
                        ? 'bg-primary/20 border-2 border-primary'
                        : 'bg-muted/20 border border-border hover:bg-muted/30'
                    }`}
                    onClick={() => { setSelectedBoardId(board.id); setSelectedBoardCategoryId(null); }}
                    data-testid={`board-item-${board.id}`}
                  >
                    <div>
                      <span className="font-medium text-foreground">{board.name}</span>
                      <div className="text-xs text-muted-foreground">
                        Points: {(board.pointValues || []).join(', ')}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); deleteBoardMutation.mutate(board.id); }}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      data-testid={`button-delete-board-${board.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {boards.length === 0 && !loadingBoards && (
                  <p className="text-center text-muted-foreground py-4">No boards yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FolderPlus className="w-5 h-5 text-primary" />
                Category Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  data-testid="input-category-name"
                />
                <Button
                  onClick={() => createCategoryMutation.mutate({ name: newCategoryName, description: '', imageUrl: '' })}
                  disabled={!newCategoryName.trim()}
                  data-testid="button-create-category"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="border-t border-border pt-4 space-y-2 max-h-[300px] overflow-y-auto">
                {loadingCategories ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : allCategories.map(cat => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/20 border border-border"
                    data-testid={`category-template-${cat.id}`}
                  >
                    {editingCategoryId === cat.id ? (
                      <div className="flex items-center gap-2 flex-1">
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
                        />
                        <Button size="icon" variant="ghost" onClick={() => updateCategoryMutation.mutate({ id: cat.id, name: editCategoryName.trim() })} className="h-8 w-8 text-green-500">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingCategoryId(null)} className="h-8 w-8">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-foreground truncate">{cat.name}</span>
                        <div className="flex items-center gap-1">
                          {selectedBoardId && !linkedCategoryIds.includes(cat.id) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => linkCategoryMutation.mutate({ boardId: selectedBoardId, categoryId: cat.id })}
                              className="h-8 w-8 text-green-500 hover:text-green-600"
                              title="Link to selected board"
                              data-testid={`button-link-category-${cat.id}`}
                            >
                              <Link2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { setEditingCategoryId(cat.id); setEditCategoryName(cat.name); }}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            data-testid={`button-edit-category-${cat.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteCategoryMutation.mutate(cat.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            data-testid={`button-delete-category-${cat.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {allCategories.length === 0 && !loadingCategories && (
                  <p className="text-center text-muted-foreground py-4">No categories yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Link2 className="w-5 h-5 text-primary" />
                Board Categories
                {selectedBoard && <span className="text-muted-foreground font-normal">- {selectedBoard.name}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {!selectedBoardId ? (
                <div className="text-center py-8">
                  <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Select a board to manage its categories</p>
                </div>
              ) : loadingBoardCategories ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {boardCategories.map(bc => (
                      <motion.div
                        key={bc.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className={`flex items-center justify-between gap-2 p-3 rounded-xl cursor-pointer transition-all ${
                          selectedBoardCategoryId === bc.id
                            ? 'bg-primary/20 border-2 border-primary'
                            : 'bg-muted/20 border border-border hover:bg-muted/30'
                        }`}
                        onClick={() => setSelectedBoardCategoryId(bc.id)}
                        data-testid={`board-category-${bc.id}`}
                      >
                        <div>
                          <span className="font-medium text-foreground">{bc.category.name}</span>
                          <div className="text-xs text-muted-foreground">
                            {questions.filter(q => q.boardCategoryId === bc.id).length || '0'} questions
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); unlinkCategoryMutation.mutate(bc.id); }}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Unlink from board"
                          data-testid={`button-unlink-${bc.id}`}
                        >
                          <Unlink className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {boardCategories.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No categories linked. Click the link icon on a category template to add it.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <HelpCircle className="w-5 h-5 text-primary" />
              Questions
              {selectedBoardCategory && (
                <span className="text-muted-foreground font-normal">
                  - {selectedBoardCategory.category.name} ({selectedBoard?.name})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {!selectedBoardCategoryId ? (
              <div className="text-center py-12">
                <FolderPlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Select a board category to manage questions</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3 p-4 bg-muted/10 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-muted-foreground">Add Question (supports markdown, images, audio)</span>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                    <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                    <Button size="sm" variant="ghost" onClick={() => imageInputRef.current?.click()} className="h-7 text-muted-foreground hover:text-primary">
                      <Image className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => audioInputRef.current?.click()} className="h-7 text-muted-foreground hover:text-primary">
                      <Music className="w-4 h-4" />
                    </Button>
                  </div>
                  <MDEditor value={newQuestion} onChange={(val) => setNewQuestion(val || "")} preview="edit" height={120} data-testid="input-new-question" />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Correct answer"
                      value={newCorrectAnswer}
                      onChange={(e) => setNewCorrectAnswer(e.target.value)}
                      className="flex-1"
                      data-testid="input-correct-answer"
                    />
                    <Select value={String(newPoints)} onValueChange={(v) => setNewPoints(Number(v))}>
                      <SelectTrigger className="w-24" data-testid="select-points">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentPointValues.map(pt => (
                          <SelectItem key={pt} value={String(pt)}>{pt} pts</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleCreateQuestion} disabled={!newQuestion.trim() || !newCorrectAnswer.trim()} data-testid="button-add-question">
                      <Plus className="w-4 h-4 mr-2" /> Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {loadingQuestions ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {questions.map(q => (
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
                                    {currentPointValues.map(pt => (
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
                                  <span className="px-2 py-0.5 text-xs font-bold bg-primary/20 text-primary rounded">{q.points} pts</span>
                                </div>
                                <p className="text-sm text-foreground line-clamp-2">{q.question.replace(/!\[.*?\]\(.*?\)/g, '[image]').replace(/<audio.*?<\/audio>/g, '[audio]')}</p>
                                <p className="text-xs text-green-500 mt-1">Answer: {q.correctAnswer}</p>
                              </div>
                              <div className="flex items-center gap-1">
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
                    <p className="text-center text-muted-foreground py-8">No questions yet. Add your first question above.</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
