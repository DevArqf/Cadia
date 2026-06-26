"use client";

import { useState } from "react";
import { CadiaLogo } from "@/components/cadia-logo";
import { FooterDot } from "@/components/footer-dot";
import { useCadia } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Mail,
  Github,
  ExternalLink,
} from "lucide-react";

const SUPPORT_INVITE = "https://discord.gg/26R7kXa6dx";

export function CadiaFooter() {
  const startLogin = useCadia((s) => s.startLogin);
  const user = useCadia((s) => s.user);
  const setView = useCadia((s) => s.setView);

  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [comingSoonLabel, setComingSoonLabel] = useState("");

  const handleComingSoon = (label: string) => {
    setComingSoonLabel(label);
    setComingSoonOpen(true);
  };

  // Get Premium: prompt login if needed, then go directly to the standalone premium page
  const handleGetPremium = () => {
    if (user) {
      // Already logged in — go straight to premium page
      setView("premium");
      return;
    }
    // Not logged in — use real Discord OAuth first.
    startLogin();
  };

  return (
    <>
      <footer className="relative z-10 border-t border-cadia/15 bg-card/30 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 sm:grid-cols-3 gap-8 items-start">
          {/* Column 1 (left) — Cadia icon + title, copyright underneath */}
          <div className="space-y-3 flex flex-col items-start">
            <div className="flex items-center gap-2.5">
              <CadiaLogo size={40} animated={false} />
              <span className="font-pixel text-sm text-cadia tracking-wider">CADIA</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 pt-1">
              © 2026 Cadia Bot
              <FooterDot />
              All rights reserved.
            </p>
          </div>

          {/* Column 2 (middle) — Cadia bar */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Cadia
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => useCadia.getState().setView("about")}
                  className="text-sm text-foreground/80 hover:text-[#3b82f6] transition-colors text-left"
                >
                  About Cadia
                </button>
              </li>
              <li>
                <button
                  onClick={handleGetPremium}
                  className="text-sm text-foreground/80 hover:text-[#3b82f6] transition-colors text-left"
                >
                  Get Premium
                </button>
              </li>
              <li>
                <button
                  onClick={() => setView("faq")}
                  className="text-sm text-foreground/80 hover:text-[#3b82f6] transition-colors text-left"
                >
                  Frequently Asked Questions
                </button>
              </li>
              <li>
                <a
                  href={SUPPORT_INVITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-foreground/80 hover:text-[#3b82f6] transition-colors inline-flex items-center gap-1"
                >
                  Support Server
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 (right) — Legal bar, with Get in touch underneath */}
          <div className="space-y-6">
            {/* Legal */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Legal
              </h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => setView("terms")}
                    className="text-sm text-foreground/80 hover:text-[#3b82f6] transition-colors text-left"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setView("privacy")}
                    className="text-sm text-foreground/80 hover:text-[#3b82f6] transition-colors text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>

            {/* Get in touch — under Legal */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cadia">
                Get in touch
              </h4>
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Discord support server */}
                <a
                  href={SUPPORT_INVITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Discord Support Server"
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-cadia/20 text-muted-foreground hover:text-[#3b82f6] hover:border-[#3b82f6]/50 hover:bg-[#3b82f6]/5 transition-all"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                {/* Email */}
                <a
                  href="mailto:business.malikjohn@gmail.com"
                  aria-label="Email"
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-cadia/20 text-muted-foreground hover:text-[#3b82f6] hover:border-[#3b82f6]/50 hover:bg-[#3b82f6]/5 transition-all"
                >
                  <Mail className="h-4 w-4" />
                </a>
                {/* Cadia Repo */}
                <a
                  href="https://github.com/DevArqf/Cadia"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Cadia GitHub Repository"
                  title="Cadia Repository"
                  className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-cadia/20 text-muted-foreground hover:text-[#3b82f6] hover:border-[#3b82f6]/50 hover:bg-[#3b82f6]/5 transition-all text-xs font-medium"
                >
                  <Github className="h-3.5 w-3.5" />
                  Repo
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Coming Soon modal */}
      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent className="max-w-md border-cadia/30 p-0 overflow-hidden bg-card backdrop-blur-xl shadow-2xl">
          <div className="h-1 bg-gradient-to-r from-cadia via-warning to-cadia" />
          <DialogTitle className="sr-only">{comingSoonLabel} — Coming Soon</DialogTitle>
          <div className="px-5 pb-8 pt-8 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="mb-4"
            >
              <CadiaLogo size={64} animated={false} />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl sm:text-3xl font-bold text-cadia text-glow-cadia mb-2"
            >
              Coming Soon
            </motion.h2>
            <p className="text-sm text-muted-foreground">
              {comingSoonLabel} is not available yet. We&apos;re working hard to bring
              this to you soon.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
