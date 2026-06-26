"use client";

import { motion } from "framer-motion";
import { useCadia } from "@/lib/store";
import { CadiaLogo } from "@/components/cadia-logo";
import { CadiaFooter } from "@/components/cadia-footer";
import { Button } from "@/components/ui/button";
import { ShieldBan, ArrowLeft, MessageCircle } from "lucide-react";

const SUPPORT_INVITE = "https://discord.gg/26R7kXa6dx";

export function BlacklistFallback() {
  const server = useCadia((s) => s.selectedServer);
  const blacklistInfo = useCadia((s) => s.blacklistInfo);
  const clearSelectedServer = useCadia((s) => s.clearSelectedServer);

  const info = server ? blacklistInfo[server.id] : null;

  return (
    <div className="min-h-screen flex flex-col cadia-bg scanlines">
      <div className="cadia-particles" />
      <div className="cadia-bg-shine" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/60 px-4 py-3 flex items-center justify-between bg-card/60 backdrop-blur-xl">
        <button
          onClick={clearSelectedServer}
          className="flex items-center gap-3 cursor-pointer"
          aria-label="Go to home"
        >
          <CadiaLogo size={30} animated={false} />
          <span className="font-pixel text-xs text-cadia tracking-wider">CADIA</span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelectedServer}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Back to Servers
        </Button>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full text-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="inline-flex h-20 w-20 items-center justify-center mb-6 rounded-2xl border-2 border-fail/40 bg-fail/10"
          >
            <ShieldBan className="h-10 w-10 text-fail" />
          </motion.div>

          {/* Title */}
          <h1 className="font-pixel text-lg sm:text-xl text-fail mb-4 tracking-wider">
            ACCESS DENIED
          </h1>

          {/* Message */}
          <div className="space-y-3 mb-8">
            <p className="text-sm text-foreground font-semibold">
              You have been blacklisted from using Cadia.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This server has been blacklisted by the Cadia team. You can no
              longer access the dashboard or use Cadia's features in this server.
            </p>
            {info?.reason && (
              <div className="mt-4 p-3 rounded-lg border border-fail/30 bg-fail/5 text-left">
                <p className="text-[10px] font-semibold text-fail uppercase tracking-wider mb-1">
                  Reason
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {info.reason}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed mt-4">
              Contact Cadia support to resolve this problem.
            </p>
          </div>

          {/* CTA button */}
          <a
            href={SUPPORT_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <Button className="cadia-btn bg-cadia text-background hover:bg-cadia-dark text-sm font-semibold h-12 px-6">
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Cadia Support
            </Button>
          </a>
        </motion.div>
      </main>

      <CadiaFooter />
    </div>
  );
}
