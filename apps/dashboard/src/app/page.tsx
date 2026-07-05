"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useCadia } from "@/lib/store";
import { LandingView } from "@/components/views/landing-view";
import { Toaster } from "@/components/ui/sonner";
import type { DashboardTab as DashboardTabId, View } from "@/lib/types";

const ServerSelectView = dynamic(() => import("@/components/views/server-select-view").then((module) => module.ServerSelectView));
const DashboardShell = dynamic(() => import("@/components/dashboard-shell").then((module) => module.DashboardShell));
const DashboardTab = dynamic(() => import("@/components/views/dashboard-tab").then((module) => module.DashboardTab));
const ModulesTab = dynamic(() => import("@/components/views/modules-tab").then((module) => module.ModulesTab));
const CommandsTab = dynamic(() => import("@/components/views/commands-tab").then((module) => module.CommandsTab));
const LoggingTab = dynamic(() => import("@/components/views/logging-tab").then((module) => module.LoggingTab));
const PremiumTab = dynamic(() => import("@/components/views/premium-tab").then((module) => module.PremiumTab));
const PremiumView = dynamic(() => import("@/components/views/premium-view").then((module) => module.PremiumView));
const AdminView = dynamic(() => import("@/components/views/admin-view").then((module) => module.AdminView));
const LegalPageView = dynamic(() => import("@/components/views/legal-page-view").then((module) => module.LegalPageView));
const AboutView = dynamic(() => import("@/components/views/about-view").then((module) => module.AboutView));
const BlacklistFallback = dynamic(() => import("@/components/views/blacklist-fallback").then((module) => module.BlacklistFallback));
const AdminConsoleListener = dynamic(() => import("@/components/admin-console-listener").then((module) => module.AdminConsoleListener), { ssr: false });

export default function Home() {
  const pathname = usePathname();
  const initialPath = useRef(pathname);
  const [routeReady, setRouteReady] = useState(false);
  const view = useCadia((s) => s.view);
  const activeTab = useCadia((s) => s.activeTab);
  const user = useCadia((s) => s.user);
  const selectedServer = useCadia((s) => s.selectedServer);
  const adminUnlocked = useCadia((s) => s.adminUnlocked);
  const blacklistedServerIds = useCadia((s) => s.blacklistedServerIds);
  const sessionLoaded = useCadia((s) => s.sessionLoaded);
  const servers = useCadia((s) => s.servers);
  const activeModuleId = useCadia((s) => s.activeModuleId);
  const loadDashboardSession = useCadia((s) => s.loadDashboardSession);
  const loadBotStatus = useCadia((s) => s.loadBotStatus);

  // === 1) Disable browser scroll restoration — we manage it ourselves ===
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    loadDashboardSession();
    loadBotStatus();
    return () => {
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "auto";
      }
    };
  }, [loadDashboardSession, loadBotStatus]);

  useEffect(() => {
    if (routeReady) return;
    const route = parseDashboardRoute(initialPath.current);

    if (route.view === "server-select" || route.view === "dashboard") {
      if (!sessionLoaded) return;
      if (!user) {
        window.location.assign(`/api/auth/signin/discord?callbackUrl=${encodeURIComponent(initialPath.current)}`);
        return;
      }
    }

    if (route.view === "dashboard") {
      const server = servers.find((entry) => entry.id === route.serverId);
      if (!server) {
        useCadia.setState({ view: "server-select", selectedServer: null });
        window.history.replaceState(null, "", "/servers");
        setRouteReady(true);
        return;
      }
      if (selectedServer?.id !== server.id) useCadia.getState().selectServer(server.id);
      useCadia.setState({
        view: "dashboard",
        activeTab: route.tab,
        activeModuleId: route.moduleId,
      });
      setRouteReady(true);
      return;
    }

    useCadia.setState({
      view: route.view,
      selectedServer: null,
      activeModuleId: null,
    });
    if (route.normalizedPath !== initialPath.current) {
      window.history.replaceState(null, "", route.normalizedPath);
    }
    setRouteReady(true);
  }, [routeReady, sessionLoaded, user, servers, selectedServer?.id]);

  useEffect(() => {
    if (!routeReady) return;
    const target = dashboardPath(view, selectedServer?.id, activeTab, activeModuleId);
    if (window.location.pathname !== target) window.history.pushState(null, "", target);
  }, [routeReady, view, selectedServer?.id, activeTab, activeModuleId]);

  useEffect(() => {
    const restoreRoute = () => {
      initialPath.current = window.location.pathname;
      setRouteReady(false);
    };
    window.addEventListener("popstate", restoreRoute);
    return () => window.removeEventListener("popstate", restoreRoute);
  }, []);

  // === 2) Defensive: redirect invalid dashboard/server-select states ===
  useEffect(() => {
    if (view === "dashboard" && !selectedServer) {
      useCadia.getState().setView("landing");
      return;
    }
    if (view === "dashboard" && !user && !useCadia.getState().adminUnlocked) {
      useCadia.getState().setView("landing");
      return;
    }
    if (view === "server-select" && !user) {
      useCadia.getState().setView("landing");
      return;
    }
  }, [view, user, selectedServer]);

  // === 3) Reset scroll to top on EVERY view/tab change ===
  // Uses useEffect (not useLayoutEffect) to avoid SSR warnings, but fires
  // synchronously enough that users never see the page at the old scroll position.
  useEffect(() => {
    // Reset window scroll
    window.scrollTo(0, 0);
    // Reset any internal scroll containers (dashboard <main>)
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  }, [view, activeTab]);

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgba(17, 22, 29, 0.9)",
            border: "1px solid rgba(101, 184, 218, 0.2)",
            color: "var(--foreground)",
            fontFamily: "var(--font-geist-sans), sans-serif",
            fontSize: "13px",
            borderRadius: "10px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 24px -8px rgba(0,0,0,0.5)",
          },
        }}
      />

      {/* Hidden owner console listener — always mounted */}
      <AdminConsoleListener />

      {/* View router */}
      {view === "landing" && <LandingView />}

      {view === "server-select" && user && <ServerSelectView />}

      {view === "dashboard" && selectedServer && (user || adminUnlocked) && (
        blacklistedServerIds.includes(selectedServer.id) ? (
          <BlacklistFallback />
        ) : (
          <DashboardShell>
            {activeTab === "dashboard" && <DashboardTab />}
            {activeTab === "modules" && <ModulesTab />}
            {activeTab === "commands" && <CommandsTab />}
            {activeTab === "logging" && <LoggingTab />}
            {activeTab === "premium" && <PremiumTab />}
          </DashboardShell>
        )
      )}

      {view === "admin" && <AdminView />}

      {view === "premium" && <PremiumView />}

      {view === "terms" && <LegalPageView page="terms" />}
      {view === "privacy" && <LegalPageView page="privacy" />}
      {view === "faq" && <LegalPageView page="faq" />}

      {view === "about" && <AboutView />}
    </>
  );
}

