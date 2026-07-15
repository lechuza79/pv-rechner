"use client";
import { useEffect, useRef, useState } from "react";
import { v } from "../lib/theme";
import { isValidPlz } from "../lib/location";
import { IconChevronDown } from "./Icons";
import type { SolarNowResponse } from "../lib/solar-now";
import type { ThemePref, ThemeMode } from "../lib/theme-schedule";

// The header's one control: how much solar power is being made right now, and
// behind it everything that follows from it — the location it is measured for,
// and the dimmer that decides how bright the page is.
//
// The figure is output as a share of installed capacity, deliberately a
// percentage rather than gigawatts so it never reads as a competing measurement
// next to the metered feed-in on the Strommix page.

const PREFS: { id: ThemePref; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "light", label: "Hell" },
  { id: "dark", label: "Dunkel" },
];

const PREF_HINT: Record<ThemePref, string> = {
  auto: "Die Seite folgt der Sonne: viel Sonne hell, wenig Sonne gedimmt, nachts dunkel.",
  light: "Die Seite bleibt immer hell, unabhängig von der Sonne.",
  dark: "Die Seite bleibt immer dunkel, unabhängig von der Sonne.",
};

export default function SunControl({
  data,
  plz,
  onSetPlz,
  pref,
  resolved,
  onSetPref,
  compact,
}: {
  data: SolarNowResponse | null;
  plz: string | null;
  onSetPlz: (plz: string | null) => void;
  pref: ThemePref;
  resolved: ThemeMode;
  onSetPref: (pref: ThemePref) => void;
  /** Mobile: drop the place label, keep the figure. */
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

  // Nothing to show until the first reading lands — a placeholder would only
  // pop in and shift the header.
  if (!data) return null;

  const place = plz ?? "DE";
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPlz(draft)) return;
    onSetPlz(draft);
    setDraft("");
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: 34,
          borderRadius: v("--radius-sm"),
          border: `1px solid ${v("--color-border")}`,
          background: v("--color-bg-muted"),
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`Sonnenleistung ${data.powerPct} Prozent${plz ? ` in ${plz}` : " in Deutschland"}. Standort und Farbschema einstellen.`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: "100%",
            padding: compact ? "0 7px" : "0 9px",
            border: "none",
            background: "none",
            color: v("--color-text-secondary"),
            fontFamily: v("--font-text"),
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Pie pct={data.powerPct} />
          <span style={{ fontFamily: v("--font-mono"), color: v("--color-text-primary") }}>
            {data.powerPct}%
          </span>
          {/* Mobile hides the "DE" default (it says little) but keeps a chosen
              postcode visible — that one carries meaning. */}
          {(!compact || plz) && (
            <span style={{ color: v("--color-text-muted") }}>{place}</span>
          )}
          <IconChevronDown
            size={12}
            color={v("--color-text-muted")}
            style={{ transition: "transform .15s ease", transform: open ? "rotate(180deg)" : "none" }}
          />
        </button>

        {plz && (
          <button
            type="button"
            onClick={() => onSetPlz(null)}
            aria-label={`Standort ${plz} entfernen, wieder Deutschland zeigen`}
            title="Standort entfernen"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              width: 24,
              border: "none",
              borderLeft: `1px solid ${v("--color-border")}`,
              background: "none",
              color: v("--color-text-muted"),
              cursor: "pointer",
              padding: 0,
            }}
          >
            <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div
          className="sc-flyout"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 200,
            width: "min(276px, calc(100vw - 24px))",
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
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: v("--color-text-secondary"), margin: 0 }}>
            {plz
              ? "So viel ihrer Nennleistung liefert eine Solaranlage an deinem Standort gerade."
              : "So viel ihrer Nennleistung liefern Deutschlands Solaranlagen gerade im Schnitt."}
          </p>

          {!plz && (
            <form onSubmit={submit} style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 5))}
                inputMode="numeric"
                placeholder="PLZ für deinen Standort"
                aria-label="Postleitzahl"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 34,
                  padding: "0 10px",
                  borderRadius: v("--radius-sm"),
                  border: `1px solid ${v("--color-border")}`,
                  background: v("--color-bg-muted"),
                  color: v("--color-text-primary"),
                  fontFamily: v("--font-text"),
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

          <div style={{ height: 1, background: v("--color-border"), margin: "12px 0" }} />

          <div style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: v("--color-text-muted"),
            marginBottom: 6,
          }}>
            Helligkeit
          </div>

          <div
            role="group"
            aria-label="Farbschema"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 3,
              padding: 3,
              borderRadius: v("--radius-sm"),
              background: v("--color-bg-muted"),
              border: `1px solid ${v("--color-border")}`,
            }}
          >
            {PREFS.map((p) => {
              const active = pref === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSetPref(p.id)}
                  aria-pressed={active}
                  style={{
                    height: 28,
                    border: "none",
                    borderRadius: 4,
                    background: active ? v("--color-accent") : "transparent",
                    color: active ? v("--color-text-on-accent") : v("--color-text-secondary"),
                    fontFamily: v("--font-text"),
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "background .15s ease, color .15s ease",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: 12, lineHeight: 1.5, color: v("--color-text-muted"), margin: "8px 0 0" }}>
            {PREF_HINT[pref]}
            {pref === "auto" && (
              <> Gerade: {resolved === "dark" ? "dunkel" : resolved === "dusk" ? "gedimmt" : "hell"}.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

/** Pie of the current output — blue segment on a muted track. */
function Pie({ pct }: { pct: number }) {
  const share = Math.max(0, Math.min(100, pct)) / 100;
  const r = 7;
  const c = 10;
  const angle = share * 2 * Math.PI;
  const x = c + r * Math.sin(angle);
  const y = c - r * Math.cos(angle);
  const large = share > 0.5 ? 1 : 0;

  return (
    <svg width={14} height={14} viewBox="0 0 20 20" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill={v("--color-border-muted")} />
      {share >= 0.999 ? (
        <circle cx={c} cy={c} r={r} fill={v("--color-accent")} />
      ) : (
        share > 0 && (
          <path
            d={`M${c},${c} L${c},${c - r} A${r},${r} 0 ${large} 1 ${x.toFixed(3)},${y.toFixed(3)} Z`}
            fill={v("--color-accent")}
          />
        )
      )}
      <circle cx={c} cy={c} r={r} fill="none" stroke={v("--color-border")} strokeWidth={1} />
    </svg>
  );
}
