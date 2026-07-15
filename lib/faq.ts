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
import { estimateCost } from "./calc";
import { DEFAULT_FEED_IN } from "./feedin-config";

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
    // Ausnahme zur "keine hardcoded Jahre"-Regel: das ist ein konkreter, datierter
    // Sachstand zu einem geplanten Gesetz (kein rollierender "aktuelles Jahr"-Wert).
    // Der EEG-Wächter aktualisiert diesen Text bei einer Rechtsänderung mit —
    // bei Beschluss/Verwerfung Antwort + Stand-Datum anpassen.
    {
      q: "Fällt die Einspeisevergütung 2027 weg?",
      a: "Geplant, aber noch nicht beschlossen: Ein Referentenentwurf des Bundeswirtschaftsministeriums sieht vor, die Einspeisevergütung für neue PV-Anlagen bis 25 kWp ab 2027 zu streichen (Stand: Juli 2026). Wichtig: Für alle Anlagen, die bis Ende 2026 in Betrieb gehen, bleibt die Vergütung 20 Jahre garantiert (Bestandsschutz) — sie sind von der geplanten Änderung nicht betroffen. Ob und in welcher Form die Reform kommt, ist offen; maßgeblich ist die offizielle Gesetzeslage.",
      cta: { label: "Aktuelle Vergütung ansehen", href: "/datenstand" },
    },
  ];
}
