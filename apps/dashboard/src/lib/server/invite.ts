const DEFAULT_PERMISSIONS = "280125485303";
const DEFAULT_SCOPES = "bot applications.commands";
const CADIA_APPLICATION_ID = "1200475110235197631";

function getClientId() {
  return normalizeClientId(process.env.DISCORD_CLIENT_ID || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID);
}

export function buildInviteUrl({
  clientId = getClientId(),
  permissions = process.env.CADIA_INVITE_PERMISSIONS || DEFAULT_PERMISSIONS,
  guildId,
  disableGuildSelect,
  redirectUri,
}: {
  clientId?: string;
  permissions?: string;
  guildId?: string | null;
  disableGuildSelect?: boolean;
  redirectUri?: string | null;
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

  if (redirectUri) {
    params.set("redirect_uri", redirectUri);
    params.set("response_type", "code");
  }

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function withGuildInviteParams(baseUrl: string, guildId?: string | null) {
  const url = new URL(baseUrl);
  url.searchParams.set("client_id", normalizeClientId(url.searchParams.get("client_id")));
  if (!url.searchParams.get("scope")) url.searchParams.set("scope", DEFAULT_SCOPES);
  if (!url.searchParams.get("permissions")) url.searchParams.set("permissions", DEFAULT_PERMISSIONS);
  if (!guildId) return url.toString();

  url.searchParams.set("guild_id", guildId);
  url.searchParams.set("disable_guild_select", "true");
  return url.toString();
}

function normalizeClientId(value?: string | null) {
  const candidate = value?.trim();
  if (!candidate || candidate === "your_bot_application_id" || !/^\d{17,22}$/.test(candidate)) {
    return CADIA_APPLICATION_ID;
  }

  return candidate;
}
