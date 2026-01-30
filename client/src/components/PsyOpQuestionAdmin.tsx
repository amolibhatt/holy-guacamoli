import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, X, Eye, Sparkles, Lightbulb, Check, Upload, ChevronDown, Loader2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { PsyopQuestion } from "@shared/schema";

type ParsedQuestion = {
  factText: string;
  correctAnswer: string;
  category: string | null;
};

export function PsyOpQuestionAdmin() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [factText, setFactText] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [category, setCategory] = useState("");
  
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [bulkPreviewMode, setBulkPreviewMode] = useState(false);

  const { data: questions = [], isLoading } = useQuery<PsyopQuestion[]>({
    queryKey: ["/api/psyop/questions"],
  });

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
        if (fact && answer && fact.includes('[BLANK]')) {
          parsed.push({
            factText: fact,
            correctAnswer: answer,
            category: cat?.trim() || null,
          });
        }
      }
    }
    return parsed;
  };

  const resetForm = () => {
    setShowForm(false);
    setFactText("");
    setCorrectAnswer("");
    setCategory("");
  };

  const handleSubmit = () => {
    if (!factText) {
      toast({ title: "Please enter the fact text", variant: "destructive" });
      return;
    }
    if (!factText.includes('[BLANK]')) {
      toast({ title: "Fact must contain [BLANK] placeholder", variant: "destructive" });
      return;
    }
    if (!correctAnswer) {
      toast({ title: "Please enter the correct answer", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      factText,
      correctAnswer,
      category: category || null,
      isActive: true,
    });
  };

  const renderFactWithBlank = (text: string, answer?: string) => {
    const parts = text.split('[BLANK]');
    if (parts.length < 2) return text;
    return (
      <span>
        {parts[0]}
        <span className="px-2 py-0.5 mx-1 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400 font-semibold">
          {answer || '______'}
        </span>
        {parts[1]}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="section-psyop-admin">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {questions.length} question{questions.length !== 1 ? 's' : ''} total
        </div>
        <div className="flex flex-wrap gap-2">
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
      </div>

      <Collapsible open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
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
                  <p>Format: <code className="bg-muted px-1 rounded">fact with [BLANK] | answer | category (optional)</code></p>
                  <p>Example: <code className="bg-muted px-1 rounded">The [BLANK] is the largest planet in our solar system | Jupiter | Science</code></p>
                </div>
                <Textarea
                  value={bulkImportText}
                  onChange={(e) => setBulkImportText(e.target.value)}
                  placeholder="The Eiffel Tower is located in [BLANK] | Paris | Geography&#10;A group of [BLANK] is called a pride | lions | Animals"
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

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-purple-500/30">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  New PsyOp Question
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
                    <span className="text-muted-foreground text-xs ml-2">(use [BLANK] for the hidden word)</span>
                  </Label>
                  <Textarea
                    id="fact-text"
                    value={factText}
                    onChange={(e) => setFactText(e.target.value)}
                    placeholder="The [BLANK] is the largest mammal on Earth"
                    rows={3}
                    data-testid="input-fact-text"
                  />
                  {factText && factText.includes('[BLANK]') && (
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

                <div className="space-y-2">
                  <Label htmlFor="category">
                    Category
                    <span className="text-muted-foreground text-xs ml-2">(optional)</span>
                  </Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Animals, Science, History..."
                    data-testid="input-category"
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
                    disabled={createMutation.isPending}
                    data-testid="button-save-question"
                  >
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Check className="w-4 h-4 mr-2" />
                    Save Question
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : questions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Eye className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No questions yet</h3>
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
          {questions.map((q, index) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover-elevate">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="text-sm">
                        {renderFactWithBlank(q.factText, q.correctAnswer)}
                      </div>
                      {q.category && (
                        <div className="text-xs text-muted-foreground">
                          Category: {q.category}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(q.id)}
                      disabled={deleteMutation.isPending}
                      className="shrink-0 text-destructive hover:text-destructive"
                      data-testid={`button-delete-question-${q.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
