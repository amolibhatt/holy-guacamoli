import { storage } from "./storage";
import { SOURCE_GROUPS, type Category, type SourceGroup } from "@shared/schema";

export interface MashedBoardResult {
  categories: Category[];
  wasReset: boolean;
  message?: string;
  missingGroups?: string[];
  error?: string;
}

export interface BoardWithQuestions {
  categoryId: number;
  categoryName: string;
  questions: {
    id: number;
    question: string;
    options: string[];
    correctAnswer: string;
    points: number;
  }[];
}

export async function generateMashedBoard(sessionId: number): Promise<MashedBoardResult> {
  const session = await storage.getSession(sessionId);
  if (!session) {
    return {
      categories: [],
      wasReset: false,
      error: "Session not found",
    };
  }

  const groupedCategories = await storage.getCategoriesBySourceGroup();
  
  const emptyGroups: string[] = [];
  for (const group of SOURCE_GROUPS) {
    const count = (groupedCategories.get(group) || []).length;
    if (count === 0) {
      emptyGroups.push(group);
    }
  }
  
  if (emptyGroups.length > 0) {
    return {
      categories: [],
      wasReset: false,
      error: `Missing categories in groups: ${emptyGroups.join(", ")}. Please add categories to all 5 groups (A-E).`,
      missingGroups: emptyGroups,
    };
  }

  let playedCategoryIds = (session.playedCategoryIds as number[]) || [];
  let wasReset = false;
  let resetMessage: string | undefined;
  
  let needsReset = false;
  for (const group of SOURCE_GROUPS) {
    const categoriesInGroup = groupedCategories.get(group) || [];
    const availableCategories = categoriesInGroup.filter(
      cat => !playedCategoryIds.includes(cat.id)
    );
    if (availableCategories.length === 0) {
      needsReset = true;
      break;
    }
  }
  
  if (needsReset) {
    await storage.resetSessionPlayedCategories(sessionId);
    playedCategoryIds = [];
    wasReset = true;
    resetMessage = "All categories exhausted. Vault has been reset!";
  }
  
  const selectedCategories: Category[] = [];
  
  for (const group of SOURCE_GROUPS) {
    const categoriesInGroup = groupedCategories.get(group) || [];
    const availableCategories = categoriesInGroup.filter(
      cat => !playedCategoryIds.includes(cat.id)
    );
    
    if (availableCategories.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCategories.length);
      selectedCategories.push(availableCategories[randomIndex]);
    }
  }
  
  if (selectedCategories.length !== 5) {
    return {
      categories: selectedCategories,
      wasReset,
      error: `Could only select ${selectedCategories.length} categories. Each group needs at least one category.`,
    };
  }
  
  const newPlayedIds = [...playedCategoryIds, ...selectedCategories.map(c => c.id)];
  await storage.updateSessionPlayedCategories(sessionId, newPlayedIds);
  
  return {
    categories: selectedCategories,
    wasReset,
    message: resetMessage,
  };
}

export async function getThemedBoardCategories(sourceGroup: SourceGroup): Promise<Category[]> {
  const groupedCategories = await storage.getCategoriesBySourceGroup();
  return groupedCategories.get(sourceGroup) || [];
}

export async function getCategoryWithQuestionsForBoard(
  categoryId: number,
  boardId: number
): Promise<BoardWithQuestions | null> {
  const category = await storage.getCategory(categoryId);
  if (!category) return null;
  
  const boardCategory = await storage.getBoardCategoryByIds(boardId, categoryId);
  if (!boardCategory) return null;
  
  const questions = await storage.getQuestionsByBoardCategory(boardCategory.id);
  
  return {
    categoryId: category.id,
    categoryName: category.name,
    questions: questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: q.points,
    })),
  };
}

export async function getPlayedCategoryStatus(sessionId: number): Promise<{
  playedCategoryIds: number[];
  totalPlayed: number;
  totalCategories: number;
  cycleComplete: boolean;
  groupCounts: Record<string, number>;
}> {
  const session = await storage.getSession(sessionId);
  const groupedCategories = await storage.getCategoriesBySourceGroup();
  
  let totalAssignedCategories = 0;
  const groupCounts: Record<string, number> = {};
  
  for (const group of SOURCE_GROUPS) {
    const count = (groupedCategories.get(group) || []).length;
    groupCounts[group] = count;
    totalAssignedCategories += count;
  }
  
  if (!session) {
    return { 
      playedCategoryIds: [], 
      totalPlayed: 0, 
      totalCategories: totalAssignedCategories,
      cycleComplete: false,
      groupCounts,
    };
  }
  
  const playedCategoryIds = (session.playedCategoryIds as number[]) || [];
  const cycleComplete = playedCategoryIds.length >= totalAssignedCategories && totalAssignedCategories > 0;
  
  return {
    playedCategoryIds,
    totalPlayed: playedCategoryIds.length,
    totalCategories: totalAssignedCategories,
    cycleComplete,
    groupCounts,
  };
}
