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
import { DEFAULT_FEED_IN } from "./feedin-config";
import { bioTreppeStufenText, gmodgStandSatz, GMODG_RECHTSSTAND } from "./greengas-config";
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
    // Ausnahme zur "keine hardcoded Jahre"-Regel: das ist ein konkreter, datierter
    // Sachstand zu einem geplanten Gesetz (kein rollierender "aktuelles Jahr"-Wert).
    // Der EEG-Wächter aktualisiert diesen Text bei einer Rechtsänderung mit —
    // bei Beschluss/Verwerfung Antwort + Stand-Datum anpassen.
    {
      q: "Fällt die Einspeisevergütung 2027 weg?",
      a: "Geplant, aber noch nicht beschlossen: Ein Referentenentwurf des Bundeswirtschaftsministeriums sieht vor, die Einspeisevergütung für neue PV-Anlagen bis 25 kWp ab 2027 zu streichen (Stand: Juli 2026). Wichtig: Für alle Anlagen, die bis Ende 2026 in Betrieb gehen, bleibt die Vergütung 20 Jahre garantiert (Bestandsschutz) — sie sind von der geplanten Änderung nicht betroffen. Ob und in welcher Form die Reform kommt, ist offen; maßgeblich ist die offizielle Gesetzeslage.",
      links: [{ phrase: "Einspeisevergütung", href: "/datenstand" }],
      cta: { label: "Ratgeber: Lohnt sich PV ohne Einspeisevergütung?", href: "/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung" },
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
      a: "Für ein Einfamilienhaus sind 5–10 kWh typisch. Bei aktuellen Speicherpreisen ist der Aufpreis pro zusätzlicher Kilowattstunde klein, deshalb lohnt oft auch die nächstgrößere Stufe. Ab einer gewissen Größe bringt mehr Kapazität aber kaum noch etwas: Der Speicher ist im Sommer ohnehin voll, und im Winter fehlt die Sonne zum Laden. Die Empfehlung rechnet die wirtschaftlich sinnvolle Kombination aus Anlagengröße und Speicher für deinen Haushalt durch.",
      links: [{ phrase: "Die Empfehlung", href: "/pv-bedarf-berechnen" }],
      cta: { label: "Passende Größe finden", href: "/pv-bedarf-berechnen" },
    },
    {
      q: "Wie lange hält ein Batteriespeicher?",
      a: `Moderne Heimspeicher (LFP-Zellen) halten nach Garantie und Zyklenlebensdauer etwa ${BATTERY_LIFETIME_YEARS}–15 Jahre. In unserer Wirtschaftlichkeitsrechnung kalkulieren wir deshalb konservativ einen Akku-Tausch nach ${BATTERY_LIFETIME_YEARS} Jahren mit ein — zu dann voraussichtlich niedrigeren Preisen, weil Speicherpreise seit Jahren fallen. Ohne diesen Posten würde jede Speichergröße scheinbar rentabel.`,
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
 *  datierte Sachstände zu einem LAUFENDEN Gesetzgebungsverfahren (Stand: Juli
 *  2026, Referentenentwurf — nicht beschlossen). Der EEG-Wächter aktualisiert
 *  diese Texte bei einer Rechtsänderung mit; bei Beschluss/Verwerfung Antworten
 *  + Stand-Datum anpassen. Konsistent halten mit der Reform-Notiz im Rechner
 *  (rechner.tsx) und pvRechnerFaq oben. */
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
      a: "Geplant, aber noch nicht beschlossen: Ein Referentenentwurf des Bundeswirtschaftsministeriums sieht vor, die dauerhaft garantierte Einspeisevergütung für neue PV-Anlagen bis 25 kWp ab 2027 zu streichen. Die überarbeitete Entwurfsfassung sieht eine Übergangsphase vor: Neuanlagen sollen zunächst 36 Monate eine reduzierte Vergütung erhalten, danach ist ein zeitlich befristeter Bonus für die Direktvermarktung vorgesehen (Stand: Juli 2026). Zu diesem Stand war die Reform noch nicht final beschlossen — der Weg durch Kabinett, Bundestag und Bundesrat stand noch aus. Ob und in welcher Form die Reform kommt, ist offen — verbindlich ist allein die offizielle Gesetzeslage.",
      cta: { label: "Aktuelle Vergütung ansehen", href: "/datenstand" },
    },
    {
      q: "Bin ich betroffen, wenn meine Anlage schon läuft?",
      a: "Nein. Für Anlagen, die bis Ende 2026 in Betrieb gehen, gilt Bestandsschutz: Die bei Inbetriebnahme zugesagte Einspeisevergütung bleibt für die vollen 20 Jahre garantiert. Die geplante Reform betrifft nach dem aktuellen Entwurf ausschließlich Neuanlagen ab 2027 (Stand: Juli 2026).",
      cta: { label: "Meine Anlage nachrechnen", href: "/photovoltaik-rechner" },
    },
    {
      q: "Was passiert nach den 20 Jahren EEG-Vergütung?",
      a: "Die EEG-Vergütung endet nach 20 Jahren — das ist schon heute so und hat mit der geplanten Reform nichts zu tun. Danach fließt für eingespeisten Strom ohne neue Vermarktung nichts mehr, die Ersparnis durch Eigenverbrauch läuft aber unverändert weiter. Unser Rechner kalkuliert genau so: Vergütung nur 20 Jahre, Eigenverbrauch über die gesamte Laufzeit. Eine Anlage, die sich vor allem über Eigenverbrauch trägt, ist von diesem Auslaufen kaum abhängig.",
      cta: { label: "Methodik im Detail", href: "/methodik" },
    },
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
  return [
    {
      q: "Darf ich 2026 noch eine neue Gasheizung einbauen?",
      a: "Ja. Das Gebäudemodernisierungsgesetz (GModG) hebt die 65-Prozent-Erneuerbaren-Pflicht auf und lässt neue Gasheizungen wieder grundsätzlich zu. Die Anschaffung ist günstiger als eine Wärmepumpe — aber ab 2029 greift die Grüngas-Pflicht, die den Gasbetrieb Jahr für Jahr teurer macht.",
      links: [{ phrase: "Wärmepumpe", href: "/waermepumpe-rechner" }],
    },
    {
      q: "Was ist die Grüngas-Pflicht?",
      a: `Die Bio-Treppe (§ 43 GModG) gilt für Gas- und Ölheizungen, die nach dem Inkrafttreten des Gesetzes eingebaut werden. Wer eine solche Heizung betreibt, muss ab 2029 einen steigenden Anteil klimafreundlicher Brennstoffe beimischen. Das Gesetz nennt vier Stufen: ${bioTreppeStufenText("Prozent")}. Eine 100-Prozent-Stufe steht dort nicht; dass Heizungsbrennstoffe ab 2045 vollständig klimaneutral sein sollen, folgt aus einer eigenen Ankündigung des Gesetzes (§ 42a GModG), für die ein gesondertes Quotengesetz erst noch kommen muss. Anrechenbar sind neben Biomethan auch Bioheizöl, biogenes Flüssiggas sowie Wasserstoff und daraus hergestellte Derivate. Biomethan kostet rund doppelt so viel wie Erdgas, deshalb steigt der Gaspreis deutlich stärker als durch die normale Teuerung.`,
    },
    {
      q: "Gilt die Grüngas-Pflicht auch für meine bestehende Gasheizung?",
      a: `Die Bio-Treppe nicht — sie erfasst nur Heizungen, die nach dem ${GMODG_RECHTSSTAND.inKraftSeit} neu in ein bestehendes Gebäude eingebaut werden. Ganz verschont bleiben Bestandsanlagen aber voraussichtlich nicht: Dasselbe Gesetz kündigt in § 42a eine Grüngas- und Grünheizölquote an, die ab 2028 die Anbieter von Gas, Heizöl und Flüssiggas verpflichtet, ihrem Brennstoff schrittweise klimafreundliche Anteile beizumischen. Diese Quote setzt beim Brennstoff an, nicht bei der Heizung, und wirkt damit auch auf ältere Anlagen. Wie hoch sie ausfällt, ist noch offen: Die Ausgestaltung ist einem eigenen Gesetz vorbehalten, das bis zum ${GMODG_RECHTSSTAND.quoteGesetzBis} vorgelegt werden soll. Unsere Rechnung bildet deshalb nur die Bio-Treppe für neue Heizungen ab.`,
    },
    {
      q: "Wie viel teurer wird Gas dadurch?",
      a: "Der Gaspreis je Kilowattstunde steigt laut IW-Report von rund 11 Cent (2026) auf etwa 20 Cent (2040) — annähernd eine Verdopplung. Für einen typischen Haushalt mit rund 10.000 Kilowattstunden Verbrauch sind das etwa 1.080 Euro (2026) und 1.950 Euro (2040); ein größerer, unsanierter Altbau wie im Chart oben verbraucht mehr und zahlt entsprechend mehr. Der vom IW für 2045 gerechnete Wert von rund 24 Cent (etwa 2.370 Euro im Jahr) liegt jenseits der gesetzlichen Stufen: Er unterstellt eine vollständig klimaneutrale Versorgung, die noch in einem eigenen Gesetz geregelt werden muss. Neben der Beimischung treiben steigende Gasnetzentgelte den Preis, weil immer weniger Haushalte am Gasnetz hängen und die Fixkosten auf weniger Schultern verteilt werden.",
    },
    {
      q: "Geht eine Wärmepumpe auch im unsanierten Altbau?",
      a: "Ja. Die verbreitete Annahme, im Altbau brauche man erst eine Vollsanierung, stimmt so pauschal nicht. Eine Luft-Wasser-Wärmepumpe arbeitet auch bei höheren Vorlauftemperaturen — nur mit etwas schlechterer Arbeitszahl, also höherem Stromverbrauch. Weil die Gasheizung durch die Grüngas-Pflicht so stark teurer wird, ist die Wärmepumpe selbst im unsanierten Haus über 20 Jahre klar günstiger. Größere Heizkörper oder eine Teilsanierung verbessern die Arbeitszahl zusätzlich.",
      cta: { label: "Für mein Haus rechnen", href: "/waermepumpe-rechner" },
    },
    {
      q: "Lohnt sich die Wärmepumpe trotz höherer Anschaffung?",
      a: "In den meisten Fällen ja. Die Wärmepumpe kostet in der Anschaffung mehr, aber die BEG-Förderung deckt oft 50 bis 70 Prozent, und die laufenden Kosten liegen deutlich unter denen einer Gasheizung mit Grüngas-Pflicht. Über 20 Jahre entsteht so ein Vorsprung von mehreren zehntausend Euro. Wie es für dein Haus aussieht, rechnet der Wärmepumpen-Rechner aus.",
      links: [{ phrase: "BEG-Förderung", href: "/ratgeber/waermepumpe-foerderung-2026" }],
      cta: { label: "Ersparnis berechnen", href: "/waermepumpe-rechner" },
    },
    {
      q: "Ist die Grüngas-Pflicht schon beschlossen?",
      a: `Die Beimischpflicht (Bio-Treppe) steht als § 43 im GModG. ${gmodgStandSatz()} Beschlossen ist damit die Pflicht — nicht der Preis: Wie teuer Biomethan und Netzentgelte tatsächlich werden, ist eine Annahme des IW-Reports, ein plausibler Korridor und keine exakte Vorhersage. Noch offen ist außerdem die Quote für die Brennstoff-Anbieter, die das Gesetz nur ankündigt (§ 42a GModG) und die bis zum ${GMODG_RECHTSSTAND.quoteGesetzBis} in einem eigenen Gesetz geregelt werden soll.`,
    },
  ];
}
