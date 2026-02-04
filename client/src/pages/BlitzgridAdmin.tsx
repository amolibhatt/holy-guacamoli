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

export default function BlitzgridAdmin() {
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
      return apiRequest('POST', `/api/blitzgrid/grids/${gridId}/categories/create`, { name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowNewCategoryForm(false);
      toast({ title: "Category created" });
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

  // Auto-select first grid when grids load (makes sidebar view the default)
  useEffect(() => {
    if (grids.length > 0 && selectedGridId === null) {
      setSelectedGridId(grids[0].id);
    }
  }, [grids, selectedGridId]);

  // Reset all editing state when switching grids to prevent stale state
  useEffect(() => {
    setSelectedCategoryId(null);
    setEditingGridId(null);
    setEditingCategoryId(null);
    setShowNewCategoryForm(false);
    setNewCategoryName("");
    setNewCategoryDescription("");
    setQuestionForms({});
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
    
    const renderQuestionSlot = (category: CategoryWithQuestions, points: number) => {
      const existingQuestion = category.questions?.find(q => q.points === points);
      const formKey = `${category.id}-${points}`;
      const formData = questionForms[formKey];
      const isEditing = !!formData;
      
      const isCategoryEditing = editingCategoryId === category.id;
      
      if (existingQuestion && !isEditing && !isCategoryEditing) {
        const hasMedia = existingQuestion.imageUrl || existingQuestion.audioUrl || existingQuestion.videoUrl;
        const hasAnswerMedia = existingQuestion.answerImageUrl || existingQuestion.answerAudioUrl || existingQuestion.answerVideoUrl;
        return (
          <div className="py-2 px-3 bg-white dark:bg-card border border-border rounded" data-testid={`question-slot-${existingQuestion.id}`}>
            <div className="flex items-start gap-3">
              <div className="w-8 text-right shrink-0 pt-0.5">
                <span className="text-sm font-semibold text-muted-foreground">{points}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" title={existingQuestion.question}>{existingQuestion.question || <span className="text-muted-foreground italic">Media only</span>}</p>
                <p className="text-sm text-muted-foreground mt-1 truncate" title={`Answer: ${existingQuestion.correctAnswer}`}>Answer: {existingQuestion.correctAnswer}</p>
                {(hasMedia || hasAnswerMedia) && (
                  <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                    {(existingQuestion.imageUrl || existingQuestion.answerImageUrl) && <span className="flex items-center gap-1"><Image className="w-3 h-3" /></span>}
                    {(existingQuestion.audioUrl || existingQuestion.answerAudioUrl) && <span className="flex items-center gap-1"><Music className="w-3 h-3" /></span>}
                    {(existingQuestion.videoUrl || existingQuestion.answerVideoUrl) && <span className="flex items-center gap-1"><Video className="w-3 h-3" /></span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }
      
      
      const defaultForm = { question: '', correctAnswer: '', options: [], imageUrl: '', audioUrl: '', videoUrl: '', answerImageUrl: '', answerAudioUrl: '', answerVideoUrl: '' };
      const hasQuestionMedia = formData?.imageUrl || formData?.audioUrl || formData?.videoUrl;
      const hasAnswerMedia = formData?.answerImageUrl || formData?.answerAudioUrl || formData?.answerVideoUrl;
      const questionValid = formData?.question || hasQuestionMedia;
      
      return (
        <div className="py-2 px-3 bg-muted/30 border border-border rounded space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 text-right shrink-0 pt-2">
              <span className="text-sm font-semibold text-muted-foreground">{points}</span>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Question {hasQuestionMedia && "(optional with media)"}</label>
                <Textarea
                  placeholder="Question..."
                  className="text-sm resize-none bg-white dark:bg-card"
                  rows={2}
                  data-testid={`input-question-${formKey}`}
                  value={formData?.question || ''}
                  onChange={(e) => setQuestionForms(prev => ({
                    ...prev,
                    [formKey]: { ...prev[formKey] || defaultForm, question: e.target.value }
                  }))}
                />
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">Media:</span>
                  <label className="cursor-pointer" data-testid={`label-upload-question-image-${formKey}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey] || defaultForm, imageUrl: url } })); toast({ title: "Image uploaded" }); } catch { toast({ title: "Upload failed", variant: "destructive" }); } } }} />
                    <Button type="button" size="sm" variant={formData?.imageUrl ? "default" : "outline"} asChild>
                      <span><Image className="w-3 h-3 mr-1" />{formData?.imageUrl ? <CheckCircle2 className="w-3 h-3" /> : "Image"}</span>
                    </Button>
                  </label>
                  <label className="cursor-pointer" data-testid={`label-upload-question-audio-${formKey}`}>
                    <input type="file" accept="audio/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey] || defaultForm, audioUrl: url } })); toast({ title: "Audio uploaded" }); } catch { toast({ title: "Upload failed", variant: "destructive" }); } } }} />
                    <Button type="button" size="sm" variant={formData?.audioUrl ? "default" : "outline"} asChild>
                      <span><Music className="w-3 h-3 mr-1" />{formData?.audioUrl ? <CheckCircle2 className="w-3 h-3" /> : "Audio"}</span>
                    </Button>
                  </label>
                  <label className="cursor-pointer" data-testid={`label-upload-question-video-${formKey}`}>
                    <input type="file" accept="video/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey] || defaultForm, videoUrl: url } })); toast({ title: "Video uploaded" }); } catch { toast({ title: "Upload failed", variant: "destructive" }); } } }} />
                    <Button type="button" size="sm" variant={formData?.videoUrl ? "default" : "outline"} asChild>
                      <span><Video className="w-3 h-3 mr-1" />{formData?.videoUrl ? <CheckCircle2 className="w-3 h-3" /> : "Video"}</span>
                    </Button>
                  </label>
                  {(formData?.imageUrl || formData?.audioUrl || formData?.videoUrl) && (
                    <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey] || defaultForm, imageUrl: '', audioUrl: '', videoUrl: '' } }))} data-testid={`button-clear-question-media-${formKey}`}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Answer</label>
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
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">Media:</span>
                  <label className="cursor-pointer" data-testid={`label-upload-answer-image-${formKey}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey] || defaultForm, answerImageUrl: url } })); toast({ title: "Image uploaded" }); } catch { toast({ title: "Upload failed", variant: "destructive" }); } } }} />
                    <Button type="button" size="sm" variant={formData?.answerImageUrl ? "default" : "outline"} asChild>
                      <span><Image className="w-3 h-3 mr-1" />{formData?.answerImageUrl ? <CheckCircle2 className="w-3 h-3" /> : "Image"}</span>
                    </Button>
                  </label>
                  <label className="cursor-pointer" data-testid={`label-upload-answer-audio-${formKey}`}>
                    <input type="file" accept="audio/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey] || defaultForm, answerAudioUrl: url } })); toast({ title: "Audio uploaded" }); } catch { toast({ title: "Upload failed", variant: "destructive" }); } } }} />
                    <Button type="button" size="sm" variant={formData?.answerAudioUrl ? "default" : "outline"} asChild>
                      <span><Music className="w-3 h-3 mr-1" />{formData?.answerAudioUrl ? <CheckCircle2 className="w-3 h-3" /> : "Audio"}</span>
                    </Button>
                  </label>
                  <label className="cursor-pointer" data-testid={`label-upload-answer-video-${formKey}`}>
                    <input type="file" accept="video/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const url = await uploadFile(file); setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey] || defaultForm, answerVideoUrl: url } })); toast({ title: "Video uploaded" }); } catch { toast({ title: "Upload failed", variant: "destructive" }); } } }} />
                    <Button type="button" size="sm" variant={formData?.answerVideoUrl ? "default" : "outline"} asChild>
                      <span><Video className="w-3 h-3 mr-1" />{formData?.answerVideoUrl ? <CheckCircle2 className="w-3 h-3" /> : "Video"}</span>
                    </Button>
                  </label>
                  {(formData?.answerImageUrl || formData?.answerAudioUrl || formData?.answerVideoUrl) && (
                    <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setQuestionForms(prev => ({ ...prev, [formKey]: { ...prev[formKey] || defaultForm, answerImageUrl: '', answerAudioUrl: '', answerVideoUrl: '' } }))} data-testid={`button-clear-answer-media-${formKey}`}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };
    
    return (
      <div className="min-h-screen bg-background flex flex-col" data-testid="page-blitzgrid-admin-grid">
        <div className="fixed inset-0 bg-gradient-to-br from-rose-300/5 via-transparent to-fuchsia-300/5 pointer-events-none" />
        <AppHeader minimal backHref="/" title="Blitzgrid Admin" />
        
        <div className="border-b border-border bg-card/50">
          <div className="max-w-4xl mx-auto px-4 w-full">
            <nav className="flex gap-1">
              <Link href="/admin/games">
                <Button 
                  variant="ghost" 
                  className="relative rounded-none border-b-2 border-primary text-foreground"
                  data-testid="tab-blitzgrid"
                >
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  Blitzgrid
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
                  <Brain className="w-4 h-4 mr-2" />
                  PsyOp
                </Button>
              </Link>
              <Link href="/admin/pastforward">
                <Button 
                  variant="ghost" 
                  className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
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
        
        <div className="border-b bg-muted/30 px-4 py-2">
          <div className="flex items-center justify-end gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              data-testid="button-download-template-top"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" /> Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || grids.length === 0}
              data-testid="button-export-grids-top"
            >
              {isExporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              data-testid="button-import-grids-top"
            >
              {isImporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
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
            </div>
            <div className="space-y-1">
              {grids.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGridId(g.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    g.id === selectedGridId 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-foreground hover-elevate'
                  }`}
                  data-testid={`sidebar-grid-${g.id}`}
                >
                  <div className="flex items-center gap-2">
                    <Grid3X3 className={`w-4 h-4 shrink-0 ${g.id === selectedGridId ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="truncate flex-1" title={g.name}>{g.name}</span>
                    {g.isActive ? (
                      <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Active" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Incomplete" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </aside>
          
          {/* Main Content */}
          <div className="flex-1 p-4 md:p-6 overflow-auto">
            {/* Mobile Grid Selector */}
            <div className="md:hidden mb-4">
              <Select value={String(selectedGridId)} onValueChange={(v) => setSelectedGridId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a grid" />
                </SelectTrigger>
                <SelectContent>
                  {grids.map(g => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      <span className="flex items-center gap-1">
                        {g.name} {g.isActive && <CheckCircle2 className="w-3 h-3 text-green-500" />}
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
                      <Grid3X3 className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-400 shrink-0" />
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
                                description: editGridDescription.trim() || "Blitzgrid" 
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
                              description: editGridDescription.trim() || "Blitzgrid" 
                            });
                          }
                        }}
                        data-testid="input-edit-grid-desc"
                      />
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        {grid?.description && grid.description !== "Blitzgrid" ? grid.description : "No description"}
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
                              description: editGridDescription.trim() || "Blitzgrid" 
                            });
                          }}
                          disabled={!editGridName.trim() || updateGridMutation.isPending}
                          data-testid="button-save-grid"
                        >
                          {updateGridMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Save</>}
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
                          setEditGridDescription(grid?.description === "Blitzgrid" ? "" : (grid?.description || ""));
                        }}
                        data-testid="button-edit-grid"
                      >
                        <Pencil className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      {grid?.isActive ? (
                        <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Ready to Play
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-3 h-3 mr-1" /> Incomplete
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
                        {createCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                      </Button>
                      <Button variant="ghost" onClick={() => { 
                        setShowNewCategoryForm(false); 
                        setNewCategoryName(""); 
                        setNewCategoryDescription("");
                      }} data-testid="button-cancel-category-create">
                        <X className="w-4 h-4" />
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
                    <Plus className="w-4 h-4 mr-2" /> Add Category ({gridCategories.length}/5)
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
                <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
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
                          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate" title={category.name}>{category.name}</CardTitle>
                            <CardDescription className="text-xs truncate" title={`${category.description || 'No description'} · ${category.questionCount}/5 questions`}>
                              {category.description ? `${category.description} · ` : ''}{category.questionCount}/5 questions
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {category.questionCount >= 5 ? (
                            <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 text-xs">Complete</Badge>
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
                            <Trash2 className="w-4 h-4 text-destructive" />
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
                                  <div className="flex items-center gap-2">
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
                                  <div className="flex items-center gap-2">
                                    <Input
                                      placeholder="Category description (optional)..."
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
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            {POINT_TIERS.map(points => (
                              <div key={points}>
                                {renderQuestionSlot(category, points)}
                              </div>
                            ))}
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
                                  {(saveQuestionMutation.isPending || updateCategoryMutation.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
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
      <AppHeader minimal backHref="/" title="Blitzgrid Admin" />
      
      <div className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-4 w-full">
          <nav className="flex gap-1">
            <Link href="/admin/games">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-primary text-foreground"
                data-testid="tab-blitzgrid"
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Blitzgrid
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
                <Brain className="w-4 h-4 mr-2" />
                PsyOp
              </Button>
            </Link>
            <Link href="/admin/pastforward">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground"
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
      
      <main className="max-w-4xl mx-auto px-4 py-6 flex-1 w-full">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Blitzgrid Grids</h1>
            <p className="text-muted-foreground text-sm">Create and edit your trivia grids</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              data-testid="button-download-template"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || grids.length === 0}
              data-testid="button-export-grids"
            >
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              data-testid="button-import-grids"
            >
              {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
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

        {loadingGrids ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : grids.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-medium mb-2">No grids yet</h3>
              <p className="text-muted-foreground text-sm">Use the Super Admin dashboard to create grids</p>
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
                            <Check className="w-3 h-3 mr-1" />
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
                          <Grid3X3 className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-400 shrink-0" />
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
                              setEditGridDescription(grid.description === "Blitzgrid" ? "" : (grid.description || ""));
                            }}
                            data-testid={`button-edit-grid-${grid.id}`}
                          >
                            <Pencil className="w-4 h-4" />
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
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Active
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
