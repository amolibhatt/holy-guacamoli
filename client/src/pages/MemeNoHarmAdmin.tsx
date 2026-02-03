import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Link } from "wouter";
import { Plus, Trash2, Play, Smile, Image as ImageIcon, MessageSquare, Grid3X3, Brain, Clock } from "lucide-react";
import type { MemePrompt, MemeImage } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MemeNoHarmAdmin() {
  const { toast } = useToast();
  const [newPrompt, setNewPrompt] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageCaption, setNewImageCaption] = useState("");

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
    }
  };

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
                Blitzgrid
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
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Prompt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePrompt} className="flex gap-2">
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
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Meme Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateImage} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                      id="imageUrl"
                      placeholder="https://example.com/meme.jpg"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      data-testid="input-new-image-url"
                    />
                  </div>
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
