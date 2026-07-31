import { v } from "../../lib/theme";

/**
 * Lade-Skelett der Atlas-Seiten (Übersicht + Gemeinde-Detail).
 *
 * Lag bis 29.07.2026 als `loading.tsx` neben den Routen. Das war bequem, hat aber
 * jede Atlas-Adresse zu einem Soft-404 gemacht: Ein `loading.tsx` legt eine
 * Suspense-Grenze um die GESAMTE Seite, Next schickt die Hülle sofort raus — und
 * damit steht der Statuscode 200 fest, bevor die Seite überhaupt weiß, ob es die
 * Region gibt. Ein späteres `notFound()` konnte den Code nicht mehr ändern und
 * wurde nur noch als Inhalt nachgeschoben (erfundene Adresse: HTTP 200 mit
 * 404-Seite im Body). Dasselbe traf `redirect()` bei kreisfreien Städten.
 *
 * Deshalb platzieren die Seiten das Skelett jetzt SELBST — in einem `<Suspense>`,
 * das erst NACH der Routing-Entscheidung (gibt es die Region? muss umgeleitet
 * werden?) aufgeht. Die Entscheidung fällt damit in der Hülle und bestimmt den
 * Statuscode; alles Teure streamt weiterhin dahinter nach. Das Lade-Feedback
 * bleibt also erhalten, es hängt nur nicht mehr vor der Entscheidung.
 *
 * Wer hier wieder ein `loading.tsx` einführt, holt den Soft-404 zurück.
 * Festgenagelt von `lib/__tests__/atlas-soft-404.test.ts`.
 */
export default function AtlasSkeleton() {
  const block = (width: string, height: number, radius = 10) => (
    <div style={{ width, height, borderRadius: radius, background: v("--color-bg-muted") }} />
  );
  return (
    <div
      style={{
        background: v("--color-bg"),
        minHeight: "100vh",
        padding: "0 16px 20px",
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
