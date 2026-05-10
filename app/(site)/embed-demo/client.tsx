"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import { v } from "../../../lib/theme";

interface ThemePreset {
  id: string;
  label: string;
  description: string;
  vars: Record<string, string> | null;
}

const PRESETS: ThemePreset[] = [
  {
    id: "default",
    label: "Default",
    description: "Solar-Check-Brand: helles Layout, blauer Akzent.",
    vars: null,
  },
  {
    id: "dark",
    label: "Dark",
    description: "Dunkler Hintergrund, blauer Akzent.",
    vars: {
      "--widget-bg": "#0F0F0F",
      "--widget-fg": "#F5F5F5",
      "--widget-muted": "#888888",
      "--widget-accent": "#4A9EFF",
      "--widget-accent-fg": "#0F0F0F",
      "--widget-border-radius": "12px",
      "--widget-font-family": "system-ui,-apple-system,sans-serif",
    },
  },
  {
    id: "beispiel",
    label: "Beispiel",
    description: "Warmer Akzent, abgerundete Ecken — Portfolio-Look.",
    vars: {
      "--widget-bg": "#F7F4EE",
      "--widget-fg": "#2A2520",
      "--widget-muted": "#8A7E70",
      "--widget-accent": "#C45A2E",
      "--widget-accent-fg": "#FFFFFF",
      "--widget-border-radius": "8px",
      "--widget-font-family": "Georgia,serif",
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
  /** If set, the iframe is rendered at this fixed width; otherwise frame width selector applies. */
  fixedWidth?: number;
}

interface WidgetSection {
  id: string;
  label: string;
  /** Whether this section shows the container-width selector. */
  showFrameWidth: boolean;
  variants: WidgetVariant[];
}

const SECTIONS: WidgetSection[] = [
  {
    id: "strommix",
    label: "Strommix Deutschland",
    showFrameWidth: true,
    variants: [
      {
        id: "strommix",
        label: "Strommix",
        src: "/embed/strommix",
        height: 460,
      },
    ],
  },
  {
    id: "erzeugung",
    label: "Stromerzeugung (Live)",
    showFrameWidth: false,
    variants: [
      {
        id: "standard",
        label: "Standard",
        src: "/embed/erzeugung",
        height: 460,
        fixedWidth: 380,
      },
      {
        id: "mini",
        label: "Kompakt",
        src: "/embed/erzeugung-mini",
        height: 290,
        fixedWidth: 280,
      },
    ],
  },
];

export default function EmbedDemoClient() {
  return (
    <div style={S.page}>
      <Header />
      <div style={S.wrap}>
        <h1 style={S.h1}>Embed-Demo</h1>
        <p style={S.subtitle}>
          Vorschau aller einbettbaren Widgets in verschiedenen Themes. Theme-Wechsel
          läuft per <code style={S.code}>postMessage</code> aus dem Eltern-Frame.
        </p>

        {SECTIONS.map((s) => (
          <SectionPreview key={s.id} section={s} />
        ))}

        <Footer />
      </div>
    </div>
  );
}

function SectionPreview({ section }: { section: WidgetSection }) {
  const [themeId, setThemeId] = useState<string>("default");
  const [frameW, setFrameW] = useState<number>(480);
  const activePreset = PRESETS.find((p) => p.id === themeId);

  return (
    <section style={S.section}>
      <h2 style={S.h2}>{section.label}</h2>

      <div style={S.controls}>
        <div>
          <div style={S.label}>Theme</div>
          <div style={S.btnRow}>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setThemeId(p.id)}
                style={{
                  ...S.btn,
                  ...(themeId === p.id ? S.btnActive : null),
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {activePreset?.description && (
            <div style={S.hint}>{activePreset.description}</div>
          )}
        </div>

        {section.showFrameWidth && (
          <div>
            <div style={S.label}>Container-Breite</div>
            <div style={S.btnRow}>
              {FRAME_WIDTHS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setFrameW(w.width)}
                  style={{
                    ...S.btn,
                    ...(frameW === w.width ? S.btnActive : null),
                  }}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={S.variantRow}>
        {section.variants.map((variant) => (
          <VariantFrame
            key={variant.id}
            variant={variant}
            themeId={themeId}
            frameW={frameW}
            showVariantLabel={section.variants.length > 1}
          />
        ))}
      </div>
    </section>
  );
}

function VariantFrame({
  variant,
  themeId,
  frameW,
  showVariantLabel,
}: {
  variant: WidgetVariant;
  themeId: string;
  frameW: number;
  showVariantLabel: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentDocument?.readyState === "complete") {
      setIframeReady(true);
    }
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
      {showVariantLabel && (
        <div style={S.variantLabel}>{variant.label}</div>
      )}
      <iframe
        ref={iframeRef}
        src={variant.src}
        title={variant.label}
        onLoad={() => setIframeReady(true)}
        style={{ ...S.iframe, height: variant.height }}
      />
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
  wrap: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "0 16px 80px",
  },
  h1: {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    marginTop: 0,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: v("--color-text-muted"),
    marginBottom: 24,
    lineHeight: 1.5,
  },
  code: {
    fontFamily: v("--font-mono"),
    fontSize: 12,
    background: v("--color-bg-muted"),
    padding: "1px 6px",
    borderRadius: 4,
  },
  section: {
    marginBottom: 48,
    paddingBottom: 24,
    borderBottom: `1px solid ${v("--color-border")}`,
  },
  h2: {
    fontSize: 18,
    fontWeight: 700,
    marginTop: 0,
    marginBottom: 16,
  },
  hint: {
    fontSize: 12,
    color: v("--color-text-muted"),
    marginTop: 6,
  },
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
  btnRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 8,
  },
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
  frameContainer: {
    width: "100%",
    transition: "max-width 0.2s ease-out",
  },
  variantLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: v("--color-text-muted"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: 8,
    textAlign: "center" as const,
  },
  iframe: {
    width: "100%",
    border: 0,
    display: "block",
    background: "transparent",
  },
};
