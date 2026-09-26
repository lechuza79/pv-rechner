"use client";

import { useEffect, useId, useRef, useState } from "react";
import { v } from "../lib/theme";
import { IconCode, IconDownload, IconMore, IconShare } from "./Icons";
import { EXPORT_IGNORE_ATTR } from "../lib/export-markers";

/**
 * Compact options menu for a chart (top right of its card): Teilen, Download,
 * Einbetten — nothing else. The menu presentation of the same handlers the
 * prominent action bar (ChartActionBar) uses; it owns no export logic.
 *
 * Embedding is only offered as an action where a supported embed exists;
 * otherwise the entry stays visible, disabled, with the reason, so nobody is
 * handed a code that does not work.
 *
 * Keyboard: Enter/Space/ArrowDown open and focus the first entry; ArrowUp/Down,
 * Home/End move; Escape closes and returns focus to the button; Tab closes.
 * Pointer: a tap or click outside closes it.
 */
export default function ChartOptionsMenu({ label, onShare, onDownload, embed, busy = false }: {
  /** Chart name, for the accessible button label. */
  label: string;
  onShare: () => void | Promise<void>;
  onDownload: () => void | Promise<void>;
  embed: { onEmbed: () => void } | { unavailable: string };
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const items = () => [...(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    requestAnimationFrame(() => items()[0]?.focus());
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const close = (refocus = true) => { setOpen(false); if (refocus) button.current?.focus(); };
  const run = (fn: () => void | Promise<void>, done?: string) => async () => {
    close();
    await fn();
    if (done) { setStatus(done); window.setTimeout(() => setStatus(""), 2500); }
  };
  const onMenuKey = (e: React.KeyboardEvent) => {
    const list = items(), index = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") setOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); list[(index + 1) % list.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); list[(index - 1 + list.length) % list.length]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); list[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); list[list.length - 1]?.focus(); }
  };
  const onButtonKey = (e: React.KeyboardEvent) => { if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); } };

  const item: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 44, padding: "8px 14px", border: 0, background: "transparent", color: `var(--widget-ink, ${v("--color-text-primary")})`, font: "inherit", fontSize: v("--font-size-body"), textAlign: "left", cursor: "pointer" };
  const unavailable = "unavailable" in embed ? embed.unavailable : null;

  return (
    <div ref={wrap} className="sc-chart-options" style={{ position: "relative", display: "inline-flex" }} {...{ [EXPORT_IGNORE_ATTR]: "" }}>
      <button ref={button} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
        aria-label={`Optionen für ${label}`} title="Optionen" onClick={() => setOpen(o => !o)} onKeyDown={onButtonKey} disabled={busy}
        style={{ width: 32, height: 32, borderRadius: 999, border: `1px solid var(--widget-muted, ${v("--color-border")})`, background: "transparent", color: "inherit", display: "grid", placeItems: "center", padding: 0, cursor: "pointer" }}>
        <IconMore size={16} />
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label={`Optionen für ${label}`} onKeyDown={onMenuKey}
          style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 20, minWidth: 200, padding: "6px 0", borderRadius: 12, background: `var(--widget-surface, ${v("--color-bg-raised")})`, border: `1px solid var(--widget-muted, ${v("--color-border")})`, boxShadow: "0 12px 32px #0004" }}>
          <button type="button" role="menuitem" tabIndex={-1} style={item} onClick={run(onShare)}><IconShare size={16} />Teilen</button>
          <button type="button" role="menuitem" tabIndex={-1} style={item} onClick={run(onDownload, "Bild wird heruntergeladen.")}><IconDownload size={16} />Download</button>
          {unavailable
            ? <button type="button" role="menuitem" tabIndex={-1} aria-disabled="true" style={{ ...item, cursor: "default", alignItems: "flex-start", opacity: .75 }} onClick={e => e.preventDefault()}>
                <IconCode size={16} /><span>Einbetten<small style={{ display: "block", fontSize: v("--font-size-small"), color: `var(--widget-muted, ${v("--color-text-muted")})`, marginTop: 2 }}>{unavailable}</small></span>
              </button>
            : <button type="button" role="menuitem" tabIndex={-1} style={item} onClick={run((embed as { onEmbed: () => void }).onEmbed)}><IconCode size={16} />Einbetten</button>}
        </div>
      )}
      <span role="status" aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{status}</span>
    </div>
  );
}
