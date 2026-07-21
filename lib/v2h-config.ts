// V2H (Vehicle-to-Home) — bidirektionales Laden: Modell-Konfiguration.
//
// Das Auto ist hier ein SPEICHER, kein Verbraucher. Der Unterschied zum
// Heimspeicher sind drei Dinge, und nur die machen den ganzen Rechner aus:
//   1. Verfügbarkeit — das Auto ist nicht immer zuhause am Netz.
//   2. Fahr-Reserve  — ein Teil des Akkus muss fürs Fahren bleiben.
//   3. Leistung      — die Wallbox deckelt Laden und Entladen (~10 kW).
//
// EHRLICHKEITS-GRUNDSATZ (trägt den ganzen Rechner):
// Der PV-Rechner nimmt fürs Geld das HTW-Power-Law (calcEigenverbrauch), NICHT die
// Stundensimulation — die neigt bei Stundenauflösung zum Optimismus. Das Power-Law
// kennt aber kein verfügbarkeits-begrenztes Auto, es ist auf feste Heimspeicher
// kalibriert. Für V2H MUSS das Geld deshalb aus der Simulation kommen (bewusste,
// dokumentierte Abweichung von der geteilten Rechen-Basis, siehe CLAUDE.md).
// Gegenmittel gegen den bekannten Optimismus: Jeder Parameter hier ist am
// KONSERVATIVEN Rand der Marktspanne gewählt. Lieber untertreiben als das
// Hersteller-Werbeversprechen wiederholen.
//
// Was dieser Rechner BEWUSST NICHT tut: eine deutsche Euro-Zahl fürs Handeln mit
// dem Netz (V2G). Die Netzentgelt-Hürde ist zum 1.1.2026 gefallen, aber es fehlen
// flächendeckende Tarife und die Smart-Meter-Quote liegt bei ~3 %. Eine Zahl wäre
// ein Versprechen ins Blaue. Deshalb: Ausblick mit Auslands-Beispielen, keine
// Rechnung.

export type V2hProfileId = "pendler" | "homeoffice" | "rentner";

// ─── Bildnachweis ───────────────────────────────────────────────────────────
// Rechtlich geprüft (Audit 07/2026): Fahrzeugfotos von Wikimedia sind nutzbar.
// Die Namensnennung ist der einzige realistische Angriffspunkt — und der einzige
// Fehler, der in Deutschland dutzendfach abgemahnt wurde (OLG Köln 6 U 131/17:
// Urheber genannt, aber ohne Lizenzlink und ohne Zuordnung zum Bild → 650 €).
// Deshalb sind die Nachweis-Felder PFLICHT, sobald ein Bild gesetzt ist, und
// werden direkt am Bild gerendert — nicht auf einer Sammelseite.
// Regeln: nicht zuschneiden (Skalieren ist unbedenklich), Kennzeichen retuschieren,
// kein Herstellerlogo als Bedienelement.
export interface ImageCredit {
  /** Dateiname/Pfad unter public/ — selbst gehostet, nie von fremden Servern. */
  src: string;
  /** Urheber, exakt wie in der Quelle angegeben. */
  author: string;
  /** Lizenz-Kurzname, z. B. "CC BY-SA 4.0" oder "CC0". */
  license: string;
  /** Link auf den Lizenztext. Bei CC0 ebenfalls setzen. */
  licenseUrl: string;
  /** Link auf die Originaldatei (Quellenangabe). */
  sourceUrl: string;
  /** Nur setzen, wenn bearbeitet wurde — dann sichtbar ausweisen. */
  modified?: string;
}

