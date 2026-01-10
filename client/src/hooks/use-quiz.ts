import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Board, Category, BoardCategoryWithCategory, Question } from "@shared/schema";

// GET /api/boards
export function useBoards() {
  return useQuery<Board[]>({
    queryKey: ["/api/boards"],
    queryFn: async () => {
      const res = await fetch("/api/boards");
      if (!res.ok) throw new Error("Failed to fetch boards");
      return res.json();
    },
  });
}

// GET /api/boards/:id
export function useBoard(id: number | null) {
  return useQuery<Board>({
    queryKey: ["/api/boards", id],
    enabled: id !== null,
    queryFn: async () => {
      const res = await fetch(`/api/boards/${id}`);
      if (!res.ok) throw new Error("Failed to fetch board");
      return res.json();
    },
  });
}

// GET /api/boards/:id/categories - returns BoardCategoryWithCategory[]
export function useBoardCategories(boardId: number | null) {
  return useQuery<BoardCategoryWithCategory[]>({
    queryKey: ["/api/boards", boardId, "categories"],
    enabled: boardId !== null,
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}/categories`);
      if (!res.ok) throw new Error("Failed to fetch board categories");
      return res.json();
    },
  });
}

// GET /api/categories (global templates)
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      const res = await fetch(api.categories.list.path);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });
}

// GET /api/categories/:id
export function useCategory(id: number) {
  return useQuery<Category>({
    queryKey: [api.categories.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      const url = buildUrl(api.categories.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) throw new Error("Category not found");
      if (!res.ok) throw new Error("Failed to fetch category");
      return res.json();
    },
  });
}

// GET /api/board-categories/:boardCategoryId/questions
export function useQuestionsByBoardCategory(boardCategoryId: number) {
  return useQuery<Question[]>({
    queryKey: ["/api/board-categories", boardCategoryId, "questions"],
    enabled: !!boardCategoryId,
    queryFn: async () => {
      const res = await fetch(`/api/board-categories/${boardCategoryId}/questions`);
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
