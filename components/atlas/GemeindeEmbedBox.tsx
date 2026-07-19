"use client";

import { useState } from "react";
import { v } from "../../lib/theme";

const BASE = "https://solar-check.io";

/**
 * "Diese Zahlen auf Ihrer Website einbinden" — the Outreach conversion.
 *
 * The <a> below the iframe is the point: it sits in the municipality's own HTML,
 * so search engines count it as a backlink to the atlas page. That backlink, not
 * the iframe, is the distribution lever the whole Gemeinde layer exists for.
 */
export default function GemeindeEmbedBox({
  name,
  ags,
  atlasPath,
}: {
  name: string;
  ags: string;
  atlasPath: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const src = `${BASE}/embed/gemeinde-solar?ags=${ags}`;
  const linkHref = atlasPath ? `${BASE}${atlasPath}` : BASE;
  const code = [
    `<iframe`,
    `  src="${src}"`,
    `  width="480"`,
    `  height="240"`,
    `  style="border:0;display:block;width:100%;max-width:480px"`,
    `  title="Solaranlagen in ${name} — Solar Check"`,
    `  loading="lazy"`,
    `></iframe>`,
    `<p style="margin:6px 0 0;font:13px/1.4 system-ui,sans-serif">`,
    `  <a href="${linkHref}" target="_blank" rel="noopener">Solaranlagen in ${name} · Solar Check</a>`,
    `</p>`,
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the code is visible to select by hand
    }
  };

  return (
    <div style={S.card}>
      <h2 style={S.h2}>Sie arbeiten für die Gemeinde {name}?</h2>
      <p style={S.sub}>
        Diese Zahlen lassen sich als kleines Feld auf der Website von {name} einbinden — cookiefrei,
        ohne Browser-Speicher, monatlich aktuell. Code kopieren und einfügen:
      </p>

      <div style={S.snippetWrap}>
        <div style={S.snippetHead}>
          <span style={S.snippetLabel}>Einbetten-Code</span>
          <button type="button" onClick={copy} style={S.copyBtn}>
            {copied ? "Kopiert ✓" : "Kopieren"}
          </button>
        </div>
        <pre style={S.pre}>{code}</pre>
      </div>

      <div style={S.links}>
        <a href={src} target="_blank" rel="noopener noreferrer" style={S.link}>
          Vorschau des Felds
        </a>
        <span style={S.dot}>·</span>
        <a href="/energie-widgets" style={S.link}>
          Weitere Widgets & Anpassung
        </a>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    background: v("--color-bg-muted"),
    borderRadius: v("--radius-lg"),
    padding: "16px 18px",
  },
  h2: { fontSize: 16, fontWeight: 700, margin: "0 0 6px" },
  sub: { fontSize: 13, color: v("--color-text-secondary"), lineHeight: 1.6, margin: "0 0 12px" },
  snippetWrap: {
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    overflow: "hidden",
  },
  snippetHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 10px",
    borderBottom: `1px solid ${v("--color-border")}`,
  },
  snippetLabel: { fontSize: 11, color: v("--color-text-muted"), fontWeight: 600 },
  copyBtn: {
    border: "none",
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: v("--radius-sm"),
    cursor: "pointer",
  },
  pre: {
    margin: 0,
    padding: "10px 12px",
    fontSize: 11,
    lineHeight: 1.5,
    fontFamily: v("--font-mono"),
    color: v("--color-text-secondary"),
    overflowX: "auto",
    whiteSpace: "pre",
  },
  links: { display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12 },
  link: { color: v("--color-accent"), textDecoration: "none" },
  dot: { color: v("--color-text-muted") },
};
