"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Filter, Hash, Loader2, Save, ShieldCheck, Timer, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCadia } from "@/lib/store";
import type { AutoModConfig } from "@/lib/types";

const DEFAULT_CONFIG: AutoModConfig = {
  guildId: "",
  enabled: false,
  filters: {
    profanity: true,
    sexualContent: true,
    slurs: true,
    spam: true,
    mentionSpam: true,
    mentionLimit: 5,
    mentionRaidProtection: true,
    keywords: [],
    regexPatterns: [],
    allowList: [],
  },
  actions: {
    blockMessage: true,
    customMessage: "This message was blocked by Cadia's AutoMod.",
    alertChannelId: null,
    timeoutSeconds: 0,
  },
  exemptRoleIds: [],
  exemptChannelIds: [],
};

export function AutoModEditor({ onBack }: { onBack: () => void }) {
  const server = useCadia((state) => state.selectedServer);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!server) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/servers/${server.id}/automod`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Could not load AutoMod");
        return payload.config as AutoModConfig;
      })
      .then((next) => {
        setConfig(next);
        setDirty(false);
        setError("");
      })
      .catch((reason) => {
        if (reason.name !== "AbortError") setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [server?.id]);

  const change = (next: AutoModConfig) => {
    setConfig(next);
    setDirty(true);
    useCadia.setState({ hasUnsavedChanges: true });
  };
  const updateFilter = <K extends keyof AutoModConfig["filters"]>(key: K, value: AutoModConfig["filters"][K]) => {
    change({ ...config, filters: { ...config.filters, [key]: value } });
  };
  const updateAction = <K extends keyof AutoModConfig["actions"]>(key: K, value: AutoModConfig["actions"][K]) => {
    change({ ...config, actions: { ...config.actions, [key]: value } });
  };

  const save = async () => {
    if (!server || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/servers/${server.id}/automod`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not save AutoMod");
      setConfig(payload.config);
      setDirty(false);
      useCadia.setState({ hasUnsavedChanges: false });
      toast.success("AutoMod rules synchronized with Discord");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not save AutoMod";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!server) return null;
  const textChannels = server.channels.filter((channel) => channel.type === "text");
  const roles = server.roles.filter((role) => role.name !== "@everyone");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> All Modules
        </Button>
        <Button onClick={save} disabled={loading || saving || !dirty} className="h-9 bg-cadia text-background hover:bg-cadia-dark">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-cadia" /><h2 className="text-lg font-bold">AutoMod</h2></div>
          <p className="mt-1 text-xs text-muted-foreground">{server.name}</p>
        </div>
        <div className="flex items-center gap-2"><Label htmlFor="automod-enabled" className="text-xs">Protection</Label><Switch id="automod-enabled" checked={config.enabled} onCheckedChange={(enabled) => change({ ...config, enabled })} /></div>
      </div>

      {error && <div className="rounded-md border border-fail/40 bg-fail/10 px-3 py-2 text-xs text-fail">{error}</div>}
      {loading ? <div className="grid h-64 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-4">
            <SectionTitle icon={Filter} title="Detection" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle label="Profanity" checked={config.filters.profanity} onChange={(value) => updateFilter("profanity", value)} />
              <Toggle label="Sexual content" checked={config.filters.sexualContent} onChange={(value) => updateFilter("sexualContent", value)} />
              <Toggle label="Slurs" checked={config.filters.slurs} onChange={(value) => updateFilter("slurs", value)} />
              <Toggle label="Generic spam" checked={config.filters.spam} onChange={(value) => updateFilter("spam", value)} />
              <Toggle label="Mention spam" checked={config.filters.mentionSpam} onChange={(value) => updateFilter("mentionSpam", value)} />
              <Toggle label="Mention raid detection" checked={config.filters.mentionRaidProtection} onChange={(value) => updateFilter("mentionRaidProtection", value)} />
            </div>
            <Field label="Mention limit">
              <Input type="number" min={1} max={50} value={config.filters.mentionLimit} onChange={(event) => updateFilter("mentionLimit", clamp(Number(event.target.value), 1, 50))} />
            </Field>
            <ListField label="Custom keywords" value={config.filters.keywords} maxItems={1000} onChange={(value) => updateFilter("keywords", value)} />
            <ListField label="Rust regex patterns" value={config.filters.regexPatterns} maxItems={10} onChange={(value) => updateFilter("regexPatterns", value)} />
            <ListField label="Allowed terms" value={config.filters.allowList} maxItems={100} onChange={(value) => updateFilter("allowList", value)} />
          </section>

          <section className="space-y-4">
            <SectionTitle icon={Bell} title="Actions" />
            <Toggle label="Block matching messages" checked={config.actions.blockMessage} onChange={(value) => updateAction("blockMessage", value)} />
            <Field label="Blocked-message explanation">
              <Textarea value={config.actions.customMessage} maxLength={150} rows={3} onChange={(event) => updateAction("customMessage", event.target.value)} />
            </Field>
            <Field label="Alert channel" icon={Hash}>
              <select value={config.actions.alertChannelId || ""} onChange={(event) => updateAction("alertChannelId", event.target.value || null)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">No alert channel</option>
                {textChannels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}
              </select>
            </Field>
            <Field label="Timeout duration" icon={Timer}>
              <select value={config.actions.timeoutSeconds} onChange={(event) => updateAction("timeoutSeconds", Number(event.target.value))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value={0}>No timeout</option><option value={60}>1 minute</option><option value={300}>5 minutes</option><option value={600}>10 minutes</option><option value={3600}>1 hour</option><option value={86400}>1 day</option><option value={604800}>1 week</option>
              </select>
            </Field>

            <div className="border-t border-border pt-4 space-y-4">
              <SectionTitle icon={Users} title="Exemptions" />
              <CheckList label="Roles" items={roles} selected={config.exemptRoleIds} onChange={(exemptRoleIds) => change({ ...config, exemptRoleIds })} />
              <CheckList label="Channels" items={textChannels} selected={config.exemptChannelIds} onChange={(exemptChannelIds) => change({ ...config, exemptChannelIds })} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="flex h-10 items-center justify-between rounded-md border border-border px-3"><Label className="text-xs">{label}</Label><Switch checked={checked} onCheckedChange={onChange} /></div>;
}

function ListField({ label, value, maxItems, onChange }: { label: string; value: string[]; maxItems: number; onChange: (value: string[]) => void }) {
  return <Field label={`${label} (${value.length}/${maxItems})`}><Textarea value={value.join("\n")} rows={5} onChange={(event) => onChange(parseLines(event.target.value, maxItems))} className="font-mono text-xs resize-y" /></Field>;
}

function CheckList({ label, items, selected, onChange }: { label: string; items: { id: string; name: string }[]; selected: string[]; onChange: (ids: string[]) => void }) {
  return (
    <Field label={label}>
      <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2 space-y-1 cadia-scroll">
        {items.length ? items.map((item) => {
          const checked = selected.includes(item.id);
          return <label key={item.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/40"><Checkbox checked={checked} onCheckedChange={() => onChange(checked ? selected.filter((id) => id !== item.id) : [...selected, item.id])} /><span className="truncate">{item.name}</span></label>;
        }) : <span className="block p-2 text-xs text-muted-foreground">None available</span>}
      </div>
    </Field>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof ShieldCheck; title: string }) {
  return <h3 className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-cadia" />{title}</h3>;
}

function Field({ label, icon: Icon, children }: { label: string; icon?: typeof Hash; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="flex items-center gap-1.5 text-xs">{Icon && <Icon className="h-3.5 w-3.5" />}{label}</Label>{children}</div>;
}

function parseLines(value: string, maxItems: number) {
  return [...new Set(value.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean))].slice(0, maxItems);
}

function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min;
}
