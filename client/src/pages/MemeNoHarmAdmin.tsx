import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Link, useLocation } from "wouter";
import { Plus, Trash2, Play, Smile, Image as ImageIcon, MessageSquare, Grid3X3, Brain, Clock, Loader2, Upload, Search, Link2, TrendingUp, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { MemePrompt, MemeImage } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MemeNoHarmAdmin() {
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Access denied check
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [newPrompt, setNewPrompt] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageCaption, setNewImageCaption] = useState("");
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [bulkPrompts, setBulkPrompts] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [imageAddMode, setImageAddMode] = useState<"giphy" | "url">("giphy");
  const [giphySearch, setGiphySearch] = useState("");
  const [giphySearchDebounced, setGiphySearchDebounced] = useState("");
  const [addingGifId, setAddingGifId] = useState<string | null>(null);
  const [addedGifIds, setAddedGifIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      setGiphySearchDebounced(giphySearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [giphySearch]);

  type GiphyResult = { id: string; title: string; previewUrl: string; fullUrl: string; width: number; height: number };
  type GiphyResponse = { results: GiphyResult[]; totalCount: number; offset: number };

  const { data: giphyResults, isLoading: giphyLoading, isError: giphyError } = useQuery<GiphyResponse>({
    queryKey: ["/api/giphy/search", giphySearchDebounced],
    queryFn: async () => {
      const res = await fetch(`/api/giphy/search?q=${encodeURIComponent(giphySearchDebounced)}&limit=20`);
      if (!res.ok) throw new Error("GIPHY search failed");
      return res.json();
    },
    enabled: giphySearchDebounced.trim().length > 0,
  });

  const { data: giphyTrending, isLoading: trendingLoading } = useQuery<GiphyResponse>({
    queryKey: ["/api/giphy/trending"],
    queryFn: async () => {
      const res = await fetch(`/api/giphy/trending?limit=20`);
      if (!res.ok) throw new Error("GIPHY trending failed");
      return res.json();
    },
    enabled: giphySearchDebounced.trim().length === 0,
  });

  const handleAddGif = useCallback(async (gif: GiphyResult) => {
    setAddingGifId(gif.id);
    try {
      const res = await apiRequest("POST", "/api/memenoharm/images", {
        imageUrl: gif.fullUrl,
        caption: gif.title || undefined,
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/memenoharm/images"] });
        setAddedGifIds(prev => new Set(prev).add(gif.id));
        toast({ title: "GIF added!" });
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to add GIF", variant: "destructive" });
    }
    setAddingGifId(null);
  }, [toast]);

  const { data: prompts = [], isLoading: promptsLoading } = useQuery<MemePrompt[]>({
    queryKey: ["/api/memenoharm/prompts"],
  });

  const { data: images = [], isLoading: imagesLoading } = useQuery<MemeImage[]>({
    queryKey: ["/api/memenoharm/images"],
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

  const createImageMutation = useMutation({
    mutationFn: async (data: { imageUrl: string; caption?: string }) => {
      const res = await apiRequest("POST", "/api/memenoharm/images", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add image");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memenoharm/images"] });
      toast({ title: "Image added!" });
      setNewImageUrl("");
      setNewImageCaption("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/memenoharm/images/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete image");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memenoharm/images"] });
      toast({ title: "Image deleted!" });
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

  const handleCreateImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newImageUrl.trim()) {
      createImageMutation.mutate({ 
        imageUrl: newImageUrl.trim(), 
        caption: newImageCaption.trim() || undefined 
      });
      setImagePreviewError(false);
    }
  };

  const handleImageUrlChange = (url: string) => {
    setNewImageUrl(url);
    setImagePreviewError(false);
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url.trim());
      return url.trim().length > 0;
    } catch {
      return false;
    }
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

  // Auth loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Redirect if not authenticated
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
            <p className="text-muted-foreground text-sm">Create prompts and add meme images</p>
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

        <Tabs defaultValue="prompts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="prompts" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Prompts ({prompts.length})
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Meme Images ({images.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prompts" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="images" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Meme Image
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant={imageAddMode === "giphy" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setImageAddMode("giphy")}
                      className="gap-1"
                      data-testid="button-mode-giphy"
                    >
                      <Search className="w-3 h-3" />
                      GIPHY
                    </Button>
                    <Button
                      variant={imageAddMode === "url" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setImageAddMode("url")}
                      className="gap-1"
                      data-testid="button-mode-url"
                    >
                      <Link2 className="w-3 h-3" />
                      Paste URL
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {imageAddMode === "giphy" ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search GIFs... (e.g., funny cat, surprised, excited)"
                        value={giphySearch}
                        onChange={(e) => setGiphySearch(e.target.value)}
                        className="pl-10"
                        data-testid="input-giphy-search"
                      />
                    </div>

                    {giphySearch.trim().length === 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        Trending GIFs
                      </div>
                    )}

                    {(giphyLoading || trendingLoading) && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <Skeleton key={i} className="aspect-square rounded-md" />
                        ))}
                      </div>
                    )}

                    {giphyError && (
                      <p className="text-center text-muted-foreground py-4 text-sm" data-testid="giphy-error">
                        Could not search GIPHY. Make sure the API key is configured.
                      </p>
                    )}

                    {(() => {
                      const displayResults = giphySearch.trim().length > 0
                        ? giphyResults?.results
                        : giphyTrending?.results;

                      if (!displayResults || displayResults.length === 0) {
                        if (!giphyLoading && !trendingLoading && giphySearchDebounced.trim().length > 0) {
                          return (
                            <p className="text-center text-muted-foreground py-4 text-sm">
                              No GIFs found for "{giphySearchDebounced}"
                            </p>
                          );
                        }
                        return null;
                      }

                      return (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {displayResults.map((gif) => {
                            const isAdding = addingGifId === gif.id;
                            const isAdded = addedGifIds.has(gif.id);
                            return (
                              <div
                                key={gif.id}
                                className={`relative aspect-square rounded-md overflow-hidden bg-muted cursor-pointer group ${isAdded ? 'ring-2 ring-green-500' : ''}`}
                                onClick={() => !isAdding && !isAdded && handleAddGif(gif)}
                                data-testid={`giphy-result-${gif.id}`}
                              >
                                <img
                                  src={gif.previewUrl}
                                  alt={gif.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                                <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${isAdded ? 'bg-green-500/30 opacity-100' : isAdding ? 'bg-black/50 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'}`}>
                                  {isAdding ? (
                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                  ) : isAdded ? (
                                    <Check className="w-6 h-6 text-white" />
                                  ) : (
                                    <Plus className="w-6 h-6 text-white" />
                                  )}
                                </div>
                                {gif.title && (
                                  <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/70 text-white text-[10px] truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                    {gif.title}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    <div className="text-center text-[10px] text-muted-foreground pt-2">
                      Powered by GIPHY
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateImage} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="imageUrl">Image URL</Label>
                      <Input
                        id="imageUrl"
                        placeholder="https://example.com/meme.jpg"
                        value={newImageUrl}
                        onChange={(e) => handleImageUrlChange(e.target.value)}
                        data-testid="input-new-image-url"
                      />
                    </div>
                    {isValidUrl(newImageUrl) && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-xs">Preview</Label>
                        {imagePreviewError ? (
                          <div className="w-full max-w-[200px] aspect-square rounded-md bg-muted flex items-center justify-center text-muted-foreground text-sm" data-testid="image-preview-error">
                            Could not load image
                          </div>
                        ) : (
                          <img
                            src={newImageUrl.trim()}
                            alt="Preview"
                            className="w-full max-w-[200px] aspect-square object-cover rounded-md bg-muted"
                            onError={() => setImagePreviewError(true)}
                            data-testid="image-preview"
                          />
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="caption">Caption (optional)</Label>
                      <Input
                        id="caption"
                        placeholder="Description of the meme"
                        value={newImageCaption}
                        onChange={(e) => setNewImageCaption(e.target.value)}
                        data-testid="input-new-image-caption"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={!newImageUrl.trim() || createImageMutation.isPending}
                      data-testid="button-create-image"
                    >
                      Add Image
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Meme Images</CardTitle>
              </CardHeader>
              <CardContent>
                {imagesLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <Skeleton className="aspect-square" />
                    <Skeleton className="aspect-square" />
                    <Skeleton className="aspect-square" />
                    <Skeleton className="aspect-square" />
                  </div>
                ) : images.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No meme images yet. Add some above!
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((image) => (
                      <div 
                        key={image.id} 
                        className="relative group aspect-square rounded-lg overflow-hidden bg-muted"
                        data-testid={`image-item-${image.id}`}
                      >
                        <img
                          src={image.imageUrl}
                          alt={image.caption || "Meme"}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => deleteImageMutation.mutate(image.id)}
                            disabled={deleteImageMutation.isPending}
                            data-testid={`button-delete-image-${image.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {image.caption && (
                          <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/70 text-white text-xs truncate">
                            {image.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AppFooter />
    </div>
  );
}
