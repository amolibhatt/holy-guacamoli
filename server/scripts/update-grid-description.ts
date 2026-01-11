import { db } from "../db";
import { gameTypes } from "@shared/schema";
import { eq } from "drizzle-orm";

async function updateGridOfGrudgesDisplayName() {
  console.log("Updating Grid of Grudges displayName to Buzzkill...");
  
  await db
    .update(gameTypes)
    .set({ displayName: "Buzzkill" })
    .where(eq(gameTypes.slug, "grid_of_grudges"));
  
  console.log("Display name updated successfully!");
  process.exit(0);
}

updateGridOfGrudgesDisplayName().catch((err) => {
  console.error("Failed to update display name:", err);
  process.exit(1);
});