import { describe, it, expect } from "vitest";

const BASE_URL = "http://localhost:5000";

describe("Authentication System", () => {
  describe("Login Endpoint", () => {
    it("should handle empty credentials", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect([400, 401, 429]).toContain(res.status);
    });

    it("should handle missing email", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "test123" }),
      });
      expect([400, 401, 429]).toContain(res.status);
    });

    it("should handle missing password", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      });
      expect([400, 401, 429]).toContain(res.status);
    });

    it("should handle invalid email format", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email", password: "test123" }),
      });
      expect([400, 401, 429]).toContain(res.status);
    });

    it("should reject non-existent user", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: `nonexistent-${Date.now()}@example.com`, 
          password: "test123" 
        }),
      });
      expect([400, 401, 429]).toContain(res.status);
    });

    it("should return JSON response", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "wrong" }),
      });
      const contentType = res.headers.get("content-type");
      expect(contentType).toContain("application/json");
    });
  });

  describe("Register Endpoint", () => {
    it("should reject empty registration", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect([400, 401, 422]).toContain(res.status);
    });

    it("should reject weak passwords", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: `test-${Date.now()}@example.com`, 
          password: "123" 
        }),
      });
      expect([400, 422]).toContain(res.status);
    });
  });

  describe("User Session", () => {
    it("should return 401 for unauthenticated /api/auth/user", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/user`);
      expect(res.status).toBe(401);
    });

    it("should handle logout without session", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
      });
      expect([200, 401]).toContain(res.status);
    });
  });
});
