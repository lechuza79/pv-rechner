"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../../../components/Header";
import { IconBolt, IconRefresh, IconLink } from "../../../components/Icons";
import { v } from "../../../lib/theme";
import {
  WIDGET_FONTS,
  WIDGET_THEME_DEFAULTS,
  WidgetThemeSelection,
  buildWidgetThemeQuery,
  selectionToVars,
} from "../../../lib/widget-theme";

const SITE_URL = "https://solar-check.io";
const MAX_RADIUS = 28;

interface WidgetVariant {
  id: string;
  label: string;
  src: string;
  height: number;
  /** If set, the iframe renders at this fixed width; otherwise the width selector applies. */
  fixedWidth?: number;
}

interface Attribution {
  /** Deep link target on solar-check.io — this anchor in the HOST page is the actual backlink. */
  path: string;
  text: string;
}

interface WidgetSection {
  id: string;
  label: string;
  intro: string;
  attribution: Attribution;
  showFrameWidth: boolean;
  showAutoswitch?: boolean;
  variants: WidgetVariant[];
}

const SECTIONS: WidgetSection[] = [
  {
    id: "erzeugung",
    label: "Stromerzeugung (live)",
    intro:
      "Die aktuelle Erzeugung aus erneuerbaren Quellen als Radial-Chart der letzten 24 Stunden. Optional wechselt das Widget automatisch durch die Energieträger.",
    attribution: {
      path: "/strommix-deutschland",
      text: "Stromerzeugung in Deutschland – live bei Solar Check",
    },
    showFrameWidth: false,
    showAutoswitch: true,
    variants: [
      { id: "standard", label: "Standard", src: "/embed/erzeugung", height: 460, fixedWidth: 380 },
      { id: "mini", label: "Kompakt", src: "/embed/erzeugung-mini", height: 330, fixedWidth: 260 },
    ],
  },
  {
    id: "strommix",
    label: "Strommix Deutschland",
    intro:
      "Der deutsche Strommix im Zeitverlauf – erneuerbare und fossile Erzeugung nebeneinander, mit wählbarem Zeitraum von 24 Stunden bis zum Maximum.",
    attribution: {
      path: "/strommix-deutschland",
      text: "Strommix Deutschland – live bei Solar Check",
    },
    showFrameWidth: true,
    variants: [{ id: "strommix", label: "Strommix", src: "/embed/strommix", height: 460 }],
  },
];

const RULES = [
  {
    icon: IconBolt,
    title: "Kostenlos und ohne Anmeldung",
    body: "Kopiere den Code und füge ihn in deine Seite ein. Es gibt keine Registrierung, keine Kosten und kein Limit.",
  },
  {
    icon: IconRefresh,
    title: "Immer aktuell",
    body: "Das Widget lädt die Daten live von Solar Check. Du musst nie etwas nachpflegen – die Werte bleiben automatisch auf dem neuesten Stand.",
  },
  {
    icon: IconLink,
    title: "Mit Quellenangabe",
    body: "Bitte lass den Quellen-Link unter dem Widget stehen. Er ist im Code bereits enthalten und ist die einzige Bedingung für die kostenlose Nutzung.",
  },
];

