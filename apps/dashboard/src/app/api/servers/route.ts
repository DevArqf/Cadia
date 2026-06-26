import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    servers: [],
    message: "Authentication required",
  }, { status: 401 });
}
