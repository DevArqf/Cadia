"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useCadia } from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
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
  ArrowLeft,
  Clock,
  MessageSquare,
  Check,
  ChevronsUpDown,
  X,
  HelpCircle,
  Save,
  Shield,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import type { BotModule, ModuleCategory } from "@/lib/types";

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

interface ModuleDetailPageProps {
  module: BotModule;
  onBack: () => void;
}

export function ModuleDetailPage({ module: initialModule, onBack }: ModuleDetailPageProps) {
  const server = useCadia((s) => s.selectedServer);
  const user = useCadia((s) => s.user);
  const modules = useCadia((s) => s.modules);
  const toggleModule = useCadia((s) => s.toggleModule);
  const updateModule = useCadia((s) => s.updateModule);
  const addLog = useCadia((s) => s.addLog);

  const [allowedPickerOpen, setAllowedPickerOpen] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);

  const isAdminUnlocked = useCadia((s) => s.adminUnlocked);
  if (!server || (!user && !isAdminUnlocked)) return null;

  const effectiveUser = user || { id: "899385550585364481", username: "owner", discriminator: "0", globalName: "Owner", avatar: "#5e3a6d" };

  const m = modules.find((mod) => mod.id === initialModule.id) || initialModule;

  const selectableRoles = server.roles.filter(
    (r) => r.name !== "@everyone" && r.name.toLowerCase() !== "bot",
  );
  const moduleAllowedRoleIds = (m as BotModule & { allowedRoleIds?: string[] }).allowedRoleIds || [];
  const allowedRoles = server.roles.filter((r) =>
    moduleAllowedRoleIds.includes(r.id),
  );

  const handleToggleAllowed = (roleId: string) => {
    const next = moduleAllowedRoleIds.includes(roleId)
      ? moduleAllowedRoleIds.filter((x) => x !== roleId)
      : [...moduleAllowedRoleIds, roleId];
    updateModule(m.id, { allowedRoleIds: next } as Partial<BotModule>);
  };

  const handleSave = async () => {
		await useCadia.getState().saveConfig();
    addLog({
      type: "audit",
      serverId: server.id,
      serverName: server.name,
      actor: effectiveUser.username,
      actorId: effectiveUser.id,
      action: "Saved module config",
      details: `Module: ${m.name}`,
    });
    toast.success(`${m.name} configuration saved`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Back button + title */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          All Modules
        </Button>
      </div>

      {/* Module header card */}
      <div className="cadia-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-xl font-bold text-foreground">{m.name}</h2>
              <Badge className="text-[9px] font-medium px-1.5 py-0 border bg-muted text-muted-foreground border-border">
                {m.category}
              </Badge>
              {m.enabled ? (
                <Badge className="text-[9px] font-medium px-1.5 py-0 bg-success/20 text-success border border-success/40">
                  ON
                </Badge>
              ) : (
                <Badge className="text-[9px] font-medium px-1.5 py-0 bg-fail/20 text-fail border border-fail/40">
                  OFF
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{m.description}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {m.commands.length} commands in this category · {m.commands.filter(c => c.enabled).length} enabled
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Enabled</span>
            <Switch
              checked={m.enabled}
              disabled={m.configurable === false}
              onCheckedChange={() => {
                toggleModule(m.id);
                toast.success(`${m.name} ${m.enabled ? "disabled" : "enabled"}`);
              }}
              aria-label={m.configurable === false ? `${m.name} is always enabled` : `Enable ${m.name}`}
            />
          </div>
        </div>
      </div>

      {/* Configuration sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Message shown when the module is disabled */}
        <div className="cadia-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-cadia" />
              <h3 className="text-sm font-semibold text-foreground">
                Disabled Message
              </h3>
            </div>
            <button
              onClick={() => setVariablesOpen(true)}
              className="text-[10px] text-cadia hover:text-cadia-dark flex items-center gap-1 transition-colors"
            >
              <HelpCircle className="h-2.5 w-2.5" />
              Variables
            </button>
          </div>
          <Textarea
            value={m.response}
            onChange={(e) => updateModule(m.id, { response: e.target.value })}
            rows={3}
            className="text-xs font-mono"
            placeholder="This module is currently disabled. Use {module} or {command}."
          />
        </div>

        {/* Cooldown with slider + editable number input */}
        <div className="cadia-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">
                Cooldown (seconds)
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={m.cooldown}
                onChange={(e) => {
                  // Only allow digits, clamp 0-60
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  if (val === "") {
                    updateModule(m.id, { cooldown: 0 });
                    return;
                  }
                  const num = parseInt(val, 10);
                  if (isNaN(num)) return;
                  const clamped = Math.max(0, Math.min(60, num));
                  updateModule(m.id, { cooldown: clamped });
                }}
                onBlur={(e) => {
                  // On blur, ensure valid number 0-60
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val) || val < 0) {
                    updateModule(m.id, { cooldown: 0 });
                  } else if (val > 60) {
                    updateModule(m.id, { cooldown: 60 });
                  }
                }}
                className="w-14 h-8 text-center font-mono text-warning text-sm font-bold bg-muted/40 border border-border/60 rounded-md focus:outline-none focus:border-warning/50 focus:ring-1 focus:ring-warning/30 transition-colors"
                aria-label="Cooldown in seconds"
              />
              <span className="text-xs text-muted-foreground font-medium">s</span>
            </div>
          </div>
          <Slider
            value={[m.cooldown]}
            onValueChange={(v) => updateModule(m.id, { cooldown: v[0] })}
            min={0}
            max={60}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>0s</span>
            <span>60s</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Applied to this module&apos;s commands unless a command has its own cooldown.
          </p>
        </div>
      </div>

      {/* Allowed Roles — roles that CAN use this module */}
      <div className="cadia-card p-5">
        <div className="flex items-center gap-2 mb-1.5">
          <Shield className="h-4 w-4 text-success" />
          <h3 className="text-sm font-semibold text-foreground">
            Allowed Roles
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Only members with one of these roles can use this module&apos;s commands. Leave empty to allow every role.
        </p>
        <Popover open={allowedPickerOpen} onOpenChange={setAllowedPickerOpen}>
          <PopoverTrigger asChild>
            <div
              role="button"
              aria-expanded={allowedPickerOpen}
              tabIndex={0}
              className="w-full justify-between font-normal h-auto min-h-[44px] bg-card/50 border border-input rounded-md px-3 py-2 flex items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring transition-colors hover:bg-card"
            >
              {allowedRoles.length === 0 ? (
                <span className="text-muted-foreground text-xs flex items-center gap-1.5 py-1.5">
                  <Shield className="h-3 w-3 text-fail" />
                  All roles can use this module
                </span>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap py-1.5">
                  {allowedRoles.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border"
                      style={{
                        background: `${r.color}20`,
                        color: r.color,
                        borderColor: `${r.color}40`,
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: r.color }}
                      />
                      {r.name}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAllowed(r.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            e.preventDefault();
                            handleToggleAllowed(r.id);
                          }
                        }}
                        className="ml-0.5 opacity-60 hover:opacity-100 cursor-pointer inline-flex"
                        aria-label={`Remove ${r.name}`}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </span>
                  ))}
                </div>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="p-0 max-w-[400px]" align="start">
            <Command>
              <CommandInput placeholder="Search roles…" />
              <CommandList>
                <CommandEmpty>No roles found.</CommandEmpty>
                <CommandGroup>
                  {selectableRoles.map((r) => {
                    const selected = moduleAllowedRoleIds.includes(r.id);
                    return (
                      <CommandItem
                        key={r.id}
                        value={r.name}
                        onSelect={() => handleToggleAllowed(r.id)}
                        className="gap-2"
                      >
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            selected ? "bg-success border-success" : "border-border"
                          }`}
                        >
                          {selected && <Check className="h-3 w-3 text-background" />}
                        </div>
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: r.color }}
                        />
                        <span className="text-sm flex-1">{r.name}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="cadia-btn bg-cadia text-background hover:bg-cadia-dark text-sm font-semibold"
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Save Configuration
        </Button>
      </div>

      {/* Variables Modal — filtered by module category */}
      <Dialog open={variablesOpen} onOpenChange={setVariablesOpen}>
        <DialogContent className="max-w-md border-cadia/30 p-0 overflow-hidden bg-card backdrop-blur-xl shadow-2xl">
          <div className="h-1 bg-gradient-to-r from-cadia via-warning to-cadia" />
          <DialogHeader className="px-5 pt-4 pb-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-cadia">
              <HelpCircle className="h-4 w-4" />
              Template Variables
              <Badge className="text-[9px] font-medium bg-warning/20 text-warning border border-warning/40 ml-1">
                {m.category}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-5 space-y-2 max-h-[60vh] overflow-y-auto cadia-scroll">
            <p className="text-xs text-muted-foreground mb-3">
              Variables available for {m.category} commands. They get replaced with actual values when the command runs.
            </p>
            {ALL_VARIABLES.filter((v) => v.categories.includes(m.category)).map((v) => (
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
    </motion.div>
  );
}
