import { useState } from "react";
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
import { Plus, Trash2, Play, Smile, MessageSquare, Grid3X3, Brain, Clock, Loader2, Upload, Sparkles, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MemePrompt } from "@shared/schema";

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
      const res = await apiRequest("DELETE", `/api/memenoharm/prompts/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete prompt");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memenoharm/prompts"] });
      toast({ title: "Prompt deleted!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCreatePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPrompt.trim()) {
      createPromptMutation.mutate(newPrompt.trim());
    }
  };

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    setAiResults([]);
    setAiSelected(new Set());
    try {
      const res = await apiRequest("POST", "/api/memenoharm/prompts/generate", { category: aiCategory, count: aiCount });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate prompts");
      }
      const data = await res.json();
      setAiResults(data.prompts || []);
      setAiSelected(new Set(data.prompts?.map((_: string, i: number) => i) || []));
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAiAddSelected = async () => {
    const selected = aiResults.filter((_, i) => aiSelected.has(i));
    if (selected.length === 0) return;
    setBulkImporting(true);
    let added = 0;
    let failed = 0;
    for (const prompt of selected) {
      try {
        const res = await apiRequest("POST", "/api/memenoharm/prompts", { prompt });
        if (res.ok) added++;
        else failed++;
      } catch {
        failed++;
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/memenoharm/prompts"] });
    setBulkImporting(false);
    if (failed > 0) {
      toast({ title: `Added ${added} prompts, ${failed} failed`, variant: "destructive" });
    } else {
      toast({ title: `${added} prompts added!` });
    }
    setAiResults([]);
    setAiSelected(new Set());
  };

  const toggleAiSelect = (index: number) => {
    setAiSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const [bulkImporting, setBulkImporting] = useState(false);

  const handleBulkImportPrompts = async () => {
    const lines = bulkPrompts.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;
    setBulkImporting(true);
    let added = 0;
    let failed = 0;
    for (const line of lines) {
      try {
        const res = await apiRequest("POST", "/api/memenoharm/prompts", { prompt: line });
        if (res.ok) {
          added++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/memenoharm/prompts"] });
    setBulkImporting(false);
    if (failed > 0) {
      toast({ title: `Added ${added} prompts, ${failed} failed`, variant: "destructive" });
    } else {
      toast({ title: `${added} prompts added!` });
    }
    setBulkPrompts("");
    setShowBulkImport(false);
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
                      disabled={aiGenerating}
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
                            data-testid="button-ai-toggle-all"
                          >
                            {aiSelected.size === aiResults.length ? "Deselect All" : "Select All"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleAiAddSelected}
                            disabled={aiSelected.size === 0 || bulkImporting}
                            data-testid="button-ai-add-selected"
                          >
                            {bulkImporting ? (
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
                            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                              aiSelected.has(i) ? "bg-primary/10 border border-primary/30" : "bg-muted/50"
                            }`}
                            onClick={() => toggleAiSelect(i)}
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
                    data-testid="textarea-bulk-prompts"
                  />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">
                      {bulkPrompts.split("\n").filter(l => l.trim().length > 0).length} prompts ready
                    </span>
                    <Button
                      onClick={handleBulkImportPrompts}
                      disabled={bulkPrompts.split("\n").filter(l => l.trim().length > 0).length === 0 || bulkImporting}
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
                <form onSubmit={handleCreatePrompt} className="flex gap-2 flex-wrap">
                  <Input
                    placeholder="e.g., When your code works on the first try..."
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    className="flex-1"
                    data-testid="input-new-prompt"
                  />
                  <Button 
                    type="submit" 
                    disabled={!newPrompt.trim() || createPromptMutation.isPending}
                    data-testid="button-create-prompt"
                  >
                    Add
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Prompts</CardTitle>
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
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      data-testid={`prompt-item-${prompt.id}`}
                    >
                      <span className="flex-1">{prompt.prompt}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePromptMutation.mutate(prompt.id)}
                        disabled={deletePromptMutation.isPending}
                        data-testid={`button-delete-prompt-${prompt.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
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
