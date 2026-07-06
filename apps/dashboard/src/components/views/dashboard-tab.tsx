"use client";

import { useEffect, useState } from "react";
import { useCadia } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Hash,
  Settings2,
  Check,
  ChevronsUpDown,
  X,
  Calendar,
  Zap,
  MessageSquare,
  Shield,
  Bot,
  Terminal,
  Save,
  Bell,
  Activity,
  History,
} from "lucide-react";
import { toast } from "sonner";

function formatDuration(ts: number): string {
  const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = (days / 365).toFixed(1);
  return `${years}y`;
}

function timeAgo(ts: number, now: number): string {
  if (!Number.isFinite(ts)) return "Unknown";
  const timestamp = ts > 0 && ts < 1_000_000_000_000 ? ts * 1000 : ts;
  const s = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (s < 5) return "Just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Split log details into the main description and a reason (if present). */
function splitDetails(details: string): { main: string; reason: string | null } {
  const reasonMatch = details.match(/—\s*reason:\s*(.+?)$/i) || details.match(/\breason:\s*(.+?)$/i);
  if (reasonMatch) {
    const main = details.replace(reasonMatch[0], "").replace(/—\s*$/, "").trim();
    return { main, reason: reasonMatch[1].trim() };
  }
  return { main: details, reason: null };
}

export function DashboardTab() {
  const server = useCadia((s) => s.selectedServer);
  const user = useCadia((s) => s.user);
  const toggleRole = useCadia((s) => s.toggleRoleManageCadia);
  const saveBotSettings = useCadia((s) => s.saveBotSettings);
  const addLog = useCadia((s) => s.addLog);
  const allLogs = useCadia((s) => s.logs);

  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [prefixInput, setPrefixInput] = useState(server?.botPrefix ?? "!");
  const [nicknameInput, setNicknameInput] = useState(server?.botNickname ?? "Cadia");
  const [isSavingBotConfig, setIsSavingBotConfig] = useState(false);
  const [updateChannelId, setUpdateChannelId] = useState<string | null>(
    server?.updateChannelId ?? server?.channels.find((c) => c.name === server.updatesChannel)?.id ?? null,
  );
  const [channelPickerOpen, setChannelPickerOpen] = useState(false);
  const [serverIconFailed, setServerIconFailed] = useState(false);
	const [activityClock, setActivityClock] = useState(() => Date.now());

	useEffect(() => {
		const timer = window.setInterval(() => setActivityClock(Date.now()), 1_000);
		return () => window.clearInterval(timer);
	}, []);

  const isAdminUnlocked = useCadia((s) => s.adminUnlocked);
  if (!server || (!user && !isAdminUnlocked)) return null;

  const effectiveUser = user || {
    id: "899385550585364481",
    username: "owner",
    discriminator: "0",
    globalName: "Owner",
    avatar: "#5e3a6d",
  };

  const sortedRoles = [...server.roles].sort((a, b) => b.position - a.position);
  const selectableRoles = sortedRoles.filter(
    (r) => r.name !== "@everyone" && r.name.toLowerCase() !== "bot",
  );
  const managerRoles = server.roles.filter((r) => r.canManageCadia);

  // Only text channels for the update channel dropdown
  const textChannels = server.channels.filter((c) => c.type === "text");
  const selectedChannel = server.channels.find((c) => c.id === updateChannelId);

  const recentLogs = allLogs
    .filter(
      (l) =>
        l.serverId === server.id &&
        l.type !== "botstatus" &&
        l.type !== "system",
    )
    .slice(0, 6);

  const handleToggleRole = (roleId: string) => {
    toggleRole(roleId);
  };

  const handleClearAllRoles = () => {
    managerRoles.forEach((r) => {
      if (r.canManageCadia) toggleRole(r.id);
    });
    addLog({
      type: "audit",
      serverId: server.id,
      serverName: server.name,
      actor: effectiveUser.username,
      actorId: effectiveUser.id,
      action: "Cleared all Cadia manager roles",
      details: "All roles removed from Cadia managers list",
    });
  };

  const handleSaveBotConfig = async () => {
    setIsSavingBotConfig(true);
    try {
      if (hasBotConfigChanges) {
        await saveBotSettings(prefixInput, nicknameInput, updateChannelId);
        const savedServer = useCadia.getState().selectedServer;
        if (savedServer) {
          setPrefixInput(savedServer.botPrefix);
          setNicknameInput(savedServer.botNickname);
        }
      }

      const newChannelName = selectedChannel?.name ?? null;
      const currentServer = useCadia.getState().selectedServer;
      if (currentServer && newChannelName !== server.updatesChannel) {
        addLog({
          type: "audit",
          serverId: currentServer.id,
          serverName: currentServer.name,
          actor: effectiveUser.username,
          actorId: effectiveUser.id,
          action: "Updated update channel",
          details: `Update channel set to '${newChannelName || "(none)"}'`,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update bot configuration");
    } finally {
      setIsSavingBotConfig(false);
    }
  };

  const hasBotConfigChanges =
    prefixInput !== server.botPrefix ||
    nicknameInput !== server.botNickname ||
    updateChannelId !== (server.updateChannelId ?? server.channels.find((c) => c.name === server.updatesChannel)?.id ?? null);

  return (
    <div className="space-y-5">
      {/* Header — reduced (no online %, no region) */}
      <div className="cadia-card cadia-card-hover p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div
            className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 flex items-center justify-center text-base sm:text-lg font-bold rounded-2xl border-2 overflow-hidden"
            style={{
              background: isImageUrl(server.icon) ? "#65b8da" : server.icon,
              color: "#0b0f14",
              borderColor: isImageUrl(server.icon) ? "rgba(101,184,218,.7)" : server.icon,
            }}
          >
            {(!isImageUrl(server.icon) || serverIconFailed) && server.name.slice(0, 2).toUpperCase()}
            {isImageUrl(server.icon) && !serverIconFailed && (
              <img
                src={server.icon}
                alt={`${server.name} icon`}
                className="h-full w-full object-cover"
                decoding="async"
                onError={() => setServerIconFailed(true)}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <h1 className="text-lg sm:text-xl font-bold text-foreground break-words">
                {server.name}
              </h1>
              {server.premium && (
                <span className="cadia-server-premium-tag">
                  <span className="relative z-10">Premium</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {server.memberCount.toLocaleString()} total
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDuration(server.createdAt)} old
              </span>
              <span className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                Cadia joined {formatDuration(server.botJoinedAt)} ago
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats — 4 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Zap, label: "Boost Level", value: `Lvl ${server.boostLevel}`, sub: `${server.boostCount} boosts` },
          { icon: MessageSquare, label: "Channels", value: server.channelCount, sub: `${server.textChannelCount} text` },
          { icon: Settings2, label: "Roles", value: `${managerRoles.length} selected`, sub: `${server.roles.length} total` },
          { icon: Shield, label: "Verification", value: server.verificationLevel, sub: server.twoFactorRequired ? "2FA required" : "2FA optional" },
        ].map((stat) => (
          <div key={stat.label} className="cadia-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon className="h-3 w-3 text-cadia" />
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
                {stat.label}
              </span>
            </div>
            <p className="text-base font-bold text-foreground truncate">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Bot Configuration */}
      <div className="cadia-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-6 rounded-md flex items-center justify-center border bg-cadia/20 border-cadia/40 text-cadia">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Bot Configuration</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Prefix */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Terminal className="h-3 w-3 text-cadia" />
              Command Prefix
            </Label>
            <Input
              type="text"
              value={prefixInput}
              onChange={(e) => setPrefixInput(e.target.value.slice(0, 8))}
              placeholder="!"
              maxLength={8}
              className="font-mono text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              For prefix commands (e.g. <code className="font-mono text-cadia">{prefixInput || "?"}help</code>)
            </p>
          </div>

          {/* Nickname */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Bot className="h-3 w-3 text-cadia" />
              Bot Nickname
            </Label>
            <Input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value.slice(0, 32))}
              placeholder="Cadia"
              maxLength={32}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              How Cadia appears in the member list
            </p>
          </div>

          {/* Update Channel — single-select dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Bell className="h-3 w-3 text-cadia" />
              Update Channel
            </Label>
            <Popover open={channelPickerOpen} onOpenChange={setChannelPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="button"
                  aria-expanded={channelPickerOpen}
                  className="w-full justify-between font-normal h-9 bg-card/50"
                >
                  {selectedChannel ? (
                    <span className="flex items-center gap-1.5 text-sm truncate">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      {selectedChannel.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">Select a channel…</span>
                  )}
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 max-w-[300px]" align="start">
                <Command>
                  <CommandInput placeholder="Search channels…" />
                  <CommandList>
                    <CommandEmpty>No channels found.</CommandEmpty>
                    <CommandGroup>
                      {textChannels.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={() => {
                            setUpdateChannelId(c.id);
                            setChannelPickerOpen(false);
                          }}
                          className="gap-2"
                        >
                          <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-sm flex-1">{c.name}</span>
                          {c.id === updateChannelId && (
                            <Check className="h-3.5 w-3.5 text-cadia" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-[10px] text-muted-foreground">
              Where Cadia sends updates &amp; owner notices
            </p>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button
            onClick={handleSaveBotConfig}
            disabled={!hasBotConfigChanges || !prefixInput.length || isSavingBotConfig}
            className="cadia-btn bg-cadia text-background hover:bg-cadia-dark text-sm font-semibold"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {isSavingBotConfig ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>

      {/* Role management — selected roles shown inside the selection menu */}
      <div className="cadia-card p-5">
        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-cadia" />
            <h3 className="text-sm font-semibold text-foreground">
              Cadia Manager Roles
            </h3>
            <span className="text-[10px] text-muted-foreground bg-muted/50 border border-border/50 px-2 py-0.5 rounded-md">
              {managerRoles.length} Selected · {server.roles.length} Total Roles
            </span>
          </div>
          {managerRoles.length > 0 && (
            <button
              onClick={handleClearAllRoles}
              className="text-[11px] text-muted-foreground hover:text-fail transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Choose which roles can manage Cadia through this dashboard. Members
          must hold one of these roles (or have Administrator / Manage Server)
          to control the bot.
        </p>

        <Popover open={rolePickerOpen} onOpenChange={setRolePickerOpen}>
          <PopoverTrigger asChild>
            <div
              role="button"
              aria-expanded={rolePickerOpen}
              tabIndex={0}
              className="w-full justify-between font-normal h-auto min-h-[44px] bg-card/50 border border-input rounded-md px-3 py-2 flex items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring transition-colors hover:bg-card"
            >
              {managerRoles.length === 0 ? (
                <span className="text-muted-foreground py-1.5 text-sm">
                  Restricted to Administrator by default — select roles to grant access
                </span>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap py-1.5">
                  {managerRoles.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border"
                      style={{
                        background: `${r.color}20`,
                        color: r.color,
                        borderColor: `${r.color}40`,
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: r.color }}
                      />
                      {r.name}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRole(r.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            e.preventDefault();
                            handleToggleRole(r.id);
                          }
                        }}
                        className="ml-0.5 opacity-60 hover:opacity-100 cursor-pointer inline-flex"
                        aria-label={`Remove ${r.name}`}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </span>
                  ))}
                </div>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="p-0 max-w-[400px]" align="start">
            <Command>
              <CommandInput placeholder="Search roles…" />
              <CommandList>
                <CommandEmpty>No roles found.</CommandEmpty>
                <CommandGroup>
                  {selectableRoles.map((r) => {
                    const selected = r.canManageCadia;
                    return (
                      <CommandItem
                        key={r.id}
                        value={r.name}
                        onSelect={() => handleToggleRole(r.id)}
                        className="gap-2"
                      >
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            selected
                              ? "bg-cadia border-cadia"
                              : "border-border"
                          }`}
                        >
                          {selected && (
                            <Check className="h-3 w-3 text-background" />
                          )}
                        </div>
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: r.color }}
                        />
                        <span className="text-sm flex-1">{r.name}</span>
                        {r.permissions.includes("ADMINISTRATOR") && (
                          <Badge className="text-[8px] font-medium bg-fail/20 text-fail border border-fail/40 px-1 py-0">
                            ADMIN
                          </Badge>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Recent Activity — scrollable container */}
      <div className="cadia-card overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border/40 shrink-0">
          <div className="h-6 w-6 rounded-md flex items-center justify-center border bg-warning/20 border-warning/40 text-warning">
            <History className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {recentLogs.length} event{recentLogs.length === 1 ? "" : "s"}
          </span>
        </div>
        {recentLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No recent activity.
          </p>
        ) : (
          <div
            className="overflow-y-auto cadia-scroll"
            style={{ maxHeight: "280px" }}
          >
            <div className="divide-y divide-border/40">
              {recentLogs.map((l) => {
                const { main, reason } = splitDetails(l.details);
                return (
                  <div key={l.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-5 w-5 shrink-0 rounded-md bg-warning/15 border border-warning/30 text-warning flex items-center justify-center">
                        <Activity className="h-2.5 w-2.5" />
                      </div>
                      <span className="text-xs font-medium text-foreground truncate">
                        {l.action}
                      </span>
                      <span
                        className="text-[10px] text-muted-foreground/60 ml-auto shrink-0"
                        title={new Date(l.timestamp).toLocaleString()}
                      >
						{timeAgo(Number(l.timestamp), activityClock)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed pl-7 break-words">
                      {main}
                    </p>
                    {reason && (
                      <p className="text-[11px] text-warning/90 leading-relaxed pl-7 mt-0.5">
                        <span className="font-semibold">Reason:</span> {reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function isImageUrl(value?: string | null): value is string {
  return Boolean(value && /^https?:\/\//i.test(value));
}
