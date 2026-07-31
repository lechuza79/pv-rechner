"use client";

import { useRef } from "react";
import { v, space, pad } from "../../../../lib/theme";
// Anzeigewerte kommen aus der EINEN Formatier-Funktion in lib/awards.ts. Die
// frueheren Kopien hier und in awards/gruppe kannten das Format "je100Dach"
// nicht — eine zweite Kopie eines Formatters ist ein Fehler, kein Duplikat.
import { formatAwardValue } from "../../../../lib/awards";
import type { MetricFormat, Messart, Traeger } from "../../../../lib/awards";

export type WinnerRow = {
  scopeId: string;
  scopeLabel: string;
  roleLabel: string | null;
  sizeLabel: string | null;
  winnerName: string;
  winnerBl: string;
  value: number;
  population: number;
  total: number;
};

export type AwardsPayload = {
  categories: { key: string; label: string; merit: string; traeger: Traeger; messart: Messart }[];
  bundeslaender: { ags: string; name: string }[];
  selection: { cat: string; level: string; splitByRole: boolean; splitBySize: boolean; bl: string; minPop: number };
  activeCategory: { key: string; label: string; merit: string; format: MetricFormat; messart: Messart };
  tertiles: { c1: number; c2: number } | null;
  totalGemeinden: number;
  rows: WinnerRow[];
};

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");


