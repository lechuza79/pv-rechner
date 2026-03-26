"use client";
import { useState } from "react";
import { tokens, v } from "../../../lib/theme";
import OptionCard from "../../../components/OptionCard";
import TriToggle from "../../../components/TriToggle";
import InlineEdit from "../../../components/InlineEdit";
import Chart from "../../../components/Chart";

// Group tokens by category for display
const tokenGroups: { label: string; prefix: string }[] = [
  { label: "Backgrounds", prefix: "--color-bg" },
  { label: "Borders", prefix: "--color-border" },
  { label: "Accent", prefix: "--color-accent" },
  { label: "Semantic", prefix: "--color-negative|--color-optimistic" },
  { label: "Chart", prefix: "--color-chart" },
  { label: "Text", prefix: "--color-text" },
  { label: "Other Colors", prefix: "--color-progress" },
  { label: "Fonts", prefix: "--font" },
  { label: "Radii", prefix: "--radius" },
  { label: "Layout", prefix: "--page" },
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
    id: "pessimistic", color: "#EF4444",
    data: {
      years: Array.from({ length: 26 }, (_, i) => ({ i, kum: -15000 + i * 700 })),
      be: { i: 21, kum: 0 },
    },
  },
  {
    id: "realistic", color: "#00D950",
    data: {
      years: Array.from({ length: 26 }, (_, i) => ({ i, kum: -15000 + i * 1100 })),
      be: { i: 14, kum: 0 },
    },
  },
  {
    id: "optimistic", color: "#1365EA",
    data: {
      years: Array.from({ length: 26 }, (_, i) => ({ i, kum: -15000 + i * 1500 })),
      be: { i: 10, kum: 0 },
    },
  },
];

