import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Pencil, Check, X, Grid3X3, ListOrdered, Brain, Clock,
  ChevronRight, Loader2,
  AlertCircle, CheckCircle2, Image, Music, Video,
  Download, Upload, FileSpreadsheet, Smile,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Board, Category, Question } from "@shared/schema";

// Helper to upload a file to object storage
async function uploadFile(file: File): Promise<string> {
  // Step 1: Get presigned URL
  const response = await fetch("/api/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      contentType: file.type,
    }),
  });
  
  if (!response.ok) {
    throw new Error("Failed to get upload URL");
  }
  
  const { uploadURL, objectPath } = await response.json();
  
  // Step 2: Upload directly to storage
  const uploadResponse = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  
  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file");
  }
  
  // Return the served path
  return objectPath;
}

interface GridWithStats extends Board {
  categoryCount: number;
  questionCount: number;
  isActive: boolean;
}

interface CategoryWithQuestions extends Category {
  questionCount: number;
  questions: Question[];
}

const POINT_TIERS = [10, 20, 30, 40, 50];

export default function BlitzGridAdmin() {
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const searchString = useSearch();
  
  const [selectedGridId, setSelectedGridId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [hasInitializedFromUrl, setHasInitializedFromUrl] = useState(false);
  
  const [editingGridId, setEditingGridId] = useState<number | null>(null);
  const [editGridName, setEditGridName] = useState("");
  const [editGridDescription, setEditGridDescription] = useState("");
  
  const [questionForms, setQuestionForms] = useState<Record<string, { 
    question: string; 
    correctAnswer: string; 
    options: string[];
    imageUrl?: string;
    audioUrl?: string;
    videoUrl?: string;
    answerImageUrl?: string;
    answerAudioUrl?: string;
    answerVideoUrl?: string;
  }>>({});
  
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryDescription, setEditCategoryDescription] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showNewGridForm, setShowNewGridForm] = useState(false);
  const [newGridName, setNewGridName] = useState("");
  const [newGridDescription, setNewGridDescription] = useState("");
  const [deletingGridId, setDeletingGridId] = useState<number | null>(null);
  const [selectedPointTier, setSelectedPointTier] = useState<number>(10);
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: grids = [], isLoading: loadingGrids } = useQuery<GridWithStats[]>({
    queryKey: ['/api/blitzgrid/grids'],
    enabled: isAuthenticated,
  });

  // Auto-select grid from URL parameter (e.g., /blitzgrid/admin?grid=123)
  useEffect(() => {
    if (hasInitializedFromUrl || loadingGrids || grids.length === 0) return;
    
    const params = new URLSearchParams(searchString);
    const gridParam = params.get('grid');
    if (gridParam) {
      const gridId = parseInt(gridParam, 10);
      if (!isNaN(gridId) && grids.some(g => g.id === gridId)) {
        setSelectedGridId(gridId);
      }
    }
    setHasInitializedFromUrl(true);
  }, [searchString, grids, loadingGrids, hasInitializedFromUrl]);

  const { data: gridCategories = [], isLoading: loadingCategories } = useQuery<CategoryWithQuestions[]>({
    queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'],
    enabled: !!selectedGridId,
  });

  const updateGridMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: number; name?: string; description?: string }) => {
      return apiRequest('PATCH', `/api/blitzgrid/grids/${id}`, { name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setEditingGridId(null);
      toast({ title: "Grid updated" });
    },
    onError: () => {
      toast({ title: "Couldn't update grid", variant: "destructive" });
    },
  });

  const removeCategoryMutation = useMutation({
    mutationFn: async ({ gridId, categoryId }: { gridId: number; categoryId: number }) => {
      return apiRequest('DELETE', `/api/blitzgrid/grids/${gridId}/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      toast({ title: "Category removed" });
    },
    onError: () => {
      toast({ title: "Couldn't remove category", variant: "destructive" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async ({ gridId, name, description }: { gridId: number; name: string; description?: string }) => {
      const res = await apiRequest('POST', `/api/blitzgrid/grids/${gridId}/categories/create`, { name, description });
      return res.json();
    },
    onSuccess: async (data: any) => {
      // Wait for category list to refetch before setting state
      await queryClient.refetchQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowNewCategoryForm(false);
      
      // Auto-expand and enter edit mode for the new category
      if (data?.id) {
        setSelectedCategoryId(data.id);
        setEditingCategoryId(data.id);
        setEditCategoryName(data.name || "");
        setEditCategoryDescription(data.description || "");
        // Pre-populate empty question forms
        const newForms: Record<string, any> = {};
        POINT_TIERS.forEach(pts => {
          newForms[`${data.id}-${pts}`] = { question: '', correctAnswer: '', options: [] };
        });
        setQuestionForms(prev => ({ ...prev, ...newForms }));
        toast({ title: "Category created - add your questions below" });
      } else {
        toast({ title: "Category created" });
      }
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Couldn't create category", variant: "destructive" });
    },
  });
  
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ categoryId, name, description }: { categoryId: number; name?: string; description?: string }) => {
      return apiRequest('PUT', `/api/categories/${categoryId}`, { name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      setEditingCategoryId(null);
      toast({ title: "Category updated" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Couldn't update category", variant: "destructive" });
    },
  });

  const saveQuestionMutation = useMutation({
    mutationFn: async ({ categoryId, points, question, correctAnswer, options, imageUrl, audioUrl, videoUrl, answerImageUrl, answerAudioUrl, answerVideoUrl }: { 
      categoryId: number; 
      points: number; 
      question: string; 
      correctAnswer: string;
      options: string[];
      imageUrl?: string;
      audioUrl?: string;
      videoUrl?: string;
      answerImageUrl?: string;
      answerAudioUrl?: string;
      answerVideoUrl?: string;
    }) => {
      return apiRequest('POST', `/api/blitzgrid/categories/${categoryId}/questions`, { 
        points, question, correctAnswer, options, imageUrl, audioUrl, videoUrl, answerImageUrl, answerAudioUrl, answerVideoUrl 
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setQuestionForms(prev => {
        const newForms = { ...prev };
        delete newForms[`${variables.categoryId}-${variables.points}`];
        return newForms;
      });
      toast({ title: "Question saved" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Couldn't save question", variant: "destructive" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      return apiRequest('DELETE', `/api/blitzgrid/questions/${questionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      toast({ title: "Question deleted" });
    },
    onError: () => {
      toast({ title: "Couldn't delete question", variant: "destructive" });
    },
  });

  const createGridMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const res = await apiRequest('POST', '/api/blitzgrid/grids', { name, description });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setNewGridName("");
      setNewGridDescription("");
      setShowNewGridForm(false);
      if (data?.id) {
        setSelectedGridId(data.id);
      }
      toast({ title: "Grid created" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Couldn't create grid", variant: "destructive" });
    },
  });

  const deleteGridMutation = useMutation({
    mutationFn: async (gridId: number) => {
      await apiRequest('DELETE', `/api/blitzgrid/grids/${gridId}`);
      return gridId;
    },
    onSuccess: (deletedGridId: number) => {
      // Find the next grid to select before invalidating
      const remainingGrids = grids.filter(g => g.id !== deletedGridId);
      const nextGridId = remainingGrids.length > 0 ? remainingGrids[0].id : null;
      
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      
      if (selectedGridId === deletedGridId) {
        setSelectedGridId(nextGridId);
      }
      setDeletingGridId(null);
      toast({ title: "Grid deleted" });
    },
    onError: () => {
      setDeletingGridId(null);
      toast({ title: "Couldn't delete grid", variant: "destructive" });
    },
  });

  // Auto-select first grid when grids load (makes sidebar view the default)
  useEffect(() => {
    if (grids.length > 0 && selectedGridId === null) {
      setSelectedGridId(grids[0].id);
    }
  }, [grids, selectedGridId]);

  // Clear delete confirmation after 3 seconds
  useEffect(() => {
    if (deletingGridId !== null) {
      const timer = setTimeout(() => setDeletingGridId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [deletingGridId]);

  // Reset all editing state when switching grids to prevent stale state
  useEffect(() => {
    setSelectedCategoryId(null);
    setEditingGridId(null);
    setEditingCategoryId(null);
    setShowNewCategoryForm(false);
    setNewCategoryName("");
    setNewCategoryDescription("");
    setQuestionForms({});
    setDeletingGridId(null);
  }, [selectedGridId]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/blitzgrid/export', { credentials: 'include' });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blitzgrid-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Grids exported successfully" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/blitzgrid/template', { credentials: 'include' });
      if (!response.ok) throw new Error('Template download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'blitzgrid-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Template download failed", variant: "destructive" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/blitzgrid/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Import failed');
      }
      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      
      if (result.imported > 0) {
        toast({ 
          title: `Imported ${result.imported} grid${result.imported > 1 ? 's' : ''}`,
          description: result.errors?.length > 0 ? `${result.errors.length} warning(s)` : undefined
        });
      } else if (result.errors?.length > 0) {
        toast({ title: result.errors[0], variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: error?.message || "Import failed - check file format", variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Show loading while auth or grids are loading OR while waiting for auto-selection
  if (isAuthLoading || loadingGrids || (grids.length > 0 && selectedGridId === null)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center" data-testid="page-loading">
        <div className="fixed inset-0 bg-gradient-to-br from-rose-300/5 via-transparent to-fuchsia-300/5 pointer-events-none" />
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid gap-4 grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-32" />)}
        </div>
      </div>
    );
  }

  // Grid detail view with inline categories and questions
  if (selectedGridId) {
    const grid = grids.find(g => g.id === selectedGridId);
    
    return (
      <div className="min-h-screen bg-background flex flex-col" data-testid="page-blitzgrid-admin-grid">
        <div className="fixed inset-0 bg-gradient-to-br from-rose-300/5 via-transparent to-fuchsia-300/5 pointer-events-none" />
        <AppHeader minimal backHref="/" title="BlitzGrid Admin" />
        
        <div className="border-b border-border bg-card/50">
          <div className="max-w-4xl mx-auto px-4 w-full">
            <nav className="flex gap-1">
              <Link href="/admin/games">
                <Button 
                  variant="ghost" 
                  className="relative rounded-none border-b-2 border-primary text-foreground"
                  data-testid="tab-blitzgrid"
                >
                  <Grid3X3 className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                  BlitzGrid
                </Button>
              </Link>
              <Link href="/admin/sort-circuit">
                <Button 
                  variant="ghost" 
                  className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                  data-testid="tab-sort-circuit"
                >
                  <ListOrdered className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                  Sort Circuit
                </Button>
              </Link>
              <Link href="/admin/psyop">
                <Button 
                  variant="ghost" 
                  className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                  data-testid="tab-psyop"
                >
                  <Brain className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                  PsyOp
                </Button>
              </Link>
              <Link href="/admin/pastforward">
                <Button 
                  variant="ghost" 
                  className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                  data-testid="tab-timewarp"
                >
                  <Clock className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                  Past Forward
                </Button>
              </Link>
              <Link href="/admin/memenoharm">
                <Button 
                  variant="ghost" 
                  className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                  data-testid="tab-memenoharm"
                >
                  <Smile className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                  Meme No Harm
                </Button>
              </Link>
            </nav>
          </div>
        </div>
        
        <div className="border-b bg-muted/30 px-4 py-2">
          <div className="flex items-center justify-end gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              data-testid="button-download-template-top"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1 shrink-0" aria-hidden="true" /> Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || grids.length === 0}
              data-testid="button-export-grids-top"
            >
              {isExporting ? <Loader2 className="w-4 h-4 mr-1 shrink-0 animate-spin" aria-hidden="true" /> : <Download className="w-4 h-4 mr-1 shrink-0" aria-hidden="true" />}
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              data-testid="button-import-grids-top"
            >
              {isImporting ? <Loader2 className="w-4 h-4 mr-1 shrink-0 animate-spin" aria-hidden="true" /> : <Upload className="w-4 h-4 mr-1 shrink-0" aria-hidden="true" />}
              Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>
        <div className="flex flex-1">
          {/* Grid Sidebar */}
          <aside className="w-64 border-r border-border bg-card/50 p-4 shrink-0 hidden md:block">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="font-semibold text-sm text-muted-foreground">Grids</h2>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setShowNewGridForm(true)}
                data-testid="button-add-grid-sidebar"
              >
                <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              </Button>
            </div>
            
            {/* New Grid Form in Sidebar */}
            {showNewGridForm && (
              <div className="mb-3 p-2 bg-muted/50 rounded-lg space-y-2">
                <Input
                  placeholder="Grid name..."
                  value={newGridName}
                  onChange={(e) => setNewGridName(e.target.value)}
                  autoFocus
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowNewGridForm(false);
                      setNewGridName("");
                      setNewGridDescription("");
                    }
                    if (e.key === 'Enter' && newGridName.trim() && !createGridMutation.isPending) {
                      createGridMutation.mutate({ 
                        name: newGridName.trim(),
                        description: newGridDescription.trim() || undefined
                      });
                    }
                  }}
                  data-testid="input-new-grid-name-sidebar"
                />
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => createGridMutation.mutate({ 
                      name: newGridName.trim(),
                      description: newGridDescription.trim() || undefined
                    })}
                    disabled={!newGridName.trim() || createGridMutation.isPending}
                    data-testid="button-create-grid-sidebar"
                  >
                    {createGridMutation.isPending ? <Loader2 className="w-3 h-3 shrink-0 animate-spin" aria-hidden="true" /> : "Create"}
                  </Button>
                  <Button 
                    size="sm"
                    variant="ghost" 
                    className="h-7 text-xs"
                    onClick={() => { 
                      setShowNewGridForm(false); 
                      setNewGridName(""); 
                      setNewGridDescription("");
                    }} 
                    data-testid="button-cancel-grid-create-sidebar"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              {grids.map(g => (
                <div
                  key={g.id}
                  className={`group w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    g.id === selectedGridId 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-foreground hover-elevate'
                  }`}
                  onClick={() => setSelectedGridId(g.id)}
                  data-testid={`sidebar-grid-${g.id}`}
                >
                  <div className="flex items-center gap-2">
                    <Grid3X3 className={`w-4 h-4 shrink-0 ${g.id === selectedGridId ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
                    <span className="truncate flex-1 min-w-0" title={g.name}>{g.name}</span>
                    {g.isActive ? (
                      <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Active" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Incomplete" />
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (deletingGridId === g.id) {
                          deleteGridMutation.mutate(g.id);
                        } else {
                          setDeletingGridId(g.id);
                        }
                      }}
                      disabled={deleteGridMutation.isPending && deletingGridId === g.id}
                      data-testid={`button-delete-grid-sidebar-${g.id}`}
                    >
                      {deleteGridMutation.isPending && deletingGridId === g.id ? (
                        <Loader2 className="w-3 h-3 shrink-0 animate-spin" aria-hidden="true" />
                      ) : deletingGridId === g.id ? (
                        <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
                      ) : (
                        <Trash2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
          
          {/* Main Content */}
          <div className="flex-1 p-4 md:p-6 overflow-auto">
            {/* Mobile Grid Selector */}
            <div className="md:hidden mb-4">
              <Select value={String(selectedGridId)} onValueChange={(v) => setSelectedGridId(Number(v))}>
                <SelectTrigger data-testid="select-grid-mobile">
                  <SelectValue placeholder="Select a grid" />
                </SelectTrigger>
                <SelectContent>
                  {grids.map(g => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      <span className="flex items-center gap-1">
                        {g.name} {g.isActive && <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" aria-hidden="true" />}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Grid Details Section */}
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Grid3X3 className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-400 shrink-0" aria-hidden="true" />
                      {editingGridId === selectedGridId ? (
                        <Input
                          value={editGridName}
                          onChange={(e) => setEditGridName(e.target.value)}
                          className="text-lg font-bold"
                          placeholder="Grid name"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setEditingGridId(null);
                            if (e.key === 'Enter') {
                              updateGridMutation.mutate({ 
                                id: selectedGridId, 
                                name: editGridName.trim(), 
                                description: editGridDescription.trim() || "BlitzGrid" 
                              });
                            }
                          }}
                          data-testid="input-edit-grid-name"
                        />
                      ) : (
                        <h1 className="text-2xl font-bold truncate" title={grid?.name}>{grid?.name || 'Grid'}</h1>
                      )}
                    </div>
                    {editingGridId === selectedGridId ? (
                      <Input
                        value={editGridDescription}
                        onChange={(e) => setEditGridDescription(e.target.value)}
                        placeholder="Short tagline (optional)"
                        maxLength={60}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingGridId(null);
                          if (e.key === 'Enter' && editGridName.trim()) {
                            updateGridMutation.mutate({ 
                              id: selectedGridId, 
                              name: editGridName.trim(), 
                              description: editGridDescription.trim() || "BlitzGrid" 
                            });
                          }
                        }}
                        data-testid="input-edit-grid-desc"
                      />
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        {grid?.description && grid.description !== "BlitzGrid" ? grid.description : "No description"}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {gridCategories.length}/5 categories · {grid?.questionCount || 0}/25 questions
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {editingGridId === selectedGridId ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            updateGridMutation.mutate({ 
                              id: selectedGridId, 
                              name: editGridName.trim(), 
                              description: editGridDescription.trim() || "BlitzGrid" 
                            });
                          }}
                          disabled={!editGridName.trim() || updateGridMutation.isPending}
                          data-testid="button-save-grid"
                        >
                          {updateGridMutation.isPending ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden="true" /> : <><Check className="w-4 h-4 mr-1 shrink-0" aria-hidden="true" /> Save</>}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingGridId(null)} data-testid="button-cancel-grid-edit">
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                          setEditingGridId(selectedGridId);
                          setEditGridName(grid?.name || '');
                          setEditGridDescription(grid?.description === "BlitzGrid" ? "" : (grid?.description || ""));
                        }}
                        data-testid="button-edit-grid"
                      >
                        <Pencil className="w-4 h-4 mr-1 shrink-0" aria-hidden="true" /> Edit
                      </Button>
                      {grid?.isActive ? (
                        <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" /> Ready to Play
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" /> Incomplete
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* New Category Form */}
          {gridCategories.length < 5 && (
            <Card className="mb-4">
              <CardContent className="py-3">
                {showNewCategoryForm ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Category name..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setShowNewCategoryForm(false);
                            setNewCategoryName("");
                            setNewCategoryDescription("");
                          }
                          if (e.key === 'Enter' && newCategoryName.trim() && !createCategoryMutation.isPending) {
                            createCategoryMutation.mutate({ 
                              gridId: selectedGridId, 
                              name: newCategoryName.trim(),
                              description: newCategoryDescription.trim() || undefined
                            });
                          }
                        }}
                        data-testid="input-category-name"
                      />
                      <Button
                        onClick={() => createCategoryMutation.mutate({ 
                          gridId: selectedGridId, 
                          name: newCategoryName.trim(),
                          description: newCategoryDescription.trim() || undefined
                        })}
                        disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                        data-testid="button-create-category"
                      >
                        {createCategoryMutation.isPending ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden="true" /> : "Create"}
                      </Button>
                      <Button variant="ghost" onClick={() => { 
                        setShowNewCategoryForm(false); 
                        setNewCategoryName(""); 
                        setNewCategoryDescription("");
                      }} data-testid="button-cancel-category-create">
                        <X className="w-4 h-4 shrink-0" aria-hidden="true" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Description (optional)..."
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryDescription(e.target.value)}
                      data-testid="input-category-description"
                    />
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowNewCategoryForm(true)}
                    data-testid="button-new-category"
                  >
                    <Plus className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" /> Add Category ({gridCategories.length}/5)
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Categories with inline questions */}
          {loadingCategories ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : gridCategories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4 shrink-0" aria-hidden="true" />
                <h3 className="font-medium mb-2">No categories yet</h3>
                <p className="text-muted-foreground text-sm">Add your first category above to start building your grid</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {gridCategories.map(category => {
                const isExpanded = selectedCategoryId === category.id;
                
                return (
                  <Card key={category.id} className={isExpanded ? 'ring-2 ring-primary/20' : ''}>
                    <CardHeader 
                      className="cursor-pointer py-3"
                      onClick={() => {
                        // Reset editing state when switching categories
                        if (!isExpanded && editingCategoryId !== null) {
                          setEditingCategoryId(null);
                          setQuestionForms(prev => {
                            const newForms = { ...prev };
                            POINT_TIERS.forEach(pts => {
                              delete newForms[`${editingCategoryId}-${pts}`];
                            });
                            return newForms;
                          });
                        }
                        setSelectedCategoryId(isExpanded ? null : category.id);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} aria-hidden="true" />
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate" title={category.name}>{category.name}</CardTitle>
                            <CardDescription className="text-xs truncate" title={`${category.description || 'No description'} · ${category.questionCount}/5 questions`}>
                              {category.description ? `${category.description} · ` : ''}{category.questionCount}/5 questions
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {category.questionCount >= 5 ? (
                            <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 text-xs shrink-0">Complete</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
                              {5 - category.questionCount} needed
                            </Badge>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCategoryMutation.mutate({ gridId: selectedGridId, categoryId: category.id });
                            }}
                            disabled={removeCategoryMutation.isPending}
                            data-testid={`button-remove-category-${category.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive shrink-0" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="pt-0 space-y-2">
                            {/* Category Name & Description Editor */}
                            <div className="mb-3 pb-2 border-b space-y-2">
                              {editingCategoryId === category.id ? (
                                <div className="space-y-2">
                                  <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Category Name</label>
                                    <Input
                                      placeholder="Category name..."
                                      value={editCategoryName}
                                      onChange={(e) => setEditCategoryName(e.target.value)}
                                      autoFocus
                                      className="flex-1 h-8 text-sm font-medium"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && editCategoryName.trim()) {
                                          updateCategoryMutation.mutate({ 
                                            categoryId: category.id, 
                                            name: editCategoryName.trim(),
                                            description: editCategoryDescription.trim() 
                                          });
                                        }
                                        if (e.key === 'Escape') {
                                          setEditingCategoryId(null);
                                        }
                                      }}
                                      data-testid={`input-edit-category-name-${category.id}`}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
                                    <Input
                                      placeholder="Category description..."
                                      value={editCategoryDescription}
                                      onChange={(e) => setEditCategoryDescription(e.target.value)}
                                      className="flex-1 h-8 text-sm"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          updateCategoryMutation.mutate({ 
                                            categoryId: category.id, 
                                            name: editCategoryName.trim() || undefined,
                                            description: editCategoryDescription.trim() 
                                          });
                                        }
                                        if (e.key === 'Escape') {
                                          setEditingCategoryId(null);
                                        }
                                      }}
                                      data-testid={`input-edit-category-description-${category.id}`}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate" title={category.name}>{category.name}</p>
                                    <p className="text-xs text-muted-foreground truncate" title={category.description || 'No description'}>
                                      {category.description || 'No description'}
                                    </p>
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCategoryId(category.id);
                                      setEditCategoryName(category.name);
                                      setEditCategoryDescription(category.description || '');
                                      // Pre-populate all question forms for this category
                                      const newForms: Record<string, any> = {};
                                      POINT_TIERS.forEach(pts => {
                                        const q = category.questions?.find(q => q.points === pts);
                                        if (q) {
                                          newForms[`${category.id}-${pts}`] = {
                                            question: q.question,
                                            correctAnswer: q.correctAnswer,
                                            options: q.options || [],
                                            imageUrl: q.imageUrl || '',
                                            audioUrl: q.audioUrl || '',
                                            videoUrl: q.videoUrl || '',
                                            answerImageUrl: q.answerImageUrl || '',
                                            answerAudioUrl: q.answerAudioUrl || '',
                                            answerVideoUrl: q.answerVideoUrl || '',
                                          };
                                        }
                                      });
                                      setQuestionForms(prev => ({ ...prev, ...newForms }));
                                    }}
                                    data-testid={`button-edit-category-${category.id}`}
                                  >
                                    <Pencil className="w-4 h-4 shrink-0" aria-hidden="true" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            {/* Point Tier Tabs */}
                            {editingCategoryId === category.id ? (
                              <div className="space-y-4">
                                <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
                                  {POINT_TIERS.map((pts, idx) => {
                                    const formKey = `${category.id}-${pts}`;
                                    const formData = questionForms[formKey];
                                    const existingQ = category.questions?.find(q => q.points === pts);
                                    const isComplete = existingQ || (formData?.question && formData?.correctAnswer) || (formData?.imageUrl && formData?.correctAnswer);
                                    const tierColors = ['bg-emerald-500', 'bg-cyan-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];
                                    const isSelected = selectedPointTier === pts;
                                    
                                    return (
                                      <button
                                        key={pts}
                                        onClick={() => { setSelectedPointTier(pts); setShowMediaPanel(false); }}
                                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                                          isSelected 
                                            ? `${tierColors[idx]} text-white shadow-md` 
                                            : 'bg-background hover:bg-muted text-muted-foreground'
                                        }`}
                                        data-testid={`tab-points-${pts}`}
                                      >
                                        <div className="flex items-center justify-center gap-1.5">
                                          <span>{pts}</span>
                                          {isComplete && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                                
                                {/* Single Question Form for Selected Tier */}
                                {(() => {
                                  const pts = selectedPointTier;
                                  const formKey = `${category.id}-${pts}`;
                                  const formData = questionForms[formKey];
                                  const defaultForm = { question: '', correctAnswer: '', options: [], imageUrl: '', audioUrl: '', videoUrl: '', answerImageUrl: '', answerAudioUrl: '', answerVideoUrl: '' };
                                  const tierColors = { 10: 'border-emerald-500/30', 20: 'border-cyan-500/30', 30: 'border-violet-500/30', 40: 'border-amber-500/30', 50: 'border-rose-500/30' };
                                  const tierBg = { 10: 'bg-emerald-500/5', 20: 'bg-cyan-500/5', 30: 'bg-violet-500/5', 40: 'bg-amber-500/5', 50: 'bg-rose-500/5' };
                                  
                                  return (
                                    <div className={`p-4 rounded-lg border-2 ${tierColors[pts as keyof typeof tierColors]} ${tierBg[pts as keyof typeof tierBg]}`}>
                                      <div className="space-y-4">
                                        <div>
                                          <label className="text-sm font-medium mb-2 block">Question</label>
                                          <Textarea
                                            placeholder="Enter your question..."
                                            className="text-sm resize-none bg-white dark:bg-card min-h-[80px]"
                                            rows={3}
                                            data-testid={`input-question-${formKey}`}
                                            value={formData?.question || ''}
                                            onChange={(e) => setQuestionForms(prev => ({
                                              ...prev,
                                              [formKey]: { ...prev[formKey] || defaultForm, question: e.target.value }
                                            }))}
                                          />
                                        </div>
                                        
                                        <div>
                                          <label className="text-sm font-medium mb-2 block">Answer</label>
                                          <Input
                                            placeholder="Enter the correct answer..."
                                            className="text-sm bg-white dark:bg-card"
                                            data-testid={`input-answer-${formKey}`}
                                            value={formData?.correctAnswer || ''}
                                            onChange={(e) => setQuestionForms(prev => ({
                                              ...prev,
                                              [formKey]: { ...prev[formKey] || defaultForm, correctAnswer: e.target.value }
                                            }))}
                                          />
                                        </div>
                                        
                                        {/* Collapsible Media Section */}
                                        <div className="pt-2 border-t border-border/50">
                                          <button
                                            type="button"
                                            onClick={() => setShowMediaPanel(!showMediaPanel)}
                                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                            data-testid={`button-toggle-media-${formKey}`}
                                          >
                                            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${showMediaPanel ? 'rotate-90' : ''}`} aria-hidden="true" />
                                            <span>Add Media (optional)</span>
                                            {(formData?.imageUrl || formData?.audioUrl || formData?.videoUrl || formData?.answerImageUrl || formData?.answerAudioUrl || formData?.answerVideoUrl) && (
                                              <Badge variant="secondary" className="text-xs">Media attached</Badge>
                                            )}
                                          </button>
                                          
                                          {showMediaPanel && (
                                            <div className="mt-3 space-y-3 pl-6">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs text-muted-foreground w-20">Question:</span>
                                                <label className="cursor-pointer">
                                                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey] || defaultForm, imageUrl: url } })); toast({ title: "Image uploaded" }); } catch { toast({ title: "Upload failed", variant: "destructive" }); } } }} />
                                                  <Button type="button" size="sm" variant={formData?.imageUrl ? "default" : "outline"} asChild>
                                                    <span><Image className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />{formData?.imageUrl ? <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" /> : "Image"}</span>
                                                  </Button>
                                                </label>
                                                <label className="cursor-pointer">
                                                  <input type="file" accept="audio/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey] || defaultForm, audioUrl: url } })); toast({ title: "Audio uploaded" }); } catch { toast({ title: "Upload failed", variant: "destructive" }); } } }} />
                                                  <Button type="button" size="sm" variant={formData?.audioUrl ? "default" : "outline"} asChild>
                                                    <span><Music className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />{formData?.audioUrl ? <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" /> : "Audio"}</span>
                                                  </Button>
                                                </label>
                                                <label className="cursor-pointer">
                                                  <input type="file" accept="video/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey] || defaultForm, videoUrl: url } })); toast({ title: "Video uploaded" }); } catch { toast({ title: "Upload failed", variant: "destructive" }); } } }} />
                                                  <Button type="button" size="sm" variant={formData?.videoUrl ? "default" : "outline"} asChild>
                                                    <span><Video className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />{formData?.videoUrl ? <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" /> : "Video"}</span>
                                                  </Button>
                                                </label>
                                              </div>
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs text-muted-foreground w-20">Answer:</span>
                                                <label className="cursor-pointer">
                                                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey] || defaultForm, answerImageUrl: url } })); toast({ title: "Image uploaded" }); } catch { toast({ title: "Upload failed", variant: "destructive" }); } } }} />
                                                  <Button type="button" size="sm" variant={formData?.answerImageUrl ? "default" : "outline"} asChild>
                                                    <span><Image className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />{formData?.answerImageUrl ? <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" /> : "Image"}</span>
                                                  </Button>
                                                </label>
                                                <label className="cursor-pointer">
                                                  <input type="file" accept="audio/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey] || defaultForm, answerAudioUrl: url } })); toast({ title: "Audio uploaded" }); } catch { toast({ title: "Upload failed", variant: "destructive" }); } } }} />
                                                  <Button type="button" size="sm" variant={formData?.answerAudioUrl ? "default" : "outline"} asChild>
                                                    <span><Music className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />{formData?.answerAudioUrl ? <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" /> : "Audio"}</span>
                                                  </Button>
                                                </label>
                                                <label className="cursor-pointer">
                                                  <input type="file" accept="video/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey] || defaultForm, answerVideoUrl: url } })); toast({ title: "Video uploaded" }); } catch { toast({ title: "Upload failed", variant: "destructive" }); } } }} />
                                                  <Button type="button" size="sm" variant={formData?.answerVideoUrl ? "default" : "outline"} asChild>
                                                    <span><Video className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />{formData?.answerVideoUrl ? <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" /> : "Video"}</span>
                                                  </Button>
                                                </label>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              /* Read-only question list when not editing */
                              <div className="space-y-2">
                                {POINT_TIERS.map(points => {
                                  const existingQuestion = category.questions?.find(q => q.points === points);
                                  if (!existingQuestion) {
                                    return (
                                      <div key={points} className="py-2 px-3 bg-muted/20 border border-dashed border-border rounded flex items-center gap-3">
                                        <span className="text-sm font-semibold text-muted-foreground w-8 text-right">{points}</span>
                                        <span className="text-sm text-muted-foreground italic">Empty</span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={points} className="py-2 px-3 bg-white dark:bg-card border border-border rounded" data-testid={`question-slot-${existingQuestion.id}`}>
                                      <div className="flex items-start gap-3">
                                        <span className="text-sm font-semibold text-muted-foreground w-8 text-right shrink-0 pt-0.5">{points}</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm truncate" title={existingQuestion.question}>{existingQuestion.question || <span className="text-muted-foreground italic">Media only</span>}</p>
                                          <p className="text-sm text-muted-foreground mt-1 truncate" title={`Answer: ${existingQuestion.correctAnswer}`}>Answer: {existingQuestion.correctAnswer}</p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {editingCategoryId === category.id && (
                              <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCategoryId(null);
                                    setQuestionForms(prev => {
                                      const newForms = { ...prev };
                                      POINT_TIERS.forEach(pts => {
                                        delete newForms[`${category.id}-${pts}`];
                                      });
                                      return newForms;
                                    });
                                  }}
                                  data-testid={`button-cancel-category-edit-${category.id}`}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={async () => {
                                    // Save category name/description if changed
                                    if (editCategoryName.trim()) {
                                      await updateCategoryMutation.mutateAsync({ 
                                        categoryId: category.id, 
                                        name: editCategoryName.trim(),
                                        description: editCategoryDescription.trim() 
                                      });
                                    }
                                    // Save all questions with data
                                    for (const pts of POINT_TIERS) {
                                      const formKey = `${category.id}-${pts}`;
                                      const formData = questionForms[formKey];
                                      const hasQuestionMedia = formData?.imageUrl || formData?.audioUrl || formData?.videoUrl;
                                      const questionValid = formData?.question || hasQuestionMedia;
                                      if (formData && questionValid && formData.correctAnswer) {
                                        await saveQuestionMutation.mutateAsync({
                                          categoryId: category.id,
                                          points: pts,
                                          question: formData.question,
                                          correctAnswer: formData.correctAnswer,
                                          options: formData.options || [],
                                          imageUrl: formData.imageUrl || undefined,
                                          audioUrl: formData.audioUrl || undefined,
                                          videoUrl: formData.videoUrl || undefined,
                                          answerImageUrl: formData.answerImageUrl || undefined,
                                          answerAudioUrl: formData.answerAudioUrl || undefined,
                                          answerVideoUrl: formData.answerVideoUrl || undefined,
                                        });
                                      }
                                    }
                                    setEditingCategoryId(null);
                                    setQuestionForms(prev => {
                                      const newForms = { ...prev };
                                      POINT_TIERS.forEach(pts => {
                                        delete newForms[`${category.id}-${pts}`];
                                      });
                                      return newForms;
                                    });
                                    toast({ title: "Saved" });
                                  }}
                                  disabled={saveQuestionMutation.isPending || updateCategoryMutation.isPending || !editCategoryName.trim()}
                                  data-testid={`button-save-category-${category.id}`}
                                >
                                  {(saveQuestionMutation.isPending || updateCategoryMutation.isPending) ? <Loader2 className="w-4 h-4 mr-2 shrink-0 animate-spin" aria-hidden="true" /> : null}
                                  Save All
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}
            </div>
          )}
          </div>
        </div>
        
        <AppFooter />
      </div>
    );
  }

  // Grid list view
  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-blitzgrid-admin">
      <div className="fixed inset-0 bg-gradient-to-br from-rose-300/5 via-transparent to-fuchsia-300/5 pointer-events-none" />
      <AppHeader minimal backHref="/" title="BlitzGrid Admin" />
      
      <div className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-4 w-full">
          <nav className="flex gap-1">
            <Link href="/admin/games">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-primary text-foreground"
                data-testid="tab-blitzgrid"
              >
                <Grid3X3 className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                BlitzGrid
              </Button>
            </Link>
            <Link href="/admin/sort-circuit">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-sort-circuit"
              >
                <ListOrdered className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                Sort Circuit
              </Button>
            </Link>
            <Link href="/admin/psyop">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-psyop"
              >
                <Brain className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                PsyOp
              </Button>
            </Link>
            <Link href="/admin/pastforward">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-timewarp"
              >
                <Clock className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                Past Forward
              </Button>
            </Link>
            <Link href="/admin/memenoharm">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
                data-testid="tab-memenoharm"
              >
                <Smile className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                Meme No Harm
              </Button>
            </Link>
          </nav>
        </div>
      </div>
      
      <main className="max-w-4xl mx-auto px-4 py-6 flex-1 w-full">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">BlitzGrid Grids</h1>
            <p className="text-muted-foreground text-sm">Create and edit your trivia grids</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              data-testid="button-download-template"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" /> Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || grids.length === 0}
              data-testid="button-export-grids"
            >
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 shrink-0 animate-spin" aria-hidden="true" /> : <Download className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />}
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              data-testid="button-import-grids"
            >
              {isImporting ? <Loader2 className="w-4 h-4 mr-2 shrink-0 animate-spin" aria-hidden="true" /> : <Upload className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />}
              Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
            <Button
              size="sm"
              onClick={() => setShowNewGridForm(true)}
              data-testid="button-add-grid"
            >
              <Plus className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" /> Add Grid
            </Button>
          </div>
        </div>

        {/* New Grid Form */}
        {showNewGridForm && (
          <Card className="mb-4">
            <CardContent className="py-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Grid name..."
                    value={newGridName}
                    onChange={(e) => setNewGridName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowNewGridForm(false);
                        setNewGridName("");
                        setNewGridDescription("");
                      }
                      if (e.key === 'Enter' && newGridName.trim() && !createGridMutation.isPending) {
                        createGridMutation.mutate({ 
                          name: newGridName.trim(),
                          description: newGridDescription.trim() || undefined
                        });
                      }
                    }}
                    data-testid="input-new-grid-name"
                  />
                </div>
                <Input
                  placeholder="Description (optional)..."
                  value={newGridDescription}
                  onChange={(e) => setNewGridDescription(e.target.value)}
                  data-testid="input-new-grid-description"
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => createGridMutation.mutate({ 
                      name: newGridName.trim(),
                      description: newGridDescription.trim() || undefined
                    })}
                    disabled={!newGridName.trim() || createGridMutation.isPending}
                    data-testid="button-create-grid"
                  >
                    {createGridMutation.isPending ? <Loader2 className="w-4 h-4 shrink-0 animate-spin mr-2" aria-hidden="true" /> : null}
                    Create Grid
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => { 
                      setShowNewGridForm(false); 
                      setNewGridName(""); 
                      setNewGridDescription("");
                    }} 
                    data-testid="button-cancel-grid-create"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loadingGrids ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : grids.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4 shrink-0" aria-hidden="true" />
              <h3 className="font-medium mb-2">No grids yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Create your first grid to get started</p>
              <Button onClick={() => setShowNewGridForm(true)} data-testid="button-add-first-grid">
                <Plus className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" /> Add Grid
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {grids.map(grid => (
              <Card
                key={grid.id}
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => setSelectedGridId(grid.id)}
                data-testid={`card-grid-${grid.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    {editingGridId === grid.id ? (
                      <div className="flex flex-col gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Input
                            value={editGridName}
                            onChange={(e) => setEditGridName(e.target.value)}
                            className="h-8"
                            placeholder="Grid name"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setEditingGridId(null);
                              }
                            }}
                            data-testid={`input-edit-grid-${grid.id}`}
                          />
                        </div>
                        <Input
                          value={editGridDescription}
                          onChange={(e) => setEditGridDescription(e.target.value)}
                          className="h-8"
                          placeholder="Short tagline (optional, ~50 chars)"
                          maxLength={60}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setEditingGridId(null);
                            }
                          }}
                          data-testid={`input-edit-grid-desc-${grid.id}`}
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (editGridName.trim()) {
                                updateGridMutation.mutate({ 
                                  id: grid.id, 
                                  name: editGridName.trim(),
                                  description: editGridDescription.trim() || undefined
                                });
                              }
                            }}
                            disabled={!editGridName.trim() || updateGridMutation.isPending}
                            data-testid={`button-save-grid-${grid.id}`}
                          >
                            <Check className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingGridId(null)}
                            data-testid={`button-cancel-grid-edit-${grid.id}`}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <Grid3X3 className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-400 shrink-0" aria-hidden="true" />
                          <h3 className="font-semibold truncate" title={grid.name}>{grid.name}</h3>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGridId(grid.id);
                              setEditGridName(grid.name);
                              setEditGridDescription(grid.description === "BlitzGrid" ? "" : (grid.description || ""));
                            }}
                            data-testid={`button-edit-grid-${grid.id}`}
                          >
                            <Pencil className="w-4 h-4 shrink-0" aria-hidden="true" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (deletingGridId === grid.id) {
                                deleteGridMutation.mutate(grid.id);
                              } else {
                                setDeletingGridId(grid.id);
                              }
                            }}
                            disabled={deleteGridMutation.isPending && deletingGridId === grid.id}
                            data-testid={`button-delete-grid-${grid.id}`}
                          >
                            {deleteGridMutation.isPending && deletingGridId === grid.id ? (
                              <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden="true" />
                            ) : deletingGridId === grid.id ? (
                              <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                            ) : (
                              <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {grid.categoryCount}/5 categories · {grid.questionCount}/25 questions
                    </p>
                    {grid.isActive ? (
                      <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 text-xs shrink-0">
                        <CheckCircle2 className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Incomplete
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
