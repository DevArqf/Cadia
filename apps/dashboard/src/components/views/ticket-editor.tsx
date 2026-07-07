"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCadia } from "@/lib/store";
import type { TicketAppearanceConfig, TicketEmbedAppearance } from "@/lib/types";
import { DiscordMarkdown } from "@/components/discord-markdown";

const base = { authorName: "", authorIconUrl: "", footerIconUrl: "", color: "#65b8da", thumbnailUrl: "", imageUrl: "", showTimestamp: false };
const DEFAULT_CONFIG: TicketAppearanceConfig = {
  guildId: "",
  panelChannelId: null,
  panelMessageId: null,
  enabled: false,
  panel: { ...base, title: "Need help?", description: "Open a ticket and the support team will help you as soon as possible.\n\n**Limit:** {maxOpen} open ticket(s) per member.", footer: "Cadia Ticket System", buttonLabel: "Open Ticket", buttonEmoji: "📨", controlType: "button" },
  openedTicket: { ...base, title: "Ticket #{ticketNumber}", description: "**Opened By:** {user}\n**Created:** {created}\n\nDescribe what you need help with.", footer: "{panelTitle}" },
};

export function TicketEditor({ onBack }: { onBack: () => void }) {
  const server = useCadia((state) => state.selectedServer);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState<"panel" | "openedTicket">("panel");

  useEffect(() => {
    if (!server) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/servers/${server.id}/tickets`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.message); return body.config; })
      .then((next) => { setConfig(normalizeDashboardTicketConfig(next)); setDirty(false); })
      .catch((error) => { if (error.name !== "AbortError") toast.error(error.message || "Could not load ticket appearance"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [server?.id]);

  const change = <K extends "panel" | "openedTicket">(key: K, patch: Partial<TicketAppearanceConfig[K]>) => {
    setConfig((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
    setDirty(true);
    useCadia.setState({ hasUnsavedChanges: true });
  };

  const save = async () => {
    if (!server || saving) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/servers/${server.id}/tickets`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ config: normalizeDashboardTicketConfig(config) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Could not save ticket appearance");
      setConfig(body.config);
      setDirty(false);
      useCadia.setState({ hasUnsavedChanges: false });
      toast.success("Ticket experience updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save ticket appearance");
    } finally { setSaving(false); }
  };

  if (!server) return null;
  const sample = { user: "@sample-user", username: "sample-user", userId: "123456789", ticketNumber: "42", created: "a few seconds ago", panelTitle: config.panel.title, maxOpen: "1", serverIcon: server.icon.startsWith("http") ? server.icon : "" };
  const current = config[preview];

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3"><Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5 mr-1.5" />All Modules</Button><Button onClick={save} disabled={loading || saving || !dirty} className="bg-cadia text-background">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save</Button></div>
    <div className="border-b border-border pb-4"><h2 className="text-lg font-bold flex items-center gap-2"><Ticket className="h-5 w-5 text-cadia" />Ticket Experience</h2><p className="text-xs text-muted-foreground mt-1">Design the panel members see and the message that opens each ticket.</p></div>
    {loading ? <div className="h-64 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
      <div className="space-y-5">
		<Field label="Panel channel">
		  <Select value={config.panelChannelId || "none"} onValueChange={(value) => { setConfig((current) => ({ ...current, panelChannelId: value === "none" ? null : value })); setDirty(true); useCadia.setState({ hasUnsavedChanges: true }); }}>
			<SelectTrigger className="w-full"><SelectValue placeholder="Choose a text channel" /></SelectTrigger>
			<SelectContent><SelectItem value="none">No channel selected</SelectItem>{server.channels.filter((channel) => channel.type === "text").map((channel) => <SelectItem key={channel.id} value={channel.id}>#{channel.name}</SelectItem>)}</SelectContent>
		  </Select>
		</Field>
		<Tabs value={preview} onValueChange={(value) => setPreview(value as typeof preview)}>
        <TabsList className="grid grid-cols-2 w-full"><TabsTrigger value="panel">Setup Channel Panel</TabsTrigger><TabsTrigger value="openedTicket">Created Ticket</TabsTrigger></TabsList>
        <TabsContent value="panel" className="mt-4"><EmbedFields value={config.panel} update={(patch) => change("panel", patch)} panel /></TabsContent>
        <TabsContent value="openedTicket" className="mt-4"><EmbedFields value={config.openedTicket} update={(patch) => change("openedTicket", patch)} /></TabsContent>
		</Tabs>
	  </div>
      <div className="xl:sticky xl:top-16 self-start space-y-3"><h3 className="text-xs font-semibold uppercase text-muted-foreground">Live Discord Preview</h3><DiscordPreview value={current} variables={sample} button={preview === "panel" ? config.panel : null} /></div>
    </div>}
  </div>;
}

function EmbedFields({ value, update, panel = false }: { value: TicketEmbedAppearance & Partial<{ buttonLabel: string; buttonEmoji: string }>; update: (patch: any) => void; panel?: boolean }) {
  return <div className="space-y-4">
    <p className="text-[11px] text-muted-foreground">Variables: {panel ? "{maxOpen}, {panelTitle}, {serverIcon}" : "{user}, {username}, {userId}, {ticketNumber}, {created}, {panelTitle}, {serverIcon}"}. Use {"{serverIcon}"} in an icon, thumbnail, or image URL field.</p>
	{panel && <Field label="Open control"><CustomSelect value={value.controlType || "button"} update={(controlType) => update({ controlType })} options={[{ value: "button", label: "Button" }, { value: "select", label: "Select menu" }]} /></Field>}
    <Field label="Author name"><Input value={value.authorName} maxLength={256} onChange={(e) => update({ authorName: e.target.value })} /></Field>
    <div className="grid sm:grid-cols-2 gap-4"><Field label="Author icon URL"><Input value={value.authorIconUrl} onChange={(e) => update({ authorIconUrl: e.target.value })} /></Field><Field label="Color"><div className="flex gap-2"><input type="color" value={validColor(value.color)} onChange={(e) => update({ color: e.target.value })} className="h-9 w-11 rounded border p-1" /><Input value={value.color} maxLength={7} onChange={(e) => update({ color: e.target.value })} /></div></Field></div>
    <Field label="Title"><Input value={value.title} maxLength={256} onChange={(e) => update({ title: e.target.value })} /></Field>
    <Field label="Description"><Textarea value={value.description} maxLength={4000} rows={8} onChange={(e) => update({ description: e.target.value })} /></Field>
    <div className="grid sm:grid-cols-2 gap-4"><Field label="Footer"><Input value={value.footer} maxLength={2000} onChange={(e) => update({ footer: e.target.value })} /></Field><Field label="Footer icon URL"><Input value={value.footerIconUrl} onChange={(e) => update({ footerIconUrl: e.target.value })} /></Field><Field label="Thumbnail URL"><Input value={value.thumbnailUrl} onChange={(e) => update({ thumbnailUrl: e.target.value })} /></Field><Field label="Large image URL"><Input value={value.imageUrl} onChange={(e) => update({ imageUrl: e.target.value })} /></Field></div>
    {panel && <div className="grid sm:grid-cols-2 gap-4"><Field label="Button label"><Input value={value.buttonLabel || ""} maxLength={80} onChange={(e) => update({ buttonLabel: e.target.value })} /></Field><Field label="Button emoji"><Input value={value.buttonEmoji || ""} maxLength={100} onChange={(e) => update({ buttonEmoji: e.target.value })} /></Field></div>}
    <div className="flex justify-between border-t border-border pt-4"><Label className="text-xs">Timestamp</Label><Switch checked={value.showTimestamp} onCheckedChange={(showTimestamp) => update({ showTimestamp })} /></div>
  </div>;
}

function DiscordPreview({ value, variables, button }: { value: TicketEmbedAppearance; variables: Record<string, string>; button: (TicketAppearanceConfig["panel"] | null) }) {
  const render = (text: string) => text.replace(/\{([a-z]+)\}/gi, (match, key) => variables[key] ?? variables[key[0].toLowerCase() + key.slice(1)] ?? match);
  const media = (url: string) => render(url) || "";
  return <div className="rounded-md bg-[#313338] p-4 text-[#dbdee1]"><div className="text-sm font-semibold text-white mb-2">Cadia <span className="rounded bg-[#5865f2] px-1 py-0.5 text-[9px]">APP</span></div><div className="rounded-sm bg-[#2b2d31] p-3 overflow-hidden" style={{ borderLeft: `4px solid ${validColor(value.color)}` }}>{media(value.thumbnailUrl) && <img src={media(value.thumbnailUrl)} alt="" className="float-right ml-3 h-20 w-20 rounded object-cover" />}{value.authorName && <div className="flex gap-1.5 items-center text-xs font-semibold mb-2">{media(value.authorIconUrl) && <img src={media(value.authorIconUrl)} alt="" className="h-5 w-5 rounded-full" />}<DiscordMarkdown>{render(value.authorName)}</DiscordMarkdown></div>}<div className="font-semibold text-white text-sm"><DiscordMarkdown>{render(value.title)}</DiscordMarkdown></div><DiscordMarkdown className="text-sm mt-1">{render(value.description)}</DiscordMarkdown>{media(value.imageUrl) && <img src={media(value.imageUrl)} alt="" className="clear-both mt-3 max-h-72 w-full rounded object-cover" />}{value.footer && <div className="clear-both flex gap-1.5 items-center mt-3 text-[10px] text-[#b5bac1]">{media(value.footerIconUrl) && <img src={media(value.footerIconUrl)} alt="" className="h-4 w-4 rounded-full" />}<DiscordMarkdown>{render(value.footer)}</DiscordMarkdown>{value.showTimestamp ? " • Today" : ""}</div>}{button && (button.controlType === "select" ? <div className="clear-both mt-3 rounded bg-[#1e1f22] border border-[#4e5058] px-3 py-2 text-xs">{button.buttonEmoji} {button.buttonLabel} <span className="float-right">⌄</span></div> : <button className="clear-both mt-3 rounded bg-[#5865f2] px-3 py-2 text-xs text-white">{button.buttonEmoji} {button.buttonLabel}</button>)}</div></div>;
}

function normalizeDashboardTicketConfig(input: TicketAppearanceConfig): TicketAppearanceConfig {
  const appearance = (value: TicketEmbedAppearance): TicketEmbedAppearance => ({
    title: value.title,
    description: value.description,
    footer: value.footer,
    authorName: value.authorName,
    authorIconUrl: value.authorIconUrl,
    footerIconUrl: value.footerIconUrl,
    color: value.color,
    thumbnailUrl: value.thumbnailUrl,
    imageUrl: value.imageUrl,
    showTimestamp: value.showTimestamp,
  });
  return {
    guildId: input.guildId,
    panelChannelId: input.panelChannelId,
    panelMessageId: input.panelMessageId,
    enabled: input.enabled,
    panel: {
      ...appearance(input.panel),
      buttonLabel: input.panel.buttonLabel,
      buttonEmoji: input.panel.buttonEmoji,
      controlType: input.panel.controlType === "select" ? "select" : "button",
    },
    openedTicket: appearance(input.openedTicket),
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>; }
function validColor(value: string) { return /^#[0-9a-f]{6}$/i.test(value) ? value : "#65b8da"; }

function CustomSelect({ value, update, options }: { value: string; update: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <Select value={value} onValueChange={update}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>;
}
