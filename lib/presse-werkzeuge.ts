/**
 * Unsere Werkzeuge — die eine Liste, aus der ein Aufhänger sein Angebot zieht.
 *
 * WARUM ALS LISTE UND NICHT ALS FLIESSTEXT. Der Aufhänger stand bisher nur als
 * Absatz da („genau das rechnet unser Rechner aus"), und in einem Absatz fällt
 * eine falsche Zuordnung niemandem auf: Ein Fachbeitrag über die
 * Einspeisevergütung bekam so „Zubau je Gemeinde aus dem Anlagenregister"
 * angeboten. Als Schlüssel aus dieser Liste lässt sich dieselbe Zuordnung
 * gegenprüfen — jedes Werkzeug nennt die Wörter, die im Beitrag vorkommen
 * müssen, damit es überhaupt in Frage kommt.
 *
 * `passtZu` ist bewusst großzügig und `verlangt` bewusst streng: Die Liste soll
 * nicht entscheiden, welches Werkzeug das beste ist — das entscheidet, wer den
 * Beitrag gelesen hat. Sie soll nur den Fall fangen, in dem ein Werkzeug
 * angeboten wird, dessen Thema im Beitrag überhaupt nicht vorkommt.
 */

export type Werkzeug = {
  schluessel: string;
  name: string;
  pfad: string;
  /** Was es beantwortet — ein Satz, der so im Anschreiben stehen kann. */
  leistet: string;
  /** Wörter, die im Beitrag stehen müssen, damit dieses Werkzeug passt. */
  verlangt: RegExp;
};

