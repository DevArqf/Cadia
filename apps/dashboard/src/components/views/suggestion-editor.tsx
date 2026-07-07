"use client";

import { useEffect, useMemo, useState } from "react";
import { DiscordMarkdown } from "@/components/discord-markdown";
import { ArrowLeft, Hash, Loader2, MessageSquareText, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCadia } from "@/lib/store";
import type { SuggestionConfig, SuggestionPanelAppearance, SuggestionPostAppearance } from "@/lib/types";

const DEFAULT_CONFIG: SuggestionConfig = {
  guildId: "",
  channelId: null,
  panelMessageId: null,
  enabled: false,
  style: "embed",
  panel: {
    title: "Server Suggestions",
    description: "Share an idea with the community.\n\nClick **Suggest** below to submit it. Members can then upvote or downvote it.",
    footer: "Suggestions are visible to everyone in this channel.",
    color: "#65b8da",
    thumbnailUrl: "",
    imageUrl: "",
    buttonLabel: "Suggest",
    buttonEmoji: "✏️",
  },
  post: {
    title: "{title}",
    description: "{body}\n\n**Upvotes:** {upvotes}\n**Downvotes:** {downvotes}\n**Suggested by:** {author}",
    footer: "Suggestion ID: {id}",
    color: "#65b8da",
    thumbnailUrl: "",
    imageUrl: "",
    showTimestamp: true,
  },
};

interface SuggestionEditorProps {
  onBack: () => void;
}

export function SuggestionEditor({ onBack }: SuggestionEditorProps) {
  const server = useCadia((state) => state.selectedServer);
  const moduleEnabled = useCadia((state) => state.modules.find((module) => module.id === "suggestions")?.enabled ?? false);
  const updateModule = useCadia((state) => state.updateModule);
  const [config, setConfig] = useState<SuggestionConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!server) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/servers/${server.id}/suggestions`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Could not load suggestion settings");
        return payload.config as SuggestionConfig;
      })
      .then((next) => {
        setConfig(normalizeDashboardSuggestionConfig(next));
        setError("");
        setDirty(false);
      })
      .catch((reason) => {
        if (reason.name !== "AbortError") setError(reason.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [server?.id]);

  const update = (patch: Partial<SuggestionConfig>) => {
    setConfig((current) => ({ ...current, ...patch }));
    markDirty();
  };
  const updatePanel = (patch: Partial<SuggestionPanelAppearance>) => {
    setConfig((current) => ({ ...current, panel: { ...current.panel, ...patch } }));
    markDirty();
  };
  const updatePost = (patch: Partial<SuggestionPostAppearance>) => {
    setConfig((current) => ({ ...current, post: { ...current.post, ...patch } }));
    markDirty();
  };
  const markDirty = () => {
    setDirty(true);
    useCadia.setState({ hasUnsavedChanges: true });
  };

  const save = async () => {
    if (!server || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/servers/${server.id}/suggestions`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: normalizeDashboardSuggestionConfig({ ...config, enabled: moduleEnabled }) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not save suggestion settings");
      setConfig(normalizeDashboardSuggestionConfig(payload.config));
	  await useCadia.getState().saveConfig();
      setDirty(false);
      useCadia.setState({ hasUnsavedChanges: false });
      toast.success("Suggestion experience updated");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not save suggestion settings";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!server) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          All Modules
        </Button>
        <Button onClick={save} disabled={loading || saving || !dirty} className="h-9 bg-cadia text-background hover:bg-cadia-dark">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </div>

      <div className="border-b border-border pb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-cadia" />
            <h2 className="text-lg font-bold">Suggestion Experience</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{server.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="suggestions-enabled" className="text-xs">Enabled</Label>
          <Switch id="suggestions-enabled" checked={moduleEnabled} onCheckedChange={(enabled) => { updateModule("suggestions", { enabled }); update({ enabled }); }} />
        </div>
      </div>

      {error && <div className="rounded-md border border-fail/40 bg-fail/10 px-3 py-2 text-xs text-fail">{error}</div>}

      {loading ? (
        <div className="h-64 grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
          <div className="space-y-5 min-w-0">
            <SystemSettings config={config} channels={server.channels} update={update} />
            <Tabs defaultValue="panel">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="panel">Submission Panel</TabsTrigger>
                <TabsTrigger value="post">Suggestion Post</TabsTrigger>
              </TabsList>
              <TabsContent value="panel" className="mt-4">
                <PanelFields value={config.panel} update={updatePanel} />
              </TabsContent>
              <TabsContent value="post" className="mt-4">
                <PostFields value={config.post} update={updatePost} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="xl:sticky xl:top-16 self-start space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Live Discord Preview</h3>
            <DiscordPreview config={config} serverIcon={server.icon.startsWith("http") ? server.icon : ""} />
          </div>
        </div>
      )}
    </div>
  );
}

