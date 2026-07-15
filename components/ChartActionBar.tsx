"use client";

import { useEffect, useRef, useState } from "react";
import { v, iconSizes } from "../lib/theme";
import {
  IconDownload,
  IconShare,
  IconLink,
  IconWhatsApp,
  IconTwitter,
  IconCode,
  IconCheck,
  IconMore,
  IconHelpCircle,
} from "./Icons";

// Provider identification (§ 5 DDG): the widgets are delivered by solar-check.io
// onto third-party pages, so a path to the Impressum must exist inside the
// widget itself — independent of the `branding` flag, which only controls the
// "Powered by" footer line.
const IMPRESSUM_URL = "https://solar-check.io/impressum";

export interface ChartActionBarProps {
  onDownload: () => void;
  onCopyLink: () => void;
  onWhatsApp: () => void;
  onTwitter: () => void;
  onShareImage?: () => void;
  /** When given, adds an "Einbetten" entry that links to the widget gallery. */
  onEmbed?: () => void;
  isExporting: boolean;
  canNativeShare: boolean;
  /** Button edge length; the footer uses a slightly smaller size than pages. */
  size?: number;
  /**
   * "bar" (default) = the full button row (download + share dropdown + embed),
   * for wide widgets. "menu" = a single ⋯ button opening one dropdown with all
   * actions, for compact widgets where a full row would break the layout.
   */
  variant?: "bar" | "menu";
  /** Omit the download action entirely (e.g. the map widget has no PNG export). */
  showDownload?: boolean;
  /** For variant="menu": open the dropdown upward (use when the ⋯ sits near the
   * bottom of the widget, e.g. in a footer, so the menu doesn't clip). */
  menuUp?: boolean;
}

/**
 * Standard chart actions: download as PNG + share (copy link, WhatsApp, X,
 * optionally native image share) + optional "Einbetten". Renders either as a
 * button row (variant="bar") or a compact ⋯ menu (variant="menu"). Uses the
 * rounded accent buttons shared with ChartExportBar and themes correctly inside
 * the embed widget footer (the embed layout aliases --color-* onto the widget
 * tokens).
 */
