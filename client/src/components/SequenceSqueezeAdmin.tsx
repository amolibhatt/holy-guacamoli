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
import { Plus, Trash2, X, ListOrdered, Lightbulb, Check, Upload, ChevronDown, Loader2, Sparkles, Edit, Save } from "lucide-react";
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
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<ParsedQuestion[]>([]);
  const [savingQuestionIdx, setSavingQuestionIdx] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editOptionA, setEditOptionA] = useState("");
  const [editOptionB, setEditOptionB] = useState("");
  const [editOptionC, setEditOptionC] = useState("");
  const [editOptionD, setEditOptionD] = useState("");
  const [editHint, setEditHint] = useState("");
  const [editCorrectOrder, setEditCorrectOrder] = useState<string[]>([]);

  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      setDeletingId(id);
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
      setDeletingId(null);
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
        setAiGeneratedQuestions(data.questions);
      }
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to generate", variant: "destructive" });
    },
  });

  const saveGeneratedQuestion = async (q: ParsedQuestion, idx: number) => {
    setSavingQuestionIdx(idx);
    try {
      await createMutation.mutateAsync({
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOrder: q.correctOrder,
        hint: q.hint,
        isActive: true,
      });
      setAiGeneratedQuestions(prev => prev.filter((_, i) => i !== idx));
    } finally {
      setSavingQuestionIdx(null);
    }
  };

  const handleAiSend = () => {
    if (!aiInput.trim() || aiChatMutation.isPending) return;
    const newMessages = [...aiMessages, { role: 'user' as const, content: aiInput }];
    setAiMessages(newMessages);
    setAiInput("");
    aiChatMutation.mutate({ messages: newMessages });
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

  const startEditing = (q: SequenceQuestion) => {
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
    if (!editingId) return;
    if (!editQuestion || !editOptionA || !editOptionB || !editOptionC || !editOptionD) {
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
        question: editQuestion,
        optionA: editOptionA,
        optionB: editOptionB,
        optionC: editOptionC,
        optionD: editOptionD,
        correctOrder: editCorrectOrder,
        hint: editHint || null,
      },
    });
  };

  const handleEditLetterClick = (letter: string) => {
    if (editCorrectOrder.includes(letter)) {
      setEditCorrectOrder(editCorrectOrder.filter(l => l !== letter));
    } else if (editCorrectOrder.length < 4) {
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

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="section-sequence-squeeze-admin">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-muted-foreground">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAiGenerateOpen(!aiGenerateOpen)}
            variant={aiGenerateOpen ? "outline" : "secondary"}
            data-testid="button-ai-generate"
          >
            {aiGenerateOpen ? <X className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {aiGenerateOpen ? "Cancel" : "AI Generate"}
          </Button>
          <Button
            onClick={() => setShowForm(!showForm)}
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
                      className="text-xs text-muted-foreground"
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
                          <p className="font-medium truncate">{q.question}</p>
                          <p className="text-xs text-muted-foreground">{q.optionA} → {q.optionB} → {q.optionC} → {q.optionD}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => saveGeneratedQuestion(q, idx)}
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
                    onKeyDown={(e) => e.key === 'Enter' && !aiChatMutation.isPending && handleAiSend()}
                    className="flex-1"
                    data-testid="input-ai-chat"
                  />
                  <Button
                    onClick={handleAiSend}
                    disabled={!aiInput.trim() || aiChatMutation.isPending}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
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
                    <div className="flex justify-between items-center gap-4 mt-3">
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
                      onClick={() => setBulkPreviewMode(false)}
                      data-testid="button-cancel-import"
                    >
                      Back to Edit
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
                      <Label className="text-sm font-medium mb-1.5 block">Correct Order (tap in order)</Label>
                      <div className="flex gap-2 mb-2">
                        {["A", "B", "C", "D"].map((letter) => {
                          const idx = editCorrectOrder.indexOf(letter);
                          return (
                            <Button
                              key={letter}
                              type="button"
                              variant={idx >= 0 ? "default" : "outline"}
                              className="w-10 h-10"
                              onClick={() => handleEditLetterClick(letter)}
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
                    <div className="flex-1 min-w-0">
                      <p className="font-medium mb-2">{q.question}</p>
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