export default function AwardsClient({ payload }: { payload: AwardsPayload }) {
  const { categories, bundeslaender, selection, activeCategory, tertiles, totalGemeinden, rows } = payload;
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();

  const buerger = categories.filter((c) => c.traeger === "buerger");
  const gewerbe = categories.filter((c) => c.traeger === "gewerbe");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.lg }}>
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: v("--color-text-primary"), margin: 0 }}>
          Kommunen-Solar-Awards
        </h1>
        <p style={{ fontSize: 14, color: v("--color-text-secondary"), marginTop: space.xs, maxWidth: 640, lineHeight: 1.5 }}>
          Backend-Prototyp zum Durchblättern und Festzurren. Sieger je Kategorie, geografischem
          Bezug und optional je Rolle bzw. Größenklasse — gerechnet aus {nf(totalGemeinden)}{" "}
          bewohnten Gemeinden. Noch keine Darstellung nach außen.
        </p>
        <a href="/admin/awards/anschreiben" style={{ display: "inline-block", marginTop: space.sm, fontSize: 13, fontWeight: 600, color: v("--color-accent"), textDecoration: "none" }}>
          → Anschreiben-Aufhänger je Gemeinde
        </a>
      </header>

      {/* Steuerung: alles per URL, Änderung schickt das Formular direkt ab. */}
      <form
        ref={formRef}
        method="get"
        action="/admin/awards"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: space.md,
          alignItems: "end",
          background: v("--color-bg-muted"),
          border: `1px solid ${v("--color-border")}`,
          borderRadius: v("--radius-md"),
          padding: pad("md", "lg"),
        }}
      >
        <Field label="Kategorie">
          <select name="cat" defaultValue={selection.cat} onChange={submit} style={selectStyle}>
            <optgroup label="Bürger">
              {buerger.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label} ({c.messart === "proKopf" ? "pro Kopf" : "absolut"})
                </option>
              ))}
            </optgroup>
            <optgroup label="Gewerbe / Standort">
              {gewerbe.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>

        <Field label="Geografischer Bezug">
          <select name="level" defaultValue={selection.level} onChange={submit} style={selectStyle}>
            <option value="de">Deutschland</option>
            <option value="bundesland">je Bundesland</option>
            <option value="landkreis">je Landkreis</option>
          </select>
        </Field>

        <Field label="Bundesland-Filter">
          <select name="bl" defaultValue={selection.bl} onChange={submit} style={selectStyle}>
            <option value="">Alle</option>
            {bundeslaender.map((b) => (
              <option key={b.ags} value={b.ags}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Einwohner-Untergrenze">
          <input
            type="number"
            name="minPop"
            defaultValue={selection.minPop || ""}
            min={0}
            step={500}
            placeholder="0"
            onBlur={submit}
            style={selectStyle}
          />
        </Field>

        <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
          <label style={checkLabel}>
            <input type="checkbox" name="role" value="1" defaultChecked={selection.splitByRole} onChange={submit} /> nach Rolle
            aufschlüsseln
          </label>
          <label style={checkLabel}>
            <input type="checkbox" name="size" value="1" defaultChecked={selection.splitBySize} onChange={submit} /> nach Größe
            (Drittel)
          </label>
        </div>

        <noscript>
          <button type="submit" style={{ ...selectStyle, cursor: "pointer", fontWeight: 700 }}>
            Anzeigen
          </button>
        </noscript>
      </form>

      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: v("--color-text-primary") }}>
          {activeCategory.label}{" "}
          <span style={{ fontSize: 12, fontWeight: 600, color: v("--color-text-muted") }}>
            {activeCategory.messart === "proKopf" ? "· pro Kopf" : "· absolut"}
          </span>
        </div>
        <div style={{ fontSize: 13, color: v("--color-text-secondary"), marginTop: 2 }}>{activeCategory.merit}</div>
        {tertiles && (
          <div style={{ fontSize: 12, color: v("--color-text-muted"), marginTop: 4 }}>
            Größenklassen aus der Verteilung: klein &lt; {nf(tertiles.c1)} · mittel {nf(tertiles.c1)}–{nf(tertiles.c2)} · groß ≥{" "}
            {nf(tertiles.c2)} Einwohner
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div style={{ fontSize: 14, color: v("--color-text-muted") }}>Keine Sieger für diese Auswahl.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ ...rowGrid, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: v("--color-text-muted"), padding: pad("xs", "sm") }}>
            <span>Bezug{selection.splitByRole ? " · Rolle" : ""}{selection.splitBySize ? " · Größe" : ""}</span>
            <span>Sieger</span>
            <span style={{ textAlign: "right" }}>Wert</span>
            <span style={{ textAlign: "right" }}>Einwohner</span>
            <span style={{ textAlign: "right" }}>wertbar</span>
          </div>
          {rows.map((r, i) => (
            <div
              key={`${r.scopeId}-${r.roleLabel ?? ""}-${r.sizeLabel ?? ""}-${i}`}
              style={{ ...rowGrid, fontSize: 13.5, padding: pad("sm", "sm"), borderRadius: v("--radius-sm"), background: i % 2 ? "transparent" : v("--color-bg-muted") }}
            >
              <span style={{ color: v("--color-text-secondary"), minWidth: 0 }}>
                {r.scopeLabel}
                {r.roleLabel ? ` · ${r.roleLabel}` : ""}
                {r.sizeLabel ? ` · ${r.sizeLabel}` : ""}
              </span>
              <span style={{ color: v("--color-text-primary"), fontWeight: 600, minWidth: 0 }}>
                {r.winnerName} <span style={{ color: v("--color-text-muted"), fontWeight: 400, fontSize: 12 }}>({r.winnerBl})</span>
              </span>
              <span style={{ textAlign: "right", fontFamily: v("--font-mono"), color: v("--color-accent") }}>
                {formatAwardValue(r.value, activeCategory.format)}
              </span>
              <span style={{ textAlign: "right", fontFamily: v("--font-mono"), color: v("--color-text-muted") }}>{nf(r.population)}</span>
              <span style={{ textAlign: "right", fontFamily: v("--font-mono"), color: v("--color-text-muted") }}>{nf(r.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const rowGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1.4fr) auto auto auto",
  gap: space.md,
  alignItems: "baseline",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 14,
  padding: pad("sm", "md"),
  background: v("--color-bg"),
  border: `1px solid ${v("--color-border")}`,
  borderRadius: v("--radius-sm"),
  color: v("--color-text-primary"),
};

const checkLabel: React.CSSProperties = {
  fontSize: 13,
  color: v("--color-text-secondary"),
  display: "flex",
  alignItems: "center",
  gap: space.xs,
  cursor: "pointer",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: v("--color-text-muted") }}>
        {label}
      </span>
      {children}
    </label>
  );
}
