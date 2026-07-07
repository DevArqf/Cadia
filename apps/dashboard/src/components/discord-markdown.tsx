"use client";

import type { ReactNode } from "react";

export function DiscordMarkdown({ children, className = "" }: { children: string; className?: string }) {
  const lines = String(children || "").split("\n");
  const output: ReactNode[] = [];
  let code: string[] | null = null;

  lines.forEach((line, index) => {
    if (line.startsWith("```")) {
      if (code) { output.push(<pre key={`code-${index}`} className="my-1 overflow-x-auto rounded bg-[#1e1f22] p-2 text-xs"><code>{code.join("\n")}</code></pre>); code = null; }
      else code = [];
      return;
    }
    if (code) { code.push(line); return; }
    if (line.startsWith("-# ")) { output.push(<div key={index} className="text-[10px] leading-4 text-[#949ba4]">{inline(line.slice(3), index)}</div>); return; }
    if (line.startsWith("> ")) { output.push(<blockquote key={index} className="my-0.5 border-l-4 border-[#4e5058] pl-2">{inline(line.slice(2), index)}</blockquote>); return; }
    if (/^[-*] /.test(line)) { output.push(<div key={index} className="flex gap-2"><span>•</span><span>{inline(line.slice(2), index)}</span></div>); return; }
    output.push(<div key={index} className={line ? "min-h-[1.25em]" : "h-2"}>{inline(line, index)}</div>);
  });
  if (code) output.push(<pre key="code-open" className="my-1 overflow-x-auto rounded bg-[#1e1f22] p-2 text-xs"><code>{code.join("\n")}</code></pre>);
  return <div className={className}>{output}</div>;
}

function inline(text: string, key: number): ReactNode[] {
  const patterns: Array<{ regex: RegExp; render: (value: string, index: number, match: RegExpExecArray) => ReactNode }> = [
	{ regex: /<(a?):([a-z0-9_]{2,32}):(\d{17,20})>/i, render: (_value: string, index: number, match?: RegExpExecArray) => <img key={`${key}-e-${index}`} src={`https://cdn.discordapp.com/emojis/${match?.[3]}.${match?.[1] ? "gif" : "webp"}?size=48&quality=lossless`} alt={`:${match?.[2]}:`} title={`:${match?.[2]}:`} className="inline-block h-[1.35em] w-[1.35em] object-contain align-text-bottom" /> },
    { regex: /\*\*(.+?)\*\*/, render: (value: string, index: number) => <strong key={`${key}-b-${index}`}>{value}</strong> },
    { regex: /__(.+?)__/, render: (value: string, index: number) => <u key={`${key}-u-${index}`}>{value}</u> },
    { regex: /~~(.+?)~~/, render: (value: string, index: number) => <s key={`${key}-s-${index}`}>{value}</s> },
    { regex: /`([^`]+)`/, render: (value: string, index: number) => <code key={`${key}-c-${index}`} className="rounded bg-[#1e1f22] px-1 py-0.5 text-[0.9em]">{value}</code> },
    { regex: /\*([^*]+)\*/, render: (value: string, index: number) => <em key={`${key}-i-${index}`}>{value}</em> },
  ];
  const nodes: ReactNode[] = [];
  let remaining = text;
  let index = 0;
  while (remaining) {
    const matches = patterns.map((pattern) => ({ pattern, match: pattern.regex.exec(remaining) })).filter((entry) => entry.match).sort((a, b) => a.match!.index - b.match!.index);
    const next = matches[0];
    if (!next?.match) { nodes.push(remaining); break; }
    if (next.match.index) nodes.push(remaining.slice(0, next.match.index));
	nodes.push(next.pattern.render(next.match[1], index++, next.match));
    remaining = remaining.slice(next.match.index + next.match[0].length);
  }
  return nodes;
}
