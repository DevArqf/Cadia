"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { useCadia } from "@/lib/store";
import { CadiaLogo } from "@/components/cadia-logo";
import { CadiaFooter } from "@/components/cadia-footer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DiscordServer } from "@/lib/types";
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
  const servers = useCadia((s) => s.servers);
  const blacklistedIds = useCadia((s) => s.blacklistedServerIds);
  const selectServer = useCadia((s) => s.selectServer);

  const visibleServers = useMemo(() => {
    // Show ALL servers the user can manage : including blacklisted ones
    // (blacklisted servers show a fallback page when selected)
    return servers.filter((server) => server.userCanManage && !blacklistedIds.includes(server.id));
  }, [servers, blacklistedIds]);

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
            {isImageUrl(user?.avatar) && <AvatarImage src={user?.avatar} alt={user?.globalName || user?.username || "User"} />}
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
            Choose a Server
          </h1>
        </motion.div>

        {/* Server grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {visibleServers.map((s, idx) => (
              <ServerCard
                key={s.id}
                server={s}
                index={idx}
                blacklisted={blacklistedIds.includes(s.id)}
                onSelect={() => selectServer(s.id)}
              />
            ))}
          </AnimatePresence>
        </div>

        {visibleServers.length === 0 && (
          <div className="cadia-card p-8 text-center">
            <p className="text-sm font-semibold text-muted-foreground mb-3">
              No manageable servers found
            </p>
            <p className="text-sm text-muted-foreground">
              Add Cadia to a server you manage, then return here to configure it.
            </p>
          </div>
        )}
      </main>

      <CadiaFooter />
    </div>
  );
}

function ServerCard({ server: s, index, blacklisted, onSelect }: {
  server: DiscordServer;
  index: number;
  blacklisted: boolean;
  onSelect: () => void;
}) {
  const backgroundUrl = s.botInServer && s.banner ? s.banner : isImageUrl(s.icon) ? s.icon : null;
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(index, 8) * 0.03 }}
      className={`cadia-card cadia-card-hover p-5 relative overflow-hidden ${!s.botInServer ? "opacity-95" : ""}`}
    >
      {backgroundUrl && (
        <img
          src={backgroundUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onLoad={() => setBackgroundLoaded(true)}
          onError={() => setBackgroundLoaded(false)}
          className={`absolute inset-[-8px] h-[calc(100%+16px)] w-[calc(100%+16px)] object-cover blur-md scale-105 transition-opacity duration-300 ${backgroundLoaded ? "opacity-55" : "opacity-0"}`}
        />
      )}
      {backgroundLoaded && <div className="absolute inset-0 bg-card/55" aria-hidden="true" />}
      <div className="relative z-[1]">
                {/* Top-right tags: Premium + Installed + Blacklisted */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                  {s.premium && (
                    <span className="cadia-server-premium-tag">
                      <span className="relative z-10">Premium</span>
                    </span>
                  )}
                  {blacklisted && (
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
                        Ready
                      </>
                    ) : (
                      <>
                        <X className="h-2.5 w-2.5" />
                        Add Required
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 mb-5 pt-2">
                  <div
                    className="relative h-12 w-12 shrink-0 flex items-center justify-center text-sm font-bold rounded-xl border-2 overflow-hidden"
                    style={{
                      background: isImageUrl(s.icon) ? "#65b8da" : s.icon,
                      borderColor: isImageUrl(s.icon) ? "rgba(255,255,255,.35)" : s.icon,
                      color: "#0b0f14",
                    }}
                  >
                    {(!isImageUrl(s.icon) || iconFailed) && s.name.slice(0, 2).toUpperCase()}
                    {isImageUrl(s.icon) && !iconFailed && (
                      <img
                        src={s.icon}
                        alt={`${s.name} icon`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                        onError={() => setIconFailed(true)}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-32 pt-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {s.name}
                    </h3>
                    <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {s.memberCount.toLocaleString()} total members
                    </span>
                  </div>
                </div>

                {/* Action */}
                {s.botInServer ? (
                  <Button
                    onClick={onSelect}
                    className="cadia-btn w-full bg-cadia text-background hover:bg-cadia-dark text-sm font-semibold"
                  >
                    <ServerIcon className="h-4 w-4 mr-1.5" />
                    Manage Server
                  </Button>
                ) : (
                  <a
                    href={`/api/invite?guild_id=${encodeURIComponent(s.id)}`}
                    className="block"
                  >
                    <Button className="cadia-add-bot-btn cadia-btn w-full text-background text-sm font-semibold group relative overflow-hidden">
                      <span className="relative z-10 flex items-center justify-center">
                        <ExternalLink className="h-4 w-4 mr-2 transition-transform group-hover:translate-x-0.5" />
                        Add Cadia
                      </span>
                    </Button>
                  </a>
                )}
      </div>
    </motion.div>
  );
}

function isImageUrl(value?: string | null): value is string {
  return Boolean(value && /^https?:\/\//i.test(value));
}