export default function ChartActionBar({
  onDownload,
  onCopyLink,
  onWhatsApp,
  onTwitter,
  onShareImage,
  onEmbed,
  isExporting,
  canNativeShare,
  size = 36,
  variant = "bar",
  showDownload = true,
  menuUp = false,
}: ChartActionBarProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const copyLink = () => {
    setOpen(false);
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const btn: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: v("--radius-md"),
    cursor: "pointer",
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border-accent")}`,
    color: v("--color-accent"),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: 0,
  };
  const icon = Math.round(size * 0.42);

  // ─── Compact ⋯ menu (small widgets) ───────────────────────────────────────
  if (variant === "menu") {
    return (
      <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
        {copied && (
          <div style={{ ...S.toast, ...(menuUp ? null : S.toastBelow) }}>
            <IconCheck size={iconSizes.sm} color={v("--color-bg")} /> Link kopiert
          </div>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          title="Aktionen"
          aria-label="Aktionen"
          aria-expanded={open}
          style={btn}
        >
          <IconMore size={icon} />
        </button>
        {open && (
          <div style={{ ...S.menu, ...(menuUp ? S.menuUpRight : S.menuBelowRight) }} role="menu">
            {showDownload && (
              <>
                <MenuItem
                  icon={IconDownload}
                  label={isExporting ? "Wird erstellt…" : "Als Bild speichern"}
                  onClick={run(onDownload)}
                  disabled={isExporting}
                />
                <div style={S.divider} />
              </>
            )}
            <MenuItem icon={IconLink} label="Link kopieren" onClick={copyLink} />
            {canNativeShare && onShareImage && (
              <MenuItem icon={IconShare} label="Als Bild teilen" onClick={run(onShareImage)} />
            )}
            <MenuItem icon={IconWhatsApp} label="WhatsApp" onClick={run(onWhatsApp)} />
            <MenuItem icon={IconTwitter} label="X" onClick={run(onTwitter)} />
            {onEmbed && (
              <>
                <div style={S.divider} />
                <MenuItem icon={IconCode} label="Einbetten" onClick={run(onEmbed)} />
              </>
            )}
            <div style={S.divider} />
            <MenuItem
              icon={IconHelpCircle}
              label="Anbieter & Impressum"
              muted
              onClick={run(() => window.open(IMPRESSUM_URL, "_blank", "noopener,noreferrer"))}
            />
          </div>
        )}
      </div>
    );
  }

  // ─── Full button row (wide widgets) ───────────────────────────────────────
  return (
    <div style={{ display: "flex", gap: 6, flexShrink: 0, position: "relative" }}>
      {copied && (
        <div style={S.toast}>
          <IconCheck size={iconSizes.sm} color={v("--color-bg")} /> Link kopiert
        </div>
      )}
      {showDownload && (
        <button
          onClick={onDownload}
          disabled={isExporting}
          title="Als Bild herunterladen"
          style={{ ...btn, opacity: isExporting ? 0.5 : 1, cursor: isExporting ? "wait" : "pointer" }}
        >
          <IconDownload size={icon} />
        </button>
      )}

      <div ref={wrapRef} style={{ position: "relative" }}>
        <button onClick={() => setOpen((o) => !o)} title="Teilen" aria-expanded={open} style={btn}>
          <IconShare size={icon} />
        </button>
        {open && (
          <div style={S.menu} role="menu">
            <MenuItem icon={IconLink} label="Link kopieren" onClick={copyLink} />
            {canNativeShare && onShareImage && (
              <MenuItem icon={IconShare} label="Als Bild teilen" onClick={run(onShareImage)} />
            )}
            <MenuItem icon={IconWhatsApp} label="WhatsApp" onClick={run(onWhatsApp)} />
            <MenuItem icon={IconTwitter} label="X" onClick={run(onTwitter)} />
            <div style={S.divider} />
            <MenuItem
              icon={IconHelpCircle}
              label="Anbieter & Impressum"
              muted
              onClick={run(() => window.open(IMPRESSUM_URL, "_blank", "noopener,noreferrer"))}
            />
          </div>
        )}
      </div>

      {onEmbed && (
        <button onClick={onEmbed} title="Einbetten" aria-label="Einbetten" style={btn}>
          <IconCode size={icon} />
        </button>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  accent,
  muted,
  disabled,
}: {
  icon: (p: { size?: number; color?: string }) => React.ReactElement;
  label: string;
  onClick: () => void;
  accent?: boolean;
  muted?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      role="menuitem"
      style={{
        ...S.item,
        ...(accent ? S.itemAccent : null),
        ...(muted ? S.itemMuted : null),
        ...(disabled ? { opacity: 0.5, cursor: "wait" } : null),
      }}
    >
      <Icon size={iconSizes.md} color={accent ? v("--color-accent") : muted ? v("--color-text-muted") : v("--color-text-secondary")} />
      <span>{label}</span>
    </button>
  );
}

const S: Record<string, React.CSSProperties> = {
  menu: {
    position: "absolute",
    bottom: 42,
    left: 0,
    minWidth: 184,
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    boxShadow: v("--shadow-lg"),
    padding: 5,
    zIndex: 100,
  },
  // ⋯ menu at the top-right of a widget → open downward, right-aligned.
  menuBelowRight: {
    bottom: "auto",
    left: "auto",
    top: 42,
    right: 0,
  },
  // ⋯ menu near the bottom (footer) → open upward, right-aligned.
  menuUpRight: {
    bottom: 42,
    top: "auto",
    left: "auto",
    right: 0,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    padding: "8px 10px",
    fontSize: 13,
    fontWeight: 500,
    color: v("--color-text-primary"),
    background: "transparent",
    border: 0,
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left" as const,
    whiteSpace: "nowrap" as const,
  },
  itemAccent: { color: v("--color-accent"), fontWeight: 700 },
  itemMuted: { color: v("--color-text-muted"), fontWeight: 400, fontSize: 12.5 },
  divider: { height: 1, background: v("--color-border"), margin: "4px 2px" },
  toast: {
    position: "absolute",
    bottom: 44,
    left: 0,
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 12px",
    background: v("--color-text-primary"),
    color: v("--color-bg"),
    borderRadius: v("--radius-md"),
    fontSize: 12.5,
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
    boxShadow: v("--shadow-md"),
    zIndex: 110,
    pointerEvents: "none" as const,
  },
  toastBelow: { bottom: "auto", top: 44, left: "auto", right: 0 },
};
