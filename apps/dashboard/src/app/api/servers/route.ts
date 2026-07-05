import { NextResponse } from "next/server";
import { readDashboardSession } from "@/lib/server/auth-session";
import { requestBot } from "@/lib/server/bot-ipc";

export async function GET() {
  const session = await readDashboardSession({ refreshAccessToken: true });
  const accessToken = session?.accessToken;
  if (!accessToken) {
    return NextResponse.json({ servers: [], message: "Authentication required" }, { status: 401 });
  }

  const [discordGuilds, botGuilds] = await Promise.all([
    fetchDiscordGuilds(accessToken),
    requestBot<any[]>("bot.guilds").catch(() => []),
  ]);

  const botGuildById = new Map<string, any>(botGuilds.map((guild) => [String(guild.id), guild] as const));
  const servers = discordGuilds
    .filter((guild) => canManageGuild(guild))
    .map((guild) => mapGuild(guild, botGuildById.get(guild.id)));

  return NextResponse.json({ servers });
}

async function fetchDiscordGuilds(accessToken: string) {
  const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Discord guild fetch failed: ${response.status}`);
  return response.json();
}

function canManageGuild(guild: any) {
  if (guild.owner) return true;
  const permissions = BigInt(guild.permissions || "0");
  return (permissions & 0x8n) !== 0n || (permissions & 0x20n) !== 0n;
}

function mapGuild(discordGuild: any, botGuild: any) {
  const botInServer = Boolean(botGuild);
  const permissions = BigInt(discordGuild.permissions || "0");
  const userPermissions = [
    (permissions & 0x8n) !== 0n ? "ADMINISTRATOR" : null,
    (permissions & 0x20n) !== 0n ? "MANAGE_GUILD" : null,
  ].filter(Boolean);

  return {
    id: discordGuild.id,
    name: discordGuild.name,
    icon: botGuild?.iconUrl || (discordGuild.icon
      ? `https://cdn.discordapp.com/icons/${discordGuild.id}/${discordGuild.icon}.webp?size=256`
      : "#65b8da"),
    ownerId: botGuild?.ownerId || "",
    memberCount: botGuild?.memberCount || 0,
    botInServer,
    userPermissions,
    userCanManage: true,
    roles: (botGuild?.roles || []).map((role: any) => ({ ...role, canManageCadia: false })),
    features: botGuild?.features || discordGuild.features || [],
    premium: false,
    region: "auto",
    createdAt: Number((BigInt(discordGuild.id) >> 22n) + 1420070400000n),
    boostLevel: botGuild?.premiumTier || 0,
    boostCount: botGuild?.premiumSubscriptionCount || 0,
    channelCount: botGuild?.channelCount || 0,
    textChannelCount: botGuild?.textChannelCount || 0,
    voiceChannelCount: botGuild?.voiceChannelCount || 0,
    categoryCount: botGuild?.categoryCount || 0,
    emojiCount: botGuild?.emojiCount || 0,
    stickerCount: botGuild?.stickerCount || 0,
    roleCount: botGuild?.roleCount || 0,
    bannedCount: 0,
    invitesCount: 0,
    integrationsCount: 0,
    webhooksCount: 0,
    botJoinedAt: botGuild?.joinedAt || Date.now(),
    botNickname: botGuild?.nickname || "Cadia",
    verificationLevel: botGuild?.verificationLevel || "Unknown",
    explicitContentFilter: botGuild?.explicitContentFilter || "Unknown",
    defaultNotifications: botGuild?.defaultMessageNotifications || "Unknown",
    twoFactorRequired: Boolean(botGuild?.mfaLevel),
    vanityUrl: botGuild?.vanityURLCode || null,
    banner: botInServer ? botGuild?.bannerUrl || null : null,
    description: botGuild?.description || null,
    maxBitrate: Math.round((botGuild?.maxBitrate || 96000) / 1000),
    maxFileSize: botGuild?.maxFileSize || 25,
    afkChannel: botGuild?.afkChannel || null,
    afkTimeout: botGuild?.afkTimeout || 300,
    systemChannel: botGuild?.systemChannel || null,
    rulesChannel: botGuild?.rulesChannel || null,
    updatesChannel: botGuild?.publicUpdatesChannel || null,
    botPrefix: botGuild?.prefix || "cd ",
    channels: botGuild?.channels || [],
    botStatus: botInServer ? "online" : "offline",
  };
}
