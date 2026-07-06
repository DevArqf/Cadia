import { NextRequest, NextResponse } from "next/server";
import { requestBot } from "@/lib/server/bot-ipc";
import { buildInviteUrl, withGuildInviteParams } from "@/lib/server/invite";
import { createOAuthState, getDiscordRedirectUri } from "@/lib/server/auth-session";

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get("guild_id");

  let inviteUrl: string | null = null;
  try {
    const response = await requestBot<{ url: string }>("bot.inviteUrl");
    inviteUrl = response.url;
  } catch {
    inviteUrl = buildInviteUrl();
  }

  if (!inviteUrl) {
    return NextResponse.json(
      { error: "Discord client ID is not configured. Set DISCORD_CLIENT_ID for the dashboard." },
      { status: 500 },
    );
  }

  const invite = new URL(withGuildInviteParams(inviteUrl, guildId));
  const scopes = new Set((invite.searchParams.get("scope") || "").split(/\s+/).filter(Boolean));
  for (const scope of ["identify", "guilds", "bot", "applications.commands"]) scopes.add(scope);
  invite.searchParams.set("scope", [...scopes].join(" "));
  invite.searchParams.set("response_type", "code");
  invite.searchParams.set("redirect_uri", getDiscordRedirectUri(request.url));
  invite.searchParams.set("state", createOAuthState("/servers"));

  return NextResponse.redirect(invite);
}

