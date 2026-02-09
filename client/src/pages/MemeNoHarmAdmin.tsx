import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Link, useLocation } from "wouter";
import { Plus, Trash2, Play, Smile, Grid3X3, Brain, Clock, Loader2, Upload, Sparkles, Check, Pencil, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MemePrompt } from "@shared/schema";

const MAX_PROMPT_LENGTH = 200;

export default function MemeNoHarmAdmin() {
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [newPrompt, setNewPrompt] = useState("");
  const [bulkPrompts, setBulkPrompts] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [aiCategory, setAiCategory] = useState("mixed");
  const [aiCount, setAiCount] = useState(10);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResults, setAiResults] = useState<string[]>([]);
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set());
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [aiImporting, setAiImporting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const { data: prompts = [], isLoading: promptsLoading } = useQuery<MemePrompt[]>({
    queryKey: ["/api/memenoharm/prompts"],
  });

  const createPromptMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await apiRequest("POST", "/api/memenoharm/prompts", { prompt });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create prompt");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memenoharm/prompts"] });
      toast({ title: "Prompt created!" });
      setNewPrompt("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePromptMutation = useMutation({
    mutationFn: async (id: number) => {
      setDeletingIds(prev => new Set(prev).add(id));
      const res = await apiRequest("DELETE", `/api/memenoharm/prompts/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete prompt");
      }
      return { id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/memenoharm/prompts"] });
      toast({ title: "Prompt deleted!" });
      setDeletingIds(prev => { const next = new Set(prev); next.delete(data.id); return next; });
      if (editingId === data.id) {
        setEditingId(null);
        setEditText("");
      }
    },
    onError: (error: Error, id: number) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setDeletingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    },
  });

  const updatePromptMutation = useMutation({
    mutationFn: async ({ id, prompt }: { id: number; prompt: string }) => {
      const res = await apiRequest("PUT", `/api/memenoharm/prompts/${id}`, { prompt });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update prompt");
      }
      const data = await res.json();
      return { ...data, _mutatedId: id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/memenoharm/prompts"] });
      toast({ title: "Prompt updated!" });
      if (editingId === data._mutatedId) {
        setEditingId(null);
        setEditText("");
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCreatePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (createPromptMutation.isPending) return;
    const trimmed = newPrompt.trim();
    if (trimmed && trimmed.length <= MAX_PROMPT_LENGTH) {
      createPromptMutation.mutate(trimmed);
    }
  };

  const handleStartEdit = (prompt: MemePrompt) => {
    if (updatePromptMutation.isPending) return;
    setEditingId(prompt.id);
    setEditText(prompt.prompt);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleSaveEdit = () => {
    if (editingId === null) return;
    const trimmed = editText.trim();
    if (!trimmed || trimmed.length > MAX_PROMPT_LENGTH) return;
    const original = prompts.find(p => p.id === editingId);
    if (original && original.prompt === trimmed) {
      setEditingId(null);
      setEditText("");
      return;
    }
    updatePromptMutation.mutate({ id: editingId, prompt: trimmed });
  };

  const aiRequestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleAiGenerate = async () => {
    if (aiGenerating) return;
    const requestId = ++aiRequestIdRef.current;
    setAiGenerating(true);
    setAiResults([]);
    setAiSelected(new Set());
    try {
      const res = await apiRequest("POST", "/api/memenoharm/prompts/generate", { category: aiCategory, count: aiCount });
      if (!mountedRef.current || requestId !== aiRequestIdRef.current) return;
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate prompts");
      }
      const data = await res.json();
      if (!mountedRef.current || requestId !== aiRequestIdRef.current) return;
      setAiResults(data.prompts || []);
      setAiSelected(new Set(data.prompts?.map((_: string, i: number) => i) || []));
    } catch (error: any) {
      if (!mountedRef.current || requestId !== aiRequestIdRef.current) return;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      if (mountedRef.current && requestId === aiRequestIdRef.current) {
        setAiGenerating(false);
      }
    }
  };

  const handleAiAddSelected = async () => {
    const selected = aiResults.filter((_, i) => aiSelected.has(i));
    if (selected.length === 0 || aiImporting) return;
    setAiImporting(true);
    let added = 0;
    let skipped = 0;
    let failed = 0;
    const failedIndices: number[] = [];
    try {
      for (let idx = 0; idx < aiResults.length; idx++) {
        if (!aiSelected.has(idx)) continue;
        if (!mountedRef.current) return;
        const prompt = aiResults[idx];
        try {
          const res = await apiRequest("POST", "/api/memenoharm/prompts", { prompt });
          if (res.ok) {
            added++;
          } else {
            await res.json().catch(() => ({}));
            if (res.status === 409) skipped++;
            else { failed++; failedIndices.push(idx); }
          }
        } catch {
          failed++;
          failedIndices.push(idx);
        }
      }
      if (!mountedRef.current) return;
      queryClient.invalidateQueries({ queryKey: ["/api/memenoharm/prompts"] });
      const parts: string[] = [];
      if (added > 0) parts.push(`${added} added`);
      if (skipped > 0) parts.push(`${skipped} duplicates skipped`);
      if (failed > 0) parts.push(`${failed} failed`);
      toast({
        title: parts.join(", "),
        variant: failed > 0 ? "destructive" : undefined,
      });
      if (failed > 0 && added === 0 && skipped === 0) {
        setAiSelected(new Set(failedIndices));
      } else {
        setAiResults([]);
        setAiSelected(new Set());
      }
    } finally {
      if (mountedRef.current) setAiImporting(false);
    }
  };

  const toggleAiSelect = (index: number) => {
    setAiSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleBulkImportPrompts = async () => {
    if (bulkImporting) return;
    const lines = bulkPrompts.split("\n").map(l => l.trim()).filter(l => l.length > 0 && l.length <= MAX_PROMPT_LENGTH);
    if (lines.length === 0) return;
    setBulkImporting(true);
    let added = 0;
    let skipped = 0;
    let failed = 0;
    try {
      for (const line of lines) {
        if (!mountedRef.current) return;
        try {
          const res = await apiRequest("POST", "/api/memenoharm/prompts", { prompt: line });
          if (res.ok) {
            added++;
          } else {
            await res.json().catch(() => ({}));
            if (res.status === 409) skipped++;
            else failed++;
          }
        } catch {
          failed++;
        }
      }
      if (!mountedRef.current) return;
      queryClient.invalidateQueries({ queryKey: ["/api/memenoharm/prompts"] });
      const parts: string[] = [];
      if (added > 0) parts.push(`${added} added`);
      if (skipped > 0) parts.push(`${skipped} duplicates skipped`);
      if (failed > 0) parts.push(`${failed} failed`);
      toast({
        title: parts.join(", "),
        variant: failed > 0 ? "destructive" : undefined,
      });
      if (failed > 0 && added === 0 && skipped === 0) {
        // keep textarea content for retry
      } else {
        setBulkPrompts("");
        setShowBulkImport(false);
      }
    } finally {
      if (mountedRef.current) setBulkImporting(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthLoading, isAuthenticated, setLocation]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

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
    <div className="min-h-screen bg-background" data-testid="page-memenoharm-admin">
      <div className="fixed inset-0 bg-gradient-to-br from-green-300/5 via-transparent to-green-300/5 pointer-events-none" />
      
      <AppHeader minimal backHref="/" title="Meme No Harm Admin" />

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
                data-testid="tab-sortcircuit"
              >
                <span className="w-4 h-4 mr-2 font-bold text-xs">ABC</span>
                Sort Circuit
              </Button>
            </Link>
            <Link href="/admin/psyop">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-psyop"
              >
                <Brain className="w-4 h-4 mr-2" />
                PsyOp
              </Button>
            </Link>
            <Link href="/admin/pastforward">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-pastforward"
              >
                <Clock className="w-4 h-4 mr-2" />
                Past Forward
              </Button>
            </Link>
            <Link href="/admin/memenoharm">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-primary text-foreground"
                data-testid="tab-memenoharm"
              >
                <Smile className="w-4 h-4 mr-2" />
                Meme No Harm
              </Button>
            </Link>
          </nav>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 w-full relative z-10">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Meme No Harm</h1>
            <p className="text-muted-foreground text-sm">Create prompts for your games</p>
          </div>
          <div className="flex gap-2">
            <Link href="/memenoharm/host">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-play-memenoharm">
                <Play className="w-4 h-4" />
                Host Game
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI Prompt Generator
                </span>
                <Button
                  variant={showAiGenerator ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAiGenerator(!showAiGenerator)}
                  disabled={aiGenerating || aiImporting}
                  className="gap-2"
                  data-testid="button-toggle-ai-generator"
                >
                  <Sparkles className="w-4 h-4" />
                  {showAiGenerator ? "Hide" : "Generate Prompts"}
                </Button>
              </CardTitle>
            </CardHeader>
            {showAiGenerator && (
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3 flex-wrap items-end">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Category</label>
                      <Select value={aiCategory} onValueChange={setAiCategory}>
                        <SelectTrigger data-testid="select-ai-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mixed">Mixed (All Categories)</SelectItem>
                          <SelectItem value="work">Work & Corporate</SelectItem>
                          <SelectItem value="dating">Dating & Relationships</SelectItem>
                          <SelectItem value="history">History</SelectItem>
                          <SelectItem value="pop_culture">Pop Culture</SelectItem>
                          <SelectItem value="family">Family</SelectItem>
                          <SelectItem value="school">School & Education</SelectItem>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="existential">Existential & Philosophy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Count</label>
                      <Select value={String(aiCount)} onValueChange={(v) => setAiCount(Number(v))}>
                        <SelectTrigger data-testid="select-ai-count">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleAiGenerate}
                      disabled={aiGenerating || aiImporting}
                      data-testid="button-ai-generate"
                    >
                      {aiGenerating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      {aiGenerating ? "Generating..." : "Generate"}
                    </Button>
                  </div>

                  {aiResults.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          {aiSelected.size} of {aiResults.length} selected
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAiSelected(aiSelected.size === aiResults.length ? new Set() : new Set(aiResults.map((_, i) => i)))}
                            disabled={aiImporting}
                            data-testid="button-ai-toggle-all"
                          >
                            {aiSelected.size === aiResults.length ? "Deselect All" : "Select All"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleAiAddSelected}
                            disabled={aiSelected.size === 0 || aiImporting}
                            data-testid="button-ai-add-selected"
                          >
                            {aiImporting ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4 mr-2" />
                            )}
                            Add {aiSelected.size} Prompts
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                        {aiResults.map((prompt, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                              aiImporting ? "opacity-60" : "cursor-pointer"
                            } ${
                              aiSelected.has(i) ? "bg-primary/10 border border-primary/30" : "bg-muted/50"
                            }`}
                            onClick={() => !aiImporting && toggleAiSelect(i)}
                            data-testid={`ai-prompt-${i}`}
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                              aiSelected.has(i) ? "bg-primary text-primary-foreground" : "border border-muted-foreground/30"
                            }`}>
                              {aiSelected.has(i) && <Check className="w-3 h-3" />}
                            </div>
                            <span className="text-sm flex-1">{prompt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                <span className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Prompt
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkImport(!showBulkImport)}
                  disabled={bulkImporting}
                  className="gap-2"
                  data-testid="button-toggle-bulk-import"
                >
                  <Upload className="w-4 h-4" />
                  {showBulkImport ? "Single Add" : "Bulk Import"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showBulkImport ? (
                <div className="space-y-4">
                  <Textarea
                    placeholder={"Paste one prompt per line, e.g.:\nWhen your code works on the first try...\nThat feeling when the WiFi goes out...\nMonday mornings be like..."}
                    value={bulkPrompts}
                    onChange={(e) => setBulkPrompts(e.target.value)}
                    rows={8}
                    disabled={bulkImporting}
                    data-testid="textarea-bulk-prompts"
                  />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {(() => {
                      const allLines = bulkPrompts.split("\n").filter(l => l.trim().length > 0);
                      const validLines = allLines.filter(l => l.trim().length <= MAX_PROMPT_LENGTH);
                      const tooLong = allLines.length - validLines.length;
                      return (
                        <span className="text-sm text-muted-foreground">
                          {validLines.length} prompt{validLines.length !== 1 ? 's' : ''} ready
                          {tooLong > 0 && <span className="text-destructive ml-1">({tooLong} too long, max {MAX_PROMPT_LENGTH} chars)</span>}
                        </span>
                      );
                    })()}
                    <Button
                      onClick={handleBulkImportPrompts}
                      disabled={bulkPrompts.split("\n").filter(l => l.trim().length > 0 && l.trim().length <= MAX_PROMPT_LENGTH).length === 0 || bulkImporting}
                      data-testid="button-bulk-import-prompts"
                    >
                      {bulkImporting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Import All
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreatePrompt} className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <Input
                      placeholder="e.g., When your code works on the first try..."
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      maxLength={MAX_PROMPT_LENGTH}
                      className="flex-1"
                      data-testid="input-new-prompt"
                    />
                    <Button 
                      type="submit" 
                      disabled={!newPrompt.trim() || newPrompt.trim().length > MAX_PROMPT_LENGTH || createPromptMutation.isPending}
                      data-testid="button-create-prompt"
                    >
                      {createPromptMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Add
                    </Button>
                  </div>
                  {newPrompt.length > 0 && (
                    <p className={`text-xs ${newPrompt.length > MAX_PROMPT_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {newPrompt.length}/{MAX_PROMPT_LENGTH} characters
                    </p>
                  )}
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                <span>Your Prompts</span>
                {!promptsLoading && (
                  <span className="text-sm font-normal text-muted-foreground" data-testid="text-prompt-count">
                    {prompts.length} prompt{prompts.length !== 1 ? 's' : ''}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {promptsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : prompts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No prompts yet. Add your first one above!
                </p>
              ) : (
                <div className="space-y-2">
                  {prompts.map((prompt) => (
                    <div 
                      key={prompt.id} 
                      className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg"
                      data-testid={`prompt-item-${prompt.id}`}
                    >
                      {editingId === prompt.id ? (
                        <div className="flex-1 space-y-1">
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            maxLength={MAX_PROMPT_LENGTH}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !updatePromptMutation.isPending) handleSaveEdit();
                              if (e.key === "Escape" && !updatePromptMutation.isPending) handleCancelEdit();
                            }}
                            data-testid={`input-edit-prompt-${prompt.id}`}
                          />
                          <p className={`text-xs ${editText.length > MAX_PROMPT_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {editText.length}/{MAX_PROMPT_LENGTH}
                          </p>
                        </div>
                      ) : (
                        <span className="flex-1">{prompt.prompt}</span>
                      )}
                      <div className="flex gap-1 shrink-0">
                        {editingId === prompt.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleSaveEdit}
                              disabled={!editText.trim() || editText.trim().length > MAX_PROMPT_LENGTH || updatePromptMutation.isPending}
                              data-testid={`button-save-prompt-${prompt.id}`}
                            >
                              {updatePromptMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4 text-green-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleCancelEdit}
                              disabled={updatePromptMutation.isPending}
                              data-testid={`button-cancel-edit-${prompt.id}`}
                            >
                              <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartEdit(prompt)}
                              disabled={deletingIds.has(prompt.id) || updatePromptMutation.isPending}
                              data-testid={`button-edit-prompt-${prompt.id}`}
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePromptMutation.mutate(prompt.id)}
                              disabled={deletingIds.has(prompt.id)}
                              data-testid={`button-delete-prompt-${prompt.id}`}
                            >
                              {deletingIds.has(prompt.id) ? (
                                <Loader2 className="w-4 h-4 animate-spin text-destructive" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-destructive" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
