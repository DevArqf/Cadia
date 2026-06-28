import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const CADIA_SESSION_COOKIE = "cadia_dashboard_session";

const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 days

export interface DashboardSession {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    username: string;
    globalName: string;
    discriminator: string;
    avatar: string;
  };
  expiresAt: number; // Discord access-token expiry (ms epoch)
}

export async function readDashboardSession(): Promise<DashboardSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CADIA_SESSION_COOKIE)?.value;
  if (!value) return null;

  const payload = verifySignedPayload<DashboardSession>(value);
  if (!payload) return null;

  // Access token still valid — return as-is.
  if (payload.expiresAt > Date.now()) return payload;

  // Access token expired — try a silent refresh.
  if (!payload.refreshToken) return null;

  const refreshed = await refreshDiscordToken(payload.refreshToken);
  if (!refreshed) {
    // Refresh failed (revoked, etc.) — clear the session so the user can
    // cleanly re-authenticate instead of seeing broken data.
    const cleared = clearSessionCookie();
    try {
      cookieStore.set(cleared.name, cleared.value, cleared.options);
    } catch {
      /* ignore — some read-only contexts can't set cookies */
    }
    return null;
  }

  const newSession: DashboardSession = {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || payload.refreshToken,
    user: payload.user,
    expiresAt: Date.now() + Number(refreshed.expires_in || 604800) * 1000,
  };

  const cookie = createSessionCookie(newSession);
  try {
    cookieStore.set(cookie.name, cookie.value, cookie.options);
  } catch {
    /* ignore — cookie may be set on a subsequent request */
  }
  return newSession;
}

export function createSessionCookie(session: DashboardSession) {
  return {
    name: CADIA_SESSION_COOKIE,
    value: signPayload(session),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SEC,
      expires: new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000),
    },
  };
}

export function clearSessionCookie() {
  return {
    name: CADIA_SESSION_COOKIE,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    },
  };
}

export function createOAuthState(callbackUrl = "/") {
  return signPayload({
    callbackUrl: normalizeCallbackUrl(callbackUrl),
    nonce: randomBytes(16).toString("hex"),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
}

export function readOAuthState(state: string | null) {
  if (!state) return null;
  const payload = verifySignedPayload<{ callbackUrl: string; expiresAt: number }>(state);
  if (!payload || payload.expiresAt <= Date.now()) return null;
  return payload;
}

export function getDashboardBaseUrl(requestUrl?: string) {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  if (requestUrl) {
    const url = new URL(requestUrl);
    return `${url.protocol}//${url.host}`;
  }
  return "http://localhost:3000";
}

export function getDiscordRedirectUri(requestUrl?: string) {
  return `${getDashboardBaseUrl(requestUrl)}/api/auth/callback/discord`;
}

async function refreshDiscordToken(
  refreshToken: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number } | null> {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const response = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function signPayload(value: unknown) {
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifySignedPayload<T>(value: string): T | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function sign(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function getAuthSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.CADIA_DASHBOARD_SECRET || "cadia-dashboard-development-secret";
}

function normalizeCallbackUrl(callbackUrl: string) {
  if (!callbackUrl.startsWith("/")) return "/";
  if (callbackUrl.startsWith("//")) return "/";
  return callbackUrl;
}
