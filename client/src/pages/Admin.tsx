import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2, FolderPlus, HelpCircle, ArrowLeft, ArrowRight, Loader2, Pencil, X, Check, Image, Music, Grid3X3, Link2, Unlink, ChevronRight, ArrowUp, ArrowDown, CheckCircle, ChevronDown, GripVertical, Sparkles, Upload, FileText, Eye, Download, FileUp, MoreVertical, FileDown } from "lucide-react";
import * as XLSX from 'xlsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import MDEditor from '@uiw/react-md-editor';
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import type { Category, Question, Board, BoardCategoryWithCount } from "@shared/schema";
import { useUpload } from "@/hooks/use-upload";
import { getBoardColorConfig } from "@/lib/boardColors";

const FIXED_POINT_VALUES = [10, 20, 30, 40, 50];

function ProgressBar({ value, max, size = "sm", showLabel = false }: { value: number; max: number; size?: "sm" | "md"; showLabel?: boolean }) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  const isComplete = value >= max;
  const barHeight = size === "sm" ? "h-1.5" : "h-2";
  
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${barHeight} bg-muted rounded-full overflow-hidden`}>
        <div 
          className={`h-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : percent > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-[10px] font-medium ${isComplete ? 'text-emerald-600' : 'text-muted-foreground'}`}>
          {value}/{max}
        </span>
      )}
    </div>
  );
}

function getStatusColor(value: number, max: number): string {
  if (value >= max) return 'bg-emerald-500/10 border-emerald-500/30';
  if (value > 0) return 'bg-blue-500/5 border-blue-500/20';
  return 'bg-muted/20 border-border';
}

export default function Admin() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [selectedBoardCategoryId, setSelectedBoardCategoryId] = useState<number | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

  const [newBoardName, setNewBoardName] = useState("");
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
  const [editBoardDescription, setEditBoardDescription] = useState("");
  const [deleteBoardConfirmId, setDeleteBoardConfirmId] = useState<number | null>(null);

  const [newQuestion, setNewQuestion] = useState("");
  const [newCorrectAnswer, setNewCorrectAnswer] = useState("");
  const [newPoints, setNewPoints] = useState<number>(10);
  const [newImageUrl, setNewImageUrl] = useState("");

  const [editQuestion, setEditQuestion] = useState("");
  const [editCorrectAnswer, setEditCorrectAnswer] = useState("");
  const [editPoints, setEditPoints] = useState<number>(10);
  const [editImageUrl, setEditImageUrl] = useState("");

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryDescription, setEditCategoryDescription] = useState("");
  const [editCategoryRule, setEditCategoryRule] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryRule, setNewCategoryRule] = useState("");
  const [questionFormOpen, setQuestionFormOpen] = useState(false);
  const [draggedQuestionId, setDraggedQuestionId] = useState<number | null>(null);
  const [draggedBoardId, setDraggedBoardId] = useState<number | null>(null);
  const [dragOverBoardId, setDragOverBoardId] = useState<number | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<number | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<number | null>(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [bulkPreviewMode, setBulkPreviewMode] = useState(false);
  const [expandedBoardIds, setExpandedBoardIds] = useState<Set<number>>(new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quickAddQuestion, setQuickAddQuestion] = useState("");
  const [quickAddAnswer, setQuickAddAnswer] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const editAudioInputRef = useRef<HTMLInputElement>(null);
  const excelImportInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const { data: allBoards = [], isLoading: loadingBoards } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
    enabled: isAuthenticated,
  });

  // All users see all boards in a simple flat list
  const isSuperAdmin = user?.role === 'super_admin';
  const boards = allBoards;

  type BoardSummary = { id: number; name: string; categoryCount: number; categories: { id: number; name: string; questionCount: number; remaining: number }[] };
  const { data: allBoardSummaries = [] } = useQuery<BoardSummary[]>({
    queryKey: ['/api/boards/summary'],
    enabled: isAuthenticated,
  });
  const boardSummaries = allBoardSummaries.filter(bs => boards.some(b => b.id === bs.id));

  const { data: allCategories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: isAuthenticated,
  });

  const selectedBoard = boards.find(b => b.id === selectedBoardId);
  const currentPointValues = FIXED_POINT_VALUES;

  const { data: boardCategories = [], isLoading: loadingBoardCategories } = useQuery<BoardCategoryWithCount[]>({
    queryKey: ['/api/boards', selectedBoardId, 'categories'],
    enabled: !!selectedBoardId && isAuthenticated,
  });

  const allLinkedCategoryIds = allBoardSummaries.flatMap(bs => bs.categories.map(c => c.id));
  const unlinkedCategories = allCategories.filter(c => !allLinkedCategoryIds.includes(c.id));

  const selectedBoardCategory = boardCategories.find(bc => bc.id === selectedBoardCategoryId);
  const selectedCategoryId = selectedBoardCategory?.categoryId;

  const { data: questions = [], isLoading: loadingQuestions } = useQuery<Question[]>({
    queryKey: ['/api/categories', selectedCategoryId, 'questions'],
    enabled: !!selectedCategoryId && isAuthenticated,
  });

  const usedPoints = questions.map(q => q.points);
  const availablePoints = currentPointValues.filter(pt => !usedPoints.includes(pt));

  // Redirect to home (landing page) if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthLoading, isAuthenticated, setLocation]);

  // Auto-select first board when boards load
  useEffect(() => {
    if (boards.length > 0 && selectedBoardId === null) {
      setSelectedBoardId(boards[0].id);
    }
  }, [boards, selectedBoardId]);

  // Auto-expand selected board in sidebar
  useEffect(() => {
    if (selectedBoardId) {
      setExpandedBoardIds(prev => {
        const next = new Set(Array.from(prev));
        next.add(selectedBoardId);
        return next;
      });
    }
  }, [selectedBoardId]);

  useEffect(() => {
    if (availablePoints.length > 0 && !availablePoints.includes(newPoints)) {
      setNewPoints(availablePoints[0]);
    }
  }, [availablePoints, newPoints]);

  // Auto-select first category when board categories load
  useEffect(() => {
    if (boardCategories.length > 0 && !selectedBoardCategoryId) {
      setSelectedBoardCategoryId(boardCategories[0].id);
    }
  }, [boardCategories, selectedBoardCategoryId]);

  // Auto-open question form when category has no questions
  useEffect(() => {
    if (questions.length === 0 && selectedBoardCategoryId && !loadingQuestions) {
      setQuestionFormOpen(true);
    }
  }, [questions, selectedBoardCategoryId, loadingQuestions]);

  // Auto-save draft to localStorage when form values change
  useEffect(() => {
    if (!selectedCategoryId) return;
    const draft = { question: newQuestion, answer: newCorrectAnswer, points: newPoints, imageUrl: newImageUrl };
    const hasContent = draft.question || draft.answer || draft.imageUrl;
    if (hasContent) {
      localStorage.setItem(`buzzkill_draft_${selectedCategoryId}`, JSON.stringify(draft));
    } else {
      // Remove draft when all fields are empty
      localStorage.removeItem(`buzzkill_draft_${selectedCategoryId}`);
    }
  }, [selectedCategoryId, newQuestion, newCorrectAnswer, newPoints, newImageUrl]);

  // Load draft from localStorage when switching categories
  useEffect(() => {
    if (!selectedCategoryId) return;
    const savedDraft = localStorage.getItem(`buzzkill_draft_${selectedCategoryId}`);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        // Always set fields (even empty) to avoid cross-category bleed
        setNewQuestion(draft.question || "");
        setNewCorrectAnswer(draft.answer || "");
        if (draft.points && availablePoints.includes(draft.points)) {
          setNewPoints(draft.points);
        }
        setNewImageUrl(draft.imageUrl || "");
      } catch (e) {
        // Invalid draft, clear form
        setNewQuestion("");
        setNewCorrectAnswer("");
        setNewImageUrl("");
      }
    } else {
      // Clear form when switching to a category with no draft
      setNewQuestion("");
      setNewCorrectAnswer("");
      setNewImageUrl("");
    }
  }, [selectedCategoryId]);

  // Clear draft after successful question creation
  const clearDraft = (categoryId: number) => {
    localStorage.removeItem(`buzzkill_draft_${categoryId}`);
  };
  
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
    mutationFn: async ({ id, name, description, theme, isGlobal, sortOrder }: { id: number; name?: string; description?: string; theme?: string; isGlobal?: boolean; sortOrder?: number }) => {
      return apiRequest('PUT', `/api/boards/${id}`, { name, description, theme, isGlobal, sortOrder });
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

  const reorderBoardsSilent = async (updates: { id: number; sortOrder: number }[]) => {
    await Promise.all(updates.map(u => apiRequest('PUT', `/api/boards/${u.id}`, { sortOrder: u.sortOrder })));
    queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
  };

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
    mutationFn: async (data: { name: string; description: string; rule?: string; imageUrl?: string; boardId: number }) => {
      const res = await apiRequest('POST', `/api/boards/${data.boardId}/categories/create-and-link`, { name: data.name, description: data.description, rule: data.rule, imageUrl: data.imageUrl });
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
      setNewCategoryRule("");
      setShowNewCategoryForm(false);
      toast({ title: "Category created and linked!" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to create category", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name, description, rule }: { id: number; name: string; description: string; rule?: string }) => {
      return apiRequest('PUT', `/api/categories/${id}`, { name, description, rule });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      setEditingCategoryId(null);
      setEditCategoryDescription("");
      setEditCategoryRule("");
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
    mutationFn: async (data: { categoryId: number; question: string; options: string[]; correctAnswer: string; points: number; imageUrl?: string }) => {
      return apiRequest('POST', '/api/questions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', selectedCategoryId, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      setNewQuestion("");
      setNewCorrectAnswer("");
      setNewPoints(currentPointValues[0] || 10);
      setNewImageUrl("");
      if (selectedCategoryId) clearDraft(selectedCategoryId);
      toast({ title: "Question added!" });
    },
    onError: () => {
      toast({ title: "Couldn't add question", description: "Please try again.", variant: "destructive" });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; question?: string; correctAnswer?: string; points?: number; imageUrl?: string }) => {
      return apiRequest('PUT', `/api/questions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', selectedCategoryId, 'questions'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/categories', selectedCategoryId, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedBoardId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      toast({ title: "Question deleted" });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (data: { categoryId: number; questions: Array<{ question: string; correctAnswer: string; points: number; imageUrl?: string }> }) => {
      const res = await apiRequest('POST', `/api/categories/${data.categoryId}/questions/bulk`, { questions: data.questions });
      return res.json();
    },
    onSuccess: (data: { success: number; errors: string[] }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', selectedCategoryId, 'questions'] });
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

  const parseBulkImport = (text: string): Array<{ question: string; correctAnswer: string; points: number; imageUrl?: string }> => {
    const lines = text.split('\n').filter(l => l.trim());
    const questions: Array<{ question: string; correctAnswer: string; points: number; imageUrl?: string }> = [];
    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        const points = parseInt(parts[0], 10);
        if (!isNaN(points) && parts[1] && parts[2]) {
          questions.push({ 
            points, 
            question: parts[1], 
            correctAnswer: parts[2],
            imageUrl: parts[3] || undefined,
          });
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
    if (!selectedCategoryId || !newQuestion.trim() || !newCorrectAnswer.trim() || questions.length >= 5) return;
    createQuestionMutation.mutate({
      categoryId: selectedCategoryId,
      question: newQuestion.trim(),
      options: [],
      correctAnswer: newCorrectAnswer.trim(),
      points: newPoints,
      imageUrl: newImageUrl.trim() || undefined,
    });
  };

  const startEditingQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setEditQuestion(q.question);
    setEditCorrectAnswer(q.correctAnswer);
    setEditPoints(q.points);
    setEditImageUrl(q.imageUrl || "");
  };

  const [importResult, setImportResult] = useState<{
    summary: { boardsCreated: number; categoriesCreated: number; categoriesLinked: number; questionsCreated: number; flaggedCount: number; errorCount: number };
    flagged: Array<{ row: number; issue: string; data: Record<string, string> }>;
    errors: string[];
  } | null>(null);

  const handleExcelImport = async (file: File) => {
    setIsImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/import/excel', { 
        method: 'POST', 
        body: formData,
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Import failed');
      }
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      
      const s = result.summary;
      const hasIssues = s.flaggedCount > 0 || s.errorCount > 0;
      
      if (hasIssues) {
        setImportResult(result);
      }
      
      toast({ 
        title: hasIssues ? "Import complete with issues" : "Import complete!", 
        description: `Created ${s.boardsCreated} boards, ${s.categoriesCreated} categories, ${s.questionsCreated} questions${s.flaggedCount > 0 ? `. ${s.flaggedCount} rows need attention.` : ''}`,
        variant: hasIssues ? "default" : "default"
      });
    } catch (err: unknown) {
      toast({ 
        title: "Import failed", 
        description: err instanceof Error ? err.message : "Please check your file format.", 
        variant: "destructive" 
      });
    } finally {
      setIsImporting(false);
      if (excelImportInputRef.current) {
        excelImportInputRef.current.value = '';
      }
    }
  };

  const handleExcelExport = () => {
    window.location.href = '/api/export/excel';
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      { Board: "Sample Board", Category: "Sample Category", Rule: "Answer in reverse", Question: "What is 2+2?", Answer: "Four", Points: 10, "Image URL": "" },
      { Board: "Sample Board", Category: "Sample Category", Rule: "", Question: "Capital of France?", Answer: "Paris", Points: 20, "Image URL": "" },
      { Board: "Sample Board", Category: "Sample Category", Rule: "", Question: "What animal is shown?", Answer: "Cat", Points: 30, "Image URL": "https://example.com/cat.jpg" },
      { Board: "Sample Board", Category: "Sample Category", Rule: "", Question: "Largest planet in our solar system?", Answer: "Jupiter", Points: 40, "Image URL": "" },
      { Board: "Sample Board", Category: "Sample Category", Rule: "", Question: "Who wrote Romeo and Juliet?", Answer: "Shakespeare", Points: 50, "Image URL": "" },
      { Board: "Sample Board", Category: "Another Category", Rule: "Sing your answer", Question: "Name this song", Answer: "Happy Birthday", Points: 10, "Image URL": "" },
      { Board: "Sample Board", Category: "Another Category", Rule: "", Question: "Who painted the Mona Lisa?", Answer: "Leonardo da Vinci", Points: 20, "Image URL": "" },
      { Board: "Sample Board", Category: "Another Category", Rule: "", Question: "What year did WW2 end?", Answer: "1945", Points: 30, "Image URL": "" },
      { Board: "Sample Board", Category: "Another Category", Rule: "", Question: "Chemical symbol for gold?", Answer: "Au", Points: 40, "Image URL": "" },
      { Board: "Sample Board", Category: "Another Category", Rule: "", Question: "Fastest land animal?", Answer: "Cheetah", Points: 50, "Image URL": "" },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    XLSX.writeFile(wb, "buzzkill_import_template.xlsx");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <input
        type="file"
        ref={excelImportInputRef}
        className="hidden"
        accept=".xlsx,.xls"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleExcelImport(file);
        }}
      />
      
      <AlertDialog open={!!importResult} onOpenChange={(open) => !open && setImportResult(null)}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Import Results
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {importResult?.summary && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-green-500/10 rounded">
                      <span className="font-medium text-green-600">{importResult.summary.boardsCreated}</span> boards created
                    </div>
                    <div className="p-2 bg-green-500/10 rounded">
                      <span className="font-medium text-green-600">{importResult.summary.categoriesCreated}</span> categories created
                    </div>
                    <div className="p-2 bg-green-500/10 rounded">
                      <span className="font-medium text-green-600">{importResult.summary.categoriesLinked}</span> categories linked
                    </div>
                    <div className="p-2 bg-green-500/10 rounded">
                      <span className="font-medium text-green-600">{importResult.summary.questionsCreated}</span> questions created
                    </div>
                  </div>
                )}
                {importResult && importResult.flagged.length > 0 && (
                  <div className="text-orange-600 font-medium">
                    {importResult.flagged.length} rows need manual attention:
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {importResult && importResult.flagged.length > 0 && (
            <div className="flex-1 overflow-y-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="p-2 text-left font-medium">Row</th>
                    <th className="p-2 text-left font-medium">Issue</th>
                    <th className="p-2 text-left font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {importResult.flagged.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2 font-mono text-xs">{item.row}</td>
                      <td className="p-2 text-orange-600">{item.issue}</td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {item.data && Object.entries(item.data).map(([k, v]) => {
                          const val = String(v || '');
                          return (
                            <div key={k}><span className="font-medium">{k}:</span> {val.substring(0, 50)}{val.length > 50 ? '...' : ''}</div>
                          );
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setImportResult(null)}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AppHeader
        title="Content Manager"
        subtitle={selectedBoard ? selectedBoard.name : "Buzzkill"}
        backHref="/"
        rightContent={
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => excelImportInputRef.current?.click()}
                  disabled={isImporting}
                  className="h-8 gap-1.5"
                  data-testid="button-import-excel"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                  <span className="hidden sm:inline">Import</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Import from Excel</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={downloadSampleTemplate}
                  className="h-8 gap-1.5"
                  data-testid="button-download-template"
                >
                  <FileDown className="w-4 h-4" />
                  <span className="hidden sm:inline">Template</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download sample import template</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExcelExport}
                  className="h-8 gap-1.5"
                  data-testid="button-export-excel"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export to Excel</TooltipContent>
            </Tooltip>
            {selectedBoard && selectedBoardCategory && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg text-sm">
                <Grid3X3 className="w-4 h-4 text-primary" />
                <span className="font-medium text-primary">{selectedBoardCategory.category.name}</span>
              </div>
            )}
          </div>
        }
      />

      <main className="max-w-[1600px] mx-auto p-6" role="main" aria-label="Admin panel content">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-120px)]">
          <div className={`overflow-y-auto transition-all duration-300 ${sidebarCollapsed ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
            <Card className="bg-card border-border shadow-sm h-full">
              <CardHeader className="py-3 px-3 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between gap-2">
                  {!sidebarCollapsed && (
                    <CardTitle className="flex items-center gap-2 text-foreground text-sm font-semibold uppercase tracking-wide">
                      <Grid3X3 className="w-4 h-4 text-primary" />
                      Boards
                    </CardTitle>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    {!sidebarCollapsed && (
                      <Button
                        size="icon"
                        variant={showNewBoardForm ? "secondary" : "default"}
                        onClick={() => setShowNewBoardForm(!showNewBoardForm)}
                        className="h-7 w-7"
                        data-testid="button-toggle-board-form"
                      >
                        {showNewBoardForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      className="h-7 w-7"
                      data-testid="button-toggle-sidebar"
                    >
                      {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                    </Button>
                  </div>
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
                      <Button
                        onClick={() => createBoardMutation.mutate({ name: newBoardName, description: '', pointValues: [10, 20, 30, 40, 50] })}
                        disabled={!newBoardName.trim()}
                        className="w-full"
                        size="sm"
                        data-testid="button-create-board"
                      >
                        Create Board
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-4" role="list" aria-label="Game boards">
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
                  ) : (
                    <>
                      {/* All Boards */}
                      <div className="space-y-2">
                        {boards.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((board, idx, arr) => {
                              const summary = boardSummaries.find(s => s.id === board.id);
                              const categoryCount = summary?.categoryCount || 0;
                              const totalQuestions = summary?.categories.reduce((sum, c) => sum + c.questionCount, 0) || 0;
                              const maxQuestions = 25;
                              const progressPercent = Math.min(100, Math.round((totalQuestions / maxQuestions) * 100));
                              const isComplete = categoryCount >= 5 && totalQuestions >= maxQuestions;
                              const isEditing = editingBoardId === board.id;
                              const isDragging = draggedBoardId === board.id;
                              const isDragOver = dragOverBoardId === board.id && draggedBoardId !== board.id;
                              
                              const handleDragStart = (e: React.DragEvent) => {
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedBoardId(board.id);
                              };
                              const handleDragOver = (e: React.DragEvent) => {
                                e.preventDefault();
                                if (draggedBoardId && draggedBoardId !== board.id) {
                                  setDragOverBoardId(board.id);
                                }
                              };
                              const handleDragLeave = () => setDragOverBoardId(null);
                              const handleDrop = () => {
                                if (draggedBoardId && draggedBoardId !== board.id) {
                                  const currentBoards = [...arr];
                                  const draggedIdx = currentBoards.findIndex(b => b.id === draggedBoardId);
                                  const dropIdx = idx;
                                  if (draggedIdx !== -1 && dropIdx !== -1 && draggedIdx !== dropIdx) {
                                    const [moved] = currentBoards.splice(draggedIdx, 1);
                                    currentBoards.splice(dropIdx, 0, moved);
                                    const updates = currentBoards.map((b, i) => ({ id: b.id, sortOrder: i }));
                                    reorderBoardsSilent(updates);
                                  }
                                }
                                setDraggedBoardId(null);
                                setDragOverBoardId(null);
                              };
                              const handleDragEnd = () => {
                                setDraggedBoardId(null);
                                setDragOverBoardId(null);
                              };
                              
                              const isExpanded = expandedBoardIds.has(board.id);
                              const toggleExpand = (e: React.MouseEvent) => {
                                e.stopPropagation();
                                setExpandedBoardIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(board.id)) next.delete(board.id);
                                  else next.add(board.id);
                                  return next;
                                });
                              };
                              
                              const statusBg = getStatusColor(totalQuestions, maxQuestions);
                              
                              return (
                                <div key={board.id} className="space-y-1">
                                  {/* Board Header */}
                                  <div
                                    draggable={!isEditing}
                                    onDragStart={handleDragStart}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onDragEnd={handleDragEnd}
                                    className={`p-2 rounded-lg cursor-pointer transition-all border ${
                                      selectedBoardId === board.id && !selectedBoardCategoryId
                                        ? 'bg-primary/20 border-2 border-primary'
                                        : selectedBoardId === board.id
                                          ? 'bg-primary/10 border-primary/50'
                                          : isDragOver
                                            ? 'bg-primary/10 border-2 border-dashed border-primary'
                                            : statusBg + ' hover:border-primary/30'
                                    } ${isDragging ? 'opacity-50' : ''}`}
                                    onClick={() => { 
                                      if (!isEditing) { 
                                        setSelectedBoardId(board.id); 
                                        setSelectedBoardCategoryId(null); 
                                      } 
                                    }}
                                    data-testid={`board-item-${board.id}`}
                                  >
                                    {isEditing ? (
                                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                        {editBoardName !== '' && (
                                          <div className="flex items-center gap-1">
                                            <Input
                                              value={editBoardName}
                                              onChange={(e) => setEditBoardName(e.target.value)}
                                              placeholder="Board name"
                                              className="h-7 text-sm"
                                              autoFocus
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' && editBoardName.trim()) {
                                                  updateBoardMutation.mutate({ id: board.id, name: editBoardName.trim() });
                                                }
                                                if (e.key === 'Escape') {
                                                  setEditingBoardId(null);
                                                  setEditBoardName('');
                                                }
                                              }}
                                              data-testid={`input-edit-board-${board.id}`}
                                            />
                                            <Button size="icon" variant="ghost" onClick={() => { if (editBoardName.trim()) updateBoardMutation.mutate({ id: board.id, name: editBoardName.trim() }); }} className="h-7 w-7 text-primary shrink-0" data-testid={`button-save-board-${board.id}`}>
                                              <Check className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" onClick={() => { setEditingBoardId(null); setEditBoardName(''); }} className="h-7 w-7 text-muted-foreground shrink-0" data-testid={`button-cancel-edit-board-${board.id}`}>
                                              <X className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        )}
                                        {editBoardDescription !== undefined && editBoardName === '' && (
                                          <div className="flex items-start gap-1">
                                            <Input
                                              value={editBoardDescription}
                                              onChange={(e) => setEditBoardDescription(e.target.value)}
                                              placeholder="Board description (optional)"
                                              className="h-7 text-sm flex-1"
                                              autoFocus
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  updateBoardMutation.mutate({ id: board.id, description: editBoardDescription.trim() });
                                                  setEditingBoardId(null);
                                                  setEditBoardDescription('');
                                                }
                                                if (e.key === 'Escape') {
                                                  setEditingBoardId(null);
                                                  setEditBoardDescription('');
                                                }
                                              }}
                                              data-testid={`input-edit-board-desc-${board.id}`}
                                            />
                                            <Button size="icon" variant="ghost" onClick={() => { updateBoardMutation.mutate({ id: board.id, description: editBoardDescription.trim() }); setEditingBoardId(null); setEditBoardDescription(''); }} className="h-7 w-7 text-primary shrink-0" data-testid={`button-save-board-desc-${board.id}`}>
                                              <Check className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" onClick={() => { setEditingBoardId(null); setEditBoardDescription(''); }} className="h-7 w-7 text-muted-foreground shrink-0" data-testid={`button-cancel-edit-board-desc-${board.id}`}>
                                              <X className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
                                        {!sidebarCollapsed && (
                                          <button
                                            onClick={toggleExpand}
                                            className="p-0.5 hover:bg-muted/50 rounded shrink-0"
                                            data-testid={`button-expand-${board.id}`}
                                          >
                                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                                          </button>
                                        )}
                                        {!sidebarCollapsed && <GripVertical className="w-3 h-3 text-muted-foreground/40 cursor-grab shrink-0" />}
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-2">
                                                <span className={`font-semibold text-foreground ${sidebarCollapsed ? 'text-xs text-center w-full' : 'text-sm truncate'}`}>
                                                  {sidebarCollapsed ? (board.name.slice(0, 2).toUpperCase() || board.name.charAt(0).toUpperCase() || '#') : board.name}
                                                </span>
                                                {!sidebarCollapsed && (
                                                  <span className={`text-[10px] shrink-0 ${isComplete ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                                    {categoryCount}/5
                                                  </span>
                                                )}
                                              </div>
                                              {!sidebarCollapsed && (
                                                <div className="mt-1">
                                                  <ProgressBar value={totalQuestions} max={25} size="sm" />
                                                </div>
                                              )}
                                            </div>
                                          </TooltipTrigger>
                                          {sidebarCollapsed && (
                                            <TooltipContent side="right">
                                              <p>{board.name}</p>
                                              <p className="text-xs text-muted-foreground">{totalQuestions}/25 questions</p>
                                            </TooltipContent>
                                          )}
                                        </Tooltip>
                                        {!sidebarCollapsed && (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                              <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" data-testid={`button-board-menu-${board.id}`}>
                                                <MoreVertical className="w-3.5 h-3.5" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44">
                                              <DropdownMenuItem onClick={() => window.open(`/board/${board.id}`, '_blank')} data-testid={`menu-preview-${board.id}`}>
                                                <Eye className="w-4 h-4 mr-2" /> Preview
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => { setEditingBoardId(board.id); setEditBoardName(board.name); }} data-testid={`menu-rename-${board.id}`}>
                                                <Pencil className="w-4 h-4 mr-2" /> Rename
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => { setEditingBoardId(board.id); setEditBoardName(''); setEditBoardDescription(board.description || ''); }} data-testid={`menu-edit-desc-${board.id}`}>
                                                <FileText className="w-4 h-4 mr-2" /> Edit Description
                                              </DropdownMenuItem>
                                              <DropdownMenuItem 
                                                onSelect={(e) => {
                                                  e.preventDefault();
                                                  setTimeout(() => setDeleteBoardConfirmId(board.id), 0);
                                                }} 
                                                className="text-destructive focus:text-destructive" 
                                                data-testid={`menu-delete-${board.id}`}
                                              >
                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Nested Categories - only show when sidebar expanded */}
                                  {!sidebarCollapsed && isExpanded && summary?.categories && (
                                    <div className="ml-6 pl-2 border-l-2 border-border/50 space-y-0.5">
                                      {summary.categories.map(cat => {
                                        const isSelected = selectedBoardId === board.id && 
                                          boardCategories.find(bc => bc.categoryId === cat.id)?.id === selectedBoardCategoryId;
                                        const catComplete = cat.questionCount >= 5;
                                        return (
                                          <button
                                            key={cat.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedBoardId(board.id);
                                              const bc = boardCategories.find(bc => bc.categoryId === cat.id) || 
                                                allBoardSummaries.find(bs => bs.id === board.id)?.categories.find(c => c.id === cat.id);
                                              if (bc) {
                                                // Find boardCategoryId for this category in this board
                                                const matchingBc = boardCategories.find(b => b.categoryId === cat.id);
                                                if (matchingBc) setSelectedBoardCategoryId(matchingBc.id);
                                              }
                                            }}
                                            className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors ${
                                              isSelected 
                                                ? 'bg-primary/20 text-primary font-medium' 
                                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                            }`}
                                            data-testid={`sidebar-category-${cat.id}`}
                                          >
                                            <span className="truncate flex-1">{cat.name}</span>
                                            <div className="w-12 shrink-0">
                                              <ProgressBar value={cat.questionCount} max={5} size="sm" />
                                            </div>
                                          </button>
                                        );
                                      })}
                                      {summary.categories.length === 0 && (
                                        <p className="text-[10px] text-muted-foreground/70 py-1 px-2">No categories yet</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                      </div>

                      {boards.length === 0 && (
                        <div className="text-center py-6 px-3">
                          <Grid3X3 className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm mb-1">No boards yet</p>
                          <p className="text-muted-foreground/70 text-xs">Click + above to create your first game board</p>
                        </div>
                      )}

                      {unlinkedCategories.length > 0 && (
                        <Collapsible className="mt-4 pt-4 border-t border-border">
                          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-muted/50 rounded-md text-sm text-muted-foreground">
                            <ChevronRight className="w-4 h-4 transition-transform data-[state=open]:rotate-90" />
                            <FolderPlus className="w-4 h-4" />
                            <span>Unlinked Categories</span>
                            <Badge variant="secondary" className="ml-auto text-xs">{unlinkedCategories.length}</Badge>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2 space-y-1 px-2">
                            {unlinkedCategories.map(cat => (
                              <div 
                                key={cat.id} 
                                className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-sm"
                              >
                                <span className="truncate flex-1">{cat.name}</span>
                                <div className="flex gap-1">
                                  {selectedBoardId && boardCategories.length < 5 && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          size="icon" 
                                          variant="ghost" 
                                          className="h-6 w-6"
                                          onClick={() => linkCategoryMutation.mutate({ boardId: selectedBoardId, categoryId: cat.id })}
                                          data-testid={`button-link-orphan-${cat.id}`}
                                        >
                                          <Link2 className="w-3 h-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Link to current board</TooltipContent>
                                    </Tooltip>
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-6 w-6 text-destructive hover:text-destructive"
                                        onClick={() => deleteCategoryMutation.mutate(cat.id)}
                                        data-testid={`button-delete-orphan-${cat.id}`}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete permanently</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:col-span-11' : 'lg:col-span-9'}`}>
            <Card className="bg-card border-border shadow-sm h-full flex flex-col">
              {/* Breadcrumb Navigation */}
              <div className="border-b border-border px-4 py-2 bg-muted/10 flex items-center gap-2 text-sm">
                <button 
                  onClick={() => { setSelectedBoardId(null); setSelectedBoardCategoryId(null); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="breadcrumb-boards"
                >
                  Boards
                </button>
                {selectedBoard && (
                  <>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    <button 
                      onClick={() => setSelectedBoardCategoryId(null)}
                      className={`font-medium transition-colors ${selectedBoardCategoryId ? 'text-muted-foreground hover:text-foreground' : 'text-primary'}`}
                      data-testid="breadcrumb-board"
                    >
                      {selectedBoard.name}
                    </button>
                    {(() => {
                      const summary = boardSummaries.find(s => s.id === selectedBoardId);
                      const totalQ = summary?.categories.reduce((sum, c) => sum + c.questionCount, 0) || 0;
                      return (
                        <div className="flex items-center gap-2 ml-1">
                          <div className="w-16">
                            <ProgressBar value={totalQ} max={25} size="sm" />
                          </div>
                          <span className="text-xs text-muted-foreground">{totalQ}/25</span>
                        </div>
                      );
                    })()}
                  </>
                )}
                {selectedBoardCategory && (
                  <>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    <span className="font-medium text-primary" data-testid="breadcrumb-category">
                      {selectedBoardCategory.category.name}
                    </span>
                    <div className="flex items-center gap-2 ml-1">
                      <div className="w-12">
                        <ProgressBar value={questions.length} max={5} size="sm" />
                      </div>
                      <span className="text-xs text-muted-foreground">{questions.length}/5</span>
                    </div>
                  </>
                )}
              </div>

              {!selectedBoardId ? (
                /* Progress Dashboard - shows when no board selected */
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="max-w-3xl mx-auto space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-xl font-semibold text-foreground mb-2">Progress Dashboard</h2>
                      <p className="text-muted-foreground">Overview of all your game boards</p>
                    </div>
                    
                    {boards.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                        <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No boards yet</h3>
                        <p className="text-muted-foreground mb-4">Create your first game board to get started</p>
                        <Button onClick={() => setShowNewBoardForm(true)} data-testid="button-create-first-board">
                          <Plus className="w-4 h-4 mr-2" /> Create Board
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Summary stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-4 rounded-xl bg-muted/30 border border-border">
                            <div className="text-2xl font-bold text-foreground">{boards.length}</div>
                            <div className="text-sm text-muted-foreground">Total Boards</div>
                          </div>
                          <div className="p-4 rounded-xl bg-muted/30 border border-border">
                            <div className="text-2xl font-bold text-foreground">
                              {boardSummaries.reduce((sum, b) => sum + b.categoryCount, 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Categories</div>
                          </div>
                          <div className="p-4 rounded-xl bg-muted/30 border border-border">
                            <div className="text-2xl font-bold text-foreground">
                              {boardSummaries.reduce((sum, b) => sum + b.categories.reduce((s, c) => s + c.questionCount, 0), 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Questions</div>
                          </div>
                        </div>

                        {/* Next actions */}
                        {(() => {
                          const incompleteBoards = boardSummaries.filter(b => {
                            const totalQ = b.categories.reduce((sum, c) => sum + c.questionCount, 0);
                            return totalQ < 25;
                          });
                          const incompleteCats = boardSummaries.flatMap(b => 
                            b.categories.filter(c => c.questionCount < 5).map(c => ({ ...c, boardName: b.name, boardId: b.id }))
                          );
                          
                          if (incompleteBoards.length === 0) {
                            return (
                              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                <p className="text-emerald-700 dark:text-emerald-400 font-medium">All boards complete!</p>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="space-y-3">
                              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                Next Actions
                              </h3>
                              <div className="space-y-2">
                                {incompleteCats.slice(0, 5).map(cat => (
                                  <button
                                    key={`${cat.boardId}-${cat.id}`}
                                    onClick={() => {
                                      setSelectedBoardId(cat.boardId);
                                      // Find the boardCategoryId
                                      const bc = allBoardSummaries.find(bs => bs.id === cat.boardId)?.categories.find(c => c.id === cat.id);
                                      if (bc) {
                                        // Will be set when boardCategories loads
                                      }
                                    }}
                                    className="w-full flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors text-left"
                                    data-testid={`action-category-${cat.id}`}
                                  >
                                    <div>
                                      <span className="text-sm font-medium text-foreground">{cat.name}</span>
                                      <span className="text-xs text-muted-foreground ml-2">in {cat.boardName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-amber-600 dark:text-amber-400">Needs {5 - cat.questionCount} more</span>
                                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="border-b border-border px-4 py-3 bg-muted/20">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <FolderPlus className="w-5 h-5 text-primary" />
                        <span className="text-sm font-semibold uppercase tracking-wide text-foreground">Categories</span>
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
                                rule: newCategoryRule.trim() || undefined,
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
                            placeholder="Rule (e.g., 'Reverse spelling for 2nd word')"
                            value={newCategoryRule}
                            onChange={(e) => setNewCategoryRule(e.target.value)}
                            className="h-8 text-sm"
                            data-testid="input-category-rule"
                          />
                          {unlinkedCategories.length > 0 && (
                            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">Or link existing:</span>
                              <Select onValueChange={(catId) => {
                                if (catId && selectedBoardId) {
                                  linkCategoryMutation.mutate({ boardId: selectedBoardId, categoryId: Number(catId) });
                                }
                              }}>
                                <SelectTrigger className="h-7 text-xs flex-1" data-testid="select-link-existing-category">
                                  <SelectValue placeholder="Choose category..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {unlinkedCategories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id.toString()}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {boardCategories.length === 0 && !loadingBoardCategories && (
                      <p className="text-center text-muted-foreground text-xs py-2">
                        No categories yet. Add one to get started!
                      </p>
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
                          <p className="text-muted-foreground max-w-sm mb-4">
                            {boardCategories.length > 0 
                              ? "Click on a category in the sidebar to view and manage its questions"
                              : "Add a category first, then click it to add questions"}
                          </p>
                          {boardCategories.length === 0 && boardCategories.length < 5 && (
                            <Button 
                              onClick={() => setShowNewCategoryForm(true)}
                              data-testid="button-add-category-empty"
                            >
                              <Plus className="w-4 h-4 mr-2" /> Add Category
                            </Button>
                          )}
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
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{selectedBc.category.name}</h3>
                              <span className={`text-xs ${(selectedBc.questionCount ?? 0) >= 5 ? 'text-primary' : 'text-muted-foreground'}`}>
                                ({selectedBc.questionCount ?? 0}/5)
                              </span>
                            </div>
                            {selectedBc.category.rule && (
                              <p className="text-xs text-primary mt-0.5">Rule: {selectedBc.category.rule}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => moveCategory(selectedIdx, 'up')} disabled={selectedIdx === 0} className="h-7 w-7 text-muted-foreground" data-testid={`button-move-left-${selectedBc.id}`} title="Move left">
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => moveCategory(selectedIdx, 'down')} disabled={selectedIdx === boardCategories.length - 1} className="h-7 w-7 text-muted-foreground" data-testid={`button-move-right-${selectedBc.id}`} title="Move right">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                            <div className="w-px h-4 bg-border mx-1" />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 text-muted-foreground" 
                                  onClick={() => window.open(`/board/${selectedBoardId}`, '_blank')}
                                  data-testid={`button-preview-category-${selectedBc.category.id}`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Preview board</TooltipContent>
                            </Tooltip>
                            <Button size="icon" variant="ghost" onClick={() => { setEditingCategoryId(selectedBc.category.id); setEditCategoryName(selectedBc.category.name); setEditCategoryDescription(selectedBc.category.description || ''); setEditCategoryRule(selectedBc.category.rule || ''); }} className="h-7 w-7 text-muted-foreground" data-testid={`button-edit-category-${selectedBc.category.id}`} title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 text-muted-foreground hover:text-orange-500" 
                                  onClick={() => {
                                    setSelectedBoardCategoryId(null);
                                    unlinkCategoryMutation.mutate(selectedBc.id);
                                  }}
                                  data-testid={`button-unlink-category-${selectedBc.id}`}
                                >
                                  <Unlink className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove from board (keeps category)</TooltipContent>
                            </Tooltip>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" data-testid={`button-delete-category-${selectedBc.category.id}`} title="Delete permanently">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete "{selectedBc.category.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this category and all its questions. To just remove it from this board, use the unlink button instead.
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
                                    Delete Permanently
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
                              value={editCategoryRule}
                              onChange={(e) => setEditCategoryRule(e.target.value)}
                              placeholder="Rule (e.g., 'Reverse spelling for 2')"
                            />
                            <Input
                              value={editCategoryDescription}
                              onChange={(e) => setEditCategoryDescription(e.target.value)}
                              placeholder="Description (optional)"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateCategoryMutation.mutate({ id: editingCategoryId, name: editCategoryName.trim(), description: editCategoryDescription.trim(), rule: editCategoryRule.trim() });
                                } else if (e.key === 'Escape') {
                                  setEditingCategoryId(null);
                                }
                              }}
                            />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => setEditingCategoryId(null)}>Cancel</Button>
                              <Button size="sm" onClick={() => updateCategoryMutation.mutate({ id: editingCategoryId, name: editCategoryName.trim(), description: editCategoryDescription.trim(), rule: editCategoryRule.trim() })}>Save</Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Add/Import forms - hidden when 5 questions exist */}
                    {questions.length < 5 && (
                    <>
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

                          <div className="flex gap-3 items-center">
                            <Input
                              placeholder="Image URL (optional)"
                              value={newImageUrl}
                              onChange={(e) => setNewImageUrl(e.target.value)}
                              className="flex-1"
                              data-testid="input-image-url"
                            />
                            {newImageUrl && (
                              <img 
                                src={newImageUrl} 
                                alt="Preview" 
                                className="h-10 w-10 object-cover rounded border"
                                onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                              />
                            )}
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
                    </>
                    )}

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
                                  <div className="flex gap-2 items-center">
                                    <Input 
                                      value={editImageUrl} 
                                      onChange={(e) => setEditImageUrl(e.target.value)} 
                                      placeholder="Image URL (optional)" 
                                      className="flex-1" 
                                    />
                                    {editImageUrl && (
                                      <img 
                                        src={editImageUrl} 
                                        alt="Preview" 
                                        className="h-10 w-10 object-cover rounded border"
                                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                      />
                                    )}
                                  </div>
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
                                    <Button size="sm" onClick={() => updateQuestionMutation.mutate({ id: q.id, question: editQuestion, correctAnswer: editCorrectAnswer, points: editPoints, imageUrl: editImageUrl.trim() || undefined })}>
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
                                      {q.imageUrl && (
                                        <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded flex items-center gap-1">
                                          <Image className="w-3 h-3" /> Image
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-foreground">{q.question.replace(/!\[.*?\]\(.*?\)/g, '[image]').replace(/<audio.*?<\/audio>/g, '[audio]')}</p>
                                    <p className="text-xs text-primary mt-1">Answer: {q.correctAnswer}</p>
                                    {q.imageUrl && (
                                      <img 
                                        src={q.imageUrl} 
                                        alt="Question" 
                                        className="mt-2 max-h-20 rounded border object-contain"
                                      />
                                    )}
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
                        <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                          <HelpCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-muted-foreground mb-3">No questions yet</p>
                          <Button 
                            variant="outline" 
                            onClick={() => setQuestionFormOpen(true)}
                            data-testid="button-add-first-question"
                          >
                            <Plus className="w-4 h-4 mr-2" /> Add First Question
                          </Button>
                        </div>
                      )}
                      
                      {/* Quick-add inline form */}
                      {questions.length > 0 && questions.length < 5 && availablePoints.length > 0 && (
                        <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-dashed border-border">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Quick add: Type question..."
                              value={quickAddQuestion}
                              onChange={(e) => setQuickAddQuestion(e.target.value)}
                              className="flex-1 h-9 text-sm"
                              disabled={createQuestionMutation.isPending}
                              data-testid="input-quick-question"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && quickAddQuestion.trim() && quickAddAnswer.trim() && !createQuestionMutation.isPending) {
                                  const pointsToUse = availablePoints[0];
                                  createQuestionMutation.mutate({
                                    categoryId: selectedCategoryId!,
                                    question: quickAddQuestion.trim(),
                                    correctAnswer: quickAddAnswer.trim(),
                                    points: pointsToUse,
                                    options: [],
                                  });
                                  setQuickAddQuestion("");
                                  setQuickAddAnswer("");
                                }
                              }}
                            />
                            <Input
                              placeholder="Answer"
                              value={quickAddAnswer}
                              onChange={(e) => setQuickAddAnswer(e.target.value)}
                              className="w-32 h-9 text-sm"
                              disabled={createQuestionMutation.isPending}
                              data-testid="input-quick-answer"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && quickAddQuestion.trim() && quickAddAnswer.trim() && !createQuestionMutation.isPending) {
                                  const pointsToUse = availablePoints[0];
                                  createQuestionMutation.mutate({
                                    categoryId: selectedCategoryId!,
                                    question: quickAddQuestion.trim(),
                                    correctAnswer: quickAddAnswer.trim(),
                                    points: pointsToUse,
                                    options: [],
                                  });
                                  setQuickAddQuestion("");
                                  setQuickAddAnswer("");
                                }
                              }}
                            />
                            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded whitespace-nowrap">
                              {availablePoints[0]} pts
                            </span>
                            <Button
                              size="sm"
                              disabled={!quickAddQuestion.trim() || !quickAddAnswer.trim() || createQuestionMutation.isPending}
                              onClick={() => {
                                const pointsToUse = availablePoints[0];
                                createQuestionMutation.mutate({
                                  categoryId: selectedCategoryId!,
                                  question: quickAddQuestion.trim(),
                                  correctAnswer: quickAddAnswer.trim(),
                                  points: pointsToUse,
                                  options: [],
                                });
                                setQuickAddQuestion("");
                                setQuickAddAnswer("");
                              }}
                              data-testid="button-quick-add"
                            >
                              {createQuestionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            Press Enter to add · Uses next available points ({availablePoints[0]})
                          </p>
                        </div>
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
      </main>

      <AlertDialog open={deleteBoardConfirmId !== null} onOpenChange={(open) => !open && setDeleteBoardConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this board and unlink all its categories. The categories and their questions will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-board">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteBoardConfirmId) {
                  deleteBoardMutation.mutate(deleteBoardConfirmId);
                  setDeleteBoardConfirmId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-board"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
