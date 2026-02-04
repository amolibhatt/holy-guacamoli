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

// Media upload size limits (in bytes)
const MEDIA_LIMITS = {
  image: { maxSize: 5 * 1024 * 1024, label: '5MB', formats: 'JPG, PNG, GIF, WebP' },
  audio: { maxSize: 10 * 1024 * 1024, label: '10MB', formats: 'MP3, WAV, M4A' },
  video: { maxSize: 10 * 1024 * 1024, label: '10MB', formats: 'MP4, WebM' },
};

// Validate file before upload
function validateFile(file: File, type: 'image' | 'audio' | 'video'): string | null {
  const limit = MEDIA_LIMITS[type];
  if (file.size > limit.maxSize) {
    return `File too large. Max ${limit.label} for ${type}s.`;
  }
  return null;
}

// Helper to upload a file to object storage (supports Replit and Cloudinary)
async function uploadFile(file: File, type?: 'image' | 'audio' | 'video'): Promise<string> {
  // Validate file size if type is provided
  if (type) {
    const error = validateFile(file, type);
    if (error) throw new Error(error);
  }
  
  // Step 1: Check upload method
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to get upload URL");
  }
  
  const data = await response.json();
  
  // Check for error in response
  if (data.error) {
    throw new Error(data.error);
  }
  
  // Check if we need to use Cloudinary direct upload
  if (data.useDirectUpload && data.uploadEndpoint) {
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadResponse = await fetch(data.uploadEndpoint, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to upload file");
    }
    
    const result = await uploadResponse.json();
    return result.objectPath || result.url;
  }
  
  // Replit Object Storage flow - upload to presigned URL
  const { uploadURL, objectPath } = data;
  
  if (!uploadURL) {
    throw new Error("No upload URL provided");
  }
  
  const uploadResponse = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  
  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file to storage");
  }
  
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
          <div className="px-4 w-full">
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
                      className={`py-3 ${editingCategoryId !== category.id ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        // Don't toggle when editing this category
                        if (editingCategoryId === category.id) return;
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
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} aria-hidden="true" />
                          {editingCategoryId === category.id ? (
                            <div className="flex-1 space-y-1.5 min-w-0" onClick={(e) => e.stopPropagation()}>
                              <Input
                                placeholder="Category name..."
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                autoFocus
                                className="h-8 text-sm font-medium"
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setEditingCategoryId(null);
                                  }
                                }}
                                data-testid={`input-edit-category-name-${category.id}`}
                              />
                              <Input
                                placeholder="Description (optional)"
                                value={editCategoryDescription}
                                onChange={(e) => setEditCategoryDescription(e.target.value)}
                                className="h-7 text-xs"
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setEditingCategoryId(null);
                                  }
                                }}
                                data-testid={`input-edit-category-description-${category.id}`}
                              />
                            </div>
                          ) : (
                            <div className="min-w-0">
                              <CardTitle className="text-base truncate" title={category.name}>{category.name}</CardTitle>
                              <CardDescription className="text-xs truncate" title={`${category.description || 'No description'} · ${category.questionCount}/5 questions`}>
                                {category.description ? `${category.description} · ` : ''}{category.questionCount}/5 questions
                              </CardDescription>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {category.questionCount >= 5 ? (
                            <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 text-xs shrink-0">Complete</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
                              {5 - category.questionCount} needed
                            </Badge>
                          )}
                          {editingCategoryId !== category.id && (
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
                          )}
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
                            {/* Edit Questions button when not editing */}
                            {editingCategoryId !== category.id && (
                              <div className="mb-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
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
                                  <Pencil className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                                  Edit Questions
                                </Button>
                              </div>
                            )}
                            {/* Simple 5-row question editor */}
                            {editingCategoryId === category.id ? (
                              <div className="space-y-3">
                                {POINT_TIERS.map((pts, idx) => {
                                  const formKey = `${category.id}-${pts}`;
                                  const formData = questionForms[formKey];
                                  const defaultForm = { question: '', correctAnswer: '', options: [], imageUrl: '', audioUrl: '', videoUrl: '', answerImageUrl: '', answerAudioUrl: '', answerVideoUrl: '' };
                                  const tierColors = ['bg-emerald-500', 'bg-cyan-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];
                                  const hasMedia = formData?.imageUrl || formData?.audioUrl || formData?.videoUrl || formData?.answerImageUrl || formData?.answerAudioUrl || formData?.answerVideoUrl;
                                  const isMediaOpen = selectedPointTier === pts && showMediaPanel;
                                  
                                  return (
                                    <div key={pts} className="p-3 bg-muted/20 rounded-lg border border-border">
                                      <div className="flex items-start gap-3">
                                        <div className={`${tierColors[idx]} text-white text-sm font-bold w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}>
                                          {pts}
                                        </div>
                                        <div className="flex-1 space-y-2 min-w-0">
                                          <Input
                                            placeholder="Question..."
                                            className="text-sm bg-white dark:bg-card"
                                            data-testid={`input-question-${formKey}`}
                                            value={formData?.question || ''}
                                            onChange={(e) => setQuestionForms(prev => ({
                                              ...prev,
                                              [formKey]: { ...prev[formKey] || defaultForm, question: e.target.value }
                                            }))}
                                          />
                                          <Input
                                            placeholder="Answer..."
                                            className="text-sm bg-white dark:bg-card"
                                            data-testid={`input-answer-${formKey}`}
                                            value={formData?.correctAnswer || ''}
                                            onChange={(e) => setQuestionForms(prev => ({
                                              ...prev,
                                              [formKey]: { ...prev[formKey] || defaultForm, correctAnswer: e.target.value }
                                            }))}
                                          />
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 mt-2">
                                          {hasMedia && <Badge variant="secondary" className="text-xs">Media</Badge>}
                                          {formData?.question && formData?.correctAnswer && (
                                            <CheckCircle2 className="w-5 h-5 text-green-500" aria-hidden="true" />
                                          )}
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => { setSelectedPointTier(pts); setShowMediaPanel(!isMediaOpen); }}
                                            data-testid={`button-media-${formKey}`}
                                          >
                                            <Image className="w-4 h-4 shrink-0" aria-hidden="true" />
                                          </Button>
                                        </div>
                                      </div>
                                      {isMediaOpen && (
                                        <div className="mt-3 pt-3 border-t border-border/50 space-y-3 ml-13">
                                          <div className="text-xs text-muted-foreground/60 bg-muted/30 rounded px-2 py-1.5 mb-2">
                                            <strong>Media limits:</strong> Images max 5MB (JPG, PNG, GIF) | Audio/Video max 10MB (MP3, MP4)
                                          </div>
                                          <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground font-medium">Question Media:</span>
                                            <div className="flex flex-wrap items-center gap-2">
                                              {formData?.imageUrl ? (
                                                <div className="flex items-center gap-1 bg-primary/10 rounded px-2 py-1">
                                                  <Image className="w-3 h-3 text-primary shrink-0" aria-hidden="true" />
                                                  <span className="text-xs truncate max-w-20">Image</span>
                                                  <Button type="button" size="icon" variant="ghost" className="h-4 w-4 p-0 hover:bg-destructive/20" onClick={() => setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey], imageUrl: '' } }))} data-testid={`remove-question-image-${formKey}`}>
                                                    <X className="w-3 h-3" />
                                                  </Button>
                                                </div>
                                              ) : (
                                                <label className="cursor-pointer">
                                                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file, 'image'); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey], question: prev[formKey]?.question || '', correctAnswer: prev[formKey]?.correctAnswer || '', options: prev[formKey]?.options || [], imageUrl: url, audioUrl: prev[formKey]?.audioUrl || '', videoUrl: prev[formKey]?.videoUrl || '', answerImageUrl: prev[formKey]?.answerImageUrl || '', answerAudioUrl: prev[formKey]?.answerAudioUrl || '', answerVideoUrl: prev[formKey]?.answerVideoUrl || '' } })); toast({ title: "Image uploaded" }); } catch (err) { toast({ title: err instanceof Error ? err.message : "Upload failed", variant: "destructive" }); } } e.target.value = ''; }} />
                                                  <Button type="button" size="sm" variant="outline" asChild><span><Image className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />Img</span></Button>
                                                </label>
                                              )}
                                              {formData?.audioUrl ? (
                                                <div className="flex items-center gap-1 bg-primary/10 rounded px-2 py-1">
                                                  <Music className="w-3 h-3 text-primary shrink-0" aria-hidden="true" />
                                                  <span className="text-xs truncate max-w-20">Audio</span>
                                                  <Button type="button" size="icon" variant="ghost" className="h-4 w-4 p-0 hover:bg-destructive/20" onClick={() => setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey], audioUrl: '' } }))} data-testid={`remove-question-audio-${formKey}`}>
                                                    <X className="w-3 h-3" />
                                                  </Button>
                                                </div>
                                              ) : (
                                                <label className="cursor-pointer">
                                                  <input type="file" accept="audio/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file, 'audio'); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey], question: prev[formKey]?.question || '', correctAnswer: prev[formKey]?.correctAnswer || '', options: prev[formKey]?.options || [], imageUrl: prev[formKey]?.imageUrl || '', audioUrl: url, videoUrl: prev[formKey]?.videoUrl || '', answerImageUrl: prev[formKey]?.answerImageUrl || '', answerAudioUrl: prev[formKey]?.answerAudioUrl || '', answerVideoUrl: prev[formKey]?.answerVideoUrl || '' } })); toast({ title: "Audio uploaded" }); } catch (err) { toast({ title: err instanceof Error ? err.message : "Upload failed", variant: "destructive" }); } } e.target.value = ''; }} />
                                                  <Button type="button" size="sm" variant="outline" asChild><span><Music className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />Audio</span></Button>
                                                </label>
                                              )}
                                              {formData?.videoUrl ? (
                                                <div className="flex items-center gap-1 bg-primary/10 rounded px-2 py-1">
                                                  <Video className="w-3 h-3 text-primary shrink-0" aria-hidden="true" />
                                                  <span className="text-xs truncate max-w-20">Video</span>
                                                  <Button type="button" size="icon" variant="ghost" className="h-4 w-4 p-0 hover:bg-destructive/20" onClick={() => setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey], videoUrl: '' } }))} data-testid={`remove-question-video-${formKey}`}>
                                                    <X className="w-3 h-3" />
                                                  </Button>
                                                </div>
                                              ) : (
                                                <label className="cursor-pointer">
                                                  <input type="file" accept="video/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file, 'video'); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey], question: prev[formKey]?.question || '', correctAnswer: prev[formKey]?.correctAnswer || '', options: prev[formKey]?.options || [], imageUrl: prev[formKey]?.imageUrl || '', audioUrl: prev[formKey]?.audioUrl || '', videoUrl: url, answerImageUrl: prev[formKey]?.answerImageUrl || '', answerAudioUrl: prev[formKey]?.answerAudioUrl || '', answerVideoUrl: prev[formKey]?.answerVideoUrl || '' } })); toast({ title: "Video uploaded" }); } catch (err) { toast({ title: err instanceof Error ? err.message : "Upload failed", variant: "destructive" }); } } e.target.value = ''; }} />
                                                  <Button type="button" size="sm" variant="outline" asChild><span><Video className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />Video</span></Button>
                                                </label>
                                              )}
                                            </div>
                                          </div>
                                          <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground font-medium">Answer Media:</span>
                                            <div className="flex flex-wrap items-center gap-2">
                                              {formData?.answerImageUrl ? (
                                                <div className="flex items-center gap-1 bg-primary/10 rounded px-2 py-1">
                                                  <Image className="w-3 h-3 text-primary shrink-0" aria-hidden="true" />
                                                  <span className="text-xs truncate max-w-20">Image</span>
                                                  <Button type="button" size="icon" variant="ghost" className="h-4 w-4 p-0 hover:bg-destructive/20" onClick={() => setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey], answerImageUrl: '' } }))} data-testid={`remove-answer-image-${formKey}`}>
                                                    <X className="w-3 h-3" />
                                                  </Button>
                                                </div>
                                              ) : (
                                                <label className="cursor-pointer">
                                                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file, 'image'); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey], question: prev[formKey]?.question || '', correctAnswer: prev[formKey]?.correctAnswer || '', options: prev[formKey]?.options || [], imageUrl: prev[formKey]?.imageUrl || '', audioUrl: prev[formKey]?.audioUrl || '', videoUrl: prev[formKey]?.videoUrl || '', answerImageUrl: url, answerAudioUrl: prev[formKey]?.answerAudioUrl || '', answerVideoUrl: prev[formKey]?.answerVideoUrl || '' } })); toast({ title: "Image uploaded" }); } catch (err) { toast({ title: err instanceof Error ? err.message : "Upload failed", variant: "destructive" }); } } e.target.value = ''; }} />
                                                  <Button type="button" size="sm" variant="outline" asChild><span><Image className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />Img</span></Button>
                                                </label>
                                              )}
                                              {formData?.answerAudioUrl ? (
                                                <div className="flex items-center gap-1 bg-primary/10 rounded px-2 py-1">
                                                  <Music className="w-3 h-3 text-primary shrink-0" aria-hidden="true" />
                                                  <span className="text-xs truncate max-w-20">Audio</span>
                                                  <Button type="button" size="icon" variant="ghost" className="h-4 w-4 p-0 hover:bg-destructive/20" onClick={() => setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey], answerAudioUrl: '' } }))} data-testid={`remove-answer-audio-${formKey}`}>
                                                    <X className="w-3 h-3" />
                                                  </Button>
                                                </div>
                                              ) : (
                                                <label className="cursor-pointer">
                                                  <input type="file" accept="audio/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file, 'audio'); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey], question: prev[formKey]?.question || '', correctAnswer: prev[formKey]?.correctAnswer || '', options: prev[formKey]?.options || [], imageUrl: prev[formKey]?.imageUrl || '', audioUrl: prev[formKey]?.audioUrl || '', videoUrl: prev[formKey]?.videoUrl || '', answerImageUrl: prev[formKey]?.answerImageUrl || '', answerAudioUrl: url, answerVideoUrl: prev[formKey]?.answerVideoUrl || '' } })); toast({ title: "Audio uploaded" }); } catch (err) { toast({ title: err instanceof Error ? err.message : "Upload failed", variant: "destructive" }); } } e.target.value = ''; }} />
                                                  <Button type="button" size="sm" variant="outline" asChild><span><Music className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />Audio</span></Button>
                                                </label>
                                              )}
                                              {formData?.answerVideoUrl ? (
                                                <div className="flex items-center gap-1 bg-primary/10 rounded px-2 py-1">
                                                  <Video className="w-3 h-3 text-primary shrink-0" aria-hidden="true" />
                                                  <span className="text-xs truncate max-w-20">Video</span>
                                                  <Button type="button" size="icon" variant="ghost" className="h-4 w-4 p-0 hover:bg-destructive/20" onClick={() => setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey], answerVideoUrl: '' } }))} data-testid={`remove-answer-video-${formKey}`}>
                                                    <X className="w-3 h-3" />
                                                  </Button>
                                                </div>
                                              ) : (
                                                <label className="cursor-pointer">
                                                  <input type="file" accept="video/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file, 'video'); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey], question: prev[formKey]?.question || '', correctAnswer: prev[formKey]?.correctAnswer || '', options: prev[formKey]?.options || [], imageUrl: prev[formKey]?.imageUrl || '', audioUrl: prev[formKey]?.audioUrl || '', videoUrl: prev[formKey]?.videoUrl || '', answerImageUrl: prev[formKey]?.answerImageUrl || '', answerAudioUrl: prev[formKey]?.answerAudioUrl || '', answerVideoUrl: url } })); toast({ title: "Video uploaded" }); } catch (err) { toast({ title: err instanceof Error ? err.message : "Upload failed", variant: "destructive" }); } } e.target.value = ''; }} />
                                                  <Button type="button" size="sm" variant="outline" asChild><span><Video className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />Video</span></Button>
                                                </label>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {POINT_TIERS.map((pts, idx) => {
                                  const existingQuestion = category.questions?.find(q => q.points === pts);
                                  const tierColors = ['bg-emerald-500', 'bg-cyan-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];
                                  
                                  return (
                                    <div key={pts} className="flex items-center gap-3 p-2 rounded-lg" data-testid={existingQuestion ? `question-slot-${existingQuestion.id}` : `empty-slot-${pts}`}>
                                      <div className={`${tierColors[idx]} text-white text-xs font-bold w-8 h-8 rounded flex items-center justify-center shrink-0`}>
                                        {pts}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        {existingQuestion ? (
                                          <>
                                            <p className="text-sm truncate" title={existingQuestion.question}>{existingQuestion.question}</p>
                                            <p className="text-xs text-muted-foreground truncate">{existingQuestion.correctAnswer}</p>
                                          </>
                                        ) : (
                                          <p className="text-sm text-muted-foreground italic">Empty</p>
                                        )}
                                      </div>
                                      {existingQuestion && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" aria-hidden="true" />}
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
