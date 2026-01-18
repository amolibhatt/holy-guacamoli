import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useAuth } from "@/hooks/use-auth";
import type { Board, Category, BoardCategoryWithCategory, Question } from "@shared/schema";

// All these hooks are protected - they require authentication
// They automatically read auth state and won't fire until authenticated

// GET /api/boards
export function useBoards() {
  const { isAuthenticated } = useAuth();
  return useQuery<Board[]>({
    queryKey: ["/api/boards"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/boards");
      if (!res.ok) throw new Error("Failed to fetch boards");
      return res.json();
    },
  });
}

// GET /api/boards/:id
export function useBoard(id: number | null) {
  const { isAuthenticated } = useAuth();
  return useQuery<Board>({
    queryKey: ["/api/boards", id],
    enabled: id !== null && isAuthenticated,
    queryFn: async () => {
      const res = await fetch(`/api/boards/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch board");
      return res.json();
    },
  });
}

// GET /api/boards/:id/categories - returns BoardCategoryWithCategory[]
export function useBoardCategories(boardId: number | null) {
  const { isAuthenticated } = useAuth();
  return useQuery<BoardCategoryWithCategory[]>({
    queryKey: ["/api/boards", boardId, "categories"],
    enabled: boardId !== null && isAuthenticated,
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}/categories`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch board categories");
      return res.json();
    },
  });
}

// GET /api/categories (global templates)
export function useCategories() {
  const { isAuthenticated } = useAuth();
  return useQuery<Category[]>({
    queryKey: [api.categories.list.path],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch(api.categories.list.path);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });
}

// GET /api/categories/:id
export function useCategory(id: number) {
  const { isAuthenticated } = useAuth();
  return useQuery<Category>({
    queryKey: [api.categories.get.path, id],
    enabled: !!id && isAuthenticated,
    queryFn: async () => {
      const url = buildUrl(api.categories.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) throw new Error("Category not found");
      if (!res.ok) throw new Error("Failed to fetch category");
      return res.json();
    },
  });
}

// GET /api/categories/:categoryId/questions
export function useQuestionsByCategory(categoryId: number) {
  const { isAuthenticated } = useAuth();
  return useQuery<Question[]>({
    queryKey: ["/api/categories", categoryId, "questions"],
    enabled: !!categoryId && isAuthenticated,
    queryFn: async () => {
      const res = await fetch(`/api/categories/${categoryId}/questions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch questions");
      return res.json();
    },
  });
}

// POST /api/questions/:id/verify
export function useVerifyAnswer() {
  return useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: number; answer: string }) => {
      const url = buildUrl(api.questions.verifyAnswer.path, { id: questionId });
      const res = await fetch(url, {
        method: api.questions.verifyAnswer.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      
      if (!res.ok) throw new Error("Failed to verify answer");
      return api.questions.verifyAnswer.responses[200].parse(await res.json());
    },
  });
}
