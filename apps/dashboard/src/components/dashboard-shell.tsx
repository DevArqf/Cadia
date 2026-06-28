"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCadia } from "@/lib/store";
import { CadiaLogo } from "@/components/cadia-logo";
import { Button } from "@/components/ui/button";
import { ServerIconBadge, UserAvatarBadge } from "@/components/discord-media";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Server as ServerIcon,
  Boxes,
  ScrollText,
  Crown,
  LogOut,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Shield,
  Terminal,
  Menu,
  X,
  Save,
  AlertTriangle,
} from "lucide-react";
import type { DashboardTab } from "@/lib/types";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";

const NAV: { id: DashboardTab; label: string; icon: typeof ServerIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: ServerIcon },
  { id: "modules", label: "Modules", icon: Boxes },
  { id: "commands", label: "Commands", icon: Terminal },
  { id: "logging", label: "Logging", icon: ScrollText },
];

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const user = useCadia((s) => s.user);
  const server = useCadia((s) => s.selectedServer);
  const activeTab = useCadia((s) => s.activeTab);
  const setTab = useCadia((s) => s.setTab);
  const clearSelectedServer = useCadia((s) => s.clearSelectedServer);
  const logout = useCadia((s) => s.logout);
  const isAdminUnlocked = useCadia((s) => s.adminUnlocked);
  const setView = useCadia((s) => s.setView);
  const hasUnsavedChanges = useCadia((s) => s.hasUnsavedChanges);
  const saveConfig = useCadia((s) => s.saveConfig);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<DashboardTab | null>(null);
  const [pendingHome, setPendingHome] = useState(false);

  // Guarded tab switch — checks for unsaved changes
  const handleTabSwitch = (tab: DashboardTab) => {
    if (tab === activeTab) return;
    if (hasUnsavedChanges) {
      setPendingTab(tab);
      return;
    }
    setTab(tab);
  };

  // Confirm tab switch (discard changes)
  const handleConfirmSwitch = () => {
    useCadia.setState({ hasUnsavedChanges: false });
    if (pendingHome) {
      setPendingHome(false);
      navigateHome();
      return;
    }
    if (pendingTab) {
      setTab(pendingTab);
      setPendingTab(null);
    }
  };

  // Cancel tab switch (stay on current tab)
  const handleCancelSwitch = () => {
    setPendingTab(null);
    setPendingHome(false);
  };

  // Save and stay
  const handleSave = () => {
    saveConfig();
    setPendingTab(null);
    setPendingHome(false);
  };

  // Scroll to top when tab changes — fires before paint
  useIsomorphicLayoutEffect(() => {
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [activeTab]);

  // Close mobile sidebar when tab changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [activeTab]);

  // Admin/owner can access without a regular user session
  if (!server || (!user && !isAdminUnlocked)) return null;

  // Fallback user object for admin-only sessions
  const effectiveUser = user || {
    id: "899385550585364481",
    username: "owner",
    discriminator: "0",
    globalName: "Owner",
    avatar: "#5e3a6d",
  };

  const canManage =
    isAdminUnlocked ||
    server.userPermissions.includes("ADMINISTRATOR") ||
    server.userPermissions.includes("MANAGE_GUILD");
  if (!canManage) {
    clearSelectedServer();
    return null;
  }

  const navigateHome = () => {
    if (isAdminUnlocked) {
      clearSelectedServer();
    } else {
      setView("landing");
      clearSelectedServer();
    }
  };

  const handleHomeClick = () => {
    if (hasUnsavedChanges) {
      setPendingHome(true);
      return;
    }
    navigateHome();
  };

  return (
    <div className="min-h-screen flex flex-col cadia-bg">
      <div className="cadia-particles" />

      {/* Top bar — fixed, never scrolls */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-border/60 px-4 py-2.5 flex items-center justify-between bg-card/80 backdrop-blur-xl h-[49px]">
        <div className="flex items-center gap-3 min-w-0">
          {/* Hamburger — toggles mobile sidebar */}
          <button
            onClick={() => setMobileSidebarOpen((v) => !v)}
            className="md:hidden p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            aria-label="Toggle menu"
          >
            {mobileSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {/* Logo + CADIA title — returns to home */}
          <button
            onClick={handleHomeClick}
            className="flex items-center gap-3 cursor-pointer"
            aria-label="Go to home"
          >
            <CadiaLogo size={30} animated={false} />
            <span className="font-pixel text-xs text-cadia tracking-wider">
              CADIA
            </span>
          </button>

          <div className="hidden md:flex items-center gap-2 ml-2 pl-3 border-l border-border/50">
            <ServerIconBadge
              icon={server.icon}
              name={server.name}
              className="h-7 w-7 rounded-lg text-[10px] font-bold"
            />
            <span className="text-sm font-semibold text-foreground truncate max-w-[180px]">
              {server.name}
            </span>
            {server.premium && (
              <span className="cadia-server-premium-tag">
                <span className="relative z-10">Premium</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {hasUnsavedChanges && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 text-xs font-semibold text-cadia bg-cadia/10 border border-cadia/40 px-2.5 py-1 rounded-md hover:bg-cadia/20 transition-colors cursor-pointer"
              title="Click to save your changes"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Unsaved changes</span>
              <span className="sm:hidden">Unsaved</span>
            </button>
          )}
          {isAdminUnlocked && (
            <div className="flex items-center gap-1.5 text-xs text-rpg font-semibold bg-rpg/10 border border-rpg/30 px-2 py-1 rounded-md">
              <Shield className="h-3.5 w-3.5" />
              Admin Mode
            </div>
          )}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-success font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified
          </div>
          <UserAvatarBadge
            avatar={effectiveUser.avatar}
            username={effectiveUser.username}
            className="h-7 w-7 border-2"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-xs font-medium text-muted-foreground hover:text-fail"
          >
            <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Mobile sidebar drawer — slides in from left */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              style={{ top: "49px" }}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="md:hidden fixed left-0 top-[49px] bottom-0 z-50 w-64 bg-sidebar/95 backdrop-blur-xl border-r border-border/60 flex flex-col"
            >
              <SidebarContent
                server={server}
                activeTab={activeTab}
                setTab={handleTabSwitch}
                clearSelectedServer={clearSelectedServer}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex pt-[49px]">
        {/* Desktop sidebar — fixed, full height, never scrolls */}
        <aside className="hidden md:flex md:flex-col md:fixed md:top-[49px] md:left-0 md:bottom-0 md:w-60 md:border-r md:border-border/60 bg-sidebar/40 backdrop-blur-xl shrink-0 z-30">
          <SidebarContent
            server={server}
            activeTab={activeTab}
            setTab={handleTabSwitch}
            clearSelectedServer={clearSelectedServer}
          />
        </aside>

        {/* Main content — scrolls independently, offset for fixed sidebar */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 cadia-scroll md:ml-60">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="max-w-5xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Unsaved changes dialog */}
      <Dialog open={pendingTab !== null || pendingHome} onOpenChange={(o) => !o && handleCancelSwitch()}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-popover border-warning/40 shadow-2xl" showCloseButton={false}>
          <div className="h-0.5 bg-gradient-to-r from-warning via-fail to-warning" />
          <DialogHeader className="px-5 pt-4 pb-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              You have unsaved changes
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-5 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              You have unsaved configuration changes. If you switch tabs now,
              or leave this server view now, your changes will be lost. Save
              your changes first, or continue without saving.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleSave}
                className="cadia-btn flex-1 bg-cadia text-background hover:bg-cadia-dark text-sm font-semibold h-10"
              >
                <Save className="h-4 w-4 mr-1.5" />
                Save Changes
              </Button>
              <Button
                onClick={handleConfirmSwitch}
                variant="outline"
                className="cadia-btn flex-1 text-sm font-medium h-10 border-warning/40 text-warning hover:bg-warning/10"
              >
                Continue Anyway
              </Button>
            </div>
            <Button
              onClick={handleCancelSwitch}
              variant="ghost"
              className="w-full text-sm font-medium text-muted-foreground hover:text-foreground h-9"
            >
              Return Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === Sidebar content (shared between desktop and mobile) ===
function SidebarContent({
  server,
  activeTab,
  setTab,
  clearSelectedServer,
}: {
  server: any;
  activeTab: DashboardTab;
  setTab: (t: DashboardTab) => void;
  clearSelectedServer: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1.5 p-3 overflow-y-auto flex-1 cadia-scroll">
      <Button
        variant="ghost"
        size="sm"
        onClick={clearSelectedServer}
        className="mb-2 justify-start text-xs font-medium text-muted-foreground hover:text-foreground shrink-0"
      >
        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
        Servers
      </Button>

      {NAV.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`cadia-nav-item ${isActive ? "active" : ""} flex items-center gap-2 px-3 py-2.5 text-left text-sm font-medium shrink-0`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}

      <div className="flex-1" />

      {/* Premium CTA — golden shine on hover */}
      <button
        onClick={() => setTab("premium")}
        className={`cadia-premium-cta flex items-center gap-2.5 px-4 py-3 mt-2 mb-1 text-left rounded-xl border-2 transition-all overflow-hidden relative group ${
          activeTab === "premium"
            ? "border-rpg/70 shadow-lg"
            : "border-rpg/30 hover:border-rpg/60"
        }`}
        style={{
          background:
            activeTab === "premium"
              ? "linear-gradient(135deg, rgba(94,58,109,0.4), rgba(94,58,109,0.1))"
              : "linear-gradient(135deg, rgba(94,58,109,0.15), rgba(94,58,109,0.03))",
        }}
      >
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rpg/40 to-rpg/10 border border-rpg/50 flex items-center justify-center shrink-0 relative z-10">
          <Crown className="h-4 w-4 text-rpg" />
        </div>
        <div className="flex-1 min-w-0 relative z-10">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-foreground">Premium</span>
            <Sparkles className="h-3 w-3 text-warning shrink-0" />
          </div>
          <span className="text-[10px] text-muted-foreground block leading-tight">
            Unlock all features
          </span>
        </div>
        <span className="text-[9px] font-bold text-rpg uppercase tracking-wide relative z-10">
          Upgrade
        </span>
      </button>
    </nav>
  );
}
