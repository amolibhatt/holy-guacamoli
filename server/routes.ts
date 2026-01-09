import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { setupWebSocket, getRoomInfo } from "./gameRoom";

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
  
  setupWebSocket(httpServer);

  app.get("/api/room/:code", (req, res) => {
    const info = getRoomInfo(req.params.code.toUpperCase());
    if (!info) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json(info);
  });

  // Board routes
  app.get("/api/boards", async (req, res) => {
    const boards = await storage.getBoards();
    res.json(boards);
  });

  app.get("/api/boards/:id", async (req, res) => {
    const board = await storage.getBoard(Number(req.params.id));
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }
    res.json(board);
  });

  app.post("/api/boards", async (req, res) => {
    try {
      const { name, description, pointValues } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      const board = await storage.createBoard({
        name,
        description: description || null,
        pointValues: pointValues || [10, 20, 30, 40, 50],
      });
      res.status(201).json(board);
    } catch (err) {
      console.error("Error creating board:", err);
      res.status(500).json({ message: "Failed to create board" });
    }
  });

  app.put("/api/boards/:id", async (req, res) => {
    try {
      const { name, description, pointValues } = req.body;
      const board = await storage.updateBoard(Number(req.params.id), {
        name,
        description,
        pointValues,
      });
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.json(board);
    } catch (err) {
      console.error("Error updating board:", err);
      res.status(500).json({ message: "Failed to update board" });
    }
  });

  app.delete("/api/boards/:id", async (req, res) => {
    const deleted = await storage.deleteBoard(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Board not found" });
    }
    res.json({ success: true });
  });

  app.get("/api/boards/:id/categories", async (req, res) => {
    const categories = await storage.getCategoriesByBoard(Number(req.params.id));
    res.json(categories);
  });

  app.get(api.categories.list.path, async (req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.get(api.categories.get.path, async (req, res) => {
    const category = await storage.getCategory(Number(req.params.id));
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  });

  app.get(api.questions.listByCategory.path, async (req, res) => {
    const questions = await storage.getQuestionsByCategory(Number(req.params.categoryId));
    // Include correct answer for host mode
    res.json(questions);
  });

  app.post(api.questions.verifyAnswer.path, async (req, res) => {
    try {
      const { answer } = api.questions.verifyAnswer.input.parse(req.body);
      const question = await storage.getQuestion(Number(req.params.id));
      
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
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

  app.post(api.categories.create.path, async (req, res) => {
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

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const { name, description, imageUrl, boardId } = req.body;
      const category = await storage.updateCategory(Number(req.params.id), {
        name,
        description,
        imageUrl,
        boardId,
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

  app.delete(api.categories.delete.path, async (req, res) => {
    const deleted = await storage.deleteCategory(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ success: true });
  });

  app.post(api.questions.create.path, async (req, res) => {
    try {
      const data = api.questions.create.input.parse(req.body);
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

  app.put(api.questions.update.path, async (req, res) => {
    try {
      const data = api.questions.update.input.parse(req.body);
      const question = await storage.updateQuestion(Number(req.params.id), data);
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }
      res.json(question);
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

  app.delete(api.questions.delete.path, async (req, res) => {
    const deleted = await storage.deleteQuestion(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json({ success: true });
  });

  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  });

  app.use('/uploads', (await import('express')).default.static(uploadDir));

  // Seed data if empty
  const existingCategories = await storage.getCategories();
  if (existingCategories.length === 0) {
    const sciCat = await storage.createCategory({
      name: "Science",
      description: "Test your knowledge of the natural world",
      imageUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80",
    });

    const histCat = await storage.createCategory({
      name: "History",
      description: "Dive into the past events",
      imageUrl: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=800&q=80",
    });

    const techCat = await storage.createCategory({
      name: "Technology",
      description: "From bits to bytes",
      imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    });

    // Science Questions
    await storage.createQuestion({
      categoryId: sciCat.id,
      question: "What is the chemical symbol for Gold?",
      options: ["Au", "Ag", "Fe", "Cu"],
      correctAnswer: "Au",
      points: 10,
    });
    await storage.createQuestion({
      categoryId: sciCat.id,
      question: "Which planet is known as the Red Planet?",
      options: ["Mars", "Jupiter", "Venus", "Saturn"],
      correctAnswer: "Mars",
      points: 20,
    });
    await storage.createQuestion({
      categoryId: sciCat.id,
      question: "What is the powerhouse of the cell?",
      options: ["Mitochondria", "Nucleus", "Ribosome", "Golgi apparatus"],
      correctAnswer: "Mitochondria",
      points: 30,
    });

    // History Questions
    await storage.createQuestion({
      categoryId: histCat.id,
      question: "In which year did World War II end?",
      options: ["1945", "1939", "1918", "1955"],
      correctAnswer: "1945",
      points: 20,
    });
    await storage.createQuestion({
      categoryId: histCat.id,
      question: "Who was the first President of the United States?",
      options: ["George Washington", "Thomas Jefferson", "Abraham Lincoln", "John Adams"],
      correctAnswer: "George Washington",
      points: 10,
    });

    // Tech Questions
    await storage.createQuestion({
      categoryId: techCat.id,
      question: "What does CPU stand for?",
      options: ["Central Processing Unit", "Central Process Unit", "Computer Personal Unit", "Central Processor Unit"],
      correctAnswer: "Central Processing Unit",
      points: 10,
    });
    await storage.createQuestion({
      categoryId: techCat.id,
      question: "Which company developed the JavaScript language?",
      options: ["Netscape", "Microsoft", "Sun Microsystems", "Oracle"],
      correctAnswer: "Netscape",
      points: 50,
    });
  }

  return httpServer;
}
