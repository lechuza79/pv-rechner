"use client";

import { useMemo, useState } from "react";
import { stageDefaults, v, type TokenName } from "../../../../lib/theme";
import {
  STAGES,
  GREEN_TOKENS,
  stageIndex,
  type StageId,
  type ThemeOverrides,
  type GreenToken,
} from "../../../../lib/theme-overrides";

// ─── Admin editor: per-stage, per-shade green overrides ──────────────────────
// Pick a brightness stage → every green shade is shown IN CONTEXT rendered in
// that stage's palette, and each one is individually adjustable. Save persists
// the overlay site-wide (POST /api/theme → cached layout read).

type Draft = ThemeOverrides;

// Deep-ish clone of the sparse override map (two levels, plain values).
function cloneDraft(d: Draft): Draft {
  const out: Draft = {};
  for (const [stage, set] of Object.entries(d)) {
    if (set) out[stage as StageId] = { ...set };
  }
  return out;
}

function sameDraft(a: Draft, b: Draft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Effective value for a token in a stage, honouring the in-progress draft. */
function valueFor(draft: Draft, stage: StageId, token: TokenName): string {
  return draft[stage]?.[token] ?? stageDefaults(stageIndex(stage))[token];
}

function isOverridden(draft: Draft, stage: StageId, token: TokenName): boolean {
  return draft[stage]?.[token] != null;
}

export default function GreenThemingEditor({ initial }: { initial: ThemeOverrides }) {
  const [saved, setSaved] = useState<Draft>(initial);
  const [draft, setDraft] = useState<Draft>(() => cloneDraft(initial));
  const [stage, setStage] = useState<StageId>("s6");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const dirty = !sameDraft(draft, saved);

  // Full token map for the selected stage (base ⊕ stage ⊕ draft greens) — drives
  // the preview panel so every demo renders in the chosen stage's palette.
  const previewVars = useMemo(() => {
    const base = stageDefaults(stageIndex(stage));
    const merged: Record<string, string> = { ...base, ...(draft[stage] ?? {}) };
    return merged as React.CSSProperties;
  }, [stage, draft]);

  function setToken(token: TokenName, value: string) {
    setStatus("idle");
    setDraft((d) => {
      const next = cloneDraft(d);
      next[stage] = { ...(next[stage] ?? {}), [token]: value };
      return next;
    });
  }

  function resetToken(token: TokenName) {
    setStatus("idle");
    setDraft((d) => {
      const next = cloneDraft(d);
      if (next[stage]) {
        delete next[stage]![token];
        if (Object.keys(next[stage]!).length === 0) delete next[stage];
      }
      return next;
    });
  }

  function resetStage() {
    setStatus("idle");
    setDraft((d) => {
      const next = cloneDraft(d);
      delete next[stage];
      return next;
    });
  }

  async function save() {
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: draft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Speichern fehlgeschlagen");
      const clean = (json.overrides ?? {}) as Draft;
      setSaved(clean);
      setDraft(cloneDraft(clean));
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Unbekannter Fehler");
    }
  }

  function discard() {
    setStatus("idle");
    setDraft(cloneDraft(saved));
  }

  const stageMeta = STAGES.find((s) => s.id === stage)!;
  const positiveTokens = GREEN_TOKENS.filter((t) => t.role === "positive");
  const energyTokens = GREEN_TOKENS.filter((t) => t.role === "energy");
  const overrideCount = Object.values(draft).reduce((n, set) => n + Object.keys(set ?? {}).length, 0);

  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 11, fontWeight: 700, color: v("--color-text-secondary"), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        Grün-Theming — pro Helligkeitsstufe
      </h2>
      <p style={{ fontSize: 13, color: v("--color-text-muted"), marginBottom: 14, lineHeight: 1.5 }}>
        Stufe wählen, dann jede Grün-Abstufung für diese Stufe einzeln anpassen. Die Vorschau zeigt die
        Töne im echten Kontext dieser Stufe. Speichern wirkt sofort auf der ganzen Seite (Vorschaubild,
        Mail und Embeds ziehen beim nächsten Aufbau nach).
      </p>

      {/* ── Sticky control head: the stage chips + live preview stay pinned to the
           top while you scroll the pickers below, so a colour you pick is always
           visible in context. Save lives in a pinned bar at the bottom. ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 5, background: v("--color-bg"), paddingTop: 4, paddingBottom: 12, marginBottom: 14, borderBottom: `1px solid ${v("--color-border")}` }}>
      {/* ── Stage selector ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {STAGES.map((s) => {
          const active = s.id === stage;
          const count = Object.keys(draft[s.id] ?? {}).length;
          return (
            <button
              key={s.id}
              onClick={() => setStage(s.id)}
              title={s.hint}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "7px 11px", borderRadius: v("--radius-sm"), cursor: "pointer",
                fontSize: 12, fontWeight: active ? 700 : 500, fontFamily: v("--font-text"),
                background: active ? v("--color-accent") : v("--color-bg-muted"),
                color: active ? v("--color-text-on-accent") : v("--color-text-secondary"),
                border: `1px solid ${active ? v("--color-accent") : v("--color-border")}`,
              }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 3, background: stageDefaults(stageIndex(s.id))["--color-bg"], border: `1px solid ${v("--color-border-muted")}`, display: "inline-block" }} />
              {s.label}
              {count > 0 && (
                <span style={{ fontFamily: v("--font-mono"), fontSize: 10, background: active ? "rgba(255,255,255,0.25)" : v("--color-accent-dim"), color: active ? v("--color-text-on-accent") : v("--color-accent"), borderRadius: 999, padding: "1px 6px" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Preview panel (renders in the selected stage's palette) ── */}
      <div
        style={{
          ...previewVars,
          background: "var(--color-bg)",
          border: `1px solid var(--color-border)`,
          borderRadius: 14,
          padding: 16,
          display: "flex", flexDirection: "column", gap: 16,
          transition: "background 0.2s ease",
        }}
      >
        <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Vorschau — {stageMeta.label} ({stage})
        </div>

        {/* Positiv-Grün in context */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "stretch" }}>
          <div style={{ flex: "1 1 130px", background: "var(--color-bg-muted)", borderRadius: 12, padding: "12px 14px", border: `1px solid var(--color-border)` }}>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Rendite 25 J</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--color-positive)", marginTop: 4 }}>+18.450<span style={{ fontSize: 13 }}> €</span></div>
          </div>
          <div style={{ flex: "1 1 130px", background: "var(--color-bg-muted)", borderRadius: 12, padding: "12px 14px", border: `1px solid var(--color-border)` }}>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>⌀ Ersparnis</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--color-positive)", marginTop: 4 }}>1.240<span style={{ fontSize: 13 }}> €/J</span></div>
          </div>
          {/* Mini amortisation curve: positive line + chart-positive-bg fill */}
          <div style={{ flex: "2 1 200px", background: "var(--color-bg)", borderRadius: 12, border: `1px solid var(--color-border)`, padding: 8 }}>
            <svg viewBox="0 0 200 84" width="100%" height="84" preserveAspectRatio="none">
              <rect x="0" y="0" width="200" height="46" fill="var(--color-chart-positive-bg)" />
              <line x1="0" y1="46" x2="200" y2="46" stroke="var(--color-chart-zero)" strokeWidth="1" />
              <polyline points="0,80 40,66 80,52 120,40 160,26 200,8" fill="none" stroke="var(--color-positive)" strokeWidth="2.5" strokeLinejoin="round" />
              <circle cx="103" cy="46" r="4" fill="var(--color-positive)" stroke="var(--color-bg)" strokeWidth="2" />
            </svg>
          </div>
          {/* Highlight / live dot */}
          <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8, padding: "0 6px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-highlight)", display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Live</span>
          </div>
        </div>

        {/* Energie-Grün in context: stacked renewables bar + legend */}
        <div>
          <div style={{ display: "flex", height: 26, borderRadius: 6, overflow: "hidden", border: `1px solid var(--color-border)` }}>
            {[
              { t: "--color-energy-solar", w: 30 },
              { t: "--color-energy-wind", w: 26 },
              { t: "--color-energy-wind-offshore", w: 14 },
              { t: "--color-energy-hydro", w: 12 },
              { t: "--color-energy-biomass", w: 10 },
              { t: "--color-energy-geothermal", w: 8 },
            ].map((seg) => (
              <div key={seg.t} style={{ width: `${seg.w}%`, background: `var(${seg.t})` }} />
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 8 }}>
            {energyTokens.filter((t) => t.token !== "--color-energy-cat-renewable").map((t) => (
              <span key={t.token} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--color-text-muted)" }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: `var(${t.token})`, display: "inline-block" }} />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      </div>{/* end sticky control head */}

      {/* ── Token editors for the selected stage ── */}
      <TokenGroup title="Positiv-Grün — UI-Signalfarbe" tokens={positiveTokens} draft={draft} stage={stage} onSet={setToken} onReset={resetToken} />
      <TokenGroup title="Energie-Grün — Datenvisualisierung" tokens={energyTokens} draft={draft} stage={stage} onSet={setToken} onReset={resetToken} />

      {/* ── Actions (pinned to the bottom so Save is always in reach) ── */}
      <div style={{ position: "sticky", bottom: 0, zIndex: 5, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12, paddingTop: 12, paddingBottom: 12, background: v("--color-bg"), borderTop: `1px solid ${v("--color-border")}` }}>
        <button
          onClick={save}
          disabled={!dirty || status === "saving"}
          style={{
            padding: "12px 28px", borderRadius: v("--radius-md"), fontSize: 15, fontWeight: 700,
            background: dirty ? v("--color-accent") : v("--color-bg-muted"),
            color: dirty ? v("--color-text-on-accent") : v("--color-text-faint"),
            border: "none", cursor: dirty && status !== "saving" ? "pointer" : "default",
            fontFamily: v("--font-text"), boxShadow: dirty ? v("--shadow-sm") : "none",
          }}
        >
          {status === "saving" ? "Speichern…" : dirty ? "Speichern" : "Gespeichert ✓"}
        </button>
        {dirty && (
          <button onClick={discard} style={{ padding: "10px 16px", borderRadius: v("--radius-md"), fontSize: 13, fontWeight: 600, background: "transparent", border: `1px solid ${v("--color-border")}`, color: v("--color-text-secondary"), cursor: "pointer" }}>
            Verwerfen
          </button>
        )}
        {Object.keys(draft[stage] ?? {}).length > 0 && (
          <button onClick={resetStage} style={{ padding: "10px 16px", borderRadius: v("--radius-md"), fontSize: 13, fontWeight: 600, background: "transparent", border: `1px solid ${v("--color-border")}`, color: v("--color-text-muted"), cursor: "pointer" }}>
            Diese Stufe zurücksetzen
          </button>
        )}
        <span style={{ fontSize: 12, color: v("--color-text-faint"), fontFamily: v("--font-mono") }}>
          {overrideCount === 0 ? "keine Overrides" : `${overrideCount} Override${overrideCount === 1 ? "" : "s"} gesamt`}
        </span>
        {status === "ok" && <span style={{ fontSize: 13, color: v("--color-positive"), fontWeight: 600 }}>Gespeichert ✓</span>}
        {status === "error" && <span style={{ fontSize: 13, color: v("--color-negative"), fontWeight: 600 }}>{errorMsg}</span>}
      </div>
    </div>
  );
}

// ─── One group of token rows (positive or energy) ────────────────────────────
function TokenGroup({
  title, tokens, draft, stage, onSet, onReset,
}: {
  title: string;
  tokens: GreenToken[];
  draft: Draft;
  stage: StageId;
  onSet: (token: TokenName, value: string) => void;
  onReset: (token: TokenName) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: v("--color-text-faint"), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {tokens.map((t) => {
          const value = valueFor(draft, stage, t.token);
          const overridden = isOverridden(draft, stage, t.token);
          const solid = value.startsWith("#");
          return (
            <div key={t.token} style={{ display: "flex", alignItems: "center", gap: 10, background: v("--color-bg-muted"), borderRadius: v("--radius-sm"), padding: "8px 10px", border: `1px solid ${overridden ? v("--color-accent") : v("--color-border")}` }}>
              <span style={{ width: 26, height: 26, borderRadius: 6, background: value, border: `1px solid ${v("--color-border")}`, flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: v("--color-text-primary") }}>{t.label}{t.alpha && <span style={{ fontSize: 10, color: v("--color-text-faint"), marginLeft: 6 }}>rgba</span>}</div>
                <div style={{ fontSize: 10, fontFamily: v("--font-mono"), color: v("--color-text-faint"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.token}</div>
              </div>
              {solid && (
                <input
                  type="color"
                  value={value}
                  onChange={(e) => onSet(t.token, e.target.value)}
                  style={{ width: 34, height: 30, padding: 0, border: `1px solid ${v("--color-border")}`, borderRadius: 6, background: "none", cursor: "pointer", flexShrink: 0 }}
                  aria-label={`${t.label} Farbe`}
                />
              )}
              <input
                type="text"
                value={value}
                onChange={(e) => onSet(t.token, e.target.value)}
                spellCheck={false}
                style={{ width: t.alpha ? 150 : 96, fontSize: 12, fontFamily: v("--font-mono"), padding: "6px 8px", border: `1px solid ${v("--color-border")}`, borderRadius: 6, background: v("--color-bg"), color: v("--color-text-primary"), flexShrink: 0 }}
                aria-label={`${t.label} Wert`}
              />
              <button
                onClick={() => onReset(t.token)}
                disabled={!overridden}
                title="Auf Design-System-Standard zurücksetzen"
                style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${v("--color-border")}`, background: "transparent", color: overridden ? v("--color-text-secondary") : v("--color-text-faint"), cursor: overridden ? "pointer" : "default", fontSize: 14, flexShrink: 0, opacity: overridden ? 1 : 0.4 }}
              >
                ↺
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
