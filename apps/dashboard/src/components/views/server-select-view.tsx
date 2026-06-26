"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { useCadia } from "@/lib/store";
import { CadiaLogo } from "@/components/cadia-logo";
import { CadiaFooter } from "@/components/cadia-footer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LogOut,
  Server as ServerIcon,
  Users,
  Check,
  X,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";

export function ServerSelectView() {
  const user = useCadia((s) => s.user);
  const logout = useCadia((s) => s.logout);
  const setView = useCadia((s) => s.setView);
  const blacklistedIds = useCadia((s) => s.blacklistedServerIds);
  const selectServer = useCadia((s) => s.selectServer);

  const visibleServers = useMemo(() => {
    // Show ALL servers the user can manage — including blacklisted ones
    // (blacklisted servers show a fallback page when selected)
    return useCadia.getState().visibleServers();
  }, [blacklistedIds]);

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
          <Avatar className="h-8 w-8 border-2" style={{ borderColor: user?.avatar }}>
            <AvatarFallback
              className="text-xs font-semibold"
              style={{ background: user?.avatar, color: "#0b0f14" }}
            >
              {user?.username?.slice(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
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
                  <div
                    className="h-12 w-12 shrink-0 flex items-center justify-center text-sm font-bold rounded-xl border-2"
                    style={{
                      background: s.icon,
                      borderColor: s.icon,
                      color: "#0b0f14",
                    }}
                  >
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
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
                    href="https://discord.com/oauth2/authorize?client_id=CADIA_BOT_ID&scope=bot+applications.commands&permissions=8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="cadia-add-bot-btn w-full text-white text-sm font-semibold h-11 group relative overflow-hidden">
                      <span className="relative z-10 flex items-center justify-center">
                        <ExternalLink className="h-4 w-4 mr-2 transition-transform group-hover:translate-x-0.5" />
                        Add Cadia Now
                        <span className="ml-2 text-[10px] opacity-80 font-normal">· Free · 2-min setup</span>
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
