import { Router, Request, Response } from "express";
import { playerProfileService } from "../services/playerProfile";

const router = Router();

// Get or create guest profile
router.post("/api/player/guest", async (req: Request, res: Response) => {
  try {
    const { guestId, displayName } = req.body;
    
    if (!guestId || !displayName) {
      return res.status(400).json({ error: "guestId and displayName are required" });
    }
    
    const profile = await playerProfileService.getOrCreateGuestProfile(guestId, displayName);
    res.json(profile);
  } catch (error) {
    console.error("[Player Profile] Error creating guest profile:", error);
    res.status(500).json({ error: "Failed to create guest profile" });
  }
});

// Get profile by ID
router.get("/api/player/profile/:profileId", async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const fullProfile = await playerProfileService.getFullProfile(profileId);
    
    if (!fullProfile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    
    res.json(fullProfile);
  } catch (error) {
    console.error("[Player Profile] Error getting profile:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// Get current user's player profile
router.get("/api/player/me", async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const profile = await playerProfileService.getProfileByUserId(userId);
    
    if (!profile) {
      return res.status(404).json({ error: "No player profile found" });
    }
    
    const fullProfile = await playerProfileService.getFullProfile(profile.id);
    res.json(fullProfile);
  } catch (error) {
    console.error("[Player Profile] Error getting current profile:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// Update game stats (called after game ends)
router.post("/api/player/stats", async (req: Request, res: Response) => {
  try {
    const { profileId, gameSlug, updates } = req.body;
    
    if (!profileId || !gameSlug) {
      return res.status(400).json({ error: "profileId and gameSlug are required" });
    }
    
    await playerProfileService.updateGameStats(profileId, gameSlug, updates || {});
    
    // Return updated profile with any new badges
    const fullProfile = await playerProfileService.getFullProfile(profileId);
    res.json(fullProfile);
  } catch (error) {
    console.error("[Player Profile] Error updating stats:", error);
    res.status(500).json({ error: "Failed to update stats" });
  }
});

// Get badges for a profile
router.get("/api/player/badges/:profileId", async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const badges = await playerProfileService.getBadges(profileId);
    res.json(badges);
  } catch (error) {
    console.error("[Player Profile] Error getting badges:", error);
    res.status(500).json({ error: "Failed to get badges" });
  }
});

// Merge guest profile to authenticated user
router.post("/api/player/merge", async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    const { guestId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    if (!guestId) {
      return res.status(400).json({ error: "guestId is required" });
    }
    
    const mergedProfile = await playerProfileService.mergeGuestToUser(guestId, userId);
    
    if (!mergedProfile) {
      return res.status(404).json({ error: "Guest profile not found" });
    }
    
    const fullProfile = await playerProfileService.getFullProfile(mergedProfile.id);
    res.json(fullProfile);
  } catch (error) {
    console.error("[Player Profile] Error merging profiles:", error);
    res.status(500).json({ error: "Failed to merge profiles" });
  }
});

// Calculate personality for a profile
router.post("/api/player/personality/:profileId", async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const personality = await playerProfileService.calculatePersonality(profileId);
    res.json(personality);
  } catch (error) {
    console.error("[Player Profile] Error calculating personality:", error);
    res.status(500).json({ error: "Failed to calculate personality" });
  }
});

export default router;
