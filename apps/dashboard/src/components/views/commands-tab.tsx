"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCadia } from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command as Cmd,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Terminal,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  Check,
  ChevronsUpDown,
  X,
  Clock,
  MessageSquare,
  HelpCircle,
  Save,
  Shield,
  Hash,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import type { BotCommand, ModuleCategory } from "@/lib/types";

const ALL_VARIABLES = [
  { name: "{user}", desc: "The username of the person running the command", categories: ["Moderation", "RPG", "Utility", "Fun", "Logging"] },
  { name: "{target}", desc: "The target member", categories: ["Moderation", "RPG"] },
  { name: "{action}", desc: "The action performed (kick, ban, mute, etc.)", categories: ["Moderation", "Logging"] },
  { name: "{reason}", desc: "The reason provided for the action", categories: ["Moderation", "Logging"] },
  { name: "{server}", desc: "The server name", categories: ["Moderation", "RPG", "Utility", "Fun", "Logging"] },
  { name: "{count}", desc: "Member count or sequential number", categories: ["Utility", "Logging"] },
  { name: "{damage}", desc: "Damage dealt (RPG combat)", categories: ["RPG"] },
  { name: "{skill}", desc: "Skill name used (RPG)", categories: ["RPG"] },
  { name: "{result}", desc: "Random result (dice, 8ball, etc.)", categories: ["Fun"] },
  { name: "{moderator}", desc: "The moderator who performed the action", categories: ["Moderation", "Logging"] },
  { name: "{channel}", desc: "The channel where the command was run", categories: ["Moderation", "RPG", "Utility", "Fun", "Logging"] },
  { name: "{actor}", desc: "Who performed the logged action", categories: ["Logging"] },
];

