// City registry for the regional landing pages.
// URL scheme is hierarchical Bundesland > Kommune:
//   /photovoltaik-foerderung/[bundesland]/[stadt]   (e.g. /…/bayern/wuerzburg)
// Each city maps a URL slug to its MaStR region id (AGS) and a regional PV
// yield. The municipal funding program (if any) lives in the standalone
// funding dataset (lib/funding-programs.ts) and is referenced by id, so the
// program data can also power an overview page and cross-program links.

import { allFundingPrograms, type FundingStatus, type FundingProgram } from "./funding-programs";
import { releaseFreigegeben } from "./release-plan";

export interface AtlasCity {
  slug: string;
  name: string;
  /**
   * MaStR-Regionsschlüssel — fünfstellig für eine kreisfreie Stadt oder einen
   * Landkreis, ACHTSTELLIG für eine kreisangehörige Gemeinde.
   *
   * Der Schlüssel bestimmt, welcher Bestand unter dem Ortsnamen steht: Der
   * Atlas reicht ihn unverändert als Präfix durch. Eine Gemeinde mit dem
   * Schlüssel ihres Landkreises einzutragen setzt deshalb den Bestand des
   * ganzen Kreises unter den Ortsnamen — bei Linsengericht der des
   * Main-Kinzig-Kreises statt der der Gemeinde. Das ist die schwerste
   * Fehlerklasse des Projekts, und sie fällt niemandem auf, weil die Seite
   * dabei völlig normal aussieht.
   *
   * Genau so lag es bis zum 19.08.2026 bei Aachen, Hannover und Saarbrücken:
   * Ihre fünfstelligen Schlüssel gehören der StädteRegion, der Region und dem
   * Regionalverband — nicht der Stadt. Die Hannover-Seite zeigte damit den
   * Bestand von 1,14 Mio. Einwohnern unter dem Namen einer Stadt mit 522.000.
   */
  ags: string;
  bundesland: string;
  /**
   * Landkreis einer kreisangehörigen Gemeinde — steht auf der Seite, damit klar
   * ist, welcher Ort gemeint ist. Ein Ortsname allein ist mehrdeutig:
   * Mühlhausen gibt es als 5.000-Einwohner-Gemeinde in der Oberpfalz und als
   * 36.000er-Stadt in Thüringen, Senden in NRW und in Bayern. Ohne den Kreis
   * daneben liest man den Bestand des einen als den des anderen.
   *
   * Leer bei kreisfreien Städten und Landkreisen — die sind für sich eindeutig.
   */
  kreis?: string;
  /**
   * Standort-Ertrag kWh je kWp bei optimaler Neigung nach Süden.
   *
   * Kommt aus `/api/pvgis` an der repräsentativen Lage des Orts
   * (lib/atlas-geo.ts → gemeindeGeo), also aus derselben Quelle, mit der auch
   * die Rechner arbeiten — nicht geschätzt. Bis zum 19.08.2026 standen hier von
   * Hand gesetzte Näherungswerte, und zwar in 104 von 105 Fällen ZU NIEDRIG,
   * im Mittel um 43 kWh/kWp. Das ist derselbe Fehler, der am 18.08.2026 schon
   * beim bundesweiten Mittelwert behoben wurde: Ein Sicherheitspuffer gehört
   * nicht in den Standortwert, sondern dorthin, wo die Angabe des Nutzers ihn
   * begründet — die Dach-Matrix zieht ihn ohnehin ein zweites Mal ab.
   *
   * Landkreis-Einträge behalten einen von Hand gesetzten Wert: Ein Kreis hat
   * keinen Punkt, an dem man messen könnte.
   */
  yieldKwhKwp: number;
  /** Id into FUNDING_PROGRAMS. Nur nötig, wenn die Zuordnung über den
   *  Gemeindeschlüssel nicht eindeutig ist — sonst leitet fundingFor() sie ab. */
  fundingId?: string;
}

/**
 * Das Förderprogramm dieser Stadt — abgeleitet, nicht von Hand gepflegt.
 *
 * WARUM (18.08.2026): Katalog und Städte-Verzeichnis waren zwei Listen, die
 * auseinanderliefen. Herne und Ludwigshafen standen längst im Verzeichnis, ihre
 * neu aufgenommenen Programme aber blieben unsichtbar, weil niemand das Feld
 * `fundingId` nachgetragen hatte — die Seite existierte, sagte aber nichts vom
 * Programm. Ein zweites Verzeichnis, das man synchron halten MUSS, wird
 * irgendwann nicht synchron gehalten.
 *
 * Deshalb: Steht kein `fundingId` da, wird das Programm über den
 * Gemeindeschlüssel gesucht — dieselbe Zuordnung, die auch der Rechner benutzt.
 * Ein gesetztes `fundingId` gewinnt weiterhin, für die Fälle, in denen mehrere
 * Programme auf denselben Schlüssel passen.
 */
export function fundingFor(c: AtlasCity): FundingProgram | undefined {
  return fundingForFrom(allFundingPrograms(), c);
}

/**
 * Dieselbe Zuordnung über einer FREMDEN Programmliste — für die Seiten, die
 * ihre Daten aus der Datenbank lesen statt aus dem Code-Seed.
 *
 * Ohne diese Variante lösten Stadtseiten, Bundesland-Übersicht und Sitemap
 * weiterhin über das handgepflegte `fundingId` auf: Die drei neu verknüpften
 * Städte hätten eine Seite bekommen, auf der kein Programm steht. Die Ableitung
 * muss überall dieselbe sein, sonst verschiebt sich die Drift nur eine Ebene
 * tiefer.
 */
export function fundingForFrom(programs: FundingProgram[], c: AtlasCity): FundingProgram | undefined {
  if (c.fundingId) return programs.find((p) => p.id === c.fundingId);

  // Ein Programm gilt für diese Stadt, wenn ihr Gemeindeschlüssel INNERHALB des
  // Fördergebiets liegt: Land (2 Stellen) ⊃ Kreis/kreisfreie Stadt (5) ⊃
  // Gemeinde (8). Die Stadt trägt hier fünf Stellen.
  //
  // Zwei Fehler der ersten Fassung, gefunden in der Prüfrunde am 18.08.2026:
  //
  //  1. Sie kürzte den Programm-Schlüssel auf fünf Stellen. Damit hätte
  //     Höhr-Grenzhausens Zuschuss (07143032) dem GANZEN Westerwaldkreis
  //     gegolten, sobald jemand dafür einen Eintrag anlegt — ein Dorfprogramm,
  //     das für jede Postleitzahl des Kreises Geld abzieht. Ein achtstelliger
  //     Schlüssel ist ENGER als die Stadtzeile und darf sie deshalb nie treffen.
  //  2. Bei mehreren Treffern gab sie `undefined` zurück. Landesprogramme
  //     (Berlin 11, Bremen 04) passen aber auf jede Stadt ihres Landes: Bekäme
  //     Bremerhaven ein eigenes Programm, hätten sich Land und Kommune
  //     gegenseitig aufgehoben und die Seite wäre still auf 404 gefallen.
  //     Richtig ist der SPEZIFISCHERE Schlüssel — die Kommune schlägt das Land.
  const passend = programs
    .filter((p) => p.level !== "bund" && p.agsCode && p.agsCode.length <= c.ags.length && c.ags.startsWith(p.agsCode))
    .sort((a, b) => b.agsCode!.length - a.agsCode!.length);

  // Gleich spezifisch und trotzdem mehrere: echte Mehrdeutigkeit, dann gehört
  // `fundingId` gesetzt. Raten wäre hier schlimmer als nichts zu zeigen.
  if (passend.length > 1 && passend[0].agsCode!.length === passend[1].agsCode!.length) return undefined;
  return passend[0];
}

