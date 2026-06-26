const DEFAULT_PERMISSIONS = "280125485303";
const DEFAULT_SCOPES = "bot applications.commands";

function getClientId() {
  return process.env.DISCORD_CLIENT_ID || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
}

export function buildInviteUrl({
  clientId = getClientId(),
  permissions = process.env.CADIA_INVITE_PERMISSIONS || DEFAULT_PERMISSIONS,
  guildId,
  disableGuildSelect,
}: {
  clientId?: string;
  permissions?: string;
  guildId?: string | null;
  disableGuildSelect?: boolean;
} = {}) {
  if (!clientId) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    permissions,
    scope: DEFAULT_SCOPES,
  });

  if (guildId) {
    params.set("guild_id", guildId);
    if (disableGuildSelect) params.set("disable_guild_select", "true");
  }

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function withGuildInviteParams(baseUrl: string, guildId?: string | null) {
  if (!guildId) return baseUrl;
  const url = new URL(baseUrl);
  url.searchParams.set("guild_id", guildId);
  url.searchParams.set("disable_guild_select", "true");
  return url.toString();
}

