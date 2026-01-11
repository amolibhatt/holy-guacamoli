import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { setupWebSocket, getRoomInfo } from "./gameRoom";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg'];
    cb(null, allowed.includes(file.mimetype));
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup auth BEFORE other routes
  setupAuth(app);
  registerAuthRoutes(app);
  
  setupWebSocket(httpServer);

  app.get("/api/room/:code", (req, res) => {
    const info = getRoomInfo(req.params.code.toUpperCase());
    if (!info) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json(info);
  });

  // Board routes - protected (hosts only, super_admin sees all)
  app.get("/api/boards", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const boards = await storage.getBoards(userId, role);
    res.json(boards);
  });

  app.get("/api/boards/summary", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const summaries = await storage.getBoardSummaries(userId, role);
    res.json(summaries);
  });

  app.get("/api/boards/:id", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const board = await storage.getBoard(Number(req.params.id), userId, role);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }
    res.json(board);
  });

  app.post("/api/boards", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { name, description, pointValues } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      const board = await storage.createBoard({
        name,
        description: description || null,
        pointValues: pointValues || [10, 20, 30, 40, 50],
        userId,
      });
      res.status(201).json(board);
    } catch (err) {
      console.error("Error creating board:", err);
      res.status(500).json({ message: "Failed to create board" });
    }
  });

  app.put("/api/boards/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const { name, description, pointValues, theme } = req.body;
      const board = await storage.updateBoard(Number(req.params.id), {
        name,
        description,
        pointValues,
        theme,
      }, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.json(board);
    } catch (err) {
      console.error("Error updating board:", err);
      res.status(500).json({ message: "Failed to update board" });
    }
  });

  app.delete("/api/boards/:id", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const deleted = await storage.deleteBoard(Number(req.params.id), userId, role);
    if (!deleted) {
      return res.status(404).json({ message: "Board not found" });
    }
    res.json({ success: true });
  });

  // Board categories (junction table) - protected
  app.get("/api/boards/:boardId/categories", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const boardId = Number(req.params.boardId);
    const board = await storage.getBoard(boardId, userId, role);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }
    const boardCategories = await storage.getBoardCategories(boardId);
    res.json(boardCategories);
  });

  app.post("/api/boards/:boardId/categories", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const boardId = Number(req.params.boardId);
      const board = await storage.getBoard(boardId, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      const { categoryId } = req.body;
      if (!categoryId) {
        return res.status(400).json({ message: "categoryId is required" });
      }
      const existing = await storage.getBoardCategoryByIds(boardId, categoryId);
      if (existing) {
        return res.status(400).json({ message: "Category already linked to this board" });
      }
      const currentCategories = await storage.getBoardCategories(boardId);
      if (currentCategories.length >= 5) {
        return res.status(400).json({ message: "Board already has 5 categories (maximum)" });
      }
      const bc = await storage.createBoardCategory({
        boardId,
        categoryId,
      });
      res.status(201).json(bc);
    } catch (err) {
      console.error("Error linking category to board:", err);
      res.status(500).json({ message: "Failed to link category to board" });
    }
  });

  app.delete("/api/board-categories/:id", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const bc = await storage.getBoardCategory(Number(req.params.id));
    if (!bc) {
      return res.status(404).json({ message: "Board category link not found" });
    }
    const board = await storage.getBoard(bc.boardId, userId, role);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }
    const deleted = await storage.deleteBoardCategory(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Board category link not found" });
    }
    res.json({ success: true });
  });

  app.put("/api/boards/:boardId/categories/reorder", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const boardId = Number(req.params.boardId);
      const board = await storage.getBoard(boardId, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds) || !orderedIds.every(id => typeof id === 'number')) {
        return res.status(400).json({ message: "orderedIds must be an array of numbers" });
      }
      const currentCategories = await storage.getBoardCategories(boardId);
      const validIds = new Set(currentCategories.map(bc => bc.id));
      if (!orderedIds.every(id => validIds.has(id)) || orderedIds.length !== validIds.size) {
        return res.status(400).json({ message: "Invalid category IDs for this board" });
      }
      for (let i = 0; i < orderedIds.length; i++) {
        await storage.updateBoardCategoryPosition(orderedIds[i], i);
      }
      const updated = await storage.getBoardCategories(boardId);
      res.json(updated);
    } catch (err) {
      console.error("Error reordering categories:", err);
      res.status(500).json({ message: "Failed to reorder categories" });
    }
  });

  app.post("/api/boards/:boardId/categories/create-and-link", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const boardId = Number(req.params.boardId);
      const board = await storage.getBoard(boardId, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      const { name, description } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Category name is required" });
      }
      const currentCategories = await storage.getBoardCategories(boardId);
      if (currentCategories.length >= 5) {
        return res.status(400).json({ message: "Board already has 5 categories (maximum)" });
      }
      const category = await storage.createCategory({ name: name.trim(), description: description?.trim() || '', imageUrl: '' });
      let bc;
      try {
        bc = await storage.createBoardCategory({ boardId, categoryId: category.id });
      } catch (linkErr) {
        try {
          await storage.deleteCategory(category.id);
        } catch (cleanupErr) {
          console.error("Failed to cleanup orphan category:", cleanupErr);
        }
        throw linkErr;
      }
      res.status(201).json({ category, boardCategory: bc });
    } catch (err) {
      console.error("Error creating and linking category:", err);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Global categories (templates) - protected
  app.get(api.categories.list.path, isAuthenticated, async (req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.get(api.categories.get.path, isAuthenticated, async (req, res) => {
    const category = await storage.getCategory(Number(req.params.id));
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  });

  app.post(api.categories.create.path, isAuthenticated, async (req, res) => {
    try {
      const data = api.categories.create.input.parse(req.body);
      const category = await storage.createCategory(data);
      res.status(201).json(category);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const { name, description, imageUrl } = req.body;
      const category = await storage.updateCategory(Number(req.params.id), {
        name,
        description,
        imageUrl,
      });
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (err) {
      console.error("Error updating category:", err);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete(api.categories.delete.path, isAuthenticated, async (req, res) => {
    const deleted = await storage.deleteCategory(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ success: true });
  });

  // Helper to verify board-category ownership
  async function verifyBoardCategoryOwnership(boardCategoryId: number, userId: string, role?: string) {
    const bc = await storage.getBoardCategory(boardCategoryId);
    if (!bc) return null;
    const board = await storage.getBoard(bc.boardId, userId, role);
    if (!board) return null;
    return bc;
  }

  // Questions (by board-category) - protected
  app.get("/api/board-categories/:boardCategoryId/questions", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const bc = await verifyBoardCategoryOwnership(Number(req.params.boardCategoryId), userId, role);
    if (!bc) {
      return res.status(404).json({ message: "Board category not found" });
    }
    const questions = await storage.getQuestionsByBoardCategory(Number(req.params.boardCategoryId));
    res.json(questions);
  });

  app.post(api.questions.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const data = api.questions.create.input.parse(req.body);
      const bc = await verifyBoardCategoryOwnership(data.boardCategoryId, userId, role);
      if (!bc) {
        return res.status(404).json({ message: "Board category not found" });
      }
      const existingQuestions = await storage.getQuestionsByBoardCategory(data.boardCategoryId);
      if (existingQuestions.length >= 5) {
        return res.status(400).json({ message: "Category already has 5 questions (maximum)" });
      }
      if (existingQuestions.some(q => q.points === data.points)) {
        return res.status(400).json({ message: `A ${data.points}-point question already exists in this category` });
      }
      const question = await storage.createQuestion(data);
      res.status(201).json(question);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.questions.update.path, isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const data = api.questions.update.input.parse(req.body);
      const existingQuestion = await storage.getQuestion(Number(req.params.id));
      if (!existingQuestion) {
        return res.status(404).json({ message: 'Question not found' });
      }
      const bc = await verifyBoardCategoryOwnership(existingQuestion.boardCategoryId, userId, role);
      if (!bc) {
        return res.status(404).json({ message: "Board category not found" });
      }
      if (data.points !== undefined && data.points !== existingQuestion.points) {
        const siblingQuestions = await storage.getQuestionsByBoardCategory(existingQuestion.boardCategoryId);
        if (siblingQuestions.some(q => q.id !== existingQuestion.id && q.points === data.points)) {
          return res.status(400).json({ message: `A ${data.points}-point question already exists in this category` });
        }
      }
      const question = await storage.updateQuestion(Number(req.params.id), data);
      res.json(question!);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.questions.delete.path, isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const existingQuestion = await storage.getQuestion(Number(req.params.id));
    if (!existingQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }
    const bc = await verifyBoardCategoryOwnership(existingQuestion.boardCategoryId, userId, role);
    if (!bc) {
      return res.status(404).json({ message: "Board category not found" });
    }
    const deleted = await storage.deleteQuestion(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json({ success: true });
  });

  app.post(api.questions.verifyAnswer.path, isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const { answer } = api.questions.verifyAnswer.input.parse(req.body);
      const question = await storage.getQuestion(Number(req.params.id));
      
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }
      
      const bc = await verifyBoardCategoryOwnership(question.boardCategoryId, userId, role);
      if (!bc) {
        return res.status(404).json({ message: "Board category not found" });
      }

      const isCorrect = question.correctAnswer === answer;
      
      res.json({
        correct: isCorrect,
        correctAnswer: question.correctAnswer,
        points: isCorrect ? question.points : 0
      });
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Get full board data for gameplay - protected
  app.get("/api/boards/:id/full", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const board = await storage.getBoard(Number(req.params.id), userId, role);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      const categoriesWithQuestions = await storage.getBoardWithCategoriesAndQuestions(Number(req.params.id), userId, role);
      res.json({ board, categories: categoriesWithQuestions });
    } catch (err) {
      console.error("Error getting full board:", err);
      res.status(500).json({ message: "Failed to get board data" });
    }
  });

  // === GAMES ===
  app.get("/api/games", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const allGames = await storage.getGames(userId, role);
    res.json(allGames);
  });

  app.get("/api/games/:id", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const game = await storage.getGame(Number(req.params.id), userId, role);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }
    res.json(game);
  });

  app.post("/api/games", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { name, mode, settings } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      const game = await storage.createGame({
        name,
        mode: mode || "jeopardy",
        settings: settings || {},
        userId,
      });
      res.status(201).json(game);
    } catch (err) {
      console.error("Error creating game:", err);
      res.status(500).json({ message: "Failed to create game" });
    }
  });

  app.put("/api/games/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const { name, mode, settings } = req.body;
      const game = await storage.updateGame(Number(req.params.id), { name, mode, settings }, userId, role);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      res.json(game);
    } catch (err) {
      console.error("Error updating game:", err);
      res.status(500).json({ message: "Failed to update game" });
    }
  });

  app.delete("/api/games/:id", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const deleted = await storage.deleteGame(Number(req.params.id), userId, role);
    if (!deleted) {
      return res.status(404).json({ message: "Game not found" });
    }
    res.json({ success: true });
  });

  // === GAME BOARDS (junction) ===
  app.get("/api/games/:gameId/boards", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const game = await storage.getGame(Number(req.params.gameId), userId, role);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }
    const gbs = await storage.getGameBoards(Number(req.params.gameId));
    res.json(gbs);
  });

  app.post("/api/games/:gameId/boards", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const gameId = Number(req.params.gameId);
      const game = await storage.getGame(gameId, userId, role);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      const { boardId } = req.body;
      if (!boardId) {
        return res.status(400).json({ message: "boardId is required" });
      }
      const board = await storage.getBoard(boardId, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      const gb = await storage.addBoardToGame({ gameId, boardId });
      res.status(201).json(gb);
    } catch (err) {
      console.error("Error adding board to game:", err);
      res.status(500).json({ message: "Failed to add board to game" });
    }
  });

  app.delete("/api/games/:gameId/boards/:boardId", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const gameId = Number(req.params.gameId);
    const game = await storage.getGame(gameId, userId, role);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }
    const deleted = await storage.removeBoardFromGame(gameId, Number(req.params.boardId));
    if (!deleted) {
      return res.status(404).json({ message: "Board not linked to this game" });
    }
    res.json({ success: true });
  });

  // === HEADS UP DECKS ===
  app.get("/api/heads-up-decks", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const decks = await storage.getHeadsUpDecks(userId, role);
    res.json(decks);
  });

  app.get("/api/heads-up-decks/:id", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const deck = await storage.getHeadsUpDeck(Number(req.params.id), userId, role);
    if (!deck) {
      return res.status(404).json({ message: "Deck not found" });
    }
    res.json(deck);
  });

  app.post("/api/heads-up-decks", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { name, description, imageUrl, timerSeconds } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      const deck = await storage.createHeadsUpDeck({
        name,
        description: description || null,
        imageUrl: imageUrl || null,
        timerSeconds: timerSeconds || 60,
        userId,
      });
      res.status(201).json(deck);
    } catch (err) {
      console.error("Error creating deck:", err);
      res.status(500).json({ message: "Failed to create deck" });
    }
  });

  app.put("/api/heads-up-decks/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const { name, description, imageUrl, timerSeconds } = req.body;
      const deck = await storage.updateHeadsUpDeck(Number(req.params.id), { name, description, imageUrl, timerSeconds }, userId, role);
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }
      res.json(deck);
    } catch (err) {
      console.error("Error updating deck:", err);
      res.status(500).json({ message: "Failed to update deck" });
    }
  });

  app.delete("/api/heads-up-decks/:id", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const deleted = await storage.deleteHeadsUpDeck(Number(req.params.id), userId, role);
    if (!deleted) {
      return res.status(404).json({ message: "Deck not found" });
    }
    res.json({ success: true });
  });

  // === HEADS UP CARDS ===
  app.get("/api/heads-up-decks/:deckId/cards", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const deck = await storage.getHeadsUpDeck(Number(req.params.deckId), userId, role);
    if (!deck) {
      return res.status(404).json({ message: "Deck not found" });
    }
    const cards = await storage.getHeadsUpCards(Number(req.params.deckId));
    res.json(cards);
  });

  app.post("/api/heads-up-decks/:deckId/cards", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const deckId = Number(req.params.deckId);
      const deck = await storage.getHeadsUpDeck(deckId, userId, role);
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }
      const { prompt, hints } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      const card = await storage.createHeadsUpCard({ deckId, prompt, hints: hints || [] });
      res.status(201).json(card);
    } catch (err) {
      console.error("Error creating card:", err);
      res.status(500).json({ message: "Failed to create card" });
    }
  });

  app.put("/api/heads-up-cards/:id", isAuthenticated, async (req, res) => {
    try {
      const { prompt, hints } = req.body;
      const card = await storage.updateHeadsUpCard(Number(req.params.id), { prompt, hints });
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }
      res.json(card);
    } catch (err) {
      console.error("Error updating card:", err);
      res.status(500).json({ message: "Failed to update card" });
    }
  });

  app.delete("/api/heads-up-cards/:id", isAuthenticated, async (req, res) => {
    const deleted = await storage.deleteHeadsUpCard(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Card not found" });
    }
    res.json({ success: true });
  });

  // === GAME DECKS (junction for heads up) ===
  app.get("/api/games/:gameId/decks", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const game = await storage.getGame(Number(req.params.gameId), userId, role);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }
    const gds = await storage.getGameDecks(Number(req.params.gameId));
    res.json(gds);
  });

  app.post("/api/games/:gameId/decks", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const gameId = Number(req.params.gameId);
      const game = await storage.getGame(gameId, userId, role);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      const { deckId } = req.body;
      if (!deckId) {
        return res.status(400).json({ message: "deckId is required" });
      }
      const deck = await storage.getHeadsUpDeck(deckId, userId, role);
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }
      const gd = await storage.addDeckToGame({ gameId, deckId });
      res.status(201).json(gd);
    } catch (err) {
      console.error("Error adding deck to game:", err);
      res.status(500).json({ message: "Failed to add deck to game" });
    }
  });

  app.delete("/api/games/:gameId/decks/:deckId", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const gameId = Number(req.params.gameId);
    const game = await storage.getGame(gameId, userId, role);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }
    const deleted = await storage.removeDeckFromGame(gameId, Number(req.params.deckId));
    if (!deleted) {
      return res.status(404).json({ message: "Deck not linked to this game" });
    }
    res.json({ success: true });
  });

  app.post('/api/upload', isAuthenticated, upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  });

  app.use('/uploads', (await import('express')).default.static(uploadDir));

  return httpServer;
}
