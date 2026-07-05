"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useCadia } from "@/lib/store";
import { CadiaLogo } from "@/components/cadia-logo";
import { CadiaFooter } from "@/components/cadia-footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, FileText, Shield } from "lucide-react";
import {
  TERMS_OF_SERVICE,
  FAQ,
  PRIVACY_POLICY,
  type LegalDoc,
} from "@/lib/legal-content";

type LegalPage = "terms" | "privacy" | "faq";

function getDoc(page: LegalPage): LegalDoc {
  if (page === "terms") return TERMS_OF_SERVICE;
  if (page === "privacy") return PRIVACY_POLICY;
  return FAQ;
}

interface LegalPageViewProps {
  page: LegalPage;
}

export function LegalPageView({ page }: LegalPageViewProps) {
  const setView = useCadia((s) => s.setView);
  const doc = getDoc(page);

  const [highlight, setHighlight] = useState(false);
  const termsRef = useRef<HTMLButtonElement>(null);
  const privacyRef = useRef<HTMLButtonElement>(null);

  // Listen for the "Learn more" highlight event (only relevant on terms/privacy)
  useEffect(() => {
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    let highlightTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      setHighlight(true);
      const target = page === "terms" ? termsRef.current : page === "privacy" ? privacyRef.current : null;
      if (scrollTimer) clearTimeout(scrollTimer);
      if (highlightTimer) clearTimeout(highlightTimer);
      scrollTimer = setTimeout(() => {
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      highlightTimer = setTimeout(() => setHighlight(false), 6500);
    };
    window.addEventListener("cadia:highlight-legal", handler);
    return () => {
      window.removeEventListener("cadia:highlight-legal", handler);
      if (scrollTimer) clearTimeout(scrollTimer);
      if (highlightTimer) clearTimeout(highlightTimer);
    };
  }, [page]);

  return (
    <div className="relative min-h-screen overflow-hidden cadia-bg scanlines">
      <div className="cadia-particles" />
      <div className="cadia-bg-shine" />

      {/* Header — fixed */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-border/60 px-4 py-3 flex items-center justify-between bg-card/80 backdrop-blur-xl h-[49px]">
        <button
          onClick={() => setView("landing")}
          className="flex items-center gap-3 cursor-pointer"
          aria-label="Go to home"
        >
          <CadiaLogo size={30} animated={false} />
          <span className="font-pixel text-xs text-cadia tracking-wider">CADIA</span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView("landing")}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Back to Home
        </Button>
      </header>

      {/* Tab switcher — sticky under header */}
      <div className="fixed top-[49px] left-0 right-0 z-30 px-4 py-3 flex items-center gap-2 border-b border-border/40 bg-card/60 backdrop-blur-sm">
        <Shield className="h-3.5 w-3.5 text-cadia mr-1" />
        <button
          ref={termsRef}
          onClick={() => setView("terms")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
            page === "terms"
              ? "bg-cadia/15 text-cadia border-cadia/40"
              : "text-muted-foreground border-transparent hover:text-foreground hover:border-border/50"
          } ${highlight && page === "terms" ? "cadia-legal-highlight" : ""}`}
        >
          Terms of Service
        </button>
        <button
          ref={privacyRef}
          onClick={() => setView("privacy")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
            page === "privacy"
              ? "bg-cadia/15 text-cadia border-cadia/40"
              : "text-muted-foreground border-transparent hover:text-foreground hover:border-border/50"
          } ${highlight && page === "privacy" ? "cadia-legal-highlight" : ""}`}
        >
          Privacy Policy
        </button>
        <button
          onClick={() => setView("faq")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
            page === "faq"
              ? "bg-cadia/15 text-cadia border-cadia/40"
              : "text-muted-foreground border-transparent hover:text-foreground hover:border-border/50"
          }`}
        >
          FAQ
        </button>
      </div>

      {/* Content */}
      <main className="relative z-10 pt-[110px] pb-12 px-4 sm:px-8 max-w-3xl w-full mx-auto min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Title */}
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-cadia/20 border border-cadia/40 flex items-center justify-center">
              <FileText className="h-4 w-4 text-cadia" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {doc.title}
            </h1>
          </div>
          {doc.lastUpdated && (
            <p className="text-xs text-muted-foreground mb-6 ml-11">
              Last Updated: {doc.lastUpdated}
            </p>
          )}
          {!doc.lastUpdated && <div className="mb-6" />}

          {/* Sections — no boxes, just spacing + border separators */}
          <div className="space-y-6">
            {doc.sections.map((section, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="pb-6 border-b border-border/30 last:border-0 last:pb-0"
              >
                {section.heading && (
                  <h2 className="text-base font-bold text-foreground mb-3">
                    {section.heading}
                  </h2>
                )}
                {section.paragraphs?.map((p, j) => (
                  <p
                    key={j}
                    className="text-sm text-muted-foreground leading-relaxed mb-3 last:mb-0"
                  >
                    {p}
                  </p>
                ))}
                {section.list && (
                  <ul className="space-y-2 ml-1 mb-2">
                    {section.list.map((item, k) => (
                      <li
                        key={k}
                        className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2"
                      >
                        <span className="text-cadia mt-0.5 shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {section.link && (
                  <a
                    href={section.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-cadia hover:text-cadia-dark transition-colors mt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {section.link.label}
                  </a>
                )}
              </motion.div>
            ))}
          </div>

          {/* Back button at bottom */}
          <div className="flex justify-center mt-8">
            <Button
              onClick={() => setView("landing")}
              className="cadia-btn bg-cadia text-background hover:bg-cadia-dark text-sm font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Home
            </Button>
          </div>
        </motion.div>
      </main>

      <CadiaFooter />
    </div>
  );
}
