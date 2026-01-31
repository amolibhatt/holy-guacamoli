import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, X, ListOrdered, Lightbulb, Check, Upload, ChevronDown, Loader2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { SequenceQuestion } from "@shared/schema";

type ParsedQuestion = {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOrder: string[];
  hint: string | null;
};

export function SequenceSqueezeAdmin() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");
  const [option3, setOption3] = useState("");
  const [option4, setOption4] = useState("");
  const [hint, setHint] = useState("");
  
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [bulkPreviewMode, setBulkPreviewMode] = useState(false);

  const { data: questions = [], isLoading } = useQuery<SequenceQuestion[]>({
    queryKey: ["/api/sequence-squeeze/questions"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      question: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOrder: string[];
      hint: string | null;
      isActive: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/sequence-squeeze/questions", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create question");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequence-squeeze/questions"] });
      toast({ title: "Question created!" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to create question", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/sequence-squeeze/questions/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete question");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequence-squeeze/questions"] });
      toast({ title: "Question deleted" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to delete question", variant: "destructive" });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (questions: ParsedQuestion[]) => {
      const res = await apiRequest("POST", "/api/sequence-squeeze/questions/bulk", { questions });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to import questions");
      }
      return res.json();
    },
    onSuccess: (data: { success: number; errors: string[] }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequence-squeeze/questions"] });
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
      if (parts.length >= 5) {
        const [q, a, b, c, d, hintStr] = parts;
        
        if (q && a && b && c && d) {
          parsed.push({
            question: q,
            optionA: a,
            optionB: b,
            optionC: c,
            optionD: d,
            correctOrder: ["A", "B", "C", "D"],
            hint: hintStr?.trim() || null,
          });
        }
      }
    }
    return parsed;
  };

  const resetForm = () => {
    setShowForm(false);
    setQuestion("");
    setOption1("");
    setOption2("");
    setOption3("");
    setOption4("");
    setHint("");
  };

  const handleSubmit = () => {
    if (!question || !option1 || !option2 || !option3 || !option4) {
      toast({ title: "Please fill in all options", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      question,
      optionA: option1,
      optionB: option2,
      optionC: option3,
      optionD: option4,
      correctOrder: ["A", "B", "C", "D"],
      hint: hint || null,
      isActive: true,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="section-sequence-squeeze-admin">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
          data-testid="button-toggle-sequence-form"
        >
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? "Cancel" : "New Question"}
        </Button>
      </div>

      {/* Add Question Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardContent className="p-6 space-y-5">
                <div>
                  <Label htmlFor="question" className="text-sm font-medium">Question</Label>
                  <Textarea
                    id="question"
                    placeholder="What should players put in order?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="mt-2 resize-none"
                    rows={2}
                    data-testid="input-sequence-question"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">Options (in correct order)</Label>
                  <p className="text-xs text-muted-foreground mb-4">
                    Type options 1st to 4th. Players will see them shuffled.
                  </p>
                  <div className="space-y-3">
                    {[
                      { num: 1, value: option1, setter: setOption1, label: "1st" },
                      { num: 2, value: option2, setter: setOption2, label: "2nd" },
                      { num: 3, value: option3, setter: setOption3, label: "3rd" },
                      { num: 4, value: option4, setter: setOption4, label: "4th" },
                    ].map(({ num, value, setter, label }) => (
                      <div key={num} className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                          {label}
                        </span>
                        <Input
                          placeholder={`Option ${num}`}
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          data-testid={`input-option-${num}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="hint" className="text-sm font-medium flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-muted-foreground" />
                    Hint (optional)
                  </Label>
                  <Input
                    id="hint"
                    placeholder="A clue for players"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    className="mt-2"
                    data-testid="input-hint"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending}
                    data-testid="button-create-sequence-question"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Save Question
                  </Button>
                  <Button variant="ghost" onClick={resetForm} data-testid="button-cancel-sequence">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Import */}
      <Collapsible open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between"
            data-testid="button-toggle-bulk-import"
          >
            <span className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Bulk Import
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${bulkImportOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-3">
            <CardContent className="p-4 space-y-4">
              {!bulkPreviewMode ? (
                <>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Paste questions (one per line)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Format: Question | 1st | 2nd | 3rd | 4th | Hint (optional)
                    </p>
                    <textarea
                      value={bulkImportText}
                      onChange={(e) => setBulkImportText(e.target.value)}
                      placeholder="Planets by distance | Mercury | Venus | Earth | Mars | closest to sun"
                      className="w-full h-32 p-3 text-sm rounded-md border border-input bg-background resize-none font-mono"
                      data-testid="textarea-bulk-import"
                    />
                    <div className="flex justify-between items-center mt-3">
                      <p className="text-xs text-muted-foreground">
                        {parseBulkImport(bulkImportText).length} valid question(s)
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setBulkPreviewMode(true)}
                        disabled={parseBulkImport(bulkImportText).length === 0}
                        data-testid="button-preview-import"
                      >
                        Preview
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="bg-muted px-3 py-2 text-xs font-medium">Preview</div>
                    <div className="max-h-48 overflow-y-auto divide-y">
                      {parseBulkImport(bulkImportText).map((q, idx) => (
                        <div key={idx} className="px-3 py-2 text-sm" data-testid={`preview-row-${idx}`}>
                          <p className="font-medium truncate">{q.question}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {q.optionA} → {q.optionB} → {q.optionC} → {q.optionD}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => { setBulkPreviewMode(false); setBulkImportText(""); }}
                      data-testid="button-cancel-import"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const questions = parseBulkImport(bulkImportText);
                        if (questions.length > 0) {
                          bulkImportMutation.mutate(questions);
                        }
                      }}
                      disabled={bulkImportMutation.isPending}
                      data-testid="button-confirm-import"
                    >
                      {bulkImportMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Import {parseBulkImport(bulkImportText).length}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Questions List */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : questions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ListOrdered className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No questions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first ordering question
            </p>
            <Button onClick={() => setShowForm(true)} data-testid="button-create-first-sequence">
              <Plus className="w-4 h-4 mr-2" /> Add Question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {questions.map((q, index) => (
            <Card key={q.id} className="hover:bg-muted/30 transition-colors" data-testid={`card-sequence-question-${q.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium mb-2">{q.question}</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="px-2 py-1 rounded bg-muted text-muted-foreground">1. {q.optionA}</span>
                      <span className="px-2 py-1 rounded bg-muted text-muted-foreground">2. {q.optionB}</span>
                      <span className="px-2 py-1 rounded bg-muted text-muted-foreground">3. {q.optionC}</span>
                      <span className="px-2 py-1 rounded bg-muted text-muted-foreground">4. {q.optionD}</span>
                    </div>
                    {q.hint && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" /> {q.hint}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteMutation.mutate(q.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-sequence-${q.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
