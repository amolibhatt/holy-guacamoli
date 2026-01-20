import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Pencil, X, Check, ChevronLeft, Play, History, CheckCircle, Gamepad2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import type { Category, Question, Board, BoardCategoryWithCount } from "@shared/schema";

const FIXED_POINT_VALUES = [10, 20, 30, 40, 50];

function ProgressBar({ value, max, showLabel = false }: { value: number; max: number; showLabel?: boolean }) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  const isComplete = value >= max;
  
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : percent > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && <span className="text-xs text-muted-foreground whitespace-nowrap">{value}/{max}</span>}
    </div>
  );
}

type CategoryWithCount = Category & { questionCount: number };

export default function Admin() {
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  
  const [newGameName, setNewGameName] = useState("");
  const [showNewGameForm, setShowNewGameForm] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  
  const [deleteGameConfirmId, setDeleteGameConfirmId] = useState<number | null>(null);
  const [deleteTopicConfirmId, setDeleteTopicConfirmId] = useState<number | null>(null);
  
  // Data fetching
  const { data: games = [], isLoading: loadingGames } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
    enabled: isAuthenticated,
  });
  
  const { data: allCategories = [] } = useQuery<CategoryWithCount[]>({
    queryKey: ['/api/categories/with-counts'],
    enabled: isAuthenticated,
  });
  
  const selectedGame = games.find(g => g.id === selectedGameId);
  
  const { data: gameTopics = [], isLoading: loadingTopics } = useQuery<BoardCategoryWithCount[]>({
    queryKey: ['/api/boards', selectedGameId, 'categories'],
    enabled: !!selectedGameId,
  });
  
  // Auto-select first topic when game is selected
  useEffect(() => {
    if (gameTopics.length > 0 && !selectedTopicId) {
      setSelectedTopicId(gameTopics[0].categoryId);
    }
  }, [gameTopics, selectedTopicId]);
  
  const selectedTopic = gameTopics.find(t => t.categoryId === selectedTopicId);
  const selectedTopicCategory = allCategories.find(c => c.id === selectedTopicId);
  
  const { data: topicQuestions = [], isLoading: loadingQuestions } = useQuery<Question[]>({
    queryKey: ['/api/categories', selectedTopicId, 'questions'],
    enabled: !!selectedTopicId,
  });
  
  const usedPoints = topicQuestions.map(q => q.points);
  const availablePoints = FIXED_POINT_VALUES.filter(p => !usedPoints.includes(p));
  
  // Calculate total progress for the game
  const totalQuestions = gameTopics.reduce((sum, t) => sum + (t.questionCount || 0), 0);
  const maxQuestions = gameTopics.length * 5;
  
  // Mutations
  const createGameMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiRequest('POST', '/api/boards', { ...data, description: '', pointValues: FIXED_POINT_VALUES });
    },
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      setNewGameName("");
      setShowNewGameForm(false);
      const newGame = await response.json();
      setSelectedGameId(newGame.id);
      toast({ title: "Game created!" });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't create game", description: error.message, variant: "destructive" });
    },
  });
  
  const deleteGameMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/boards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      if (selectedGameId === deleteGameConfirmId) {
        setSelectedGameId(null);
        setSelectedTopicId(null);
      }
      toast({ title: "Game deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
    },
  });
  
  const createTopicMutation = useMutation({
    mutationFn: async (data: { name: string; gameId: number }) => {
      // First create the category with all required fields
      const catResponse = await apiRequest('POST', '/api/categories', { 
        name: data.name, 
        description: '', 
        imageUrl: '' 
      });
      const category = await catResponse.json();
      // Then link it to the game
      await apiRequest('POST', `/api/boards/${data.gameId}/categories`, { categoryId: category.id, position: gameTopics.length });
      return category;
    },
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedGameId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories/with-counts'] });
      setNewTopicName("");
      setShowNewTopicForm(false);
      setSelectedTopicId(category.id);
      toast({ title: "Topic added!" });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't add topic", description: error.message, variant: "destructive" });
    },
  });
  
  const deleteTopicMutation = useMutation({
    mutationFn: async (boardCategoryId: number) => {
      return apiRequest('DELETE', `/api/board-categories/${boardCategoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedGameId, 'categories'] });
      if (selectedTopicId === deleteTopicConfirmId) {
        setSelectedTopicId(gameTopics.length > 1 ? gameTopics[0].categoryId : null);
      }
      toast({ title: "Topic removed" });
    },
  });
  
  const createQuestionMutation = useMutation({
    mutationFn: async (data: { categoryId: number; question: string; correctAnswer: string; points: number }) => {
      return apiRequest('POST', '/api/questions', { ...data, options: [] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', selectedTopicId, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedGameId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories/with-counts'] });
      setNewQuestion("");
      setNewAnswer("");
      toast({ title: "Question added!" });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't add question", description: error.message, variant: "destructive" });
    },
  });
  
  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, question, correctAnswer }: { id: number; question: string; correctAnswer: string }) => {
      return apiRequest('PUT', `/api/questions/${id}`, { question, correctAnswer, options: [] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', selectedTopicId, 'questions'] });
      setEditingQuestionId(null);
      setEditQuestion("");
      setEditAnswer("");
      toast({ title: "Question updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
    },
  });
  
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', selectedTopicId, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards', selectedGameId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories/with-counts'] });
      toast({ title: "Question deleted" });
    },
  });

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p>Please log in to access the admin panel.</p>
            <Link href="/login">
              <Button className="mt-4">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Game detail view - single page with topics and questions
  if (selectedGameId && selectedGame) {
    return (
      <div className="min-h-screen bg-background" data-testid="page-admin-game">
        <AppHeader />
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => { setSelectedGameId(null); setSelectedTopicId(null); }} data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Gamepad2 className="w-6 h-6 text-primary" />
                {selectedGame.name}
              </h1>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-sm text-muted-foreground">{gameTopics.length}/5 topics</span>
                <span className="text-sm text-muted-foreground">{totalQuestions}/{maxQuestions} questions</span>
              </div>
            </div>
            <Link href={`/board/${selectedGameId}`}>
              <Button data-testid="button-play-game">
                <Play className="w-4 h-4 mr-2" /> Play
              </Button>
            </Link>
          </div>
          
          {/* Progress bar */}
          <div className="mb-6">
            <ProgressBar value={totalQuestions} max={maxQuestions || 25} showLabel />
          </div>
          
          {/* Topics as tabs */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {loadingTopics ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                {gameTopics.map(topic => {
                  const isSelected = topic.categoryId === selectedTopicId;
                  const isComplete = (topic.questionCount || 0) >= 5;
                  return (
                    <Button
                      key={topic.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTopicId(topic.categoryId)}
                      className="gap-2"
                      data-testid={`tab-topic-${topic.categoryId}`}
                    >
                      {topic.category?.name || "Topic"}
                      {isComplete && <CheckCircle className="w-3 h-3" />}
                      {!isComplete && <Badge variant="secondary" className="text-xs">{topic.questionCount || 0}/5</Badge>}
                    </Button>
                  );
                })}
                {gameTopics.length < 5 && (
                  showNewTopicForm ? (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Topic name"
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        className="w-40 h-9"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTopicName.trim() && selectedGameId) {
                            createTopicMutation.mutate({ name: newTopicName.trim(), gameId: selectedGameId });
                          }
                          if (e.key === 'Escape') setShowNewTopicForm(false);
                        }}
                        data-testid="input-topic-name"
                      />
                      <Button 
                        size="sm"
                        onClick={() => createTopicMutation.mutate({ name: newTopicName.trim(), gameId: selectedGameId })}
                        disabled={!newTopicName.trim() || createTopicMutation.isPending}
                      >
                        {createTopicMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNewTopicForm(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setShowNewTopicForm(true)} data-testid="button-add-topic">
                      <Plus className="w-4 h-4 mr-1" /> Add Topic
                    </Button>
                  )
                )}
              </>
            )}
          </div>
          
          {/* Questions for selected topic */}
          {selectedTopicId ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">{selectedTopicCategory?.name || "Questions"}</h2>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      const topicToDelete = gameTopics.find(t => t.categoryId === selectedTopicId);
                      if (topicToDelete) setDeleteTopicConfirmId(topicToDelete.id);
                    }}
                    data-testid="button-delete-topic"
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Remove Topic
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {loadingQuestions ? (
                    [1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)
                  ) : (
                    <>
                      {/* Show all 5 point slots */}
                      {FIXED_POINT_VALUES.map(points => {
                        const question = topicQuestions.find(q => q.points === points);
                        const isEditing = question && editingQuestionId === question.id;
                        
                        if (question) {
                          return (
                            <div key={points} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border">
                              <Badge variant="secondary" className="shrink-0 mt-0.5">{points}</Badge>
                              {isEditing ? (
                                <div className="flex-1 space-y-2">
                                  <Input
                                    value={editQuestion}
                                    onChange={(e) => setEditQuestion(e.target.value)}
                                    placeholder="Question"
                                    autoFocus
                                  />
                                  <Input
                                    value={editAnswer}
                                    onChange={(e) => setEditAnswer(e.target.value)}
                                    placeholder="Answer"
                                  />
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm"
                                      onClick={() => updateQuestionMutation.mutate({ id: question.id, question: editQuestion.trim(), correctAnswer: editAnswer.trim() })}
                                      disabled={!editQuestion.trim() || !editAnswer.trim() || updateQuestionMutation.isPending}
                                    >
                                      {updateQuestionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setEditingQuestionId(null); setEditQuestion(""); setEditAnswer(""); }}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm">{question.question}</p>
                                    <p className="text-xs text-primary mt-1">{question.correctAnswer}</p>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button 
                                      size="icon" 
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => { setEditingQuestionId(question.id); setEditQuestion(question.question); setEditAnswer(question.correctAnswer); }}
                                      data-testid={`button-edit-question-${question.id}`}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      size="icon" 
                                      variant="ghost"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                      onClick={() => deleteQuestionMutation.mutate(question.id)}
                                      data-testid={`button-delete-question-${question.id}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        }
                        
                        // Empty slot - show add form for next available point
                        const isNextToAdd = points === availablePoints[0];
                        return (
                          <div key={points} className={`flex items-start gap-3 p-3 rounded-lg border-2 border-dashed ${isNextToAdd ? 'border-primary/30 bg-primary/5' : 'border-border/50'}`}>
                            <Badge variant="outline" className="shrink-0 mt-0.5">{points}</Badge>
                            {isNextToAdd ? (
                              <div className="flex-1 space-y-2">
                                <Input
                                  placeholder="Enter question..."
                                  value={newQuestion}
                                  onChange={(e) => setNewQuestion(e.target.value)}
                                  data-testid="input-question"
                                />
                                <Input
                                  placeholder="Enter answer..."
                                  value={newAnswer}
                                  onChange={(e) => setNewAnswer(e.target.value)}
                                  data-testid="input-answer"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newQuestion.trim() && newAnswer.trim()) {
                                      createQuestionMutation.mutate({
                                        categoryId: selectedTopicId,
                                        question: newQuestion.trim(),
                                        correctAnswer: newAnswer.trim(),
                                        points,
                                      });
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (newQuestion.trim() && newAnswer.trim()) {
                                      createQuestionMutation.mutate({
                                        categoryId: selectedTopicId,
                                        question: newQuestion.trim(),
                                        correctAnswer: newAnswer.trim(),
                                        points,
                                      });
                                    }
                                  }}
                                  disabled={!newQuestion.trim() || !newAnswer.trim() || createQuestionMutation.isPending}
                                  data-testid="button-add-question"
                                >
                                  {createQuestionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                  Add Question
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">Empty</span>
                            )}
                          </div>
                        );
                      })}
                      
                      {availablePoints.length === 0 && (
                        <div className="text-center py-4">
                          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                          <p className="text-emerald-600 font-medium">Topic complete!</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : gameTopics.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">Add your first topic to get started</p>
                <Button onClick={() => setShowNewTopicForm(true)} data-testid="button-add-first-topic">
                  <Plus className="w-4 h-4 mr-2" /> Add Topic
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Delete Topic Confirmation */}
        <AlertDialog open={deleteTopicConfirmId !== null} onOpenChange={(open) => !open && setDeleteTopicConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this topic?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the topic from this game. The questions will still exist.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteTopicConfirmId) {
                    deleteTopicMutation.mutate(deleteTopicConfirmId);
                    setDeleteTopicConfirmId(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Main view - Game list
  return (
    <div className="min-h-screen bg-background" data-testid="page-admin">
      <AppHeader />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Games</h1>
            <p className="text-muted-foreground text-sm">{games.length} games</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/history">
              <Button variant="outline" size="sm" data-testid="button-history">
                <History className="w-4 h-4 mr-2" /> History
              </Button>
            </Link>
            <Button onClick={() => setShowNewGameForm(true)} data-testid="button-new-game">
              <Plus className="w-4 h-4 mr-2" /> New Game
            </Button>
          </div>
        </div>
        
        <AnimatePresence>
          {showNewGameForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Game name (e.g., Amoli's Birthday Trivia)"
                      value={newGameName}
                      onChange={(e) => setNewGameName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newGameName.trim()) {
                          createGameMutation.mutate({ name: newGameName.trim() });
                        }
                        if (e.key === 'Escape') setShowNewGameForm(false);
                      }}
                      data-testid="input-game-name"
                    />
                    <Button 
                      onClick={() => createGameMutation.mutate({ name: newGameName.trim() })}
                      disabled={!newGameName.trim() || createGameMutation.isPending}
                      data-testid="button-create-game"
                    >
                      {createGameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowNewGameForm(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        
        {loadingGames ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : games.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Gamepad2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-medium mb-2">No games yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Create your first trivia game</p>
              <Button onClick={() => setShowNewGameForm(true)} data-testid="button-create-first-game">
                <Plus className="w-4 h-4 mr-2" /> Create Game
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {games.map(game => (
              <Card 
                key={game.id} 
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => { setSelectedGameId(game.id); setSelectedTopicId(null); }}
                data-testid={`card-game-${game.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Gamepad2 className="w-5 h-5 text-primary shrink-0" />
                      <h3 className="font-semibold truncate">{game.name}</h3>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => { e.stopPropagation(); setDeleteGameConfirmId(game.id); }}
                      data-testid={`button-delete-game-${game.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Click to edit topics and questions</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Game Confirmation */}
      <AlertDialog open={deleteGameConfirmId !== null} onOpenChange={(open) => !open && setDeleteGameConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this game?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the game. Topics and questions will still exist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteGameConfirmId) {
                  deleteGameMutation.mutate(deleteGameConfirmId);
                  setDeleteGameConfirmId(null);
                }
              }}
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
