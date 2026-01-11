import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowLeft, Loader2, Pencil, X, Check, Grid3X3, Layers, Play, Sun, Moon, Smartphone, Zap, Timer } from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/context/ThemeContext";
import type { Game, Board, HeadsUpDeck, HeadsUpCard, GameMode, RapidFireSettings } from "@shared/schema";

const MODE_LABELS: Record<GameMode, string> = {
  jeopardy: "Jeopardy (Multi-Board)",
  heads_up: "Heads Up",
  board: "Grid of Grudges",
  rapid_fire: "Brain Rot Blitz",
};

const MODE_ICONS: Record<GameMode, typeof Grid3X3> = {
  jeopardy: Grid3X3,
  heads_up: Smartphone,
  board: Grid3X3,
  rapid_fire: Zap,
};

const DEFAULT_RAPID_FIRE_SETTINGS: RapidFireSettings = {
  timerSeconds: 60,
  basePoints: 10,
  multiplierIncrement: 0.5,
  maxMultiplier: 5,
  resetOnWrong: true,
};

export default function GamesAdmin() {
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const { colorMode, toggleColorMode } = useTheme();
  const [, setLocation] = useLocation();
  
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [showNewGameForm, setShowNewGameForm] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const [newGameMode, setNewGameMode] = useState<GameMode>("board");
  const [rapidFireSettings, setRapidFireSettings] = useState<RapidFireSettings>(DEFAULT_RAPID_FIRE_SETTINGS);
  
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [showNewDeckForm, setShowNewDeckForm] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckTimer, setNewDeckTimer] = useState(60);
  
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [newCardPrompt, setNewCardPrompt] = useState("");
  
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [editGameName, setEditGameName] = useState("");
  
  const [editingDeckId, setEditingDeckId] = useState<number | null>(null);
  const [editDeckName, setEditDeckName] = useState("");
  const [editDeckTimer, setEditDeckTimer] = useState(60);
  
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editCardPrompt, setEditCardPrompt] = useState("");

  const { data: games = [], isLoading: loadingGames } = useQuery<Game[]>({
    queryKey: ['/api/games'],
    enabled: isAuthenticated,
  });

  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
    enabled: isAuthenticated,
  });

  const { data: decks = [], isLoading: loadingDecks } = useQuery<(HeadsUpDeck & { cardCount: number })[]>({
    queryKey: ['/api/heads-up-decks'],
    enabled: isAuthenticated,
  });

  const selectedGame = games.find(g => g.id === selectedGameId);
  const selectedDeck = decks.find(d => d.id === selectedDeckId);

  const { data: gameBoards = [] } = useQuery<{ id: number; gameId: number; boardId: number; position: number; board: Board }[]>({
    queryKey: ['/api/games', selectedGameId, 'boards'],
    enabled: !!selectedGameId && (selectedGame?.mode === 'jeopardy' || selectedGame?.mode === 'board' || selectedGame?.mode === 'rapid_fire'),
  });

  const { data: gameDecks = [] } = useQuery<{ id: number; gameId: number; deckId: number; position: number; deck: HeadsUpDeck }[]>({
    queryKey: ['/api/games', selectedGameId, 'decks'],
    enabled: !!selectedGameId && selectedGame?.mode === 'heads_up',
  });

  const { data: cards = [], isLoading: loadingCards } = useQuery<HeadsUpCard[]>({
    queryKey: ['/api/heads-up-decks', selectedDeckId, 'cards'],
    enabled: !!selectedDeckId,
  });

  const linkedBoardIds = gameBoards.map(gb => gb.boardId);
  const availableBoards = boards.filter(b => !linkedBoardIds.includes(b.id));

  const linkedDeckIds = gameDecks.map(gd => gd.deckId);
  const availableDecks = decks.filter(d => !linkedDeckIds.includes(d.id));

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthLoading, isAuthenticated, setLocation]);

  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground mt-4">Loading...</p>
      </div>
    );
  }

  const createGameMutation = useMutation({
    mutationFn: async (data: { name: string; mode: GameMode; settings?: Record<string, unknown> }) => {
      return apiRequest('POST', '/api/games', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      setNewGameName("");
      setNewGameMode("board");
      setRapidFireSettings(DEFAULT_RAPID_FIRE_SETTINGS);
      setShowNewGameForm(false);
      toast({ title: "Game created!" });
    },
    onError: () => {
      toast({ title: "Failed to create game", variant: "destructive" });
    },
  });

  const updateGameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      return apiRequest('PUT', `/api/games/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      setEditingGameId(null);
      toast({ title: "Game updated!" });
    },
  });

  const deleteGameMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/games/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      if (selectedGameId) setSelectedGameId(null);
      toast({ title: "Game deleted" });
    },
  });

  const addBoardToGameMutation = useMutation({
    mutationFn: async ({ gameId, boardId }: { gameId: number; boardId: number }) => {
      return apiRequest('POST', `/api/games/${gameId}/boards`, { boardId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games', selectedGameId, 'boards'] });
      toast({ title: "Board added to game!" });
    },
  });

  const removeBoardFromGameMutation = useMutation({
    mutationFn: async ({ gameId, boardId }: { gameId: number; boardId: number }) => {
      return apiRequest('DELETE', `/api/games/${gameId}/boards/${boardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games', selectedGameId, 'boards'] });
      toast({ title: "Board removed from game" });
    },
  });

  const createDeckMutation = useMutation({
    mutationFn: async (data: { name: string; timerSeconds: number }) => {
      return apiRequest('POST', '/api/heads-up-decks', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/heads-up-decks'] });
      setNewDeckName("");
      setNewDeckTimer(60);
      setShowNewDeckForm(false);
      toast({ title: "Deck created!" });
    },
  });

  const updateDeckMutation = useMutation({
    mutationFn: async ({ id, name, timerSeconds }: { id: number; name: string; timerSeconds: number }) => {
      return apiRequest('PUT', `/api/heads-up-decks/${id}`, { name, timerSeconds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/heads-up-decks'] });
      setEditingDeckId(null);
      toast({ title: "Deck updated!" });
    },
  });

  const deleteDeckMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/heads-up-decks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/heads-up-decks'] });
      if (selectedDeckId === selectedDeckId) setSelectedDeckId(null);
      toast({ title: "Deck deleted" });
    },
  });

  const addDeckToGameMutation = useMutation({
    mutationFn: async ({ gameId, deckId }: { gameId: number; deckId: number }) => {
      return apiRequest('POST', `/api/games/${gameId}/decks`, { deckId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games', selectedGameId, 'decks'] });
      toast({ title: "Deck added to game!" });
    },
  });

  const removeDeckFromGameMutation = useMutation({
    mutationFn: async ({ gameId, deckId }: { gameId: number; deckId: number }) => {
      return apiRequest('DELETE', `/api/games/${gameId}/decks/${deckId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games', selectedGameId, 'decks'] });
      toast({ title: "Deck removed from game" });
    },
  });

  const createCardMutation = useMutation({
    mutationFn: async (data: { deckId: number; prompt: string }) => {
      return apiRequest('POST', `/api/heads-up-decks/${data.deckId}/cards`, { prompt: data.prompt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/heads-up-decks', selectedDeckId, 'cards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/heads-up-decks'] });
      setNewCardPrompt("");
      setShowNewCardForm(false);
      toast({ title: "Card added!" });
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: async ({ id, prompt }: { id: number; prompt: string }) => {
      return apiRequest('PUT', `/api/heads-up-cards/${id}`, { prompt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/heads-up-decks', selectedDeckId, 'cards'] });
      setEditingCardId(null);
      toast({ title: "Card updated!" });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/heads-up-cards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/heads-up-decks', selectedDeckId, 'cards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/heads-up-decks'] });
      toast({ title: "Card deleted" });
    },
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="sticky top-0 z-50 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center gap-4 max-w-[1600px] mx-auto">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-admin">
              <ArrowLeft className="w-4 h-4" />
              Back to Admin
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Game Manager</h1>
            <p className="text-sm text-muted-foreground">Create and configure different game types</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground" 
            onClick={toggleColorMode}
            data-testid="button-color-mode-games"
          >
            {colorMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-6">
        <Tabs defaultValue="games" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="games" className="gap-2" data-testid="tab-games">
              <Layers className="w-4 h-4" />
              Games
            </TabsTrigger>
            <TabsTrigger value="decks" className="gap-2" data-testid="tab-decks">
              <Smartphone className="w-4 h-4" />
              Heads Up Decks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="games">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4">
                <Card className="bg-card border-border shadow-sm">
                  <CardHeader className="py-4 px-4 border-b border-border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-foreground text-sm font-semibold uppercase tracking-wide">
                        <Layers className="w-4 h-4 text-primary" />
                        Your Games
                      </CardTitle>
                      <Button
                        size="icon"
                        variant={showNewGameForm ? "secondary" : "default"}
                        onClick={() => setShowNewGameForm(!showNewGameForm)}
                        className="h-8 w-8"
                        data-testid="button-toggle-game-form"
                      >
                        {showNewGameForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3">
                    <AnimatePresence>
                      {showNewGameForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 p-3 bg-muted/20 rounded-lg border border-border"
                        >
                          <Input
                            placeholder="Game name"
                            value={newGameName}
                            onChange={(e) => setNewGameName(e.target.value)}
                            data-testid="input-game-name"
                          />
                          <Select value={newGameMode} onValueChange={(v) => setNewGameMode(v as GameMode)}>
                            <SelectTrigger data-testid="select-game-mode">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="board">Grid of Grudges (Classic Board)</SelectItem>
                              <SelectItem value="rapid_fire">Brain Rot Blitz (Rapid Fire)</SelectItem>
                              <SelectItem value="jeopardy">Jeopardy (Multi-Board)</SelectItem>
                              <SelectItem value="heads_up">Heads Up</SelectItem>
                            </SelectContent>
                          </Select>
                          {newGameMode === 'rapid_fire' && (
                            <div className="space-y-2 p-2 bg-muted/30 rounded border border-border">
                              <p className="text-xs font-medium text-muted-foreground">Rapid Fire Settings</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-muted-foreground">Timer (sec)</label>
                                  <Input
                                    type="number"
                                    value={rapidFireSettings.timerSeconds}
                                    onChange={(e) => setRapidFireSettings(s => ({ ...s, timerSeconds: parseInt(e.target.value) || 60 }))}
                                    className="h-8"
                                    data-testid="input-rapid-timer"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Base Points</label>
                                  <Input
                                    type="number"
                                    value={rapidFireSettings.basePoints}
                                    onChange={(e) => setRapidFireSettings(s => ({ ...s, basePoints: parseInt(e.target.value) || 10 }))}
                                    className="h-8"
                                    data-testid="input-rapid-points"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Max Multiplier</label>
                                  <Input
                                    type="number"
                                    value={rapidFireSettings.maxMultiplier}
                                    onChange={(e) => setRapidFireSettings(s => ({ ...s, maxMultiplier: parseInt(e.target.value) || 5 }))}
                                    className="h-8"
                                    data-testid="input-rapid-max-mult"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Mult. Step</label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={rapidFireSettings.multiplierIncrement}
                                    onChange={(e) => setRapidFireSettings(s => ({ ...s, multiplierIncrement: parseFloat(e.target.value) || 0.5 }))}
                                    className="h-8"
                                    data-testid="input-rapid-mult-step"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          <Button
                            onClick={() => {
                              const settings = newGameMode === 'rapid_fire' ? rapidFireSettings : {};
                              createGameMutation.mutate({ name: newGameName, mode: newGameMode, settings });
                            }}
                            disabled={!newGameName.trim()}
                            className="w-full"
                            size="sm"
                            data-testid="button-create-game"
                          >
                            Create Game
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-2">
                      {loadingGames ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                      ) : games.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4 text-sm">No games yet. Create one above!</p>
                      ) : games.map(game => {
                        const ModeIcon = MODE_ICONS[game.mode as GameMode] || Grid3X3;
                        const isEditing = editingGameId === game.id;
                        return (
                          <div
                            key={game.id}
                            className={`flex items-center justify-between gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
                              selectedGameId === game.id
                                ? 'bg-primary/20 border-2 border-primary'
                                : 'bg-muted/20 border border-border hover:bg-muted/30'
                            }`}
                            onClick={() => { if (!isEditing) setSelectedGameId(game.id); }}
                            data-testid={`game-item-${game.id}`}
                          >
                            <div className="min-w-0 flex-1 flex items-center gap-2">
                              <ModeIcon className="w-4 h-4 text-primary shrink-0" />
                              {isEditing ? (
                                <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    value={editGameName}
                                    onChange={(e) => setEditGameName(e.target.value)}
                                    className="h-7 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && editGameName.trim()) {
                                        updateGameMutation.mutate({ id: game.id, name: editGameName.trim() });
                                      }
                                      if (e.key === 'Escape') setEditingGameId(null);
                                    }}
                                    data-testid={`input-edit-game-${game.id}`}
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => updateGameMutation.mutate({ id: game.id, name: editGameName.trim() })}
                                    disabled={!editGameName.trim()}
                                    className="h-7 w-7 text-primary shrink-0"
                                    data-testid={`button-save-game-${game.id}`}
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setEditingGameId(null)}
                                    className="h-7 w-7 text-muted-foreground shrink-0"
                                    data-testid={`button-cancel-edit-game-${game.id}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="min-w-0">
                                  <span className="font-medium text-sm text-foreground truncate block">{game.name}</span>
                                  <span className="text-xs text-muted-foreground">{MODE_LABELS[game.mode as GameMode]}</span>
                                </div>
                              )}
                            </div>
                            {!isEditing && (
                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => { setEditingGameId(game.id); setEditGameName(game.name); }}
                                  data-testid={`button-edit-game-${game.id}`}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      data-testid={`button-delete-game-${game.id}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Game?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete "{game.name}".
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteGameMutation.mutate(game.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-8">
                {!selectedGame ? (
                  <Card className="bg-card border-border shadow-sm h-full flex items-center justify-center">
                    <div className="text-center p-8">
                      <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Select a Game</h3>
                      <p className="text-muted-foreground">Choose a game from the list to configure it</p>
                    </div>
                  </Card>
                ) : (selectedGame.mode === 'jeopardy' || selectedGame.mode === 'board' || selectedGame.mode === 'rapid_fire') ? (
                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="py-4 px-4 border-b border-border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-foreground">
                          {selectedGame.mode === 'rapid_fire' ? <Zap className="w-5 h-5 text-primary" /> : <Grid3X3 className="w-5 h-5 text-primary" />}
                          {selectedGame.name} - {selectedGame.mode === 'board' ? 'Board' : selectedGame.mode === 'rapid_fire' ? 'Question Source' : 'Boards'}
                        </CardTitle>
                        <Link href={selectedGame.mode === 'board' ? `/grudges/${selectedGame.id}` : selectedGame.mode === 'rapid_fire' ? `/blitz/${selectedGame.id}` : `/game/${selectedGame.id}`}>
                          <Button size="sm" className="gap-2" data-testid="button-play-game">
                            <Play className="w-4 h-4" />
                            Play Game
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">Linked Boards ({gameBoards.length})</h4>
                        {gameBoards.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No boards linked. Add boards below.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {gameBoards.map((gb, idx) => (
                              <div key={gb.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-medium flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <span className="font-medium text-foreground">{gb.board.name}</span>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeBoardFromGameMutation.mutate({ gameId: selectedGame.id, boardId: gb.boardId })}
                                  data-testid={`button-remove-board-${gb.boardId}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {availableBoards.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-foreground">Add Board</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {availableBoards.map(board => (
                              <Button
                                key={board.id}
                                variant="outline"
                                className="justify-start gap-2"
                                onClick={() => addBoardToGameMutation.mutate({ gameId: selectedGame.id, boardId: board.id })}
                                data-testid={`button-add-board-${board.id}`}
                              >
                                <Plus className="w-4 h-4" />
                                {board.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="py-4 px-4 border-b border-border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-foreground">
                          <Smartphone className="w-5 h-5 text-primary" />
                          {selectedGame.name} - Decks
                        </CardTitle>
                        <Link href={`/heads-up/${selectedGame.id}`}>
                          <Button size="sm" className="gap-2" data-testid="button-play-heads-up">
                            <Play className="w-4 h-4" />
                            Play Game
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">Linked Decks ({gameDecks.length})</h4>
                        {gameDecks.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No decks linked. Add decks below.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {gameDecks.map((gd, idx) => (
                              <div key={gd.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-medium flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <span className="font-medium text-foreground">{gd.deck.name}</span>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeDeckFromGameMutation.mutate({ gameId: selectedGame.id, deckId: gd.deckId })}
                                  data-testid={`button-remove-deck-${gd.deckId}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {availableDecks.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-foreground">Add Deck</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {availableDecks.map(deck => (
                              <Button
                                key={deck.id}
                                variant="outline"
                                className="justify-start gap-2"
                                onClick={() => addDeckToGameMutation.mutate({ gameId: selectedGame.id, deckId: deck.id })}
                                data-testid={`button-add-deck-${deck.id}`}
                              >
                                <Plus className="w-4 h-4" />
                                {deck.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="decks">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4">
                <Card className="bg-card border-border shadow-sm">
                  <CardHeader className="py-4 px-4 border-b border-border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-foreground text-sm font-semibold uppercase tracking-wide">
                        <Smartphone className="w-4 h-4 text-primary" />
                        Heads Up Decks
                      </CardTitle>
                      <Button
                        size="icon"
                        variant={showNewDeckForm ? "secondary" : "default"}
                        onClick={() => setShowNewDeckForm(!showNewDeckForm)}
                        className="h-8 w-8"
                        data-testid="button-toggle-deck-form"
                      >
                        {showNewDeckForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3">
                    <AnimatePresence>
                      {showNewDeckForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 p-3 bg-muted/20 rounded-lg border border-border"
                        >
                          <Input
                            placeholder="Deck name"
                            value={newDeckName}
                            onChange={(e) => setNewDeckName(e.target.value)}
                            data-testid="input-deck-name"
                          />
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="Timer (seconds)"
                              value={newDeckTimer}
                              onChange={(e) => setNewDeckTimer(parseInt(e.target.value) || 60)}
                              className="w-32"
                              data-testid="input-deck-timer"
                            />
                            <span className="text-sm text-muted-foreground">seconds per round</span>
                          </div>
                          <Button
                            onClick={() => createDeckMutation.mutate({ name: newDeckName, timerSeconds: newDeckTimer })}
                            disabled={!newDeckName.trim()}
                            className="w-full"
                            size="sm"
                            data-testid="button-create-deck"
                          >
                            Create Deck
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-2">
                      {loadingDecks ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                      ) : decks.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4 text-sm">No decks yet. Create one above!</p>
                      ) : decks.map(deck => {
                        const isEditing = editingDeckId === deck.id;
                        return (
                          <div
                            key={deck.id}
                            className={`flex items-center justify-between gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
                              selectedDeckId === deck.id
                                ? 'bg-primary/20 border-2 border-primary'
                                : 'bg-muted/20 border border-border hover:bg-muted/30'
                            }`}
                            onClick={() => { if (!isEditing) setSelectedDeckId(deck.id); }}
                            data-testid={`deck-item-${deck.id}`}
                          >
                            <div className="min-w-0 flex-1">
                              {isEditing ? (
                                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    value={editDeckName}
                                    onChange={(e) => setEditDeckName(e.target.value)}
                                    className="h-7 text-sm"
                                    autoFocus
                                    data-testid={`input-edit-deck-${deck.id}`}
                                  />
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={editDeckTimer}
                                      onChange={(e) => setEditDeckTimer(parseInt(e.target.value) || 60)}
                                      className="w-20 h-7 text-sm"
                                      data-testid={`input-edit-deck-timer-${deck.id}`}
                                    />
                                    <span className="text-xs text-muted-foreground">sec</span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => updateDeckMutation.mutate({ id: deck.id, name: editDeckName.trim(), timerSeconds: editDeckTimer })}
                                      disabled={!editDeckName.trim()}
                                      className="h-7 w-7 text-primary shrink-0"
                                      data-testid={`button-save-deck-${deck.id}`}
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setEditingDeckId(null)}
                                      className="h-7 w-7 text-muted-foreground shrink-0"
                                      data-testid={`button-cancel-edit-deck-${deck.id}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="min-w-0">
                                  <span className="font-medium text-sm text-foreground truncate block">{deck.name}</span>
                                  <span className="text-xs text-muted-foreground">{deck.cardCount} cards • {deck.timerSeconds}s</span>
                                </div>
                              )}
                            </div>
                            {!isEditing && (
                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => { setEditingDeckId(deck.id); setEditDeckName(deck.name); setEditDeckTimer(deck.timerSeconds); }}
                                  data-testid={`button-edit-deck-${deck.id}`}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      data-testid={`button-delete-deck-${deck.id}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Deck?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete "{deck.name}" and all its cards.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteDeckMutation.mutate(deck.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-8">
                {!selectedDeck ? (
                  <Card className="bg-card border-border shadow-sm h-full flex items-center justify-center">
                    <div className="text-center p-8">
                      <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Select a Deck</h3>
                      <p className="text-muted-foreground">Choose a deck from the list to manage its cards</p>
                    </div>
                  </Card>
                ) : (
                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="py-4 px-4 border-b border-border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-foreground">
                          <Smartphone className="w-5 h-5 text-primary" />
                          {selectedDeck.name} - Cards
                        </CardTitle>
                        <Button
                          size="sm"
                          variant={showNewCardForm ? "secondary" : "default"}
                          onClick={() => setShowNewCardForm(!showNewCardForm)}
                          className="gap-2"
                          data-testid="button-toggle-card-form"
                        >
                          {showNewCardForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          Add Card
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <AnimatePresence>
                        {showNewCardForm && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg border border-border"
                          >
                            <Input
                              placeholder="Enter word or phrase to guess..."
                              value={newCardPrompt}
                              onChange={(e) => setNewCardPrompt(e.target.value)}
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newCardPrompt.trim()) {
                                  createCardMutation.mutate({ deckId: selectedDeck.id, prompt: newCardPrompt.trim() });
                                }
                              }}
                              data-testid="input-card-prompt"
                            />
                            <Button
                              onClick={() => createCardMutation.mutate({ deckId: selectedDeck.id, prompt: newCardPrompt.trim() })}
                              disabled={!newCardPrompt.trim()}
                              data-testid="button-create-card"
                            >
                              Add
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {loadingCards ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                      ) : cards.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No cards in this deck yet.</p>
                          <p className="text-sm text-muted-foreground">Add cards above to get started!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {cards.map(card => {
                            const isEditing = editingCardId === card.id;
                            return (
                              <div
                                key={card.id}
                                className="p-4 bg-muted/20 rounded-lg border border-border"
                                data-testid={`card-item-${card.id}`}
                              >
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <Input
                                      value={editCardPrompt}
                                      onChange={(e) => setEditCardPrompt(e.target.value)}
                                      autoFocus
                                      data-testid={`input-edit-card-${card.id}`}
                                    />
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingCardId(null)}
                                        data-testid={`button-cancel-edit-card-${card.id}`}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => updateCardMutation.mutate({ id: card.id, prompt: editCardPrompt.trim() })}
                                        disabled={!editCardPrompt.trim()}
                                        data-testid={`button-save-card-${card.id}`}
                                      >
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-foreground">{card.prompt}</p>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={() => { setEditingCardId(card.id); setEditCardPrompt(card.prompt); }}
                                        data-testid={`button-edit-card-${card.id}`}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            data-testid={`button-delete-card-${card.id}`}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Card?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This will permanently delete this card.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteCardMutation.mutate(card.id)}>
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
