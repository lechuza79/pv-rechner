import { Metadata } from "next";
import Link from "next/link";
import { v } from "../../lib/theme";
import { supabase } from "../../lib/supabase-server";
import { DEFAULT_PRICES, type PriceConfig } from "../../lib/prices-config";

export const metadata: Metadata = {
  title: "Methodik – So berechnen wir deine PV-Rendite",
  description: "Transparente Erklärung der Berechnungslogik im Solar Check: Eigenverbrauch, Speicher-Effekt, Amortisation. Kalibriert an HTW Berlin Simulationsdaten.",
};

const S = {
  page: {
    background: v('--color-bg'),
    fontFamily: v('--font-text'),
    color: v('--color-text-primary'),
    minHeight: "100vh",
    padding: "20px 16px",
  },
  wrap: { maxWidth: v('--page-max-width'), margin: "0 auto" },
  back: {
    fontSize: 13,
    color: v('--color-text-secondary'),
    textDecoration: "none",
    display: "inline-block",
    marginBottom: 24,
  },
  h1: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v('--color-text-primary'),
    lineHeight: 1.2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: v('--color-text-muted'),
    marginBottom: 28,
    lineHeight: 1.5,
  },
  h2: {
    fontSize: 16,
    fontWeight: 700,
    color: v('--color-text-primary'),
    marginTop: 32,
    marginBottom: 10,
  },
  p: {
    fontSize: 13,
    color: v('--color-text-muted'),
    lineHeight: 1.7,
    marginBottom: 10,
  },
  card: {
    background: v('--color-bg'),
    borderRadius: v('--radius-md'),
    padding: "14px 16px",
    border: `1px solid ${v('--color-border')}`,
    marginBottom: 12,
    fontSize: 13,
    color: v('--color-text-muted'),
    lineHeight: 1.7,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: v('--color-text-secondary'),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: 6,
    display: "block",
  },
  mono: {
    fontFamily: v('--font-mono'),
    fontSize: 12,
    color: v('--color-accent'),
  },
  accent: { color: v('--color-accent'), fontWeight: 600 },
  muted: { color: v('--color-text-muted') },
  link: { color: v('--color-accent'), textDecoration: "none" },
  footer: {
    marginTop: 48,
    paddingTop: 20,
    borderTop: `1px solid ${v('--color-border')}`,
    display: "flex",
    justifyContent: "center",
    gap: 20,
    fontSize: 12,
  },
  footerLink: {
    color: v('--color-text-muted'),
    textDecoration: "none",
  },
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
      validFrom: data.valid_from,
      source: data.source,
    };
  } catch { return DEFAULT_PRICES; }
}

