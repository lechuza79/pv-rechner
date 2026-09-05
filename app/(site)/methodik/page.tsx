import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../components/Breadcrumb";
import GlossaryTerm from "../../../components/GlossaryTerm";
import KontaktTeaser from "../../../components/KontaktTeaser";
import { v } from "../../../lib/theme";
import { supabase } from "../../../lib/supabase-server";
import { DEFAULT_PRICES, type PriceConfig } from "../../../lib/prices-config";
import { SCENARIOS, NATIONAL_AVG_YIELD } from "../../../lib/constants";
import { DEFAULT_FEED_IN } from "../../../lib/feedin-config";
import { CO2_PRICE, co2PriceForCalendarYear } from "../../../lib/co2-config";
import { DEFAULT_AIRCON_CONFIG } from "../../../lib/aircon-config";
import { FUEL } from "../../../lib/constants";
import { eegVerfahrenSatz } from "../../../lib/eeg-reform-config";
import { pageMetadata } from "../../../lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/methodik",
  title: "Methodik – So berechnen wir deine PV-Rendite",
  description: "Transparente Erklärung der Berechnungslogik im Solar Check: Eigenverbrauch, Speicher-Effekt, Amortisation. Kalibriert an HTW Berlin Simulationsdaten.",
  ogImageTitle: "So rechnen wir",
  ogImageSubtitle: "Transparent statt Blackbox — kalibriert an HTW-Berlin-Daten.",
});

const S = {
  page: {
    background: v('--color-bg'),
    fontFamily: v('--font-text'),
    color: v('--color-text-primary'),
    minHeight: "100vh",
    padding: "0 16px 20px",
  },
  wrap: { maxWidth: v('--content-max-width'), margin: "0 auto", paddingTop: "var(--content-lede-top)" },
  back: {
    fontSize: v('--font-size-small'),
    color: v('--color-text-secondary'),
    textDecoration: "none",
    display: "inline-block",
    marginBottom: 24,
  },
  h1: {
    fontSize: v('--font-size-h1'),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v('--color-text-primary'),
    lineHeight: 1.2,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: v('--font-size-lead'),
    color: v('--color-text-muted'),
    marginBottom: 28,
    lineHeight: 1.6,
  },
  h2: {
    fontSize: v('--font-size-h2'),
    fontWeight: 700,
    color: v('--color-text-primary'),
    marginTop: 32,
    marginBottom: 10,
  },
  p: {
    fontSize: v('--font-size-body'),
    color: v('--color-text-muted'),
    lineHeight: 1.7,
    marginBottom: 12,
  },
  card: {
    background: v('--color-bg'),
    borderRadius: v('--radius-md'),
    padding: "14px 16px",
    border: `1px solid ${v('--color-border')}`,
    marginBottom: 12,
    fontSize: v('--font-size-body'),
    color: v('--color-text-muted'),
    lineHeight: 1.7,
  },
  label: {
    fontSize: v('--font-size-caption'),
    fontWeight: 700,
    color: v('--color-text-secondary'),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: 6,
    display: "block",
  },
  mono: {
    fontFamily: v('--font-mono'),
    fontSize: v('--font-size-small'),
    color: v('--color-accent'),
  },
  accent: { color: v('--color-accent'), fontWeight: 600 },
  muted: { color: v('--color-text-muted') },
  link: { color: v('--color-accent'), textDecoration: "none" },
  strong: { fontWeight: 700, color: v('--color-text-primary') },
};

async function fetchPrices(): Promise<PriceConfig> {
  if (!supabase) return DEFAULT_PRICES;
  try {
    const { data } = await supabase
      .from("market_prices")
      .select("*")
      .neq("source", "SCRAPE_ERROR")
      .gt("pv_price_small", 0)
      .lte("valid_from", new Date().toISOString().split("T")[0])
      .order("valid_from", { ascending: false })
      .limit(1)
      .single();
    if (!data) return DEFAULT_PRICES;
    return {
      pvPriceSmall: Number(data.pv_price_small),
      pvPriceLarge: Number(data.pv_price_large),
      pvThresholdKwp: Number(data.pv_threshold_kwp),
      batteryBase: Number(data.battery_base),
      batteryPerKwh: Number(data.battery_per_kwh),
      electricityPrice: data.electricity_price != null ? Number(data.electricity_price) : DEFAULT_PRICES.electricityPrice,
      electricityIncrease: data.electricity_increase != null ? Number(data.electricity_increase) : DEFAULT_PRICES.electricityIncrease,
      validFrom: data.valid_from,
      source: data.source,
    };
  } catch { return DEFAULT_PRICES; }
}

