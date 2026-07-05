import { readDashboardSession } from "@/lib/server/auth-session";

export async function requireManagedGuild(guildId: string) {
  const session = await readDashboardSession({ refreshAccessToken: true });
  if (!session?.accessToken) return { ok: false as const, status: 401, message: "Authentication required" };

  const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return { ok: false as const, status: 502, message: "Discord guild verification failed" };

  const guilds = await response.json();
  const guild = guilds.find((entry: any) => entry.id === guildId);
  if (!guild) return { ok: false as const, status: 404, message: "Server not found" };
  const permissions = BigInt(guild.permissions || "0");
  const zero = BigInt(0);
  const canManage = guild.owner || (permissions & BigInt(8)) !== zero || (permissions & BigInt(32)) !== zero;
  if (!canManage) return { ok: false as const, status: 403, message: "Manage Server permission required" };

  return { ok: true as const, session, guild };
}
