"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useEffect, useRef, useState } from "react";
import { useCadia } from "@/lib/store";
import { CadiaLogo } from "@/components/cadia-logo";
import { CadiaFooter } from "@/components/cadia-footer";
import { Button } from "@/components/ui/button";
import { ServerIconBadge, UserAvatarBadge } from "@/components/discord-media";
import {
  LogOut,
  Server as ServerIcon,
  Users,
  Check,
  X,
  ExternalLink,
  ArrowLeft,
  Loader2,
} from "lucide-react";

// sessionStorage key tracking the guild the user is currently adding Cadia to.
const PENDING_INVITE_KEY = "cadia.pendingInvite";

export function ServerSelectView() {
  const user = useCadia((s) => s.user);
  const logout = useCadia((s) => s.logout);
  const setView = useCadia((s) => s.setView);
  const blacklistedIds = useCadia((s) => s.blacklistedServerIds);
  const selectServer = useCadia((s) => s.selectServer);
  const servers = useCadia((s) => s.servers);

  const visibleServers = useMemo(() => {
    // Show ALL servers the user can manage — including blacklisted ones
    // (blacklisted servers show a fallback page when selected)
    return useCadia.getState().visibleServers();
  }, [blacklistedIds, servers]);

  // === Pending invite: after the user clicks "Add Cadia Now" the invite opens
  // in a new tab. This tab polls /api/servers until the bot joins that guild,
  // then drops the user straight onto THAT server's dashboard. We also poll
  // immediately when the tab regains focus (visibilitychange) so the redirect
  // happens the moment the user comes back from Discord, instead of waiting
  // for the next tick. ===
  const [pendingInvite, setPendingInvite] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pending = sessionStorage.getItem(PENDING_INVITE_KEY);
    if (!pending) return;
    setPendingInvite(pending);

    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/servers", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const list = data.servers || [];
          useCadia.setState({ servers: list });
          const target = list.find((s: any) => s.id === pending);
          if (target?.botInServer) {
            sessionStorage.removeItem(PENDING_INVITE_KEY);
            setPendingInvite(null);
            // selectServer routes to /manage/<id> via the URL sync layer.
            selectServer(pending);
            return;
          }
        }
      } catch {
        /* ignore — retry on next tick */
      }
      if (!stopped) {
        pollRef.current = setTimeout(poll, 2000);
      }
    };
    poll();

    // When the user returns to this tab (from the Discord authorize tab),
    // poll immediately for a snappier redirect.
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !stopped) {
        if (pollRef.current) clearTimeout(pollRef.current);
        poll();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      if (pollRef.current) clearTimeout(pollRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [selectServer]);

  const handleAddBot = (guildId: string) => {
    try {
      sessionStorage.setItem(PENDING_INVITE_KEY, guildId);
    } catch {
      /* ignore */
    }
    setPendingInvite(guildId);
    // The <a> below opens Discord's invite in a new tab; this tab polls.
  };

  return (
    <div className="min-h-screen flex flex-col cadia-bg scanlines">
      <div className="cadia-particles" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/60 px-4 sm:px-6 py-3 flex items-center justify-between bg-card/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <CadiaLogo size={34} animated={false} />
          <span className="font-pixel text-sm text-cadia tracking-wider">CADIA</span>
        </div>
        <div className="flex items-center gap-3">
          <UserAvatarBadge
            avatar={user?.avatar}
            username={user?.username}
            className="h-8 w-8 border-2"
            fallbackClassName="text-xs font-semibold"
          />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-tight">{user?.globalName}</p>
            <p className="text-xs text-muted-foreground">
              @{user?.username}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="cadia-btn text-xs font-medium"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Logout
          </Button>
        </div>
      </header>

      {/* Body */}
      <main className="relative z-10 flex-1 px-4 sm:px-6 py-8 sm:py-12 max-w-5xl w-full mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView("landing")}
          className="mb-4 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Home
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Select a server
          </h1>
        </motion.div>

        {/* Pending-invite banner: shown while we wait for Cadia to join a
            server the user just added it to. Auto-redirects on detection. */}
        {pendingInvite && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 rounded-xl border border-cadia/40 bg-cadia/10 px-4 py-3"
          >
            <Loader2 className="h-4 w-4 animate-spin text-cadia shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Waiting for Cadia to join your server…
              </p>
              <p className="text-xs text-muted-foreground">
                Complete the authorization in the Discord tab, then you&apos;ll be
                taken straight to the dashboard.
              </p>
            </div>
          </motion.div>
        )}

        {/* Server grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {visibleServers.map((s, idx) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className={`cadia-card cadia-card-hover p-5 relative ${
                  !s.botInServer ? "opacity-95" : ""
                }`}
              >
                {/* Top-right tags: Premium + Installed + Blacklisted */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                  {s.premium && (
                    <span className="cadia-server-premium-tag">
                      <span className="relative z-10">Premium</span>
                    </span>
                  )}
                  {blacklistedIds.includes(s.id) && (
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-fail/15 text-fail border-fail/40"
                      title="This server is blacklisted from using Cadia"
                    >
                      <X className="h-2.5 w-2.5" />
                      Blacklisted
                    </div>
                  )}
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                      s.botInServer
                        ? "bg-success/15 text-success border-success/40"
                        : "bg-fail/15 text-fail border-fail/40"
                    }`}
                    title={s.botInServer ? "Cadia is installed in this server" : "Cadia is not installed"}
                  >
                    {s.botInServer ? (
                      <>
                        <Check className="h-2.5 w-2.5" />
                        Installed
                      </>
                    ) : (
                      <>
                        <X className="h-2.5 w-2.5" />
                        Not Installed
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 mb-4">
                  <ServerIconBadge
                    icon={s.icon}
                    name={s.name}
                    className="h-12 w-12 rounded-xl text-sm font-bold"
                  />
                  <div className="flex-1 min-w-0 pr-32">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {s.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {s.memberCount.toLocaleString()} total
                      </span>
                      <span className="flex items-center gap-1 text-success">
                        <span className="h-2 w-2 rounded-full bg-success inline-block" />
                        {s.onlineCount.toLocaleString()} online
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action */}
                {s.botInServer ? (
                  <Button
                    onClick={() => selectServer(s.id)}
                    className="cadia-btn w-full bg-cadia text-background hover:bg-cadia-dark text-sm font-semibold"
                  >
                    <ServerIcon className="h-4 w-4 mr-1.5" />
                    Open Dashboard
                  </Button>
                ) : (
                  <a
                    href={`/api/invite?guild_id=${encodeURIComponent(s.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                    onClick={() => handleAddBot(s.id)}
                  >
                    <Button className="cadia-add-bot-btn w-full text-white text-sm font-semibold h-11 group relative overflow-hidden">
                      <span className="relative z-10 flex items-center justify-center">
                        <ExternalLink className="h-4 w-4 mr-2 transition-transform group-hover:translate-x-0.5" />
                        Add Cadia Now
                      </span>
                    </Button>
                  </a>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {visibleServers.length === 0 && (
          <div className="cadia-card p-8 text-center">
            <p className="text-sm font-semibold text-muted-foreground mb-3">
              No mutual servers found
            </p>
            <p className="text-sm text-muted-foreground">
              You don&apos;t manage any server Cadia is in. Add Cadia to your
              server to get started.
            </p>
          </div>
        )}
      </main>

      <CadiaFooter />
    </div>
  );
}
