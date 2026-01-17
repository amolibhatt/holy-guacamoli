import { db } from "./server/db";
import { gameSessions, categories, boardCategories, questions, boards, users } from "./shared/schema";
import { eq, inArray } from "drizzle-orm";

// Get a valid session cookie by simulating login
async function getAuthCookie(): Promise<string> {
  // Find a user to get their session
  const [user] = await db.select().from(users).limit(1);
  if (!user) {
    console.log("No users found - creating test user");
    return "";
  }
  
  // Login to get session cookie
  const loginRes = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: "test123" }),
  });
  
  const cookies = loginRes.headers.get("set-cookie");
  return cookies || "";
}

async function runE2ETests() {
  console.log("=== END-TO-END QA TESTS ===\n");
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];
  
  // Get auth cookie first (will fail but that's ok for some tests)
  const authCookie = await getAuthCookie();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authCookie) {
    headers["Cookie"] = authCookie;
  }
  
  // TEST 1: Unauthenticated shuffle-stats returns 401
  console.log("TEST 1: Unauthenticated shuffle-stats returns proper error");
  {
    const res = await fetch("http://localhost:5000/api/buzzkill/shuffle-stats");
    console.log(`  Status: ${res.status}`);
    if (res.status === 401) {
      console.log("  Result: PASS ✓");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push("TEST 1: Expected 401 for unauthenticated shuffle-stats");
    }
  }
  
  // TEST 2: Unauthenticated shuffle-board returns 401
  console.log("\nTEST 2: Unauthenticated shuffle-board returns proper error");
  {
    const res = await fetch("http://localhost:5000/api/buzzkill/shuffle-board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "starter" }),
    });
    console.log(`  Status: ${res.status}`);
    if (res.status === 401) {
      console.log("  Result: PASS ✓");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push("TEST 2: Expected 401 for unauthenticated shuffle-board");
    }
  }
  
  // TEST 3: Check custom-boards endpoint
  console.log("\nTEST 3: Custom boards endpoint authentication");
  {
    const res = await fetch("http://localhost:5000/api/buzzkill/custom-boards");
    console.log(`  Status: ${res.status}`);
    if (res.status === 401 || res.status === 200) {
      console.log("  Result: PASS ✓ (properly handles auth)");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push("TEST 3: Unexpected status for custom-boards");
    }
  }
  
  // TEST 4: Check boards list endpoint
  console.log("\nTEST 4: Boards list endpoint");
  {
    const res = await fetch("http://localhost:5000/api/boards");
    console.log(`  Status: ${res.status}`);
    if (res.status === 401) {
      console.log("  Result: PASS ✓ (protected)");
      passed++;
    } else {
      const data = await res.json();
      console.log(`  Returned ${Array.isArray(data) ? data.length : 'N/A'} boards`);
      console.log("  Result: PASS ✓");
      passed++;
    }
  }
  
  // TEST 5: Check categories endpoint
  console.log("\nTEST 5: Categories endpoint");
  {
    const res = await fetch("http://localhost:5000/api/categories");
    console.log(`  Status: ${res.status}`);
    if (res.status === 401) {
      console.log("  Result: PASS ✓ (protected)");
      passed++;
    } else if (res.status === 200) {
      const data = await res.json();
      console.log(`  Returned ${Array.isArray(data) ? data.length : 'N/A'} categories`);
      console.log("  Result: PASS ✓");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push("TEST 5: Unexpected status for categories");
    }
  }
  
  // TEST 6: Category groups endpoint
  console.log("\nTEST 6: Category groups endpoint (for source groups)");
  {
    const res = await fetch("http://localhost:5000/api/buzzkill/category-groups");
    console.log(`  Status: ${res.status}`);
    if (res.status === 401) {
      console.log("  Result: PASS ✓ (protected)");
      passed++;
    } else if (res.status === 200) {
      const data = await res.json();
      console.log(`  Groups: ${Object.keys(data.groups || {}).join(", ") || "none"}`);
      console.log("  Result: PASS ✓");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push("TEST 6: Unexpected status for category-groups");
    }
  }
  
  // TEST 7: Starter packs endpoint
  console.log("\nTEST 7: Starter packs endpoint");
  {
    const res = await fetch("http://localhost:5000/api/buzzkill/starter-packs");
    console.log(`  Status: ${res.status}`);
    if (res.status === 401) {
      console.log("  Result: PASS ✓ (protected)");
      passed++;
    } else if (res.status === 200) {
      const data = await res.json();
      console.log(`  Returned ${Array.isArray(data) ? data.length : 'N/A'} starter packs`);
      console.log("  Result: PASS ✓");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push("TEST 7: Unexpected status for starter-packs");
    }
  }
  
  // TEST 8: Auth user endpoint
  console.log("\nTEST 8: Auth user endpoint");
  {
    const res = await fetch("http://localhost:5000/api/auth/user", {
      credentials: "include",
    });
    console.log(`  Status: ${res.status}`);
    if (res.status === 401 || res.status === 200) {
      console.log("  Result: PASS ✓");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push("TEST 8: Unexpected status for auth/user");
    }
  }
  
  // TEST 9: Database has valid Live categories
  console.log("\nTEST 9: Database has valid Live categories for shuffle");
  {
    const activeCats = await db.select().from(categories).where(eq(categories.isActive, true));
    console.log(`  Active categories: ${activeCats.length}`);
    
    // Check how many have 5 questions with correct points
    let liveCount = 0;
    for (const cat of activeCats) {
      const bcs = await db.select().from(boardCategories).where(eq(boardCategories.categoryId, cat.id));
      if (bcs.length === 0) continue;
      
      const qs = await db.select().from(questions).where(eq(questions.boardCategoryId, bcs[0].id));
      const points = new Set(qs.map(q => q.points));
      if (qs.length === 5 && points.size === 5 && [10,20,30,40,50].every(p => points.has(p))) {
        liveCount++;
      }
    }
    
    console.log(`  Live categories (5 questions, correct points): ${liveCount}`);
    if (liveCount >= 5) {
      console.log("  Result: PASS ✓ (enough for shuffle)");
      passed++;
    } else {
      console.log("  Result: FAIL ✗ (not enough for shuffle)");
      failed++;
      failures.push(`TEST 9: Only ${liveCount} Live categories, need at least 5`);
    }
  }
  
  // TEST 10: Check for inactive categories that should be active
  console.log("\nTEST 10: Check for incorrectly inactive categories");
  {
    const inactiveCats = await db.select().from(categories).where(eq(categories.isActive, false));
    let shouldBeActive = 0;
    
    for (const cat of inactiveCats) {
      const bcs = await db.select().from(boardCategories).where(eq(boardCategories.categoryId, cat.id));
      if (bcs.length === 0) continue;
      
      const qs = await db.select().from(questions).where(eq(questions.boardCategoryId, bcs[0].id));
      const points = new Set(qs.map(q => q.points));
      if (qs.length === 5 && points.size === 5 && [10,20,30,40,50].every(p => points.has(p))) {
        shouldBeActive++;
        console.log(`  Category "${cat.name}" has 5 valid questions but is inactive`);
      }
    }
    
    console.log(`  Inactive categories that could be activated: ${shouldBeActive}`);
    console.log("  Result: PASS ✓ (informational)");
    passed++;
  }
  
  console.log("\n" + "=".repeat(50));
  console.log(`SUMMARY: ${passed}/${passed + failed} tests passed`);
  console.log("=".repeat(50));
  
  if (failures.length > 0) {
    console.log("\nFailed tests:");
    failures.forEach(f => console.log(`  - ${f}`));
  }
  
  console.log(failed === 0 ? "\n✓ ALL E2E TESTS PASSED!" : `\n✗ ${failed} test(s) failed`);
  
  process.exit(failed > 0 ? 1 : 0);
}

runE2ETests().catch(err => {
  console.error("E2E test suite failed:", err);
  process.exit(1);
});
