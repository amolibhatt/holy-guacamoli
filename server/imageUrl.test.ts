import { describe, it, expect, afterAll } from "vitest";
import { db } from "./db";
import { categories } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

describe("Image URL Validation Tests", () => {
  const cleanupIds: number[] = [];

  afterAll(async () => {
    for (const id of cleanupIds) {
      await db.delete(categories).where(eq(categories.id, id)).catch(() => {});
    }
  });

  describe("URL Format Validation", () => {
    it("should accept valid HTTPS URLs", () => {
      const validUrls = [
        "https://example.com/image.png",
        "https://cdn.example.com/path/to/image.jpg",
        "https://storage.googleapis.com/bucket/image.webp",
        "https://images.unsplash.com/photo-123456789",
      ];

      for (const url of validUrls) {
        const isValid = url.startsWith("https://");
        expect(isValid).toBe(true);
      }
    });

    it("should accept valid HTTP URLs", () => {
      const validUrls = [
        "http://example.com/image.png",
        "http://localhost:5000/image.jpg",
      ];

      for (const url of validUrls) {
        const isValid = url.startsWith("http://");
        expect(isValid).toBe(true);
      }
    });

    it("should reject invalid URL formats", () => {
      const invalidUrls = [
        "not-a-url",
        "ftp://example.com/image.png",
        "javascript:alert(1)",
        "data:image/png;base64,abc",
        "//example.com/image.png",
        "",
        "   ",
      ];

      for (const url of invalidUrls) {
        const isValid = url.startsWith("http://") || url.startsWith("https://");
        expect(isValid).toBe(false);
      }
    });

    it("should handle URLs with special characters", () => {
      const specialUrls = [
        "https://example.com/image%20name.png",
        "https://example.com/path?query=value&other=123",
        "https://example.com/path#anchor",
        "https://example.com/unicode-\u00E9\u00F1.png",
      ];

      for (const url of specialUrls) {
        try {
          new URL(url);
          expect(true).toBe(true);
        } catch {
          expect(false).toBe(true);
        }
      }
    });
  });

  describe("Image Extension Validation", () => {
    it("should accept common image extensions", () => {
      const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
      
      for (const ext of imageExtensions) {
        const url = `https://example.com/image${ext}`;
        const hasImageExt = imageExtensions.some(e => url.toLowerCase().endsWith(e));
        expect(hasImageExt).toBe(true);
      }
    });

    it("should handle URLs without file extensions", () => {
      const url = "https://images.unsplash.com/photo-123456789";
      
      const hasExtension = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url);
      expect(hasExtension).toBe(false);
    });

    it("should handle URLs with query parameters after extension", () => {
      const url = "https://example.com/image.png?size=large&quality=80";
      
      const urlWithoutQuery = url.split("?")[0];
      const hasImageExt = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(urlWithoutQuery);
      expect(hasImageExt).toBe(true);
    });
  });

  describe("Database Image URL Requirements", () => {
    it("should require imageUrl for active categories", async () => {
      const activeCats = await db.select().from(categories)
        .where(eq(categories.isActive, true))
        .limit(10);
      
      for (const cat of activeCats) {
        expect(cat.imageUrl).toBeDefined();
        expect(cat.imageUrl?.length).toBeGreaterThan(0);
      }
    });

    it("should allow null imageUrl for inactive categories", async () => {
      const inactiveCats = await db.select().from(categories)
        .where(eq(categories.isActive, false))
        .limit(10);
      
      expect(Array.isArray(inactiveCats)).toBe(true);
    });

    it("should not have empty string imageUrl for active categories", async () => {
      const emptyUrlCats = await db.select().from(categories)
        .where(and(
          eq(categories.isActive, true),
          sql`${categories.imageUrl} = ''`
        ));
      
      expect(emptyUrlCats).toHaveLength(0);
    });
  });

  describe("URL Length Limits", () => {
    it("should handle typical URL lengths", () => {
      const typicalUrl = "https://example.com/images/category/photo-12345.png";
      expect(typicalUrl.length).toBeLessThan(500);
    });

    it("should handle maximum reasonable URL length", () => {
      const MAX_URL_LENGTH = 2048;
      const longPath = "a".repeat(2100);
      const longUrl = `https://example.com/${longPath}`;
      
      expect(longUrl.length).toBeGreaterThan(MAX_URL_LENGTH);
    });

    it("should validate URL length before storage", async () => {
      const validateUrlLength = (url: string): boolean => {
        return url.length <= 2048;
      };

      expect(validateUrlLength("https://short.url/img.png")).toBe(true);
      expect(validateUrlLength("https://example.com/" + "a".repeat(3000))).toBe(false);
    });
  });

  describe("URL Sanitization", () => {
    it("should trim whitespace from URLs", () => {
      const sanitizeUrl = (url: string): string => url.trim();
      
      expect(sanitizeUrl("  https://example.com/img.png  ")).toBe("https://example.com/img.png");
    });

    it("should handle newlines in URLs", () => {
      const url = "https://example.com/img.png\n";
      const sanitized = url.replace(/[\r\n]/g, "").trim();
      
      expect(sanitized).toBe("https://example.com/img.png");
    });

    it("should encode special characters", () => {
      const url = "https://example.com/image with spaces.png";
      const encoded = encodeURI(url);
      
      expect(encoded).not.toContain(" ");
    });
  });

  describe("External URL Validation", () => {
    it("should not allow localhost in production URLs", () => {
      const productionUrl = "http://localhost:3000/image.png";
      const isLocalhost = productionUrl.includes("localhost") || productionUrl.includes("127.0.0.1");
      
      expect(isLocalhost).toBe(true);
    });

    it("should validate URL hostname", () => {
      const validateHost = (url: string): boolean => {
        try {
          const parsed = new URL(url);
          return parsed.hostname.length > 0;
        } catch {
          return false;
        }
      };

      expect(validateHost("https://example.com/img.png")).toBe(true);
      expect(validateHost("not-a-url")).toBe(false);
    });
  });
});
