import { storage } from "./storage";
import type { Category, Board } from "@shared/schema";

export interface DynamicBoardResult {
  categories: Array<{
    category: Category;
    board: Board;
    questionCount: number;
  }>;
  boardsUsed: number;
  wasReset: boolean;
  resetBoards?: string[];
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
      boardsUsed: 0,
      wasReset: false,
      error: "Session not found",
    };
  }

  const activeCategoriesByBoard = await storage.getActiveCategoriesByBoard();
  
  if (activeCategoriesByBoard.size === 0) {
    return {
      categories: [],
      boardsUsed: 0,
      wasReset: false,
      error: "No active categories found. Please activate categories in the admin panel.",
    };
  }

  let boardIds = Array.from(activeCategoriesByBoard.keys());
  
  if (boardIds.length > 5) {
    boardIds = shuffleArray(boardIds).slice(0, 5);
  }

  let playedCategoryIds = (session.playedCategoryIds as number[]) || [];
  const resetBoards: string[] = [];
  const selectedCategories: Array<{
    category: Category;
    board: Board;
    questionCount: number;
  }> = [];

  for (const boardId of boardIds) {
    const boardData = activeCategoriesByBoard.get(boardId);
    if (!boardData) continue;

    const { board, categories } = boardData;
    let availableCategories = categories.filter(
      cat => !playedCategoryIds.includes(cat.id)
    );

    if (availableCategories.length === 0 && categories.length > 0) {
      const boardCategoryIds = categories.map(c => c.id);
      playedCategoryIds = playedCategoryIds.filter(id => !boardCategoryIds.includes(id));
      resetBoards.push(board.name);
      availableCategories = categories;
    }

    if (availableCategories.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCategories.length);
      const selectedCategory = availableCategories[randomIndex];
      
      const questionCount = await storage.getQuestionCountForCategory(selectedCategory.id);
      
      selectedCategories.push({
        category: selectedCategory,
        board,
        questionCount,
      });
      
      playedCategoryIds.push(selectedCategory.id);
    }
  }

  if (selectedCategories.length === 0) {
    return {
      categories: [],
      boardsUsed: 0,
      wasReset: false,
      error: "Could not select any categories. Make sure categories are active and have questions.",
    };
  }

  await storage.updateSessionPlayedCategories(sessionId, playedCategoryIds);

  return {
    categories: selectedCategories,
    boardsUsed: selectedCategories.length,
    wasReset: resetBoards.length > 0,
    resetBoards: resetBoards.length > 0 ? resetBoards : undefined,
    message: resetBoards.length > 0 
      ? `Categories reset for: ${resetBoards.join(", ")}` 
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
