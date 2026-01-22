import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import { setupWebSocket, getRoomInfo, getOrRestoreSession } from "./gameRoom";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { getPlayedCategoryStatus, getContentStats, getActiveCategoriesForTenant } from "./buzzkillBoards";
import { SOURCE_GROUPS, type SourceGroup, type Question } from "@shared/schema";

// Required point values for a category to go LIVE
const REQUIRED_POINTS = [10, 20, 30, 40, 50] as const;

// Helper to validate numeric ID from request params
// Returns the parsed number or null if invalid
function parseId(value: string): number | null {
  const id = Number(value);
  if (isNaN(id) || !Number.isInteger(id) || id < 0) {
    return null;
  }
  return id;
}

// Validate if a category can be set to LIVE (isActive = true)
// Returns { valid: true } or { valid: false, error: string }
async function validateCategoryForLive(categoryId: number): Promise<{ valid: boolean; error?: string }> {
  const questions = await storage.getQuestionsForCategory(categoryId);
  
  if (questions.length !== 5) {
    return { 
      valid: false, 
      error: `Category needs exactly 5 questions (has ${questions.length})` 
    };
  }
  
  const pointsSet = new Set(questions.map(q => q.points));
  
  // Check for duplicates
  if (pointsSet.size !== 5) {
    const pointCounts: Record<number, number> = {};
    questions.forEach(q => {
      pointCounts[q.points] = (pointCounts[q.points] || 0) + 1;
    });
    const duplicates = Object.entries(pointCounts)
      .filter(([_, count]) => count > 1)
      .map(([points]) => points);
    return {
      valid: false,
      error: `Point Collision: Category has multiple ${duplicates.join(', ')}-point questions`
    };
  }
  
  // Check all required points are present
  const missingPoints = REQUIRED_POINTS.filter(p => !pointsSet.has(p));
  if (missingPoints.length > 0) {
    return {
      valid: false,
      error: `Missing questions for points: ${missingPoints.join(', ')}`
    };
  }
  
  return { valid: true };
}

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

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
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
  
  // Auto-assign colors to existing boards that don't have one
  const BOARD_COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ec4899', // Pink
  ];
  
  try {
    const allBoards = await storage.getBoards('system', 'super_admin');
    for (const board of allBoards) {
      if (!board.colorCode) {
        // Use board.id for deterministic color assignment
        const colorIndex = (board.id - 1) % BOARD_COLORS.length;
        await storage.updateBoard(board.id, { colorCode: BOARD_COLORS[colorIndex] }, 'system', 'super_admin');
      }
    }
    console.log(`Checked ${allBoards.length} boards for color assignment`);
  } catch (err) {
    console.error('Error assigning colors to boards:', err);
  }
  
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
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const boards = await storage.getBoards(userId, role);
      res.json(boards);
    } catch (err) {
      console.error("Error fetching boards:", err);
      res.status(500).json({ message: "Failed to fetch boards" });
    }
  });

  app.get("/api/boards/summary", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const summaries = await storage.getBoardSummaries(userId, role);
      res.json(summaries);
    } catch (err) {
      console.error("Error fetching board summaries:", err);
      res.status(500).json({ message: "Failed to fetch board summaries" });
    }
  });

  app.get("/api/boards/:id", isAuthenticated, async (req, res) => {
    try {
      const boardId = parseId(req.params.id);
      if (boardId === null) {
        return res.status(400).json({ message: "Invalid board ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const board = await storage.getBoard(boardId, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.json(board);
    } catch (err) {
      console.error("Error fetching board:", err);
      res.status(500).json({ message: "Failed to fetch board" });
    }
  });

  app.post("/api/boards", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const { name, description, pointValues } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      // Auto-assign a color based on total board count (use super_admin view to get all boards)
      const allBoards = await storage.getBoards(userId, 'super_admin');
      const colorIndex = allBoards.length % BOARD_COLORS.length;
      const autoColor = BOARD_COLORS[colorIndex];
      
      const board = await storage.createBoard({
        name,
        description: description || null,
        pointValues: pointValues || [10, 20, 30, 40, 50],
        colorCode: autoColor,
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
      const boardId = parseId(req.params.id);
      if (boardId === null) {
        return res.status(400).json({ message: "Invalid board ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const { name, description, pointValues, theme, isGlobal, sortOrder } = req.body;
      const board = await storage.updateBoard(boardId, {
        name,
        description,
        pointValues,
        theme,
        isGlobal,
        sortOrder,
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
    try {
      const boardId = parseId(req.params.id);
      if (boardId === null) {
        return res.status(400).json({ message: "Invalid board ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const deleted = await storage.deleteBoard(boardId, userId, role);
      if (!deleted) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting board:", err);
      res.status(500).json({ message: "Failed to delete board" });
    }
  });

  // Board categories (junction table) - protected
  app.get("/api/boards/:boardId/categories", isAuthenticated, async (req, res) => {
    try {
      const boardId = parseId(req.params.boardId);
      if (boardId === null) {
        return res.status(400).json({ message: "Invalid board ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const board = await storage.getBoard(boardId, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      const boardCategories = await storage.getBoardCategories(boardId);
      res.json(boardCategories);
    } catch (err) {
      console.error("Error fetching board categories:", err);
      res.status(500).json({ message: "Failed to fetch board categories" });
    }
  });

  app.post("/api/boards/:boardId/categories", isAuthenticated, async (req, res) => {
    try {
      const boardId = parseId(req.params.boardId);
      if (boardId === null) {
        return res.status(400).json({ message: "Invalid board ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const board = await storage.getBoard(boardId, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      const { categoryId } = req.body;
      if (!categoryId || typeof categoryId !== 'number') {
        return res.status(400).json({ message: "categoryId is required and must be a number" });
      }
      // Verify category exists
      const category = await storage.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      const existingLinks = await storage.getBoardCategoriesByCategoryId(categoryId);
      if (existingLinks.length > 0) {
        return res.status(400).json({ message: "Category is already linked to another board" });
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
    try {
      const bcId = parseId(req.params.id);
      if (bcId === null) {
        return res.status(400).json({ message: "Invalid board-category ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const bc = await storage.getBoardCategory(bcId);
      if (!bc) {
        return res.status(404).json({ message: "Board category link not found" });
      }
      const board = await storage.getBoard(bc.boardId, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      const deleted = await storage.deleteBoardCategory(bcId);
      if (!deleted) {
        return res.status(404).json({ message: "Board category link not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting board-category link:", err);
      res.status(500).json({ message: "Failed to delete board-category link" });
    }
  });

  app.put("/api/boards/:boardId/categories/reorder", isAuthenticated, async (req, res) => {
    try {
      const boardId = parseId(req.params.boardId);
      if (boardId === null) {
        return res.status(400).json({ message: "Invalid board ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
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
      const boardId = parseId(req.params.boardId);
      if (boardId === null) {
        return res.status(400).json({ message: "Invalid board ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const board = await storage.getBoard(boardId, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      const { name, description, rule, sourceGroup } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Category name is required" });
      }
      const currentCategories = await storage.getBoardCategories(boardId);
      if (currentCategories.length >= 5) {
        return res.status(400).json({ message: "Board already has 5 categories (maximum)" });
      }
      const category = await storage.createCategory({ name: name.trim(), description: description?.trim() || '', rule: rule?.trim() || null, imageUrl: '', sourceGroup: sourceGroup || null });
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

  // Legacy redirect for backwards compatibility with old endpoint
  app.get("/api/admin/categories", isAuthenticated, (req, res) => {
    res.redirect(307, "/api/categories");
  });

  // Categories owned by user (via their boards) - protected
  app.get(api.categories.list.path, isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const categories = await storage.getCategoriesForUser(userId, role);
    res.json(categories);
  });

  // Categories with question counts - for admin panel progress display
  app.get("/api/categories/with-counts", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const categories = await storage.getCategoriesForUser(userId, role);
      const result = await Promise.all(
        categories.map(async (cat) => {
          const questions = await storage.getQuestionsByCategory(cat.id);
          return { ...cat, questionCount: questions.length };
        })
      );
      res.json(result);
    } catch (err) {
      console.error("Error fetching categories with counts:", err);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get(api.categories.get.path, isAuthenticated, async (req, res) => {
    const categoryId = parseId(req.params.id);
    if (categoryId === null) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    
    const userId = req.session.userId!;
    const role = req.session.userRole;
    
    // Verify ownership
    const hasAccess = await verifyCategoryOwnership(categoryId, userId, role);
    if (!hasAccess) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    const category = await storage.getCategory(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  });

  // Standalone category creation - restricted to super_admin only (regular users use create-and-link)
  app.post(api.categories.create.path, isAuthenticated, async (req, res) => {
    try {
      const role = req.session.userRole;
      // Only super_admin can create standalone (orphan) categories
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Use the board's create-and-link endpoint to create categories" });
      }
      
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
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const categoryId = Number(req.params.id);
      
      // Verify ownership
      const hasAccess = await verifyCategoryOwnership(categoryId, userId, role);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to edit this category" });
      }
      
      const { name, description, rule, imageUrl, isActive, sourceGroup } = req.body;
      
      // If trying to set isActive = true, validate the category first
      if (isActive === true) {
        const validation = await validateCategoryForLive(categoryId);
        if (!validation.valid) {
          return res.status(400).json({ 
            message: validation.error,
            validationError: true 
          });
        }
      }
      
      const category = await storage.updateCategory(categoryId, {
        name,
        description,
        rule,
        imageUrl,
        isActive,
        sourceGroup,
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
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const categoryId = Number(req.params.id);
    
    // Verify ownership
    const hasAccess = await verifyCategoryOwnership(categoryId, userId, role);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have permission to delete this category" });
    }
    
    const deleted = await storage.deleteCategory(categoryId);
    if (!deleted) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ success: true });
  });

  // Helper to verify category exists (categories are global, no ownership check needed for read)
  async function verifyCategoryExists(categoryId: number) {
    return await storage.getCategory(categoryId);
  }

  // Helper to verify user has access to a category (owns the board it belongs to, or is super_admin)
  async function verifyCategoryOwnership(categoryId: number, userId: string, role?: string): Promise<boolean> {
    if (role === 'super_admin') return true;
    
    // Find all boards this category is linked to
    const boardCategoryLinks = await storage.getBoardCategoriesByCategoryId(categoryId);
    if (boardCategoryLinks.length === 0) {
      // Orphan category - only super_admin can manage
      return false;
    }
    
    // Check if user owns any of the linked boards
    for (const link of boardCategoryLinks) {
      const board = await storage.getBoard(link.boardId, userId, role);
      if (board) return true;
    }
    return false;
  }

  // Helper to verify user has access to a question (via category ownership)
  async function verifyQuestionOwnership(questionId: number, userId: string, role?: string): Promise<boolean> {
    if (role === 'super_admin') return true;
    
    const question = await storage.getQuestion(questionId);
    if (!question) return false;
    
    return verifyCategoryOwnership(question.categoryId, userId, role);
  }

  // Questions (by category) - protected with ownership check
  app.get("/api/categories/:categoryId/questions", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const categoryId = Number(req.params.categoryId);
    
    // Verify ownership
    const hasAccess = await verifyCategoryOwnership(categoryId, userId, role);
    if (!hasAccess) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    const category = await verifyCategoryExists(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    const questions = await storage.getQuestionsByCategory(categoryId);
    res.json(questions);
  });

  app.post(api.questions.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const data = api.questions.create.input.parse(req.body);
      const category = await verifyCategoryExists(data.categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Verify ownership
      const hasAccess = await verifyCategoryOwnership(data.categoryId, userId, role);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to add questions to this category" });
      }
      
      const existingQuestions = await storage.getQuestionsByCategory(data.categoryId);
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
      console.error("Error creating question:", err);
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  app.put(api.questions.update.path, isAuthenticated, async (req, res) => {
    try {
      const questionId = parseId(req.params.id);
      if (questionId === null) {
        return res.status(400).json({ message: 'Invalid question ID' });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const data = api.questions.update.input.parse(req.body);
      const existingQuestion = await storage.getQuestion(questionId);
      if (!existingQuestion) {
        return res.status(404).json({ message: 'Question not found' });
      }
      
      // Verify ownership
      const hasAccess = await verifyCategoryOwnership(existingQuestion.categoryId, userId, role);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to edit this question" });
      }
      
      const category = await verifyCategoryExists(existingQuestion.categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      if (data.points !== undefined && data.points !== existingQuestion.points) {
        const siblingQuestions = await storage.getQuestionsByCategory(existingQuestion.categoryId);
        if (siblingQuestions.some(q => q.id !== existingQuestion.id && q.points === data.points)) {
          return res.status(400).json({ message: `A ${data.points}-point question already exists in this category` });
        }
      }
      const question = await storage.updateQuestion(questionId, data);
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
    const questionId = parseId(req.params.id);
    if (questionId === null) {
      return res.status(400).json({ message: 'Invalid question ID' });
    }
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const existingQuestion = await storage.getQuestion(questionId);
    if (!existingQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    // Verify ownership
    const hasAccess = await verifyCategoryOwnership(existingQuestion.categoryId, userId, role);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have permission to delete this question" });
    }
    
    const category = await verifyCategoryExists(existingQuestion.categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    const deleted = await storage.deleteQuestion(questionId);
    if (!deleted) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json({ success: true });
  });

  // Bulk import questions with validation
  const MAX_BULK_IMPORT = 50;
  const MAX_QUESTION_LENGTH = 1000;
  const MAX_ANSWER_LENGTH = 500;
  
  app.post("/api/categories/:categoryId/questions/bulk", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const categoryId = Number(req.params.categoryId);
      const category = await verifyCategoryExists(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Verify ownership
      const hasAccess = await verifyCategoryOwnership(categoryId, userId, role);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to import questions to this category" });
      }

      // Standard point values for categories
      const validPointValues = [10, 20, 30, 40, 50];

      const { questions } = req.body as { questions: Array<{ question: string; correctAnswer: string; points: number; imageUrl?: string }> };
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "No questions provided" });
      }
      
      if (questions.length > MAX_BULK_IMPORT) {
        return res.status(400).json({ message: `Maximum ${MAX_BULK_IMPORT} questions per import` });
      }

      const existingQuestions = await storage.getQuestionsByCategory(categoryId);
      const existingPoints = new Set(existingQuestions.map(q => q.points));
      const results: { success: number; errors: string[] } = { success: 0, errors: [] };

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionText = typeof q.question === 'string' ? q.question.trim() : '';
        const answerText = typeof q.correctAnswer === 'string' ? q.correctAnswer.trim() : '';
        const points = typeof q.points === 'number' ? q.points : 0;
        
        if (!questionText || !answerText || !points) {
          results.errors.push(`Line ${i + 1}: Missing required fields`);
          continue;
        }
        if (questionText.length > MAX_QUESTION_LENGTH) {
          results.errors.push(`Line ${i + 1}: Question too long (max ${MAX_QUESTION_LENGTH} chars)`);
          continue;
        }
        if (answerText.length > MAX_ANSWER_LENGTH) {
          results.errors.push(`Line ${i + 1}: Answer too long (max ${MAX_ANSWER_LENGTH} chars)`);
          continue;
        }
        if (!validPointValues.includes(points)) {
          results.errors.push(`Line ${i + 1}: Invalid point value (must be: ${validPointValues.join(', ')})`);
          continue;
        }
        if (existingPoints.has(points)) {
          results.errors.push(`Line ${i + 1}: ${points}-point question already exists`);
          continue;
        }
        if (existingQuestions.length + results.success >= 5) {
          results.errors.push(`Line ${i + 1}: Category already has 5 questions (maximum)`);
          continue;
        }
        try {
          await storage.createQuestion({
            categoryId,
            question: questionText,
            options: [],
            correctAnswer: answerText,
            points,
            imageUrl: typeof q.imageUrl === 'string' && q.imageUrl.trim() ? q.imageUrl.trim() : undefined,
          });
          existingPoints.add(points);
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
      
      // Verify ownership - only allow hosts to verify answers for their own questions
      const hasAccess = await verifyCategoryOwnership(question.categoryId, userId, role);
      if (!hasAccess) {
        return res.status(404).json({ message: 'Question not found' });
      }
      
      const category = await verifyCategoryExists(question.categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
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

  // === SMART CATEGORY MANAGEMENT (Buzzkill) ===
  
  // Get all categories grouped by source group
  // Get all categories grouped by source - super admin only
  app.get("/api/buzzkill/category-groups", isAuthenticated, async (req, res) => {
    try {
      const role = req.session.userRole;
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }
      const grouped = await storage.getCategoriesBySourceGroup();
      const result: Record<string, any[]> = {};
      grouped.forEach((cats, group) => {
        result[group] = cats;
      });
      res.json({ groups: result, sourceGroups: SOURCE_GROUPS });
    } catch (err) {
      console.error("Error getting category groups:", err);
      res.status(500).json({ message: "Failed to get category groups" });
    }
  });

  // Update a category's source group (Super Admin only)
  app.patch("/api/categories/:id/source-group", isAuthenticated, async (req, res) => {
    try {
      const role = req.session.userRole;
      // Only Super Admins can update category source groups
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Only Super Admins can update category source groups" });
      }
      const { sourceGroup } = req.body;
      if (sourceGroup && !SOURCE_GROUPS.includes(sourceGroup)) {
        return res.status(400).json({ message: "Invalid source group. Must be A, B, C, D, or E" });
      }
      const updated = await storage.updateCategory(Number(req.params.id), { 
        sourceGroup: sourceGroup || null 
      });
      if (!updated) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating category source group:", err);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  // Get active categories for gameplay - only show global boards or boards owned by user
  app.get("/api/buzzkill/active-categories", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const allCategories = await getActiveCategoriesForTenant();
      
      // Filter to only show categories from:
      // 1. Global boards (isGlobal = true)
      // 2. Boards owned by this user
      // 3. All boards if super_admin
      const filteredCategories = role === 'super_admin' 
        ? allCategories
        : allCategories.filter(cat => cat.board.isGlobal || cat.board.userId === userId);
      
      res.json({ categories: filteredCategories });
    } catch (err) {
      console.error("Error getting active categories:", err);
      res.status(500).json({ message: "Failed to get active categories" });
    }
  });

  // Get content stats for admin dashboard - super admin only (shows global stats)
  app.get("/api/buzzkill/content-stats", isAuthenticated, async (req, res) => {
    try {
      const role = req.session.userRole;
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }
      const stats = await getContentStats();
      res.json(stats);
    } catch (err) {
      console.error("Error getting content stats:", err);
      res.status(500).json({ message: "Failed to get content stats" });
    }
  });

  // Get played category status for a session - verify session ownership
  app.get("/api/buzzkill/session/:sessionId/played", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const sessionId = Number(req.params.sessionId);
      
      // Verify session ownership
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      if (session.hostId !== userId && role !== 'super_admin') {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const status = await getPlayedCategoryStatus(sessionId);
      res.json(status);
    } catch (err) {
      console.error("Error getting played status:", err);
      res.status(500).json({ message: "Failed to get played status" });
    }
  });

  // Reset played categories for a session - verify session ownership
  app.post("/api/buzzkill/session/:sessionId/reset-played", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const sessionId = Number(req.params.sessionId);
      
      // Verify session ownership
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      if (session.hostId !== userId && role !== 'super_admin') {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      await storage.resetSessionPlayedCategories(sessionId);
      res.json({ success: true, message: "Played categories reset" });
    } catch (err) {
      console.error("Error resetting played categories:", err);
      res.status(500).json({ message: "Failed to reset played categories" });
    }
  });

  // Get themed categories by group (public for gameplay)
  // Get themed categories - super admin only (exposes all categories by source group)
  app.get("/api/buzzkill/themed/:group", isAuthenticated, async (req, res) => {
    try {
      const role = req.session.userRole;
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }
      const group = req.params.group.toUpperCase() as typeof SOURCE_GROUPS[number];
      if (!SOURCE_GROUPS.includes(group)) {
        return res.status(400).json({ message: "Invalid group. Must be A, B, C, D, or E" });
      }
      const grouped = await storage.getCategoriesBySourceGroup();
      const categories = grouped.get(group) || [];
      res.json({ group, categories });
    } catch (err) {
      console.error("Error getting themed categories:", err);
      res.status(500).json({ message: "Failed to get themed categories" });
    }
  });

  // Get all playable boards for Buzzkill game selection (authenticated)
  app.get("/api/buzzkill/boards", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const allBoards = await storage.getBoards(userId, role);
      
      const summaries = await storage.getBoardSummaries(userId, role);
      const boardsWithStatus = allBoards.map(board => {
        const summary = summaries.find(s => s.id === board.id);
        const categoryCount = summary?.categoryCount || 0;
        const totalQuestions = summary?.categories.reduce((sum, c) => sum + c.questionCount, 0) || 0;
        const maxQuestions = categoryCount * 5;
        const isComplete = categoryCount >= 5 && totalQuestions >= maxQuestions && maxQuestions > 0;
        const isPlayable = categoryCount >= 1 && totalQuestions >= 1;
        
        return {
          ...board,
          categoryCount,
          totalQuestions,
          isComplete,
          isPlayable,
        };
      });
      
      res.json(boardsWithStatus);
    } catch (error) {
      console.error("Error fetching buzzkill boards:", error);
      res.status(500).json({ message: "Failed to fetch boards" });
    }
  });

  // Get custom boards for Buzzkill game selection (authenticated - returns only user's non-global boards)
  app.get("/api/buzzkill/custom-boards", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const allBoards = await storage.getBoards(userId, role);
      const customBoards = allBoards.filter(b => !b.isGlobal);
      
      const summaries = await storage.getBoardSummaries(userId, role);
      const boardsWithStatus = customBoards.map(board => {
        const summary = summaries.find(s => s.id === board.id);
        const categoryCount = summary?.categoryCount || 0;
        const totalQuestions = summary?.categories.reduce((sum, c) => sum + c.questionCount, 0) || 0;
        const maxQuestions = categoryCount * 5;
        const isComplete = categoryCount >= 5 && totalQuestions >= maxQuestions && maxQuestions > 0;
        const isPlayable = categoryCount >= 1 && totalQuestions >= 1;
        
        return {
          ...board,
          categoryCount,
          totalQuestions,
          isComplete,
          isPlayable,
        };
      });
      
      res.json(boardsWithStatus);
    } catch (err) {
      console.error("Error getting custom boards:", err);
      res.status(500).json({ message: "Failed to get custom boards" });
    }
  });

  // Get preset/global boards for Buzzkill game selection (themed boards)
  app.get("/api/buzzkill/preset-boards", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const globalBoards = await storage.getGlobalBoards();
      
      const summaries = await storage.getBoardSummaries(userId, role);
      // Sort by ID to maintain Excel order
      const sortedBoards = [...globalBoards].sort((a, b) => a.id - b.id);
      const boardsWithStatus = sortedBoards.map(board => {
        const summary = summaries.find(s => s.id === board.id);
        const categoryCount = summary?.categoryCount || 0;
        const totalQuestions = summary?.categories.reduce((sum, c) => sum + c.questionCount, 0) || 0;
        const maxQuestions = categoryCount * 5;
        const isComplete = categoryCount >= 5 && totalQuestions >= maxQuestions && maxQuestions > 0;
        const isPlayable = categoryCount >= 1 && totalQuestions >= 1;
        
        return {
          ...board,
          categoryCount,
          totalQuestions,
          isComplete,
          isPlayable,
        };
      });
      
      res.json(boardsWithStatus);
    } catch (err) {
      console.error("Error getting preset boards:", err);
      res.status(500).json({ message: "Failed to get preset boards" });
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
      const role = req.session.userRole;
      // Only Super Admins can create decks
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Only Super Admins can create decks" });
      }
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
      // Only Super Admins can update decks
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Only Super Admins can update decks" });
      }
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
    // Only Super Admins can delete decks
    if (role !== 'super_admin') {
      return res.status(403).json({ message: "Only Super Admins can delete decks" });
    }
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
      // Only Super Admins can create cards
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Only Super Admins can create cards" });
      }
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
      const role = req.session.userRole;
      // Only Super Admins can update cards
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Only Super Admins can update cards" });
      }
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
    const role = req.session.userRole;
    // Only Super Admins can delete cards
    if (role !== 'super_admin') {
      return res.status(403).json({ message: "Only Super Admins can delete cards" });
    }
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
        avatar: p.avatar,
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

  // Host analytics - get session history
  app.get("/api/host/sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const sessions = await storage.getHostSessionsWithDetails(userId);
      res.json(sessions);
    } catch (err) {
      console.error("Error getting host sessions:", err);
      res.status(500).json({ message: "Failed to get sessions" });
    }
  });

  // Host analytics - get summary stats
  app.get("/api/host/analytics", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const analytics = await storage.getHostAnalytics(userId);
      res.json(analytics);
    } catch (err) {
      console.error("Error getting host analytics:", err);
      res.status(500).json({ message: "Failed to get analytics" });
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

  app.patch("/api/super-admin/boards/:id/global", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const boardId = Number(req.params.id);
      const { isGlobal } = req.body;
      const updated = await storage.setGlobalBoard(boardId, isGlobal);
      if (!updated) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating board global status:", err);
      res.status(500).json({ message: "Failed to update board" });
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
      const { hostEnabled, playerEnabled, description, sortOrder, status } = req.body;
      const updated = await storage.updateGameType(id, { 
        hostEnabled, 
        playerEnabled, 
        description,
        sortOrder,
        status
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

  // Manual seed endpoint - triggers database seeding for missing game types
  app.post("/api/super-admin/seed", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      console.log("Manual seed triggered by super admin");
      await storage.seedGameTypes();
      const types = await storage.getGameTypes();
      res.json({ message: "Seed completed", gameTypes: types });
    } catch (err) {
      console.error("Error running seed:", err);
      res.status(500).json({ message: "Failed to run seed" });
    }
  });

  // Export Starter Packs - returns all global boards with their categories and questions
  app.get("/api/super-admin/starter-packs/export", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const boards = await storage.getGlobalBoards();
      const exportData = [];
      
      for (const board of boards) {
        const boardCategories = await storage.getBoardCategories(board.id);
        const categoriesWithQuestions = [];
        
        for (const bc of boardCategories) {
          const questions = await storage.getQuestionsByCategory(bc.categoryId);
          categoriesWithQuestions.push({
            categoryName: bc.category.name,
            categoryDescription: bc.category.description || '',
            categoryRule: bc.category.rule || '',
            categoryImageUrl: bc.category.imageUrl || '',
            questions: questions.map((q: Question) => ({
              question: q.question,
              correctAnswer: q.correctAnswer,
              points: q.points,
              options: q.options,
            }))
          });
        }
        
        exportData.push({
          boardName: board.name,
          boardDescription: board.description,
          pointValues: board.pointValues,
          colorCode: board.colorCode,
          categories: categoriesWithQuestions
        });
      }
      
      res.json({ 
        exportedAt: new Date().toISOString(),
        starterPacks: exportData 
      });
    } catch (err) {
      console.error("Error exporting starter packs:", err);
      res.status(500).json({ message: "Failed to export starter packs" });
    }
  });

  // Import Starter Packs - creates boards, categories, and questions from export data
  // Deduplicates categories by name to avoid bloat
  app.post("/api/super-admin/starter-packs/import", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { starterPacks } = req.body;
      if (!starterPacks || !Array.isArray(starterPacks)) {
        return res.status(400).json({ message: "Invalid import data" });
      }
      
      const userId = req.session.userId!;
      let boardsCreated = 0;
      let boardsSkipped = 0;
      let categoriesCreated = 0;
      let categoriesReused = 0;
      let questionsCreated = 0;
      
      // Get all existing categories for deduplication
      const existingCategories = await storage.getCategories();
      const categoryNameMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c]));
      
      // First pass: update ALL categories with missing rules (regardless of board status)
      let categoriesUpdated = 0;
      for (const pack of starterPacks) {
        for (const cat of pack.categories || []) {
          let category = categoryNameMap.get(cat.categoryName.toLowerCase());
          if (category && (!category.rule && cat.categoryRule)) {
            await storage.updateCategory(category.id, {
              rule: cat.categoryRule,
              description: category.description || cat.categoryDescription || '',
              imageUrl: category.imageUrl || cat.categoryImageUrl || '',
            });
            categoriesUpdated++;
          }
        }
      }
      
      for (const pack of starterPacks) {
        // Check if board with same name already exists
        const existingBoards = await storage.getGlobalBoards();
        const exists = existingBoards.some(b => b.name === pack.boardName);
        if (exists) {
          console.log(`Skipping existing board: ${pack.boardName}`);
          boardsSkipped++;
          continue;
        }
        
        // Create the board
        const board = await storage.createBoard({
          name: pack.boardName,
          description: pack.boardDescription || '',
          pointValues: pack.pointValues || [10, 20, 30, 40, 50],
          userId: userId,
        });
        
        // Mark as global
        await storage.setGlobalBoard(board.id, true);
        boardsCreated++;
        
        // Create categories and questions
        for (const cat of pack.categories || []) {
          // Look up category by name (case-insensitive)
          let category = categoryNameMap.get(cat.categoryName.toLowerCase());
          
          if (category) {
            categoriesReused++;
          } else {
            // Create new category
            category = await storage.createCategory({
              name: cat.categoryName,
              description: cat.categoryDescription || '',
              rule: cat.categoryRule || '',
              imageUrl: cat.categoryImageUrl || '',
            });
            categoriesCreated++;
            // Add to map for future lookups
            categoryNameMap.set(cat.categoryName.toLowerCase(), category);
          }
          
          // Link category to board
          const boardCategory = await storage.createBoardCategory({
            boardId: board.id,
            categoryId: category.id,
          });
          
          // Create questions for this category
          for (const q of cat.questions || []) {
            await storage.createQuestion({
              categoryId: category.id,
              question: q.question,
              correctAnswer: q.correctAnswer,
              points: q.points,
              options: q.options || [],
            });
            questionsCreated++;
          }
        }
      }
      
      res.json({ 
        message: "Import completed",
        boardsCreated,
        boardsSkipped,
        categoriesCreated,
        categoriesReused,
        categoriesUpdated,
        questionsCreated
      });
    } catch (err) {
      console.error("Error importing starter packs:", err);
      res.status(500).json({ message: "Failed to import starter packs" });
    }
  });

  // Update category rules from import data (for fixing missing rules)
  app.post("/api/super-admin/categories/update-rules", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { starterPacks } = req.body;
      if (!starterPacks || !Array.isArray(starterPacks)) {
        return res.status(400).json({ message: "Invalid data - need starterPacks array" });
      }
      
      const allCategories = await storage.getCategories();
      const categoryNameMap = new Map(allCategories.map(c => [c.name.toLowerCase(), c]));
      
      let updated = 0;
      let skipped = 0;
      
      for (const pack of starterPacks) {
        for (const cat of pack.categories || []) {
          const existing = categoryNameMap.get(cat.categoryName.toLowerCase());
          if (existing && cat.categoryRule) {
            await storage.updateCategory(existing.id, {
              rule: cat.categoryRule,
            });
            updated++;
          } else {
            skipped++;
          }
        }
      }
      
      res.json({ message: "Rules updated", updated, skipped });
    } catch (err) {
      console.error("Error updating rules:", err);
      res.status(500).json({ message: "Failed to update rules" });
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

  // Game Types for homepage (includes active and coming_soon, excludes hidden)
  app.get("/api/game-types/homepage", isAuthenticated, async (req, res) => {
    try {
      const types = await storage.getHomepageGameTypes();
      res.json(types);
    } catch (err) {
      console.error("Error getting homepage game types:", err);
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
                    let totalScore = 0;
                    let total = 0;
                    for (const qId of questionIds) {
                      const userAAnswer = allAnswers.find(a => a.questionId === qId && a.userId === pair.userAId);
                      const userBAnswer = allAnswers.find(a => a.questionId === qId && a.userId === pair.userBId);
                      if (userAAnswer && userBAnswer) {
                        total++;
                        const textA = (userAAnswer.answerText || '').toLowerCase().trim();
                        const textB = (userBAnswer.answerText || '').toLowerCase().trim();
                        
                        // Exact match = 100% compatibility
                        if (textA === textB) {
                          totalScore += 100;
                          continue;
                        }
                        
                        // Normalize common synonyms and variants
                        const normalize = (s: string) => s
                          .replace(/[^\w\s]/g, '')
                          .replace(/\b(yes|yeah|yep|yup|absolutely)\b/gi, 'yes')
                          .replace(/\b(no|nope|nah)\b/gi, 'no')
                          .replace(/\b(don\'?t|do not)\b/gi, 'dont');
                        
                        const normA = normalize(textA);
                        const normB = normalize(textB);
                        
                        // Check normalized exact match
                        if (normA === normB) {
                          totalScore += 95;
                          continue;
                        }
                        
                        // Token-based similarity for longer answers
                        const tokensA = normA.split(/\s+/).filter(w => w.length > 0);
                        const tokensB = normB.split(/\s+/).filter(w => w.length > 0);
                        
                        if (tokensA.length === 0 && tokensB.length === 0) {
                          totalScore += 50; // Both empty = neutral
                          continue;
                        }
                        
                        // Jaccard similarity: intersection / union
                        const setA = new Set(tokensA);
                        const setB = new Set(tokensB);
                        const intersection = Array.from(setA).filter(x => setB.has(x)).length;
                        const union = new Set(tokensA.concat(tokensB)).size;
                        const jaccard = union > 0 ? (intersection / union) * 100 : 0;
                        
                        totalScore += jaccard;
                      }
                    }
                    avgScore = total > 0 ? totalScore / total : 0;
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
        
        // Return appropriate status based on scoring result
        // 200 = full success, 207 = partial success (answers saved, scoring issue)
        const httpStatus = responseWeeklyStakeStatus?.status === 'error' ? 207 : 200;
        return res.status(httpStatus).json({ 
          success: true, 
          answersSubmitted: true,
          weeklyStake: responseWeeklyStakeStatus 
        });
      }
      
      res.json({ success: true, answersSubmitted: true, weeklyStake: { status: 'pending_partner' } });
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
      
      // Calculate days remaining until Sunday
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysRemaining = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      
      res.json({ 
        stake, 
        weekStartDate: weekStart, 
        daysRemaining,
        isUserA: pair.userAId === userId 
      });
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
      
      res.json({ stake: updatedStake, winnerId });
    } catch (err) {
      console.error("Error revealing weekly stake:", err);
      res.status(500).json({ message: "Failed to reveal weekly stake" });
    }
  });

  // ============================================
  // Sequence Squeeze Routes
  // ============================================
  
  app.get("/api/sequence-squeeze/questions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const questions = await storage.getSequenceQuestions(userId, role);
      res.json(questions);
    } catch (err) {
      console.error("Error fetching sequence questions:", err);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.post("/api/sequence-squeeze/questions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { question, optionA, optionB, optionC, optionD, correctOrder, hint, isActive } = req.body;
      
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return res.status(400).json({ message: "Question text is required" });
      }
      if (!optionA || typeof optionA !== 'string' || optionA.trim().length === 0) {
        return res.status(400).json({ message: "Option A is required" });
      }
      if (!optionB || typeof optionB !== 'string' || optionB.trim().length === 0) {
        return res.status(400).json({ message: "Option B is required" });
      }
      if (!optionC || typeof optionC !== 'string' || optionC.trim().length === 0) {
        return res.status(400).json({ message: "Option C is required" });
      }
      if (!optionD || typeof optionD !== 'string' || optionD.trim().length === 0) {
        return res.status(400).json({ message: "Option D is required" });
      }
      
      if (!Array.isArray(correctOrder) || correctOrder.length !== 4) {
        return res.status(400).json({ message: "correctOrder must be an array of 4 letters" });
      }
      
      const validLetters = new Set(['A', 'B', 'C', 'D']);
      const orderSet = new Set(correctOrder);
      if (orderSet.size !== 4 || !correctOrder.every((l: string) => validLetters.has(l))) {
        return res.status(400).json({ message: "correctOrder must contain exactly A, B, C, D in some order" });
      }
      
      if (question.length > 500) {
        return res.status(400).json({ message: "Question text must be 500 characters or less" });
      }
      if (optionA.length > 200 || optionB.length > 200 || optionC.length > 200 || optionD.length > 200) {
        return res.status(400).json({ message: "Each option must be 200 characters or less" });
      }
      if (hint && hint.length > 200) {
        return res.status(400).json({ message: "Hint must be 200 characters or less" });
      }
      
      const newQuestion = await storage.createSequenceQuestion({
        userId,
        question: question.trim(),
        optionA: optionA.trim(),
        optionB: optionB.trim(),
        optionC: optionC.trim(),
        optionD: optionD.trim(),
        correctOrder,
        hint: hint?.trim() || null,
        isActive: isActive === true,
      });
      
      res.status(201).json(newQuestion);
    } catch (err) {
      console.error("Error creating sequence question:", err);
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  app.delete("/api/sequence-squeeze/questions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      const deleted = await storage.deleteSequenceQuestion(id, userId, role);
      
      if (!deleted) {
        return res.status(404).json({ message: "Question not found or unauthorized" });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting sequence question:", err);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  app.post("/api/sequence-squeeze/questions/bulk", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { questions } = req.body;
      
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "No questions provided" });
      }
      
      if (questions.length > 50) {
        return res.status(400).json({ message: "Maximum 50 questions per import" });
      }
      
      const validLetters = new Set(['A', 'B', 'C', 'D']);
      const results = { success: 0, errors: [] as string[] };
      
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        try {
          if (!q.question || typeof q.question !== 'string' || q.question.trim().length === 0) {
            results.errors.push(`Row ${i + 1}: Question text is required`);
            continue;
          }
          if (!q.optionA || !q.optionB || !q.optionC || !q.optionD) {
            results.errors.push(`Row ${i + 1}: All four options are required`);
            continue;
          }
          if (!Array.isArray(q.correctOrder) || q.correctOrder.length !== 4) {
            results.errors.push(`Row ${i + 1}: correctOrder must have 4 items`);
            continue;
          }
          const orderSet = new Set(q.correctOrder);
          if (orderSet.size !== 4 || !q.correctOrder.every((l: string) => validLetters.has(l))) {
            results.errors.push(`Row ${i + 1}: correctOrder must contain A, B, C, D exactly once`);
            continue;
          }
          if (q.question.length > 500) {
            results.errors.push(`Row ${i + 1}: Question too long (max 500 chars)`);
            continue;
          }
          if (q.optionA.length > 200 || q.optionB.length > 200 || q.optionC.length > 200 || q.optionD.length > 200) {
            results.errors.push(`Row ${i + 1}: Option too long (max 200 chars)`);
            continue;
          }
          
          await storage.createSequenceQuestion({
            userId,
            question: q.question.trim(),
            optionA: q.optionA.trim(),
            optionB: q.optionB.trim(),
            optionC: q.optionC.trim(),
            optionD: q.optionD.trim(),
            correctOrder: q.correctOrder,
            hint: q.hint?.trim() || null,
            isActive: true,
          });
          results.success++;
        } catch (err) {
          results.errors.push(`Row ${i + 1}: Database error`);
        }
      }
      
      res.json(results);
    } catch (err) {
      console.error("Error bulk importing sequence questions:", err);
      res.status(500).json({ message: "Failed to import questions" });
    }
  });

  // Excel Export - Download all boards with categories and questions
  app.get("/api/export/excel", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Only Super Admins can export data" });
      }
      
      const boards = await storage.getBoards(userId, role);
      const rows: { Board: string; Category: string; Question: string; "Option A": string; "Option B": string; "Option C": string; "Option D": string; "Correct Answer": string; Points: number }[] = [];
      
      for (const board of boards) {
        const boardCats = await storage.getBoardWithCategoriesAndQuestions(board.id, userId, role);
        for (const bc of boardCats) {
          if (bc.questions.length === 0) {
            rows.push({
              Board: board.name,
              Category: bc.category.name,
              Question: "",
              "Option A": "",
              "Option B": "",
              "Option C": "",
              "Option D": "",
              "Correct Answer": "",
              Points: 0
            });
          } else {
            for (const q of bc.questions) {
              const options = q.options || [];
              rows.push({
                Board: board.name,
                Category: bc.category.name,
                Question: q.question,
                "Option A": options[0] || "",
                "Option B": options[1] || "",
                "Option C": options[2] || "",
                "Option D": options[3] || "",
                "Correct Answer": q.correctAnswer,
                Points: q.points
              });
            }
          }
        }
      }
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Buzzkill Data");
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=buzzkill-export.xlsx');
      res.send(buffer);
    } catch (err) {
      console.error("Error exporting Excel:", err);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Excel Import - Upload boards with categories and questions
  // Supports two formats:
  // Format 1: Board, Category, Rule, Question, Answer, Points (simple)
  // Format 2: Board, Category, Question, Option A-D, Correct Answer, Points (multiple choice)
  app.post("/api/import/excel", isAuthenticated, excelUpload.single('file'), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Only Super Admins can import data" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      
      if (!data || data.length === 0) {
        return res.status(400).json({ message: "No data found in spreadsheet" });
      }
      
      const results = { 
        boardsCreated: 0, 
        categoriesCreated: 0,
        categoriesLinked: 0,
        questionsCreated: 0, 
        flagged: [] as { row: number; issue: string; data: Record<string, string> }[],
        errors: [] as string[] 
      };
      
      const boardMap = new Map<string, number>();
      const categoryMap = new Map<string, { id: number; description: string }>();
      const boardCategoryMap = new Map<string, number>();
      
      // Detect format by checking for "Rule" or "Answer" columns (simple format)
      const hasSimpleFormat = data.some(row => 
        'Rule' in row || 'Answer' in row || 'rule' in row || 'answer' in row
      );
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2;
        
        // Normalize column names (case-insensitive)
        const getField = (names: string[]) => {
          for (const name of names) {
            if (row[name] !== undefined) return String(row[name]).trim();
            const lower = name.toLowerCase();
            for (const key of Object.keys(row)) {
              if (key.toLowerCase() === lower) return String(row[key]).trim();
            }
          }
          return "";
        };
        
        const boardName = getField(['Board', 'board']);
        const categoryName = getField(['Category', 'category']);
        const rule = getField(['Rule', 'rule', 'Description', 'description']);
        const question = getField(['Question', 'question']);
        const answer = getField(['Answer', 'answer', 'Correct Answer', 'correct_answer']);
        const optA = getField(['Option A', 'option_a', 'A']);
        const optB = getField(['Option B', 'option_b', 'B']);
        const optC = getField(['Option C', 'option_c', 'C']);
        const optD = getField(['Option D', 'option_d', 'D']);
        const points = Number(getField(['Points', 'points', 'Point', 'point'])) || 10;
        const imageUrl = getField(['Image URL', 'image_url', 'ImageUrl', 'Image']);
        
        // Track flagged data for manual fixes
        const rowData: Record<string, string> = {};
        if (boardName) rowData.board = boardName;
        if (categoryName) rowData.category = categoryName;
        if (rule) rowData.rule = rule;
        if (question) rowData.question = question;
        if (answer) rowData.answer = answer;
        rowData.points = String(points);
        
        // Flag missing required fields
        if (!boardName) {
          results.flagged.push({ row: rowNum, issue: "Missing board name", data: rowData });
          continue;
        }
        if (!categoryName) {
          results.flagged.push({ row: rowNum, issue: "Missing category name", data: rowData });
          continue;
        }
        
        try {
          // Get or create board
          let boardId = boardMap.get(boardName.toLowerCase());
          if (!boardId) {
            const existingBoards = await storage.getBoards(userId, role);
            const existing = existingBoards.find(b => b.name.toLowerCase() === boardName.toLowerCase());
            if (existing) {
              boardId = existing.id;
            } else {
              // Auto-assign color for new boards
              const allBoards = await storage.getBoards(userId, 'super_admin');
              const colorIndex = allBoards.length % BOARD_COLORS.length;
              const newBoard = await storage.createBoard({
                name: boardName,
                description: null,
                pointValues: [10, 20, 30, 40, 50],
                colorCode: BOARD_COLORS[colorIndex],
                userId,
              });
              boardId = newBoard.id;
              results.boardsCreated++;
            }
            boardMap.set(boardName.toLowerCase(), boardId);
          }
          
          // Get or create category
          const catKey = categoryName.toLowerCase();
          let categoryInfo = categoryMap.get(catKey);
          if (!categoryInfo) {
            const existingCats = await storage.getCategories();
            const existing = existingCats.find(c => c.name.toLowerCase() === catKey);
            if (existing) {
              categoryInfo = { id: existing.id, description: existing.description || "" };
              // Update description if rule provided and current is empty
              if (rule && !existing.description) {
                await storage.updateCategory(existing.id, { description: rule });
                categoryInfo.description = rule;
              }
            } else {
              const newCat = await storage.createCategory({
                name: categoryName,
                description: rule || "",
                imageUrl: "",
                sourceGroup: null,
                isActive: true,
              });
              categoryInfo = { id: newCat.id, description: rule || "" };
              results.categoriesCreated++;
            }
            categoryMap.set(catKey, categoryInfo);
          } else if (rule && !categoryInfo.description) {
            // Update description if we now have a rule
            await storage.updateCategory(categoryInfo.id, { description: rule });
            categoryInfo.description = rule;
          }
          
          // Link category to board
          const bcKey = `${boardId}-${categoryInfo.id}`;
          if (!boardCategoryMap.has(bcKey)) {
            const existingBC = await storage.getBoardCategoryByIds(boardId, categoryInfo.id);
            if (existingBC) {
              boardCategoryMap.set(bcKey, existingBC.id);
            } else {
              const boardCats = await storage.getBoardCategories(boardId);
              if (boardCats.length >= 5) {
                results.flagged.push({ row: rowNum, issue: `Board "${boardName}" already has 5 categories`, data: rowData });
                continue;
              }
              const newBC = await storage.createBoardCategory({
                boardId,
                categoryId: categoryInfo.id,
                position: boardCats.length,
              });
              boardCategoryMap.set(bcKey, newBC.id);
              results.categoriesLinked++;
            }
          }
          
          // Create question if we have one (questions belong to categories directly)
          if (question) {
            if (!answer) {
              results.flagged.push({ row: rowNum, issue: "Missing answer for question", data: rowData });
              continue;
            }
            
            // Check if question already exists for this category
            const existingQuestions = await storage.getQuestionsByCategory(categoryInfo.id);
            const duplicate = existingQuestions.find((q: Question) => 
              q.question.toLowerCase() === question.toLowerCase()
            );
            if (duplicate) {
              results.flagged.push({ row: rowNum, issue: "Duplicate question (skipped)", data: rowData });
              continue;
            }
            
            // For simple format (no options), create single-option question
            // For multiple choice format, use provided options
            let options: string[];
            let correctAnswer = answer;
            
            if (hasSimpleFormat && !optA && !optB) {
              // Simple format: just store the answer as the only option
              options = [answer];
            } else {
              // Multiple choice format
              options = [optA, optB, optC, optD].filter(o => o);
              if (options.length < 2 && (optA || optB || optC || optD)) {
                results.flagged.push({ row: rowNum, issue: "Need at least 2 options for multiple choice", data: rowData });
                continue;
              }
              if (options.length === 0) {
                options = [answer];
              }
            }
            
            await storage.createQuestion({
              categoryId: categoryInfo.id,
              question,
              options,
              correctAnswer,
              points,
              imageUrl: imageUrl || undefined,
            });
            results.questionsCreated++;
          } else if (!question && answer) {
            results.flagged.push({ row: rowNum, issue: "Has answer but missing question", data: rowData });
          }
        } catch (err) {
          results.errors.push(`Row ${rowNum}: Database error - ${err instanceof Error ? err.message : 'Unknown'}`);
          console.error(`Import error row ${rowNum}:`, err);
        }
      }
      
      res.json({
        success: true,
        summary: {
          boardsCreated: results.boardsCreated,
          categoriesCreated: results.categoriesCreated,
          categoriesLinked: results.categoriesLinked,
          questionsCreated: results.questionsCreated,
          flaggedCount: results.flagged.length,
          errorCount: results.errors.length,
        },
        flagged: results.flagged,
        errors: results.errors,
      });
    } catch (err) {
      console.error("Error importing Excel:", err);
      res.status(500).json({ message: "Failed to import data" });
    }
  });

  // Analytics endpoint - event collection with validation
  const VALID_EVENT_NAMES = new Set([
    'page_view', 'login', 'logout', 'game_started', 'game_completed',
    'question_answered', 'buzzer_pressed', 'pair_created', 'pair_joined',
    'pair_invite_sent', 'pair_invite_accepted', 'daily_questions_submitted', 
    'weekly_stake_set', 'weekly_stake_revealed', 'ai_insight_viewed',
    'answer_favorited', 'board_created', 'category_created', 'question_created',
    'onboarding_started', 'onboarding_completed', 'onboarding_skipped'
  ]);
  
  app.post("/api/analytics/events", async (req, res) => {
    try {
      const { events } = req.body;
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ message: "Invalid events format" });
      }
      
      // Validate and filter events
      const validEvents = events.filter(e => 
        e && typeof e.name === 'string' && 
        VALID_EVENT_NAMES.has(e.name) &&
        typeof e.timestamp === 'number'
      );
      
      const dropped = events.length - validEvents.length;
      if (dropped > 0) {
        console.warn(`[Analytics] Dropped ${dropped} invalid events`);
      }
      
      // Log valid events - sample 10% for reduced log volume
      if (Math.random() < 0.1 || validEvents.length <= 2) {
        console.log(`[Analytics] Received ${validEvents.length} events:`, 
          validEvents.map(e => e.name).join(', '));
      }
      
      res.json({ received: validEvents.length, dropped });
    } catch (err) {
      console.error("Error processing analytics:", err);
      res.status(500).json({ message: "Failed to process analytics" });
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
