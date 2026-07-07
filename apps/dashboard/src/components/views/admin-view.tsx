"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCadia } from "@/lib/store";
import { CadiaLogo } from "@/components/cadia-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  Ban,
  Search,
  Users,
  Crown,
  Lock,
  ArrowLeft,
  Server as ServerIcon,
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Clock,
  ChevronRight,
  Power,
  Zap,
  Terminal,
  RefreshCw,
  Bot,
  Calendar,
  Globe,
	Megaphone,
	Send,
	Plus,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { DiscordServer } from "@/lib/types";

interface AdminGuild {
  id: string;
  name: string;
  iconUrl: string | null;
  bannerUrl?: string | null;
  ownerId: string;
  memberCount: number;
  premiumTier: number;
  premiumSubscriptionCount: number;
  createdAt: number;
  joinedAt: number;
  nickname: string;
  prefix: string;
  verificationLevel: string;
  explicitContentFilter: string;
  defaultMessageNotifications: string;
  mfaLevel: number;
  vanityURLCode: string | null;
  description: string | null;
  maxBitrate: number;
  maxFileSize: number;
  afkChannel: string | null;
  afkTimeout: number;
  systemChannel: string | null;
  rulesChannel: string | null;
  publicUpdatesChannel: string | null;
	updateChannelId: string | null;
  channelCount: number;
  textChannelCount: number;
  voiceChannelCount: number;
  categoryCount: number;
  emojiCount: number;
  stickerCount: number;
  roleCount: number;
  channels: DiscordServer["channels"];
  roles: DiscordServer["roles"];
  features?: string[];
}

