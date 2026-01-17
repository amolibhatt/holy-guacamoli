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

export type ShuffleMode = "starter" | "personal" | "meld";

export interface ShuffleOptions {
  mode: ShuffleMode;
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
  options: ShuffleOptions = { mode: "starter", userId: "shuffle-host", userRole: "admin" }
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

  // Get all boards to determine which categories are global vs personal
  const allBoards = await storage.getBoards("system", "super_admin");
  const globalBoardIds = allBoards.filter(b => b.isGlobal && !b.name.startsWith("Shuffle Play")).map(b => b.id);
  
  // For super admin, see all non-global boards; for others, only their own
  const personalBoardIds = userRole === "super_admin"
    ? allBoards.filter(b => !b.isGlobal && b.userId && !b.name.startsWith("Shuffle Play")).map(b => b.id)
    : allBoards.filter(b => b.userId === userId && !b.isGlobal && !b.name.startsWith("Shuffle Play")).map(b => b.id);
  
  // Collect Live categories based on mode
  const liveCategories: Category[] = [];
  const seenCategoryIds = new Set<number>();
  
  // Determine which pools to include based on mode
  const includeGlobal = mode === "starter" || mode === "meld";
  const includePersonal = mode === "personal" || mode === "meld";
  
  // Add global categories
  if (includeGlobal) {
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
  
  const modeDescriptions: Record<string, string> = {
    starter: "Starter Packs",
    personal: "My Categories",
    meld: "Meld (all sources)"
  };
  
  if (liveCategories.length < 5) {
    return {
      categories: [],
      wasReset: false,
      error: `Need at least 5 Live categories to shuffle. Found ${liveCategories.length} in ${modeDescriptions[mode]}. A category is Live when it has questions at 10, 20, 30, 40, and 50 points.`,
    };
  }

  let playedCategoryIds = (session.playedCategoryIds as number[]) || [];
  const shuffleArray = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
  
  // Group ALL live categories by source group (before filtering by played)
  const allBySourceGroup: Map<string, Category[]> = new Map();
  const allUngrouped: Category[] = [];
  
  for (const cat of liveCategories) {
    const group = cat.sourceGroup;
    if (group && SOURCE_GROUPS.includes(group as any)) {
      if (!allBySourceGroup.has(group)) {
        allBySourceGroup.set(group, []);
      }
      allBySourceGroup.get(group)!.push(cat);
    } else {
      allUngrouped.push(cat);
    }
  }
  
  // Select one category from each source group, resetting played per-group if exhausted
  const selectedCategories: Category[] = [];
  const resetGroups: string[] = [];
  let wasReset = false;
  
  for (const group of SOURCE_GROUPS) {
    const allGroupCats = allBySourceGroup.get(group) || [];
    if (allGroupCats.length === 0) continue;
    
    // Filter to unplayed categories in this group
    let availableInGroup = allGroupCats.filter(cat => !playedCategoryIds.includes(cat.id));
    
    // If group is exhausted, reset just this group's tracking
    if (availableInGroup.length === 0) {
      // Remove this group's categories from played list
      const groupCatIds = new Set(allGroupCats.map(c => c.id));
      playedCategoryIds = playedCategoryIds.filter(id => !groupCatIds.has(id));
      availableInGroup = allGroupCats;
      resetGroups.push(group);
    }
    
    // Pick one random category from this group
    const shuffled = shuffleArray(availableInGroup);
    selectedCategories.push(shuffled[0]);
    
    if (selectedCategories.length >= 5) break;
  }
  
  // If we don't have 5 yet (not enough source groups with categories), fill from ungrouped
  if (selectedCategories.length < 5) {
    const availableUngrouped = allUngrouped.filter(
      cat => !playedCategoryIds.includes(cat.id) && !selectedCategories.some(s => s.id === cat.id)
    );
    
    // Reset ungrouped if exhausted
    let ungroupedToUse = availableUngrouped;
    if (ungroupedToUse.length === 0 && allUngrouped.length > 0) {
      const ungroupedIds = new Set(allUngrouped.map(c => c.id));
      playedCategoryIds = playedCategoryIds.filter(id => !ungroupedIds.has(id));
      ungroupedToUse = allUngrouped.filter(cat => !selectedCategories.some(s => s.id === cat.id));
      wasReset = true;
    }
    
    const shuffledUngrouped = shuffleArray(ungroupedToUse);
    for (const cat of shuffledUngrouped) {
      if (selectedCategories.length >= 5) break;
      selectedCategories.push(cat);
    }
  }
  
  // If still not enough, pick more from groups that have extras
  if (selectedCategories.length < 5) {
    for (const group of SOURCE_GROUPS) {
      const allGroupCats = allBySourceGroup.get(group) || [];
      const availableInGroup = allGroupCats.filter(
        cat => !playedCategoryIds.includes(cat.id) && !selectedCategories.some(s => s.id === cat.id)
      );
      
      for (const cat of shuffleArray(availableInGroup)) {
        if (selectedCategories.length >= 5) break;
        selectedCategories.push(cat);
      }
      if (selectedCategories.length >= 5) break;
    }
  }
  
  wasReset = wasReset || resetGroups.length > 0;
  
  // Track played categories
  for (const cat of selectedCategories) {
    if (!playedCategoryIds.includes(cat.id)) {
      playedCategoryIds.push(cat.id);
    }
  }

  await storage.updateSessionPlayedCategories(sessionId, playedCategoryIds);

  return {
    categories: selectedCategories,
    wasReset,
    resetGroups: resetGroups.length > 0 ? resetGroups : undefined,
    message: wasReset 
      ? resetGroups.length > 0 
        ? `Groups ${resetGroups.join(', ')} reset - all categories played!` 
        : "Categories reset - starting fresh!"
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
