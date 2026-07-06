"use client";

import { useDeferredValue, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useCadia } from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Boxes, Settings, Search, Filter } from "lucide-react";
import type { ModuleCategory } from "@/lib/types";

const ModuleDetailPage = dynamic(() => import("./module-detail-page").then((module) => module.ModuleDetailPage));
const SuggestionEditor = dynamic(() => import("./suggestion-editor").then((module) => module.SuggestionEditor));
const AutoModEditor = dynamic(() => import("./automod-editor").then((module) => module.AutoModEditor));

// Unified palette — all categories use the same gold accent
const CATEGORY_COLOR = "#e9d502";

export function ModulesTab() {
  const modules = useCadia((s) => s.modules);
  const server = useCadia((s) => s.selectedServer);
  const activeModuleId = useCadia((s) => s.activeModuleId);
  const setActiveModule = useCadia((s) => s.setActiveModule);
  const toggleModule = useCadia((s) => s.toggleModule);

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [filterCat, setFilterCat] = useState<ModuleCategory | "All">("All");

  const filtered = useMemo(() => modules.filter((m) => {
    if (filterCat !== "All" && m.category !== filterCat) return false;
    if (deferredSearch && !m.name.toLowerCase().includes(deferredSearch) && !m.description.toLowerCase().includes(deferredSearch)) return false;
    return true;
  }), [modules, filterCat, deferredSearch]);

  if (!server) return null;

  // If a module is selected, show the full module detail page
  if (activeModuleId) {
    const mod = modules.find((m) => m.id === activeModuleId);
    if (mod) {
      if (mod.id === "automod") return <AutoModEditor onBack={() => setActiveModule(null)} />;
      if (mod.id === "suggestions" || mod.id === "mod-suggestions") return <SuggestionEditor onBack={() => setActiveModule(null)} />;
      return <ModuleDetailPage module={mod} onBack={() => setActiveModule(null)} />;
    }
  }

  const categories: (ModuleCategory | "All")[] = ["All", "Moderation", "Community", "RPG", "Utility", "Fun", "Logging"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Boxes className="h-5 w-5 text-cadia" />
          <h2 className="text-xl font-bold text-foreground">
            <span className="text-cadia">Modules</span>
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {modules.filter((m) => m.enabled).length}/{modules.length} active
        </span>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search modules…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card/50 focus:outline-none focus:border-cadia/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto cadia-scroll pb-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-1" />
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`px-2.5 py-1 text-xs font-medium whitespace-nowrap rounded-md border transition-all ${
                filterCat === c
                  ? "bg-cadia text-background border-cadia"
                  : "bg-card/50 text-muted-foreground border-border hover:text-foreground hover:border-cadia/30"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Module grid — like the reference image */}
      <div className="min-h-[180px] overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${filterCat}:${deferredSearch}`}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
          {filtered.length === 0 ? (
            <div className="cadia-card p-6 text-center sm:col-span-2 lg:col-span-3">
              <p className="text-sm text-muted-foreground">No modules match your filters</p>
            </div>
          ) : filtered.map((m) => {
            const catColor = CATEGORY_COLOR;
            return (
              <div key={m.id} className="cadia-card cadia-card-hover p-4 flex flex-col">
                {/* Header: title + toggle */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">
                      {m.name}
                    </h3>
                  </div>
                  <Switch
                    checked={m.enabled}
                    onCheckedChange={() => toggleModule(m.id)}
                    aria-label={`Enable ${m.name}`}
                  />
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-4 line-clamp-3">
                  {m.description}
                </p>

                {/* Bottom row: category badge + SETTINGS button */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/40">
                  <Badge
                    className="text-[9px] font-medium px-1.5 py-0 border"
                    style={{
                      background: `${catColor}20`,
                      color: catColor,
                      borderColor: `${catColor}40`,
                    }}
                  >
                    {m.category}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => setActiveModule(m.id)}
                    className="cadia-btn bg-rpg text-white hover:bg-rpg/90 text-xs font-semibold h-8"
                  >
                    <Settings className="h-3.5 w-3.5 mr-1" />
                    Settings
                  </Button>
                </div>
              </div>
            );
          })}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
