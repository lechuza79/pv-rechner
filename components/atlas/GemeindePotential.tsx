"use client";

import Link from "next/link";
import { fmtPvLeistung, fmtErtragProKwp } from "../../lib/atlas-format";
import { v } from "../../lib/theme";
import { IconArrowRight, IconTrendUp, IconTrendDown } from "../Icons";
import { writeLocation } from "../../lib/location";
import type { GemeindePotential } from "../../lib/gemeinde-potential";

// Modellblock „Angebot trifft Nachfrage" + drei greifbare Beispiele, die mit
// vorbefüllter PLZ in die Rechner leiten. Client-Komponente, weil der Klick die
// Gemeinde-PLZ in den geteilten Standort-Speicher schreibt — so übernehmen
// PV- und Balkon-Rechner sie ohne erneute Eingabe. Die Zahlen selbst rechnet
// die Seite serverseitig (computeGemeindePotential).

const nfEuro = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;

/** Auf 100 € gerundet — die Beispiele sind Größenordnungen, keine Zusagen. */
const round100 = (n: number) => Math.round(n / 100) * 100;

/** Richtungs-Badge: grün/aufsteigend = Gewinn, rot/absteigend = entgangenes Geld. */
function TrendBadge({ dir }: { dir: "up" | "down" }) {
  const up = dir === "up";
  return (
    <span style={{ ...S.badge, background: up ? v("--color-positive") : v("--color-negative") }}>
      {up ? <IconTrendUp size={14} color="#fff" /> : <IconTrendDown size={14} color="#fff" />}
    </span>
  );
}

export default function GemeindePotential({
  plz,
  p,
}: {
  plz: string | null;
  p: GemeindePotential;
}) {
  const remember = () => {
    if (plz) writeLocation(plz);
  };

  const pvHref = `/photovoltaik-rechner${plz ? `?plz=${plz}&a=2` : "?a=2"}`;

  return (
    <>
      <div style={S.section}>
        <h2 style={S.h2}>Was das für Sie bedeutet</h2>

        <div style={S.cards}>
          <Link href={pvHref} onClick={remember} style={S.exCard}>
            <div style={S.exValRow}>
              <TrendBadge dir="down" />
              <span style={S.exVal}>{nfEuro(round100(p.pvFiveYearBenefit))}</span>
            </div>
            <div style={S.exLabel}>
              verschenkt ein typisches Einfamilienhaus hier in 5 Jahren ohne eigene Anlage
            </div>
            <div style={S.exSub}>
              {fmtPvLeistung(p.pvKwp)} · Ersparnis + Einspeisung · {fmtErtragProKwp(p.yieldKwhKwp)} am Standort
            </div>
            <span style={S.exCta}>
              Selbst durchrechnen <IconArrowRight size={14} />
            </span>
          </Link>

          <Link href="/waermepumpe-rechner" onClick={remember} style={S.exCard}>
            <div style={S.exValRow}>
              <TrendBadge dir="up" />
              <span style={S.exVal}>{nfEuro(round100(p.wpTco20))}</span>
            </div>
            <div style={S.exLabel}>
              spart eine Wärmepumpe gegenüber Gas über 20 Jahre — statt weiter fürs Heizen draufzuzahlen
            </div>
            <div style={S.exSub}>Typisches Einfamilienhaus, 140 m², Luft/Wärmepumpe</div>
            <span style={S.exCta}>
              Wärmepumpe rechnen <IconArrowRight size={14} />
            </span>
          </Link>

          <Link href="/balkonkraftwerk-rechner" onClick={remember} style={S.exCard}>
            <div style={S.exValRow}>
              <TrendBadge dir="up" />
              <span style={S.exVal}>{nfEuro(round100(p.balkonSavingPerYear))}/Jahr</span>
            </div>
            <div style={S.exLabel}>
              bringt ein Balkonkraftwerk — auch zur Miete, ohne eigenes Dach
            </div>
            <div style={S.exSub}>
              {Number.isFinite(p.balkonAmortYears)
                ? `Empfohlenes Set · nach ${Math.round(p.balkonAmortYears)} Jahren bezahlt`
                : "Empfohlenes Set"}
            </div>
            <span style={S.exCta}>
              Balkonkraftwerk rechnen <IconArrowRight size={14} />
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  section: { marginBottom: 28 },
  h2: { fontSize: 16, fontWeight: 700, margin: "0 0 4px" },
  // Nebeneinander auf Desktop, gestapelt auf Mobil — über flex-wrap statt Media
  // Query (Inline-Styles). Bei 720px Breite passen drei ~200er-Karten in eine Reihe.
  cards: { display: "flex", flexWrap: "wrap", gap: 10 },
  exCard: {
    flex: "1 1 190px",
    display: "block",
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-lg"),
    padding: "16px 18px",
    textDecoration: "none",
    color: "inherit",
  },
  exValRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 6 },
  // Trend-Pfeil signalisiert Richtung (Gewinn/entgangen); die Zahl bleibt neutral.
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    padding: "4px 6px",
  },
  exVal: {
    fontFamily: v("--font-mono"),
    fontSize: 22,
    fontWeight: 700,
    color: v("--color-text-primary"),
    lineHeight: 1.1,
  },
  exLabel: { fontSize: 14, lineHeight: 1.5, color: v("--color-text-primary"), marginBottom: 6 },
  exSub: { fontSize: 11, color: v("--color-text-muted"), marginBottom: 12 },
  exCta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: v("--color-accent"),
  },
};
