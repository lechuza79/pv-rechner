"use client";
import { useState } from "react";
import Link from "next/link";
import { tokens, v } from "../../../../lib/theme";
import AdminSeitenkopf from "../../../../components/admin/AdminSeitenkopf";
import type { ThemeOverrides } from "../../../../lib/theme-overrides";
import OptionCard from "../../../../components/OptionCard";
import TriToggle from "../../../../components/TriToggle";
import InlineEdit from "../../../../components/InlineEdit";
import Chart from "../../photovoltaik-rechner/_components/Chart";
import GreenThemingEditor from "./GreenThemingEditor";

// Group tokens by category for display
const tokenGroups: { label: string; prefix: string }[] = [
  { label: "Backgrounds", prefix: "--color-bg" },
  { label: "Borders", prefix: "--color-border" },
  { label: "Accent", prefix: "--color-accent" },
  { label: "Semantic", prefix: "--color-positive|--color-negative" },
  { label: "Chart", prefix: "--color-chart" },
  { label: "Text", prefix: "--color-text" },
  { label: "Other Colors", prefix: "--color-progress" },
  { label: "Fonts", prefix: "--font" },
  { label: "Radii", prefix: "--radius" },
  { label: "Layout", prefix: "--page" },
];

/**
 * Die Schriftgrößen-Skala, wie sie im Design-Guide steht.
 *
 * Es wird KEINE Größe getippt, nur die Rolle benannt — die Zahl kommt aus dem
 * Token. Bis zum 01.09.2026 stand hier eine handgetippte Liste, und sie war
 * die falsche: acht Zeilen mit 24/20/15/14/13/12/11/10, während die Skala
 * längst andere Werte trug. Ein Design-Guide, der etwas anderes zeigt als die
 * Seite, ist schlimmer als keiner — man baut danach.
 *
 * Die Beschriftung nennt die Rolle, nicht den Ort: „Fließtext" gilt überall,
 * „Body im Rechner" wäre schon wieder eine zweite Wahrheit.
 */
const TEXTSTUFEN = [
  { token: "--font-size-h1" as const, weight: 800, label: "Seitentitel" },
  { token: "--font-size-h2" as const, weight: 800, label: "Abschnitts-Überschrift" },
  { token: "--font-size-h3" as const, weight: 700, label: "Kleine Überschrift" },
  { token: "--font-size-lead" as const, weight: 700, label: "Lead, Kartentitel" },
  { token: "--font-size-body" as const, weight: 400, label: "Fließtext, Navigation, Fußzeile, Eingabefelder" },
  { token: "--font-size-small" as const, weight: 600, label: "Sekundärtext, Chips, Tabellenzellen" },
  { token: "--font-size-caption" as const, weight: 700, label: "Versal-Label, Hinweis, dichte Daten" },
  { token: "--font-size-micro" as const, weight: 400, label: "Diagramm- und Achsenbeschriftung" },
];

/**
 * Die großen Zahlen. Sie sind KEINE Textstufen: Neben jeder steht eine
 * Einheit, und der Größenunterschied zu ihr trägt die Aussage. Deshalb stehen
 * sie getrennt — wer eine davon auf eine Textstufe rundet, nimmt der Zahl
 * ihren Vorrang vor der Einheit.
 */
const ZAHLENSTUFEN = [
  { token: "--font-size-display-xl" as const, weight: 800, label: "Die eine große Zahl einer Seite", color: v("--color-accent") },
  { token: "--font-size-display-lg" as const, weight: 800, label: "Hero-Zahl eines Rechner-Ergebnisses", color: v("--color-accent") },
  { token: "--font-size-display-md" as const, weight: 800, label: "Mitte eines Rings, mittlere Kennzahl", color: v("--color-positive") },
  { token: "--font-size-display-sm" as const, weight: 800, label: "Kennzahl in einer Kachel", color: v("--color-positive") },
  { token: "--font-size-body" as const, weight: 700, label: "Zahl im Fließtext, editierbarer Wert", color: v("--color-text-primary") },
  { token: "--font-size-micro" as const, weight: 500, label: "Zahl an einer Diagramm-Achse", color: v("--color-text-muted") },
];

function getTokensForGroup(prefix: string) {
  const prefixes = prefix.split("|");
  return Object.entries(tokens).filter(([k]) => prefixes.some(p => k.startsWith(p)));
}

function isColor(value: string) {
  return value.startsWith("#") || value.startsWith("rgb");
}

