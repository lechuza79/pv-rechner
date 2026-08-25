// Shared FAQ content for the visible on-page FAQ blocks AND their FAQPage
// JSON-LD. Both are rendered by <Faq> from the SAME data, so structured data
// can never drift from what the user actually sees.
//
// `a` is plain text and feeds the JSON-LD verbatim (schema.org wants plain
// text). Visible answers hyperlink the phrases listed in `links` (first
// occurrence only), and each entry can carry one contextual primary `cta` so a
// reader lands one click from the relevant tool.
//
// Cost/feed-in figures are derived from the same models the calculators use and
// the year is evaluated at render time — nothing here goes stale on rollover.
// Never hardcode a year or a euro figure below.
import { estimateCost, BATTERY_LIFETIME_YEARS } from "./calc";
import { calcBalkon, type BalkonInputs } from "./balkon";
import { BALKON_RECHT, DEFAULT_BALKON_CONFIG, type BalkonSetId } from "./balkon-config";
import { MASTR_KATEGORIE, SOLARPAKET_ENTFALLEN } from "./balkon-anmeldung";
import { FEED_IN_YEARS, PERSONEN } from "./constants";
import { DEFAULT_FEED_IN, fmtCt, type FeedInRates } from "./feedin-config";
import { DEFAULT_PRICES } from "./prices-config";
import { TILT_OPTIMUM, tiltPct } from "./tilt-config";
import { bioTreppeStufenText, gmodgStandSatz, GMODG_RECHTSSTAND } from "./greengas-config";
import {
  EEG_REFORM_STAND, eegDatum, eegReformStandLabel, eegStaffelSatz, eegVerfahrenSatz,
} from "./eeg-reform-config";
import type { PriceConfig } from "./prices-config";
import { DEFAULT_HEATPUMP_CONFIG } from "./heatpump-config";

export interface FaqLink {
  /** Exact phrase inside `a`; its first occurrence becomes a link. */
  phrase: string;
  href: string;
}
export interface FaqCta {
  label: string;
  href: string;
}
export interface FaqEntry {
  q: string;
  /** Plain-text answer — feeds the JSON-LD and the visible body. */
  a: string;
  /** Phrases in `a` to hyperlink (explicit, so no false keyword matches). */
  links?: FaqLink[];
  /** Contextual primary action shown under the answer. */
  cta?: FaqCta;
}

const round1k = (n: number) => Math.round(n / 1000) * 1000;

/** FAQ for the homepage — the four PV basics that match the site title/intent. */
export function homeFaq(): FaqEntry[] {
  const year = new Date().getFullYear();
  const pvOnlyCost = round1k(estimateCost(10, 0));
  const storageAddon = round1k(estimateCost(10, 10) - estimateCost(10, 0));
  return [
    {
      q: `Lohnt sich Photovoltaik ${year}?`,
      a: "In den meisten Fällen ja. Eine typische 10-kWp-Anlage amortisiert sich bei aktuellen Strompreisen in etwa 9–12 Jahren und erwirtschaftet über 25 Jahre deutliche Rendite. Der genaue Zeitraum hängt von Eigenverbrauch, Strompreis und Anlagenkosten ab.",
      cta: { label: "Meine Anlage durchrechnen", href: "/photovoltaik-rechner" },
    },
    {
      q: "Wie lange dauert die Amortisation einer PV-Anlage?",
      a: "Je nach Anlagengröße, Speicher und Eigenverbrauchsquote liegt die Amortisation zwischen 8 und 14 Jahren. Höherer Eigenverbrauch verkürzt den Zeitraum deutlich — etwa durch einen Speicher, ein E-Auto oder eine Wärmepumpe, die den selbst erzeugten Strom im Haus hält.",
      links: [{ phrase: "Wärmepumpe", href: "/waermepumpe-rechner" }],
      cta: { label: "Amortisation berechnen", href: "/photovoltaik-rechner" },
    },
    {
      q: "Was kostet eine PV-Anlage mit Speicher?",
      a: `Eine 10-kWp-Anlage ohne Speicher kostet ca. ${pvOnlyCost.toLocaleString("de-DE")} €. Mit einem 10-kWh-Speicher kommen rund ${storageAddon.toLocaleString("de-DE")} € hinzu. Die tatsächlichen Kosten variieren je nach Anbieter und Region — regionale Förderprogramme können den Preis zusätzlich senken.`,
      links: [{ phrase: "regionale Förderprogramme", href: "/photovoltaik-foerderung" }],
      cta: { label: "Kosten für meine Anlage", href: "/photovoltaik-rechner" },
    },
    {
      q: `Wie hoch ist die Einspeisevergütung ${year}?`,
      a: `Die Einspeisevergütung für Anlagen bis 10 kWp liegt aktuell bei ca. ${DEFAULT_FEED_IN.teilUnder10.toLocaleString("de-DE")} ct/kWh. Sie ist für 20 Jahre ab Inbetriebnahme garantiert, sinkt aber für neue Anlagen kontinuierlich.`,
      cta: { label: "Alle aktuellen Werte ansehen", href: "/datenstand" },
    },
  ];
}

/** FAQ for the PV calculator page — substantive PV questions, each crosslinking
 *  to the tool that answers the next step. No operating instructions. */
export function pvRechnerFaq(): FaqEntry[] {
  return [
    {
      q: "Lohnt sich ein Speicher zur PV-Anlage?",
      a: "Ein Speicher erhöht den Eigenverbrauch deutlich: Statt Strom für wenige Cent einzuspeisen, nutzt du ihn abends und nachts selbst und sparst den vollen Strompreis. Ob sich das rechnet, hängt von Speicherpreis und Verbrauchsprofil ab. Im Rechner kannst du Speichergrößen direkt vergleichen und siehst den Effekt auf Amortisation und Rendite sofort.",
      links: [{ phrase: "Ob sich das rechnet", href: "/ratgeber/lohnt-sich-pv-mit-speicher" }],
      cta: { label: "Anlage mit Speicher rechnen", href: "/photovoltaik-rechner" },
    },
    {
      q: "Wie groß sollte meine PV-Anlage sein?",
      a: "Als Faustregel passt die Anlage zu deinem Jahresverbrauch und der Dachfläche — mehr Verbrauch durch Wärmepumpe oder E-Auto rechtfertigt eine größere Anlage. Wenn du unsicher bist, welche Größe zu Haushalt und Dach passt, führt dich die Empfehlung Schritt für Schritt zur optimalen Auslegung.",
      links: [{ phrase: "die Empfehlung", href: "/pv-bedarf-berechnen" }],
      cta: { label: "Passende Größe finden", href: "/pv-bedarf-berechnen" },
    },
    {
      q: "Lohnt sich Photovoltaik zusammen mit einer Wärmepumpe?",
      a: "Ja, die Kombination ist besonders wirtschaftlich: Die Wärmepumpe erhöht den Stromverbrauch und damit den Anteil, den du direkt aus der eigenen Anlage decken kannst. Das steigert den Eigenverbrauch und verkürzt die Amortisation beider Investitionen. Wie viel eine Wärmepumpe gegenüber Gas oder Öl spart, rechnet der Wärmepumpen-Rechner separat aus.",
      links: [{ phrase: "Wärmepumpen-Rechner", href: "/waermepumpe-rechner" }],
      cta: { label: "Wärmepumpe durchrechnen", href: "/waermepumpe-rechner" },
    },
    {
      q: "Welche Förderung gibt es für Photovoltaik?",
      a: "Neben der bundesweiten Einspeisevergütung und dem Wegfall der Mehrwertsteuer beim Kauf gibt es viele kommunale und Landes-Zuschüsse — oft für Speicher oder für die Anlage selbst. Welche Programme in deinem Bundesland und deiner Stadt gerade laufen, zeigt die Förder-Übersicht.",
      links: [{ phrase: "die Förder-Übersicht", href: "/photovoltaik-foerderung" }],
      cta: { label: "Förderung vor Ort finden", href: "/photovoltaik-foerderung" },
    },
    eegReform2027FaqEntry(),
  ];
}

// Ausnahme zur "keine hardcoded Jahre"-Regel: das ist ein konkreter, datierter
// Sachstand zu einem geplanten Gesetz (kein rollierender "aktuelles Jahr"-Wert).
// Der EEG-Wächter aktualisiert diesen Text bei einer Rechtsänderung mit —
// bei Beschluss/Verwerfung Antwort + Stand-Datum anpassen.
// ZUSTAND (Wächter-Gate Regel 1): Regierungsentwurf, im Kabinett beschlossen
// am 29.07.2026 — kein Gesetz. Nicht zu "beschlossen" verkürzen.
// EINE Quelle: dieselbe Antwort erscheint im PV-Rechner-FAQ und im FAQ des
// Einspeisevergütungs-Rechners — deshalb hier als geteilter Eintrag, nicht
// zweimal getippt (Systematik wie eegVerfahrenSatz()).
// Geteilte Kern-Sätze der Reform-Aussage — Oberflächen (FAQ-Eintrag unten,
// Reform-Karte im Tabellen-Ratgeber) KOMPONIEREN daraus, statt die Sätze
// abzutippen. Der Fakten-Check am 06.08.2026 fand genau solche handgetippten
// Zweitkopien; als Kopie überlebt ein Satz jede künftige Korrektur stumm.
export const EEG_REFORM_VORHABEN_SATZ =
  "Vorgesehen ist, die feste Einspeisevergütung für Neuanlagen ab 2027 zu beenden";
export function eegBestandsschutzSatz(): string {
  return `Für alle Anlagen, die bis Ende 2026 in Betrieb gehen, bleibt die Vergütung ${FEED_IN_YEARS} Jahre garantiert (Bestandsschutz)`;
}

