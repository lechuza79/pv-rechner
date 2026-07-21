import { v } from "../../../lib/theme";

/**
 * Sofortiges Lade-Feedback für die (server-generierten, teils langsam kalt
 * generierten) Atlas-Seiten. Ohne loading.tsx bleibt beim Klick im Menü alles
 * stehen, bis der Server antwortet — mit ihr erscheint sofort ein Skelett.
 * Deckt alle Routen unter /solar-atlas ab (Übersicht + Gemeinde-Detail).
 */
export default function Loading() {
  const block = (width: string, height: number, radius = 10) => (
    <div style={{ width, height, borderRadius: radius, background: v("--color-bg-muted") }} />
  );
  return (
    <div
      style={{
        background: v("--color-bg"),
        minHeight: "100vh",
        padding: "20px 16px",
        fontFamily: v("--font-text"),
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          paddingTop: 12,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          animation: "sc-map-pulse 1.4s ease-in-out infinite",
        }}
        aria-busy="true"
        aria-label="Lädt …"
      >
        {block("35%", 11)}
        {block("65%", 26)}
        {block("100%", 40)}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 78, borderRadius: 10, background: v("--color-bg-muted") }} />
          ))}
        </div>
        {block("100%", 320)}
      </div>
    </div>
  );
}
