"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useCadia } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ScrollText,
  Search,
  Shield,
  Bot,
  Settings,
  FileText,
  Server,
  Filter,
  Power,
} from "lucide-react";
import type { LogType } from "@/lib/types";

// Merged: config + audit → "Dashboard" category
// Renamed: punishment → "Automod"
// New: botstatus type
const TYPE_META: Record<
  LogType,
  { color: string; label: string; icon: typeof Server }
> = {
  command: { color: "#e9d502", label: "Command", icon: FileText },
  moderation: { color: "#e9d502", label: "Moderation", icon: Shield },
  automod: { color: "#e9d502", label: "Automod", icon: Bot },
  config: { color: "#e9d502", label: "Dashboard", icon: Settings },
  audit: { color: "#e9d502", label: "Dashboard", icon: Settings },
  botstatus: { color: "#e9d502", label: "Bot Status", icon: Power },
  system: { color: "#e9d502", label: "System", icon: Server },
};

// Filter options — config and audit merged into "Dashboard"
const FILTER_TYPES: (LogType | "All")[] = [
  "All",
  "command",
  "moderation",
  "automod",
  "config",
  "botstatus",
];

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/**
 * Split log details into the main description and a reason.
 * Details format examples:
 *   "Muted 'noisy_user' for 10 minutes by Moderator Alex — reason: caps spam"
 *   "Kicked user 'spammer123' by nyx — reason: spam"
 *   "Set cooldown to 5s by nyx — RPG System"  (no reason)
 */
function splitDetails(details: string): { main: string; reason: string | null } {
  // Look for "— reason:" or "reason:" in the details
  const reasonMatch = details.match(/—\s*reason:\s*(.+?)$/i) || details.match(/\breason:\s*(.+?)$/i);
  if (reasonMatch) {
    const main = details.replace(reasonMatch[0], "").replace(/—\s*$/, "").trim();
    return { main, reason: reasonMatch[1].trim() };
  }
  return { main: details, reason: null };
}

export function LoggingTab() {
  const server = useCadia((s) => s.selectedServer);
  const allLogs = useCadia((s) => s.logs);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<LogType | "All">("All");

  if (!server) return null;

  const serverLogs = allLogs.filter((l) => l.serverId === server.id);
  const filtered = serverLogs.filter((l) => {
    // Merge config + audit: when filtering by "config", show both config and audit
    if (filterType === "config" && l.type !== "config" && l.type !== "audit") return false;
    if (filterType !== "All" && filterType !== "config" && l.type !== filterType) return false;
    if (
      search &&
      !l.action.toLowerCase().includes(search.toLowerCase()) &&
      !l.details.toLowerCase().includes(search.toLowerCase()) &&
      !l.actor.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-cadia" />
        <h2 className="text-xl font-bold text-foreground">
          <span className="text-cadia">Logs</span> &amp; Audit
        </h2>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by action, actor, or details…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm h-9"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto cadia-scroll pb-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-1" />
          {FILTER_TYPES.map((t) => {
            const label = t === "All" ? "All" : TYPE_META[t]?.label || t;
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 text-xs font-medium whitespace-nowrap rounded-md border transition-all capitalize ${
                  filterType === t
                    ? "bg-cadia text-background border-cadia"
                    : "bg-card/50 text-muted-foreground border-border hover:text-foreground hover:border-cadia/30"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Log list — scrollable container */}
      <div className="cadia-card overflow-hidden flex flex-col">
        <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-muted-foreground">
            {filtered.length} entries
          </span>
          <span className="text-[11px] text-muted-foreground">
            {server.name}
          </span>
        </div>
        <div
          className="overflow-y-auto cadia-scroll"
          style={{ maxHeight: "60vh" }}
        >
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No logs match your filters
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map((l, idx) => {
                const meta = TYPE_META[l.type];
                const { main, reason } = splitDetails(l.details);
                return (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.4) }}
                    className="px-3 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border mt-0.5"
                        style={{
                          background: `${meta.color}20`,
                          borderColor: `${meta.color}40`,
                          color: meta.color,
                        }}
                      >
                        <meta.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Line 1: Badge + Action + time */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className="text-[9px] font-semibold px-1.5 py-0 border"
                            style={{
                              background: `${meta.color}20`,
                              color: meta.color,
                              borderColor: `${meta.color}40`,
                            }}
                          >
                            {meta.label.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-semibold text-foreground">
                            {l.action}
                          </span>
                          <span
                            className="text-[11px] text-muted-foreground ml-auto shrink-0"
                            title={new Date(l.timestamp).toLocaleString()}
                          >
                            {timeAgo(l.timestamp)}
                          </span>
                        </div>
                        {/* Line 2: main description + "by actor" */}
                        <p className="text-xs text-foreground/80 mt-1 break-words leading-relaxed">
                          {main}{" "}
                          <span className="text-muted-foreground">
                            by <span className="text-cadia font-medium">{l.actor}</span>
                          </span>
                        </p>
                        {/* Line 3: Reason (only if present) */}
                        {reason && (
                          <p className="text-[11px] text-warning/90 mt-1 leading-relaxed">
                            <span className="font-semibold">Reason:</span> {reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
