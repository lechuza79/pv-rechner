import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../components/Breadcrumb";
import Faq from "../../../components/Faq";
import { bidiLadenFaq } from "../../../lib/faq";
import { v } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";
import { fetchSpotPrices } from "../../../lib/energy-api";
import { calcArbitrage, toSpotHours, type SpotHour } from "../../../lib/v2h-arbitrage";
import { simulateSolarYear, monthlyFromAnnual } from "../../../lib/balkon-sim";
import { V2H, V2H_PROFILES, getProfile, V2G_STAND_DE } from "../../../lib/v2h-config";
import { DEFAULT_PRICES } from "../../../lib/prices-config";
import { DEFAULT_FEED_IN } from "../../../lib/feedin-config";
import { NO_PLZ_DEFAULT_YIELD } from "../../../lib/constants";

// Alle Zahlen dieser Seite fallen live aus denselben Funktionen an wie der
// Rechner — die Börsenpreise kommen frisch von Energy-Charts. So kann der Artikel
// nicht von den Werkzeugen abdriften (dasselbe Muster wie /lohnt-sich-pv-mit-speicher).
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    path: "/lohnt-sich-bidirektionales-laden",
    title: "V2H statt Hausspeicher? Bidirektionales Laden ehrlich durchgerechnet",
    description:
      "Was das E-Auto als Stromspeicher wirklich bringt — mit echten Börsenpreisen gerechnet. Welche Autos es können, was es kostet, und warum ausgerechnet PV-Besitzer bei den aktuellen Angeboten außen vor bleiben.",
    ogImageTitle: "Lohnt sich bidirektionales Laden?",
    ogImageSubtitle: "Ehrlich durchgerechnet statt Herstellerprosa.",
  });
}

const S = {
  page: { background: v("--color-bg"), fontFamily: v("--font-text"), color: v("--color-text-primary"), minHeight: "100vh", padding: "20px 16px" },
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto", paddingTop: 60 },
  h1: { fontSize: v("--font-size-h1"), fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: 10 },
  subtitle: { fontSize: v("--font-size-lead"), color: v("--color-text-muted"), marginBottom: 24, lineHeight: 1.6 },
  h2: { fontSize: v("--font-size-h2"), fontWeight: 700, marginTop: 32, marginBottom: 10 },
  p: { fontSize: v("--font-size-body"), color: v("--color-text-muted"), lineHeight: 1.7, marginBottom: 12 },
  strong: { fontWeight: 700, color: v("--color-text-primary") },
  hero: { background: v("--color-bg-accent"), borderRadius: v("--radius-lg"), padding: "16px 18px", marginBottom: 16, fontSize: v("--font-size-body"), color: v("--color-text-primary"), lineHeight: 1.7 },
  card: { background: v("--color-bg"), borderRadius: v("--radius-md"), padding: "14px 16px", border: `1px solid ${v("--color-border")}`, marginBottom: 12, fontSize: v("--font-size-body"), color: v("--color-text-muted"), lineHeight: 1.7 },
  label: { fontSize: v("--font-size-caption"), fontWeight: 700, color: v("--color-text-secondary"), textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: 6, display: "block" },
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
  th: { textAlign: "left" as const, fontSize: v("--font-size-caption"), fontWeight: 700, color: v("--color-text-secondary"), textTransform: "uppercase" as const, letterSpacing: "0.04em", padding: "8px 6px", borderBottom: `1px solid ${v("--color-border")}` },
  thNum: { textAlign: "right" as const, fontSize: v("--font-size-caption"), fontWeight: 700, color: v("--color-text-secondary"), textTransform: "uppercase" as const, letterSpacing: "0.04em", padding: "8px 6px", borderBottom: `1px solid ${v("--color-border")}` },
  td: { fontSize: v("--font-size-body"), color: v("--color-text-muted"), padding: "10px 6px", borderBottom: `1px solid ${v("--color-border")}`, lineHeight: 1.4 },
  tdNum: { fontFamily: v("--font-mono"), fontSize: v("--font-size-body"), color: v("--color-text-primary"), textAlign: "right" as const, padding: "10px 6px", borderBottom: `1px solid ${v("--color-border")}`, whiteSpace: "nowrap" as const },
  note: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6, marginTop: 8 },
  scroll: { overflowX: "auto" as const, marginBottom: 12 },
};

const HOUSEHOLD = { baseKwh: 3800, tagQuote: 0.30, wpActive: false, eaActive: false };
const CAR_KWH = 77;
const DRIVE_KWH_DAY = (15000 * 18) / 100 / 365;