export function CommandsTab() {
  const modules = useCadia((s) => s.modules);
  const server = useCadia((s) => s.selectedServer);
  const toggleCommand = useCadia((s) => s.toggleCommand);
  const updateCommand = useCadia((s) => s.updateCommand);
  const addLog = useCadia((s) => s.addLog);
  const user = useCadia((s) => s.user);

  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState<string>("All");
  const [expandedCmd, setExpandedCmd] = useState<string | null>(null);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [variablesCategory, setVariablesCategory] = useState<ModuleCategory | "all">("all");

  if (!server) return null;

  const effectiveUser = user || {
    id: "899385550585364481",
    username: "owner",
    discriminator: "0",
    globalName: "Owner",
    avatar: "#5e3a6d",
  };

  const allCommands = modules.flatMap((m) =>
    m.commands.map((c) => ({ ...c, moduleId: m.id, moduleName: m.name, moduleCategory: m.category })),
  );

  const filteredCommands = allCommands.filter((c) => {
    if (filterModule !== "All" && c.moduleId !== filterModule) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const moduleOptions = ["All", ...modules.map((m) => m.id)];
  const visibleVariables = variablesCategory === "all"
    ? ALL_VARIABLES
    : ALL_VARIABLES.filter((v) => v.categories.includes(variablesCategory));

  const textChannels = server.channels.filter((c) => c.type === "text");
  const selectableRoles = server.roles.filter(
    (r) => r.name !== "@everyone" && r.name.toLowerCase() !== "bot",
  );

  const handleSaveCommand = (moduleId: string, cmd: BotCommand) => {
    addLog({
      type: "audit",
      serverId: server.id,
      serverName: server.name,
      actor: effectiveUser.username,
      actorId: effectiveUser.id,
      action: "Saved command config",
      details: `Command: /${cmd.name} (module: ${modules.find((m) => m.id === moduleId)?.name})`,
    });
    toast.success(`/${cmd.name} settings saved`);
  };

  const toggleIdInArray = (cmd: BotCommand, field: "allowedRoleIds" | "allowedChannelIds" | "ignoredChannelIds" | "ignoredRoleIds", id: string) => {
    const current = (cmd[field] || []) as string[];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    updateCommand(cmd.moduleId, cmd.id, { [field]: next } as Partial<BotCommand>);
  };

  const openVariablesFor = (category: ModuleCategory) => {
    setVariablesCategory(category);
    setVariablesOpen(true);
  };

  // Helper to render a multi-select dropdown (Dyno-style)
  const renderMultiSelect = (
    cmd: BotCommand,
    field: "allowedRoleIds" | "allowedChannelIds" | "ignoredChannelIds" | "ignoredRoleIds",
    label: string,
    Icon: typeof Hash,
    items: { id: string; name: string; color?: string }[],
    placeholder: string,
  ) => {
    const selected = (cmd[field] || []) as string[];
    const selectedItems = items.filter((i) => selected.includes(i.id));
    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Icon className="h-3 w-3 text-muted-foreground" />
          {label}
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between font-normal h-auto min-h-[40px] bg-card/50"
            >
              {selectedItems.length === 0 ? (
                <span className="text-muted-foreground text-xs">{placeholder}</span>
              ) : (
                <div className="flex items-center gap-1 flex-wrap py-0.5">
                  {selectedItems.slice(0, 3).map((i) => (
                    <span
                      key={i.id}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border"
                      style={{
                        background: i.color ? `${i.color}20` : "rgba(101,184,218,0.1)",
                        color: i.color || "#65b8da",
                        borderColor: i.color ? `${i.color}40` : "rgba(101,184,218,0.3)",
                      }}
                    >
                      {i.color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: i.color }} />}
                      {i.name}
                    </span>
                  ))}
                  {selectedItems.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{selectedItems.length - 3}</span>
                  )}
                </div>
              )}
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 max-w-[350px]" align="start">
            <Cmd>
              <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {items.map((i) => {
                    const isSelected = selected.includes(i.id);
                    return (
                      <CommandItem
                        key={i.id}
                        value={i.name}
                        onSelect={() => toggleIdInArray(cmd, field, i.id)}
                        className="gap-2"
                      >
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-cadia border-cadia" : "border-border"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-background" />}
                        </div>
                        {i.color && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: i.color }} />}
                        <span className="text-sm flex-1">{i.name}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Cmd>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-cadia" />
          <h2 className="text-xl font-bold text-foreground">Commands</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setVariablesCategory("all");
            setVariablesOpen(true);
          }}
          className="text-xs font-medium"
        >
          <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
          All Variables
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search commands…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card/50 focus:outline-none focus:border-cadia/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto cadia-scroll pb-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-1" />
          {moduleOptions.map((mId) => {
            const label = mId === "All" ? "All" : modules.find((m) => m.id === mId)?.name || mId;
            return (
              <button
                key={mId}
                onClick={() => setFilterModule(mId)}
                className={`px-2.5 py-1 text-xs font-medium whitespace-nowrap rounded-md border transition-all ${
                  filterModule === mId
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

      {/* Commands list */}
      <div className="space-y-2">
        {filteredCommands.map((c) => {
          const isExpanded = expandedCmd === c.id;
          const parentModule = modules.find((m) => m.id === c.moduleId);
          return (
            <div key={c.id} className={`cadia-card overflow-hidden transition-all ${isExpanded ? "border-cadia/40" : ""}`}>
              {/* Command header — Dyno-style row */}
              <div className="flex items-center gap-3 p-3 sm:p-4">
                <button
                  onClick={() => setExpandedCmd(isExpanded ? null : c.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-warning/30 bg-warning/10 text-warning">
                    <Terminal className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        /{c.name}
                      </span>
                      <Badge className="text-[9px] font-medium px-1.5 py-0 border bg-muted text-muted-foreground border-border">
                        {c.moduleName}
                      </Badge>
                      <Badge className="text-[9px] font-medium px-1.5 py-0 border bg-muted text-muted-foreground border-border">
                        {c.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {c.description}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                <Switch
                  checked={c.enabled}
                  onCheckedChange={() => {
                    toggleCommand(c.moduleId, c.id);
                  }}
                  aria-label={`Enable /${c.name}`}
                />
              </div>

              {/* Expanded config — Dyno-style permissions modal content */}
              <AnimatePresence>
                {isExpanded && parentModule && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-border/60 bg-background/40"
                  >
                    <div className="p-4 sm:p-5 space-y-4">
                      {/* Header: command name + Variables */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Terminal className="h-4 w-4 text-cadia" />
                          /{c.name}
                        </h3>
                        <button
                          onClick={() => openVariablesFor(c.moduleCategory)}
                          className="text-[10px] text-cadia hover:text-cadia-dark flex items-center gap-1 transition-colors"
                        >
                          <HelpCircle className="h-2.5 w-2.5" />
                          Variables
                        </button>
                      </div>

                      {/* Cooldown — slider + editable number input */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-warning" />
                            Cooldown (seconds)
                          </span>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={c.cooldown}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, "");
                                if (val === "") {
                                  updateCommand(c.moduleId, c.id, { cooldown: 0 });
                                  return;
                                }
                                const num = parseInt(val, 10);
                                if (isNaN(num)) return;
                                const clamped = Math.max(0, Math.min(60, num));
                                updateCommand(c.moduleId, c.id, { cooldown: clamped });
                              }}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (isNaN(val) || val < 0) {
                                  updateCommand(c.moduleId, c.id, { cooldown: 0 });
                                } else if (val > 60) {
                                  updateCommand(c.moduleId, c.id, { cooldown: 60 });
                                }
                              }}
                              className="w-12 h-7 text-center font-mono text-warning text-sm font-bold bg-muted/40 border border-border/60 rounded-md focus:outline-none focus:border-warning/50 focus:ring-1 focus:ring-warning/30 transition-colors"
                              aria-label="Cooldown in seconds"
                            />
                            <span className="text-xs text-muted-foreground">s</span>
                          </div>
                        </Label>
                        <input
                          type="range"
                          min={0}
                          max={60}
                          step={1}
                          value={c.cooldown}
                          onChange={(e) => updateCommand(c.moduleId, c.id, { cooldown: parseInt(e.target.value) })}
                          className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>0s</span>
                          <span>60s</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          The amount of cooldown set between each {parentModule.name} prefix command
                        </p>
                      </div>

                      {/* Allowed Channels */}
                      {renderMultiSelect(
                        c, "allowedChannelIds", "Allowed Channels", Hash,
                        textChannels.map((ch) => ({ id: ch.id, name: ch.name })),
                        "All channels",
                      )}

                      {/* Ignored Channels */}
                      {renderMultiSelect(
                        c, "ignoredChannelIds", "Ignored Channels", Ban,
                        textChannels.map((ch) => ({ id: ch.id, name: ch.name })),
                        "No channels ignored",
                      )}

                      {/* Allowed Roles */}
                      {renderMultiSelect(
                        c, "allowedRoleIds", "Allowed Roles", Shield,
                        selectableRoles.map((r) => ({ id: r.id, name: r.name, color: r.color })),
                        "Restricted to Administrator (default)",
                      )}

                      {/* Ignored Roles */}
                      {renderMultiSelect(
                        c, "ignoredRoleIds", "Ignored Roles", Ban,
                        selectableRoles.map((r) => ({ id: r.id, name: r.name, color: r.color })),
                        "No roles ignored",
                      )}

                      {/* Save */}
                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={() => handleSaveCommand(c.moduleId, c)}
                          disabled={!c.enabled}
                          className="cadia-btn bg-cadia text-background hover:bg-cadia-dark text-xs font-semibold"
                        >
                          <Save className="h-3.5 w-3.5 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {filteredCommands.length === 0 && (
        <div className="cadia-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No commands match your filters</p>
        </div>
      )}

      {/* Variables Modal */}
      <Dialog open={variablesOpen} onOpenChange={setVariablesOpen}>
        <DialogContent className="max-w-md border-cadia/30 p-0 overflow-hidden bg-card backdrop-blur-xl shadow-2xl">
          <div className="h-1 bg-gradient-to-r from-cadia via-warning to-cadia" />
          <DialogHeader className="px-5 pt-4 pb-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-cadia">
              <HelpCircle className="h-4 w-4" />
              Template Variables
              {variablesCategory !== "all" && (
                <Badge className="text-[9px] font-medium bg-warning/20 text-warning border border-warning/40 ml-1">
                  {variablesCategory}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-5 space-y-2 max-h-[60vh] overflow-y-auto cadia-scroll">
            <p className="text-xs text-muted-foreground mb-3">
              {variablesCategory === "all"
                ? "All available variables. When viewing a specific command, only relevant variables are shown."
                : `Variables available for ${variablesCategory} commands.`}
            </p>
            {visibleVariables.map((v) => (
              <div
                key={v.name}
                className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60 bg-card/40 hover:bg-muted/30 transition-colors"
              >
                <code className="text-xs font-mono text-cadia bg-cadia/10 px-2 py-0.5 rounded shrink-0">
                  {v.name}
                </code>
                <span className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                  {v.desc}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
