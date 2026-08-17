// Balkon-PV / Steckersolar model config.
//
// Steckersolargeräte ("Balkonkraftwerke") sind kleine Anlagen (ein bis vier
// Module) mit einem Wechselrichter, der seit dem Solarpaket I (Mai 2024) bis
// 800 W ins Hausnetz einspeisen darf; die Modulleistung darf bis 2.000 Wp
// betragen. Anmeldung: nur noch Marktstammdatenregister, keine Netzbetreiber-
// Genehmigung mehr.
//
// RECHT vs. NORM — nicht verwechseln (Council-Prüfung 07/2026):
//   GESETZ (§ 8 Abs. 5a EEG): 2.000 Wp Module / 800 VA Wechselrichter. Das ist die
//   einzige verbindliche Grenze. Von 960 Wp steht dort nichts.
//   VORNORM (DIN VDE V 0126-95, seit 01.12.2025): sieht für den Betrieb an einer
//   normalen Schuko-Steckdose max. 960 Wp Module vor (= 800 W + 20 %), darüber eine
//   "spezielle Energiesteckvorrichtung" (technologieoffen formuliert — "Wieland" ist
//   ein Markenname, keine Anforderung). Diese Vornorm ist FREIWILLIG und eine
//   PRODUKTnorm: Adressat sind Hersteller, nicht Betreiber. Die DKE selbst schreibt:
//   "Die Anwendung von Normen ist grundsätzlich freiwillig." Sie ist zudem eine
//   Vornorm ("V") und wird spätestens nach drei Jahren überprüft → schukoMaxWp
//   gehört deshalb an den Wächter (reviewBy), nicht still in den Code.
//   Wichtig: Die Vornorm gilt ausdrücklich NUR für Geräte OHNE Speicher — die DKE:
//   "Die Konformität mit dieser Produktnorm ist nur für Steckersolargeräte ohne
//   Speicher möglich."
// Deshalb formuliert der Rechner hier nie "Pflicht"/"verboten", sondern nennt
// Gesetz und Norm getrennt.
//
// Wirtschaftlich zählt fast nur der SELBST genutzte Strom: für Balkonkraftwerke
// gibt es keine Einspeisevergütung, der Überschuss fließt unvergütet ins Netz.
// Deshalb modellieren wir Ertrag → Eigenverbrauch → Ersparnis, nicht
// Einspeiseerlöse.
//
// Rechen-Basis: siehe CLAUDE.md „Geteilte Rechen-Basis". Standort-Ertrag kommt als
// PVGIS-Monatsprofil, die Haushaltslast aus calcHourlyConsumption, der Tag/Nacht-
// Split über die geteilte tagQuote — hier steht nur, was Balkon-spezifisch ist.

import { NUTZUNG, NO_PLZ_DEFAULT_YIELD } from "./constants";
import { DEFAULT_PRICES } from "./prices-config";

export type BalkonSetId = "single" | "duo" | "max";
export type BalkonOrientationId = "sued_flach" | "sued_gelaender" | "ost_west" | "nord_schatten";
export type BalkonPresenceId = "weg" | "teils" | "home";
export type BalkonStorageId = "none" | "small" | "large";

export interface BalkonSet {
  id: BalkonSetId;
  label: string;
  what: string;
  moduleWp: number;   // Modul-Spitzenleistung (Wp)
  inverterW: number;  // Wechselrichter-Grenze (W AC)
  price: number;      // typischer Set-Preis inkl. Halterung (€)
}

