import { NextResponse } from "next/server";
import { requestBot } from "@/lib/server/bot-ipc";
import { requireManagedGuild } from "@/lib/server/guild-access";

interface RouteContext {
  params: Promise<{ guildId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { guildId } = await context.params;
  const access = await requireManagedGuild(guildId);
  if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

  try {
    return NextResponse.json(await requestBot("guild.settings.get", { guildId }));
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Could not load bot settings", code: error?.code || "BOT_SETTINGS_LOAD_FAILED" },
      { status: 502 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { guildId } = await context.params;
  const access = await requireManagedGuild(guildId);
  if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await requestBot("guild.settings.update", {
        guildId,
        actorId: access.session.user.id,
        prefix: body?.prefix,
        nickname: body?.nickname,
		updateChannelId: body?.updateChannelId,
      }),
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Could not update bot settings", code: error?.code || "BOT_SETTINGS_UPDATE_FAILED" },
      { status: 502 },
    );
  }
}
