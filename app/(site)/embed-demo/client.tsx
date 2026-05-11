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
  /** Whether this section shows the autoswitch toggle (adds ?auto=1 to src). */
  showAutoswitch?: boolean;
  variants: WidgetVariant[];
}

const SECTIONS: WidgetSection[] = [
  {
    id: "erzeugung",
    label: "Stromerzeugung (Live)",
    showFrameWidth: false,
    showAutoswitch: true,
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
        height: 330,
        fixedWidth: 260,
      },
    ],
  },
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

const AUTOSWITCH_OPTIONS = [
  { id: "off", label: "Aus", ms: 0 },
  { id: "3s", label: "3 s", ms: 3000 },
  { id: "6s", label: "6 s", ms: 6000 },
  { id: "10s", label: "10 s", ms: 10000 },
];

function SectionPreview({ section }: { section: WidgetSection }) {
  const [themeId, setThemeId] = useState<string>("default");
  const [frameW, setFrameW] = useState<number>(480);
  const [autoswitch, setAutoswitch] = useState<number>(0);
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

        {section.showAutoswitch && (
          <div>
            <div style={S.label}>Autoswitch</div>
            <div style={S.btnRow}>
              {AUTOSWITCH_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setAutoswitch(o.ms)}
                  style={{
                    ...S.btn,
                    ...(autoswitch === o.ms ? S.btnActive : null),
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div style={S.hint}>
              Wechselt im gewählten Intervall automatisch durch die Energieträger.
              Pausiert für 30 s bei manuellem Klick auf die Pfeile.
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
  themeId,
  frameW,
  autoswitch,
  showVariantLabel,
}: {
  variant: WidgetVariant;
  themeId: string;
  frameW: number;
  autoswitch: number;
  showVariantLabel: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  // Toggle Autoswitch reloads the iframe with ?auto=1 query param
  const src = autoswitch > 0 ? `${variant.src}?auto=${autoswitch}` : variant.src;

  useEffect(() => {
    setIframeReady(false);
  }, [src]);

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
        src={src}
        title={variant.label}
        onLoad={() => setIframeReady(true)}
        style={{ ...S.iframe, height: variant.height }}
      />
      <EmbedSnippet variant={variant} autoswitch={autoswitch} />
    </div>
  );
}

function EmbedSnippet({
  variant,
  autoswitch,
}: {
  variant: WidgetVariant;
  autoswitch: number;
}) {
  const [copied, setCopied] = useState(false);

  const url =
    autoswitch > 0
      ? `https://solar-check.io${variant.src}?auto=${autoswitch}`
      : `https://solar-check.io${variant.src}`;

  const code = [
    `<iframe`,
    `  src="${url}"`,
    `  width="${variant.fixedWidth ?? 480}"`,
    `  height="${variant.height}"`,
    `  style="border:0;display:block"`,
    `  title="${variant.label} — Solar Check"`,
    `  loading="lazy"`,
    `></iframe>`,
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
        <span style={S.snippetLabel}>Embed-Code</span>
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
