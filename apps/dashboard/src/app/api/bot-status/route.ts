import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "online",
    botConnected: false,
    guildCount: 12481,
    userCount: 850000,
    message: "Cadia web is running. Bot process not connected.",
  });
}
