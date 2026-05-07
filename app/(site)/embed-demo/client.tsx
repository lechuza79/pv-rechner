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

export default function EmbedDemoClient() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [active, setActive] = useState<string>("default");
  const [frameW, setFrameW] = useState<number>(480);
  const [iframeReady, setIframeReady] = useState(false);

  // Race-fix: if the iframe already finished loading before React attached
  // the onLoad handler (common during HMR / fast navigation), the load event
  // never fires again. Catch that case on mount.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentDocument?.readyState === "complete") {
      setIframeReady(true);
    }
  }, []);

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
          Vorschau des Strommix-Widgets in verschiedenen Themes und Container-Breiten.
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
    height: 460,
    border: 0,
    display: "block",
    background: "transparent",
  },
};