export interface V2hVehicle {
  id: string;
  label: string;
  /** Nutzbare Akkukapazität (kWh). Netto, nicht Brutto-Nennkapazität. */
  usableKwh: number;
  /** Verbrauch ab Steckdose inkl. Ladeverlusten (kWh/100 km). */
  kwhPer100km: number;
  /** Art der Rückspeisung — nur als Hinweis, rechnerisch identisch. */
  bidiType: "DC" | "AC";
  /** Kurzer Sachstand: ab wann/wie verfügbar. Wächter-gepflegt. */
  note: string;
  /** true = kann NUR V2L (Steckdose am Auto), nicht ins Hausnetz speisen.
   *  Diese Unterscheidung ist der größte Irrtum im ganzen Themenfeld: Hersteller
   *  und Wallbox-Shops nennen V2L ebenfalls „bidirektional", weil ja Strom aus dem
   *  Auto fließt. Wer „bidirektional" liest, denkt aber an Hausversorgung. Solche
   *  Fahrzeuge dürfen deshalb NIE in eine V2H-Ersparnisrechnung eingehen. */
  v2lOnly?: boolean;
  /** Bild + Nachweis. Optional — der Rechner funktioniert ohne. */
  image?: ImageCredit;
}

// Bidirektional-fähige Modelle, Marktstand Juli 2026.
//
// Warum eine handgepflegte Liste statt einer Fahrzeug-Datenbank (Audit 07/2026):
// Es gibt keine lebende offene Quelle für E-Auto-Spezifikationen. OpenEV Data ist
// nach einer Woche eingeschlafen und hat keine funktionierende Schnittstelle, EVDB
// ist winzig, Wikidata führt unter "Elektrofahrzeug" Segways und Straßenbahnen ohne
// eine einzige Akkukapazität. Vor allem aber: KEINE dieser Quellen führt das
// entscheidende Merkmal — ob ein Fahrzeug überhaupt rückspeisen kann. Das hängt oft
// am Software-Stand und ändert sich laufend, gehört also ohnehin an den Wächter.
const VEHICLES: V2hVehicle[] = [
  {
    id: "renault5",
    label: "Renault 5 E-Tech",
    usableKwh: 52,
    kwhPer100km: 17,
    bidiType: "AC",
    note: "Am Markt, rückspeisefähig ab Werk.",
    image: {
      src: "/fahrzeuge/renault5.jpg",
      author: "Alexander-93",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File%3ARenault_5_E-Tech_Electric_Auto_Zuerich_2024_DSC_6501.jpg",
    },
  },
  {
    id: "id3",
    label: "VW ID.3 / ID.4 (77 kWh)",
    usableKwh: 77,
    kwhPer100km: 18,
    bidiType: "DC",
    note: "Rückspeisen per Software freigeschaltet, ab 77-kWh-Akku.",
    image: {
      src: "/fahrzeuge/id3.jpg",
      author: "Vauxford",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File%3A2020_Volkswagen_ID.3_1st_Front.jpg",
    },
  },
  {
    id: "born",
    label: "Cupra Born (77 kWh)",
    usableKwh: 77,
    kwhPer100km: 18,
    bidiType: "DC",
    note: "Technisch baugleich zur VW-Plattform.",
    image: {
      src: "/fahrzeuge/born.jpg",
      author: "crash71100",
      license: "CC0",
      licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
      sourceUrl: "https://commons.wikimedia.org/wiki/File%3ACupra_Born_%2851838629351%29.jpg",
    },
  },
  {
    id: "ioniq5",
    label: "Hyundai Ioniq 5 / Kia EV6",
    usableKwh: 77,
    kwhPer100km: 19,
    bidiType: "AC",
    // KORREKTUR (Recherche 07/2026): Diese Modelle können in Deutschland NUR V2L —
    // also eine Steckdose am Auto, aus der sich ein einzelnes Gerät betreiben lässt.
    // Ins Hausnetz speisen können sie hier NICHT. Hyundai selbst nennt V2H/V2G
    // „in aktiver Entwicklung" und bezeichnet auf derselben Seite V2L als „die
    // aktuell bei Hyundai eingesetzte Form des bidirektionalen Ladens" — daher die
    // weit verbreitete Verwechslung. Wallbox-Shops und Ratgeberportale führen die
    // Modelle trotzdem als V2H-fähig; das ist Verkaufsinteresse, keine Tatsache.
    note: "Nur Steckdose am Auto (V2L) — Rückspeisen ins Hausnetz in Deutschland nicht möglich.",
    v2lOnly: true,
    image: {
      src: "/fahrzeuge/ioniq5.jpg",
      author: "TTTNIS",
      license: "CC0",
      licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
      sourceUrl: "https://commons.wikimedia.org/wiki/File%3AHyundai_Ioniq_5.jpg",
    },
  },
  {
    id: "ix3",
    label: "BMW iX3 (Neue Klasse)",
    usableKwh: 80,
    kwhPer100km: 18,
    bidiType: "DC",
    note: "Ab 2026 gestaffelt, für Rückspeisen ins Haus und ins Netz vorbereitet.",
    image: {
      src: "/fahrzeuge/ix3.jpg",
      author: "Dinkun Chen",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File%3ABMW_iX3_%28G08%29_China.jpg",
    },
  },
  {
    id: "leaf",
    label: "Nissan Leaf",
    usableKwh: 39,
    kwhPer100km: 18,
    bidiType: "DC",
    note: "Der Pionier — nutzt allerdings den auslaufenden CHAdeMO-Stecker.",
    image: {
      src: "/fahrzeuge/leaf.jpg",
      author: "TTTNIS",
      license: "CC0",
      licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
      sourceUrl: "https://commons.wikimedia.org/wiki/File%3A2019_Nissan_Leaf_rear.jpg",
    },
  },
];

