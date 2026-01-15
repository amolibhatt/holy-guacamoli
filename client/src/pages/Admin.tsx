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
import { Plus, Trash2, FolderPlus, HelpCircle, ArrowLeft, ArrowRight, Loader2, Pencil, X, Check, Image, Music, Grid3X3, Link2, Unlink, ChevronRight, ArrowUp, ArrowDown, CheckCircle, ChevronDown, GripVertical, Sparkles, Upload, FileText, Eye, Download, FileUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import MDEditor from '@uiw/react-md-editor';
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import type { Category, Question, Board, BoardCategoryWithCount } from "@shared/schema";
import { useUpload } from "@/hooks/use-upload";

const ALL_POINT_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

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

  const [newQuestion, setNewQuestion] = useState("");
  const [newCorrectAnswer, setNewCorrectAnswer] = useState("");
  const [newPoints, setNewPoints] = useState<number>(10);

  const [editQuestion, setEditQuestion] = useState("");
  const [editCorrectAnswer, setEditCorrectAnswer] = useState("");
  const [editPoints, setEditPoints] = useState<number>(10);

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
  const [myBoardsOpen, setMyBoardsOpen] = useState(true);
  const [starterPacksOpen, setStarterPacksOpen] = useState(true);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [bulkPreviewMode, setBulkPreviewMode] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const editAudioInputRef = useRef<HTMLInputElement>(null);
  const excelImportInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const { data: boards = [], isLoading: loadingBoards } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
    enabled: isAuthenticated,
  });

  type BoardSummary = { id: number; name: string; categoryCount: number; categories: { id: number; name: string; questionCount: number; remaining: number }[] };
  const { data: boardSummaries = [] } = useQuery<BoardSummary[]>({
    queryKey: ['/api/boards/summary'],
    enabled: isAuthenticated,
  });

  const { data: allCategories = [] } = useQuery<Category[]>({
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
    mutationFn: async ({ id, name, theme, isGlobal, sortOrder }: { id: number; name?: string; theme?: string; isGlobal?: boolean; sortOrder?: number }) => {
      return apiRequest('PUT', `/api/boards/${id}`, { name, theme, isGlobal, sortOrder });
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
                      {/* My Boards Section */}
                      <Collapsible open={myBoardsOpen} onOpenChange={setMyBoardsOpen}>
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center gap-2 mb-2 px-1 w-full hover:opacity-80 transition-opacity">
                            <Grid3X3 className="w-3 h-3 text-primary" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">My Boards</span>
                            <span className="text-xs text-muted-foreground">({boards.filter(b => !b.isGlobal).length})</span>
                            <ChevronDown className={`w-3 h-3 text-muted-foreground ml-auto transition-transform ${myBoardsOpen ? '' : '-rotate-90'}`} />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-2">
                            {boards.filter(b => !b.isGlobal).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((board, idx, arr) => {
                              const summary = boardSummaries.find(s => s.id === board.id);
                              const categoryCount = summary?.categoryCount || 0;
                              const totalQuestions = summary?.categories.reduce((sum, c) => sum + c.questionCount, 0) || 0;
                              const maxQuestions = 25;
                              const progressPercent = Math.round((totalQuestions / maxQuestions) * 100);
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
                              
                              return (
                                <div
                                  key={board.id}
                                  draggable={!isEditing}
                                  onDragStart={handleDragStart}
                                  onDragOver={handleDragOver}
                                  onDragLeave={handleDragLeave}
                                  onDrop={handleDrop}
                                  onDragEnd={handleDragEnd}
                                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                                    selectedBoardId === board.id
                                      ? 'bg-primary/20 border-2 border-primary'
                                      : isDragOver
                                        ? 'bg-primary/10 border-2 border-dashed border-primary'
                                        : 'bg-muted/20 border border-border hover:bg-muted/30'
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
                                      <Button size="icon" variant="ghost" onClick={() => { if (editBoardName.trim()) updateBoardMutation.mutate({ id: board.id, name: editBoardName.trim() }); }} className="h-7 w-7 text-primary shrink-0" data-testid={`button-save-board-${board.id}`}>
                                        <Check className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button size="icon" variant="ghost" onClick={() => setEditingBoardId(null)} className="h-7 w-7 text-muted-foreground shrink-0" data-testid={`button-cancel-edit-board-${board.id}`}>
                                        <X className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-start gap-2">
                                      <GripVertical className="w-3 h-3 text-muted-foreground/50 mt-1 cursor-grab shrink-0" />
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="w-10 h-10 rounded bg-muted/50 border border-border grid grid-cols-5 grid-rows-5 gap-px p-0.5 shrink-0">
                                            {Array.from({ length: 25 }).map((_, i) => {
                                              const catIdx = Math.floor(i / 5);
                                              const cat = summary?.categories[catIdx];
                                              const hasCat = catIdx < categoryCount;
                                              const hasQ = cat && i % 5 < cat.questionCount;
                                              return (
                                                <div key={i} className={`rounded-sm ${hasQ ? 'bg-primary' : hasCat ? 'bg-primary/30' : 'bg-muted-foreground/10'}`} />
                                              );
                                            })}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="text-xs">
                                          5x5 grid: {categoryCount} categories, {totalQuestions} questions
                                        </TooltipContent>
                                      </Tooltip>
                                      <div className="min-w-0 flex-1">
                                        <div className="font-medium text-foreground text-sm truncate">{board.name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div 
                                              className={`h-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-primary'}`}
                                              style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                            />
                                          </div>
                                          <span className={`text-[10px] ${isComplete ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                            {progressPercent}%
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center shrink-0">
                                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); window.open(`/board/${board.id}`, '_blank'); }} className="h-6 w-6 text-muted-foreground hover:text-primary" data-testid={`button-preview-board-${board.id}`} title="Preview">
                                          <Eye className="w-3 h-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingBoardId(board.id); setEditBoardName(board.name); }} className="h-6 w-6 text-muted-foreground hover:text-primary" data-testid={`button-edit-board-${board.id}`} title="Rename">
                                          <Pencil className="w-3 h-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteBoardMutation.mutate(board.id); }} className="h-6 w-6 text-muted-foreground hover:text-destructive" data-testid={`button-delete-board-${board.id}`} title="Delete">
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {boards.filter(b => !b.isGlobal).length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-2">No boards yet. Click + to create one!</p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Starter Packs Section */}
                      {boards.filter(b => b.isGlobal).length > 0 && (
                        <Collapsible open={starterPacksOpen} onOpenChange={setStarterPacksOpen}>
                          <CollapsibleTrigger asChild>
                            <button className="flex items-center gap-2 mb-2 px-1 w-full hover:opacity-80 transition-opacity">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Starter Packs</span>
                              <span className="text-xs text-muted-foreground">({boards.filter(b => b.isGlobal).length})</span>
                              <ChevronDown className={`w-3 h-3 text-muted-foreground ml-auto transition-transform ${starterPacksOpen ? '' : '-rotate-90'}`} />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                          <div className="space-y-2">
                            {boards.filter(b => b.isGlobal).map(board => {
                    const summary = boardSummaries.find(s => s.id === board.id);
                    const categoryCount = summary?.categoryCount || 0;
                    const totalQuestions = summary?.categories.reduce((sum, c) => sum + c.questionCount, 0) || 0;
                    const maxQuestions = categoryCount * 5;
                    const categoryProgress = (categoryCount / 5) * 100;
                    const questionProgress = maxQuestions > 0 ? (totalQuestions / maxQuestions) * 100 : 0;
                    const isComplete = categoryCount >= 5 && totalQuestions >= maxQuestions && maxQuestions > 0;
                    const isIncomplete = categoryCount < 5 || totalQuestions < maxQuestions;
                    const isEditing = editingBoardId === board.id;
                    const pastelColors: Record<string, { bg: string; title: string; sub: string; icon: string }> = {
                      violet: { bg: 'from-violet-500/30 to-violet-600/15 border-violet-400/50', title: 'text-violet-900', sub: 'text-violet-700', icon: 'text-violet-600' },
                      cyan: { bg: 'from-cyan-500/30 to-cyan-600/15 border-cyan-400/50', title: 'text-cyan-900', sub: 'text-cyan-700', icon: 'text-cyan-600' },
                      orange: { bg: 'from-orange-500/30 to-orange-600/15 border-orange-400/50', title: 'text-orange-900', sub: 'text-orange-700', icon: 'text-orange-600' },
                      green: { bg: 'from-green-500/30 to-green-600/15 border-green-400/50', title: 'text-green-900', sub: 'text-green-700', icon: 'text-green-600' },
                      pink: { bg: 'from-pink-500/30 to-pink-600/15 border-pink-400/50', title: 'text-pink-900', sub: 'text-pink-700', icon: 'text-pink-600' },
                      blue: { bg: 'from-blue-500/30 to-blue-600/15 border-blue-400/50', title: 'text-blue-900', sub: 'text-blue-700', icon: 'text-blue-600' },
                      red: { bg: 'from-red-500/30 to-red-600/15 border-red-400/50', title: 'text-red-900', sub: 'text-red-700', icon: 'text-red-600' },
                      yellow: { bg: 'from-yellow-500/30 to-yellow-600/15 border-yellow-400/50', title: 'text-yellow-900', sub: 'text-yellow-700', icon: 'text-yellow-600' },
                    };
                    const colorCode = board.colorCode || 'violet';
                    const colorConfig = pastelColors[colorCode] || pastelColors.violet;
                    return (
                      <div
                        key={board.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all bg-gradient-to-br ${
                          selectedBoardId === board.id
                            ? `${colorConfig.bg} border-2 border-primary`
                            : `${colorConfig.bg} border hover:opacity-80`
                        }`}
                        onClick={() => { 
                          if (!isEditing) { 
                            setSelectedBoardId(board.id); 
                            setSelectedBoardCategoryId(null); 
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
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <div className={`font-semibold truncate ${colorConfig.title}`}>{board.name}</div>
                              {board.description && (
                                <div className={`text-xs truncate ${colorConfig.sub}`}>{board.description}</div>
                              )}
                              <div className={`text-[10px] mt-1 ${colorConfig.sub}`}>
                                {categoryCount}/5 · {totalQuestions} Q
                                {isComplete && <span className="text-emerald-600 ml-1">✓</span>}
                              </div>
                            </div>
                            <div className="flex items-center shrink-0">
                              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); window.open(`/board/${board.id}`, '_blank'); }} className={`h-6 w-6 ${colorConfig.icon} hover:opacity-80`} data-testid={`button-preview-board-${board.id}`} title="Preview">
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingBoardId(board.id); setEditBoardName(board.name); }} className={`h-6 w-6 ${colorConfig.icon} hover:opacity-80`} data-testid={`button-edit-board-${board.id}`} title="Rename">
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteBoardMutation.mutate(board.id); }} className={`h-6 w-6 ${colorConfig.icon} hover:text-red-500`} data-testid={`button-delete-board-${board.id}`} title="Delete">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                              </div>
                            );
                          })}
                          </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {boards.length === 0 && (
                        <div className="text-center py-6 px-3">
                          <Grid3X3 className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm mb-1">No boards yet</p>
                          <p className="text-muted-foreground/70 text-xs">Click + above to create your first game board</p>
                        </div>
                      )}
                    </>
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
                            placeholder="Short description (shown as tooltip)"
                            value={newCategoryDescription}
                            onChange={(e) => setNewCategoryDescription(e.target.value)}
                            className="h-8 text-sm"
                            data-testid="input-category-description"
                          />
                          <Input
                            placeholder="Rule (e.g., 'Reverse spelling for 2nd word')"
                            value={newCategoryRule}
                            onChange={(e) => setNewCategoryRule(e.target.value)}
                            className="h-8 text-sm"
                            data-testid="input-category-rule"
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
                            <Button size="icon" variant="ghost" onClick={() => { setEditingCategoryId(selectedBc.category.id); setEditCategoryName(selectedBc.category.name); setEditCategoryDescription(selectedBc.category.description || ''); setEditCategoryRule(selectedBc.category.rule || ''); }} className="h-7 w-7 text-muted-foreground" data-testid={`button-edit-category-${selectedBc.category.id}`} title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => unlinkCategoryMutation.mutate(selectedBc.id)} className="h-7 w-7 text-muted-foreground" data-testid={`button-unlink-${selectedBc.id}`} title="Unlink">
                              <Unlink className="w-3.5 h-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" data-testid={`button-delete-category-${selectedBc.category.id}`} title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete "{selectedBc.category.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this category and all its questions.
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
      </main>
    </div>
  );
}