function formatPriceDate(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

export default async function MethodikPage() {
  const prices = await fetchPrices();
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Link href="/" style={S.back}>
          ← Zurück zum Rechner
        </Link>

        <h1 style={S.h1}>So rechnen wir</h1>
        <p style={S.subtitle}>
          Transparent statt Blackbox. Hier erklären wir, welche Annahmen hinter
          den Ergebnissen stecken — und wo die Grenzen sind.
        </p>

        {/* ── Eigenverbrauch ── */}
        <h2 style={S.h2}>Eigenverbrauch</h2>
        <p style={S.p}>
          Der Eigenverbrauchsanteil ist der wichtigste Faktor für die Rentabilität:
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
          <span style={S.accent}>Großverbraucher</span> — Wärmepumpe und E-Auto
          erhöhen den Gesamtverbrauch
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
        <h2 style={S.h2}>Wärmepumpe & E-Auto</h2>
        <p style={S.p}>
          Beides erhöht deinen Stromverbrauch — und damit auch die Menge Solarstrom,
          die du selbst nutzen kannst. Eine Wärmepumpe verbraucht ca. 3.500 kWh/Jahr,
          ein E-Auto je nach Fahrleistung 1.800–3.600 kWh/Jahr.
        </p>
        <p style={S.p}>
          Das verbessert den Eigenverbrauchsanteil, weil weniger Strom
          übrig bleibt der eingespeist werden muss. Gleichzeitig sinkt die
          Autarkie-Quote nicht, weil mehr vom eigenen Dach kommt statt aus dem Netz.
        </p>

        {/* ── Gas/Öl-Vergleich ── */}
        <h2 style={S.h2}>Vergleich: Gas- & Ölheizung</h2>
        <p style={S.p}>
          Bei aktiver Wärmepumpe zeigen wir zum Vergleich, was eine Gas- oder
          Ölheizung über 25 Jahre kosten würde — für die gleiche Wärmemenge.
        </p>
        <div style={S.card}>
          <span style={S.label}>Berechnung</span>
          <span style={S.accent}>Wärmebedarf:</span> 3.500 kWh Strom × COP 3,5 = 12.250 kWh Wärme/Jahr
          <br />
          <span style={S.accent}>Gaskessel:</span> 12.250 kWh ÷ 0,90 Wirkungsgrad = 13.611 kWh Gas
          <br />
          <span style={S.accent}>Ölkessel:</span> 12.250 kWh ÷ 0,85 Wirkungsgrad = 14.412 kWh Öl
          <br />
          <br />
          <span style={S.label}>Preise</span>
          <span style={S.accent}>Gas:</span> 12 ct/kWh · <span style={S.accent}>Heizöl:</span> 10 ct/kWh
          <br />
          Grundpreissteigerung: 2 %/Jahr
          <br />
          <br />
          <span style={S.label}>CO₂-Abgabe</span>
          2025: 55 €/t · 2026: 65 €/t · ab 2027: EU ETS2 (marktbasiert)
          <br />
          Wir rechnen konservativ mit +8 €/t pro Jahr ab 2027.
          <br />
          Gas: 200 g CO₂/kWh · Heizöl: 266 g CO₂/kWh
          <br />
          <br />
          <span style={S.muted}>
            Die CO₂-Bepreisung für Gebäude wird ab 2027/28 durch den EU-weiten
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
          und 14 % Systemverlusten.
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
            Ohne PLZ-Eingabe rechnen wir mit 950 kWh/kWp (konservativer
            Durchschnitt). Der Wert ist im Ergebnis jederzeit manuell anpassbar.
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
          <span style={S.accent}>Degradation:</span> 0,5 % pro Jahr
          (Leistungsverlust der Module)
          <br />
          <span style={S.accent}>Einspeisevergütung:</span> 8,03 ct/kWh, fix für
          20 Jahre
          <br />
          <span style={S.accent}>Strompreis:</span> 0,34 €/kWh
          (Durchschnitt 2024)
          <br />
          <br />
          <span style={S.label}>3 Szenarien</span>
          <span style={{ color: v('--color-negative'), fontWeight: 600 }}>Pessimistisch:</span>{" "}
          Strom +1 %/Jahr
          <br />
          <span style={S.accent}>Realistisch:</span> Strom +3 %/Jahr
          <br />
          <span style={{ color: v('--color-accent'), fontWeight: 600 }}>Optimistisch:</span>{" "}
          Strom +5 %/Jahr
          <br />
          <br />
          <span style={S.muted}>
            Wartungskosten (ca. 150–250 €/Jahr) sind nicht einberechnet.
            Alle Werte im Ergebnis manuell anpassbar.
          </span>
        </div>

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
          <span style={S.accent}>Standort</span> — kein regionaler Ertrag
          (Süddeutschland ≠ Norddeutschland)
          <br />
          <span style={S.accent}>Dachausrichtung</span> — Süd, Ost-West etc.
          beeinflussen den Ertrag
          <br />
          <span style={S.accent}>Saisonale Schwankungen</span> — Eigenverbrauch
          im Winter deutlich höher als im Sommer
          <br />
          <span style={S.accent}>Förderung</span> — regionale Förderprogramme
          nicht einberechnet
          <br />
          <br />
          <span style={S.muted}>
            Abweichungen von ±5 % zum tatsächlichen Eigenverbrauch sind möglich.
            Für eine exakte Prognose empfehlen wir ein Angebot vom Fachbetrieb.
          </span>
        </div>

        <div style={S.footer}>
          <Link href="/impressum" style={S.footerLink}>
            Impressum
          </Link>
          <Link href="/datenschutz" style={S.footerLink}>
            Datenschutz
          </Link>
          <Link href="/" style={S.footerLink}>
            Solar Check
          </Link>
        </div>
      </div>
    </div>
  );
}
