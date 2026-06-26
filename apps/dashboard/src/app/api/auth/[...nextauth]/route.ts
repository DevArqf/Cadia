import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  createOAuthState,
  createSessionCookie,
  getDashboardBaseUrl,
  getDiscordRedirectUri,
  readOAuthState,
} from "@/lib/server/auth-session";

export async function GET(request: NextRequest, context: any) {
  const action = (await context.params)?.nextauth?.join("/") || "";

  if (action === "signin/discord") return redirectToDiscord(request);
  if (action === "callback/discord") return handleDiscordCallback(request);
  if (action === "signout") return signOut(request);

  return NextResponse.json({ error: "Unsupported auth route" }, { status: 404 });
}

export async function POST(request: NextRequest, context: any) {
  return GET(request, context);
}

function redirectToDiscord(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "DISCORD_CLIENT_ID is not configured" }, { status: 500 });

  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || "/";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getDiscordRedirectUri(request.url),
    response_type: "code",
    scope: "identify guilds",
    state: createOAuthState(callbackUrl),
    prompt: "none",
  });

  return NextResponse.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
}

async function handleDiscordCallback(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = readOAuthState(request.nextUrl.searchParams.get("state"));
  const dashboardBaseUrl = getDashboardBaseUrl(request.url);
  if (!code || !state) return NextResponse.redirect(new URL("/", dashboardBaseUrl));

  const token = await exchangeDiscordCode(code, request.url);
  const user = await fetchDiscordUser(token.access_token);
  const response = NextResponse.redirect(new URL(state.callbackUrl, dashboardBaseUrl));
  const sessionCookie = createSessionCookie({
    accessToken: token.access_token,
    user: {
      id: user.id,
      username: user.username,
      globalName: user.global_name || user.username,
      discriminator: user.discriminator || "0",
      avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : "#65b8da",
    },
    expiresAt: Date.now() + Number(token.expires_in || 604800) * 1000,
  });
  response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);
  return response;
}

function signOut(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", getDashboardBaseUrl(request.url)));
  const cookie = clearSessionCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

async function exchangeDiscordCode(code: string, requestUrl: string) {
  const response = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID || "",
      client_secret: process.env.DISCORD_CLIENT_SECRET || "",
      grant_type: "authorization_code",
      code,
      redirect_uri: getDiscordRedirectUri(requestUrl),
    }),
  });

  if (!response.ok) throw new Error(`Discord token exchange failed: ${response.status}`);
  return response.json();
}

async function fetchDiscordUser(accessToken: string) {
  const response = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Discord user fetch failed: ${response.status}`);
  return response.json();
}
