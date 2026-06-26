"use client";

import { create } from "zustand";
import { toast } from "sonner";
import type {
  View,
  DashboardTab,
  DiscordUser,
  DiscordServer,
  BotModule,
  LogEntry,
  BotStatus,
} from "./types";
import {
  MOCK_USER,
  MOCK_SERVERS,
  DEFAULT_MODULES,
  INITIAL_LOGS,
  BOT_OWNER_IDS,
} from "./mock-data";

interface CadiaState {
  // view state
  view: View;
  isAuthenticating: boolean;

  // auth
  user: DiscordUser | null;

  // selected server + its modules (deep clone for editing)
  servers: DiscordServer[];
  selectedServer: DiscordServer | null;
  modules: BotModule[];
  logs: LogEntry[];

  // dashboard navigation
  activeTab: DashboardTab;
  activeModuleId: string | null;

  // admin panel
  adminUnlocked: boolean;
  adminConsoleOpen: boolean;
  blacklistedServerIds: string[];
  blacklistInfo: Record<string, { reason: string; durationMs: number | null; blacklistedAt: number }>;
  globalBotStatus: BotStatus;

  // unsaved changes tracking
  hasUnsavedChanges: boolean;

  // actions
  setView: (v: View) => void;
  startLogin: () => void;
  loadDashboardSession: () => Promise<void>;
  loadBotStatus: () => Promise<void>;
  finishLogin: (redirectView?: View) => void;
  logout: () => void;

  selectServer: (id: string) => void;
  selectServerAsAdmin: (id: string) => void;
  clearSelectedServer: () => void;

  setTab: (t: DashboardTab) => void;
  setActiveModule: (id: string | null) => void;
  markChanged: () => void;
  saveConfig: () => void;
  pendingTab: DashboardTab | null;
  setPendingTab: (t: DashboardTab | null) => void;
  legalPage: "tos" | "faq" | "privacy" | null;
  setLegalPage: (p: "tos" | "faq" | "privacy" | null) => void;

  toggleModule: (moduleId: string) => void;
  updateModule: (moduleId: string, patch: Partial<BotModule>) => void;
  toggleCommand: (moduleId: string, commandId: string) => void;
  updateCommand: (moduleId: string, commandId: string, patch: Partial<BotModule["commands"][number]>) => void;

  toggleRoleManageCadia: (roleId: string) => void;
  updateBotPrefix: (prefix: string) => void;

  addLog: (entry: Omit<LogEntry, "id" | "timestamp">) => void;

  openAdminConsole: () => void;
  closeAdminConsole: () => void;
  attemptAdminLogin: (userId: string, password: string) => boolean;
  lockAdmin: () => void;
  setGlobalBotStatus: (status: BotStatus) => void;
  blacklistServer: (id: string, reason: string, durationMs: number | null) => void;
  unblacklistServer: (id: string) => void;

