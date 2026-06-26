import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const CADIA_SESSION_COOKIE = "cadia_dashboard_session";

export interface DashboardSession {
  accessToken: string;
  user: {
    id: string;
    username: string;
    globalName: string;
    discriminator: string;
    avatar: string;
  };
  expiresAt: number;
}

export async function readDashboardSession(): Promise<DashboardSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CADIA_SESSION_COOKIE)?.value;
  if (!value) return null;

  const payload = verifySignedPayload<DashboardSession>(value);
  if (!payload || payload.expiresAt <= Date.now()) return null;
  return payload;
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
      expires: new Date(session.expiresAt),
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
