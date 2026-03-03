import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Shield, Activity, Users, Gamepad2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { GameStatus, GameType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";

import type {
  ComprehensiveDashboard,
  UserWithStats,
  GameSessionDetailed,
  BoardWithOwner,
  FlaggedBoardWithOwner,
  Announcement,
  SequenceQuestionWithCreator,
  PsyopQuestionWithCreator,
  TimeWarpQuestionItem,
  MemePromptItem,
  MemeImageItem,
} from "@/components/super-admin/types";

import OverviewTab from "@/components/super-admin/OverviewTab";
import UsersTab from "@/components/super-admin/UsersTab";
import SessionsTab from "@/components/super-admin/SessionsTab";
import ContentTab from "@/components/super-admin/ContentTab";

export default function SuperAdmin() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [userSearch, setUserSearch] = useState("");
  const [contentSearch, setContentSearchBase] = useState("");
  const setContentSearch = (val: string) => { setContentSearchBase(val); setSelectedIds(new Set()); };
  const [sessionSearch, setSessionSearch] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [contentTab, setContentTab] = useState<'games' | 'blitzgrid' | 'sequence' | 'psyop' | 'timewarp' | 'meme'>('games');
  const switchContentTab = (tab: typeof contentTab) => { setContentTab(tab); setContentSearch(''); setSelectedIds(new Set()); };

  const [isExporting, setIsExporting] = useState(false);
  const [deleteContentItem, setDeleteContentItem] = useState<{ type: string; id: number; label?: string } | null>(null);
  const [sessionModeFilter, setSessionModeFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const toggleSelected = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: number[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const { data: dashboard, isLoading: isLoadingDashboard, isError: isErrorDashboard, refetch: refetchDashboard } = useQuery<ComprehensiveDashboard>({
    queryKey: ['/api/super-admin/dashboard'],
    enabled: activeTab === 'overview' || activeTab === 'content',
    refetchInterval: activeTab === 'overview' ? 30000 : false,
  });

  const { data: allUsers = [], isLoading: isLoadingUsers, isError: isErrorUsers, refetch: refetchUsers } = useQuery<UserWithStats[]>({
    queryKey: ['/api/super-admin/users'],
    enabled: activeTab === 'users',
  });

  const { data: allSessions = [], isLoading: isLoadingSessions, isError: isErrorSessions, refetch: refetchSessions } = useQuery<GameSessionDetailed[]>({
    queryKey: ['/api/super-admin/sessions'],
    enabled: activeTab === 'sessions',
  });

  const { data: gameTypes = [], isLoading: isLoadingGameTypes, isError: isErrorGameTypes, refetch: refetchGameTypes } = useQuery<GameType[]>({
    queryKey: ['/api/super-admin/game-types'],
    enabled: activeTab === 'content',
  });

  const { data: flaggedBoards = [], isLoading: isLoadingFlagged, isError: isErrorFlagged, refetch: refetchFlagged } = useQuery<FlaggedBoardWithOwner[]>({
    queryKey: ['/api/super-admin/boards/flagged'],
    enabled: activeTab === 'overview',
  });

  const { data: allBoards = [], isLoading: isLoadingBoards, isError: isErrorBoards, refetch: refetchBoards } = useQuery<BoardWithOwner[]>({
    queryKey: ['/api/super-admin/boards'],
    enabled: activeTab === 'content' && contentTab === 'blitzgrid',
  });

  const { data: announcements = [], isLoading: isLoadingAnnouncements, isError: isErrorAnnouncements, refetch: refetchAnnouncements } = useQuery<Announcement[]>({
    queryKey: ['/api/super-admin/announcements'],
    enabled: activeTab === 'overview',
  });

  const { data: sequenceQuestions = [], isLoading: isLoadingSequence, isError: isErrorSequence, refetch: refetchSequence } = useQuery<SequenceQuestionWithCreator[]>({
    queryKey: ['/api/super-admin/questions/sequence'],
    enabled: activeTab === 'content' && contentTab === 'sequence',
  });

  const { data: psyopQuestions = [], isLoading: isLoadingPsyop, isError: isErrorPsyop, refetch: refetchPsyop } = useQuery<PsyopQuestionWithCreator[]>({
    queryKey: ['/api/super-admin/questions/psyop'],
    enabled: activeTab === 'content' && contentTab === 'psyop',
  });

  const { data: timewarpQuestions = [], isLoading: isLoadingTimewarp, isError: isErrorTimewarp, refetch: refetchTimewarp } = useQuery<TimeWarpQuestionItem[]>({
    queryKey: ['/api/super-admin/questions/timewarp'],
    enabled: activeTab === 'content' && contentTab === 'timewarp',
  });

  const { data: memePrompts = [], isLoading: isLoadingMemePrompts, isError: isErrorMemePrompts, refetch: refetchMemePrompts } = useQuery<MemePromptItem[]>({
    queryKey: ['/api/super-admin/meme/prompts'],
    enabled: activeTab === 'content' && contentTab === 'meme',
  });

  const { data: memeImages = [], isLoading: isLoadingMemeImages, isError: isErrorMemeImages, refetch: refetchMemeImages } = useQuery<MemeImageItem[]>({
    queryKey: ['/api/super-admin/meme/images'],
    enabled: activeTab === 'content' && contentTab === 'meme',
  });

  const updateGameTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { hostEnabled?: boolean; playerEnabled?: boolean; status?: GameStatus } }) => {
      await apiRequest('PATCH', `/api/super-admin/game-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/game-types'] });
      queryClient.invalidateQueries({ queryKey: ['/api/game-types'] });
      toast({ title: "Game updated" });
    },
    onError: () => toast({ title: "Couldn't update game", variant: "destructive" }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/api/super-admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "User deleted" });
      setDeleteUserId(null);
    },
    onError: () => toast({ title: "Couldn't delete user", variant: "destructive" }),
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: number) => {
      await apiRequest('DELETE', `/api/super-admin/boards/${boardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards/flagged'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Board deleted" });
      setDeleteContentItem(null);
    },
    onError: () => toast({ title: "Couldn't delete board", variant: "destructive" }),
  });

  const toggleStarterPackMutation = useMutation({
    mutationFn: async ({ boardId, isStarterPack }: { boardId: number; isStarterPack: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/boards/${boardId}/starter-pack`, { isStarterPack });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Starter pack updated" });
    },
    onError: () => toast({ title: "Couldn't update starter pack", variant: "destructive" }),
  });

  const toggleBoardVisibilityMutation = useMutation({
    mutationFn: async ({ boardId, visibility }: { boardId: number; visibility: string }) => {
      await apiRequest('PATCH', `/api/super-admin/boards/${boardId}/visibility`, { visibility });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Visibility updated" });
    },
    onError: () => toast({ title: "Couldn't update visibility", variant: "destructive" }),
  });

  const toggleBoardGlobalMutation = useMutation({
    mutationFn: async ({ boardId, isGlobal }: { boardId: number; isGlobal: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/boards/${boardId}/global`, { isGlobal });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Global status updated" });
    },
    onError: () => toast({ title: "Couldn't update global status", variant: "destructive" }),
  });

  const toggleBoardFeaturedMutation = useMutation({
    mutationFn: async ({ boardId, isFeatured }: { boardId: number; isFeatured: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/boards/${boardId}/featured`, { isFeatured });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards/featured'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Featured status updated" });
    },
    onError: () => toast({ title: "Couldn't update featured status", variant: "destructive" }),
  });

  const toggleSequenceStarterPackMutation = useMutation({
    mutationFn: async ({ questionId, isStarterPack }: { questionId: number; isStarterPack: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/questions/sequence/${questionId}/starter-pack`, { isStarterPack });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/sequence'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Starter pack updated" });
    },
    onError: () => toast({ title: "Couldn't update starter pack", variant: "destructive" }),
  });

  const togglePsyopStarterPackMutation = useMutation({
    mutationFn: async ({ questionId, isStarterPack }: { questionId: number; isStarterPack: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/questions/psyop/${questionId}/starter-pack`, { isStarterPack });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/psyop'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Starter pack updated" });
    },
    onError: () => toast({ title: "Couldn't update starter pack", variant: "destructive" }),
  });

  const deleteSequenceQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/super-admin/questions/sequence/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/sequence'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Question deleted" });
      setDeleteContentItem(null);
    },
    onError: () => toast({ title: "Couldn't delete question", variant: "destructive" }),
  });

  const deletePsyopQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/super-admin/questions/psyop/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/psyop'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Question deleted" });
      setDeleteContentItem(null);
    },
    onError: () => toast({ title: "Couldn't delete question", variant: "destructive" }),
  });

  const deleteTimewarpQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/super-admin/questions/timewarp/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/timewarp'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Question deleted" });
      setDeleteContentItem(null);
    },
    onError: () => toast({ title: "Couldn't delete question", variant: "destructive" }),
  });

  const deleteMemePromptMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/super-admin/meme/prompts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/meme/prompts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Prompt deleted" });
      setDeleteContentItem(null);
    },
    onError: () => toast({ title: "Couldn't delete prompt", variant: "destructive" }),
  });

  const deleteMemeImageMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/super-admin/meme/images/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/meme/images'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Image deleted" });
      setDeleteContentItem(null);
    },
    onError: () => toast({ title: "Couldn't delete image", variant: "destructive" }),
  });

  const toggleTimewarpStarterPackMutation = useMutation({
    mutationFn: async ({ questionId, isStarterPack }: { questionId: number; isStarterPack: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/questions/timewarp/${questionId}/starter-pack`, { isStarterPack });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/timewarp'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Starter pack updated" });
    },
    onError: () => toast({ title: "Couldn't update starter pack", variant: "destructive" }),
  });

  const toggleMemePromptStarterPackMutation = useMutation({
    mutationFn: async ({ id, isStarterPack }: { id: number; isStarterPack: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/meme/prompts/${id}/starter-pack`, { isStarterPack });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/meme/prompts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Starter pack updated" });
    },
    onError: () => toast({ title: "Couldn't update starter pack", variant: "destructive" }),
  });

  const toggleMemeImageStarterPackMutation = useMutation({
    mutationFn: async ({ id, isStarterPack }: { id: number; isStarterPack: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/meme/images/${id}/starter-pack`, { isStarterPack });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/meme/images'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Starter pack updated" });
    },
    onError: () => toast({ title: "Couldn't update starter pack", variant: "destructive" }),
  });

  const toggleSequenceActiveMutation = useMutation({
    mutationFn: async ({ questionId, isActive }: { questionId: number; isActive: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/questions/sequence/${questionId}/active`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/sequence'] });
      toast({ title: "Visibility updated" });
    },
    onError: () => toast({ title: "Couldn't update visibility", variant: "destructive" }),
  });

  const togglePsyopActiveMutation = useMutation({
    mutationFn: async ({ questionId, isActive }: { questionId: number; isActive: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/questions/psyop/${questionId}/active`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/psyop'] });
      toast({ title: "Visibility updated" });
    },
    onError: () => toast({ title: "Couldn't update visibility", variant: "destructive" }),
  });

  const toggleTimewarpActiveMutation = useMutation({
    mutationFn: async ({ questionId, isActive }: { questionId: number; isActive: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/questions/timewarp/${questionId}/active`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/timewarp'] });
      toast({ title: "Visibility updated" });
    },
    onError: () => toast({ title: "Couldn't update visibility", variant: "destructive" }),
  });

  const toggleMemePromptActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/meme/prompts/${id}/active`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/meme/prompts'] });
      toast({ title: "Visibility updated" });
    },
    onError: () => toast({ title: "Couldn't update visibility", variant: "destructive" }),
  });

  const toggleMemeImageActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest('PATCH', `/api/super-admin/meme/images/${id}/active`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/meme/images'] });
      toast({ title: "Visibility updated" });
    },
    onError: () => toast({ title: "Couldn't update visibility", variant: "destructive" }),
  });

  const bulkUpdateStarterPack = useCallback(async (ids: number[], isStarterPack: boolean) => {
    setIsBulkUpdating(true);
    let successCount = 0;
    let errorCount = 0;
    for (const id of ids) {
      try {
        if (contentTab === 'blitzgrid') {
          await apiRequest('PATCH', `/api/super-admin/boards/${id}/starter-pack`, { isStarterPack });
        } else if (contentTab === 'sequence') {
          await apiRequest('PATCH', `/api/super-admin/questions/sequence/${id}/starter-pack`, { isStarterPack });
        } else if (contentTab === 'psyop') {
          await apiRequest('PATCH', `/api/super-admin/questions/psyop/${id}/starter-pack`, { isStarterPack });
        } else if (contentTab === 'timewarp') {
          await apiRequest('PATCH', `/api/super-admin/questions/timewarp/${id}/starter-pack`, { isStarterPack });
        } else if (contentTab === 'meme') {
          await apiRequest('PATCH', `/api/super-admin/meme/prompts/${id}/starter-pack`, { isStarterPack });
        }
        successCount++;
      } catch {
        errorCount++;
      }
    }
    if (contentTab === 'blitzgrid') queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] });
    else if (contentTab === 'sequence') queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/sequence'] });
    else if (contentTab === 'psyop') queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/psyop'] });
    else if (contentTab === 'timewarp') queryClient.invalidateQueries({ queryKey: ['/api/super-admin/questions/timewarp'] });
    else if (contentTab === 'meme') queryClient.invalidateQueries({ queryKey: ['/api/super-admin/meme/prompts'] });
    queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
    setIsBulkUpdating(false);
    setSelectedIds(new Set());
    toast({ title: `${successCount} item${successCount !== 1 ? 's' : ''} updated${errorCount > 0 ? `, ${errorCount} failed` : ''}` });
  }, [contentTab, toast]);

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: { title: string; message: string; type?: string }) => {
      if (!data.title.trim() || !data.message.trim()) {
        throw new Error('Title and message are required');
      }
      await apiRequest('POST', '/api/super-admin/announcements', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/announcements'] });
      toast({ title: "Announcement sent" });
    },
    onError: () => toast({ title: "Couldn't send announcement", variant: "destructive" }),
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/super-admin/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/announcements'] });
      toast({ title: "Announcement deleted" });
    },
    onError: () => toast({ title: "Couldn't delete announcement", variant: "destructive" }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest('PATCH', `/api/super-admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Role updated" });
    },
    onError: () => toast({ title: "Couldn't update role", variant: "destructive" }),
  });

  const updateModerationMutation = useMutation({
    mutationFn: async ({ boardId, data }: { boardId: number; data: { moderationStatus: string } }) => {
      await apiRequest('PATCH', `/api/super-admin/boards/${boardId}/moderation`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards/flagged'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Content reviewed" });
    },
    onError: () => toast({ title: "Couldn't update status", variant: "destructive" }),
  });

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/super-admin/export', { credentials: 'include' });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `platform-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Data exported" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredBoards = contentSearch.trim()
    ? allBoards.filter(b => {
        const search = contentSearch.toLowerCase();
        return (b.name ?? '').toLowerCase().includes(search) ||
          (b.ownerEmail ?? '').toLowerCase().includes(search) ||
          (b.ownerName ?? '').toLowerCase().includes(search);
      })
    : allBoards;

  const filteredSequenceQuestions = contentSearch.trim()
    ? sequenceQuestions.filter(q => {
        const search = contentSearch.toLowerCase();
        return (q.question ?? '').toLowerCase().includes(search) ||
          (q.creator?.username ?? '').toLowerCase().includes(search) ||
          (q.optionA ?? '').toLowerCase().includes(search) ||
          (q.optionB ?? '').toLowerCase().includes(search) ||
          (q.optionC ?? '').toLowerCase().includes(search) ||
          (q.optionD ?? '').toLowerCase().includes(search) ||
          (q.hint ?? '').toLowerCase().includes(search);
      })
    : sequenceQuestions;

  const filteredPsyopQuestions = contentSearch.trim()
    ? psyopQuestions.filter(q => {
        const search = contentSearch.toLowerCase();
        return (q.factText ?? '').toLowerCase().includes(search) ||
          (q.correctAnswer ?? '').toLowerCase().includes(search) ||
          (q.creator?.username ?? '').toLowerCase().includes(search) ||
          (q.category ?? '').toLowerCase().includes(search);
      })
    : psyopQuestions;

  const filteredTimewarpQuestions = contentSearch.trim()
    ? timewarpQuestions.filter(q => {
        const search = contentSearch.toLowerCase();
        return (q.answer ?? '').toLowerCase().includes(search) ||
          (q.era ?? '').toLowerCase().includes(search) ||
          (q.hint ?? '').toLowerCase().includes(search) ||
          (q.category ?? '').toLowerCase().includes(search) ||
          (q.creator?.username ?? '').toLowerCase().includes(search);
      })
    : timewarpQuestions;

  const filteredMemePrompts = contentSearch.trim()
    ? memePrompts.filter(p =>
        (p.prompt ?? '').toLowerCase().includes(contentSearch.toLowerCase()) ||
        (p.creator?.username ?? '').toLowerCase().includes(contentSearch.toLowerCase())
      )
    : memePrompts;

  const filteredMemeImages = contentSearch.trim()
    ? memeImages.filter(i =>
        (i.caption ?? '').toLowerCase().includes(contentSearch.toLowerCase()) ||
        (i.imageUrl ?? '').toLowerCase().includes(contentSearch.toLowerCase()) ||
        (i.creator?.username ?? '').toLowerCase().includes(contentSearch.toLowerCase())
      )
    : memeImages;

  if (isAuthLoading) {
    return (
      <div className="min-h-screen gradient-game flex items-center justify-center">
        <div className="animate-pulse text-white" data-testid="text-loading-auth">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen gradient-game">
        <AppHeader minimal backHref="/" title="Access Denied" />
        <main className="px-4 py-8 max-w-md mx-auto text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold text-white mb-2" data-testid="text-access-denied-title">Super Admin Only</h1>
          <p className="text-white/70 mb-6" data-testid="text-access-denied-description">This area requires super admin privileges.</p>
          <Link href="/">
            <Button variant="outline" data-testid="button-back-home">Back to Home</Button>
          </Link>
        </main>
      </div>
    );
  }

  const handleDeleteContent = () => {
    if (!deleteContentItem) return;
    switch (deleteContentItem.type) {
      case 'board': deleteBoardMutation.mutate(deleteContentItem.id); break;
      case 'sequence': deleteSequenceQuestionMutation.mutate(deleteContentItem.id); break;
      case 'psyop': deletePsyopQuestionMutation.mutate(deleteContentItem.id); break;
      case 'timewarp': deleteTimewarpQuestionMutation.mutate(deleteContentItem.id); break;
      case 'meme-prompt': deleteMemePromptMutation.mutate(deleteContentItem.id); break;
      case 'meme-image': deleteMemeImageMutation.mutate(deleteContentItem.id); break;
    }
  };

  return (
    <div className="min-h-screen gradient-game">
      <AppHeader minimal backHref="/" title="Command Center" />

      <main className="px-4 py-6 max-w-6xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-black/30 backdrop-blur-sm border border-white/10">
            <TabsTrigger value="overview" className="flex items-center gap-2" data-testid="tab-overview">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2" data-testid="tab-users">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2" data-testid="tab-content">
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline">Content</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2" data-testid="tab-sessions">
              <Play className="w-4 h-4" />
              <span className="hidden sm:inline">Sessions</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              dashboard={dashboard}
              isLoading={isLoadingDashboard}
              isError={isErrorDashboard}
              refetch={refetchDashboard}
              flaggedBoards={flaggedBoards}
              isLoadingFlagged={isLoadingFlagged}
              isErrorFlagged={isErrorFlagged}
              refetchFlagged={refetchFlagged}
              announcements={announcements}
              isLoadingAnnouncements={isLoadingAnnouncements}
              isErrorAnnouncements={isErrorAnnouncements}
              refetchAnnouncements={refetchAnnouncements}
              onDeleteAnnouncement={(id) => deleteAnnouncementMutation.mutate(id)}
              onApproveBoard={(id) => updateModerationMutation.mutate({ boardId: id, data: { moderationStatus: 'approved' } })}
              onRejectBoard={(id) => updateModerationMutation.mutate({ boardId: id, data: { moderationStatus: 'rejected' } })}
              onCreateAnnouncement={(data) => createAnnouncementMutation.mutate(data)}
              isExporting={isExporting}
              onExportData={handleExportData}
              deleteAnnouncementPending={deleteAnnouncementMutation.isPending}
              updateModerationPending={updateModerationMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab
              users={allUsers}
              isLoading={isLoadingUsers}
              isError={isErrorUsers}
              refetch={refetchUsers}
              userSearch={userSearch}
              setUserSearch={setUserSearch}
              onDeleteUser={(userId) => setDeleteUserId(userId)}
              onUpdateRole={(params) => updateRoleMutation.mutate(params)}
              currentUserId={user.id}
              deleteUserPending={deleteUserMutation.isPending}
              updateRolePending={updateRoleMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="content">
            <ContentTab
              contentTab={contentTab}
              switchContentTab={switchContentTab}
              contentSearch={contentSearch}
              setContentSearch={setContentSearch}
              dashboard={dashboard}
              gameTypes={gameTypes}
              isLoadingGameTypes={isLoadingGameTypes}
              isErrorGameTypes={isErrorGameTypes}
              refetchGameTypes={refetchGameTypes}
              updateGameTypeMutation={updateGameTypeMutation}
              allBoards={allBoards}
              filteredBoards={filteredBoards}
              isLoadingBoards={isLoadingBoards}
              isErrorBoards={isErrorBoards}
              refetchBoards={refetchBoards}
              toggleStarterPackMutation={toggleStarterPackMutation}
              toggleBoardVisibilityMutation={toggleBoardVisibilityMutation}
              toggleBoardGlobalMutation={toggleBoardGlobalMutation}
              toggleBoardFeaturedMutation={toggleBoardFeaturedMutation}
              updateModerationMutation={updateModerationMutation}
              deleteBoardMutation={deleteBoardMutation}
              sequenceQuestions={sequenceQuestions}
              filteredSequenceQuestions={filteredSequenceQuestions}
              isLoadingSequence={isLoadingSequence}
              isErrorSequence={isErrorSequence}
              refetchSequence={refetchSequence}
              toggleSequenceStarterPackMutation={toggleSequenceStarterPackMutation}
              toggleSequenceActiveMutation={toggleSequenceActiveMutation}
              deleteSequenceQuestionMutation={deleteSequenceQuestionMutation}
              psyopQuestions={psyopQuestions}
              filteredPsyopQuestions={filteredPsyopQuestions}
              isLoadingPsyop={isLoadingPsyop}
              isErrorPsyop={isErrorPsyop}
              refetchPsyop={refetchPsyop}
              togglePsyopStarterPackMutation={togglePsyopStarterPackMutation}
              togglePsyopActiveMutation={togglePsyopActiveMutation}
              deletePsyopQuestionMutation={deletePsyopQuestionMutation}
              timewarpQuestions={timewarpQuestions}
              filteredTimewarpQuestions={filteredTimewarpQuestions}
              isLoadingTimewarp={isLoadingTimewarp}
              isErrorTimewarp={isErrorTimewarp}
              refetchTimewarp={refetchTimewarp}
              toggleTimewarpStarterPackMutation={toggleTimewarpStarterPackMutation}
              toggleTimewarpActiveMutation={toggleTimewarpActiveMutation}
              deleteTimewarpQuestionMutation={deleteTimewarpQuestionMutation}
              memePrompts={memePrompts}
              filteredMemePrompts={filteredMemePrompts}
              isLoadingMemePrompts={isLoadingMemePrompts}
              isErrorMemePrompts={isErrorMemePrompts}
              refetchMemePrompts={refetchMemePrompts}
              toggleMemePromptStarterPackMutation={toggleMemePromptStarterPackMutation}
              toggleMemePromptActiveMutation={toggleMemePromptActiveMutation}
              deleteMemePromptMutation={deleteMemePromptMutation}
              memeImages={memeImages}
              filteredMemeImages={filteredMemeImages}
              isLoadingMemeImages={isLoadingMemeImages}
              isErrorMemeImages={isErrorMemeImages}
              refetchMemeImages={refetchMemeImages}
              toggleMemeImageStarterPackMutation={toggleMemeImageStarterPackMutation}
              toggleMemeImageActiveMutation={toggleMemeImageActiveMutation}
              deleteMemeImageMutation={deleteMemeImageMutation}
              selectedIds={selectedIds}
              toggleSelected={toggleSelected}
              selectAll={selectAll}
              clearSelection={clearSelection}
              bulkUpdateStarterPack={bulkUpdateStarterPack}
              isBulkUpdating={isBulkUpdating}
              setDeleteContentItem={setDeleteContentItem}
            />
          </TabsContent>

          <TabsContent value="sessions">
            <SessionsTab
              sessions={allSessions}
              isLoading={isLoadingSessions}
              isError={isErrorSessions}
              refetch={refetchSessions}
              sessionSearch={sessionSearch}
              setSessionSearch={setSessionSearch}
              sessionModeFilter={sessionModeFilter}
              setSessionModeFilter={setSessionModeFilter}
            />
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this user and all their content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-user">Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => deleteUserId && deleteUserMutation.mutate(deleteUserId)}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteContentItem} onOpenChange={(open) => !open && setDeleteContentItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteContentItem?.label
                ? `Delete "${deleteContentItem.label}"? This action cannot be undone.`
                : "This will permanently delete this content. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-content">Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteContent}
              data-testid="button-confirm-delete-content"
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
