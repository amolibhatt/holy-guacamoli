import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { ThemePreview } from "@/components/ThemePreview";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Pencil, Check, X, Grid3X3, 
  ChevronRight, ArrowLeft, Loader2,
  AlertCircle, CheckCircle2, Image, Music, Video,
  Download, Upload, FileSpreadsheet,
  Trophy, Cake, Umbrella, Briefcase, Dog, Cat, Rocket, Leaf, PartyPopper
} from "lucide-react";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
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

// Available themes for grids
const GRID_THEMES = [
  { id: 'sports', name: 'Football', iconType: 'trophy' as const },
  { id: 'birthday', name: 'Birthday', iconType: 'cake' as const },
  { id: 'beach', name: 'Beach', iconType: 'umbrella' as const },
  { id: 'office', name: 'Office', iconType: 'briefcase' as const },
  { id: 'dogs', name: 'Dogs', iconType: 'dog' as const },
  { id: 'cats', name: 'Cats', iconType: 'cat' as const },
  { id: 'space', name: 'Space', iconType: 'rocket' as const },
  { id: 'music', name: 'Music', iconType: 'music' as const },
  { id: 'nature', name: 'Nature', iconType: 'leaf' as const },
] as const;

type ThemeIconType = typeof GRID_THEMES[number]['iconType'];

const ThemeIcon = ({ type, className }: { type: ThemeIconType; className?: string }) => {
  switch (type) {
    case 'trophy': return <Trophy className={className} />;
    case 'cake': return <Cake className={className} />;
    case 'umbrella': return <Umbrella className={className} />;
    case 'briefcase': return <Briefcase className={className} />;
    case 'dog': return <Dog className={className} />;
    case 'cat': return <Cat className={className} />;
    case 'rocket': return <Rocket className={className} />;
    case 'music': return <Music className={className} />;
    case 'leaf': return <Leaf className={className} />;
    default: return <PartyPopper className={className} />;
  }
};

