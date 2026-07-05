"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useCadia } from "@/lib/store";
import { LandingView } from "@/components/views/landing-view";
import { Toaster } from "@/components/ui/sonner";

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
  const view = useCadia((s) => s.view);
  const activeTab = useCadia((s) => s.activeTab);
  const user = useCadia((s) => s.user);
  const selectedServer = useCadia((s) => s.selectedServer);
  const adminUnlocked = useCadia((s) => s.adminUnlocked);
  const blacklistedServerIds = useCadia((s) => s.blacklistedServerIds);
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
