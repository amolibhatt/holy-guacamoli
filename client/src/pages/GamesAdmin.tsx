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
import { Plus, Trash2, ArrowLeft, Loader2, Pencil, X, Check, Grid3X3, Layers, Play, Sun, Moon, Smartphone } from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/context/ThemeContext";
import type { Game, Board, HeadsUpDeck, HeadsUpCard, GameMode } from "@shared/schema";

const MODE_LABELS: Record<GameMode, string> = {
  jeopardy: "Jeopardy (Multi-Board)",
  heads_up: "Heads Up",
  board: "Grid of Grudges",
};

const MODE_ICONS: Record<GameMode, typeof Grid3X3> = {
  jeopardy: Grid3X3,
  heads_up: Smartphone,
  board: Grid3X3,
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
    enabled: !!selectedGameId && (selectedGame?.mode === 'jeopardy' || selectedGame?.mode === 'board'),
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

  const createGameMutation = useMutation({
    mutationFn: async (data: { name: string; mode: GameMode }) => {
      return apiRequest('POST', '/api/games', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      setNewGameName("");
      setNewGameMode("board");
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
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/heads-up-decks'] });
      if (selectedDeckId === deletedId) setSelectedDeckId(null);
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
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
                    <CardTitle className="text-lg">Your Games</CardTitle>
                    <Button 
                      size="sm" 
                      className="gap-1"
                      onClick={() => setShowNewGameForm(true)}
                      data-testid="button-new-game"
                    >
                      <Plus className="w-4 h-4" />
                      New Game
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <AnimatePresence>
                      {showNewGameForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border"
                        >
                          <Input
                            placeholder="Game name..."
                            value={newGameName}
                            onChange={(e) => setNewGameName(e.target.value)}
                            data-testid="input-new-game-name"
                          />
                          <Select value={newGameMode} onValueChange={(v) => setNewGameMode(v as GameMode)}>
                            <SelectTrigger data-testid="select-game-mode">
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="board">Grid of Grudges</SelectItem>
                              <SelectItem value="jeopardy">Jeopardy (Multi-Board)</SelectItem>
                              <SelectItem value="heads_up">Heads Up</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => createGameMutation.mutate({ name: newGameName, mode: newGameMode })}
                              disabled={!newGameName.trim() || createGameMutation.isPending}
                              data-testid="button-save-new-game"
                            >
                              {createGameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setShowNewGameForm(false); setNewGameName(""); }} data-testid="button-cancel-new-game">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {loadingGames ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : games.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No games yet</p>
                    ) : (
                      games.map((game) => {
                        const Icon = MODE_ICONS[game.mode] || Grid3X3;
                        return (
                          <motion.div
                            key={game.id}
                            layout
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedGameId === game.id ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:bg-muted/50'}`}
                            onClick={() => setSelectedGameId(game.id)}
                            data-testid={`game-item-${game.id}`}
                          >
                            {editingGameId === game.id ? (
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={editGameName}
                                  onChange={(e) => setEditGameName(e.target.value)}
                                  className="h-8"
                                  data-testid="input-edit-game-name"
                                />
                                <Button size="sm" variant="ghost" onClick={() => updateGameMutation.mutate({ id: game.id, name: editGameName })}>
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingGameId(null)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Icon className="w-4 h-4 text-primary shrink-0" />
                                  <span className="font-medium truncate">{game.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">{MODE_LABELS[game.mode]}</span>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7"
                                    onClick={(e) => { e.stopPropagation(); setEditingGameId(game.id); setEditGameName(game.name); }}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => e.stopPropagation()}>
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete game?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete "{game.name}".</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteGameMutation.mutate(game.id)}>Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-8">
                <Card className="h-full">
                  <CardContent className="p-6">
                    {!selectedGame ? (
                      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <Layers className="w-12 h-12 mb-4 opacity-50" />
                        <p>Select a game to configure it</p>
                      </div>
                    ) : (selectedGame.mode === 'jeopardy' || selectedGame.mode === 'board') ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <Grid3X3 className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-semibold">{selectedGame.name} - Boards</h3>
                          </div>
                          <Link href={`/grudges/${selectedGame.id}`}>
                            <Button size="sm" className="gap-2" data-testid="button-play-game">
                              <Play className="w-4 h-4" />
                              Play
                            </Button>
                          </Link>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-foreground">Linked Boards ({gameBoards.length})</h4>
                          {gameBoards.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No boards linked yet</p>
                          ) : (
                            <div className="space-y-2">
                              {gameBoards.map((gb) => (
                                <div key={gb.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                  <span className="font-medium">{gb.board.name}</span>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-destructive h-7"
                                    onClick={() => removeBoardFromGameMutation.mutate({ gameId: selectedGame.id, boardId: gb.boardId })}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {availableBoards.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-foreground">Add a Board</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {availableBoards.map((board) => (
                                <Button
                                  key={board.id}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addBoardToGameMutation.mutate({ gameId: selectedGame.id, boardId: board.id })}
                                  className="justify-start"
                                  data-testid={`button-add-board-${board.id}`}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  {board.name}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : selectedGame.mode === 'heads_up' ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-semibold">{selectedGame.name} - Decks</h3>
                          </div>
                          <Link href={`/heads-up/${selectedGame.id}`}>
                            <Button size="sm" className="gap-2" data-testid="button-play-heads-up">
                              <Play className="w-4 h-4" />
                              Play
                            </Button>
                          </Link>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-foreground">Linked Decks ({gameDecks.length})</h4>
                          {gameDecks.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No decks linked yet</p>
                          ) : (
                            <div className="space-y-2">
                              {gameDecks.map((gd) => (
                                <div key={gd.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                  <span className="font-medium">{gd.deck.name}</span>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-destructive h-7"
                                    onClick={() => removeDeckFromGameMutation.mutate({ gameId: selectedGame.id, deckId: gd.deckId })}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {availableDecks.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-foreground">Add a Deck</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {availableDecks.map((deck) => (
                                <Button
                                  key={deck.id}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addDeckToGameMutation.mutate({ gameId: selectedGame.id, deckId: deck.id })}
                                  className="justify-start"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  {deck.name}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="decks">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
                    <CardTitle className="text-lg">Heads Up Decks</CardTitle>
                    <Button 
                      size="sm" 
                      className="gap-1"
                      onClick={() => setShowNewDeckForm(true)}
                      data-testid="button-new-deck"
                    >
                      <Plus className="w-4 h-4" />
                      New Deck
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <AnimatePresence>
                      {showNewDeckForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border"
                        >
                          <Input
                            placeholder="Deck name..."
                            value={newDeckName}
                            onChange={(e) => setNewDeckName(e.target.value)}
                            data-testid="input-new-deck-name"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Timer:</span>
                            <Input
                              type="number"
                              value={newDeckTimer}
                              onChange={(e) => setNewDeckTimer(Number(e.target.value))}
                              className="w-20"
                              data-testid="input-new-deck-timer"
                            />
                            <span className="text-sm text-muted-foreground">sec</span>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => createDeckMutation.mutate({ name: newDeckName, timerSeconds: newDeckTimer })}
                              disabled={!newDeckName.trim() || createDeckMutation.isPending}
                            >
                              {createDeckMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setShowNewDeckForm(false); setNewDeckName(""); setNewDeckTimer(60); }}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {loadingDecks ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : decks.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No decks yet</p>
                    ) : (
                      decks.map((deck) => (
                        <motion.div
                          key={deck.id}
                          layout
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedDeckId === deck.id ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:bg-muted/50'}`}
                          onClick={() => setSelectedDeckId(deck.id)}
                          data-testid={`deck-item-${deck.id}`}
                        >
                          {editingDeckId === deck.id ? (
                            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editDeckName}
                                onChange={(e) => setEditDeckName(e.target.value)}
                                className="h-8"
                              />
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={editDeckTimer}
                                  onChange={(e) => setEditDeckTimer(Number(e.target.value))}
                                  className="w-20 h-8"
                                />
                                <span className="text-xs text-muted-foreground">sec</span>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={() => updateDeckMutation.mutate({ id: deck.id, name: editDeckName, timerSeconds: editDeckTimer })}>
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingDeckId(null)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <span className="font-medium">{deck.name}</span>
                                <div className="text-xs text-muted-foreground">{deck.cardCount} cards · {deck.timerSeconds}s</div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7"
                                  onClick={(e) => { e.stopPropagation(); setEditingDeckId(deck.id); setEditDeckName(deck.name); setEditDeckTimer(deck.timerSeconds); }}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => e.stopPropagation()}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete deck?</AlertDialogTitle>
                                      <AlertDialogDescription>This will permanently delete "{deck.name}" and all its cards.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteDeckMutation.mutate(deck.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-8">
                <Card className="h-full">
                  <CardContent className="p-6">
                    {!selectedDeck ? (
                      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <Smartphone className="w-12 h-12 mb-4 opacity-50" />
                        <p>Select a deck to manage its cards</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="text-lg font-semibold">{selectedDeck.name} - Cards</h3>
                          <Button 
                            size="sm" 
                            className="gap-1"
                            onClick={() => setShowNewCardForm(true)}
                            data-testid="button-new-card"
                          >
                            <Plus className="w-4 h-4" />
                            Add Card
                          </Button>
                        </div>

                        <AnimatePresence>
                          {showNewCardForm && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border"
                            >
                              <Input
                                placeholder="Card prompt..."
                                value={newCardPrompt}
                                onChange={(e) => setNewCardPrompt(e.target.value)}
                                data-testid="input-new-card-prompt"
                              />
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => createCardMutation.mutate({ deckId: selectedDeck.id, prompt: newCardPrompt })}
                                  disabled={!newCardPrompt.trim() || createCardMutation.isPending}
                                >
                                  {createCardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setShowNewCardForm(false); setNewCardPrompt(""); }}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {loadingCards ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : cards.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">No cards in this deck</p>
                        ) : (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {cards.map((card) => (
                              <motion.div
                                key={card.id}
                                layout
                                className="p-3 bg-muted/50 rounded-lg border border-border"
                              >
                                {editingCardId === card.id ? (
                                  <div className="flex gap-2">
                                    <Input
                                      value={editCardPrompt}
                                      onChange={(e) => setEditCardPrompt(e.target.value)}
                                      className="flex-1"
                                    />
                                    <Button size="sm" variant="ghost" onClick={() => updateCardMutation.mutate({ id: card.id, prompt: editCardPrompt })}>
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingCardId(null)}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-2">
                                    <span>{card.prompt}</span>
                                    <div className="flex items-center gap-1">
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-7 w-7"
                                        onClick={() => { setEditingCardId(card.id); setEditCardPrompt(card.prompt); }}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete card?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete this card.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteCardMutation.mutate(card.id)}>Delete</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