function formatUptime(uptimeMs: number) {
  const hours = Math.floor(uptimeMs / 3_600_000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(uptimeMs / 60_000)}m`;
}

function toDashboardServer(guild: AdminGuild): DiscordServer {
  return {
    id: guild.id,
    name: guild.name,
    icon: guild.iconUrl || "#65b8da",
    ownerId: guild.ownerId,
    memberCount: guild.memberCount,
    botInServer: true,
    userPermissions: ["ADMINISTRATOR"],
    userCanManage: true,
    roles: (guild.roles || []).map((role) => ({ ...role, canManageCadia: role.canManageCadia || false })),
    features: guild.features || [],
    premium: guild.premiumTier > 0,
    region: "Discord",
    createdAt: guild.createdAt,
    boostLevel: guild.premiumTier,
    boostCount: guild.premiumSubscriptionCount,
    channelCount: guild.channelCount,
    textChannelCount: guild.textChannelCount,
    voiceChannelCount: guild.voiceChannelCount,
    categoryCount: guild.categoryCount,
    emojiCount: guild.emojiCount,
    stickerCount: guild.stickerCount,
    roleCount: guild.roleCount,
    bannedCount: 0,
    invitesCount: 0,
    integrationsCount: 0,
    webhooksCount: 0,
    botJoinedAt: guild.joinedAt,
    botNickname: guild.nickname,
    verificationLevel: guild.verificationLevel,
    explicitContentFilter: guild.explicitContentFilter,
    defaultNotifications: guild.defaultMessageNotifications,
    twoFactorRequired: Boolean(guild.mfaLevel),
    vanityUrl: guild.vanityURLCode,
    banner: guild.bannerUrl || null,
    description: guild.description,
    maxBitrate: Math.round((guild.maxBitrate || 96_000) / 1000),
    maxFileSize: guild.maxFileSize || 25,
    afkChannel: guild.afkChannel,
    afkTimeout: guild.afkTimeout,
    systemChannel: guild.systemChannel,
    rulesChannel: guild.rulesChannel,
    updatesChannel: guild.publicUpdatesChannel,
	updateChannelId: guild.updateChannelId,
    botPrefix: guild.prefix || "cd ",
    channels: guild.channels || [],
    botStatus: "online",
  };
}

interface AdminOverview {
  guilds: AdminGuild[];
  blacklisted: Array<{ guildId: string; guildName: string; reason: string; blacklistedAt: number; expiresAt: number | null }>;
  audit: Array<{ id: string; action: string; details: string; actorId: string; actorName: string; createdAt: number }>;
  status: "online" | "maintenance" | "offline";
  activity: string;
  system: { version: string; latencyMs: number; memoryMb: number; cpuPercent: number; uptimeMs: number };
}

const DURATION_OPTIONS = [
  { label: "Permanent", value: null },
  { label: "1 hour", value: 60 * 60 * 1000 },
  { label: "6 hours", value: 6 * 60 * 60 * 1000 },
  { label: "24 hours", value: 24 * 60 * 60 * 1000 },
  { label: "7 days", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "30 days", value: 30 * 24 * 60 * 60 * 1000 },
];

export function AdminView() {
  const adminUnlocked = useCadia((s) => s.adminUnlocked);
  const lockAdmin = useCadia((s) => s.lockAdmin);
  const user = useCadia((s) => s.user);
  const selectServerAsAdmin = useCadia((s) => s.selectServerAsAdmin);

  const [search, setSearch] = useState("");
  const [blacklistTarget, setBlacklistTarget] = useState<string | null>(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [blacklistDuration, setBlacklistDuration] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"servers" | "bot" | "updates" | "audit">("servers");
  const [botActivity, setBotActivity] = useState("/help | cadia.bot");
  const [serverAuthorized, setServerAuthorized] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
	const [updateTarget, setUpdateTarget] = useState<"guild" | "global">("guild");
	const [updateGuildId, setUpdateGuildId] = useState("");
	const [sendingUpdate, setSendingUpdate] = useState(false);
	const [updateEmbed, setUpdateEmbed] = useState({
		title: "Cadia Update",
		description: "",
		color: "#65b8da",
		url: "",
		authorName: "Cadia",
		authorIconUrl: "",
		footer: "Cadia Updates",
		footerIconUrl: "",
		thumbnailUrl: "",
		imageUrl: "",
		fields: [] as Array<{ name: string; value: string; inline: boolean }>,
		timestamp: true,
	});

  useEffect(() => {
    if (!adminUnlocked) {
      setServerAuthorized(false);
      return;
    }
    const controller = new AbortController();
    fetch("/api/admin/overview", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Admin session expired");
        const payload = await response.json();
        setOverview(payload);
        setBotActivity(payload.activity || "");
        setServerAuthorized(true);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        useCadia.setState({ adminUnlocked: false, view: "landing" });
      });
    return () => controller.abort();
  }, [adminUnlocked]);

  if (!adminUnlocked || !serverAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center cadia-bg p-4">
        <div className="cadia-card p-8 max-w-md text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="h-14 w-14 rounded-2xl bg-fail/15 border border-fail/40 flex items-center justify-center mx-auto mb-4"
          >
            <Lock className="h-7 w-7 text-fail" />
          </motion.div>
          <h2 className="text-lg font-bold text-fail mb-2">Access Denied</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Admin panel is restricted to authorized bot owners only.
          </p>
          <Button onClick={lockAdmin} className="cadia-btn bg-cadia text-background text-sm font-semibold">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  // Only show servers where the bot is actually in (dev doesn't need mutual servers)
  const botServers = overview?.guilds || [];
  const filtered = botServers.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.includes(search),
  );

  const totalServers = botServers.length;
  const totalMembers = botServers.reduce((sum, s) => sum + s.memberCount, 0);
  const totalBlacklisted = overview?.blacklisted.length || 0;
  const blacklistById = new Map((overview?.blacklisted || []).map((entry) => [entry.guildId, entry]));

  const handleBotStatusChange = async (status: "online" | "maintenance" | "offline") => {
    try {
      await runAdminAction("status", { status });
      setOverview((current) => current ? { ...current, status } : current);
      toast.success(`Bot status changed to ${status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update bot status");
    }
  };

  const handleActivityUpdate = async () => {
    try {
      await runAdminAction("activity", { activity: botActivity });
      setOverview((current) => current ? { ...current, activity: botActivity } : current);
      toast.success("Bot activity updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update bot activity");
    }
  };

  const handleOpenBlacklist = (serverId: string) => {
    setBlacklistTarget(serverId);
    setBlacklistReason("");
    setBlacklistDuration(null);
  };

  const handleConfirmBlacklist = async () => {
    if (!blacklistTarget) return;
    try {
      await runAdminAction("blacklist", {
        guildId: blacklistTarget,
        reason: blacklistReason.trim(),
        durationMs: blacklistDuration,
      });
      const server = botServers.find((s) => s.id === blacklistTarget);
      await refreshOverview();
      toast.success(`"${server?.name}" blacklisted`, {
        description: blacklistReason.trim() || "No reason provided",
      });
      setBlacklistTarget(null);
      setBlacklistReason("");
      setBlacklistDuration(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not blacklist server");
    }
  };

  const handleOpenServer = (serverId: string) => {
    const guild = botServers.find((entry) => entry.id === serverId);
    if (!guild) return;
    const server = toDashboardServer(guild);
    useCadia.setState((state) => ({
      servers: [...state.servers.filter((entry) => entry.id !== server.id), server],
    }));
    selectServerAsAdmin(serverId);
  };

	const handleSendUpdate = async () => {
		if (updateTarget === "guild" && !updateGuildId) return toast.error("Select a server first");
		setSendingUpdate(true);
		try {
			const report = await runAdminAction("send-update", {
				target: updateTarget,
				guildId: updateTarget === "guild" ? updateGuildId : undefined,
				embed: updateEmbed,
			});
			toast.success(`Update sent to ${report.sent} server${report.sent === 1 ? "" : "s"}`, {
				description: `${report.skipped} skipped, ${report.failed} failed`,
			});
			await refreshOverview();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Could not send update");
		} finally {
			setSendingUpdate(false);
		}
	};

  const adminLogs = overview?.audit.slice(0, 50) || [];

  const blacklistTargetServer = blacklistTarget
    ? botServers.find((s) => s.id === blacklistTarget)
    : null;

  async function runAdminAction(action: string, payload: object) {
    const response = await fetch("/api/admin/overview", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Admin action failed");
    return result;
  }

  async function refreshOverview() {
    const response = await fetch("/api/admin/overview", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not refresh admin data");
    setOverview(await response.json());
  }

  return (
    <div className="min-h-screen flex flex-col cadia-bg scanlines">
      <div className="cadia-particles" />

      {/* Header */}
      <header className="relative z-10 border-b border-rpg/40 px-4 py-3 flex items-center justify-between bg-rpg/10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <CadiaLogo size={36} animated={false} />
          <div>
            <span className="font-pixel text-sm text-rpg block tracking-wider">CADIA</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3 text-rpg" />
              Administration
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="text-[10px] font-semibold bg-rpg/20 text-rpg border border-rpg/50">
            <Shield className="h-3 w-3 mr-1" />
            AUTHORIZED
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {user?.username} ({user?.id})
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={lockAdmin}
            className="cadia-btn text-xs font-medium border-fail/50 text-fail hover:bg-fail/10"
          >
            <Lock className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Lock Panel</span>
          </Button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="relative z-10 flex items-center gap-1 px-4 py-2 border-b border-border/60 bg-card/30 backdrop-blur overflow-x-auto cadia-scroll">
        {([
          { id: "servers", label: "Servers", icon: ServerIcon },
          { id: "bot", label: "Bot Control", icon: Bot },
		  { id: "updates", label: "Send Update", icon: Megaphone },
          { id: "audit", label: "Admin Audit", icon: Terminal },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === t.id
                ? "bg-rpg/20 text-rpg border border-rpg/40"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <main className="relative z-10 flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Servers", value: totalServers, icon: ServerIcon, color: "#65b8da" },
              { label: "Members", value: totalMembers.toLocaleString(), icon: Users, color: "#3bb143" },
              { label: "Blacklisted", value: totalBlacklisted, icon: Ban, color: "#e94041" },
              { label: "Audit Events", value: overview?.audit.length || 0, icon: Activity, color: "#e9d502" },
              { label: "Status", value: overview?.status === "online" ? "Online" : overview?.status === "maintenance" ? "Maint" : "Offline", icon: Cpu, color: overview?.status === "online" ? "#3bb143" : overview?.status === "maintenance" ? "#e9d502" : "#e94041" },
              { label: "Uptime", value: formatUptime(overview?.system.uptimeMs || 0), icon: Clock, color: "#65b8da" },
            ].map((stat) => (
              <div key={stat.label} className="cadia-card cadia-card-hover p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <stat.icon className="h-3 w-3" style={{ color: stat.color }} />
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {stat.label}
                  </span>
                </div>
                <p className="text-lg font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* === Servers tab === */}
          {activeTab === "servers" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search servers by name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-sm h-9"
                />
              </div>

              {/* Server list */}
              <div className="cadia-card overflow-hidden flex flex-col">
                <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center justify-between shrink-0">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Bot Servers ({filtered.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Click a server to manage it directly
                  </span>
                </div>
                <div
                  className="overflow-y-auto cadia-scroll"
                  style={{ maxHeight: "60vh" }}
                >
                  {filtered.map((s) => {
                    const info = blacklistById.get(s.id);
                    const isBlacklisted = Boolean(info);
                    return (
                      <div
                        key={s.id}
                        className={`px-3 py-3 border-b border-border/40 last:border-b-0 transition-colors group ${
                          isBlacklisted ? "bg-fail/5" : "hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => !isBlacklisted && handleOpenServer(s.id)}
                            disabled={isBlacklisted}
                            className="flex items-center gap-3 flex-1 min-w-0 text-left disabled:cursor-not-allowed"
                          >
                            <div
                              className="h-11 w-11 shrink-0 flex items-center justify-center text-xs font-bold rounded-xl border-2"
                              style={{
                                background: s.iconUrl ? `url(${s.iconUrl}) center/cover` : "#65b8da",
                                color: "#0b0f14",
                                borderColor: "#65b8da",
                                opacity: isBlacklisted ? 0.5 : 1,
                              }}
                            >
                              {s.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-foreground truncate">
                                  {s.name}
                                </span>
                                {s.ownerId === user?.id && (
                                  <Crown className="h-3.5 w-3.5 text-warning shrink-0" />
                                )}
                                {s.premiumTier > 0 && (
                                  <Badge className="text-[9px] font-medium bg-warning/20 text-warning border border-warning/40 px-1.5 py-0">
                                    PREMIUM
                                  </Badge>
                                )}
                                {isBlacklisted && (
                                  <Badge className="text-[9px] font-medium bg-fail/20 text-fail border border-fail/40 px-1.5 py-0">
                                    BLACKLISTED
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                                <span>#{s.id}</span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-2.5 w-2.5" />
                                  {s.memberCount.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Globe className="h-2.5 w-2.5" />
                                  Boost tier {s.premiumTier}
                                </span>
                                <span>owner: {s.ownerId}</span>
                              </div>
                              {isBlacklisted && info && (
                                <div className="mt-1.5 p-2 rounded-md bg-fail/10 border border-fail/30">
                                  <p className="text-[10px] text-fail font-semibold">
                                    Reason: <span className="font-normal">{info.reason}</span>
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Blacklisted {new Date(info.blacklistedAt).toLocaleString()}
                                    {info.expiresAt
                                      ? ` · expires in ${Math.max(0, Math.round((info.expiresAt - Date.now()) / 3600000))}h`
                                      : " · permanent"}
                                  </p>
                                </div>
                              )}
                            </div>
                            {!isBlacklisted && (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground group-hover:text-cadia transition-colors shrink-0">
                                <span className="hidden sm:inline">Manage</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </button>

                          {/* Blacklist / Unban button */}
                          {!isBlacklisted ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenBlacklist(s.id)}
                              disabled={s.ownerId === user?.id}
                              className="cadia-btn text-[10px] font-medium h-7 border-fail/50 text-fail hover:bg-fail/10 shrink-0"
                              title={
                                s.ownerId === user?.id
                                  ? "Cannot blacklist your own server"
                                  : "Blacklist this server"
                              }
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Blacklist
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                void runAdminAction("unblacklist", { guildId: s.id })
                                  .then(refreshOverview)
                                  .then(() => toast.success(`"${s.name}" removed from blacklist`))
                                  .catch((error) => toast.error(error instanceof Error ? error.message : "Could not remove blacklist"));
                              }}
                              className="cadia-btn text-[10px] font-medium h-7 border-success/50 text-success hover:bg-success/10 shrink-0"
                            >
                              <ArrowLeft className="h-3 w-3 mr-1" />
                              Unban
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* === Bot Control tab === */}
          {activeTab === "bot" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="cadia-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Power className="h-4 w-4 text-rpg" />
                  <h3 className="text-sm font-semibold text-foreground">Bot Status</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "online", label: "Online", color: "#3bb143", desc: "Fully operational" },
                    { id: "maintenance", label: "Maintenance", color: "#e9d502", desc: "Read-only mode" },
                    { id: "offline", label: "Offline", color: "#e94041", desc: "Bot disabled" },
                  ] as const).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleBotStatusChange(s.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        overview?.status === s.id ? "border-current" : "border-border hover:border-cadia/30"
                      }`}
                      style={overview?.status === s.id ? { color: s.color, background: `${s.color}10` } : {}}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                        <span className="text-xs font-bold">{s.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="cadia-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-cadia" />
                  <h3 className="text-sm font-semibold text-foreground">Discord Activity</h3>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={botActivity}
                    onChange={(e) => setBotActivity(e.target.value)}
                    placeholder="e.g. /help | cadia.bot"
                    className="text-sm"
                  />
                  <Button
                    onClick={handleActivityUpdate}
                    className="cadia-btn bg-cadia text-background hover:bg-cadia-dark text-xs font-semibold"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Update
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  This is the &quot;Playing...&quot; status shown in Discord member lists.
                </p>
              </div>

              <div className="cadia-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu className="h-4 w-4 text-warning" />
                  <h3 className="text-sm font-semibold text-foreground">Runtime Health</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: "Version", value: `v${overview?.system.version || "unknown"}`, icon: Bot },
                    { label: "Latency", value: `${overview?.system.latencyMs ?? 0}ms`, icon: Wifi },
                    { label: "Memory", value: `${overview?.system.memoryMb ?? 0} MB`, icon: HardDrive },
                    { label: "CPU", value: `${overview?.system.cpuPercent ?? 0}%`, icon: Cpu },
                  ].map((m) => (
                    <div key={m.label} className="p-2 rounded-lg border border-border/60 bg-card/40">
                      <div className="flex items-center gap-1 mb-1">
                        <m.icon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{m.label}</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

		  {activeTab === "updates" && (
			<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
			  <div className="flex items-center justify-between gap-3">
				<div>
				  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
					<Megaphone className="h-4 w-4 text-rpg" /> Update Broadcast
				  </h2>
				  <p className="text-xs text-muted-foreground mt-1">Messages are delivered only to each server&apos;s configured update channel.</p>
				</div>
				<Button onClick={handleSendUpdate} disabled={sendingUpdate || (!updateEmbed.title.trim() && !updateEmbed.description.trim() && !updateEmbed.fields.some((field) => field.name.trim() && field.value.trim()))} className="cadia-btn bg-rpg text-background text-xs font-semibold">
				  <Send className="h-3.5 w-3.5 mr-1.5" /> {sendingUpdate ? "Sending..." : "Send Embed"}
				</Button>
			  </div>

			  <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4 items-start">
				<div className="cadia-card p-5 space-y-4">
				  <div className="grid sm:grid-cols-2 gap-3">
					<div className="space-y-1.5">
					  <Label className="text-xs">Destination</Label>
					  <select value={updateTarget} onChange={(event) => setUpdateTarget(event.target.value as "guild" | "global")} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
						<option value="guild">One server</option>
						<option value="global">All configured servers</option>
					  </select>
					</div>
					<div className="space-y-1.5">
					  <Label className="text-xs">Server</Label>
					  <select value={updateGuildId} disabled={updateTarget === "global"} onChange={(event) => setUpdateGuildId(event.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50">
						<option value="">Select a configured server...</option>
						{botServers.filter((guild) => guild.updateChannelId).map((guild) => <option key={guild.id} value={guild.id}>{guild.name}</option>)}
					  </select>
					</div>
				  </div>
				  <div className="grid sm:grid-cols-[1fr_110px] gap-3">
					<div className="space-y-1.5"><Label className="text-xs">Title</Label><Input maxLength={256} value={updateEmbed.title} onChange={(e) => setUpdateEmbed({ ...updateEmbed, title: e.target.value })} /></div>
					<div className="space-y-1.5"><Label className="text-xs">Color</Label><div className="flex gap-2"><Input type="color" value={updateEmbed.color} onChange={(e) => setUpdateEmbed({ ...updateEmbed, color: e.target.value })} className="w-11 px-1" /><Input value={updateEmbed.color} maxLength={7} onChange={(e) => setUpdateEmbed({ ...updateEmbed, color: e.target.value })} /></div></div>
				  </div>
				  <div className="space-y-1.5"><Label className="text-xs">Description</Label><Textarea rows={7} maxLength={4096} value={updateEmbed.description} onChange={(e) => setUpdateEmbed({ ...updateEmbed, description: e.target.value })} placeholder="Write the update message..." /><p className="text-[10px] text-muted-foreground text-right">{updateEmbed.description.length}/4096</p></div>
				  <div className="grid sm:grid-cols-2 gap-3">
					<div className="space-y-1.5"><Label className="text-xs">Author name</Label><Input maxLength={256} value={updateEmbed.authorName} onChange={(e) => setUpdateEmbed({ ...updateEmbed, authorName: e.target.value })} /></div>
					<div className="space-y-1.5"><Label className="text-xs">Author icon URL</Label><Input type="url" value={updateEmbed.authorIconUrl} onChange={(e) => setUpdateEmbed({ ...updateEmbed, authorIconUrl: e.target.value })} /></div>
					<div className="space-y-1.5"><Label className="text-xs">Footer</Label><Input maxLength={2048} value={updateEmbed.footer} onChange={(e) => setUpdateEmbed({ ...updateEmbed, footer: e.target.value })} /></div>
					<div className="space-y-1.5"><Label className="text-xs">Footer icon URL</Label><Input type="url" value={updateEmbed.footerIconUrl} onChange={(e) => setUpdateEmbed({ ...updateEmbed, footerIconUrl: e.target.value })} /></div>
					<div className="space-y-1.5"><Label className="text-xs">Thumbnail URL</Label><Input type="url" value={updateEmbed.thumbnailUrl} onChange={(e) => setUpdateEmbed({ ...updateEmbed, thumbnailUrl: e.target.value })} /></div>
					<div className="space-y-1.5"><Label className="text-xs">Large image URL</Label><Input type="url" value={updateEmbed.imageUrl} onChange={(e) => setUpdateEmbed({ ...updateEmbed, imageUrl: e.target.value })} /></div>
					<div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Title link URL</Label><Input type="url" value={updateEmbed.url} onChange={(e) => setUpdateEmbed({ ...updateEmbed, url: e.target.value })} /></div>
				  </div>
				  <div className="space-y-2">
					<div className="flex items-center justify-between"><Label className="text-xs">Fields ({updateEmbed.fields.length}/25)</Label><Button type="button" variant="outline" size="sm" disabled={updateEmbed.fields.length >= 25} onClick={() => setUpdateEmbed({ ...updateEmbed, fields: [...updateEmbed.fields, { name: "", value: "", inline: false }] })} className="h-7 text-[10px]"><Plus className="h-3 w-3 mr-1" /> Add field</Button></div>
					{updateEmbed.fields.map((field, index) => <div key={index} className="grid sm:grid-cols-[1fr_1.5fr_auto] gap-2 items-end border-t border-border/50 pt-2">
					  <div className="space-y-1"><Label className="text-[10px]">Name</Label><Input maxLength={256} value={field.name} onChange={(e) => setUpdateEmbed({ ...updateEmbed, fields: updateEmbed.fields.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item) })} /></div>
					  <div className="space-y-1"><Label className="text-[10px]">Value</Label><Input maxLength={1024} value={field.value} onChange={(e) => setUpdateEmbed({ ...updateEmbed, fields: updateEmbed.fields.map((item, itemIndex) => itemIndex === index ? { ...item, value: e.target.value } : item) })} /></div>
					  <div className="flex items-center gap-2 h-10"><label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={field.inline} onChange={(e) => setUpdateEmbed({ ...updateEmbed, fields: updateEmbed.fields.map((item, itemIndex) => itemIndex === index ? { ...item, inline: e.target.checked } : item) })} /> Inline</label><button type="button" title="Remove field" onClick={() => setUpdateEmbed({ ...updateEmbed, fields: updateEmbed.fields.filter((_, itemIndex) => itemIndex !== index) })} className="text-fail hover:bg-fail/10 rounded p-1"><Trash2 className="h-3.5 w-3.5" /></button></div>
					</div>)}
				  </div>
				  <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={updateEmbed.timestamp} onChange={(e) => setUpdateEmbed({ ...updateEmbed, timestamp: e.target.checked })} /> Include current timestamp</label>
				</div>

				<div className="lg:sticky lg:top-4 space-y-2">
				  <Label className="text-xs text-muted-foreground">Live Discord Preview</Label>
				  <div className="rounded-md bg-[#313338] p-4 text-[#dbdee1] shadow-xl">
					<div className="flex gap-3"><CadiaLogo size={40} animated={false} /><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-white">Cadia <span className="rounded bg-[#5865f2] px-1 py-0.5 text-[9px]">APP</span> <span className="text-xs font-normal text-[#949ba4]">Today at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
					  <div className="mt-1.5 max-w-[520px] rounded-sm bg-[#2b2d31] p-3 relative overflow-hidden" style={{ borderLeft: `4px solid ${/^#[0-9a-f]{6}$/i.test(updateEmbed.color) ? updateEmbed.color : "#65b8da"}` }}>
						{updateEmbed.thumbnailUrl && <img src={updateEmbed.thumbnailUrl} alt="" className="float-right ml-3 h-20 w-20 rounded object-cover" />}
						{updateEmbed.authorName && <div className="flex items-center gap-1.5 text-xs font-semibold text-white mb-2">{updateEmbed.authorIconUrl && <img src={updateEmbed.authorIconUrl} alt="" className="h-5 w-5 rounded-full object-cover" />}{updateEmbed.authorName}</div>}
						{updateEmbed.title && <div className="text-sm font-semibold text-white mb-1 break-words">{updateEmbed.title}</div>}
						<div className="text-sm whitespace-pre-wrap break-words">{updateEmbed.description || "Your embed description will appear here."}</div>
						{updateEmbed.fields.length > 0 && <div className="clear-both grid grid-cols-3 gap-x-3 gap-y-2 mt-3">{updateEmbed.fields.filter((field) => field.name || field.value).map((field, index) => <div key={index} className={field.inline ? "col-span-1" : "col-span-3"}><div className="text-xs font-semibold text-white break-words">{field.name || "Field name"}</div><div className="text-xs whitespace-pre-wrap break-words">{field.value || "Field value"}</div></div>)}</div>}
						{updateEmbed.imageUrl && <img src={updateEmbed.imageUrl} alt="Embed preview" className="mt-3 max-h-72 w-full rounded object-cover" />}
						{(updateEmbed.footer || updateEmbed.timestamp) && <div className="clear-both flex items-center gap-1.5 mt-3 text-[10px] text-[#b5bac1]">{updateEmbed.footerIconUrl && <img src={updateEmbed.footerIconUrl} alt="" className="h-4 w-4 rounded-full object-cover" />}{updateEmbed.footer}{updateEmbed.footer && updateEmbed.timestamp ? " • " : ""}{updateEmbed.timestamp ? "Today" : ""}</div>}
					  </div>
					</div></div>
				  </div>
				  <p className="text-[10px] text-muted-foreground">{botServers.filter((guild) => guild.updateChannelId).length} of {botServers.length} servers have an update channel configured.</p>
				</div>
			  </div>
			</motion.div>
		  )}

          {/* === Audit tab === */}
          {activeTab === "audit" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="cadia-card overflow-hidden flex flex-col"
            >
              <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center justify-between shrink-0">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-rpg" />
                  Administrative Activity
                </span>
                <span className="text-[11px] text-muted-foreground">{adminLogs.length} entries</span>
              </div>
              <div
                className="overflow-y-auto cadia-scroll"
                style={{ maxHeight: "60vh" }}
              >
                {adminLogs.length === 0 ? (
                  <div className="p-8 text-center">
                    <Terminal className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No administrative activity recorded yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {adminLogs.map((l) => (
                      <div key={l.id} className="px-3 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-rpg/15 border border-rpg/40 text-rpg mt-0.5">
                            <Shield className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-foreground">{l.action}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                                {new Date(l.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-foreground/80 mt-1">{l.details}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              by <span className="text-rpg">{l.actorName}</span> ({l.actorId})
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* Blacklist Modal */}
      <Dialog
        open={blacklistTarget !== null}
        onOpenChange={(o) => !o && setBlacklistTarget(null)}
      >
        <DialogContent className="max-w-md border-fail/40 p-0 overflow-hidden bg-card backdrop-blur-xl shadow-2xl">
          <div className="h-1 bg-gradient-to-r from-fail via-rpg to-fail" />
          <DialogHeader className="px-5 pt-4 pb-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-fail">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="h-7 w-7 rounded-lg bg-fail/15 border border-fail/40 flex items-center justify-center"
              >
                <Ban className="h-4 w-4" />
              </motion.div>
              Blacklist Server
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 pb-5 space-y-4">
            {blacklistTargetServer && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
                <div
                  className="h-10 w-10 shrink-0 flex items-center justify-center text-xs font-bold rounded-xl border-2"
                  style={{
                    background: blacklistTargetServer.iconUrl ? `url(${blacklistTargetServer.iconUrl}) center/cover` : "#65b8da",
                    color: "#0b0f14",
                    borderColor: "#65b8da",
                  }}
                >
                  {blacklistTargetServer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {blacklistTargetServer.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    #{blacklistTargetServer.id} · {blacklistTargetServer.memberCount.toLocaleString()} members
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason</Label>
              <Textarea
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                placeholder="Why is this server being blacklisted? (visible in audit log)"
                rows={3}
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                The reason is recorded in the audit log and visible to other owners.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Duration (optional)</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setBlacklistDuration(opt.value)}
                    className={`px-2 py-1.5 rounded-md border text-[11px] font-medium transition-all ${
                      blacklistDuration === opt.value
                        ? "bg-fail/20 text-fail border-fail/50"
                        : "bg-card/50 text-muted-foreground border-border hover:text-foreground hover:border-fail/30"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                If a duration is set, the server is automatically unblacklisted when it expires.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBlacklistTarget(null)}
                className="flex-1 cadia-btn text-sm font-medium h-10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmBlacklist}
                className="flex-1 cadia-btn bg-fail text-white hover:bg-fail/90 text-sm font-semibold h-10"
              >
                <Ban className="h-3.5 w-3.5 mr-1.5" />
                Confirm Blacklist
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
