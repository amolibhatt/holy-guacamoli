import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Users, Shield, Trash2, TrendingUp, TrendingDown,
  Gamepad2, Clock, Activity, ListOrdered, Grid3X3,
  Search, RefreshCw, Star, Megaphone, Download, 
  Send, User, Play, Image, Brain, Zap, Crown, Target, 
  Eye, EyeOff, Check, X, AlertTriangle, Globe, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GameStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import type { Board, GameType } from "@shared/schema";
import type { SafeUser } from "@shared/models/auth";

interface SessionPlayer {
  id: number;
  name: string;
  avatar: string;
  score: number;
  isConnected: boolean;
  joinedAt: string;
}

interface UserSession {
  id: number;
  code: string;
  state: string;
  currentMode: string;
  createdAt: string;
  updatedAt: string;
  playerCount: number;
  players: SessionPlayer[];
  winner: SessionPlayer | null;
}

interface UserBoard {
  id: number;
  name: string;
  theme: string | null;
  createdAt: string;
}

interface UserWithStats extends SafeUser {
  boardCount: number;
  boards: UserBoard[];
  gamesHosted: number;
  recentSessions: UserSession[];
  contentCounts?: {
    timeWarpQuestions: number;
    sequenceQuestions: number;
    psyopQuestions: number;
    memePrompts: number;
    memeImages: number;
  };
}

interface BoardWithOwner extends Board {
  ownerEmail: string;
  ownerName: string;
  questionCount: number;
  categoryCount: number;
}

interface FlaggedBoardWithOwner extends Board {
  ownerEmail: string;
  ownerName: string | null;
}

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
}

interface GameSessionDetailed {
  id: number;
  code: string;
  hostId: string;
  currentMode: string | null;
  state: string;
  createdAt: string;
  updatedAt: string;
  host: { id: string; firstName: string | null; lastName: string | null; email: string | null };
  players: { id: number; name: string; avatar: string; score: number; isConnected: boolean; joinedAt: string }[];
  playerCount: number;
  winner: { id: number; name: string; score: number } | null;
  roundCount?: number;
}

interface ComprehensiveDashboard {
  realtime: { activeGames: number; activePlayers: number };
  today: { games: number; players: number; newUsers: number; gamesChange: number; playersChange: number; usersChange: number };
  week: { games: number; players: number; newUsers: number };
  totals: { users: number; sessions: number; boards: number; blitzgridQuestions: number; sortCircuitQuestions: number; psyopQuestions: number; timeWarpQuestions: number; memePrompts: number; memeImages: number; starterPacks: number; flaggedContent: number };
  usersByRole: Record<string, number>;
  recentActivity: { id: number; code: string; state: string; createdAt: string; mode?: string | null }[];
  topHostsWeek: { name: string; games: number }[];
  popularGridsWeek: { name: string; plays: number }[];
  popularSortCircuitWeek: { name: string; plays: number }[];
  popularPsyopWeek: { name: string; plays: number }[];
  popularTimewarpWeek: { name: string; plays: number }[];
  popularMemeWeek: { name: string; plays: number }[];
  sortCircuitSessions: number;
  psyopSessions: number;
  performance: { avgScore: number; highScore: number; completionRate: number; sortCircuitAccuracy: number; sortCircuitAvgTimeMs: number; sortCircuitCompletionRate: number; psyopTotalRounds: number; psyopDeceptionRate: number; psyopSessions: number; timewarpTotalPlays: number; timewarpQuestionCount: number; memeSessions: number; memeRounds: number; memePlayers: number };
}

interface QuestionCreator {
  id: string;
  username: string;
  email: string | null;
}

interface SequenceQuestionWithCreator {
  id: number;
  userId: string | null;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOrder: string[];
  hint: string | null;
  isActive: boolean;
  isStarterPack: boolean;
  createdAt: string;
  playCount: number;
  creator: QuestionCreator | null;
}

interface PsyopQuestionWithCreator {
  id: number;
  userId: string | null;
  factText: string;
  correctAnswer: string;
  category: string | null;
  isActive: boolean;
  isStarterPack: boolean;
  createdAt: string;
  playCount: number;
  creator: QuestionCreator | null;
}

interface TimeWarpQuestionItem {
  id: number;
  userId: string | null;
  imageUrl: string;
  era: string;
  answer: string;
  hint: string | null;
  category: string | null;
  isActive: boolean;
  isStarterPack: boolean;
  createdAt: string;
  creator: QuestionCreator | null;
}

interface MemePromptItem {
  id: number;
  userId: string | null;
  prompt: string;
  isActive: boolean;
  isStarterPack: boolean;
  createdAt: string;
  creator: QuestionCreator | null;
}