function eegReform2027FaqEntry(): FaqEntry {
  return {
    q: "Fällt die Einspeisevergütung 2027 weg?",
    a: `Die Bundesregierung hat dazu am ${eegDatum(EEG_REFORM_STAND.kabinettBeschlussIso)} einen Gesetzentwurf beschlossen — ein Gesetz ist er damit noch nicht: Der Bundestag muss noch entscheiden, der Bundesrat ist am Verfahren beteiligt, und die Förderregeln brauchen zusätzlich die beihilferechtliche Genehmigung der EU-Kommission. ${EEG_REFORM_VORHABEN_SATZ}; für Anlagen unter 25 Kilowatt installierter Leistung soll es keine dauerhafte Förderung mehr geben, sondern eine befristete Starthilfe für die Direktvermarktung. Wichtig: ${eegBestandsschutzSatz()} — an ihrem Vergütungsanspruch ändert der Entwurf nichts. In welcher Form die Reform am Ende kommt, ist offen; maßgeblich ist die offizielle Gesetzeslage. (Stand: ${eegReformStandLabel()})`,
    links: [{ phrase: "Einspeisevergütung", href: "/datenstand" }],
    cta: { label: "Ratgeber: Lohnt sich PV ohne Einspeisevergütung?", href: "/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung" },
  };
}

// Geteilte Einspeisevergütungs-Einträge (EINE Quelle, Systematik wie
// eegReform2027FaqEntry): dieselbe geprüfte Antwort erscheint im FAQ des
// Einspeisevergütungs-Rechners UND im Tabellen-Ratgeber — nie zweimal tippen.

/** Kern-Satz zur Garantiedauer (§ 25 EEG, Wortlaut am 04.08.2026 geprüft,
 *  s. feedin-config) — geteilt zwischen FAQ und Ratgeber-Prosa. */
export function feedInGarantieSatz(): string {
  return `${FEED_IN_YEARS} Jahre ab Inbetriebnahme — bei der festen Einspeisevergütung verlängert sich die Zahlung sogar bis zum 31. Dezember des zwanzigsten Jahres (§ 25 EEG).`;
}

/** Kern-Satz zur halbjährlichen Degression (§ 49 EEG) — geteilt wie oben. */
export const FEEDIN_DEGRESSION_SATZ =
  "Das EEG senkt die Sätze für neu in Betrieb genommene Anlagen planmäßig um 1 % je Halbjahr, jeweils zum 1. Februar und zum 1. August (§ 49 EEG).";

/** Garantiedauer nach § 25 EEG (Wortlaut am 04.08.2026 geprüft, s. feedin-config). */
function feedInGarantieFaqEntry(): FaqEntry {
  return {
    q: "Wie lange ist die Einspeisevergütung garantiert?",
    a: `${feedInGarantieSatz()} Der Satz, mit dem eine Anlage in Betrieb geht, bleibt über die gesamte Laufzeit fest; die halbjährliche Absenkung betrifft nur Anlagen, die danach neu in Betrieb gehen. Nach dem Ende der Vergütung läuft die Ersparnis durch Eigenverbrauch weiter.`,
  };
}

/** Halbjährliche Degression nach § 49 EEG (fester Fahrplan, kein Einzelbeschluss). */
function feedInDegressionFaqEntry(): FaqEntry {
  return {
    q: "Warum sinkt die Einspeisevergütung alle sechs Monate?",
    a: `${FEEDIN_DEGRESSION_SATZ} Das ist ein fester Fahrplan, kein politischer Einzelbeschluss. Wer früher in Betrieb nimmt, sichert sich den höheren Satz für ${FEED_IN_YEARS} Jahre.`,
  };
}

/** Auslaufen nach 20 Jahren — geteilt zwischen dem Reform-Ratgeber und dem
 *  Tabellen-Ratgeber (Ü20-Suchintention „einspeisevergütung nach 20 jahren"). */
function feedInNach20JahrenFaqEntry(): FaqEntry {
  return {
    q: "Was passiert nach den 20 Jahren EEG-Vergütung?",
    a: "Die EEG-Vergütung endet nach 20 Jahren — das ist schon heute so und hat mit der geplanten Reform nichts zu tun. Danach fließt für eingespeisten Strom ohne neue Vermarktung nichts mehr, die Ersparnis durch Eigenverbrauch läuft aber unverändert weiter. Unser Rechner kalkuliert genau so: Vergütung nur 20 Jahre, Eigenverbrauch über die gesamte Laufzeit. Eine Anlage, die sich vor allem über Eigenverbrauch trägt, ist von diesem Auslaufen kaum abhängig.",
    cta: { label: "Methodik im Detail", href: "/methodik" },
  };
}

/** FAQ for the live PV simulation page. Every statement mirrors what the
 *  simulation actually does (weather-driven estimate, no real-plant metering) —
 *  verified against the SimulationPanel implementation, not assumed. */
export function pvSimulationFaq(): FaqEntry[] {
  return [
    {
      q: "Was zeigt die PV-Simulation?",
      a: "Die Simulation rechnet aus der aktuellen Wettervorhersage — Sonneneinstrahlung, Bewölkung und Temperatur an deinem Standort — aus, welche Leistung eine Photovoltaikanlage dort gerade liefern würde, und zeichnet den erwarteten Tagesverlauf. Die Anlagengröße kannst du umschalten und ein Haushaltsprofil danebenlegen, um Erzeugung und Verbrauch zu vergleichen.",
      cta: { label: "Rentabilität komplett durchrechnen", href: "/photovoltaik-rechner" },
    },
    {
      q: "Ist das eine Messung echter Anlagen?",
      a: "Nein — es ist eine Schätzung aus Wetterdaten (Open-Meteo, basierend auf DWD- und NOAA-Modellen), keine Messung einer realen Anlage. Ausrichtung, Neigung, Verschattung und Verschmutzung eines echten Dachs verschieben das Ergebnis. Die Simulation zeigt die Größenordnung und das Tagesprofil, nicht den Zählerstand.",
    },
    {
      q: "Warum schwankt die angezeigte Leistung so stark?",
      a: "Die Bewölkung dominiert: Schon ein dichtes Wolkenfeld drückt die Leistung einer PV-Anlage auf einen Bruchteil des wolkenlosen Werts. Dazu kommt der Sonnenstand — morgens und abends steht weniger Einstrahlung zur Verfügung als mittags, im Winter weniger als im Sommer.",
    },
    {
      q: "Was sagt die Simulation über die Rentabilität aus?",
      a: "Wenig — sie zeigt die Momentleistung, nicht die Wirtschaftlichkeit. Ob sich eine Anlage lohnt, hängt von Jahresertrag, Eigenverbrauch, Kosten und Strompreis ab. Dafür gibt es den Photovoltaik-Rechner mit Amortisation, Rendite und Szenarien, und die Empfehlung, wenn du noch keine Anlagengröße im Kopf hast.",
      links: [
        { phrase: "Photovoltaik-Rechner", href: "/photovoltaik-rechner" },
        { phrase: "die Empfehlung", href: "/pv-bedarf-berechnen" },
      ],
      cta: { label: "Lohnt sich PV für mich?", href: "/photovoltaik-rechner" },
    },
  ];
}

/** FAQ for the "Lohnt sich PV mit Speicher?" guide page. Figures derive from
 *  the same models the calculator uses (estimateCost, battery lifetime) so the
 *  answers can never drift from what the tool computes. Pass the live PriceConfig
 *  when available so FAQ figures match the example table on the same page. */