export const ATLAS_CITIES: AtlasCity[] = [
  {
    slug: "stuttgart",
    name: "Stuttgart",
    ags: "08111",
    bundesland: "Baden-Württemberg",
    yieldKwhKwp: 1132,
    fundingId: "stuttgart-solaroffensive",
  },
  {
    slug: "frankfurt",
    name: "Frankfurt am Main",
    ags: "06412",
    bundesland: "Hessen",
    yieldKwhKwp: 1063,
    fundingId: "frankfurt-klimabonus",
  },
  {
    slug: "karlsruhe",
    name: "Karlsruhe",
    ags: "08212",
    bundesland: "Baden-Württemberg",
    yieldKwhKwp: 1138,
    fundingId: "karlsruhe-klimabonus",
  },
  {
    slug: "regensburg",
    name: "Regensburg",
    ags: "09362",
    bundesland: "Bayern",
    yieldKwhKwp: 1112,
    fundingId: "regensburg-effizient",
  },
  {
    slug: "wuerzburg",
    name: "Würzburg",
    ags: "09663",
    bundesland: "Bayern",
    yieldKwhKwp: 1104,
    fundingId: "wuerzburg-klimastadt",
  },
  {
    slug: "darmstadt",
    name: "Darmstadt",
    ags: "06411",
    bundesland: "Hessen",
    yieldKwhKwp: 1076,
    fundingId: "darmstadt-pv",
  },
  {
    slug: "koeln",
    name: "Köln",
    ags: "05315",
    bundesland: "Nordrhein-Westfalen",
    yieldKwhKwp: 1044,
    fundingId: "koeln-pv",
  },
  {
    slug: "duesseldorf",
    name: "Düsseldorf",
    ags: "05111",
    bundesland: "Nordrhein-Westfalen",
    yieldKwhKwp: 1035,
    fundingId: "duesseldorf-klimafreundlich",
  },
  // ── Batch Juni 2026 (je 1 Recherche-Agent → offizielle Quelle) ──────────────
  { slug: "muenchen", name: "München", ags: "09162", bundesland: "Bayern", yieldKwhKwp: 1140, fundingId: "muenchen-fkg" },
  { slug: "nuernberg", name: "Nürnberg", ags: "09564", bundesland: "Bayern", yieldKwhKwp: 1071 },
  { slug: "freiburg", name: "Freiburg im Breisgau", ags: "08311", bundesland: "Baden-Württemberg", yieldKwhKwp: 1119, fundingId: "freiburg-stromerzeugung" },
  { slug: "heidelberg", name: "Heidelberg", ags: "08221", bundesland: "Baden-Württemberg", yieldKwhKwp: 1064, fundingId: "heidelberg-rev" },
  { slug: "mannheim", name: "Mannheim", ags: "08222", bundesland: "Baden-Württemberg", yieldKwhKwp: 1108, fundingId: "mannheim-solarbonus" },
  { slug: "muenster", name: "Münster", ags: "05515", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1025, fundingId: "muenster-klimafreundlich" },
  { slug: "aachen", name: "Aachen", ags: "05334002", kreis: "StädteRegion Aachen", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1054 },
  { slug: "wiesbaden", name: "Wiesbaden", ags: "06414", bundesland: "Hessen", yieldKwhKwp: 1109, fundingId: "wiesbaden-eswe-speicher" },
  { slug: "mainz", name: "Mainz", ags: "07315", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1109, fundingId: "mainz-kipki-speicher" },
  { slug: "leipzig", name: "Leipzig", ags: "14713", bundesland: "Sachsen", yieldKwhKwp: 1081 },
  { slug: "hamburg", name: "Hamburg", ags: "02000", bundesland: "Hamburg", yieldKwhKwp: 992 },
  { slug: "bremen", name: "Bremen", ags: "04011", bundesland: "Bremen", yieldKwhKwp: 1002, fundingId: "bremen-rundumshaus" },
  // ── Batch Juni 2026, Teil 2 (je 1 Recherche-Agent → offizielle Quelle) ──────
  // Deckt die bis dahin fehlenden Bundesländer ab (NI, SH, TH, ST, BB, MV, SL).
  { slug: "hannover", name: "Hannover", ags: "03241001", kreis: "Region Hannover", bundesland: "Niedersachsen", yieldKwhKwp: 1013, fundingId: "hannover-proklima" },
  { slug: "dresden", name: "Dresden", ags: "14612", bundesland: "Sachsen", yieldKwhKwp: 1074 },
  { slug: "dortmund", name: "Dortmund", ags: "05913", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1024, fundingId: "dortmund-pv" },
  { slug: "essen", name: "Essen", ags: "05113", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1024, fundingId: "essen-solar" },
  { slug: "bonn", name: "Bonn", ags: "05314", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1043, fundingId: "bonn-solares" },
  { slug: "kiel", name: "Kiel", ags: "01002", bundesland: "Schleswig-Holstein", yieldKwhKwp: 989 },
  { slug: "erfurt", name: "Erfurt", ags: "16051", bundesland: "Thüringen", yieldKwhKwp: 1050 },
  { slug: "magdeburg", name: "Magdeburg", ags: "15003", bundesland: "Sachsen-Anhalt", yieldKwhKwp: 1070 },
  { slug: "potsdam", name: "Potsdam", ags: "12054", bundesland: "Brandenburg", yieldKwhKwp: 1041, fundingId: "potsdam-klimaschutz" },
  { slug: "rostock", name: "Rostock", ags: "13003", bundesland: "Mecklenburg-Vorpommern", yieldKwhKwp: 1031 },
  { slug: "saarbruecken", name: "Saarbrücken", ags: "10041100", kreis: "Regionalverband Saarbrücken", bundesland: "Saarland", yieldKwhKwp: 1079 },
  { slug: "augsburg", name: "Augsburg", ags: "09761", bundesland: "Bayern", yieldKwhKwp: 1128 },
  { slug: "kassel", name: "Kassel", ags: "06611", bundesland: "Hessen", yieldKwhKwp: 1017 },
  { slug: "luebeck", name: "Lübeck", ags: "01003", bundesland: "Schleswig-Holstein", yieldKwhKwp: 997 },
  { slug: "halle", name: "Halle (Saale)", ags: "15002", bundesland: "Sachsen-Anhalt", yieldKwhKwp: 1078 },
  // ── Batch Juni 2026, Teil 3: alle restlichen kreisfreien Städte (Katalog komplett) ──
  { slug: "amberg", name: "Amberg", ags: "09361", bundesland: "Bayern", yieldKwhKwp: 1070 },
  { slug: "ansbach", name: "Ansbach", ags: "09561", bundesland: "Bayern", yieldKwhKwp: 1093 },
  { slug: "aschaffenburg", name: "Aschaffenburg", ags: "09661", bundesland: "Bayern", yieldKwhKwp: 1047 },
  { slug: "baden-baden", name: "Baden-Baden", ags: "08211", bundesland: "Baden-Württemberg", yieldKwhKwp: 1079, fundingId: "baden-baden-pvplus" },
  { slug: "bamberg", name: "Bamberg", ags: "09461", bundesland: "Bayern", yieldKwhKwp: 1069 },
  { slug: "bayreuth", name: "Bayreuth", ags: "09462", bundesland: "Bayern", yieldKwhKwp: 1061 },
  { slug: "berlin", name: "Berlin", ags: "11000", bundesland: "Berlin", yieldKwhKwp: 1061, fundingId: "berlin-solarplus" },
  { slug: "bielefeld", name: "Bielefeld", ags: "05711", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 987 },
  { slug: "bochum", name: "Bochum", ags: "05911", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1020 },
  { slug: "bottrop", name: "Bottrop", ags: "05512", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1019, fundingId: "bottrop-solaroffensive" },
  { slug: "brandenburg-havel", name: "Brandenburg an der Havel", ags: "12051", bundesland: "Brandenburg", yieldKwhKwp: 1059 },
  { slug: "braunschweig", name: "Braunschweig", ags: "03101", bundesland: "Niedersachsen", yieldKwhKwp: 1032 },
  { slug: "bremerhaven", name: "Bremerhaven", ags: "04012", bundesland: "Bremen", yieldKwhKwp: 1002 },
  { slug: "chemnitz", name: "Chemnitz", ags: "14511", bundesland: "Sachsen", yieldKwhKwp: 1041 },
  { slug: "coburg", name: "Coburg", ags: "09463", bundesland: "Bayern", yieldKwhKwp: 1046 },
  { slug: "cottbus", name: "Cottbus", ags: "12052", bundesland: "Brandenburg", yieldKwhKwp: 1075 },
  { slug: "delmenhorst", name: "Delmenhorst", ags: "03401", bundesland: "Niedersachsen", yieldKwhKwp: 1003 },
  { slug: "dessau-rosslau", name: "Dessau-Roßlau", ags: "15001", bundesland: "Sachsen-Anhalt", yieldKwhKwp: 1061 },
  { slug: "duisburg", name: "Duisburg", ags: "05112", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1012 },
  { slug: "emden", name: "Emden", ags: "03402", bundesland: "Niedersachsen", yieldKwhKwp: 1024 },
  { slug: "erlangen", name: "Erlangen", ags: "09562", bundesland: "Bayern", yieldKwhKwp: 1068 },
  { slug: "flensburg", name: "Flensburg", ags: "01001", bundesland: "Schleswig-Holstein", yieldKwhKwp: 971 },
  { slug: "frankenthal", name: "Frankenthal (Pfalz)", ags: "07311", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1105 },
  { slug: "frankfurt-oder", name: "Frankfurt (Oder)", ags: "12053", bundesland: "Brandenburg", yieldKwhKwp: 1061 },
  { slug: "fuerth", name: "Fürth", ags: "09563", bundesland: "Bayern", yieldKwhKwp: 1094 },
  { slug: "gelsenkirchen", name: "Gelsenkirchen", ags: "05513", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1022 },
  { slug: "gera", name: "Gera", ags: "16052", bundesland: "Thüringen", yieldKwhKwp: 1068 },
  { slug: "hagen", name: "Hagen", ags: "05914", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 985 },
  { slug: "hamm", name: "Hamm", ags: "05915", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1040 },
  { slug: "heilbronn", name: "Heilbronn", ags: "08121", bundesland: "Baden-Württemberg", yieldKwhKwp: 1108 },
  { slug: "herne", name: "Herne", ags: "05916", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1021 },
  { slug: "hof", name: "Hof", ags: "09464", bundesland: "Bayern", yieldKwhKwp: 1044 },
  { slug: "ingolstadt", name: "Ingolstadt", ags: "09161", bundesland: "Bayern", yieldKwhKwp: 1121 },
  { slug: "jena", name: "Jena", ags: "16053", bundesland: "Thüringen", yieldKwhKwp: 1049 },
  { slug: "kaiserslautern", name: "Kaiserslautern", ags: "07312", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1063 },
  { slug: "kaufbeuren", name: "Kaufbeuren", ags: "09762", bundesland: "Bayern", yieldKwhKwp: 1152 },
  { slug: "kempten", name: "Kempten (Allgäu)", ags: "09763", bundesland: "Bayern", yieldKwhKwp: 1157 },
  { slug: "koblenz", name: "Koblenz", ags: "07111", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1040 },
  { slug: "krefeld", name: "Krefeld", ags: "05114", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1051, fundingId: "krefeld-klimafreundlich" },
  { slug: "landau", name: "Landau in der Pfalz", ags: "07313", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1148 },
  { slug: "landshut", name: "Landshut", ags: "09261", bundesland: "Bayern", yieldKwhKwp: 1121 },
  { slug: "leverkusen", name: "Leverkusen", ags: "05316", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1033 },
  { slug: "ludwigshafen", name: "Ludwigshafen am Rhein", ags: "07314", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1107 },
  { slug: "memmingen", name: "Memmingen", ags: "09764", bundesland: "Bayern", yieldKwhKwp: 1156, fundingId: "memmingen-ee" },
  { slug: "moenchengladbach", name: "Mönchengladbach", ags: "05116", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1072 },
  { slug: "muelheim", name: "Mülheim an der Ruhr", ags: "05117", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1019 },
  { slug: "neumuenster", name: "Neumünster", ags: "01004", bundesland: "Schleswig-Holstein", yieldKwhKwp: 969 },
  { slug: "neustadt-weinstrasse", name: "Neustadt an der Weinstraße", ags: "07316", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1127 },
  { slug: "oberhausen", name: "Oberhausen", ags: "05119", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1017 },
  { slug: "offenbach", name: "Offenbach am Main", ags: "06413", bundesland: "Hessen", yieldKwhKwp: 1084 },
  { slug: "oldenburg", name: "Oldenburg (Oldb)", ags: "03403", bundesland: "Niedersachsen", yieldKwhKwp: 989 },
  { slug: "osnabrueck", name: "Osnabrück", ags: "03404", bundesland: "Niedersachsen", yieldKwhKwp: 1006, fundingId: "osnabrueck-saniert" },
  { slug: "passau", name: "Passau", ags: "09262", bundesland: "Bayern", yieldKwhKwp: 1099 },
  { slug: "pforzheim", name: "Pforzheim", ags: "08231", bundesland: "Baden-Württemberg", yieldKwhKwp: 1110 },
  { slug: "pirmasens", name: "Pirmasens", ags: "07317", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1075 },
  { slug: "remscheid", name: "Remscheid", ags: "05120", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 986 },
  { slug: "rosenheim", name: "Rosenheim", ags: "09163", bundesland: "Bayern", yieldKwhKwp: 1124 },
  { slug: "salzgitter", name: "Salzgitter", ags: "03102", bundesland: "Niedersachsen", yieldKwhKwp: 1047 },
  { slug: "schwabach", name: "Schwabach", ags: "09565", bundesland: "Bayern", yieldKwhKwp: 1087 },
  { slug: "schweinfurt", name: "Schweinfurt", ags: "09662", bundesland: "Bayern", yieldKwhKwp: 1090, fundingId: "schweinfurt-pv" },
  { slug: "schwerin", name: "Schwerin", ags: "13004", bundesland: "Mecklenburg-Vorpommern", yieldKwhKwp: 996, fundingId: "schwerin-pv" },
  { slug: "solingen", name: "Solingen", ags: "05122", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 989 },
  { slug: "speyer", name: "Speyer", ags: "07318", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1130 },
  { slug: "straubing", name: "Straubing", ags: "09263", bundesland: "Bayern", yieldKwhKwp: 1130 },
  { slug: "suhl", name: "Suhl", ags: "16054", bundesland: "Thüringen", yieldKwhKwp: 984 },
  { slug: "trier", name: "Trier", ags: "07211", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1062 },
  { slug: "ulm", name: "Ulm", ags: "08421", bundesland: "Baden-Württemberg", yieldKwhKwp: 1112 },
  { slug: "weiden", name: "Weiden i.d.OPf.", ags: "09363", bundesland: "Bayern", yieldKwhKwp: 1060 },
  { slug: "wilhelmshaven", name: "Wilhelmshaven", ags: "03405", bundesland: "Niedersachsen", yieldKwhKwp: 976 },
  { slug: "wolfsburg", name: "Wolfsburg", ags: "03103", bundesland: "Niedersachsen", yieldKwhKwp: 1029, fundingId: "wolfsburg-pv" },
  { slug: "worms", name: "Worms", ags: "07319", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1108 },
  { slug: "wuppertal", name: "Wuppertal", ags: "05124", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 992 },
  // Auch Zweibrücken steht in keinem Schub: Die Seite gab es bis zum 19.08.2026 nicht (der
  // Programmschlüssel war zu eng gefasst, siehe funding-programs.ts). Sie ist
  // damit genauso eine NEUE Seite wie die 60 Gemeinden — nur ohne Kreis, weil
  // Zweibrücken kreisfrei ist. Sie jetzt zu veröffentlichen wäre wieder eine
  // Nebenwirkung statt einer Entscheidung.
  { slug: "zweibruecken", name: "Zweibrücken", ags: "07320", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1102 },
  // ── Landkreise mit eigenem (wiederkehrendem) Förderprogramm (Juni 2026) ──────
  { slug: "rhein-erft-kreis", name: "Rhein-Erft-Kreis", ags: "05362", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970, fundingId: "rhein-erft-energieoffensive" },
  { slug: "kreis-viersen", name: "Kreis Viersen", ags: "05166", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970, fundingId: "viersen-klimaschutz" },
  { slug: "kreis-bergstrasse", name: "Kreis Bergstraße", ags: "06431", bundesland: "Hessen", yieldKwhKwp: 1030, fundingId: "bergstrasse-speicher" },
  { slug: "mayen-koblenz", name: "Landkreis Mayen-Koblenz", ags: "07137", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1010, fundingId: "mayen-koblenz-speicher" },
  // Nidda kam am 26.08.2026 über den Rücklauf einer Outreach-Mail herein: Die
  // Klimaschutz-Beauftragte der Stadt hat uns ihre Förderseite selbst geschickt.
  // Achtstelliger Schlüssel mit Kreis, weil kreisangehörig — 06440016 ist Nidda,
  // 06440017 wäre Niddatal, und genau dafür gibt es die Schlüsselprüfung.
  // Ertrag am 26.08.2026 an der repräsentativen Lage gemessen (50,43 / 9,01).
  { slug: "nidda", name: "Nidda", ags: "06440016", kreis: "Wetteraukreis", bundesland: "Hessen", yieldKwhKwp: 1056 },

  // ── Kreisangehörige Gemeinden mit eigenem Förderprogramm (19.08.2026) ──────
  //
  // Diese 60 Gemeinden haben ein kommunales Programm im Katalog, das im Rechner
  // längst Geld abzieht — eine eigene Seite gab es dafür nicht. Wer
  // "photovoltaik förderung neuwied" suchte, fand uns nicht, obwohl wir das
  // Programm kennen.
  //
  // Sie tragen ihren ACHTSTELLIGEN Gemeindeschlüssel, nicht den ihres
  // Landkreises (siehe `ags` oben). Der Ertrag ist je Gemeinde gemessen, nicht
  // als Kreisdurchschnitt geschätzt.
  //
  // Keine dieser Seiten ist veröffentlicht: Sie stehen in keinem Schub des
  // Releaseplans (lib/release-plan.ts), und ohne Schub gibt es keine Seite. Sie
  // warten dort auf ihre Reihenfolge, weil für denselben Ort nie Förder- und
  // Atlasseite gleichzeitig frisch werden dürfen. Im Rechner wirken sie längst.
  //
  // Zweibrücken fehlt hier bewusst: Es ist eine kreisfreie Stadt und stand
  // längst im Verzeichnis — dort war der Schlüssel des PROGRAMMS zu eng
  // gefasst (achtstellig statt fünfstellig), nicht der Eintrag falsch.
  { slug: "klempau", name: "Klempau", ags: "01053067", kreis: "Kreis Herzogtum Lauenburg", bundesland: "Schleswig-Holstein", yieldKwhKwp: 1007 },
  { slug: "helmstedt", name: "Helmstedt", ags: "03154028", kreis: "Landkreis Helmstedt", bundesland: "Niedersachsen", yieldKwhKwp: 1041 },
  { slug: "goettingen", name: "Göttingen", ags: "03159016", kreis: "Landkreis Göttingen", bundesland: "Niedersachsen", yieldKwhKwp: 1007 },
  { slug: "herzberg-am-harz", name: "Herzberg am Harz", ags: "03159019", kreis: "Landkreis Göttingen", bundesland: "Niedersachsen", yieldKwhKwp: 1031 },
  { slug: "weyhe", name: "Weyhe", ags: "03251047", kreis: "Landkreis Diepholz", bundesland: "Niedersachsen", yieldKwhKwp: 1013 },
  { slug: "wietzen", name: "Wietzen", ags: "03256036", kreis: "Landkreis Nienburg (Weser)", bundesland: "Niedersachsen", yieldKwhKwp: 1017 },
  { slug: "moormerland", name: "Moormerland", ags: "03457014", kreis: "Landkreis Leer", bundesland: "Niedersachsen", yieldKwhKwp: 1002 },
  { slug: "bad-rothenfelde", name: "Bad Rothenfelde", ags: "03459006", kreis: "Landkreis Osnabrück", bundesland: "Niedersachsen", yieldKwhKwp: 1019 },
  { slug: "goch", name: "Goch", ags: "05154016", kreis: "Kreis Kleve", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1048 },
  { slug: "hueckelhoven", name: "Hückelhoven", ags: "05370020", kreis: "Kreis Heinsberg", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1083 },
  { slug: "nottuln", name: "Nottuln", ags: "05558032", kreis: "Kreis Coesfeld", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1039 },
  { slug: "senden", name: "Senden", ags: "05558044", kreis: "Kreis Coesfeld", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1034 },
  { slug: "ennepetal", name: "Ennepetal", ags: "05954008", kreis: "Ennepe-Ruhr-Kreis", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 960 },
  { slug: "wetter-ruhr", name: "Wetter (Ruhr)", ags: "05954032", kreis: "Ennepe-Ruhr-Kreis", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 994 },
  { slug: "wenden", name: "Wenden", ags: "05966028", kreis: "Kreis Olpe", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 989 },
  { slug: "gernsheim", name: "Gernsheim", ags: "06433004", kreis: "Landkreis Groß-Gerau", bundesland: "Hessen", yieldKwhKwp: 1092 },
  { slug: "bad-homburg", name: "Bad Homburg v. d. Höhe", ags: "06434001", kreis: "Hochtaunuskreis", bundesland: "Hessen", yieldKwhKwp: 1099 },
  { slug: "linsengericht", name: "Linsengericht", ags: "06435018", kreis: "Main-Kinzig-Kreis", bundesland: "Hessen", yieldKwhKwp: 1028 },
  { slug: "maintal", name: "Maintal", ags: "06435019", kreis: "Main-Kinzig-Kreis", bundesland: "Hessen", yieldKwhKwp: 1093 },
  { slug: "hochheim", name: "Hochheim am Main", ags: "06436006", kreis: "Main-Taunus-Kreis", bundesland: "Hessen", yieldKwhKwp: 1105 },
  { slug: "reichelsheim", name: "Reichelsheim (Odenwald)", ags: "06437013", kreis: "Odenwaldkreis", bundesland: "Hessen", yieldKwhKwp: 1071 },
  { slug: "rodgau", name: "Rodgau", ags: "06438011", kreis: "Landkreis Offenbach", bundesland: "Hessen", yieldKwhKwp: 1083 },
  { slug: "hohenahr", name: "Hohenahr", ags: "06532013", kreis: "Lahn-Dill-Kreis", bundesland: "Hessen", yieldKwhKwp: 1055 },
  { slug: "gudensberg", name: "Gudensberg", ags: "06634007", kreis: "Schwalm-Eder-Kreis", bundesland: "Hessen", yieldKwhKwp: 1037 },
  { slug: "neuwied", name: "Neuwied", ags: "07138045", kreis: "Landkreis Neuwied", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1054 },
  { slug: "hillscheid", name: "Hillscheid", ags: "07143031", kreis: "Westerwaldkreis", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1009 },
  { slug: "hoehr-grenzhausen", name: "Höhr-Grenzhausen", ags: "07143032", kreis: "Westerwaldkreis", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1011 },
  { slug: "wittlich", name: "Wittlich", ags: "07231134", kreis: "Landkreis Bernkastel-Wittlich", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1073 },
  { slug: "limburgerhof", name: "Limburgerhof", ags: "07338017", kreis: "Rhein-Pfalz-Kreis", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1120 },
  { slug: "boeblingen", name: "Böblingen", ags: "08115003", kreis: "Landkreis Böblingen", bundesland: "Baden-Württemberg", yieldKwhKwp: 1134 },
  { slug: "holzgerlingen", name: "Holzgerlingen", ags: "08115024", kreis: "Landkreis Böblingen", bundesland: "Baden-Württemberg", yieldKwhKwp: 1128 },
  { slug: "wernau", name: "Wernau (Neckar)", ags: "08116072", kreis: "Landkreis Esslingen", bundesland: "Baden-Württemberg", yieldKwhKwp: 1138 },
  { slug: "hattenhofen", name: "Hattenhofen", ags: "08117029", kreis: "Landkreis Göppingen", bundesland: "Baden-Württemberg", yieldKwhKwp: 1126 },
  { slug: "schlierbach", name: "Schlierbach", ags: "08117044", kreis: "Landkreis Göppingen", bundesland: "Baden-Württemberg", yieldKwhKwp: 1133 },
  { slug: "waiblingen", name: "Waiblingen", ags: "08119079", kreis: "Rems-Murr-Kreis", bundesland: "Baden-Württemberg", yieldKwhKwp: 1119 },
  { slug: "herbrechtingen", name: "Herbrechtingen", ags: "08135020", kreis: "Landkreis Heidenheim", bundesland: "Baden-Württemberg", yieldKwhKwp: 1102 },
  { slug: "gaiberg", name: "Gaiberg", ags: "08226022", kreis: "Rhein-Neckar-Kreis", bundesland: "Baden-Württemberg", yieldKwhKwp: 1084 },
  { slug: "heddesheim", name: "Heddesheim", ags: "08226028", kreis: "Rhein-Neckar-Kreis", bundesland: "Baden-Württemberg", yieldKwhKwp: 1072 },
  { slug: "leimen", name: "Leimen", ags: "08226041", kreis: "Rhein-Neckar-Kreis", bundesland: "Baden-Württemberg", yieldKwhKwp: 1114 },
  { slug: "oftersheim", name: "Oftersheim", ags: "08226062", kreis: "Rhein-Neckar-Kreis", bundesland: "Baden-Württemberg", yieldKwhKwp: 1110 },
  { slug: "sandhausen", name: "Sandhausen", ags: "08226076", kreis: "Rhein-Neckar-Kreis", bundesland: "Baden-Württemberg", yieldKwhKwp: 1110 },
  { slug: "weinheim", name: "Weinheim", ags: "08226096", kreis: "Rhein-Neckar-Kreis", bundesland: "Baden-Württemberg", yieldKwhKwp: 1049 },
  { slug: "bad-krozingen", name: "Bad Krozingen", ags: "08315006", kreis: "Landkreis Breisgau-Hochschwarzwald", bundesland: "Baden-Württemberg", yieldKwhKwp: 1164 },
  { slug: "rietheim-weilheim", name: "Rietheim-Weilheim", ags: "08327056", kreis: "Landkreis Tuttlingen", bundesland: "Baden-Württemberg", yieldKwhKwp: 1122 },
  { slug: "gailingen", name: "Gailingen am Hochrhein", ags: "08335026", kreis: "Landkreis Konstanz", bundesland: "Baden-Württemberg", yieldKwhKwp: 1167 },
  { slug: "walddorfhaeslach", name: "Walddorfhäslach", ags: "08415087", kreis: "Landkreis Reutlingen", bundesland: "Baden-Württemberg", yieldKwhKwp: 1147 },
  { slug: "tuebingen", name: "Tübingen", ags: "08416041", kreis: "Landkreis Tübingen", bundesland: "Baden-Württemberg", yieldKwhKwp: 1149 },
  { slug: "forstinning", name: "Forstinning", ags: "09175118", kreis: "Landkreis Ebersberg", bundesland: "Bayern", yieldKwhKwp: 1128 },
  { slug: "poing", name: "Poing", ags: "09175135", kreis: "Landkreis Ebersberg", bundesland: "Bayern", yieldKwhKwp: 1137 },
  { slug: "gaimersheim", name: "Gaimersheim", ags: "09176126", kreis: "Landkreis Eichstätt", bundesland: "Bayern", yieldKwhKwp: 1122 },
  { slug: "ottobrunn", name: "Ottobrunn", ags: "09184136", kreis: "Landkreis München", bundesland: "Bayern", yieldKwhKwp: 1130 },
  { slug: "putzbrunn", name: "Putzbrunn", ags: "09184140", kreis: "Landkreis München", bundesland: "Bayern", yieldKwhKwp: 1124 },
  { slug: "unterhaching", name: "Unterhaching", ags: "09184148", kreis: "Landkreis München", bundesland: "Bayern", yieldKwhKwp: 1138 },
  { slug: "karlshuld", name: "Karlshuld", ags: "09185139", kreis: "Landkreis Neuburg-Schrobenhausen", bundesland: "Bayern", yieldKwhKwp: 1107 },
  { slug: "vilshofen", name: "Vilshofen an der Donau", ags: "09275154", kreis: "Landkreis Passau", bundesland: "Bayern", yieldKwhKwp: 1118 },
  { slug: "muehlhausen", name: "Mühlhausen", ags: "09373146", kreis: "Landkreis Neumarkt i.d.OPf.", bundesland: "Bayern", yieldKwhKwp: 1079 },
  { slug: "beratzhausen", name: "Beratzhausen", ags: "09375118", kreis: "Landkreis Regensburg", bundesland: "Bayern", yieldKwhKwp: 1099 },
  { slug: "nittenau", name: "Nittenau", ags: "09376149", kreis: "Landkreis Schwandorf", bundesland: "Bayern", yieldKwhKwp: 1087 },
  { slug: "feucht", name: "Feucht", ags: "09574123", kreis: "Nürnberger Land", bundesland: "Bayern", yieldKwhKwp: 1042 },
  { slug: "roth", name: "Roth", ags: "09576143", kreis: "Landkreis Roth", bundesland: "Bayern", yieldKwhKwp: 1070 },
  { slug: "dettelbach", name: "Dettelbach", ags: "09675117", kreis: "Landkreis Kitzingen", bundesland: "Bayern", yieldKwhKwp: 1108 },
  { slug: "dietmannsried", name: "Dietmannsried", ags: "09780119", kreis: "Landkreis Oberallgäu", bundesland: "Bayern", yieldKwhKwp: 1149 },

  // Nachzügler vom selben Tag: zehn Programme, die zwischen dem Anlegen der
  // sechzig und dem Merge in den Katalog kamen. Dass sie hier stehen müssen,
  // hat der Sync-Test erzwungen — genau dafür ist die pauschale Ausnahme für
  // achtstellige Schlüssel weggefallen.
  { slug: "schiltach", name: "Schiltach", ags: "08325051", kreis: "Landkreis Rottweil", bundesland: "Baden-Württemberg", yieldKwhKwp: 1048 },
  { slug: "altdorf", name: "Altdorf", ags: "08115002", kreis: "Landkreis Böblingen", bundesland: "Baden-Württemberg", yieldKwhKwp: 1140 },
  { slug: "steffenberg", name: "Steffenberg", ags: "06534019", kreis: "Landkreis Marburg-Biedenkopf", bundesland: "Hessen", yieldKwhKwp: 1023 },
  { slug: "tegernheim", name: "Tegernheim", ags: "09375204", kreis: "Landkreis Regensburg", bundesland: "Bayern", yieldKwhKwp: 1108 },
  { slug: "lohfelden", name: "Lohfelden", ags: "06633017", kreis: "Landkreis Kassel", bundesland: "Hessen", yieldKwhKwp: 1007 },
  { slug: "schwebheim", name: "Schwebheim", ags: "09678176", kreis: "Landkreis Schweinfurt", bundesland: "Bayern", yieldKwhKwp: 1097 },
  { slug: "asbach", name: "Asbach", ags: "07138003", kreis: "Landkreis Neuwied", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1030 },
  { slug: "parkstein", name: "Parkstein", ags: "09374144", kreis: "Landkreis Neustadt a.d.Waldnaab", bundesland: "Bayern", yieldKwhKwp: 1052 },
  { slug: "marburg", name: "Marburg", ags: "06534014", kreis: "Landkreis Marburg-Biedenkopf", bundesland: "Hessen", yieldKwhKwp: 1054 },
  { slug: "schoenbrunn", name: "Schönbrunn", ags: "08226081", kreis: "Rhein-Neckar-Kreis", bundesland: "Baden-Württemberg", yieldKwhKwp: 1073 },
];

