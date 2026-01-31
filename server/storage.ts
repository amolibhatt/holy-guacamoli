import { db } from "./db";
import { boards, categories, boardCategories, questions, games, gameBoards, headsUpDecks, headsUpCards, gameDecks, gameSessions, sessionPlayers, sessionCompletedQuestions, gameTypes, doubleDipPairs, doubleDipQuestions, doubleDipDailySets, doubleDipAnswers, doubleDipReactions, doubleDipMilestones, doubleDipFavorites, doubleDipWeeklyStakes, sequenceQuestions, psyopQuestions, type Board, type InsertBoard, type Category, type InsertCategory, type BoardCategory, type InsertBoardCategory, type Question, type InsertQuestion, type BoardCategoryWithCategory, type BoardCategoryWithCount, type BoardCategoryWithQuestions, type Game, type InsertGame, type GameBoard, type InsertGameBoard, type HeadsUpDeck, type InsertHeadsUpDeck, type HeadsUpCard, type InsertHeadsUpCard, type GameDeck, type InsertGameDeck, type HeadsUpDeckWithCardCount, type GameSession, type InsertGameSession, type SessionPlayer, type InsertSessionPlayer, type SessionCompletedQuestion, type InsertSessionCompletedQuestion, type GameSessionWithPlayers, type GameSessionWithDetails, type GameMode, type SessionState, type GameType, type InsertGameType, type DoubleDipPair, type InsertDoubleDipPair, type DoubleDipQuestion, type InsertDoubleDipQuestion, type DoubleDipDailySet, type InsertDoubleDipDailySet, type DoubleDipAnswer, type InsertDoubleDipAnswer, type DoubleDipReaction, type InsertDoubleDipReaction, type DoubleDipMilestone, type InsertDoubleDipMilestone, type DoubleDipFavorite, type InsertDoubleDipFavorite, type DoubleDipWeeklyStake, type InsertDoubleDipWeeklyStake, type SequenceQuestion, type InsertSequenceQuestion, type PsyopQuestion, type InsertPsyopQuestion } from "@shared/schema";
import { users } from "@shared/models/auth";
import { eq, and, asc, count, inArray, desc, sql, gte, like } from "drizzle-orm";

export interface IStorage {
  getBoards(userId: string, role?: string): Promise<Board[]>;
  getStarterPackBoards(): Promise<Board[]>;
  getBoard(id: number, userId: string, role?: string): Promise<Board | undefined>;
  createBoard(board: InsertBoard & { userId: string }): Promise<Board>;
  updateBoard(id: number, data: Partial<InsertBoard>, userId: string, role?: string): Promise<Board | undefined>;
  deleteBoard(id: number, userId: string, role?: string): Promise<boolean>;
  
  getCategories(): Promise<Category[]>;
  getCategoriesForUser(userId: string, role?: string): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  getBoardCategories(boardId: number): Promise<BoardCategoryWithCount[]>;
  getBoardCategory(id: number): Promise<BoardCategory | undefined>;
  getBoardCategoryByIds(boardId: number, categoryId: number): Promise<BoardCategory | undefined>;
  createBoardCategory(data: InsertBoardCategory): Promise<BoardCategory>;
  updateBoardCategoryPosition(id: number, position: number): Promise<BoardCategory | undefined>;
  deleteBoardCategory(id: number): Promise<boolean>;
  