export default function WidgetsClient() {
  const [theme, setTheme] = useState<WidgetThemeSelection>(WIDGET_THEME_DEFAULTS);
  const update = (patch: Partial<WidgetThemeSelection>) => setTheme((t) => ({ ...t, ...patch }));

  // The customization panel floats (sticky) on desktop so changes are visible
  // in the widgets while adjusting. On mobile it stays in flow — a sticky panel
  // would cover the very widget you want to watch.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div style={S.page}>
      <Header activePage="widgets" />
      <div style={S.wrap}>
        <h1 style={S.h1}>Energie-Widgets für die eigene Website</h1>
        <p style={S.subtitle}>
          Bette den deutschen Strommix und die Live-Stromerzeugung kostenlos auf deiner Seite ein.
          Die Daten aktualisieren sich automatisch, und das Aussehen lässt sich frei an dein Design anpassen.
          Stelle das Aussehen ein, wähle ein Widget und kopiere den fertigen Code.
        </p>

        <div style={S.rules}>
          {RULES.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.title} style={S.ruleCard}>
                <div style={S.ruleIcon}>
                  <Icon size={18} color={v("--color-accent")} />
                </div>
                <div style={S.ruleTitle}>{r.title}</div>
                <div style={S.ruleBody}>{r.body}</div>
              </div>
            );
          })}
        </div>

        <ThemePanel theme={theme} onChange={update} sticky={isDesktop} />

        {SECTIONS.map((s) => (
          <SectionPreview key={s.id} section={s} theme={theme} />
        ))}
      </div>
    </div>
  );
}

function ThemePanel({
  theme,
  onChange,
  sticky,
}: {
  theme: WidgetThemeSelection;
  onChange: (patch: Partial<WidgetThemeSelection>) => void;
  sticky: boolean;
}) {
  return (
    <section style={{ ...S.themePanel, ...(sticky ? S.themePanelSticky : null) }}>
      <div style={S.themePanelHead}>
        <h2 style={S.themePanelTitle}>Aussehen anpassen</h2>
        <span style={S.themePanelHint}>Änderungen erscheinen sofort in den Widgets unten.</span>
      </div>

      <div style={S.themeGrid}>
        <Control label="Hintergrund">
          <ColorInput value={theme.bg} onChange={(bg) => onChange({ bg })} />
        </Control>
        <Control label="Hauptfarbe (Text)">
          <ColorInput value={theme.fg} onChange={(fg) => onChange({ fg })} />
        </Control>
        <Control label="Akzent">
          <ColorInput value={theme.accent} onChange={(accent) => onChange({ accent })} />
        </Control>
        <Control label="Highlight">
          <ColorInput value={theme.highlight} onChange={(highlight) => onChange({ highlight })} />
        </Control>

        <Control label={`Ecken: ${parseInt(theme.radius, 10) || 0} px`}>
          <input
            type="range"
            min={0}
            max={MAX_RADIUS}
            step={1}
            value={parseInt(theme.radius, 10) || 0}
            onChange={(e) => onChange({ radius: `${e.target.value}px` })}
            style={S.slider}
            aria-label="Eckenradius"
          />
        </Control>

        <Control label="Schrift">
          <div style={S.btnRow}>
            {Object.entries(WIDGET_FONTS).map(([key, f]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ font: key })}
                style={{ ...S.btn, ...(theme.font === key ? S.btnActive : null) }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Control>
      </div>
    </section>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={S.label}>{label}</div>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label style={S.colorRow}>
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        style={S.colorSwatch}
        aria-label="Farbe wählen"
      />
      <span style={S.colorValue}>{(value || "").toUpperCase()}</span>
    </label>
  );
}

const AUTOSWITCH_OPTIONS = [
  { id: "off", label: "Aus", ms: 0 },
  { id: "3s", label: "3 s", ms: 3000 },
  { id: "4s", label: "4 s", ms: 4000 },
  { id: "6s", label: "6 s", ms: 6000 },
  { id: "10s", label: "10 s", ms: 10000 },
];

function SectionPreview({ section, theme }: { section: WidgetSection; theme: WidgetThemeSelection }) {
  const [frameW, setFrameW] = useState<number>(480);
  const [autoswitch, setAutoswitch] = useState<number>(0);

  return (
    <section style={S.section}>
      <h2 style={S.h2}>{section.label}</h2>
      <p style={S.sectionIntro}>{section.intro}</p>

      {(section.showFrameWidth || section.showAutoswitch) && (
        <div style={S.controls}>
          {section.showFrameWidth && (
            <Control label="Breite">
              <div style={S.btnRow}>
                {[320, 480, 600].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setFrameW(w)}
                    style={{ ...S.btn, ...(frameW === w ? S.btnActive : null) }}
                  >
                    {w} px
                  </button>
                ))}
              </div>
            </Control>
          )}

          {section.showAutoswitch && (
            <Control label="Autoswitch">
              <div style={S.btnRow}>
                {AUTOSWITCH_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setAutoswitch(o.ms)}
                    style={{ ...S.btn, ...(autoswitch === o.ms ? S.btnActive : null) }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div style={S.hint}>
                Das Widget wechselt im gewählten Intervall automatisch durch die Energieträger und
                pausiert für 30 Sekunden, wenn jemand manuell auf die Pfeile klickt.
              </div>
            </Control>
          )}
        </div>
      )}

      <div style={S.variantRow}>
        {section.variants.map((variant) => (
          <VariantFrame
            key={variant.id}
            variant={variant}
            attribution={section.attribution}
            theme={theme}
            frameW={frameW}
            autoswitch={autoswitch}
            showVariantLabel={section.variants.length > 1}
          />
        ))}
      </div>
    </section>
  );
}