export default function ThemeClient() {
  const [triValue, setTriValue] = useState("nein");
  const [editValue, setEditValue] = useState(15000);

  return (
    <div style={{ background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), minHeight: "100vh", padding: "20px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: v('--color-accent'), letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Admin</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: v('--color-text-white'), marginBottom: 4 }}>Design System</h1>
          <p style={{ fontSize: 13, color: v('--color-text-muted') }}>Alle Tokens und Komponenten auf einen Blick.</p>
        </div>

        {/* ── COLOR TOKENS ── */}
        {tokenGroups.map(group => {
          const items = getTokensForGroup(group.prefix);
          if (items.length === 0) return null;
          return (
            <div key={group.label} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-label'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                {group.label}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {items.map(([name, value]) => (
                  <div key={name} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: v('--color-bg-card'), borderRadius: v('--radius-pill'), padding: "8px 12px",
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
                      <div style={{ fontSize: 11, fontFamily: v('--font-mono'), color: v('--color-text-primary'), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {name}
                      </div>
                      <div style={{ fontSize: 10, fontFamily: v('--font-mono'), color: v('--color-text-faint'), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
          <h2 style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-label'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Typografie — DM Sans
          </h2>
          <div style={{ background: v('--color-bg-card'), borderRadius: v('--radius-card'), padding: 16, border: `1px solid ${v('--color-border')}`, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { size: 24, weight: 800, label: "24px / 800 — Page Title" },
              { size: 20, weight: 800, label: "20px / 800 — Section Title" },
              { size: 18, weight: 700, label: "18px / 700 — Step Title" },
              { size: 16, weight: 700, label: "16px / 700 — Card Title" },
              { size: 14, weight: 700, label: "14px / 700 — Label" },
              { size: 14, weight: 600, label: "14px / 600 — Button" },
              { size: 13, weight: 400, label: "13px / 400 — Body" },
              { size: 12, weight: 600, label: "12px / 600 — Small Label" },
              { size: 11, weight: 700, label: "11px / 700 — Uppercase Label" },
            ].map(t => (
              <div key={t.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: t.size, fontWeight: t.weight, fontFamily: v('--font-text'), color: v('--color-text-primary') }}>
                  Lohnt sich PV?
                </span>
                <span style={{ fontSize: 10, color: v('--color-text-faint'), fontFamily: v('--font-mono'), flexShrink: 0, marginLeft: 12 }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-label'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Typografie — JetBrains Mono
          </h2>
          <div style={{ background: v('--color-bg-card'), borderRadius: v('--radius-card'), padding: 16, border: `1px solid ${v('--color-border')}`, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { size: 56, weight: 800, label: "56px / 800 — Hero Number", color: v('--color-accent') },
              { size: 42, weight: 800, label: "42px / 800 — Recommendation", color: v('--color-accent') },
              { size: 22, weight: 800, label: "22px / 800 — Stat Value", color: v('--color-text-primary') },
              { size: 16, weight: 700, label: "16px / 700 — Inline Data", color: v('--color-text-primary') },
              { size: 14, weight: 600, label: "14px / 600 — Card Data", color: v('--color-text-primary') },
              { size: 13, weight: 700, label: "13px / 700 — Editable Value", color: v('--color-text-white') },
              { size: 12, weight: 600, label: "12px / 600 — Code/Mono", color: v('--color-accent') },
            ].map(t => (
              <div key={t.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: t.size, fontWeight: t.weight, fontFamily: v('--font-mono'), color: t.color }}>
                  12.450
                </span>
                <span style={{ fontSize: 10, color: v('--color-text-faint'), fontFamily: v('--font-mono'), flexShrink: 0, marginLeft: 12 }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RADII ── */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-label'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Border Radii
          </h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { token: '--radius-input', label: "Input (6px)" },
              { token: '--radius-pill', label: "Pill (8px)" },
              { token: '--radius-button', label: "Button (10px)" },
              { token: '--radius-button-lg', label: "Button LG (12px)" },
              { token: '--radius-card', label: "Card (14px)" },
              { token: '--radius-card-lg', label: "Card LG (16px)" },
              { token: '--radius-card-xl', label: "Card XL (20px)" },
            ].map(r => (
              <div key={r.token} style={{
                width: 64, height: 64, borderRadius: `var(${r.token})`,
                background: v('--color-bg-card'), border: `2px solid ${v('--color-accent')}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, color: v('--color-text-faint'), textAlign: "center", lineHeight: 1.2,
                fontFamily: v('--font-mono'),
              }}>
                {r.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── COMPONENTS ── */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-label'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
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
          <h2 style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-label'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
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
          <h2 style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-label'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            InlineEdit
          </h2>
          <div style={{ background: v('--color-bg-card'), borderRadius: v('--radius-card'), padding: 16, border: `1px solid ${v('--color-border')}`, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
              <span style={{ color: v('--color-text-label') }}>Investition</span>
              <InlineEdit value={editValue} onCommit={setEditValue} unit=" €" step={500} min={500} max={80000} width={68} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
              <span style={{ color: v('--color-text-label') }}>Eigenverbrauch</span>
              <InlineEdit value={42} onCommit={() => {}} unit="%" step={1} min={10} max={90} width={40} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
              <span style={{ color: v('--color-text-label') }}>Strompreis</span>
              <InlineEdit value={0.34} onCommit={() => {}} unit=" €" step={0.01} min={0.15} max={0.60} width={52} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-label'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Chart (Amortisation)
          </h2>
          <div style={{ background: v('--color-bg-card'), borderRadius: v('--radius-card'), padding: 12, border: `1px solid ${v('--color-border')}` }}>
            <Chart scenarios={sampleScenarios} kosten={15000} />
          </div>
        </div>

        {/* ── BUTTONS ── */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-label'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Buttons
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button style={{
              padding: "14px", borderRadius: v('--radius-button-lg'), fontSize: 15, fontWeight: 700,
              background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer",
              fontFamily: v('--font-text'), width: "100%",
            }}>
              Primary CTA — Ergebnis anzeigen →
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{
                flex: 1, padding: "10px 20px", borderRadius: v('--radius-button'), fontSize: 14, fontWeight: 600,
                background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer",
              }}>
                Secondary — Zurück
              </button>
              <button style={{
                flex: 1, padding: "10px 32px", borderRadius: v('--radius-button'), fontSize: 14, fontWeight: 700,
                background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer",
              }}>
                Weiter →
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{
                padding: "8px 14px", borderRadius: v('--radius-button'), fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: v('--color-accent-dim'), border: `1.5px solid ${v('--color-accent')}`, color: v('--color-accent'),
              }}>
                Quick Setting aktiv
              </button>
              <button style={{
                padding: "8px 14px", borderRadius: v('--radius-button'), fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: v('--color-bg-card'), border: `1.5px solid ${v('--color-border-input')}`, color: v('--color-text-secondary'),
              }}>
                Quick Setting inaktiv
              </button>
            </div>
          </div>
        </div>

        {/* ── CARDS ── */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-label'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Cards
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: v('--color-bg-card'), borderRadius: v('--radius-card'), padding: 16, border: `1px solid ${v('--color-border')}` }}>
              <div style={{ fontSize: 11, color: v('--color-text-label'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Rendite 25 Jahre</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-accent'), marginTop: 4 }}>+18.450 €</div>
            </div>
            <div style={{
              textAlign: "center", padding: "24px 20px", background: v('--color-bg-hero'),
              borderRadius: v('--radius-card-xl'), border: `1px solid ${v('--color-border-hero')}`,
            }}>
              <div style={{ fontSize: 12, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>Hero Card</div>
              <div style={{ fontSize: 56, fontWeight: 800, color: v('--color-accent'), fontFamily: v('--font-mono'), lineHeight: 1 }}>
                12<span style={{ fontSize: 22, fontWeight: 600, marginLeft: 4 }}>Jahren</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: 11, color: v('--color-text-disabled'), padding: "24px 0" }}>
          {Object.keys(tokens).length} Design Tokens definiert
        </div>
      </div>
    </div>
  );
}
