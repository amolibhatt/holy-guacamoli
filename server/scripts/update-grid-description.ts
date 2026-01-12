import { db } from "../db";
import { gameTypes } from "@shared/schema";
import { eq } from "drizzle-orm";

// Legacy script - no longer needed as slug is now "buzzkill"
async function updateBuzzkillDisplayName() {
  console.log("Updating Buzzkill display name...");
  
  await db
    .update(gameTypes)
    .set({ displayName: "Buzzkill" })
    .where(eq(gameTypes.slug, "buzzkill"));
  
  console.log("Display name updated successfully!");
  process.exit(0);
}

updateBuzzkillDisplayName().catch((err) => {
  console.error("Failed to update display name:", err);
  process.exit(1);
});