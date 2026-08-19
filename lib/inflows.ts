// ─── Inflows: welche Frage gehört in welchen Rechner, an welchen Ort ─────────
//
// WARUM ES DIESE DATEI GIBT. Eine Angabe, die eine Zahl im Ergebnis bewegt, muss
// an ZWEI Stellen erreichbar sein: im Frage-Flow und in der Verfeinerung des
// Ergebnisses. Wer sie nur in den Flow baut, sperrt sie hinter „Neu berechnen"
// weg; wer sie nur ins Ergebnis baut, lässt den Flow mit einem stillen Default
// rechnen. Beides ist am 07./08.08.2026 passiert — die Wärmepumpe war im
// PV-Ergebnis nur ein Häkchen, während ihr Heizstrom der größte
// Verbrauchsposten war.
//
// Diese Datei ist die ANTWORT auf „wo muss das überall hin?" — und der Ort, an
// dem ein NEUES Attribut eingetragen wird, bevor es gebaut wird. Der Test
// lib/__tests__/inflows.test.ts liest sie und prüft die Rechner-Dateien
// dagegen: fehlt ein Einbau, schlägt er an; steht einer da, der hier nicht
// vorgesehen ist, ebenfalls. So kann die Liste nicht stillschweigend von der
// Wirklichkeit abweichen — dieselbe Systematik wie lib/widget-registry.ts.
//
// NEUES ATTRIBUT EINFÜHREN (die fünf Schritte):
//   1. Hier einen Eintrag ergänzen: was bewegt es, wer braucht es, wo.
//   2. Rechenregel in lib/ bauen (nicht in der Oberfläche) — inklusive des
//      Satzes, was ohne Angabe gilt (siehe `folgeText`).
//   3. Feld-Baustein in components/ bauen, Muster: DachField / GebaeudeField.
//   4. In JEDEN hier genannten Rechner einbauen, an JEDEM genannten Ort.
//   5. Test laufen lassen — er sagt, was noch fehlt.

/** Wo eine Frage auftaucht. `flow` = im Schritt-Flow, `ergebnis` = in der
 *  Verfeinerung unter dem Ergebnis. Fast immer beides. */
export type InflowOrt = "flow" | "ergebnis";

export interface InflowEinbau {
  /** Datei relativ zum Repo-Wurzelverzeichnis. */
  datei: string;
  orte: InflowOrt[];
  /** Warum ein Ort fehlt, wo man ihn erwarten würde. Ohne Grund kein Fehlen. */
  begruendung?: string;
}

export interface Inflow {
  id: string;
  /** Der Baustein, der die Frage stellt — eine Quelle, nie pro Seite gebaut. */
  komponente: string;
  /** Was die Angabe im Ergebnis bewegt. Steht hier, damit „braucht der Rechner
   *  das?" beantwortbar ist, ohne den Rechenkern zu lesen. */
  bewegt: string;
  /** Was gilt, wenn nichts angegeben ist — und in welche Richtung das falsch
   *  liegt. Der Text selbst kommt aus dem Rechenkern, hier steht nur, welche
   *  Funktion ihn liefert. */
  folgeText: string;
  einbau: InflowEinbau[];
  /** Rechner, die diese Frage bewusst NICHT bekommen, mit Grund. Ohne diese
   *  Liste wäre „fehlt" nicht von „gehört da nicht hin" zu unterscheiden. */
  ausgenommen: { datei: string; grund: string }[];
}

const PV_RECHNER = "app/(site)/photovoltaik-rechner/rechner.tsx";
const EMPFEHLUNG = "app/(site)/pv-bedarf-berechnen/empfehlung.tsx";
const EINSPEISE = "app/(site)/einspeiseverguetung-rechner/rechner.tsx";
const WP_RECHNER = "app/(site)/waermepumpe-rechner/waermepumpe.tsx";
const KLIMA = "app/(site)/klimaanlage-stromkosten/klimaanlage.tsx";
const BALKON = "app/(site)/balkonkraftwerk/rechner/balkon.tsx";

