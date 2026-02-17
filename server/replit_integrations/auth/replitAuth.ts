import * as client from "openid-client";
import type { Express, RequestHandler } from "express";
import { authStorage } from "./storage";

const REPLIT_DOMAINS = ["replit.com", "replit.dev", "janeway.replit.dev"];

function isReplitDomain(host: string): boolean {
  return REPLIT_DOMAINS.some(
    (d) => host === d || host.endsWith(`.${d}`)
  );
}

function getExternalUrl(req: { headers: { host?: string }; protocol: string }): string {
  const host = req.headers.host || "";
  const protocol = isReplitDomain(host) ? "https" : req.protocol;
  return `${protocol}://${host}`;
}

let oidcConfig: client.Configuration | null = null;

async function getOidcConfig(): Promise<client.Configuration> {
  if (oidcConfig) return oidcConfig;

  const clientId = process.env.REPLIT_DEPLOYMENT
    ? process.env.REPLIT_DEPLOYMENT_URL
    : process.env.REPLIT_DEV_DOMAIN;

  if (!clientId) {
    throw new Error("Missing REPLIT_DEPLOYMENT_URL or REPLIT_DEV_DOMAIN");
  }

  oidcConfig = await client.discovery(
    new URL("https://replit.com/.well-known/openid-configuration"),
    clientId,
    undefined
  );

  return oidcConfig;
}

export function registerReplitAuthRoutes(app: Express): void {
  app.get("/api/login", async (req, res) => {
    try {
      const config = await getOidcConfig();
      const externalUrl = getExternalUrl(req);
      const callbackUrl = `${externalUrl}/api/callback`;

      const codeVerifier = client.randomPKCECodeVerifier();
      const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
      const state = client.randomState();

      req.session.codeVerifier = codeVerifier;
      req.session.state = state;

      // Explicitly save session to ensure PKCE state persists across redirect
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const authUrl = client.buildAuthorizationUrl(config, {
        redirect_uri: callbackUrl,
        scope: "openid email profile",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
      });

      res.redirect(authUrl.href);
    } catch (error) {
      console.error("[REPLIT AUTH] Login error:", error);
      res.redirect("/?error=login_failed");
    }
  });

  app.get("/api/callback", async (req, res) => {
    try {
      const config = await getOidcConfig();
      const externalUrl = getExternalUrl(req);
      const callbackUrl = `${externalUrl}/api/callback`;

      const codeVerifier = req.session.codeVerifier;
      const expectedState = req.session.state;

      if (!codeVerifier || !expectedState) {
        console.error("[REPLIT AUTH] Missing session state");
        return res.redirect("/?error=invalid_state");
      }

      const tokens = await client.authorizationCodeGrant(
        config,
        new URL(req.url, externalUrl),
        {
          pkceCodeVerifier: codeVerifier,
          expectedState,
        }
      );

      const claims = tokens.claims();
      if (!claims) {
        console.error("[REPLIT AUTH] No claims in token");
        return res.redirect("/?error=no_claims");
      }

      delete req.session.codeVerifier;
      delete req.session.state;

      const user = await authStorage.upsertUser({
        id: claims.sub,
        email: (claims.email as string) || null,
        firstName: (claims.first_name as string) || (claims.given_name as string) || null,
        lastName: (claims.last_name as string) || (claims.family_name as string) || null,
        profileImageUrl: (claims.profile_image_url as string) || (claims.picture as string) || null,
      });

      req.session.userId = user.id;
      req.session.userRole = user.role;

      res.redirect("/");
    } catch (error) {
      console.error("[REPLIT AUTH] Callback error:", error);
      res.redirect("/?error=auth_failed");
    }
  });

  app.get("/api/social-logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("[REPLIT AUTH] Logout error:", err);
      }
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  });
}

export const isAuthenticatedReplit: RequestHandler = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
