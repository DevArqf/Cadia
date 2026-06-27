// Cadia bot — shared types
export type View =
  | "landing"
  | "login"
  | "server-select"
  | "dashboard"
  | "premium"
  | "admin"
  | "legal"
  | "about"
  | "terms"
  | "privacy"
  | "faq";

export type DashboardTab =
  | "dashboard"
  | "modules"
  | "commands"
  | "logging"
  | "premium";

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string; // url or color
  globalName: string;
}

export interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: string[]; // e.g. ["ADMINISTRATOR", "MANAGE_GUILD"]
  canManageCadia: boolean; // user-configured
}

export interface DiscordServer {
  id: string;
  name: string;
  icon: string; // color hex for placeholder
  ownerId: string;
  memberCount: number;
  onlineCount: number;
  botInServer: boolean;
  userPermissions: string[]; // raw perms the user has in this server
  userCanManage: boolean; // ADMINISTRATOR or MANAGE_GUILD
  roles: Role[];
  features: string[];
  premium: boolean;
  blacklisted?: boolean;
  // Extended info
  region: string;
  createdAt: number; // server creation timestamp
  boostLevel: number; // 0, 1, 2, 3
  boostCount: number;
  channelCount: number;
  textChannelCount: number;
  voiceChannelCount: number;
  categoryCount: number;
  emojiCount: number;
  stickerCount: number;
  roleCount: number;
  bannedCount: number;
  invitesCount: number;
  integrationsCount: number;
  webhooksCount: number;
  botJoinedAt: number;
  botNickname: string;
  verificationLevel: string; // "None", "Low", "Medium", "High", "Highest"
  explicitContentFilter: string; // "Disabled", "MembersWithoutRoles", "AllMembers"
  defaultNotifications: string; // "AllMessages", "OnlyMentions"
  twoFactorRequired: boolean;
  vanityUrl: string | null;
  banner: string | null;
  description: string | null;
  maxBitrate: number;
  maxFileSize: number; // in MB
  afkChannel: string | null;
  afkTimeout: number; // seconds
  systemChannel: string | null;
  rulesChannel: string | null;
  updatesChannel: string | null;
  botPrefix: string; // configurable prefix for prefix commands
  channels: { id: string; name: string; type: "text" | "voice" | "category" }[];
  botStatus: "online" | "maintenance" | "offline";
}

export type BotStatus = "online" | "maintenance" | "offline";

export type ModuleCategory = "Moderation" | "RPG" | "Utility" | "Fun" | "Logging" | "Community";
export type ModuleType = "Command" | "Event" | "Slash" | "Context";

export interface BotCommand {
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  type: ModuleType;
  enabled: boolean;
  cooldown: number; // seconds
  restrictedRoleIds: string[];
  allowedRoleIds: string[]; // roles that CAN use this command (empty = everyone)
  allowedChannelIds: string[]; // channels where this command works (empty = all)
  ignoredChannelIds: string[]; // channels where this command is blocked
  ignoredRoleIds: string[]; // roles that CANNOT use this command
  response?: string; // optional message shown when the command is disabled
  moduleId?: string;
  moduleName?: string;
}

export interface BotModule {
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  enabled: boolean;
  response: string; // message shown when the module is disabled
  cooldown: number; // seconds
  restrictedRoleIds: string[];
  allowedRoleIds: string[]; // roles that CAN use this module (empty = everyone)
  commands: BotCommand[];
  icon: string; // emoji
}

export interface SuggestionPanelAppearance {
  title: string;
  description: string;
  footer: string;
  color: string;
  thumbnailUrl: string;
  imageUrl: string;
  buttonLabel: string;
  buttonEmoji: string;
}

export interface SuggestionPostAppearance {
  title: string;
  description: string;
  footer: string;
  color: string;
  thumbnailUrl: string;
  imageUrl: string;
  showTimestamp: boolean;
}

export interface SuggestionConfig {
  guildId: string;
  channelId: string | null;
  panelMessageId: string | null;
  enabled: boolean;
  style: "embed" | "message";
  panel: SuggestionPanelAppearance;
  post: SuggestionPostAppearance;
}

export interface AutoModConfig {
  guildId: string;
  enabled: boolean;
  filters: {
    profanity: boolean;
    sexualContent: boolean;
    slurs: boolean;
    spam: boolean;
    mentionSpam: boolean;
    mentionLimit: number;
    mentionRaidProtection: boolean;
    keywords: string[];
    regexPatterns: string[];
    allowList: string[];
  };
  actions: {
    blockMessage: boolean;
    customMessage: string;
    alertChannelId: string | null;
    timeoutSeconds: number;
  };
  exemptRoleIds: string[];
  exemptChannelIds: string[];
}

export type LogType =
  | "command"
  | "moderation"
  | "automod"
  | "config"
  | "audit"
  | "botstatus"
  | "system";

export interface LogEntry {
  id: string;
  type: LogType;
  serverId: string;
  serverName: string;
  actor: string; // username or "system"
  actorId: string;
  action: string;
  details: string;
  timestamp: number;
}

export interface PremiumPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  color: string;
  features: string[];
  highlight?: boolean;
}