interface MemeImageItem {
  id: number;
  userId: string | null;
  imageUrl: string;
  caption: string | null;
  isActive: boolean;
  isStarterPack: boolean;
  createdAt: string;
  creator: QuestionCreator | null;
}

export default function SuperAdmin() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [userSearch, setUserSearch] = useState("");
  const [contentSearch, setContentSearch] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [contentTab, setContentTab] = useState<'games' | 'blitzgrid' | 'sequence' | 'psyop' | 'timewarp' | 'meme'>('games');
  
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementType, setAnnouncementType] = useState<"info" | "warning" | "success">("info");
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteContentItem, setDeleteContentItem] = useState<{ type: string; id: number; label?: string } | null>(null);
  const [sessionModeFilter, setSessionModeFilter] = useState<string>("all");

  // Queries
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

  // Mutations
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
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard'] });
      toast({ title: "Visibility updated" });
    },
    onError: () => toast({ title: "Couldn't update visibility", variant: "destructive" }),
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: { title: string; message: string; type?: string }) => {
      if (!data.title.trim() || !data.message.trim()) {
        throw new Error('Title and message are required');
      }
      await apiRequest('POST', '/api/super-admin/announcements', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/announcements'] });
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      setAnnouncementType("info");
      setShowAnnouncementForm(false);
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

  const formatRelativeDate = (dateStr: string | Date | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Unknown';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

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

  const getHostDisplay = (host: GameSessionDetailed['host'] | null | undefined) => {
    if (!host) return 'Unknown';
    if (host.firstName || host.lastName) {
      return `${host.firstName || ''} ${host.lastName || ''}`.trim();
    }
    if (host.email) return host.email;
    if (host.id) return `ID: ${host.id.slice(0, 8)}...`;
    return 'Unknown';
  };

  // Search filtering
  const filteredUsers = userSearch.trim() 
    ? allUsers.filter(u => {
        const search = userSearch.toLowerCase();
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        return (u.email ?? '').toLowerCase().includes(search) || fullName.includes(search);
      })
    : allUsers;

  const getGameModeLabel = (mode: string | null) => {
    switch (mode) {
      case 'buzzer': return 'BlitzGrid';
      case 'sequence': return 'Sort Circuit';
      case 'psyop': return 'PsyOp';
      case 'timewarp': return 'Past Forward';
      case 'meme': return 'Meme No Harm';
      default: return mode || 'Unknown';
    }
  };

  const filteredSessions = allSessions.filter(s => {
    if (sessionModeFilter !== 'all' && s.currentMode !== sessionModeFilter) return false;
    if (!sessionSearch.trim()) return true;
    const search = sessionSearch.toLowerCase();
    const hostName = `${s.host?.firstName || ''} ${s.host?.lastName || ''}`.toLowerCase();
    const modeLabel = getGameModeLabel(s.currentMode).toLowerCase();
    return (s.code ?? '').toLowerCase().includes(search) ||
      hostName.includes(search) ||
      (s.host?.email ?? '').toLowerCase().includes(search) ||
      modeLabel.includes(search) ||
      (s.currentMode ?? '').toLowerCase().includes(search) ||
      s.players.some(p => (p.name ?? '').toLowerCase().includes(search));
  });

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

  const ErrorState = ({ message = "Couldn't load data", onRetry, testId = "button-retry" }: { message?: string; onRetry?: () => void; testId?: string }) => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <RefreshCw className="w-8 h-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} data-testid={testId}>Try again</Button>
      )}
    </div>
  );

  const TrendBadge = ({ value }: { value: number }) => {
    if (value === 0) return null;
    return (
      <span className={`text-xs font-medium ${value > 0 ? 'text-green-400' : 'text-red-400'}`}>
        {value > 0 ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
        {value > 0 ? '+' : ''}{value}
      </span>
    );
  };

  return (
    <div className="min-h-screen gradient-game">
      <AppHeader minimal backHref="/" title="Super Admin" />

      <main className="px-4 py-6 max-w-5xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-black/20">
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

          {/* OVERVIEW TAB - Pulse + Analytics + Actions */}
          <TabsContent value="overview" className="space-y-6">
            {/* Live Pulse */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <CardTitle className="text-lg">Live Now</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => refetchDashboard()} data-testid="button-refresh-pulse" aria-label="Refresh dashboard">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingDashboard ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : isErrorDashboard ? (
                  <ErrorState message="Couldn't load stats" onRetry={() => refetchDashboard()} testId="button-retry-stats" />
                ) : dashboard && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-muted-foreground">Active Games</span>
                      </div>
                      <p className="text-2xl font-bold text-green-400">{dashboard.realtime.activeGames}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-muted-foreground">Active Players</span>
                      </div>
                      <p className="text-2xl font-bold">{dashboard.realtime.activePlayers}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-muted-foreground">Games Today</span>
                      </div>
                      <p className="text-2xl font-bold">{dashboard.today.games}</p>
                      <TrendBadge value={dashboard.today.gamesChange} />
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-muted-foreground">Total Users</span>
                      </div>
                      <p className="text-2xl font-bold">{dashboard.totals.users}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Needs Review */}
            {(isLoadingFlagged || isErrorFlagged || flaggedBoards.length > 0) && (
              <Card className="border-amber-500/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <CardTitle className="text-lg">Needs Review</CardTitle>
                    {!isLoadingFlagged && <Badge variant="secondary">{flaggedBoards.length}</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingFlagged ? (
                    <div className="space-y-2">
                      {[1,2].map(i => <Skeleton key={i} className="h-14" />)}
                    </div>
                  ) : isErrorFlagged ? (
                    <ErrorState message="Couldn't load flagged content" onRetry={() => refetchFlagged()} testId="button-retry-flagged" />
                  ) : (
                  <div className="space-y-2">
                    {flaggedBoards.map(board => (
                      <div key={board.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{board.name}</p>
                          <p className="text-xs text-muted-foreground">
                            by {board.ownerName || board.ownerEmail || 'Unknown'}
                            {board.flagReason && <> &middot; Reason: {board.flagReason}</>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Link href={`/admin/games`}>
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`button-inspect-${board.id}`}
                              aria-label="Inspect board"
                            >
                              <Eye className="w-4 h-4 mr-1" /> Inspect
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateModerationMutation.mutate({ boardId: board.id, data: { moderationStatus: 'approved' } })}
                            disabled={updateModerationMutation.isPending}
                            data-testid={`button-approve-${board.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateModerationMutation.mutate({ boardId: board.id, data: { moderationStatus: 'rejected' } })}
                            disabled={updateModerationMutation.isPending}
                            data-testid={`button-reject-${board.id}`}
                            aria-label="Reject content"
                          >
                            <X className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Analytics Summary */}
            {isLoadingDashboard && !dashboard ? (
              <div className="grid md:grid-cols-3 gap-4">
                {[1,2,3].map(i => (
                  <Card key={i}>
                    <CardHeader className="pb-2"><Skeleton className="h-4 w-20" /></CardHeader>
                    <CardContent className="space-y-2">
                      {[1,2,3].map(j => <Skeleton key={j} className="h-5 w-full" />)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : isErrorDashboard ? (
              <ErrorState message="Couldn't load analytics" onRetry={() => refetchDashboard()} testId="button-retry-analytics" />
            ) : dashboard && (
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">This Week</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Games</span>
                      <span className="font-bold">{dashboard.week.games}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Players</span>
                      <span className="font-bold">{dashboard.week.players}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">New Users</span>
                      <span className="font-bold">{dashboard.week.newUsers}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Platform Totals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Sessions</span>
                      <span className="font-bold">{dashboard.totals.sessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">BlitzGrid Grids</span>
                      <span className="font-bold">{dashboard.totals.boards}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Sort Circuit Q</span>
                      <span className="font-bold">{dashboard.totals.sortCircuitQuestions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Sort Circuit Sessions</span>
                      <span className="font-bold">{dashboard.sortCircuitSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">PsyOp Q</span>
                      <span className="font-bold">{dashboard.totals.psyopQuestions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">PsyOp Sessions</span>
                      <span className="font-bold">{dashboard.psyopSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Past Forward Q</span>
                      <span className="font-bold">{dashboard.totals.timeWarpQuestions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Past Forward Plays</span>
                      <span className="font-bold">{dashboard.performance.timewarpTotalPlays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Meme Sessions</span>
                      <span className="font-bold">{dashboard.performance.memeSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Meme Prompts</span>
                      <span className="font-bold">{dashboard.totals.memePrompts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Meme Images</span>
                      <span className="font-bold">{dashboard.totals.memeImages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Starter Packs</span>
                      <span className="font-bold">{dashboard.totals.starterPacks}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Performance (All Time)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">BlitzGrid</p>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Score</span>
                      <span className="font-bold">{dashboard.performance.avgScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">High Score</span>
                      <span className="font-bold">{dashboard.performance.highScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Completion</span>
                      <span className="font-bold">{dashboard.performance.completionRate}%</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs font-medium text-muted-foreground">Sort Circuit</p>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Accuracy</span>
                      <span className="font-bold">{dashboard.performance.sortCircuitAccuracy}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Time</span>
                      <span className="font-bold">{dashboard.performance.sortCircuitAvgTimeMs > 0 ? `${(dashboard.performance.sortCircuitAvgTimeMs / 1000).toFixed(1)}s` : '–'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Completion</span>
                      <span className="font-bold">{dashboard.performance.sortCircuitCompletionRate}%</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs font-medium text-muted-foreground">PsyOp</p>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Sessions</span>
                      <span className="font-bold">{dashboard.performance.psyopSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Rounds Played</span>
                      <span className="font-bold">{dashboard.performance.psyopTotalRounds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Deception Rate</span>
                      <span className="font-bold">{dashboard.performance.psyopDeceptionRate}%</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs font-medium text-muted-foreground">Past Forward</p>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Plays</span>
                      <span className="font-bold">{dashboard.performance.timewarpTotalPlays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Questions</span>
                      <span className="font-bold">{dashboard.performance.timewarpQuestionCount}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs font-medium text-muted-foreground">Meme No Harm</p>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Sessions</span>
                      <span className="font-bold">{dashboard.performance.memeSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Rounds Played</span>
                      <span className="font-bold">{dashboard.performance.memeRounds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Players</span>
                      <span className="font-bold">{dashboard.performance.memePlayers}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Top Hosts & Popular Content */}
            {isLoadingDashboard && !dashboard ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[1,2,3,4,5].map(i => (
                  <Card key={i}>
                    <CardHeader className="pb-3"><Skeleton className="h-5 w-24" /></CardHeader>
                    <CardContent className="space-y-2">
                      {[1,2,3].map(j => <Skeleton key={j} className="h-10 w-full" />)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : isErrorDashboard && !dashboard ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-muted-foreground">Top Hosts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-unavailable-top-hosts">Data unavailable</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-muted-foreground">Popular Grids</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-unavailable-popular-grids">Data unavailable</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-muted-foreground">Popular Sort Circuit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-unavailable-popular-sortcircuit">Data unavailable</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-muted-foreground">Popular PsyOp</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-unavailable-popular-psyop">Data unavailable</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-muted-foreground">Past Forward</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-unavailable-popular-timewarp">Data unavailable</p>
                  </CardContent>
                </Card>
              </div>
            ) : dashboard && (
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-400" /> Top Hosts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboard.topHostsWeek.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-empty-top-hosts">No data yet</p>
                    ) : (
                      <div className="space-y-2">
                        {dashboard.topHostsWeek.slice(0, 5).map((h, i) => (
                          <div key={`host-${h.name}-${i}`} className="flex items-center justify-between p-2 rounded bg-muted/30">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-muted-foreground w-5">#{i + 1}</span>
                              <span className="text-sm">{h.name}</span>
                            </div>
                            <Badge variant="secondary">{h.games} games</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Grid3X3 className="w-5 h-5 text-amber-400" /> Popular Grids
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboard.popularGridsWeek.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-empty-popular-grids">No data yet</p>
                    ) : (
                      <div className="space-y-2">
                        {dashboard.popularGridsWeek.slice(0, 5).map((g, i) => (
                          <div key={`grid-${g.name}-${i}`} className="flex items-center justify-between p-2 rounded bg-muted/30">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-muted-foreground w-5">#{i + 1}</span>
                              <span className="text-sm truncate">{g.name}</span>
                            </div>
                            <Badge variant="secondary">{g.plays} plays</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ListOrdered className="w-5 h-5 text-emerald-400" /> Popular Sort Circuit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboard.popularSortCircuitWeek.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-empty-popular-sortcircuit">No data yet</p>
                    ) : (
                      <div className="space-y-2">
                        {dashboard.popularSortCircuitWeek.slice(0, 5).map((q, i) => (
                          <div key={`sc-${q.name}-${i}`} className="flex items-center justify-between p-2 rounded bg-muted/30">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-muted-foreground w-5">#{i + 1}</span>
                              <span className="text-sm truncate">{q.name}</span>
                            </div>
                            <Badge variant="secondary">{q.plays} plays</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="w-5 h-5 text-violet-400" /> Popular PsyOp
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboard.popularPsyopWeek.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-empty-popular-psyop">No data yet</p>
                    ) : (
                      <div className="space-y-2">
                        {dashboard.popularPsyopWeek.slice(0, 5).map((q, i) => (
                          <div key={`psyop-${q.name}-${i}`} className="flex items-center justify-between p-2 rounded bg-muted/30 gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-bold text-muted-foreground w-5 flex-shrink-0">#{i + 1}</span>
                              <span className="text-sm truncate">{q.name}</span>
                            </div>
                            <Badge variant="secondary" className="flex-shrink-0">{q.plays} plays</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-500" /> Past Forward
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboard.popularTimewarpWeek.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-empty-popular-timewarp">No data yet</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Era Inventory</p>
                        {dashboard.popularTimewarpWeek.slice(0, 5).map((q, i) => (
                          <div key={`tw-${q.name}-${i}`} className="flex items-center justify-between p-2 rounded bg-muted/30 gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-bold text-muted-foreground w-5 flex-shrink-0">#{i + 1}</span>
                              <span className="text-sm truncate capitalize">{q.name.replace(/ era$/i, '')}</span>
                            </div>
                            <Badge variant="secondary" className="flex-shrink-0">{q.plays} Q</Badge>
                          </div>
                        ))}
                        <div className="border-t pt-2 mt-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Total plays</span>
                            <span className="font-medium">{dashboard.performance.timewarpTotalPlays}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Popular Meme No Harm Card */}
            {dashboard && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Image className="w-5 h-5 text-pink-400" /> Popular Meme Prompts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard.popularMemeWeek.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-empty-popular-meme">No meme rounds this week</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Most played prompts this week</p>
                      {dashboard.popularMemeWeek.slice(0, 5).map((m, i) => (
                        <div key={`meme-${m.name}-${i}`} className="flex items-center justify-between p-2 rounded bg-muted/30 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-bold text-muted-foreground w-5 flex-shrink-0">#{i + 1}</span>
                            <span className="text-sm truncate">{m.name}</span>
                          </div>
                          <Badge variant="secondary" className="flex-shrink-0">{m.plays} plays</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Megaphone className="w-5 h-5" /> Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAnnouncements ? (
                    <div className="space-y-2">
                      {[1,2].map(i => <Skeleton key={i} className="h-10" />)}
                    </div>
                  ) : isErrorAnnouncements ? (
                    <ErrorState message="Couldn't load announcements" onRetry={() => refetchAnnouncements()} testId="button-retry-announcements" />
                  ) : showAnnouncementForm ? (
                    <div className="space-y-3">
                      <div>
                        <Input
                          placeholder="Title"
                          value={announcementTitle}
                          onChange={(e) => setAnnouncementTitle(e.target.value)}
                          data-testid="input-announcement-title"
                        />
                        {!announcementTitle.trim() && announcementMessage.trim() && (
                          <p className="text-xs text-destructive mt-1" data-testid="text-error-title-required">Title is required</p>
                        )}
                      </div>
                      <div>
                        <Textarea
                          placeholder="Message"
                          value={announcementMessage}
                          onChange={(e) => setAnnouncementMessage(e.target.value)}
                          rows={2}
                          data-testid="input-announcement-message"
                        />
                        {announcementTitle.trim() && !announcementMessage.trim() && (
                          <p className="text-xs text-destructive mt-1" data-testid="text-error-message-required">Message is required</p>
                        )}
                      </div>
                      <Select value={announcementType} onValueChange={(v) => setAnnouncementType(v as typeof announcementType)}>
                        <SelectTrigger data-testid="select-announcement-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info" data-testid="select-item-info">Info</SelectItem>
                          <SelectItem value="warning" data-testid="select-item-warning">Warning</SelectItem>
                          <SelectItem value="success" data-testid="select-item-success">Success</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => createAnnouncementMutation.mutate({
                            title: announcementTitle,
                            message: announcementMessage,
                            type: announcementType
                          })}
                          disabled={!announcementTitle.trim() || !announcementMessage.trim()}
                          data-testid="button-send-announcement"
                        >
                          <Send className="w-4 h-4 mr-1" /> Send
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAnnouncementForm(false)} data-testid="button-cancel-announcement">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {announcements.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-empty-announcements">No active announcements</p>
                      ) : (
                        announcements.slice(0, 3).map(a => (
                          <div key={a.id} className="flex items-start justify-between p-2 rounded bg-muted/30">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{a.title}</p>
                              <p className="text-xs text-muted-foreground">{formatRelativeDate(a.createdAt)}</p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteAnnouncementMutation.mutate(a.id)}
                              data-testid={`button-delete-announcement-${a.id}`}
                              aria-label="Delete announcement"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowAnnouncementForm(true)}
                        data-testid="button-new-announcement"
                      >
                        <Megaphone className="w-4 h-4 mr-1" /> New Announcement
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Download className="w-5 h-5" /> Data Export
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export all platform data as JSON.
                  </p>
                  <Button
                    onClick={handleExportData}
                    disabled={isExporting}
                    data-testid="button-export-data"
                  >
                    {isExporting ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Exporting...</>
                    ) : (
                      <><Download className="w-4 h-4 mr-2" /> Export All Data</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">All Users</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-9 w-40"
                        data-testid="input-search-users"
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => refetchUsers()} data-testid="button-refresh-users" aria-label="Refresh users">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="space-y-2">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : isErrorUsers ? (
                  <ErrorState message="Couldn't load users" onRetry={() => refetchUsers()} testId="button-retry-users" />
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8" data-testid="text-empty-users">No users found</p>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : u.email}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            {u.contentCounts && (u.contentCounts.timeWarpQuestions > 0 || u.contentCounts.sequenceQuestions > 0 || u.contentCounts.psyopQuestions > 0 || u.contentCounts.memePrompts > 0 || u.contentCounts.memeImages > 0 || u.boardCount > 0) && (
                              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                {u.boardCount > 0 && <Badge variant="outline" className="text-xs">{u.boardCount} grids</Badge>}
                                {u.contentCounts.sequenceQuestions > 0 && <Badge variant="outline" className="text-xs">{u.contentCounts.sequenceQuestions} SC</Badge>}
                                {u.contentCounts.psyopQuestions > 0 && <Badge variant="outline" className="text-xs">{u.contentCounts.psyopQuestions} PsyOp</Badge>}
                                {u.contentCounts.timeWarpQuestions > 0 && <Badge variant="outline" className="text-xs">{u.contentCounts.timeWarpQuestions} PF</Badge>}
                                {(u.contentCounts.memePrompts > 0 || u.contentCounts.memeImages > 0) && <Badge variant="outline" className="text-xs">{(u.contentCounts.memePrompts || 0) + (u.contentCounts.memeImages || 0)} meme</Badge>}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Select
                            value={u.role}
                            onValueChange={(role) => updateRoleMutation.mutate({ userId: u.id, role })}
                          >
                            <SelectTrigger className="w-28 h-8" data-testid={`select-role-${u.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setDeleteUserId(u.id)}
                            aria-label="Delete user"
                            disabled={u.id === user.id}
                            data-testid={`button-delete-user-${u.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONTENT TAB - Games + BlitzGrid + Sort Circuit + PsyOp */}
          <TabsContent value="content" className="space-y-4">
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
                {/* Content Type Tabs */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={contentTab === 'games' ? 'default' : 'outline'}
                    onClick={() => { setContentTab('games'); setContentSearch(''); }}
                    data-testid="button-content-games"
                  >
                    <Gamepad2 className="w-4 h-4 mr-1" /> Games
                  </Button>
                  <Button
                    size="sm"
                    variant={contentTab === 'blitzgrid' ? 'default' : 'outline'}
                    onClick={() => { setContentTab('blitzgrid'); setContentSearch(''); }}
                    data-testid="button-content-blitzgrid"
                  >
                    <Grid3X3 className="w-4 h-4 mr-1" /> BlitzGrid
                    {dashboard?.totals.boards ? <Badge variant="secondary" className="ml-1 text-xs">{dashboard.totals.boards}</Badge> : null}
                  </Button>
                  <Button
                    size="sm"
                    variant={contentTab === 'sequence' ? 'default' : 'outline'}
                    onClick={() => { setContentTab('sequence'); setContentSearch(''); }}
                    data-testid="button-content-sequence"
                  >
                    <ListOrdered className="w-4 h-4 mr-1" /> Sort Circuit
                    {dashboard?.totals.sortCircuitQuestions ? <Badge variant="secondary" className="ml-1 text-xs">{dashboard.totals.sortCircuitQuestions}</Badge> : null}
                  </Button>
                  <Button
                    size="sm"
                    variant={contentTab === 'psyop' ? 'default' : 'outline'}
                    onClick={() => { setContentTab('psyop'); setContentSearch(''); }}
                    data-testid="button-content-psyop"
                  >
                    <Brain className="w-4 h-4 mr-1" /> PsyOp
                    {dashboard?.totals.psyopQuestions ? <Badge variant="secondary" className="ml-1 text-xs">{dashboard.totals.psyopQuestions}</Badge> : null}
                  </Button>
                  <Button
                    size="sm"
                    variant={contentTab === 'timewarp' ? 'default' : 'outline'}
                    onClick={() => { setContentTab('timewarp'); setContentSearch(''); }}
                    data-testid="button-content-timewarp"
                  >
                    <Clock className="w-4 h-4 mr-1" /> Past Forward
                    {dashboard?.totals.timeWarpQuestions ? <Badge variant="secondary" className="ml-1 text-xs">{dashboard.totals.timeWarpQuestions}</Badge> : null}
                  </Button>
                  <Button
                    size="sm"
                    variant={contentTab === 'meme' ? 'default' : 'outline'}
                    onClick={() => { setContentTab('meme'); setContentSearch(''); }}
                    data-testid="button-content-meme"
                  >
                    <Image className="w-4 h-4 mr-1" /> Meme
                    {(dashboard?.totals.memePrompts || dashboard?.totals.memeImages) ? <Badge variant="secondary" className="ml-1 text-xs">{(dashboard?.totals.memePrompts || 0) + (dashboard?.totals.memeImages || 0)}</Badge> : null}
                  </Button>
                </div>

                {/* Games Control */}
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
                              <SelectTrigger className="w-32 h-8" data-testid={`select-game-status-${game.id}`}>
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

                {/* BlitzGrid Grids */}
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
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {filteredBoards.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
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
                  )
                )}

                {/* Sort Circuit Questions */}
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
                        <p className="text-xs text-muted-foreground">{filteredSequenceQuestions.length} question{filteredSequenceQuestions.length !== 1 ? 's' : ''}{contentSearch.trim() ? ' matching' : ''}</p>
                        <Link href="/admin/sort-circuit">
                          <Button size="sm" variant="outline" data-testid="button-goto-sortcircuit-admin">
                            <ListOrdered className="w-4 h-4 mr-1" /> Sort Circuit Admin
                          </Button>
                        </Link>
                      </div>
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {filteredSequenceQuestions.map(q => (
                        <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
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

                {/* PsyOp Questions */}
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
                        <p className="text-xs text-muted-foreground">{filteredPsyopQuestions.length} question{filteredPsyopQuestions.length !== 1 ? 's' : ''}{contentSearch.trim() ? ' matching' : ''}</p>
                        <Link href="/admin/psyop">
                          <Button size="sm" variant="outline" data-testid="button-goto-psyop-admin">
                            <Brain className="w-4 h-4 mr-1" /> PsyOp Admin
                          </Button>
                        </Link>
                      </div>
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {filteredPsyopQuestions.map(q => (
                        <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{q.factText}</p>
                              <Badge variant="outline" className="text-xs">Answer: {q.correctAnswer}</Badge>
                              {!q.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Hidden</Badge>}
                              {q.isStarterPack && <Badge variant="secondary"><Star className="w-3 h-3 mr-1" /> Starter</Badge>}
                              {q.playCount > 0 && <Badge variant="outline" className="text-xs">{q.playCount} play{q.playCount !== 1 ? 's' : ''}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              by {q.creator?.username || 'Unknown'} • {formatRelativeDate(q.createdAt)}{q.category ? ` • ${q.category}` : ''}
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
                        <p className="text-xs text-muted-foreground">{filteredTimewarpQuestions.length} question{filteredTimewarpQuestions.length !== 1 ? 's' : ''}{contentSearch.trim() ? ' matching' : ''}</p>
                        <Link href="/admin/pastforward">
                          <Button size="sm" variant="outline" data-testid="button-goto-timewarp-admin">
                            <Clock className="w-4 h-4 mr-1" /> Past Forward Admin
                          </Button>
                        </Link>
                      </div>
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {filteredTimewarpQuestions.map(q => (
                        <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
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
                                by {q.creator?.username || 'Unknown'} • {formatRelativeDate(q.createdAt)}{q.category ? ` • ${q.category}` : ''}
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
                        <p className="text-xs text-muted-foreground">{filteredMemePrompts.length} prompt{filteredMemePrompts.length !== 1 ? 's' : ''}, {filteredMemeImages.length} image{filteredMemeImages.length !== 1 ? 's' : ''}{contentSearch.trim() ? ' matching' : ''}</p>
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
                              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
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
                                    <img src={img.imageUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                      <Image className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                  )}
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
          </TabsContent>

          {/* SESSIONS TAB */}
          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">Game Sessions</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={sessionModeFilter} onValueChange={setSessionModeFilter}>
                      <SelectTrigger className="w-32" data-testid="select-session-mode-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" data-testid="select-item-all-modes">All Modes</SelectItem>
                        <SelectItem value="buzzer" data-testid="select-item-buzzer">BlitzGrid</SelectItem>
                        <SelectItem value="sequence" data-testid="select-item-sequence">Sort Circuit</SelectItem>
                        <SelectItem value="psyop" data-testid="select-item-psyop-mode">PsyOp</SelectItem>
                        <SelectItem value="timewarp" data-testid="select-item-timewarp-mode">Past Forward</SelectItem>
                        <SelectItem value="meme" data-testid="select-item-meme-mode">Meme</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={sessionSearch}
                        onChange={(e) => setSessionSearch(e.target.value)}
                        className="pl-9 w-40"
                        data-testid="input-search-sessions"
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => refetchSessions()} data-testid="button-refresh-sessions" aria-label="Refresh sessions">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingSessions ? (
                  <div className="space-y-2">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : isErrorSessions ? (
                  <ErrorState message="Couldn't load sessions" onRetry={() => refetchSessions()} testId="button-retry-sessions" />
                ) : filteredSessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8" data-testid="text-empty-sessions">{sessionSearch.trim() || sessionModeFilter !== 'all' ? 'No matching sessions' : 'No sessions found'}</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground px-1">{filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}{sessionModeFilter !== 'all' || sessionSearch.trim() ? ' matching' : ''}</p>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredSessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="text-center flex-shrink-0">
                            <p className="font-mono font-bold text-lg">{s.code}</p>
                            <Badge variant={['active', 'waiting', 'submitting', 'voting', 'revealing', 'lobby', 'selecting', 'reveal'].includes(s.state) ? 'default' : 'outline'} className="text-xs">
                              {s.state}
                            </Badge>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">
                                {getHostDisplay(s.host)}
                              </p>
                              {s.currentMode && (
                                <Badge variant="outline" className="text-xs">
                                  {getGameModeLabel(s.currentMode)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {s.playerCount} player{s.playerCount !== 1 ? 's' : ''}
                              {(s.roundCount ?? 0) > 0 ? ` • ${s.roundCount} round${s.roundCount !== 1 ? 's' : ''}` : ''}
                              {' • '}{formatRelativeDate(s.createdAt)}
                            </p>
                          </div>
                        </div>
                        {s.winner && (
                          <Badge variant="secondary" className="flex-shrink-0">
                            <Crown className="w-3 h-3 mr-1" /> {s.winner.name}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete User Dialog */}
        <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the user and all their content.
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
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Content Item Dialog */}
        <AlertDialog open={!!deleteContentItem} onOpenChange={() => setDeleteContentItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {deleteContentItem?.type === 'board' ? 'BlitzGrid Board' : deleteContentItem?.type === 'sequence' ? 'Sort Circuit Question' : deleteContentItem?.type === 'psyop' ? 'PsyOp Question' : deleteContentItem?.type === 'timewarp' ? 'Past Forward Question' : deleteContentItem?.type === 'meme-prompt' ? 'Meme Prompt' : deleteContentItem?.type === 'meme-image' ? 'Meme Image' : 'Content'}?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteContentItem?.label ? (
                  <>This will permanently delete: <span className="font-medium">"{deleteContentItem.label.length > 80 ? deleteContentItem.label.slice(0, 80) + '...' : deleteContentItem.label}"</span></>
                ) : (
                  'This will permanently delete this item.'
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-item">Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!deleteContentItem) return;
                  switch (deleteContentItem.type) {
                    case 'board': deleteBoardMutation.mutate(deleteContentItem.id); break;
                    case 'sequence': deleteSequenceQuestionMutation.mutate(deleteContentItem.id); break;
                    case 'psyop': deletePsyopQuestionMutation.mutate(deleteContentItem.id); break;
                    case 'timewarp': deleteTimewarpQuestionMutation.mutate(deleteContentItem.id); break;
                    case 'meme-prompt': deleteMemePromptMutation.mutate(deleteContentItem.id); break;
                    case 'meme-image': deleteMemeImageMutation.mutate(deleteContentItem.id); break;
                  }
                }}
                disabled={
                  deleteBoardMutation.isPending ||
                  deleteSequenceQuestionMutation.isPending ||
                  deletePsyopQuestionMutation.isPending ||
                  deleteTimewarpQuestionMutation.isPending ||
                  deleteMemePromptMutation.isPending ||
                  deleteMemeImageMutation.isPending
                }
                data-testid="button-confirm-delete-item"
              >
                {(deleteBoardMutation.isPending ||
                  deleteSequenceQuestionMutation.isPending ||
                  deletePsyopQuestionMutation.isPending ||
                  deleteTimewarpQuestionMutation.isPending ||
                  deleteMemePromptMutation.isPending ||
                  deleteMemeImageMutation.isPending) ? 'Deleting...' : 'Delete'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
