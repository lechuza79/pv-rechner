"use client";

import Link from "next/link";
import { v, space, pad } from "../../../../../lib/theme";
import type { HookExample, HookKind } from "../../../../../lib/award-hook";

export type HooksPayload = {
  total: number;
  dist: Record<HookKind, number>;
  settings: { cut: number; buerger: boolean; hoch: boolean };
  q: string;
  mode: "suche" | "beispiele";
  rows: HookExample[];
};

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

const KIND_LABEL: Record<HookKind, string> = {
  sieger: "Sieg", podium: "Podium", perzentil: "Top-Prozent", neutral: "neutral",
};
function kindColor(k: HookKind): string {
  if (k === "sieger") return v("--color-positive");
  if (k === "podium") return v("--color-accent");
  if (k === "perzentil") return v("--color-accent-light");
  return v("--color-text-muted");
}

function detailHref(r: HookExample): string | null {
  if (!r.categoryKey || !r.level || !r.scopeId) return null;
  const p = new URLSearchParams({ cat: r.categoryKey, level: r.level, scope: r.scopeId, mark: r.regionId });
  return `/admin/awards/gruppe?${p.toString()}`;
}

export default function HooksClient({ payload }: { payload: HooksPayload }) {
  const { total, dist, settings, q, mode, rows } = payload;
  const kinds: HookKind[] = ["sieger", "podium", "perzentil", "neutral"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.lg }}>
      <header>
        <div style={{ fontSize: 13 }}>
          <Link href="/admin/awards" style={{ color: v("--color-accent"), textDecoration: "none" }}>← Award-Rangliste</Link>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: v("--color-text-primary"), margin: "8px 0 0" }}>
          Anschreiben-Aufhänger je Gemeinde
        </h1>
        <p style={{ fontSize: 14, color: v("--color-text-secondary"), marginTop: space.xs, maxWidth: 660, lineHeight: 1.5 }}>
          Für jede der {nf(total)} Gemeinden wird aus allen Platzierungen der beste, glaubwürdige Aufhänger
          gewählt — Betreff und Einstieg fürs Outreach. Eine Stadt bekommt so automatisch ihre Standort-Zahl,
          ein Dorf seine Pro-Kopf-Auszeichnung.
        </p>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm }}>
        {kinds.map((k) => {
          const n = dist[k];
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <div key={k} style={{ flex: "1 1 150px", background: v("--color-bg-muted"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md"), padding: pad("sm", "md") }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: kindColor(k) }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: v("--color-text-secondary") }}>{KIND_LABEL[k]}</span>
              </div>
              <div style={{ fontFamily: v("--font-mono"), fontSize: 20, fontWeight: 700, color: v("--color-text-primary"), marginTop: 2 }}>
                {nf(n)} <span style={{ fontSize: 12, color: v("--color-text-muted") }}>· {pct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Steuerung: Eingabe → Anwenden. Kein Live-Update. */}
      <form method="get" action="/admin/awards/anschreiben" style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: space.md, alignItems: "end",
        background: v("--color-bg-muted"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md"), padding: pad("md", "lg"),
      }}>
        <Field label="Gemeinde suchen">
          <input type="text" name="q" defaultValue={q} placeholder="Name…" style={inputStyle} />
        </Field>
        <Field label="Top-Prozent-Grenze (%)">
          <input type="number" name="cut" defaultValue={settings.cut} min={1} max={50} step={1} style={inputStyle} />
        </Field>
        <Field label="Bei Gleichstand">
          <select name="buerger" defaultValue={settings.buerger ? "1" : "0"} style={inputStyle}>
            <option value="1">Bürger bevorzugen</option>
            <option value="0">neutral</option>
          </select>
        </Field>
        <Field label="Ebene">
          <select name="hoch" defaultValue={settings.hoch ? "1" : "0"} style={inputStyle}>
            <option value="1">höhere Ebene zuerst</option>
            <option value="0">lokal (Kreis) zuerst</option>
          </select>
        </Field>
        <button type="submit" style={{ fontSize: 14, fontWeight: 700, color: v("--color-text-on-accent"), background: v("--color-accent"), border: "none", borderRadius: v("--radius-sm"), padding: pad("sm", "lg"), cursor: "pointer" }}>
          Anwenden
        </button>
      </form>

      <div style={{ fontSize: 12, color: v("--color-text-muted"), display: "flex", gap: space.sm, alignItems: "baseline", flexWrap: "wrap" }}>
        {mode === "suche" ? (
          <>
            <span>{rows.length} Treffer für „{q}"</span>
            <Link
              href={`/admin/awards/anschreiben?cut=${settings.cut}&buerger=${settings.buerger ? 1 : 0}&hoch=${settings.hoch ? 1 : 0}`}
              style={{ color: v("--color-accent"), textDecoration: "none", fontWeight: 600 }}
            >
              × Suche löschen
            </Link>
          </>
        ) : (
          <span>Je ein Beispiel pro Aufhänger-Art (mittelgroße Gemeinden).</span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
        {rows.length === 0 && <div style={{ fontSize: 14, color: v("--color-text-muted") }}>Keine Gemeinde gefunden.</div>}
        {rows.map((r) => {
          const href = detailHref(r);
          return (
            <div key={r.regionId} style={{ border: `1px solid ${v("--color-border")}`, borderLeft: `3px solid ${kindColor(r.kind)}`, borderRadius: v("--radius-md"), padding: pad("md", "lg") }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: space.md, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 700, color: v("--color-text-primary") }}>
                  {r.name} <span style={{ fontSize: 12, fontWeight: 400, color: v("--color-text-muted") }}>({r.bl}, {nf(r.population)} Ew)</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: kindColor(r.kind) }}>{KIND_LABEL[r.kind]}</span>
              </div>
              <div style={{ marginTop: space.sm }}>
                <span style={{ fontSize: 11, color: v("--color-text-muted") }}>BETREFF</span>
                <div style={{ fontSize: 15, fontWeight: 600, color: v("--color-text-primary") }}>{r.betreff}</div>
              </div>
              <div style={{ marginTop: space.xs }}>
                <span style={{ fontSize: 11, color: v("--color-text-muted") }}>EINSTIEG</span>
                <div style={{ fontSize: 14, color: v("--color-text-secondary"), lineHeight: 1.5 }}>{r.einstieg}</div>
              </div>
              <div style={{ marginTop: space.sm, display: "flex", justifyContent: "space-between", gap: space.md, flexWrap: "wrap", alignItems: "baseline" }}>
                {r.others.length > 0 ? (
                  <div style={{ fontSize: 12, color: v("--color-text-muted") }}>weitere Spitzenplätze: {r.others.join("  ·  ")}</div>
                ) : <span />}
                {href && (
                  <Link href={href} style={{ fontSize: 13, fontWeight: 600, color: v("--color-accent"), textDecoration: "none", whiteSpace: "nowrap" }}>
                    Rangliste ansehen →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", fontSize: 14, padding: pad("sm", "md"), background: v("--color-bg"),
  border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-sm"), color: v("--color-text-primary"),
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: v("--color-text-muted") }}>{label}</span>
      {children}
    </label>
  );
}
