import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { GameAnalyticsPanel } from "@/components/GameAnalyticsPanel";
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
  Sparkles, Lightbulb, Check, Upload, ChevronDown, Folder, Pencil, Clock, Smile
} from "lucide-react";
import type { PsyopQuestion } from "@shared/schema";

type ParsedQuestion = {
  factText: string;
  correctAnswer: string;
  category: string | null;
};

export default function PsyOpAdmin() {
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Access denied check - inserted after hooks are called
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

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

  // AI Chat
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiMessages, setAiMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<{factText: string, correctAnswer: string, category?: string}[]>([]);
  const [savingQuestionIdx, setSavingQuestionIdx] = useState<number | null>(null);

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

  const aiChatMutation = useMutation({
    mutationFn: async (messages: {role: 'user' | 'assistant', content: string}[]) => {
      const res = await apiRequest("POST", "/api/psyop/questions/chat", { messages });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "AI request failed");
      }
      return res.json();
    },
    onSuccess: (data: { reply: string, questions: {factText: string, correctAnswer: string, category?: string}[] }) => {
      setAiMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.questions?.length > 0) {
        setAiGeneratedQuestions(data.questions);
      }
    },
    onError: (error: Error) => {
      toast({ title: error.message || "AI request failed", variant: "destructive" });
    },
  });

  const handleAiSend = () => {
    if (!aiInput.trim()) return;
    const newMessages = [...aiMessages, { role: 'user' as const, content: aiInput }];
    setAiMessages(newMessages);
    setAiInput("");
    setAiGeneratedQuestions([]);
    aiChatMutation.mutate(newMessages);
  };

  const saveAiQuestion = async (q: {factText: string, correctAnswer: string, category?: string}, idx: number) => {
    setSavingQuestionIdx(idx);
    try {
      await createMutation.mutateAsync({
        factText: q.factText,
        correctAnswer: q.correctAnswer,
        category: q.category || selectedCategory || null,
        isActive: true,
      });
      setAiGeneratedQuestions(prev => prev.filter((_, i) => i !== idx));
    } catch (e) {
      // Error handled by mutation
    }
    setSavingQuestionIdx(null);
  };

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

  // Access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page. Admin access is required.
          </p>
          <a href="/" className="text-primary hover:underline">Back to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-psyop-admin">
      <div className="fixed inset-0 bg-gradient-to-br from-violet-300/5 via-transparent to-purple-300/5 pointer-events-none" />
      
      <AppHeader minimal backHref="/" title="PsyOp Admin" />

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
                BlitzGrid
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
                className="relative rounded-none border-b-2 border-primary text-foreground"
                data-testid="tab-psyop"
              >
                <Eye className="w-4 h-4 mr-2" />
                PsyOp
              </Button>
            </Link>
            <Link href="/admin/memenoharm">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-memenoharm"
              >
                <Smile className="w-4 h-4 mr-2" />
                Meme No Harm
              </Button>
            </Link>
            <Link href="/admin/pastforward">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-timewarp"
              >
                <Clock className="w-4 h-4 mr-2" />
                Past Forward
              </Button>
            </Link>
          </nav>
        </div>
      </div>

      <div className="flex flex-1">
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
                <span className="truncate flex-1" title="All Questions">All Questions</span>
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
                    <span className="truncate flex-1" title={cat}>{cat}</span>
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

          {/* AI Assistant */}
          <Collapsible open={showAiChat} onOpenChange={setShowAiChat} className="mb-6">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2 border-purple-500/30 bg-purple-500/10" data-testid="button-ai-assistant">
                <Sparkles className="w-4 h-4 text-purple-400" />
                AI Assistant
                <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showAiChat ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <Card className="border-purple-500/30 bg-purple-500/10">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-400">
                      <Sparkles className="w-5 h-5" />
                      <span className="font-semibold">AI Assistant</span>
                    </div>
                    {aiMessages.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setAiMessages([]); setAiGeneratedQuestions([]); }}
                        className="text-xs text-muted-foreground"
                      >
                        Clear chat
                      </Button>
                    )}
                  </div>
                  
                  {aiMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Tell me what kind of facts you want. Try: "Give me 5 science facts" or "Make some Bollywood trivia"
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2 text-sm">
                      {aiMessages.map((msg, i) => (
                        <div key={i} className={`p-2 rounded ${msg.role === 'user' ? 'bg-purple-500/20 ml-8' : 'bg-muted mr-8'}`}>
                          {msg.content}
                        </div>
                      ))}
                      {aiChatMutation.isPending && (
                        <div className="p-2 rounded bg-muted mr-8 flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Thinking...
                        </div>
                      )}
                    </div>
                  )}

                  {aiGeneratedQuestions.length > 0 && (
                    <div className="space-y-2 border-t border-purple-500/20 pt-3">
                      <p className="text-xs font-medium text-purple-400">Generated Questions (click to save):</p>
                      {aiGeneratedQuestions.map((q, idx) => (
                        <div key={idx} className="p-2 bg-muted rounded border border-border text-sm flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{renderFactWithBlank(q.factText, q.correctAnswer)}</p>
                            {q.category && <p className="text-xs text-muted-foreground mt-1">Category: {q.category}</p>}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => saveAiQuestion(q, idx)}
                            disabled={savingQuestionIdx === idx}
                            className="shrink-0"
                            data-testid={`button-save-ai-question-${idx}`}
                          >
                            {savingQuestionIdx === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask for questions..."
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
                      className="flex-1"
                      data-testid="input-ai-chat"
                    />
                    <Button
                      onClick={handleAiSend}
                      disabled={!aiInput.trim() || aiChatMutation.isPending}
                      className="bg-gradient-to-r from-purple-500 to-violet-500 text-white border-0"
                      data-testid="button-send-ai"
                    >
                      <Sparkles className="w-4 h-4" />
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
                      <Sparkles className="w-5 h-5 text-purple-500 dark:text-purple-400" />
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
                            className="text-destructive"
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

          <GameAnalyticsPanel
            endpoint="/api/psyop/analytics"
            gameName="PsyOp"
            accentColor="text-violet-500"
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </div>
  );
}