/** Eigenverbrauchs-Rechnung: Jahreskosten eines Szenarios (€). */
function annualCost(kwp: number, profileId: string, batteryKwh: number, bidirectional: boolean): number {
  const p = getProfile(profileId as never);
  const monthly = monthlyFromAnnual(NO_PLZ_DEFAULT_YIELD);
  const sum = monthly.reduce((a, b) => a + b, 0);
  const s = simulateSolarYear({
    moduleKwp: kwp, inverterKw: kwp,
    monthlyYieldPerKwp: monthly.map(m => (m * NO_PLZ_DEFAULT_YIELD) / sum),
    orientation: "sued_flach", household: HOUSEHOLD,
    batteryKwh, roundtrip: 0.90,
    car: {
      usableKwh: CAR_KWH, wallboxKw: V2H.wallboxKw, roundtrip: V2H.carRoundtrip,
      minReserveKwh: V2H.defaultReserveKwh,
      availabilityByHour: p.availabilityByHour, availabilityWeekend: p.availabilityWeekend,
      drivingKwhPerDay: DRIVE_KWH_DAY, bidirectional,
    },
  });
  const grid = Math.max(0, s.consumptionKwh - s.selfUsedKwh) + s.carFromGridKwh;
  return grid * DEFAULT_PRICES.electricityPrice - s.feedInKwh * (DEFAULT_FEED_IN.teilUnder10 / 100);
}

/** Was bringt das Rückspeisen ins Haus — ohne und mit vorhandenem Heimspeicher? */
function pufferSaving(kwp: number, profileId: string) {
  return {
    ohneSpeicher: Math.round(annualCost(kwp, profileId, 0, false) - annualCost(kwp, profileId, 0, true)),
    mitSpeicher: Math.round(annualCost(kwp, profileId, 10, false) - annualCost(kwp, profileId, 10, true)),
  };
}