/** „Anderer Wert" — Startwerte für die freie Eingabe. */
export const CUSTOM_VEHICLE: V2hVehicle = {
  id: "custom",
  label: "Anderes Fahrzeug",
  usableKwh: 60,
  kwhPer100km: 18,
  bidiType: "DC",
  note: "Eigene Werte eintragen.",
};

export interface V2hProfile {
  id: V2hProfileId;
  label: string;
  what: string;
  /** 24 Werte 0..1: Anteil der Stunde, in der das Auto werktags angesteckt ist. */
  availabilityByHour: number[];
  /** Dasselbe für Samstag und Sonntag. Ohne diese Trennung stünde ein Pendler-Auto
   *  rechnerisch an 7 statt an 5 Tagen tagsüber weg — und ausgerechnet die beiden
   *  Tage, an denen es in der Sonne steht, sind für V2H die wertvollsten. */
  availabilityWeekend: number[];
  /** Vorbelegte Jahresfahrleistung (km) — editierbar. */
  defaultKm: number;
}

// Standzeit-Profile.
//
// Datengrundlage: „Mobilität in Deutschland" (MiD, BMDV) — ein privater Pkw fährt
// im Schnitt ~45 Min/Tag und steht rund 23 Stunden, davon ~20 am Wohnort. Das Auto
// ist also fast immer potenziell am Netz — aber tagsüber, wenn die PV liefert,
// deutlich seltener als nachts. Genau daran entscheidet sich V2H.
//
// Bewusst harte 0/1-Werte statt weicher Mittelwerte: Ein Mittelwert („das Auto ist
// mittags zu 40 % da") glättet den Pendler-Effekt weg und schönt das Ergebnis. Der
// Sinn dieses Rechners ist aber gerade, den Effekt sichtbar zu machen — beim
// Pendler bringt V2H WENIGER, weil das Auto in der Sonnenzeit fehlt. Das ist das
// Ehrlichkeits-Pfund, das kein Hersteller-Rechner zeigt.
export const V2H_PROFILES: V2hProfile[] = [
  {
    id: "pendler",
    label: "Ich pendle",
    what: "Das Auto ist werktags tagsüber weg",
    // Werktags weg von 7 bis 18 Uhr — genau im Sonnenfenster.
    availabilityByHour: [1,1,1,1,1,1,1, 0,0,0,0,0,0,0,0,0,0,0, 1,1,1,1,1,1],
    // Am Wochenende überwiegend da, mit einem Ausflugs-/Einkaufsfenster.
    availabilityWeekend: [1,1,1,1,1,1,1,1,1,1,1, 0,0,0,0, 1,1,1,1,1,1,1,1,1],
    defaultKm: 15000,
  },
  {
    id: "homeoffice",
    label: "Ich arbeite meist zuhause",
    what: "Das Auto steht tagsüber meistens da",
    // Nur ein kurzes Mittagsfenster weg (Einkauf, Termine).
    availabilityByHour: [1,1,1,1,1,1,1,1,1,1, 0,0,0, 1,1,1,1,1,1,1,1,1,1,1],
    availabilityWeekend: [1,1,1,1,1,1,1,1,1,1,1, 0,0,0, 1,1,1,1,1,1,1,1,1,1],
    defaultKm: 10000,
  },
  {
    id: "rentner",
    label: "Ich bin flexibel",
    what: "Das Auto steht fast immer zuhause",
    availabilityByHour: [1,1,1,1,1,1,1,1,1,1,1, 0,0, 1,1,1,1,1,1,1,1,1,1,1],
    availabilityWeekend: [1,1,1,1,1,1,1,1,1,1,1, 0,0, 1,1,1,1,1,1,1,1,1,1,1],
    defaultKm: 8000,
  },
];

