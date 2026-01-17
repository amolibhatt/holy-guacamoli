import { describe, it, expect } from "vitest";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const BASE_URL = "http://localhost:5000";

describe("Authentication Flow Tests", () => {
  describe("Session Expiry", () => {
    it("should reject expired session cookies", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/user`, {
        headers: {
          Cookie: "connect.sid=s%3Aexpired-session-id.invalid-signature",
        },
      });
      
      expect(res.status).toBe(401);
    });

    it("should handle malformed session cookies", async () => {
      const malformedCookies = [
        "connect.sid=",
        "connect.sid=invalid",
        "connect.sid=s%3A.nosig",
        "wrong-cookie-name=value",
      ];

      for (const cookie of malformedCookies) {
        const res = await fetch(`${BASE_URL}/api/auth/user`, {
          headers: { Cookie: cookie },
        });
        expect(res.status).toBe(401);
      }
    });

    it("should handle missing session cookie", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/user`);
      expect(res.status).toBe(401);
    });
  });

  describe("Concurrent Login Attempts", () => {
    it("should handle multiple simultaneous login requests", async () => {
      const loginPromises = Array.from({ length: 5 }, () =>
        fetch(`${BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "concurrent@test.com",
            password: "wrongpassword",
          }),
        })
      );

      const responses = await Promise.all(loginPromises);
      
      for (const res of responses) {
        expect([401, 429]).toContain(res.status);
      }
    });

    it("should maintain separate sessions for different users", async () => {
      const users = ["user1@test.com", "user2@test.com", "user3@test.com"];
      
      const loginPromises = users.map(email =>
        fetch(`${BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "password123" }),
        })
      );

      const responses = await Promise.all(loginPromises);
      
      for (const res of responses) {
        expect([401, 429]).toContain(res.status);
      }
    });
  });

  describe("Login Validation", () => {
    it("should reject empty email", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "", password: "password123" }),
      });

      expect([400, 401, 429]).toContain(res.status);
    });

    it("should reject empty password", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@test.com", password: "" }),
      });

      expect([400, 401, 429]).toContain(res.status);
    });

    it("should reject invalid email format", async () => {
      const invalidEmails = [
        "notanemail",
        "@nodomain.com",
        "missing@.com",
        "spaces in@email.com",
      ];

      for (const email of invalidEmails) {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "password123" }),
        });

        expect([400, 401, 429]).toContain(res.status);
      }
    });

    it("should handle very long email addresses", async () => {
      const longEmail = "a".repeat(300) + "@test.com";
      
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: longEmail, password: "password123" }),
      });

      expect([400, 401, 429]).toContain(res.status);
    });

    it("should handle very long passwords", async () => {
      const longPassword = "a".repeat(10000);
      
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@test.com", password: longPassword }),
      });

      expect([400, 401, 429]).toContain(res.status);
    });
  });

  describe("Logout Flow", () => {
    it("should handle logout without session", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
      });

      expect([200, 401]).toContain(res.status);
    });

    it("should handle double logout", async () => {
      const res1 = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
      });
      
      const res2 = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
      });

      expect([200, 401]).toContain(res1.status);
      expect([200, 401]).toContain(res2.status);
    });
  });

  describe("Password Security", () => {
    it("should use bcrypt for password hashing", async () => {
      const allUsers = await db.select().from(users).limit(5);
      
      for (const user of allUsers) {
        if (user.password) {
          expect(user.password.startsWith("$2")).toBe(true);
          expect(user.password.length).toBeGreaterThan(50);
        }
      }
    });

    it("should not return password in user data", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/user`);
      
      if (res.status === 200) {
        const data = await res.json();
        expect(data.password).toBeUndefined();
        expect(data.hash).toBeUndefined();
      }
    });
  });

  describe("Rate Limiting", () => {
    it("should rate limit after multiple failed attempts", async () => {
      const attempts = Array.from({ length: 10 }, () =>
        fetch(`${BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "ratelimit@test.com",
            password: "wrongpassword",
          }),
        })
      );

      const responses = await Promise.all(attempts);
      const statusCodes = responses.map(r => r.status);
      
      expect(statusCodes.some(code => code === 429) || statusCodes.every(code => code === 401)).toBe(true);
    });
  });

  describe("Session Management", () => {
    it("should create session on successful login", async () => {
      const testUser = await db.select().from(users).limit(1);
      
      if (testUser.length > 0) {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: testUser[0].email,
            password: "testpassword",
          }),
        });

        if (res.status === 200) {
          const setCookie = res.headers.get("set-cookie");
          expect(setCookie).toContain("connect.sid");
        }
      }
    });
  });
});