function lastTwelveMonths() {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export default async function Page() {
  const { start, end } = lastTwelveMonths();
  let prices: SpotHour[] = [];
  try {
    const rows = await fetchSpotPrices("DE-LU", start, end);
    prices = toSpotHours(
      rows.map(r => Math.floor(new Date(r.ts).getTime() / 1000)),
      rows.map(r => (r.data?.price_eur_mwh ?? null) as number | null),
    );
  } catch { /* Tabelle fällt weg, der Artikel trägt auch ohne */ }

  const home = getProfile("homeoffice");
  // Netzhandel nach Akkugröße — zeigt die Sättigung an der Wallbox-Grenze.
  const akkuRows = prices.length
    ? [25, 35, 45, 55, 77].map(akku => {
        const free = Math.max(0, akku - V2H.defaultReserveKwh);
        const r = calcArbitrage({
          prices, availabilityByHour: home.availabilityByHour,
          availabilityWeekend: home.availabilityWeekend,
          usableKwh: free, batteryGrossKwh: akku,
          wallboxKw: V2H.wallboxKw, roundtrip: V2H.carRoundtrip,
        });
        return { akku, revenue: r.annualRevenue, limit: free < V2H.wallboxKw * 3 ? "Akku" : "Wallbox" };
      })
    : [];
  const spread = prices.length
    ? calcArbitrage({ prices, availabilityByHour: home.availabilityByHour, availabilityWeekend: home.availabilityWeekend, usableKwh: 57, wallboxKw: V2H.wallboxKw, roundtrip: V2H.carRoundtrip }).medianSpreadCt
    : 0;

  // Netzhandel je Standzeit-Profil.
  const profilRows = prices.length
    ? V2H_PROFILES.map(p => ({
        label: p.label,
        what: p.what,
        revenue: calcArbitrage({
          prices, availabilityByHour: p.availabilityByHour, availabilityWeekend: p.availabilityWeekend,
          usableKwh: CAR_KWH - V2H.defaultReserveKwh, batteryGrossKwh: CAR_KWH,
          wallboxKw: V2H.wallboxKw, roundtrip: V2H.carRoundtrip,
        }).annualRevenue,
      }))
    : [];

  // Eigenverbrauch nach Anlagengröße.
  const pufferRows = [5, 10, 15, 20].map(kwp => ({
    kwp,
    pendler: pufferSaving(kwp, "pendler"),
    home: pufferSaving(kwp, "homeoffice"),
  }));

  const de = (n: number) => n.toLocaleString("de-DE");

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb
          items={[{ label: "Start", href: "/" }, { label: "Ratgeber", href: "/ratgeber" }, { label: "Bidirektionales Laden" }]}
          jsonLd
        />

        <h1 style={S.h1}>V2H statt Hausspeicher? Bidirektionales Laden ehrlich durchgerechnet</h1>
        <p style={S.subtitle}>
          Ein E-Auto hat den fünf- bis achtfachen Akku eines Heimspeichers. Was davon
          heute wirklich nutzbar ist — und warum ausgerechnet Haushalte mit eigener
          Photovoltaik bei den aktuellen Angeboten außen vor bleiben.
        </p>

        <div style={S.hero}>
          <span style={S.label}>Die kurze Antwort</span>
          Solarstrom über das Auto zu puffern <strong style={S.strong}>lohnt sich nur, wenn du keinen
          Heimspeicher hast</strong> — und auch dann nur, wenn das Auto tagsüber zuhause steht.
          Mit dem Netz Geld verdienen wäre der deutlich größere Hebel, ist aber an genau
          ein Fahrzeug und einen Anbieter gebunden. <strong style={S.strong}>Wer eine PV-Anlage
          im Eigenverbrauch betreibt, kann bei keinem der drei Angebote mitmachen.</strong>{" "}
          Die wichtigste Entscheidung fällt deshalb nicht beim Wallbox-Kauf, sondern beim
          Autokauf. (Stand: {V2G_STAND_DE.stand})
        </div>

        <h2 style={S.h2}>V2L, V2H, V2G — drei Dinge, die ständig verwechselt werden</h2>
        <p style={S.p}>
          Diese Unterscheidung ist der häufigste Irrtum beim Thema, und sie wird von
          Herstellern aktiv verwischt:
        </p>
        <div style={S.card}>
          <strong style={S.strong}>V2L</strong> — am Auto hängt eine Steckdose, aus der ein
          einzelnes Gerät läuft. Praktisch beim Camping, für die Hausversorgung bedeutungslos.
          Das kann fast jedes moderne E-Auto.
        </div>
        <div style={S.card}>
          <strong style={S.strong}>V2H</strong> — das Auto versorgt über eine Wallbox das ganze
          Haus und ersetzt zeitweise einen Heimspeicher. Das können in Deutschland nur wenige Modelle.
        </div>
        <div style={S.card}>
          <strong style={S.strong}>V2G</strong> — der Strom geht ins öffentliche Netz zurück,
          dafür kann es Geld geben. Dafür gibt es hierzulande derzeit genau ein buchbares Angebot.
        </div>
        <p style={S.p}>
          Ein Hersteller nennt auf seiner Seite mit der Überschrift „Bidirektionales Laden"
          die Steckdosenlösung wörtlich „die aktuell eingesetzte Form des bidirektionalen
          Ladens" — technisch vertretbar, aber wer „bidirektional" liest, denkt an
          Hausversorgung. <strong style={S.strong}>Faustregel: Wenn der Hersteller keine
          Wallbox namentlich freigibt, ist es V2L.</strong>
        </p>

        <h2 style={S.h2}>Was das Puffern von Solarstrom wirklich bringt</h2>
        <p style={S.p}>
          Gerechnet mit einer Stundensimulation über ein volles Jahr: Haushalt mit 3.800 kWh,
          E-Auto mit 77 kWh Akku und 15.000 km Fahrleistung, 20 kWh bleiben als Fahr-Reserve
          gesperrt. Die Zahlen sind die Ersparnis pro Jahr allein durch das Zurückspeisen ins Haus.
        </p>
        <div style={S.scroll}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Anlage</th>
                <th style={S.thNum}>Pendler<br />ohne Speicher</th>
                <th style={S.thNum}>Homeoffice<br />ohne Speicher</th>
                <th style={S.thNum}>zusätzlich zu<br />10-kWh-Speicher</th>
              </tr>
            </thead>
            <tbody>
              {pufferRows.map(r => (
                <tr key={r.kwp}>
                  <td style={S.td}>{r.kwp} kWp</td>
                  <td style={S.tdNum}>{de(r.pendler.ohneSpeicher)} €</td>
                  <td style={S.tdNum}>{de(r.home.ohneSpeicher)} €</td>
                  <td style={S.tdNum}>{de(r.home.mitSpeicher)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={S.note}>
          Eigene Berechnung mit derselben Stundensimulation, die auch im{" "}
          <Link href="/photovoltaik-rechner" style={S.link}>PV-Rechner</Link> steckt.
        </p>
        <p style={S.p}>
          Zwei Dinge fallen sofort auf. <strong style={S.strong}>Die rechte Spalte ist in jeder
          Zeile null.</strong> Wer bereits einen Heimspeicher hat, gewinnt durch das Auto
          praktisch nichts dazu — der Speicher fängt den Tagesüberschuss schon ab, und was
          übrig bleibt, ist Sommerüberschuss, den nachts niemand braucht. Und
          <strong style={S.strong}> beim Pendler bringt es selbst ohne Speicher kaum etwas</strong>,
          bei kleinen Anlagen sogar leicht weniger als nichts: Das Auto ist genau dann
          unterwegs, wenn die Sonne scheint. Erst bei großer Anlage kippt es ins Plus.
        </p>

        <h2 style={S.h2}>Der eigentliche Hebel liegt im Preisunterschied</h2>
        <p style={S.p}>
          Deutlich mehr als das Puffern verspricht der Handel mit dem Netz: nachts günstig
          laden, abends zur Preisspitze zurückspeisen. Wir haben das mit den{" "}
          <strong style={S.strong}>tatsächlichen deutschen Börsenpreisen der letzten zwölf
          Monate</strong> gerechnet — die schwankten im Mittel um{" "}
          {spread.toString().replace(".", ",")} Cent je Kilowattstunde zwischen der günstigsten
          und der teuersten Tageszeit.
        </p>
        {profilRows.length > 0 && (
          <div style={S.scroll}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={S.th}>Wann steht das Auto zuhause?</th>
                  <th style={S.thNum}>Rechnerisch pro Jahr</th>
                </tr>
              </thead>
              <tbody>
                {profilRows.map(r => (
                  <tr key={r.label}>
                    <td style={S.td}>{r.label}<br /><span style={{ fontSize: v("--font-size-small") }}>{r.what}</span></td>
                    <td style={S.tdNum}>{de(r.revenue)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={S.p}>
          <strong style={S.strong}>Hier dreht sich das Bild:</strong> Beim Puffern ging der
          Pendler leer aus, beim Netzhandel liegt er nur wenig zurück. Die Preisspitzen liegen
          morgens und abends — genau dann steht das Auto ohnehin zuhause. Der Hebel ist also
          nicht die Sonne, sondern der Preisunterschied.
        </p>
        <div style={S.card}>
          <span style={S.label}>Warum das eine Obergrenze ist</span>
          Gerechnet ist der reine Börsenpreis. Netzentgelte, Steuern und Umlagen sind nicht
          abgezogen — und wie am Ende abgerechnet wird, ist offen. Nicht geschönt ist dagegen
          die Voraussicht: Börsenpreise stehen am Vortag fest, eine Steuerung kennt sie also
          wirklich vorher.
        </div>

        <h2 style={S.h2}>Mehr Akku bringt nur bis etwa 50 Kilowattstunden etwas</h2>
        <p style={S.p}>
          Ein größerer Akku klingt nach mehr Ertrag. Das stimmt aber nur, bis die Wallbox zum
          Flaschenhals wird — sie kann pro Stunde nur eine begrenzte Menge bewegen:
        </p>
        {akkuRows.length > 0 && (
          <div style={S.scroll}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={S.th}>Akku im Auto</th>
                  <th style={S.thNum}>Rechnerisch pro Jahr</th>
                  <th style={S.th}>Begrenzt durch</th>
                </tr>
              </thead>
              <tbody>
                {akkuRows.map(r => (
                  <tr key={r.akku}>
                    <td style={S.td}>{r.akku} kWh</td>
                    <td style={S.tdNum}>{de(r.revenue)} €</td>
                    <td style={S.td}>{r.limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={S.p}>
          Praktisch heißt das: Ob im Auto 55 oder 100 Kilowattstunden stecken, ändert am
          Ergebnis nichts mehr. Nur bei kleinen Akkus ist die Fahrzeuggröße überhaupt der
          begrenzende Faktor — und dort schlägt sie voll durch, weil zusätzlich die
          Fahr-Reserve abgeht.
        </p>

        <h2 style={S.h2}>Der Haken, über den kaum jemand schreibt</h2>
        <div style={S.hero}>
          <strong style={S.strong}>Alle drei Angebote am deutschen Markt schließen Haushalte
          mit eigener Photovoltaik im Eigenverbrauch aus.</strong> Beim einzigen buchbaren
          Angebot wird die Kombination mit einer PV-Anlage ausdrücklich nur für Volleinspeiser
          unterstützt; die beiden angekündigten Angebote schließen PV-Haushalte ebenfalls aus.
          Der Grund dürfte in der Messtechnik liegen: Zwei Einspeisequellen hinter einem Zähler
          sauber auseinanderzuhalten, ist heute nicht vorgesehen.
        </div>
        <p style={S.p}>
          Für die Leserschaft dieser Seite ist das die zentrale Nachricht — und sie steht in
          keinem der gängigen Ratgeber. Wer eine Photovoltaikanlage betreibt und den
          Solarstrom selbst nutzt, kann die attraktiven Vergütungen derzeit schlicht nicht
          bekommen.
        </p>

        <h2 style={S.h2}>Was heute wirklich kaufbar ist</h2>
        <p style={S.p}>
          Bidirektionales Laden wird 2026 <strong style={S.strong}>nicht als freie Wallbox
          verkauft</strong>, sondern als geschlossenes Paket aus einem bestimmten Auto, einer
          dafür freigegebenen Ladestation und meist einem passenden Stromtarif. Die
          Vorstellung „ich kaufe eine bidirektionale Wallbox und schließe mein vorhandenes
          E-Auto an" trifft auf so gut wie keinen Fall zu.
        </p>
        <p style={S.p}>
          Der Grund liegt in der Zertifizierung: Nachgewiesen wird das Gespann aus Fahrzeug
          und Ladestation, nicht das Gerät allein. Deshalb sind am Markt praktisch nur
          Hersteller-Ökosysteme zu finden. Eine viel zitierte „universelle" Wallbox ist in
          Deutschland gar nicht mehr erhältlich — sie taucht auf der deutschen Herstellerseite
          nicht einmal mehr auf, wird in Ratgeberportalen aber weiter mit Preisen beworben.
        </p>

        <h2 style={S.h2}>Was es kostet — und was es nicht gibt</h2>
        <p style={S.p}>
          Für die Hardware sind je nach Paket rund 2.100 bis 3.900 Euro anzusetzen, dazu
          Installation. <strong style={S.strong}>Förderung gibt es für Einfamilienhäuser
          keine</strong> — weder vom Bund, noch von einem der sechzehn Bundesländer, noch von
          einer belegbaren Kommune. Die häufig noch beworbene KfW-Förderung für Solarstrom
          und E-Autos ist seit der Haushaltskrise beendet.
        </p>
        <p style={S.p}>
          Einen Zuschlag für rückspeisefähige Ladepunkte gibt es ausschließlich im
          Bundesprogramm für Mehrparteienhäuser ab drei Wohneinheiten.
        </p>

        <h2 style={S.h2}>Für wen es sich heute lohnt</h2>
        <div style={S.card}>
          <strong style={S.strong}>Eher ja:</strong> Wer ohnehin ein passendes Auto kauft, viel
          Zeit zuhause verbringt, keinen Heimspeicher hat und Notstrom schätzt. Ein großer
          Fahrzeugakku trägt einen Haushalt mehrere Tage — ein Heimspeicher knapp einen.
        </div>
        <div style={S.card}>
          <strong style={S.strong}>Eher nein:</strong> Wer bereits einen Heimspeicher hat (der
          Zugewinn ist null), wer pendelt (das Auto fehlt in der Sonnenzeit), und wer eine
          PV-Anlage im Eigenverbrauch betreibt und auf die Netzvergütung hofft (dafür ist er
          derzeit nicht zugelassen).
        </div>
        <p style={S.p}>
          Und die vielleicht wichtigste Einordnung: <strong style={S.strong}>Die Entscheidung
          fällt beim Autokauf.</strong> Die Wallbox lässt sich später ergänzen, das Ökosystem
          nicht — nachrüsten geht bei den allermeisten Fahrzeugen nicht. Wer die Möglichkeit
          offenhalten will, achtet beim Kauf darauf, ob der Hersteller eine Wallbox
          namentlich freigibt.
        </p>

        <h2 style={S.h2}>Wie es rechtlich steht</h2>
        <div style={S.card}>
          <p style={{ ...S.p, marginBottom: 8 }}>{V2G_STAND_DE.netzentgelte}</p>
          <p style={{ ...S.p, marginBottom: 8 }}>{V2G_STAND_DE.abrechnung}</p>
          <p style={{ ...S.p, marginBottom: 8 }}>{V2G_STAND_DE.steuer}</p>
          <p style={{ ...S.p, marginBottom: 0 }}>{V2G_STAND_DE.huerde}</p>
        </div>

        <Faq items={bidiLadenFaq()} currentPath="/lohnt-sich-bidirektionales-laden" />

        <p style={S.note}>
          Börsenpreise: Bundesnetzagentur | SMARD.de über Energy-Charts (Fraunhofer ISE),
          CC BY 4.0, Zeitraum {new Date(start).toLocaleDateString("de-DE")} bis{" "}
          {new Date(end).toLocaleDateString("de-DE")}. Alle Angaben ohne Gewähr; verbindlich
          sind die Konditionen deines Stromanbieters und die offiziellen Rechtsquellen.
        </p>
      </div>
    </div>
  );
}
