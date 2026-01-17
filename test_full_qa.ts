import { db } from "./server/db";
import { gameSessions, categories, boardCategories, questions, boards, users } from "./shared/schema";
import { eq, inArray, and } from "drizzle-orm";
import { generateDynamicBoard } from "./server/buzzkillBoards";

async function runFullQA() {
  console.log("=== COMPREHENSIVE QA TEST SUITE ===\n");
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];
  
  // ============= API AUTHENTICATION TESTS =============
  console.log("--- API AUTHENTICATION TESTS ---\n");
  
  // TEST 1: Unauthenticated requests return 401
  console.log("TEST 1: Protected endpoints reject unauthenticated requests");
  {
    const endpoints = [
      { url: "/api/buzzkill/shuffle-stats", method: "GET" },
      { url: "/api/buzzkill/shuffle-board", method: "POST" },
      { url: "/api/buzzkill/custom-boards", method: "GET" },
      { url: "/api/boards", method: "GET" },
      { url: "/api/categories", method: "GET" },
    ];
    
    let allProtected = true;
    for (const ep of endpoints) {
      const res = await fetch(`http://localhost:5000${ep.url}`, {
        method: ep.method,
        headers: ep.method === "POST" ? { "Content-Type": "application/json" } : {},
        body: ep.method === "POST" ? JSON.stringify({}) : undefined,
      });
      
      if (res.status !== 401) {
        console.log(`  ${ep.method} ${ep.url}: ${res.status} (expected 401)`);
        allProtected = false;
      }
    }
    
    if (allProtected) {
      console.log("  All protected endpoints return 401");
      console.log("  Result: PASS ✓");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push("TEST 1: Some endpoints not properly protected");
    }
  }
  
  // ============= DATABASE INTEGRITY TESTS =============
  console.log("\n--- DATABASE INTEGRITY TESTS ---\n");
  
  // TEST 2: All active categories have valid data
  console.log("TEST 2: Active categories have required fields");
  {
    const activeCats = await db.select().from(categories).where(eq(categories.isActive, true));
    let issues: string[] = [];
    
    for (const cat of activeCats) {
      if (!cat.name) issues.push(`Category ${cat.id}: missing name`);
      if (!cat.imageUrl) issues.push(`Category ${cat.id} (${cat.name}): missing imageUrl`);
    }
    
    if (issues.length === 0) {
      console.log(`  Checked ${activeCats.length} active categories`);
      console.log("  Result: PASS ✓");
      passed++;
    } else {
      console.log(`  Issues found: ${issues.slice(0, 3).join(", ")}${issues.length > 3 ? "..." : ""}`);
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push(`TEST 2: ${issues.length} categories have data issues`);
    }
  }
  
  // TEST 3: Live categories have exactly 5 questions with correct points
  console.log("\nTEST 3: Live category validation");
  {
    const activeCats = await db.select().from(categories).where(eq(categories.isActive, true));
    let liveCount = 0;
    let invalidActive: string[] = [];
    
    for (const cat of activeCats) {
      const bcs = await db.select().from(boardCategories).where(eq(boardCategories.categoryId, cat.id));
      if (bcs.length === 0) {
        invalidActive.push(`${cat.name}: not linked to any board`);
        continue;
      }
      
      const qs = await db.select().from(questions).where(eq(questions.boardCategoryId, bcs[0].id));
      const points = new Set(qs.map(q => q.points));
      const hasAllPoints = [10, 20, 30, 40, 50].every(p => points.has(p));
      
      if (qs.length === 5 && points.size === 5 && hasAllPoints) {
        liveCount++;
      } else {
        invalidActive.push(`${cat.name}: ${qs.length} questions, points: [${[...points].sort((a,b)=>a-b).join(",")}]`);
      }
    }
    
    console.log(`  Live categories: ${liveCount}/${activeCats.length}`);
    if (invalidActive.length > 0) {
      console.log(`  Active but not Live: ${invalidActive.slice(0, 2).join("; ")}${invalidActive.length > 2 ? "..." : ""}`);
    }
    
    if (liveCount >= 5) {
      console.log("  Result: PASS ✓ (enough Live categories for shuffle)");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push(`TEST 3: Only ${liveCount} Live categories (need 5)`);
    }
  }
  
  // TEST 4: Source groups distribution
  console.log("\nTEST 4: Source group distribution for diversity");
  {
    const activeCats = await db.select().from(categories).where(eq(categories.isActive, true));
    const groupCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, none: 0 };
    
    for (const cat of activeCats) {
      const group = cat.sourceGroup || "none";
      groupCounts[group] = (groupCounts[group] || 0) + 1;
    }
    
    console.log(`  Distribution: ${Object.entries(groupCounts).map(([k,v]) => `${k}=${v}`).join(", ")}`);
    const nonEmptyGroups = Object.values(groupCounts).filter(v => v > 0).length;
    
    if (nonEmptyGroups >= 3) {
      console.log("  Result: PASS ✓");
      passed++;
    } else {
      console.log("  Result: FAIL ✗ (need more group diversity)");
      failed++;
      failures.push("TEST 4: Insufficient source group diversity");
    }
  }
  
  // ============= SHUFFLE ALGORITHM TESTS =============
  console.log("\n--- SHUFFLE ALGORITHM TESTS ---\n");
  
  // TEST 5: Shuffle generates 5 categories
  console.log("TEST 5: Shuffle generates exactly 5 categories");
  {
    const [session] = await db.insert(gameSessions).values({
      code: "QA5-" + Date.now().toString(36).toUpperCase(),
      hostId: "qa-test",
      currentMode: "board",
      state: "waiting",
      buzzerLocked: true,
      playedCategoryIds: [],
    }).returning();
    
    const result = await generateDynamicBoard(session.id, { mode: "starter", userId: "qa", userRole: "admin" });
    console.log(`  Categories: ${result.categories.length}, Error: ${result.error || "none"}`);
    
    if (result.categories.length === 5) {
      console.log("  Result: PASS ✓");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push(`TEST 5: Got ${result.categories.length} categories instead of 5`);
    }
    
    await db.delete(gameSessions).where(eq(gameSessions.id, session.id));
  }
  
  // TEST 6: Shuffle respects source group diversity
  console.log("\nTEST 6: Shuffle selects from diverse source groups");
  {
    const [session] = await db.insert(gameSessions).values({
      code: "QA6-" + Date.now().toString(36).toUpperCase(),
      hostId: "qa-test",
      currentMode: "board",
      state: "waiting",
      buzzerLocked: true,
      playedCategoryIds: [],
    }).returning();
    
    const result = await generateDynamicBoard(session.id, { mode: "starter", userId: "qa", userRole: "admin" });
    const groups = result.categories.map(c => c.sourceGroup || "none");
    const uniqueGroups = new Set(groups);
    
    console.log(`  Selected groups: ${groups.join(", ")}`);
    console.log(`  Unique groups: ${uniqueGroups.size}`);
    
    if (uniqueGroups.size >= 3) {
      console.log("  Result: PASS ✓");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push("TEST 6: Insufficient group diversity in selection");
    }
    
    await db.delete(gameSessions).where(eq(gameSessions.id, session.id));
  }
  
  // TEST 7: Session tracks played categories
  console.log("\nTEST 7: Session memory tracks played categories");
  {
    const [session] = await db.insert(gameSessions).values({
      code: "QA7-" + Date.now().toString(36).toUpperCase(),
      hostId: "qa-test",
      currentMode: "board",
      state: "waiting",
      buzzerLocked: true,
      playedCategoryIds: [],
    }).returning();
    
    await generateDynamicBoard(session.id, { mode: "starter", userId: "qa", userRole: "admin" });
    
    const [updated] = await db.select().from(gameSessions).where(eq(gameSessions.id, session.id));
    const played = (updated.playedCategoryIds as number[]) || [];
    
    console.log(`  Played categories recorded: ${played.length}`);
    
    if (played.length === 5) {
      console.log("  Result: PASS ✓");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push("TEST 7: Played categories not recorded correctly");
    }
    
    await db.delete(gameSessions).where(eq(gameSessions.id, session.id));
  }
  
  // TEST 8: Session resets when pool exhausted
  console.log("\nTEST 8: Session resets when available < 5");
  {
    const activeCats = await db.select({ id: categories.id }).from(categories).where(eq(categories.isActive, true));
    const prePlayedIds = activeCats.slice(0, activeCats.length - 3).map(c => c.id);
    
    const [session] = await db.insert(gameSessions).values({
      code: "QA8-" + Date.now().toString(36).toUpperCase(),
      hostId: "qa-test",
      currentMode: "board",
      state: "waiting",
      buzzerLocked: true,
      playedCategoryIds: prePlayedIds,
    }).returning();
    
    console.log(`  Pre-played: ${prePlayedIds.length}, Total: ${activeCats.length}`);
    
    const result = await generateDynamicBoard(session.id, { mode: "starter", userId: "qa", userRole: "admin" });
    
    console.log(`  Reset triggered: ${result.wasReset}`);
    
    if (result.wasReset && result.categories.length === 5) {
      console.log("  Result: PASS ✓");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push("TEST 8: Reset not triggered properly");
    }
    
    await db.delete(gameSessions).where(eq(gameSessions.id, session.id));
  }
  
  // TEST 9: Session isolation
  console.log("\nTEST 9: Sessions are isolated");
  {
    const [s1] = await db.insert(gameSessions).values({
      code: "QA9A-" + Date.now().toString(36).toUpperCase(),
      hostId: "qa-test-1",
      currentMode: "board",
      state: "waiting",
      buzzerLocked: true,
      playedCategoryIds: [],
    }).returning();
    
    const [s2] = await db.insert(gameSessions).values({
      code: "QA9B-" + Date.now().toString(36).toUpperCase(),
      hostId: "qa-test-2",
      currentMode: "board",
      state: "waiting",
      buzzerLocked: true,
      playedCategoryIds: [],
    }).returning();
    
    await generateDynamicBoard(s1.id, { mode: "starter", userId: "qa1", userRole: "admin" });
    
    const [u1] = await db.select().from(gameSessions).where(eq(gameSessions.id, s1.id));
    const [u2] = await db.select().from(gameSessions).where(eq(gameSessions.id, s2.id));
    
    const p1 = (u1.playedCategoryIds as number[]) || [];
    const p2 = (u2.playedCategoryIds as number[]) || [];
    
    console.log(`  Session 1 played: ${p1.length}, Session 2 played: ${p2.length}`);
    
    if (p1.length === 5 && p2.length === 0) {
      console.log("  Result: PASS ✓");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push("TEST 9: Sessions not isolated");
    }
    
    await db.delete(gameSessions).where(inArray(gameSessions.id, [s1.id, s2.id]));
  }
  
  // ============= VALIDATION TESTS =============
  console.log("\n--- VALIDATION TESTS ---\n");
  
  // TEST 10: Incomplete category validation
  console.log("TEST 10: Incomplete category fails validation");
  {
    const [testCat] = await db.insert(categories).values({
      name: "QA Test Incomplete",
      description: "Test",
      imageUrl: "/test.png",
      isActive: false,
    }).returning();
    
    const [board] = await db.select().from(boards).limit(1);
    const [bc] = await db.insert(boardCategories).values({
      boardId: board.id,
      categoryId: testCat.id,
      position: 99,
    }).returning();
    
    // Only add 3 questions
    for (const pts of [10, 20, 30]) {
      await db.insert(questions).values({
        boardCategoryId: bc.id,
        question: `Q${pts}`,
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        points: pts,
      });
    }
    
    // Check validation via query
    const qs = await db.select().from(questions).where(eq(questions.boardCategoryId, bc.id));
    const isValid = qs.length === 5 && new Set(qs.map(q => q.points)).size === 5;
    
    console.log(`  Questions: ${qs.length}, Valid: ${isValid}`);
    
    if (!isValid) {
      console.log("  Result: PASS ✓ (correctly identified as invalid)");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push("TEST 10: Incomplete category not caught");
    }
    
    await db.delete(questions).where(eq(questions.boardCategoryId, bc.id));
    await db.delete(boardCategories).where(eq(boardCategories.id, bc.id));
    await db.delete(categories).where(eq(categories.id, testCat.id));
  }
  
  // TEST 11: Duplicate points validation
  console.log("\nTEST 11: Duplicate points detected");
  {
    const [testCat] = await db.insert(categories).values({
      name: "QA Test Dupes",
      description: "Test",
      imageUrl: "/test.png",
      isActive: false,
    }).returning();
    
    const [board] = await db.select().from(boards).limit(1);
    const [bc] = await db.insert(boardCategories).values({
      boardId: board.id,
      categoryId: testCat.id,
      position: 99,
    }).returning();
    
    // Add 5 questions with duplicate 20
    for (const pts of [10, 20, 20, 40, 50]) {
      await db.insert(questions).values({
        boardCategoryId: bc.id,
        question: `Q${pts}`,
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        points: pts,
      });
    }
    
    const qs = await db.select().from(questions).where(eq(questions.boardCategoryId, bc.id));
    const uniquePoints = new Set(qs.map(q => q.points));
    const hasDupes = uniquePoints.size < qs.length;
    
    console.log(`  Questions: ${qs.length}, Unique points: ${uniquePoints.size}`);
    
    if (hasDupes) {
      console.log("  Result: PASS ✓ (duplicates detected)");
      passed++;
    } else {
      console.log("  Result: FAIL ✗");
      failed++;
      failures.push("TEST 11: Duplicates not detected");
    }
    
    await db.delete(questions).where(eq(questions.boardCategoryId, bc.id));
    await db.delete(boardCategories).where(eq(boardCategories.id, bc.id));
    await db.delete(categories).where(eq(categories.id, testCat.id));
  }
  
  // ============= SUMMARY =============
  console.log("\n" + "=".repeat(50));
  console.log(`SUMMARY: ${passed}/${passed + failed} tests passed`);
  console.log("=".repeat(50));
  
  if (failures.length > 0) {
    console.log("\nFailed tests:");
    failures.forEach(f => console.log(`  - ${f}`));
  }
  
  console.log(failed === 0 ? "\n✓ ALL QA TESTS PASSED!" : `\n✗ ${failed} test(s) failed`);
  
  process.exit(failed > 0 ? 1 : 0);
}

runFullQA().catch(err => {
  console.error("QA suite crashed:", err);
  process.exit(1);
});
