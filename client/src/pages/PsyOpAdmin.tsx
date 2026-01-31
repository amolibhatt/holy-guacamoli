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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, Grid3X3, ListOrdered, Eye, Plus, Trash2, X, 
  Sparkles, Lightbulb, Check, Upload, ChevronDown, Folder, Pencil
} from "lucide-react";
import type { PsyopQuestion } from "@shared/schema";

type ParsedQuestion = {
  factText: string;
  correctAnswer: string;
  category: string | null;
};

export default function PsyOpAdmin() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Category selection
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Question form
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<PsyopQuestion | null>(null);
  const [factText, setFactText] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  
  // Bulk import
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [bulkPreviewMode, setBulkPreviewMode] = useState(false);

  const { data: questions = [], isLoading } = useQuery<PsyopQuestion[]>({
    queryKey: ["/api/psyop/questions"],
  });

  // Get unique categories
  const categories = Array.from(new Set(questions.map(q => q.category).filter(Boolean))) as string[];
  
  // Filter questions by selected category
  const filteredQuestions = selectedCategory 
    ? questions.filter(q => q.category === selectedCategory)
    : questions;

  const createMutation = useMutation({
    mutationFn: async (data: {
      factText: string;
      correctAnswer: string;
      category: string | null;
      isActive: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/psyop/questions", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create question");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/psyop/questions"] });
      toast({ title: "Question created!" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to create question", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; factText: string; correctAnswer: string; category: string | null }) => {
      const res = await apiRequest("PUT", `/api/psyop/questions/${data.id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update question");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/psyop/questions"] });
      toast({ title: "Question updated!" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to update question", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/psyop/questions/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete question");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/psyop/questions"] });
      toast({ title: "Question deleted" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to delete question", variant: "destructive" });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (questions: ParsedQuestion[]) => {
      const res = await apiRequest("POST", "/api/psyop/questions/bulk", { questions });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to import questions");
      }
      return res.json();
    },
    onSuccess: (data: { success: number; errors: string[] }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/psyop/questions"] });
      setBulkImportText("");
      setBulkImportOpen(false);
      setBulkPreviewMode(false);
      if (data.errors.length > 0) {
        toast({ 
          title: `Imported ${data.success} question(s)`, 
          description: `${data.errors.length} error(s): ${data.errors.slice(0, 2).join('; ')}${data.errors.length > 2 ? '...' : ''}`,
          variant: "destructive" 
        });
      } else {
        toast({ title: `Successfully imported ${data.success} question(s)!` });
      }
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to import questions", variant: "destructive" });
    },
  });

  const parseBulkImport = (text: string): ParsedQuestion[] => {
    const lines = text.split('\n').filter(l => l.trim());
    const parsed: ParsedQuestion[] = [];
    
    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 2) {
        const [fact, answer, cat] = parts;
        if (fact && answer && fact.includes('[REDACTED]')) {
          parsed.push({
            factText: fact,
            correctAnswer: answer,
            category: cat?.trim() || selectedCategory || null,
          });
        }
      }
    }
    return parsed;
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingQuestion(null);
    setFactText("");
    setCorrectAnswer("");
  };

  const startEditing = (question: PsyopQuestion) => {
    setEditingQuestion(question);
    setFactText(question.factText);
    setCorrectAnswer(question.correctAnswer);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!factText) {
      toast({ title: "Please enter the fact text", variant: "destructive" });
      return;
    }
    if (!factText.includes('[REDACTED]')) {
      toast({ title: "Fact must contain [REDACTED] placeholder", variant: "destructive" });
      return;
    }
    if (!correctAnswer) {
      toast({ title: "Please enter the correct answer", variant: "destructive" });
      return;
    }
    
    if (editingQuestion) {
      updateMutation.mutate({
        id: editingQuestion.id,
        factText,
        correctAnswer,
        category: editingQuestion.category || selectedCategory || null,
      });
    } else {
      createMutation.mutate({
        factText,
        correctAnswer,
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

  const renderFactWithBlank = (text: string, answer?: string) => {
    const parts = text.split('[REDACTED]');
    if (parts.length < 2) return text;
    return (
      <span>
        {parts[0]}
        <span className="px-2 py-0.5 mx-1 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400 font-semibold">
          {answer || '[REDACTED]'}
        </span>
        {parts[1]}
      </span>
    );
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
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-psyop-admin">
      <div className="fixed inset-0 bg-gradient-to-br from-violet-300/5 via-transparent to-purple-300/5 pointer-events-none" />
      
      <AppHeader minimal backHref="/" title="PsyOp Admin" />

      <div className="border-b border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <nav className="flex flex-wrap gap-1">
            <Link href="/admin/games">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground"
                data-testid="tab-blitzgrid"
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Blitzgrid
              </Button>
            </Link>
            <Link href="/admin/sort-circuit">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground"
                data-testid="tab-sort-circuit"
              >
                <ListOrdered className="w-4 h-4 mr-2" />
                Sort Circuit
              </Button>
            </Link>
            <Link href="/admin/psyop">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-primary text-foreground"
                data-testid="tab-psyop"
              >
                <Eye className="w-4 h-4 mr-2" />
                PsyOp
              </Button>
            </Link>
          </nav>
        </div>
      </div>

      <div className="flex flex-1 max-w-6xl mx-auto w-full">
        {/* Categories Sidebar */}
        <aside className="w-64 border-r border-border bg-card/50 p-4 shrink-0 hidden md:block">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground">Categories</h2>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setShowNewCategoryForm(true)}
              data-testid="button-add-category"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {showNewCategoryForm && (
            <div className="mb-3 flex gap-1">
              <Input
                placeholder="Category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateCategory();
                  if (e.key === 'Escape') {
                    setShowNewCategoryForm(false);
                    setNewCategoryName("");
                  }
                }}
                autoFocus
                className="h-8 text-sm"
                data-testid="input-new-category"
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setShowNewCategoryForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="space-y-1">
            {/* All Questions */}
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategory === null 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-foreground hover:bg-muted'
              }`}
              data-testid="sidebar-all-questions"
            >
              <div className="flex items-center gap-2">
                <Eye className={`w-4 h-4 shrink-0 ${selectedCategory === null ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="truncate flex-1">All Questions</span>
                <Badge variant="secondary" className="text-xs">{questions.length}</Badge>
              </div>
            </button>

            {/* Category list */}
            {categories.map(cat => {
              const count = questions.filter(q => q.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    cat === selectedCategory 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-foreground hover:bg-muted'
                  }`}
                  data-testid={`sidebar-category-${cat}`}
                >
                  <div className="flex items-center gap-2">
                    <Folder className={`w-4 h-4 shrink-0 ${cat === selectedCategory ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="truncate flex-1">{cat}</span>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {/* Mobile Category Selector */}
          <div className="md:hidden mb-4">
            <Select 
              value={selectedCategory || "all"} 
              onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Questions ({questions.length})</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat} ({questions.filter(q => q.category === cat).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-bold">
                {selectedCategory ? selectedCategory : "All Questions"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              size="sm"
              className="gap-2"
              data-testid="button-add-question"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </Button>
          </div>

          {/* Bulk Import */}
          <Collapsible open={bulkImportOpen} onOpenChange={setBulkImportOpen} className="mb-6">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2" data-testid="button-bulk-import">
                <Upload className="w-4 h-4" />
                Bulk Import
                <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${bulkImportOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Paste questions (one per line)</Label>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Format: <code className="bg-muted px-1 rounded">fact with [REDACTED] | answer | category (optional)</code></p>
                      <p>Example: <code className="bg-muted px-1 rounded">The [REDACTED] is the largest planet | Jupiter | Science</code></p>
                      {selectedCategory && (
                        <p className="text-purple-600 dark:text-purple-400">
                          Questions without a category will be added to: <strong>{selectedCategory}</strong>
                        </p>
                      )}
                    </div>
                    <Textarea
                      value={bulkImportText}
                      onChange={(e) => setBulkImportText(e.target.value)}
                      placeholder="The Eiffel Tower is located in [REDACTED] | Paris | Geography&#10;A group of [REDACTED] is called a pride | lions | Animals"
                      rows={6}
                      className="font-mono text-sm"
                      data-testid="textarea-bulk-import"
                    />
                  </div>

                  {bulkPreviewMode && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Preview ({parseBulkImport(bulkImportText).length} valid questions)</div>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {parseBulkImport(bulkImportText).map((q, i) => (
                          <div key={i} className="text-sm p-2 bg-muted rounded-md">
                            <div>{renderFactWithBlank(q.factText, q.correctAnswer)}</div>
                            {q.category && <div className="text-xs text-muted-foreground mt-1">Category: {q.category}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkPreviewMode(!bulkPreviewMode)}
                      disabled={!bulkImportText.trim()}
                      data-testid="button-preview-import"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {bulkPreviewMode ? 'Hide Preview' : 'Preview'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const parsed = parseBulkImport(bulkImportText);
                        if (parsed.length === 0) {
                          toast({ title: "No valid questions found", variant: "destructive" });
                          return;
                        }
                        bulkImportMutation.mutate(parsed);
                      }}
                      disabled={bulkImportMutation.isPending || !bulkImportText.trim()}
                      data-testid="button-import-questions"
                    >
                      {bulkImportMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Import {parseBulkImport(bulkImportText).length} Questions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Add Question Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6"
              >
                <Card className="border-purple-500/30">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      {editingQuestion ? 'Edit Question' : `New Question ${selectedCategory ? `in ${selectedCategory}` : ''}`}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={resetForm}
                      data-testid="button-close-form"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fact-text">
                        Fact Text
                        <span className="text-muted-foreground text-xs ml-2">(use [REDACTED] for the hidden word)</span>
                      </Label>
                      <Textarea
                        id="fact-text"
                        value={factText}
                        onChange={(e) => setFactText(e.target.value)}
                        placeholder="The [REDACTED] is the largest mammal on Earth"
                        rows={3}
                        data-testid="input-fact-text"
                      />
                      {factText && factText.includes('[REDACTED]') && (
                        <div className="text-sm p-2 bg-muted rounded-md">
                          <span className="text-muted-foreground">Preview: </span>
                          {renderFactWithBlank(factText, correctAnswer || undefined)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="correct-answer">Correct Answer</Label>
                      <Input
                        id="correct-answer"
                        value={correctAnswer}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        placeholder="blue whale"
                        data-testid="input-correct-answer"
                      />
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <Lightbulb className="w-4 h-4 text-yellow-500 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Players will submit fake answers to fill in the blank. Other players vote on which answer is real.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button variant="outline" onClick={resetForm} data-testid="button-cancel">
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={createMutation.isPending || updateMutation.isPending}
                        data-testid="button-save-question"
                      >
                        {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <Check className="w-4 h-4 mr-2" />
                        {editingQuestion ? 'Update Question' : 'Save Question'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Questions List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Eye className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {selectedCategory ? `No questions in ${selectedCategory}` : 'No questions yet'}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Create fill-in-the-blank facts for players to deceive each other
                </p>
                <Button onClick={() => setShowForm(true)} data-testid="button-create-first">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Question
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q, index) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="hover-elevate">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="text-sm">
                            {renderFactWithBlank(q.factText, q.correctAnswer)}
                          </div>
                          {q.category && !selectedCategory && (
                            <Badge variant="secondary" className="text-xs">{q.category}</Badge>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(q)}
                            data-testid={`button-edit-question-${q.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(q.id)}
                            disabled={deleteMutation.isPending}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-question-${q.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>
    </div>
  );
}
