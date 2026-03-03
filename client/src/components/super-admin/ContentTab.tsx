import { Link } from "wouter";
import {
  Gamepad2, Clock, Grid3X3, ListOrdered, Brain, Image,
  Search, RefreshCw, Star, Eye, EyeOff, Check, X,
  AlertTriangle, Globe, Sparkles, CheckSquare, Square,
  Loader2, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GameStatus, GameType } from "@shared/schema";
import {
  formatRelativeDate,
} from "./types";
import type {
  BoardWithOwner,
  ComprehensiveDashboard,
  SequenceQuestionWithCreator,
  PsyopQuestionWithCreator,
  TimeWarpQuestionItem,
  MemePromptItem,
  MemeImageItem,
} from "./types";

type MutationLike = { mutate: (args: any) => void; isPending: boolean };

interface ContentTabProps {
  contentTab: 'games' | 'blitzgrid' | 'sequence' | 'psyop' | 'timewarp' | 'meme';
  switchContentTab: (tab: 'games' | 'blitzgrid' | 'sequence' | 'psyop' | 'timewarp' | 'meme') => void;
  contentSearch: string;
  setContentSearch: (val: string) => void;
  dashboard: ComprehensiveDashboard | undefined;
  gameTypes: GameType[];
  isLoadingGameTypes: boolean;
  isErrorGameTypes: boolean;
  refetchGameTypes: () => void;
  updateGameTypeMutation: MutationLike;
  allBoards: BoardWithOwner[];
  filteredBoards: BoardWithOwner[];
  isLoadingBoards: boolean;
  isErrorBoards: boolean;
  refetchBoards: () => void;
  toggleStarterPackMutation: MutationLike;
  toggleBoardVisibilityMutation: MutationLike;
  toggleBoardGlobalMutation: MutationLike;
  toggleBoardFeaturedMutation: MutationLike;
  updateModerationMutation: MutationLike;
  deleteBoardMutation: MutationLike;
  sequenceQuestions: SequenceQuestionWithCreator[];
  filteredSequenceQuestions: SequenceQuestionWithCreator[];
  isLoadingSequence: boolean;
  isErrorSequence: boolean;
  refetchSequence: () => void;
  toggleSequenceStarterPackMutation: MutationLike;
  toggleSequenceActiveMutation: MutationLike;
  deleteSequenceQuestionMutation: MutationLike;
  psyopQuestions: PsyopQuestionWithCreator[];
  filteredPsyopQuestions: PsyopQuestionWithCreator[];
  isLoadingPsyop: boolean;
  isErrorPsyop: boolean;
  refetchPsyop: () => void;
  togglePsyopStarterPackMutation: MutationLike;
  togglePsyopActiveMutation: MutationLike;
  deletePsyopQuestionMutation: MutationLike;
  timewarpQuestions: TimeWarpQuestionItem[];
  filteredTimewarpQuestions: TimeWarpQuestionItem[];
  isLoadingTimewarp: boolean;
  isErrorTimewarp: boolean;
  refetchTimewarp: () => void;
  toggleTimewarpStarterPackMutation: MutationLike;
  toggleTimewarpActiveMutation: MutationLike;
  deleteTimewarpQuestionMutation: MutationLike;
  memePrompts: MemePromptItem[];
  filteredMemePrompts: MemePromptItem[];
  isLoadingMemePrompts: boolean;
  isErrorMemePrompts: boolean;
  refetchMemePrompts: () => void;
  toggleMemePromptStarterPackMutation: MutationLike;
  toggleMemePromptActiveMutation: MutationLike;
  deleteMemePromptMutation: MutationLike;
  memeImages: MemeImageItem[];
  filteredMemeImages: MemeImageItem[];
  isLoadingMemeImages: boolean;
  isErrorMemeImages: boolean;
  refetchMemeImages: () => void;
  toggleMemeImageStarterPackMutation: MutationLike;
  toggleMemeImageActiveMutation: MutationLike;
  deleteMemeImageMutation: MutationLike;
  selectedIds: Set<number>;
  toggleSelected: (id: number) => void;
  selectAll: (ids: number[]) => void;
  clearSelection: () => void;
  bulkUpdateStarterPack: (ids: number[], isStarterPack: boolean) => void;
  isBulkUpdating: boolean;
  setDeleteContentItem: (item: { type: string; id: number; label?: string } | null) => void;
}

const ErrorState = ({ message = "Couldn't load data", onRetry, testId = "button-retry" }: { message?: string; onRetry?: () => void; testId?: string }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <RefreshCw className="w-8 h-8 text-muted-foreground mb-2" />
    <p className="text-sm text-muted-foreground mb-3">{message}</p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} data-testid={testId}>Try again</Button>
    )}
  </div>
);

const getGameIcon = (slug: string) => {
  switch (slug) {
    case 'blitzgrid': return Grid3X3;
    case 'sequence_squeeze': return ListOrdered;
    case 'psyop': return Brain;
    case 'timewarp': return Clock;
    case 'memenoharm': return Image;
    default: return Gamepad2;
  }
};

