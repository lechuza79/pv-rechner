"use client";

import Link from "next/link";
import { fmtPvLeistung, fmtErtragProKwp } from "../../lib/atlas-format";
import { v, space } from "../../lib/theme";
import { IconArrowRight, IconTrendUp, IconTrendDown } from "../Icons";
import { LoadingDots } from "../LoadingDots";
import { writeLocation } from "../../lib/location";
import type { GemeindePotential } from "../../lib/gemeinde-potential";
import { pvErtragSatz, szenarioUeberschrift, type SzenarioTexte } from "../../lib/gemeinde-szenario-text";

// Modellblock „Angebot trifft Nachfrage" + drei greifbare Beispiele, die mit
// vorbefüllter PLZ in die Rechner leiten. Client-Komponente, weil der Klick die
// Gemeinde-PLZ in den geteilten Standort-Speicher schreibt — so übernehmen
// PV- und Balkon-Rechner sie ohne erneute Eingabe.
//
// Der Standort-Ertrag (PVGIS) speist die Zahlen und wird client-seitig
// nachgeladen (GemeindePotentialClient), damit er den Server-Render der Seite
// nicht blockiert. Solange er fehlt, ist `p === null`: Label, Layout und Links
// stehen schon, nur die Zahlen zeigen LoadingDots — dieselbe Preloader-
// Konvention wie in den MaStR-Hero-Kacheln.

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
  texte,
  name,
  regionId,
}: {
  plz: string | null;
  /** null = Standort-Ertrag lädt noch (Zahlen als LoadingDots, Layout steht). */
  p: GemeindePotential | null;
  /** Je Gemeinde verschiedene Sätze. Serverseitig gerechnet und durchgereicht —
   *  sie hängen an Bestandsdaten, die die Seite ohnehin hat, nicht am Ertrag. */
  texte?: SzenarioTexte;
  /** Gemeindename — steht in Überschrift und allen drei Karten. */
  name?: string;
  /** Gebietsschlüssel: waehlt die Überschrift-Variante stabil aus. */
  regionId?: string;
}) {
  const remember = () => {
    if (plz) writeLocation(plz);
  };

  const pvHref = `/photovoltaik-rechner${plz ? `?plz=${plz}&a=2` : "?a=2"}`;

  // Ortsangabe als fertiges Textstück, nicht als JSX-Einschub zwischen zwei
  // Textknoten: Letzteres erzeugte „Einfamilienhaus in Höchberg , 140 m²" —
  // React setzt zwischen die Knoten ein Leerzeichen, das Komma landet dahinter.
  const imOrt = name ? ` in ${name}` : "";

  return (
    <>
      <div style={S.section}>
        <h2 style={S.h2}>
          {name && regionId ? szenarioUeberschrift(name, regionId) : "Was das für Sie bedeutet"}
        </h2>

        <div style={S.cards}>
          <Link href={pvHref} onClick={remember} style={S.exCard}>
            <div style={S.exValRow}>
              <TrendBadge dir="down" />
              <span style={S.exVal}>{p ? nfEuro(round100(p.pvFiveYearBenefit)) : <LoadingDots />}</span>
            </div>
            <div style={S.exLabel}>
              {`verschenkt ein typisches Einfamilienhaus${name ? imOrt : " hier"} in 5 Jahren ohne eigene Anlage`}
            </div>
            {/* Ortssatz erst mit dem Ertrag — er IST der Ertrag. */}
            {p && name && pvErtragSatz(name, p.yieldKwhKwp, regionId) && (
              <div style={S.exOrt}>{pvErtragSatz(name, p.yieldKwhKwp, regionId)}</div>
            )}
            {p && (
              <div style={S.exSub}>
                {fmtPvLeistung(p.pvKwp)} · Ersparnis + Einspeisung · {fmtErtragProKwp(p.yieldKwhKwp)} am Standort
              </div>
            )}
            <span style={S.exCta}>
              Selbst durchrechnen <IconArrowRight size={14} />
            </span>
          </Link>

          <Link href="/waermepumpe-rechner" onClick={remember} style={S.exCard}>
            <div style={S.exValRow}>
              <TrendBadge dir="up" />
              <span style={S.exVal}>{p ? nfEuro(round100(p.wpTco20)) : <LoadingDots />}</span>
            </div>
            {/* Siehe ScenarioCards: Die Zahl vergleicht mit einer NEUEN fossilen
                Heizung, nicht mit dem Weiterbetrieb der alten. */}
            <div style={S.exLabel}>
              {`spart eine Wärmepumpe${imOrt} über 20 Jahre gegenüber einer neuen Gasheizung`}
            </div>
            <div style={S.exSub}>{`Typisches Einfamilienhaus${imOrt}, 140 m², Luft/Wasser-Wärmepumpe`}</div>
            <span style={S.exCta}>
              Wärmepumpe rechnen <IconArrowRight size={14} />
            </span>
          </Link>

          <Link href="/balkonkraftwerk/rechner" onClick={remember} style={S.exCard}>
            <div style={S.exValRow}>
              <TrendBadge dir="up" />
              <span style={S.exVal}>
                {p ? `${nfEuro(round100(p.balkonSavingPerYear))}/Jahr` : <LoadingDots />}
              </span>
            </div>
            <div style={S.exLabel}>
              {`bringt ein Balkonkraftwerk${imOrt} — auch zur Miete, ohne eigenes Dach`}
            </div>
            {texte?.balkon && <div style={S.exOrt}>{texte.balkon}</div>}
            {p && (
              <div style={S.exSub}>
                {Number.isFinite(p.balkonAmortYears)
                  ? `Empfohlenes Set · nach ${Math.round(p.balkonAmortYears)} Jahren bezahlt`
                  : "Empfohlenes Set"}
              </div>
            )}
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
  // Einheitlicher Section-Abstand (space.huge) wie die übrigen Blöcke der Seite.
  section: { marginBottom: space.huge },
  h2: { fontSize: 16, fontWeight: 700, margin: "0 0 4px" },
  // Nebeneinander auf Desktop, gestapelt auf Mobil — über flex-wrap statt Media
  // Query (Inline-Styles). Bei 720px Breite passen drei ~200er-Karten in eine Reihe.
  cards: { display: "flex", flexWrap: "wrap", gap: 10 },
  // Flex-Spalte, damit der CTA per margin-top:auto unten andockt. Die Karten sind
  // durch align-items:stretch (Zeile "cards") ohnehin gleich hoch — so stehen die
  // CTAs aller drei Karten auf einer Linie, egal wie lang der Text darüber ist.
  exCard: {
    flex: "1 1 190px",
    display: "flex",
    flexDirection: "column",
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
  // Der ortsbezogene Satz: derselbe Grad wie der Parameter-Fuß, aber in der
  // Textfarbe der Karte — er ist Aussage, nicht Kleingedrucktes.
  exOrt: { fontSize: 12, lineHeight: 1.5, color: v("--color-text-secondary"), marginBottom: 6 },
  exSub: { fontSize: 11, color: v("--color-text-muted"), marginBottom: 12 },
  exCta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    marginTop: "auto",
    alignSelf: "flex-start",
    fontSize: 13,
    fontWeight: 600,
    color: v("--color-accent"),
  },
};
