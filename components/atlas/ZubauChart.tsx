import { v } from "../../lib/theme";
import { currentYear } from "../../lib/atlas";

const nf = (n: number) => n.toLocaleString("de-DE");

/**
 * Yearly build-out.
 *
 * The current year is shown, not dropped — its momentum is real information —
 * but drawn hatched and labelled, because it is the only bar that is still
 * growing. Hiding it would understate a Gemeinde's present; showing it plain
 * would read as a collapse every January.
 */
export default function ZubauChart({
  years,
  from = 2014,
}: {
  years: { year: number; count: number }[];
  from?: number;
}) {
  const now = currentYear();
  const rows = years.filter((y) => y.year >= from && y.year <= now);
  if (rows.length < 3) return null;

  const max = Math.max(...rows.map((r) => r.count));
  const complete = rows.filter((r) => r.year < now);
  const peak = complete.length ? complete.reduce((a, b) => (b.count > a.count ? b : a)) : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 150 }}>
        {rows.map((r) => {
          const partial = r.year === now;
          return (
            <div
              key={r.year}
              title={
                // Kleine Gemeinden bauen einzelne Anlagen zu — "1 neue Anlagen"
                // ist derselbe Fehler wie eine falsche Einheit, nur in Worten.
                partial
                  ? `${r.year}: ${nf(r.count)} neue ${r.count === 1 ? "Anlage" : "Anlagen"} bisher — Jahr läuft noch`
                  : `${r.year}: ${nf(r.count)} neue ${r.count === 1 ? "Anlage" : "Anlagen"}`
              }
              style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}
            >
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(2, Math.round((r.count / max) * 100))}%`,
                  borderRadius: "3px 3px 0 0",
                  background: partial
                    ? `repeating-linear-gradient(135deg, ${v("--color-accent-light")} 0 4px, transparent 4px 8px)`
                    : r.year === peak?.year
                      ? v("--color-accent")
                      : v("--color-accent-light"),
                  border: partial ? `1px solid ${v("--color-accent-light")}` : "none",
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        {rows.map((r) => (
          <div
            key={r.year}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 9,
              color: r.year === now ? v("--color-text-secondary") : v("--color-text-muted"),
              fontFamily: v("--font-mono"),
            }}
          >
            {r.year === now || r.year % 2 === 0 ? `'${String(r.year).slice(2)}` : ""}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: v("--color-text-muted"), margin: "10px 0 0", lineHeight: 1.6 }}>
        Der schraffierte Balken ist das laufende Jahr {now} und noch nicht vollständig. Anlagen
        dürfen bis zu einen Monat nach Inbetriebnahme gemeldet werden, die jüngsten Wochen sind
        daher immer untererfasst.
      </p>
    </div>
  );
}