export const INFLOWS: Inflow[] = [
  {
    id: "dach",
    komponente: "components/DachField.tsx",
    bewegt:
      "Den Ertrag je kWp. Der Standort-Ertrag kommt von PVGIS als BESTFALL " +
      "(optimale Neigung, Süden); Dachform, Ausrichtung und Neigung machen " +
      "daraus den Ertrag dieses Dachs — bis zu 39 % weniger.",
    folgeText: "dachUebersprungenFolge() in lib/dach-ertrag.ts",
    einbau: [
      { datei: PV_RECHNER, orte: ["flow", "ergebnis"] },
      {
        datei: EMPFEHLUNG,
        orte: ["flow"],
        begruendung:
          "Das Ergebnis dieses Flows IST die Seite des PV-Rechners (flow=emp) — " +
          "die Verfeinerung steht dort, ein zweiter Block wäre eine Kopie.",
      },
      {
        datei: EINSPEISE,
        orte: ["ergebnis"],
        begruendung:
          "Der Flow fragt eine BESTEHENDE Anlage ab (Inbetriebnahme, Satz). Der " +
          "Ertrag zählt dort nur für die Nebenrechnung Eigenverbrauch — als " +
          "Pflichtschritt wäre er im Weg.",
      },
    ],
    ausgenommen: [
      {
        datei: BALKON,
        grund:
          "Anderer Anwendungsfall (Betreiber-Entscheidung 08.08.2026): Module am " +
          "Geländer, oft senkrecht. Dachform und Dachneigung sind dort die " +
          "falschen Fragen; der Balkon bekommt eine eigene Ausrichtungs-Abfrage.",
      },
      {
        datei: WP_RECHNER,
        grund:
          "Die PV-Synergie rechnet mit einer Deckungsformel aus kWp und " +
          "WP-Verbrauch (estimatePvCoverageOfWp), nicht mit einem Standort-Ertrag. " +
          "OFFEN (bis 12/2026): sobald sie auf den echten Ertrag umgestellt wird, " +
          "gehört das Dach hier dazu.",
      },
      {
        datei: KLIMA,
        grund:
          "Die PV-Deckung kommt aus festen Anteilen je Kühlfenster " +
          "(aircon-config → pvCoverage), nicht aus einem Ertrag. Gleicher " +
          "Vorbehalt wie beim WP-Rechner.",
      },
    ],
  },
  {
    id: "gebaeude-wp",
    komponente: "components/GebaeudeField.tsx",
    bewegt:
      "Den Heizstrom der Wärmepumpe — in fast jeder Rechnung der größte " +
      "Verbrauchsposten. Haustyp (geteilte Wände), Wohnfläche, Dämmzustand und " +
      "Heizsystem; zwischen freistehend und Reihenmittelhaus liegen 20 %.",
    folgeText: "wpGebaeudeUebersprungenFolge() in lib/heatpump-core.ts",
    einbau: [
      { datei: PV_RECHNER, orte: ["flow", "ergebnis"] },
      {
        datei: EMPFEHLUNG,
        orte: ["flow"],
        begruendung: "Wie beim Dach: das Ergebnis ist die Seite des PV-Rechners.",
      },
      {
        datei: WP_RECHNER,
        orte: ["ergebnis"],
        begruendung:
          "Die Frage wird hier sehr wohl im Flow gestellt — nur nicht mit diesem " +
          "Baustein: Das Gebäude IST das Thema dieses Rechners und steht über " +
          "fünf eigene Schritte da (Neubau/Bestand, eigene Dämmstufen, " +
          "Warmwasser, Sanierungswege). Es in den Baustein zu zwängen würde den " +
          "Flow ärmer machen, nicht konsistenter. Im Ergebnis steht er als " +
          "Abschnitt „Dein Gebäude“; die abgeleiteten Größen (Heizwärme, " +
          "Heizlast) bleiben daneben editierbar — die eine Stelle im Projekt, an " +
          "der zwei Wege zur selben Zahl richtig sind: schätzen über das " +
          "Gebäude, messen über die eigene Gasrechnung.",
      },
    ],
    ausgenommen: [
      {
        datei: EINSPEISE,
        grund:
          "Rechnet die Vergütung einer bestehenden Anlage. Der Verbrauch wird " +
          "dort direkt erfragt, eine Wärmepumpe steckt darin schon drin.",
      },
      {
        datei: BALKON,
        grund:
          "Ein Balkonkraftwerk deckt Grundlast, keine Heizung — 800 W speisen " +
          "keine Wärmepumpe. Eine Gebäudeabfrage würde dort eine Genauigkeit " +
          "vortäuschen, die das Modell gar nicht abbildet.",
      },
      {
        datei: KLIMA,
        grund:
          "Der Heizblock fragt den Gebäudestandard eigens ab (Dämmung wirkt beim " +
          "Heizen anders als beim Kühlen, siehe CLAUDE.md → Modellprämissen). " +
          "Kein WP-Gebäude im Sinne dieses Bausteins.",
      },
    ],
  },
];

/** Alle Rechner, die dieser Inflow berührt — Einbau wie Ausnahme. Damit ein
 *  neuer Rechner nicht stillschweigend durch das Raster fällt: er muss in
 *  jedem Inflow entweder eingebaut oder begründet ausgenommen sein. */
export function betroffeneDateien(inflow: Inflow): string[] {
  return [...inflow.einbau.map(e => e.datei), ...inflow.ausgenommen.map(a => a.datei)];
}

/** Die Rechner-Dateien, die es im Projekt gibt. Wächst diese Liste, muss jeder
 *  Inflow eine Aussage über den neuen Rechner treffen. */
export const RECHNER_DATEIEN = [PV_RECHNER, EMPFEHLUNG, EINSPEISE, WP_RECHNER, KLIMA, BALKON];
