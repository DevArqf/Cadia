import { NextRequest, NextResponse } from "next/server";
import { requestBot } from "@/lib/server/bot-ipc";
import { readAdminSession, readDashboardSession } from "@/lib/server/auth-session";

const ACTIONS: Record<string, string> = {
  status: "admin.status.update",
  activity: "admin.activity.update",
  blacklist: "admin.blacklist.add",
  unblacklist: "admin.blacklist.remove",
	"send-update": "admin.update.send",
};

export async function GET() {
  if (!(await readAdminSession())) return json({ message: "Admin authorization required." }, 403);
  try {
    return json(await requestBot("admin.overview"));
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : "Bot IPC unavailable." }, 502);
  }
}

export async function PUT(request: NextRequest) {
  const [admin, session] = await Promise.all([readAdminSession(), readDashboardSession()]);
  if (!admin || !session || admin.userId !== session.user.id) return json({ message: "Admin authorization required." }, 403);
  const body = await request.json().catch(() => ({}));
  const requestType = ACTIONS[String(body.action || "")];
  if (!requestType) return json({ message: "Unsupported admin action." }, 400);

  try {
    const result = await requestBot(requestType, {
      ...(body.payload && typeof body.payload === "object" ? body.payload : {}),
      actorId: session.user.id,
      actorName: session.user.globalName || session.user.username,
    });
    return json(result);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : "Admin action failed." }, 400);
  }
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store, max-age=0" },
  });
}