type ParsedRoute =
  | { view: Exclude<View, "dashboard">; normalizedPath: string }
  | { view: "dashboard"; normalizedPath: string; serverId: string; tab: DashboardTabId; moduleId: string | null };

function parseDashboardRoute(pathname: string): ParsedRoute {
  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (segments[0] === "manage" && segments[1]) {
    const tab = (["modules", "commands", "logging", "premium"] as DashboardTabId[]).includes(segments[2] as DashboardTabId)
      ? segments[2] as DashboardTabId
      : "dashboard";
    return {
      view: "dashboard",
      serverId: segments[1],
      tab,
      moduleId: tab === "modules" && segments[3] ? segments[3] : null,
      normalizedPath: pathname,
    };
  }

  const publicRoutes: Record<string, { view: Exclude<View, "dashboard">; path: string }> = {
    "": { view: "landing", path: "/" },
    servers: { view: "server-select", path: "/servers" },
    premium: { view: "premium", path: "/premium" },
    terms: { view: "terms", path: "/terms" },
    privacy: { view: "privacy", path: "/privacy" },
    faq: { view: "faq", path: "/faq" },
    about: { view: "about", path: "/about" },
  };
  const route = publicRoutes[segments[0] || ""] || publicRoutes[""];
  return { view: route.view, normalizedPath: route.path };
}

function dashboardPath(view: View, serverId: string | undefined, tab: DashboardTabId, moduleId: string | null) {
  if (view === "dashboard" && serverId) {
    const tabPath = tab === "dashboard" ? "" : `/${tab}`;
    const modulePath = tab === "modules" && moduleId ? `/${encodeURIComponent(moduleId)}` : "";
    return `/manage/${encodeURIComponent(serverId)}${tabPath}${modulePath}`;
  }
  const paths: Partial<Record<View, string>> = {
    landing: "/",
    login: "/",
    "server-select": "/servers",
    premium: "/premium",
    admin: "/",
    terms: "/terms",
    privacy: "/privacy",
    faq: "/faq",
    about: "/about",
    legal: "/terms",
  };
  return paths[view] || "/";
}