function VariantFrame({
  variant,
  attribution,
  theme,
  frameW,
  autoswitch,
  showVariantLabel,
}: {
  variant: WidgetVariant;
  attribution: Attribution;
  theme: WidgetThemeSelection;
  frameW: number;
  autoswitch: number;
  showVariantLabel: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  // Live preview drives the theme via postMessage (instant, no reload). The
  // autoswitch interval is the only thing that needs a fresh src.
  const src = autoswitch > 0 ? `${variant.src}?auto=${autoswitch}` : variant.src;

  useEffect(() => {
    setIframeReady(false);
  }, [src]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentDocument?.readyState === "complete") setIframeReady(true);
  }, []);

  // Always send the full var set so the preview never keeps a stale override.
  const themeKey = JSON.stringify(theme);
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframeReady) return;
    iframe.contentWindow?.postMessage(
      { type: "widget:theme", vars: selectionToVars(theme) },
      window.location.origin,
    );
  }, [themeKey, iframeReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveWidth = variant.fixedWidth ?? frameW;

  return (
    <div style={{ ...S.frameContainer, maxWidth: effectiveWidth }}>
      {showVariantLabel && <div style={S.variantLabel}>{variant.label}</div>}
      <iframe
        ref={iframeRef}
        src={src}
        title={variant.label}
        onLoad={() => setIframeReady(true)}
        style={{ ...S.iframe, height: variant.height }}
      />
      <EmbedSnippet
        variant={variant}
        attribution={attribution}
        theme={theme}
        autoswitch={autoswitch}
      />
    </div>
  );
}

