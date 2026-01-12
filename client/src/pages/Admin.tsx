import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, FolderPlus, HelpCircle, ArrowLeft, Loader2, Pencil, X, Check, Image, Music, Grid3X3, Link2, Unlink, ChevronRight, ArrowUp, ArrowDown, CheckCircle, ChevronDown, GripVertical, Sparkles, LogOut, Sun, Moon, Layers, Upload, FileText, Eye, BarChart2, Users, Activity, Heart, Gamepad2, ListOrdered } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import MDEditor from '@uiw/react-md-editor';
import { useAuth } from "@/hooks/use-auth";
import { ThemeName, THEMES, useTheme } from "@/context/ThemeContext";
import { AppHeader } from "@/components/AppHeader";
import type { Category, Question, Board, BoardCategoryWithCount } from "@shared/schema";
import { SequenceSqueezeAdmin } from "@/components/SequenceSqueezeAdmin";
import { useUpload } from "@/hooks/use-upload";

const THEME_LABELS: Record<ThemeName, string> = {
  birthday: 'Birthday',
  holiday: 'Holiday',
  sports: 'Sports',
  ocean: 'Ocean',
  neon: 'Neon',
  football: 'Football',
};

const ALL_POINT_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function Admin() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const { colorMode, toggleColorMode, setTheme } = useTheme();
  const [, setLocation] = useLocation();
  
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [selectedBoardCategoryId, setSelectedBoardCategoryId] = useState<number | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardPoints, setNewBoardPoints] = useState<number[]>([10, 20, 30, 40, 50]);
  const [showNewBoardForm, setShowNewBoardForm] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryImageUrl, setNewCategoryImageUrl] = useState("");
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const categoryImageInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadFile: uploadCategoryImage, isUploading: isUploadingCategoryImage } = useUpload({
    onSuccess: (response) => {
      setNewCategoryImageUrl(response.objectPath);
      toast({ title: "Image uploaded", description: "Category image ready to use" });
    },
    onError: (error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
  const [editBoardName, setEditBoardName] = useState("");

  const [newQuestion, setNewQuestion] = useState("");
  const [newCorrectAnswer, setNewCorrectAnswer] = useState("");
  const [newPoints, setNewPoints] = useState<number>(10);

  const [editQuestion, setEditQuestion] = useState("");
  const [editCorrectAnswer, setEditCorrectAnswer] = useState("");
  const [editPoints, setEditPoints] = useState<number>(10);

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryDescription, setEditCategoryDescription] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [questionFormOpen, setQuestionFormOpen] = useState(false);
  const [draggedQuestionId, setDraggedQuestionId] = useState<number | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [bulkPreviewMode, setBulkPreviewMode] = useState(false);
  const [showBoardPreview, setShowBoardPreview] = useState(false);
  const [adminTab, setAdminTab] = useState<"content" | "analytics">("content");
  const [selectedGameType, setSelectedGameType] = useState<"buzzkill" | "double_dip" | "sequence_squeeze" | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const editAudioInputRef = useRef<HTMLInputElement>(null);

  const { data: boards = [], isLoading: loadingBoards } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
    enabled: isAuthenticated,
  });

  type BoardSummary = { id: number; name: string; categoryCount: number; categories: { id: number; name: string; questionCount: number; remaining: number }[] };
  const { data: boardSummaries = [] } = useQuery<BoardSummary[]>({
    queryKey: ['/api/boards/summary'],
    enabled: isAuthenticated,
  });

  const { data: allCategories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: isAuthenticated,
  });

  const selectedBoard = boards.find(b => b.id === selectedBoardId);
  const currentPointValues = selectedBoard?.pointValues || ALL_POINT_VALUES;

  const { data: boardCategories = [], isLoading: loadingBoardCategories } = useQuery<BoardCategoryWithCount[]>({
    queryKey: ['/api/boards', selectedBoardId, 'categories'],
    enabled: !!selectedBoardId && isAuthenticated,
  });

  const linkedCategoryIds = boardCategories.map(bc => bc.categoryId);
  const unlinkedCategories = allCategories.filter(c => !linkedCategoryIds.includes(c.id));

  const selectedBoardCategory = boardCategories.find(bc => bc.id === selectedBoardCategoryId);

  const { data: questions = [], isLoading: loadingQuestions } = useQuery<Question[]>({
    queryKey: ['/api/board-categories', selectedBoardCategoryId, 'questions'],
    enabled: !!selectedBoardCategoryId && isAuthenticated,
  });

  type HostAnalytics = { totalSessions: number; totalPlayers: number; activeSessions: number };
  const { data: hostAnalytics, isLoading: loadingAnalytics } = useQuery<HostAnalytics>({
    queryKey: ['/api/host/analytics'],
    enabled: isAuthenticated && adminTab === 'analytics',
  });

  type SessionWithPlayers = { id: number; code: string; hostId: string; gameId: number | null; currentBoardId: number | null; state: string; createdAt: string; players: { playerId: string; name: string; score: number }[] };
  const { data: hostSessions = [], isLoading: loadingSessions } = useQuery<SessionWithPlayers[]>({
    queryKey: ['/api/host/sessions'],
    enabled: isAuthenticated && adminTab === 'analytics',
  });

  const usedPoints = questions.map(q => q.points);
  const availablePoints = currentPointValues.filter(pt => !usedPoints.includes(pt));

  // Redirect to home (landing page) if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (availablePoints.length > 0 && !availablePoints.includes(newPoints)) {
      setNewPoints(availablePoints[0]);
    }
  }, [availablePoints, newPoints]);
  
  // Show loading while checking auth
  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground mt-4">Loading...</p>
      </div>
    );
  }

  const createBoardMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; pointValues: number[] }) => {
      return apiRequest('POST', '/api/boards', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      setNewBoardName("");
      setNewBoardPoints([10, 20, 30, 40, 50]);
      setShowNewBoardForm(false);
      toast({ title: "Board created!" });
    },
    onError: () => {
      toast({ title: "Couldn't create board", description: "Please try again.", variant: "destructive" });
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/boards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      if (selectedBoardId) {
        setSelectedBoardId(null);
        setSelectedBoardCategoryId(null);
      }
      toast({ title: "Board deleted" });
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: async ({ id, name, theme }: { id: number; name?: string; theme?: string }) => {
      return apiRequest('PUT', `/api/boards/${id}`, { name, theme });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      setEditingBoardId(null);
      toast({ title: "Board updated!" });
    },
    onError: () => {
      toast({ title: "Couldn't update board", description: "Please try again.", variant: "destructive" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; imageUrl: string }) => {
      return apiRequest('POST', '/api/categories', data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setNewCategoryName("");
      setShowNewCategoryForm(false);
      toast({ title: "Category created!" });
    },
    onError: () => {
      toast({ title: "Couldn't create category", description: "Please try again.", variant: "destructive" });
    },
  });

  const createAndLinkCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; imageUrl?: string; boardId: number }) => {
      const res = await apiRequest('POST', `/api/boards/${data.boardId}/categories/create-and-link`, { name: data.name, description: data.description, imageUrl: data.imageUrl });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create category");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setNewCategoryImageUrl("");
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowNewCategoryForm(false);
      toast({ title: "Category created and linked!" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to create category", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: number; name: string; description: string }) => {
      return apiRequest('PUT', `/api/categories/${id}`, { name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      setEditingCategoryId(null);
      setEditCategoryDescription("");
      toast({ title: "Category updated!" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      toast({ title: "Category deleted" });
    },
  });

  const linkCategoryMutation = useMutation({
    mutationFn: async ({ boardId, categoryId }: { boardId: number; categoryId: number }) => {
      return apiRequest('POST', `/api/boards/${boardId}/categories`, { categoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      toast({ title: "Category linked!" });
    },
    onError: () => {
      toast({ title: "Couldn't link category", description: "Please try again.", variant: "destructive" });
    },
  });

  const unlinkCategoryMutation = useMutation({
    mutationFn: async (boardCategoryId: number) => {
      return apiRequest('DELETE', `/api/board-categories/${boardCategoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      if (selectedBoardCategoryId) {
        setSelectedBoardCategoryId(null);
      }
      toast({ title: "Category unlinked" });
    },
  });

  const reorderCategoriesMutation = useMutation({
    mutationFn: async ({ boardId, orderedIds }: { boardId: number; orderedIds: number[] }) => {
      return apiRequest('PUT', `/api/boards/${boardId}/categories/reorder`, { orderedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
    },
  });

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    if (!selectedBoardId) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= boardCategories.length) return;
    
    const newOrder = [...boardCategories];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    const orderedIds = newOrder.map(bc => bc.id);
    reorderCategoriesMutation.mutate({ boardId: selectedBoardId, orderedIds });
  };

  const createQuestionMutation = useMutation({
    mutationFn: async (data: { boardCategoryId: number; question: string; options: string[]; correctAnswer: string; points: number }) => {
      return apiRequest('POST', '/api/questions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/board-categories', selectedBoardCategoryId, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      setNewQuestion("");
      setNewCorrectAnswer("");
      setNewPoints(currentPointValues[0] || 10);
      toast({ title: "Question added!" });
    },
    onError: () => {
      toast({ title: "Couldn't add question", description: "Please try again.", variant: "destructive" });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; question?: string; correctAnswer?: string; points?: number }) => {
      return apiRequest('PUT', `/api/questions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/board-categories', selectedBoardCategoryId, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      setEditingQuestionId(null);
      toast({ title: "Question updated!" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/board-categories', selectedBoardCategoryId, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      toast({ title: "Question deleted" });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (data: { boardCategoryId: number; questions: Array<{ question: string; correctAnswer: string; points: number }> }) => {
      const res = await apiRequest('POST', `/api/board-categories/${data.boardCategoryId}/questions/bulk`, { questions: data.questions });
      return res.json();
    },
    onSuccess: (data: { success: number; errors: string[] }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/board-categories', selectedBoardCategoryId, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      setBulkImportText("");
      setBulkImportOpen(false);
      setBulkPreviewMode(false);
      if (data.errors.length > 0) {
        toast({ 
          title: `Imported ${data.success} question(s)`, 
          description: `${data.errors.length} error(s): ${data.errors.slice(0, 2).join('; ')}${data.errors.length > 2 ? '...' : ''}`,
          variant: data.success > 0 ? "default" : "destructive"
        });
      } else {
        toast({ title: `Imported ${data.success} question(s)!` });
      }
    },
    onError: () => {
      toast({ title: "Import failed", description: "Check your data format and try again.", variant: "destructive" });
    },
  });

  const parseBulkImport = (text: string): Array<{ question: string; correctAnswer: string; points: number }> => {
    const lines = text.split('\n').filter(l => l.trim());
    const questions: Array<{ question: string; correctAnswer: string; points: number }> = [];
    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        const points = parseInt(parts[0], 10);
        if (!isNaN(points) && parts[1] && parts[2]) {
          questions.push({ points, question: parts[1], correctAnswer: parts[2] });
        }
      }
    }
    return questions;
  };

  const handleFileUpload = async (file: File, isEdit: boolean = false) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      let markdown = '';
      if (isImage) {
        markdown = `\n![${file.name}](${url})\n`;
      } else if (isAudio) {
        markdown = `\n<audio controls src="${url}"></audio>\n`;
      }
      if (isEdit) {
        setEditQuestion(prev => prev + markdown);
      } else {
        setNewQuestion(prev => prev + markdown);
      }
      toast({ title: "File uploaded!" });
    } catch {
      toast({ title: "Upload failed", description: "Check your file and try again.", variant: "destructive" });
    }
  };

  const handleCreateQuestion = () => {
    if (!selectedBoardCategoryId || !newQuestion.trim() || !newCorrectAnswer.trim() || questions.length >= 5) return;
    createQuestionMutation.mutate({
      boardCategoryId: selectedBoardCategoryId,
      question: newQuestion.trim(),
      options: [],
      correctAnswer: newCorrectAnswer.trim(),
      points: newPoints,
    });
  };

  const startEditingQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setEditQuestion(q.question);
    setEditCorrectAnswer(q.correctAnswer);
    setEditPoints(q.points);
  };

  const getAdminSubtitle = () => {
    if (selectedGameType === 'buzzkill') return 'Buzzkill';
    if (selectedGameType === 'double_dip') return 'Double Dip';
    if (selectedGameType === 'sequence_squeeze') return 'Sequence Squeeze';
    return 'Manage Content';
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader
        title="Admin Panel"
        subtitle={getAdminSubtitle()}
        backHref={selectedGameType ? undefined : "/"}
        rightContent={
          <>
            {selectedGameType && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2" 
                onClick={() => {
                  setSelectedGameType(null);
                  setSelectedBoardId(null);
                  setSelectedBoardCategoryId(null);
                }}
                data-testid="button-back-games"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Games
              </Button>
            )}
            {selectedGameType === 'buzzkill' && selectedBoard && (
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                <Grid3X3 className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground">{selectedBoard.name}</span>
                {selectedBoardCategory && (
                  <>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-primary">{selectedBoardCategory.category.name}</span>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <Button
                variant={adminTab === 'content' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none gap-2"
                onClick={() => setAdminTab('content')}
                data-testid="button-tab-content"
              >
                <Gamepad2 className="w-4 h-4" />
                Games
              </Button>
              <Button
                variant={adminTab === 'analytics' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none gap-2"
                onClick={() => setAdminTab('analytics')}
                data-testid="button-tab-analytics"
              >
                <BarChart2 className="w-4 h-4" />
                Analytics
              </Button>
            </div>
          </>
        }
      />

      <main className="max-w-[1600px] mx-auto p-6" role="main" aria-label="Admin panel content">
        {adminTab === 'analytics' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Total Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingAnalytics ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold text-foreground" data-testid="text-total-sessions">
                      {hostAnalytics?.totalSessions || 0}
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Total Players
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingAnalytics ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold text-foreground" data-testid="text-total-players">
                      {hostAnalytics?.totalPlayers || 0}
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-500" />
                    Active Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingAnalytics ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold text-green-500" data-testid="text-active-sessions">
                      {hostAnalytics?.activeSessions || 0}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Session History</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSessions ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : hostSessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No sessions yet. Start hosting games to see your history here.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Code</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Date</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Players</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hostSessions.map(session => (
                          <tr key={session.id} className="border-b border-border hover-elevate" data-testid={`row-session-${session.id}`}>
                            <td className="py-3 px-3">
                              <span className="font-mono text-sm font-medium text-foreground">{session.code}</span>
                            </td>
                            <td className="py-3 px-3 text-sm text-muted-foreground">
                              {new Date(session.createdAt).toLocaleDateString()} {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                session.state === 'ended' 
                                  ? 'bg-muted text-muted-foreground' 
                                  : session.state === 'playing' 
                                    ? 'bg-green-500/20 text-green-500'
                                    : 'bg-yellow-500/20 text-yellow-500'
                              }`}>
                                {session.state}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-sm text-foreground">{session.players.length}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : selectedGameType === null ? (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Select a Game to Manage</h2>
              <p className="text-muted-foreground">Choose which game content you want to create or edit</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card 
                  className="hover-elevate cursor-pointer border-2 border-transparent hover:border-violet-500/50 transition-all"
                  onClick={() => setSelectedGameType('buzzkill')}
                  data-testid="card-game-buzzkill"
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/20">
                      <Grid3X3 className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Buzzkill</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Create trivia boards with categories and point-based questions
                    </p>
                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Grid3X3 className="w-3 h-3" />
                        {boards.length} Boards
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Categories & Questions
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card 
                  className="hover-elevate cursor-pointer border-2 border-transparent hover:border-teal-500/50 transition-all"
                  onClick={() => setSelectedGameType('sequence_squeeze')}
                  data-testid="card-game-sequence-squeeze"
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/20">
                      <ListOrdered className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Sequence Squeeze</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Speed ordering game - arrange options in the right order
                    </p>
                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ListOrdered className="w-3 h-3" />
                        Ordering Game
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Speed Challenge
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card 
                  className="hover-elevate cursor-pointer border-2 border-transparent hover:border-pink-500/50 transition-all"
                  onClick={() => setSelectedGameType('double_dip')}
                  data-testid="card-game-double-dip"
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-500/20">
                      <Heart className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Double Dip</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Daily prompts and deep questions for couples
                    </p>
                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        Couples Game
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Daily Prompts
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
            <div className="mt-8 text-center">
              <Link href="/admin/games">
                <Button variant="outline" className="gap-2" data-testid="button-manage-game-sessions">
                  <Layers className="w-4 h-4" />
                  Manage Game Sessions
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground mt-2">Bundle boards into playable game sessions</p>
            </div>
          </div>
        ) : selectedGameType === 'buzzkill' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-120px)]">
          <div className="lg:col-span-3 overflow-y-auto">
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="py-4 px-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-foreground text-sm font-semibold uppercase tracking-wide">
                    <Grid3X3 className="w-4 h-4 text-primary" />
                    Game Boards
                  </CardTitle>
                  <Button
                    size="icon"
                    variant={showNewBoardForm ? "secondary" : "default"}
                    onClick={() => setShowNewBoardForm(!showNewBoardForm)}
                    className="h-8 w-8"
                    data-testid="button-toggle-board-form"
                  >
                    {showNewBoardForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                <AnimatePresence>
                  {showNewBoardForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 p-3 bg-muted/20 rounded-lg border border-border"
                    >
                      <Input
                        placeholder="Board name"
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        data-testid="input-board-name"
                      />
                      <div className="flex flex-wrap gap-1">
                        {ALL_POINT_VALUES.map(pt => (
                          <Button
                            key={pt}
                            size="sm"
                            variant={newBoardPoints.includes(pt) ? "default" : "outline"}
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              if (newBoardPoints.includes(pt)) {
                                setNewBoardPoints(prev => prev.filter(p => p !== pt));
                              } else {
                                setNewBoardPoints(prev => [...prev, pt].sort((a, b) => a - b));
                              }
                            }}
                            data-testid={`button-point-${pt}`}
                          >
                            {pt}
                          </Button>
                        ))}
                      </div>
                      <Button
                        onClick={() => createBoardMutation.mutate({ name: newBoardName, description: '', pointValues: newBoardPoints })}
                        disabled={!newBoardName.trim() || newBoardPoints.length === 0}
                        className="w-full"
                        size="sm"
                        data-testid="button-create-board"
                      >
                        Create Board
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2" role="list" aria-label="Game boards">
                  {loadingBoards ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                          <Skeleton className="h-8 w-8 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : boards.map(board => {
                    const summary = boardSummaries.find(s => s.id === board.id);
                    const categoryCount = summary?.categoryCount || 0;
                    const totalQuestions = summary?.categories.reduce((sum, c) => sum + c.questionCount, 0) || 0;
                    const maxQuestions = categoryCount * 5;
                    const categoryProgress = (categoryCount / 5) * 100;
                    const questionProgress = maxQuestions > 0 ? (totalQuestions / maxQuestions) * 100 : 0;
                    const isComplete = categoryCount >= 5 && totalQuestions >= maxQuestions && maxQuestions > 0;
                    const isEditing = editingBoardId === board.id;
                    return (
                      <div
                        key={board.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          selectedBoardId === board.id
                            ? 'bg-primary/20 border-2 border-primary'
                            : 'bg-muted/20 border border-border hover:bg-muted/30'
                        }`}
                        onClick={() => { 
                          if (!isEditing) { 
                            setSelectedBoardId(board.id); 
                            setSelectedBoardCategoryId(null); 
                            if (board.theme) setTheme(board.theme as ThemeName);
                          } 
                        }}
                        data-testid={`board-item-${board.id}`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editBoardName}
                              onChange={(e) => setEditBoardName(e.target.value)}
                              className="h-7 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && editBoardName.trim()) {
                                  updateBoardMutation.mutate({ id: board.id, name: editBoardName.trim() });
                                }
                                if (e.key === 'Escape') {
                                  setEditingBoardId(null);
                                }
                              }}
                              data-testid={`input-edit-board-${board.id}`}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (editBoardName.trim()) {
                                  updateBoardMutation.mutate({ id: board.id, name: editBoardName.trim() });
                                }
                              }}
                              className="h-7 w-7 text-primary shrink-0"
                              data-testid={`button-save-board-${board.id}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingBoardId(null)}
                              className="h-7 w-7 text-muted-foreground shrink-0"
                              data-testid={`button-cancel-edit-board-${board.id}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium text-foreground text-sm truncate">{board.name}</span>
                                {isComplete && (
                                  <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    window.open(`/board/${board.id}`, '_blank');
                                  }}
                                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                                  data-testid={`button-preview-board-${board.id}`}
                                  title="Preview board"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setEditingBoardId(board.id); 
                                    setEditBoardName(board.name); 
                                  }}
                                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                                  data-testid={`button-edit-board-${board.id}`}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); deleteBoardMutation.mutate(board.id); }}
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  data-testid={`button-delete-board-${board.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <FolderPlus className="w-3 h-3 text-muted-foreground shrink-0" />
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all ${categoryCount >= 5 ? 'bg-primary' : 'bg-primary/50'}`}
                                    style={{ width: `${categoryProgress}%` }}
                                  />
                                </div>
                                <span className={`text-[10px] font-medium w-8 text-right ${categoryCount >= 5 ? 'text-primary' : 'text-muted-foreground'}`}>
                                  {categoryCount}/5
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <HelpCircle className="w-3 h-3 text-muted-foreground shrink-0" />
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all ${questionProgress >= 100 ? 'bg-primary' : questionProgress > 0 ? 'bg-amber-500' : 'bg-muted'}`}
                                    style={{ width: `${Math.min(questionProgress, 100)}%` }}
                                  />
                                </div>
                                <span className={`text-[10px] font-medium w-8 text-right ${questionProgress >= 100 ? 'text-primary' : questionProgress > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                  {totalQuestions}/{maxQuestions || 0}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {boards.length === 0 && !loadingBoards && (
                    <div className="text-center py-6 px-3">
                      <Grid3X3 className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm mb-1">No boards yet</p>
                      <p className="text-muted-foreground/70 text-xs">Click + above to create your first game board</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-9 overflow-hidden">
            <Card className="bg-card border-border shadow-sm h-full flex flex-col">
              {!selectedBoardId ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-12">
                    <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <Grid3X3 className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Board Selected</h3>
                    <p className="text-muted-foreground max-w-sm">Select a game board from the sidebar to start managing categories and questions</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="border-b border-border px-4 py-3 bg-muted/20">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <FolderPlus className="w-5 h-5 text-primary" />
                        <span className="text-sm font-semibold uppercase tracking-wide text-foreground">Categories</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-xs text-muted-foreground">Theme:</span>
                        <Select
                          value={selectedBoard?.theme || 'birthday'}
                          onValueChange={(value) => {
                            setTheme(value as ThemeName);
                            updateBoardMutation.mutate({ id: selectedBoardId!, theme: value });
                          }}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs" data-testid="select-board-theme">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(THEMES) as ThemeName[]).map((themeName) => (
                              <SelectItem key={themeName} value={themeName} data-testid={`theme-option-${themeName}`}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: THEMES[themeName].gradient1 }}
                                  />
                                  {THEME_LABELS[themeName]}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${boardCategories.length >= 5 ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                          {boardCategories.length}/5
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant={showNewCategoryForm ? "secondary" : "default"}
                        onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
                        disabled={boardCategories.length >= 5 && !showNewCategoryForm}
                        className="h-8 gap-1"
                        data-testid="button-toggle-category-form"
                      >
                        {showNewCategoryForm ? <X className="w-4 h-4" /> : <><Plus className="w-4 h-4" /> Add Category</>}
                      </Button>
                    </div>

                    <AnimatePresence>
                      {showNewCategoryForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 mb-3 p-2 bg-muted/20 rounded-lg"
                        >
                          <div className="flex gap-2">
                            <Input
                              placeholder="Category name"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              className="flex-1 h-8 text-sm"
                              data-testid="input-category-name"
                            />
                            <Button
                              onClick={() => createAndLinkCategoryMutation.mutate({ 
                                name: newCategoryName.trim(), 
                                description: newCategoryDescription.trim(), 
                                imageUrl: newCategoryImageUrl || undefined,
                                boardId: selectedBoardId! 
                              })}
                              disabled={!newCategoryName.trim() || boardCategories.length >= 5 || isUploadingCategoryImage}
                              size="sm"
                              className="h-8"
                              data-testid="button-create-category"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <Input
                            placeholder="Short description (shown as tooltip)"
                            value={newCategoryDescription}
                            onChange={(e) => setNewCategoryDescription(e.target.value)}
                            className="h-8 text-sm"
                            data-testid="input-category-description"
                          />
                          <div className="flex gap-2 items-center">
                            <input
                              type="file"
                              ref={categoryImageInputRef}
                              className="hidden"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  await uploadCategoryImage(file);
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1"
                              onClick={() => categoryImageInputRef.current?.click()}
                              disabled={isUploadingCategoryImage}
                              data-testid="button-upload-category-image"
                            >
                              {isUploadingCategoryImage ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              {newCategoryImageUrl ? "Change Image" : "Add Image"}
                            </Button>
                            {newCategoryImageUrl && (
                              <div className="flex items-center gap-2">
                                <img 
                                  src={newCategoryImageUrl} 
                                  alt="Category preview" 
                                  className="h-8 w-8 rounded object-cover border"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => setNewCategoryImageUrl("")}
                                  data-testid="button-clear-category-image"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {loadingBoardCategories ? (
                      <div className="flex gap-4 border-b border-border pb-2 overflow-x-auto">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Skeleton key={i} className="h-8 w-24 rounded shrink-0" />
                        ))}
                      </div>
                    ) : boardCategories.length === 0 ? (
                      <p className="text-center text-muted-foreground text-xs py-3">
                        No categories yet. Click + to add one!
                      </p>
                    ) : (
                      <Tabs 
                        value={selectedBoardCategoryId?.toString() || ''} 
                        onValueChange={(val) => setSelectedBoardCategoryId(val ? Number(val) : null)}
                        className="w-full"
                      >
                        <TabsList className="h-auto bg-transparent p-0 gap-6 border-b border-border rounded-none w-full justify-start">
                          {boardCategories.map((bc) => (
                            <TabsTrigger 
                              key={bc.id}
                              value={bc.id.toString()} 
                              className="bg-transparent rounded-none border-b-2 border-transparent px-0 pb-2 pt-1 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
                              data-testid={`category-tab-${bc.id}`}
                            >
                              <span className="truncate max-w-[100px]">{bc.category.name}</span>
                              {(bc.questionCount ?? 0) >= 5 && (
                                <CheckCircle className="w-3 h-3" />
                              )}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    )}

                    {unlinkedCategories.length > 0 && boardCategories.length < 5 && (
                      <div className="pt-2 mt-2 border-t border-border">
                        <p className="text-[10px] text-muted-foreground mb-1">Quick add existing:</p>
                        <div className="flex flex-wrap gap-1">
                          {unlinkedCategories.slice(0, 4).map(cat => (
                            <Button
                              key={cat.id}
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2"
                              onClick={() => linkCategoryMutation.mutate({ boardId: selectedBoardId!, categoryId: cat.id })}
                              data-testid={`button-quick-link-${cat.id}`}
                            >
                              <Plus className="w-2.5 h-2.5 mr-0.5" /> {cat.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  <CardContent className="p-5 flex-1 overflow-y-auto flex flex-col">
                    {!selectedBoardCategoryId ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center p-8">
                          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                            <HelpCircle className="w-8 h-8 text-muted-foreground/50" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">Select a Category</h3>
                          <p className="text-muted-foreground max-w-sm">Click on one of the category tabs above to view and manage its questions</p>
                        </div>
                      </div>
                    ) : (
                  <div className="flex flex-col gap-4">
                    {/* Category toolbar */}
                    {(() => {
                      const selectedBc = boardCategories.find(bc => bc.id === selectedBoardCategoryId);
                      const selectedIdx = boardCategories.findIndex(bc => bc.id === selectedBoardCategoryId);
                      if (!selectedBc) return null;
                      return (
                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border shrink-0">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-foreground">{selectedBc.category.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${(selectedBc.questionCount ?? 0) >= 5 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              {selectedBc.questionCount ?? 0}/5 questions
                            </span>
                            {selectedBc.category.description && (
                              <span className="text-xs text-muted-foreground">— {selectedBc.category.description}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => moveCategory(selectedIdx, 'up')}
                              disabled={selectedIdx === 0}
                              className="h-8 px-2"
                              title="Move left"
                              data-testid={`button-move-up-${selectedBc.id}`}
                            >
                              <ArrowUp className="w-4 h-4 rotate-[-90deg]" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => moveCategory(selectedIdx, 'down')}
                              disabled={selectedIdx === boardCategories.length - 1}
                              className="h-8 px-2"
                              title="Move right"
                              data-testid={`button-move-down-${selectedBc.id}`}
                            >
                              <ArrowDown className="w-4 h-4 rotate-[-90deg]" />
                            </Button>
                            <div className="w-px h-5 bg-border mx-1" />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditingCategoryId(selectedBc.category.id); setEditCategoryName(selectedBc.category.name); setEditCategoryDescription(selectedBc.category.description || ''); }}
                              className="h-8 gap-1"
                              data-testid={`button-edit-category-${selectedBc.category.id}`}
                            >
                              <Pencil className="w-4 h-4" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => unlinkCategoryMutation.mutate(selectedBc.id)}
                              className="h-8 gap-1"
                              title="Unlink from board (keeps category)"
                              data-testid={`button-unlink-${selectedBc.id}`}
                            >
                              <Unlink className="w-4 h-4" /> Unlink
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 gap-1 text-destructive hover:text-destructive"
                                  data-testid={`button-delete-category-${selectedBc.category.id}`}
                                >
                                  <Trash2 className="w-4 h-4" /> Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete "{selectedBc.category.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this category and all its questions. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => {
                                      setSelectedBoardCategoryId(null);
                                      deleteCategoryMutation.mutate(selectedBc.category.id);
                                    }}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Edit category form */}
                    <AnimatePresence>
                      {editingCategoryId && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-4 bg-muted/20 rounded-lg border border-border"
                        >
                          <div className="space-y-3">
                            <Input
                              value={editCategoryName}
                              onChange={(e) => setEditCategoryName(e.target.value)}
                              placeholder="Category name"
                              autoFocus
                            />
                            <Input
                              value={editCategoryDescription}
                              onChange={(e) => setEditCategoryDescription(e.target.value)}
                              placeholder="Short description (tooltip)"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateCategoryMutation.mutate({ id: editingCategoryId, name: editCategoryName.trim(), description: editCategoryDescription.trim() });
                                } else if (e.key === 'Escape') {
                                  setEditingCategoryId(null);
                                }
                              }}
                            />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => setEditingCategoryId(null)}>Cancel</Button>
                              <Button size="sm" onClick={() => updateCategoryMutation.mutate({ id: editingCategoryId, name: editCategoryName.trim(), description: editCategoryDescription.trim() })}>Save</Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Collapsible new question form */}
                    <Collapsible open={questionFormOpen} onOpenChange={setQuestionFormOpen}>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-between h-12 px-4 bg-gradient-to-r from-muted/30 to-muted/10 border-dashed"
                          data-testid="button-toggle-question-form"
                        >
                          <span className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            <span className="font-medium">Add New Question</span>
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${questionFormOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-3 space-y-4 p-5 bg-gradient-to-b from-muted/20 to-transparent rounded-xl border border-border"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Supports markdown formatting</p>
                            <div className="flex items-center gap-1">
                              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                              <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                              <Button size="sm" variant="ghost" onClick={() => imageInputRef.current?.click()} className="h-8 gap-1">
                                <Image className="w-4 h-4" /> Image
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => audioInputRef.current?.click()} className="h-8 gap-1">
                                <Music className="w-4 h-4" /> Audio
                              </Button>
                            </div>
                          </div>
                          
                          {/* Side-by-side editor and preview */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">Write</p>
                              <MDEditor 
                                value={newQuestion} 
                                onChange={(val) => setNewQuestion(val || "")} 
                                preview="edit" 
                                height={150} 
                                data-testid="input-new-question"
                                hideToolbar
                              />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">Preview</p>
                              <div className="h-[150px] p-3 rounded-md border border-border bg-background overflow-auto prose prose-sm dark:prose-invert max-w-none">
                                {newQuestion.trim() ? (
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{newQuestion}</ReactMarkdown>
                                ) : (
                                  <p className="text-muted-foreground italic">Start typing to see preview...</p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <Input
                              placeholder="Correct answer"
                              value={newCorrectAnswer}
                              onChange={(e) => setNewCorrectAnswer(e.target.value)}
                              className="flex-1"
                              data-testid="input-correct-answer"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newQuestion.trim() && newCorrectAnswer.trim()) {
                                  handleCreateQuestion();
                                }
                              }}
                            />
                            <Select value={String(newPoints)} onValueChange={(v) => setNewPoints(Number(v))} disabled={availablePoints.length === 0}>
                              <SelectTrigger className="w-28" data-testid="select-points">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availablePoints.map(pt => (
                                  <SelectItem key={pt} value={String(pt)}>{pt} pts</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button onClick={handleCreateQuestion} disabled={!newQuestion.trim() || !newCorrectAnswer.trim() || availablePoints.length === 0} className="px-6" data-testid="button-add-question">
                              <Plus className="w-4 h-4 mr-2" /> Add
                            </Button>
                          </div>
                        </motion.div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-between h-12 px-4 bg-gradient-to-r from-accent/30 to-accent/10 border-dashed"
                          data-testid="button-toggle-bulk-import"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span className="font-medium">Bulk Import Questions</span>
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${bulkImportOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-3 space-y-4 p-5 bg-gradient-to-b from-accent/10 to-transparent rounded-xl border border-border"
                        >
                          {!bulkPreviewMode ? (
                            <>
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">
                                  Paste questions in format: <code className="bg-muted px-1 rounded">points | question | answer</code>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Example: <code className="bg-muted px-1 rounded">10 | What is 2+2? | 4</code>
                                </p>
                              </div>
                              <textarea
                                value={bulkImportText}
                                onChange={(e) => setBulkImportText(e.target.value)}
                                placeholder={`10 | What is the capital of France? | Paris\n20 | What year did WW2 end? | 1945\n30 | Who painted the Mona Lisa? | Leonardo da Vinci`}
                                className="w-full h-32 p-3 text-sm rounded-md border border-border bg-background resize-none font-mono"
                                data-testid="textarea-bulk-import"
                              />
                              <div className="flex justify-between items-center">
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
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold">Review before importing</h4>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setBulkPreviewMode(false)}
                                  data-testid="button-back-to-edit"
                                >
                                  <ArrowLeft className="w-4 h-4 mr-1" /> Edit
                                </Button>
                              </div>
                              <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                                <table className="w-full text-sm">
                                  <thead className="bg-muted/50 sticky top-0">
                                    <tr>
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-16">Pts</th>
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Question</th>
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-32">Answer</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {parseBulkImport(bulkImportText).map((q, idx) => (
                                      <tr key={idx} className="border-t border-border hover:bg-muted/30" data-testid={`preview-row-${idx}`}>
                                        <td className="px-3 py-2 font-mono text-primary font-bold">{q.points}</td>
                                        <td className="px-3 py-2 truncate max-w-[200px]" title={q.question}>{q.question}</td>
                                        <td className="px-3 py-2 truncate max-w-[100px] text-muted-foreground" title={q.correctAnswer}>{q.correctAnswer}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="flex justify-between items-center pt-2">
                                <p className="text-xs text-muted-foreground">
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
                                      if (questions.length > 0 && selectedBoardCategoryId) {
                                        bulkImportMutation.mutate({ boardCategoryId: selectedBoardCategoryId, questions });
                                      }
                                    }}
                                    disabled={bulkImportMutation.isPending}
                                    className="px-6"
                                    data-testid="button-confirm-import"
                                  >
                                    {bulkImportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                    Confirm Import
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </motion.div>
                      </CollapsibleContent>
                    </Collapsible>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Questions ({questions.length}/5)</h4>
                      </div>
                      {loadingQuestions ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                      ) : (
                        <AnimatePresence mode="popLayout">
                          {questions.map((q, idx) => (
                            <motion.div
                              key={q.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -50 }}
                              className="p-4 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow"
                              data-testid={`question-${q.id}`}
                            >
                              {editingQuestionId === q.id ? (
                                <div className="space-y-3">
                                  <input ref={editImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], true)} />
                                  <input ref={editAudioInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], true)} />
                                  <MDEditor value={editQuestion} onChange={(val) => setEditQuestion(val || "")} preview="edit" height={100} />
                                  <div className="flex gap-2">
                                    <Input value={editCorrectAnswer} onChange={(e) => setEditCorrectAnswer(e.target.value)} placeholder="Answer" className="flex-1" />
                                    <Select value={String(editPoints)} onValueChange={(v) => setEditPoints(Number(v))}>
                                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {currentPointValues.filter(pt => pt === editPoints || !usedPoints.includes(pt)).map(pt => (
                                          <SelectItem key={pt} value={String(pt)}>{pt} pts</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setEditingQuestionId(null)}>Cancel</Button>
                                    <Button size="sm" onClick={() => updateQuestionMutation.mutate({ id: q.id, question: editQuestion, correctAnswer: editCorrectAnswer, points: editPoints })}>
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  className="flex items-start gap-3"
                                  draggable
                                  onDragStart={() => setDraggedQuestionId(q.id)}
                                  onDragEnd={() => setDraggedQuestionId(null)}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={() => {
                                    if (draggedQuestionId && draggedQuestionId !== q.id) {
                                      // Swap points between dragged question and drop target
                                      const draggedQ = questions.find(x => x.id === draggedQuestionId);
                                      if (draggedQ) {
                                        updateQuestionMutation.mutate({ id: draggedQuestionId, points: q.points });
                                        updateQuestionMutation.mutate({ id: q.id, points: draggedQ.points });
                                      }
                                    }
                                  }}
                                >
                                  <div className="flex items-center self-stretch cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground">
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="px-2 py-0.5 text-xs font-bold bg-primary/20 text-primary rounded">{q.points} pts</span>
                                    </div>
                                    <p className="text-sm text-foreground">{q.question.replace(/!\[.*?\]\(.*?\)/g, '[image]').replace(/<audio.*?<\/audio>/g, '[audio]')}</p>
                                    <p className="text-xs text-primary mt-1">Answer: {q.correctAnswer}</p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button size="icon" variant="ghost" onClick={() => startEditingQuestion(q)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => deleteQuestionMutation.mutate(q.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                      {questions.length === 0 && !loadingQuestions && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center py-12 px-6 bg-gradient-to-b from-muted/30 to-transparent rounded-xl border border-dashed border-border"
                        >
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-primary" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">Create Your First Question</h3>
                          <p className="text-muted-foreground max-w-sm mx-auto mb-4">
                            This category needs 5 questions. Click the button above to add your first one!
                          </p>
                          <Button 
                            variant="default" 
                            onClick={() => setQuestionFormOpen(true)}
                            className="gap-2"
                          >
                            <Plus className="w-4 h-4" /> Add Question
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        </div>
        ) : selectedGameType === 'double_dip' ? (
          <div className="max-w-4xl mx-auto text-center py-12">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-pink-500/20">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Double Dip Content</h2>
            <p className="text-muted-foreground mb-6">
              Double Dip content is managed through the Relationship Hub.
            </p>
            <Link href="/host/double-dip">
              <Button className="gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600" data-testid="button-go-to-double-dip">
                <Heart className="w-4 h-4" />
                Open Relationship Hub
              </Button>
            </Link>
          </div>
        ) : selectedGameType === 'sequence_squeeze' ? (
          <SequenceSqueezeAdmin />
        ) : null}
      </main>
    </div>
  );
}