  // helpers
  isOwner: (userId?: string) => boolean;
  visibleServers: () => DiscordServer[];
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export const useCadia = create<CadiaState>((set, get) => ({
  view: "landing",
  isAuthenticating: false,
  user: null,
  servers: [],
  selectedServer: null,
  modules: [],
  logs: INITIAL_LOGS,
  activeTab: "dashboard",
  activeModuleId: null,
  pendingTab: null,
  legalPage: null,
  adminUnlocked: false,
  adminConsoleOpen: false,
  blacklistedServerIds: [],
  blacklistInfo: {},
  globalBotStatus: "online",
  hasUnsavedChanges: false,

  setView: (v) => set({ view: v }),

  startLogin: () => {
    set({ isAuthenticating: true });
    if (typeof window !== "undefined") {
      window.location.href = "/api/auth/signin/discord?callbackUrl=/";
    }
  },

  loadDashboardSession: async () => {
    try {
      const meResponse = await fetch("/api/me", { cache: "no-store" });
      if (!meResponse.ok) return;
      const me = await meResponse.json();
      const serversResponse = await fetch("/api/servers", { cache: "no-store" });
      const serversPayload = serversResponse.ok ? await serversResponse.json() : { servers: [] };
      set({
        user: me.user,
        servers: serversPayload.servers || [],
        isAuthenticating: false,
        view: "server-select",
      });
    } catch {
      set({ isAuthenticating: false });
    }
  },

  loadBotStatus: async () => {
    try {
      const response = await fetch("/api/bot-status", { cache: "no-store" });
      const payload = await response.json();
      set({ globalBotStatus: payload.status === "online" ? "online" : "offline" });
    } catch {
      set({ globalBotStatus: "offline" });
    }
  },

  finishLogin: (redirectView) => {
    // Simulate Discord OAuth callback. In production this hits /api/auth/discord.
    // redirectView lets the caller choose where to land after login
    // (default: server-select, but e.g. "premium" for the Get Premium flow).
    set({
      user: MOCK_USER,
      isAuthenticating: false,
      view: redirectView || "server-select",
    });
    const u = MOCK_USER;
    get().addLog({
      type: "audit",
      serverId: "-",
      serverName: "-",
      actor: u.username,
      actorId: u.id,
      action: "Logged in",
      details: "User authenticated via Discord OAuth",
    });
  },

  logout: () =>
    set({
      user: null,
      view: "landing",
      servers: [],
      selectedServer: null,
      modules: [],
      activeTab: "dashboard",
      adminUnlocked: false,
    }),

  selectServer: (id) => {
    const all = get().servers.length ? get().servers : MOCK_SERVERS;
    const server = all.find((s) => s.id === id) || null;
    if (!server) return;
    // Only allow if user can manage
    if (!server.userCanManage) return;

    // If blacklisted, still set the server so the dashboard can show
    // the blacklist fallback page
    if (get().blacklistedServerIds.includes(id)) {
      set({
        selectedServer: clone(server),
        modules: [],
        activeTab: "dashboard",
        activeModuleId: null,
        view: "dashboard",
      });
      return;
    }

    // If bot isn't in server, we redirect to invite link (handled in UI)
    if (!server.botInServer) {
      set({ selectedServer: server });
      if (typeof window !== "undefined") {
        window.location.href = `/api/invite?guild_id=${encodeURIComponent(server.id)}`;
      }
      return;
    }

    // Deep-clone modules for editing per-server
    // Apply pending tab if set (e.g. user clicked "Bot Commands" from footer)
    const pending = get().pendingTab;
    set({
      selectedServer: clone(server),
      modules: clone(DEFAULT_MODULES),
      activeTab: pending || "dashboard",
      activeModuleId: null,
      pendingTab: null,
      view: "dashboard",
    });
  },

  selectServerAsAdmin: (id) => {
    // Guard against double-calls
    if (get().view === "dashboard" && get().selectedServer?.id === id) return;
    const all = get().servers.length ? get().servers : MOCK_SERVERS;
    const server = all.find((s) => s.id === id) || null;
    if (!server) return;
    // Admin/owner bypasses permission + blacklist filters
    // Only require that the bot is actually in the server
    if (!server.botInServer) return;

    set({
      selectedServer: clone(server),
      modules: clone(DEFAULT_MODULES),
      activeTab: "dashboard",
      activeModuleId: null,
      view: "dashboard",
    });
    get().addLog({
      type: "audit",
      serverId: server.id,
      serverName: server.name,
      actor: get().user?.username || "owner",
      actorId: get().user?.id || "0",
      action: "Owner opened server dashboard",
      details: `Owner accessed dashboard for '${server.name}' (${server.id}) via admin panel`,
    });
  },

  clearSelectedServer: () => {
    // If admin is unlocked (came from admin panel), return there instead of server-select
    const targetView = get().adminUnlocked ? "admin" : "server-select";
    set({
      selectedServer: null,
      modules: [],
      activeModuleId: null,
      hasUnsavedChanges: false,
      view: targetView,
    });
  },

  setTab: (t) => set({ activeTab: t, activeModuleId: null }),
  setActiveModule: (id) => set({ activeModuleId: id }),

  markChanged: () => set({ hasUnsavedChanges: true }),

  saveConfig: () => {
    set({ hasUnsavedChanges: false });
    const server = get().selectedServer;
    if (server) {
      get().addLog({
        type: "config",
        serverId: server.id,
        serverName: server.name,
        actor: get().user?.username || "unknown",
        actorId: get().user?.id || "0",
        action: "Saved configuration",
        details: `${server.name} configuration saved by ${get().user?.username || "unknown"}`,
      });
    }
  },
  setPendingTab: (t) => set({ pendingTab: t }),
  setLegalPage: (p) => set({ legalPage: p, view: p ? "legal" : "landing" }),

  toggleModule: (moduleId) => {
    const modules = get().modules.map((m) =>
      m.id === moduleId ? { ...m, enabled: !m.enabled } : m,
    );
    set({ modules, hasUnsavedChanges: true });
    const m = modules.find((x) => x.id === moduleId);
    const server = get().selectedServer;
    if (m && server) {
      const action = m.enabled ? "Enabled" : "Disabled";
      toast.success(`${action} ${m.name} module`, {
        description: "Remember to save your changes",
      });
      get().addLog({
        type: "config",
        serverId: server.id,
        serverName: server.name,
        actor: get().user?.username || "unknown",
        actorId: get().user?.id || "0",
        action: m.enabled ? "Enabled module" : "Disabled module",
        details: `${m.name} module ${m.enabled ? "enabled" : "disabled"} by ${get().user?.username || "unknown"}`,
      });
    }
  },

  updateModule: (moduleId, patch) => {
    const modules = get().modules.map((m) =>
      m.id === moduleId ? { ...m, ...patch } : m,
    );
    set({ modules, hasUnsavedChanges: true });
    const server = get().selectedServer;
    if (server) {
      const m = modules.find((x) => x.id === moduleId);
      const keys = Object.keys(patch);
      const changes = keys.map((k) => {
        if (k === "cooldown") return `Set ${k} to ${patch[k]}s`;
        if (k === "enabled") return `${patch[k] ? "Enabled" : "Disabled"} module`;
        if (k === "responseTemplate") return `Edited response template`;
        return `Edited ${k}`;
      }).join(", ");

      // Skip toast for cooldown changes (slider fires too many events)
      // but still log the change
      const isCooldownOnly = keys.length === 1 && keys[0] === "cooldown";
      if (!isCooldownOnly) {
        toast.success("Updated module config", {
          description: `${changes}${m ? ` — ${m.name}` : ""}`,
        });
      }

      get().addLog({
        type: "audit",
        serverId: server.id,
        serverName: server.name,
        actor: get().user?.username || "unknown",
        actorId: get().user?.id || "0",
        action: "Updated module config",
        details: `${changes} by ${get().user?.username || "unknown"}${m ? ` — ${m.name}` : ""}`,
      });
    }
  },

  toggleCommand: (moduleId, commandId) => {
    const modules = get().modules.map((m) =>
      m.id === moduleId
        ? {
            ...m,
            commands: m.commands.map((c) =>
              c.id === commandId ? { ...c, enabled: !c.enabled } : c,
            ),
          }
        : m,
    );
    set({ modules, hasUnsavedChanges: true });
    const m = modules.find((x) => x.id === moduleId);
    const c = m?.commands.find((x) => x.id === commandId);
    if (m && c) {
      const action = c.enabled ? "Enabled" : "Disabled";
      toast.success(`${action} command /${c.name}`, {
        description: "Remember to save your changes",
      });
    }
  },

  updateCommand: (moduleId, commandId, patch) => {
    const modules = get().modules.map((m) =>
      m.id === moduleId
        ? {
            ...m,
            commands: m.commands.map((c) =>
              c.id === commandId ? { ...c, ...patch } : c,
            ),
          }
        : m,
    );
    set({ modules, hasUnsavedChanges: true });

    // Skip toast for cooldown changes (slider fires too many events)
    const keys = Object.keys(patch);
    const isCooldownOnly = keys.length === 1 && keys[0] === "cooldown";
    if (!isCooldownOnly) {
      toast.success("Updated command config", {
        description: "Remember to save your changes",
      });
    }
  },

  toggleRoleManageCadia: (roleId) => {
    const server = get().selectedServer;
    if (!server) return;
    const roles = server.roles.map((r) =>
      r.id === roleId ? { ...r, canManageCadia: !r.canManageCadia } : r,
    );
    set({ selectedServer: { ...server, roles }, hasUnsavedChanges: true });
    const r = roles.find((x) => x.id === roleId);
    if (r) {
      const action = r.canManageCadia ? "Added" : "Removed";
      toast.success(`${action} ${r.name} ${r.canManageCadia ? "to" : "from"} manager access`, {
        description: "Remember to save your changes",
      });
      get().addLog({
        type: "audit",
        serverId: server.id,
        serverName: server.name,
        actor: get().user?.username || "unknown",
        actorId: get().user?.id || "0",
        action: r.canManageCadia ? "Added manager role" : "Removed manager role",
        details: `${r.canManageCadia ? "Added" : "Removed"} ${r.name} ${r.canManageCadia ? "to" : "from"} Manager access by ${get().user?.username || "unknown"}`,
      });
    }
  },

  updateBotPrefix: (prefix) => {
    const server = get().selectedServer;
    if (!server) return;
    const trimmed = prefix.slice(0, 8); // cap at 8 chars
    set({ selectedServer: { ...server, botPrefix: trimmed }, hasUnsavedChanges: true });
    toast.success(`Changed Cadia prefix to '${trimmed || "(empty)"}'`, {
      description: "Remember to save your changes",
    });
    get().addLog({
      type: "audit",
      serverId: server.id,
      serverName: server.name,
      actor: get().user?.username || "unknown",
      actorId: get().user?.id || "0",
      action: "Updated bot prefix",
      details: `Set prefix to '${trimmed || "(empty)"}' by ${get().user?.username || "unknown"}`,
    });
  },

  addLog: (entry) => {
    const log: LogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    set({ logs: [log, ...get().logs] });
  },

  openAdminConsole: () => set({ adminConsoleOpen: true }),
  closeAdminConsole: () => set({ adminConsoleOpen: false }),

  attemptAdminLogin: (userId, password) => {
    // Check owner ID + password
    const isOwner = BOT_OWNER_IDS.includes(userId);
    if (!isOwner) return false;
    // Lazy import to avoid bundling the password into client chunks unintentionally —
    // still client-side here for the demo only.
    const { ADMIN_PANEL_PASSWORD } = require("./mock-data");
    if (password !== ADMIN_PANEL_PASSWORD) return false;
    // Per spec: do NOT enter admin panel immediately.
    // Mark sessionStorage; on next page refresh, AdminConsoleListener
    // will detect the flag and redirect to the admin panel.
    try {
      sessionStorage.setItem("cadia.admin.unlocked", "1");
    } catch {
      // ignore
    }
    set({ adminConsoleOpen: true }); // keep dialog open to show "refresh" hint
    return true;
  },

  lockAdmin: () => set({ adminUnlocked: false, view: "landing" }),

  setGlobalBotStatus: (status) => {
    const prev = get().globalBotStatus;
    set({ globalBotStatus: status });
    // Log to ALL servers the bot is in (users see the status change)
    const all = get().servers.length ? get().servers : MOCK_SERVERS;
    const botServers = all.filter((s) => s.botInServer);
    botServers.forEach((s) => {
      get().addLog({
        type: "botstatus",
        serverId: s.id,
        serverName: s.name,
        actor: "owner",
        actorId: get().user?.id || "899385550585364481",
        action: `Bot status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        details: `Bot status changed from ${prev} to ${status}${status === "maintenance" ? " — commands will be read-only" : status === "offline" ? " — bot is no longer responding" : " — fully operational"}`,
      });
    });
  },

  blacklistServer: (id, reason, durationMs) => {
    set({
      blacklistedServerIds: [...get().blacklistedServerIds, id],
      blacklistInfo: {
        ...get().blacklistInfo,
        [id]: {
          reason: reason || "No reason provided",
          durationMs: durationMs,
          blacklistedAt: Date.now(),
        },
      },
    });
    const server = MOCK_SERVERS.find((s) => s.id === id);
    get().addLog({
      type: "audit",
      serverId: id,
      serverName: server?.name || id,
      actor: get().user?.username || "owner",
      actorId: get().user?.id || "0",
      action: "Blacklisted server",
      details: `Server '${server?.name}' blacklisted — Reason: "${reason || "No reason provided"}"${durationMs ? ` · Duration: ${Math.round(durationMs / 86400000)}d` : " · Permanent"}`,
    });
  },

  unblacklistServer: (id) => {
    const info = get().blacklistInfo[id];
    set({
      blacklistedServerIds: get().blacklistedServerIds.filter((x) => x !== id),
      blacklistInfo: Object.fromEntries(
        Object.entries(get().blacklistInfo).filter(([k]) => k !== id),
      ),
    });
    const server = MOCK_SERVERS.find((s) => s.id === id);
    get().addLog({
      type: "audit",
      serverId: id,
      serverName: server?.name || id,
      actor: get().user?.username || "owner",
      actorId: get().user?.id || "0",
      action: "Unblacklisted server",
      details: `Server '${server?.name}' removed from blacklist (was: "${info?.reason || "unknown"}")`,
    });
  },

  isOwner: (userId) => {
    const id = userId || get().user?.id;
    return !!id && BOT_OWNER_IDS.includes(id);
  },

  visibleServers: () => {
    const blacklisted = get().blacklistedServerIds;
    const all = get().servers.length ? get().servers : MOCK_SERVERS;
    return all.filter(
      (s) => s.userCanManage && !blacklisted.includes(s.id),
    );
  },
}));

// === Hidden console command ===
// Only works in browser devtools console. Owner types:
//    cadia.dev.admin.panel()
// Discreet trigger: 5 rapid clicks on the footer dot
//
// The window.cadia boot script is injected in layout.tsx (before hydration),
// so the command is always available — even before React finishes mounting.
// AdminConsoleListener listens for the 'cadia:admin' event and opens the
// credential dialog. No keyboard shortcut (too easy to discover).
