import { db } from "./db";
import { boards, categories, boardCategories, questions, games, gameBoards, headsUpDecks, headsUpCards, gameDecks, liarPromptPacks, liarPrompts, gameLiarPacks, type Board, type InsertBoard, type Category, type InsertCategory, type BoardCategory, type InsertBoardCategory, type Question, type InsertQuestion, type BoardCategoryWithCategory, type BoardCategoryWithCount, type BoardCategoryWithQuestions, type Game, type InsertGame, type GameBoard, type InsertGameBoard, type HeadsUpDeck, type InsertHeadsUpDeck, type HeadsUpCard, type InsertHeadsUpCard, type GameDeck, type InsertGameDeck, type HeadsUpDeckWithCardCount, type LiarPromptPack, type InsertLiarPromptPack, type LiarPrompt, type InsertLiarPrompt, type GameLiarPack, type InsertGameLiarPack, type LiarPromptPackWithCount } from "@shared/schema";
import { eq, and, asc, count, inArray } from "drizzle-orm";

export interface IStorage {
  getBoards(userId: string, role?: string): Promise<Board[]>;
  getBoard(id: number, userId: string, role?: string): Promise<Board | undefined>;
  createBoard(board: InsertBoard & { userId: string }): Promise<Board>;
  updateBoard(id: number, data: Partial<InsertBoard>, userId: string, role?: string): Promise<Board | undefined>;
  deleteBoard(id: number, userId: string, role?: string): Promise<boolean>;
  
  getCategories(): Promise<Category[]>;
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
  
  getQuestionsByBoardCategory(boardCategoryId: number): Promise<Question[]>;
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
  
  // Liar Prompt Packs
  getLiarPromptPacks(userId: string, role?: string): Promise<LiarPromptPackWithCount[]>;
  getLiarPromptPack(id: number, userId: string, role?: string): Promise<LiarPromptPack | undefined>;
  createLiarPromptPack(pack: InsertLiarPromptPack): Promise<LiarPromptPack>;
  updateLiarPromptPack(id: number, data: Partial<InsertLiarPromptPack>, userId: string, role?: string): Promise<LiarPromptPack | undefined>;
  deleteLiarPromptPack(id: number, userId: string, role?: string): Promise<boolean>;
  
  // Liar Prompts
  getLiarPrompts(packId: number): Promise<LiarPrompt[]>;
  getLiarPrompt(id: number): Promise<LiarPrompt | undefined>;
  createLiarPrompt(prompt: InsertLiarPrompt): Promise<LiarPrompt>;
  updateLiarPrompt(id: number, data: Partial<InsertLiarPrompt>): Promise<LiarPrompt | undefined>;
  deleteLiarPrompt(id: number): Promise<boolean>;
  