export interface BalkonOrientation {
  id: BalkonOrientationId;
  label: string;
  sub: string;
  // Kein Ertragsfaktor mehr: Jede Ausrichtung hat in lib/solar-year.ts eine eigene
  // PVGIS-Stundenreihe mit eigenem Tagesverlauf. Ein Faktor koennte nur die Menge
  // skalieren, nicht die Form — und lag frueher grob daneben (Ost/West 0,85 statt
  // real 0,51; Nord 0,5 statt real 0,20).
  //
  // BEKANNTE GRENZE (HTW-Validierung 07/2026): "ost_west" rechnet mit einer reinen
  // OST-Reihe, und beide Optionen fassen je zwei Faelle zusammen, die sich
  // unterschiedlich verhalten:
  //   - Ost vs. West: In der Menge fast gleich (PVGIS 506 vs. 496 kWh/kWp), im
  //     Eigenverbrauch nicht. West liefert abends, wenn gekocht wird. Die HTW misst
  //     deshalb fuer West MEHR Eigenverbrauch als fuer Ost (294 vs. 288 kWh) trotz
  //     weniger Ertrag — bei uns kommt es andersherum heraus (Ost +12 %). Wir
  //     rechnen West also als Ost und liegen beim Vorzeichen falsch.
  //   - Nord vs. verschattet: Eine verschattete Suedwand hat einen voellig anderen
  //     Tagesverlauf als eine Nordwand; die Reihe ist echtes Nord, ohne Verschattung.
  // Beides ist bewusst offen (eigene West-Reihe + getrennte Verschattungs-Option
  // waeren die Fixes) — es haengt an der Frage, wie fein der Flow fragen soll.
}

export interface BalkonPresence {
  id: BalkonPresenceId;
  label: string;
  sub: string;
  // Tag-Anteil am Haushaltsverbrauch (7–18 Uhr). GETEILTE Größe: dieselbe, mit der
  // der PV-Rechner rechnet (NUTZUNG.tagQuote, BDEW H0) — nicht neu erfinden.
  tagQuote: number;
}

export interface BalkonStorage {
  id: BalkonStorageId;
  label: string;
  sub: string;
  kwh: number;   // nutzbare Kapazität (kWh)
  price: number; // Mehrkosten inkl. Wechselrichter/App (€), 0 = ohne Speicher
}

export interface BalkonConfig {
  sets: BalkonSet[];
  orientations: BalkonOrientation[];
  presence: BalkonPresence[];
  storage: BalkonStorage[];
  defaultSet: BalkonSetId;
  defaultOrientation: BalkonOrientationId;
  defaultPresence: BalkonPresenceId;
  defaultStorage: BalkonStorageId;

  specificYield: number;    // Fallback kWh/kWp im Jahr, wenn keine PLZ gesetzt ist.
                            // Mit PLZ kommen die 12 Monatswerte direkt von PVGIS.

  // Modulleistung, bis zu der die VDE-Vornorm den Betrieb an einer normalen
  // Schuko-Steckdose vorsieht. FREIWILLIGE Vornorm, kein Gesetz (siehe Kopf) —
  // wird spätestens 2028 überprüft, deshalb im Wächter-Runbook geführt.
  schukoMaxWp: number;
  // Was die Vornorm oberhalb davon vorsieht (Einbau durch Elektrofachkraft).
  // Marktangabe, keine Norm-/Gesetzesgröße → Wächter prüft sie mit.
  energySocketCostMin: number;
  energySocketCostMax: number;

  // HINWEIS: Clipping-Deckel, Eigenverbrauchs-Power-Law und Speicher-Durchsatz
  // standen früher hier als kalibrierte Konstanten. Sie sind ersatzlos entfallen —
  // lib/balkon-sim.ts simuliert das Jahr stündlich auf der geteilten Basis
  // (PVGIS-Monatswerte + calcHourlyConsumption), damit ergeben sich Clipping,
  // Eigenverbrauch und Speicher-Nutzen als Ergebnis statt als Annahme.

