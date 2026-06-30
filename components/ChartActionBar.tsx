"use client";

import { useEffect, useRef, useState } from "react";
import { v } from "../lib/theme";
import {
  IconDownload,
  IconShare,
  IconLink,
  IconWhatsApp,
  IconTwitter,
  IconCode,
  IconCheck,
} from "./Icons";

export interface ChartActionBarProps {
  onDownload: () => void;
  onCopyLink: () => void;
  onWhatsApp: () => void;
  onTwitter: () => void;
  onShareImage?: () => void;
  /** When given, adds an "Einbetten" entry that opens the embed modal. */
  onEmbed?: () => void;
  isExporting: boolean;
  canNativeShare: boolean;
  /** Button edge length; the footer uses a slightly smaller size than pages. */
  size?: number;
}

/**
 * Standard chart action row: download as PNG + a share menu (copy link,
 * WhatsApp, X, optionally Einbetten). Uses the rounded accent buttons shared
 * with ChartExportBar. Lives wherever a chart can reach its own SVG — on pages
 * and inside the embed widget footer (the embed layout aliases --color-* onto
 * the widget tokens, so it themes correctly there too).
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

  return (
    <div style={{ display: "flex", gap: 6, flexShrink: 0, position: "relative" }}>
      {copied && (
        <div style={S.toast}>
          <IconCheck size={13} color={v("--color-bg")} /> Link kopiert
        </div>
      )}
      <button
        onClick={onDownload}
        disabled={isExporting}
        title="Als Bild herunterladen"
        style={{ ...btn, opacity: isExporting ? 0.5 : 1, cursor: isExporting ? "wait" : "pointer" }}
      >
        <IconDownload size={icon} />
      </button>

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
}: {
  icon: (p: { size?: number; color?: string }) => React.ReactElement;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button onClick={onClick} role="menuitem" style={{ ...S.item, ...(accent ? S.itemAccent : null) }}>
      <Icon size={15} color={accent ? v("--color-accent") : v("--color-text-secondary")} />
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
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    padding: 5,
    zIndex: 100,
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
  },
  itemAccent: { color: v("--color-accent"), fontWeight: 700 },
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
    boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
    zIndex: 110,
    pointerEvents: "none" as const,
  },
};