export function pvSpeicherFaq(prices?: PriceConfig): FaqEntry[] {
  // Exact delta (already 500-€-rounded via estimateCost) — must match the
  // example table on /lohnt-sich-pv-mit-speicher, so no extra 1k-rounding here.
  const storageAddon = estimateCost(10, 10, prices) - estimateCost(10, 0, prices);
  return [
    {
      q: "Wie groß sollte ein Stromspeicher sein?",
      // Diese Antwort nennt bewusst KEINE typische Größe mehr.
      //
      // Bis zum 25.08.2026 stand hier „für ein Einfamilienhaus sind 5–10 kWh
      // typisch" plus „deshalb lohnt oft auch die nächstgrößere Stufe". Beides
      // widersprach dem eigenen Werkzeug: Die Empfehlung gibt einem Haushalt mit
      // ein bis drei Personen ohne Wärmepumpe und ohne E-Auto GAR KEINEN
      // Speicher, weil sie ihn an den Jahresverbrauch koppelt — 5 kWh erreicht
      // sie dort erst ab vier Personen. Ein Leser bekam also eine Faustregel
      // genannt und wurde dann zu einem Rechner geschickt, der ihr widerspricht.
      //
      // Entscheidung des Betreibers am 25.08.2026: „das werkzeug muss immer
      // führend sein". Wo Text und Rechnung auseinandergehen, weicht der Text —
      // festgehalten von `lib/__tests__/faq-gegen-werkzeug.test.ts`.
      a: "Das hängt weniger am Haus als am Verbrauch: Ein Speicher lohnt sich erst, wenn abends und nachts genug Strom gebraucht wird, um ihn wieder zu leeren. Bei einem kleinen Haushalt ohne Wärmepumpe und ohne E-Auto ist das oft gar nicht der Fall — dann rechnet sich die Anlage ohne Speicher besser. Kommen große Verbraucher dazu, ändert sich das schnell. Ab einer gewissen Größe bringt mehr Kapazität ohnehin kaum noch etwas: Der Speicher ist im Sommer voll, und im Winter fehlt die Sonne zum Laden. Die Empfehlung rechnet die wirtschaftlich sinnvolle Kombination aus Anlagengröße und Speicher für deinen Haushalt durch.",
      links: [{ phrase: "Die Empfehlung", href: "/pv-bedarf-berechnen" }],
      cta: { label: "Passende Größe finden", href: "/pv-bedarf-berechnen" },
    },
    {
      q: "Wie lange hält ein Batteriespeicher?",
      // „${BATTERY_LIFETIME_YEARS}–15 Jahre" ergab wörtlich „15–15 Jahre", seit die
      // Lebensdauer auf 15 Jahre steht — auch im FAQ-Auszeichnungscode für Google.
      // Eine Spanne, deren eine Hälfte aus einer Konstante kommt und deren andere
      // getippt ist, wird beim nächsten Wert still unsinnig.
      a: `Moderne Heimspeicher (LFP-Zellen) halten nach Garantie und Zyklenlebensdauer etwa ${BATTERY_LIFETIME_YEARS} Jahre. In unserer Wirtschaftlichkeitsrechnung kalkulieren wir deshalb konservativ einen Akku-Tausch nach ${BATTERY_LIFETIME_YEARS} Jahren mit ein — zu dann voraussichtlich niedrigeren Preisen, weil Speicherpreise seit Jahren fallen. Ohne diesen Posten würde jede Speichergröße scheinbar rentabel.`,
      cta: { label: "Methodik im Detail", href: "/methodik" },
    },
    {
      q: "Was kostet ein Stromspeicher?",
      a: `Als Teil einer neuen PV-Anlage kostet ein 10-kWh-Speicher aktuell rund ${storageAddon.toLocaleString("de-DE")} € zusätzlich (Installation inklusive). Die Preise sind in den letzten Jahren stark gefallen — genau das hat die Speicherfrage gedreht: Bei den früheren Preisen rechnete sich ein Speicher selten, heute meistens. Die aktuellen Marktpreise mit Stand und Quelle findest du auf der Datenstand-Seite.`,
      links: [{ phrase: "Datenstand-Seite", href: "/datenstand" }],
      cta: { label: "Anlage mit Speicher rechnen", href: "/photovoltaik-rechner" },
    },
    {
      q: "Lohnt sich ein Speicher zum Nachrüsten?",
      a: "Das hängt vor allem von der Einspeisevergütung deiner Anlage ab. Bei Bestandsanlagen mit alter, hoher Vergütung (teils über 30 ct/kWh) lohnt ein Speicher meist nicht — dort bringt Einspeisen mehr als Selbstverbrauchen. Bei neueren Anlagen mit niedriger Vergütung gilt dieselbe Rechnung wie beim Neukauf, allerdings ist die Nachrüstung pro Kilowattstunde etwas teurer, weil die Installation separat anfällt.",
      cta: { label: "Speicher-Effekt durchrechnen", href: "/photovoltaik-rechner" },
    },
    {
      q: "Kann ich mit einem Speicher komplett autark werden?",
      a: "Praktisch nein. Auch mit großem Speicher sättigt die Autarkie bei rund 90 Prozent: Ein Hausspeicher überbrückt gut einen Tag, aber keinen dunklen Winter — im Dezember liefert selbst eine große Anlage nur einen Bruchteil ihres Sommerertrags. Realistisch sind ohne Speicher meist 25–35 Prozent Autarkie, mit Speicher 50–80 Prozent je nach Anlagen- und Speichergröße.",
      cta: { label: "Autarkie für meinen Haushalt berechnen", href: "/photovoltaik-rechner" },
    },
    {
      q: "Gibt es Förderung für Batteriespeicher?",
      a: "Bundesweit gilt: Beim Kauf einer PV-Anlage mit Speicher entfällt die Mehrwertsteuer (Nullsteuersatz). Zusätzlich fördern einzelne Bundesländer und Kommunen Speicher mit Zuschüssen — die Programme wechseln häufig und sind oft schnell ausgeschöpft. Welche Förderung an deinem Ort gerade läuft, zeigt die Förder-Übersicht.",
      links: [{ phrase: "die Förder-Übersicht", href: "/photovoltaik-foerderung" }],
      cta: { label: "Förderung vor Ort finden", href: "/photovoltaik-foerderung" },
    },
  ];
}

/** FAQ for the "Lohnt sich PV ohne Einspeisevergütung?" guide page.
 *
 *  Ausnahme zur "keine hardcoded Jahre"-Regel: die EEG-Reform-Antworten sind
 *  datierte Sachstände zu einem LAUFENDEN Gesetzgebungsverfahren (Stand: 30.
 *  Juli 2026 — Regierungsentwurf, am 29.07.2026 im Kabinett beschlossen, aber
 *  kein Gesetz). Der EEG-Wächter aktualisiert diese Texte bei einer
 *  Rechtsänderung mit; bei Beschluss/Verwerfung Antworten + Stand-Datum
 *  anpassen. Konsistent halten mit der Reform-Notiz im Rechner (rechner.tsx),
 *  pvRechnerFaq oben, dem Sachstands-Block im Ratgeber und der 2027-Marke in
 *  ZubauWidget.tsx.
 *
 *  ZWEI BELEGEBENEN, nicht vermischen (Wächter-Gate Regel 1 + 2):
 *   · Kabinettsebene, amtlich belegt (BMWE-Pressemitteilung + bundesregierung.de
 *     vom 29.07.2026): Ende der festen Einspeisevergütung für Neuanlagen, keine
 *     dauerhafte Förderung unter 25 kW, vierjähriger Direktvermarktungsbonus als
 *     Starthilfe, 50-%-Grenze für die Einspeiseleistung, Bestandsschutz.
 *   · Detailwerte aus dem Volltext der Kabinettsfassung (seit 04.08.2026
 *     geprüft, Volltext im Repo): Übergangszahlung 36 Monate mit 1 ct Abschlag
 *     (§ 25 Abs. 2, § 53 Abs. 1), Staffelung 2027/2028/2029–2030 auf 50/25/7 kW
 *     (§ 21 Abs. 1 S. 1 Nr. 1), Bonus 1,5 ct/kWh für längstens 48 Monate
 *     (§ 50c), Einspeisegrenze für Gebäudeanlagen unter 100 kW (§ 9 Abs. 2b).
 *   Detailwerte bleiben Entwurfswerte und werden nie als Beschluss beschriftet —
 *   beschlossen ist der ENTWURF, nicht das Gesetz. */
export function pvOhneEinspeisungFaq(prices?: PriceConfig): FaqEntry[] {
  const feedInCt = DEFAULT_FEED_IN.teilUnder10.toLocaleString("de-DE");
  const strompreisCt = Math.round((prices?.electricityPrice ?? 0.31) * 100);
  return [
    {
      q: "Lohnt sich eine PV-Anlage ohne Einspeisevergütung?",
      a: `Ja — wenn der Eigenverbrauch stimmt. Die Vergütung bringt aktuell nur ca. ${feedInCt} ct/kWh, selbst verbrauchter Strom spart dagegen den vollen Strompreis von rund ${strompreisCt} ct/kWh. Wer mit Speicher, Wärmepumpe oder E-Auto einen großen Teil des Solarstroms selbst nutzt, verdient das Geld ohnehin über den Eigenverbrauch — die Vergütung ist dann nur noch ein Bonus. Ohne nennenswerten Eigenverbrauch (z. B. reine Volleinspeisung) rechnet sich eine Anlage ohne Vergütung dagegen nicht.`,
      cta: { label: "Ohne Vergütung durchrechnen", href: "/photovoltaik-rechner" },
    },
    {
      q: "Fällt die Einspeisevergütung 2027 weg?",
      a: `Beschlossen ist bislang ein Gesetzentwurf, nicht das Gesetz. ${eegVerfahrenSatz()} Inhaltlich soll die feste Einspeisevergütung für Neuanlagen enden: Für Anlagen unter 25 Kilowatt installierter Leistung ist keine dauerhafte Förderung mehr vorgesehen, sondern eine Starthilfe in Form eines vierjährigen Bonus für die Direktvermarktung. Zusätzlich soll die Einspeiseleistung neuer Gebäudeanlagen unter 100 Kilowatt dauerhaft auf 50 Prozent ihrer installierten Leistung begrenzt werden; begründet wird das damit, Mittagsspitzen zu vermeiden und den Zubau von Speichern anzureizen. Für Anlagen, die bereits in Betrieb sind, gilt das nicht. Der Entwurf vom ${eegDatum(EEG_REFORM_STAND.entwurfIso)} nennt außerdem eine auf 36 Monate befristete Übergangszahlung, die 1 ct/kWh unter dem anzulegenden Wert liegt, und staffelt die Leistungsgrenze dafür: ${eegStaffelSatz()}. Diese Werte stehen im Gesetzentwurf und sind kein geltendes Recht; die Fördersätze stehen zusätzlich unter dem Vorbehalt der beihilferechtlichen Genehmigung durch die EU-Kommission. Ob und in welcher Form die Reform kommt, ist offen — verbindlich ist allein die offizielle Gesetzeslage. (Stand: ${eegReformStandLabel()})`,
      cta: { label: "Aktuelle Vergütung ansehen", href: "/datenstand" },
    },
    {
      q: "Bin ich betroffen, wenn meine Anlage schon läuft?",
      a: `Nein. Für Anlagen, die bis Ende 2026 in Betrieb gehen, gilt Bestandsschutz: Die bei Inbetriebnahme zugesagte Einspeisevergütung bleibt für die vollen 20 Jahre garantiert. Der am ${eegDatum(EEG_REFORM_STAND.kabinettBeschlussIso)} im Kabinett beschlossene Entwurf ordnet dafür ausdrücklich an, dass für Anlagen mit Inbetriebnahme vor 2027 das bisherige Recht weiter gilt; die neue Regel betrifft allein Neuanlagen. Auch die geplante 50-Prozent-Grenze für die Einspeiseleistung trifft laufende Anlagen nicht (Stand: ${eegReformStandLabel()}).`,
      cta: { label: "Meine Anlage nachrechnen", href: "/photovoltaik-rechner" },
    },
    feedInNach20JahrenFaqEntry(),
    {
      q: "Was ist Direktvermarktung — und geht das für kleine Anlagen?",
      a: "Bei der Direktvermarktung verkauft ein Dienstleister deinen Überschussstrom an der Strombörse; du erhältst den Marktpreis abzüglich einer Gebühr. Bisher ist das erst für größere Anlagen Pflicht und für kleine Hausanlagen wegen der Fixkosten selten attraktiv. Sollte die geplante Reform kommen, dürfte sich dieser Markt für Kleinanlagen entwickeln — seriös beziffern lassen sich die künftigen Erlöse heute aber nicht. Unsere Beispielrechnung setzt sie deshalb konservativ mit null an.",
      cta: { label: "Konservativ durchrechnen", href: "/photovoltaik-rechner" },
    },
    {
      q: "Sollte ich meine Anlage noch 2026 in Betrieb nehmen?",
      a: "Wer ohnehin eine Anlage plant, sichert sich mit einer Inbetriebnahme bis Ende 2026 die aktuelle Einspeisevergütung für 20 Jahre — das ist der greifbare Vorteil des Bestandsschutzes. Ein Grund zur Panik ist die Reform aber nicht: Eine passend dimensionierte Anlage mit hohem Eigenverbrauch rechnet sich auch ohne Vergütung. Wichtig ist eine realistische Rechnung für den eigenen Haushalt, keine Torschluss-Entscheidung. Das ist eine allgemeine Einordnung, keine individuelle Beratung.",
      links: [{ phrase: "hohem Eigenverbrauch", href: "/ratgeber/lohnt-sich-pv-mit-speicher" }],
      cta: { label: "Meinen Fall durchrechnen", href: "/photovoltaik-rechner" },
    },
  ];
}