export function cityBySlug(slug: string): AtlasCity | undefined {
  return ATLAS_CITIES.find((c) => c.slug === slug);
}

/** Transliterating slugifier — shared so anchor ids, paths and redirects all
 *  agree on the same Bundesland slug (e.g. "Baden-Württemberg" → "baden-wuerttemberg"). */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function bundeslandSlug(city: AtlasCity): string {
  return slugify(city.bundesland);
}

/** Canonical path of a city's funding landing page (Bundesland > Kommune). */
export function cityPath(city: AtlasCity): string {
  return `/photovoltaik-foerderung/${slugify(city.bundesland)}/${city.slug}`;
}

/** All cities whose Bundesland slug matches (for the Bundesland landing page). */
export function citiesInBundesland(blSlug: string): AtlasCity[] {
  return ATLAS_CITIES.filter((c) => slugify(c.bundesland) === blSlug);
}

/** Distinct Bundesländer that currently have at least one city page. */
export function bundeslaenderWithCities(): { name: string; slug: string }[] {
  const bySlug = new Map<string, string>();
  for (const c of ATLAS_CITIES) bySlug.set(slugify(c.bundesland), c.bundesland);
  return Array.from(bySlug, ([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

// ── "Live" = only regions whose own funding program currently accepts
// applications (status "aktiv"). Policy (User, Juni 2026): we publish a page
// only for regions WITH an active program; regions whose program is exhausted/
// paused/discontinued, or that never had one, stay in the registry (archive,
// re-enabled later for SEO) but get NO live page. Existence is code-driven via
// the program status; page CONTENT still comes from the DB. Flip these filters
// to include inactive programs to re-expand the catalog.

/** True if the city has its own program and that program is currently active. */
export function isCityLive(c: AtlasCity): boolean {
  return fundingFor(c)?.status === "aktiv";
}

/** Cities with a live (active) program — drives page generation, sitemap, listings. */
export function liveCities(): AtlasCity[] {
  return ATLAS_CITIES.filter(isCityLive);
}

/** Live cities in a Bundesland (by slug). */
export function liveCitiesInBundesland(blSlug: string): AtlasCity[] {
  return liveCities().filter((c) => slugify(c.bundesland) === blSlug);
}

/** Bundesländer that have at least one live city (Land-level programs handled separately). */
export function liveBundeslaender(): { name: string; slug: string }[] {
  const bySlug = new Map<string, string>();
  for (const c of liveCities()) bySlug.set(slugify(c.bundesland), c.bundesland);
  return Array.from(bySlug, ([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

// ── Archive = regions whose own program exists but currently does NOT accept
// applications (exhausted / paused / discontinued). Unlike "no program at all",
// these still warrant a page: it carries the (now inactive) program terms, the
// MaStR stock and the federal fallback, so the URL stays useful for SEO without
// promising money that isn't there. "unsicher" is deliberately excluded — we do
// not publish program data we don't trust. Archive pages render with a status
// badge and compute their example amounts WITHOUT the inactive grant.
const ARCHIVE_STATUSES: FundingStatus[] = ["ausgeschoepft", "pausiert", "eingestellt"];

/**
 * Landesprogramme der FLÄCHENLÄNDER erzeugen keine Stadtseite.
 *
 * Ein Landesprogramm trägt einen zweistelligen Schlüssel und passt damit auf
 * jede Stadt seines Landes. Bei den Stadtstaaten ist das richtig — dort IST das
 * Land die Stadt, und Berlin und Bremen leben genau davon. Bei einem
 * Flächenland wäre es eine Seite je Ort für ein Programm, das mit dem Ort nichts
 * zu tun hat: Dresden, Leipzig, Chemnitz und jede weitere sächsische Stadt
 * bekämen dieselbe Auskunft unter ihrem eigenen Namen.
 *
 * Aufgefallen am 02.09.2026 beim Aufnehmen der beiden Landesprogramme für
 * Balkonkraftwerke (Sachsen beendet, Mecklenburg-Vorpommern aktiv). Vorher gab
 * es im Katalog nur Landesprogramme von Stadtstaaten, deshalb ist die Lücke nie
 * aufgefallen — sie war da, seit die Zuordnung über den Schlüssel läuft.
 */
const STADTSTAATEN = ["02", "04", "11"]; // Hamburg, Bremen, Berlin

function programmTraegtStadtseite(p: FundingProgram | undefined): boolean {
  if (!p) return false;
  if (p.level === "land" && !STADTSTAATEN.includes(p.agsCode ?? "")) return false;
  return true;
}

/** True if the city's own program is inactive but published as an archive page. */
export function isCityArchived(c: AtlasCity): boolean {
  const p = fundingFor(c);
  if (!programmTraegtStadtseite(p)) return false;
  return ARCHIVE_STATUSES.includes(p!.status);
}

/** Cities with an inactive (archived) program. */
export function archivedCities(): AtlasCity[] {
  return ATLAS_CITIES.filter(isCityArchived);
}

/**
 * A city gets a published page when its program is live OR archived — UND die
 * Freigabe steht. Die Freigabe-Frage beantwortet cityIndexFreigegeben() und
 * sonst nichts.
 *
 * WARUM DIE ZWEITE BEDINGUNG (19.08.2026): Bis dahin hing die Veröffentlichung
 * allein am Status des Förderprogramms. Ein neuer Eintrag in ATLAS_CITIES mit
 * einem aktiven Programm war damit beim nächsten Deploy eine öffentliche,
 * indexierte Seite — die Veröffentlichung war keine Entscheidung, sondern eine
 * Nebenwirkung.
 *
 * WARUM SIE SEIT DEM 05.09.2026 ÜBER cityIndexFreigegeben LÄUFT — BLOCKER:
 * Die Freigabe hatte danach ZWEI Wege (Releaseplan ODER foerderseiteTraegt,
 * Betreiber-Entscheidung 01.09.2026), aber die zweite Bedingung stand an ZWEI
 * Stellen: die Sitemap fragte cityIndexFreigegeben() und kannte beide Wege,
 * diese Funktion fragte releaseFreigegeben() und kannte nur den ersten. Da die
 * Seite mit `dynamicParams = false` erzeugt wird, ist eine Adresse, die nicht
 * aus publishedCities() kommt, eine HARTE 404. Gemessen am 05.09.2026:
 * 21 der 59 Förder-Stadtseiten standen in der Sitemap und antworteten mit 404 —
 * vier Tage lang, auf der Seitenfamilie mit der besten Sichtbarkeit des Projekts
 * (2.147 Einblendungen in 28 Tagen gegen 1.700 im ganzen Atlas).
 *
 * Die Fehlerklasse ist von außen unsichtbar: kein Typfehler, kein roter Test,
 * kein kaputtes Aussehen — nur eine Sitemap, die Google zu Seiten einlädt, die
 * es nicht gibt. Genau die Doppelpflege, an der hier schon `fundingId`
 * gescheitert ist. Wer eine dritte Bedingung für die Freigabe einführt, trägt
 * sie in cityIndexFreigegeben() ein und nirgendwo sonst.
 *
 * Was NICHT dazugehört: ob ein Programm im Rechner Geld abzieht, entscheidet
 * unverändert allein fundingZaehlt(). Ein Ort ohne Seite bleibt im Rechner
 * vollständig wirksam.
 */
export function isCityPublished(c: AtlasCity): boolean {
  return (isCityLive(c) || isCityArchived(c)) && cityIndexFreigegeben(c);
}

/** Cities that get a page (live + archived) — drives page generation & sitemap. */
export function publishedCities(): AtlasCity[] {
  return ATLAS_CITIES.filter(isCityPublished);
}

/** Published cities in a Bundesland (by slug), active programs listed first. */
export function publishedCitiesInBundesland(blSlug: string): AtlasCity[] {
  return publishedCities()
    .filter((c) => slugify(c.bundesland) === blSlug)
    .sort((a, b) => Number(isCityLive(b)) - Number(isCityLive(a)));
}

/**
 * Darf diese Seite in den Index? Es antwortet der Releaseplan.
 *
 * Bis zum 19.08.2026 stand die Antwort als Feld `indexFreigabe` an jeder Stadt —
 * eine bewusste Übergangslösung, damit die 70 neuen Gemeindeseiten nicht ohne
 * jede Bremse auf die Hauptlinie kamen. Sie ist ersetzt: Ein Ja/Nein je Eintrag
 * trägt kein Datum, keine Welle, keinen Nachweis und keine Regel über die
 * zweite Seitenfamilie — genau das braucht aber die Frage „wann geht dieser Ort
 * live, und haben wir vorher gemessen?". Zwei Schalter für eine Frage sind die
 * Doppelpflege, an der hier schon `fundingId` gescheitert ist.
 *
 * Sitemap, robots-Angabe UND die Seitenerzeugung (über isCityPublished) hängen
 * an dieser EINEN Funktion, damit sie sich nicht auseinanderentwickeln können.
 * Die Seitenerzeugung fehlte hier bis zum 05.09.2026 — mit dem Ergebnis, dass
 * 21 Adressen in der Sitemap standen und 404 antworteten.
 */
export function cityIndexFreigegeben(c: AtlasCity, heute: Date = new Date()): boolean {
  // Weg 1: eine Entscheidung im Releaseplan (Altbestand und die Schübe davor).
  if (releaseFreigegeben("foerder-stadt", c.ags, heute)) return true;
  // Weg 2: das Programm besteht die Schwelle, die es ohnehin gibt.
  return foerderseiteTraegt(c);
}

/**
 * Trägt das Programm dieses Orts eine eigene Seite?
 *
 * ENTSCHEIDUNG DES BETREIBERS, 01.09.2026: Eine Förderseite geht künftig live,
 * sobald ihr Programm die Schwelle besteht — sie braucht keinen eigenen Schub
 * mehr. Der Releaseplan bleibt für die ATLAS-Ortsseiten, wo die Freigabe
 * wirklich eine Entscheidung ist; hier war er nur noch Verwaltung.
 *
 * WARUM DAS JETZT GEHT: Der Plan wurde gebaut, weil Seiten als Nebenwirkung
 * eines Programmstatus entstanden — 61 auf einen Schlag, ohne dass jemand
 * hingesehen hätte. Das war ein Kontrollproblem. Inzwischen gibt es die
 * Kontrolle an der richtigen Stelle: `fundingZaehlt()` entscheidet, ob ein
 * Programm belastbar genug ist, um im Rechner Geld abzuziehen. Was dafür reicht,
 * reicht auch für eine Seite — und was es nicht besteht, bekommt weiterhin keine.
 *
 * ZWEI BEDINGUNGEN, jede aus einem gemessenen Fall:
 *
 *   1. Das Programm muss AKTIV sein. Ein ausgeschöpfter, pausierter oder
 *      eingestellter Topf ergibt eine Förderseite ohne abrufbares Geld — sie
 *      beantwortet die Frage nicht, für die jemand kommt (Göttingen, Weyhe,
 *      Feucht); dieselbe Begründung wie beim zurückgenommenen Archiv-Schub.
 *   2. Es muss DACH-Photovoltaik fördern. Eine Seite mit dem Titel
 *      „Photovoltaik-Förderung“, die nur Balkonkraftwerke fördert, hält nicht,
 *      was sie verspricht — betrifft heute 35 Orte, die eine eigene
 *      Seitenfamilie brauchen.
 *
 * NICHT geprüft wird hier der BELEG-Zustand (`fundingZaehlt`), und das ist eine
 * bewusste Trennung: Der Beleg entscheidet, ob ein Betrag im Rechner Geld
 * abzieht — eine Frage der Zahl, nicht der Seite. Die Seite liest ihre Daten zur
 * Laufzeit aus der Datenbank und zeigt dort ohnehin nur, was belegt ist. Eine
 * erste Fassung dieser Funktion prüfte den Beleg mit und war deshalb komplett
 * WIRKUNGSLOS: Im Code-Seed gibt es keine Beleg-Spalten, also zählte kein
 * einziges der 110 Programme, und die Freigabe hätte nie gegriffen — ohne dass
 * ein Test das gezeigt hätte.
 *
 * Geringe Nachfrage ist ausdrücklich KEINE Bedingung: Sie war der Grund, aus dem
 * diese Seiten monatelang zurückgehalten wurden, und sie ist keiner (siehe
 * lib/seo-grundregeln.ts, Regel „kein-ertrag-ist-kein-schaden“).
 */
export function foerderseiteTraegt(c: AtlasCity): boolean {
  const p = fundingFor(c);
  if (!programmTraegtStadtseite(p)) return false;
  if (p!.status !== "aktiv") return false;
  return (p!.foerdert ?? ["pv"]).includes("pv");
}

/**
 * Städte, die in den Index dürfen.
 *
 * Seit der Umstellung auf den Releaseplan deckungsgleich mit `publishedCities()`
 * — und das ist kein Zufall, sondern der Unterschied zur abgelösten Lösung: Ein
 * Ort ohne Freigabe bekommt gar keine Seite, statt einer gebauten auf noindex.
 * Eine Seite, die es nicht gibt, kostet auch kein Crawl-Budget.
 */
export function indexedCities(): AtlasCity[] {
  return publishedCities();
}

/** Bundesländer with at least one published city (live or archived). */
export function publishedBundeslaender(): { name: string; slug: string }[] {
  const bySlug = new Map<string, string>();
  for (const c of publishedCities()) bySlug.set(slugify(c.bundesland), c.bundesland);
  return Array.from(bySlug, ([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name, "de"));
}