export default function BlitzgridAdmin() {
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  
  const [selectedGridId, setSelectedGridId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  
  const [showNewGridForm, setShowNewGridForm] = useState(false);
  const [newGridName, setNewGridName] = useState("");
  const [newGridTheme, setNewGridTheme] = useState("birthday");
  const [editingGridId, setEditingGridId] = useState<number | null>(null);
  const [editGridName, setEditGridName] = useState("");
  const [deleteGridId, setDeleteGridId] = useState<number | null>(null);
  
  const [questionForms, setQuestionForms] = useState<Record<string, { 
    question: string; 
    correctAnswer: string; 
    options: string[];
    imageUrl?: string;
    audioUrl?: string;
    videoUrl?: string;
  }>>({});
  
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryDescription, setEditCategoryDescription] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: grids = [], isLoading: loadingGrids } = useQuery<GridWithStats[]>({
    queryKey: ['/api/blitzgrid/grids'],
    enabled: isAuthenticated,
  });

  const { data: gridCategories = [], isLoading: loadingCategories } = useQuery<CategoryWithQuestions[]>({
    queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'],
    enabled: !!selectedGridId,
  });

  const createGridMutation = useMutation({
    mutationFn: async ({ name, theme }: { name: string; theme: string }) => {
      return apiRequest('POST', '/api/blitzgrid/grids', { name, theme });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setNewGridName("");
      setNewGridTheme("birthday");
      setShowNewGridForm(false);
      toast({ title: "Grid created" });
    },
    onError: () => {
      toast({ title: "Couldn't create grid", variant: "destructive" });
    },
  });

  const updateGridMutation = useMutation({
    mutationFn: async ({ id, name, theme }: { id: number; name?: string; theme?: string }) => {
      return apiRequest('PATCH', `/api/blitzgrid/grids/${id}`, { name, theme });
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

  const deleteGridMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/blitzgrid/grids/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setDeleteGridId(null);
      if (selectedGridId === deleteGridId) {
        setSelectedGridId(null);
      }
      toast({ title: "Grid deleted" });
    },
    onError: () => {
      toast({ title: "Couldn't delete grid", variant: "destructive" });
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
    mutationFn: async ({ categoryId, description }: { categoryId: number; description: string }) => {
      return apiRequest('PUT', `/api/categories/${categoryId}`, { description });
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
    mutationFn: async ({ categoryId, points, question, correctAnswer, options, imageUrl, audioUrl, videoUrl }: { 
      categoryId: number; 
      points: number; 
      question: string; 
      correctAnswer: string;
      options: string[];
      imageUrl?: string;
      audioUrl?: string;
      videoUrl?: string;
    }) => {
      return apiRequest('POST', `/api/blitzgrid/categories/${categoryId}/questions`, { 
        points, question, correctAnswer, options, imageUrl, audioUrl, videoUrl 
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setQuestionForms(prev => {
        const newForms = { ...prev };
        delete newForms[variables.points];
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
      const response = await fetch('/api/blitzgrid/template');
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
    } catch {
      toast({ title: "Import failed - check file format", variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Blitzgrid Admin" backHref="/" />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
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
      
      if (existingQuestion && !isEditing) {
        const hasMedia = existingQuestion.imageUrl || existingQuestion.audioUrl || existingQuestion.videoUrl;
        return (
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="font-medium text-xs text-muted-foreground shrink-0">{points}pts:</span>
              <span className="truncate">{existingQuestion.question}</span>
              {hasMedia && (
                <div className="flex gap-1 shrink-0">
                  {existingQuestion.imageUrl && <Image className="w-3 h-3 text-muted-foreground" />}
                  {existingQuestion.audioUrl && <Music className="w-3 h-3 text-muted-foreground" />}
                  {existingQuestion.videoUrl && <Video className="w-3 h-3 text-muted-foreground" />}
                </div>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button 
                size="icon" 
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setQuestionForms(prev => ({
                  ...prev,
                  [formKey]: {
                    question: existingQuestion.question,
                    correctAnswer: existingQuestion.correctAnswer,
                    options: existingQuestion.options || [],
                    imageUrl: existingQuestion.imageUrl || '',
                    audioUrl: existingQuestion.audioUrl || '',
                    videoUrl: existingQuestion.videoUrl || '',
                  }
                }))}
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost"
                className="h-6 w-6"
                onClick={() => deleteQuestionMutation.mutate(existingQuestion.id)}
                disabled={deleteQuestionMutation.isPending}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          </div>
        );
      }
      
      const defaultForm = { question: '', correctAnswer: '', options: [], imageUrl: '', audioUrl: '', videoUrl: '' };
      return (
        <div className="space-y-2 p-2 border border-dashed rounded">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-xs shrink-0 mt-2">{points}pts</Badge>
            <div className="flex-1 space-y-1">
              <Textarea
                placeholder="Question... (Use **bold**, *italic*, or new lines for formatting)"
                className="text-sm resize-y"
                rows={2}
                data-testid={`input-question-${formKey}`}
                value={formData?.question || ''}
                onChange={(e) => setQuestionForms(prev => ({
                  ...prev,
                  [formKey]: { ...prev[formKey] || defaultForm, question: e.target.value }
                }))}
              />
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Textarea
              placeholder="Answer... (Supports **bold**, *italic*, line breaks)"
              className="text-sm resize-y flex-1"
              rows={1}
              data-testid={`input-answer-${formKey}`}
              value={formData?.correctAnswer || ''}
              onChange={(e) => setQuestionForms(prev => ({
                ...prev,
                [formKey]: { ...prev[formKey] || defaultForm, correctAnswer: e.target.value }
              }))}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 flex-1 min-w-[180px]">
              <Image className="w-3 h-3 text-muted-foreground shrink-0" />
              <Input
                placeholder="Image URL"
                className="h-7 text-xs flex-1"
                data-testid={`input-image-url-${formKey}`}
                value={formData?.imageUrl || ''}
                onChange={(e) => setQuestionForms(prev => ({
                  ...prev,
                  [formKey]: { ...prev[formKey] || defaultForm, imageUrl: e.target.value }
                }))}
              />
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  data-testid={`input-file-image-${formKey}`}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const url = await uploadFile(file);
                        setQuestionForms(prev => ({
                          ...prev,
                          [formKey]: { ...prev[formKey] || defaultForm, imageUrl: url }
                        }));
                        toast({ title: "Image uploaded" });
                      } catch (err) {
                        toast({ title: "Upload failed", variant: "destructive" });
                      }
                    }
                  }}
                />
                <Button type="button" size="icon" variant="ghost" data-testid={`button-upload-image-${formKey}`} asChild>
                  <span><Upload className="w-4 h-4" /></span>
                </Button>
              </label>
            </div>
            <div className="flex items-center gap-1 flex-1 min-w-[180px]">
              <Music className="w-3 h-3 text-muted-foreground shrink-0" />
              <Input
                placeholder="Audio URL"
                className="h-7 text-xs flex-1"
                data-testid={`input-audio-url-${formKey}`}
                value={formData?.audioUrl || ''}
                onChange={(e) => setQuestionForms(prev => ({
                  ...prev,
                  [formKey]: { ...prev[formKey] || defaultForm, audioUrl: e.target.value }
                }))}
              />
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  data-testid={`input-file-audio-${formKey}`}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const url = await uploadFile(file);
                        setQuestionForms(prev => ({
                          ...prev,
                          [formKey]: { ...prev[formKey] || defaultForm, audioUrl: url }
                        }));
                        toast({ title: "Audio uploaded" });
                      } catch (err) {
                        toast({ title: "Upload failed", variant: "destructive" });
                      }
                    }
                  }}
                />
                <Button type="button" size="icon" variant="ghost" data-testid={`button-upload-audio-${formKey}`} asChild>
                  <span><Upload className="w-4 h-4" /></span>
                </Button>
              </label>
            </div>
            <div className="flex items-center gap-1 flex-1 min-w-[180px]">
              <Video className="w-3 h-3 text-muted-foreground shrink-0" />
              <Input
                placeholder="Video URL"
                className="h-7 text-xs flex-1"
                data-testid={`input-video-url-${formKey}`}
                value={formData?.videoUrl || ''}
                onChange={(e) => setQuestionForms(prev => ({
                  ...prev,
                  [formKey]: { ...prev[formKey] || defaultForm, videoUrl: e.target.value }
                }))}
              />
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  data-testid={`input-file-video-${formKey}`}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const url = await uploadFile(file);
                        setQuestionForms(prev => ({
                          ...prev,
                          [formKey]: { ...prev[formKey] || defaultForm, videoUrl: url }
                        }));
                        toast({ title: "Video uploaded" });
                      } catch (err) {
                        toast({ title: "Upload failed", variant: "destructive" });
                      }
                    }
                  }}
                />
                <Button type="button" size="icon" variant="ghost" data-testid={`button-upload-video-${formKey}`} asChild>
                  <span><Upload className="w-4 h-4" /></span>
                </Button>
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-8"
              onClick={() => {
                if (formData?.question && formData?.correctAnswer) {
                  saveQuestionMutation.mutate({
                    categoryId: category.id,
                    points,
                    question: formData.question,
                    correctAnswer: formData.correctAnswer,
                    options: formData.options || [],
                    imageUrl: formData.imageUrl || undefined,
                    audioUrl: formData.audioUrl || undefined,
                    videoUrl: formData.videoUrl || undefined,
                  });
                  setQuestionForms(prev => {
                    const newForms = { ...prev };
                    delete newForms[formKey];
                    return newForms;
                  });
                }
              }}
              disabled={!formData?.question || !formData?.correctAnswer || saveQuestionMutation.isPending}
            >
              {saveQuestionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" /> Save</>}
            </Button>
          </div>
        </div>
      );
    };
    
    return (
      <div className="min-h-screen bg-background" data-testid="page-blitzgrid-admin-grid">
        <AppHeader 
          title="Blitzgrid Admin" 
          subtitle={grid?.name}
          onBack={() => setSelectedGridId(null)}
        />
        <div className="container mx-auto px-4 py-6">
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{grid?.name || 'Grid'}</h1>
              <p className="text-muted-foreground text-sm">
                {gridCategories.length}/5 categories · {grid?.questionCount || 0}/25 questions
              </p>
            </div>
            <div className="flex items-center gap-2">
              {grid?.isActive ? (
                <Badge className="bg-green-500/20 text-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Ready to Play
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600">
                  <AlertCircle className="w-3 h-3 mr-1" /> Incomplete
                </Badge>
              )}
            </div>
          </div>
          
          {/* Theme Selector */}
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <span className="text-sm text-muted-foreground" data-testid="text-grid-theme-label">Theme:</span>
            {GRID_THEMES.map(theme => {
              const currentTheme = grid?.theme?.replace('blitzgrid:', '') || 'birthday';
              const isSelected = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => updateGridMutation.mutate({ id: selectedGridId, theme: theme.id })}
                  disabled={updateGridMutation.isPending}
                  className={`relative group flex items-center gap-2 px-2 py-1.5 rounded-lg border-2 transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/10 shadow-md' 
                      : 'border-transparent hover:border-muted-foreground/30 hover:bg-muted/50'
                  }`}
                  data-testid={`button-grid-theme-${theme.id}`}
                >
                  <ThemePreview themeId={theme.id} />
                  <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                    {theme.name}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              );
            })}
          </div>

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
                      }}>
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
                      onClick={() => setSelectedCategoryId(isExpanded ? null : category.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          <div>
                            <CardTitle className="text-base">{category.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {category.description ? `${category.description} · ` : ''}{category.questionCount}/5 questions
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {category.questionCount >= 5 ? (
                            <Badge className="bg-green-500/20 text-green-600 text-xs">Complete</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 text-xs">
                              {5 - category.questionCount} needed
                            </Badge>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCategoryMutation.mutate({ gridId: selectedGridId, categoryId: category.id });
                            }}
                            disabled={removeCategoryMutation.isPending}
                            data-testid={`button-remove-category-${category.id}`}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
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
                            {/* Category Description Editor */}
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                              {editingCategoryId === category.id ? (
                                <>
                                  <Input
                                    placeholder="Category description..."
                                    value={editCategoryDescription}
                                    onChange={(e) => setEditCategoryDescription(e.target.value)}
                                    autoFocus
                                    className="flex-1 h-8 text-sm"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        updateCategoryMutation.mutate({ 
                                          categoryId: category.id, 
                                          description: editCategoryDescription.trim() 
                                        });
                                      }
                                      if (e.key === 'Escape') {
                                        setEditingCategoryId(null);
                                      }
                                    }}
                                    data-testid={`input-edit-category-description-${category.id}`}
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => updateCategoryMutation.mutate({ 
                                      categoryId: category.id, 
                                      description: editCategoryDescription.trim() 
                                    })}
                                    disabled={updateCategoryMutation.isPending}
                                    data-testid={`button-save-category-description-${category.id}`}
                                  >
                                    {updateCategoryMutation.isPending ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Check className="w-3 h-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => setEditingCategoryId(null)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span className="text-sm text-muted-foreground flex-1">
                                    {category.description || 'No description'}
                                  </span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCategoryId(category.id);
                                      setEditCategoryDescription(category.description || '');
                                    }}
                                    data-testid={`button-edit-category-description-${category.id}`}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                            {POINT_TIERS.map(points => (
                              <div key={points}>
                                {renderQuestionSlot(category, points)}
                              </div>
                            ))}
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
    );
  }

  // Grid list view
  return (
    <div className="min-h-screen bg-background" data-testid="page-blitzgrid-admin">
      <AppHeader title="Blitzgrid Admin" backHref="/" />
      <div className="container mx-auto px-4 py-6">
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
            <Button
              onClick={() => setShowNewGridForm(true)}
              data-testid="button-new-grid"
            >
              <Plus className="w-4 h-4 mr-2" /> New Grid
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {showNewGridForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <Card>
                <CardContent className="py-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Grid name..."
                      value={newGridName}
                      onChange={(e) => setNewGridName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newGridName.trim()) {
                          createGridMutation.mutate({ name: newGridName.trim(), theme: newGridTheme });
                        }
                        if (e.key === 'Escape') {
                          setShowNewGridForm(false);
                          setNewGridName("");
                        }
                      }}
                      data-testid="input-grid-name"
                    />
                    <Button
                      onClick={() => createGridMutation.mutate({ name: newGridName.trim(), theme: newGridTheme })}
                      disabled={!newGridName.trim() || createGridMutation.isPending}
                      data-testid="button-create-grid"
                    >
                      {createGridMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowNewGridForm(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground" data-testid="text-theme-label">Theme:</span>
                    {GRID_THEMES.map(theme => {
                      const isSelected = newGridTheme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => setNewGridTheme(theme.id)}
                          className={`relative group flex items-center gap-2 px-2 py-1.5 rounded-lg border-2 transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary/10 shadow-md' 
                              : 'border-transparent hover:border-muted-foreground/30 hover:bg-muted/50'
                          }`}
                          data-testid={`button-theme-${theme.id}`}
                        >
                          <ThemePreview themeId={theme.id} />
                          <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                            {theme.name}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {loadingGrids ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : grids.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-medium mb-2">No grids yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Create your first Blitzgrid</p>
              <Button onClick={() => setShowNewGridForm(true)} data-testid="button-create-first-grid">
                <Plus className="w-4 h-4 mr-2" /> Create Grid
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
                      <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editGridName}
                          onChange={(e) => setEditGridName(e.target.value)}
                          className="h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editGridName.trim()) {
                              updateGridMutation.mutate({ id: grid.id, name: editGridName.trim() });
                            } else if (e.key === 'Escape') {
                              setEditingGridId(null);
                            }
                          }}
                          data-testid={`input-edit-grid-${grid.id}`}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => {
                            if (editGridName.trim()) {
                              updateGridMutation.mutate({ id: grid.id, name: editGridName.trim() });
                            }
                          }}
                          disabled={!editGridName.trim() || updateGridMutation.isPending}
                          data-testid={`button-save-grid-${grid.id}`}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => setEditingGridId(null)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <Grid3X3 className="w-5 h-5 text-purple-500 shrink-0" />
                          <h3 className="font-semibold truncate">{grid.name}</h3>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGridId(grid.id);
                              setEditGridName(grid.name);
                            }}
                            data-testid={`button-edit-grid-${grid.id}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteGridId(grid.id);
                            }}
                            data-testid={`button-delete-grid-${grid.id}`}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
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
                      <Badge className="bg-green-500/20 text-green-600 text-xs shrink-0">
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
      </div>

      <AlertDialog open={deleteGridId !== null} onOpenChange={(open) => !open && setDeleteGridId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this grid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the grid and unlink all categories. Categories and questions will still exist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGridId && deleteGridMutation.mutate(deleteGridId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