function SystemSettings({ config, channels, update }: { config: SuggestionConfig; channels: { id: string; name: string; type: string }[]; update: (patch: Partial<SuggestionConfig>) => void }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 border-b border-border pb-5">
      <Field label="Channel" icon={<Hash className="h-3.5 w-3.5" />}>
        <select value={config.channelId || ""} onChange={(event) => update({ channelId: event.target.value || null })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Select channel</option>
          {channels.filter((channel) => channel.type === "text").map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}
        </select>
      </Field>
      <Field label="Panel style">
        <div className="grid grid-cols-2 rounded-md border border-input p-1 h-9">
          {(["embed", "message"] as const).map((style) => (
            <button key={style} type="button" onClick={() => update({ style })} className={`rounded text-xs capitalize ${config.style === style ? "bg-cadia text-background" : "text-muted-foreground hover:text-foreground"}`}>{style}</button>
          ))}
        </div>
      </Field>
    </section>
  );
}

function PanelFields({ value, update }: { value: SuggestionPanelAppearance; update: (patch: Partial<SuggestionPanelAppearance>) => void }) {
  return (
    <div className="space-y-4">
      <TextField label="Title" value={value.title} maxLength={256} onChange={(title) => update({ title })} />
      <TextAreaField label="Body" value={value.description} maxLength={4000} rows={6} onChange={(description) => update({ description })} />
      <TextField label="Footer" value={value.footer} maxLength={2000} onChange={(footer) => update({ footer })} />
      <AppearanceFields color={value.color} thumbnailUrl={value.thumbnailUrl} imageUrl={value.imageUrl} update={update} />
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <TextField label="Button label" value={value.buttonLabel} maxLength={80} onChange={(buttonLabel) => update({ buttonLabel })} />
        <TextField label="Button emoji" value={value.buttonEmoji} maxLength={100} onChange={(buttonEmoji) => update({ buttonEmoji })} />
      </div>
    </div>
  );
}

function PostFields({ value, update }: { value: SuggestionPostAppearance; update: (patch: Partial<SuggestionPostAppearance>) => void }) {
  return (
    <div className="space-y-4">
      <TemplateTokens />
      <TextField label="Title template" value={value.title} maxLength={500} onChange={(title) => update({ title })} />
      <TextAreaField label="Body template" value={value.description} maxLength={4000} rows={8} onChange={(description) => update({ description })} />
      <TextField label="Footer template" value={value.footer} maxLength={2000} onChange={(footer) => update({ footer })} />
      <AppearanceFields color={value.color} thumbnailUrl={value.thumbnailUrl} imageUrl={value.imageUrl} update={update} />
      <div className="flex items-center justify-between border-t border-border pt-4">
        <Label htmlFor="suggestion-timestamp" className="text-xs">Timestamp</Label>
        <Switch id="suggestion-timestamp" checked={value.showTimestamp} onCheckedChange={(showTimestamp) => update({ showTimestamp })} />
      </div>
    </div>
  );
}

function normalizeDashboardSuggestionConfig(input: SuggestionConfig): SuggestionConfig {
  return {
    guildId: input.guildId,
    channelId: input.channelId,
    panelMessageId: input.panelMessageId,
    enabled: input.enabled,
    style: input.style === "message" ? "message" : "embed",
    panel: {
      title: input.panel.title,
      description: input.panel.description,
      footer: input.panel.footer,
      color: input.panel.color,
      thumbnailUrl: input.panel.thumbnailUrl,
      imageUrl: input.panel.imageUrl,
      buttonLabel: input.panel.buttonLabel,
      buttonEmoji: input.panel.buttonEmoji,
    },
    post: {
      title: input.post.title,
      description: input.post.description,
      footer: input.post.footer,
      color: input.post.color,
      thumbnailUrl: input.post.thumbnailUrl,
      imageUrl: input.post.imageUrl,
      showTimestamp: input.post.showTimestamp,
    },
  };
}

interface AppearanceFieldsProps {
  color: string;
  thumbnailUrl: string;
  imageUrl: string;
  update: (patch: { color?: string; thumbnailUrl?: string; imageUrl?: string }) => void;
}

function AppearanceFields({ color, thumbnailUrl, imageUrl, update }: AppearanceFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
	  <p className="sm:col-span-2 text-[10px] text-muted-foreground">Use <code>{"{serverIcon}"}</code> in an image URL field to show the server icon.</p>
      <Field label="Color">
        <div className="flex gap-2">
          <input type="color" value={validColor(color)} onChange={(event) => update({ color: event.target.value })} className="h-9 w-11 rounded border border-input bg-background p-1" aria-label="Embed color" />
          <Input value={color} maxLength={7} onChange={(event) => update({ color: event.target.value })} className="font-mono" />
        </div>
      </Field>
      <TextField label="Thumbnail URL" value={thumbnailUrl} maxLength={2000} onChange={(next) => update({ thumbnailUrl: next })} />
      <div className="sm:col-span-2"><TextField label="Image URL" value={imageUrl} maxLength={2000} onChange={(next) => update({ imageUrl: next })} /></div>
    </div>
  );
}

