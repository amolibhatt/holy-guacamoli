import { storage } from "./storage";
import type { Category, Board } from "@shared/schema";
import { SOURCE_GROUPS } from "@shared/schema";

export interface DynamicBoardResult {
  categories: Category[];
  wasReset: boolean;
  resetGroups?: string[];
  message?: string;
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

export interface ContentStats {
  totalBoards: number;
  totalCategories: number;
  activeCategories: number;
  readyToPlay: number;
  totalQuestions: number;
}

export async function generateDynamicBoard(sessionId: number): Promise<DynamicBoardResult> {
  const session = await storage.getSession(sessionId);
  if (!session) {
    return {
      categories: [],
      wasReset: false,
      error: "Session not found",
    };
  }

  // Get all categories grouped by source group (A-E)
  const categoriesByGroup = await storage.getCategoriesBySourceGroup();
  
  // Filter to only active categories with questions
  const activeGroupedCategories = new Map<string, Category[]>();
  for (const group of SOURCE_GROUPS) {
    const groupCats = categoriesByGroup.get(group) || [];
    const activeCats: Category[] = [];
    for (const cat of groupCats) {
      if (cat.isActive) {
        const questionCount = await storage.getQuestionCountForCategory(cat.id);
        if (questionCount > 0) {
          activeCats.push(cat);
        }
      }
    }
    if (activeCats.length > 0) {
      activeGroupedCategories.set(group, activeCats);
    }
  }
  
  if (activeGroupedCategories.size === 0) {
    return {
      categories: [],
      wasReset: false,
      error: "No active categories with questions found. Please add categories to source groups in the admin panel.",
    };
  }

  let playedCategoryIds = (session.playedCategoryIds as number[]) || [];
  const resetGroups: string[] = [];
  const selectedCategories: Category[] = [];

  // Pick 1 category from each source group (A-E)
  for (const group of SOURCE_GROUPS) {
    const groupCategories = activeGroupedCategories.get(group);
    if (!groupCategories || groupCategories.length === 0) continue;

    // Filter out already-played categories
    let availableCategories = groupCategories.filter(
      cat => !playedCategoryIds.includes(cat.id)
    );

    // If all categories in this group have been played, reset the group
    if (availableCategories.length === 0) {
      const groupCategoryIds = groupCategories.map(c => c.id);
      playedCategoryIds = playedCategoryIds.filter(id => !groupCategoryIds.includes(id));
      resetGroups.push(`Group ${group}`);
      availableCategories = groupCategories;
    }

    // Randomly select one category from available
    if (availableCategories.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCategories.length);
      const selectedCategory = availableCategories[randomIndex];
      selectedCategories.push(selectedCategory);
      playedCategoryIds.push(selectedCategory.id);
    }
  }

  if (selectedCategories.length === 0) {
    return {
      categories: [],
      wasReset: false,
      error: "Could not select any categories. Make sure categories have source groups assigned.",
    };
  }

  await storage.updateSessionPlayedCategories(sessionId, playedCategoryIds);

  return {
    categories: selectedCategories,
    wasReset: resetGroups.length > 0,
    resetGroups: resetGroups.length > 0 ? resetGroups : undefined,
    message: resetGroups.length > 0 
      ? `Categories reset for: ${resetGroups.join(", ")}` 
      : undefined,
  };
}

export async function getContentStats(): Promise<ContentStats> {
  const stats = await storage.getContentStats();
  return stats;
}

export async function getActiveCategoriesForTenant(): Promise<Array<{
  category: Category;
  board: Board;
  questionCount: number;
}>> {
  const activeCategoriesByBoard = await storage.getActiveCategoriesByBoard();
  const result: Array<{
    category: Category;
    board: Board;
    questionCount: number;
  }> = [];

  const entries = Array.from(activeCategoriesByBoard.entries());
  for (const [, boardData] of entries) {
    for (const category of boardData.categories) {
      const questionCount = await storage.getQuestionCountForCategory(category.id);
      result.push({
        category,
        board: boardData.board,
        questionCount,
      });
    }
  }

  return result;
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
  totalActiveCategories: number;
  boardStats: Record<number, { boardName: string; total: number; played: number }>;
}> {
  const session = await storage.getSession(sessionId);
  const activeCategoriesByBoard = await storage.getActiveCategoriesByBoard();
  
  const playedCategoryIds = session ? (session.playedCategoryIds as number[]) || [] : [];
  
  let totalActiveCategories = 0;
  const boardStats: Record<number, { boardName: string; total: number; played: number }> = {};
  
  const entries = Array.from(activeCategoriesByBoard.entries());
  for (const [boardId, boardData] of entries) {
    const totalInBoard = boardData.categories.length;
    const playedInBoard = boardData.categories.filter((c: Category) => playedCategoryIds.includes(c.id)).length;
    
    boardStats[boardId] = {
      boardName: boardData.board.name,
      total: totalInBoard,
      played: playedInBoard,
    };
    
    totalActiveCategories += totalInBoard;
  }
  
  return {
    playedCategoryIds,
    totalPlayed: playedCategoryIds.length,
    totalActiveCategories,
    boardStats,
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
