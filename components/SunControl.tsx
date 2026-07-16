"use client";
import { useEffect, useRef, useState } from "react";
import { v, iconSizes } from "../lib/theme";
import { isValidPlz } from "../lib/location";
import { IconChevronDown } from "./Icons";
import type { SolarNowResponse } from "../lib/solar-now";
import type { ThemePref } from "../lib/theme-schedule";

// The header's one control: how much solar power is being made right now, and
// behind it everything that follows from it — the location it is measured for,
// and the dimmer that decides how bright the page is.
//
// The figure is output as a share of what the panels would make in full sun,
// deliberately a percentage rather than gigawatts so it never reads as a
// competing measurement next to the metered feed-in on the Strommix page.

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

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

/** Header shows only the first two digits — enough to place it, stays narrow. */
function shortPlz(plz: string): string {
  return `${plz.slice(0, 2)}…`;
}

export default function SunControl({
  data,
  plz,
  onSetPlz,
  pref,
  onSetPref,
  compact,
}: {
  data: SolarNowResponse | null;
  plz: string | null;
  onSetPlz: (plz: string | null) => void;
  pref: ThemePref;
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
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={() => {
          setDraft(plz ?? "");
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-label={`Sonnenleistung ${data.powerPct} Prozent${plz ? ` in ${plz}` : " in Deutschland"}. Standort und Farbschema einstellen.`}
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
        }}
      >
        <Donut pct={data.powerPct} />
        {/* Keyed so switching between Germany and a location fades. */}
        <span key={place} className="sc-swap" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontFamily: v("--font-mono"), color: v("--color-text-primary") }}>
            {data.powerPct}%
          </span>
          {/* Mobile hides the "DE" default (it says little) but keeps a chosen
              postcode visible — that one carries meaning. */}
          {(!compact || plz) && (
            <span style={{ color: v("--color-text-muted") }}>
              {plz ? shortPlz(plz) : place}
            </span>
          )}
        </span>
        <IconChevronDown
          size={iconSizes.sm}
          color={v("--color-text-muted")}
          style={{ transition: "transform .15s ease", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div
          className="sc-flyout"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 200,
            width: "min(280px, calc(100vw - 24px))",
            background: v("--color-bg"),
            border: `1px solid ${v("--color-border")}`,
            borderRadius: v("--radius-md"),
            boxShadow: v("--shadow-lg"),
            padding: 12,
            fontFamily: v("--font-text"),
          }}
        >
          {/* Keyed: entering a postcode swaps these lines — fade, don't snap. */}
          <div key={place} className="sc-swap">
            <div style={{ fontSize: 13, fontWeight: 700, color: v("--color-text-primary"), marginBottom: 4 }}>
              Sonnenleistung {plz ? `in ${plz}` : "in Deutschland"}: {data.powerPct} %
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.5, color: v("--color-text-secondary"), margin: 0 }}>
              {plz
                ? "So viel liefert eine Solaranlage an deinem Standort gerade von dem, was sie bei voller Sonne bringen würde."
                : "So viel liefern Deutschlands Solaranlagen gerade von dem, was sie bei voller Sonne bringen würden."}
            </p>
          </div>

          <div style={{ height: 1, background: v("--color-border"), margin: "12px 0" }} />

          <div style={{ ...labelStyle, color: v("--color-text-muted"), marginBottom: 6 }}>
            Standort
          </div>

          <form onSubmit={submit} style={{ display: "flex", gap: 6 }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 5))}
              inputMode="numeric"
              placeholder="PLZ eingeben"
              aria-label="Postleitzahl eingeben"
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
              disabled={!isValidPlz(draft) || draft === plz}
              style={{
                height: 34,
                padding: "0 12px",
                borderRadius: v("--radius-sm"),
                border: "none",
                background: isValidPlz(draft) && draft !== plz ? v("--color-accent") : v("--color-border"),
                color: isValidPlz(draft) && draft !== plz ? v("--color-text-on-accent") : v("--color-text-muted"),
                fontFamily: v("--font-text"),
                fontSize: 13,
                fontWeight: 700,
                cursor: isValidPlz(draft) && draft !== plz ? "pointer" : "default",
              }}
            >
              Zeigen
            </button>
          </form>

          {plz && (
            <button
              type="button"
              onClick={() => {
                onSetPlz(null);
                setDraft("");
              }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                marginTop: 8,
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: v("--font-text"),
                color: v("--color-accent"),
                cursor: "pointer",
              }}
            >
              Standort entfernen
            </button>
          )}

          <div style={{ height: 1, background: v("--color-border"), margin: "12px 0" }} />

          <div style={{ ...labelStyle, color: v("--color-text-muted"), marginBottom: 6 }}>
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

          <p key={pref} className="sc-swap" style={{ fontSize: 12, lineHeight: 1.5, color: v("--color-text-muted"), margin: "8px 0 0" }}>
            {PREF_HINT[pref]}
          </p>
        </div>
      )}
    </div>
  );
}

/** Donut of the current output — blue arc on a muted ring. */
function Donut({ pct }: { pct: number }) {
  const share = Math.max(0, Math.min(100, pct)) / 100;
  const r = 6.4;
  const c = 10;
  const stroke = 3.2;
  const circumference = 2 * Math.PI * r;

  return (
    <svg width={iconSizes.md} height={iconSizes.md} viewBox="0 0 20 20" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={v("--color-track")} strokeWidth={stroke} />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={v("--color-accent")}
        strokeWidth={stroke}
        strokeDasharray={`${(share * circumference).toFixed(2)} ${circumference.toFixed(2)}`}
        transform={`rotate(-90 ${c} ${c})`}
        style={{ transition: "stroke-dasharray .4s ease" }}
      />
    </svg>
  );
}