/** FAQ for the heat-pump funding guide (/ratgeber/waermepumpe-foerderung-2026).
 *  All rates/caps come from the geprüfte BEG config (KfW Merkblatt 458) — never
 *  hardcode a percentage or euro figure here. */
export function waermepumpeFoerderungFaq(): FaqEntry[] {
  const c = DEFAULT_HEATPUMP_CONFIG;
  const pct = (r: number) => `${Math.round(r * 100)} %`;
  const grund = pct(c.begGrundfoerderung);
  const klima = pct(c.begKlimaBonus);
  const staffel = c.begEinkommensStaffel;
  const einkommenGrenze = staffel[staffel.length - 1].maxIncome.toLocaleString("de-DE");
  const maxZuschuss = Math.round(c.begMaxCap * c.begMaxRateLowIncome).toLocaleString("de-DE");
  const capKosten = c.begMaxCap.toLocaleString("de-DE");
  const familie = c.begFamilienzuschlag.toLocaleString("de-DE");
  return [
    {
      q: "Wie viel Förderung gibt es für eine Wärmepumpe?",
      a: `Für den Heizungstausch im Bestand gibt es eine Grundförderung von ${grund} der Kosten — die bekommt jeder, auch Vermieter. Selbstnutzende Eigentümer können mit dem Klima-Geschwindigkeits-Bonus (+${klima}) und einem einkommensabhängigen Bonus auf bis zu ${pct(c.begMaxRateLowIncome)} kommen. Gefördert werden Kosten bis ${capKosten} € für die erste Wohneinheit, der maximale Zuschuss liegt damit bei ${maxZuschuss} €. Die genaue Summe für deinen Fall rechnet der Förder-Check aus.`,
      links: [{ phrase: "Förder-Check", href: "/waermepumpe-rechner" }],
      cta: { label: "Meine Förderung berechnen", href: "/waermepumpe-rechner" },
    },
    {
      q: "Bekomme ich Förderung für eine Wärmepumpe im Neubau?",
      a: "Nein — den BEG-Zuschuss gibt es nur für den Heizungstausch in einem bestehenden Gebäude. Im Neubau wird die Wärmepumpe nicht direkt bezuschusst; dort läuft die Förderung über zinsgünstige Kredite der KfW im Programm „Klimafreundlicher Neubau“, die das ganze Gebäude betreffen, nicht die einzelne Heizung.",
      cta: { label: "Wärmepumpe im Bestand rechnen", href: "/waermepumpe-rechner" },
    },
    {
      q: "Wer bekommt den Klima-Geschwindigkeits-Bonus?",
      a: `Den Klima-Bonus von ${klima} bekommen nur selbstnutzende Eigentümer, die eine noch funktionierende fossile Heizung ersetzen. Öl-, Kohle-, Gas-Etagen- und Nachtspeicherheizungen zählen unabhängig vom Alter. Zentrale Gas-, Holz- und Pelletheizungen zählen erst, wenn ihr Einbau mindestens 20 Jahre zurückliegt — das Baujahr steht auf dem Typenschild am Kessel. Vermieter bekommen diesen Bonus nicht. Ab dem 1. Februar 2027 soll der Bonus schrittweise sinken.`,
      cta: { label: "Klima-Bonus einrechnen", href: "/waermepumpe-rechner" },
    },
    {
      q: "Wie funktioniert der Einkommens-Bonus?",
      a: `Der Einkommens-Bonus richtet sich nach dem zu versteuernden Haushaltsjahreseinkommen: bis ${staffel[0].maxIncome.toLocaleString("de-DE")} € gibt es +${Math.round(staffel[0].rate * 100)} %, bis ${staffel[1].maxIncome.toLocaleString("de-DE")} € +${Math.round(staffel[1].rate * 100)} %, bis ${einkommenGrenze} € +${Math.round(staffel[2].rate * 100)} %. Er gilt nur für selbstnutzende Eigentümer. Maßgeblich ist das zu versteuernde Einkommen aus dem Steuerbescheid, nicht das Bruttogehalt — es liegt meist deutlich darunter.`,
      cta: { label: "Einkommens-Bonus berechnen", href: "/waermepumpe-rechner" },
    },
    {
      q: "Was bringt der Familienzuschlag?",
      a: `Lebt mindestens ein minderjähriges Kind im Haushalt, wird das anzusetzende Einkommen einmalig um ${familie} € gesenkt. Dadurch kann eine höhere Bonusstufe greifen — ein Haushalt knapp über einer Einkommensgrenze rutscht so in die nächstbessere Stufe. Die Anzahl der Kinder spielt keine Rolle: Es zählt nur, ob ein Kind im Haushalt lebt oder nicht.`,
      cta: { label: "Mit Kind durchrechnen", href: "/waermepumpe-rechner" },
    },
    {
      q: "Bekommen Vermieter Förderung für eine Wärmepumpe?",
      a: `Ja, aber nur die Grundförderung von ${grund}. Der Klima-Geschwindigkeits-Bonus und der Einkommens-Bonus sind an die Selbstnutzung gebunden und entfallen für vermietete Objekte. Für ein selbst bewohntes Haus mit alter Ölheizung und niedrigem Einkommen kann die Förderung dagegen bis ${pct(c.begMaxRateLowIncome)} erreichen.`,
      cta: { label: "Förderung vergleichen", href: "/waermepumpe-rechner" },
    },
    {
      q: "Ich kenne das Alter meiner Gasheizung nicht — bekomme ich den Klima-Bonus?",
      a: "Bei Öl-, Kohle-, Gas-Etagen- und Nachtspeicherheizungen ist der Klima-Bonus unabhängig vom Alter sicher. Bei zentralen Gas-, Holz- und Pelletheizungen hängt er an der 20-Jahre-Grenze. Das Baujahr steht auf dem Typenschild am Heizkessel oder in den Unterlagen des Schornsteinfegers. Solange das Alter unklar ist, solltest du den Bonus vorsichtshalber nicht fest einplanen — verbindlich ist am Ende der Zuschussbescheid der KfW.",
      cta: { label: "Beide Fälle durchrechnen", href: "/waermepumpe-rechner" },
    },
  ];
}

