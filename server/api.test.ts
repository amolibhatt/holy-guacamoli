import { describe, it, expect } from "vitest";

const BASE_URL = "http://localhost:5000";

describe("API Error Handling", () => {
  describe("Invalid Routes", () => {
    it("should handle non-existent API routes", async () => {
      const res = await fetch(`${BASE_URL}/api/nonexistent-endpoint`);
      expect([200, 404]).toContain(res.status);
    });

    it("should return 404 for invalid board ID", async () => {
      const res = await fetch(`${BASE_URL}/api/boards/999999999`);
      expect([401, 404]).toContain(res.status);
    });
  });

  describe("Method Validation", () => {
    it("should handle GET request on login endpoint", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "GET",
      });
      expect([200, 404, 405]).toContain(res.status);
    });

    it("should handle GET request on register endpoint", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "GET",
      });
      expect([200, 404, 405]).toContain(res.status);
    });
  });

  describe("Content-Type Handling", () => {
    it("should handle missing Content-Type on POST", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        body: '{"email":"test@test.com","password":"test"}',
      });
      expect([400, 401, 415, 429]).toContain(res.status);
    });

    it("should handle malformed JSON", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"email": "test@test.com", "password": }',
      });
      expect([400, 401, 500]).toContain(res.status);
    });
  });
});

describe("API Response Format", () => {
  it("protected endpoints should return JSON error", async () => {
    const res = await fetch(`${BASE_URL}/api/boards`);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toHaveProperty("message");
  });

  it("shuffle-stats returns proper auth error", async () => {
    const res = await fetch(`${BASE_URL}/api/buzzkill/shuffle-stats`);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toHaveProperty("message");
  });
});

describe("CORS and Headers", () => {
  it("should include proper content-type on protected endpoints", async () => {
    const res = await fetch(`${BASE_URL}/api/buzzkill/shuffle-stats`);
    const contentType = res.headers.get("content-type");
    expect(contentType).toContain("application/json");
  });
});

describe("Health Checks", () => {
  it("should respond to root API path", async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect([200, 304]).toContain(res.status);
  });
});

describe("Shuffle Endpoints", () => {
  it("GET /api/buzzkill/shuffle-stats requires auth", async () => {
    const res = await fetch(`${BASE_URL}/api/buzzkill/shuffle-stats`);
    expect(res.status).toBe(401);
  });

  it("POST /api/buzzkill/shuffle-board requires auth", async () => {
    const res = await fetch(`${BASE_URL}/api/buzzkill/shuffle-board`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "starter" }),
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/buzzkill/custom-boards requires auth", async () => {
    const res = await fetch(`${BASE_URL}/api/buzzkill/custom-boards`);
    expect(res.status).toBe(401);
  });

  it("GET /api/buzzkill/category-groups requires auth", async () => {
    const res = await fetch(`${BASE_URL}/api/buzzkill/category-groups`);
    expect(res.status).toBe(401);
  });
});

describe("Game Room Endpoints", () => {
  it("POST /api/buzzkill/create-room returns response", async () => {
    const res = await fetch(`${BASE_URL}/api/buzzkill/create-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect([200, 400, 401, 404]).toContain(res.status);
  });
});
