"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/** Returns true when the given value is an http(s) image URL (vs a color hex). */
export function isMediaUrl(value?: string | null): boolean {
  return !!value && /^https?:\/\//i.test(value);
}

/**
 * Square/rounded badge for a Discord server icon.
 *
 * Shows the server's icon image when available; otherwise falls back to a
 * colored tile with the server's initials. This replaces the previous
 * `style={{ background: server.icon }}` pattern, which produced invalid CSS
 * (`background: https://...`) whenever the icon was a real CDN URL — that was
 * why server icons never rendered on the dashboard.
 */
export function ServerIconBadge({
  icon,
  name,
  className,
}: {
  icon?: string | null;
  name: string;
  className?: string;
}) {
  const url = isMediaUrl(icon) ? icon : null;
  const color = !url ? icon || "#65b8da" : null;
  const initials = (name || "?").slice(0, 2).toUpperCase();

  if (url) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden border border-border/50 ${className ?? ""}`}
        role="img"
        aria-label={name}
        style={{
          backgroundImage: `url("${url}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    );
  }

  return (
    <div
      className={`shrink-0 flex items-center justify-center font-bold border-2 ${className ?? ""}`}
      style={{ background: color, borderColor: color, color: "#0b0f14" }}
    >
      {initials}
    </div>
  );
}

/**
 * Round avatar for a Discord user. Shows the avatar image when available
 * (via Radix AvatarImage, with a graceful colored-initials fallback).
 */
export function UserAvatarBadge({
  avatar,
  username,
  className,
  fallbackClassName,
}: {
  avatar?: string | null;
  username?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  const url = isMediaUrl(avatar) ? avatar : null;
  const color = !url ? avatar || "#65b8da" : null;
  const initials = (username || "U").slice(0, 2).toUpperCase();

  return (
    <Avatar className={className} style={color ? { borderColor: color } : undefined}>
      {url ? <AvatarImage src={url} alt={username || "avatar"} /> : null}
      <AvatarFallback
        className={fallbackClassName ?? "text-[10px] font-semibold"}
        style={color ? { background: color, color: "#0b0f14" } : undefined}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
