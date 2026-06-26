"use client";

import { useEffect } from "react";
import { useCadia } from "@/lib/store";
import { LandingView } from "@/components/views/landing-view";
import { ServerSelectView } from "@/components/views/server-select-view";
import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardTab } from "@/components/views/dashboard-tab";
import { ModulesTab } from "@/components/views/modules-tab";
import { CommandsTab } from "@/components/views/commands-tab";
import { LoggingTab } from "@/components/views/logging-tab";
import { PremiumTab } from "@/components/views/premium-tab";
import { PremiumView } from "@/components/views/premium-view";
import { AdminView } from "@/components/views/admin-view";
import { LegalPageView } from "@/components/views/legal-page-view";
import { AboutView } from "@/components/views/about-view";
import { BlacklistFallback } from "@/components/views/blacklist-fallback";
import { AdminConsoleListener } from "@/components/admin-console-listener";
import { Toaster } from "@/components/ui/sonner";

export default function Home() {
  const view = useCadia((s) => s.view);
  const activeTab = useCadia((s) => s.activeTab);
  const user = useCadia((s) => s.user);
  const selectedServer = useCadia((s) => s.selectedServer);

  // === 1) Disable browser scroll restoration — we manage it ourselves ===
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    return () => {
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "auto";
      }
    };
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
    // Reset any other scrollable elements
    document.querySelectorAll(".cadia-scroll, [class*='overflow-y-auto']").forEach((el) => {
      (el as HTMLElement).scrollTop = 0;
    });
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

      {view === "dashboard" && selectedServer && (user || useCadia.getState().adminUnlocked) && (
        useCadia.getState().blacklistedServerIds.includes(selectedServer.id) ? (
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
