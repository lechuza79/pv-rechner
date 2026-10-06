export interface WidgetVariant {
  id: string;
  label: string;
  src: string;
  height: number;
  /** If set, the iframe renders at this fixed width; otherwise the width selector applies. */
  fixedWidth?: number;
  /** Fixed query params for this variant (e.g. metric=leistung), merged into both
   * the live-preview src and the copy-paste embed URL. */
  params?: Record<string, string>;
}

export interface Attribution {
  /** Deep link target on solar-check.io — this anchor in the HOST page is the actual backlink. */
  path: string;
  text: string;
}

export interface WidgetSection {
  id: string;
  label: string;
  intro: string;
  attribution: Attribution;
  showFrameWidth: boolean;
  showAutoswitch?: boolean;
  /** Widget supports the functional settings (share footer, time range, switcher). */
  supportsSettings?: boolean;
  variants: WidgetVariant[];
}

export const SECTIONS: WidgetSection[] = [
  {
    id: "erzeugung",
    label: "Stromerzeugung (live)",
    intro:
      "Die aktuelle Erzeugung aus erneuerbaren Quellen als Radial-Chart der letzten 24 Stunden. Optional wechselt das Widget automatisch durch die Energieträger.",
    attribution: {
      path: "/strommix-deutschland",
      text: "Stromerzeugung in Deutschland – live bei Solar Check",
    },
    showFrameWidth: false,
    showAutoswitch: true,
    variants: [
      { id: "standard", label: "Standard", src: "/embed/erzeugung", height: 412, fixedWidth: 380 },
      { id: "mini", label: "Kompakt", src: "/embed/erzeugung-mini", height: 285, fixedWidth: 260 },
    ],
  },
  {
    id: "strommix",
    label: "Strommix Deutschland",
    intro:
      "Der deutsche Strommix im Zeitverlauf – erneuerbare und fossile Erzeugung nebeneinander, mit wählbarem Zeitraum von 24 Stunden bis zum Maximum.",
    attribution: {
      path: "/strommix-deutschland",
      text: "Strommix Deutschland – live bei Solar Check",
    },
    showFrameWidth: true,
    supportsSettings: true,
    variants: [{ id: "strommix", label: "Strommix", src: "/embed/strommix", height: 460 }],
  },
  {
    id: "ee-ampel",
    label: "EE-Ampel (Strommix live)",
    intro:
      "Zeigt auf einen Blick, ob der deutsche Strom gerade überwiegend erneuerbar ist. Grün heißt: guter Zeitpunkt für Stromverbrauch, etwa fürs Laden des E-Autos. Kompakt für Sidebar oder Faktenbox.",
    attribution: {
      path: "/strommix-deutschland",
      text: "Strommix Deutschland – live bei Solar Check",
    },
    showFrameWidth: false,
    variants: [{ id: "ee-ampel", label: "EE-Ampel", src: "/embed/ee-ampel", height: 290, fixedWidth: 320 }],
  },
  {
    id: "foerder-check",
    label: "Wärmepumpen-Förderung",
    intro:
      "Ein schlanker Rechner für die BEG-Förderung: Kosten, alte Heizung und Einkommen eingeben, Zuschuss sofort sehen. Verlinkt zum vollen Wärmepumpen-Rechner. Ideal als Faktenbox in einem Ratgeber-Artikel.",
    attribution: {
      path: "/waermepumpe-rechner",
      text: "Wärmepumpen-Förderung berechnen – Solar Check",
    },
    showFrameWidth: false,
    variants: [{ id: "foerder-check", label: "Förder-Check", src: "/embed/foerder-check", height: 640, fixedWidth: 380 }],
  },
  {
    id: "gruengas-heizkosten",
    label: "Wärmepumpe vs. Gasheizung",
    intro:
      "Gasheizung mit Grüngas-Pflicht (Heizungsgesetz) gegen Wärmepumpe über 20 Jahre – die Gasheizung wird Jahr für Jahr teurer, die Wärmepumpe bleibt günstig, mit PV noch günstiger. Zahlen nach dem IW-Report. Wähle das ganze Kombi-Widget oder nur einen Teil: die 20-Jahres-Balken (Kurzantwort) oder den Linien-Verlauf.",
    attribution: {
      path: "/waermepumpe-rechner",
      text: "Wärmepumpe vs. neue Gasheizung mit Grüngas-Pflicht – Solar Check",
    },
    showFrameWidth: false,
    variants: [
      { id: "gruengas-voll", label: "Ganzes Widget", src: "/embed/gruengas-heizkosten", height: 560, fixedWidth: 640 },
      { id: "gruengas-balken", label: "Nur Balken", src: "/embed/gruengas-heizkosten", params: { view: "bars" }, height: 420, fixedWidth: 480 },
      { id: "gruengas-linien", label: "Nur Linien", src: "/embed/gruengas-heizkosten", params: { view: "lines" }, height: 480, fixedWidth: 640 },
    ],
  },
  {
    id: "pv-kostenrennen",
    label: "Stromkosten mit und ohne Solaranlage",
    intro:
      "Ein Haushalt, mit und ohne Solaranlage, 25 Jahre lang: Die Linien zeichnen Tag für Tag, was jeder Haushalt bis dahin für Strom ausgegeben hat – die Anlage startet mit ihrer Anschaffung vorn und wird überholt, sobald sie bezahlt ist. Das Wetter ist das echte der letzten 25 Jahre (Deutscher Wetterdienst, Monatsraster und Stationstage), sodass kein Jahr und keine Woche der anderen gleicht. Gerechnet mit denselben Annahmen und Marktpreisen wie unser PV-Rechner.",
    attribution: {
      path: "/ratgeber/lohnt-sich-pv-mit-speicher",
      text: "Stromkosten mit und ohne Solaranlage: 25 Jahre mit echtem Wetter – Solar Check",
    },
    showFrameWidth: false,
    variants: [{ id: "pv-kostenrennen", label: "Amortisations-Rennen", src: "/embed/pv-kostenrennen", height: 600, fixedWidth: 560 }],
  },
  {
    id: "heizkostenrennen",
    label: "Heizkosten mit Gasheizung und Wärmepumpe",
    intro:
      "Ein unsaniertes Einfamilienhaus, neue Gasheizung gegen Wärmepumpe, 20 Jahre lang: Die Linien zeichnen Tag für Tag, was das Haus bis dahin fürs Heizen ausgegeben hat – die Wärmepumpe startet mit ihrer Anschaffung vorn und wird überholt, sobald der Mehrpreis zurück ist. Geheizt wird nach den Gradtagen der letzten 20 Winter (Deutscher Wetterdienst, Tagesmittel der Stationen), sodass kein Winter dem anderen gleicht. Gerechnet mit denselben Annahmen wie unser Wärmepumpen-Rechner, Gaspreis mit Grüngas-Pflicht nach dem IW-Report.",
    attribution: {
      path: "/ratgeber/gasheizung-oder-waermepumpe",
      text: "Heizkosten mit Gasheizung und Wärmepumpe: 20 Jahre mit echtem Wetter – Solar Check",
    },
    showFrameWidth: false,
    variants: [{ id: "heizkostenrennen", label: "Heizkosten-Rennen", src: "/embed/heizkostenrennen", height: 600, fixedWidth: 560 }],
  },
  {
    id: "strommix-anteil",
    label: "Kernenergie im Strommix",
    intro:
      "Wie viel Kernenergie – inklusive rechnerisch importiertem Atomstrom – im deutschen Strommix des laufenden Jahres steckt. Als Donut mit den Anteilen aller Kategorien.",
    attribution: {
      path: "/atomstrom-import",
      text: "Kernenergie im deutschen Strommix – Solar Check",
    },
    showFrameWidth: true,
    variants: [{ id: "strommix-anteil", label: "Kernenergie-Anteil", src: "/embed/strommix-anteil", height: 400 }],
  },
  {
    id: "zubau-erneuerbare-atom",
    label: "Zubau: Erneuerbare vs. Atomkraft",
    intro:
      "Wie viel Wind + Solar gegenüber Atomkraft jedes Jahr neu ans Netz geht — wählbar je Land, plus direkter Vergleich Deutschland ↔ China.",
    attribution: {
      path: "/laendervergleich",
      text: "Zubau Erneuerbare vs. Atomkraft – Solar Check",
    },
    showFrameWidth: true,
    variants: [{ id: "zubau-erneuerbare-atom", label: "Zubau EE vs. Atom", src: "/embed/zubau-erneuerbare-atom", height: 420 }],
  },
  {
    id: "einspeiseverguetung-verlauf",
    label: "Einspeisevergütung seit 2000",
    intro:
      "Der Verlauf der EEG-Einspeisevergütung für kleine Dachanlagen seit 2000 — Jahresbalken bis 2011, Monatswerte als Linie ab 2012 — mit der interaktiven Ereignis-Timeline der politischen Weichenstellungen. Werte aus dem BNetzA-Archiv und der gesetzlichen Kette, aktualisieren sich an den Stichtagen von selbst.",
    attribution: {
      path: "/einspeiseverguetung-tabelle",
      text: "Einspeisevergütung seit 2000 – Solar Check",
    },
    showFrameWidth: true,
    variants: [{ id: "einspeiseverguetung-verlauf", label: "Vergütungs-Verlauf", src: "/embed/einspeiseverguetung-verlauf", height: 640 }],
  },
  {
    id: "pv-zubau-deutschland",
    label: "PV-Zubau & Förderung (Deutschland)",
    intro:
      "Der jährliche Photovoltaik-Zubau in Deutschland mit sinkender Einspeisevergütung und steigendem Strompreis auf einer Zeitachse — plus interaktiver Ereignis-Timeline, die die politischen Weichenstellungen erklärt.",
    attribution: {
      path: "/photovoltaik-zubau-deutschland",
      text: "Wie Förderung den Solarausbau geformt hat – Solar Check",
    },
    showFrameWidth: true,
    variants: [{ id: "pv-zubau-deutschland", label: "PV-Zubau", src: "/embed/pv-zubau-deutschland", height: 760 }],
  },
  {
    id: "anlagenbestand-deutschland",
    label: "Solaranlagen in Deutschland",
    intro:
      "Wie viele Solaranlagen in Deutschland gemeldet sind, welche Leistung installiert ist und wie sich beides auf Balkonkraftwerke, private und gewerbliche Dächer und Freiflächen verteilt. Stückzahl und Leistung stehen nebeneinander, weil sie gegenläufig sind — nach Anzahl dominieren die kleinen Anlagen, nach Leistung die großen. Monatlich aus dem Marktstammdatenregister.",
    attribution: {
      path: "/photovoltaik-bestand-deutschland",
      text: "Solaranlagen in Deutschland – Solar Check",
    },
    showFrameWidth: true,
    variants: [{ id: "anlagenbestand-deutschland", label: "Anlagenbestand", src: "/embed/anlagenbestand-deutschland", height: 560 }],
  },
  {
    id: "karte",
    label: "Deutschland-Karte",
    intro:
      "Der Photovoltaik- und Erneuerbaren-Bestand je Region aus dem Marktstammdatenregister – interaktiv nach Energieträger umschaltbar und bis auf Landkreis-Ebene aufklappbar.",
    attribution: {
      path: "/",
      text: "PV-Anlagen in Deutschland – Solar Check",
    },
    showFrameWidth: false,
    variants: [{ id: "karte", label: "Karte", src: "/embed/karte", height: 820, fixedWidth: 680 }],
  },
  {
    id: "kennzahl",
    label: "Kennzahlen (Anlagenbestand)",
    intro:
      "Eine einzelne Kennzahl aus dem Marktstammdatenregister als kompakte Kachel: die bundesweit installierte Erneuerbaren-Leistung oder die Anzahl der Anlagen. Zum Einbetten in eine Sidebar oder Faktenbox.",
    attribution: {
      path: "/",
      text: "PV-Anlagen in Deutschland – Solar Check",
    },
    showFrameWidth: false,
    variants: [
      { id: "leistung", label: "Leistung", src: "/embed/kennzahl", params: { metric: "leistung" }, height: 190, fixedWidth: 300 },
      { id: "anlagen", label: "Anlagen", src: "/embed/kennzahl", params: { metric: "anlagen" }, height: 190, fixedWidth: 300 },
    ],
  },
  {
    id: "gemeinde-solar",
    label: "Solaranlagen einer Gemeinde",
    intro:
      "Der Anlagenbestand einer einzelnen Gemeinde aus dem Marktstammdatenregister — Anlagen, Leistung und Leistung je Einwohner. Für Kommunen zum Einbetten auf der eigenen Website. Hier als Beispiel Höchberg; den fertigen Code für Ihre Gemeinde finden Sie auf deren Seite im Energie-Atlas.",
    attribution: {
      path: "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg",
      text: "Solaranlagen in Höchberg · Solar Check",
    },
    showFrameWidth: false,
    variants: [
      { id: "gemeinde-solar", label: "Höchberg (Beispiel)", src: "/embed/gemeinde-solar", params: { ags: "09679147" }, height: 250, fixedWidth: 380 },
    ],
  },
  {
    id: "gemeinde-erneuerbare",
    label: "Erneuerbare Leistung einer Gemeinde",
    intro:
      "Die installierte erneuerbare Leistung einer Gemeinde nach Technologie (Solar, Wind, Biomasse, Wasserkraft) aus dem Marktstammdatenregister — als Donut. Für Kommunen zum Einbetten. Hier als Beispiel Höchberg; den fertigen Code für Ihre Gemeinde finden Sie auf deren Seite im Energie-Atlas.",
    attribution: {
      path: "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg",
      text: "Erneuerbare Leistung in Höchberg · Solar Check",
    },
    showFrameWidth: false,
    variants: [
      { id: "gemeinde-erneuerbare", label: "Höchberg (Beispiel)", src: "/embed/gemeinde-erneuerbare", params: { ags: "09679147" }, height: 360, fixedWidth: 380 },
    ],
  },
  {
    id: "gemeinde-solarleistung",
    label: "Solarleistung einer Gemeinde (simuliert)",
    intro:
      "Der Tagesverlauf der Solarleistung des Gemeinde-Bestands, simuliert aus dem heutigen Wetter am Standort — kein Messwert, aber standortgenau. Für Kommunen zum Einbetten. Hier als Beispiel Höchberg; den fertigen Code für Ihre Gemeinde finden Sie auf deren Seite im Energie-Atlas.",
    attribution: {
      path: "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg",
      text: "Solarleistung in Höchberg · Solar Check",
    },
    showFrameWidth: false,
    variants: [
      { id: "gemeinde-solarleistung", label: "Höchberg (Beispiel)", src: "/embed/gemeinde-solarleistung", params: { ags: "09679147" }, height: 470, fixedWidth: 380 },
    ],
  },
  {
    id: "region-anlagentyp",
    label: "Solarleistung eines Bundeslands nach Anlagentyp",
    intro:
      "Die installierte Solarleistung eines Bundeslands nach Anlagentyp (private Dächer, Gewerbe, Freifläche) aus dem Marktstammdatenregister — als Donut. Hier als Beispiel Mecklenburg-Vorpommern; den fertigen Code je Bundesland finden Sie auf dessen Förderseite.",
    attribution: {
      path: "/photovoltaik-foerderung/mecklenburg-vorpommern",
      text: "Photovoltaik-Förderung in Mecklenburg-Vorpommern · Solar Check",
    },
    showFrameWidth: false,
    variants: [
      { id: "region-anlagentyp", label: "Mecklenburg-Vorpommern (Beispiel)", src: "/embed/region-anlagentyp", params: { bl: "13" }, height: 360, fixedWidth: 380 },
    ],
  },
  {
    id: "region-solarleistung",
    label: "Solarleistung eines Bundeslands (simuliert)",
    intro:
      "Die aktuelle Solarleistung des Anlagenbestands eines Bundeslands, simuliert aus dem heutigen Wetter — kein Messwert, aber nah dran. Hier als Beispiel Mecklenburg-Vorpommern; den fertigen Code je Bundesland finden Sie auf dessen Förderseite.",
    attribution: {
      path: "/photovoltaik-foerderung/mecklenburg-vorpommern",
      text: "Solarleistung in Mecklenburg-Vorpommern · Solar Check",
    },
    showFrameWidth: false,
    variants: [
      { id: "region-solarleistung", label: "Mecklenburg-Vorpommern (Beispiel)", src: "/embed/region-solarleistung", params: { bl: "13" }, height: 470, fixedWidth: 380 },
    ],
  },
  {
    id: "simulation",
    label: "PV-Simulation (live)",
    intro:
      "Die vollständige Live-Simulation: was eine PV-Anlage am eingegebenen Standort gerade beim aktuellen Wetter liefert – mit Haushaltsprofil (Personen, Wärmepumpe, E-Auto), Eigenverbrauch und Tagesverlauf. Standort über die PLZ; per ?plz=… im Code fest vorgebbar.",
    attribution: {
      path: "/pv-simulation",
      text: "Live-PV-Simulation – Solar Check",
    },
    showFrameWidth: false,
    variants: [{ id: "simulation", label: "Simulation", src: "/embed/simulation", height: 1060, fixedWidth: 380 }],
  },
];