export interface V2hConfig {
  /** Roundtrip-Wirkungsgrad Auto (Laden × Entladen über die Wallbox). */
  carRoundtrip: number;
  /** Lade-/Entladegrenze der bidirektionalen Wallbox (kW). */
  wallboxKw: number;
  /** Fahr-Reserve: so viel Akku bleibt fürs Fahren reserviert (kWh). */
  defaultReserveKwh: number;
  /** Bidirektionale Wallbox inkl. Montage und Anbindung (€). */
  wallboxCost: number;
  /** Vergleichsanker: Heimspeicher, den man sich stattdessen kaufen würde (kWh). */
  referenceBatteryKwh: number;
  /** Lebensdauer der Wallbox für die Wirtschaftlichkeitsrechnung (Jahre). */
  lifeYears: number;
  validFrom: string;
  reviewBy: string;
}

export const V2H: V2hConfig = {
  // Gemessen liegen DC-Wallboxen im Roundtrip bei ~86–91 %, also auf Heimspeicher-
  // Niveau (Projekt: 0,90). Wir nehmen bewusst den UNTEREN Rand — die Simulation
  // neigt ohnehin zum Optimismus, da soll der Wirkungsgrad nicht noch draufsatteln.
  carRoundtrip: 0.86,
  // Typische DC-Wallbox zuhause. Das ist die relevante Deckelung, nicht die
  // Akkugröße — der Autoakku ist mit 40–80 kWh nie der Engpass.
  wallboxKw: 10,
  // ~100 km Reichweite bleiben immer im Akku. Großzügig angesetzt: Wer morgens mit
  // leerem Akku dasteht, weil das Haus ihn nachts leergesaugt hat, hat vom
  // rechnerischen Vorteil nichts.
  defaultReserveKwh: 20,
  // Marktspanne inkl. Montage und Haussteuerung: 4.000–9.000 €. Wir starten in der
  // oberen Mitte — bidirektionale Wallboxen sind teuer und jung, und dieser Posten
  // trägt die ganze Wirtschaftlichkeit. Lieber ehrlich hoch als schöngerechnet.
  wallboxCost: 6500,
  // Der ehrliche Vergleichsanker: Statt der Wallbox könnte man einen Heimspeicher
  // kaufen. 10 kWh ist die typische Größe zur üblichen Dachanlage.
  referenceBatteryKwh: 10,
  lifeYears: 20,
  validFrom: "2026-07-21",
  reviewBy: "2027-07-01",
};

