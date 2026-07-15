"use client";
import { useEffect, useRef, useState } from "react";
import { v } from "../lib/theme";
import { isValidPlz } from "../lib/location";
import type { SolarNowResponse } from "../lib/solar-now";

// Header pill: how much solar power is being made right now, plus the way in to
// set a location. Without a postcode it shows the capacity-weighted average
// across Germany; with one, that location.
//
// The figure is output as a share of installed capacity — deliberately a
// percentage, not gigawatts, so it never reads as a competing measurement next
// to the actual metered feed-in on the Strommix page.

export default function SolarNowBadge({
  data,
  plz,
  onSetPlz,
  compact,
}: {
  data: SolarNowResponse | null;
  plz: string | null;
  onSetPlz: (plz: string | null) => void;
  /** Mobile: drop the label, keep the figure. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Nothing to show until the first reading lands — the pill would otherwise
  // pop in with a placeholder and shift the header.
  if (!data) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPlz(draft)) return;
    onSetPlz(draft);
    setDraft("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Aktuelle Sonnenleistung ${data.powerPct} Prozent${plz ? ` in ${plz}` : " in Deutschland"}. Standort einstellen.`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 34,
          padding: compact ? "0 8px" : "0 10px",
          borderRadius: v("--radius-sm"),
          border: `1px solid ${v("--color-border")}`,
          background: v("--color-bg-muted"),
          color: v("--color-text-secondary"),
          fontFamily: v("--font-text"),
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <SunGauge fill={data.powerPct} />
        <span style={{ fontFamily: v("--font-mono"), color: v("--color-text-primary") }}>
          {data.powerPct}%
        </span>
        {!compact && (
          <span style={{ color: v("--color-text-muted"), fontWeight: 600 }}>
            {plz ?? "DE"}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 200,
            width: "min(268px, calc(100vw - 24px))",
            background: v("--color-bg"),
            border: `1px solid ${v("--color-border")}`,
            borderRadius: v("--radius-md"),
            boxShadow: v("--shadow-lg"),
            padding: 12,
            fontFamily: v("--font-text"),
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: v("--color-text-primary"), marginBottom: 4 }}>
            Sonnenleistung {plz ? `in ${plz}` : "in Deutschland"}: {data.powerPct} %
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: v("--color-text-secondary"), marginBottom: 10 }}>
            {plz
              ? "So viel ihrer Nennleistung liefert eine Solaranlage an deinem Standort gerade. Die Seite färbt sich danach."
              : "So viel ihrer Nennleistung liefern Deutschlands Solaranlagen gerade im Schnitt. Gib deine Postleitzahl ein, um deinen Standort zu sehen."}
          </p>

          {plz ? (
            <button
              type="button"
              onClick={() => {
                onSetPlz(null);
                setOpen(false);
              }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: v("--font-text"),
                color: v("--color-accent"),
                cursor: "pointer",
              }}
            >
              Wieder Deutschland zeigen
            </button>
          ) : (
            <form onSubmit={submit} style={{ display: "flex", gap: 6 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 5))}
                inputMode="numeric"
                placeholder="PLZ"
                aria-label="Postleitzahl"
                autoFocus
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 34,
                  padding: "0 10px",
                  borderRadius: v("--radius-sm"),
                  border: `1px solid ${v("--color-border")}`,
                  background: v("--color-bg-muted"),
                  color: v("--color-text-primary"),
                  fontFamily: v("--font-mono"),
                  fontSize: 16, // 16px stops iOS zooming the page on focus
                }}
              />
              <button
                type="submit"
                disabled={!isValidPlz(draft)}
                style={{
                  height: 34,
                  padding: "0 12px",
                  borderRadius: v("--radius-sm"),
                  border: "none",
                  background: isValidPlz(draft) ? v("--color-accent") : v("--color-border"),
                  color: isValidPlz(draft) ? v("--color-text-on-accent") : v("--color-text-muted"),
                  fontFamily: v("--font-text"),
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isValidPlz(draft) ? "pointer" : "default",
                }}
              >
                Zeigen
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/** Sun that fills up with the current output — 0 % hollow, high output solid. */
function SunGauge({ fill }: { fill: number }) {
  // Real output tops out near 50 % of capacity, so map that to a full disc.
  const share = Math.max(0, Math.min(1, fill / 50));
  const r = 4.2;
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <g stroke="currentColor" strokeWidth={2} strokeLinecap="round" fill="none">
        <circle cx="12" cy="12" r={r} />
        <path d="M12 3.4v2.1M12 18.5v2.1M3.4 12h2.1M18.5 12h2.1M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18" />
      </g>
      {share > 0 && (
        <circle cx="12" cy="12" r={r * Math.sqrt(share)} fill="var(--color-positive)" stroke="none" />
      )}
    </svg>
  );
}
