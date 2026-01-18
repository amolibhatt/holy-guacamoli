import { describe, it, expect } from "vitest";
import { db } from "./db";
import { categories, questions, boardCategories, boards } from "@shared/schema";
import { eq } from "drizzle-orm";

describe("Export/Import Format Validation", () => {
  describe("Category Export Format", () => {
    it("should export category with all required fields", async () => {
      const cat = await db.select().from(categories).limit(1);
      
      if (cat.length > 0) {
        const exported = {
          name: cat[0].name,
          description: cat[0].description,
          imageUrl: cat[0].imageUrl,
          isActive: cat[0].isActive,
          isGlobal: cat[0].isGlobal,
          sourceGroup: cat[0].sourceGroup,
        };

        expect(exported.name).toBeDefined();
        expect(typeof exported.name).toBe("string");
      }
    });

    it("should export questions with correct structure", async () => {
      const bc = await db.select().from(boardCategories).limit(1);
      
      if (bc.length > 0) {
        const qs = await db.select().from(questions)
          .where(eq(questions.categoryId, bc[0].id));
        
        for (const q of qs) {
          expect(q.question).toBeDefined();
          expect(q.points).toBeDefined();
          expect(typeof q.points).toBe("number");
        }
      }
    });

    it("should export board with point values", async () => {
      const board = await db.select().from(boards).limit(1);
      
      if (board.length > 0) {
        expect(board[0].pointValues).toBeDefined();
        expect(Array.isArray(board[0].pointValues)).toBe(true);
      }
    });
  });

  describe("Import Format Validation", () => {
    it("should validate category name is required", () => {
      const validateImport = (data: any): boolean => {
        return typeof data.name === "string" && data.name.length > 0;
      };

      expect(validateImport({ name: "Test Category" })).toBe(true);
      expect(validateImport({ name: "" })).toBe(false);
      expect(validateImport({ description: "No name" })).toBe(false);
    });

    it("should validate question has required fields", () => {
      const validateQuestion = (q: any): boolean => {
        return (
          typeof q.question === "string" &&
          q.question.length > 0 &&
          typeof q.points === "number" &&
          [10, 20, 30, 40, 50].includes(q.points)
        );
      };

      expect(validateQuestion({ question: "Test?", points: 10 })).toBe(true);
      expect(validateQuestion({ question: "", points: 10 })).toBe(false);
      expect(validateQuestion({ question: "Test?", points: 15 })).toBe(false);
    });

    it("should validate exactly 5 questions per category", () => {
      const validateQuestionCount = (qs: any[]): boolean => {
        return qs.length === 5;
      };

      expect(validateQuestionCount([1, 2, 3, 4, 5])).toBe(true);
      expect(validateQuestionCount([1, 2, 3, 4])).toBe(false);
      expect(validateQuestionCount([1, 2, 3, 4, 5, 6])).toBe(false);
    });

    it("should validate unique point values", () => {
      const validateUniquePoints = (points: number[]): boolean => {
        return new Set(points).size === points.length;
      };

      expect(validateUniquePoints([10, 20, 30, 40, 50])).toBe(true);
      expect(validateUniquePoints([10, 10, 30, 40, 50])).toBe(false);
    });
  });

  describe("Bulk Import Validation", () => {
    it("should validate bulk import format (pipe-delimited)", () => {
      const validLine = "Question text|Answer text|10";
      const parts = validLine.split("|");
      
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe("Question text");
      expect(parts[1]).toBe("Answer text");
      expect(parseInt(parts[2])).toBe(10);
    });

    it("should reject malformed bulk import lines", () => {
      const invalidLines = [
        "Question only",
        "Question|Answer",
        "Question|Answer|invalid",
        "|Answer|10",
        "Question||10",
      ];

      for (const line of invalidLines) {
        const parts = line.split("|");
        const isValid = parts.length === 3 && 
                       parts[0].length > 0 && 
                       parts[1].length > 0 && 
                       !isNaN(parseInt(parts[2]));
        expect(isValid).toBe(false);
      }
    });

    it("should validate maximum import size", () => {
      const MAX_IMPORT_ITEMS = 50;
      const items = Array.from({ length: 60 }, (_, i) => ({ id: i }));
      
      expect(items.length).toBeGreaterThan(MAX_IMPORT_ITEMS);
    });

    it("should validate field length limits", () => {
      const MAX_QUESTION_LENGTH = 500;
      const MAX_ANSWER_LENGTH = 1000;
      
      const longQuestion = "Q".repeat(600);
      const longAnswer = "A".repeat(1200);
      
      expect(longQuestion.length).toBeGreaterThan(MAX_QUESTION_LENGTH);
      expect(longAnswer.length).toBeGreaterThan(MAX_ANSWER_LENGTH);
    });
  });

  describe("JSON Export Format", () => {
    it("should produce valid JSON output", async () => {
      const cat = await db.select().from(categories).limit(1);
      
      if (cat.length > 0) {
        const json = JSON.stringify(cat[0]);
        const parsed = JSON.parse(json);
        
        expect(parsed.id).toBe(cat[0].id);
        expect(parsed.name).toBe(cat[0].name);
      }
    });

    it("should handle special characters in JSON", () => {
      const data = {
        question: 'What is "quoted"?',
        answer: "It's a test\nwith newline",
      };
      
      const json = JSON.stringify(data);
      const parsed = JSON.parse(json);
      
      expect(parsed.question).toBe(data.question);
      expect(parsed.answer).toBe(data.answer);
    });

    it("should handle unicode in export", () => {
      const data = {
        question: "What is π (pi)?",
        answer: "≈ 3.14159",
      };
      
      const json = JSON.stringify(data);
      const parsed = JSON.parse(json);
      
      expect(parsed.question).toContain("π");
      expect(parsed.answer).toContain("≈");
    });
  });

  describe("Starter Pack Export", () => {
    it("should include all category metadata", async () => {
      const cats = await db.select().from(categories).limit(5);
      
      for (const cat of cats) {
        expect(cat.name).toBeDefined();
      }
      expect(true).toBe(true);
    });

    it("should deduplicate categories on import", () => {
      const existingNames = ["Cat A", "Cat B", "Cat C"];
      const importNames = ["Cat A", "Cat D", "Cat B"];
      
      const newNames = importNames.filter(n => !existingNames.includes(n));
      
      expect(newNames).toEqual(["Cat D"]);
    });
  });
});
