import { storage } from "./storage";
import { SOURCE_GROUPS, type Category, type SourceGroup } from "@shared/schema";

export interface MashedBoardResult {
  categories: Category[];
  wasReset: boolean;
  message?: string;
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
    throw new Error("Session not found");
  }

  const playedCategoryIds = (session.playedCategoryIds as number[]) || [];
  const groupedCategories = await storage.getCategoriesBySourceGroup();
  
  const sourceGroups: SourceGroup[] = [...SOURCE_GROUPS];
  const selectedCategories: Category[] = [];
  let wasReset = false;
  let resetMessage: string | undefined;
  
  for (const group of sourceGroups) {
    const categoriesInGroup = groupedCategories.get(group) || [];
    const availableCategories = categoriesInGroup.filter(
      cat => !playedCategoryIds.includes(cat.id)
    );
    
    if (availableCategories.length === 0 && categoriesInGroup.length > 0) {
      wasReset = true;
      resetMessage = "All logic exhausted. Resetting the vault!";
      break;
    }
    
    if (availableCategories.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCategories.length);
      selectedCategories.push(availableCategories[randomIndex]);
    }
  }
  
  if (wasReset) {
    await storage.resetSessionPlayedCategories(sessionId);
    return generateMashedBoard(sessionId);
  }
  
  if (selectedCategories.length < 5) {
    const unassignedCategories = groupedCategories.get('unassigned') || [];
    const availableUnassigned = unassignedCategories.filter(
      cat => !playedCategoryIds.includes(cat.id)
    );
    
    while (selectedCategories.length < 5 && availableUnassigned.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableUnassigned.length);
      selectedCategories.push(availableUnassigned[randomIndex]);
      availableUnassigned.splice(randomIndex, 1);
    }
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
  cycleComplete: boolean;
}> {
  const session = await storage.getSession(sessionId);
  if (!session) {
    return { playedCategoryIds: [], totalPlayed: 0, cycleComplete: false };
  }
  
  const playedCategoryIds = (session.playedCategoryIds as number[]) || [];
  const groupedCategories = await storage.getCategoriesBySourceGroup();
  
  let totalAssignedCategories = 0;
  for (const group of SOURCE_GROUPS) {
    totalAssignedCategories += (groupedCategories.get(group) || []).length;
  }
  
  const maxCycleSize = totalAssignedCategories;
  const cycleComplete = playedCategoryIds.length >= maxCycleSize && maxCycleSize > 0;
  
  return {
    playedCategoryIds,
    totalPlayed: playedCategoryIds.length,
    cycleComplete,
  };
}