  getQuestionsByCategory(categoryId: number): Promise<Question[]>;
  getQuestion(id: number): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: number, data: Partial<InsertQuestion>): Promise<Question | undefined>;
  deleteQuestion(id: number): Promise<boolean>;
  
  getBoardWithCategoriesAndQuestions(boardId: number, userId: string, role?: string): Promise<BoardCategoryWithQuestions[]>;
  getBoardSummaries(userId: string, role?: string): Promise<{ id: number; name: string; categoryCount: number; categories: { id: number; name: string; questionCount: number; remaining: number }[] }[]>;
  
  // Games
  getGames(userId: string, role?: string): Promise<Game[]>;
  getGame(id: number, userId: string, role?: string): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  updateGame(id: number, data: Partial<InsertGame>, userId: string, role?: string): Promise<Game | undefined>;
  deleteGame(id: number, userId: string, role?: string): Promise<boolean>;
  
  // Game Boards (junction)
  getGameBoards(gameId: number): Promise<(GameBoard & { board: Board })[]>;
  addBoardToGame(data: InsertGameBoard): Promise<GameBoard>;
  removeBoardFromGame(gameId: number, boardId: number): Promise<boolean>;
  updateGameBoardPosition(id: number, position: number): Promise<GameBoard | undefined>;
  
  // Heads Up Decks
  getHeadsUpDecks(userId: string, role?: string): Promise<HeadsUpDeckWithCardCount[]>;
  getHeadsUpDeck(id: number, userId: string, role?: string): Promise<HeadsUpDeck | undefined>;
  createHeadsUpDeck(deck: InsertHeadsUpDeck): Promise<HeadsUpDeck>;
  updateHeadsUpDeck(id: number, data: Partial<InsertHeadsUpDeck>, userId: string, role?: string): Promise<HeadsUpDeck | undefined>;
  deleteHeadsUpDeck(id: number, userId: string, role?: string): Promise<boolean>;
  
  // Heads Up Cards
  getHeadsUpCards(deckId: number): Promise<HeadsUpCard[]>;
  getHeadsUpCard(id: number): Promise<HeadsUpCard | undefined>;
  createHeadsUpCard(card: InsertHeadsUpCard): Promise<HeadsUpCard>;
  updateHeadsUpCard(id: number, data: Partial<InsertHeadsUpCard>): Promise<HeadsUpCard | undefined>;
  deleteHeadsUpCard(id: number): Promise<boolean>;
  
  // Game Decks (junction for heads up)
  getGameDecks(gameId: number): Promise<(GameDeck & { deck: HeadsUpDeck })[]>;
  addDeckToGame(data: InsertGameDeck): Promise<GameDeck>;
  removeDeckFromGame(gameId: number, deckId: number): Promise<boolean>;
  
  // Game Sessions
  createSession(data: InsertGameSession): Promise<GameSession>;
  getSession(id: number): Promise<GameSession | undefined>;
  getSessionByCode(code: string): Promise<GameSession | undefined>;
  getSessionWithPlayers(code: string): Promise<GameSessionWithPlayers | undefined>;
  getActiveSessionForHost(hostId: string): Promise<GameSession | undefined>;
  updateSession(id: number, data: Partial<InsertGameSession>): Promise<GameSession | undefined>;
  deleteSession(id: number): Promise<boolean>;
  getHostSessions(hostId: string): Promise<GameSessionWithPlayers[]>;
  getHostSessionsWithDetails(hostId: string): Promise<GameSessionWithDetails[]>;
  getHostAnalytics(hostId: string): Promise<{ totalSessions: number; totalPlayers: number; activeSessions: number }>;
  
  // Session Players
  addPlayerToSession(data: InsertSessionPlayer): Promise<SessionPlayer>;
  getSessionPlayers(sessionId: number): Promise<SessionPlayer[]>;
  getSessionPlayer(sessionId: number, playerId: string): Promise<SessionPlayer | undefined>;
  getSessionPlayerByName(sessionId: number, name: string): Promise<SessionPlayer | undefined>;
  updatePlayerScore(sessionId: number, playerId: string, scoreChange: number): Promise<SessionPlayer | undefined>;
  setPlayerScore(sessionId: number, playerId: string, score: number): Promise<SessionPlayer | undefined>;
  updatePlayerConnection(sessionId: number, playerId: string, isConnected: boolean): Promise<SessionPlayer | undefined>;
  removePlayerFromSession(sessionId: number, playerId: string): Promise<boolean>;
  
  // Session Completed Questions
  markQuestionCompleted(data: InsertSessionCompletedQuestion): Promise<SessionCompletedQuestion>;
  getCompletedQuestions(sessionId: number): Promise<number[]>;
  resetCompletedQuestions(sessionId: number): Promise<boolean>;
  
  // Smart Category Management
  getCategoriesBySourceGroup(): Promise<Map<string, Category[]>>;
  updateSessionPlayedCategories(sessionId: number, categoryIds: number[]): Promise<GameSession | undefined>;
  resetSessionPlayedCategories(sessionId: number): Promise<GameSession | undefined>;
  getActiveCategoriesByBoard(): Promise<Map<number, { board: Board; categories: Category[] }>>;
  getQuestionCountForCategory(categoryId: number): Promise<number>;
  getQuestionsForCategory(categoryId: number): Promise<{ points: number }[]>;
  getContentStats(): Promise<{ totalBoards: number; totalCategories: number; activeCategories: number; readyToPlay: number; totalQuestions: number }>;
  
  // Shuffle Board helpers
  getBoardByName(name: string): Promise<Board | undefined>;
  clearBoardCategories(boardId: number): Promise<void>;
  getBoardCategoriesByCategoryId(categoryId: number): Promise<BoardCategory[]>;
  getSessionByRoomCode(roomCode: string): Promise<GameSession | undefined>;
  getShuffleLiveCounts(userId: string, userRole: string): Promise<{ globalLiveCount: number; personalLiveCount: number }>;
  
  // Game Types
  getGameTypes(): Promise<GameType[]>;
  getEnabledGameTypes(forHost: boolean): Promise<GameType[]>;
  getGameType(id: number): Promise<GameType | undefined>;
  getGameTypeBySlug(slug: string): Promise<GameType | undefined>;
  updateGameType(id: number, data: Partial<InsertGameType>): Promise<GameType | undefined>;
  
  // Double Dip - Pairs
  getDoubleDipPair(id: number): Promise<DoubleDipPair | undefined>;
  getDoubleDipPairByInviteCode(code: string): Promise<DoubleDipPair | undefined>;
  getDoubleDipPairForUser(userId: string): Promise<DoubleDipPair | undefined>;
  createDoubleDipPair(data: InsertDoubleDipPair): Promise<DoubleDipPair>;
  updateDoubleDipPair(id: number, data: Partial<InsertDoubleDipPair>): Promise<DoubleDipPair | undefined>;
  
  // Double Dip - Questions
  getDoubleDipQuestions(category?: string): Promise<DoubleDipQuestion[]>;
  createDoubleDipQuestion(data: InsertDoubleDipQuestion): Promise<DoubleDipQuestion>;
  
  // Double Dip - Daily Sets
  getDoubleDipDailySet(pairId: number, dateKey: string): Promise<DoubleDipDailySet | undefined>;
  createDoubleDipDailySet(data: InsertDoubleDipDailySet): Promise<DoubleDipDailySet>;
  updateDoubleDipDailySet(id: number, data: Partial<InsertDoubleDipDailySet>): Promise<DoubleDipDailySet | undefined>;
  
  // Double Dip - Answers
  getDoubleDipAnswers(dailySetId: number): Promise<DoubleDipAnswer[]>;
  getDoubleDipAnswerById(id: number): Promise<DoubleDipAnswer | undefined>;
  createDoubleDipAnswer(data: InsertDoubleDipAnswer): Promise<DoubleDipAnswer>;
  
  // Double Dip - Reactions
  createDoubleDipReaction(data: InsertDoubleDipReaction): Promise<DoubleDipReaction>;
  getDoubleDipReactions(answerId: number): Promise<DoubleDipReaction[]>;
  
  // Double Dip - Milestones
  getDoubleDipMilestones(pairId: number): Promise<DoubleDipMilestone[]>;
  createDoubleDipMilestone(data: InsertDoubleDipMilestone): Promise<DoubleDipMilestone>;
  checkDoubleDipMilestoneExists(pairId: number, type: string, value: number): Promise<boolean>;
  
  // Double Dip - Favorites
  getDoubleDipFavorites(pairId: number): Promise<DoubleDipFavorite[]>;
  getDoubleDipFavorite(answerId: number, userId: string): Promise<DoubleDipFavorite | undefined>;
  createDoubleDipFavorite(data: InsertDoubleDipFavorite): Promise<DoubleDipFavorite>;
  deleteDoubleDipFavorite(answerId: number, userId: string): Promise<boolean>;
  
  // Double Dip - Get all daily sets for storyboard
  getDoubleDipDailySets(pairId: number): Promise<DoubleDipDailySet[]>;
  setDoubleDipFirstCompleterAtomic(dailySetId: number, userId: string): Promise<DoubleDipDailySet | undefined>;
  
  // Double Dip - Weekly Stakes
  getDoubleDipWeeklyStake(pairId: number, weekStartDate: string): Promise<DoubleDipWeeklyStake | undefined>;
  createDoubleDipWeeklyStake(data: InsertDoubleDipWeeklyStake): Promise<DoubleDipWeeklyStake>;
  updateDoubleDipWeeklyStake(id: number, data: Partial<InsertDoubleDipWeeklyStake>): Promise<DoubleDipWeeklyStake | undefined>;
  scoreDoubleDipDailyForWeeklyStake(dailySetId: number, weeklyStakeId: number, userAPoints: number, userBPoints: number): Promise<boolean>;
  
  // Sort Circuit
  getSequenceQuestions(userId: string, role?: string): Promise<SequenceQuestion[]>;
  createSequenceQuestion(data: InsertSequenceQuestion): Promise<SequenceQuestion>;
  deleteSequenceQuestion(id: number, userId: string, role?: string): Promise<boolean>;
  
  // PsyOp
  getPsyopQuestions(userId: string, role?: string): Promise<PsyopQuestion[]>;
  createPsyopQuestion(data: InsertPsyopQuestion): Promise<PsyopQuestion>;
  deletePsyopQuestion(id: number, userId: string, role?: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getBoards(userId: string, role?: string): Promise<Board[]> {
    if (role === 'super_admin') {
      return await db.select().from(boards);
    }
    return await db.select().from(boards).where(eq(boards.userId, userId));
  }

  async getStarterPackBoards(): Promise<Board[]> {
    return await db.select().from(boards).where(eq(boards.isStarterPack, true));
  }

  async getBoard(id: number, userId: string, role?: string): Promise<Board | undefined> {
    if (role === 'super_admin') {
      const [board] = await db.select().from(boards).where(eq(boards.id, id));
      return board;
    }
    const [board] = await db.select().from(boards).where(and(eq(boards.id, id), eq(boards.userId, userId)));
    return board;
  }

  async createBoard(board: InsertBoard & { userId: string }): Promise<Board> {
    const [newBoard] = await db.insert(boards).values(board as any).returning();
    return newBoard;
  }

  async updateBoard(id: number, data: Partial<InsertBoard>, userId: string, role?: string): Promise<Board | undefined> {
    const updateData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    if (Object.keys(updateData).length === 0) {
      return this.getBoard(id, userId, role);
    }
    if (role === 'super_admin') {
      const [updated] = await db.update(boards).set(updateData).where(eq(boards.id, id)).returning();
      return updated;
    }
    const [updated] = await db.update(boards).set(updateData).where(and(eq(boards.id, id), eq(boards.userId, userId))).returning();
    return updated;
  }

  async deleteBoard(id: number, userId: string, role?: string): Promise<boolean> {
    const board = await this.getBoard(id, userId, role);
    if (!board) return false;
    // Remove board-category links (questions belong to categories, not boards)
    await db.delete(boardCategories).where(eq(boardCategories.boardId, id));
    if (role === 'super_admin') {
      const result = await db.delete(boards).where(eq(boards.id, id)).returning();
      return result.length > 0;
    }
    const result = await db.delete(boards).where(and(eq(boards.id, id), eq(boards.userId, userId))).returning();
    return result.length > 0;
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  // Get categories that belong to boards owned by the user (or all for super_admin)
  async getCategoriesForUser(userId: string, role?: string): Promise<Category[]> {
    if (role === 'super_admin') {
      return await db.select().from(categories);
    }
    
    // Get all boards owned by the user
    const userBoards = await db.select({ id: boards.id }).from(boards).where(eq(boards.userId, userId));
    if (userBoards.length === 0) {
      return [];
    }
    
    // Get all category IDs linked to user's boards
    const boardIds = userBoards.map(b => b.id);
    const linkedCategories = await db
      .select({ categoryId: boardCategories.categoryId })
      .from(boardCategories)
      .where(inArray(boardCategories.boardId, boardIds));
    
    if (linkedCategories.length === 0) {
      return [];
    }
    
    const categoryIds = linkedCategories.map(lc => lc.categoryId);
    return await db.select().from(categories).where(inArray(categories.id, categoryIds));
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<boolean> {
    // Delete questions that belong to this category
    await db.delete(questions).where(eq(questions.categoryId, id));
    // Remove board-category links
    await db.delete(boardCategories).where(eq(boardCategories.categoryId, id));
    const result = await db.delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }

  async getBoardCategories(boardId: number): Promise<BoardCategoryWithCount[]> {
    const result = await db
      .select({
        id: boardCategories.id,
        boardId: boardCategories.boardId,
        categoryId: boardCategories.categoryId,
        position: boardCategories.position,
        category: categories,
      })
      .from(boardCategories)
      .innerJoin(categories, eq(boardCategories.categoryId, categories.id))
      .where(eq(boardCategories.boardId, boardId))
      .orderBy(asc(boardCategories.position));
    
    if (result.length === 0) return [];
    
    // Count questions by categoryId (questions now belong to categories directly)
    const categoryIds = result.map(r => r.categoryId);
    const counts = await db
      .select({ 
        categoryId: questions.categoryId, 
        count: count() 
      })
      .from(questions)
      .where(inArray(questions.categoryId, categoryIds))
      .groupBy(questions.categoryId);
    
    const countMap = new Map(counts.map(c => [c.categoryId, c.count]));
    
    return result.map(r => ({
      id: r.id,
      boardId: r.boardId,
      categoryId: r.categoryId,
      position: r.position,
      category: r.category,
      questionCount: countMap.get(r.categoryId) || 0,
    }));
  }

  async updateBoardCategoryPosition(id: number, position: number): Promise<BoardCategory | undefined> {
    const [updated] = await db.update(boardCategories)
      .set({ position })
      .where(eq(boardCategories.id, id))
      .returning();
    return updated;
  }

  async getBoardCategory(id: number): Promise<BoardCategory | undefined> {
    const [bc] = await db.select().from(boardCategories).where(eq(boardCategories.id, id));
    return bc;
  }

  async getBoardCategoryByIds(boardId: number, categoryId: number): Promise<BoardCategory | undefined> {
    const [bc] = await db.select().from(boardCategories)
      .where(and(eq(boardCategories.boardId, boardId), eq(boardCategories.categoryId, categoryId)));
    return bc;
  }

  async createBoardCategory(data: InsertBoardCategory): Promise<BoardCategory> {
    const currentCount = await db.select({ count: count() })
      .from(boardCategories)
      .where(eq(boardCategories.boardId, data.boardId));
    const position = currentCount[0]?.count ?? 0;
    const [newBc] = await db.insert(boardCategories).values({ ...data, position }).returning();
    return newBc;
  }

  async deleteBoardCategory(id: number): Promise<boolean> {
    // Just remove the link, questions belong to categories not board-categories
    const result = await db.delete(boardCategories).where(eq(boardCategories.id, id)).returning();
    return result.length > 0;
  }

  async getQuestionsByCategory(categoryId: number): Promise<Question[]> {
    return await db.select().from(questions)
      .where(eq(questions.categoryId, categoryId))
      .orderBy(asc(questions.points));
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [newQuestion] = await db.insert(questions).values(question as any).returning();
    return newQuestion;
  }

  async updateQuestion(id: number, data: Partial<InsertQuestion>): Promise<Question | undefined> {
    const [updated] = await db.update(questions).set(data as any).where(eq(questions.id, id)).returning();
    return updated;
  }

  async deleteQuestion(id: number): Promise<boolean> {
    const result = await db.delete(questions).where(eq(questions.id, id)).returning();
    return result.length > 0;
  }

  async getBoardWithCategoriesAndQuestions(boardId: number, userId: string, role?: string): Promise<BoardCategoryWithQuestions[]> {
    const board = await this.getBoard(boardId, userId, role);
    if (!board) return [];
    
    const bcs = await this.getBoardCategories(boardId);
    const result: BoardCategoryWithQuestions[] = [];
    
    for (const bc of bcs) {
      const qs = await this.getQuestionsByCategory(bc.categoryId);
      result.push({
        ...bc,
        questions: qs,
      });
    }
    
    return result;
  }

  async getBoardSummaries(userId: string, role?: string): Promise<{ id: number; name: string; categoryCount: number; categories: { id: number; name: string; questionCount: number; remaining: number }[] }[]> {
    const allBoards = await this.getBoards(userId, role);
    const summaries = [];
    
    for (const board of allBoards) {
      const bcs = await this.getBoardCategories(board.id);
      summaries.push({
        id: board.id,
        name: board.name,
        categoryCount: bcs.length,
        categories: bcs.map(bc => ({
          id: bc.category.id,
          name: bc.category.name,
          questionCount: bc.questionCount,
          remaining: 5 - bc.questionCount,
        })),
      });
    }
    
    return summaries;
  }

  // === GAMES ===
  async getGames(userId: string, role?: string): Promise<Game[]> {
    if (role === 'super_admin') {
      return await db.select().from(games).orderBy(asc(games.createdAt));
    }
    return await db.select().from(games).where(eq(games.userId, userId)).orderBy(asc(games.createdAt));
  }

  async getGame(id: number, userId: string, role?: string): Promise<Game | undefined> {
    if (role === 'super_admin') {
      const [game] = await db.select().from(games).where(eq(games.id, id));
      return game;
    }
    const [game] = await db.select().from(games).where(and(eq(games.id, id), eq(games.userId, userId)));
    return game;
  }

  async createGame(game: InsertGame): Promise<Game> {
    const [newGame] = await db.insert(games).values(game as any).returning();
    return newGame;
  }

  async updateGame(id: number, data: Partial<InsertGame>, userId: string, role?: string): Promise<Game | undefined> {
    const updateData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    if (Object.keys(updateData).length === 0) {
      return this.getGame(id, userId, role);
    }
    if (role === 'super_admin') {
      const [updated] = await db.update(games).set(updateData).where(eq(games.id, id)).returning();
      return updated;
    }
    const [updated] = await db.update(games).set(updateData).where(and(eq(games.id, id), eq(games.userId, userId))).returning();
    return updated;
  }

  async deleteGame(id: number, userId: string, role?: string): Promise<boolean> {
    const game = await this.getGame(id, userId, role);
    if (!game) return false;
    await db.delete(gameBoards).where(eq(gameBoards.gameId, id));
    await db.delete(gameDecks).where(eq(gameDecks.gameId, id));
    if (role === 'super_admin') {
      const result = await db.delete(games).where(eq(games.id, id)).returning();
      return result.length > 0;
    }
    const result = await db.delete(games).where(and(eq(games.id, id), eq(games.userId, userId))).returning();
    return result.length > 0;
  }

  // === GAME BOARDS ===
  async getGameBoards(gameId: number): Promise<(GameBoard & { board: Board })[]> {
    const result = await db
      .select({
        id: gameBoards.id,
        gameId: gameBoards.gameId,
        boardId: gameBoards.boardId,
        position: gameBoards.position,
        board: boards,
      })
      .from(gameBoards)
      .innerJoin(boards, eq(gameBoards.boardId, boards.id))
      .where(eq(gameBoards.gameId, gameId))
      .orderBy(asc(gameBoards.position));
    return result.map(r => ({
      id: r.id,
      gameId: r.gameId,
      boardId: r.boardId,
      position: r.position,
      board: r.board,
    }));
  }

  async addBoardToGame(data: InsertGameBoard): Promise<GameBoard> {
    const currentCount = await db.select({ count: count() })
      .from(gameBoards)
      .where(eq(gameBoards.gameId, data.gameId));
    const position = data.position ?? (currentCount[0]?.count ?? 0);
    const [newGb] = await db.insert(gameBoards).values({ ...data, position }).returning();
    return newGb;
  }

  async removeBoardFromGame(gameId: number, boardId: number): Promise<boolean> {
    const result = await db.delete(gameBoards)
      .where(and(eq(gameBoards.gameId, gameId), eq(gameBoards.boardId, boardId)))
      .returning();
    return result.length > 0;
  }

  async updateGameBoardPosition(id: number, position: number): Promise<GameBoard | undefined> {
    const [updated] = await db.update(gameBoards)
      .set({ position })
      .where(eq(gameBoards.id, id))
      .returning();
    return updated;
  }

  // === HEADS UP DECKS ===
  async getHeadsUpDecks(userId: string, role?: string): Promise<HeadsUpDeckWithCardCount[]> {
    let decksQuery;
    if (role === 'super_admin') {
      decksQuery = await db.select().from(headsUpDecks);
    } else {
      decksQuery = await db.select().from(headsUpDecks).where(eq(headsUpDecks.userId, userId));
    }
    
    if (decksQuery.length === 0) return [];
    
    const deckIds = decksQuery.map(d => d.id);
    const counts = await db
      .select({
        deckId: headsUpCards.deckId,
        count: count(),
      })
      .from(headsUpCards)
      .where(inArray(headsUpCards.deckId, deckIds))
      .groupBy(headsUpCards.deckId);
    
    const countMap = new Map(counts.map(c => [c.deckId, c.count]));
    
    return decksQuery.map(d => ({
      ...d,
      cardCount: countMap.get(d.id) || 0,
    }));
  }

  async getHeadsUpDeck(id: number, userId: string, role?: string): Promise<HeadsUpDeck | undefined> {
    if (role === 'super_admin') {
      const [deck] = await db.select().from(headsUpDecks).where(eq(headsUpDecks.id, id));
      return deck;
    }
    const [deck] = await db.select().from(headsUpDecks).where(and(eq(headsUpDecks.id, id), eq(headsUpDecks.userId, userId)));
    return deck;
  }

  async createHeadsUpDeck(deck: InsertHeadsUpDeck): Promise<HeadsUpDeck> {
    const [newDeck] = await db.insert(headsUpDecks).values(deck as any).returning();
    return newDeck;
  }

  async updateHeadsUpDeck(id: number, data: Partial<InsertHeadsUpDeck>, userId: string, role?: string): Promise<HeadsUpDeck | undefined> {
    const updateData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    if (Object.keys(updateData).length === 0) {
      return this.getHeadsUpDeck(id, userId, role);
    }
    if (role === 'super_admin') {
      const [updated] = await db.update(headsUpDecks).set(updateData).where(eq(headsUpDecks.id, id)).returning();
      return updated;
    }
    const [updated] = await db.update(headsUpDecks).set(updateData).where(and(eq(headsUpDecks.id, id), eq(headsUpDecks.userId, userId))).returning();
    return updated;
  }

  async deleteHeadsUpDeck(id: number, userId: string, role?: string): Promise<boolean> {
    const deck = await this.getHeadsUpDeck(id, userId, role);
    if (!deck) return false;
    await db.delete(headsUpCards).where(eq(headsUpCards.deckId, id));
    await db.delete(gameDecks).where(eq(gameDecks.deckId, id));
    if (role === 'super_admin') {
      const result = await db.delete(headsUpDecks).where(eq(headsUpDecks.id, id)).returning();
      return result.length > 0;
    }
    const result = await db.delete(headsUpDecks).where(and(eq(headsUpDecks.id, id), eq(headsUpDecks.userId, userId))).returning();
    return result.length > 0;
  }

  // === HEADS UP CARDS ===
  async getHeadsUpCards(deckId: number): Promise<HeadsUpCard[]> {
    return await db.select().from(headsUpCards).where(eq(headsUpCards.deckId, deckId));
  }

  async getHeadsUpCard(id: number): Promise<HeadsUpCard | undefined> {
    const [card] = await db.select().from(headsUpCards).where(eq(headsUpCards.id, id));
    return card;
  }

  async createHeadsUpCard(card: InsertHeadsUpCard): Promise<HeadsUpCard> {
    const [newCard] = await db.insert(headsUpCards).values(card as any).returning();
    return newCard;
  }

  async updateHeadsUpCard(id: number, data: Partial<InsertHeadsUpCard>): Promise<HeadsUpCard | undefined> {
    const [updated] = await db.update(headsUpCards).set(data as any).where(eq(headsUpCards.id, id)).returning();
    return updated;
  }

  async deleteHeadsUpCard(id: number): Promise<boolean> {
    const result = await db.delete(headsUpCards).where(eq(headsUpCards.id, id)).returning();
    return result.length > 0;
  }

  // === GAME DECKS ===
  async getGameDecks(gameId: number): Promise<(GameDeck & { deck: HeadsUpDeck })[]> {
    const result = await db
      .select({
        id: gameDecks.id,
        gameId: gameDecks.gameId,
        deckId: gameDecks.deckId,
        position: gameDecks.position,
        deck: headsUpDecks,
      })
      .from(gameDecks)
      .innerJoin(headsUpDecks, eq(gameDecks.deckId, headsUpDecks.id))
      .where(eq(gameDecks.gameId, gameId))
      .orderBy(asc(gameDecks.position));
    return result.map(r => ({
      id: r.id,
      gameId: r.gameId,
      deckId: r.deckId,
      position: r.position,
      deck: r.deck,
    }));
  }

  async addDeckToGame(data: InsertGameDeck): Promise<GameDeck> {
    const currentCount = await db.select({ count: count() })
      .from(gameDecks)
      .where(eq(gameDecks.gameId, data.gameId));
    const position = data.position ?? (currentCount[0]?.count ?? 0);
    const [newGd] = await db.insert(gameDecks).values({ ...data, position }).returning();
    return newGd;
  }

  async removeDeckFromGame(gameId: number, deckId: number): Promise<boolean> {
    const result = await db.delete(gameDecks)
      .where(and(eq(gameDecks.gameId, gameId), eq(gameDecks.deckId, deckId)))
      .returning();
    return result.length > 0;
  }

  // === GAME SESSIONS ===
  async createSession(data: InsertGameSession): Promise<GameSession> {
    const [newSession] = await db.insert(gameSessions).values(data as any).returning();
    return newSession;
  }

  async getSession(id: number): Promise<GameSession | undefined> {
    const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, id));
    return session;
  }

  async getSessionByCode(code: string): Promise<GameSession | undefined> {
    const [session] = await db.select().from(gameSessions).where(eq(gameSessions.code, code.toUpperCase()));
    return session;
  }

  async getSessionWithPlayers(code: string): Promise<GameSessionWithPlayers | undefined> {
    const session = await this.getSessionByCode(code);
    if (!session) return undefined;
    const players = await this.getSessionPlayers(session.id);
    return { ...session, players };
  }

  async getActiveSessionForHost(hostId: string): Promise<GameSession | undefined> {
    const [session] = await db.select()
      .from(gameSessions)
      .where(and(
        eq(gameSessions.hostId, hostId),
        inArray(gameSessions.state, ['waiting', 'active', 'paused'])
      ))
      .orderBy(desc(gameSessions.createdAt))
      .limit(1);
    return session;
  }

  async updateSession(id: number, data: Partial<InsertGameSession>): Promise<GameSession | undefined> {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    const [updated] = await db.update(gameSessions).set(updateData).where(eq(gameSessions.id, id)).returning();
    return updated;
  }

  async deleteSession(id: number): Promise<boolean> {
    await db.delete(sessionCompletedQuestions).where(eq(sessionCompletedQuestions.sessionId, id));
    await db.delete(sessionPlayers).where(eq(sessionPlayers.sessionId, id));
    const result = await db.delete(gameSessions).where(eq(gameSessions.id, id)).returning();
    return result.length > 0;
  }

  async getHostSessions(hostId: string): Promise<GameSessionWithPlayers[]> {
    const sessions = await db.select().from(gameSessions)
      .where(eq(gameSessions.hostId, hostId))
      .orderBy(desc(gameSessions.createdAt));
    
    const result: GameSessionWithPlayers[] = [];
    for (const session of sessions) {
      const players = await this.getSessionPlayers(session.id);
      result.push({ ...session, players });
    }
    return result;
  }

  async getHostSessionsWithDetails(hostId: string): Promise<GameSessionWithDetails[]> {
    const sessions = await db.select().from(gameSessions)
      .where(eq(gameSessions.hostId, hostId))
      .orderBy(desc(gameSessions.createdAt))
      .limit(100);
    
    const result: GameSessionWithDetails[] = [];
    for (const session of sessions) {
      const players = await this.getSessionPlayers(session.id);
      
      let boardName: string | undefined;
      
      // Try currentBoardId first
      if (session.currentBoardId) {
        const board = await db.select().from(boards).where(eq(boards.id, session.currentBoardId)).limit(1);
        boardName = board[0]?.name;
      }
      
      // Try to get board from gameId via gameBoards junction table
      if (!boardName && session.gameId) {
        const gameBoardRows = await db.select({ boardId: gameBoards.boardId })
          .from(gameBoards)
          .where(eq(gameBoards.gameId, session.gameId))
          .limit(1);
        if (gameBoardRows[0]?.boardId) {
          const board = await db.select().from(boards).where(eq(boards.id, gameBoardRows[0].boardId)).limit(1);
          boardName = board[0]?.name;
        }
      }
      
      // Get played categories
      let playedCategories: { id: number; name: string }[] = [];
      const categoryIds = session.playedCategoryIds || [];
      if (categoryIds.length > 0) {
        const cats = await db.select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(inArray(categories.id, categoryIds));
        playedCategories = cats;
        
        // If no board name yet, try to find board from played categories
        if (!boardName && categoryIds.length > 0) {
          const boardCat = await db.select({ boardId: boardCategories.boardId })
            .from(boardCategories)
            .where(inArray(boardCategories.categoryId, categoryIds))
            .limit(1);
          if (boardCat[0]?.boardId) {
            const board = await db.select().from(boards).where(eq(boards.id, boardCat[0].boardId)).limit(1);
            boardName = board[0]?.name;
          }
        }
      }
      
      // Last resort: use game mode as indicator
      if (!boardName && session.currentMode) {
        boardName = session.currentMode === "sequence" ? "Sort Circuit" : session.currentMode;
      }
      
      result.push({ 
        ...session, 
        players,
        boardName,
        playedCategories
      });
    }
    return result;
  }

  async getHostAnalytics(hostId: string): Promise<{ totalSessions: number; totalPlayers: number; activeSessions: number }> {
    const allSessions = await db.select().from(gameSessions)
      .where(eq(gameSessions.hostId, hostId));
    
    const activeSessions = allSessions.filter(s => s.state !== 'ended').length;
    
    let totalPlayers = 0;
    for (const session of allSessions) {
      const players = await db.select({ count: sql<number>`count(*)` })
        .from(sessionPlayers)
        .where(eq(sessionPlayers.sessionId, session.id));
      totalPlayers += Number(players[0]?.count || 0);
    }
    
    return {
      totalSessions: allSessions.length,
      totalPlayers,
      activeSessions
    };
  }

  // === SESSION PLAYERS ===
  async addPlayerToSession(data: InsertSessionPlayer): Promise<SessionPlayer> {
    const existing = await this.getSessionPlayer(data.sessionId, data.playerId);
    if (existing) {
      const [updated] = await db.update(sessionPlayers)
        .set({ 
          isConnected: true, 
          lastSeenAt: new Date(),
          avatar: data.avatar || existing.avatar,
        })
        .where(and(eq(sessionPlayers.sessionId, data.sessionId), eq(sessionPlayers.playerId, data.playerId)))
        .returning();
      return updated;
    }
    
    const existingByName = await this.getSessionPlayerByName(data.sessionId, data.name);
    if (existingByName) {
      const [updated] = await db.update(sessionPlayers)
        .set({ 
          playerId: data.playerId,
          isConnected: true, 
          lastSeenAt: new Date(),
          avatar: data.avatar || existingByName.avatar,
        })
        .where(and(eq(sessionPlayers.sessionId, data.sessionId), eq(sessionPlayers.name, data.name)))
        .returning();
      return updated;
    }
    
    const [newPlayer] = await db.insert(sessionPlayers).values(data as any).returning();
    return newPlayer;
  }

  async getSessionPlayers(sessionId: number): Promise<SessionPlayer[]> {
    return await db.select().from(sessionPlayers)
      .where(eq(sessionPlayers.sessionId, sessionId))
      .orderBy(desc(sessionPlayers.score), asc(sessionPlayers.joinedAt));
  }

  async getSessionPlayer(sessionId: number, playerId: string): Promise<SessionPlayer | undefined> {
    const [player] = await db.select().from(sessionPlayers)
      .where(and(eq(sessionPlayers.sessionId, sessionId), eq(sessionPlayers.playerId, playerId)));
    return player;
  }

  async getSessionPlayerByName(sessionId: number, name: string): Promise<SessionPlayer | undefined> {
    const [player] = await db.select().from(sessionPlayers)
      .where(and(eq(sessionPlayers.sessionId, sessionId), eq(sessionPlayers.name, name)));
    return player;
  }

  async updatePlayerScore(sessionId: number, playerId: string, scoreChange: number): Promise<SessionPlayer | undefined> {
    const player = await this.getSessionPlayer(sessionId, playerId);
    if (!player) return undefined;
    const newScore = player.score + scoreChange;
    return this.setPlayerScore(sessionId, playerId, newScore);
  }

  async setPlayerScore(sessionId: number, playerId: string, score: number): Promise<SessionPlayer | undefined> {
    const [updated] = await db.update(sessionPlayers)
      .set({ score, lastSeenAt: new Date() })
      .where(and(eq(sessionPlayers.sessionId, sessionId), eq(sessionPlayers.playerId, playerId)))
      .returning();
    return updated;
  }

  async updatePlayerConnection(sessionId: number, playerId: string, isConnected: boolean): Promise<SessionPlayer | undefined> {
    const [updated] = await db.update(sessionPlayers)
      .set({ isConnected, lastSeenAt: new Date() })
      .where(and(eq(sessionPlayers.sessionId, sessionId), eq(sessionPlayers.playerId, playerId)))
      .returning();
    return updated;
  }

  async removePlayerFromSession(sessionId: number, playerId: string): Promise<boolean> {
    const result = await db.delete(sessionPlayers)
      .where(and(eq(sessionPlayers.sessionId, sessionId), eq(sessionPlayers.playerId, playerId)))
      .returning();
    return result.length > 0;
  }

  // === SESSION COMPLETED QUESTIONS ===
  async markQuestionCompleted(data: InsertSessionCompletedQuestion): Promise<SessionCompletedQuestion> {
    const [newCompleted] = await db.insert(sessionCompletedQuestions)
      .values(data as any)
      .onConflictDoNothing()
      .returning();
    if (!newCompleted) {
      const [existing] = await db.select().from(sessionCompletedQuestions)
        .where(and(
          eq(sessionCompletedQuestions.sessionId, data.sessionId),
          eq(sessionCompletedQuestions.questionId, data.questionId)
        ));
      return existing;
    }
    return newCompleted;
  }

  async getCompletedQuestions(sessionId: number): Promise<number[]> {
    const results = await db.select({ questionId: sessionCompletedQuestions.questionId })
      .from(sessionCompletedQuestions)
      .where(eq(sessionCompletedQuestions.sessionId, sessionId));
    return results.map(r => r.questionId);
  }

  async resetCompletedQuestions(sessionId: number): Promise<boolean> {
    await db.delete(sessionCompletedQuestions).where(eq(sessionCompletedQuestions.sessionId, sessionId));
    return true;
  }

  // === SMART CATEGORY MANAGEMENT ===
  async getCategoriesBySourceGroup(): Promise<Map<string, Category[]>> {
    const allCategories = await db.select().from(categories);
    const grouped = new Map<string, Category[]>();
    
    for (const cat of allCategories) {
      const group = cat.sourceGroup || 'unassigned';
      if (!grouped.has(group)) {
        grouped.set(group, []);
      }
      grouped.get(group)!.push(cat);
    }
    
    return grouped;
  }

  async updateSessionPlayedCategories(sessionId: number, categoryIds: number[]): Promise<GameSession | undefined> {
    const [updated] = await db.update(gameSessions)
      .set({ playedCategoryIds: categoryIds })
      .where(eq(gameSessions.id, sessionId))
      .returning();
    return updated;
  }

  async resetSessionPlayedCategories(sessionId: number): Promise<GameSession | undefined> {
    const [updated] = await db.update(gameSessions)
      .set({ playedCategoryIds: [] })
      .where(eq(gameSessions.id, sessionId))
      .returning();
    return updated;
  }

  async getActiveCategoriesByBoard(): Promise<Map<number, { board: Board; categories: Category[] }>> {
    const activeCategories = await db.select()
      .from(categories)
      .where(eq(categories.isActive, true));
    
    const result = new Map<number, { board: Board; categories: Category[] }>();
    
    for (const category of activeCategories) {
      const boardCats = await db.select()
        .from(boardCategories)
        .where(eq(boardCategories.categoryId, category.id));
      
      for (const bc of boardCats) {
        const [board] = await db.select().from(boards).where(eq(boards.id, bc.boardId));
        if (board) {
          if (!result.has(board.id)) {
            result.set(board.id, { board, categories: [] });
          }
          result.get(board.id)!.categories.push(category);
        }
      }
    }
    
    return result;
  }

  async getQuestionCountForCategory(categoryId: number): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(questions)
      .where(eq(questions.categoryId, categoryId));
    
    return result?.count ?? 0;
  }

  async getQuestionsForCategory(categoryId: number): Promise<{ points: number }[]> {
    return await db.select({ points: questions.points })
      .from(questions)
      .where(eq(questions.categoryId, categoryId));
  }

  async getContentStats(): Promise<{ totalBoards: number; totalCategories: number; activeCategories: number; readyToPlay: number; totalQuestions: number }> {
    const [boardCount] = await db.select({ count: count() }).from(boards);
    const [categoryCount] = await db.select({ count: count() }).from(categories);
    const [questionCount] = await db.select({ count: count() }).from(questions);
    const [activeCategoryCount] = await db.select({ count: count() })
      .from(categories)
      .where(eq(categories.isActive, true));
    
    const activeCategories = await db.select()
      .from(categories)
      .where(eq(categories.isActive, true));
    
    let readyCount = 0;
    for (const cat of activeCategories) {
      const qCount = await this.getQuestionCountForCategory(cat.id);
      if (qCount >= 5) {
        readyCount++;
      }
    }
    
    return {
      totalBoards: boardCount?.count ?? 0,
      totalCategories: categoryCount?.count ?? 0,
      activeCategories: activeCategoryCount?.count ?? 0,
      readyToPlay: readyCount,
      totalQuestions: questionCount?.count ?? 0,
    };
  }

  async getBoardByName(name: string): Promise<Board | undefined> {
    const [board] = await db.select().from(boards).where(eq(boards.name, name));
    return board;
  }

  async clearBoardCategories(boardId: number): Promise<void> {
    // Just remove the links, questions belong to categories not board-categories
    await db.delete(boardCategories).where(eq(boardCategories.boardId, boardId));
  }

  async getBoardCategoriesByCategoryId(categoryId: number): Promise<BoardCategory[]> {
    return await db.select().from(boardCategories).where(eq(boardCategories.categoryId, categoryId));
  }

  async getSessionByRoomCode(roomCode: string): Promise<GameSession | undefined> {
    const [session] = await db.select().from(gameSessions).where(eq(gameSessions.code, roomCode));
    return session;
  }
  
  async getShuffleLiveCounts(userId: string, userRole: string): Promise<{ globalLiveCount: number; personalLiveCount: number }> {
    // A Live category has questions at all 5 point tiers (10, 20, 30, 40, 50)
    // Uses GROUP BY to efficiently count distinct point tiers per category
    
    // Count Live categories in global boards (all admins can see global)
    const globalLiveResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM (
        SELECT bc.category_id
        FROM board_categories bc
        JOIN boards b ON bc.board_id = b.id
        JOIN categories c ON bc.category_id = c.id
        JOIN questions q ON q.board_category_id = bc.id
        WHERE b.is_global = true
          AND c.is_active = true
          AND b.name NOT LIKE 'Shuffle Play%'
          AND q.points IN (10, 20, 30, 40, 50)
        GROUP BY bc.category_id
        HAVING COUNT(DISTINCT q.points) = 5
      ) live_cats
    `);
    const globalLiveCount = parseInt(String(globalLiveResult.rows[0]?.count ?? 0), 10);
    
    // Count Live categories in personal boards (user's own only, unless super_admin)
    const personalLiveResult = userRole === "super_admin"
      ? await db.execute(sql`
          SELECT COUNT(*) as count
          FROM (
            SELECT bc.category_id
            FROM board_categories bc
            JOIN boards b ON bc.board_id = b.id
            JOIN categories c ON bc.category_id = c.id
            JOIN questions q ON q.board_category_id = bc.id
            WHERE b.is_global = false
              AND b.user_id IS NOT NULL
              AND c.is_active = true
              AND b.name NOT LIKE 'Shuffle Play%'
              AND q.points IN (10, 20, 30, 40, 50)
            GROUP BY bc.category_id
            HAVING COUNT(DISTINCT q.points) = 5
          ) live_cats
        `)
      : await db.execute(sql`
          SELECT COUNT(*) as count
          FROM (
            SELECT bc.category_id
            FROM board_categories bc
            JOIN boards b ON bc.board_id = b.id
            JOIN categories c ON bc.category_id = c.id
            JOIN questions q ON q.board_category_id = bc.id
            WHERE b.is_global = false
              AND b.user_id = ${userId}
              AND c.is_active = true
              AND b.name NOT LIKE 'Shuffle Play%'
              AND q.points IN (10, 20, 30, 40, 50)
            GROUP BY bc.category_id
            HAVING COUNT(DISTINCT q.points) = 5
          ) live_cats
        `);
    const personalLiveCount = parseInt(String(personalLiveResult.rows[0]?.count ?? 0), 10);
    
    return { globalLiveCount, personalLiveCount };
  }

  // === SUPER ADMIN METHODS ===
  async getPlatformStats() {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [boardCount] = await db.select({ count: count() }).from(boards);
    const [questionCount] = await db.select({ count: count() }).from(questions);
    const [sessionCount] = await db.select({ count: count() }).from(gameSessions);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todaySessionCount] = await db.select({ count: count() })
      .from(gameSessions)
      .where(gte(gameSessions.createdAt, today));
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const [newUserCount] = await db.select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, oneWeekAgo));

    return {
      totalUsers: userCount?.count ?? 0,
      totalBoards: boardCount?.count ?? 0,
      totalQuestions: questionCount?.count ?? 0,
      totalGamesPlayed: sessionCount?.count ?? 0,
      activeSessionsToday: todaySessionCount?.count ?? 0,
      newUsersThisWeek: newUserCount?.count ?? 0,
    };
  }

  async getAllUsersWithStats() {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    
    const usersWithStats = await Promise.all(allUsers.map(async (user) => {
      const [boardCount] = await db.select({ count: count() })
        .from(boards)
        .where(eq(boards.userId, user.id));
      
      const userBoards = await db.select({ id: boards.id }).from(boards).where(eq(boards.userId, user.id));
      const boardIds = userBoards.map(b => b.id);
      
      let questionCount = 0;
      if (boardIds.length > 0) {
        const boardCats = await db.select({ categoryId: boardCategories.categoryId })
          .from(boardCategories)
          .where(inArray(boardCategories.boardId, boardIds));
        const categoryIds = Array.from(new Set(boardCats.map(bc => bc.categoryId)));
        if (categoryIds.length > 0) {
          const [qCount] = await db.select({ count: count() })
            .from(questions)
            .where(inArray(questions.categoryId, categoryIds));
          questionCount = qCount?.count ?? 0;
        }
      }

      const { password, ...safeUser } = user;
      return {
        ...safeUser,
        boardCount: boardCount?.count ?? 0,
        questionCount,
      };
    }));

    return usersWithStats;
  }

  async deleteUserAndContent(userId: string) {
    // Delete all sessions hosted by this user (and their related data)
    const userSessions = await db.select({ id: gameSessions.id }).from(gameSessions).where(eq(gameSessions.hostId, userId));
    for (const session of userSessions) {
      await db.delete(sessionCompletedQuestions).where(eq(sessionCompletedQuestions.sessionId, session.id));
      await db.delete(sessionPlayers).where(eq(sessionPlayers.sessionId, session.id));
    }
    await db.delete(gameSessions).where(eq(gameSessions.hostId, userId));
    
    // Delete all boards owned by this user
    const userBoards = await db.select({ id: boards.id }).from(boards).where(eq(boards.userId, userId));
    for (const board of userBoards) {
      await this.deleteBoardFully(board.id);
    }
    
    // Delete heads up decks and their cards
    const userDecks = await db.select({ id: headsUpDecks.id }).from(headsUpDecks).where(eq(headsUpDecks.userId, userId));
    for (const deck of userDecks) {
      await db.delete(headsUpCards).where(eq(headsUpCards.deckId, deck.id));
      await db.delete(gameDecks).where(eq(gameDecks.deckId, deck.id));
    }
    await db.delete(headsUpDecks).where(eq(headsUpDecks.userId, userId));
    
    await db.delete(games).where(eq(games.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }

  async getAllBoardsWithOwners() {
    const allBoards = await db.select().from(boards).orderBy(desc(boards.id));
    
    const boardsWithOwners = await Promise.all(allBoards.map(async (board) => {
      const [owner] = board.userId 
        ? await db.select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, board.userId))
        : [{ email: 'Unknown', firstName: null, lastName: null }];
      
      const [catCount] = await db.select({ count: count() })
        .from(boardCategories)
        .where(eq(boardCategories.boardId, board.id));
      
      const boardCats = await db.select({ categoryId: boardCategories.categoryId })
        .from(boardCategories)
        .where(eq(boardCategories.boardId, board.id));
      const categoryIds = Array.from(new Set(boardCats.map(bc => bc.categoryId)));
      
      let questionCount = 0;
      if (categoryIds.length > 0) {
        const [qCount] = await db.select({ count: count() })
          .from(questions)
          .where(inArray(questions.categoryId, categoryIds));
        questionCount = qCount?.count ?? 0;
      }

      return {
        ...board,
        ownerEmail: owner?.email ?? 'Unknown',
        ownerName: [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || null,
        categoryCount: catCount?.count ?? 0,
        questionCount,
      };
    }));

    return boardsWithOwners;
  }

  async deleteBoardFully(boardId: number) {
    // Clear board references from active sessions (set to null rather than deleting session)
    await db.update(gameSessions)
      .set({ currentBoardId: null })
      .where(eq(gameSessions.currentBoardId, boardId));
    
    // Note: We don't delete questions here since they belong to categories, not boards
    // Questions are deleted when their category is deleted
    
    await db.delete(boardCategories).where(eq(boardCategories.boardId, boardId));
    await db.delete(gameBoards).where(eq(gameBoards.boardId, boardId));
    await db.delete(boards).where(eq(boards.id, boardId));
  }

  // Game Types
  async getGameTypes(): Promise<GameType[]> {
    return await db.select().from(gameTypes).orderBy(asc(gameTypes.sortOrder));
  }

  async getEnabledGameTypes(forHost: boolean): Promise<GameType[]> {
    if (forHost) {
      return await db.select().from(gameTypes)
        .where(eq(gameTypes.hostEnabled, true))
        .orderBy(asc(gameTypes.sortOrder));
    }
    return await db.select().from(gameTypes)
      .where(eq(gameTypes.playerEnabled, true))
      .orderBy(asc(gameTypes.sortOrder));
  }

  async getHomepageGameTypes(): Promise<GameType[]> {
    // Get games that are active or coming_soon (exclude hidden)
    // Show coming_soon games even if hostEnabled is false
    return await db.select().from(gameTypes)
      .where(
        and(
          sql`${gameTypes.status} != 'hidden'`,
          sql`(${gameTypes.hostEnabled} = true OR ${gameTypes.status} = 'coming_soon')`
        )
      )
      .orderBy(asc(gameTypes.sortOrder));
  }

  async getGameType(id: number): Promise<GameType | undefined> {
    const [gameType] = await db.select().from(gameTypes).where(eq(gameTypes.id, id));
    return gameType;
  }

  async getGameTypeBySlug(slug: string): Promise<GameType | undefined> {
    const [gameType] = await db.select().from(gameTypes).where(eq(gameTypes.slug, slug));
    return gameType;
  }

  async updateGameType(id: number, data: Partial<InsertGameType>): Promise<GameType | undefined> {
    const [updated] = await db.update(gameTypes).set(data as any).where(eq(gameTypes.id, id)).returning();
    return updated;
  }

  // Double Dip - Pairs
  async getDoubleDipPair(id: number): Promise<DoubleDipPair | undefined> {
    const [pair] = await db.select().from(doubleDipPairs).where(eq(doubleDipPairs.id, id));
    return pair;
  }

  async getDoubleDipPairByInviteCode(code: string): Promise<DoubleDipPair | undefined> {
    const [pair] = await db.select().from(doubleDipPairs).where(eq(doubleDipPairs.inviteCode, code));
    return pair;
  }

  async getDoubleDipPairForUser(userId: string): Promise<DoubleDipPair | undefined> {
    // Get active pair where user is either A or B, OR pending pair where user is A (creator)
    const [pair] = await db.select().from(doubleDipPairs)
      .where(
        sql`(
          (${doubleDipPairs.status} = 'active' AND (${doubleDipPairs.userAId} = ${userId} OR ${doubleDipPairs.userBId} = ${userId}))
          OR
          (${doubleDipPairs.status} = 'pending' AND ${doubleDipPairs.userAId} = ${userId})
        )`
      );
    return pair;
  }

  async createDoubleDipPair(data: InsertDoubleDipPair): Promise<DoubleDipPair> {
    const [pair] = await db.insert(doubleDipPairs).values(data as any).returning();
    return pair;
  }

  async updateDoubleDipPair(id: number, data: Partial<InsertDoubleDipPair>): Promise<DoubleDipPair | undefined> {
    const [updated] = await db.update(doubleDipPairs).set(data as any).where(eq(doubleDipPairs.id, id)).returning();
    return updated;
  }

  // Double Dip - Questions
  async getDoubleDipQuestions(category?: string): Promise<DoubleDipQuestion[]> {
    if (category) {
      return await db.select().from(doubleDipQuestions)
        .where(and(eq(doubleDipQuestions.category, category as any), eq(doubleDipQuestions.isActive, true)));
    }
    return await db.select().from(doubleDipQuestions).where(eq(doubleDipQuestions.isActive, true));
  }

  async createDoubleDipQuestion(data: InsertDoubleDipQuestion): Promise<DoubleDipQuestion> {
    const [question] = await db.insert(doubleDipQuestions).values(data as any).returning();
    return question;
  }

  // Double Dip - Daily Sets
  async getDoubleDipDailySet(pairId: number, dateKey: string): Promise<DoubleDipDailySet | undefined> {
    const [set] = await db.select().from(doubleDipDailySets)
      .where(and(eq(doubleDipDailySets.pairId, pairId), eq(doubleDipDailySets.dateKey, dateKey)));
    return set;
  }

  async createDoubleDipDailySet(data: InsertDoubleDipDailySet): Promise<DoubleDipDailySet> {
    const [set] = await db.insert(doubleDipDailySets).values(data as any).returning();
    return set;
  }

  async updateDoubleDipDailySet(id: number, data: Partial<InsertDoubleDipDailySet>): Promise<DoubleDipDailySet | undefined> {
    const [updated] = await db.update(doubleDipDailySets).set(data as any).where(eq(doubleDipDailySets.id, id)).returning();
    return updated;
  }
  
  async setDoubleDipFirstCompleterAtomic(dailySetId: number, userId: string): Promise<DoubleDipDailySet | undefined> {
    // Atomic update - only sets firstCompleterId if it's currently null
    const result = await db.execute(
      sql`UPDATE double_dip_daily_sets 
          SET first_completer_id = COALESCE(first_completer_id, ${userId})
          WHERE id = ${dailySetId}
          RETURNING *`
    );
    return result.rows?.[0] as DoubleDipDailySet | undefined;
  }

  // Double Dip - Answers
  async getDoubleDipAnswers(dailySetId: number): Promise<DoubleDipAnswer[]> {
    return await db.select().from(doubleDipAnswers).where(eq(doubleDipAnswers.dailySetId, dailySetId));
  }

  async getDoubleDipAnswerById(id: number): Promise<DoubleDipAnswer | undefined> {
    const [answer] = await db.select().from(doubleDipAnswers).where(eq(doubleDipAnswers.id, id));
    return answer;
  }

  async createDoubleDipAnswer(data: InsertDoubleDipAnswer): Promise<DoubleDipAnswer> {
    const [answer] = await db.insert(doubleDipAnswers).values(data).returning();
    return answer;
  }

  // Double Dip - Reactions
  async createDoubleDipReaction(data: InsertDoubleDipReaction): Promise<DoubleDipReaction> {
    const [reaction] = await db.insert(doubleDipReactions).values(data).returning();
    return reaction;
  }

  async getDoubleDipReactions(answerId: number): Promise<DoubleDipReaction[]> {
    return await db.select().from(doubleDipReactions).where(eq(doubleDipReactions.answerId, answerId));
  }
  
  // Double Dip - Milestones
  async getDoubleDipMilestones(pairId: number): Promise<DoubleDipMilestone[]> {
    return await db.select().from(doubleDipMilestones)
      .where(eq(doubleDipMilestones.pairId, pairId))
      .orderBy(desc(doubleDipMilestones.createdAt));
  }
  
  async createDoubleDipMilestone(data: InsertDoubleDipMilestone): Promise<DoubleDipMilestone> {
    const [milestone] = await db.insert(doubleDipMilestones).values(data as any).returning();
    return milestone;
  }
  
  async checkDoubleDipMilestoneExists(pairId: number, type: string, value: number): Promise<boolean> {
    const existing = await db.select().from(doubleDipMilestones)
      .where(and(
        eq(doubleDipMilestones.pairId, pairId),
        eq(doubleDipMilestones.type, type as any),
        eq(doubleDipMilestones.value, value)
      ))
      .limit(1);
    return existing.length > 0;
  }
  
  // Double Dip - Favorites
  async getDoubleDipFavorites(pairId: number): Promise<DoubleDipFavorite[]> {
    return await db.select().from(doubleDipFavorites)
      .where(eq(doubleDipFavorites.pairId, pairId))
      .orderBy(desc(doubleDipFavorites.createdAt));
  }
  
  async getDoubleDipFavorite(answerId: number, userId: string): Promise<DoubleDipFavorite | undefined> {
    const [fav] = await db.select().from(doubleDipFavorites)
      .where(and(eq(doubleDipFavorites.answerId, answerId), eq(doubleDipFavorites.userId, userId)));
    return fav;
  }
  
  async createDoubleDipFavorite(data: InsertDoubleDipFavorite): Promise<DoubleDipFavorite> {
    const [fav] = await db.insert(doubleDipFavorites).values(data as any).returning();
    return fav;
  }
  
  async deleteDoubleDipFavorite(answerId: number, userId: string): Promise<boolean> {
    const result = await db.delete(doubleDipFavorites)
      .where(and(eq(doubleDipFavorites.answerId, answerId), eq(doubleDipFavorites.userId, userId)));
    return true;
  }
  
  // Double Dip - All daily sets for storyboard
  async getDoubleDipDailySets(pairId: number): Promise<DoubleDipDailySet[]> {
    return await db.select().from(doubleDipDailySets)
      .where(and(eq(doubleDipDailySets.pairId, pairId), eq(doubleDipDailySets.revealed, true)))
      .orderBy(desc(doubleDipDailySets.createdAt));
  }
  
  // Double Dip - Weekly Stakes
  async getDoubleDipWeeklyStake(pairId: number, weekStartDate: string): Promise<DoubleDipWeeklyStake | undefined> {
    const [stake] = await db.select().from(doubleDipWeeklyStakes)
      .where(and(eq(doubleDipWeeklyStakes.pairId, pairId), eq(doubleDipWeeklyStakes.weekStartDate, weekStartDate)));
    return stake;
  }
  
  async createDoubleDipWeeklyStake(data: InsertDoubleDipWeeklyStake): Promise<DoubleDipWeeklyStake> {
    const [stake] = await db.insert(doubleDipWeeklyStakes).values(data).returning();
    return stake;
  }
  
  async updateDoubleDipWeeklyStake(id: number, data: Partial<InsertDoubleDipWeeklyStake>): Promise<DoubleDipWeeklyStake | undefined> {
    const [updated] = await db.update(doubleDipWeeklyStakes).set(data).where(eq(doubleDipWeeklyStakes.id, id)).returning();
    return updated;
  }
  
  async scoreDoubleDipDailyForWeeklyStake(
    dailySetId: number,
    weeklyStakeId: number,
    userAPoints: number,
    userBPoints: number
  ): Promise<boolean> {
    // Atomic: only score if weeklyStakeScored is false, then set it true
    // Uses SQL UPDATE...WHERE to prevent double-scoring on concurrent requests
    const dailyResult = await db.execute(
      sql`UPDATE double_dip_daily_sets 
          SET weekly_stake_scored = true 
          WHERE id = ${dailySetId} AND weekly_stake_scored = false
          RETURNING id`
    );
    
    // If no rows updated, scoring was already done
    if (!dailyResult.rows?.length) {
      return false;
    }
    
    // Now update the weekly stake scores - verify stake exists and was updated
    const stakeResult = await db.execute(
      sql`UPDATE double_dip_weekly_stakes 
          SET user_a_score = user_a_score + ${userAPoints},
              user_b_score = user_b_score + ${userBPoints}
          WHERE id = ${weeklyStakeId}
          RETURNING id`
    );
    
    // If stake wasn't updated, rollback the daily set flag and throw error
    if (!stakeResult.rows?.length) {
      await db.execute(
        sql`UPDATE double_dip_daily_sets 
            SET weekly_stake_scored = false 
            WHERE id = ${dailySetId}`
      );
      throw new Error(`Weekly stake ${weeklyStakeId} not found or could not be updated`);
    }
    
    return true;
  }

  // Sequence Squeeze implementation
  async getSequenceQuestions(userId: string, role?: string): Promise<SequenceQuestion[]> {
    if (role === 'super_admin') {
      return await db.select().from(sequenceQuestions).where(eq(sequenceQuestions.isActive, true)).orderBy(desc(sequenceQuestions.createdAt));
    }
    return await db.select().from(sequenceQuestions).where(and(eq(sequenceQuestions.userId, userId), eq(sequenceQuestions.isActive, true))).orderBy(desc(sequenceQuestions.createdAt));
  }

  async createSequenceQuestion(data: InsertSequenceQuestion): Promise<SequenceQuestion> {
    const [question] = await db.insert(sequenceQuestions).values([data] as any).returning();
    return question;
  }

  async deleteSequenceQuestion(id: number, userId: string, role?: string): Promise<boolean> {
    if (role === 'super_admin') {
      const result = await db.delete(sequenceQuestions).where(eq(sequenceQuestions.id, id));
      return !!result;
    }
    const result = await db.delete(sequenceQuestions).where(and(eq(sequenceQuestions.id, id), eq(sequenceQuestions.userId, userId)));
    return !!result;
  }

  async getPsyopQuestions(userId: string, role?: string): Promise<PsyopQuestion[]> {
    if (role === 'super_admin') {
      return await db.select().from(psyopQuestions).where(eq(psyopQuestions.isActive, true)).orderBy(desc(psyopQuestions.createdAt));
    }
    return await db.select().from(psyopQuestions).where(and(eq(psyopQuestions.userId, userId), eq(psyopQuestions.isActive, true))).orderBy(desc(psyopQuestions.createdAt));
  }

  async createPsyopQuestion(data: InsertPsyopQuestion): Promise<PsyopQuestion> {
    const [question] = await db.insert(psyopQuestions).values([data] as any).returning();
    return question;
  }

  async deletePsyopQuestion(id: number, userId: string, role?: string): Promise<boolean> {
    if (role === 'super_admin') {
      const result = await db.delete(psyopQuestions).where(eq(psyopQuestions.id, id));
      return !!result;
    }
    const result = await db.delete(psyopQuestions).where(and(eq(psyopQuestions.id, id), eq(psyopQuestions.userId, userId)));
    return !!result;
  }

  async seedGameTypes(): Promise<void> {
    const requiredGameTypes = [
      {
        slug: "blitzgrid",
        displayName: "Blitzgrid",
        description: "5 categories, 5 questions each. Race the clock to claim the grid!",
        icon: "grid",
        status: "active" as const,
        hostEnabled: true,
        playerEnabled: true,
        sortOrder: 1,
      },
      {
        slug: "sequence_squeeze",
        displayName: "Sort Circuit",
        description: "Race to arrange 4 options in the correct order! Fastest correct sequence wins.",
        icon: "list-ordered",
        status: "active" as const,
        hostEnabled: true,
        playerEnabled: true,
        sortOrder: 2,
      },
      {
        slug: "psyop",
        displayName: "PsyOp",
        description: "Mind games and psychological challenges. Can you outsmart your opponents?",
        icon: "brain",
        status: "active" as const,
        hostEnabled: true,
        playerEnabled: true,
        sortOrder: 3,
      },
    ];

    console.log("[SEED] Checking for missing game types...");
    const existingTypes = await db.select().from(gameTypes);
    const existingSlugs = new Set(existingTypes.map(t => t.slug));
    console.log(`[SEED] Found ${existingTypes.length} existing game types: ${Array.from(existingSlugs).join(', ')}`);

    let addedCount = 0;
    let updatedCount = 0;
    for (const gameType of requiredGameTypes) {
      if (!existingSlugs.has(gameType.slug)) {
        console.log(`[SEED] Adding missing game type: ${gameType.slug} (${gameType.displayName})`);
        await db.insert(gameTypes).values(gameType);
        addedCount++;
      } else {
        console.log(`[SEED] Ensuring game type ${gameType.slug} is enabled with correct settings...`);
        await db.update(gameTypes)
          .set({ 
            hostEnabled: gameType.hostEnabled, 
            status: gameType.status, 
            sortOrder: gameType.sortOrder,
            displayName: gameType.displayName,
            description: gameType.description,
          })
          .where(eq(gameTypes.slug, gameType.slug));
        updatedCount++;
      }
    }
    
    if (addedCount === 0 && updatedCount === 0) {
      console.log("[SEED] All game types already exist, nothing to add.");
    } else {
      console.log(`[SEED] Added ${addedCount} new game type(s), updated ${updatedCount} existing.`);
    }

    // Disable removed game types (buzzkill, double_dip)
    const removedGameTypes = ["buzzkill", "double_dip"];
    console.log("[SEED] Disabling removed game types...");
    for (const slug of removedGameTypes) {
      await db.update(gameTypes)
        .set({ hostEnabled: false, status: "hidden" as const })
        .where(eq(gameTypes.slug, slug));
    }
    console.log("[SEED] Removed game types disabled.");

    console.log("[SEED] Game types seeding complete.");
  }

  // Master Bank - global boards
  async getGlobalBoards(): Promise<Board[]> {
    return await db.select().from(boards).where(eq(boards.isGlobal, true));
  }

  async setGlobalBoard(boardId: number, isGlobal: boolean): Promise<Board | undefined> {
    const [updated] = await db.update(boards).set({ isGlobal }).where(eq(boards.id, boardId)).returning();
    return updated;
  }

  async setStarterPackBoard(boardId: number, isStarterPack: boolean): Promise<Board | undefined> {
    const [updated] = await db.update(boards).set({ isStarterPack }).where(eq(boards.id, boardId)).returning();
    return updated;
  }

  async getAllBlitzgridsWithOwners() {
    const allGrids = await db.select().from(boards)
      .where(like(boards.theme, 'blitzgrid:%'))
      .orderBy(desc(boards.id));
    
    const gridsWithOwners = await Promise.all(allGrids.map(async (board) => {
      const [owner] = board.userId 
        ? await db.select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, board.userId))
        : [{ email: 'Unknown', firstName: null, lastName: null }];
      
      const [catCount] = await db.select({ count: count() })
        .from(boardCategories)
        .where(eq(boardCategories.boardId, board.id));
      
      const boardCats = await db.select({ categoryId: boardCategories.categoryId })
        .from(boardCategories)
        .where(eq(boardCategories.boardId, board.id));
      const categoryIds = Array.from(new Set(boardCats.map(bc => bc.categoryId)));
      
      let questionCount = 0;
      if (categoryIds.length > 0) {
        const [qCount] = await db.select({ count: count() })
          .from(questions)
          .where(inArray(questions.categoryId, categoryIds));
        questionCount = qCount?.count ?? 0;
      }

      return {
        ...board,
        ownerEmail: owner?.email ?? 'Unknown',
        ownerName: [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || null,
        categoryCount: catCount?.count ?? 0,
        questionCount,
      };
    }));

    return gridsWithOwners;
  }
}

export const storage = new DatabaseStorage();

export async function seedDatabase() {
  console.log("[SEED] Starting database seeding...");
  await storage.seedGameTypes();
  await seedPresetBoards();
  console.log("[SEED] Database seeding complete.");
}

async function seedPresetBoards() {
  const { THEMED_BOARDS } = await import("./seedData");
  
  for (const boardData of THEMED_BOARDS) {
    const categoriesWithQuestions = boardData.categories.filter(c => c.questions.length > 0);
    
    // Check if board already exists by name (case-insensitive)
    const existingBoards = await db.select().from(boards).where(
      sql`LOWER(${boards.name}) = LOWER(${boardData.name})`
    );
    let board: typeof existingBoards[0] | undefined;
    
    if (existingBoards.length > 0) {
      board = existingBoards[0];
      // Check if it has the expected number of categories (or no categories expected)
      const existingBoardCats = await db.select().from(boardCategories).where(eq(boardCategories.boardId, board.id));
      
      if (categoriesWithQuestions.length === 0 || existingBoardCats.length >= categoriesWithQuestions.length) {
        console.log(`[SEED] "${boardData.name}" already seeded, skipping.`);
        continue;
      }
      
      console.log(`[SEED] "${boardData.name}" exists but incomplete, continuing seed...`);
    } else {
      console.log(`[SEED] Creating "${boardData.name}" preset board...`);
      const [newBoard] = await db.insert(boards).values({
        name: boardData.name,
        description: boardData.description,
        pointValues: [10, 20, 30, 40, 50],
        isGlobal: true,
        colorCode: boardData.colorCode,
      }).returning();
      board = newBoard;
    }
    
    // If no categories with questions, we're done with this board
    if (categoriesWithQuestions.length === 0) {
      console.log(`[SEED] "${boardData.name}" created (empty - awaiting content).`);
      continue;
    }

    const categoryMap = new Map<string, number>();
    let questionsCount = 0;

    for (const catData of boardData.categories) {
      if (catData.questions.length === 0) {
        console.log(`[SEED] Warning: "${catData.name}" has no questions, skipping category.`);
        continue;
      }
      
      const [cat] = await db.insert(categories).values({
        name: catData.name,
        description: "",
        rule: catData.rule,
        imageUrl: "",
        sourceGroup: "A" as const,
      }).returning();
      categoryMap.set(catData.name, cat.id);
      
      // Link category to board
      const [bc] = await db.insert(boardCategories).values({
        boardId: board.id,
        categoryId: cat.id,
      }).returning();

      // Insert questions for this category
      for (const q of catData.questions) {
        await db.insert(questions).values({
          categoryId: cat.id,
          question: q.question,
          options: [q.answer],
          correctAnswer: q.answer,
          points: q.points,
        });
        questionsCount++;
      }
    }

    console.log(`[SEED] Created "${boardData.name}" with ${categoryMap.size} categories and ${questionsCount} questions.`);
  }
}