  // Game Liar Packs (junction)
  getGameLiarPacks(gameId: number): Promise<(GameLiarPack & { pack: LiarPromptPack })[]>;
  addLiarPackToGame(data: InsertGameLiarPack): Promise<GameLiarPack>;
  removeLiarPackFromGame(gameId: number, packId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getBoards(userId: string, role?: string): Promise<Board[]> {
    if (role === 'super_admin') {
      return await db.select().from(boards);
    }
    return await db.select().from(boards).where(eq(boards.userId, userId));
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
    const bcs = await db.select().from(boardCategories).where(eq(boardCategories.boardId, id));
    for (const bc of bcs) {
      await db.delete(questions).where(eq(questions.boardCategoryId, bc.id));
    }
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
    const bcs = await db.select().from(boardCategories).where(eq(boardCategories.categoryId, id));
    for (const bc of bcs) {
      await db.delete(questions).where(eq(questions.boardCategoryId, bc.id));
    }
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
    
    const bcIds = result.map(r => r.id);
    const counts = await db
      .select({ 
        boardCategoryId: questions.boardCategoryId, 
        count: count() 
      })
      .from(questions)
      .where(inArray(questions.boardCategoryId, bcIds))
      .groupBy(questions.boardCategoryId);
    
    const countMap = new Map(counts.map(c => [c.boardCategoryId, c.count]));
    
    return result.map(r => ({
      id: r.id,
      boardId: r.boardId,
      categoryId: r.categoryId,
      position: r.position,
      category: r.category,
      questionCount: countMap.get(r.id) || 0,
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
    await db.delete(questions).where(eq(questions.boardCategoryId, id));
    const result = await db.delete(boardCategories).where(eq(boardCategories.id, id)).returning();
    return result.length > 0;
  }

  async getQuestionsByBoardCategory(boardCategoryId: number): Promise<Question[]> {
    return await db.select().from(questions)
      .where(eq(questions.boardCategoryId, boardCategoryId))
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
      const qs = await this.getQuestionsByBoardCategory(bc.id);
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

  // === LIAR PROMPT PACKS ===
  async getLiarPromptPacks(userId: string, role?: string): Promise<LiarPromptPackWithCount[]> {
    const packs = role === 'super_admin' 
      ? await db.select().from(liarPromptPacks)
      : await db.select().from(liarPromptPacks).where(eq(liarPromptPacks.userId, userId));
    
    const result: LiarPromptPackWithCount[] = [];
    for (const pack of packs) {
      const [{ count: promptCount }] = await db.select({ count: count() })
        .from(liarPrompts)
        .where(eq(liarPrompts.packId, pack.id));
      result.push({ ...pack, promptCount: Number(promptCount) });
    }
    return result;
  }

  async getLiarPromptPack(id: number, userId: string, role?: string): Promise<LiarPromptPack | undefined> {
    if (role === 'super_admin') {
      const [pack] = await db.select().from(liarPromptPacks).where(eq(liarPromptPacks.id, id));
      return pack;
    }
    const [pack] = await db.select().from(liarPromptPacks)
      .where(and(eq(liarPromptPacks.id, id), eq(liarPromptPacks.userId, userId)));
    return pack;
  }

  async createLiarPromptPack(pack: InsertLiarPromptPack): Promise<LiarPromptPack> {
    const [newPack] = await db.insert(liarPromptPacks).values(pack as any).returning();
    return newPack;
  }

  async updateLiarPromptPack(id: number, data: Partial<InsertLiarPromptPack>, userId: string, role?: string): Promise<LiarPromptPack | undefined> {
    if (role === 'super_admin') {
      const [updated] = await db.update(liarPromptPacks).set(data as any).where(eq(liarPromptPacks.id, id)).returning();
      return updated;
    }
    const [updated] = await db.update(liarPromptPacks).set(data as any)
      .where(and(eq(liarPromptPacks.id, id), eq(liarPromptPacks.userId, userId))).returning();
    return updated;
  }

  async deleteLiarPromptPack(id: number, userId: string, role?: string): Promise<boolean> {
    const pack = await this.getLiarPromptPack(id, userId, role);
    if (!pack) return false;
    await db.delete(liarPrompts).where(eq(liarPrompts.packId, id));
    await db.delete(gameLiarPacks).where(eq(gameLiarPacks.packId, id));
    if (role === 'super_admin') {
      const result = await db.delete(liarPromptPacks).where(eq(liarPromptPacks.id, id)).returning();
      return result.length > 0;
    }
    const result = await db.delete(liarPromptPacks)
      .where(and(eq(liarPromptPacks.id, id), eq(liarPromptPacks.userId, userId))).returning();
    return result.length > 0;
  }

  // === LIAR PROMPTS ===
  async getLiarPrompts(packId: number): Promise<LiarPrompt[]> {
    return await db.select().from(liarPrompts).where(eq(liarPrompts.packId, packId));
  }

  async getLiarPrompt(id: number): Promise<LiarPrompt | undefined> {
    const [prompt] = await db.select().from(liarPrompts).where(eq(liarPrompts.id, id));
    return prompt;
  }

  async createLiarPrompt(prompt: InsertLiarPrompt): Promise<LiarPrompt> {
    const [newPrompt] = await db.insert(liarPrompts).values(prompt as any).returning();
    return newPrompt;
  }

  async updateLiarPrompt(id: number, data: Partial<InsertLiarPrompt>): Promise<LiarPrompt | undefined> {
    const [updated] = await db.update(liarPrompts).set(data as any).where(eq(liarPrompts.id, id)).returning();
    return updated;
  }

  async deleteLiarPrompt(id: number): Promise<boolean> {
    const result = await db.delete(liarPrompts).where(eq(liarPrompts.id, id)).returning();
    return result.length > 0;
  }

  // === GAME LIAR PACKS ===
  async getGameLiarPacks(gameId: number): Promise<(GameLiarPack & { pack: LiarPromptPack })[]> {
    const result = await db
      .select({
        id: gameLiarPacks.id,
        gameId: gameLiarPacks.gameId,
        packId: gameLiarPacks.packId,
        position: gameLiarPacks.position,
        pack: liarPromptPacks,
      })
      .from(gameLiarPacks)
      .innerJoin(liarPromptPacks, eq(gameLiarPacks.packId, liarPromptPacks.id))
      .where(eq(gameLiarPacks.gameId, gameId))
      .orderBy(asc(gameLiarPacks.position));
    return result.map(r => ({
      id: r.id,
      gameId: r.gameId,
      packId: r.packId,
      position: r.position,
      pack: r.pack,
    }));
  }

  async addLiarPackToGame(data: InsertGameLiarPack): Promise<GameLiarPack> {
    const currentCount = await db.select({ count: count() })
      .from(gameLiarPacks)
      .where(eq(gameLiarPacks.gameId, data.gameId));
    const position = data.position ?? (currentCount[0]?.count ?? 0);
    const [newGlp] = await db.insert(gameLiarPacks).values({ ...data, position }).returning();
    return newGlp;
  }

  async removeLiarPackFromGame(gameId: number, packId: number): Promise<boolean> {
    const result = await db.delete(gameLiarPacks)
      .where(and(eq(gameLiarPacks.gameId, gameId), eq(gameLiarPacks.packId, packId)))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
