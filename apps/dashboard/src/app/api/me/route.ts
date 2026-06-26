import { NextResponse } from "next/server";
import { readDashboardSession } from "@/lib/server/auth-session";

export async function GET() {
  const session = await readDashboardSession();
  if (!session?.user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: session.user,
  });
}
