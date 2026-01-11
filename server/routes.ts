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

  // Board routes - protected (hosts only)
  app.get("/api/boards", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const boards = await storage.getBoards(userId);
    res.json(boards);
  });

  app.get("/api/boards/summary", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const summaries = await storage.getBoardSummaries(userId);
    res.json(summaries);
  });

  app.get("/api/boards/:id", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const board = await storage.getBoard(Number(req.params.id), userId);
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
      const { name, description, pointValues } = req.body;
      const board = await storage.updateBoard(Number(req.params.id), {
        name,
        description,
        pointValues,
      }, userId);
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
    const deleted = await storage.deleteBoard(Number(req.params.id), userId);
    if (!deleted) {
      return res.status(404).json({ message: "Board not found" });
    }
    res.json({ success: true });
  });

  // Board categories (junction table) - protected
  app.get("/api/boards/:boardId/categories", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const boardId = Number(req.params.boardId);
    const board = await storage.getBoard(boardId, userId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }
    const boardCategories = await storage.getBoardCategories(boardId);
    res.json(boardCategories);
  });

  app.post("/api/boards/:boardId/categories", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const boardId = Number(req.params.boardId);
      const board = await storage.getBoard(boardId, userId);
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
    const bc = await storage.getBoardCategory(Number(req.params.id));
    if (!bc) {
      return res.status(404).json({ message: "Board category link not found" });
    }
    const board = await storage.getBoard(bc.boardId, userId);
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
      const boardId = Number(req.params.boardId);
      const board = await storage.getBoard(boardId, userId);
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
      const boardId = Number(req.params.boardId);
      const board = await storage.getBoard(boardId, userId);
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
  async function verifyBoardCategoryOwnership(boardCategoryId: number, userId: string) {
    const bc = await storage.getBoardCategory(boardCategoryId);
    if (!bc) return null;
    const board = await storage.getBoard(bc.boardId, userId);
    if (!board) return null;
    return bc;
  }

  // Questions (by board-category) - protected
  app.get("/api/board-categories/:boardCategoryId/questions", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const bc = await verifyBoardCategoryOwnership(Number(req.params.boardCategoryId), userId);
    if (!bc) {
      return res.status(404).json({ message: "Board category not found" });
    }
    const questions = await storage.getQuestionsByBoardCategory(Number(req.params.boardCategoryId));
    res.json(questions);
  });

  app.post(api.questions.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const data = api.questions.create.input.parse(req.body);
      const bc = await verifyBoardCategoryOwnership(data.boardCategoryId, userId);
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
      const data = api.questions.update.input.parse(req.body);
      const existingQuestion = await storage.getQuestion(Number(req.params.id));
      if (!existingQuestion) {
        return res.status(404).json({ message: 'Question not found' });
      }
      const bc = await verifyBoardCategoryOwnership(existingQuestion.boardCategoryId, userId);
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
    const existingQuestion = await storage.getQuestion(Number(req.params.id));
    if (!existingQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }
    const bc = await verifyBoardCategoryOwnership(existingQuestion.boardCategoryId, userId);
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
      const { answer } = api.questions.verifyAnswer.input.parse(req.body);
      const question = await storage.getQuestion(Number(req.params.id));
      
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }
      
      const bc = await verifyBoardCategoryOwnership(question.boardCategoryId, userId);
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
      const board = await storage.getBoard(Number(req.params.id), userId);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      const categoriesWithQuestions = await storage.getBoardWithCategoriesAndQuestions(Number(req.params.id), userId);
      res.json({ board, categories: categoriesWithQuestions });
    } catch (err) {
      console.error("Error getting full board:", err);
      res.status(500).json({ message: "Failed to get board data" });
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

  return httpServer;
}
