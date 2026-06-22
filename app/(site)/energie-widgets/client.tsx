"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import { IconBolt, IconRefresh, IconLink } from "../../../components/Icons";
import { v } from "../../../lib/theme";
import { buildWidgetThemeQuery } from "../../../lib/widget-theme";

const SITE_URL = "https://solar-check.io";

interface ThemePreset {
  id: string;
  label: string;
  description: string;
  /** --widget-* overrides (colors + radius). null = Solar-Check-Standardlook. */
  vars: Record<string, string> | null;
}

const PRESETS: ThemePreset[] = [
  {
    id: "default",
    label: "Standard",
    description: "Heller Solar-Check-Look mit blauem Akzent.",
    vars: null,
  },
  {
    id: "dark",
    label: "Dunkel",
    description: "Dunkler Hintergrund für dunkle Websites.",
    vars: {
      "--widget-bg": "#0F0F0F",
      "--widget-fg": "#F5F5F5",
      "--widget-muted": "#888888",
      "--widget-accent": "#4A9EFF",
      "--widget-accent-fg": "#0F0F0F",
      "--widget-border-radius": "12px",
    },
  },
  {
    id: "warm",
    label: "Warm",
    description: "Warmer Akzent mit weichen Ecken.",
    vars: {
      "--widget-bg": "#F7F4EE",
      "--widget-fg": "#2A2520",
      "--widget-muted": "#8A7E70",
      "--widget-accent": "#C45A2E",
      "--widget-accent-fg": "#FFFFFF",
      "--widget-border-radius": "8px",
    },
  },
];

const FRAME_WIDTHS = [
  { id: "narrow", label: "320 px", width: 320 },
  { id: "default", label: "480 px", width: 480 },
  { id: "wide", label: "600 px", width: 600 },
];

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
  return (
    <div style={S.page}>
      <Header activePage="widgets" />
      <div style={S.wrap}>
        <h1 style={S.h1}>Energie-Widgets für die eigene Website</h1>
        <p style={S.subtitle}>
          Bette den deutschen Strommix und die Live-Stromerzeugung kostenlos auf deiner Seite ein.
          Die Daten aktualisieren sich automatisch, und das Aussehen lässt sich an dein Design anpassen.
          Wähle ein Widget, passe Theme und Breite an und kopiere den fertigen Code.
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

        {SECTIONS.map((s) => (
          <SectionPreview key={s.id} section={s} />
        ))}
      </div>
      <Footer />
    </div>
  );
}

const AUTOSWITCH_OPTIONS = [
  { id: "off", label: "Aus", ms: 0 },
  { id: "3s", label: "3 s", ms: 3000 },
  { id: "4s", label: "4 s", ms: 4000 },
  { id: "6s", label: "6 s", ms: 6000 },
  { id: "10s", label: "10 s", ms: 10000 },
];

function SectionPreview({ section }: { section: WidgetSection }) {
  const [themeId, setThemeId] = useState<string>("default");
  const [frameW, setFrameW] = useState<number>(480);
  const [autoswitch, setAutoswitch] = useState<number>(0);
  const activePreset = PRESETS.find((p) => p.id === themeId);
  const themeVars = activePreset?.vars ?? {};

  return (
    <section style={S.section}>
      <h2 style={S.h2}>{section.label}</h2>
      <p style={S.sectionIntro}>{section.intro}</p>

      <div style={S.controls}>
        <div>
          <div style={S.label}>Theme</div>
          <div style={S.btnRow}>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setThemeId(p.id)}
                style={{ ...S.btn, ...(themeId === p.id ? S.btnActive : null) }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {activePreset?.description && <div style={S.hint}>{activePreset.description}</div>}
        </div>

        {section.showFrameWidth && (
          <div>
            <div style={S.label}>Breite</div>
            <div style={S.btnRow}>
              {FRAME_WIDTHS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setFrameW(w.width)}
                  style={{ ...S.btn, ...(frameW === w.width ? S.btnActive : null) }}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {section.showAutoswitch && (
          <div>
            <div style={S.label}>Autoswitch</div>
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
          </div>
        )}
      </div>

      <div style={S.variantRow}>
        {section.variants.map((variant) => (
          <VariantFrame
            key={variant.id}
            variant={variant}
            attribution={section.attribution}
            themeId={themeId}
            themeVars={themeVars}
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
  themeId,
  themeVars,
  frameW,
  autoswitch,
  showVariantLabel,
}: {
  variant: WidgetVariant;
  attribution: Attribution;
  themeId: string;
  themeVars: Record<string, string>;
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

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframeReady) return;
    const preset = PRESETS.find((p) => p.id === themeId);
    if (!preset) return;
    iframe.contentWindow?.postMessage(
      { type: "widget:theme", vars: preset.vars ?? {} },
      window.location.origin,
    );
  }, [themeId, iframeReady]);

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
        themeVars={themeVars}
        autoswitch={autoswitch}
      />
    </div>
  );
}

function EmbedSnippet({
  variant,
  attribution,
  themeVars,
  autoswitch,
}: {
  variant: WidgetVariant;
  attribution: Attribution;
  themeVars: Record<string, string>;
  autoswitch: number;
}) {
  const [copied, setCopied] = useState(false);

  const qs = new URLSearchParams(buildWidgetThemeQuery(themeVars));
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
    flexDirection: "column" as const,
    gap: 16,
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
    borderColor: v("--color-accent"),
  },
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
