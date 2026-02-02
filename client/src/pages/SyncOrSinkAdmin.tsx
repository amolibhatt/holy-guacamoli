import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, Grid3X3, ListOrdered, Eye, Plus, Trash2, X, 
  HeartHandshake, Pencil, Folder
} from "lucide-react";
import type { SyncQuestion } from "@shared/schema";

export default function SyncOrSinkAdmin() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<SyncQuestion | null>(null);
  const [questionText, setQuestionText] = useState("");

  const { data: questions = [], isLoading } = useQuery<SyncQuestion[]>({
    queryKey: ["/api/sync/questions"],
  });

  const categories = Array.from(new Set(questions.map(q => q.category).filter(Boolean))) as string[];
  
  const filteredQuestions = selectedCategory 
    ? questions.filter(q => q.category === selectedCategory)
    : questions;

  const createMutation = useMutation({
    mutationFn: async (data: {
      questionText: string;
      category: string | null;
      isActive: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/sync/questions", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create question");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/questions"] });
      toast({ title: "Question created!" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to create question", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; questionText: string; category: string | null }) => {
      const res = await apiRequest("PUT", `/api/sync/questions/${data.id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update question");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/questions"] });
      toast({ title: "Question updated!" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to update question", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/sync/questions/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete question");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/questions"] });
      toast({ title: "Question deleted" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to delete question", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingQuestion(null);
    setQuestionText("");
  };

  const startEditing = (question: SyncQuestion) => {
    setEditingQuestion(question);
    setQuestionText(question.questionText);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!questionText.trim()) {
      toast({ title: "Please enter a question", variant: "destructive" });
      return;
    }
    
    if (editingQuestion) {
      updateMutation.mutate({
        id: editingQuestion.id,
        questionText: questionText.trim(),
        category: editingQuestion.category || selectedCategory || null,
      });
    } else {
      createMutation.mutate({
        questionText: questionText.trim(),
        category: selectedCategory || null,
        isActive: true,
      });
    }
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    setSelectedCategory(newCategoryName.trim());
    setNewCategoryName("");
    setShowNewCategoryForm(false);
    setShowForm(true);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-sync-admin">
      <div className="fixed inset-0 bg-gradient-to-br from-rose-300/5 via-transparent to-pink-300/5 pointer-events-none" />
      
      <AppHeader minimal backHref="/" title="Sync or Sink Admin" />

      <div className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-4 w-full">
          <nav className="flex flex-wrap gap-1">
            <Link href="/admin/games">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-blitzgrid"
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Blitzgrid
              </Button>
            </Link>
            <Link href="/admin/sort-circuit">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-sort-circuit"
              >
                <ListOrdered className="w-4 h-4 mr-2" />
                Sort Circuit
              </Button>
            </Link>
            <Link href="/admin/psyop">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-psyop"
              >
                <Eye className="w-4 h-4 mr-2" />
                PsyOp
              </Button>
            </Link>
            <Link href="/admin/sync-or-sink">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-primary text-foreground"
                data-testid="tab-sync-or-sink"
              >
                <HeartHandshake className="w-4 h-4 mr-2" />
                Sync or Sink
              </Button>
            </Link>
          </nav>
        </div>
      </div>

      <div className="flex flex-1">
        <aside className="w-64 border-r border-border bg-card/50 p-4 shrink-0 hidden md:block">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground">Categories</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNewCategoryForm(true)}
              data-testid="button-add-category"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {showNewCategoryForm && (
            <div className="mb-4 p-3 rounded-lg bg-muted/50 space-y-2">
              <Input
                placeholder="Category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
                data-testid="input-new-category"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateCategory} data-testid="button-create-category">
                  Create
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => { setShowNewCategoryForm(false); setNewCategoryName(""); }}
                  data-testid="button-cancel-category"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <Button
            variant={selectedCategory === null ? "secondary" : "ghost"}
            className="w-full justify-start mb-2"
            onClick={() => setSelectedCategory(null)}
            data-testid="button-all-questions"
          >
            <Folder className="w-4 h-4 mr-2" />
            All Questions
            <Badge variant="outline" className="ml-auto">{questions.length}</Badge>
          </Button>

          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "secondary" : "ghost"}
              className="w-full justify-start mb-1"
              onClick={() => setSelectedCategory(cat)}
              data-testid={`button-category-${cat}`}
            >
              <Folder className="w-4 h-4 mr-2" />
              {cat}
              <Badge variant="outline" className="ml-auto">
                {questions.filter(q => q.category === cat).length}
              </Badge>
            </Button>
          ))}
        </aside>

        <main className="flex-1 p-6 relative">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">
                  {selectedCategory || "All Questions"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button onClick={() => setShowForm(true)} data-testid="button-add-question">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>

            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="mb-6">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                      <CardTitle className="text-lg">
                        {editingQuestion ? "Edit Question" : "New Question"}
                      </CardTitle>
                      <Button variant="ghost" size="icon" onClick={resetForm} data-testid="button-close-form">
                        <X className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="questionText">Question</Label>
                        <Textarea
                          id="questionText"
                          placeholder="What's a movie that never fails to make you cry?"
                          value={questionText}
                          onChange={(e) => setQuestionText(e.target.value)}
                          rows={3}
                          data-testid="input-question-text"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Open-ended questions work best. Partners answer separately, then reveal together.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSubmit}
                          disabled={createMutation.isPending || updateMutation.isPending}
                          data-testid="button-save-question"
                        >
                          {(createMutation.isPending || updateMutation.isPending) && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          {editingQuestion ? "Update" : "Create"}
                        </Button>
                        <Button variant="outline" onClick={resetForm} data-testid="button-cancel-question">
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <Card className="p-8 text-center">
                <HeartHandshake className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-semibold mb-2">No questions yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Create questions for couples to answer together
                </p>
                <Button onClick={() => setShowForm(true)} data-testid="button-create-first-question">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Question
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredQuestions.map((question) => (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="hover-elevate">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium mb-2">{question.questionText}</p>
                            {question.category && (
                              <Badge variant="outline" className="text-xs">
                                {question.category}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditing(question)}
                              data-testid={`button-edit-question-${question.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(question.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-question-${question.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
