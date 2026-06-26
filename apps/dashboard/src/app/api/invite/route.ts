import { NextRequest, NextResponse } from "next/server";
import { requestBot } from "@/lib/server/bot-ipc";
import { buildInviteUrl, withGuildInviteParams } from "@/lib/server/invite";

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

  return NextResponse.redirect(withGuildInviteParams(inviteUrl, guildId));
}