/** FAQ für den Ratgeber „Gasheizung oder Wärmepumpe" (GModG-Grüngas-Pflicht). */
export function gasheizungWaermepumpeFaq(): FaqEntry[] {
  const HP = DEFAULT_HEATPUMP_CONFIG;
  const pct = (r: number) => `${Math.round(r * 100)} %`;
  const eur = (n: number) => `${n.toLocaleString("de-DE")} €`;
  return [
    {
      q: `Darf ich ${new Date().getFullYear()} noch eine neue Gasheizung einbauen?`,
      a: "Ja. Das Gebäudemodernisierungsgesetz (GModG) hebt die 65-Prozent-Erneuerbaren-Pflicht auf und lässt neue Gasheizungen wieder grundsätzlich zu. Die Anschaffung ist günstiger als eine Wärmepumpe — aber ab 2029 greift die Grüngas-Pflicht, die den Gasbetrieb Jahr für Jahr teurer macht.",
      links: [{ phrase: "Wärmepumpe", href: "/waermepumpe-rechner" }],
    },
    {
      q: "Was ist die Grüngas-Pflicht?",
      a: `Die Bio-Treppe (§ 43 GModG) gilt für Heizungen für Gas, Heizöl oder Flüssiggas, die nach dem ${GMODG_RECHTSSTAND.inKraftSeit} neu eingebaut werden — im Bestand wie im Neubau (dort für Gebäude, die bis zum ${GMODG_RECHTSSTAND.neubauBioTreppeBis} errichtet werden). Wer eine solche Heizung betreibt, muss ab 2029 einen steigenden Anteil klimafreundlicher Brennstoffe beimischen. Das Gesetz nennt vier Stufen: ${bioTreppeStufenText("Prozent")}. Eine 100-Prozent-Stufe steht dort nicht; dass Heizungsbrennstoffe ab 2045 vollständig klimaneutral sein sollen, folgt aus einer eigenen Ankündigung des Gesetzes (§ 42a GModG), für die ein gesondertes Quotengesetz erst noch kommen muss. Anrechenbar sind neben Biomethan auch Bioheizöl, biogenes Flüssiggas sowie grüner, blauer, orangener oder türkiser Wasserstoff und daraus hergestellte Derivate. Biomethan kostet rund doppelt so viel wie Erdgas, deshalb steigt der Gaspreis deutlich stärker als durch die normale Teuerung.`,
    },
    {
      q: "Gilt die Grüngas-Pflicht auch im Neubau?",
      a: `Ja, mit einer Frist. Der Paragraf zur Beimischpflicht steht zwar im Kapitel über bestehende Gebäude und beschreibt dort den Einbau in ein bestehendes Gebäude — für neu errichtete Gebäude verweist das Gesetz aber ausdrücklich auf dieselben Vorgaben (§ 10 Absatz 2 Nummer 3 GModG: „die Maßgaben der §§ 42 bis 45 entsprechend"). Die Gesetzesbegründung sagt es wörtlich: Diese Maßgaben seien „für neu zu errichtende Gebäude nach § 10 Absatz 2 Nummer 3 einzuhalten" (Bundestags-Drucksache 21/6278, Seite 96). Wer heute neu baut und sich für Gas, Heizöl oder Flüssiggas entscheidet, hat also dieselbe Treppe vor sich. Die Frist: Das gilt für Gebäude, die bis zum ${GMODG_RECHTSSTAND.neubauBioTreppeBis} errichtet werden — diese Grenze steht nicht im Gesetzestext selbst, sondern folgt daraus, dass zum ${GMODG_RECHTSSTAND.neubauNullemissionAb} eine strengere Regel an ihre Stelle tritt; sie wird in der Gesetzesbegründung ausdrücklich so genannt (Seite 125). Ob dabei das Datum des Bauantrags oder der Fertigstellung zählt, sagt das Gesetz nicht. Ab dem ${GMODG_RECHTSSTAND.neubauNullemissionAb} muss dann grundsätzlich jeder Neubau ein Nullemissionsgebäude sein und darf am Standort keine CO₂-Emissionen aus fossilen Brennstoffen mehr verursachen. Und schon ab dem ${GMODG_RECHTSSTAND.neubauReferenzAb} wird der Effizienznachweis gegen ein neu gefasstes Vergleichsgebäude geführt: Es rechnet mit einem technologieneutralen Wärmeerzeuger, dem das Gesetz einen Primärenergiefaktor von 0,75 zuweist (ab 2030: 0,70) — Erdgas trägt dagegen den Faktor 1,1. Ein Neubau mit reiner Gasheizung liegt damit rechnerisch über dem Vergleichswert und muss den Abstand an anderer Stelle ausgleichen, etwa über besseren Wärmeschutz oder eigene erneuerbare Erzeugung.`,
    },
    {
      q: "Gilt die Grüngas-Pflicht auch für meine bestehende Gasheizung?",
      a: `Die Bio-Treppe nicht — sie erfasst nur Heizungen, die nach dem ${GMODG_RECHTSSTAND.inKraftSeit} neu eingebaut werden. Ganz verschont bleiben Bestandsanlagen aber voraussichtlich nicht: Dasselbe Gesetz kündigt in § 42a GModG eine Grüngas- und Grünheizölquote an. Ein eigenes Gesetz — vorzulegen bis zum ${GMODG_RECHTSSTAND.quoteGesetzBis} — soll die Anbieter von Gas, Heizöl und Flüssiggas verpflichten, ihre Brennstoffe bis 2045 vollständig auf klimaneutrale umzustellen. Diese Quote setzt beim Brennstoff an, nicht bei der Heizung, und wirkt damit auch auf ältere Anlagen. Wie hoch sie zu Beginn ausfällt, ist noch offen: Die Gesetzesbegründung geht von einem Start im Jahr 2028 mit zunächst bis zu einem Prozent aus, im Gesetzestext steht diese Zahl nicht. Unsere Rechnung bildet deshalb nur die Bio-Treppe für neue Heizungen ab.`,
    },
    {
      q: "Wie viel teurer wird Gas dadurch?",
      a: "Der Gaspreis je Kilowattstunde steigt laut IW-Report von rund 11 Cent (2026) auf etwa 20 Cent (2040) — annähernd eine Verdopplung. Für einen typischen Haushalt mit rund 10.000 Kilowattstunden Verbrauch sind das etwa 1.080 Euro (2026) und 1.950 Euro (2040); ein größerer, unsanierter Altbau wie im Chart oben verbraucht mehr und zahlt entsprechend mehr. Der vom IW für 2045 gerechnete Wert von rund 24 Cent (etwa 2.370 Euro im Jahr) liegt jenseits der gesetzlichen Stufen: Er unterstellt eine vollständig klimaneutrale Versorgung, die noch in einem eigenen Gesetz geregelt werden muss. Neben der Beimischung treiben steigende Gasnetzentgelte den Preis, weil immer weniger Haushalte am Gasnetz hängen und die Fixkosten auf weniger Schultern verteilt werden.",
    },
    {
      q: "Geht eine Wärmepumpe auch im unsanierten Altbau?",
      a: "Ja. Die verbreitete Annahme, im Altbau brauche man erst eine Vollsanierung, stimmt so pauschal nicht. Eine Luft-Wasser-Wärmepumpe arbeitet auch bei höheren Vorlauftemperaturen — nur mit etwas schlechterer Arbeitszahl, also höherem Stromverbrauch. Weil die Gasheizung durch die Grüngas-Pflicht so stark teurer wird, liegt die Wärmepumpe in unserer Modellrechnung auch im unsanierten Haus über 20 Jahre vorn — wie deutlich, hängt an Heizlast, Dämmung und Strompreis. Größere Heizkörper oder eine Teilsanierung verbessern die Arbeitszahl zusätzlich.",
      cta: { label: "Für mein Haus rechnen", href: "/waermepumpe-rechner" },
    },
    {
      q: "Lohnt sich die Wärmepumpe trotz höherer Anschaffung?",
      // Die Spanne kommt aus der Config, nicht aus dem Kopf. Vorher stand hier
      // „deckt oft 50 bis 70 Prozent" — unten zu hoch (ein Vermieter bekommt die
      // Grundförderung von 30 %, ein Selbstnutzer mit Klimabonus 46 %) und oben
      // zu niedrig (mit Einkommensbonus sind es bis zu 80 %). Dazu ein falscher
      // Nenner: Die Sätze gelten den förderfähigen Kosten, die bei begMaxCap
      // gedeckelt sind, nicht der ganzen Investition. Die Nachbarantwort nannte
      // längst die richtigen Werte — zwei Zahlen für dieselbe Förderung, beide
      // im FAQPage-JSON-LD. Geprüft am 25.08.2026 gegen das KfW-Merkblatt 458,
      // Stand 07/2026, S. 3 f. (docs/quellen/).
      a: `In den meisten Fällen ja. Die Wärmepumpe kostet in der Anschaffung mehr, aber die BEG-Förderung übernimmt je nach Selbstnutzung, Alter der alten Heizung und Einkommen ${pct(HP.begGrundfoerderung)} bis ${pct(HP.begMaxRateLowIncome)} der förderfähigen Kosten, und die laufenden Kosten liegen deutlich unter denen einer Gasheizung mit Grüngas-Pflicht. Gefördert wird dabei höchstens bis ${eur(HP.begMaxCap)}. Wie viel für dein Haus zusammenkommt, rechnet der Wärmepumpen-Rechner aus.`,
      links: [{ phrase: "BEG-Förderung", href: "/ratgeber/waermepumpe-foerderung-2026" }],
      cta: { label: "Ersparnis berechnen", href: "/waermepumpe-rechner" },
    },
    {
      q: "Ist die Grüngas-Pflicht schon beschlossen?",
      a: `Die Beimischpflicht (Bio-Treppe) steht als § 43 im GModG. ${gmodgStandSatz()} Beschlossen ist damit die Pflicht — nicht der Preis: Wie teuer Biomethan und Netzentgelte tatsächlich werden, ist eine Annahme des IW-Reports, ein plausibler Korridor und keine exakte Vorhersage. Noch offen ist außerdem die Quote für die Brennstoff-Anbieter, die das Gesetz nur ankündigt (§ 42a GModG) und die bis zum ${GMODG_RECHTSSTAND.quoteGesetzBis} in einem eigenen Gesetz geregelt werden soll.`,
    },
  ];
}

/** FAQ for the feed-in tariff calculator. Rates always come from the passed
 *  (live) config or DEFAULT_FEED_IN — never typed into the text. Legal
 *  statements mirror the vetted formulations from lib/feedin-config.ts and
 *  /datenstand; the EEG-2027 entry is the same shared entry the PV calculator
 *  shows (one source, see eegReform2027FaqEntry). */
