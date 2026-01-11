import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { setupWebSocket, getRoomInfo, getOrRestoreSession } from "./gameRoom";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

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
  
  // Register object storage routes for image uploads
  registerObjectStorageRoutes(app);
  
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

  // Bulk import questions
  app.post("/api/board-categories/:boardCategoryId/questions/bulk", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const boardCategoryId = Number(req.params.boardCategoryId);
      const bc = await verifyBoardCategoryOwnership(boardCategoryId, userId, role);
      if (!bc) {
        return res.status(404).json({ message: "Board category not found" });
      }

      const { questions } = req.body as { questions: Array<{ question: string; correctAnswer: string; points: number }> };
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "No questions provided" });
      }

      const existingQuestions = await storage.getQuestionsByBoardCategory(boardCategoryId);
      const existingPoints = new Set(existingQuestions.map(q => q.points));
      const results: { success: number; errors: string[] } = { success: 0, errors: [] };

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question?.trim() || !q.correctAnswer?.trim() || !q.points) {
          results.errors.push(`Line ${i + 1}: Missing required fields`);
          continue;
        }
        if (existingPoints.has(q.points)) {
          results.errors.push(`Line ${i + 1}: ${q.points}-point question already exists`);
          continue;
        }
        if (existingQuestions.length + results.success >= 5) {
          results.errors.push(`Line ${i + 1}: Category already has 5 questions (maximum)`);
          continue;
        }
        try {
          await storage.createQuestion({
            boardCategoryId,
            question: q.question.trim(),
            options: [],
            correctAnswer: q.correctAnswer.trim(),
            points: q.points,
          });
          existingPoints.add(q.points);
          results.success++;
        } catch (err) {
          results.errors.push(`Line ${i + 1}: Failed to create question`);
        }
      }

      res.json(results);
    } catch (err) {
      console.error("Bulk import error:", err);
      res.status(500).json({ message: "Failed to import questions" });
    }
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

  // Session API routes
  app.get("/api/session/:code", async (req, res) => {
    try {
      const session = await getOrRestoreSession(req.params.code);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (err) {
      console.error("Error getting session:", err);
      res.status(500).json({ message: "Failed to get session" });
    }
  });

  app.get("/api/session/:code/players", async (req, res) => {
    try {
      const session = await storage.getSessionByCode(req.params.code.toUpperCase());
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      const players = await storage.getSessionPlayers(session.id);
      res.json(players.map(p => ({
        id: p.playerId,
        name: p.name,
        score: p.score,
        isConnected: p.isConnected,
      })));
    } catch (err) {
      console.error("Error getting session players:", err);
      res.status(500).json({ message: "Failed to get players" });
    }
  });

  app.get("/api/session/:code/completed-questions", async (req, res) => {
    try {
      const session = await storage.getSessionByCode(req.params.code.toUpperCase());
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      const questionIds = await storage.getCompletedQuestions(session.id);
      res.json(questionIds);
    } catch (err) {
      console.error("Error getting completed questions:", err);
      res.status(500).json({ message: "Failed to get completed questions" });
    }
  });

  app.post("/api/session/:code/end", isAuthenticated, async (req, res) => {
    try {
      const session = await storage.getSessionByCode(req.params.code.toUpperCase());
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      if (session.hostId !== req.session.userId && req.session.userRole !== 'super_admin') {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.updateSession(session.id, { state: 'ended' });
      res.json({ success: true });
    } catch (err) {
      console.error("Error ending session:", err);
      res.status(500).json({ message: "Failed to end session" });
    }
  });

  app.delete("/api/session/:code", isAuthenticated, async (req, res) => {
    try {
      const session = await storage.getSessionByCode(req.params.code.toUpperCase());
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      if (session.hostId !== req.session.userId && req.session.userRole !== 'super_admin') {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.deleteSession(session.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting session:", err);
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Get active session for current host
  app.get("/api/my-session", isAuthenticated, async (req, res) => {
    try {
      const session = await storage.getActiveSessionForHost(req.session.userId!);
      if (!session) {
        return res.json(null);
      }
      const players = await storage.getSessionPlayers(session.id);
      const completedQuestions = await storage.getCompletedQuestions(session.id);
      res.json({
        ...session,
        players: players.map(p => ({
          id: p.playerId,
          name: p.name,
          score: p.score,
          isConnected: p.isConnected,
        })),
        completedQuestions,
      });
    } catch (err) {
      console.error("Error getting active session:", err);
      res.status(500).json({ message: "Failed to get session" });
    }
  });

  app.post('/api/upload', isAuthenticated, upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  });

  app.use('/uploads', (await import('express')).default.static(uploadDir));

  // Super Admin routes
  const isSuperAdmin: import('express').RequestHandler = (req, res, next) => {
    if (!req.session.userId || req.session.userRole !== 'super_admin') {
      return res.status(403).json({ message: "Forbidden - Super admin access required" });
    }
    next();
  };

  app.get("/api/super-admin/stats", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (err) {
      console.error("Error getting platform stats:", err);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  app.get("/api/super-admin/users", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsersWithStats();
      res.json(users);
    } catch (err) {
      console.error("Error getting users:", err);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.delete("/api/super-admin/users/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      if (userId === req.session.userId) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }
      await storage.deleteUserAndContent(userId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/super-admin/boards", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const boards = await storage.getAllBoardsWithOwners();
      res.json(boards);
    } catch (err) {
      console.error("Error getting boards:", err);
      res.status(500).json({ message: "Failed to get boards" });
    }
  });

  app.delete("/api/super-admin/boards/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const boardId = Number(req.params.id);
      await storage.deleteBoardFully(boardId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting board:", err);
      res.status(500).json({ message: "Failed to delete board" });
    }
  });

  // Game Types (Super Admin only for management)
  app.get("/api/super-admin/game-types", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const types = await storage.getGameTypes();
      res.json(types);
    } catch (err) {
      console.error("Error getting game types:", err);
      res.status(500).json({ message: "Failed to get game types" });
    }
  });

  app.patch("/api/super-admin/game-types/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { hostEnabled, playerEnabled, description, sortOrder } = req.body;
      const updated = await storage.updateGameType(id, { 
        hostEnabled, 
        playerEnabled, 
        description,
        sortOrder 
      });
      if (!updated) {
        return res.status(404).json({ message: "Game type not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating game type:", err);
      res.status(500).json({ message: "Failed to update game type" });
    }
  });

  // Game Types (public - for hosts and players)
  app.get("/api/game-types", async (req, res) => {
    try {
      const forHost = req.query.forHost === 'true';
      const types = await storage.getEnabledGameTypes(forHost);
      res.json(types);
    } catch (err) {
      console.error("Error getting enabled game types:", err);
      res.status(500).json({ message: "Failed to get game types" });
    }
  });

  // ===============================
  // Double Dip Routes
  // ===============================

  // Generate a random invite code
  function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Get or create pair for current user
  app.get("/api/double-dip/pair", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let pair = await storage.getDoubleDipPairForUser(userId);
      
      if (!pair) {
        // Check if user has a pending pair they created
        const pendingPair = await storage.getDoubleDipPairForUser(userId);
        if (pendingPair) {
          pair = pendingPair;
        }
      }
      
      res.json(pair || null);
    } catch (err) {
      console.error("Error getting pair:", err);
      res.status(500).json({ message: "Failed to get pair" });
    }
  });

  // Create a new pair (generate invite link)
  app.post("/api/double-dip/pair", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Check if user already has a pair
      const existingPair = await storage.getDoubleDipPairForUser(userId);
      if (existingPair) {
        return res.status(400).json({ message: "You already have a pair" });
      }
      
      const inviteCode = generateInviteCode();
      const pair = await storage.createDoubleDipPair({
        userAId: userId,
        inviteCode,
        status: 'pending',
      });
      
      res.json(pair);
    } catch (err) {
      console.error("Error creating pair:", err);
      res.status(500).json({ message: "Failed to create pair" });
    }
  });

  // Join a pair using invite code
  app.post("/api/double-dip/join/:code", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const code = req.params.code.toUpperCase();
      
      // Check if user already has a pair
      const existingPair = await storage.getDoubleDipPairForUser(userId);
      if (existingPair) {
        return res.status(400).json({ message: "You already have a pair" });
      }
      
      // Find the pair by invite code
      const pair = await storage.getDoubleDipPairByInviteCode(code);
      if (!pair) {
        return res.status(404).json({ message: "Invalid invite code" });
      }
      
      if (pair.status !== 'pending') {
        return res.status(400).json({ message: "This invite is no longer valid" });
      }
      
      if (pair.userAId === userId) {
        return res.status(400).json({ message: "You cannot join your own pair" });
      }
      
      // Update the pair with the second user
      const updatedPair = await storage.updateDoubleDipPair(pair.id, {
        userBId: userId,
        status: 'active',
      });
      
      res.json(updatedPair);
    } catch (err) {
      console.error("Error joining pair:", err);
      res.status(500).json({ message: "Failed to join pair" });
    }
  });

  // Get today's daily set for the pair
  app.get("/api/double-dip/daily", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const pair = await storage.getDoubleDipPairForUser(userId);
      
      if (!pair) {
        return res.status(404).json({ message: "No pair found" });
      }
      
      const today = new Date().toISOString().split('T')[0];
      let dailySet = await storage.getDoubleDipDailySet(pair.id, today);
      
      if (!dailySet) {
        // Generate new daily questions - one from each category
        const categories = ['deep_end', 'danger_zone', 'daily_loop', 'rewind', 'glitch'];
        const questionIds: number[] = [];
        
        for (const category of categories) {
          const questions = await storage.getDoubleDipQuestions(category);
          if (questions.length > 0) {
            const randomQ = questions[Math.floor(Math.random() * questions.length)];
            questionIds.push(randomQ.id);
          }
        }
        
        dailySet = await storage.createDoubleDipDailySet({
          pairId: pair.id,
          dateKey: today,
          questionIds,
        });
      }
      
      // Get the actual questions
      const allQuestions = await storage.getDoubleDipQuestions();
      const todayQuestions = allQuestions.filter(q => (dailySet!.questionIds as number[]).includes(q.id));
      
      // Get answers if any
      const answers = await storage.getDoubleDipAnswers(dailySet.id);
      
      // Determine user's role (A or B)
      const isUserA = pair.userAId === userId;
      const userCompleted = isUserA ? dailySet.userACompleted : dailySet.userBCompleted;
      const partnerCompleted = isUserA ? dailySet.userBCompleted : dailySet.userACompleted;
      
      // Filter answers based on reveal status
      let visibleAnswers = answers;
      if (!dailySet.revealed) {
        // Only show user's own answers
        visibleAnswers = answers.filter(a => a.userId === userId);
      }
      
      res.json({
        pair,
        dailySet,
        questions: todayQuestions,
        answers: visibleAnswers,
        userCompleted,
        partnerCompleted,
        isUserA,
        revealed: dailySet.revealed,
        streakCount: pair.streakCount,
      });
    } catch (err) {
      console.error("Error getting daily set:", err);
      res.status(500).json({ message: "Failed to get daily questions" });
    }
  });

  // Submit answers
  app.post("/api/double-dip/answers", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { dailySetId, answers } = req.body;
      
      const pair = await storage.getDoubleDipPairForUser(userId);
      if (!pair) {
        return res.status(404).json({ message: "No pair found" });
      }
      
      // Create answers
      for (const answer of answers) {
        await storage.createDoubleDipAnswer({
          dailySetId,
          questionId: answer.questionId,
          userId,
          answerText: answer.answerText,
        });
      }
      
      // Mark user as completed
      const isUserA = pair.userAId === userId;
      const today = new Date().toISOString().split('T')[0];
      const dailySet = await storage.getDoubleDipDailySet(pair.id, today);
      
      if (dailySet) {
        // Atomically set firstCompleterId (uses COALESCE - only sets if null)
        await storage.setDoubleDipFirstCompleterAtomic(dailySet.id, userId);
        
        // Update completion flag for current user
        const completionUpdate = isUserA 
          ? { userACompleted: true }
          : { userBCompleted: true };
        await storage.updateDoubleDipDailySet(dailySet.id, completionUpdate);
        
        // Re-fetch to get authoritative state after update
        const freshDailySet = await storage.getDoubleDipDailySet(pair.id, today);
        if (!freshDailySet) {
          return res.json({ success: true });
        }
        
        // Check if both are now completed using fresh data
        const bothCompleted = freshDailySet.userACompleted && freshDailySet.userBCompleted;
        const updateData: any = {};
        
        if (bothCompleted && !freshDailySet.revealed) {
          updateData.revealed = true;
          
          // Update streak
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayKey = yesterday.toISOString().split('T')[0];
          
          let newStreak = 1;
          if (pair.lastCompletedDate === yesterdayKey) {
            newStreak = pair.streakCount + 1;
          }
          
          await storage.updateDoubleDipPair(pair.id, {
            streakCount: newStreak,
            lastCompletedDate: today,
          });
          
          // Generate AI follow-up task and category insights
          try {
            const { generateFollowupTask, generateCategoryInsights } = await import("./ai");
            const allQuestions = await storage.getDoubleDipQuestions();
            const allAnswers = await storage.getDoubleDipAnswers(dailySet.id);
            const todayQuestions = allQuestions.filter(q => (dailySet.questionIds as number[]).includes(q.id));
            
            const questionsAndAnswers = todayQuestions.map(q => {
              const userAAnswer = allAnswers.find(a => a.questionId === q.id && a.userId === pair.userAId);
              const userBAnswer = allAnswers.find(a => a.questionId === q.id && a.userId === pair.userBId);
              return {
                category: q.category,
                question: q.questionText,
                userAAnswer: userAAnswer?.answerText || "",
                userBAnswer: userBAnswer?.answerText || "",
              };
            });
            
            // Generate both in parallel
            const [followupTask, categoryInsights] = await Promise.all([
              generateFollowupTask(questionsAndAnswers),
              generateCategoryInsights(questionsAndAnswers)
            ]);
            
            updateData.followupTask = followupTask;
            updateData.categoryInsights = categoryInsights;
            
            // Create milestone for high compatibility scores (with deduplication)
            try {
              for (const insight of categoryInsights) {
                const score = insight.compatibilityScore;
                const categoryName = insight.category.replace(/_/g, ' ');
                
                // Only create 90%+ milestones (most meaningful)
                if (score >= 90) {
                  // Check for existing milestone (use score as value for dedup)
                  const exists = await storage.checkDoubleDipMilestoneExists(pair.id, 'compatibility', 90);
                  if (!exists) {
                    await storage.createDoubleDipMilestone({
                      pairId: pair.id,
                      type: 'compatibility',
                      title: `Perfect Sync: ${categoryName}`,
                      description: `You both scored 90%+ compatibility in ${categoryName}!`,
                      value: score,
                      metadata: { category: insight.category },
                    });
                  }
                }
              }
            } catch (milestoneError) {
              console.error("Error creating compatibility milestones:", milestoneError);
            }
            
          } catch (aiError) {
            console.error("Error generating AI content:", aiError);
            updateData.followupTask = "Take 5 minutes to share one thing you appreciated about each other today.";
          }
          
          // Update weekly stake scores OUTSIDE AI block (runs even if AI fails)
          let weeklyStakeStatus: { status: string; message?: string; points?: { userA: number; userB: number } } = { status: 'not_configured' };
          try {
            if (freshDailySet.firstCompleterId && !freshDailySet.weeklyStakeScored) {
              const weekStart = getWeekStartDate();
              const weeklyStake = await storage.getDoubleDipWeeklyStake(pair.id, weekStart);
              if (weeklyStake && !weeklyStake.isRevealed) {
                // Calculate points: first completer gets 1 point
                const firstCompleter = freshDailySet.firstCompleterId;
                let userAPoints = firstCompleter === pair.userAId ? 1 : 0;
                let userBPoints = firstCompleter === pair.userBId ? 1 : 0;
                
                // Bonus point to both if high compatibility (85%+)
                // Try AI insights first, fall back to deterministic calculation
                let avgScore = 0;
                if (updateData.categoryInsights && updateData.categoryInsights.length > 0) {
                  avgScore = updateData.categoryInsights.reduce((sum: number, c: any) => sum + c.compatibilityScore, 0) / updateData.categoryInsights.length;
                } else {
                  // Fallback: compute deterministic compatibility from answers
                  try {
                    const allAnswers = await storage.getDoubleDipAnswers(freshDailySet.id);
                    const questionIds = (freshDailySet.questionIds as number[]) || [];
                    let matches = 0;
                    let total = 0;
                    for (const qId of questionIds) {
                      const userAAnswer = allAnswers.find(a => a.questionId === qId && a.userId === pair.userAId);
                      const userBAnswer = allAnswers.find(a => a.questionId === qId && a.userId === pair.userBId);
                      if (userAAnswer && userBAnswer) {
                        total++;
                        // Simple similarity: answers match if they share significant words
                        const wordsA = (userAAnswer.answerText || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
                        const wordsB = (userBAnswer.answerText || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
                        const overlap = wordsA.filter(w => wordsB.includes(w)).length;
                        if (overlap > 0 || (wordsA.length === 0 && wordsB.length === 0)) {
                          matches++;
                        }
                      }
                    }
                    avgScore = total > 0 ? (matches / total) * 100 : 0;
                  } catch (err) {
                    console.error("Error computing deterministic compatibility:", err);
                    avgScore = 0;
                  }
                }
                
                if (avgScore >= 85) {
                  userAPoints += 1;
                  userBPoints += 1;
                }
                
                // Atomic scoring - prevents double-counting, throws if stake missing
                try {
                  const scored = await storage.scoreDoubleDipDailyForWeeklyStake(
                    freshDailySet.id,
                    weeklyStake.id,
                    userAPoints,
                    userBPoints
                  );
                  
                  if (scored) {
                    (freshDailySet as any).weeklyStakeScored = true;
                    weeklyStakeStatus = { status: 'scored', points: { userA: userAPoints, userB: userBPoints } };
                    console.log(`Weekly stake scored for daily set ${freshDailySet.id}: A+${userAPoints}, B+${userBPoints}`);
                  } else {
                    weeklyStakeStatus = { status: 'already_scored' };
                    console.log(`Daily set ${freshDailySet.id} already scored for weekly stake`);
                  }
                } catch (scoringError: any) {
                  weeklyStakeStatus = { status: 'error', message: 'Failed to update weekly stake' };
                  console.error(`Weekly stake scoring failed: ${scoringError.message}`);
                }
              }
            } else if (freshDailySet.weeklyStakeScored) {
              weeklyStakeStatus = { status: 'already_scored' };
            }
          } catch (stakeError) {
            weeklyStakeStatus = { status: 'error', message: 'Failed to process weekly stake' };
            console.error("Error updating weekly stake:", stakeError);
          }
          updateData.weeklyStakeStatus = weeklyStakeStatus;
          
          // Create streak milestones (with deduplication and error handling)
          try {
            const streakMilestones: Record<number, string> = {
              3: "3-Day Streak! You're building a habit together.",
              7: "One Week Strong! A full week of connecting daily.",
              14: "Two Week Warriors! Your commitment is inspiring.",
              30: "Monthly Champions! 30 days of deepening your bond.",
              100: "Century Club! 100 days of love and connection.",
            };
            
            if (streakMilestones[newStreak]) {
              // Check if this streak milestone already exists
              const exists = await storage.checkDoubleDipMilestoneExists(pair.id, 'streak', newStreak);
              if (!exists) {
                await storage.createDoubleDipMilestone({
                  pairId: pair.id,
                  type: 'streak',
                  title: `Streak: ${newStreak} Days`,
                  description: streakMilestones[newStreak],
                  value: newStreak,
                });
              }
            }
          } catch (milestoneError) {
            console.error("Error creating streak milestone:", milestoneError);
          }
        }
        
        // Extract weeklyStakeStatus before persisting (not part of DB schema)
        const responseWeeklyStakeStatus = updateData.weeklyStakeStatus;
        delete updateData.weeklyStakeStatus;
        
        // Apply reveal-related updates if any
        if (Object.keys(updateData).length > 0) {
          await storage.updateDoubleDipDailySet(freshDailySet.id, updateData);
        }
        
        // Return success with weekly stake status for client visibility
        return res.json({ success: true, weeklyStake: responseWeeklyStakeStatus });
      }
      
      res.json({ success: true, weeklyStake: { status: 'not_revealed' } });
    } catch (err) {
      console.error("Error submitting answers:", err);
      res.status(500).json({ message: "Failed to submit answers" });
    }
  });

  // Add reaction to answer
  app.post("/api/double-dip/reactions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { answerId, reaction } = req.body;
      
      const newReaction = await storage.createDoubleDipReaction({
        answerId,
        userId,
        reaction,
      });
      
      res.json(newReaction);
    } catch (err) {
      console.error("Error adding reaction:", err);
      res.status(500).json({ message: "Failed to add reaction" });
    }
  });

  // Update anniversary date
  app.post("/api/double-dip/anniversary", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { anniversaryDate } = req.body;
      
      const pair = await storage.getDoubleDipPairForUser(userId);
      if (!pair) {
        return res.status(404).json({ message: "No pair found" });
      }
      
      // Update the pair with anniversary date
      await storage.updateDoubleDipPair(pair.id, { anniversaryDate });
      
      // Create anniversary milestone if not exists
      try {
        const exists = await storage.checkDoubleDipMilestoneExists(pair.id, 'anniversary', 0);
        if (!exists) {
          const date = new Date(anniversaryDate);
          const formattedDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          await storage.createDoubleDipMilestone({
            pairId: pair.id,
            type: 'anniversary',
            title: 'Anniversary Set',
            description: `Your anniversary is ${formattedDate}`,
            value: 0,
            metadata: { date: anniversaryDate },
          });
        }
      } catch (milestoneError) {
        console.error("Error creating anniversary milestone:", milestoneError);
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating anniversary:", err);
      res.status(500).json({ message: "Failed to update anniversary" });
    }
  });

  // Get vault (history)
  app.get("/api/double-dip/vault", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const pair = await storage.getDoubleDipPairForUser(userId);
      
      if (!pair) {
        return res.status(404).json({ message: "No pair found" });
      }
      
      // Get all revealed daily sets and questions
      const [dailySets, allQuestions] = await Promise.all([
        storage.getDoubleDipDailySets(pair.id),
        storage.getDoubleDipQuestions(),
      ]);
      
      // Build entries with questions and answers for each set
      const entries = await Promise.all(
        dailySets.map(async (dailySet) => {
          const answers = await storage.getDoubleDipAnswers(dailySet.id);
          const questions = allQuestions.filter(q => 
            (dailySet.questionIds as number[]).includes(q.id)
          );
          return { dailySet, questions, answers };
        })
      );
      
      // Get favorites with question data - fetch directly from storage
      const allFavorites = await storage.getDoubleDipFavorites(pair.id);
      const allQuestionsDb = await storage.getDoubleDipQuestions();
      
      // Build favorites by fetching answer data directly from database
      const favorites = await Promise.all(
        allFavorites.map(async (fav) => {
          // Fetch answer directly from database
          const answer = await storage.getDoubleDipAnswerById(fav.answerId);
          if (!answer) return null;
          
          const question = allQuestionsDb.find(q => q.id === answer.questionId);
          if (!question) return null;
          
          return { favorite: fav, answer, question };
        })
      );
      
      const validFavorites = favorites.filter((f): f is NonNullable<typeof f> => f !== null);
      
      res.json({
        entries,
        pair: { userAId: pair.userAId, userBId: pair.userBId },
        favorites: validFavorites,
      });
    } catch (err) {
      console.error("Error getting vault:", err);
      res.status(500).json({ message: "Failed to get vault" });
    }
  });

  // ===============================
  // Storyboard Routes
  // ===============================

  // Get storyboard (timeline of milestones and favorite answers)
  app.get("/api/double-dip/storyboard", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const pair = await storage.getDoubleDipPairForUser(userId);
      
      if (!pair) {
        return res.status(404).json({ message: "No pair found" });
      }
      
      // Get all data for storyboard
      const [milestones, favorites, dailySets, allQuestions] = await Promise.all([
        storage.getDoubleDipMilestones(pair.id),
        storage.getDoubleDipFavorites(pair.id),
        storage.getDoubleDipDailySets(pair.id),
        storage.getDoubleDipQuestions(),
      ]);
      
      // Get all answers for revealed sets
      const answersMap: Record<number, any[]> = {};
      for (const set of dailySets) {
        answersMap[set.id] = await storage.getDoubleDipAnswers(set.id);
      }
      
      // Build timeline items
      const timelineItems: any[] = [];
      
      // Add milestones to timeline
      for (const milestone of milestones) {
        timelineItems.push({
          type: 'milestone',
          id: `milestone-${milestone.id}`,
          date: milestone.createdAt,
          data: milestone,
        });
      }
      
      // Add favorite answers to timeline
      for (const fav of favorites) {
        const answer = Object.values(answersMap).flat().find((a: any) => a.id === fav.answerId);
        if (answer) {
          const question = allQuestions.find(q => q.id === answer.questionId);
          timelineItems.push({
            type: 'favorite',
            id: `favorite-${fav.id}`,
            date: fav.createdAt,
            data: {
              favorite: fav,
              answer,
              question,
            },
          });
        }
      }
      
      // Add revealed daily sets as entries
      for (const set of dailySets) {
        timelineItems.push({
          type: 'reveal',
          id: `reveal-${set.id}`,
          date: set.createdAt,
          data: {
            dailySet: set,
            answers: answersMap[set.id] || [],
            questions: allQuestions.filter(q => (set.questionIds as number[]).includes(q.id)),
          },
        });
      }
      
      // Sort by date descending
      timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      res.json({
        pair,
        timeline: timelineItems,
        stats: {
          totalDays: dailySets.length,
          currentStreak: pair.streakCount,
          totalFavorites: favorites.length,
          totalMilestones: milestones.length,
        },
      });
    } catch (err) {
      console.error("Error getting storyboard:", err);
      res.status(500).json({ message: "Failed to get storyboard" });
    }
  });

  // Toggle favorite on an answer
  app.post("/api/double-dip/favorites", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { answerId } = req.body;
      
      const pair = await storage.getDoubleDipPairForUser(userId);
      if (!pair) {
        return res.status(404).json({ message: "No pair found" });
      }
      
      // Check if already favorited
      const existing = await storage.getDoubleDipFavorite(answerId, userId);
      
      if (existing) {
        // Remove favorite
        await storage.deleteDoubleDipFavorite(answerId, userId);
        res.json({ favorited: false });
      } else {
        // Add favorite
        await storage.createDoubleDipFavorite({
          pairId: pair.id,
          answerId,
          userId,
        });
        res.json({ favorited: true });
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  // Get milestones
  app.get("/api/double-dip/milestones", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const pair = await storage.getDoubleDipPairForUser(userId);
      
      if (!pair) {
        return res.status(404).json({ message: "No pair found" });
      }
      
      const milestones = await storage.getDoubleDipMilestones(pair.id);
      res.json(milestones);
    } catch (err) {
      console.error("Error getting milestones:", err);
      res.status(500).json({ message: "Failed to get milestones" });
    }
  });

  // Get user's favorites for current session (to show heart states)
  app.get("/api/double-dip/favorites", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const pair = await storage.getDoubleDipPairForUser(userId);
      
      if (!pair) {
        return res.status(404).json({ message: "No pair found" });
      }
      
      const favorites = await storage.getDoubleDipFavorites(pair.id);
      // Filter to only user's favorites
      const userFavorites = favorites.filter(f => f.userId === userId);
      res.json(userFavorites);
    } catch (err) {
      console.error("Error getting favorites:", err);
      res.status(500).json({ message: "Failed to get favorites" });
    }
  });

  // Get current week's stake
  app.get("/api/double-dip/weekly-stake", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const pair = await storage.getDoubleDipPairForUser(userId);
      
      if (!pair) {
        return res.status(404).json({ message: "No pair found" });
      }
      
      const weekStart = getWeekStartDate();
      const stake = await storage.getDoubleDipWeeklyStake(pair.id, weekStart);
      
      res.json({ stake, weekStart, isUserA: pair.userAId === userId });
    } catch (err) {
      console.error("Error getting weekly stake:", err);
      res.status(500).json({ message: "Failed to get weekly stake" });
    }
  });

  // Set weekly stake
  app.post("/api/double-dip/weekly-stake", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { stakeId } = req.body;
      
      // Validate stakeId
      const { SYNC_STAKES } = await import("@shared/schema");
      const validStakeIds = SYNC_STAKES.map(s => s.id);
      if (!stakeId || !validStakeIds.includes(stakeId)) {
        return res.status(400).json({ message: "Invalid stake selection" });
      }
      
      const pair = await storage.getDoubleDipPairForUser(userId);
      if (!pair) {
        return res.status(404).json({ message: "No pair found" });
      }
      
      const weekStart = getWeekStartDate();
      let stake = await storage.getDoubleDipWeeklyStake(pair.id, weekStart);
      
      if (!stake) {
        stake = await storage.createDoubleDipWeeklyStake({
          pairId: pair.id,
          weekStartDate: weekStart,
          stakeId,
        });
      }
      
      res.json({ stake, weekStart });
    } catch (err) {
      console.error("Error setting weekly stake:", err);
      res.status(500).json({ message: "Failed to set weekly stake" });
    }
  });

  // Reveal weekly winner (called on Sunday)
  app.post("/api/double-dip/weekly-stake/reveal", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const pair = await storage.getDoubleDipPairForUser(userId);
      
      if (!pair) {
        return res.status(404).json({ message: "No pair found" });
      }
      
      const weekStart = getWeekStartDate();
      const stake = await storage.getDoubleDipWeeklyStake(pair.id, weekStart);
      
      if (!stake) {
        return res.status(404).json({ message: "No stake for this week" });
      }
      
      if (stake.isRevealed) {
        return res.json({ stake });
      }
      
      const winnerId = stake.userAScore > stake.userBScore ? pair.userAId : 
                       stake.userBScore > stake.userAScore ? pair.userBId : null;
      
      const updatedStake = await storage.updateDoubleDipWeeklyStake(stake.id, {
        isRevealed: true,
        winnerId,
      });
      
      res.json({ stake: updatedStake });
    } catch (err) {
      console.error("Error revealing weekly stake:", err);
      res.status(500).json({ message: "Failed to reveal weekly stake" });
    }
  });

  return httpServer;
}

function getWeekStartDate(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  const weekStart = new Date(now.setDate(diff));
  return weekStart.toISOString().split('T')[0];
}
