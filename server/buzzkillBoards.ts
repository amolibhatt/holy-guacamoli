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
  mode: "system" | "meld" | "personal";
  userId: string;
  userRole: string;
}

export async function generateDynamicBoard(
  sessionId: number, 
  options: ShuffleOptions = { mode: "system", userId: "shuffle-host", userRole: "admin" }
): Promise<DynamicBoardResult> {
  const { mode, userId, userRole } = options;
  
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
  
  // Get boards to determine which categories are global vs personal
  // Use super_admin to get all boards for filtering
  const allBoards = await storage.getBoards("system", "super_admin");
  const globalBoardIds = allBoards.filter(b => b.isGlobal).map(b => b.id);
  const userBoardIds = allBoards.filter(b => b.userId === userId && !b.isGlobal).map(b => b.id);
  
  // Build sets of global and personal category IDs by checking each board's categories
  const globalCategoryIds = new Set<number>();
  const personalCategoryIds = new Set<number>();
  
  for (const board of allBoards) {
    const boardCats = await storage.getBoardCategories(board.id);
    for (const bc of boardCats) {
      if (globalBoardIds.includes(board.id)) {
        globalCategoryIds.add(bc.categoryId);
      }
      if (userBoardIds.includes(board.id)) {
        personalCategoryIds.add(bc.categoryId);
      }
    }
  }
  
  // Super admin can see all personal categories
  if (userRole === "super_admin") {
    const allPersonalBoardIds = allBoards.filter(b => !b.isGlobal && b.userId).map(b => b.id);
    for (const board of allBoards) {
      if (allPersonalBoardIds.includes(board.id)) {
        const boardCats = await storage.getBoardCategories(board.id);
        for (const bc of boardCats) {
          personalCategoryIds.add(bc.categoryId);
        }
      }
    }
  }
  
  // Filter to only active categories with questions based on mode
  const activeGroupedCategories = new Map<string, Category[]>();
  for (const group of SOURCE_GROUPS) {
    const groupCats = categoriesByGroup.get(group) || [];
    const activeCats: Category[] = [];
    for (const cat of groupCats) {
      if (!cat.isActive) continue;
      
      const questionCount = await storage.getQuestionCountForCategory(cat.id);
      if (questionCount === 0) continue;
      
      // Apply mode filter
      const isGlobal = globalCategoryIds.has(cat.id);
      const isPersonal = personalCategoryIds.has(cat.id);
      
      if (mode === "system" && isGlobal) {
        activeCats.push(cat);
      } else if (mode === "personal" && isPersonal) {
        activeCats.push(cat);
      } else if (mode === "meld" && (isGlobal || isPersonal)) {
        activeCats.push(cat);
      }
    }
    if (activeCats.length > 0) {
      activeGroupedCategories.set(group, activeCats);
    }
  }
  
  if (activeGroupedCategories.size === 0) {
    const modeDesc = mode === "system" ? "global" : mode === "personal" ? "personal" : "global or personal";
    return {
      categories: [],
      wasReset: false,
      error: `No active ${modeDesc} categories with questions found.`,
    };
  }

  let playedCategoryIds = (session.playedCategoryIds as number[]) || [];
  const selectedCategories: Category[] = [];

  // For meld mode, we want 3 global + 2 personal
  // For other modes, pick 1 from each group
  if (mode === "meld") {
    // Collect all available global and personal categories
    const globalCats: Category[] = [];
    const personalCats: Category[] = [];
    
    const groups = Array.from(activeGroupedCategories.values());
    for (const cats of groups) {
      for (const cat of cats) {
        if (!playedCategoryIds.includes(cat.id)) {
          if (globalCategoryIds.has(cat.id)) {
            globalCats.push(cat);
          } else if (personalCategoryIds.has(cat.id)) {
            personalCats.push(cat);
          }
        }
      }
    }
    
    // Dedupe categories first
    let uniqueGlobal = globalCats.filter((cat, idx, arr) => arr.findIndex(c => c.id === cat.id) === idx);
    let uniquePersonal = personalCats.filter((cat, idx, arr) => arr.findIndex(c => c.id === cat.id) === idx);
    
    // Reset if needed
    if (uniqueGlobal.length < 3 || uniquePersonal.length < 2) {
      playedCategoryIds = [];
      const allGlobal: Category[] = [];
      const allPersonal: Category[] = [];
      for (const cats of groups) {
        for (const cat of cats) {
          if (globalCategoryIds.has(cat.id)) {
            allGlobal.push(cat);
          } else if (personalCategoryIds.has(cat.id)) {
            allPersonal.push(cat);
          }
        }
      }
      uniqueGlobal = allGlobal.filter((cat, idx, arr) => arr.findIndex(c => c.id === cat.id) === idx);
      uniquePersonal = allPersonal.filter((cat, idx, arr) => arr.findIndex(c => c.id === cat.id) === idx);
    }
    
    // Validate we have enough categories after reset
    if (uniqueGlobal.length < 3 || uniquePersonal.length < 2) {
      return {
        categories: [],
        wasReset: false,
        error: `Meld mode requires at least 3 global categories (have ${uniqueGlobal.length}) and 2 personal categories (have ${uniquePersonal.length}).`,
      };
    }
    
    // Shuffle and pick
    const shuffleArray = <T>(arr: T[]): T[] => arr.sort(() => Math.random() - 0.5);
    const pickedGlobal = shuffleArray(uniqueGlobal).slice(0, 3);
    const pickedPersonal = shuffleArray(uniquePersonal).slice(0, 2);
    
    selectedCategories.push(...pickedGlobal, ...pickedPersonal);
    for (const cat of selectedCategories) {
      playedCategoryIds.push(cat.id);
    }
  } else {
    // Standard mode: pick 1 from each source group
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