export const WERKZEUGE: Werkzeug[] = [
  {
    schluessel: "pv-rechner",
    name: "PV-Rechner",
    pfad: "/photovoltaik-rechner",
    leistet:
      "rechnet für ein einzelnes Haus Anschaffung, Eigenverbrauch, Amortisation und Gewinn über 25 Jahre — mit einem Umschalter zwischen heutigem Recht und den Konditionen des EEG-Entwurfs ab 2027",
    verlangt:
      /photovoltaik|solaranlage|pv-anlage|solarstrom|solarmodul|kwp|eigenverbrauch|amortisation|wirtschaftlichkeit|rendite|lohnt sich/i,
  },
  {
    schluessel: "einspeiseverguetung",
    name: "Einspeisevergütungs-Rechner",
    pfad: "/einspeiseverguetung-rechner",
    leistet:
      "nennt den Satz nach Inbetriebnahmemonat zurück bis 2000 und rechnet aus, was über die zwanzig Jahre noch aussteht",
    verlangt: /einspeise|vergütung|eeg|volleinspeisung|teileinspeisung|degression|marktprämie/i,
  },
  {
    schluessel: "waermepumpe",
    name: "Wärmepumpen-Rechner",
    pfad: "/waermepumpe-rechner",
    leistet:
      "stellt Wärmepumpe und Gas- oder Ölheizung über zwanzig Jahre gegeneinander, inklusive BEG-Förderung mit Fahrplan bis 2027 und der Beimischungspflicht",
    verlangt: /wärmepumpe|heizung|heizen|gasheizung|ölheizung|jaz|jahresarbeitszahl|beg|heizlast|geg/i,
  },
  {
    schluessel: "balkon",
    name: "Balkonkraftwerk-Rechner",
    pfad: "/balkonkraftwerk/rechner",
    leistet:
      "rechnet ein Steckersolargerät für den konkreten Haushalt durch — Personenzahl, Anwesenheit, Ausrichtung, Standortertrag, mit und ohne Speicher",
    verlangt: /balkonkraftwerk|steckersolar|balkonsolar|mini-?solar|800\s*w|600\s*w/i,
  },
  {
    schluessel: "klimaanlage",
    name: "Klimaanlagen-Rechner",
    pfad: "/klimaanlage-stromkosten",
    leistet:
      "rechnet die Kühlkosten aus den Kühlgradstunden des Standorts statt aus einer Faustformel und vergleicht Monoblock, mobile Split und fest installierte Geräte",
    verlangt: /klimaanlage|klimagerät|kühlen|kühlung|split-?gerät|monoblock|hitze/i,
  },
  {
    schluessel: "foerderung",
    name: "Förder-Check",
    pfad: "/photovoltaik-foerderung",
    leistet:
      "beantwortet über die Postleitzahl, welche kommunalen Programme es am Ort gibt — 110 Programme, jedes mit Prüfdatum und Link zur Amtsseite",
    verlangt: /förder|zuschuss|zuschüsse|kfw|bafa|programm|kommunal/i,
  },
  {
    schluessel: "atlas",
    name: "Solar-Atlas",
    pfad: "/solar-atlas",
    leistet:
      "zeigt Bestand und Zubau je Gemeinde und Landkreis aus dem Anlagenregister, mit Datenstand an jeder Zahl",
    // WORTGRENZEN, KEINE WORTSTÄMME. Die erste Fassung ließ „Bestandsschutz"
    // als Treffer für „bestand" durchgehen und erklärte damit einen Beitrag
    // über die Einspeisevergütung zum Atlas-Fall — dieselbe Fehlerklasse wie
    // „Beförderung enthält Förderung" im Förderbereich.
    verlangt:
      /\bzubau\b|\banlagenbestand\b|\bausbau\b|anlagenregister|marktstammdaten|\bgemeinde\w*\b|\blandkreis\w*\b|\bbundesland\b|\bbundesländer\b|pro kopf|je einwohner|\bgigawatt\b|\bmegawatt\b|\bMW\b|\bGW\b/i,
  },
  {
    schluessel: "bestand",
    name: "Anlagenbestand Deutschland",
    pfad: "/photovoltaik-bestand-deutschland",
    leistet:
      "beantwortet, wie viele Solaranlagen und Balkonkraftwerke es in Deutschland gibt — aus dem Registerauszug, nicht aus einer Jahresstatistik",
    verlangt: /wie viele|\banlagenbestand\b|\banzahl\b|\bzubau\b|\bausbau\b|millionen anlagen|anlagenregister/i,
  },
  {
    schluessel: "strommix",
    name: "Strommix und Energiedaten",
    pfad: "/strommix-deutschland",
    leistet:
      "zeigt die Erzeugung in Echtzeit und den Börsenpreis über Monat und Stunde — dieselbe Größe, aus der der Marktwert Solar entsteht",
    verlangt: /strommix|börsenpreis|börsenstrompreis|strompreis|erzeugung|netz|megawattstunde|marktwert|dynamischer tarif|negative preise/i,
  },
  {
    schluessel: "simulation",
    name: "PV-Simulation",
    pfad: "/pv-simulation",
    leistet:
      "simuliert ein ganzes Jahr Stunde für Stunde — daraus kommen Autarkie und der Wert des eigenen Einspeiseprofils, statt aus einer Jahresbilanz",
    verlangt: /autarkie|eigenverbrauch|speicher|batterie|simulation|lastprofil|stunde/i,
  },
  {
    schluessel: "neigung",
    name: "Neigungswinkel-Tabelle",
    pfad: "/photovoltaik-neigungswinkel",
    leistet:
      "beziffert den Ertragsabschlag je Neigung und Ausrichtung aus einem dokumentierten Referenzabruf, statt „Süden ist am besten“ zu sagen",
    verlangt: /neigung|ausrichtung|südd?ach|ost-?west|dachfläche|verschattung|ertrag je kwp|kwh\/kwp/i,
  },
  {
    // KEIN RECHNER, SONDERN DAS PRODUKT SELBST. Die Rubrik Startup/Vibe Coding/UX
    // fragt nicht nach einer Zahl, sondern nach einem Fall: ein öffentliches
    // Werkzeug auf amtlichen Live-Daten, eigene Rechenmodelle, über 3.000
    // Tests, gebaut von einem UX-Architekten mit KI statt von einem Team.
    // Ohne diesen Eintrag stünden 30 der gelesenen Beiträge dieser Rubrik
    // ohne Angebot da — und das sähe aus wie „nichts gefunden".
    schluessel: "entstehungsgeschichte",
    name: "Die Entstehungsgeschichte von solar-check.io",
    pfad: "/ueber-uns",
    leistet:
      "ist der Fall selbst: ein öffentlicher Rechner auf amtlichen Live-Daten, mit eigenen Rechenmodellen und über 3.000 Tests, gebaut von einem UX-Architekten mit KI statt von einem Entwicklerteam — mit den Fehlern, die dabei aufgetreten sind, und den Prüfungen, die daraus entstanden",
    verlangt:
      /\bKI\b|künstliche intelligenz|vibe.?coding|\bLLM\b|ChatGPT|Claude|Copilot|Cursor|softwareentwicklung|entwickler|programmier|\bUX\b|prototyp|bootstrap|gründ|startup|solo|nebenbei|agent/i,
  },
  {
    schluessel: "widgets",
    name: "Einbettbare Energie-Widgets",
    pfad: "/energie-widgets",
    leistet:
      "sind neun Diagramme zum Einbetten — Strommix, Zubau, Vergütungsverlauf, Förder-Check —, cookiefrei und mit Quellenangabe im Bild",
    verlangt: /./,
  },
];

const NACH_SCHLUESSEL = new Map(WERKZEUGE.map((w) => [w.schluessel, w]));

export function werkzeugVon(schluessel: string): Werkzeug | undefined {
  return NACH_SCHLUESSEL.get(schluessel);
}

/**
 * Prüft, ob ein angebotenes Werkzeug im gelesenen Beitrag überhaupt vorkommt.
 *
 * Der Text ist Überschrift plus Analyse — also das, was jemand beim Lesen
 * festgehalten hat. Ein Werkzeug, dessen Wörter darin nirgends auftauchen, ist
 * ein Befund und kein Grenzfall: Genau so wurde einem Beitrag über die
 * Einspeisevergütung der Solar-Atlas angeboten.
 *
 * `widgets` ist ausgenommen — ein einbettbares Diagramm passt zu jedem Thema,
 * das wir überhaupt führen, und eine Wortprüfung wäre dort eine Scheingenauigkeit.
 */
export function werkzeugPasst(schluessel: string, text: string): boolean {
  const w = NACH_SCHLUESSEL.get(schluessel);
  if (!w) return false;
  return w.verlangt.test(text);
}
