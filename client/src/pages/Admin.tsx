import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, FolderPlus, HelpCircle, ArrowLeft, Loader2, Zap, Pencil, X, Check } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import type { Category, Question } from "@shared/schema";

const POINT_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function Admin() {
  const { toast } = useToast();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");

  const [newQuestion, setNewQuestion] = useState("");
  const [newCorrectAnswer, setNewCorrectAnswer] = useState("");
  const [newPoints, setNewPoints] = useState<number>(10);

  const [editQuestion, setEditQuestion] = useState("");
  const [editCorrectAnswer, setEditCorrectAnswer] = useState("");
  const [editPoints, setEditPoints] = useState<number>(10);

  const { data: categories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: questions = [], isLoading: loadingQuestions } = useQuery<Question[]>({
    queryKey: ['/api/categories', selectedCategoryId, 'questions'],
    enabled: !!selectedCategoryId,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; imageUrl: string }) => {
      return apiRequest('/api/categories', { method: 'POST', body: JSON.stringify(data) });
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

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/categories/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      if (selectedCategoryId) {
        setSelectedCategoryId(null);
      }
      toast({ title: "Category deleted" });
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: { categoryId: number; question: string; options: string[]; correctAnswer: string; points: number }) => {
      return apiRequest('/api/questions', { method: 'POST', body: JSON.stringify(data) });
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
      return apiRequest(`/api/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
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
      return apiRequest(`/api/questions/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', selectedCategoryId, 'questions'] });
      toast({ title: "Question deleted" });
    },
  });

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    createCategoryMutation.mutate({
      name: newCategoryName.trim(),
      description: newCategoryDesc.trim() || "Trivia questions",
      imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
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
    <div className="min-h-screen gradient-game grid-bg p-6">
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

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FolderPlus className="w-5 h-5 text-primary" />
                Categories
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
                          <span className="font-medium text-foreground truncate">{cat.name}</span>
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
                    <Textarea
                      placeholder="Question text"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="bg-input border-border resize-none"
                      rows={2}
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
                          {POINT_VALUES.map((p) => (
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
                                <Textarea
                                  value={editQuestion}
                                  onChange={(e) => setEditQuestion(e.target.value)}
                                  className="bg-input border-border resize-none text-sm"
                                  rows={2}
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
                                      {POINT_VALUES.map((p) => (
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
                                  <p className="text-foreground text-sm line-clamp-2">{q.question}</p>
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
      </div>
    </div>
  );
}
