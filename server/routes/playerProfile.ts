import { Router, Request, Response } from "express";
import { playerProfileService } from "../services/playerProfile";

const router = Router();

// Get or create guest profile - issues server-side guestId for security
router.post("/api/player/guest", async (req: Request, res: Response) => {
  try {
    const { displayName } = req.body;
    
    if (!displayName) {
      return res.status(400).json({ error: "displayName is required" });
    }
    
    // Check if session already has a guestId (returning guest)
    let guestId = req.session.guestId;
    
    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      req.session.guestId = guestId;
    }
    
    const profile = await playerProfileService.getOrCreateGuestProfile(guestId, displayName);
    
    // Return both the profile and the server-issued guestId for client storage
    res.json({ ...profile, serverGuestId: guestId });
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
// Security: Verifies ownership via session (user ID or stored guest ID from session)
router.post("/api/player/stats", async (req: Request, res: Response) => {
  try {
    const { profileId, gameSlug, updates } = req.body;
    const userId = req.session?.userId;
    const sessionGuestId = req.session.guestId;
    
    if (!profileId || !gameSlug) {
      return res.status(400).json({ error: "profileId and gameSlug are required" });
    }
    
    // Verify ownership - must either be authenticated user's profile or session-bound guestId
    const profile = await playerProfileService.getProfileById(profileId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    
    // Security check: verify caller owns this profile via session
    if (userId) {
      // Authenticated user - profile must belong to them
      if (profile.userId !== userId) {
        return res.status(403).json({ error: "You can only update your own profile" });
      }
    } else if (sessionGuestId) {
      // Guest - profile must match session-stored guestId (not client-provided)
      if (profile.guestId !== sessionGuestId) {
        return res.status(403).json({ error: "Profile ownership verification failed" });
      }
    } else {
      return res.status(401).json({ error: "Session required - please create or restore your guest profile first" });
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

// Merge guest profile to authenticated user (idempotent, session-verified)
router.post("/api/player/merge", async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    const sessionGuestId = req.session.guestId;
    
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Check if user already has a profile (idempotent - already merged)
    const existingUserProfile = await playerProfileService.getProfileByUserId(userId);
    if (existingUserProfile) {
      // User already has profile - check if there's still a guest profile to merge
      if (sessionGuestId) {
        const guestProfile = await playerProfileService.getProfileByGuestId(sessionGuestId);
        if (!guestProfile) {
          // Already merged, return existing profile
          const fullProfile = await playerProfileService.getFullProfile(existingUserProfile.id);
          return res.json({ ...fullProfile, alreadyMerged: true });
        }
        // Both exist - need to merge stats
      } else {
        // No guest session - return existing profile
        const fullProfile = await playerProfileService.getFullProfile(existingUserProfile.id);
        return res.json({ ...fullProfile, alreadyMerged: true });
      }
    }
    
    if (!sessionGuestId) {
      // No guest session and no existing user profile - nothing to merge
      return res.status(400).json({ error: "No guest session found to merge" });
    }
    
    const mergedProfile = await playerProfileService.mergeGuestToUser(sessionGuestId, userId);
    
    if (!mergedProfile) {
      // No guest profile found but user has profile - return that
      if (existingUserProfile) {
        const fullProfile = await playerProfileService.getFullProfile(existingUserProfile.id);
        return res.json({ ...fullProfile, alreadyMerged: true });
      }
      return res.status(404).json({ error: "Guest profile not found" });
    }
    
    // Clear guest session after successful merge
    delete req.session.guestId;
    
    const fullProfile = await playerProfileService.getFullProfile(mergedProfile.id);
    res.json(fullProfile);
  } catch (error) {
    console.error("[Player Profile] Error merging profiles:", error);
    res.status(500).json({ error: "Failed to merge profiles" });
  }
});

// Calculate personality for a profile (requires ownership verification)
router.post("/api/player/personality/:profileId", async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const userId = req.session?.userId;
    const sessionGuestId = req.session.guestId;
    
    const profile = await playerProfileService.getProfileById(profileId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    
    if (userId) {
      if (profile.userId !== userId) {
        return res.status(403).json({ error: "You can only recalculate your own personality" });
      }
    } else if (sessionGuestId) {
      if (profile.guestId !== sessionGuestId) {
        return res.status(403).json({ error: "Profile ownership verification failed" });
      }
    } else {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const personality = await playerProfileService.calculatePersonality(profileId);
    res.json(personality);
  } catch (error) {
    console.error("[Player Profile] Error calculating personality:", error);
    res.status(500).json({ error: "Failed to calculate personality" });
  }
});

export default router;
