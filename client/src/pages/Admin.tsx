import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, FolderPlus, HelpCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import type { Category, Question } from "@shared/schema";

const POINT_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function Admin() {
  const { toast } = useToast();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");

  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", "", "", ""]);
  const [newCorrectAnswer, setNewCorrectAnswer] = useState("");
  const [newPoints, setNewPoints] = useState<number>(10);

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
      setNewOptions(["", "", "", ""]);
      setNewCorrectAnswer("");
      setNewPoints(10);
      toast({ title: "Question added!" });
    },
    onError: () => {
      toast({ title: "Failed to add question", variant: "destructive" });
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
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    const validOptions = newOptions.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast({ title: "Please provide at least 2 options", variant: "destructive" });
      return;
    }
    if (!validOptions.includes(newCorrectAnswer.trim())) {
      toast({ title: "Correct answer must be one of the options", variant: "destructive" });
      return;
    }
    createQuestionMutation.mutate({
      categoryId: selectedCategoryId,
      question: newQuestion.trim(),
      options: validOptions,
      correctAnswer: newCorrectAnswer.trim(),
      points: newPoints,
    });
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-400 mt-1">Manage categories and questions</p>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-slate-600 text-slate-300" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Game
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-slate-800/80 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FolderPlus className="w-5 h-5 text-blue-400" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Input
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  data-testid="input-category-name"
                />
                <Input
                  placeholder="Description (optional)"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  data-testid="input-category-desc"
                />
                <Button
                  onClick={handleCreateCategory}
                  disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500"
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

              <div className="border-t border-slate-700 pt-4">
                {loadingCategories ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
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
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedCategoryId === cat.id
                              ? 'bg-blue-600/30 border border-blue-500'
                              : 'bg-slate-700/50 hover:bg-slate-700'
                          }`}
                          onClick={() => setSelectedCategoryId(cat.id)}
                          data-testid={`category-item-${cat.id}`}
                        >
                          <span className="text-white font-medium">{cat.name}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCategoryMutation.mutate(cat.id);
                            }}
                            className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
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
                  <p className="text-center text-slate-500 py-8">No categories yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/80 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <HelpCircle className="w-5 h-5 text-green-400" />
                Questions {selectedCategory && <span className="text-slate-400">- {selectedCategory.name}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedCategoryId ? (
                <p className="text-center text-slate-500 py-12">Select a category to manage questions</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3 p-4 bg-slate-700/30 rounded-xl">
                    <Textarea
                      placeholder="Question text"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white resize-none"
                      rows={2}
                      data-testid="input-question-text"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {newOptions.map((opt, idx) => (
                        <Input
                          key={idx}
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const updated = [...newOptions];
                            updated[idx] = e.target.value;
                            setNewOptions(updated);
                          }}
                          className="bg-slate-700/50 border-slate-600 text-white"
                          data-testid={`input-option-${idx}`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Correct answer (must match an option)"
                        value={newCorrectAnswer}
                        onChange={(e) => setNewCorrectAnswer(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-white"
                        data-testid="input-correct-answer"
                      />
                      <Select value={String(newPoints)} onValueChange={(v) => setNewPoints(Number(v))}>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white" data-testid="select-points">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {POINT_VALUES.map((p) => (
                            <SelectItem key={p} value={String(p)}>{p} points</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleCreateQuestion}
                      disabled={createQuestionMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-500"
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

                  <div className="border-t border-slate-700 pt-4">
                    {loadingQuestions ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {questions.map((q) => (
                          <div
                            key={q.id}
                            className="flex items-start justify-between gap-3 p-3 bg-slate-700/50 rounded-lg"
                            data-testid={`question-item-${q.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm line-clamp-2">{q.question}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-blue-400 font-medium">{q.points} pts</span>
                                <span className="text-xs text-green-400">Answer: {q.correctAnswer}</span>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteQuestionMutation.mutate(q.id)}
                              className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                              data-testid={`button-delete-question-${q.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        {questions.length === 0 && (
                          <p className="text-center text-slate-500 py-4">No questions yet</p>
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