function formatPriceDate(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

/** Effektive Jahres-Effizienz eines Klimageräte-Typs aus der Config —
 *  dieselbe Quelle wie Rechner und Datenstand-Seite, nie handgetippt. */
function acSeer(id: "monoblock" | "portasplit" | "split"): string {
  const device = DEFAULT_AIRCON_CONFIG.devices.find((d) => d.id === id);
  return (device?.seer ?? 0).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export default async function MethodikPage() {
  const prices = await fetchPrices();
  // CO2 path rendered from the config anchors (absolute calendar years), so the
  // ETS2 start year never drifts with the render year.
  const co2Years = Object.keys(CO2_PRICE.anchors).map(Number).sort((a, b) => a - b);
  const ets2Start = co2Years[co2Years.length - 1] + 1;
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb items={[{ label: "Start", href: "/" }, { label: "Methodik" }]} jsonLd />

        <h1 style={S.h1}>So rechnen wir</h1>
        <p style={S.subtitle}>
          Transparent statt Blackbox. Hier erklären wir, welche Annahmen hinter
          den Ergebnissen stecken — und wo die Grenzen sind.
        </p>

        {/* ── Eigenverbrauch ── */}
        <h2 style={S.h2}>Eigenverbrauch</h2>
        <p style={S.p}>
          Der <GlossaryTerm id="eigenverbrauch">Eigenverbrauchsanteil</GlossaryTerm> ist der wichtigste Faktor für die Rentabilität:
          Wie viel Prozent deines Solarstroms nutzt du selbst, statt ihn ins Netz
          einzuspeisen? Jede selbst verbrauchte Kilowattstunde spart dir den vollen
          Strompreis — eingespeister Strom bringt nur die Einspeisevergütung.
        </p>
        <p style={S.p}>
          Unser Modell berechnet den Eigenverbrauch basierend auf dem Verhältnis
          von Anlagengröße zu Jahresverbrauch. Je größer die Anlage relativ zum
          Verbrauch, desto geringer der Eigenverbrauchsanteil — weil mehr
          überschüssiger Strom ins Netz fließt.
        </p>
        <p style={S.p}>
          Wichtig: Der Eigenverbrauchsanteil ist eine <strong style={S.strong}>Jahresgröße</strong>.
          Er stammt aus Ganzjahres-Simulationen der HTW Berlin (25.000 Konfigurationen im
          Minutentakt) und bildet damit bereits ab, dass im Sommer Überschüsse eingespeist
          werden und im Winter zugekauft wird. Genau dieser eine Jahreswert fließt in die
          Wirtschaftlichkeitsrechnung — er wird nicht zusätzlich saisonal „verkleinert".
        </p>
        <p style={S.p}>
          Nicht verwechseln mit dem <strong style={S.strong}>Autarkiegrad</strong>: Der
          Eigenverbrauchsanteil sagt, wie viel deines <em>erzeugten</em> Solarstroms du selbst
          nutzt. Der Autarkiegrad sagt, wie viel deines <em>Verbrauchs</em> du aus eigener Sonne
          deckst. Die oft genannten „70–80 %" beziehen sich meist auf den Autarkiegrad, nicht
          auf den Eigenverbrauch.
        </p>
        <p style={S.p}>
          Den Autarkiegrad rechnen wir mit einer <strong style={S.strong}>Stunden-Simulation
          über ein ganzes Jahr</strong> — nicht aus dem Eigenverbrauch zurückgerechnet.
          Das ist wichtig: Eine reine Jahresbilanz würde bei sehr großen Anlagen fälschlich
          100 % anzeigen, weil sie den Sommerüberschuss gegen das Winterdefizit aufrechnet.
          Das kann man aber nicht — im Dezember liefert selbst eine riesige Anlage nur einen
          Bruchteil, und ein Hausspeicher überbrückt gut einen Tag, keinen dunklen Winter.
          Die Simulation stellt darum Stunde für Stunde Erzeugung und Verbrauch gegenüber,
          lädt und entlädt den Speicher und bildet so den Winter- und Tag/Nacht-Effekt direkt
          ab — inklusive Wärmepumpe (zieht ihren Strom vor allem im Winter) und Standort.
          Wir haben sie gegen das Unabhängigkeits-Kennfeld der HTW Berlin geprüft: bei
          gleicher Verbrauchsannahme treffen sich beide auf etwa einen Prozentpunkt genau.
          Ergebnis: Die Autarkie sättigt bei rund 90 % — volle Unabhängigkeit vom Netz ist mit
          einem Hausspeicher praktisch nicht erreichbar.
        </p>
        <div style={S.card}>
          <span style={S.label}>Einflussfaktoren</span>
          <span style={S.accent}>Anlagengröße</span> relativ zum Verbrauch
          <br />
          <span style={S.accent}>Nutzungsprofil</span> — wer tagsüber zuhause ist,
          verbraucht mehr direkt vom Dach
          <br />
          <span style={S.accent}>Speicher</span> — verschiebt Nachtverbrauch auf
          Solarstrom
          <br />
          <span style={S.accent}>Großverbraucher</span> — Wärmepumpe, E-Auto und
          Klimaanlage erhöhen den Gesamtverbrauch
        </div>

        {/* ── Speicher ── */}
        <h2 style={S.h2}>Speicher-Effekt</h2>
        <p style={S.p}>
          Ein Batteriespeicher erhöht den Eigenverbrauch deutlich: Überschüssiger
          Solarstrom vom Mittag wird gespeichert und abends oder nachts genutzt,
          statt aus dem Netz zu kommen.
        </p>
        <p style={S.p}>
          Aber: Mehr Speicher hilft nicht unbegrenzt. Ab einer gewissen Größe
          ist der Speicher im Sommer voll und im Winter reicht die Sonne nicht
          zum Laden. Typisch bringt der Sprung von 0 auf 5 kWh deutlich mehr
          als von 10 auf 15 kWh.
        </p>

        {/* ── WP & E-Auto ── */}
        <h2 style={S.h2}>Wärmepumpe, E-Auto & Klimaanlage</h2>
        <p style={S.p}>
          Alle drei erhöhen deinen Stromverbrauch — und damit auch die Menge Solarstrom,
          die du selbst nutzen kannst. Den Wärmepumpen-Strombedarf berechnen wir
          individuell aus deinem Gebäude (Wohnfläche, Dämmung, Heizsystem, Haustyp) —
          bei einem Standard-Einfamilienhaus sind das grob 6.000–8.000 kWh/Jahr;
          ein E-Auto je nach Fahrleistung 1.800–3.600 kWh/Jahr.
        </p>
        <p style={S.p}>
          <strong>Klimaanlage (nur Kühlung):</strong> Den Kühlbedarf leiten wir aus der
          Wohnfläche ab — rund 3 kWh Strom pro Quadratmeter und Jahr. Ein 120-m²-Haus
          kommt so auf etwa 360 kWh in der Sommersaison. Das ist ein moderater Mittelwert:
          In Deutschland wird meist nur teilweise gekühlt (Wohn- und Schlafräume), und der
          Wert ist im Ergebnis frei anpassbar. Wichtig: Wir rechnen ausschließlich das
          Kühlen im Sommer — Klimageräte können auch heizen, das deckt aber unser{" "}
          <Link href="/waermepumpe-rechner" style={{ ...S.link, fontWeight: 600 }}>Wärmepumpen-Rechner</Link> ab.
          Kühlen passt besonders gut zur Solaranlage, weil der Bedarf genau dann am höchsten
          ist, wenn die Sonne am stärksten scheint — fast jede gekühlte Kilowattstunde kommt
          direkt vom eigenen Dach.
        </p>
        <p style={S.p}>
          Das verbessert den Eigenverbrauchsanteil, weil weniger Strom
          übrig bleibt der eingespeist werden muss. Gleichzeitig sinkt die{" "}
          <GlossaryTerm id="autarkie">Autarkie-Quote</GlossaryTerm> nicht, weil mehr vom eigenen Dach kommt statt aus dem Netz.
        </p>
        <p style={S.p}>
          <strong>Wichtige Korrektur bei Wärmepumpen:</strong> Das HTW-Berlin-Modell
          wurde an Haushalten <em>ohne</em> Wärmepumpe kalibriert. Eine WP zieht
          aber rund 79 % ihres Stroms zwischen Oktober und März — genau dann,
          wenn die Sonne nur etwa 25 % des Jahresertrags liefert. Der Speicher kann
          diesen Winterverbrauch kaum decken, weil er in den dunklen Monaten
          selten voll wird. Wir gewichten den Speicher-Vorteil bei
          WP-Haushalten deshalb mit einer Saisonkorrektur nach unten — das
          spiegelt wider, dass ein größerer Speicher hier weniger zusätzlichen
          Nutzen bringt, als die reine Verbrauchsmenge vermuten lässt.
        </p>

        {/* ── Gas/Öl-Vergleich ── */}
        <h2 style={S.h2}>Vergleich: Gas- & Ölheizung</h2>
        <p style={S.p}>
          Bei aktiver Wärmepumpe zeigen wir zum Vergleich, was eine Gas- oder
          Ölheizung über 25 Jahre kosten würde — für die gleiche Wärmemenge:
          Was die Wärmepumpe an Wärme liefert, rechnen wir über den
          Kesselwirkungsgrad in Brennstoff um und bepreisen ihn samt CO₂-Abgabe.
        </p>
        <div style={S.card}>
          <span style={S.label}>Annahmen</span>
          <span style={S.accent}>Kesselwirkungsgrad:</span> Gas {Math.round(FUEL.gas.efficiency * 100)} % · Heizöl {Math.round(FUEL.oil.efficiency * 100)} %
          <br />
          <span style={S.accent}>Brennstoffpreis:</span> Gas {Math.round(FUEL.gas.price * 100)} ct/kWh · Heizöl {Math.round(FUEL.oil.price * 100)} ct/kWh
          <br />
          Preissteigerung: 2 %/Jahr
          <br />
          <br />
          <span style={S.label}>CO₂-Abgabe</span>
          {co2Years.map((y) => `${y}: ${co2PriceForCalendarYear(y)} €/t`).join(" · ")} · ab {ets2Start}: EU ETS2 (marktbasiert)
          <br />
          Ab {ets2Start} rechnen wir konservativ mit +{CO2_PRICE.annualIncrease} €/t pro Jahr.
          <br />
          Gas: {Math.round(FUEL.gas.co2PerKwh * 1000)} g CO₂/kWh · Heizöl: {Math.round(FUEL.oil.co2PerKwh * 1000)} g CO₂/kWh
          <br />
          <br />
          <span style={S.muted}>
            Die CO₂-Bepreisung für Gebäude wird ab {ets2Start} durch den EU-weiten
            Emissionshandel (ETS2) ersetzt. Die tatsächlichen Zertifikatspreise
            könnten deutlich über unserer konservativen Schätzung liegen.
          </span>
        </div>

        {/* ── Kostenschätzung ── */}
        <h2 style={S.h2}>Kostenschätzung</h2>
        <p style={S.p}>
          Die Investitionskosten werden automatisch geschätzt, können aber
          manuell angepasst werden. Unsere Richtwerte:
        </p>
        <div style={S.card}>
          <span style={S.label}>PV-Module + Installation</span>
          <span style={S.mono}>{prices.pvPriceSmall.toLocaleString("de-DE")} €/kWp</span>{" "}
          <span style={S.muted}>(bis {prices.pvThresholdKwp} kWp)</span>
          <br />
          <span style={S.mono}>{prices.pvPriceLarge.toLocaleString("de-DE")} €/kWp</span>{" "}
          <span style={S.muted}>(ab {prices.pvThresholdKwp} kWp, Mengeneffekt)</span>
          <br />
          <br />
          <span style={S.label}>Batteriespeicher</span>
          <span style={S.mono}>{prices.batteryBase > 0 ? `${prices.batteryBase.toLocaleString("de-DE")} € Basis + ` : ""}{prices.batteryPerKwh.toLocaleString("de-DE")} €/kWh</span>
          <br />
          <br />
          <span style={S.muted}>
            Gerundet auf 500 €. Stand {formatPriceDate(prices.validFrom)}, ohne Förderung.
            {prices.source && <><br />Quelle: {prices.source}</>}
          </span>
        </div>

        {/* ── Standort-Ertrag ── */}
        <h2 style={S.h2}>Standort-Ertrag</h2>
        <p style={S.p}>
          Wie viel Strom eine PV-Anlage produziert, hängt stark vom Standort ab.
          In Süddeutschland sind über 1.100 kWh pro kWp möglich, an der Nordseeküste
          eher 950–1.000. Der Unterschied kann 10–15 % ausmachen.
        </p>
        <p style={S.p}>
          Wenn du deine Postleitzahl eingibst, rufen wir Ertragsdaten vom{" "}
          <a
            href="https://re.jrc.ec.europa.eu/pvg_tools/"
            target="_blank"
            rel="noopener noreferrer"
            style={S.link}
          >
            PVGIS
          </a>{" "}
          ab — dem Solarrechner der Europäischen Kommission. PVGIS simuliert den
          Ertrag basierend auf langjährigen Wetterdaten, optimaler Dachneigung
          und 14 % Systemverlusten. Wie stark andere Dachneigungen und
          Ausrichtungen den Ertrag verändern, zeigt unsere{" "}
          <Link href="/photovoltaik-neigungswinkel" style={{ ...S.link, fontWeight: 600 }}>Neigungswinkel-Übersicht</Link> —
          ebenfalls aus PVGIS-Daten.
        </p>
        <div style={S.card}>
          <span style={S.label}>Beispielwerte</span>
          <span style={S.accent}>München:</span> ~1.140 kWh/kWp
          <br />
          <span style={S.accent}>Frankfurt:</span> ~1.060 kWh/kWp
          <br />
          <span style={S.accent}>Hamburg:</span> ~990 kWh/kWp
          <br />
          <span style={S.accent}>Kiel:</span> ~990 kWh/kWp
          <br />
          <br />
          <span style={S.muted}>
            Ohne PLZ-Eingabe rechnen wir mit {NATIONAL_AVG_YIELD.toLocaleString("de-DE")} kWh/kWp
            — dem Bundesmittel bei optimaler Ausrichtung. Der Abschlag für dein
            Dach kommt in beiden Fällen aus deiner Angabe zu Form und
            Ausrichtung, nicht aus diesem Wert. Er ist im Ergebnis jederzeit
            manuell anpassbar.
          </span>
        </div>

        {/* ── Amortisation ── */}
        <h2 style={S.h2}>Amortisation</h2>
        <p style={S.p}>
          Die Amortisationsrechnung zeigt, ab wann sich die Investition durch
          eingesparten Strom und Einspeisevergütung rechnet. Wir rechnen mit
          drei Szenarien für die zukünftige Strompreisentwicklung:
        </p>
        <div style={S.card}>
          <span style={S.label}>Annahmen</span>
          <span style={S.accent}>Zeitraum:</span> 25 Jahre
          <br />
          <span style={S.accent}><GlossaryTerm id="degradation">Degradation</GlossaryTerm>:</span> 0,5 % pro Jahr
          (Leistungsverlust der Module)
          <br />
          <span style={S.accent}><GlossaryTerm id="einspeiseverguetung">Einspeisevergütung</GlossaryTerm> (EEG):</span>
          <br />
          &nbsp;&nbsp;<GlossaryTerm id="teileinspeisung">Teileinspeisung</GlossaryTerm>: {DEFAULT_FEED_IN.teilUnder10.toLocaleString("de-DE")} ct/kWh (≤10 kWp) / {DEFAULT_FEED_IN.teilOver10.toLocaleString("de-DE")} ct/kWh ({">"}10 kWp)
          <br />
          &nbsp;&nbsp;<GlossaryTerm id="volleinspeisung">Volleinspeisung</GlossaryTerm>: {DEFAULT_FEED_IN.vollUnder10.toLocaleString("de-DE")} ct/kWh (≤10 kWp) / {DEFAULT_FEED_IN.vollOver10.toLocaleString("de-DE")} ct/kWh ({">"}10 kWp)
          <br />
          &nbsp;&nbsp;Fix für 20 Jahre ab Inbetriebnahme. Bei Anlagen {">"}10 kWp wird ein
          gewichteter Mischsatz berechnet. Halbjährliche Degression ca. 1%.
          <br />
          &nbsp;&nbsp;<span style={S.muted}>Stand: {formatPriceDate(DEFAULT_FEED_IN.validFrom)} · Quelle: Bundesnetzagentur, §48 EEG</span>
          <br />
          <span style={S.accent}>Strompreis:</span> {(prices.electricityPrice * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} ct/kWh
          <br />
          <br />
          <span style={S.label}>3 Szenarien</span>
          {/* Die Prozentsätze kommen aus SCENARIOS, nicht aus dem Fließtext: Hier
              stand die mittlere Annahme um einen Prozentpunkt zu hoch getippt,
              während der Rechner seit dem 20.07.2026 anders rechnet und sein
              Reiter das auch so beschriftet (Council 18.08.2026). Eine getippte
              Modellzahl veraltet lautlos. */}
          {SCENARIOS.map(s => (
            <span key={s.id}>
              <span style={{ color: s.color, fontWeight: 600 }}>{s.label}:</span>{" "}
              Strom +{(s.strom * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %/Jahr
              <br />
            </span>
          ))}
          <br />
          <span style={S.muted}>
            Wartungskosten sind nicht einberechnet. Im 15. Jahr rechnen wir dagegen
            einen Speichertausch mit — das ist die Lebensdauer, die wir für den Akku
            ansetzen. Ein Teil dieser Werte lässt sich im Ergebnis von Hand anpassen.
          </span>
        </div>
        <p style={S.p}>
          <strong style={S.strong}>Einspeisung ab 2027:</strong> Für Anlagen, die ab 2027 in
          Betrieb gehen, sollen andere Konditionen gelten — {eegVerfahrenSatz({ kurz: true })}.
          Das Ergebnis hat dafür einen Umschalter „Heute / Ab 2027": Statt des festen
          EEG-Satzes rechnet er mit den Regeln des Entwurfs, und den Erlös an der Strombörse
          lassen wir standardmäßig weg — was Solarstrom in 15 Jahren dort erlöst, weiß
          niemand. Die Hintergründe erklärt unser{" "}
          <Link href="/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung" style={{ ...S.link, fontWeight: 600 }}>Ratgeber zur EEG-Reform</Link>.
        </p>

        {/* ── Wärmepumpen-Rechner ── */}
        <h2 style={S.h2}>Wärmepumpen-Rechner</h2>
        <p style={S.p}>
          Der eigene <Link href="/waermepumpe-rechner" style={{ ...S.link, fontWeight: 600 }}>Wärmepumpen-Rechner</Link> geht
          deutlich tiefer als der Zuschlag im PV-Rechner: Aus dem Gebäude (Wohnfläche,
          Dämmstandard, Haustyp, Heizsystem) leiten wir Heizlast und Wärmebedarf ab und
          vergleichen die Wärmepumpe mit einer neuen Gas- oder Ölheizung — inklusive
          Anschaffung, CO₂-Abgabe und Förderung.
        </p>
        <p style={S.p}>
          Zwei Entscheidungen unterscheiden ihn von vielen anderen Rechnern: Die
          Betriebskosten rechnen wir mit dem <strong style={S.strong}>erwarteten realen
          Verbrauch</strong>, nicht mit dem theoretischen Norm-Bedarf des Gebäudes — real
          wird weniger geheizt, als die Norm annimmt, im Altbau um rund ein Drittel. Das
          geht bewusst zu unseren Ungunsten: kleinere Ersparnis, längere Amortisation.
          Und die Investitionskosten sind an rund 160 realen Handwerker-Angeboten
          kalibriert (Datensatz der Verbraucherzentrale Rheinland-Pfalz), nicht an
          Portal-Preisen. Die Annahmen stehen im Ergebnis, Herkunft und Stand auf der{" "}
          <Link href="/datenstand" style={{ ...S.link, fontWeight: 600 }}>Datenstand-Seite</Link>.
        </p>

        {/* ── Klimaanlagen-Rechner ── */}
        <h2 style={S.h2}>Klimaanlagen-Rechner: Kühlkosten</h2>
        <p style={S.p}>
          Der eigene <Link href="/klimaanlage-stromkosten" style={{ ...S.link, fontWeight: 600 }}>Klimaanlagen-Rechner</Link> beantwortet
          nicht „lohnt sich das" (eine Klimaanlage spart kein Geld, sie kostet welches), sondern: Was kostet sie
          im Betrieb — und wie viel davon übernimmt die Sonne?
        </p>
        <p style={S.p}>
          Den Kühlbedarf leiten wir aus echten <strong>Kühlgradstunden</strong> ab: Wir zählen für deinen Standort,
          wie viele Stunden es im Sommer wie weit über der Kühlschwelle lag (Open-Meteo-Wetterhistorie, ohne PLZ
          ein deutscher Durchschnitt). Wunschtemperatur, Zeitfenster und die Lage zur Sonne skalieren diesen Wert —
          beim Kühlen kommt der größte Wärmeeintrag durch die Fenster, deshalb fragen wir nach Sonne und Dachgeschoss,
          nicht nach dem Dämmstandard. Umschaltbar sind drei <strong>Klimadaten-Modi</strong>: der Durchschnitt der
          letzten {DEFAULT_AIRCON_CONFIG.avgYears} Sommer (Standard), der letzte Sommer (oft heißer) und eine
          Projektion in ~20 Jahre auf Basis eines Klimamodells (CMIP6) — eine Modellrechnung, kein exakter Wert.
        </p>
        <p style={S.p}>
          <strong>Warum die Zahl oft niedriger wirkt als erwartet:</strong> Der Wert ist ein <em>Jahres</em>betrag,
          nicht pro Monat. Die deutsche Kühlsaison ist kurz — nur an wirklich heißen Tagen läuft das Gerät. Und:
          <em> wie schnell</em> ein Raum kühl wird, ist eine Frage der Geräte-Leistung (kW), nicht der Jahresenergie —
          das einmalige Runterkühlen am Abend fällt gegenüber dem laufenden Wärmeeintrag kaum ins Gewicht.
        </p>
        <p style={S.p}>
          Beim <strong>Gerätevergleich</strong> rechnen wir bewusst nicht mit den Typenschild-Werten: Split-Geräte
          tragen einen Saisonwert (Teillast, echte Außentemperaturen), Monoblöcke nur einen Volllast-Wert aus der
          Prüfkammer — die EU-Norm schließt sie von der Saison-Messung ausdrücklich aus. In der Kammer kann keine
          warme Luft nachströmen; im Wohnzimmer passiert genau das, sobald der Abluftschlauch Raumluft nach draußen
          bläst. Wir stellen deshalb alle drei Gerätetypen auf dieselbe Grundlage — die Effizienz im echten Betrieb
          über eine ganze Saison: Monoblock {acSeer("monoblock")}, mobile Split-Anlage {acSeer("portasplit")}, fest
          installierte Split-Anlage {acSeer("split")}. Ein Monoblock zieht damit für dieselbe Kühlung rund das
          Vierfache einer festen Split-Anlage. Womit wir rechnen, mit Stand und Quelle, steht auf der{" "}
          <Link href="/datenstand" style={{ ...S.link, fontWeight: 600 }}>Datenstand-Seite</Link>.
        </p>
        <p style={S.p}>
          <strong>PV passt besonders gut zum Kühlen:</strong> Der Bedarf ist am höchsten, wenn die Sonne am
          stärksten scheint. Ohne Speicher deckt die PV das Kühlen am Tag fast komplett, nachts dagegen kaum;
          mit Batteriespeicher (Default in der Rechnung) ist auch Nachtkühlung größtenteils gedeckt. Beides
          ist im Ergebnis umschaltbar.
        </p>

        {/* ── Balkonkraftwerk-Rechner ── */}
        <h2 style={S.h2}>Balkonkraftwerk-Rechner</h2>
        <p style={S.p}>
          Der <Link href="/balkonkraftwerk/rechner" style={{ ...S.link, fontWeight: 600 }}>Balkonkraftwerk-Rechner</Link> nutzt
          dieselbe Basis wie der große PV-Rechner: Standort-Ertrag von PVGIS und eine Stunden-Simulation aus
          Sonnenverlauf und Haushaltsprofil. Zwei Besonderheiten: Der Ertrag wird am{" "}
          <strong style={S.strong}>800-Watt-Wechselrichter gedeckelt</strong> — bei großen Modul-Sets zeigt der
          Rechner sichtbar, wie viel durch die Drosselung verloren geht — und gerechnet wird ohne
          Einspeisevergütung, weil das bei Balkonkraftwerken der Normalfall ist. Der letzte Schritt empfiehlt
          das wirtschaftlich beste Set, zeigt aber alle Größen zum Vergleich.
        </p>

        {/* ── Einspeisevergütungs-Rechner ── */}
        <h2 style={S.h2}>Einspeisevergütungs-Rechner</h2>
        <p style={S.p}>
          Der <Link href="/einspeiseverguetung-rechner" style={{ ...S.link, fontWeight: 600 }}>Einspeisevergütungs-Rechner</Link>{" "}
          bestimmt deinen EEG-Satz nach dem Inbetriebnahme-Monat: für Anlagen ab August 2022 aus der im Gesetz
          festgelegten Degressions-Kette, davor aus dem Monatsarchiv der Bundesnetzagentur (April 2012 bis
          Juli 2022). Für noch ältere Anlagen fragen wir bewusst den Satz aus deinem Bescheid ab, statt einen
          zu raten. Die Vergütung endet am 31. Dezember des zwanzigsten Jahres — der Rechner zeigt, was du
          schon erhalten hast und was noch aussteht.
        </p>

        {/* ── Quellen & Grenzen ── */}
        <h2 style={S.h2}>Datengrundlage & Grenzen</h2>
        <p style={S.p}>
          Das Eigenverbrauchsmodell ist kalibriert an Simulationsdaten der{" "}
          <a
            href="https://solar.htw-berlin.de/studien/"
            target="_blank"
            rel="noopener noreferrer"
            style={S.link}
          >
            HTW Berlin
          </a>{" "}
          (Forschungsgruppe Quaschning/Weniger). Grundlage sind über 25.000
          simulierte Anlagenkonfigurationen in 1-Minuten-Auflösung mit dem
          VDI 4655 Standard-Lastprofil für Einfamilienhäuser.
        </p>

        <div style={S.card}>
          <span style={S.label}>Was wir nicht berücksichtigen</span>
          <span style={S.accent}>Dachausrichtung</span> — wir rechnen mit optimal
          ausgerichteten Modulen; wie stark andere Neigungen und Richtungen abweichen,
          zeigt die <Link href="/photovoltaik-neigungswinkel" style={S.link}>Neigungswinkel-Übersicht</Link>
          <br />
          <span style={S.accent}>Verschattung</span> — Bäume, Nachbargebäude oder
          Gauben kann nur ein Fachbetrieb vor Ort bewerten
          <br />
          <span style={S.accent}>Förderung</span> — regionale Zuschüsse fließen erst
          in die Amortisation ein, wenn du sie im Ergebnis anrechnest oder von einer Förderseite kommst; passende Programme zeigen wir im Ergebnis an
          <br />
          <br />
          <span style={S.muted}>
            Abweichungen von ±5 % zum tatsächlichen Eigenverbrauch sind möglich.
            Für eine exakte Prognose empfehlen wir ein Angebot vom Fachbetrieb.
          </span>
        </div>

        <p style={S.p}>
          Eine kompakte Übersicht — Preise, Vergütung, CO₂-Preis,
          Wärmepumpen-Annahmen — mit Stand und Quelle findest du auf der{" "}
          <Link href="/datenstand" style={S.link}>Datenstand-Seite</Link>.
        </p>

        {/* Kontakt-Weg für alle, die die Methodik über das hier Gezeigte hinaus
            nutzen wollen — bewusst am Ende, nach den Grenzen. */}
        <div style={{ marginTop: 24 }}>
          <KontaktTeaser
            lead="Du möchtest die Methodik im Detail nutzen — für ein eigenes Tool, ein Widget oder eine Veröffentlichung? Schreib uns, wir helfen gern weiter."
            modalTitle="Methodik im Detail nutzen"
            topic="Methodik & Datengrundlage"
            initialMessage={"Ich interessiere mich für die Berechnungsgrundlagen von solar-check.io.\n\n"}
          />
        </div>
      </div>
    </div>
  );
}
