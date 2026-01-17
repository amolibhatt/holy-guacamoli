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

export interface ShuffleOptions {
  includePersonal: boolean;
  userId: string;
  userRole: string;
}

// Check if a category is "Live" - has at least one question per tier (10, 20, 30, 40, 50)
async function isCategoryLive(categoryId: number): Promise<boolean> {
  const qs = await storage.getQuestionsForCategory(categoryId);
  if (qs.length < 5) return false;
  
  const requiredPoints = [10, 20, 30, 40, 50];
  const pointsSet = new Set(qs.map((q: { points: number }) => q.points));
  return requiredPoints.every(p => pointsSet.has(p));
}

export async function generateDynamicBoard(
  sessionId: number, 
  options: ShuffleOptions = { includePersonal: false, userId: "shuffle-host", userRole: "admin" }
): Promise<DynamicBoardResult> {
  const { includePersonal, userId, userRole } = options;
  
  const session = await storage.getSession(sessionId);
  if (!session) {
    return {
      categories: [],
      wasReset: false,
      error: "Session not found",
    };
  }

  // Get all boards to determine which categories are global vs personal
  const allBoards = await storage.getBoards("system", "super_admin");
  const globalBoardIds = allBoards.filter(b => b.isGlobal).map(b => b.id);
  
  // For super admin, see all non-global boards; for others, only their own
  const personalBoardIds = userRole === "super_admin"
    ? allBoards.filter(b => !b.isGlobal && b.userId).map(b => b.id)
    : allBoards.filter(b => b.userId === userId && !b.isGlobal).map(b => b.id);
  
  // Collect all Live categories from global boards
  const liveCategories: Category[] = [];
  const seenCategoryIds = new Set<number>();
  
  // Add global categories
  for (const boardId of globalBoardIds) {
    const boardCats = await storage.getBoardCategories(boardId);
    for (const bc of boardCats) {
      if (seenCategoryIds.has(bc.categoryId)) continue;
      const category = await storage.getCategory(bc.categoryId);
      if (!category || !category.isActive) continue;
      
      if (await isCategoryLive(bc.categoryId)) {
        liveCategories.push(category);
        seenCategoryIds.add(bc.categoryId);
      }
    }
  }
  
  // Add personal categories if requested
  if (includePersonal) {
    for (const boardId of personalBoardIds) {
      const boardCats = await storage.getBoardCategories(boardId);
      for (const bc of boardCats) {
        if (seenCategoryIds.has(bc.categoryId)) continue;
        const category = await storage.getCategory(bc.categoryId);
        if (!category || !category.isActive) continue;
        
        if (await isCategoryLive(bc.categoryId)) {
          liveCategories.push(category);
          seenCategoryIds.add(bc.categoryId);
        }
      }
    }
  }
  
  if (liveCategories.length < 5) {
    const poolDesc = includePersonal ? "global + personal" : "global";
    return {
      categories: [],
      wasReset: false,
      error: `Need at least 5 Live categories to shuffle. Found ${liveCategories.length} in the ${poolDesc} pool. A category is Live when it has exactly 5 questions (10, 20, 30, 40, 50 points).`,
    };
  }

  let playedCategoryIds = (session.playedCategoryIds as number[]) || [];
  
  // Filter out already-played categories
  let availableCategories = liveCategories.filter(
    cat => !playedCategoryIds.includes(cat.id)
  );
  
  // Reset if not enough available
  if (availableCategories.length < 5) {
    playedCategoryIds = [];
    availableCategories = liveCategories;
  }
  
  // Shuffle and pick 5
  const shuffleArray = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
  const selectedCategories = shuffleArray(availableCategories).slice(0, 5);
  
  // Track played categories
  for (const cat of selectedCategories) {
    playedCategoryIds.push(cat.id);
  }

  await storage.updateSessionPlayedCategories(sessionId, playedCategoryIds);

  return {
    categories: selectedCategories,
    wasReset: false,
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
