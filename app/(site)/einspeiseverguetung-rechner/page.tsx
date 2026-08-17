import { Metadata } from "next";
import Faq from "../../../components/Faq";
import RelatedLinks from "../../../components/RelatedLinks";
import StandNote from "../../../components/StandNote";
import { einspeiseverguetungFaq } from "../../../lib/faq";
import { feedInRatesFor } from "../../../lib/feedin-config";
import { pageMetadata } from "../../../lib/seo";
import { space, v } from "../../../lib/theme";
import EinspeiseRechner from "./rechner";

// ISR: der Sätze-Textblock unten rendert die aktuellen EEG-Werte serverseitig —
// stündliches Revalidieren lässt ihn am 1.2./1.8. von selbst umspringen.
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  path: "/einspeiseverguetung-rechner",
  title: `Einspeisevergütung-Rechner ${new Date().getFullYear()} – aktueller Satz & Jahresvergütung`,
  description:
    "Wie viel bringt die Einspeisevergütung? Aktuelle EEG-Sätze für Teil- und Volleinspeisung, historische Sätze für Bestandsanlagen seit 2012 und die geschätzte Jahresvergütung — kostenlos, ohne Anmeldung.",
  ogImageTitle: "Was bringt die Einspeisevergütung?",
  ogImageSubtitle: "Aktuelle EEG-Sätze und Jahresvergütung — sofort berechnet.",
});

const td: React.CSSProperties = {
  fontSize: 14,
  color: v("--color-text-muted"),
  padding: "9px 6px",
  borderBottom: `1px solid ${v("--color-border")}`,
};
const th: React.CSSProperties = {
  ...td,
  fontWeight: 700,
  color: v("--color-text-secondary"),
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const tdNum: React.CSSProperties = {
  ...td,
  fontFamily: v("--font-mono"),
  color: v("--color-text-primary"),
  textAlign: "right",
  whiteSpace: "nowrap",
};

/** Server-gerenderter Sätze-Block: trägt die Suchbegriffe (Einspeisevergütung
 *  2026, EEG-Vergütung, ct/kWh) als echten, crawlbaren Inhalt — Zahlen
 *  ausschließlich aus feedInRatesFor(), nie getippt. */
function SaetzeBlock() {
  const rates = feedInRatesFor();
  const year = new Date().getFullYear();
  const ct = (n: number) => `${n.toLocaleString("de-DE", { minimumFractionDigits: 2 })} ct/kWh`;
  const stichtag = rates.validFrom.split("-").reverse().join(".");
  return (
    <section style={{ marginTop: space.huge * 2 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: v("--color-text-primary"), marginBottom: 8 }}>
        Einspeisevergütung {year}: die aktuellen EEG-Sätze
      </h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: v("--color-text-muted"), marginBottom: 14 }}>
        Für Photovoltaik-Anlagen, die ab dem {stichtag} in Betrieb gehen, gelten diese
        Vergütungssätze pro eingespeister Kilowattstunde — garantiert für 20 Jahre ab
        Inbetriebnahme:
      </p>
      <div style={{ overflowX: "auto", marginBottom: 14 }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left" }}>Anlagenteil</th>
              <th style={{ ...th, textAlign: "right" }}>Teileinspeisung</th>
              <th style={{ ...th, textAlign: "right" }}>Volleinspeisung</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={td}>bis {rates.thresholdKwp} kWp</td>
              <td style={tdNum}>{ct(rates.teilUnder10)}</td>
              <td style={tdNum}>{ct(rates.vollUnder10)}</td>
            </tr>
            <tr>
              <td style={td}>über {rates.thresholdKwp} bis 40 kWp</td>
              <td style={tdNum}>{ct(rates.teilOver10)}</td>
              <td style={tdNum}>{ct(rates.vollOver10)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: v("--color-text-muted"), margin: 0 }}>
        Die EEG-Vergütung sinkt für neue Anlagen planmäßig um 1 % je Halbjahr (jeweils zum
        1. Februar und 1. August). Bestandsanlagen behalten ihren Satz — welchen deine Anlage
        bekommt, rechnet der Rechner oben für jeden Inbetriebnahme-Monat seit April 2012
        automatisch aus den Archivtabellen der Bundesnetzagentur aus.
      </p>
    </section>
  );
}

export default function EinspeiseverguetungPage() {
  return (
    <div style={{ background: v("--color-bg"), fontFamily: v("--font-text"), color: v("--color-text-primary"), minHeight: "100vh", padding: "0 16px 32px" }}>
      <div style={{ maxWidth: v("--page-max-width"), margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: v("--color-text-primary"), lineHeight: 1.2 }}>
            Einspeisevergütung-Rechner
          </h1>
          <p style={{ fontSize: 13, color: v("--color-text-muted"), marginTop: 6, lineHeight: 1.5 }}>
            Aktueller EEG-Satz und Jahresvergütung für deine Anlage — auch für Bestandsanlagen
            seit 2012, die Sätze folgen automatisch den gesetzlichen Stichtagen.
          </p>
        </div>
        <EinspeiseRechner />
        <SaetzeBlock />
        <Faq items={einspeiseverguetungFaq()} title="Häufige Fragen zur Einspeisevergütung" currentPath="/einspeiseverguetung-rechner" />
        <StandNote pfad="/einspeiseverguetung-rechner" />
        <RelatedLinks
          currentPath="/einspeiseverguetung-rechner"
          links={[
            { href: "/einspeiseverguetung-tabelle", label: "Einspeisevergütung-Tabelle", desc: "Zum Nachschlagen: aktuelle Sätze und die amtlichen Monatswerte 2012–2022 im Überblick." },
            { href: "/photovoltaik-rechner", label: "Photovoltaik-Rechner", desc: "Amortisation, Rendite und Eigenverbrauch für deine Anlage — alle Annahmen transparent und anpassbar." },
            { href: "/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung", label: "Lohnt sich PV ohne Einspeisevergütung?", desc: "Was die geplante EEG-Reform für neue Anlagen bedeutet — und warum Eigenverbrauch die Rechnung trägt." },
            { href: "/ratgeber/lohnt-sich-pv-mit-speicher", label: "Lohnt sich PV mit Speicher?", desc: "Die ehrliche Rechnung mit aktuellen Marktpreisen — und wann sich ein Speicher wirklich rechnet." },
            { href: "/datenstand", label: "Aktuelle Werte & Annahmen" },
          ]}
        />
      </div>
    </div>
  );
}