export default function ContentTab(props: ContentTabProps) {
  const {
    contentTab, switchContentTab, contentSearch, setContentSearch, dashboard,
    gameTypes, isLoadingGameTypes, isErrorGameTypes, refetchGameTypes, updateGameTypeMutation,
    filteredBoards, isLoadingBoards, isErrorBoards, refetchBoards,
    toggleStarterPackMutation, toggleBoardVisibilityMutation, toggleBoardGlobalMutation,
    toggleBoardFeaturedMutation, updateModerationMutation,
    filteredSequenceQuestions, isLoadingSequence, isErrorSequence, refetchSequence,
    toggleSequenceStarterPackMutation, toggleSequenceActiveMutation,
    filteredPsyopQuestions, isLoadingPsyop, isErrorPsyop, refetchPsyop,
    togglePsyopStarterPackMutation, togglePsyopActiveMutation,
    filteredTimewarpQuestions, isLoadingTimewarp, isErrorTimewarp, refetchTimewarp,
    toggleTimewarpStarterPackMutation, toggleTimewarpActiveMutation,
    filteredMemePrompts, isLoadingMemePrompts, isErrorMemePrompts, refetchMemePrompts,
    toggleMemePromptStarterPackMutation, toggleMemePromptActiveMutation,
    filteredMemeImages, isLoadingMemeImages, isErrorMemeImages, refetchMemeImages,
    toggleMemeImageStarterPackMutation, toggleMemeImageActiveMutation,
    selectedIds, toggleSelected, selectAll, clearSelection, bulkUpdateStarterPack, isBulkUpdating,
    setDeleteContentItem,
  } = props;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg">Content & Games</CardTitle>
            <div className="flex items-center gap-2">
              {contentTab !== 'games' && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={contentSearch}
                    onChange={(e) => setContentSearch(e.target.value)}
                    className="pl-9 w-40"
                    data-testid="input-search-content"
                  />
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (contentTab === 'games') refetchGameTypes();
                  else if (contentTab === 'blitzgrid') refetchBoards();
                  else if (contentTab === 'sequence') refetchSequence();
                  else if (contentTab === 'psyop') refetchPsyop();
                  else if (contentTab === 'timewarp') refetchTimewarp();
                  else if (contentTab === 'meme') { refetchMemePrompts(); refetchMemeImages(); }
                }}
                data-testid="button-refresh-content"
                aria-label="Refresh content"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={contentTab === 'games' ? 'default' : 'outline'}
              onClick={() => switchContentTab('games')}
              data-testid="button-content-games"
            >
              <Gamepad2 className="w-4 h-4 mr-1" /> Games
            </Button>
            <Button
              size="sm"
              variant={contentTab === 'blitzgrid' ? 'default' : 'outline'}
              onClick={() => switchContentTab('blitzgrid')}
              data-testid="button-content-blitzgrid"
            >
              <Grid3X3 className="w-4 h-4 mr-1" /> BlitzGrid
              {dashboard?.totals.boards ? <Badge variant="secondary" className="ml-1 text-xs">{dashboard.totals.boards}</Badge> : null}
            </Button>
            <Button
              size="sm"
              variant={contentTab === 'sequence' ? 'default' : 'outline'}
              onClick={() => switchContentTab('sequence')}
              data-testid="button-content-sequence"
            >
              <ListOrdered className="w-4 h-4 mr-1" /> Sort Circuit
              {dashboard?.totals.sortCircuitQuestions ? <Badge variant="secondary" className="ml-1 text-xs">{dashboard.totals.sortCircuitQuestions}</Badge> : null}
            </Button>
            <Button
              size="sm"
              variant={contentTab === 'psyop' ? 'default' : 'outline'}
              onClick={() => switchContentTab('psyop')}
              data-testid="button-content-psyop"
            >
              <Brain className="w-4 h-4 mr-1" /> PsyOp
              {dashboard?.totals.psyopQuestions ? <Badge variant="secondary" className="ml-1 text-xs">{dashboard.totals.psyopQuestions}</Badge> : null}
            </Button>
            <Button
              size="sm"
              variant={contentTab === 'meme' ? 'default' : 'outline'}
              onClick={() => switchContentTab('meme')}
              data-testid="button-content-meme"
            >
              <Image className="w-4 h-4 mr-1" /> Meme
              {(dashboard?.totals.memePrompts || dashboard?.totals.memeImages) ? <Badge variant="secondary" className="ml-1 text-xs">{(dashboard?.totals.memePrompts || 0) + (dashboard?.totals.memeImages || 0)}</Badge> : null}
            </Button>
            <Button
              size="sm"
              variant={contentTab === 'timewarp' ? 'default' : 'outline'}
              onClick={() => switchContentTab('timewarp')}
              data-testid="button-content-timewarp"
            >
              <Clock className="w-4 h-4 mr-1" /> Past Forward
              {dashboard?.totals.timeWarpQuestions ? <Badge variant="secondary" className="ml-1 text-xs">{dashboard.totals.timeWarpQuestions}</Badge> : null}
            </Button>
          </div>

          {contentTab === 'games' && (
            isLoadingGameTypes ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : isErrorGameTypes ? (
              <ErrorState message="Couldn't load games" onRetry={() => refetchGameTypes()} testId="button-retry-games" />
            ) : (
              <div className="space-y-2">
                {gameTypes.map(game => {
                  const Icon = getGameIcon(game.slug);
                  return (
                    <div key={game.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <div>
                          <p className="font-medium">{game.displayName}</p>
                          <p className="text-xs text-muted-foreground">{game.slug}</p>
                        </div>
                      </div>
                      <Select
                        value={game.status}
                        onValueChange={(status) => updateGameTypeMutation.mutate({
                          id: game.id,
                          data: { status: status as GameStatus }
                        })}
                      >
                        <SelectTrigger className="w-32 h-9" data-testid={`select-game-status-${game.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Active</span>
                          </SelectItem>
                          <SelectItem value="hidden">
                            <span className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> Hidden</span>
                          </SelectItem>
                          <SelectItem value="coming_soon">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Coming Soon</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {contentTab === 'blitzgrid' && (
            isLoadingBoards ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : isErrorBoards ? (
              <ErrorState message="Couldn't load grids" onRetry={() => refetchBoards()} testId="button-retry-grids" />
            ) : filteredBoards.length === 0 ? (
              <p className="text-center text-muted-foreground py-8" data-testid="text-empty-grids">{contentSearch.trim() ? 'No matching grids' : 'No grids found'}</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 pb-1">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => {
                        const allIds = filteredBoards.map(b => b.id);
                        if (selectedIds.size === allIds.length && allIds.every(id => selectedIds.has(id))) clearSelection();
                        else selectAll(allIds);
                      }}
                      data-testid="button-select-all-blitzgrid"
                    >
                      {selectedIds.size > 0 && filteredBoards.every(b => selectedIds.has(b.id))
                        ? <CheckSquare className="w-4 h-4 mr-1" />
                        : <Square className="w-4 h-4 mr-1" />}
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                    </Button>
                    {selectedIds.size > 0 && (
                      <>
                        <Button size="sm" variant="outline" className="h-7" disabled={isBulkUpdating} onClick={() => bulkUpdateStarterPack(Array.from(selectedIds), true)} data-testid="button-bulk-add-starter">
                          {isBulkUpdating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Star className="w-3 h-3 mr-1" />} Add to Starter
                        </Button>
                        <Button size="sm" variant="outline" className="h-7" disabled={isBulkUpdating} onClick={() => bulkUpdateStarterPack(Array.from(selectedIds), false)} data-testid="button-bulk-remove-starter">
                          {isBulkUpdating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <X className="w-3 h-3 mr-1" />} Remove Starter
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" onClick={clearSelection}>Clear</Button>
                      </>
                    )}
                  </div>
                  <Link href="/admin/blitzgrid">
                    <Button size="sm" variant="outline" data-testid="button-goto-blitzgrid-admin">
                      <Grid3X3 className="w-4 h-4 mr-1" /> BlitzGrid Admin
                    </Button>
                  </Link>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredBoards.map(b => (
                  <div key={b.id} className={`flex items-center p-3 rounded-lg gap-2 ${selectedIds.has(b.id) ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/30'}`}>
                    <button
                      type="button"
                      className="shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer hover:border-primary"
                      style={selectedIds.has(b.id) ? { backgroundColor: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' } : {}}
                      onClick={() => toggleSelected(b.id)}
                      data-testid={`checkbox-board-${b.id}`}
                    >
                      {selectedIds.has(b.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{b.name}</p>
                        {b.moderationStatus === 'flagged' && <Badge variant="destructive" className="text-xs">Flagged</Badge>}
                        {b.moderationStatus === 'rejected' && <Badge variant="outline" className="text-xs text-destructive">Rejected</Badge>}
                        {b.moderationStatus === 'approved' && <Badge variant="outline" className="text-xs text-green-500">Approved</Badge>}
                        {b.moderationStatus === 'hidden' && <Badge variant="outline" className="text-xs text-muted-foreground">Hidden</Badge>}
                        {b.visibility === 'private' && <Badge variant="outline" className="text-xs text-muted-foreground">Private</Badge>}
                        {b.visibility === 'tenant' && <Badge variant="outline" className="text-xs text-purple-500">Tenant</Badge>}
                        {b.isGlobal && <Badge variant="outline" className="text-xs text-blue-500">Global</Badge>}
                        {b.isFeatured && <Badge variant="outline" className="text-xs text-amber-500">Featured</Badge>}
                        {b.isStarterPack && <Badge variant="secondary"><Star className="w-3 h-3 mr-1" /> Starter</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        by {b.ownerName || b.ownerEmail} • {b.categoryCount} cat • {b.questionCount} Q
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Select
                        value={b.moderationStatus || 'approved'}
                        onValueChange={(v) => updateModerationMutation.mutate({ boardId: b.id, data: { moderationStatus: v } })}
                        disabled={updateModerationMutation.isPending}
                      >
                        <SelectTrigger className="w-28 h-9" data-testid={`select-moderation-${b.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approved"><span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Approved</span></SelectItem>
                          <SelectItem value="pending"><span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" /> Pending</span></SelectItem>
                          <SelectItem value="flagged"><span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-500" /> Flagged</span></SelectItem>
                          <SelectItem value="rejected"><span className="flex items-center gap-1"><X className="w-3 h-3 text-red-500" /> Rejected</span></SelectItem>
                          <SelectItem value="hidden"><span className="flex items-center gap-1"><EyeOff className="w-3 h-3 text-muted-foreground" /> Hidden</span></SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={b.visibility}
                        onValueChange={(v) => toggleBoardVisibilityMutation.mutate({ boardId: b.id, visibility: v })}
                        disabled={toggleBoardVisibilityMutation.isPending}
                      >
                        <SelectTrigger className="w-24 h-9" data-testid={`select-visibility-${b.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public"><span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Public</span></SelectItem>
                          <SelectItem value="tenant"><span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Tenant</span></SelectItem>
                          <SelectItem value="private"><span className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> Private</span></SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant={b.isGlobal ? 'secondary' : 'outline'}
                        onClick={() => toggleBoardGlobalMutation.mutate({ boardId: b.id, isGlobal: !b.isGlobal })}
                        disabled={toggleBoardGlobalMutation.isPending}
                        data-testid={`button-global-${b.id}`}
                        aria-label={b.isGlobal ? 'Remove global access' : 'Make globally available'}
                      >
                        <Globe className={`w-4 h-4 ${b.isGlobal ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant={b.isFeatured ? 'secondary' : 'outline'}
                        onClick={() => toggleBoardFeaturedMutation.mutate({ boardId: b.id, isFeatured: !b.isFeatured })}
                        disabled={toggleBoardFeaturedMutation.isPending}
                        data-testid={`button-featured-${b.id}`}
                        aria-label={b.isFeatured ? 'Remove from featured' : 'Feature this board'}
                      >
                        <Sparkles className={`w-4 h-4 ${b.isFeatured ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant={b.isStarterPack ? 'secondary' : 'outline'}
                        onClick={() => toggleStarterPackMutation.mutate({ boardId: b.id, isStarterPack: !b.isStarterPack })}
                        disabled={toggleStarterPackMutation.isPending}
                        data-testid={`button-starter-${b.id}`}
                        aria-label={b.isStarterPack ? 'Remove from starter pack' : 'Add to starter pack'}
                      >
                        <Star className={`w-4 h-4 ${b.isStarterPack ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setDeleteContentItem({ type: 'board', id: b.id, label: b.name })}
                        aria-label="Delete grid"
                        data-testid={`button-delete-board-${b.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )
          )}

          {contentTab === 'sequence' && (
            isLoadingSequence ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : isErrorSequence ? (
              <ErrorState message="Couldn't load questions" onRetry={() => refetchSequence()} testId="button-retry-sequence" />
            ) : filteredSequenceQuestions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8" data-testid="text-empty-sequence">{contentSearch.trim() ? 'No matching questions' : 'No questions found'}</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 pb-1">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => {
                        const allIds = filteredSequenceQuestions.map(q => q.id);
                        if (selectedIds.size === allIds.length && allIds.every(id => selectedIds.has(id))) clearSelection();
                        else selectAll(allIds);
                      }}
                      data-testid="button-select-all-sequence"
                    >
                      {selectedIds.size > 0 && filteredSequenceQuestions.every(q => selectedIds.has(q.id))
                        ? <CheckSquare className="w-4 h-4 mr-1" />
                        : <Square className="w-4 h-4 mr-1" />}
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                    </Button>
                    {selectedIds.size > 0 && (
                      <>
                        <Button size="sm" variant="outline" className="h-7" disabled={isBulkUpdating} onClick={() => bulkUpdateStarterPack(Array.from(selectedIds), true)} data-testid="button-bulk-add-starter-seq">
                          {isBulkUpdating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Star className="w-3 h-3 mr-1" />} Add to Starter
                        </Button>
                        <Button size="sm" variant="outline" className="h-7" disabled={isBulkUpdating} onClick={() => bulkUpdateStarterPack(Array.from(selectedIds), false)} data-testid="button-bulk-remove-starter-seq">
                          {isBulkUpdating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <X className="w-3 h-3 mr-1" />} Remove Starter
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" onClick={clearSelection}>Clear</Button>
                      </>
                    )}
                  </div>
                  <Link href="/admin/sort-circuit">
                    <Button size="sm" variant="outline" data-testid="button-goto-sortcircuit-admin">
                      <ListOrdered className="w-4 h-4 mr-1" /> Sort Circuit Admin
                    </Button>
                  </Link>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredSequenceQuestions.map(q => (
                  <div key={q.id} className={`flex items-center p-3 rounded-lg gap-2 ${selectedIds.has(q.id) ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/30'}`}>
                    <button
                      type="button"
                      className="shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer hover:border-primary"
                      style={selectedIds.has(q.id) ? { backgroundColor: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' } : {}}
                      onClick={() => toggleSelected(q.id)}
                      data-testid={`checkbox-seq-${q.id}`}
                    >
                      {selectedIds.has(q.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{q.question}</p>
                        {!q.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Hidden</Badge>}
                        {q.isStarterPack && <Badge variant="secondary"><Star className="w-3 h-3 mr-1" /> Starter</Badge>}
                        {q.hint && <Badge variant="outline" className="text-xs">Hint</Badge>}
                        {q.playCount > 0 && <Badge variant="outline" className="text-xs">{q.playCount} play{q.playCount !== 1 ? 's' : ''}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        by {q.creator?.username || 'Unknown'} • {formatRelativeDate(q.createdAt)} • Options: {q.optionA}, {q.optionB}, {q.optionC}, {q.optionD}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Order: {Array.isArray(q.correctOrder) && q.correctOrder.length > 0
                          ? q.correctOrder.map(letter => {
                              const optionMap: Record<string, string> = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD };
                              return optionMap[letter] || letter;
                            }).join(' \u2192 ')
                          : 'Not set'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant={q.isActive ? 'outline' : 'secondary'}
                        onClick={() => toggleSequenceActiveMutation.mutate({ questionId: q.id, isActive: !q.isActive })}
                        disabled={toggleSequenceActiveMutation.isPending}
                        data-testid={`button-active-seq-${q.id}`}
                        aria-label={q.isActive ? 'Hide question' : 'Show question'}
                      >
                        {q.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant={q.isStarterPack ? 'secondary' : 'outline'}
                        onClick={() => toggleSequenceStarterPackMutation.mutate({ questionId: q.id, isStarterPack: !q.isStarterPack })}
                        disabled={toggleSequenceStarterPackMutation.isPending}
                        data-testid={`button-starter-seq-${q.id}`}
                        aria-label={q.isStarterPack ? 'Remove from starter pack' : 'Add to starter pack'}
                      >
                        <Star className={`w-4 h-4 ${q.isStarterPack ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setDeleteContentItem({ type: 'sequence', id: q.id, label: q.question })}
                        aria-label="Delete question"
                        data-testid={`button-delete-seq-${q.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )
          )}

          {contentTab === 'psyop' && (
            isLoadingPsyop ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : isErrorPsyop ? (
              <ErrorState message="Couldn't load questions" onRetry={() => refetchPsyop()} testId="button-retry-psyop" />
            ) : filteredPsyopQuestions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8" data-testid="text-empty-psyop">{contentSearch.trim() ? 'No matching questions' : 'No questions found'}</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 pb-1">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => {
                        const allIds = filteredPsyopQuestions.map(q => q.id);
                        if (selectedIds.size === allIds.length && allIds.every(id => selectedIds.has(id))) clearSelection();
                        else selectAll(allIds);
                      }}
                      data-testid="button-select-all-psyop"
                    >
                      {selectedIds.size > 0 && filteredPsyopQuestions.every(q => selectedIds.has(q.id))
                        ? <CheckSquare className="w-4 h-4 mr-1" />
                        : <Square className="w-4 h-4 mr-1" />}
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                    </Button>
                    {selectedIds.size > 0 && (
                      <>
                        <Button size="sm" variant="outline" className="h-7" disabled={isBulkUpdating} onClick={() => bulkUpdateStarterPack(Array.from(selectedIds), true)} data-testid="button-bulk-add-starter-psyop">
                          {isBulkUpdating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Star className="w-3 h-3 mr-1" />} Add to Starter
                        </Button>
                        <Button size="sm" variant="outline" className="h-7" disabled={isBulkUpdating} onClick={() => bulkUpdateStarterPack(Array.from(selectedIds), false)} data-testid="button-bulk-remove-starter-psyop">
                          {isBulkUpdating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <X className="w-3 h-3 mr-1" />} Remove Starter
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" onClick={clearSelection}>Clear</Button>
                      </>
                    )}
                  </div>
                  <Link href="/admin/psyop">
                    <Button size="sm" variant="outline" data-testid="button-goto-psyop-admin">
                      <Brain className="w-4 h-4 mr-1" /> PsyOp Admin
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {(() => {
                  const grouped = filteredPsyopQuestions.reduce<Record<string, PsyopQuestionWithCreator[]>>((acc, q) => {
                    const cat = q.category || 'Uncategorized';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(q);
                    return acc;
                  }, {});
                  return Object.entries(grouped).map(([category, questions]) => {
                    const catIds = questions.map(q => q.id);
                    const allCatSelected = catIds.every(id => selectedIds.has(id));
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center gap-2 px-1 pt-1">
                          <button
                            type="button"
                            className="shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer hover:border-primary"
                            style={allCatSelected ? { backgroundColor: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' } : {}}
                            onClick={() => {
                              if (allCatSelected) {
                                const next = new Set(selectedIds);
                                catIds.forEach(id => next.delete(id));
                                selectAll(Array.from(next));
                              } else {
                                const next = new Set(selectedIds);
                                catIds.forEach(id => next.add(id));
                                selectAll(Array.from(next));
                              }
                            }}
                            data-testid={`checkbox-psyop-category-${category}`}
                          >
                            {allCatSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </button>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{category}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">{questions.length}</Badge>
                        </div>
                        {questions.map(q => (
                    <div key={q.id} className={`flex items-center p-3 rounded-lg gap-2 ${selectedIds.has(q.id) ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/30'}`}>
                    <button
                      type="button"
                      className="shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer hover:border-primary"
                      style={selectedIds.has(q.id) ? { backgroundColor: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' } : {}}
                      onClick={() => toggleSelected(q.id)}
                      data-testid={`checkbox-psyop-${q.id}`}
                    >
                      {selectedIds.has(q.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{q.factText}</p>
                        <Badge variant="outline" className="text-xs">Answer: {q.correctAnswer}</Badge>
                        {!q.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Hidden</Badge>}
                        {q.isStarterPack && <Badge variant="secondary"><Star className="w-3 h-3 mr-1" /> Starter</Badge>}
                        {q.playCount > 0 && <Badge variant="outline" className="text-xs">{q.playCount} play{q.playCount !== 1 ? 's' : ''}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        by {q.creator?.username || 'Unknown'} • {formatRelativeDate(q.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant={q.isActive ? 'outline' : 'secondary'}
                        onClick={() => togglePsyopActiveMutation.mutate({ questionId: q.id, isActive: !q.isActive })}
                        disabled={togglePsyopActiveMutation.isPending}
                        data-testid={`button-active-psyop-${q.id}`}
                        aria-label={q.isActive ? 'Hide question' : 'Show question'}
                      >
                        {q.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant={q.isStarterPack ? 'secondary' : 'outline'}
                        onClick={() => togglePsyopStarterPackMutation.mutate({ questionId: q.id, isStarterPack: !q.isStarterPack })}
                        disabled={togglePsyopStarterPackMutation.isPending}
                        data-testid={`button-starter-psyop-${q.id}`}
                        aria-label={q.isStarterPack ? 'Remove from starter pack' : 'Add to starter pack'}
                      >
                        <Star className={`w-4 h-4 ${q.isStarterPack ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setDeleteContentItem({ type: 'psyop', id: q.id, label: q.factText })}
                        aria-label="Delete question"
                        data-testid={`button-delete-psyop-${q.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                        ))}
                      </div>
                    );
                  });
                })()}
                </div>
              </div>
            )
          )}

          {contentTab === 'timewarp' && (
            isLoadingTimewarp ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : isErrorTimewarp ? (
              <ErrorState message="Couldn't load questions" onRetry={() => refetchTimewarp()} testId="button-retry-timewarp" />
            ) : filteredTimewarpQuestions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8" data-testid="text-empty-timewarp">{contentSearch.trim() ? 'No matching questions' : 'No questions found'}</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 pb-1">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => {
                        const allIds = filteredTimewarpQuestions.map(q => q.id);
                        if (selectedIds.size === allIds.length && allIds.every(id => selectedIds.has(id))) clearSelection();
                        else selectAll(allIds);
                      }}
                      data-testid="button-select-all-timewarp"
                    >
                      {selectedIds.size > 0 && filteredTimewarpQuestions.every(q => selectedIds.has(q.id))
                        ? <CheckSquare className="w-4 h-4 mr-1" />
                        : <Square className="w-4 h-4 mr-1" />}
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                    </Button>
                    {selectedIds.size > 0 && (
                      <>
                        <Button size="sm" variant="outline" className="h-7" disabled={isBulkUpdating} onClick={() => bulkUpdateStarterPack(Array.from(selectedIds), true)} data-testid="button-bulk-add-starter-timewarp">
                          {isBulkUpdating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Star className="w-3 h-3 mr-1" />} Add to Starter
                        </Button>
                        <Button size="sm" variant="outline" className="h-7" disabled={isBulkUpdating} onClick={() => bulkUpdateStarterPack(Array.from(selectedIds), false)} data-testid="button-bulk-remove-starter-timewarp">
                          {isBulkUpdating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <X className="w-3 h-3 mr-1" />} Remove Starter
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" onClick={clearSelection}>Clear</Button>
                      </>
                    )}
                  </div>
                  <Link href="/admin/pastforward">
                    <Button size="sm" variant="outline" data-testid="button-goto-timewarp-admin">
                      <Clock className="w-4 h-4 mr-1" /> Past Forward Admin
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {(() => {
                  const grouped = filteredTimewarpQuestions.reduce<Record<string, TimeWarpQuestionItem[]>>((acc, q) => {
                    const cat = q.category || 'Uncategorized';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(q);
                    return acc;
                  }, {});
                  return Object.entries(grouped).map(([category, questions]) => {
                    const catIds = questions.map(q => q.id);
                    const allCatSelected = catIds.every(id => selectedIds.has(id));
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center gap-2 px-1 pt-1">
                          <button
                            type="button"
                            className="shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer hover:border-primary"
                            style={allCatSelected ? { backgroundColor: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' } : {}}
                            onClick={() => {
                              if (allCatSelected) {
                                const next = new Set(selectedIds);
                                catIds.forEach(id => next.delete(id));
                                selectAll(Array.from(next));
                              } else {
                                const next = new Set(selectedIds);
                                catIds.forEach(id => next.add(id));
                                selectAll(Array.from(next));
                              }
                            }}
                            data-testid={`checkbox-timewarp-category-${category}`}
                          >
                            {allCatSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </button>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{category}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">{questions.length}</Badge>
                        </div>
                        {questions.map(q => (
                  <div key={q.id} className={`flex items-center p-3 rounded-lg gap-2 ${selectedIds.has(q.id) ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/30'}`}>
                    <button
                      type="button"
                      className="shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer hover:border-primary"
                      style={selectedIds.has(q.id) ? { backgroundColor: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' } : {}}
                      onClick={() => toggleSelected(q.id)}
                      data-testid={`checkbox-timewarp-${q.id}`}
                    >
                      {selectedIds.has(q.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </button>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {q.imageUrl ? (
                        <img src={q.imageUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{q.answer}</p>
                          <Badge variant="outline" className="text-xs">{q.era}</Badge>
                          {!q.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Hidden</Badge>}
                          {q.isStarterPack && <Badge variant="secondary"><Star className="w-3 h-3 mr-1" /> Starter</Badge>}
                          {q.hint && <Badge variant="outline" className="text-xs">Hint</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          by {q.creator?.username || 'Unknown'} • {formatRelativeDate(q.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant={q.isActive ? 'outline' : 'secondary'}
                        onClick={() => toggleTimewarpActiveMutation.mutate({ questionId: q.id, isActive: !q.isActive })}
                        disabled={toggleTimewarpActiveMutation.isPending}
                        data-testid={`button-active-timewarp-${q.id}`}
                        aria-label={q.isActive ? 'Hide question' : 'Show question'}
                      >
                        {q.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant={q.isStarterPack ? 'secondary' : 'outline'}
                        onClick={() => toggleTimewarpStarterPackMutation.mutate({ questionId: q.id, isStarterPack: !q.isStarterPack })}
                        disabled={toggleTimewarpStarterPackMutation.isPending}
                        data-testid={`button-starter-timewarp-${q.id}`}
                        aria-label={q.isStarterPack ? 'Remove from starter pack' : 'Add to starter pack'}
                      >
                        <Star className={`w-4 h-4 ${q.isStarterPack ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setDeleteContentItem({ type: 'timewarp', id: q.id, label: q.answer })}
                        aria-label="Delete question"
                        data-testid={`button-delete-timewarp-${q.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                        ))}
                      </div>
                    );
                  });
                })()}
                </div>
              </div>
            )
          )}

          {contentTab === 'meme' && (
            (isLoadingMemePrompts || isLoadingMemeImages) ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : (isErrorMemePrompts || isErrorMemeImages) ? (
              <ErrorState message="Couldn't load meme content" onRetry={() => { refetchMemePrompts(); refetchMemeImages(); }} testId="button-retry-meme" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1 pb-1">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => {
                        const allIds = filteredMemePrompts.map(p => p.id);
                        if (selectedIds.size === allIds.length && allIds.every(id => selectedIds.has(id))) clearSelection();
                        else selectAll(allIds);
                      }}
                      data-testid="button-select-all-meme"
                    >
                      {selectedIds.size > 0 && filteredMemePrompts.every(p => selectedIds.has(p.id))
                        ? <CheckSquare className="w-4 h-4 mr-1" />
                        : <Square className="w-4 h-4 mr-1" />}
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                    </Button>
                    {selectedIds.size > 0 && (
                      <>
                        <Button size="sm" variant="outline" className="h-7" disabled={isBulkUpdating} onClick={() => bulkUpdateStarterPack(Array.from(selectedIds), true)} data-testid="button-bulk-add-starter-meme">
                          {isBulkUpdating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Star className="w-3 h-3 mr-1" />} Add to Starter
                        </Button>
                        <Button size="sm" variant="outline" className="h-7" disabled={isBulkUpdating} onClick={() => bulkUpdateStarterPack(Array.from(selectedIds), false)} data-testid="button-bulk-remove-starter-meme">
                          {isBulkUpdating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <X className="w-3 h-3 mr-1" />} Remove Starter
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" onClick={clearSelection}>Clear</Button>
                      </>
                    )}
                  </div>
                  <Link href="/admin/meme">
                    <Button size="sm" variant="outline" data-testid="button-goto-meme-admin">
                      <Image className="w-4 h-4 mr-1" /> Meme Admin
                    </Button>
                  </Link>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Prompts ({filteredMemePrompts.length})</h3>
                  {filteredMemePrompts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm" data-testid="text-empty-meme-prompts">No prompts found</p>
                  ) : (
                    <div className="space-y-2 max-h-[250px] overflow-y-auto">
                      {filteredMemePrompts.map(p => (
                        <div key={p.id} className={`flex items-center p-3 rounded-lg gap-2 ${selectedIds.has(p.id) ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/30'}`}>
                          <button
                            type="button"
                            className="shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer hover:border-primary"
                            style={selectedIds.has(p.id) ? { backgroundColor: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' } : {}}
                            onClick={() => toggleSelected(p.id)}
                            data-testid={`checkbox-meme-prompt-${p.id}`}
                          >
                            {selectedIds.has(p.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{p.prompt}</p>
                              {!p.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Hidden</Badge>}
                              {p.isStarterPack && <Badge variant="secondary"><Star className="w-3 h-3 mr-1" /> Starter</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              by {p.creator?.username || 'Unknown'} • {formatRelativeDate(p.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              size="icon"
                              variant={p.isActive ? 'outline' : 'secondary'}
                              onClick={() => toggleMemePromptActiveMutation.mutate({ id: p.id, isActive: !p.isActive })}
                              disabled={toggleMemePromptActiveMutation.isPending}
                              data-testid={`button-active-meme-prompt-${p.id}`}
                              aria-label={p.isActive ? 'Hide prompt' : 'Show prompt'}
                            >
                              {p.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant={p.isStarterPack ? 'secondary' : 'outline'}
                              onClick={() => toggleMemePromptStarterPackMutation.mutate({ id: p.id, isStarterPack: !p.isStarterPack })}
                              disabled={toggleMemePromptStarterPackMutation.isPending}
                              data-testid={`button-starter-meme-prompt-${p.id}`}
                              aria-label={p.isStarterPack ? 'Remove from starter pack' : 'Add to starter pack'}
                            >
                              <Star className={`w-4 h-4 ${p.isStarterPack ? 'fill-current' : ''}`} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => setDeleteContentItem({ type: 'meme-prompt', id: p.id, label: p.prompt })}
                              aria-label="Delete prompt"
                              data-testid={`button-delete-meme-prompt-${p.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Images ({filteredMemeImages.length})</h3>
                  {filteredMemeImages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm" data-testid="text-empty-meme-images">No images found</p>
                  ) : (
                    <div className="space-y-2 max-h-[250px] overflow-y-auto">
                      {filteredMemeImages.map(img => (
                        <div key={img.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {img.imageUrl ? (
                              <img src={img.imageUrl} alt={img.caption || ''} className="w-10 h-10 rounded object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                            ) : null}
                            <div className={`w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0 ${img.imageUrl ? 'hidden' : ''}`}>
                              <Image className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{img.caption || 'No caption'}</p>
                                {!img.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Hidden</Badge>}
                                {img.isStarterPack && <Badge variant="secondary"><Star className="w-3 h-3 mr-1" /> Starter</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                by {img.creator?.username || 'Unknown'} • {formatRelativeDate(img.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              size="icon"
                              variant={img.isActive ? 'outline' : 'secondary'}
                              onClick={() => toggleMemeImageActiveMutation.mutate({ id: img.id, isActive: !img.isActive })}
                              disabled={toggleMemeImageActiveMutation.isPending}
                              data-testid={`button-active-meme-image-${img.id}`}
                              aria-label={img.isActive ? 'Hide image' : 'Show image'}
                            >
                              {img.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant={img.isStarterPack ? 'secondary' : 'outline'}
                              onClick={() => toggleMemeImageStarterPackMutation.mutate({ id: img.id, isStarterPack: !img.isStarterPack })}
                              disabled={toggleMemeImageStarterPackMutation.isPending}
                              data-testid={`button-starter-meme-image-${img.id}`}
                              aria-label={img.isStarterPack ? 'Remove from starter pack' : 'Add to starter pack'}
                            >
                              <Star className={`w-4 h-4 ${img.isStarterPack ? 'fill-current' : ''}`} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => setDeleteContentItem({ type: 'meme-image', id: img.id, label: img.caption || 'Meme image' })}
                              aria-label="Delete image"
                              data-testid={`button-delete-meme-image-${img.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