  // Lade-/Entlade-Wirkungsgrad über den Umlauf (0–1). Greift in balkon-sim.ts
  // EINMAL, beim Entladen — das Laden ist dort verlustfrei, der Wert ist also der
  // vollständige Round-Trip und kein Einzelpfad-Wirkungsgrad.
  //
  // RECHENREGEL: Wir übernehmen den Wert, den die HTW Berlin für genau diese
  // Geräteklasse (≤ 3 kWh) in ihrem Stecker-Solar-Simulator ansetzt —
  // 0,917 Laden × 0,920 Entladen × 0,978 Batterie = 82,5 % (Dokumentation der
  // Berechnungsgrundlagen V3.0, Kap. 4.2). Das ist die einzige institutionelle
  // Zahl für diese Klasse, und sie passt topologisch: Die HTW modelliert
  // AC-gekoppelt, unsere Simulation ebenso (siehe Kommentar in balkon-sim.ts).
  //
  // Zwei bekannte Korrekturen wirken gegenläufig und heben sich näherungsweise auf,
  // deshalb bleibt es beim HTW-Wert statt bei einem gerundeten Kompromiss:
  //  + DC-Kopplung. Reale Balkonspeicher laden direkt am Modul-Gleichstrom und
  //    sparen eine Wandlung. Gemessen ist der Vorteil aber klein: dasselbe
  //    Anker-Gerät DC 83,5 % vs. AC 82,1 %, derselbe KOSTAL-Wechselrichter als
  //    Hybrid vs. AC-Batteriewechselrichter 7,3 % vs. 8,1 % Gesamtverluste
  //    (Stromspeicher-Inspektion 2026, Tab. 4) — also 0,4–1,4 Prozentpunkte,
  //    nicht die 5–8, die kursierende Pauschalen ("DC 90–95 %") unterstellen.
  //  − Standby. Die HTW schließt Standby- und Regelungsverluste ausdrücklich AUS,
  //    die 82,5 % sind damit eine Obergrenze. Real läuft die Elektronik mit
  //    (Anker 9,5 W, Zendure Hyper 2000 1,5–2 W); über ein Jahr mit vielen
  //    Leerlaufstunden kostet das mehrere Prozentpunkte. Unquantifiziert.
  //
  // Gegenprobe an Messungen (EnergieMagazin, 13 Geräte, DC rein → AC raus):
  // bei 800 W Volllast 80–89,7 %, bei 150 W Teillast 71,6–79,5 %. KEIN Gerät
  // erreicht 90 %, auch nicht im Bestpunkt. Und Teillast ist beim Entladen der
  // Normalfall, nicht die Ausnahme: 72 % der nächtlichen Leistungsflüsse liegen
  // unter 300 W, 96 % unter 750 W (HTW / Verbraucherzentrale RLP, Faktencheck 5,
  // 09/2024). Der frühere Wert 0,90 war eine Herstellerangabe und lag über dem
  // Bestpunkt des besten Geräts.
  //
  // Council 07/2026: 3/3 gegen 0,90, adversarialer Prüfer eingeschlossen (konnte
  // den Wert nicht verteidigen). Sein Einwand "vielleicht wird der Verlust doppelt
  // abgezogen" ist am Code geprüft und ausgeräumt — siehe oben, greift einmal.
  //
  // Der Wert steht auf /datenstand und verschiebt Nutzer-Ergebnisse (weniger
  // Speicher-Zugewinn → seltener eine Speicher-Empfehlung). Das ist beabsichtigt.
  storageRoundtrip: number;
  storageLifeYears: number;        // realistische Speicher-Lebensdauer (Jahre) — der
                                   // Speicher-Zusatznutzen zählt nur bis hierhin, danach
                                   // laufen die Module weiter.
  storageRecommendMaxPayback: number; // Ein Speicher wird nur EMPFOHLEN, wenn er sich
                                   // innerhalb dieser Jahre selbst amortisiert. Deutlich
                                   // unter der Lebensdauer, damit die Empfehlung ehrlich
                                   // bleibt: Speicher nur da, wo er sich klar rechnet
                                   // (viel Überschuss = tagsüber wenig Eigenverbrauch),
                                   // sonst empfehlen wir bewusst ohne — Balkonspeicher
                                   // amortisieren sich oft nicht.

  lifetimeYears: number;
  degradation: number;
  gridCo2PerKwh: number;    // kg CO₂/kWh, DE-Netzmix (= WP-Rechner)
  stromPrice: number;       // Fallback €/kWh