export function einspeiseverguetungFaq(rates: FeedInRates = DEFAULT_FEED_IN): FaqEntry[] {
  const year = new Date().getFullYear();
  const strompreisCt = Math.round(DEFAULT_PRICES.electricityPrice * 100);
  const ct = fmtCt;
  return [
    {
      q: `Wie hoch ist die Einspeisevergütung ${year}?`,
      a: `Für neue Anlagen bis ${rates.thresholdKwp} kWp gibt es aktuell ${ct(rates.teilUnder10)} ct/kWh bei Teileinspeisung (Überschusseinspeisung) und ${ct(rates.vollUnder10)} ct/kWh bei Volleinspeisung. Für den Anlagenteil über ${rates.thresholdKwp} kWp sind es ${ct(rates.teilOver10)} bzw. ${ct(rates.vollOver10)} ct/kWh — bei größeren Anlagen ergibt sich daraus ein gewichteter Mischsatz, den der Rechner oben ausweist. Alle aktuellen Werte mit Stand-Datum stehen auf der Datenstand-Seite.`,
      links: [{ phrase: "Datenstand-Seite", href: "/datenstand" }],
    },
    feedInGarantieFaqEntry(),
    feedInDegressionFaqEntry(),
    {
      q: "Teileinspeisung oder Volleinspeisung — was lohnt sich?",
      a: `Für die meisten Haushalte die Teileinspeisung: Jede selbst verbrauchte Kilowattstunde spart den vollen Haushaltsstrompreis von rund ${strompreisCt} ct — deutlich mehr, als die Einspeisung einbringt. Die Volleinspeisung hat zwar den höheren Satz, verzichtet aber komplett auf diese Ersparnis; sie rechnet sich vor allem, wenn am Standort praktisch kein Strom verbraucht wird, etwa auf einer Scheune. Was bei deinen Zahlen herauskommt, zeigt der Photovoltaik-Rechner mit Amortisation und Rendite.`,
      links: [{ phrase: "Photovoltaik-Rechner", href: "/photovoltaik-rechner" }],
      cta: { label: "Komplette Rechnung mit Eigenverbrauch", href: "/photovoltaik-rechner" },
    },
    eegReform2027FaqEntry(),
  ];
}

/** FAQ für den Tabellen-Ratgeber (/einspeiseverguetung-tabelle). Historische
 *  Aussagen beschreiben die Datenmodule (feedin-archiv/-history), Rechtssätze
 *  sind ausschließlich die geteilten, geprüften Einträge — hier steht kein
 *  neuer Rechtssatz (Council-Regel, s. CLAUDE.md Faktenprüfung). */
export function einspeiseverguetungTabelleFaq(): FaqEntry[] {
  return [
    {
      q: "Wie hoch war die Einspeisevergütung für meine Anlage?",
      a: `Maßgeblich ist der Monat der Inbetriebnahme: Der damals gültige Satz bleibt ${FEED_IN_YEARS} Jahre fest — spätere Absenkungen betreffen nur Anlagen, die danach neu in Betrieb gingen. Für Inbetriebnahmen von April 2012 bis Juli 2022 steht der Satz in der Monatstabelle auf dieser Seite (amtliche Werte der Bundesnetzagentur), ab dem 30. Juli 2022 in der Halbjahres-Tabelle darüber. Wie viel deine Anlage damit über die Laufzeit einnimmt, rechnet der Einspeisevergütungs-Rechner aus. Für Anlagen von vor April 2012 galt eine andere Vergütungslogik mit mehreren Modellen — dort ist der Bescheid bzw. die Abrechnung des Netzbetreibers die verlässliche Quelle, ein pauschaler Tabellenwert wäre Scheingenauigkeit.`,
      links: [{ phrase: "Einspeisevergütungs-Rechner", href: "/einspeiseverguetung-rechner" }],
      cta: { label: "Vergütung für meine Anlage berechnen", href: "/einspeiseverguetung-rechner" },
    },
    feedInGarantieFaqEntry(),
    feedInDegressionFaqEntry(),
    feedInNach20JahrenFaqEntry(),
    eegReform2027FaqEntry(),
  ];
}

/** FAQ for the tilt/orientation page. Every figure is computed from
 *  lib/tilt-config.ts (documented PVGIS reference data) — never typed. */
export function neigungswinkelFaq(): FaqEntry[] {
  const randVerlust = Math.max(100 - tiltPct("sued", 25), 100 - tiltPct("sued", 50));
  return [
    {
      q: "Welcher Neigungswinkel ist optimal für Photovoltaik?",
      a: `In Deutschland liefert ein nach Süden ausgerichtetes Dach mit ${TILT_OPTIMUM.minAngle} bis ${TILT_OPTIMUM.maxAngle} Grad Neigung den höchsten Jahresertrag. Der Bereich um das Optimum ist aber breit: Zwischen 25 und 50 Grad verliert ein Süddach höchstens ${randVerlust} Prozent — die allermeisten Satteldächer liegen also von selbst nahe am Optimum. Ein „falscher" Winkel ist fast nie ein Grund, auf Photovoltaik zu verzichten.`,
      cta: { label: "Ertrag für dein Dach simulieren", href: "/pv-simulation" },
    },
    {
      q: "Wie viel Ertrag bringt ein Ost-West-Dach?",
      a: `Bei 30 Grad Neigung etwa ${tiltPct("ostwest", 30)} Prozent des optimalen Südertrags — je Dachseite. Dafür lassen sich meist beide Dachhälften belegen, also fast doppelt so viele Module. Und die Erzeugung verteilt sich auf Morgen- und Abendstunden, in denen im Haushalt mehr Strom gebraucht wird als mittags.`,
    },
    {
      q: "Lohnt sich Photovoltaik auf dem Flachdach?",
      a: `Ja. Flach liegende Module erreichen etwa ${tiltPct("sued", 0)} Prozent des Optimums — unabhängig von der Ausrichtung. In der Praxis werden Flachdach-Module aufgeständert, typisch mit 10 bis 15 Grad; nach Süden geneigt steigt der Ertrag damit auf rund ${tiltPct("sued", 15)} Prozent, eine Ost-West-Aufständerung nutzt die Fläche dichter aus. Bei der Planung zählt vor allem, dass sich die Modulreihen nicht gegenseitig verschatten.`,
    },
    {
      q: "Lohnt sich ein Norddach für Photovoltaik?",
      a: `Meist nur bei flacher Neigung: Bei 10 Grad erreicht ein Norddach noch ${tiltPct("nord", 10)} Prozent des Optimums, bei 45 Grad nur noch ${tiltPct("nord", 45)} Prozent. Als Faustregel gilt: erst die anderen Dachflächen belegen; ein steiles Norddach rechnet sich in der Regel nicht.`,
    },
  ];
}

/** FAQ for the balcony-solar calculator (/balkonkraftwerk/rechner).
 *
 *  Every figure is computed here from the SAME model the calculator runs — no
 *  typed euro amounts, so the FAQ can never drift from the tool above it. The
 *  reference case is documented in BALKON_FAQ_REFERENZ and named in the answers
 *  themselves, because a saving figure without its household is meaningless.
 *
 *  Legal statements come from BALKON_RECHT (lib/balkon-config.ts) — the same
 *  source the calculator result renders, never a second hand-typed copy. */
const BALKON_FAQ_REFERENZ = {
  /** 2-Personen-Haushalt — die häufigste Konstellation für Steckersolar. */
  personenIndex: 1,
  orientationId: "sued_gelaender" as const, // klassischer Balkon, senkrecht
  presenceId: "teils" as const,             // Homeoffice-Tage
} as const;

