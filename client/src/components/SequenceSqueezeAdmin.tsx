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
import { Plus, Trash2, X, ListOrdered, Sparkles, GripVertical, Lightbulb, Check, Upload, Eye, ChevronDown, Loader2 } from "lucide-react";
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
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOrder, setCorrectOrder] = useState<string[]>([]);
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
    const validLetters = new Set(['A', 'B', 'C', 'D']);
    
    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 6) {
        const [q, a, b, c, d, orderStr, hintStr] = parts;
        const order = orderStr.split(',').map(o => o.trim().toUpperCase());
        
        if (q && a && b && c && d && order.length === 4) {
          const orderSet = new Set(order);
          if (orderSet.size === 4 && order.every(l => validLetters.has(l))) {
            parsed.push({
              question: q,
              optionA: a,
              optionB: b,
              optionC: c,
              optionD: d,
              correctOrder: order,
              hint: hintStr?.trim() || null,
            });
          }
        }
      }
    }
    return parsed;
  };

  const resetForm = () => {
    setShowForm(false);
    setQuestion("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectOrder([]);
    setHint("");
  };

  const handleOrderClick = (letter: string) => {
    if (correctOrder.includes(letter)) {
      setCorrectOrder(correctOrder.filter((l) => l !== letter));
    } else if (correctOrder.length < 4) {
      setCorrectOrder([...correctOrder, letter]);
    }
  };

  const handleSubmit = () => {
    if (!question || !optionA || !optionB || !optionC || !optionD) {
      toast({ title: "Please fill in all options", variant: "destructive" });
      return;
    }
    if (correctOrder.length !== 4) {
      toast({ title: "Please set the correct order for all 4 options", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOrder,
      hint: hint || null,
      isActive: true,
    });
  };

  const getOptionLabel = (letter: string) => {
    switch (letter) {
      case "A": return optionA || "Option A";
      case "B": return optionB || "Option B";
      case "C": return optionC || "Option C";
      case "D": return optionD || "Option D";
      default: return letter;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="section-sequence-squeeze-admin">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <ListOrdered className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Sequence Questions</h2>
            <p className="text-sm text-muted-foreground">{questions.length} questions available</p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "secondary" : "default"}
          className="gap-2"
          data-testid="button-toggle-sequence-form"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "Add Question"}
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-teal-500/30 bg-gradient-to-b from-teal-500/5 to-transparent">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-teal-500" />
                  New Ordering Question
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="question">Question</Label>
                  <Textarea
                    id="question"
                    placeholder="e.g., Arrange these planets from closest to farthest from the Sun"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="mt-1"
                    data-testid="input-sequence-question"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="optionA">Option A</Label>
                    <Input
                      id="optionA"
                      placeholder="First option"
                      value={optionA}
                      onChange={(e) => setOptionA(e.target.value)}
                      className="mt-1"
                      data-testid="input-option-a"
                    />
                  </div>
                  <div>
                    <Label htmlFor="optionB">Option B</Label>
                    <Input
                      id="optionB"
                      placeholder="Second option"
                      value={optionB}
                      onChange={(e) => setOptionB(e.target.value)}
                      className="mt-1"
                      data-testid="input-option-b"
                    />
                  </div>
                  <div>
                    <Label htmlFor="optionC">Option C</Label>
                    <Input
                      id="optionC"
                      placeholder="Third option"
                      value={optionC}
                      onChange={(e) => setOptionC(e.target.value)}
                      className="mt-1"
                      data-testid="input-option-c"
                    />
                  </div>
                  <div>
                    <Label htmlFor="optionD">Option D</Label>
                    <Input
                      id="optionD"
                      placeholder="Fourth option"
                      value={optionD}
                      onChange={(e) => setOptionD(e.target.value)}
                      className="mt-1"
                      data-testid="input-option-d"
                    />
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-teal-500" />
                    Set Correct Order (click options in order)
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Click the options in the correct sequence. Click again to remove.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["A", "B", "C", "D"].map((letter) => {
                      const orderIndex = correctOrder.indexOf(letter);
                      const isSelected = orderIndex !== -1;
                      return (
                        <Button
                          key={letter}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          className={`relative min-w-[120px] justify-start gap-2 ${
                            isSelected ? "bg-teal-600 hover:bg-teal-700" : ""
                          }`}
                          onClick={() => handleOrderClick(letter)}
                          data-testid={`button-order-${letter.toLowerCase()}`}
                        >
                          {isSelected && (
                            <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shadow">
                              {orderIndex + 1}
                            </span>
                          )}
                          <span className="font-bold">{letter}:</span>
                          <span className="truncate text-sm">
                            {getOptionLabel(letter).slice(0, 20)}
                            {getOptionLabel(letter).length > 20 ? "..." : ""}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                  {correctOrder.length === 4 && (
                    <p className="text-sm text-teal-600 mt-2 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Order set: {correctOrder.join(" → ")}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="hint" className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Hint (optional)
                  </Label>
                  <Input
                    id="hint"
                    placeholder="A helpful hint for players"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    className="mt-1"
                    data-testid="input-hint"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 gap-2"
                    data-testid="button-create-sequence-question"
                  >
                    {createMutation.isPending ? (
                      "Creating..."
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Create Question
                      </>
                    )}
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
            className="w-full justify-between h-12 px-4 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border-dashed"
            data-testid="button-toggle-bulk-import"
          >
            <span className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-teal-500" />
              <span className="font-medium">Bulk Import Questions</span>
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${bulkImportOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4"
          >
            <Card className="border-teal-500/30">
              <CardContent className="p-4 space-y-4">
                {!bulkPreviewMode ? (
                  <>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Paste questions (one per line)
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Format: Question | Option A | Option B | Option C | Option D | Order (A,B,C,D) | Hint (optional)
                      </p>
                      <textarea
                        value={bulkImportText}
                        onChange={(e) => setBulkImportText(e.target.value)}
                        placeholder={`Arrange planets by size | Mercury | Venus | Earth | Mars | A,C,B,D | Smallest to largest\nOrder events chronologically | WW1 | WW2 | Moon Landing | Internet | A,B,C,D`}
                        className="w-full h-40 p-3 text-sm rounded-md border border-border bg-background resize-none font-mono"
                        data-testid="textarea-bulk-import"
                      />
                      <div className="flex justify-between items-center mt-3">
                        <p className="text-xs text-muted-foreground">
                          {parseBulkImport(bulkImportText).length} valid question(s) detected
                        </p>
                        <Button
                          onClick={() => setBulkPreviewMode(true)}
                          disabled={parseBulkImport(bulkImportText).length === 0}
                          className="px-6"
                          data-testid="button-preview-import"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview {parseBulkImport(bulkImportText).length} Question(s)
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <div className="bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Preview Import
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/20 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">Question</th>
                              <th className="px-3 py-2 text-left font-medium">Options</th>
                              <th className="px-3 py-2 text-left font-medium">Order</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parseBulkImport(bulkImportText).map((q, idx) => (
                              <tr key={idx} className="border-t border-border hover:bg-muted/30" data-testid={`preview-row-${idx}`}>
                                <td className="px-3 py-2 truncate max-w-[200px]" title={q.question}>{q.question}</td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">
                                  A: {q.optionA.slice(0, 15)}{q.optionA.length > 15 ? '...' : ''}
                                </td>
                                <td className="px-3 py-2 font-mono text-teal-600 text-xs">{q.correctOrder.join('→')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <p className="text-sm text-muted-foreground">
                        {parseBulkImport(bulkImportText).length} question(s) will be added
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          onClick={() => { setBulkPreviewMode(false); setBulkImportText(""); }}
                          data-testid="button-cancel-import"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            const questions = parseBulkImport(bulkImportText);
                            if (questions.length > 0) {
                              bulkImportMutation.mutate(questions);
                            }
                          }}
                          disabled={bulkImportMutation.isPending}
                          className="px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                          data-testid="button-confirm-import"
                        >
                          {bulkImportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                          Confirm Import
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground mt-2">Loading questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center mx-auto mb-4">
              <ListOrdered className="w-8 h-8 text-teal-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Questions Yet</h3>
            <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
              Create your first ordering question to start playing Sequence Squeeze!
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 gap-2"
              data-testid="button-create-first-sequence"
            >
              <Plus className="w-4 h-4" /> Create First Question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {questions.map((q, index) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover-elevate transition-all" data-testid={`card-sequence-question-${q.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400/20 to-teal-500/20 flex items-center justify-center shrink-0">
                        <span className="text-lg font-bold text-teal-600">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground mb-2">{q.question}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-muted-foreground">A:</span>
                            <span className="text-foreground truncate">{q.optionA}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-muted-foreground">B:</span>
                            <span className="text-foreground truncate">{q.optionB}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-muted-foreground">C:</span>
                            <span className="text-foreground truncate">{q.optionC}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-muted-foreground">D:</span>
                            <span className="text-foreground truncate">{q.optionD}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-4">
                          <span className="text-xs text-teal-600 font-medium">
                            Order: {(q.correctOrder as string[]).join(" → ")}
                          </span>
                          {q.hint && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <Lightbulb className="w-3 h-3" /> {q.hint}
                            </span>
                          )}
                        </div>
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
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
