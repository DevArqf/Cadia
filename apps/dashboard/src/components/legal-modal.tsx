"use client";

import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CadiaLogo } from "@/components/cadia-logo";
import { ExternalLink, FileText } from "lucide-react";
import type { LegalDoc } from "@/lib/legal-content";

interface LegalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: LegalDoc | null;
}

export function LegalModal({ open, onOpenChange, doc }: LegalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-cadia/30 p-0 overflow-hidden bg-card backdrop-blur-xl shadow-2xl">
        <div className="h-1 bg-gradient-to-r from-cadia via-warning to-cadia" />
        {doc && (
          <>
            <DialogHeader className="px-6 pt-4 pb-2 border-b border-border/40">
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-cadia">
                <FileText className="h-4 w-4" />
                {doc.title}
              </DialogTitle>
              {doc.lastUpdated && (
                <p className="text-[11px] text-muted-foreground">
                  Last Updated: {doc.lastUpdated}
                </p>
              )}
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] cadia-scroll">
              <div className="px-6 py-4 space-y-4">
                {doc.sections.map((section, i) => (
                  <div key={i} className="space-y-2">
                    {section.heading && (
                      <h3 className="text-sm font-bold text-foreground">
                        {section.heading}
                      </h3>
                    )}
                    {section.paragraphs?.map((p, j) => (
                      <p
                        key={j}
                        className="text-xs text-muted-foreground leading-relaxed"
                      >
                        {p}
                      </p>
                    ))}
                    {section.list && (
                      <ul className="space-y-1 ml-1">
                        {section.list.map((item, k) => (
                          <li
                            key={k}
                            className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2"
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
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-cadia hover:text-cadia-dark transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {section.link.label}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
