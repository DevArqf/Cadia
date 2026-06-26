import { NextResponse } from "next/server";
import { readBotStatus } from "@/lib/server/bot-ipc";

export async function GET() {
  const bot = await readBotStatus();
  if (!bot.connected) {
    return NextResponse.json({
      status: "offline",
      botConnected: false,
      guildCount: 0,
      userCount: 0,
      responseTimeMs: null,
      error: bot.error,
      message: "Dashboard is running, but the bot IPC server is unavailable.",
    }, { status: 503 });
  }

  return NextResponse.json({
    status: bot.data.ready ? "online" : "starting",
    botConnected: true,
    guildCount: bot.data.guilds,
    userCount: bot.data.users,
    responseTimeMs: bot.data.wsPing,
    uptimeMs: bot.data.uptimeMs,
    shardIds: bot.data.shardIds,
    checkedAt: bot.data.checkedAt,
  });
}
