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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, Grid3X3, ListOrdered, Eye, Plus, Trash2, X, 
  Clock, Image as ImageIcon, Pencil, Play, Smile
} from "lucide-react";
import type { TimeWarpQuestion } from "@shared/schema";

const ERA_COLORS = {
  past: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  present: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  future: "bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30",
};

const ERA_LABELS = {
  past: "Past",
  present: "Present", 
  future: "Future",
};

export default function TimeWarpAdmin() {
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Access denied check - inserted after hooks are called
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<TimeWarpQuestion | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [era, setEra] = useState<"past" | "present" | "future">("present");
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState("");
  const [category, setCategory] = useState("");

  const { data: questions = [], isLoading } = useQuery<TimeWarpQuestion[]>({
    queryKey: ["/api/pastforward/questions"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      imageUrl: string;
      era: string;
      answer: string;
      hint?: string;
      category?: string;
    }) => {
      const res = await apiRequest("POST", "/api/pastforward/questions", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create question");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pastforward/questions"] });
      toast({ title: "Question created!" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to create question", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; imageUrl: string; era: string; answer: string; hint?: string; category?: string }) => {
      const res = await apiRequest("PUT", `/api/pastforward/questions/${data.id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update question");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pastforward/questions"] });
      toast({ title: "Question updated!" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to update question", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/pastforward/questions/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete question");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pastforward/questions"] });
      toast({ title: "Question deleted" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to delete question", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingQuestion(null);
    setImageUrl("");
    setEra("present");
    setAnswer("");
    setHint("");
    setCategory("");
  };

  const startEditing = (question: TimeWarpQuestion) => {
    setEditingQuestion(question);
    setImageUrl(question.imageUrl);
    setEra(question.era as "past" | "present" | "future");
    setAnswer(question.answer);
    setHint(question.hint || "");
    setCategory(question.category || "");
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!imageUrl) {
      toast({ title: "Please enter an image URL", variant: "destructive" });
      return;
    }
    if (!answer) {
      toast({ title: "Please enter the answer", variant: "destructive" });
      return;
    }
    
    if (editingQuestion) {
      updateMutation.mutate({
        id: editingQuestion.id,
        imageUrl,
        era,
        answer,
        hint: hint || undefined,
        category: category || undefined,
      });
    } else {
      createMutation.mutate({
        imageUrl,
        era,
        answer,
        hint: hint || undefined,
        category: category || undefined,
      });
    }
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
    <div className="min-h-screen bg-background" data-testid="page-timewarp-admin">
      <div className="fixed inset-0 bg-gradient-to-br from-orange-300/5 via-transparent to-orange-300/5 pointer-events-none" />
      
      <AppHeader minimal backHref="/" title="Past Forward Admin" />

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
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-psyop"
              >
                <Eye className="w-4 h-4 mr-2" />
                PsyOp
              </Button>
            </Link>
            <Link href="/admin/pastforward">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-primary text-foreground"
                data-testid="tab-timewarp"
              >
                <Clock className="w-4 h-4 mr-2" />
                Past Forward
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
          </nav>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 w-full">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Past Forward Questions</h1>
            <p className="text-muted-foreground text-sm">Create era-filtered image guessing questions</p>
          </div>
          <div className="flex gap-2">
            <Link href="/pastforward/host">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-play-timewarp">
                <Play className="w-4 h-4" />
                Host Game
              </Button>
            </Link>
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

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <Card className="border-amber-500/30">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    {editingQuestion ? 'Edit Question' : 'New Question'}
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
                    <Label htmlFor="image-url">Image URL</Label>
                    <Input
                      id="image-url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      data-testid="input-image-url"
                    />
                    {imageUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden border max-w-xs">
                        <img src={imageUrl} alt="Preview" className="w-full h-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="era">Era</Label>
                      <Select value={era} onValueChange={(v) => setEra(v as "past" | "present" | "future")}>
                        <SelectTrigger data-testid="select-era">
                          <SelectValue placeholder="Select era" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="past">Past (Sepia filter)</SelectItem>
                          <SelectItem value="present">Present (Normal)</SelectItem>
                          <SelectItem value="future">Future (Neon filter)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category (optional)</Label>
                      <Input
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="e.g., Movies, Sports"
                        data-testid="input-category"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="answer">Answer (what players guess)</Label>
                    <Input
                      id="answer"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="e.g., Taj Mahal, Michael Jackson"
                      data-testid="input-answer"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hint">Hint (optional)</Label>
                    <Input
                      id="hint"
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      placeholder="e.g., Famous monument in India"
                      data-testid="input-hint"
                    />
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
                      {editingQuestion ? 'Save Changes' : 'Create Question'}
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
              <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No questions yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Add era-filtered images for players to guess</p>
              <Button onClick={() => setShowForm(true)} data-testid="button-add-first">
                <Plus className="w-4 h-4 mr-2" />
                Add First Question
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {questions.map((q) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="overflow-hidden group">
                  <div className="relative aspect-video bg-muted">
                    <img 
                      src={q.imageUrl} 
                      alt="Question" 
                      className={`w-full h-full object-cover ${
                        q.era === 'past' ? 'sepia' : 
                        q.era === 'future' ? 'hue-rotate-180 saturate-150' : ''
                      }`}
                      onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" dy=".3em">No Image</text></svg>'; }}
                    />
                    <div className="absolute top-2 left-2">
                      <Badge className={ERA_COLORS[q.era as keyof typeof ERA_COLORS]}>
                        {ERA_LABELS[q.era as keyof typeof ERA_LABELS]}
                      </Badge>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={() => startEditing(q)}
                        data-testid={`button-edit-${q.id}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8"
                        onClick={() => deleteMutation.mutate(q.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${q.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium truncate">{q.answer}</p>
                    {q.hint && <p className="text-xs text-muted-foreground truncate">{q.hint}</p>}
                    {q.category && <Badge variant="outline" className="mt-2 text-xs">{q.category}</Badge>}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <GameAnalyticsPanel
          endpoint="/api/pastforward/analytics"
          gameName="Past Forward"
          accentColor="text-amber-500"
          isAuthenticated={isAuthenticated}
        />
      </main>
    </div>
  );
}
