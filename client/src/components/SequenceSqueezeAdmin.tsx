import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, X, ListOrdered, Lightbulb, Check, Upload, ChevronDown, Loader2, Sparkles, Edit, Save, RotateCcw, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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

type KeyedParsedQuestion = ParsedQuestion & { _key: string };

let questionKeyCounter = 0;
const assignKey = (q: ParsedQuestion): KeyedParsedQuestion => ({
  ...q,
  _key: `gen-${++questionKeyCounter}`,
});

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
  
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant' | 'error'; content: string }[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<KeyedParsedQuestion[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editOptionA, setEditOptionA] = useState("");
  const [editOptionB, setEditOptionB] = useState("");
  const [editOptionC, setEditOptionC] = useState("");
  const [editOptionD, setEditOptionD] = useState("");
  const [editHint, setEditHint] = useState("");
  const [editCorrectOrder, setEditCorrectOrder] = useState<string[]>([]);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [createCorrectOrder, setCreateCorrectOrder] = useState<string[]>([]);
  const aiChatEndRef = useRef<HTMLDivElement>(null);

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
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to create question", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ParsedQuestion & { isActive: boolean }> }) => {
      const res = await apiRequest("PATCH", `/api/sequence-squeeze/questions/${id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update question");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequence-squeeze/questions"] });
      toast({ title: "Question updated!" });
      setEditingId(null);
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to update question", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/sequence-squeeze/questions/${id}`, { isActive });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update question");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequence-squeeze/questions"] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to toggle question", variant: "destructive" });
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
    onMutate: (id: number) => {
      setDeletingId(id);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequence-squeeze/questions"] });
      toast({ title: "Question deleted" });
      setDeletingId(null);
      if (editingId === id) {
        setEditingId(null);
      }
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to delete question", variant: "destructive" });
      setDeletingId(null);
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

  const aiChatMutation = useMutation({
    mutationFn: async (data: { messages: { role: 'user' | 'assistant'; content: string }[] }) => {
      const res = await apiRequest("POST", "/api/sequence-squeeze/questions/chat", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate questions");
      }
      return res.json();
    },
    onSuccess: (data: { message: string; questions: ParsedQuestion[] }) => {
      setAiMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      if (data.questions.length > 0) {
        setAiGeneratedQuestions(prev => [...prev, ...data.questions.map(assignKey)]);
      }
    },
    onError: (error: Error) => {
      setAiMessages(prev => [...prev, { role: 'error', content: error.message || "Something went wrong. Try again." }]);
    },
  });

  const getOrderedOptionsFromParsed = (q: ParsedQuestion) => {
    const optionMap: Record<string, string> = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD };
    return q.correctOrder.map(letter => optionMap[letter]);
  };

  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, aiChatMutation.isPending]);

  const [savingQuestionKey, setSavingQuestionKey] = useState<string | null>(null);

  const saveGeneratedQuestion = async (q: KeyedParsedQuestion) => {
    if (savingQuestionKey !== null) return;
    setSavingQuestionKey(q._key);
    try {
      const res = await apiRequest("POST", "/api/sequence-squeeze/questions", {
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOrder: q.correctOrder,
        hint: q.hint,
        isActive: true,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save question");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/sequence-squeeze/questions"] });
      toast({ title: "Question saved!" });
      setAiGeneratedQuestions(prev => prev.filter(item => item._key !== q._key));
    } catch (error: any) {
      toast({ title: error.message || "Failed to save question", variant: "destructive" });
    } finally {
      setSavingQuestionKey(null);
    }
  };

  const handleAiSend = () => {
    if (!aiInput.trim() || aiChatMutation.isPending) return;
    const userMsg = { role: 'user' as const, content: aiInput };
    const updatedMessages = [...aiMessages, userMsg];
    setAiMessages(updatedMessages);
    setAiInput("");
    const apiMessages = updatedMessages
      .filter(m => m.role !== 'error')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    aiChatMutation.mutate({ messages: apiMessages });
  };

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

  const parsedBulkQuestions = useMemo(() => parseBulkImport(bulkImportText), [bulkImportText]);

  const resetForm = () => {
    setShowForm(false);
    clearCreateForm();
  };

  const handleCreateLetterClick = (letter: string) => {
    const lastIdx = createCorrectOrder.length - 1;
    if (createCorrectOrder[lastIdx] === letter) {
      setCreateCorrectOrder(createCorrectOrder.slice(0, lastIdx));
    } else if (!createCorrectOrder.includes(letter) && createCorrectOrder.length < 4) {
      setCreateCorrectOrder([...createCorrectOrder, letter]);
    }
  };

  const handleSubmit = async () => {
    if (createMutation.isPending) return;
    const q = question.trim();
    const o1 = option1.trim();
    const o2 = option2.trim();
    const o3 = option3.trim();
    const o4 = option4.trim();
    if (!q || !o1 || !o2 || !o3 || !o4) {
      toast({ title: "Please fill in the question and all options", variant: "destructive" });
      return;
    }
    if (createCorrectOrder.length !== 4) {
      toast({ title: "Please set the correct order by tapping all 4 letters", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({
        question: q,
        optionA: o1,
        optionB: o2,
        optionC: o3,
        optionD: o4,
        correctOrder: createCorrectOrder,
        hint: hint.trim() || null,
        isActive: true,
      });
      resetForm();
    } catch {
    }
  };

  const startEditing = (q: SequenceQuestion) => {
    setShowForm(false);
    setAiGenerateOpen(false);
    setBulkImportOpen(false);
    setEditingId(q.id);
    setEditQuestion(q.question);
    setEditOptionA(q.optionA);
    setEditOptionB(q.optionB);
    setEditOptionC(q.optionC);
    setEditOptionD(q.optionD);
    setEditHint(q.hint || "");
    setEditCorrectOrder(q.correctOrder as string[]);
  };

  const handleEditSave = () => {
    if (!editingId || updateMutation.isPending) return;
    const q = editQuestion.trim();
    const a = editOptionA.trim();
    const b = editOptionB.trim();
    const c = editOptionC.trim();
    const d = editOptionD.trim();
    if (!q || !a || !b || !c || !d) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (editCorrectOrder.length !== 4) {
      toast({ title: "Please set the correct order (tap all 4 letters)", variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      id: editingId,
      data: {
        question: q,
        optionA: a,
        optionB: b,
        optionC: c,
        optionD: d,
        correctOrder: editCorrectOrder,
        hint: editHint.trim() || null,
      },
    });
  };

  const handleEditLetterClick = (letter: string) => {
    const lastIdx = editCorrectOrder.length - 1;
    if (editCorrectOrder[lastIdx] === letter) {
      setEditCorrectOrder(editCorrectOrder.slice(0, lastIdx));
    } else if (!editCorrectOrder.includes(letter) && editCorrectOrder.length < 4) {
      setEditCorrectOrder([...editCorrectOrder, letter]);
    }
  };

  const getOrderedOptions = (q: SequenceQuestion) => {
    const order = q.correctOrder as string[];
    const optionMap: Record<string, string> = {
      A: q.optionA,
      B: q.optionB,
      C: q.optionC,
      D: q.optionD,
    };
    return order.map((letter, idx) => ({
      position: idx + 1,
      letter,
      text: optionMap[letter],
    }));
  };

  const handleBulkImportOpenChange = (open: boolean) => {
    setBulkImportOpen(open);
    if (open) {
      setShowForm(false);
      setAiGenerateOpen(false);
      setEditingId(null);
    } else {
      setBulkPreviewMode(false);
    }
  };

  const clearCreateForm = () => {
    setQuestion("");
    setOption1("");
    setOption2("");
    setOption3("");
    setOption4("");
    setHint("");
    setCreateCorrectOrder([]);
  };

  const handleToggleCreateForm = () => {
    const next = !showForm;
    setShowForm(next);
    if (next) {
      clearCreateForm();
      setEditingId(null);
      setAiGenerateOpen(false);
      setBulkImportOpen(false);
    }
  };

  const handleToggleAiPanel = () => {
    const next = !aiGenerateOpen;
    setAiGenerateOpen(next);
    if (next) {
      setShowForm(false);
      setEditingId(null);
      setBulkImportOpen(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="section-sequence-squeeze-admin">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-muted-foreground">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleToggleAiPanel}
            variant={aiGenerateOpen ? "outline" : "secondary"}
            data-testid="button-ai-generate"
          >
            {aiGenerateOpen ? <X className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {aiGenerateOpen ? "Cancel" : "AI Generate"}
          </Button>
          <Button
            onClick={handleToggleCreateForm}
            variant={showForm ? "outline" : "default"}
            data-testid="button-toggle-sequence-form"
          >
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? "Cancel" : "New Question"}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {aiGenerateOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-purple-500/30 bg-purple-500/10">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-purple-400">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-semibold">AI Assistant</span>
                  </div>
                  {aiMessages.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => { setAiMessages([]); setAiGeneratedQuestions([]); }}
                      data-testid="button-clear-ai-chat"
                    >
                      Clear chat
                    </Button>
                  )}
                </div>
                
                {aiMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Tell me what kind of questions you want. Try: "Give me 3 questions about movies" or "Make some funny food questions"
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 text-sm">
                    {aiMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded ${
                          msg.role === 'user'
                            ? 'bg-purple-500/20 ml-8'
                            : msg.role === 'error'
                            ? 'bg-destructive/20 text-destructive mr-8'
                            : 'bg-muted mr-8'
                        }`}
                      >
                        {msg.content}
                      </div>
                    ))}
                    {aiChatMutation.isPending && (
                      <div className="p-2 rounded bg-muted mr-8 flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Thinking...
                      </div>
                    )}
                    <div ref={aiChatEndRef} />
                  </div>
                )}

                {aiGeneratedQuestions.length > 0 && (
                  <div className="space-y-2 border-t border-purple-500/20 pt-3">
                    <p className="text-xs font-medium text-purple-400">Generated Questions (click to save):</p>
                    {aiGeneratedQuestions.map((q) => (
                      <div key={q._key} className="p-2 bg-muted rounded border border-border text-sm flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{q.question}</p>
                          <p className="text-xs text-muted-foreground">{getOrderedOptionsFromParsed(q).join(' → ')}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => saveGeneratedQuestion(q)}
                          disabled={savingQuestionKey !== null}
                          className="shrink-0"
                          data-testid={`button-save-ai-question-${q._key}`}
                        >
                          {savingQuestionKey === q._key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
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
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !aiChatMutation.isPending && handleAiSend()}
                    className="flex-1"
                    data-testid="input-ai-chat"
                  />
                  <Button
                    size="icon"
                    onClick={handleAiSend}
                    disabled={!aiInput.trim() || aiChatMutation.isPending}
                    data-testid="button-send-ai"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
                  <Label className="text-sm font-medium mb-3 block">Options</Label>
                  <p className="text-xs text-muted-foreground mb-4">
                    Enter the four options. Players will see them shuffled.
                  </p>
                  <div className="space-y-3">
                    {[
                      { letter: "A", value: option1, setter: setOption1 },
                      { letter: "B", value: option2, setter: setOption2 },
                      { letter: "C", value: option3, setter: setOption3 },
                      { letter: "D", value: option4, setter: setOption4 },
                    ].map(({ letter, value, setter }) => (
                      <div key={letter} className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                          {letter}
                        </span>
                        <Input
                          placeholder={`Option ${letter}`}
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          data-testid={`input-option-${letter}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-sm font-medium">Correct Order (tap in order)</Label>
                    {createCorrectOrder.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCreateCorrectOrder([])}
                        data-testid="create-order-reset"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reset
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2 mb-2">
                    {["A", "B", "C", "D"].map((letter) => {
                      const idx = createCorrectOrder.indexOf(letter);
                      const isLast = idx === createCorrectOrder.length - 1;
                      return (
                        <Button
                          key={letter}
                          type="button"
                          size="icon"
                          variant={idx >= 0 ? "default" : "outline"}
                          onClick={() => handleCreateLetterClick(letter)}
                          disabled={idx >= 0 && !isLast}
                          data-testid={`create-order-${letter}`}
                        >
                          {idx >= 0 ? idx + 1 : letter}
                        </Button>
                      );
                    })}
                  </div>
                  {createCorrectOrder.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Order: {createCorrectOrder.join(" → ")}
                      {createCorrectOrder.length < 4 && " (tap more)"}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Default: A → B → C → D (tap letters above to set custom order)
                    </p>
                  )}
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

      <Collapsible open={bulkImportOpen} onOpenChange={handleBulkImportOpenChange}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between gap-2"
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
                    <Textarea
                      value={bulkImportText}
                      onChange={(e) => setBulkImportText(e.target.value)}
                      placeholder="Planets by distance | Mercury | Venus | Earth | Mars | closest to sun"
                      className="h-32 resize-none font-mono text-sm"
                      data-testid="textarea-bulk-import"
                    />
                    <div className="flex justify-between items-center gap-4 mt-3">
                      <p className="text-xs text-muted-foreground">
                        {parsedBulkQuestions.length} valid question(s)
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setBulkPreviewMode(true)}
                        disabled={parsedBulkQuestions.length === 0}
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
                      {parsedBulkQuestions.map((q, idx) => (
                        <div key={idx} className="px-3 py-2 text-sm" data-testid={`preview-row-${idx}`}>
                          <p className="font-medium truncate">{q.question}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getOrderedOptionsFromParsed(q).join(' → ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkPreviewMode(false)}
                      data-testid="button-cancel-import"
                    >
                      Back to Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (parsedBulkQuestions.length > 0 && !bulkImportMutation.isPending) {
                          bulkImportMutation.mutate(parsedBulkQuestions);
                        }
                      }}
                      disabled={bulkImportMutation.isPending}
                      data-testid="button-confirm-import"
                    >
                      {bulkImportMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Import {parsedBulkQuestions.length}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

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
            <Button onClick={() => { clearCreateForm(); setShowForm(true); setEditingId(null); setAiGenerateOpen(false); setBulkImportOpen(false); }} data-testid="button-create-first-sequence">
              <Plus className="w-4 h-4 mr-2" /> Add Question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {questions.map((q, index) => (
            <Card key={q.id} className="hover-elevate" data-testid={`card-sequence-question-${q.id}`}>
              <CardContent className="p-4">
                {editingId === q.id ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Question</Label>
                      <Textarea
                        value={editQuestion}
                        onChange={(e) => setEditQuestion(e.target.value)}
                        className="mt-1 resize-none"
                        rows={2}
                        data-testid={`edit-question-${q.id}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { letter: "A", value: editOptionA, setter: setEditOptionA },
                        { letter: "B", value: editOptionB, setter: setEditOptionB },
                        { letter: "C", value: editOptionC, setter: setEditOptionC },
                        { letter: "D", value: editOptionD, setter: setEditOptionD },
                      ] as const).map(({ letter, value, setter }) => (
                        <div key={letter}>
                          <Label className="text-xs">Option {letter}</Label>
                          <Input
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            className="mt-1"
                            data-testid={`edit-option-${letter}-${q.id}`}
                          />
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-sm font-medium">Correct Order (tap in order)</Label>
                        {editCorrectOrder.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditCorrectOrder([])}
                            data-testid={`edit-order-reset-${q.id}`}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Reset
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2 mb-2">
                        {["A", "B", "C", "D"].map((letter) => {
                          const idx = editCorrectOrder.indexOf(letter);
                          const isLast = idx === editCorrectOrder.length - 1;
                          return (
                            <Button
                              key={letter}
                              type="button"
                              size="icon"
                              variant={idx >= 0 ? "default" : "outline"}
                              onClick={() => handleEditLetterClick(letter)}
                              disabled={idx >= 0 && !isLast}
                              data-testid={`edit-order-${letter}-${q.id}`}
                            >
                              {idx >= 0 ? idx + 1 : letter}
                            </Button>
                          );
                        })}
                      </div>
                      {editCorrectOrder.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Order: {editCorrectOrder.join(" → ")}
                          {editCorrectOrder.length < 4 && " (tap more)"}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" /> Hint (optional)
                      </Label>
                      <Input
                        value={editHint}
                        onChange={(e) => setEditHint(e.target.value)}
                        className="mt-1"
                        placeholder="A clue for players"
                        data-testid={`edit-hint-${q.id}`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleEditSave}
                        disabled={updateMutation.isPending}
                        data-testid={`button-save-edit-${q.id}`}
                      >
                        {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        data-testid={`button-cancel-edit-${q.id}`}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                      {index + 1}
                    </span>
                    <div className={`flex-1 min-w-0 ${!q.isActive ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="font-medium truncate min-w-0 flex-1">{q.question}</p>
                        {!q.isActive && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                            <EyeOff className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        {getOrderedOptions(q).map(({ position, letter, text }) => (
                          <span key={letter} className="px-2 py-1 rounded bg-muted text-muted-foreground">
                            {position}. {text}
                          </span>
                        ))}
                      </div>
                      {q.hint && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" /> {q.hint}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={q.isActive}
                        onCheckedChange={(checked) => {
                          toggleActiveMutation.mutate({ id: q.id, isActive: checked });
                        }}
                        data-testid={`switch-active-${q.id}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditing(q)}
                        data-testid={`button-edit-sequence-${q.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            disabled={deleteMutation.isPending && deletingId === q.id}
                            data-testid={`button-delete-sequence-${q.id}`}
                          >
                            {deleteMutation.isPending && deletingId === q.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Question</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this question? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-${q.id}`}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(q.id)}
                              className="bg-destructive text-destructive-foreground"
                              data-testid={`button-confirm-delete-${q.id}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
