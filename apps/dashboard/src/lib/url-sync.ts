"use client";

import { useCadia } from "@/lib/store";
import { MOCK_SERVERS } from "@/lib/mock-data";
import type { View, DashboardTab } from "@/lib/types";

const TAB_SEGMENTS: DashboardTab[] = ["dashboard", "modules", "commands", "logging", "premium"];

interface ParsedUrl {
  view: View;
  serverId?: string;
  tab?: DashboardTab;
}

export function pathToState(path: string): ParsedUrl {
  const clean = path.replace(/\/+$/, "") || "/";

  if (clean === "/" ) return { view: "landing" };
  if (clean === "/servers") return { view: "server-select" };
  if (clean === "/premium") return { view: "premium" };
  if (clean === "/about") return { view: "about" };
  if (clean === "/terms") return { view: "terms" };
  if (clean === "/privacy") return { view: "privacy" };
  if (clean === "/faq") return { view: "faq" };
  if (clean === "/admin") return { view: "admin" };

  const manageMatch = clean.match(/^\/manage\/([^/]+)(?:\/([^/]+))?$/);
  if (manageMatch) {
    const serverId = decodeURIComponent(manageMatch[1]);
    const tabSeg = manageMatch[2] as DashboardTab | undefined;
    const tab = tabSeg && (TAB_SEGMENTS as string[]).includes(tabSeg) ? (tabSeg as DashboardTab) : "dashboard";
    return { view: "dashboard", serverId, tab };
  }

  return { view: "landing" };
}

export function stateToPath(view: View, serverId?: string | null, tab?: DashboardTab): string {
  switch (view) {
    case "server-select":
      return "/servers";
    case "dashboard": {
      if (!serverId) return "/servers";
      const t = tab && tab !== "dashboard" ? tab : "";
      return t ? `/manage/${serverId}/${t}` : `/manage/${serverId}`;
    }
    case "premium":
      return "/premium";
    case "about":
      return "/about";
    case "terms":
      return "/terms";
    case "privacy":
      return "/privacy";
    case "faq":
      return "/faq";
    case "admin":
      return "/admin";
    case "landing":
    case "login":
    case "legal":
    default:
      return "/";
  }
}

/** Returns true for paths the app itself owns (used for OAuth callback URLs). */
export function isAppPath(path: string): boolean {
  const { view } = pathToState(path);
  return view !== "landing" || path === "/" || path === "";
}

function replaceUrl(path: string) {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== path) {
    window.history.replaceState({ cadia: true }, "", path);
  }
}

function pushUrl(path: string) {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== path) {
    window.history.pushState({ cadia: true }, "", path);
  }
}

/**
 * Read the current browser URL and apply it to the store. Called on initial
 * mount, on browser back/forward (popstate), and after the auth/session loads
 * (so a /manage/<id> deep link can resolve once the server list is available).
 */
export function applyUrlToStore() {
  if (typeof window === "undefined") return;
  const { view, serverId, tab } = pathToState(window.location.pathname);
  const state = useCadia.getState();

  const isAuthed = !!state.user || state.adminUnlocked;
  const needsAuth = view === "server-select" || view === "dashboard" || view === "admin";

  // Auth-gated page requested while logged out -> bounce to landing.
  if (needsAuth && !isAuthed) {
    replaceUrl("/");
    if (state.view !== "landing") state.setView("landing");
    return;
  }

  if (state.adminUnlocked && !state.user) {
    if (view === "landing" || view === "server-select") {
      replaceUrl("/admin");
      if (state.view !== "admin") state.setView("admin");
      return;
    }
  }

  if (view === "dashboard" && serverId) {
    const all = state.servers.length ? state.servers : MOCK_SERVERS;
    const srv = all.find((s) => s.id === serverId);
    if (!srv || !srv.botInServer) {
      // Unknown server or bot not present -> back to the server list.
      replaceUrl("/servers");
      if (state.view !== "server-select") state.setView("server-select");
      return;
    }
    // Already viewing this server? just sync the tab.
    if (state.selectedServer?.id === serverId) {
      if (tab && state.activeTab !== tab) state.setTab(tab);
      if (state.view !== "dashboard") state.setView("dashboard");
      return;
    }
    if (state.adminUnlocked && !state.user) {
      state.selectServerAsAdmin(serverId);
    } else {
      state.selectServer(serverId);
    }
    if (tab && tab !== "dashboard") state.setTab(tab);
    return;
  }

  if (view === "server-select") {
    if (state.view !== "server-select") state.setView("server-select");
    return;
  }

  // premium / about / terms / privacy / faq / admin / landing
  if (state.view !== view) state.setView(view);
}

export function resolveViewAfterAuth() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  const { view } = pathToState(path);
  const state = useCadia.getState();

  if (!state.user && !state.adminUnlocked) return;

  if (!state.user && state.adminUnlocked) {
    if (view === "landing" || view === "server-select") {
      replaceUrl("/admin");
      if (state.view !== "admin") state.setView("admin");
      return;
    }
    applyUrlToStore();
    return;
  }

  // Regular Discord-login session below.
  if (view === "dashboard" || view === "server-select" || view === "admin") {
    applyUrlToStore();
    return;
  }

  // Logged in but on / (or a non-app path) -> go to the server list.
  if (path === "/" || view === "landing") {
    replaceUrl("/servers");
    if (state.view !== "server-select") state.setView("server-select");
    return;
  }

  // On a public page (about/terms/etc.) while logged in -> respect the URL.
  if (state.view !== view) state.setView(view);
}

export function syncUrlFromStore() {
  if (typeof window === "undefined") return;
  const state = useCadia.getState();
  const path = stateToPath(state.view, state.selectedServer?.id, state.activeTab);
  pushUrl(path);
}

export function installPopstateListener(): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => applyUrlToStore();
  window.addEventListener("popstate", handler);
  return () => window.removeEventListener("popstate", handler);
}