function DiscordPreview({ config, serverIcon }: { config: SuggestionConfig; serverIcon: string }) {
  const panel = config.panel;
  const post = config.post;
  const variables = useMemo(() => ({ title: "More community events", body: "Add a monthly server event with community voting.", upvotes: "12", downvotes: "2", author: "@sample-user", id: "preview", status: "open" }), []);
  return (
    <div className="rounded-md border border-[#26303d] bg-[#111318] p-4 space-y-5 overflow-hidden">
      <PreviewMessage title="Panel">
        {config.style === "embed" ? <EmbedPreview color={panel.color} title={panel.title} description={panel.description} footer={panel.footer} thumbnailUrl={panel.thumbnailUrl === "{serverIcon}" ? serverIcon : panel.thumbnailUrl} imageUrl={panel.imageUrl === "{serverIcon}" ? serverIcon : panel.imageUrl} /> : <PlainPreview title={panel.title} description={panel.description} footer={panel.footer} />}
        <div className="mt-2"><span className="inline-flex h-8 items-center rounded px-3 text-xs font-semibold bg-[#5865f2] text-white">{panel.buttonEmoji} {panel.buttonLabel}</span></div>
      </PreviewMessage>
      <PreviewMessage title="Suggestion">
        <EmbedPreview color={post.color} title={renderPreview(post.title, variables)} description={renderPreview(post.description, variables)} footer={renderPreview(post.footer, variables)} thumbnailUrl={post.thumbnailUrl === "{serverIcon}" ? serverIcon : post.thumbnailUrl} imageUrl={post.imageUrl === "{serverIcon}" ? serverIcon : post.imageUrl} timestamp={post.showTimestamp} />
        <div className="mt-2 flex gap-2"><span className="rounded bg-[#248046] px-3 py-2 text-xs text-white">Upvote (12)</span><span className="rounded bg-[#da373c] px-3 py-2 text-xs text-white">Downvote (2)</span></div>
      </PreviewMessage>
    </div>
  );
}

function EmbedPreview({ color, title, description, footer, thumbnailUrl, imageUrl, timestamp = false }: { color: string; title: string; description: string; footer: string; thumbnailUrl: string; imageUrl: string; timestamp?: boolean }) {
  return (
    <div className="relative rounded bg-[#2b2d31] p-3 pl-4 text-[#dbdee1] overflow-hidden">
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: validColor(color) }} />
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          {title && <div className="font-semibold text-sm text-white break-words"><DiscordMarkdown>{title}</DiscordMarkdown></div>}
          {description && <DiscordMarkdown className="mt-1 text-xs leading-5 break-words">{description}</DiscordMarkdown>}
        </div>
        {isHttpsUrl(thumbnailUrl) && <img src={thumbnailUrl} alt="" className="h-16 w-16 rounded object-cover shrink-0" />}
      </div>
      {isHttpsUrl(imageUrl) && <img src={imageUrl} alt="" className="mt-3 max-h-48 w-full rounded object-cover" />}
      {(footer || timestamp) && <div className="mt-2 text-[10px] text-[#b5bac1]">{footer}{footer && timestamp ? " • " : ""}{timestamp ? "Today at 8:00 PM" : ""}</div>}
    </div>
  );
}

function PlainPreview({ title, description, footer }: { title: string; description: string; footer: string }) {
  return <DiscordMarkdown className="text-xs leading-5 text-[#dbdee1]">{[title ? `**${title}**` : "", description, footer ? `-# ${footer}` : ""].filter(Boolean).join("\n")}</DiscordMarkdown>;
}

function PreviewMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div className="mb-2 text-[10px] font-semibold uppercase text-[#949ba4]">{title}</div>{children}</div>;
}

function TemplateTokens() {
  return <div className="flex flex-wrap gap-1.5">{["{title}", "{body}", "{upvotes}", "{downvotes}", "{author}", "{id}", "{status}"].map((token) => <code key={token} className="rounded bg-muted px-1.5 py-1 text-[10px] text-cadia">{token}</code>)}</div>;
}

function TextField({ label, value, maxLength, onChange }: { label: string; value: string; maxLength: number; onChange: (value: string) => void }) {
  return <Field label={label}><Input value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} /></Field>;
}

function TextAreaField({ label, value, maxLength, rows, onChange }: { label: string; value: string; maxLength: number; rows: number; onChange: (value: string) => void }) {
  return <Field label={label}><Textarea value={value} maxLength={maxLength} rows={rows} onChange={(event) => onChange(event.target.value)} className="resize-y" /></Field>;
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs flex items-center gap-1.5">{icon}{label}</Label>{children}</div>;
}

function renderPreview(template: string, variables: Record<string, string>) {
  return template.replace(/\{([a-z]+)\}/gi, (match, key) => variables[key.toLowerCase()] ?? match);
}

function validColor(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#65b8da";
}

function isHttpsUrl(value: string) {
  return /^https:\/\//i.test(value);
}