// Länder-Beispiele für den Ausblick „mit dem Netz Geld verdienen".
//
// STRENG als Ausland-Beispiel labeln, nie als deutsche Zusage — sonst ist es eine
// irreführende geschäftliche Handlung (§ 5 UWG). Deshalb hier auch bewusst KEINE
// Euro-Beträge: Was ein französischer Tarif einbringt, sagt über eine deutsche
// Rechnung nichts aus.
export interface V2gExample {
  country: string;
  status: string;
  what: string;
}

export const V2G_EXAMPLES: V2gExample[] = [
  {
    country: "Frankreich",
    status: "Läuft kommerziell seit Ende 2024",
    what: "Renault-Fahrende speisen über eine passende Wallbox zurück ins Netz. Der rechtliche Rahmen dafür wurde eigens geschaffen.",
  },
  {
    country: "Großbritannien",
    status: "Ein Tarif am Markt",
    what: "Ein Versorger bietet einen eigenen Tarif fürs Rückspeisen an; die Regulierungsbehörde bereitet die breite Zulassung vor.",
  },
  {
    country: "Niederlande",
    status: "Pilotprojekte",
    what: "In Utrecht laufen mehrere hundert Ladepunkte im Netzbetrieb — getrieben von Netzengpässen, nicht von der Ersparnis der Einzelnen.",
  },
];

/** Sachstand Deutschland — datiert, weil sich hier 2026/27 noch viel bewegt.
 *  Gehört an den Wächter, nicht in den Fließtext. */
// Sachstand Deutschland — jede Aussage an Primärquellen geprüft (07/2026).
//
// Zwei verbreitete Falschaussagen stehen hier bewusst NICHT, weil sie sich in
// Ratgeberportalen und selbst in unserer eigenen Konzeptskizze eingenistet hatten:
//   1. „Vereinfachte Abrechnungsregeln gelten seit April 2026." — Falsch. Die
//      Bundesnetzagentur hat die gesetzliche Frist (30.06.2026) verstreichen lassen;
//      eine Festlegung existiert nicht. Damit fehlt die Abrechnungsgrundlage für V2G.
//   2. „Die Netzentgelt-Doppelbelastung ist weg." — Nur für Strom, der wirklich ins
//      Netz zurückfließt. Beim Puffern fürs eigene Haus läuft die Befreiung leer.
export const V2G_STAND_DE = {
  stand: "Juli 2026",
  netzentgelte:
    "Seit dem 1. Januar 2026 fallen Netzentgelte nur noch einmal an — allerdings nur für Strom, der tatsächlich ins Netz zurückfließt. Wer den Strom im eigenen Haus verbraucht, hat davon nichts.",
  abrechnung:
    "Die Regeln, nach denen zurückgespeister Strom abgerechnet wird, fehlen weiterhin: Die Bundesnetzagentur hat ihre eigene Frist Ende Juni 2026 verstreichen lassen.",
  norm: "Die technische Anschlussnorm gilt seit Ende Februar 2026.",
  huerde:
    "Nur 5,5 % der Haushalte haben einen digitalen Zähler, der Rückspeisung abrechnen kann. Und die wenigen verfügbaren Angebote schließen Haushalte mit eigener Photovoltaik im Eigenverbrauch bislang aus.",
  steuer:
    "Seit Januar 2026 ist geklärt, dass man beim Rückspeisen ins eigene Haus nicht zum Stromversorger wird und keine Stromsteuer anfällt. Für das Einspeisen ins Netz ist die steuerliche Behandlung dagegen offen.",
};

export function getVehicles(): V2hVehicle[] {
  return VEHICLES;
}

export function getVehicle(id: string): V2hVehicle {
  return VEHICLES.find(v => v.id === id) ?? CUSTOM_VEHICLE;
}

export function getProfile(id: V2hProfileId): V2hProfile {
  return V2H_PROFILES.find(p => p.id === id) ?? V2H_PROFILES[0];
}
