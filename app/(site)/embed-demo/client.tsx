"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../../../components/Header";
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
    label: "Solar-Check (Default)",
    description: "Helles Layout, grüner Akzent — wie auf solar-check.io.",
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
    id: "portfolio",
    label: "Portfolio (Beispiel)",
    description: "Soft cream + warmer Akzent, wie ein Portfolio-Look.",
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
  {
    id: "minimal",
    label: "Minimal",
    description: "Eckige Kanten, neutrale Töne.",
    vars: {
      "--widget-bg": "#FFFFFF",
      "--widget-fg": "#111111",
      "--widget-muted": "#999999",
      "--widget-accent": "#111111",
      "--widget-accent-fg": "#FFFFFF",
      "--widget-border-radius": "0px",
      "--widget-font-family": "ui-monospace,SFMono-Regular,Menlo,monospace",
    },
  },
];

const FRAME_WIDTHS = [
  { id: "narrow", label: "320 px", width: 320 },
  { id: "default", label: "480 px", width: 480 },
  { id: "wide", label: "600 px", width: 600 },
];

export default function EmbedDemoClient() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [active, setActive] = useState<string>("default");
  const [frameW, setFrameW] = useState<number>(480);
  const [iframeReady, setIframeReady] = useState(false);

  // Re-apply theme whenever the iframe finishes loading or the preset changes.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframeReady) return;

    const preset = PRESETS.find((p) => p.id === active);
    if (!preset) return;

    iframe.contentWindow?.postMessage(
      { type: "widget:theme", vars: preset.vars ?? {} },
      window.location.origin,
    );
  }, [active, iframeReady]);

  return (
    <div style={S.page}>
      <Header />
      <div style={S.wrap}>
        <h1 style={S.h1}>Embed-Demo</h1>
        <p style={S.subtitle}>
          So sieht das Strommix-Widget aus, wenn es per iframe eingebunden wird.
          Theme-Tokens werden per <code style={S.code}>postMessage</code> live
          übergeben — nur Ursprünge auf der Whitelist werden akzeptiert.
        </p>

        <div style={S.controls}>
          <div>
            <div style={S.label}>Theme</div>
            <div style={S.btnRow}>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActive(p.id)}
                  style={{
                    ...S.btn,
                    ...(active === p.id ? S.btnActive : null),
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div style={S.hint}>
              {PRESETS.find((p) => p.id === active)?.description}
            </div>
          </div>

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
        </div>

        <div style={S.frameStage}>
          <div style={{ ...S.frameContainer, maxWidth: frameW }}>
            <iframe
              ref={iframeRef}
              src="/embed/strommix"
              title="Strommix Widget"
              onLoad={() => setIframeReady(true)}
              style={S.iframe}
            />
          </div>
        </div>

        <h2 style={S.h2}>Einbetten</h2>
        <p style={S.p}>
          Auf einer fremden Seite reicht ein iframe — das Widget rendert dann
          im Solar-Check-Default-Brand:
        </p>
        <pre style={S.pre}>
{`<iframe
  src="https://solar-check.io/embed/strommix"
  style="width:100%;max-width:600px;height:280px;border:0;display:block"
  title="Strommix Deutschland"
  loading="lazy"></iframe>`}
        </pre>

        <h2 style={S.h2}>Whitelabel</h2>
        <p style={S.p}>
          Damit das Widget die Brand der Hostseite übernimmt, schickt sie nach
          dem Laden des iframes die Tokens per <code style={S.code}>postMessage</code>.
          Akzeptiert werden nur Origins auf der Whitelist im Widget — derzeit{" "}
          <code style={S.code}>sebastianschaeder.de</code> sowie Dev-Hosts.
          Andere Origins werden ignoriert.
        </p>
        <pre style={S.pre}>
{`<script>
  const iframe = document.querySelector('iframe[src*="solar-check.io/embed/strommix"]');
  iframe.addEventListener('load', () => {
    iframe.contentWindow.postMessage({
      type: 'widget:theme',
      vars: {
        '--widget-bg': '#0F0F0F',
        '--widget-fg': '#F5F5F5',
        '--widget-accent': '#4A9EFF',
        '--widget-accent-fg': '#0F0F0F'
      }
    }, 'https://solar-check.io');
  });
</script>`}
        </pre>
        <p style={S.p}>
          Reset auf Default: leeres <code style={S.code}>vars</code>-Objekt
          schicken, dann fallen alle Tokens auf die Solar-Check-Werte zurück.
        </p>

        <h2 style={S.h2}>API</h2>
        <p style={S.p}>
          Die Daten unter <code style={S.code}>/api/embed/strommix</code> sind
          öffentlich (CORS offen) und können auch ohne iframe in eigenen
          Visualisierungen genutzt werden:
        </p>
        <pre style={S.pre}>
{`{
  "updatedAt": "2026-05-07T03:30:00.000Z",
  "mix": {
    "solar":   0,
    "wind":    25.4,
    "gas":     20.7,
    "kohle":   32.8,
    "sonstige": 21.1
  },
  "co2PerKwh": 500
}`}
        </pre>
        <p style={S.hint}>
          Quelle: Energy-Charts / SMARD · Cache 5 min, stale-while-revalidate
          10 min.
        </p>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
  },
  wrap: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "20px 16px 80px",
  },
  h1: {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    marginTop: 24,
    marginBottom: 8,
  },
  h2: {
    fontSize: 16,
    fontWeight: 700,
    color: v("--color-text-primary"),
    marginTop: 32,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13,
    color: v("--color-text-muted"),
    marginBottom: 24,
    lineHeight: 1.5,
  },
  p: {
    fontSize: 13,
    color: v("--color-text-muted"),
    lineHeight: 1.6,
    marginBottom: 10,
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
    marginBottom: 20,
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
  frameStage: {
    background: "#EAEAEA",
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 12,
    padding: 20,
    display: "flex",
    justifyContent: "center",
    marginBottom: 24,
  },
  frameContainer: {
    width: "100%",
    transition: "max-width 0.2s ease-out",
  },
  iframe: {
    width: "100%",
    height: 280,
    border: 0,
    display: "block",
    background: "transparent",
  },
  code: {
    fontFamily: v("--font-mono"),
    fontSize: 12,
    background: v("--color-bg-muted"),
    padding: "1px 5px",
    borderRadius: 4,
    color: v("--color-accent"),
  },
  pre: {
    fontFamily: v("--font-mono"),
    fontSize: 12,
    background: "#0F0F0F",
    color: "#E0E0E0",
    padding: 14,
    borderRadius: 10,
    overflowX: "auto" as const,
    lineHeight: 1.5,
    margin: "8px 0 16px",
  },
};
