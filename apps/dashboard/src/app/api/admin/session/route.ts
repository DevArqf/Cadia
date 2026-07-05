import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  createAdminSessionCookie,
  readAdminSession,
  readDashboardSession,
} from "@/lib/server/auth-session";

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, number[]>();

export async function GET() {
  const admin = await readAdminSession();
  return admin
    ? noStore({ authorized: true })
    : noStore({ authorized: false }, 401);
}

export async function POST(request: NextRequest) {
  const session = await readDashboardSession();
  if (!session || !isAdminUser(session.user.id)) return noStore({ authorized: false }, 403);

  const password = getAdminPassword();
  if (!password) return noStore({ authorized: false, message: "Admin access is not configured." }, 503);

  const key = `${session.user.id}:${clientAddress(request)}`;
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((timestamp) => now - timestamp < ATTEMPT_WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) return noStore({ authorized: false, message: "Too many attempts. Try again later." }, 429);

  const body = await request.json().catch(() => ({}));
  if (!safeEqual(String(body.password || ""), password)) {
    attempts.set(key, [...recent, now]);
    return noStore({ authorized: false, message: "Access denied." }, 403);
  }

  attempts.delete(key);
  const response = noStore({ authorized: true });
  const cookie = createAdminSessionCookie(session.user.id);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

export async function DELETE() {
  const response = noStore({ authorized: false });
  const cookie = clearAdminSessionCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

function isAdminUser(userId: string) {
  const configured = process.env.CADIA_ADMIN_USER_IDS || process.env.BOT_OWNERS || "";
  return configured.split(/[\s,]+/).filter(Boolean).includes(userId);
}

function getAdminPassword() {
  return process.env.CADIA_ADMIN_PASSWORD || "";
}

function safeEqual(value: string, expected: string) {
  const actualHash = createHash("sha256").update(value).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}

function clientAddress(request: NextRequest) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function noStore(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store, max-age=0" },
  });
}
