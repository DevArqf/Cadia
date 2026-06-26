"use client";

import { useState } from "react";
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
} from "lucide-react";
import { MOCK_SERVERS } from "@/lib/mock-data";
import { toast } from "sonner";

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
  const blacklistServer = useCadia((s) => s.blacklistServer);
  const unblacklistServer = useCadia((s) => s.unblacklistServer);
  const blacklistedIds = useCadia((s) => s.blacklistedServerIds);
  const blacklistInfo = useCadia((s) => s.blacklistInfo);
  const user = useCadia((s) => s.user);
  const allLogs = useCadia((s) => s.logs);
  const addLog = useCadia((s) => s.addLog);
  const selectServerAsAdmin = useCadia((s) => s.selectServerAsAdmin);

  const [search, setSearch] = useState("");
  const [blacklistTarget, setBlacklistTarget] = useState<string | null>(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [blacklistDuration, setBlacklistDuration] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"servers" | "bot" | "audit">("servers");
  const [botActivity, setBotActivity] = useState("/help | cadia.bot");
  const globalBotStatus = useCadia((s) => s.globalBotStatus);
  const setGlobalBotStatus = useCadia((s) => s.setGlobalBotStatus);

  if (!adminUnlocked) {
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
  const botServers = MOCK_SERVERS.filter((s) => s.botInServer);
  const filtered = botServers.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.includes(search),
  );

  const totalServers = botServers.length;
  const totalMembers = botServers.reduce((sum, s) => sum + s.memberCount, 0);
  const totalBlacklisted = blacklistedIds.length;

  const handleBotStatusChange = (status: "online" | "maintenance" | "offline") => {
    setGlobalBotStatus(status);
    toast.success(`Bot status changed to ${status}`);
  };

  const handleActivityUpdate = () => {
    addLog({
      type: "audit",
      serverId: "-",
      serverName: "-",
      actor: user?.username || "owner",
      actorId: user?.id || "0",
      action: "Updated bot activity",
      details: `Activity: ${botActivity}`,
    });
    toast.success("Bot activity updated");
  };

  const handleOpenBlacklist = (serverId: string) => {
    setBlacklistTarget(serverId);
    setBlacklistReason("");
    setBlacklistDuration(null);
  };

  const handleConfirmBlacklist = () => {
    if (!blacklistTarget) return;
    blacklistServer(blacklistTarget, blacklistReason.trim(), blacklistDuration);
    const server = MOCK_SERVERS.find((s) => s.id === blacklistTarget);
    toast.success(`"${server?.name}" blacklisted`, {
      description: blacklistReason.trim() || "No reason provided",
    });
    setBlacklistTarget(null);
    setBlacklistReason("");
    setBlacklistDuration(null);
  };

  const handleOpenServer = (serverId: string) => {
    selectServerAsAdmin(serverId);
  };

  const adminLogs = allLogs
    .filter(
      (l) =>
        l.type === "audit" &&
        (l.action.includes("admin") ||
          l.action.includes("Blacklist") ||
          l.action.includes("admin login") ||
          l.action.includes("Owner") ||
          l.action.includes("Failed") ||
          l.action.includes("Bot status") ||
          l.action.includes("bot activity") ||
          l.action.includes("Unblacklist")),
    )
    .slice(0, 12);

  const blacklistTargetServer = blacklistTarget
    ? MOCK_SERVERS.find((s) => s.id === blacklistTarget)
    : null;

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
              Owner Control Panel
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="text-[10px] font-semibold bg-rpg/20 text-rpg border border-rpg/50">
            <Shield className="h-3 w-3 mr-1" />
            ROOT
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
              { label: "Log Events", value: allLogs.length, icon: Activity, color: "#e9d502" },
              { label: "Status", value: globalBotStatus === "online" ? "Online" : globalBotStatus === "maintenance" ? "Maint" : "Offline", icon: Cpu, color: globalBotStatus === "online" ? "#3bb143" : globalBotStatus === "maintenance" ? "#e9d502" : "#e94041" },
              { label: "Uptime", value: "99.9%", icon: Clock, color: "#65b8da" },
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
                  placeholder="Search servers by name or ID…"
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
                    const isBlacklisted = blacklistedIds.includes(s.id);
                    const info = blacklistInfo[s.id];
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
                                background: s.icon,
                                color: "#0b0f14",
                                borderColor: s.icon,
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
                                {s.premium && (
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
                                  {s.region}
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
                                    {info.durationMs
                                      ? ` · expires in ${Math.max(0, Math.round((info.blacklistedAt + info.durationMs - Date.now()) / 3600000))}h`
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
                                unblacklistServer(s.id);
                                toast.success(`"${s.name}" removed from blacklist`);
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
                        globalBotStatus === s.id ? "border-current" : "border-border hover:border-cadia/30"
                      }`}
                      style={globalBotStatus === s.id ? { color: s.color, background: `${s.color}10` } : {}}
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
                  <h3 className="text-sm font-semibold text-foreground">Bot Activity Message</h3>
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
                  This is the &quot;Playing…&quot; status shown in Discord member lists.
                </p>
              </div>

              <div className="cadia-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu className="h-4 w-4 text-warning" />
                  <h3 className="text-sm font-semibold text-foreground">System Info</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: "Version", value: "v2.4.1", icon: Bot },
                    { label: "Latency", value: "62ms", icon: Wifi },
                    { label: "Memory", value: "248 MB", icon: HardDrive },
                    { label: "CPU", value: "12%", icon: Cpu },
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
                  Admin Action History
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
                    <p className="text-sm text-muted-foreground">No admin actions recorded yet</p>
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
                                {new Date(l.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-foreground/80 mt-1">{l.details}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              by <span className="text-rpg">{l.actor}</span> ({l.actorId})
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
                    background: blacklistTargetServer.icon,
                    color: "#0b0f14",
                    borderColor: blacklistTargetServer.icon,
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
