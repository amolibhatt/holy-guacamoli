import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

// GET /api/categories
export function useCategories() {
  return useQuery({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      const res = await fetch(api.categories.list.path);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return api.categories.list.responses[200].parse(await res.json());
    },
  });
}

// GET /api/categories/:id
export function useCategory(id: number) {
  return useQuery({
    queryKey: [api.categories.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      const url = buildUrl(api.categories.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) throw new Error("Category not found");
      if (!res.ok) throw new Error("Failed to fetch category");
      return api.categories.get.responses[200].parse(await res.json());
    },
  });
}

// GET /api/categories/:categoryId/questions
export function useQuestions(categoryId: number) {
  return useQuery({
    queryKey: [api.questions.listByCategory.path, categoryId],
    enabled: !!categoryId,
    queryFn: async () => {
      const url = buildUrl(api.questions.listByCategory.path, { categoryId });
      const res = await fetch(url);
      if (res.status === 404) throw new Error("Category not found");
      if (!res.ok) throw new Error("Failed to fetch questions");
      return api.questions.listByCategory.responses[200].parse(await res.json());
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