// Sample chart data for demo
const sampleScenarios = [
  {
    id: "pessimistic", color: v("--color-negative"),
    data: {
      years: Array.from({ length: 26 }, (_, i) => ({ i, kum: -15000 + i * 700 })),
      be: { i: 21, kum: 0 },
    },
  },
  {
    id: "realistic", color: v("--color-positive"),
    data: {
      years: Array.from({ length: 26 }, (_, i) => ({ i, kum: -15000 + i * 1100 })),
      be: { i: 14, kum: 0 },
    },
  },
  {
    id: "optimistic", color: v("--color-accent"),
    data: {
      years: Array.from({ length: 26 }, (_, i) => ({ i, kum: -15000 + i * 1500 })),
      be: { i: 10, kum: 0 },
    },
  },
];

export default function ThemeClient({ overrides }: { overrides: ThemeOverrides }) {
  const [triValue, setTriValue] = useState("nein");
  const [editValue, setEditValue] = useState(15000);

  return (
    <div style={{ fontFamily: v('--font-text'), color: v('--color-text-primary') }}>
      <div style={{ maxWidth: 640 }}>

        <div style={{ marginBottom: 32 }}>
          <Link href="/admin" style={{ fontSize: v("--font-size-small"), fontWeight: 600, color: v('--color-accent'), textDecoration: "none", display: "inline-block", marginBottom: 10 }}>← Admin-Backend</Link>
          <AdminSeitenkopf titel="Design System" hilfe="Alle Tokens und Komponenten auf einen Blick." />
        </div>

        {/* ── GREEN THEMING (interactive, persistent) ── */}
        <GreenThemingEditor initial={overrides} />

        {/* ── COLOR TOKENS ── */}
        {tokenGroups.map(group => {
          const items = getTokensForGroup(group.prefix);
          if (items.length === 0) return null;
          return (
            <div key={group.label} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: v("--font-size-caption"), fontWeight: 700, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                {group.label}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {items.map(([name, value]) => (
                  <div key={name} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: v('--color-bg'), borderRadius: v('--radius-sm'), padding: "8px 12px",
                    border: `1px solid ${v('--color-border')}`,
                  }}>
                    {isColor(value) && (
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                        background: value,
                        border: `1px solid ${v('--color-border')}`,
                      }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: v("--font-size-caption"), fontFamily: v('--font-mono'), color: v('--color-text-primary'), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {name}
                      </div>
                      <div style={{ fontSize: v("--font-size-micro"), fontFamily: v('--font-mono'), color: v('--color-text-faint'), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* ── TYPOGRAPHY ── */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: v("--font-size-caption"), fontWeight: 700, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Typografie — DM Sans
          </h2>
          <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: 16, border: `1px solid ${v('--color-border')}`, display: "flex", flexDirection: "column", gap: 8 }}>
            {TEXTSTUFEN.map(t => (
              <div key={t.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: v(t.token), fontWeight: t.weight, fontFamily: v('--font-text'), color: v('--color-text-primary') }}>
                  Lohnt sich PV?
                </span>
                <span style={{ fontSize: v("--font-size-micro"), color: v('--color-text-faint'), fontFamily: v('--font-mono'), flexShrink: 0, marginLeft: 12 }}>{tokens[t.token]} — {t.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: v("--font-size-caption"), fontWeight: 700, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Typografie — JetBrains Mono
          </h2>
          <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: 16, border: `1px solid ${v('--color-border')}`, display: "flex", flexDirection: "column", gap: 8 }}>
            {ZAHLENSTUFEN.map(t => (
              <div key={t.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: v(t.token), fontWeight: t.weight, fontFamily: v('--font-mono'), color: t.color }}>
                  12.450
                </span>
                <span style={{ fontSize: v("--font-size-micro"), color: v('--color-text-faint'), fontFamily: v('--font-mono'), flexShrink: 0, marginLeft: 12 }}>{tokens[t.token]} — {t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RADII ── */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: v("--font-size-caption"), fontWeight: 700, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Border Radii
          </h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { token: '--radius-sm' as const, label: "SM (6px)" },
              { token: '--radius-md' as const, label: "MD (12px)" },
              { token: '--radius-lg' as const, label: "LG (20px)" },
            ].map(r => (
              <div key={r.token} style={{
                width: 80, height: 80, borderRadius: v(r.token),
                background: v('--color-bg'), border: `2px solid ${v('--color-accent')}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: v("--font-size-micro"), color: v('--color-text-muted'), textAlign: "center", lineHeight: 1.2,
                fontFamily: v('--font-mono'),
              }}>
                {r.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── COMPONENTS ── */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: v("--font-size-caption"), fontWeight: 700, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            OptionCard
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <OptionCard selected={true} onClick={() => {}} label="10 kWp" sub="Mittelgroß" icon="☀️" />
            <OptionCard selected={false} onClick={() => {}} label="15 kWp" sub="Groß" icon="🔆" />
            <OptionCard selected={false} onClick={() => {}} label="5 kWp" sub="Klein" />
            <OptionCard selected={false} onClick={() => {}} label="8 kWp" sub="Standard" />
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: v("--font-size-caption"), fontWeight: 700, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            TriToggle
          </h2>
          <TriToggle
            label="Wärmepumpe"
            options={[{ id: "nein", label: "Nein" }, { id: "geplant", label: "Geplant" }, { id: "ja", label: "Vorhanden" }]}
            value={triValue}
            onChange={setTriValue}
          />
        </div>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: v("--font-size-caption"), fontWeight: 700, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            InlineEdit
          </h2>
          <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: 16, border: `1px solid ${v('--color-border')}`, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: v("--font-size-small") }}>
              <span style={{ color: v('--color-text-secondary') }}>Investition</span>
              <InlineEdit value={editValue} onCommit={setEditValue} unit=" €" step={500} min={500} max={80000} width={68} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: v("--font-size-small") }}>
              <span style={{ color: v('--color-text-secondary') }}>Eigenverbrauch</span>
              <InlineEdit value={42} onCommit={() => {}} unit="%" step={1} min={10} max={90} width={40} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: v("--font-size-small") }}>
              <span style={{ color: v('--color-text-secondary') }}>Strompreis</span>
              <InlineEdit value={0.34} onCommit={() => {}} unit=" €" step={0.01} min={0.15} max={0.60} width={52} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: v("--font-size-caption"), fontWeight: 700, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Chart (Amortisation)
          </h2>
          <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: 12, border: `1px solid ${v('--color-border')}` }}>
            <Chart scenarios={sampleScenarios} kosten={15000} />
          </div>
        </div>

        {/* ── BUTTONS ── */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: v("--font-size-caption"), fontWeight: 700, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Buttons
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button style={{
              padding: "14px", borderRadius: v('--radius-md'), fontSize: v("--font-size-body"), fontWeight: 700,
              background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer",
              fontFamily: v('--font-text'), width: "100%",
            }}>
              Primary CTA — Ergebnis anzeigen →
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{
                flex: 1, padding: "10px 20px", borderRadius: v('--radius-md'), fontSize: v("--font-size-body"), fontWeight: 600,
                background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer",
              }}>
                Secondary — Zurück
              </button>
              <button style={{
                flex: 1, padding: "10px 32px", borderRadius: v('--radius-md'), fontSize: v("--font-size-body"), fontWeight: 700,
                background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer",
              }}>
                Weiter →
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{
                padding: "8px 14px", borderRadius: v('--radius-md'), fontSize: v("--font-size-small"), fontWeight: 600, cursor: "pointer",
                background: v('--color-accent-dim'), border: `1.5px solid ${v('--color-accent')}`, color: v('--color-accent'),
              }}>
                Quick Setting aktiv
              </button>
              <button style={{
                padding: "8px 14px", borderRadius: v('--radius-md'), fontSize: v("--font-size-small"), fontWeight: 600, cursor: "pointer",
                background: v('--color-bg'), border: `1.5px solid ${v('--color-border')}`, color: v('--color-text-secondary'),
              }}>
                Quick Setting inaktiv
              </button>
            </div>
          </div>
        </div>

        {/* ── CARDS ── */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: v("--font-size-caption"), fontWeight: 700, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Cards
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: 16, border: `1px solid ${v('--color-border')}` }}>
              <div style={{ fontSize: v("--font-size-caption"), color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Gewinn nach 25 Jahren</div>
              <div style={{ fontSize: v("--font-size-display-sm"), fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-positive'), marginTop: 4 }}>+18.450 €</div>
            </div>
            <div style={{
              textAlign: "center", padding: "24px 20px", background: v('--color-bg-accent'),
              borderRadius: v('--radius-lg'), border: `1px solid ${v('--color-border-accent')}`,
            }}>
              <div style={{ fontSize: v("--font-size-small"), color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>Hero Card</div>
              <div style={{ fontSize: v("--font-size-display-xl"), fontWeight: 800, color: v('--color-accent'), fontFamily: v('--font-mono'), lineHeight: 1 }}>
                12<span style={{ fontSize: v("--font-size-display-sm"), fontWeight: 600, marginLeft: 4 }}>Jahren</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: v("--font-size-caption"), color: v('--color-text-faint'), padding: "24px 0" }}>
          {Object.keys(tokens).length} Design Tokens definiert
        </div>
      </div>
    </div>
  );
}
