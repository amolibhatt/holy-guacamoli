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
  
  // Collect Live categories based on mode, tracking source (personal vs global)
  const liveCategories: Category[] = [];
  const seenCategoryIds = new Set<number>();
  const personalCategoryIds = new Set<number>(); // Track which categories came from personal boards
  
  // Determine which pools to include based on mode
  const includeGlobal = mode === "starter" || mode === "meld";
  const includePersonal = mode === "personal" || mode === "meld";
  
  // Add personal categories FIRST (they get priority in the algorithm)
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
          personalCategoryIds.add(bc.categoryId); // Mark as personal
        }
      }
    }
  }
  
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
          // NOT marked as personal - these are global
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
  
  // Separate PERSONAL categories (from personal boards) from GLOBAL categories (from global boards)
  // Personal categories are identified by personalCategoryIds set (based on board ownership)
  // Global categories are grouped by sourceGroup (A-E) for diverse selection
  const personalPool: Category[] = [];
  const globalPool: Category[] = [];
  const globalByGroup: Map<string, Category[]> = new Map();
  
  for (const cat of liveCategories) {
    if (personalCategoryIds.has(cat.id)) {
      // Category from a personal board - prioritized first
      personalPool.push(cat);
    } else {
      // Category from a global board - use sourceGroup for diversity
      globalPool.push(cat);
      const group = cat.sourceGroup || "ungrouped";
      if (!globalByGroup.has(group)) {
        globalByGroup.set(group, []);
      }
      globalByGroup.get(group)!.push(cat);
    }
  }
  
  // EXHAUSTION CHECK: Reset history if (total pool - played) < 5
  const availableCount = liveCategories.filter(c => !playedCategoryIds.includes(c.id)).length;
  let wasReset = false;
  
  if (availableCount < 5) {
    playedCategoryIds = [];
    wasReset = true;
  }
  
  const selectedCategories: Category[] = [];
  const selectedIds = new Set<number>();
  
  // STEP A: PERSONAL CONTENT FIRST
  // Select up to 5 unplayed categories from the user's personal pool
  const availablePersonal = shuffleArray(
    personalPool.filter(c => !playedCategoryIds.includes(c.id))
  );
  
  for (const cat of availablePersonal) {
    if (selectedCategories.length >= 5) break;
    selectedCategories.push(cat);
    selectedIds.add(cat.id);
  }
  
  // STEP B: GAP DETECTION
  const remainingSlots = 5 - selectedCategories.length;
  
  // STEP C: DIVERSE GLOBAL FILLING
  // If slots remain, pull from Global pool with diversity rule
  if (remainingSlots > 0) {
    const availableGlobalByGroup: Map<string, Category[]> = new Map();
    
    // Filter global categories to unplayed and not already selected
    const groupEntries = Array.from(globalByGroup.entries());
    for (const entry of groupEntries) {
      const [group, cats] = entry;
      const available = cats.filter(
        (c: Category) => !playedCategoryIds.includes(c.id) && !selectedIds.has(c.id)
      );
      if (available.length > 0) {
        availableGlobalByGroup.set(group, shuffleArray(available));
      }
    }
    
    // DIVERSITY RULE: Pick one from each theme group before repeating
    let pickedFromGroup = new Set<string>();
    
    // Round-robin through groups until we have 5 or exhaust all
    while (selectedCategories.length < 5 && availableGlobalByGroup.size > 0) {
      // Recompute available groups each iteration
      const currentGroups = Array.from(availableGlobalByGroup.keys());
      if (currentGroups.length === 0) break;
      
      let addedThisRound = false;
      
      for (const group of shuffleArray(currentGroups)) {
        if (selectedCategories.length >= 5) break;
        
        // Diversity rule: skip group if we've picked from it this cycle AND other groups exist
        const otherGroupsExist = currentGroups.some(g => g !== group && !pickedFromGroup.has(g));
        if (pickedFromGroup.has(group) && otherGroupsExist) {
          continue;
        }
        
        const groupCats = availableGlobalByGroup.get(group);
        if (groupCats && groupCats.length > 0) {
          const cat = groupCats.shift()!;
          selectedCategories.push(cat);
          selectedIds.add(cat.id);
          pickedFromGroup.add(group);
          addedThisRound = true;
          
          // Remove empty groups from the map
          if (groupCats.length === 0) {
            availableGlobalByGroup.delete(group);
          }
        }
      }
      
      // Reset cycle when all current groups have been picked from
      const allCurrentGroupsPicked = currentGroups.every(g => pickedFromGroup.has(g));
      if (allCurrentGroupsPicked) {
        pickedFromGroup = new Set<string>();
      }
      
      // Break if no categories were added (shouldn't happen, but safety check)
      if (!addedThisRound) break;
    }
  }
  
  // STEP D: OVERFLOW - handled by only selecting up to 5 in each step
  
  // Track all selected categories in PlayedHistory
  for (const cat of selectedCategories) {
    if (!playedCategoryIds.includes(cat.id)) {
      playedCategoryIds.push(cat.id);
    }
  }

  await storage.updateSessionPlayedCategories(sessionId, playedCategoryIds);

  return {
    categories: selectedCategories,
    wasReset,
    message: wasReset 
      ? "All categories played! Starting fresh."
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
  
  const questions = await storage.getQuestionsByCategory(categoryId);
  
  return {
    categoryId: category.id,
    categoryName: category.name,
    questions: questions.map((q: { id: number; question: string; options: string[]; correctAnswer: string; points: number }) => ({
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

// Wrapper for generating a mashed board (used by WebSocket handler)
export async function generateMashedBoard(sessionId: number): Promise<DynamicBoardResult> {
  return generateDynamicBoard(sessionId, { 
    mode: "meld", 
    userId: "system", 
    userRole: "super_admin" 
  });
}