  validFrom: string;            // ISO — Stand der Preis-/Marktwerte (Monat)
  geprueftIso: string;          // ISO — Tag des letzten Laufs, der die Preisquellen erreicht hat
  reviewBy: string;             // ISO — bis dahin gegen Quellen prüfen (scripts/balkon-verify.md)
}

export const DEFAULT_BALKON_CONFIG: BalkonConfig = {
  sets: [
    { id: "single", label: "1 Modul", what: "~500 Wp mit kleinem Wechselrichter — für schmale Balkone oder eine Wand.", moduleWp: 500, inverterW: 600, price: 300 },
    // 960 Wp statt früher 1.000: genau die Grenze, bis zu der die VDE-Vornorm den
    // normalen Schuko-Stecker vorsieht. Der Markt verkauft seit der Norm exakt
    // solche Sets — damit ist die gängigste Größe ohne Sternchen normkonform.
    { id: "duo", label: "2 Module (Standard)", what: "~960 Wp am 800-W-Wechselrichter — die gängigste Größe, läuft am normalen Schuko-Stecker.", moduleWp: 960, inverterW: 800, price: 500 },
    { id: "max", label: "4 Module (Maximum)", what: "~2.000 Wp am 800-W-Wechselrichter — mehr Ertrag morgens und abends, die Mittagsspitze wird gedrosselt. Gesetzlich erlaubt; die VDE-Vornorm sieht dafür eine spezielle Einspeisesteckdose vor.", moduleWp: 2000, inverterW: 800, price: 800 },
  ],
  orientations: [
    { id: "sued_flach", label: "Süd, aufgeständert", sub: "Optimaler Winkel (Flachdach, Garten, Terrasse)" },
    { id: "sued_gelaender", label: "Süd, senkrecht am Geländer", sub: "Klassischer Balkon" },
    { id: "ost_west", label: "Ost oder West, senkrecht", sub: "Halbtags Sonne — rund halber Ertrag" },
    { id: "nord_schatten", label: "Nord oder verschattet", sub: "Wenig direkte Sonne — lohnt selten" },
  ],
  // tagQuote wird aus der geteilten NUTZUNG-Tabelle referenziert (nicht abgeschrieben),
  // damit Balkon- und PV-Rechner nicht auseinanderlaufen.
  presence: [
    { id: "weg", label: "Tagsüber selten", sub: "Meist berufstätig außer Haus", tagQuote: NUTZUNG[0].tagQuote },
    { id: "teils", label: "Teils zuhause", sub: "Homeoffice-Tage, Familie", tagQuote: NUTZUNG[1].tagQuote },
    { id: "home", label: "Oft zuhause", sub: "Homeoffice, Rente, Kinder", tagQuote: NUTZUNG[2].tagQuote },
  ],
  // Größen und Preise an echten, getesteten Geräten (Stand 2026-07). Das Segment
  // unter ~1,5 kWh ist als Einstieg vom Markt verschwunden (Zendure AB1000 läuft
  // nur noch als Altbestand) — Einstieg ist heute ~1,6 kWh.
  //   ~1,6 kWh: Anker Solarbank 2 Pro (~410–460 €)
  //   ~2,7 kWh: Anker Solarbank 3 Pro (ab ~890 €, Testsieger)
  // Quervergleich: Growatt Noah 2000 (2,0 kWh, ab 600 €), Zendure SolarFlow 800 Pro
  // (1,9 kWh, ab 730 €). Marktspanne reiner Balkonspeicher: 400–1.500 €.
  storage: [
    { id: "none", label: "Ohne Speicher", sub: "Überschuss fließt unvergütet ins Netz", kwh: 0, price: 0 },
    { id: "small", label: "~1,6 kWh Speicher", sub: "Einstiegsgröße, deckt den Abend", kwh: 1.6, price: 430 },
    { id: "large", label: "~2,7 kWh Speicher", sub: "Mehr Puffer — mehr, als ein Balkon meist füllen kann", kwh: 2.7, price: 890 },
  ],
  defaultSet: "duo",
  defaultOrientation: "sued_gelaender",
  defaultPresence: "teils",
  defaultStorage: "none",

  specificYield: NO_PLZ_DEFAULT_YIELD, // konservativer Bundesschnitt; per PLZ von PVGIS überschrieben

  schukoMaxWp: 960,
  energySocketCostMin: 100,
  energySocketCostMax: 300,

  storageRoundtrip: 0.825, // HTW-Wert für diese Geräteklasse, siehe Herleitung oben
  storageLifeYears: 12,
  storageRecommendMaxPayback: 8,

  lifetimeYears: 20,
  degradation: 0.005,
  gridCo2PerKwh: 0.38,
  stromPrice: DEFAULT_PRICES.electricityPrice, // kanonischer Haushaltspreis (kein eigener Wert → kein Drift)

  validFrom: "2026-07",
  /** Tag, an dem ein Lauf die Preisquellen zuletzt wirklich gelesen hat.
   *  Getrennt von `validFrom`, obwohl bei einem Markt-Scan beide zusammen
   *  entstehen: Sichtbar sind sie als „Set- und Speicherpreise von Juli 2026,
   *  geprüft am 15. Juli 2026" — und sobald ein Lauf die Preise bestätigt, ohne
   *  dass sich einer bewegt, laufen sie auseinander. Startwert ist der Lauf des
   *  Geräte-Wächters vom 15.07.2026, aus dem die Preise stammen. */
  geprueftIso: "2026-07-15",
  reviewBy: "2026-10", // Quartals-Rhythmus (scripts/balkon-verify.md), nicht jährlich
};

