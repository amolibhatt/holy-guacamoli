import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";
import { registerReplitAuthRoutes, registerReplitAuthApiRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { razorpayRouter } from "./razorpay";
import playerProfileRouter from "./routes/playerProfile";
import { playerProfileService } from "./services/playerProfile";
import { SOURCE_GROUPS, type SourceGroup, type Question } from "@shared/schema";

// Required point values for a category to go LIVE
const REQUIRED_POINTS = [10, 20, 30, 40, 50] as const;

// Helper to validate numeric ID from request params
// Returns the parsed number or null if invalid
function parseId(value: string): number | null {
  const id = Number(value);
  if (isNaN(id) || !Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

// Admin middleware - allows admin and super_admin to create/host content
// Users with 'user' role can only view/play, not create
const isAdmin: import('express').RequestHandler = (req, res, next) => {
  const role = req.session?.userRole;
  if (!req.session?.userId || (role !== 'admin' && role !== 'super_admin')) {
    return res.status(403).json({ message: "Admin access required to create content" });
  }
  next();
};

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
  
  // Register Replit Auth routes for social login (Google, GitHub, Apple, X)
  registerReplitAuthRoutes(app);
  registerReplitAuthApiRoutes(app);
  
  // Register Razorpay payment routes
  app.use("/api/razorpay", razorpayRouter);
  app.use(playerProfileRouter);
  
  // Register object storage routes for image uploads
  registerObjectStorageRoutes(app);
  
  // Auto-assign colors to existing boards that don't have one
  const BOARD_COLORS = [
    'violet',
    'fuchsia', 
    'amber',
    'teal',
    'sky',
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

  // Health check endpoint to verify database connectivity
  app.get("/api/health", async (_req, res) => {
    try {
      // Test database connection by fetching a simple count
      const testResult = await storage.getBoards('system', 'super_admin');
      // Also test category table access
      const categoryTest = await storage.getCategories();
      res.json({ 
        status: "ok", 
        database: "connected",
        boardCount: testResult.length,
        categoryCount: categoryTest.length,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Health check failed:", err);
      res.status(500).json({ 
        status: "error", 
        database: "disconnected",
      });
    }
  });

  // Debug endpoint to check session state (helps diagnose production issues)
  app.get("/api/debug/session", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.userRole;
    const boards = await storage.getBoards(userId, role);
    res.json({
      sessionValid: true,
      userId,
      role,
      boardCount: boards.length,
      boards: boards.map(b => ({ id: b.id, name: b.name }))
    });
  });
  
  // Public debug endpoint (no auth required) - to verify routing works
  app.get("/api/debug/ping", async (_req, res) => {
    try {
      res.json({
        pong: true,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ message: "Service unavailable" });
    }
  });

  // Board routes - protected (hosts only, super_admin sees all)
  app.get("/api/boards", isAuthenticated, isAdmin, async (req, res) => {
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

  app.get("/api/boards/summary", isAuthenticated, isAdmin, async (req, res) => {
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

  // Shuffle Play - get 5 random categories from user's grids (must be before :id route)
  app.get("/api/boards/shuffle-play", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      // Parse excluded category IDs from query param (to avoid repeats in same session)
      const excludeParam = req.query.exclude as string | undefined;
      const excludedCategoryIds = excludeParam 
        ? excludeParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id))
        : [];
      
      // Parse grid IDs filter (optional - if provided, only shuffle from these grids)
      const gridIdsParam = req.query.gridIds as string | undefined;
      const selectedGridIds = gridIdsParam
        ? gridIdsParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id))
        : [];
      
      // Get all active blitzgrid boards for this user (theme can be "blitzgrid" or "blitzgrid:space", etc.)
      const allBoards = await storage.getBoards(userId, role);
      let blitzgridBoards = allBoards.filter(b => b.theme === "blitzgrid" || b.theme?.startsWith("blitzgrid:"));
      
      // Filter to selected grids if specified
      if (selectedGridIds.length > 0) {
        blitzgridBoards = blitzgridBoards.filter(b => selectedGridIds.includes(b.id));
      }
      
      // Collect all categories with their questions from active boards
      const allCategories: Array<{
        id: number;
        name: string;
        description: string | null;
        imageUrl: string | null;
        questions: Array<{
          id: number;
          question: string;
          correctAnswer: string;
          options: string[] | null;
          points: number;
          imageUrl: string | null;
          audioUrl: string | null;
          videoUrl: string | null;
        }>;
      }> = [];
      
      for (const board of blitzgridBoards) {
        const categoriesWithQuestions = await storage.getBoardWithCategoriesAndQuestions(board.id, userId, role);
        // Only include categories with exactly 5 questions with correct point tiers (10, 20, 30, 40, 50)
        const requiredPoints = [10, 20, 30, 40, 50];
        for (const cat of categoriesWithQuestions) {
          if (cat.questions && cat.questions.length === 5) {
            const questionPoints = cat.questions.map(q => q.points).sort((a, b) => a - b);
            const hasAllPoints = requiredPoints.every((pt, idx) => questionPoints[idx] === pt);
            
            // Skip categories that were already played in this session
            if (hasAllPoints && !excludedCategoryIds.includes(cat.category.id)) {
              allCategories.push({
                id: cat.category.id,
                name: cat.category.name,
                description: cat.category.description,
                imageUrl: cat.category.imageUrl,
                questions: cat.questions.map(q => ({
                  id: q.id,
                  categoryId: cat.category.id,
                  question: q.question,
                  correctAnswer: q.correctAnswer,
                  options: q.options,
                  points: q.points,
                  imageUrl: q.imageUrl,
                  audioUrl: q.audioUrl,
                  videoUrl: q.videoUrl,
                  answerImageUrl: q.answerImageUrl,
                  answerAudioUrl: q.answerAudioUrl,
                  answerVideoUrl: q.answerVideoUrl,
                })),
              });
            }
          }
        }
      }
      
      if (allCategories.length < 5) {
        // Check if we have enough total categories but they're all excluded
        if (excludedCategoryIds.length > 0) {
          return res.status(400).json({ 
            message: "All categories played! Reset to shuffle again.",
            exhausted: true
          });
        }
        return res.status(400).json({ 
          message: "Not enough complete categories to shuffle. Need at least 5 complete categories across your grids." 
        });
      }
      
      // Fisher-Yates shuffle for unbiased randomization
      for (let i = allCategories.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allCategories[i], allCategories[j]] = [allCategories[j], allCategories[i]];
      }
      const selectedCategories = allCategories.slice(0, 5);
      
      res.json({ categories: selectedCategories });
    } catch (err) {
      console.error("Error getting shuffle play categories:", err);
      res.status(500).json({ message: "Failed to get shuffle play data" });
    }
  });

  app.get("/api/boards/:id", isAuthenticated, isAdmin, async (req, res) => {
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

  app.post("/api/boards", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const { name, description, pointValues, theme } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      // Auto-assign a color based on total board count (use super_admin view to get all boards)
      const allBoards = await storage.getBoards(userId, 'super_admin');
      const colorIndex = allBoards.length % BOARD_COLORS.length;
      const autoColor = BOARD_COLORS[colorIndex];
      
      const board = await storage.createBoard({
        name: name.trim(),
        description: (typeof description === "string" && description.trim()) ? description.trim() : null,
        pointValues: pointValues || [10, 20, 30, 40, 50],
        colorCode: autoColor,
        theme: theme || "blitzgrid",
        userId,
      });
      res.status(201).json(board);
    } catch (err) {
      console.error("Error creating board:", err);
      res.status(500).json({ message: "Failed to create board" });
    }
  });

  app.put("/api/boards/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const boardId = parseId(req.params.id);
      if (boardId === null) {
        return res.status(400).json({ message: "Invalid board ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const { name, description, pointValues, theme, isGlobal, sortOrder } = req.body;
      const updateData: Record<string, any> = {};
      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
          return res.status(400).json({ message: "Board name cannot be empty" });
        }
        updateData.name = name.trim();
      }
      if (description !== undefined) updateData.description = typeof description === "string" ? (description.trim() || null) : description;
      if (pointValues !== undefined) updateData.pointValues = pointValues;
      if (theme !== undefined) updateData.theme = theme;
      if (isGlobal !== undefined) updateData.isGlobal = isGlobal;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
      const board = await storage.updateBoard(boardId, updateData, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.json(board);
    } catch (err) {
      console.error("Error updating board:", err);
      res.status(500).json({ message: "Failed to update board" });
    }
  });

  app.delete("/api/boards/:id", isAuthenticated, isAdmin, async (req, res) => {
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
      const boardCats = await storage.getBoardCategories(boardId);
      const deleted = await storage.deleteBoard(boardId, userId, role);
      if (!deleted) {
        return res.status(404).json({ message: "Board not found" });
      }
      for (const bc of boardCats) {
        const otherLinks = await storage.getBoardCategoriesByCategoryId(bc.categoryId);
        if (otherLinks.length === 0) {
          await storage.deleteCategory(bc.categoryId);
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting board:", err);
      res.status(500).json({ message: "Failed to delete board" });
    }
  });

  // Board categories (junction table) - protected
  app.get("/api/boards/:boardId/categories", isAuthenticated, isAdmin, async (req, res) => {
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

  app.post("/api/boards/:boardId/categories", isAuthenticated, isAdmin, async (req, res) => {
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
      if (typeof categoryId !== 'number' || isNaN(categoryId) || !Number.isInteger(categoryId) || categoryId <= 0) {
        return res.status(400).json({ message: "A valid categoryId is required" });
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

  app.delete("/api/board-categories/:id", isAuthenticated, isAdmin, async (req, res) => {
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
      const categoryId = bc.categoryId;
      const deleted = await storage.deleteBoardCategory(bcId);
      if (!deleted) {
        return res.status(404).json({ message: "Board category link not found" });
      }
      const otherLinks = await storage.getBoardCategoriesByCategoryId(categoryId);
      if (otherLinks.length === 0) {
        await storage.deleteCategory(categoryId);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting board-category link:", err);
      res.status(500).json({ message: "Failed to delete board-category link" });
    }
  });

  app.put("/api/boards/:boardId/categories/reorder", isAuthenticated, isAdmin, async (req, res) => {
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
      if (!Array.isArray(orderedIds) || !orderedIds.every(id => typeof id === 'number' && Number.isInteger(id))) {
        return res.status(400).json({ message: "orderedIds must be an array of integers" });
      }
      const uniqueIds = new Set(orderedIds);
      if (uniqueIds.size !== orderedIds.length) {
        return res.status(400).json({ message: "orderedIds must not contain duplicates" });
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

  app.post("/api/boards/:boardId/categories/create-and-link", isAuthenticated, isAdmin, async (req, res) => {
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
      if (!name || typeof name !== "string" || !name.trim()) {
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
      console.error("Error creating category:", err);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Legacy redirect for backwards compatibility with old endpoint
  app.get("/api/admin/categories", isAuthenticated, isAdmin, (req, res) => {
    res.redirect(307, "/api/categories");
  });

  // Categories owned by user (via their boards) - protected
  app.get(api.categories.list.path, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const categories = await storage.getCategoriesForUser(userId, role);
      res.json(categories);
    } catch (err) {
      console.error("Error fetching categories:", err);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Categories with question counts - for admin panel progress display
  app.get("/api/categories/with-counts", isAuthenticated, isAdmin, async (req, res) => {
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

  app.get(api.categories.get.path, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const categoryId = parseId(req.params.id);
      if (categoryId === null) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
      
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      const hasAccess = await verifyCategoryOwnership(categoryId, userId, role);
      if (!hasAccess) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      const category = await storage.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      res.json(category);
    } catch (err) {
      console.error("Error fetching category:", err);
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  // Standalone category creation - restricted to super_admin only (regular users use create-and-link)
  app.post(api.categories.create.path, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const role = req.session.userRole;
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
      console.error("Error creating category:", err);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put("/api/categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const categoryId = parseId(req.params.id);
      if (categoryId === null) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      const hasAccess = await verifyCategoryOwnership(categoryId, userId, role);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to modify this category" });
      }
      
      const { name, description, rule, imageUrl, isActive, sourceGroup } = req.body;
      
      if (isActive === true) {
        const validation = await validateCategoryForLive(categoryId);
        if (!validation.valid) {
          return res.status(400).json({ 
            message: validation.error,
            validationError: true 
          });
        }
      }
      
      const updateData: Record<string, any> = {};
      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
          return res.status(400).json({ message: "Category name cannot be empty" });
        }
        updateData.name = name.trim();
      }
      if (description !== undefined) updateData.description = typeof description === "string" ? description.trim() : "";
      if (rule !== undefined) updateData.rule = rule;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (sourceGroup !== undefined) updateData.sourceGroup = sourceGroup;
      
      const category = await storage.updateCategory(categoryId, updateData);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (err) {
      console.error("Error updating category:", err);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete(api.categories.delete.path, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const categoryId = parseId(req.params.id);
      if (categoryId === null) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      const hasAccess = await verifyCategoryOwnership(categoryId, userId, role);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to delete this category" });
      }
      
      const deleted = await storage.deleteCategory(categoryId);
      if (!deleted) {
        return res.status(404).json({ message: 'Category not found' });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting category:", err);
      res.status(500).json({ message: "Failed to delete category" });
    }
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
  app.get("/api/categories/:categoryId/questions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const categoryId = parseId(req.params.categoryId);
      if (categoryId === null) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
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
    } catch (err) {
      console.error("Error fetching questions:", err);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.post(api.questions.create.path, isAuthenticated, isAdmin, async (req, res) => {
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

  app.put(api.questions.update.path, isAuthenticated, isAdmin, async (req, res) => {
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
      console.error("Error updating question:", err);
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  app.delete(api.questions.delete.path, isAuthenticated, isAdmin, async (req, res) => {
    try {
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
      
      const hasAccess = await verifyCategoryOwnership(existingQuestion.categoryId, userId, role);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to delete this question" });
      }
      
      const deleted = await storage.deleteQuestion(questionId);
      if (!deleted) {
        return res.status(404).json({ message: 'Question not found' });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting question:", err);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // Bulk import questions with validation
  const MAX_BULK_IMPORT = 50;
  const MAX_QUESTION_LENGTH = 1000;
  const MAX_ANSWER_LENGTH = 500;
  
  app.post("/api/categories/:categoryId/questions/bulk", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const categoryId = parseId(req.params.categoryId);
      if (categoryId === null) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
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
      const questionId = parseId(req.params.id);
      if (questionId === null) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const { answer } = api.questions.verifyAnswer.input.parse(req.body);
      const question = await storage.getQuestion(questionId);
      
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
      console.error("Error verifying answer:", err);
      res.status(500).json({ message: "Failed to verify answer" });
    }
  });

  // Get full board data for gameplay - protected
  app.get("/api/boards/:id/full", isAuthenticated, isAdmin, async (req, res) => {
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
      const categoriesWithQuestions = await storage.getBoardWithCategoriesAndQuestions(boardId, userId, role);
      res.json({ board, categories: categoriesWithQuestions });
    } catch (err) {
      console.error("Error getting full board:", err);
      res.status(500).json({ message: "Failed to get board data" });
    }
  });

  // === GAMES ===
  app.get("/api/games", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const allGames = await storage.getGames(userId, role);
      res.json(allGames);
    } catch (err) {
      console.error("Error fetching games:", err);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  app.get("/api/games/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const gameId = parseId(req.params.id);
      if (gameId === null) {
        return res.status(400).json({ message: "Invalid game ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const game = await storage.getGame(gameId, userId, role);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      res.json(game);
    } catch (err) {
      console.error("Error fetching game:", err);
      res.status(500).json({ message: "Failed to fetch game" });
    }
  });

  app.post("/api/games", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { name, mode, settings } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      const game = await storage.createGame({
        name: name.trim(),
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

  app.put("/api/games/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const gameId = parseId(req.params.id);
      if (gameId === null) {
        return res.status(400).json({ message: "Invalid game ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const { name, mode, settings } = req.body;
      if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      const game = await storage.updateGame(gameId, { 
        name: typeof name === 'string' ? name.trim() : name, 
        mode, 
        settings 
      }, userId, role);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      res.json(game);
    } catch (err) {
      console.error("Error updating game:", err);
      res.status(500).json({ message: "Failed to update game" });
    }
  });

  app.delete("/api/games/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const gameId = parseId(req.params.id);
      if (gameId === null) {
        return res.status(400).json({ message: "Invalid game ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const deleted = await storage.deleteGame(gameId, userId, role);
      if (!deleted) {
        return res.status(404).json({ message: "Game not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting game:", err);
      res.status(500).json({ message: "Failed to delete game" });
    }
  });

  // === GAME BOARDS (junction) ===
  app.get("/api/games/:gameId/boards", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const gameId = parseId(req.params.gameId);
      if (gameId === null) {
        return res.status(400).json({ message: "Invalid game ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const game = await storage.getGame(gameId, userId, role);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      const gbs = await storage.getGameBoards(gameId);
      res.json(gbs);
    } catch (err) {
      console.error("Error fetching game boards:", err);
      res.status(500).json({ message: "Failed to fetch game boards" });
    }
  });

  app.post("/api/games/:gameId/boards", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const gameId = parseId(req.params.gameId);
      if (gameId === null) {
        return res.status(400).json({ message: "Invalid game ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const game = await storage.getGame(gameId, userId, role);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      const { boardId } = req.body;
      if (typeof boardId !== 'number' || !Number.isInteger(boardId) || boardId <= 0) {
        return res.status(400).json({ message: "A valid boardId is required" });
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

  app.delete("/api/games/:gameId/boards/:boardId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const gameId = parseId(req.params.gameId);
      const boardId = parseId(req.params.boardId);
      if (gameId === null || boardId === null) {
        return res.status(400).json({ message: "Invalid IDs" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const game = await storage.getGame(gameId, userId, role);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      const deleted = await storage.removeBoardFromGame(gameId, boardId);
      if (!deleted) {
        return res.status(404).json({ message: "Board not linked to this game" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error removing board from game:", err);
      res.status(500).json({ message: "Failed to remove board from game" });
    }
  });

  // === HEADS UP DECKS ===
  app.get("/api/heads-up-decks", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const decks = await storage.getHeadsUpDecks(userId, role);
      res.json(decks);
    } catch (err) {
      console.error("Error fetching decks:", err);
      res.status(500).json({ message: "Failed to fetch decks" });
    }
  });

  app.get("/api/heads-up-decks/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const deckId = parseId(req.params.id);
      if (deckId === null) {
        return res.status(400).json({ message: "Invalid deck ID" });
      }
      const deck = await storage.getHeadsUpDeck(deckId, userId, role);
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }
      res.json(deck);
    } catch (err) {
      console.error("Error fetching deck:", err);
      res.status(500).json({ message: "Failed to fetch deck" });
    }
  });

  app.post("/api/heads-up-decks", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      // Only Super Admins can create decks
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Only Super Admins can create decks" });
      }
      const { name, description, imageUrl, timerSeconds } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      const deck = await storage.createHeadsUpDeck({
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() || null : null,
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

  app.put("/api/heads-up-decks/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      // Only Super Admins can update decks
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Only Super Admins can update decks" });
      }
      const { name, description, imageUrl, timerSeconds } = req.body;
      const deckId = parseId(req.params.id);
      if (deckId === null) {
        return res.status(400).json({ message: "Invalid deck ID" });
      }
      const deck = await storage.updateHeadsUpDeck(deckId, { name, description, imageUrl, timerSeconds }, userId, role);
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }
      res.json(deck);
    } catch (err) {
      console.error("Error updating deck:", err);
      res.status(500).json({ message: "Failed to update deck" });
    }
  });

  app.delete("/api/heads-up-decks/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Only Super Admins can delete decks" });
      }
      const deckId = parseId(req.params.id);
      if (deckId === null) {
        return res.status(400).json({ message: "Invalid deck ID" });
      }
      const deleted = await storage.deleteHeadsUpDeck(deckId, userId, role);
      if (!deleted) {
        return res.status(404).json({ message: "Deck not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting deck:", err);
      res.status(500).json({ message: "Failed to delete deck" });
    }
  });

  // === HEADS UP CARDS ===
  app.get("/api/heads-up-decks/:deckId/cards", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const deckId = parseId(req.params.deckId);
      if (deckId === null) {
        return res.status(400).json({ message: "Invalid deck ID" });
      }
      const deck = await storage.getHeadsUpDeck(deckId, userId, role);
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }
      const cards = await storage.getHeadsUpCards(deckId);
      res.json(cards);
    } catch (err) {
      console.error("Error fetching cards:", err);
      res.status(500).json({ message: "Failed to fetch cards" });
    }
  });

  app.post("/api/heads-up-decks/:deckId/cards", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      // Only Super Admins can create cards
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Only Super Admins can create cards" });
      }
      const deckId = parseId(req.params.deckId);
      if (deckId === null) {
        return res.status(400).json({ message: "Invalid deck ID" });
      }
      const deck = await storage.getHeadsUpDeck(deckId, userId, role);
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }
      const { prompt, hints } = req.body;
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      const card = await storage.createHeadsUpCard({ deckId, prompt: prompt.trim(), hints: hints || [] });
      res.status(201).json(card);
    } catch (err) {
      console.error("Error creating card:", err);
      res.status(500).json({ message: "Failed to create card" });
    }
  });

  app.put("/api/heads-up-cards/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const role = req.session.userRole;
      // Only Super Admins can update cards
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Only Super Admins can update cards" });
      }
      const { prompt, hints } = req.body;
      const cardId = parseId(req.params.id);
      if (cardId === null) {
        return res.status(400).json({ message: "Invalid card ID" });
      }
      const card = await storage.updateHeadsUpCard(cardId, { prompt, hints });
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }
      res.json(card);
    } catch (err) {
      console.error("Error updating card:", err);
      res.status(500).json({ message: "Failed to update card" });
    }
  });

  app.delete("/api/heads-up-cards/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const role = req.session.userRole;
      if (role !== 'super_admin') {
        return res.status(403).json({ message: "Only Super Admins can delete cards" });
      }
      const cardId = parseId(req.params.id);
      if (cardId === null) {
        return res.status(400).json({ message: "Invalid card ID" });
      }
      const deleted = await storage.deleteHeadsUpCard(cardId);
      if (!deleted) {
        return res.status(404).json({ message: "Card not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting card:", err);
      res.status(500).json({ message: "Failed to delete card" });
    }
  });

  // === GAME DECKS (junction for heads up) ===
  app.get("/api/games/:gameId/decks", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const gameId = parseId(req.params.gameId);
      if (gameId === null) {
        return res.status(400).json({ message: "Invalid game ID" });
      }
      const game = await storage.getGame(gameId, userId, role);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      const gds = await storage.getGameDecks(gameId);
      res.json(gds);
    } catch (err) {
      console.error("Error fetching game decks:", err);
      res.status(500).json({ message: "Failed to fetch game decks" });
    }
  });

  app.post("/api/games/:gameId/decks", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const gameId = parseId(req.params.gameId);
      if (gameId === null) {
        return res.status(400).json({ message: "Invalid game ID" });
      }
      const game = await storage.getGame(gameId, userId, role);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      const { deckId } = req.body;
      if (typeof deckId !== 'number' || !Number.isInteger(deckId) || deckId <= 0) {
        return res.status(400).json({ message: "A valid deckId is required" });
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

  app.delete("/api/games/:gameId/decks/:deckId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const gameId = parseId(req.params.gameId);
      if (gameId === null) {
        return res.status(400).json({ message: "Invalid game ID" });
      }
      const deckId = parseId(req.params.deckId);
      if (deckId === null) {
        return res.status(400).json({ message: "Invalid deck ID" });
      }
      const game = await storage.getGame(gameId, userId, role);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      const deleted = await storage.removeDeckFromGame(gameId, deckId);
      if (!deleted) {
        return res.status(404).json({ message: "Deck not linked to this game" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error removing deck from game:", err);
      res.status(500).json({ message: "Failed to remove deck from game" });
    }
  });

  // Session API routes
  app.get("/api/session/:code", async (req, res) => {
    try {
      const session = await storage.getSessionByCode(req.params.code.toUpperCase());
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
  app.get("/api/host/sessions", isAuthenticated, isAdmin, async (req, res) => {
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
  app.get("/api/host/analytics", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const analytics = await storage.getHostAnalytics(userId);
      res.json(analytics);
    } catch (err) {
      console.error("Error getting host analytics:", err);
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  app.post('/api/upload', isAuthenticated, isAdmin, upload.single('file'), (req, res) => {
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

  app.get("/api/super-admin/dashboard", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const dashboard = await storage.getComprehensiveDashboard();
      res.json(dashboard);
    } catch (err) {
      console.error("Error getting dashboard:", err);
      res.status(500).json({ message: "Failed to get dashboard" });
    }
  });

  app.get("/api/super-admin/users", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsersDetailed();
      res.json(users);
    } catch (err) {
      console.error("Error getting users:", err);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.get("/api/super-admin/sessions", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const sessions = await storage.getAllGameSessionsDetailed();
      res.json(sessions);
    } catch (err) {
      console.error("Error getting sessions:", err);
      res.status(500).json({ message: "Failed to get sessions" });
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
      const boardId = parseId(req.params.id);
      if (boardId === null) {
        return res.status(400).json({ message: "Invalid board ID" });
      }
      await storage.deleteBoardFully(boardId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting board:", err);
      res.status(500).json({ message: "Failed to delete board" });
    }
  });

  app.patch("/api/super-admin/boards/:id/global", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const boardId = parseId(req.params.id);
      if (boardId === null) {
        return res.status(400).json({ message: "Invalid board ID" });
      }
      const { isGlobal } = req.body;
      if (typeof isGlobal !== 'boolean') {
        return res.status(400).json({ message: "isGlobal must be a boolean" });
      }
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

  // Toggle starter pack status for a grid
  const starterPackSchema = z.object({
    isStarterPack: z.boolean(),
  });
  
  app.patch("/api/super-admin/boards/:id/starter-pack", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const parsed = starterPackSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body" });
      }
      
      const boardId = parseId(req.params.id);
      if (boardId === null) {
        return res.status(400).json({ message: "Invalid board ID" });
      }
      const { isStarterPack } = parsed.data;
      const updated = await storage.setStarterPackBoard(boardId, isStarterPack);
      if (!updated) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating board starter pack status:", err);
      res.status(500).json({ message: "Failed to update board" });
    }
  });

  // Get all blitzgrid grids for super admin
  app.get("/api/super-admin/grids", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const grids = await storage.getAllBlitzgridsWithOwners();
      res.json(grids);
    } catch (err) {
      console.error("Error getting grids:", err);
      res.status(500).json({ message: "Failed to get grids" });
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
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid game type ID" });
      }
      const { hostEnabled, playerEnabled, description, sortOrder, status } = req.body;
      if (status !== undefined && !['active', 'hidden', 'coming_soon'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      if (hostEnabled !== undefined && typeof hostEnabled !== 'boolean') {
        return res.status(400).json({ message: "hostEnabled must be a boolean" });
      }
      if (playerEnabled !== undefined && typeof playerEnabled !== 'boolean') {
        return res.status(400).json({ message: "playerEnabled must be a boolean" });
      }
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
      
      // Pre-compute board count once for deterministic color assignment
      const allBoardsForColor = await storage.getBoards(userId, 'super_admin');
      let boardColorCounter = allBoardsForColor.length;
      
      for (const pack of starterPacks) {
        // Check if board with same name already exists
        const existingBoards = await storage.getGlobalBoards();
        const exists = existingBoards.some(b => b.name === pack.boardName);
        if (exists) {
          console.log(`Skipping existing board: ${pack.boardName}`);
          boardsSkipped++;
          continue;
        }
        
        // Create the board with auto-assigned color and preserved colorCode from export
        const starterColorIndex = boardColorCounter % BOARD_COLORS.length;
        const board = await storage.createBoard({
          name: pack.boardName,
          description: pack.boardDescription || '',
          pointValues: pack.pointValues || [10, 20, 30, 40, 50],
          colorCode: pack.colorCode || BOARD_COLORS[starterColorIndex],
          userId: userId,
        });
        boardColorCounter++;
        
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
          
          // Create questions for this category (skip duplicates by point value)
          const existingCatQuestions = await storage.getQuestionsByCategory(category.id);
          const existingPointSet = new Set(existingCatQuestions.map(q => q.points));
          for (const q of cat.questions || []) {
            if (existingPointSet.has(q.points)) {
              continue;
            }
            await storage.createQuestion({
              categoryId: category.id,
              question: q.question,
              correctAnswer: q.correctAnswer,
              points: q.points,
              options: q.options || [],
            });
            existingPointSet.add(q.points);
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

  // === ENHANCED SUPER ADMIN ANALYTICS ===
  
  app.get("/api/super-admin/analytics", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const analytics = await storage.getDetailedAnalytics();
      res.json(analytics);
    } catch (err) {
      console.error("Error getting analytics:", err);
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  app.get("/api/super-admin/top-games", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const topGames = await storage.getTopGames();
      res.json(topGames);
    } catch (err) {
      console.error("Error getting top games:", err);
      res.status(500).json({ message: "Failed to get top games" });
    }
  });

  app.get("/api/super-admin/room-stats", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const roomStats = await storage.getRoomStats();
      res.json(roomStats);
    } catch (err) {
      console.error("Error getting room stats:", err);
      res.status(500).json({ message: "Failed to get room stats" });
    }
  });

  app.get("/api/super-admin/conversion-funnel", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const funnel = await storage.getConversionFunnel();
      res.json(funnel);
    } catch (err) {
      console.error("Error getting conversion funnel:", err);
      res.status(500).json({ message: "Failed to get conversion funnel" });
    }
  });

  app.get("/api/super-admin/top-performers", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const performers = await storage.getTopPerformers();
      res.json(performers);
    } catch (err) {
      console.error("Error getting top performers:", err);
      res.status(500).json({ message: "Failed to get top performers" });
    }
  });

  // === USER MANAGEMENT ===
  
  app.patch("/api/super-admin/users/:id/role", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (!role || !['user', 'admin', 'super_admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const updated = await storage.updateUserRole(id, role);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating user role:", err);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.get("/api/super-admin/users/:id/activity", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const activity = await storage.getUserActivity(id);
      if (!activity) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(activity);
    } catch (err) {
      console.error("Error getting user activity:", err);
      res.status(500).json({ message: "Failed to get user activity" });
    }
  });

  // === CONTENT MODERATION ===
  
  app.patch("/api/super-admin/boards/:id/moderation", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const boardId = parseId(req.params.id);
      if (boardId === null) {
        return res.status(400).json({ message: "Invalid board ID" });
      }
      const { moderationStatus, isFeatured, flagReason } = req.body;
      if (moderationStatus !== undefined && !['pending', 'approved', 'rejected', 'flagged'].includes(moderationStatus)) {
        return res.status(400).json({ message: "Invalid moderation status" });
      }
      const updated = await storage.updateBoardModeration(boardId, {
        moderationStatus,
        isFeatured,
        flagReason,
        moderatedBy: req.session.userId,
      });
      if (!updated) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating board moderation:", err);
      res.status(500).json({ message: "Failed to update moderation" });
    }
  });

  app.get("/api/super-admin/boards/featured", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const featured = await storage.getFeaturedBoards();
      res.json(featured);
    } catch (err) {
      console.error("Error getting featured boards:", err);
      res.status(500).json({ message: "Failed to get featured boards" });
    }
  });

  app.get("/api/super-admin/boards/flagged", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const flagged = await storage.getFlaggedBoards();
      res.json(flagged);
    } catch (err) {
      console.error("Error getting flagged boards:", err);
      res.status(500).json({ message: "Failed to get flagged boards" });
    }
  });

  // === ANNOUNCEMENTS ===
  
  app.post("/api/super-admin/announcements", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { title, message, type, expiresAt } = req.body;
      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ message: "Title is required" });
      }
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }
      const validTypes = ['info', 'warning', 'error', 'success'];
      const announcementType = (type && validTypes.includes(type)) ? type : 'info';
      const announcement = await storage.createAnnouncement({
        title: title.trim(),
        message: message.trim(),
        type: announcementType,
        createdBy: req.session.userId!,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });
      res.status(201).json(announcement);
    } catch (err) {
      console.error("Error creating announcement:", err);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  app.get("/api/super-admin/announcements", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const announcements = await storage.getActiveAnnouncements();
      res.json(announcements);
    } catch (err) {
      console.error("Error getting announcements:", err);
      res.status(500).json({ message: "Failed to get announcements" });
    }
  });

  app.delete("/api/super-admin/announcements/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid announcement ID" });
      }
      await storage.deleteAnnouncement(id);
      res.json({ message: "Announcement deleted" });
    } catch (err) {
      console.error("Error deleting announcement:", err);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  // === SYSTEM HEALTH ===
  
  app.get("/api/super-admin/db-stats", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const stats = await storage.getDatabaseStats();
      res.json(stats);
    } catch (err) {
      console.error("Error getting DB stats:", err);
      res.status(500).json({ message: "Failed to get database stats" });
    }
  });

  // === EXPORT ===
  
  app.get("/api/super-admin/export", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const data = await storage.exportPlatformData();
      res.json(data);
    } catch (err) {
      console.error("Error exporting data:", err);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // === GAME QUESTIONS ===

  app.get("/api/super-admin/questions/sequence", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const questions = await storage.getAllSequenceQuestionsWithCreators();
      res.json(questions);
    } catch (err) {
      console.error("Error getting sequence questions:", err);
      res.status(500).json({ message: "Failed to get sequence questions" });
    }
  });

  app.get("/api/super-admin/questions/psyop", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const questions = await storage.getAllPsyopQuestionsWithCreators();
      res.json(questions);
    } catch (err) {
      console.error("Error getting psyop questions:", err);
      res.status(500).json({ message: "Failed to get psyop questions" });
    }
  });

  app.get("/api/super-admin/questions/blitzgrid", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const questions = await storage.getAllBlitzgridQuestionsWithCreators();
      res.json(questions);
    } catch (err) {
      console.error("Error getting blitzgrid questions:", err);
      res.status(500).json({ message: "Failed to get blitzgrid questions" });
    }
  });

  app.patch("/api/super-admin/questions/sequence/:id/starter-pack", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const questionId = parseId(req.params.id);
      if (questionId === null) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      const { isStarterPack } = req.body;
      if (typeof isStarterPack !== 'boolean') {
        return res.status(400).json({ message: "isStarterPack must be a boolean" });
      }
      const updated = await storage.toggleSequenceQuestionStarterPack(questionId, isStarterPack);
      if (!updated) {
        return res.status(404).json({ message: "Question not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error toggling sequence starter pack:", err);
      res.status(500).json({ message: "Failed to toggle starter pack" });
    }
  });

  app.delete("/api/super-admin/questions/sequence/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const questionId = parseId(req.params.id);
      if (questionId === null) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      const userId = req.session.userId!;
      const deleted = await storage.deleteSequenceQuestion(questionId, userId, 'super_admin');
      if (!deleted) {
        return res.status(404).json({ message: "Question not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting sequence question:", err);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  app.patch("/api/super-admin/questions/psyop/:id/starter-pack", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const questionId = parseId(req.params.id);
      if (questionId === null) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      const { isStarterPack } = req.body;
      if (typeof isStarterPack !== 'boolean') {
        return res.status(400).json({ message: "isStarterPack must be a boolean" });
      }
      const updated = await storage.togglePsyopQuestionStarterPack(questionId, isStarterPack);
      if (!updated) {
        return res.status(404).json({ message: "Question not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error toggling psyop starter pack:", err);
      res.status(500).json({ message: "Failed to toggle starter pack" });
    }
  });

  // Delete BlitzGrid question (super admin only)
  app.delete("/api/super-admin/questions/blitzgrid/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const questionId = parseId(req.params.id);
      if (questionId === null) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      await storage.deleteQuestion(questionId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting blitzgrid question:", err);
      res.status(500).json({ message: "Failed to delete question" });
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


  // ============================================
  // Sort Circuit Routes
  // ============================================
  
  app.get("/api/sequence-squeeze/questions", isAuthenticated, isAdmin, async (req, res) => {
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

  app.post("/api/sequence-squeeze/questions", isAuthenticated, isAdmin, async (req, res) => {
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
      if (orderSet.size !== 4 || !correctOrder.every((l: any) => typeof l === 'string' && validLetters.has(l))) {
        return res.status(400).json({ message: "correctOrder must contain exactly A, B, C, D in some order" });
      }
      
      const tQuestion = question.trim();
      const tOptionA = optionA.trim();
      const tOptionB = optionB.trim();
      const tOptionC = optionC.trim();
      const tOptionD = optionD.trim();
      const tHint = (hint && typeof hint === 'string') ? hint.trim() : null;
      
      if (tQuestion.length > 500) {
        return res.status(400).json({ message: "Question text must be 500 characters or less" });
      }
      if (tOptionA.length > 200 || tOptionB.length > 200 || tOptionC.length > 200 || tOptionD.length > 200) {
        return res.status(400).json({ message: "Each option must be 200 characters or less" });
      }
      
      const optionValues = new Set([tOptionA.toLowerCase(), tOptionB.toLowerCase(), tOptionC.toLowerCase(), tOptionD.toLowerCase()]);
      if (optionValues.size < 4) {
        return res.status(400).json({ message: "All four options must be unique" });
      }
      
      if (hint !== undefined && hint !== null && typeof hint !== 'string') {
        return res.status(400).json({ message: "Hint must be text" });
      }
      if (tHint && tHint.length > 200) {
        return res.status(400).json({ message: "Hint must be 200 characters or less" });
      }
      
      const newQuestion = await storage.createSequenceQuestion({
        userId,
        question: tQuestion,
        optionA: tOptionA,
        optionB: tOptionB,
        optionC: tOptionC,
        optionD: tOptionD,
        correctOrder,
        hint: tHint || null,
        isActive: isActive !== false,
      });
      
      res.status(201).json(newQuestion);
    } catch (err) {
      console.error("Error creating sequence question:", err);
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  app.patch("/api/sequence-squeeze/questions/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const { question, optionA, optionB, optionC, optionD, correctOrder, hint, isActive } = req.body;
      
      const updateData: Record<string, any> = {};
      
      if (isActive !== undefined) {
        if (typeof isActive !== 'boolean') {
          return res.status(400).json({ message: "isActive must be a boolean" });
        }
        updateData.isActive = isActive;
      }
      
      if (question !== undefined) {
        if (typeof question !== 'string' || question.trim().length === 0) {
          return res.status(400).json({ message: "Question text cannot be empty" });
        }
        const trimmedQuestion = question.trim();
        if (trimmedQuestion.length > 500) {
          return res.status(400).json({ message: "Question text must be 500 characters or less" });
        }
        updateData.question = trimmedQuestion;
      }
      
      for (const [key, label] of [['optionA', 'Option A'], ['optionB', 'Option B'], ['optionC', 'Option C'], ['optionD', 'Option D']] as const) {
        const val = req.body[key];
        if (val !== undefined) {
          if (typeof val !== 'string' || val.trim().length === 0) {
            return res.status(400).json({ message: `${label} cannot be empty` });
          }
          const trimmedVal = val.trim();
          if (trimmedVal.length > 200) {
            return res.status(400).json({ message: `${label} must be 200 characters or less` });
          }
          updateData[key] = trimmedVal;
        }
      }
      
      if (correctOrder !== undefined) {
        if (!Array.isArray(correctOrder) || correctOrder.length !== 4) {
          return res.status(400).json({ message: "correctOrder must be an array of 4 letters" });
        }
        const validLetters = new Set(['A', 'B', 'C', 'D']);
        const orderSet = new Set(correctOrder);
        if (orderSet.size !== 4 || !correctOrder.every((l: any) => typeof l === 'string' && validLetters.has(l))) {
          return res.status(400).json({ message: "correctOrder must contain exactly A, B, C, D in some order" });
        }
        updateData.correctOrder = correctOrder;
      }
      
      if (hint !== undefined) {
        if (hint !== null && typeof hint !== 'string') {
          return res.status(400).json({ message: "Hint must be text or null" });
        }
        const trimmedHint = (typeof hint === 'string') ? hint.trim() : null;
        if (trimmedHint && trimmedHint.length > 200) {
          return res.status(400).json({ message: "Hint must be 200 characters or less" });
        }
        updateData.hint = (trimmedHint && trimmedHint.length > 0) ? trimmedHint : null;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }
      
      if (updateData.optionA !== undefined || updateData.optionB !== undefined || updateData.optionC !== undefined || updateData.optionD !== undefined) {
        const currentQ = await storage.getSequenceQuestionById(id);
        if (currentQ) {
          const finalA = (updateData.optionA || currentQ.optionA).toLowerCase();
          const finalB = (updateData.optionB || currentQ.optionB).toLowerCase();
          const finalC = (updateData.optionC || currentQ.optionC).toLowerCase();
          const finalD = (updateData.optionD || currentQ.optionD).toLowerCase();
          if (new Set([finalA, finalB, finalC, finalD]).size < 4) {
            return res.status(400).json({ message: "All four options must be unique" });
          }
        }
      }
      
      const updated = await storage.updateSequenceQuestion(id, updateData, userId, role);
      if (!updated) {
        return res.status(404).json({ message: "Question not found or unauthorized" });
      }
      
      res.json(updated);
    } catch (err) {
      console.error("Error updating sequence question:", err);
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  app.delete("/api/sequence-squeeze/questions/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
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

  app.post("/api/sequence-squeeze/questions/bulk", isAuthenticated, isAdmin, async (req, res) => {
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
          if (!q.optionA || typeof q.optionA !== 'string' || q.optionA.trim().length === 0 ||
              !q.optionB || typeof q.optionB !== 'string' || q.optionB.trim().length === 0 ||
              !q.optionC || typeof q.optionC !== 'string' || q.optionC.trim().length === 0 ||
              !q.optionD || typeof q.optionD !== 'string' || q.optionD.trim().length === 0) {
            results.errors.push(`Row ${i + 1}: All four options are required and must be non-empty text`);
            continue;
          }
          if (!Array.isArray(q.correctOrder) || q.correctOrder.length !== 4) {
            results.errors.push(`Row ${i + 1}: correctOrder must have 4 items`);
            continue;
          }
          const orderSet = new Set(q.correctOrder);
          if (orderSet.size !== 4 || !q.correctOrder.every((l: any) => typeof l === 'string' && validLetters.has(l))) {
            results.errors.push(`Row ${i + 1}: correctOrder must contain A, B, C, D exactly once`);
            continue;
          }
          const trimmedQ = q.question.trim();
          const trimmedA = q.optionA.trim();
          const trimmedB = q.optionB.trim();
          const trimmedC = q.optionC.trim();
          const trimmedD = q.optionD.trim();
          const bulkOptionValues = new Set([trimmedA.toLowerCase(), trimmedB.toLowerCase(), trimmedC.toLowerCase(), trimmedD.toLowerCase()]);
          if (bulkOptionValues.size < 4) {
            results.errors.push(`Row ${i + 1}: All four options must be unique`);
            continue;
          }
          const trimmedHint = (q.hint && typeof q.hint === 'string') ? q.hint.trim() : null;
          if (trimmedQ.length > 500) {
            results.errors.push(`Row ${i + 1}: Question too long (max 500 chars)`);
            continue;
          }
          if (trimmedA.length > 200 || trimmedB.length > 200 || trimmedC.length > 200 || trimmedD.length > 200) {
            results.errors.push(`Row ${i + 1}: Option too long (max 200 chars)`);
            continue;
          }
          if (trimmedHint && trimmedHint.length > 200) {
            results.errors.push(`Row ${i + 1}: Hint must be 200 characters or less`);
            continue;
          }
          
          await storage.createSequenceQuestion({
            userId,
            question: trimmedQ,
            optionA: trimmedA,
            optionB: trimmedB,
            optionC: trimmedC,
            optionD: trimmedD,
            correctOrder: q.correctOrder,
            hint: trimmedHint || null,
            isActive: q.isActive !== false,
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

  // Conversational AI for Sort Circuit questions
  app.post("/api/sequence-squeeze/questions/chat", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { messages } = req.body;
      
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "Messages required" });
      }
      
      const validRoles = new Set(['user', 'assistant']);
      const sanitizedMessages = messages
        .filter((m: any) => m && typeof m.role === 'string' && validRoles.has(m.role) && typeof m.content === 'string' && m.content.trim().length > 0)
        .map((m: any) => ({ role: m.role, content: m.content.slice(0, 2000) }));
      
      if (sanitizedMessages.length === 0) {
        return res.status(400).json({ message: "At least one valid message is required" });
      }
      
      const groqKey = process.env.GROQ_API_KEY;
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!groqKey && !openaiKey) {
        return res.status(500).json({ message: "AI service not configured. Please set GROQ_API_KEY or OPENAI_API_KEY." });
      }

      const useGroq = !!groqKey;
      const apiKey = groqKey || openaiKey!;
      const apiUrl = useGroq
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const model = useGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

      const systemPrompt = `You are a friendly assistant helping create "Sort Circuit" game questions. These are ordering/ranking questions where players put 4 items in correct order.

Your job:
1. Understand what kind of questions the user wants
2. Generate ordering questions based on their requests
3. Take feedback and iterate

When you generate questions, ALWAYS include them in a JSON block like this:
\`\`\`json
[
  {
    "question": "Order these by size (smallest to largest)",
    "optionA": "Ant",
    "optionB": "Cat",
    "optionC": "Elephant",
    "optionD": "Blue Whale",
    "hint": "Think about common animals"
  }
]
\`\`\`

Options A→B→C→D must be in CORRECT order. Keep options SHORT (max 50 chars).

If the user just wants to chat or asks for changes, respond conversationally. Only include the JSON block when you're providing actual questions.

Be creative and fun! Make questions engaging and varied.`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...sanitizedMessages.slice(-10)
          ],
          temperature: 0.8,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`${useGroq ? 'Groq' : 'OpenAI'} API error:`, error);
        return res.status(500).json({ message: "Failed to get AI response" });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      
      // Try to extract questions from JSON block
      let questions: any[] = [];
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          questions = JSON.parse(jsonMatch[1]);
          if (!Array.isArray(questions)) questions = [];
        } catch (e) {
          questions = [];
        }
      }

      // Clean message by removing JSON blocks for display
      const cleanMessage = content.replace(/```json[\s\S]*?```/g, '').trim() || 
        (questions.length > 0 ? `Here are ${questions.length} question(s) for you!` : content);

      const validQuestions = questions
        .filter((q: any) => {
          if (!q || typeof q.question !== 'string' || q.question.trim().length === 0) return false;
          if (typeof q.optionA !== 'string' || q.optionA.trim().length === 0) return false;
          if (typeof q.optionB !== 'string' || q.optionB.trim().length === 0) return false;
          if (typeof q.optionC !== 'string' || q.optionC.trim().length === 0) return false;
          if (typeof q.optionD !== 'string' || q.optionD.trim().length === 0) return false;
          const opts = new Set([q.optionA.trim().toLowerCase(), q.optionB.trim().toLowerCase(), q.optionC.trim().toLowerCase(), q.optionD.trim().toLowerCase()]);
          if (opts.size < 4) return false;
          return true;
        })
        .map((q: any) => ({
          question: q.question.trim().slice(0, 500),
          optionA: q.optionA.trim().slice(0, 200),
          optionB: q.optionB.trim().slice(0, 200),
          optionC: q.optionC.trim().slice(0, 200),
          optionD: q.optionD.trim().slice(0, 200),
          correctOrder: ['A', 'B', 'C', 'D'],
          hint: (typeof q.hint === 'string' && q.hint.trim().length > 0) ? q.hint.trim().slice(0, 200) : null
        }));

      res.json({ 
        message: cleanMessage, 
        questions: validQuestions,
      });
    } catch (err) {
      console.error("Error in AI chat:", err);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // PsyOp API routes
  app.get("/api/psyop/questions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const questions = await storage.getPsyopQuestions(userId, role);
      res.json(questions);
    } catch (err) {
      console.error("Error getting PsyOp questions:", err);
      res.status(500).json({ message: "Failed to get questions" });
    }
  });

  app.post("/api/psyop/questions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { factText, correctAnswer, category, isActive } = req.body;
      
      if (!factText || typeof factText !== 'string' || factText.trim().length === 0) {
        return res.status(400).json({ message: "Fact text is required" });
      }
      if (!factText.includes('[REDACTED]')) {
        return res.status(400).json({ message: "Fact text must contain [REDACTED] placeholder" });
      }
      if (!correctAnswer || typeof correctAnswer !== 'string' || correctAnswer.trim().length === 0) {
        return res.status(400).json({ message: "Correct answer is required" });
      }
      if (factText.length > 500) {
        return res.status(400).json({ message: "Fact text too long (max 500 chars)" });
      }
      if (correctAnswer.length > 100) {
        return res.status(400).json({ message: "Answer too long (max 100 chars)" });
      }

      const question = await storage.createPsyopQuestion({
        userId,
        factText: factText.trim(),
        correctAnswer: correctAnswer.trim(),
        category: category?.trim() || null,
        isActive: isActive ?? true,
      });
      res.json(question);
    } catch (err) {
      console.error("Error creating PsyOp question:", err);
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  app.put("/api/psyop/questions/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const { factText, correctAnswer, category } = req.body;
      
      if (!factText || typeof factText !== 'string' || factText.trim().length === 0) {
        return res.status(400).json({ message: "Fact text is required" });
      }
      if (!factText.includes('[REDACTED]')) {
        return res.status(400).json({ message: "Fact text must contain [REDACTED] placeholder" });
      }
      if (!correctAnswer || typeof correctAnswer !== 'string' || correctAnswer.trim().length === 0) {
        return res.status(400).json({ message: "Correct answer is required" });
      }
      if (factText.length > 500) {
        return res.status(400).json({ message: "Fact text too long (max 500 chars)" });
      }
      if (correctAnswer.length > 100) {
        return res.status(400).json({ message: "Answer too long (max 100 chars)" });
      }

      const updated = await storage.updatePsyopQuestion(id, {
        factText: factText.trim(),
        correctAnswer: correctAnswer.trim(),
        category: category?.trim() || null,
      }, userId, role);
      
      if (!updated) {
        return res.status(404).json({ message: "Question not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating PsyOp question:", err);
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  app.delete("/api/psyop/questions/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      const deleted = await storage.deletePsyopQuestion(id, userId, role);
      if (!deleted) {
        return res.status(404).json({ message: "Question not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting PsyOp question:", err);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  app.post("/api/psyop/questions/bulk", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { questions } = req.body;
      
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "Questions array is required" });
      }
      if (questions.length > 50) {
        return res.status(400).json({ message: "Maximum 50 questions per import" });
      }

      const results: { success: number; errors: string[] } = { success: 0, errors: [] };
      
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        try {
          if (!q.factText || !q.factText.includes('[REDACTED]')) {
            results.errors.push(`Row ${i + 1}: Missing [REDACTED] placeholder`);
            continue;
          }
          if (!q.correctAnswer) {
            results.errors.push(`Row ${i + 1}: Missing correct answer`);
            continue;
          }
          if (q.factText.length > 500) {
            results.errors.push(`Row ${i + 1}: Fact text too long (max 500 chars)`);
            continue;
          }
          if (q.correctAnswer.length > 100) {
            results.errors.push(`Row ${i + 1}: Answer too long (max 100 chars)`);
            continue;
          }
          
          await storage.createPsyopQuestion({
            userId,
            factText: q.factText.trim(),
            correctAnswer: q.correctAnswer.trim(),
            category: q.category?.trim() || null,
            isActive: true,
          });
          results.success++;
        } catch (err) {
          results.errors.push(`Row ${i + 1}: Database error`);
        }
      }
      
      res.json(results);
    } catch (err) {
      console.error("Error bulk importing PsyOp questions:", err);
      res.status(500).json({ message: "Failed to import questions" });
    }
  });

  // Conversational AI for PsyOp questions
  app.post("/api/psyop/questions/chat", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { messages } = req.body;
      
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "Messages required" });
      }
      
      const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "AI service not configured. Please set GROQ_API_KEY." });
      }

      const systemPrompt = `You are a friendly assistant helping create "PsyOp" game questions. PsyOp is a deception game where:
1. Players see a fact with a [REDACTED] blank
2. Players submit FAKE answers to fill in the blank
3. All answers (including the real one) are shown
4. Players vote on which they think is REAL

Your job:
1. Understand what kind of facts/questions the user wants
2. Generate fill-in-the-blank trivia facts
3. Take feedback and iterate

When you generate questions, ALWAYS include them in a JSON block like this:
\`\`\`json
[
  {
    "factText": "The [REDACTED] is the largest mammal on Earth",
    "correctAnswer": "blue whale",
    "category": "Science"
  }
]
\`\`\`

Rules:
- factText MUST contain exactly one [REDACTED] placeholder
- correctAnswer is what fills in the blank
- Make facts interesting and not too obvious (so fake answers are plausible)
- Category is optional but helpful for organization

If the user just wants to chat or asks for changes, respond conversationally. Only include the JSON block when you're providing actual questions.

Be creative! Make facts surprising and fun to guess.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-10)
          ],
          temperature: 0.8,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Groq API error:', error);
        return res.status(500).json({ message: "Failed to get AI response" });
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || "";
      
      // Try to extract questions from JSON block
      let questions: any[] = [];
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          questions = JSON.parse(jsonMatch[1]);
        } catch (e) {
          // JSON parsing failed, that's ok
        }
      }
      
      res.json({ 
        reply: content.replace(/```json[\s\S]*?```/g, '').trim() || "Here are some questions!",
        questions 
      });
    } catch (err) {
      console.error("Error in PsyOp AI chat:", err);
      res.status(500).json({ message: "Failed to get AI response" });
    }
  });

  // ==================== TimeWarp API ====================
  
  app.get("/api/pastforward/questions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const questions = await storage.getTimeWarpQuestions(userId, role);
      res.json(questions);
    } catch (err) {
      console.error("Error fetching TimeWarp questions:", err);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  // Zod schema for TimeWarp question creation
  const createTimeWarpSchema = z.object({
    imageUrl: z.string().min(1, "Image URL is required"),
    era: z.enum(["past", "present", "future"], { 
      errorMap: () => ({ message: "Era must be 'past', 'present', or 'future'" })
    }),
    answer: z.string().min(1, "Answer is required"),
    hint: z.string().optional(),
    category: z.string().optional(),
  });

  app.post("/api/pastforward/questions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const parsed = createTimeWarpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      
      const { imageUrl, era, answer, hint, category } = parsed.data;
      
      const question = await storage.createTimeWarpQuestion({
        userId,
        imageUrl,
        era,
        answer,
        hint: hint || null,
        category: category || null,
        isActive: true,
      });
      
      res.json(question);
    } catch (err) {
      console.error("Error creating TimeWarp question:", err);
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  // Zod schema for TimeWarp question updates (all fields optional)
  const updateTimeWarpSchema = z.object({
    imageUrl: z.string().min(1).optional(),
    era: z.enum(["past", "present", "future"], { 
      errorMap: () => ({ message: "Era must be 'past', 'present', or 'future'" })
    }).optional(),
    answer: z.string().min(1).optional(),
    hint: z.string().optional(),
    category: z.string().optional(),
    isActive: z.boolean().optional(),
  });

  app.put("/api/pastforward/questions/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      
      const parsed = updateTimeWarpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      
      const { imageUrl, era, answer, hint, category, isActive } = parsed.data;
      
      const updated = await storage.updateTimeWarpQuestion(id, {
        imageUrl,
        era,
        answer,
        hint,
        category,
        isActive,
      }, userId, role);
      
      if (!updated) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      res.json(updated);
    } catch (err) {
      console.error("Error updating TimeWarp question:", err);
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  app.delete("/api/pastforward/questions/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      
      const deleted = await storage.deleteTimeWarpQuestion(id, userId, role);
      if (!deleted) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting TimeWarp question:", err);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // ==================== Meme No Harm API ====================
  
  app.get("/api/memenoharm/prompts", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const prompts = await storage.getMemePrompts(userId, role);
      res.json(prompts);
    } catch (err) {
      console.error("Error fetching Meme prompts:", err);
      res.status(500).json({ message: "Failed to fetch prompts" });
    }
  });

  const createMemePromptSchema = z.object({
    prompt: z.string().min(1, "Prompt is required").max(200, "Prompt must be 200 characters or less"),
  });

  app.post("/api/memenoharm/prompts", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      const parsed = createMemePromptSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const existingPrompts = await storage.getMemePrompts(userId, role);
      const duplicate = existingPrompts.find(
        p => p.prompt.toLowerCase().trim() === parsed.data.prompt.toLowerCase().trim()
      );
      if (duplicate) {
        return res.status(409).json({ message: "This prompt already exists" });
      }
      
      const prompt = await storage.createMemePrompt({
        userId,
        prompt: parsed.data.prompt.trim(),
        isActive: true,
      });
      
      res.json(prompt);
    } catch (err) {
      console.error("Error creating Meme prompt:", err);
      res.status(500).json({ message: "Failed to create prompt" });
    }
  });

  const updateMemePromptSchema = z.object({
    prompt: z.string().min(1, "Prompt is required").max(200, "Prompt must be 200 characters or less"),
    isActive: z.boolean().optional(),
  });

  app.put("/api/memenoharm/prompts/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid prompt ID" });
      }
      
      const parsed = updateMemePromptSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const updateData: Record<string, any> = {};
      if (parsed.data.prompt !== undefined) {
        const trimmedPrompt = parsed.data.prompt.trim();
        if (!trimmedPrompt) {
          return res.status(400).json({ message: "Prompt cannot be empty" });
        }
        const existingPrompts = await storage.getMemePrompts(userId, role);
        const duplicate = existingPrompts.find(
          p => p.id !== id && p.prompt.toLowerCase().trim() === trimmedPrompt.toLowerCase()
        );
        if (duplicate) {
          return res.status(409).json({ message: "A prompt with this text already exists" });
        }
        updateData.prompt = trimmedPrompt;
      }
      if (parsed.data.isActive !== undefined) {
        updateData.isActive = parsed.data.isActive;
      }
      
      const updated = await storage.updateMemePrompt(id, updateData, userId, role);
      
      if (!updated) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      res.json(updated);
    } catch (err) {
      console.error("Error updating Meme prompt:", err);
      res.status(500).json({ message: "Failed to update prompt" });
    }
  });

  app.delete("/api/memenoharm/prompts/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid prompt ID" });
      }
      
      const deleted = await storage.deleteMemePrompt(id, userId, role);
      if (!deleted) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting Meme prompt:", err);
      res.status(500).json({ message: "Failed to delete prompt" });
    }
  });

  app.post("/api/memenoharm/prompts/generate", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { category = "mixed", count = 10 } = req.body;
      const promptCount = Math.min(Math.max(1, Number(count)), 20);

      const groqKey = process.env.GROQ_API_KEY;
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!groqKey && !openaiKey) {
        return res.status(500).json({ message: "AI service not configured. Please set GROQ_API_KEY." });
      }

      const categoryInstructions: Record<string, string> = {
        work: "Focus on workplace humor: terrible bosses, pointless meetings, corporate jargon, office politics, passive-aggressive emails, working from home disasters, LinkedIn cringe, hustle culture, deadlines, Monday mornings.",
        dating: "Focus on dating and relationships: awkward first dates, red flags, ghosting, dating app disasters, situationships, the 'ick', toxic exes, DM sliding, commitment issues, unrequited love.",
        history: "Focus on historical events and figures: ancient civilizations, wars that started over stupid reasons, ridiculous historical facts, famous last words, empires falling, historical figures in modern situations.",
        pop_culture: "Focus on pop culture: celebrity drama, reality TV, social media trends, viral moments, cancelled celebrities, fan behavior, award show disasters, music feuds, movie plot holes.",
        family: "Focus on family dynamics: overbearing parents, sibling rivalries, family group chats, holiday gatherings, passive-aggressive relatives, 'we need to talk' moments, embarrassing family stories.",
        school: "Focus on school and education: nightmare professors, group projects where you do all the work, exam panic, student loans, all-nighters, cafeteria food, graduation reality checks.",
        technology: "Focus on technology fails: autocorrect disasters, accidentally sending messages to the wrong person, WiFi going out at the worst time, phone dying at 1%, software updates breaking everything.",
        existential: "Focus on existential and philosophical humor: the meaning of life, adulting failures, quarter-life crisis, pretending to have your life together, existential dread disguised as humor.",
        mixed: "Mix across all categories: work, dating, history, pop culture, family, school, technology, and existential humor. Make each prompt from a different category for variety."
      };

      const instructions = categoryInstructions[category] || categoryInstructions.mixed;

      const useGroq = !!groqKey;
      const apiUrl = useGroq
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const apiKey = groqKey || openaiKey;
      const model = useGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `You are a prompt generator for a party game called "Meme No Harm" where players search for GIFs that best match a given prompt. The prompts should be hilarious, edgy, and unapologetically offensive — the kind that make people laugh out loud at a party.

Rules for generating prompts:
- Each prompt should be a scenario, feeling, or situation that players can find the perfect GIF reaction for
- Be BOLD and UNFILTERED — dark humor, savage observations, uncomfortable truths are encouraged
- Prompts should be relatable but with a sharp, provocative edge
- Keep prompts concise (under 15 words ideally) so they're easy to read quickly during gameplay
- Avoid anything that targets specific real people by name
- Make prompts that inspire creative and funny GIF responses

${instructions}

Return ONLY a JSON array of strings, each being one prompt. Example format:
["When your ex texts 'I miss you' at 2am...", "That one coworker who replies all to every email..."]

Generate exactly ${promptCount} prompts.`
            },
            {
              role: 'user',
              content: `Generate ${promptCount} hilarious, edgy prompts for the "${category}" category.`
            }
          ],
          temperature: 1.0,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`${useGroq ? 'Groq' : 'OpenAI'} API error:`, error);
        return res.status(500).json({ message: "Failed to generate prompts" });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        return res.status(500).json({ message: "No response from AI" });
      }

      let prompts: string[];
      try {
        const parsed = JSON.parse(content);
        prompts = Array.isArray(parsed) ? parsed : (parsed.prompts || parsed.data || Object.values(parsed).flat());
        prompts = prompts.filter((p: any) => typeof p === 'string' && p.trim().length > 0);
      } catch (parseErr) {
        console.error("Failed to parse AI response content:", content);
        return res.status(500).json({ message: "Failed to parse AI response" });
      }

      res.json({ prompts });
    } catch (err) {
      console.error("Error generating Meme prompts:", err);
      res.status(500).json({ message: "Failed to generate prompts" });
    }
  });

  app.get("/api/memenoharm/images", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const images = await storage.getMemeImages(userId, role);
      res.json(images);
    } catch (err) {
      console.error("Error fetching Meme images:", err);
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  const createMemeImageSchema = z.object({
    imageUrl: z.string().min(1, "Image URL is required"),
    caption: z.string().optional(),
  });

  app.post("/api/memenoharm/images", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const parsed = createMemeImageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      
      const image = await storage.createMemeImage({
        userId,
        imageUrl: parsed.data.imageUrl,
        caption: parsed.data.caption || null,
        isActive: true,
      });
      
      res.json(image);
    } catch (err) {
      console.error("Error creating Meme image:", err);
      res.status(500).json({ message: "Failed to create image" });
    }
  });

  const updateMemeImageSchema = z.object({
    imageUrl: z.string().min(1, "Image URL is required").optional(),
    caption: z.string().max(200, "Caption must be 200 characters or less").optional().nullable(),
    isActive: z.boolean().optional(),
  });

  app.put("/api/memenoharm/images/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid image ID" });
      }

      const parsed = updateMemeImageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const updateData: Record<string, any> = {};
      if (parsed.data.imageUrl !== undefined) updateData.imageUrl = parsed.data.imageUrl;
      if (parsed.data.caption !== undefined) updateData.caption = parsed.data.caption;
      if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      const updated = await storage.updateMemeImage(id, updateData, userId, role);
      
      if (!updated) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      res.json(updated);
    } catch (err) {
      console.error("Error updating Meme image:", err);
      res.status(500).json({ message: "Failed to update image" });
    }
  });

  app.delete("/api/memenoharm/images/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid image ID" });
      }
      
      const deleted = await storage.deleteMemeImage(id, userId, role);
      if (!deleted) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting Meme image:", err);
      res.status(500).json({ message: "Failed to delete image" });
    }
  });

  // ==================== GIPHY SEARCH PROXY ====================
  
  app.get("/api/giphy/search", async (req, res) => {
    try {
      const q = req.query.q as string;
      const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      
      if (!q || q.trim().length === 0) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const apiKey = process.env.GIPHY_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "GIPHY API key not configured" });
      }
      
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(q.trim())}&limit=${limit}&offset=${offset}&rating=pg-13&lang=en`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("GIPHY API error:", response.status, errorText);
        return res.status(response.status).json({ message: "GIPHY search failed" });
      }
      
      const data = await response.json();
      
      const results = data.data.map((gif: any) => ({
        id: gif.id,
        title: gif.title,
        previewUrl: gif.images.fixed_height_small.url,
        fullUrl: gif.images.original.url,
        width: parseInt(gif.images.original.width),
        height: parseInt(gif.images.original.height),
      }));
      
      res.json({
        results,
        totalCount: data.pagination.total_count,
        offset: data.pagination.offset,
      });
    } catch (err) {
      console.error("Error searching GIPHY:", err);
      res.status(500).json({ message: "Failed to search GIPHY" });
    }
  });

  app.get("/api/giphy/trending", async (req, res) => {
    try {
      const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      
      const apiKey = process.env.GIPHY_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "GIPHY API key not configured" });
      }
      
      const url = `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(apiKey)}&limit=${limit}&offset=${offset}&rating=pg-13`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return res.status(response.status).json({ message: "GIPHY trending failed" });
      }
      
      const data = await response.json();
      
      const results = data.data.map((gif: any) => ({
        id: gif.id,
        title: gif.title,
        previewUrl: gif.images.fixed_height_small.url,
        fullUrl: gif.images.original.url,
        width: parseInt(gif.images.original.width),
        height: parseInt(gif.images.original.height),
      }));
      
      res.json({
        results,
        totalCount: data.pagination.total_count,
        offset: data.pagination.offset,
      });
    } catch (err) {
      console.error("Error fetching GIPHY trending:", err);
      res.status(500).json({ message: "Failed to fetch trending GIFs" });
    }
  });

  // ==================== PLAYER PROFILE ROUTES ====================
  
  // Get player profile (for authenticated users)
  app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getPlayerProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      res.json(profile);
    } catch (err) {
      console.error("Error fetching profile:", err);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });
  
  // Get all available badges
  app.get("/api/badges", async (_req, res) => {
    try {
      const allBadges = await storage.getAllBadges();
      res.json(allBadges);
    } catch (err) {
      console.error("Error fetching badges:", err);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });
  
  // Record game played and update stats (called when game ends)
  const recordGameSchema = z.object({
    gameSlug: z.string().min(1),
    sessionCode: z.string().min(1),
    score: z.coerce.number().int().default(0),
    placement: z.coerce.number().int().positive().nullable().optional(),
    playerCount: z.coerce.number().int().positive().default(1),
  });
  
  app.post("/api/profile/record-game", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parseResult = recordGameSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: parseResult.error.flatten().fieldErrors
        });
      }
      
      const { gameSlug, sessionCode, score, placement, playerCount } = parseResult.data;
      
      // Record game history
      await storage.recordGamePlayed({
        userId,
        gameSlug,
        sessionCode,
        score: score,
        placement: placement ?? null,
        playerCount: playerCount,
      });
      
      // Update aggregated stats
      const won = placement === 1;
      await storage.updatePlayerGameStats(userId, gameSlug, score || 0, won);
      
      // Check and award any new badges
      const newBadges = await storage.checkAndAwardBadges(userId);
      
      res.json({ 
        success: true, 
        newBadges: newBadges.map(b => ({ id: b.id, name: b.name, icon: b.icon }))
      });
    } catch (err) {
      console.error("Error recording game:", err);
      res.status(500).json({ message: "Failed to record game" });
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
      XLSX.utils.book_append_sheet(wb, ws, "Game Data");
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=game-data-export.xlsx');
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
  app.post("/api/import/excel", isAuthenticated, isAdmin, excelUpload.single('file'), async (req, res) => {
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
        const rawPoints = Number(getField(['Points', 'points', 'Point', 'point']));
        const points = Number.isFinite(rawPoints) && Number.isInteger(rawPoints) && rawPoints > 0 ? rawPoints : 0;
        const imageUrl = getField(['Image URL', 'image_url', 'ImageUrl', 'Image']);
        
        // Track flagged data for manual fixes
        const rowData: Record<string, string> = {};
        if (boardName) rowData.board = boardName;
        if (categoryName) rowData.category = categoryName;
        if (rule) rowData.rule = rule;
        if (question) rowData.question = question;
        if (answer) rowData.answer = answer;
        rowData.points = String(points);
        
        // Flag missing/invalid required fields
        if (points === 0) {
          results.flagged.push({ row: rowNum, issue: "Invalid or missing point value", data: rowData });
          continue;
        }
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
          results.errors.push(`Row ${rowNum}: Database error`);
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

  // ==================== BLITZGRID ROUTES ====================
  
  // Get all grids for current user with stats
  app.get("/api/blitzgrid/grids", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      const userBoards = await storage.getBoards(userId, role);
      const starterPacks = await storage.getStarterPackBoards();
      
      // Combine and deduplicate (user might own a starter pack)
      const allBoardsMap = new Map<number, typeof userBoards[number]>();
      for (const board of userBoards) {
        allBoardsMap.set(board.id, board);
      }
      for (const board of starterPacks) {
        if (!allBoardsMap.has(board.id)) {
          allBoardsMap.set(board.id, board);
        }
      }
      
      const boards = Array.from(allBoardsMap.values()).filter(b => b.theme === "blitzgrid" || b.theme?.startsWith("blitzgrid:"));
      
      // Enhance with category counts, names, and active status
      const gridsWithStats = await Promise.all(boards.map(async (board) => {
        const boardCategories = await storage.getBoardCategories(board.id);
        let totalQuestions = 0;
        let activeCategoryCount = 0;
        const categoryNames: string[] = [];
        
        for (const bc of boardCategories) {
          if (bc.category) {
            categoryNames.push(bc.category.name);
          }
          const questions = await storage.getQuestionsForCategory(bc.categoryId);
          totalQuestions += questions.length;
          // A category is active if it has all 5 point tiers (10,20,30,40,50)
          const pointSet = new Set(questions.map(q => q.points));
          if (REQUIRED_POINTS.every(p => pointSet.has(p))) {
            activeCategoryCount++;
          }
        }
        
        return {
          ...board,
          categoryCount: boardCategories.length,
          questionCount: totalQuestions,
          categoryNames,
          isActive: boardCategories.length === 5 && activeCategoryCount === 5,
        };
      }));
      
      res.json(gridsWithStats);
    } catch (err) {
      console.error("Error fetching blitzgrid grids:", err);
      res.status(500).json({ message: "Failed to fetch grids" });
    }
  });
  
  // Create a new grid
  app.post("/api/blitzgrid/grids", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      const { name, description, theme } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Grid name is required" });
      }
      
      // Theme should be "blitzgrid" or "blitzgrid:{themeName}"
      let gridTheme = "blitzgrid";
      if (theme && typeof theme === "string" && theme.trim()) {
        const themeName = theme.trim().toLowerCase();
        if (themeName === "blitzgrid") {
          gridTheme = "blitzgrid";
        } else if (themeName.startsWith("blitzgrid:")) {
          gridTheme = themeName;
        } else {
          gridTheme = `blitzgrid:${themeName}`;
        }
      }
      
      // Auto-assign color based on user's own boards (always scope to userId, not role)
      const userBoards = await storage.getBoards(userId);
      const colorIndex = userBoards.length % BOARD_COLORS.length;
      
      const board = await storage.createBoard({
        userId,
        name: name.trim(),
        description: (typeof description === "string" && description.trim()) ? description.trim() : null,
        pointValues: [10, 20, 30, 40, 50],
        theme: gridTheme,
        colorCode: BOARD_COLORS[colorIndex],
        visibility: "private",
        isGlobal: false,
        sortOrder: 0,
      });
      
      res.status(201).json(board);
    } catch (err) {
      console.error("Error creating blitzgrid grid:", err);
      res.status(500).json({ message: "Failed to create grid" });
    }
  });
  
  // Update a grid
  app.patch("/api/blitzgrid/grids/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid grid ID" });
      }
      
      const { name, description } = req.body;
      
      const board = await storage.getBoard(id, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Grid not found" });
      }
      
      const updateData: { name?: string; description?: string | null } = {};
      if (name !== undefined && typeof name === "string") {
        const trimmedName = name.trim();
        if (!trimmedName) {
          return res.status(400).json({ message: "Grid name cannot be empty" });
        }
        updateData.name = trimmedName;
      }
      if (typeof description === "string") {
        updateData.description = description.trim() || null;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      const updated = await storage.updateBoard(id, updateData, userId, role);
      res.json(updated);
    } catch (err) {
      console.error("Error updating blitzgrid grid:", err);
      res.status(500).json({ message: "Failed to update grid" });
    }
  });
  
  // Delete a grid
  app.delete("/api/blitzgrid/grids/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid grid ID" });
      }
      
      const board = await storage.getBoard(id, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Grid not found" });
      }
      
      const boardCats = await storage.getBoardCategories(id);
      await storage.deleteBoard(id, userId, role);
      for (const bc of boardCats) {
        const otherLinks = await storage.getBoardCategoriesByCategoryId(bc.categoryId);
        if (otherLinks.length === 0) {
          await storage.deleteCategory(bc.categoryId);
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting blitzgrid grid:", err);
      res.status(500).json({ message: "Failed to delete grid" });
    }
  });
  
  // Get categories for a grid with question counts
  app.get("/api/blitzgrid/grids/:id/categories", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid grid ID" });
      }
      
      const board = await storage.getBoard(id, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Grid not found" });
      }
      
      const boardCategories = await storage.getBoardCategories(id);
      
      // Get full category data with questions
      const categoriesWithQuestions = await Promise.all(
        boardCategories.map(async (bc) => {
          const questions = await storage.getQuestionsByCategory(bc.categoryId);
          return {
            ...bc.category,
            questionCount: questions.length,
            questions,
          };
        })
      );
      
      res.json(categoriesWithQuestions);
    } catch (err) {
      console.error("Error fetching blitzgrid categories:", err);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });
  
  // Add category to grid
  app.post("/api/blitzgrid/grids/:id/categories", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      const gridId = parseId(req.params.id);
      if (gridId === null) {
        return res.status(400).json({ message: "Invalid grid ID" });
      }
      
      const { categoryId } = req.body;
      if (typeof categoryId !== "number" || isNaN(categoryId) || !Number.isInteger(categoryId) || categoryId <= 0) {
        return res.status(400).json({ message: "A valid category ID is required" });
      }
      
      const board = await storage.getBoard(gridId, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Grid not found" });
      }
      
      const category = await storage.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Check category limit
      const existing = await storage.getBoardCategories(gridId);
      if (existing.length >= 5) {
        return res.status(400).json({ message: "Grid already has 5 categories (maximum)" });
      }
      
      // Check if already linked
      if (existing.some(bc => bc.categoryId === categoryId)) {
        return res.status(400).json({ message: "Category already linked to this grid" });
      }
      
      const boardCategory = await storage.createBoardCategory({
        boardId: gridId,
        categoryId,
      });
      
      res.status(201).json(boardCategory);
    } catch (err) {
      console.error("Error adding category to blitzgrid:", err);
      res.status(500).json({ message: "Failed to add category" });
    }
  });
  
  // Create new category and add to grid
  app.post("/api/blitzgrid/grids/:id/categories/create", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      const gridId = parseId(req.params.id);
      if (gridId === null) {
        return res.status(400).json({ message: "Invalid grid ID" });
      }
      
      const { name, description } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Category name is required" });
      }
      
      const board = await storage.getBoard(gridId, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Grid not found" });
      }
      
      // Check category limit
      const existing = await storage.getBoardCategories(gridId);
      if (existing.length >= 5) {
        return res.status(400).json({ message: "Grid already has 5 categories (maximum)" });
      }
      
      const category = await storage.createCategory({
        name: name.trim(),
        description: typeof description === "string" ? description.trim() : "",
        imageUrl: "",
      });
      
      try {
        await storage.createBoardCategory({
          boardId: gridId,
          categoryId: category.id,
        });
      } catch (linkErr) {
        try { await storage.deleteCategory(category.id); } catch (_) { /* cleanup best effort */ }
        throw linkErr;
      }
      
      res.status(201).json(category);
    } catch (err) {
      console.error("Error creating category for blitzgrid:", err);
      res.status(500).json({ message: "Failed to create category" });
    }
  });
  
  // Remove category from grid
  app.delete("/api/blitzgrid/grids/:gridId/categories/:categoryId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      const gridId = parseId(req.params.gridId);
      const categoryId = parseId(req.params.categoryId);
      if (gridId === null || categoryId === null) {
        return res.status(400).json({ message: "Invalid IDs" });
      }
      
      const board = await storage.getBoard(gridId, userId, role);
      if (!board) {
        return res.status(404).json({ message: "Grid not found" });
      }
      
      const boardCats = await storage.getBoardCategories(gridId);
      const bc = boardCats.find(x => x.categoryId === categoryId);
      if (!bc) {
        return res.status(404).json({ message: "Category not linked to this grid" });
      }
      
      await storage.deleteBoardCategory(bc.id);
      const otherLinks = await storage.getBoardCategoriesByCategoryId(categoryId);
      if (otherLinks.length === 0) {
        await storage.deleteCategory(categoryId);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error removing category from blitzgrid:", err);
      res.status(500).json({ message: "Failed to remove category" });
    }
  });
  
  // Save/update question for a category
  app.post("/api/blitzgrid/categories/:categoryId/questions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const categoryId = parseId(req.params.categoryId);
      if (categoryId === null) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      const category = await storage.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Verify user owns a grid that contains this category
      const role = req.session.userRole;
      const boardCategoryLinks = await storage.getBoardCategoriesByCategoryId(categoryId);
      let hasOwnership = role === 'super_admin';
      if (!hasOwnership) {
        for (const bc of boardCategoryLinks) {
          const board = await storage.getBoard(bc.boardId, userId);
          if (board && (board.theme === "blitzgrid" || board.theme?.startsWith("blitzgrid:"))) {
            hasOwnership = true;
            break;
          }
        }
      }
      if (!hasOwnership) {
        return res.status(403).json({ message: "You don't have permission to modify this category" });
      }
      
      const { points, question, correctAnswer, options, imageUrl, audioUrl, videoUrl, answerImageUrl, answerAudioUrl, answerVideoUrl } = req.body;
      
      if (!REQUIRED_POINTS.includes(points)) {
        return res.status(400).json({ message: "Points must be 10, 20, 30, 40, or 50" });
      }
      
      if (!question || typeof question !== "string" || !question.trim()) {
        return res.status(400).json({ message: "Question is required" });
      }
      
      if (!correctAnswer || typeof correctAnswer !== "string" || !correctAnswer.trim()) {
        return res.status(400).json({ message: "Correct answer is required" });
      }
      
      const validatedOptions = Array.isArray(options)
        ? options.filter((o: unknown) => typeof o === "string" && o.trim()).map((o: string) => o.trim())
        : [];
      
      // Check if question already exists for this point tier
      const existingQuestions = await storage.getQuestionsByCategory(categoryId);
      const existingQuestion = existingQuestions.find(q => q.points === points);
      
      if (existingQuestion) {
        // Update existing question
        const updated = await storage.updateQuestion(existingQuestion.id, {
          question: question.trim(),
          correctAnswer: correctAnswer.trim(),
          options: validatedOptions,
          imageUrl: imageUrl?.trim() || null,
          audioUrl: audioUrl?.trim() || null,
          videoUrl: videoUrl?.trim() || null,
          answerImageUrl: answerImageUrl?.trim() || null,
          answerAudioUrl: answerAudioUrl?.trim() || null,
          answerVideoUrl: answerVideoUrl?.trim() || null,
        });
        return res.json(updated);
      }
      
      const newQuestion = await storage.createQuestion({
        categoryId,
        question: question.trim(),
        correctAnswer: correctAnswer.trim(),
        options: validatedOptions,
        points,
        imageUrl: imageUrl?.trim() || null,
        audioUrl: audioUrl?.trim() || null,
        videoUrl: videoUrl?.trim() || null,
        answerImageUrl: answerImageUrl?.trim() || null,
        answerAudioUrl: answerAudioUrl?.trim() || null,
        answerVideoUrl: answerVideoUrl?.trim() || null,
      });
      
      res.status(201).json(newQuestion);
    } catch (err) {
      console.error("Error saving blitzgrid question:", err);
      res.status(500).json({ message: "Failed to save question" });
    }
  });
  
  // Delete a question
  app.delete("/api/blitzgrid/questions/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      
      // Get the question to find its category
      const question = await storage.getQuestion(id);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      // Verify user owns a grid that contains this category
      const role = req.session.userRole;
      const boardCategoryLinks = await storage.getBoardCategoriesByCategoryId(question.categoryId);
      let hasOwnership = role === 'super_admin';
      if (!hasOwnership) {
        for (const bc of boardCategoryLinks) {
          const board = await storage.getBoard(bc.boardId, userId);
          if (board && (board.theme === "blitzgrid" || board.theme?.startsWith("blitzgrid:"))) {
            hasOwnership = true;
            break;
          }
        }
      }
      if (!hasOwnership) {
        return res.status(403).json({ message: "You don't have permission to delete this question" });
      }
      
      await storage.deleteQuestion(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting blitzgrid question:", err);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // Export all grids for the current user
  app.get("/api/blitzgrid/export", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      const allBoards = await storage.getBoards(userId, role);
      const boards = allBoards.filter(b => b.theme === "blitzgrid" || b.theme?.startsWith("blitzgrid:"));
      
      const rows: any[] = [];
      rows.push(["Grid Name", "Grid Description", "Category Name", "Category Description", "Points", "Question", "Answer", "Options", "Image URL", "Audio URL", "Video URL", "Answer Image URL", "Answer Audio URL", "Answer Video URL"]);
      
      for (const board of boards) {
        const boardCategories = await storage.getBoardCategories(board.id);
        for (const bc of boardCategories) {
          if (!bc.category) continue;
          
          const questions = await storage.getQuestionsByCategory(bc.categoryId);
          for (const q of questions) {
            rows.push([
              board.name,
              board.description || "",
              bc.category.name,
              bc.category.description || "",
              q.points,
              q.question,
              q.correctAnswer,
              Array.isArray(q.options) && q.options.length > 0 ? q.options.join("|") : "",
              q.imageUrl || "",
              q.audioUrl || "",
              q.videoUrl || "",
              q.answerImageUrl || "",
              q.answerAudioUrl || "",
              q.answerVideoUrl || "",
            ]);
          }
        }
      }
      
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Grids");
      
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="blitzgrid-export-${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buffer);
    } catch (err) {
      console.error("Error exporting grids:", err);
      res.status(500).json({ message: "Failed to export grids" });
    }
  });
  
  // Download template for import (Excel format)
  app.get("/api/blitzgrid/template", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const rows = [
        ["Grid Name", "Grid Description", "Category Name", "Category Description", "Points", "Question", "Answer", "Options", "Image URL", "Audio URL", "Video URL", "Answer Image URL", "Answer Audio URL", "Answer Video URL"],
        ["My Trivia Grid", "Fun trivia for parties", "Movies", "Film knowledge", 10, "What year was Titanic released?", "1997", "", "", "", "", "", "", ""],
        ["My Trivia Grid", "Fun trivia for parties", "Movies", "Film knowledge", 20, "Who directed Jaws?", "Steven Spielberg", "", "", "", "", "", "", ""],
        ["My Trivia Grid", "Fun trivia for parties", "Movies", "Film knowledge", 30, "Which actor played Iron Man?", "Robert Downey Jr.", "Chris Evans|Robert Downey Jr.|Chris Hemsworth|Mark Ruffalo", "", "", "", "", "", ""],
        ["My Trivia Grid", "Fun trivia for parties", "Movies", "Film knowledge", 40, "What is the highest-grossing film of all time?", "Avatar", "", "", "", "", "", "", ""],
        ["My Trivia Grid", "Fun trivia for parties", "Movies", "Film knowledge", 50, "Who composed the Star Wars soundtrack?", "John Williams", "", "", "", "", "", "", ""],
      ];
      
      const instructions = [
        ["INSTRUCTIONS"],
        [""],
        ["Each row represents one question. Group questions by Grid Name and Category Name."],
        ["Each category must have exactly 5 questions with unique point values: 10, 20, 30, 40, 50."],
        ["Each grid can have 1-5 categories."],
        [""],
        ["Options: For multiple choice, separate options with | (pipe). Leave empty for open-ended questions."],
        ["Question Media: Image URL, Audio URL, Video URL are shown WITH the question. Optional."],
        ["Answer Media: Answer Image URL, Answer Audio URL, Answer Video URL are shown AFTER answering. Optional."],
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
      
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="blitzgrid-template.xlsx"');
      res.send(buffer);
    } catch (err) {
      console.error("Error generating template:", err);
      res.status(500).json({ message: "Failed to generate template" });
    }
  });
  
  // Import grids from Excel file
  const blitzgridExcelUpload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
      }
    }
  });
  app.post("/api/blitzgrid/import", isAuthenticated, isAdmin, blitzgridExcelUpload.single("file"), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const role = req.session.userRole;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames.find(n => n.toLowerCase() !== "instructions") || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (data.length < 2) {
        return res.status(400).json({ message: "Excel file is empty or has no data rows" });
      }
      
      // Parse rows into grid structure (skip header row)
      const gridsMap = new Map<string, { description: string; categories: Map<string, { description: string; questions: any[] }> }>();
      const validationErrors: string[] = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 7 || !row[0]) continue;
        
        const [gridName, gridDesc, catName, catDesc, points, question, answer, options, imageUrl, audioUrl, videoUrl, answerImageUrl, answerAudioUrl, answerVideoUrl] = row;
        
        if (!gridName || !catName || points == null || points === "" || !question || !answer) continue;
        
        const numPoints = Number(points);
        if (!Number.isFinite(numPoints) || !Number.isInteger(numPoints)) {
          validationErrors.push(`Row ${i + 1}: Invalid points value "${points}" (must be a number)`);
          continue;
        }
        if (!REQUIRED_POINTS.includes(numPoints)) {
          validationErrors.push(`Row ${i + 1}: Invalid points value ${numPoints} (must be 10, 20, 30, 40, or 50)`);
          continue;
        }
        
        const gridKey = String(gridName).trim();
        const catKey = String(catName).trim();
        
        if (!gridsMap.has(gridKey)) {
          gridsMap.set(gridKey, { description: gridDesc ? String(gridDesc).trim() : "", categories: new Map() });
        }
        
        const grid = gridsMap.get(gridKey)!;
        if (!grid.categories.has(catKey)) {
          grid.categories.set(catKey, { description: catDesc ? String(catDesc).trim() : "", questions: [] });
        }
        
        const category = grid.categories.get(catKey)!;
        category.questions.push({
          points: numPoints,
          question: String(question).trim(),
          correctAnswer: String(answer).trim(),
          options: options ? String(options).split("|").map(o => o.trim()).filter(Boolean) : [],
          imageUrl: imageUrl ? String(imageUrl).trim() : null,
          audioUrl: audioUrl ? String(audioUrl).trim() : null,
          videoUrl: videoUrl ? String(videoUrl).trim() : null,
          answerImageUrl: answerImageUrl ? String(answerImageUrl).trim() : null,
          answerAudioUrl: answerAudioUrl ? String(answerAudioUrl).trim() : null,
          answerVideoUrl: answerVideoUrl ? String(answerVideoUrl).trim() : null,
        });
      }
      
      if (validationErrors.length > 0) {
        return res.status(400).json({ message: `Invalid point values found:\n${validationErrors.join("\n")}`, errors: validationErrors });
      }
      
      const results = { imported: 0, errors: [] as string[] };
      
      for (const [gridName, gridData] of Array.from(gridsMap.entries())) {
        try {
          if (gridData.categories.size === 0 || gridData.categories.size > 5) {
            results.errors.push(`Grid "${gridName}": must have 1-5 categories`);
            continue;
          }
          
          // Validate all categories before creating
          let allValid = true;
          for (const [catName, catData] of Array.from(gridData.categories.entries())) {
            if (catData.questions.length !== 5) {
              results.errors.push(`Grid "${gridName}", Category "${catName}": must have exactly 5 questions (found ${catData.questions.length})`);
              allValid = false;
            }
            const pointSet = new Set(catData.questions.map((q: any) => q.points));
            if (pointSet.size !== 5 || ![10, 20, 30, 40, 50].every(p => pointSet.has(p))) {
              results.errors.push(`Grid "${gridName}", Category "${catName}": questions must have unique points 10, 20, 30, 40, 50`);
              allValid = false;
            }
          }
          
          if (!allValid) continue;
          
          const userBoards = await storage.getBoards(userId);
          const colorIndex = userBoards.length % BOARD_COLORS.length;
          
          const board = await storage.createBoard({
            name: gridName.trim(),
            description: gridData.description?.trim() || null,
            userId,
            theme: "blitzgrid",
            pointValues: [10, 20, 30, 40, 50],
            colorCode: BOARD_COLORS[colorIndex],
            visibility: "private",
            isGlobal: false,
          });
          
          const createdCategoryIds: number[] = [];
          try {
            for (const [catName, catData] of Array.from(gridData.categories.entries())) {
              const category = await storage.createCategory({
                name: catName.trim(),
                description: catData.description?.trim() || "",
                imageUrl: "",
              });
              createdCategoryIds.push(category.id);
              
              await storage.createBoardCategory({
                boardId: board.id,
                categoryId: category.id,
              });
              
              for (const q of catData.questions) {
                await storage.createQuestion({
                  categoryId: category.id,
                  question: q.question,
                  correctAnswer: q.correctAnswer,
                  points: q.points,
                  options: q.options,
                  imageUrl: q.imageUrl,
                  audioUrl: q.audioUrl,
                  videoUrl: q.videoUrl,
                  answerImageUrl: q.answerImageUrl,
                  answerAudioUrl: q.answerAudioUrl,
                  answerVideoUrl: q.answerVideoUrl,
                });
              }
            }
          } catch (innerErr) {
            try {
              for (const catId of createdCategoryIds) {
                await storage.deleteCategory(catId);
              }
              await storage.deleteBoard(board.id, userId, 'super_admin');
            } catch (_) { /* best-effort cleanup */ }
            throw innerErr;
          }
          
          results.imported++;
        } catch (gridErr) {
          console.error(`Error importing grid "${gridName}":`, gridErr);
          results.errors.push(`Grid "${gridName}": import failed`);
        }
      }
      
      res.json(results);
    } catch (err) {
      console.error("Error importing grids:", err);
      res.status(500).json({ message: "Failed to import grids" });
    }
  });

  // ==================== END BLITZGRID ROUTES ====================

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

  // ==================== WEBSOCKET SERVER ====================
  interface RoomPlayer {
    id: string;
    reconnectToken: string;
    name: string;
    avatar: string;
    score: number;
    ws: WebSocket;
    isConnected: boolean;
    correctAnswers: number;
    wrongAnswers: number;
    totalTimeMs: number;
    currentStreak: number;
    bestStreak: number;
    profileId?: string; // Player profile ID for stat tracking
  }

  interface SequenceSubmission {
    playerId: string;
    playerName: string;
    playerAvatar?: string;
    sequence: string[];
    timeMs: number;
    isCorrect?: boolean;
  }

  interface Room {
    code: string;
    hostId: string;
    hostWs: WebSocket | null;
    players: Map<string, RoomPlayer>;
    buzzerLocked: boolean;
    buzzQueue: Array<{ playerId: string; playerName: string; playerAvatar?: string; position: number; timestamp: number }>;
    passedPlayers: Set<string>; // Players who answered wrong on current question (can't buzz again)
    boardId: number | null;
    completedQuestions: Set<number>;
    sessionId: number | null;
    gameMode?: 'buzzer' | 'psyop' | 'sequence' | 'meme';
    sequenceSubmissions?: SequenceSubmission[];
    currentCorrectOrder?: string[];
    currentQuestion?: object;
    questionStartTime?: number;
    pointsPerRound?: number;
    gameEnded?: boolean; // Idempotency flag to prevent duplicate stat persistence
    sequencePhase?: 'waiting' | 'animatedReveal' | 'playing' | 'revealing' | 'leaderboard' | 'gameComplete';
    sequenceQuestionIndex?: number;
    sequenceTotalQuestions?: number;
    sequencePaused?: boolean;
    sequencePauseStartTime?: number;
    // Meme No Harm fields
    memeSubmissions?: Map<string, MemeSubmission>;
    memeVotes?: Map<string, string>; // voterId -> submissionPlayerId
    memePrompt?: string;
    memeRound?: number;
    memeTotalRounds?: number;
    memeSittingOut?: Set<string>;
    memePhase?: 'lobby' | 'selecting' | 'voting' | 'reveal';
    memeUsedPrompts?: string[];
  }

  interface MemeSubmission {
    playerId: string;
    playerName: string;
    playerAvatar: string;
    gifUrl: string;
    gifTitle: string;
  }

  const rooms = new Map<string, Room>();
  const wsToRoom = new Map<WebSocket, { roomCode: string; isHost: boolean; playerId?: string }>();

  function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (rooms.has(code)) return generateRoomCode();
    return code;
  }

  function broadcastToRoom(room: Room, message: object, excludeWs?: WebSocket) {
    const msg = JSON.stringify(message);
    if (room.hostWs && room.hostWs !== excludeWs && room.hostWs.readyState === WebSocket.OPEN) {
      room.hostWs.send(msg);
    }
    room.players.forEach((player) => {
      if (player.ws && player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(msg);
      }
    });
  }

  function sendToHost(room: Room, message: object) {
    if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
      room.hostWs.send(JSON.stringify(message));
    }
  }

  function sendToPlayer(player: RoomPlayer, message: object) {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  }

  function getPlayersArray(room: Room) {
    return Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      isConnected: p.isConnected,
    }));
  }

  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (url.pathname === '/vite-hmr') {
      // Let Vite handle its own HMR upgrades
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    ws.on('error', (err) => {
      console.error('[WebSocket] Connection error:', err.message);
    });

    ws.on('message', async (rawData) => {
      try {
        const data = JSON.parse(rawData.toString());

        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

          case 'host:create': {
            const code = generateRoomCode();
            let sessionId: number | null = null;
            
            try {
              const session = await storage.createSession({
                code,
                hostId: data.hostId?.toString() || 'anonymous',
                state: 'active',
              });
              sessionId = session.id;
            } catch (err) {
              console.error('[WebSocket] Failed to create game session:', err);
            }

            const room: Room = {
              code,
              hostId: data.hostId?.toString() || 'anonymous',
              hostWs: ws,
              players: new Map(),
              buzzerLocked: true,
              buzzQueue: [],
              passedPlayers: new Set(),
              boardId: null,
              completedQuestions: new Set(),
              sessionId,
            };
            rooms.set(code, room);
            wsToRoom.set(ws, { roomCode: code, isHost: true });

            ws.send(JSON.stringify({
              type: 'room:created',
              code,
              sessionId,
            }));
            console.log(`[WebSocket] Room ${code} created by host ${data.hostId}`);
            break;
          }

          case 'host:join': {
            const code = data.code?.toUpperCase();
            let room = rooms.get(code);
            
            if (!room) {
              try {
                const session = await storage.getSessionByCode(code);
                if (session && session.state !== 'ended') {
                  const players = await storage.getSessionPlayers(session.id);
                  room = {
                    code: session.code,
                    hostId: session.hostId,
                    hostWs: ws,
                    players: new Map(players.map(p => [p.playerId, {
                      id: p.playerId,
                      name: p.name,
                      avatar: p.avatar,
                      score: p.score,
                      ws: null as any,
                      isConnected: false,
                      correctAnswers: 0,
                      wrongAnswers: 0,
                      totalTimeMs: 0,
                      currentStreak: 0,
                      bestStreak: 0,
                    }])),
                    buzzerLocked: session.buzzerLocked,
                    buzzQueue: [],
                    passedPlayers: new Set(),
                    boardId: session.currentBoardId,
                    completedQuestions: new Set(session.playedCategoryIds || []),
                    sessionId: session.id,
                  };
                  rooms.set(code, room);
                  console.log(`[WebSocket] Recovered room ${code} from storage`);
                }
              } catch (err) {
                console.error('[WebSocket] Failed to recover session:', err);
              }
            }
            
            if (!room) {
              ws.send(JSON.stringify({ type: 'room:notFound' }));
              break;
            }

            room.hostWs = ws;
            wsToRoom.set(ws, { roomCode: room.code, isHost: true });
            
            // Notify all connected players that host is back
            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                sendToPlayer(player, { type: 'host:reconnected' });
              }
            });

            ws.send(JSON.stringify({
              type: 'room:joined',
              code: room.code,
              sessionId: room.sessionId,
              players: getPlayersArray(room),
              buzzerLocked: room.buzzerLocked,
              buzzQueue: room.buzzQueue,
              completedQuestions: Array.from(room.completedQuestions),
            }));
            console.log(`[WebSocket] Host rejoined room ${room.code}`);
            break;
          }

          case 'player:join': {
            const room = rooms.get(data.code?.toUpperCase());
            if (!room) {
              ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
              break;
            }

            const playerId = data.playerId || crypto.randomUUID();
            const existingPlayer = room.players.get(playerId);
            
            if (existingPlayer) {
              if (!data.reconnectToken || data.reconnectToken !== existingPlayer.reconnectToken) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid reconnect token' }));
                break;
              }
              existingPlayer.ws = ws;
              existingPlayer.isConnected = true;
              existingPlayer.name = data.name || existingPlayer.name;
              existingPlayer.avatar = data.avatar || existingPlayer.avatar;
              if (data.profileId) {
                existingPlayer.profileId = data.profileId;
              }
              wsToRoom.set(ws, { roomCode: room.code, isHost: false, playerId });

              ws.send(JSON.stringify({
                type: 'joined',
                playerId,
                reconnectToken: existingPlayer.reconnectToken,
                buzzerLocked: room.buzzerLocked,
                buzzerBlocked: room.passedPlayers.has(playerId),
                score: existingPlayer.score,
              }));

              ws.send(JSON.stringify({
                type: 'scores:sync',
                players: getPlayersArray(room),
              }));

              sendToHost(room, {
                type: 'player:joined',
                player: {
                  id: playerId,
                  name: existingPlayer.name,
                  avatar: existingPlayer.avatar,
                  score: existingPlayer.score,
                  isConnected: true,
                },
              });

              if (room.sessionId) {
                storage.updatePlayerConnection(room.sessionId, playerId, true).catch(err => {
                  console.error('[WebSocket] Failed to update player connection:', err);
                });
              }
              console.log(`[WebSocket] Player ${existingPlayer.name} reconnected to room ${room.code}`);
            } else {
              const reconnectToken = crypto.randomUUID();
              const player: RoomPlayer = {
                id: playerId,
                reconnectToken,
                name: data.name || 'Player',
                avatar: data.avatar || 'cat',
                score: 0,
                ws,
                isConnected: true,
                correctAnswers: 0,
                wrongAnswers: 0,
                totalTimeMs: 0,
                currentStreak: 0,
                bestStreak: 0,
                profileId: data.profileId,
              };
              room.players.set(playerId, player);
              wsToRoom.set(ws, { roomCode: room.code, isHost: false, playerId });

              if (room.sessionId) {
                try {
                  await storage.addPlayerToSession({
                    sessionId: room.sessionId,
                    playerId,
                    name: player.name,
                    avatar: player.avatar,
                  });
                } catch (err) {
                  console.error('[WebSocket] Failed to add player to session:', err);
                }
              }

              ws.send(JSON.stringify({
                type: 'joined',
                playerId,
                reconnectToken,
                buzzerLocked: room.buzzerLocked,
                score: 0,
              }));

              ws.send(JSON.stringify({
                type: 'scores:sync',
                players: getPlayersArray(room),
              }));

              sendToHost(room, {
                type: 'player:joined',
                player: {
                  id: playerId,
                  name: player.name,
                  avatar: player.avatar,
                  score: 0,
                  isConnected: true,
                },
              });
              console.log(`[WebSocket] Player ${player.name} joined room ${room.code}`);
            }
            break;
          }

          case 'player:buzz': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room || room.buzzerLocked) break;

            const player = room.players.get(mapping.playerId!);
            if (!player) break;

            const alreadyBuzzed = room.buzzQueue.some(b => b.playerId === player.id);
            if (alreadyBuzzed) break;

            // Reject if player already answered wrong on this question
            if (room.passedPlayers.has(player.id)) break;

            const position = room.buzzQueue.length + 1;
            const buzzEvent = {
              playerId: player.id,
              playerName: player.name,
              playerAvatar: player.avatar,
              position,
              timestamp: Date.now(),
            };
            room.buzzQueue.push(buzzEvent);

            sendToHost(room, { type: 'player:buzzed', ...buzzEvent });
            ws.send(JSON.stringify({ type: 'buzz:confirmed', position }));
            console.log(`[WebSocket] ${player.name} buzzed in position ${position} in room ${room.code}`);
            break;
          }

          case 'player:leave': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            const player = room.players.get(mapping.playerId!);
            if (player) {
              room.players.delete(mapping.playerId!);
              // Remove from buzz queue if they were in it
              room.buzzQueue = room.buzzQueue.filter(b => b.playerId !== mapping.playerId);
              sendToHost(room, { type: 'player:left', playerId: mapping.playerId });
              
              if (room.sessionId) {
                storage.updatePlayerConnection(room.sessionId, mapping.playerId!, false).catch(err => {
                  console.error('[WebSocket] Failed to update player connection:', err);
                });
              }
              console.log(`[WebSocket] Player ${player.name} left room ${room.code}`);
            }

            wsToRoom.delete(ws);
            ws.close();
            break;
          }

          case 'player:reaction': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            const player = room.players.get(mapping.playerId!);
            if (!player) break;

            const reactionType = data.reactionType;
            if (!reactionType || typeof reactionType !== 'string') break;

            sendToHost(room, { 
              type: 'player:reaction', 
              playerId: mapping.playerId, 
              playerName: player.name,
              reactionType 
            });
            break;
          }

          case 'host:unlock': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            room.buzzerLocked = false;
            room.buzzQueue = [];
            // Only clear passedPlayers if this is a new question (not unlock after wrong answer)
            const isNewQuestion = !!data.newQuestion;
            if (isNewQuestion) {
              room.passedPlayers.clear();
            }
            broadcastToRoom(room, { type: 'buzzer:unlocked', newQuestion: isNewQuestion }, ws);
            room.players.forEach((player) => {
              sendToPlayer(player, { type: 'buzzer:unlocked', newQuestion: isNewQuestion });
            });
            break;
          }

          case 'host:lock': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            room.buzzerLocked = true;
            room.buzzQueue = [];
            room.players.forEach((player) => {
              sendToPlayer(player, { type: 'buzzer:locked' });
            });
            break;
          }

          case 'host:reset': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            room.buzzQueue = [];
            ws.send(JSON.stringify({ type: 'buzzer:reset' }));
            room.players.forEach((player) => {
              sendToPlayer(player, { type: 'buzzer:reset' });
            });
            break;
          }

          case 'host:passPlayer': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            const { playerId } = data;
            if (playerId) {
              room.buzzQueue = room.buzzQueue.filter(b => b.playerId !== playerId);
              // Track that this player answered wrong on current question
              room.passedPlayers.add(playerId);
              // Notify the passed player they're blocked from buzzing again on this question
              const player = room.players.get(playerId);
              if (player) {
                sendToPlayer(player, { type: 'buzzer:blocked' });
              }
            }
            break;
          }

          case 'host:updateScore': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            const player = room.players.get(data.playerId);
            if (!player) break;

            player.score += data.points;

            if (room.sessionId) {
              try {
                await storage.setPlayerScore(room.sessionId, data.playerId, player.score);
              } catch (err) {
                console.error('[WebSocket] Failed to update player score:', err);
              }
            }

            sendToHost(room, { type: 'score:updated', playerId: data.playerId, score: player.score });
            sendToPlayer(player, { type: 'score:updated', score: player.score });

            room.players.forEach((p) => {
              sendToPlayer(p, { type: 'scores:sync', players: getPlayersArray(room) });
            });
            break;
          }

          case 'host:feedback': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            const player = room.players.get(data.playerId);
            if (!player) break;

            sendToPlayer(player, {
              type: 'feedback',
              correct: data.correct,
              points: data.points,
            });
            break;
          }

          case 'host:completeQuestion': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            if (data.questionId) {
              room.completedQuestions.add(data.questionId);
            }

            ws.send(JSON.stringify({ type: 'question:completed', questionId: data.questionId }));
            break;
          }

          case 'host:setBoard': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            room.boardId = data.boardId;
            
            if (room.sessionId && data.boardId) {
              try {
                await storage.updateSession(room.sessionId, { currentBoardId: data.boardId });
              } catch (err) {
                console.error('[WebSocket] Failed to set session board:', err);
              }
            }

            ws.send(JSON.stringify({ type: 'board:set', boardId: data.boardId }));
            break;
          }

          case 'host:pickingNextGrid': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            room.players.forEach((player) => {
              sendToPlayer(player, { type: 'host:pickingNextGrid' });
            });
            console.log(`[WebSocket] Host picking next grid in room ${room.code}`);
            break;
          }

          case 'host:startNextGrid': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            const gridName = data.gridName || 'New Grid';
            room.boardId = data.boardId;
            
            // Reset per-grid state (buzz queue, passed players, completed questions) while keeping players and scores
            room.buzzQueue = [];
            room.buzzerLocked = true;
            room.passedPlayers.clear();
            room.completedQuestions.clear();
            
            if (room.sessionId && data.boardId) {
              try {
                await storage.updateSession(room.sessionId, { currentBoardId: data.boardId });
              } catch (err) {
                console.error('[WebSocket] Failed to update session board:', err);
              }
            }

            // Notify all players and sync scores
            room.players.forEach((player) => {
              sendToPlayer(player, { type: 'host:startNextGrid', gridName });
            });
            
            // Send score sync to all players to ensure state is consistent
            const playerScores = Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score }));
            room.players.forEach((player) => {
              sendToPlayer(player, { type: 'scores:sync', players: playerScores });
            });
            
            console.log(`[WebSocket] Host started next grid "${gridName}" in room ${room.code}`);
            break;
          }

          case 'host:kickPlayer': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            const player = room.players.get(data.playerId);
            if (player) {
              sendToPlayer(player, { type: 'kicked' });
              if (player.ws) {
                player.ws.close();
                wsToRoom.delete(player.ws);
              }
              room.players.delete(data.playerId);
              sendToHost(room, { type: 'player:left', playerId: data.playerId });
              
              if (room.sessionId) {
                storage.updatePlayerConnection(room.sessionId, data.playerId, false).catch(err => {
                  console.error('[WebSocket] Failed to update player connection on kick:', err);
                });
              }
              console.log(`[WebSocket] Host kicked player ${player.name} from room ${room.code}`);
            }
            break;
          }

          case 'host:closeRoom': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            room.players.forEach((player) => {
              sendToPlayer(player, { type: 'room:closed', reason: 'Host closed the game' });
              if (player.ws) {
                player.ws.close();
                wsToRoom.delete(player.ws);
              }
            });

            if (room.sessionId) {
              storage.updateSession(room.sessionId, { state: 'completed' }).catch(err => {
                console.error('[WebSocket] Failed to close session:', err);
              });
            }

            rooms.delete(room.code);
            wsToRoom.delete(ws);
            ws.send(JSON.stringify({ type: 'room:closed', reason: 'Room closed' }));
            console.log(`[WebSocket] Host closed room ${room.code}`);
            break;
          }

          // End game and persist player stats before closing
          case 'host:endGame': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;

            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            // Idempotency guard: skip if already ended
            if (room.gameEnded) {
              ws.send(JSON.stringify({ 
                type: 'game:ended', 
                alreadyEnded: true,
                persistedPlayers: [],
                totalPlayers: room.players.size,
              }));
              break;
            }
            room.gameEnded = true;

            const gameSlug = data.gameSlug || 'blitzgrid';
            const playerStats = data.playerStats as Array<{
              playerId: string;
              correctAnswers: number;
              wrongAnswers: number;
              totalPoints: number;
              bestStreak: number;
              won: boolean;
            }> | undefined;

            // Persist stats for all players with profile IDs
            const persistedPlayers: string[] = [];
            if (playerStats) {
              for (const stat of playerStats) {
                const player = room.players.get(stat.playerId);
                if (player?.profileId) {
                  try {
                    await playerProfileService.updateGameStats(player.profileId, gameSlug, {
                      points: stat.totalPoints,
                      won: stat.won,
                      correctAnswers: stat.correctAnswers,
                      incorrectAnswers: stat.wrongAnswers,
                    });
                    persistedPlayers.push(player.name);
                    console.log(`[WebSocket] Persisted stats for ${player.name} (profile ${player.profileId})`);
                  } catch (err) {
                    console.error(`[WebSocket] Failed to persist stats for ${player.name}:`, err);
                  }
                }
              }
            }

            // Notify players that game has ended with their stats
            room.players.forEach((player) => {
              const stat = playerStats?.find(s => s.playerId === player.id);
              sendToPlayer(player, { 
                type: 'game:ended', 
                stats: stat,
                statsPersisted: !!player.profileId,
              });
            });

            // Send confirmation to host
            ws.send(JSON.stringify({ 
              type: 'game:ended', 
              persistedPlayers,
              totalPlayers: room.players.size,
            }));

            console.log(`[WebSocket] Game ended in room ${room.code}, persisted stats for ${persistedPlayers.length}/${room.players.size} players`);
            
            // Note: Room stays open so host can continue showing game over screen.
            // Room cleanup happens when host explicitly calls host:closeRoom or disconnects.
            break;
          }

          // PsyOp Game Events
          case 'psyop:host:create': {
            const code = generateRoomCode();
            let sessionId: number | null = null;
            
            try {
              const session = await storage.createSession({
                code,
                hostId: data.hostId?.toString() || 'anonymous',
                state: 'active',
              });
              sessionId = session.id;
            } catch (err) {
              console.error('[WebSocket] Failed to create PsyOp session:', err);
            }

            const room: Room = {
              code,
              hostId: data.hostId?.toString() || 'anonymous',
              hostWs: ws,
              players: new Map(),
              buzzerLocked: true,
              buzzQueue: [],
              passedPlayers: new Set(),
              boardId: null,
              completedQuestions: new Set(),
              sessionId,
              gameMode: 'psyop',
            };
            rooms.set(code, room);
            wsToRoom.set(ws, { roomCode: code, isHost: true });

            ws.send(JSON.stringify({
              type: 'psyop:room:created',
              code,
              sessionId,
            }));
            console.log(`[WebSocket] PsyOp room ${code} created`);
            break;
          }

          case 'psyop:start:submission': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                sendToPlayer(player, {
                  type: 'psyop:submission:start',
                  question: data.question,
                  deadline: data.deadline,
                });
              }
            });
            break;
          }

          case 'psyop:submit:lie': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            const player = room.players.get(mapping.playerId!);
            if (!player) break;

            sendToHost(room, {
              type: 'psyop:submission',
              playerId: player.id,
              playerName: player.name,
              playerAvatar: player.avatar,
              lieText: data.lieText,
            });
            break;
          }

          case 'psyop:start:voting': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                const filteredOptions = data.options.filter((o: { id: string }) => o.id !== player.id);
                sendToPlayer(player, {
                  type: 'psyop:voting:start',
                  options: filteredOptions,
                  deadline: data.deadline,
                });
              }
            });
            break;
          }

          case 'psyop:submit:vote': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            const player = room.players.get(mapping.playerId!);
            if (!player) break;

            sendToHost(room, {
              type: 'psyop:vote',
              voterId: player.id,
              voterName: player.name,
              votedForId: data.votedForId,
            });
            break;
          }

          case 'psyop:reveal': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                const playerScore = data.scores?.[player.id] || 0;
                sendToPlayer(player, {
                  type: 'psyop:revealed',
                  correctAnswer: data.correctAnswer,
                  yourScore: playerScore,
                });
              }
            });
            break;
          }

          // ==================== SORT CIRCUIT (SEQUENCE) GAME ====================
          case 'sequence:host:create': {
            const code = generateRoomCode();
            const room: Room = {
              code,
              hostId: 'anonymous',
              hostWs: ws,
              players: new Map(),
              buzzerLocked: true,
              buzzQueue: [],
              passedPlayers: new Set(),
              boardId: null,
              completedQuestions: new Set(),
              sessionId: null,
              gameMode: 'sequence',
              sequenceSubmissions: [],
              sequencePhase: 'waiting',
              sequencePaused: false,
              sequencePauseStartTime: undefined,
              sequenceQuestionIndex: undefined,
              sequenceTotalQuestions: undefined,
            };
            rooms.set(code, room);
            wsToRoom.set(ws, { roomCode: code, isHost: true });
            ws.send(JSON.stringify({ type: 'sequence:room:created', code }));
            console.log(`[WebSocket] Sort Circuit room ${code} created`);
            break;
          }

          case 'sequence:host:switchMode': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            room.gameMode = 'sequence';
            room.sequenceSubmissions = [];
            room.sequencePhase = 'waiting';
            room.sequencePaused = false;
            room.currentCorrectOrder = undefined;
            room.currentQuestion = undefined;
            room.questionStartTime = undefined;
            room.pointsPerRound = undefined;
            room.sequencePauseStartTime = undefined;
            room.sequenceQuestionIndex = undefined;
            room.sequenceTotalQuestions = undefined;
            
            ws.send(JSON.stringify({
              type: 'sequence:mode:switched',
              code: room.code,
              players: getPlayersArray(room),
            }));
            console.log(`[WebSocket] Room ${room.code} switched to sequence mode`);
            break;
          }

          case 'sequence:player:join': {
            if (!data.code || typeof data.code !== 'string') {
              ws.send(JSON.stringify({ type: 'error', message: 'Room code is required' }));
              break;
            }
            const code = data.code.toUpperCase();
            const room = rooms.get(code);
            if (!room) {
              ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
              break;
            }

            if (room.players.size >= 50 && !data.playerId) {
              ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
              break;
            }

            const playerName = (typeof data.name === 'string' && data.name.trim().length > 0) ? data.name.trim().slice(0, 30) : 'Player';
            const allowedAvatars = ['cat', 'dog', 'fox', 'bear', 'rabbit', 'panda', 'koala', 'owl', 'penguin', 'unicorn', 'dragon', 'lion', 'tiger', 'monkey', 'frog', 'ghost', 'alien', 'robot', 'skull', 'fire'];
            const playerAvatar = (typeof data.avatar === 'string' && allowedAvatars.includes(data.avatar)) ? data.avatar : 'cat';

            const playerId = data.playerId || crypto.randomUUID();
            const existingPlayer = room.players.get(playerId);
            
            if (existingPlayer) {
              if (!data.reconnectToken || data.reconnectToken !== existingPlayer.reconnectToken) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid reconnect token' }));
                break;
              }
              existingPlayer.ws = ws;
              existingPlayer.isConnected = true;
              existingPlayer.name = playerName;
              existingPlayer.avatar = playerAvatar;
              wsToRoom.set(ws, { roomCode: room.code, isHost: false, playerId });

              ws.send(JSON.stringify({
                type: 'sequence:joined',
                playerId,
                reconnectToken: existingPlayer.reconnectToken,
                score: existingPlayer.score,
              }));

              // Send phase sync if game is actively in progress
              const phase = room.sequencePhase || 'waiting';
              if (phase !== 'waiting') {
                const leaderboard = Array.from(room.players.values())
                  .map(p => ({
                    playerId: p.id,
                    playerName: p.name,
                    playerAvatar: p.avatar,
                    score: p.score,
                  }))
                  .sort((a, b) => b.score - a.score);

                const qIdx = room.sequenceQuestionIndex;
                const qTotal = room.sequenceTotalQuestions;

                if (phase === 'playing' && room.currentQuestion) {
                  ws.send(JSON.stringify({
                    type: 'sequence:phaseSync',
                    phase: 'playing',
                    question: room.currentQuestion,
                    questionIndex: qIdx,
                    totalQuestions: qTotal,
                  }));
                } else if (phase === 'animatedReveal' && room.currentQuestion) {
                  ws.send(JSON.stringify({
                    type: 'sequence:phaseSync',
                    phase: 'animatedReveal',
                    question: room.currentQuestion,
                    questionIndex: qIdx,
                    totalQuestions: qTotal,
                  }));
                } else if (phase === 'revealing') {
                  const playerSub = (room.sequenceSubmissions || []).find(s => s.playerId === playerId);
                  const isCorrect = playerSub?.isCorrect || false;
                  const playerRank = playerSub?.isCorrect
                    ? (room.sequenceSubmissions || []).filter(s => s.isCorrect && s.timeMs < playerSub!.timeMs).length + 1
                    : null;
                  ws.send(JSON.stringify({
                    type: 'sequence:phaseSync',
                    phase: 'revealing',
                    correctOrder: room.currentCorrectOrder,
                    isCorrect,
                    rank: playerRank,
                    leaderboard,
                    myScore: existingPlayer.score,
                    questionIndex: qIdx,
                    totalQuestions: qTotal,
                  }));
                } else if (phase === 'leaderboard') {
                  ws.send(JSON.stringify({
                    type: 'sequence:phaseSync',
                    phase: 'leaderboard',
                    leaderboard,
                    myScore: existingPlayer.score,
                  }));
                } else if (phase === 'gameComplete') {
                  ws.send(JSON.stringify({
                    type: 'sequence:phaseSync',
                    phase: 'gameComplete',
                    leaderboard,
                    winner: leaderboard[0] || null,
                    myScore: existingPlayer.score,
                  }));
                }
              }

              sendToHost(room, {
                type: 'sequence:player:joined',
                playerId,
                playerName: existingPlayer.name,
                playerAvatar: existingPlayer.avatar,
              });
              console.log(`[WebSocket] Player ${existingPlayer.name} rejoined Sort Circuit room ${room.code}`);
            } else {
              const reconnectToken = crypto.randomUUID();
              const player: RoomPlayer = {
                id: playerId,
                reconnectToken,
                name: playerName,
                avatar: playerAvatar,
                score: 0,
                ws,
                isConnected: true,
                correctAnswers: 0,
                wrongAnswers: 0,
                totalTimeMs: 0,
                currentStreak: 0,
                bestStreak: 0,
              };
              room.players.set(playerId, player);
              wsToRoom.set(ws, { roomCode: room.code, isHost: false, playerId });

              ws.send(JSON.stringify({
                type: 'sequence:joined',
                playerId,
                reconnectToken,
                score: 0,
              }));

              // Send phase sync for new players joining mid-game
              const newPlayerPhase = room.sequencePhase || 'waiting';
              if (newPlayerPhase !== 'waiting') {
                const newPlayerLeaderboard = Array.from(room.players.values())
                  .map(p => ({
                    playerId: p.id,
                    playerName: p.name,
                    playerAvatar: p.avatar,
                    score: p.score,
                  }))
                  .sort((a, b) => b.score - a.score);
                const npQIdx = room.sequenceQuestionIndex;
                const npQTotal = room.sequenceTotalQuestions;

                if ((newPlayerPhase === 'playing' || newPlayerPhase === 'animatedReveal') && room.currentQuestion) {
                  ws.send(JSON.stringify({
                    type: 'sequence:phaseSync',
                    phase: newPlayerPhase,
                    question: room.currentQuestion,
                    questionIndex: npQIdx,
                    totalQuestions: npQTotal,
                  }));
                } else if (newPlayerPhase === 'revealing') {
                  ws.send(JSON.stringify({
                    type: 'sequence:phaseSync',
                    phase: 'revealing',
                    correctOrder: room.currentCorrectOrder,
                    isCorrect: false,
                    rank: null,
                    leaderboard: newPlayerLeaderboard,
                    myScore: 0,
                    questionIndex: npQIdx,
                    totalQuestions: npQTotal,
                  }));
                } else if (newPlayerPhase === 'leaderboard') {
                  ws.send(JSON.stringify({
                    type: 'sequence:phaseSync',
                    phase: 'leaderboard',
                    leaderboard: newPlayerLeaderboard,
                    myScore: 0,
                  }));
                } else if (newPlayerPhase === 'gameComplete') {
                  ws.send(JSON.stringify({
                    type: 'sequence:phaseSync',
                    phase: 'gameComplete',
                    leaderboard: newPlayerLeaderboard,
                    winner: newPlayerLeaderboard[0] || null,
                    myScore: 0,
                  }));
                }
              }

              sendToHost(room, {
                type: 'sequence:player:joined',
                playerId,
                playerName: player.name,
                playerAvatar: player.avatar,
              });
              console.log(`[WebSocket] Player ${player.name} joined Sort Circuit room ${room.code}`);
            }
            break;
          }

          case 'sequence:host:startQuestion': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            if (!data.correctOrder || !Array.isArray(data.correctOrder) || data.correctOrder.length !== 4) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid correctOrder' }));
              break;
            }
            const sqValidLetters = new Set(['A', 'B', 'C', 'D']);
            if (new Set(data.correctOrder).size !== 4 || !data.correctOrder.every((l: any) => typeof l === 'string' && sqValidLetters.has(l))) {
              ws.send(JSON.stringify({ type: 'error', message: 'correctOrder must contain A, B, C, D exactly once' }));
              break;
            }
            if (!data.question || typeof data.question !== 'object') {
              ws.send(JSON.stringify({ type: 'error', message: 'Question data is required' }));
              break;
            }

            const rawPoints = Number(data.pointsPerRound);
            const validPoints = Number.isFinite(rawPoints) && Number.isInteger(rawPoints) && rawPoints > 0 && rawPoints <= 100 ? rawPoints : 10;

            room.sequenceSubmissions = [];
            room.currentCorrectOrder = data.correctOrder;
            room.currentQuestion = data.question;
            room.questionStartTime = Date.now();
            room.pointsPerRound = validPoints;
            room.sequencePhase = 'playing';
            room.sequencePaused = false;
            room.sequencePauseStartTime = undefined;
            room.sequenceQuestionIndex = typeof data.questionIndex === 'number' && Number.isFinite(data.questionIndex) ? data.questionIndex : 0;
            room.sequenceTotalQuestions = typeof data.totalQuestions === 'number' && Number.isFinite(data.totalQuestions) ? data.totalQuestions : 0;
            
            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                sendToPlayer(player, {
                  type: 'sequence:question:start',
                  question: data.question,
                  questionIndex: room.sequenceQuestionIndex,
                  totalQuestions: room.sequenceTotalQuestions,
                });
              }
            });

            sendToHost(room, {
              type: 'sequence:question:started',
              question: data.question,
              questionIndex: room.sequenceQuestionIndex,
              totalQuestions: room.sequenceTotalQuestions,
            });
            break;
          }

          case 'sequence:host:startAnimatedReveal': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            if (!data.correctOrder || !Array.isArray(data.correctOrder) || data.correctOrder.length !== 4) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid correctOrder' }));
              break;
            }
            const arValidLetters = new Set(['A', 'B', 'C', 'D']);
            if (new Set(data.correctOrder).size !== 4 || !data.correctOrder.every((l: any) => typeof l === 'string' && arValidLetters.has(l))) {
              ws.send(JSON.stringify({ type: 'error', message: 'correctOrder must contain A, B, C, D exactly once' }));
              break;
            }
            if (!data.question || typeof data.question !== 'object') {
              ws.send(JSON.stringify({ type: 'error', message: 'Question data is required' }));
              break;
            }

            const arRawPoints = Number(data.pointsPerRound);
            const arValidPoints = Number.isFinite(arRawPoints) && Number.isInteger(arRawPoints) && arRawPoints > 0 && arRawPoints <= 100 ? arRawPoints : 10;

            room.sequenceSubmissions = [];
            room.currentCorrectOrder = data.correctOrder;
            room.currentQuestion = data.question;
            room.pointsPerRound = arValidPoints;
            room.sequencePhase = 'animatedReveal';
            room.sequencePaused = false;
            room.sequencePauseStartTime = undefined;
            room.sequenceQuestionIndex = typeof data.questionIndex === 'number' && Number.isFinite(data.questionIndex) ? data.questionIndex : 0;
            room.sequenceTotalQuestions = typeof data.totalQuestions === 'number' && Number.isFinite(data.totalQuestions) ? data.totalQuestions : 0;
            
            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                sendToPlayer(player, {
                  type: 'sequence:animatedReveal',
                  question: data.question,
                  questionIndex: room.sequenceQuestionIndex,
                  totalQuestions: room.sequenceTotalQuestions,
                });
              }
            });

            sendToHost(room, {
              type: 'sequence:animatedReveal:started',
              question: data.question,
              questionIndex: room.sequenceQuestionIndex,
              totalQuestions: room.sequenceTotalQuestions,
            });
            break;
          }

          case 'sequence:host:startAnswering': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            if (room.sequencePhase !== 'animatedReveal') {
              ws.send(JSON.stringify({ type: 'error', message: 'Can only start answering from animated reveal phase' }));
              break;
            }

            if (!room.currentQuestion) {
              console.warn(`[WebSocket] startAnswering called but no currentQuestion stored for room ${room.code}`);
              break;
            }

            room.sequenceSubmissions = [];
            room.questionStartTime = Date.now();
            room.sequencePhase = 'playing';
            room.sequencePaused = false;
            room.sequencePauseStartTime = undefined;

            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                sendToPlayer(player, {
                  type: 'sequence:question:start',
                  question: room.currentQuestion,
                  questionIndex: room.sequenceQuestionIndex,
                  totalQuestions: room.sequenceTotalQuestions,
                });
              }
            });

            sendToHost(room, {
              type: 'sequence:answering:started',
            });
            break;
          }

          case 'sequence:host:pause': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            const room = rooms.get(mapping.roomCode);
            if (!room) break;
            if (room.sequencePhase !== 'playing') break;
            if (room.sequencePaused) break;
            room.sequencePaused = true;
            room.sequencePauseStartTime = Date.now();
            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                sendToPlayer(player, { type: 'sequence:paused' });
              }
            });
            break;
          }

          case 'sequence:host:resume': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            const room = rooms.get(mapping.roomCode);
            if (!room) break;
            if (!room.sequencePaused) break;
            room.sequencePaused = false;
            if (room.sequencePauseStartTime && room.questionStartTime) {
              const pauseDuration = Date.now() - room.sequencePauseStartTime;
              room.questionStartTime += pauseDuration;
            }
            room.sequencePauseStartTime = undefined;
            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                sendToPlayer(player, { type: 'sequence:resumed' });
              }
            });
            break;
          }

          case 'sequence:player:submit': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room || !mapping.playerId) break;

            if (room.sequencePhase !== 'playing') {
              ws.send(JSON.stringify({ type: 'error', message: 'Not accepting answers right now' }));
              break;
            }

            if (room.sequencePaused) {
              ws.send(JSON.stringify({ type: 'error', message: 'Game is paused' }));
              break;
            }

            if (!Array.isArray(data.sequence) || data.sequence.length !== 4 || !data.sequence.every((item: any) => typeof item === 'string' && ['A', 'B', 'C', 'D'].includes(item))) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid sequence format' }));
              break;
            }

            const seqSet = new Set(data.sequence);
            if (seqSet.size !== 4) {
              ws.send(JSON.stringify({ type: 'error', message: 'Sequence must contain A, B, C, D exactly once' }));
              break;
            }

            const player = room.players.get(mapping.playerId);
            if (!player) break;

            const timeMs = room.questionStartTime ? Date.now() - room.questionStartTime : 0;

            const submission: SequenceSubmission = {
              playerId: player.id,
              playerName: player.name,
              playerAvatar: player.avatar,
              sequence: data.sequence,
              timeMs,
            };

            if (!room.sequenceSubmissions) room.sequenceSubmissions = [];
            
            // Check if player already submitted
            const existingIdx = room.sequenceSubmissions.findIndex(s => s.playerId === player.id);
            if (existingIdx >= 0) break; // Already submitted
            
            room.sequenceSubmissions.push(submission);

            // Notify host of submission
            sendToHost(room, {
              type: 'sequence:submission',
              submission,
            });

            // Check if all connected players have submitted for auto-reveal
            const connectedPlayers = Array.from(room.players.values()).filter(p => p.isConnected);
            const connectedPlayerIds = new Set(connectedPlayers.map(p => p.id));
            const submissionsFromConnected = room.sequenceSubmissions.filter(s => connectedPlayerIds.has(s.playerId));
            if (submissionsFromConnected.length >= connectedPlayers.length && connectedPlayers.length > 0) {
              sendToHost(room, {
                type: 'sequence:allSubmitted',
              });
            }
            break;
          }

          case 'sequence:host:reveal': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            if (room.sequencePhase !== 'playing') {
              break;
            }

            if (room.sequencePaused) {
              ws.send(JSON.stringify({ type: 'error', message: 'Cannot reveal while game is paused. Resume first.' }));
              break;
            }

            const correctOrder = room.currentCorrectOrder;
            if (!correctOrder || !Array.isArray(correctOrder) || correctOrder.length !== 4) {
              ws.send(JSON.stringify({ type: 'error', message: 'No active question to reveal' }));
              break;
            }
            const submissions = room.sequenceSubmissions || [];
            
            // Determine correctness and find winner
            let winner: { playerId: string; playerName: string; playerAvatar: string; timeMs: number } | null = null;
            let fastestCorrectTime = Infinity;

            for (const sub of submissions) {
              sub.isCorrect = JSON.stringify(sub.sequence) === JSON.stringify(correctOrder);
              if (sub.isCorrect && sub.timeMs < fastestCorrectTime) {
                fastestCorrectTime = sub.timeMs;
                winner = {
                  playerId: sub.playerId,
                  playerName: sub.playerName,
                  playerAvatar: sub.playerAvatar || 'cat',
                  timeMs: sub.timeMs,
                };
              }
            }

            // Update player statistics
            const submittedPlayerIds = new Set(submissions.map(s => s.playerId));
            for (const sub of submissions) {
              const player = room.players.get(sub.playerId);
              if (player) {
                if (sub.isCorrect) {
                  player.correctAnswers += 1;
                  player.totalTimeMs += sub.timeMs;
                  player.currentStreak += 1;
                  if (player.currentStreak > player.bestStreak) {
                    player.bestStreak = player.currentStreak;
                  }
                } else {
                  player.wrongAnswers += 1;
                  player.currentStreak = 0;
                }
              }
            }
            // Reset streak for connected players who didn't submit (missed the question)
            room.players.forEach((player) => {
              if (!submittedPlayerIds.has(player.id) && player.isConnected) {
                player.wrongAnswers += 1;
                player.currentStreak = 0;
              }
            });

            // Award points to winner (use configured points per round)
            const pointsToAward = room.pointsPerRound || 10;
            if (winner) {
              const winningPlayer = room.players.get(winner.playerId);
              if (winningPlayer) {
                winningPlayer.score += pointsToAward;
              }
            }

            // Build leaderboard with stats
            const leaderboard = Array.from(room.players.values())
              .map(p => ({
                playerId: p.id,
                playerName: p.name,
                playerAvatar: p.avatar,
                score: p.score,
                correctAnswers: p.correctAnswers,
                wrongAnswers: p.wrongAnswers,
                avgTimeMs: p.correctAnswers > 0 ? Math.round(p.totalTimeMs / p.correctAnswers) : 0,
                currentStreak: p.currentStreak,
                bestStreak: p.bestStreak,
              }))
              .sort((a, b) => b.score - a.score);

            room.sequencePhase = 'revealing';

            // Send reveal to all players
            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                const playerSub = submissions.find(s => s.playerId === player.id);
                const playerRank = playerSub?.isCorrect 
                  ? submissions.filter(s => s.isCorrect && s.timeMs < playerSub.timeMs).length + 1
                  : null;
                
                sendToPlayer(player, {
                  type: 'sequence:reveal',
                  correctOrder,
                  isCorrect: playerSub?.isCorrect || false,
                  rank: playerRank,
                  myScore: player.score,
                  leaderboard,
                  winner: winner ? { ...winner } : null,
                });
              }
            });

            // Send reveal complete to host
            sendToHost(room, {
              type: 'sequence:reveal:complete',
              submissions,
              winner,
              leaderboard,
              currentQuestionIndex: room.sequenceQuestionIndex,
              totalQuestions: room.sequenceTotalQuestions,
              pointsAwarded: pointsToAward,
            });
            break;
          }

          case 'sequence:host:showLeaderboard': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            if (room.sequencePhase === 'gameComplete') break;

            room.sequencePhase = 'leaderboard';

            const leaderboard = Array.from(room.players.values())
              .map(p => ({
                playerId: p.id,
                playerName: p.name,
                playerAvatar: p.avatar,
                score: p.score,
                correctAnswers: p.correctAnswers,
                wrongAnswers: p.wrongAnswers,
                avgTimeMs: p.correctAnswers > 0 ? Math.round(p.totalTimeMs / p.correctAnswers) : 0,
                currentStreak: p.currentStreak,
                bestStreak: p.bestStreak,
              }))
              .sort((a, b) => b.score - a.score);

            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                sendToPlayer(player, {
                  type: 'sequence:leaderboard',
                  leaderboard,
                  myScore: player.score,
                });
              }
            });

            sendToHost(room, {
              type: 'sequence:leaderboard',
              leaderboard,
            });
            break;
          }

          case 'sequence:host:resetScores': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            room.sequencePhase = 'waiting';
            room.sequencePaused = false;
            room.sequenceSubmissions = [];
            room.currentCorrectOrder = undefined;
            room.currentQuestion = undefined;
            room.questionStartTime = undefined;
            room.pointsPerRound = undefined;
            room.sequencePauseStartTime = undefined;
            room.sequenceQuestionIndex = undefined;
            room.sequenceTotalQuestions = undefined;

            room.players.forEach((player) => {
              player.score = 0;
              player.correctAnswers = 0;
              player.wrongAnswers = 0;
              player.totalTimeMs = 0;
              player.currentStreak = 0;
              player.bestStreak = 0;
              if (player.ws && player.isConnected) {
                sendToPlayer(player, { type: 'sequence:scoresReset' });
              }
            });

            sendToHost(room, { type: 'sequence:scoresReset' });
            break;
          }

          case 'sequence:host:reset': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            room.sequenceSubmissions = [];
            room.currentCorrectOrder = undefined;
            room.currentQuestion = undefined;
            room.sequencePhase = 'waiting';
            room.sequencePaused = false;
            room.questionStartTime = undefined;
            room.pointsPerRound = undefined;
            room.sequencePauseStartTime = undefined;
            room.sequenceQuestionIndex = undefined;
            room.sequenceTotalQuestions = undefined;

            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                sendToPlayer(player, { type: 'sequence:reset' });
              }
            });
            break;
          }

          case 'sequence:host:adjustPoints': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            const { playerId, delta } = data;
            if (!playerId || typeof playerId !== 'string') break;
            if (typeof delta !== 'number' || !Number.isFinite(delta) || !Number.isInteger(delta)) break;
            if (delta < -1000 || delta > 1000) break;

            const player = room.players.get(playerId);
            if (!player) break;

            player.score = Math.max(0, player.score + delta);

            const leaderboard = Array.from(room.players.values())
              .map(p => ({
                playerId: p.id,
                playerName: p.name,
                playerAvatar: p.avatar,
                score: p.score,
                correctAnswers: p.correctAnswers,
                wrongAnswers: p.wrongAnswers,
                avgTimeMs: p.correctAnswers > 0 ? Math.round(p.totalTimeMs / p.correctAnswers) : 0,
                currentStreak: p.currentStreak,
                bestStreak: p.bestStreak,
              }))
              .sort((a, b) => b.score - a.score);

            sendToHost(room, {
              type: 'sequence:pointsAdjusted',
              playerId,
              newScore: player.score,
              delta,
              leaderboard,
            });

            if (player.ws && player.isConnected) {
              sendToPlayer(player, {
                type: 'sequence:pointsAdjusted',
                newScore: player.score,
                delta,
              });
            }
            break;
          }

          case 'sequence:host:endGame': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            if (room.sequencePhase === 'gameComplete') break;

            room.sequencePhase = 'gameComplete';
            room.sequencePaused = false;
            room.sequencePauseStartTime = undefined;

            const leaderboard = Array.from(room.players.values())
              .map(p => ({
                playerId: p.id,
                playerName: p.name,
                playerAvatar: p.avatar,
                score: p.score,
                correctAnswers: p.correctAnswers,
                wrongAnswers: p.wrongAnswers,
                avgTimeMs: p.correctAnswers > 0 ? Math.round(p.totalTimeMs / p.correctAnswers) : 0,
                currentStreak: p.currentStreak,
                bestStreak: p.bestStreak,
              }))
              .sort((a, b) => b.score - a.score);

            const globalWinner = leaderboard.length > 0 ? leaderboard[0] : null;

            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                sendToPlayer(player, {
                  type: 'sequence:gameComplete',
                  leaderboard,
                  winner: globalWinner,
                  myScore: player.score,
                });
              }
            });

            sendToHost(room, {
              type: 'sequence:gameComplete',
              leaderboard,
              globalWinner,
            });
            break;
          }

          // ==================== MEME NO HARM GAME ====================
          case 'meme:host:create': {
            const code = generateRoomCode();
            const totalRounds = Math.min(20, Math.max(1, parseInt(data.totalRounds) || 5));
            const room: Room = {
              code,
              hostId: data.hostId?.toString() || 'anonymous',
              hostWs: ws,
              players: new Map(),
              buzzerLocked: true,
              buzzQueue: [],
              passedPlayers: new Set(),
              boardId: null,
              completedQuestions: new Set(),
              sessionId: null,
              gameMode: 'meme',
              memeSubmissions: new Map(),
              memeVotes: new Map(),
              memeRound: 0,
              memeTotalRounds: totalRounds,
              memeSittingOut: new Set(),
              memePhase: 'lobby',
              memeUsedPrompts: [],
            };
            rooms.set(code, room);
            wsToRoom.set(ws, { roomCode: code, isHost: true });

            ws.send(JSON.stringify({
              type: 'meme:room:created',
              code,
            }));
            console.log(`[WebSocket] Meme No Harm room ${code} created`);
            break;
          }

          case 'meme:host:rejoin': {
            const rejoinCode = data.code?.toUpperCase();
            const room = rooms.get(rejoinCode);
            if (!room || room.gameMode !== 'meme') {
              ws.send(JSON.stringify({ type: 'error', message: 'Room not found for rejoin' }));
              break;
            }

            room.hostWs = ws;
            wsToRoom.set(ws, { roomCode: room.code, isHost: true });

            const playerList = Array.from(room.players.values()).map(p => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar,
              score: p.score,
              isConnected: p.isConnected,
              sittingOut: room.memeSittingOut?.has(p.id) || false,
              submitted: room.memeSubmissions?.has(p.id) || false,
              voted: room.memeVotes?.has(p.id) || false,
            }));

            const submissions = Array.from(room.memeSubmissions?.values() || []).map(s => ({
              id: s.playerId,
              playerName: s.playerName,
              gifUrl: s.gifUrl,
              gifTitle: s.gifTitle,
            }));

            let revealResults = null;
            let revealLeaderboard = null;
            let revealRoundWinnerId = null;

            if (room.memePhase === 'reveal') {
              const votes = room.memeVotes || new Map();
              const voteCount: Record<string, number> = {};
              votes.forEach((votedForId: string) => {
                voteCount[votedForId] = (voteCount[votedForId] || 0) + 1;
              });

              revealResults = Array.from(room.memeSubmissions?.values() || []).map(sub => {
                const numVotes = voteCount[sub.playerId] || 0;
                const points = numVotes * 100;
                return {
                  playerId: sub.playerId,
                  playerName: sub.playerName,
                  playerAvatar: sub.playerAvatar,
                  gifUrl: sub.gifUrl,
                  gifTitle: sub.gifTitle,
                  votes: numVotes,
                  points,
                };
              });

              let maxVotes = 0;
              revealResults.forEach(r => {
                if (r.votes > maxVotes) {
                  maxVotes = r.votes;
                  revealRoundWinnerId = r.playerId;
                }
              });

              revealLeaderboard = Array.from(room.players.values())
                .map(p => ({
                  playerId: p.id,
                  playerName: p.name,
                  playerAvatar: p.avatar,
                  score: p.score,
                }))
                .sort((a, b) => b.score - a.score);
            }

            ws.send(JSON.stringify({
              type: 'meme:host:rejoined',
              code: room.code,
              phase: room.memePhase || 'lobby',
              round: room.memeRound || 0,
              totalRounds: room.memeTotalRounds || 5,
              prompt: room.memePrompt || null,
              usedPrompts: room.memeUsedPrompts || [],
              players: playerList,
              submissionCount: room.memeSubmissions?.size || 0,
              voteCount: room.memeVotes?.size || 0,
              votingSubmissions: submissions,
              results: revealResults,
              leaderboard: revealLeaderboard,
              roundWinnerId: revealRoundWinnerId,
            }));

            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                sendToPlayer(player, { type: 'host:reconnected' });
              }
            });

            console.log(`[WebSocket] Host rejoined Meme No Harm room ${room.code} (phase: ${room.memePhase || 'lobby'})`);
            break;
          }

          case 'meme:player:join': {
            const code = data.code?.toUpperCase();
            const room = rooms.get(code);
            if (!room || room.gameMode !== 'meme') {
              ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
              break;
            }

            const playerId = data.playerId || crypto.randomUUID();
            const existingPlayer = room.players.get(playerId);

            if (existingPlayer) {
              if (!data.reconnectToken || data.reconnectToken !== existingPlayer.reconnectToken) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid reconnect token' }));
                break;
              }
              existingPlayer.ws = ws;
              existingPlayer.isConnected = true;
              existingPlayer.name = data.name || existingPlayer.name;
              existingPlayer.avatar = data.avatar || existingPlayer.avatar;
              wsToRoom.set(ws, { roomCode: room.code, isHost: false, playerId });

              ws.send(JSON.stringify({
                type: 'meme:joined',
                playerId,
                reconnectToken: existingPlayer.reconnectToken,
                score: existingPlayer.score,
              }));

              if (room.memePrompt && room.memeRound) {
                const isSittingOut = room.memeSittingOut?.has(playerId) || false;
                if (isSittingOut) {
                  sendToPlayer(existingPlayer, { type: 'meme:sittingOut' });
                } else if (room.memePhase === 'voting') {
                  if (room.memeVotes?.has(playerId)) {
                    sendToPlayer(existingPlayer, {
                      type: 'meme:phaseSync',
                      phase: 'voted',
                    });
                  } else {
                    const submissions = Array.from(room.memeSubmissions?.values() || []);
                    const filteredSubmissions = submissions
                      .filter(s => s.playerId !== playerId)
                      .map(s => ({
                        id: s.playerId,
                        gifUrl: s.gifUrl,
                        gifTitle: s.gifTitle,
                      }));
                    sendToPlayer(existingPlayer, {
                      type: 'meme:voting:start',
                      submissions: filteredSubmissions,
                      prompt: room.memePrompt,
                      deadline: Date.now() + 30000,
                    });
                  }
                } else if (room.memePhase === 'selecting') {
                  const hasSubmitted = room.memeSubmissions?.has(playerId);
                  if (hasSubmitted) {
                    sendToPlayer(existingPlayer, {
                      type: 'meme:phaseSync',
                      phase: 'submitted',
                    });
                  } else {
                    sendToPlayer(existingPlayer, {
                      type: 'meme:round:start',
                      prompt: room.memePrompt,
                      round: room.memeRound,
                      totalRounds: room.memeTotalRounds,
                      deadline: Date.now() + 45000,
                    });
                  }
                } else if (room.memePhase === 'reveal') {
                  const revealVotes = room.memeVotes || new Map();
                  const revealVoteCount: Record<string, number> = {};
                  revealVotes.forEach((votedForId: string) => {
                    revealVoteCount[votedForId] = (revealVoteCount[votedForId] || 0) + 1;
                  });
                  const revealResults = Array.from(room.memeSubmissions?.values() || []).map(sub => {
                    const numVotes = revealVoteCount[sub.playerId] || 0;
                    return {
                      playerId: sub.playerId,
                      playerName: sub.playerName,
                      playerAvatar: sub.playerAvatar,
                      gifUrl: sub.gifUrl,
                      gifTitle: sub.gifTitle,
                      votes: numVotes,
                      points: numVotes * 100,
                    };
                  });
                  let revealMaxVotes = 0;
                  let revealWinnerId: string | null = null;
                  revealResults.forEach(r => {
                    if (r.votes > revealMaxVotes) {
                      revealMaxVotes = r.votes;
                      revealWinnerId = r.playerId;
                    }
                  });
                  sendToPlayer(existingPlayer, {
                    type: 'meme:reveal',
                    results: revealResults,
                    leaderboard: Array.from(room.players.values())
                      .map(p => ({ playerId: p.id, playerName: p.name, playerAvatar: p.avatar, score: p.score }))
                      .sort((a, b) => b.score - a.score),
                    roundWinnerId: revealWinnerId,
                    myScore: existingPlayer.score,
                    round: room.memeRound,
                    totalRounds: room.memeTotalRounds,
                  });
                } else if (room.memePhase === 'gameComplete') {
                  const leaderboard = Array.from(room.players.values())
                    .map(p => ({ playerId: p.id, playerName: p.name, playerAvatar: p.avatar, score: p.score }))
                    .sort((a, b) => b.score - a.score);
                  sendToPlayer(existingPlayer, {
                    type: 'meme:gameComplete',
                    leaderboard,
                    winner: leaderboard.length > 0 ? leaderboard[0] : null,
                    myScore: existingPlayer.score,
                  });
                }
              }

              sendToHost(room, {
                type: 'meme:player:joined',
                playerId,
                playerName: existingPlayer.name,
                playerAvatar: existingPlayer.avatar,
                isReconnect: true,
              });
              console.log(`[WebSocket] Player ${existingPlayer.name} rejoined Meme No Harm room ${room.code}`);
            } else {
              const reconnectToken = crypto.randomUUID();
              const player: RoomPlayer = {
                id: playerId,
                reconnectToken,
                name: data.name || 'Player',
                avatar: data.avatar || 'cat',
                score: 0,
                ws,
                isConnected: true,
                correctAnswers: 0,
                wrongAnswers: 0,
                totalTimeMs: 0,
                currentStreak: 0,
                bestStreak: 0,
              };
              room.players.set(playerId, player);
              wsToRoom.set(ws, { roomCode: room.code, isHost: false, playerId });

              ws.send(JSON.stringify({
                type: 'meme:joined',
                playerId,
                reconnectToken,
                score: 0,
              }));

              if (room.memePrompt && room.memeRound) {
                if (room.memePhase === 'selecting') {
                  sendToPlayer(player, {
                    type: 'meme:round:start',
                    prompt: room.memePrompt,
                    round: room.memeRound,
                    totalRounds: room.memeTotalRounds,
                    deadline: Date.now() + 45000,
                  });
                } else if (room.memePhase === 'voting') {
                  const submissions = Array.from(room.memeSubmissions?.values() || []);
                  const filteredSubmissions = submissions
                    .filter(s => s.playerId !== playerId)
                    .map(s => ({
                      id: s.playerId,
                      gifUrl: s.gifUrl,
                      gifTitle: s.gifTitle,
                    }));
                  sendToPlayer(player, {
                    type: 'meme:voting:start',
                    submissions: filteredSubmissions,
                    prompt: room.memePrompt,
                    deadline: Date.now() + 30000,
                  });
                }
              }

              sendToHost(room, {
                type: 'meme:player:joined',
                playerId,
                playerName: player.name,
                playerAvatar: player.avatar,
                isReconnect: false,
              });
              console.log(`[WebSocket] Player ${player.name} joined Meme No Harm room ${room.code} (phase: ${room.memePhase || 'lobby'})`);
            }
            break;
          }

          case 'meme:host:startRound': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            if (!data.prompt || typeof data.prompt !== 'string' || !data.prompt.trim()) {
              ws.send(JSON.stringify({ type: 'error', message: 'Prompt is required' }));
              break;
            }

            room.memeSubmissions = new Map();
            room.memeVotes = new Map();
            room.memePrompt = data.prompt.trim();
            room.memeRound = (room.memeRound || 0) + 1;
            room.memePhase = 'selecting';
            if (!room.memeUsedPrompts) room.memeUsedPrompts = [];
            if (!room.memeUsedPrompts.includes(room.memePrompt)) {
              room.memeUsedPrompts.push(room.memePrompt);
            }

            room.players.forEach((player) => {
              if (player.ws && player.isConnected && !room.memeSittingOut?.has(player.id)) {
                sendToPlayer(player, {
                  type: 'meme:round:start',
                  prompt: room.memePrompt,
                  round: room.memeRound,
                  totalRounds: room.memeTotalRounds,
                  deadline: data.deadline,
                });
              }
            });
            console.log(`[WebSocket] Meme No Harm round ${room.memeRound} started in room ${room.code}: "${room.memePrompt}"`);
            break;
          }

          case 'meme:player:submit': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || mapping.isHost) break;
            const room = rooms.get(mapping.roomCode);
            if (!room || !mapping.playerId) break;
            if (room.memePhase !== 'selecting') break;

            const player = room.players.get(mapping.playerId);
            if (!player) break;
            if (room.memeSittingOut?.has(player.id)) break;

            if (room.memeSubmissions?.has(player.id)) break;

            if (!data.gifUrl || typeof data.gifUrl !== 'string' || !data.gifUrl.trim()) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid GIF URL' }));
              break;
            }

            const submission: MemeSubmission = {
              playerId: player.id,
              playerName: player.name,
              playerAvatar: player.avatar,
              gifUrl: data.gifUrl,
              gifTitle: data.gifTitle || '',
            };

            if (!room.memeSubmissions) room.memeSubmissions = new Map();
            room.memeSubmissions.set(player.id, submission);

            sendToHost(room, {
              type: 'meme:submission',
              playerId: player.id,
              playerName: player.name,
            });

            const activePlayers = Array.from(room.players.values())
              .filter(p => p.isConnected && !room.memeSittingOut?.has(p.id));
            const activeSubmittedCount = activePlayers.filter(p => room.memeSubmissions?.has(p.id)).length;
            if (activeSubmittedCount >= activePlayers.length && activePlayers.length > 0) {
              sendToHost(room, { type: 'meme:allSubmitted' });
            }
            console.log(`[WebSocket] Player ${player.name} submitted GIF in room ${room.code}`);
            break;
          }

          case 'meme:host:startVoting': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            if ((room.memeSubmissions?.size || 0) < 2) {
              ws.send(JSON.stringify({ type: 'error', message: 'Need at least 2 submissions to start voting' }));
              break;
            }

            room.memeVotes = new Map();
            room.memePhase = 'voting';

            const submissions = Array.from(room.memeSubmissions?.values() || []);
            const shuffled = submissions.sort(() => Math.random() - 0.5);

            room.players.forEach((player) => {
              if (player.ws && player.isConnected && !room.memeSittingOut?.has(player.id)) {
                const filteredSubmissions = shuffled
                  .filter(s => s.playerId !== player.id)
                  .map(s => ({
                    id: s.playerId,
                    gifUrl: s.gifUrl,
                    gifTitle: s.gifTitle,
                  }));

                sendToPlayer(player, {
                  type: 'meme:voting:start',
                  submissions: filteredSubmissions,
                  prompt: room.memePrompt,
                  deadline: data.deadline,
                });
                console.log(`[WebSocket] Sent voting to player ${player.name} (${player.id}) with ${filteredSubmissions.length} submissions`);
              } else {
                console.log(`[WebSocket] Skipped voting for player ${player.name} (${player.id}): ws=${!!player.ws}, connected=${player.isConnected}, sittingOut=${room.memeSittingOut?.has(player.id)}`);
              }
            });

            sendToHost(room, {
              type: 'meme:voting:started',
              submissions: shuffled.map(s => ({
                id: s.playerId,
                playerName: s.playerName,
                gifUrl: s.gifUrl,
                gifTitle: s.gifTitle,
              })),
            });
            console.log(`[WebSocket] Voting started in Meme No Harm room ${room.code}`);
            break;
          }

          case 'meme:player:vote': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || mapping.isHost) break;
            const room = rooms.get(mapping.roomCode);
            if (!room || !mapping.playerId) break;
            if (room.memePhase !== 'voting') break;

            if (room.memeVotes?.has(mapping.playerId)) break;
            if (data.votedForId === mapping.playerId) break;
            if (!room.memeSubmissions?.has(data.votedForId)) break;

            if (!room.memeVotes) room.memeVotes = new Map();
            room.memeVotes.set(mapping.playerId, data.votedForId);

            sendToHost(room, {
              type: 'meme:vote',
              voterId: mapping.playerId,
              votedForId: data.votedForId,
            });

            const eligibleVoters = Array.from(room.players.values())
              .filter(p => p.isConnected && !room.memeSittingOut?.has(p.id) && room.memeSubmissions?.has(p.id));
            const activeVotedCount = eligibleVoters.filter(p => room.memeVotes?.has(p.id)).length;
            if (activeVotedCount >= eligibleVoters.length && eligibleVoters.length > 0) {
              sendToHost(room, { type: 'meme:allVoted' });
            }
            console.log(`[WebSocket] Player voted in Meme No Harm room ${room.code}`);
            break;
          }

          case 'meme:host:reveal': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            room.memePhase = 'reveal';
            const votes = room.memeVotes || new Map();
            const submissions = room.memeSubmissions || new Map();

            const voteCount: Record<string, number> = {};
            votes.forEach((votedForId) => {
              voteCount[votedForId] = (voteCount[votedForId] || 0) + 1;
            });

            const pointsPerVote = data.pointsPerVote || 100;
            let roundWinnerId: string | null = null;
            let maxVotes = 0;

            const results = Array.from(submissions.values()).map(sub => {
              const numVotes = voteCount[sub.playerId] || 0;
              const points = numVotes * pointsPerVote;

              const player = room.players.get(sub.playerId);
              if (player) {
                player.score += points;
              }

              if (numVotes > maxVotes) {
                maxVotes = numVotes;
                roundWinnerId = sub.playerId;
              }

              return {
                playerId: sub.playerId,
                playerName: sub.playerName,
                playerAvatar: sub.playerAvatar,
                gifUrl: sub.gifUrl,
                gifTitle: sub.gifTitle,
                votes: numVotes,
                points,
              };
            });

            const leaderboard = Array.from(room.players.values())
              .map(p => ({
                playerId: p.id,
                playerName: p.name,
                playerAvatar: p.avatar,
                score: p.score,
              }))
              .sort((a, b) => b.score - a.score);

            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                sendToPlayer(player, {
                  type: 'meme:reveal',
                  results,
                  leaderboard,
                  roundWinnerId,
                  myScore: player.score,
                  round: room.memeRound,
                  totalRounds: room.memeTotalRounds,
                });
              }
            });

            sendToHost(room, {
              type: 'meme:reveal:complete',
              results,
              leaderboard,
              roundWinnerId,
              round: room.memeRound,
              totalRounds: room.memeTotalRounds,
            });
            console.log(`[WebSocket] Round ${room.memeRound} revealed in Meme No Harm room ${room.code}`);
            break;
          }

          case 'meme:host:sitOut': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            if (!data.playerId || typeof data.playerId !== 'string') break;
            if (!room.players.has(data.playerId)) break;

            if (!room.memeSittingOut) room.memeSittingOut = new Set();
            room.memeSittingOut.add(data.playerId);

            const player = room.players.get(data.playerId);
            if (player?.ws && player.isConnected) {
              sendToPlayer(player, { type: 'meme:sittingOut' });
            }

            sendToHost(room, {
              type: 'meme:player:satOut',
              playerId: data.playerId,
            });

            if (room.memePhase === 'selecting') {
              const activeAfterSitOut = Array.from(room.players.values())
                .filter(p => p.isConnected && !room.memeSittingOut?.has(p.id));
              const activeSubmittedCount = activeAfterSitOut.filter(p => room.memeSubmissions?.has(p.id)).length;
              if (activeSubmittedCount >= activeAfterSitOut.length && activeAfterSitOut.length > 0) {
                sendToHost(room, { type: 'meme:allSubmitted' });
              }
            } else if (room.memePhase === 'voting') {
              const eligibleAfterSitOut = Array.from(room.players.values())
                .filter(p => p.isConnected && !room.memeSittingOut?.has(p.id) && room.memeSubmissions?.has(p.id));
              const activeVotedCount = eligibleAfterSitOut.filter(p => room.memeVotes?.has(p.id)).length;
              if (activeVotedCount >= eligibleAfterSitOut.length && eligibleAfterSitOut.length > 0) {
                sendToHost(room, { type: 'meme:allVoted' });
              }
            }
            break;
          }

          case 'meme:host:unsitOut': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            if (!data.playerId || typeof data.playerId !== 'string') break;
            if (!room.players.has(data.playerId)) break;

            room.memeSittingOut?.delete(data.playerId);

            const player = room.players.get(data.playerId);
            if (player?.ws && player.isConnected) {
              if (room.memePhase === 'reveal') {
                const revealVotes = room.memeVotes || new Map();
                const revealVoteCount: Record<string, number> = {};
                revealVotes.forEach((votedForId: string) => {
                  revealVoteCount[votedForId] = (revealVoteCount[votedForId] || 0) + 1;
                });
                const revealResults = Array.from(room.memeSubmissions?.values() || []).map(sub => {
                  const numVotes = revealVoteCount[sub.playerId] || 0;
                  return {
                    playerId: sub.playerId,
                    playerName: sub.playerName,
                    playerAvatar: sub.playerAvatar,
                    gifUrl: sub.gifUrl,
                    gifTitle: sub.gifTitle,
                    votes: numVotes,
                    points: numVotes * 100,
                  };
                });
                let revealWinnerId: string | null = null;
                let maxVotes = 0;
                revealResults.forEach(r => {
                  if (r.votes > maxVotes) { maxVotes = r.votes; revealWinnerId = r.playerId; }
                });
                sendToPlayer(player, {
                  type: 'meme:unsittingOut',
                  phase: 'reveal',
                  results: revealResults,
                  leaderboard: Array.from(room.players.values())
                    .map(p => ({ playerId: p.id, playerName: p.name, playerAvatar: p.avatar, score: p.score }))
                    .sort((a, b) => b.score - a.score),
                  roundWinnerId: revealWinnerId,
                  myScore: player.score,
                  round: room.memeRound || 0,
                  totalRounds: room.memeTotalRounds || 0,
                });
              } else if (room.memePhase === 'gameComplete') {
                const leaderboard = Array.from(room.players.values())
                  .map(p => ({ playerId: p.id, playerName: p.name, playerAvatar: p.avatar, score: p.score }))
                  .sort((a, b) => b.score - a.score);
                sendToPlayer(player, {
                  type: 'meme:unsittingOut',
                  phase: 'gameComplete',
                  leaderboard,
                  winner: leaderboard.length > 0 ? leaderboard[0] : null,
                  myScore: player.score,
                });
              } else if (room.memePhase === 'voting') {
                const submissions = Array.from(room.memeSubmissions?.values() || []);
                const filteredSubmissions = submissions
                  .filter(s => s.playerId !== player.id)
                  .map(s => ({
                    id: s.playerId,
                    gifUrl: s.gifUrl,
                    gifTitle: s.gifTitle,
                  }));
                sendToPlayer(player, {
                  type: 'meme:unsittingOut',
                  prompt: room.memePrompt || null,
                  round: room.memeRound || 0,
                  totalRounds: room.memeTotalRounds || 0,
                  phase: 'voting',
                  submissions: filteredSubmissions,
                });
              } else {
                sendToPlayer(player, {
                  type: 'meme:unsittingOut',
                  prompt: room.memePrompt || null,
                  round: room.memeRound || 0,
                  totalRounds: room.memeTotalRounds || 0,
                  phase: room.memePhase || 'selecting',
                });
              }
            }

            sendToHost(room, {
              type: 'meme:player:unsatOut',
              playerId: data.playerId,
            });
            break;
          }

          case 'meme:host:endGame': {
            const mapping = wsToRoom.get(ws);
            if (!mapping || !mapping.isHost) break;
            const room = rooms.get(mapping.roomCode);
            if (!room) break;

            room.memePhase = 'gameComplete';

            const leaderboard = Array.from(room.players.values())
              .map(p => ({
                playerId: p.id,
                playerName: p.name,
                playerAvatar: p.avatar,
                score: p.score,
              }))
              .sort((a, b) => b.score - a.score);

            const winner = leaderboard.length > 0 ? leaderboard[0] : null;

            room.players.forEach((player) => {
              if (player.ws && player.isConnected) {
                sendToPlayer(player, {
                  type: 'meme:gameComplete',
                  leaderboard,
                  winner,
                  myScore: player.score,
                });
              }
            });

            sendToHost(room, {
              type: 'meme:gameComplete',
              leaderboard,
              winner,
            });
            console.log(`[WebSocket] Meme No Harm game ended in room ${room.code}`);
            break;
          }

          default:
            console.warn(`[WebSocket] Unknown message type: ${data.type}`);
        }
      } catch (err) {
        console.error('[WebSocket] Error processing message:', err);
      }
    });

    ws.on('close', () => {
      const mapping = wsToRoom.get(ws);
      if (!mapping) return;

      const room = rooms.get(mapping.roomCode);
      if (!room) {
        wsToRoom.delete(ws);
        return;
      }

      if (mapping.isHost) {
        room.hostWs = null;
        // Notify players that host temporarily disconnected (will reconnect)
        room.players.forEach((player) => {
          if (player.ws && player.isConnected) {
            sendToPlayer(player, { type: 'host:disconnected' });
          }
        });
        console.log(`[WebSocket] Host disconnected from room ${room.code} (room preserved)`);
      } else if (mapping.playerId) {
        const player = room.players.get(mapping.playerId);
        if (player) {
          player.isConnected = false;
          // Remove from buzz queue if they were in it
          room.buzzQueue = room.buzzQueue.filter(b => b.playerId !== mapping.playerId);
          sendToHost(room, { type: 'player:disconnected', playerId: mapping.playerId });
          
          if (room.gameMode === 'sequence') {
            if (room.sequencePhase === 'playing' && !room.sequencePaused) {
              const connectedPlayers = Array.from(room.players.values()).filter(p => p.isConnected);
              const connectedPlayerIds = new Set(connectedPlayers.map(p => p.id));
              const submissionsFromConnected = (room.sequenceSubmissions || []).filter(s => connectedPlayerIds.has(s.playerId));
              if (submissionsFromConnected.length >= connectedPlayers.length && connectedPlayers.length > 0) {
                sendToHost(room, { type: 'sequence:allSubmitted' });
              }
            }
          }

          if (room.gameMode === 'meme') {
            if (room.memePhase === 'selecting') {
              const activePlayers = Array.from(room.players.values())
                .filter(p => p.isConnected && !room.memeSittingOut?.has(p.id));
              const activeSubmittedCount = activePlayers.filter(p => room.memeSubmissions?.has(p.id)).length;
              if (activeSubmittedCount >= activePlayers.length && activePlayers.length > 0) {
                sendToHost(room, { type: 'meme:allSubmitted' });
              }
            } else if (room.memePhase === 'voting') {
              const eligibleVoters = Array.from(room.players.values())
                .filter(p => p.isConnected && !room.memeSittingOut?.has(p.id) && room.memeSubmissions?.has(p.id));
              const activeVotedCount = eligibleVoters.filter(p => room.memeVotes?.has(p.id)).length;
              if (activeVotedCount >= eligibleVoters.length && eligibleVoters.length > 0) {
                sendToHost(room, { type: 'meme:allVoted' });
              }
            }
          }

          if (room.sessionId) {
            storage.updatePlayerConnection(room.sessionId, mapping.playerId, false).catch(err => {
              console.error('[WebSocket] Failed to update player connection:', err);
            });
          }
          console.log(`[WebSocket] Player ${player.name} disconnected from room ${room.code}`);
        }
      }

      wsToRoom.delete(ws);
    });
  });

  console.log('[WebSocket] Server initialized on /ws');
  // ==================== END WEBSOCKET SERVER ====================

  return httpServer;
}

function getWeekStartDate(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  const weekStart = new Date(now.setDate(diff));
  return weekStart.toISOString().split('T')[0];
}
