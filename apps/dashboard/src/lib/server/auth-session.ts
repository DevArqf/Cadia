import { cookies } from "next/headers";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const CADIA_SESSION_COOKIE = "cadia_dashboard_session";
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_REFRESH_WINDOW_MS = 60 * 1000;
const refreshesInFlight = new Map<string, Promise<DashboardSession | null>>();

export interface DashboardSession {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    globalName: string;
    discriminator: string;
    avatar: string;
  };
  expiresAt: number;
}

export async function readDashboardSession({ refreshAccessToken = false } = {}): Promise<DashboardSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CADIA_SESSION_COOKIE)?.value;
  if (!value) return null;

  const payload = decryptSession(value) || verifySignedPayload<DashboardSession>(value);
  if (!payload || payload.expiresAt <= Date.now()) return null;
  if (!refreshAccessToken || !payload.refreshToken || !payload.accessTokenExpiresAt) return payload;
  if (payload.accessTokenExpiresAt > Date.now() + ACCESS_TOKEN_REFRESH_WINDOW_MS) return payload;

  const refreshed = await refreshSessionOnce(payload);
  if (!refreshed) return payload.accessTokenExpiresAt > Date.now() ? payload : null;
  cookieStore.set(CADIA_SESSION_COOKIE, encryptSession(refreshed), sessionCookieOptions(refreshed.expiresAt));
  return refreshed;
}

export function createSessionCookie(session: DashboardSession) {
  return {
    name: CADIA_SESSION_COOKIE,
    value: encryptSession(session),
    options: sessionCookieOptions(session.expiresAt),
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

export function createDashboardSession(token: any, user: any): DashboardSession {
  const now = Date.now();
  return {
    accessToken: String(token.access_token),
    accessTokenExpiresAt: now + Number(token.expires_in || 604800) * 1000,
    refreshToken: String(token.refresh_token || ""),
    user: {
      id: String(user.id),
      username: String(user.username),
      globalName: String(user.global_name || user.username),
      discriminator: String(user.discriminator || "0"),
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=128`
        : "#65b8da",
    },
    expiresAt: now + SESSION_LIFETIME_MS,
  };
}

function encryptSession(session: DashboardSession) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  return ["v2", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptSession(value: string): DashboardSession | null {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v2" || !ivValue || !tagValue || !encryptedValue) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return null;
  }
}

function getEncryptionKey() {
  return createHash("sha256").update(getAuthSecret()).digest();
}

function sessionCookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
    priority: "high" as const,
  };
}

async function refreshSessionOnce(session: DashboardSession) {
  const key = createHash("sha256").update(session.refreshToken).digest("hex");
  const existing = refreshesInFlight.get(key);
  if (existing) return existing;

  const refresh = refreshDiscordSession(session).finally(() => refreshesInFlight.delete(key));
  refreshesInFlight.set(key, refresh);
  return refresh;
}

async function refreshDiscordSession(session: DashboardSession): Promise<DashboardSession | null> {
  const response = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID || "",
      client_secret: process.env.DISCORD_CLIENT_SECRET || "",
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
    }),
    cache: "no-store",
  });
  if (!response.ok) return null;

  const token = await response.json();
  const now = Date.now();
  return {
    ...session,
    accessToken: String(token.access_token),
    accessTokenExpiresAt: now + Number(token.expires_in || 604800) * 1000,
    refreshToken: String(token.refresh_token || session.refreshToken),
    expiresAt: now + SESSION_LIFETIME_MS,
  };
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
  const secret = process.env.NEXTAUTH_SECRET || process.env.CADIA_DASHBOARD_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET or CADIA_DASHBOARD_SECRET must be configured in production.");
  }
  return "cadia-dashboard-development-secret";
}

function normalizeCallbackUrl(callbackUrl: string) {
  if (!callbackUrl.startsWith("/")) return "/";
  if (callbackUrl.startsWith("//")) return "/";
  return callbackUrl;
}
