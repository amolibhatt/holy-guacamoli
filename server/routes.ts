import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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