export function balkonFaq(): FaqEntry[] {
  const cfg = DEFAULT_BALKON_CONFIG;
  const haushaltKwh = PERSONEN[BALKON_FAQ_REFERENZ.personenIndex].verbrauch;
  const base = {
    presenceId: BALKON_FAQ_REFERENZ.presenceId,
    orientationId: BALKON_FAQ_REFERENZ.orientationId,
    haushaltKwh,
    specificYield: cfg.specificYield,
    monthlyYield: null,
    stromPrice: cfg.stromPrice,
  };
  const setById = (id: BalkonSetId) => cfg.sets.find(s => s.id === id)!;
  const standard = setById("duo");
  const maxSet = setById("max");
  const kleinstes = setById("single");

  // Ertrag derselben Standard-Größe in drei Ausrichtungen — der größte Hebel.
  const ertrag = (orientationId: BalkonInputs["orientationId"]) =>
    calcBalkon({ ...base, orientationId, setId: "duo", storageId: "none" }).annualYield;
  const ertragGelaender = ertrag("sued_gelaender");
  const ertragFlach = ertrag("sued_flach");
  const ertragOstWest = ertrag("ost_west");

  const standardResult = calcBalkon({ ...base, setId: "duo", storageId: "none" });
  const amort = standardResult.amortYears.toFixed(1).replace(".", ",");
  const speicherKlein = cfg.storage.find(s => s.id === "small")!;
  const speicherGross = cfg.storage.find(s => s.id === "large")!;
  const eur = (n: number) => n.toLocaleString("de-DE");

  return [
    {
      q: "Lohnt sich ein Balkonkraftwerk?",
      a: `In den meisten Fällen ja — Steckersolar amortisiert sich deutlich schneller als eine Dachanlage, weil die Anschaffung klein ist. Beispiel: Ein Zwei-Personen-Haushalt mit ${eur(haushaltKwh)} kWh Jahresverbrauch und einem Standard-Set senkrecht am Südbalkon spart rund ${eur(standardResult.savingPerYear)} € im Jahr; bei ${eur(standard.price)} € Anschaffung ist das nach etwa ${amort} Jahren wieder drin. Entscheidend sind zwei Dinge: wie die Module hängen und wie viel Strom tagsüber im Haushalt gebraucht wird.`,
      cta: { label: "Für deinen Haushalt rechnen", href: "/balkonkraftwerk/rechner" },
    },
    {
      q: "Wie viel Strom bringt ein Balkonkraftwerk mit 800 Watt im Jahr?",
      a: `Das hängt vor allem am Winkel. Dasselbe Standard-Set mit ${eur(standard.moduleWp)} Wp Modulen liefert im deutschen Mittel rund ${eur(ertragGelaender)} kWh, wenn die Module senkrecht am Südgeländer hängen — flach nach Süden aufgeständert sind es etwa ${eur(ertragFlach)} kWh, nach Osten oder Westen senkrecht nur noch rund ${eur(ertragOstWest)} kWh. Der Ertrag am eigenen Standort weicht davon ab; der Rechner holt ihn über die Postleitzahl aus den Sonnendaten der EU-Kommission.`,
      links: [{ phrase: "am Winkel", href: "/photovoltaik-neigungswinkel" }],
    },
    {
      q: "Was kostet ein Balkonkraftwerk?",
      a: `Ein einzelnes Modul mit kleinem Wechselrichter liegt bei etwa ${eur(kleinstes.price)} €, das gängige Set mit zwei Modulen bei rund ${eur(standard.price)} €, vier Module am selben 800-W-Wechselrichter bei etwa ${eur(maxSet.price)} € — jeweils inklusive Halterung. Ein Nachrüst-Speicher kostet zusätzlich rund ${eur(speicherKlein.price)} € (${speicherKlein.kwh.toLocaleString("de-DE")} kWh) bis ${eur(speicherGross.price)} € (${speicherGross.kwh.toLocaleString("de-DE")} kWh). ${BALKON_RECHT.nullsteuer}`,
    },
    {
      q: "Lohnt sich ein Speicher am Balkonkraftwerk?",
      a: `Oft nicht. Ein Speicher hebt den Eigenverbrauch, kostet aber mehr als das Set selbst und hält realistisch rund ${cfg.storageLifeYears} Jahre — er muss sich also in dieser Zeit rechnen, nicht erst über die Lebensdauer der Module. Unser Rechner empfiehlt einen Speicher deshalb nur, wenn er sich innerhalb von ${cfg.storageRecommendMaxPayback} Jahren selbst trägt, und schreibt sonst ausdrücklich hin, dass er sich nicht lohnt. Das ist vor allem bei hohem Verbrauch und viel ungenutztem Mittagsstrom der Fall.`,
      cta: { label: "Mit und ohne Speicher vergleichen", href: "/balkonkraftwerk/rechner" },
    },
    {
      q: "Wie viele Module darf ein Balkonkraftwerk haben?",
      a: `Der Wechselrichter darf höchstens ${standard.inverterW} Watt ins Netz speisen, die Module dürfen zusammen bis ${eur(maxSet.moduleWp)} Wp leisten — also deutlich mehr, als der Wechselrichter durchlässt. Das ist erlaubt und sinnvoll: Die Mittagsspitze wird gekappt, dafür kommt morgens und abends mehr an. Davon zu unterscheiden ist die VDE-Vornorm seit Dezember 2025: Sie sieht den normalen Schuko-Stecker nur bis ${eur(cfg.schukoMaxWp)} Wp vor, darüber eine spezielle Einspeisesteckdose. Diese Vornorm ist freiwillig und richtet sich an Hersteller, sie ist kein Gesetz.`,
    },
    {
      q: "Muss ich ein Balkonkraftwerk anmelden?",
      a: `${BALKON_RECHT.anmeldung} ${BALKON_RECHT.anmeldeFrist}`,
    },
    {
      q: "Darf ich als Mieter ein Balkonkraftwerk anbringen?",
      a: BALKON_RECHT.mieteEigentum,
    },
    {
      q: "Bekomme ich Geld für den eingespeisten Strom?",
      a: BALKON_RECHT.keineVerguetung + " Genau deshalb lohnt sich ein Balkonkraftwerk am meisten dort, wo tagsüber jemand zu Hause ist — und deshalb ist ein zu großes Set selten die beste Wahl.",
    },
  ];
}

/** FAQ for the registration guide (/balkonkraftwerk/ratgeber/anmelden).
 *
 *  Every legal statement here comes from BALKON_RECHT or is cited at its own
 *  source in lib/balkon-anmeldung.ts — all verified in full text on 16.08.2026
 *  and run through a six-checker council. Nothing about enforcement practice:
 *  neither "never prosecuted" nor "late registration is free of consequence"
 *  traces back to the regulator, and both circulate widely as fact. */
export function balkonAnmeldenFaq(): FaqEntry[] {
  return [
    {
      q: "Muss ich mein Balkonkraftwerk anmelden?",
      a: `Ja. ${BALKON_RECHT.anmeldung} ${BALKON_RECHT.anmeldeFrist}`,
      cta: { label: "Deine Frist ausrechnen", href: "/balkonkraftwerk/ratgeber/anmelden" },
    },
    {
      q: "Wie lange habe ich Zeit, ein Balkonkraftwerk anzumelden?",
      a: "Einen Monat ab Inbetriebnahme. Das ist nicht dasselbe wie 30 Tage: Die Frist endet an dem Tag des Folgemonats, der dieselbe Zahl trägt — bei Inbetriebnahme am 15. März also am 15. April. Fehlt dieser Tag im Folgemonat, endet sie mit dem Monatsletzten; wer am 31. Januar in Betrieb geht, hat bis zum 28. Februar Zeit. Registrieren am letzten Tag reicht noch, die Frist läuft erst mit Ablauf des Tages ab.",
    },
    {
      q: "Was muss ich beim Netzbetreiber melden?",
      a: `Nichts mehr. Seit dem Solarpaket im Mai 2024 entfällt ${SOLARPAKET_ENTFALLEN} — die Registrierung im Marktstammdatenregister genügt. Der Netzbetreiber erfährt von dort selbst, dass die Anlage existiert, und tauscht bei Bedarf den Zähler. Ältere Anleitungen im Netz nennen diesen Schritt noch; er ist überholt.`,
    },
    {
      q: "Unter welcher Kategorie melde ich ein Balkonkraftwerk an?",
      a: `Als „${MASTR_KATEGORIE}“. Das Wort Balkonkraftwerk kommt im Register nicht vor — wer danach sucht, findet nichts und landet leicht im langen Formular für Dachanlagen. Die steckerfertige Variante verlangt nur wenige Angaben zum Gerät.`,
    },
    {
      q: "Was passiert, wenn ich mein Balkonkraftwerk nicht anmelde?",
      a: "Wer die Frist versäumt, handelt nach Angabe der Bundesnetzagentur grundsätzlich ordnungswidrig — vorausgesetzt, es geschieht vorsätzlich oder fahrlässig. Im Netz kursiert dazu eine hohe Bußgeld-Summe; sie steht im Gesetz, ist aber die Obergrenze für alle Verstöße dieser Kategorie einschließlich gewerblicher Großanlagen und nicht der Betrag, der bei einem Balkongerät zu erwarten wäre. Bei bloßer Fahrlässigkeit halbiert sich der Rahmen, und auf ihren Seiten zum Steckersolar nennt die Bundesnetzagentur selbst keine Summe. Wie oft tatsächlich Bußgelder verhängt werden, ist nicht öffentlich belegt — weder in der einen noch in der anderen Richtung. Nachholen lässt sich die Registrierung jederzeit.",
    },
    {
      q: "Kostet die Anmeldung etwas?",
      a: "Nein. Die Registrierung im Marktstammdatenregister ist kostenlos und läuft online. Für ein Balkonkraftwerk sind es das eigene Benutzerkonto, die Erfassung als Betreiber und wenige Angaben zum Gerät. Anbieter, die dafür Geld verlangen, verkaufen dir einen Behördengang, den du in wenigen Minuten selbst machst.",
    },
    {
      q: "Wer muss anmelden — Mieter oder Vermieter?",
      a: "Der Betreiber, also wer die Anlage tatsächlich betreibt. Das ist nicht zwangsläufig der Eigentümer der Wohnung oder derjenige, der das Gerät bezahlt hat: Kauft der Vermieter das Set und nutzt der Mieter den Strom, muss der Mieter sich als Betreiber erfassen. Ob du das Gerät überhaupt anbringen darfst, ist eine andere Frage — dafür gilt seit 2024 die privilegierte Maßnahme.",
      links: [{ phrase: "privilegierte Maßnahme", href: "/balkonkraftwerk/rechner" }],
    },
    {
      q: "Muss ich ein Balkonkraftwerk beim Finanzamt anmelden?",
      a: `Für den Betrieb nicht: Ein Balkonkraftwerk ohne Einspeisevergütung erzeugt keine Einnahmen, die zu erklären wären. Beim Kauf spielt das Steuerrecht dagegen mit — ${BALKON_RECHT.nullsteuer}`,
    },
  ];
}

/** FAQ for the live electricity-mix page (/strommix-deutschland). Deliberately
 *  evergreen: no volatile share figures beyond what has held for years — the
 *  live chart above the FAQ is the current number. The nuclear phase-out date
 *  is a historical fact (allowed hardcode). */
