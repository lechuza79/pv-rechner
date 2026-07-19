import Link from "next/link";
import { v } from "../lib/theme";
import { IconArrowRight, IconTrendUp, IconTrendDown } from "./Icons";
import type { FundingScenarios } from "../lib/funding-scenarios";

// Lead block "Was das für Sie bedeutet": three different, tangible scenarios
// (PV forgone, heat-pump saving, balcony system) that lead into the respective
// rechner. Server component — the numbers are computed server-side
// (buildFundingScenarios). Mirrors the atlas Gemeinde block visually; when that
// branch lands the two card renderers should be unified.

const nfEuro = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;
const nfInt = (n: number) => Math.round(n).toLocaleString("de-DE");
/** Auf 100 € gerundet — die Beispiele sind Größenordnungen, keine Zusagen. */
const round100 = (n: number) => Math.round(n / 100) * 100;

function TrendBadge({ dir }: { dir: "up" | "down" }) {
  const up = dir === "up";
  return (
    <span style={{ ...S.badge, background: up ? v("--color-positive") : v("--color-negative") }}>
      {up ? <IconTrendUp size={14} color="#fff" /> : <IconTrendDown size={14} color="#fff" />}
    </span>
  );
}

export default function ScenarioCards({
  regionName,
  pvHref,
  s,
}: {
  regionName: string;
  pvHref: string;
  s: FundingScenarios;
}) {
  return (
    <div style={S.section}>
      <h2 style={S.h2}>Was sich in {regionName} lohnt</h2>
      <p style={S.sub}>Drei Wege, hier mit Solar und Wärme zu sparen — jeder Rechner sofort, ohne Anmeldung.</p>

      <div style={S.cards}>
        <Link href={pvHref} style={S.exCard}>
          <div style={S.exValRow}>
            <TrendBadge dir="down" />
            <span style={S.exVal}>{nfEuro(round100(s.pvFiveYearBenefit))}</span>
          </div>
          <div style={S.exLabel}>verschenkt ein typisches Einfamilienhaus hier in 5 Jahren ohne eigene Anlage</div>
          <div style={S.exSub}>{s.pvKwp} kWp · Ersparnis + Einspeisung · {nfInt(s.yieldKwhKwp)} kWh/kWp in {regionName}</div>
          <span style={S.exCta}>Selbst durchrechnen <IconArrowRight size={14} /></span>
        </Link>

        <Link href="/waermepumpe-rechner" style={S.exCard}>
          <div style={S.exValRow}>
            <TrendBadge dir="up" />
            <span style={S.exVal}>{nfEuro(round100(s.wpTco20))}</span>
          </div>
          <div style={S.exLabel}>spart eine Wärmepumpe gegenüber Gas über 20 Jahre — statt weiter fürs Heizen draufzuzahlen</div>
          <div style={S.exSub}>Typisches Einfamilienhaus, 140 m², Luft/Wärmepumpe</div>
          <span style={S.exCta}>Wärmepumpe rechnen <IconArrowRight size={14} /></span>
        </Link>

        <Link href="/balkonkraftwerk-rechner" style={S.exCard}>
          <div style={S.exValRow}>
            <TrendBadge dir="up" />
            <span style={S.exVal}>{nfEuro(round100(s.balkonSavingPerYear))}/Jahr</span>
          </div>
          <div style={S.exLabel}>bringt ein Balkonkraftwerk — auch zur Miete, ohne eigenes Dach</div>
          <div style={S.exSub}>
            {Number.isFinite(s.balkonAmortYears)
              ? `Empfohlenes Set · nach ${Math.round(s.balkonAmortYears)} Jahren bezahlt`
              : "Empfohlenes Set"}
          </div>
          <span style={S.exCta}>Balkonkraftwerk rechnen <IconArrowRight size={14} /></span>
        </Link>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  section: { marginBottom: 28 },
  h2: { fontSize: 16, fontWeight: 800, margin: "0 0 2px" },
  sub: { fontSize: 12, color: v("--color-text-muted"), margin: "0 0 14px" },
  // Nebeneinander auf Desktop, gestapelt auf Mobil — über flex-wrap statt Media Query.
  cards: { display: "flex", flexWrap: "wrap", gap: 10 },
  exCard: {
    flex: "1 1 190px", display: "block", background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-lg"),
    padding: "16px 18px", textDecoration: "none", color: "inherit",
  },
  exValRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 6 },
  badge: { display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6, padding: "4px 6px" },
  exVal: { fontFamily: v("--font-mono"), fontSize: 22, fontWeight: 700, color: v("--color-text-primary"), lineHeight: 1.1 },
  exLabel: { fontSize: 14, lineHeight: 1.5, color: v("--color-text-primary"), marginBottom: 6 },
  exSub: { fontSize: 11, color: v("--color-text-muted"), marginBottom: 12 },
  exCta: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: v("--color-accent") },
};