/** Ab diesem Jahresverbrauch weisen wir darauf hin, dass eine Dachanlage deutlich
 *  mehr holt — ein Balkonkraftwerk deckt dann nur noch die Grundlast. Bewusst
 *  konservativ. Steht hier, weil die Schwelle im Rechner-Ergebnis UND im
 *  Textabschnitt der Seite genannt wird; als zweite getippte Zahl würde eine
 *  davon beim nächsten Anfassen zurückbleiben. */
export const BALKON_DACH_HINWEIS_KWH = 3500;

// ─── Rechtsaussagen zu Steckersolar — EINE Quelle ───────────────────────────
//
// Dieselben Sätze stehen im Rechner-Ergebnis UND im FAQ der Rechner-Seite (und
// von dort im FAQPage-JSON-LD). Als handgetippte Zweitkopie würde eine Korrektur
// stumm nur eine der Oberflächen erreichen — dieselbe Systematik wie bei
// `bioTreppeStufenText()` / `eegVerfahrenSatz()` (CLAUDE.md, Faktenprüfung 11).
// Der Quartals-Wächter (scripts/balkon-verify.md, Abschnitt „Anmelde-Regel")
// prüft diese Sätze; er findet sie ab jetzt hier statt im JSX.
//
// ZUSTAND: geltendes Recht (Solarpaket I, in Kraft seit 16.05.2024) — kein
// Entwurf. Die VDE-Vornorm ist ausdrücklich KEIN Gesetz, sondern freiwillig;
// dieser Unterschied steht im Satz selbst und darf beim Kürzen nicht wegfallen.
// Festgenagelt von lib/__tests__/balkon.test.ts → „Rechtssätze".
export const BALKON_RECHT = {
  /** Tag, an dem die Sätze hier zuletzt gegen die Primärquellen gelesen wurden.
   *  BEWUSST ein Stichtag und kein Renderdatum: Er darf nur mitwandern, wenn
   *  jemand die Quellen wirklich wieder aufgeschlagen hat (Regel „Prüfdatum nur
   *  stempeln, was geprüft wurde"). Der Quartals-Wächter zieht ihn nach. */
  geprueftIso: "2026-08-16",

  /** Anmeldeweg seit dem Solarpaket I. */
  anmeldung:
    "Anmeldung seit 2024 vereinfacht: eine Registrierung im Marktstammdatenregister genügt, keine Netzbetreiber-Genehmigung.",
  /** Mietwohnung und Eigentümergemeinschaft. */
  mieteEigentum:
    "Seit 2024 gelten Steckersolargeräte als privilegierte Maßnahme — Vermieter und Eigentümergemeinschaft dürfen die Montage nur noch aus wichtigem Grund ablehnen. Ein kurzes Einverständnis vorab bleibt trotzdem sinnvoll.",
  /** Keine Vergütung für den Überschuss — der Grund, warum nur Eigenverbrauch zählt. */
  keineVerguetung:
    "Für Balkonkraftwerke gibt es keine Einspeisevergütung — der Überschuss fließt unvergütet ins Netz. Deshalb zählt nur der Strom, den du selbst verbrauchst.",

  // Geprüft am 16.08.2026 im Volltext, Auszug im Repo:
  // docs/quellen/ustae-12-18-nullsteuersatz.txt
  //   § 12 Abs. 3 UStG — Nullsteuersatz, Anlage an einer Wohnung, höchstens 30 kWp.
  //   UStAE 12.18 Abs. 2 S. 6 — nennt Steckersolargeräte ausdrücklich.
  //   UStAE 12.18 Abs. 7 S. 3 — bis 800 VA entfällt sogar die Nachweispflicht,
  //     die Betreibereigenschaft wird unterstellt (bis 2024: 600 W; geändert durch
  //     BMF-Schreiben v. 15.08.2024, III C 2 - S 7220/22/10002 :017).
  // DER VORBEHALT IST DER PUNKT, NICHT BEIWERK: Die Vereinfachung für Speicher
  // greift nach Abs. 7 S. 10 erst ab 5 kWh nutzbarer Kapazität — unsere
  // Balkonspeicher (1,6 / 2,7 kWh) liegen darunter. Nach S. 9 können sie
  // begünstigt sein, automatisch sind sie es nicht. Deshalb steht hier „das Set",
  // nicht „Set und Speicher". Wer den Satz kürzt, macht daraus eine falsche Zusage.
  nullsteuer:
    "Auf das Set selbst fällt keine Mehrwertsteuer an: Für Solarmodule an einer Wohnung gilt der Nullsteuersatz, und bis 800 Voltampere verlangt das Finanzamt dafür nicht einmal einen Nachweis. Bei Speichern unter 5 kWh greift diese Vereinfachung nicht automatisch — hier lohnt der Blick auf die Rechnung des Händlers.",

  // Geprüft am 16.08.2026 über die vollständige Verweiskette (nicht aus § 95 EnWG
  // allein ableitbar — eine Verordnung löst nur bei ausdrücklicher Rückverweisung
  // ein Bußgeld aus, und genau die gibt es hier):
  //   § 5 Abs. 1 MaStRV — Registrierung binnen eines Monats nach Inbetriebnahme.
  //   § 21 Nr. 1 MaStRV — „Ordnungswidrig im Sinn des § 95 Absatz 1 Nummer 5
  //     Buchstabe e des Energiewirtschaftsgesetzes handelt, wer vorsätzlich oder
  //     fahrlässig entgegen … § 5 Absatz 1 … eine Registrierung nicht, nicht
  //     richtig, nicht in der vorgeschriebenen Weise oder nicht rechtzeitig
  //     vornimmt". Das ist die Rückverweisung.
  //   § 95 Abs. 2 EnWG — Rahmen für Nr. 5 Buchst. e: bis 50.000 €.
  // Die 50.000 € stehen BEWUSST NICHT im Satz: Das ist der gesetzliche Höchstrahmen
  // für alle Verstöße dieser Nummer, nicht das, was einem Balkon-Betreiber droht
  // (§ 17 OWiG bemisst nach Bedeutung und Vorwurf). Die Zahl als Drohung zu setzen
  // wäre formal belegbar und trotzdem irreführend — genau die Sorte Halbwahrheit,
  // mit der die Wettbewerber-Seiten zu diesem Keyword arbeiten.
  anmeldeFrist:
    "Zeit ist dafür ein Monat ab Inbetriebnahme. Wer die Registrierung versäumt, begeht formal eine Ordnungswidrigkeit — die Anmeldung selbst ist kostenlos und in wenigen Minuten erledigt.",
} as const;