export function strommixFaq(): FaqEntry[] {
  return [
    {
      q: "Wie setzt sich der deutsche Strommix aktuell zusammen?",
      a: "Übers Jahr gerechnet liefern erneuerbare Energien — Wind, Solar, Wasserkraft und Biomasse — mehr als die Hälfte des öffentlich erzeugten Stroms in Deutschland; der Rest kommt überwiegend aus Kohle- und Gaskraftwerken. Der Mix schwankt aber stark mit Wetter und Tageszeit: An sonnigen, windigen Tagen decken Erneuerbare zeitweise fast die gesamte Erzeugung, in windstillen Winternächten übernehmen die steuerbaren Kraftwerke. Die Live-Ansicht oben zeigt den Stand von jetzt gerade.",
    },
    {
      q: "Wann ist der Strom in Deutschland am saubersten?",
      a: "Typischerweise mittags, wenn die Solaranlagen ihre Tagesspitze erreichen — und generell an windigen Tagen. Wer flexible Verbraucher hat, etwa ein E-Auto oder einen Heimspeicher, lädt am klimafreundlichsten in den Mittagsstunden. Nachts ist der Strom im Schnitt am fossilsten, weil die Solarerzeugung komplett wegfällt.",
      links: [{ phrase: "Heimspeicher", href: "/photovoltaik-rechner" }],
    },
    {
      q: "Warum laufen nachts mehr Kohle- und Gaskraftwerke?",
      a: "Nachts liefert Solar nichts, und Wind weht nicht immer. Die Lücke zwischen erneuerbarer Erzeugung und Verbrauch füllen steuerbare Kraftwerke — vor allem Kohle und Gas —, dazu Stromimporte und zunehmend Batteriespeicher. Deshalb wechselt die Grafik nachts sichtbar von Grün zu Grau.",
    },
    {
      q: "Erzeugt Deutschland noch Atomstrom?",
      a: "Nein. Am 15. April 2023 gingen die letzten drei deutschen Kernkraftwerke vom Netz. Im Strommix taucht Kernenergie seitdem nur noch als rechnerischer Import auf: Ein Teil des importierten Stroms stammt aus Nachbarländern mit Kernkraftwerken, allen voran Frankreich. Wie groß dieser Anteil ist, zeigt unsere Auswertung zum Atomstrom-Import.",
      links: [{ phrase: "Atomstrom-Import", href: "/atomstrom-import" }],
    },
    {
      q: "Woher kommen die Daten zum Strommix?",
      a: "Von Energy-Charts, der Datenplattform des Fraunhofer-Instituts für Solare Energiesysteme (ISE). Gezeigt wird die öffentliche Nettostromerzeugung — also der Strom, der ins öffentliche Netz eingespeist wird — in 15-Minuten-Schritten. Die Daten stehen unter der offenen Lizenz CC BY 4.0.",
    },
  ];
}

/** FAQ for the storage guide (/balkonkraftwerk/ratgeber/mit-speicher).
 *
 *  Same rule as balkonFaq(): every figure is computed from the model the
 *  calculator runs, so a config change moves the guide with it. The reference
 *  case is BALKON_SPEICHER_REFERENZ and is named inside the answers — a payback
 *  figure without its household is meaningless.
 *
 *  The round-trip efficiency is the one number that carries this page. It is
 *  NOT a datasheet value: it is what the HTW Berlin assumes for exactly this
 *  device class (≤ 3 kWh, AC-coupled) — verified in full text on 19.08.2026,
 *  see docs/quellen/HTW-Stecker-Solar-Simulator-Dokumentation-V3.pdf, Kap. 4.2.
 *  Derivation and the counter-checks live in lib/balkon-config.ts. */
const BALKON_SPEICHER_REFERENZ = {
  personenIndex: 1,                          // 2-Personen-Haushalt
  setId: "duo" as const,                     // Standard-Set, 960 Wp
  orientationId: "sued_gelaender" as const,  // senkrecht am Südbalkon
  presenceId: "teils" as const,              // Homeoffice-Tage
} as const;

export function balkonSpeicherFaq(): FaqEntry[] {
  const cfg = DEFAULT_BALKON_CONFIG;
  const haushaltKwh = PERSONEN[BALKON_SPEICHER_REFERENZ.personenIndex].verbrauch;
  const base = {
    setId: BALKON_SPEICHER_REFERENZ.setId,
    orientationId: BALKON_SPEICHER_REFERENZ.orientationId,
    presenceId: BALKON_SPEICHER_REFERENZ.presenceId,
    haushaltKwh,
    specificYield: cfg.specificYield,
    monthlyYield: null,
    stromPrice: cfg.stromPrice,
  };
  const ohne = calcBalkon({ ...base, storageId: "none" });
  const klein = calcBalkon({ ...base, storageId: "small" });
  const gross = calcBalkon({ ...base, storageId: "large" });
  // Dasselbe am größten Set: Dort kippt die Antwort auf die Speichergröße, und
  // ohne diesen Fall widerspräche das FAQ der Empfehlung des Rechners.
  const maxGross = calcBalkon({ ...base, setId: "max", storageId: "large" });

  const eur = (n: number) => n.toLocaleString("de-DE");
  const jahre = (n: number) => (isFinite(n) ? n.toFixed(1).replace(".", ",") : "—");
  const kwh = (n: number) => Math.round(n).toLocaleString("de-DE");
  // Verlust je gespeicherter Kilowattstunde, in Wattstunden — aus derselben
  // Konstante, mit der die Simulation entlädt.
  const verlustWh = Math.round((1 - cfg.storageRoundtrip) * 1000);
  const prozentMehrPreis = Math.round((gross.storagePrice / klein.storagePrice - 1) * 100);
  const prozentMehrStrom = Math.round((gross.storageAddedKwh / klein.storageAddedKwh - 1) * 100);

  return [
    {
      q: "Lohnt sich ein Balkonkraftwerk mit Speicher?",
      a: `Das entscheidet eine einzige Größe: wie viel Strom mittags übrig bleibt. Ein Speicher erzeugt nichts, er kann nur verschieben. Beispiel: Ein Zwei-Personen-Haushalt mit ${eur(haushaltKwh)} kWh Jahresverbrauch und einem Standard-Set senkrecht am Südbalkon lässt rund ${kwh(ohne.feedInKwh)} kWh im Jahr ungenutzt ins Netz fließen. Ein Speicher mit ${cfg.storage.find(s => s.id === "small")!.kwh.toLocaleString("de-DE")} kWh holt davon ${kwh(klein.storageAddedKwh)} kWh zurück, kostet ${eur(klein.storagePrice)} € und ist damit nach etwa ${jahre(klein.storagePayback)} Jahren wieder drin — bei rund ${cfg.storageLifeYears} Jahren, die so ein Akku hält. Das trägt sich, aber ohne Reserve; in größeren Haushalten mit viel Tagverbrauch trägt es sich gar nicht.`,
      cta: { label: "Für deinen Haushalt rechnen", href: "/balkonkraftwerk/rechner" },
    },
    {
      q: "Lohnt sich ein Balkonkraftwerk ohne Speicher?",
      a: `Fast immer, und deutlich schneller. Dasselbe Set ohne Speicher spart im Beispiel rund ${eur(ohne.savingPerYear)} € im Jahr und hat sich bei ${eur(ohne.invest)} € Anschaffung nach etwa ${jahre(ohne.amortYears)} Jahren bezahlt gemacht. Das sind zwei getrennte Entscheidungen: Die Module rechnen sich für sich genommen, der Speicher muss sich zusätzlich rechnen — und tut das nicht automatisch, nur weil die Module es tun.`,
    },
    {
      q: "Ist ein größerer Balkonspeicher besser?",
      a: `Das hängt an der Modulfläche, nicht am Akku. Am Standard-Set mit zwei Modulen kostet der Sprung von ${cfg.storage.find(s => s.id === "small")!.kwh.toLocaleString("de-DE")} auf ${cfg.storage.find(s => s.id === "large")!.kwh.toLocaleString("de-DE")} kWh ${prozentMehrPreis} Prozent mehr und bringt nur ${prozentMehrStrom} Prozent mehr Strom — es entsteht schlicht nicht genug Überschuss, um den größeren Akku zu füllen. Über ${cfg.lifetimeYears} Jahre bleiben dort mit dem großen Speicher rund ${eur(gross.lifetimeSaving)} € übrig, mit dem kleinen ${eur(klein.lifetimeSaving)} € und ganz ohne ${eur(ohne.lifetimeSaving)} €; er ist also die schlechteste der drei Möglichkeiten. Mit vier Modulen kehrt sich das um: Dann fällt genug Überschuss an, der große Speicher trägt sich nach ${jahre(maxGross.storagePayback)} Jahren und liefert mit ${eur(maxGross.lifetimeSaving)} € das beste Ergebnis. Erst die Fläche, dann der Speicher.`,
    },
    {
      q: "Wie viel Strom geht in einem Balkonspeicher verloren?",
      a: `Rund ${verlustWh} Wattstunden je gespeicherter Kilowattstunde, also gut ${((1 - cfg.storageRoundtrip) * 100).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Prozent. Wir rechnen mit einem Wirkungsgrad von ${(cfg.storageRoundtrip * 100).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Prozent über den ganzen Umlauf — dem Wert, den die HTW Berlin für genau diese Geräteklasse in ihrem Stecker-Solar-Simulator ansetzt. Er ist eher zu freundlich als zu streng: Standby- und Regelungsverluste sind darin ausdrücklich nicht enthalten, und die laufen das ganze Jahr mit.`,
    },
    {
      q: "Wie lange hält ein Balkonspeicher?",
      a: `Realistisch rund ${cfg.storageLifeYears} Jahre — deutlich kürzer als die Module, die ${cfg.lifetimeYears} Jahre und mehr laufen. Daraus folgt die eigentliche Regel: Der Speicher muss sich innerhalb seiner eigenen Lebensdauer bezahlt machen, nicht innerhalb der Lebensdauer der Anlage. Unser Rechner empfiehlt einen Speicher deshalb nur, wenn er sich in ${cfg.storageRecommendMaxPayback} Jahren trägt, und schreibt sonst ausdrücklich hin, dass er sich nicht lohnt.`,
    },
    {
      q: "Für wen lohnt sich ein Balkonspeicher am ehesten?",
      a: "Für kleine Haushalte, die tagsüber wenig verbrauchen, und für große Module-Sets mit guter Ausrichtung — also überall dort, wo mittags viel Strom übrig bleibt. Das ist genau umgekehrt zu der Faustregel, die man für Dachanlagen hört: Wer viel zu Hause ist, verbraucht den Mittagsstrom bereits direkt und hat für den Speicher nichts mehr übrig. Und wer nur ein einzelnes Modul hängen hat, erzeugt gar keinen nennenswerten Überschuss.",
      cta: { label: "Set-Größe und Speicher durchrechnen", href: "/balkonkraftwerk/rechner" },
    },
    {
      q: "Fällt auf einen Balkonspeicher Mehrwertsteuer an?",
      a: BALKON_RECHT.nullsteuer,
    },
  ];
}