function EmbedSnippet({
  variant,
  attribution,
  theme,
  autoswitch,
}: {
  variant: WidgetVariant;
  attribution: Attribution;
  theme: WidgetThemeSelection;
  autoswitch: number;
}) {
  const [copied, setCopied] = useState(false);

  const qs = new URLSearchParams(buildWidgetThemeQuery(theme));
  if (autoswitch > 0) qs.set("auto", String(autoswitch));
  const query = qs.toString();
  const url = `${SITE_URL}${variant.src}${query ? `?${query}` : ""}`;
  const width = variant.fixedWidth ?? 480;

  // The <a> below the iframe lives in the HOST page's HTML — that anchor, not
  // the iframe src, is what search engines count as a backlink to solar-check.io.
  const code = [
    `<iframe`,
    `  src="${url}"`,
    `  width="${width}"`,
    `  height="${variant.height}"`,
    `  style="border:0;display:block;width:100%;max-width:${width}px"`,
    `  title="${variant.label} — Solar Check"`,
    `  loading="lazy"`,
    `></iframe>`,
    `<p style="margin:6px 0 0;font:13px/1.4 system-ui,sans-serif">`,
    `  <a href="${SITE_URL}${attribution.path}" target="_blank" rel="noopener">${attribution.text}</a>`,
    `</p>`,
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  };

  return (
    <div style={S.snippetWrap}>
      <div style={S.snippetHeader}>
        <span style={S.snippetLabel}>Einbettungs-Code</span>
        <button type="button" onClick={copy} style={S.snippetCopyBtn}>
          {copied ? "Kopiert!" : "Kopieren"}
        </button>
      </div>
      <pre style={S.snippetPre}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    paddingTop: 20,
  },
  wrap: { maxWidth: 720, margin: "0 auto", padding: "0 16px 64px" },
  h1: { fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 0, marginBottom: 10 },
  subtitle: { fontSize: 15, color: v("--color-text-secondary"), marginBottom: 28, lineHeight: 1.55 },
  rules: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
    marginBottom: 44,
  },
  ruleCard: {
    background: v("--color-bg-muted"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 12,
    padding: 16,
  },
  ruleIcon: { marginBottom: 10 },
  ruleTitle: { fontSize: 14, fontWeight: 700, marginBottom: 4, color: v("--color-text-primary") },
  ruleBody: { fontSize: 13, color: v("--color-text-secondary"), lineHeight: 1.5 },
  themePanel: {
    marginBottom: 44,
    padding: 16,
    background: v("--color-bg-accent"),
    border: `1px solid ${v("--color-border-accent")}`,
    borderRadius: 14,
  },
  themePanelSticky: {
    position: "sticky" as const,
    top: 12,
    zIndex: 50,
    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
  },
  themePanelHead: {
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap" as const,
    gap: "2px 10px",
    marginBottom: 14,
  },
  themePanelTitle: { fontSize: 17, fontWeight: 700, margin: 0 },
  themePanelHint: { fontSize: 12.5, color: v("--color-text-muted") },
  themeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 16,
    alignItems: "start",
  },
  section: { marginBottom: 44, paddingBottom: 24, borderBottom: `1px solid ${v("--color-border")}` },
  h2: { fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 8 },
  sectionIntro: { fontSize: 14, color: v("--color-text-secondary"), lineHeight: 1.5, marginTop: 0, marginBottom: 16 },
  hint: { fontSize: 12, color: v("--color-text-muted"), marginTop: 6, lineHeight: 1.5 },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: 8,
  },
  controls: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 24,
    padding: 16,
    background: v("--color-bg-muted"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 12,
    marginBottom: 16,
  },
  btnRow: { display: "flex", flexWrap: "wrap" as const, gap: 8 },
  btn: {
    padding: "8px 12px",
    fontSize: 12.5,
    fontWeight: 600,
    background: v("--color-bg"),
    color: v("--color-text-primary"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnActive: {
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    border: `1px solid ${v("--color-accent")}`,
  },
  colorRow: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  colorSwatch: {
    width: 40,
    height: 32,
    padding: 0,
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 8,
    background: "none",
    cursor: "pointer",
  },
  colorValue: { fontSize: 12.5, fontFamily: v("--font-mono"), color: v("--color-text-secondary") },
  slider: { width: "100%", accentColor: v("--color-accent"), cursor: "pointer", margin: "6px 0" },
  variantRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    alignItems: "flex-start",
    gap: 24,
    justifyContent: "center",
  },
  frameContainer: { width: "100%", transition: "max-width 0.2s ease-out" },
  variantLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: v("--color-text-muted"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: 8,
    textAlign: "center" as const,
  },
  iframe: { width: "100%", border: 0, display: "block", background: "transparent" },
  snippetWrap: {
    marginTop: 12,
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 8,
    overflow: "hidden",
    background: v("--color-bg-muted"),
  },
  snippetHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 10px",
    borderBottom: `1px solid ${v("--color-border")}`,
  },
  snippetLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  snippetCopyBtn: {
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 600,
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    border: 0,
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  snippetPre: {
    margin: 0,
    padding: "10px 12px",
    fontSize: 11,
    lineHeight: 1.45,
    fontFamily: v("--font-mono"),
    color: v("--color-text-primary"),
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-all" as const,
  },
};
