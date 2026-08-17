// ─── Grüngas-Preispfad (GModG Bio-Treppe) — Config ──────────────────────────
// Modelliert den künftigen Gas-Endkundenpreis unter dem Gebäudemodernisierungs-
// gesetz (GModG): ab 2029 muss ein steigender Anteil klimafreundlicher Brennstoffe
// beigemischt werden ("Bio-Treppe", § 43 GModG) — anrechenbar sind Biomethan,
// Bioheizöl, biogenes Flüssiggas sowie Wasserstoff und daraus hergestellte Derivate.
// Wir rechnen mit Biomethan als Leitpreis (leitungsgebundenes Gas). Biomethan ist
// rund doppelt so teuer wie Erdgas; zusätzlich steigen die Gasnetzentgelte (weniger
// Anschlussnutzer) und der CO₂-Preis. Der resultierende Gas-Mix-Preis ist die
// Referenz, gegen die sich eine heute neu eingebaute Gasheizung im WP-Rechner
// vergleichen lassen muss.
//
// Quelle: IW-Report 36/2026 „Wie hoch sind die Mehrkostenrisiken durch das
// Gebäudemodernisierungsgesetz (GModG)?" (Henger/Küper/Wünsch, Köln 25.07.2026).
// Volltext liegt im Repo: docs/gmodg/. Am 27.07.2026 Seite für Seite gegen die
// Werte unten geprüft — jede Fundstelle unten wurde dabei aufgeschlagen:
//   · Anhang Kapitel 6, S. 31–32 — alle Preisannahmen der Szenarien
//   · Tabelle 3-2, S. 15 — Kostenaufstellung des Beispielhaushalts MFH1
//   · Abbildung 6-1 / 6-2, S. 33 — Gas-Mix-Verlauf und Preisspanne
//   · Tabelle 2-2 + Fußnote 3, S. 9 — Bio-Treppe, Quote und der 2045-Punkt
// Alle Preiskomponenten sind dort als linearer Verlauf 2026→2045 modelliert
// (S. 31), Referenzhaushalt ist MFH1: teilsanierte Altbauwohnung, 75 m²,
// 10.000 kWh/a (Tabelle 3-1, S. 13).
//
// WICHTIG zur Einordnung des Basispfads — Selbstaussage des Reports (S. 31): Das
// Basisszenario ist „nicht als wahrscheinlichste Entwicklung zu interpretieren,
// sondern dient als analytischer Referenzpfad innerhalb eines plausiblen
// Ergebniskorridors". Genau so ausweisen, nie als Prognose.
//
// WICHTIG (Ehrlichkeit): Das IW ist ein arbeitgebernahes Institut. Die Werte sind
// ein „plausibler Korridor", keine punktgenaue Prognose (Selbstaussage des
// Reports). Im Rechner daher nur als klar gekennzeichnetes, zuschaltbares
// IW-Szenario — nie als Default.
//
// GESETZ vs. ANNAHME — nicht vermischen (siehe Faktenprüfungs-Konvention in
// CLAUDE.md): Gesetzlich stehen in § 43 GModG genau VIER Stufen — 10 % (2029),
// 15 % (2030), 30 % (2035), 60 % (2040). Eine 100-%-Stufe gibt es dort NICHT. Der
// Sprung auf 100 % bis 2045 ist eine Modellannahme des IW-Reports, abgeleitet aus
// § 42a GModG: der kündigt ein gesondertes Gesetz an, das Inverkehrbringer von Gas,
// Öl und Flüssiggas verpflichtet, die Brennstoffe „ab dem Jahr 2045 vollständig auf
// klimaneutrale Brennstoffe umzustellen". ACHTUNG (Council 28.07.2026): Ein Einstieg
// „ab 2028" oder irgendein Zwischenpfad steht dort NICHT — der Wortlaut nennt allein
// 2045. Das „bis zu 1 % ab 2028" ist eine Darstellung des IW-Reports (Tab. 2-2, S. 9)
// und darf nie dem Paragrafen zugeschrieben werden; genau das stand bis heute in zwei
// nutzersichtbaren Texten. Dieses Quotengesetz ist noch nicht
// beschlossen (soll bis 01.12.2026 vorgelegt werden). Jede Zahl, die aus dem Jahr
// 2045 stammt, ist damit IW-Annahme — nie als Gesetzesfolge beschriften.
// Der Report sagt das selbst, Fußnote 3 auf S. 9: „Zwar wurde in § 43 GModG keine
// 100-Prozent-Stufe ab 2045 ergänzt, dafür aber ein weiterer Paragraf § 42a GModG
// neu aufgenommen […]" (BT-Drs. 21/7009).
//
// GELTUNGSBEREICH — die zweite Falle, und sie steht genau andersherum, als der
// Wortlaut von § 43 vermuten lässt. § 43 Absatz 1 spricht wörtlich von einer
// Heizung, die „nach dem 29. Juli 2026 in ein BESTEHENDES GEBÄUDE neu eingebaut"
// wird; der Paragraf sitzt im Gesetzesteil „Modernisierung von bestehenden
// Gebäuden" und beschreibt den Heizungstausch. Daraus zu schließen, der NEUBAU
// sei nicht erfasst, ist FALSCH — genau dieser Fehlschluss stand vom 28. bis zum
// 29.07.2026 auf fünf Oberflächen. Die Pflicht erreicht den Neubau über § 10
// Absatz 2 Nummer 3 (Anforderungen an zu errichtende Gebäude), den Artikel 1
// Nummer 9 Buchstabe a desselben Gesetzes neu fasst:
//     „3. die Maßgaben der §§ 42 bis 45 entsprechend eingehalten werden."
// § 43 liegt in dieser Spanne. Die amtliche Begründung sagt es ausdrücklich
// (BT-Drs. 21/6278, S. 96, zu Artikel 1 Nummer 9 Buchstabe a): „Es handelt sich
// um eine Folgeänderung zur Einfügung der §§ 42 ff. Diese Maßgaben sind für neu
// zu errichtende Gebäude nach § 10 Absatz 2 Nummer 3 einzuhalten." Der
// Wirtschaftsausschuss hat die Nummer unverändert übernommen (BT-Drs. 21/7009,
// S. 26 — Beschluss-Spalte „unverändert"). Gegenprobe am alten Recht: dieselbe
// Nummer 3 verwies vorher auf § 71 Absatz 1, die 65-%-Regel. Der Neubau lief
// also immer schon über § 10, nie über den Heizungsparagrafen selbst; das GModG
// hängt nur den Verweis um. Beide Drucksachen liegen im Repo unter docs/gmodg/.
//
// Die STÄRKSTE Fundstelle steht allerdings woanders und ist beim Council-Lauf am
// 29.07.2026 vom adversarialen Prüfer nachgereicht worden: Artikel 5 desselben
// Gesetzes fügt in das Kohlendioxidkostenaufteilungsgesetz einen § 5b ein, der
// schon in der Überschrift sagt, worum es geht — „Kostenverteilung bei Einbau
// und Betrieb einer Heizungsanlage nach § 43 des Gebäudemodernisierungsgesetzes
// IN NEUBAUTEN". Die Begründung dazu (BT-Drs. 21/6278, S. 125): „§ 5b erstreckt
// die Regelung des § 5a auf neu zu errichtende Gebäude, auf die § 43 Absatz 1
// des Gebäudemodernisierungsgesetzes zur Anwendung kommt. Erfasst werden nur
// Neubauten, die bis zum 31.12.2029 errichtet werden." Ein zweiter, völlig
// unabhängiger Regelungsstrang sagt damit dasselbe — und nennt zugleich die
// Zeitgrenze (siehe unten).
//
// Bleiben vier echte Einschränkungen:
//   (a) erst Einbauten nach dem 29.07.2026;
//   (b) im Neubau nur für Gebäude, die BIS ZUM 31.12.2029 errichtet werden —
//       ab 2030 verdrängt das Nullemissionsgebäude den Verweis (siehe Zeitachse);
//   (c) § 10 Absatz 2 Nummer 3 gilt nicht für Nichtwohngebäude-Zonen über 4 m
//       Raumhöhe mit dezentralen Gebläse-/Strahlungsheizungen (§ 10 Abs. 5) und
//       nicht für Verteidigungsliegenschaften (§ 10 Abs. 6);
//   (d) ZITIERWEISE: Für den Neubau ist die Fundstelle „§ 10 Absatz 2 Nummer 3
//       in Verbindung mit § 43 GModG" — NIE „§ 43 GModG" allein. § 43 erfasst
//       den Neubau nie unmittelbar, sondern nur entsprechend.
// Nicht behaupten: dass die Neubau-Pflicht bußgeldbewehrt ist. § 108 Absatz 1
// Nummer 4 sanktioniert wörtlich nur Verstöße „entgegen § 43 Absatz 1"; ob das
// Analogieverbot im Sanktionsrecht eine entsprechende Anwendung trägt, ist
// mindestens zweifelhaft. Wir sagen dazu nichts.
//
// ZEITACHSE NEUBAU — zwei spätere Stichtage desselben Gesetzes, die den Neubau
// härter treffen als die Bio-Treppe:
//   · ab 01.01.2027 (Artikel 2) rechnet der Neubau gegen ein neues
//     Referenzgebäude mit „technologieneutralem Referenzwärmeerzeuger",
//     Gesamt-Primärenergiefaktor 0,75 (bis 31.12.2029) bzw. 0,70 (ab 2030);
//     zugleich fällt der bisherige Abstand von 0,55 zum Referenzgebäude weg
//     (§ 15 Absatz 1 neuer Fassung, Anlage 1 Nummer 6). Erdgas trägt den Faktor
//     1,1 (Anlage 4), liegt also über dem Zielwert und müsste anderswo
//     ausgeglichen werden. WIE WEIT das trägt, hängt am Rechenverfahren der
//     DIN/TS 18599-5 und ist von uns NICHT nachgerechnet — deshalb steht dazu
//     nirgends eine Aussage im Produkt.
//   · ab 01.01.2030 (Artikel 4) ersetzt das Gesetz den § 10 vollständig: jeder
//     Neubau ist Nullemissionsgebäude und darf „an seinem Standort keine
//     Kohlenstoffdioxidemissionen aus fossilen Brennstoffen" verursachen. Der
//     Verweis auf die §§ 42 bis 45 entfällt dort ersatzlos. DAS IST ZUGLEICH DIE
//     ZEITGRENZE der Neubau-Geltung: Die Bio-Treppe erfasst im Neubau nur
//     Gebäude, die bis zum 31.12.2029 errichtet werden (Begründung zu § 5b
//     KostAufG, BT-Drs. 21/6278, S. 125, wörtlich oben). Ein Satz wie „gilt im
//     Bestand wie im Neubau" OHNE diese Grenze ist eine falsche Aussage über
//     Neubauten ab 2030 — der ernsteste Befund des Council-Laufs.
//     Ob ein 2028 errichtetes Haus seine Beimischpflicht über 2030 hinaus
//     behält, regelt Artikel 4 nicht ausdrücklich; dass § 5b die mietrechtliche
//     Kostenteilung für genau diese Gebäude anordnet, spricht dafür — bewiesen
//     ist es nicht. Für unsere Rechnung (Heizung wird heute eingebaut) ohne
//     Folge, deshalb steht dazu im Produkt nichts.
//
//
// WAS IM NEUBAU NICHT MEHR GILT (Council 28.07.2026, gehoert zum selben Bild):
// die 65-%-Erneuerbaren-Pflicht. Die §§ 71 bis 73 GEG sind gestrichen (Artikel 1
// Nummer 32). Ein Ausschluss von Heizoel im Neubau laesst sich darauf also NICHT
// mehr stuetzen — § 42 Absatz 2 Nummer 1 nennt Gas, Heizoel und Fluessiggas
// ausdruecklich als zulaessige Option.
// Die Quote nach § 42a setzt dagegen beim
// BRENNSTOFF an (Inverkehrbringer) und trifft damit auch Bestandsheizungen. „Wer
// schon eine Gasheizung hat, hat Bestandsschutz" ist deshalb nur für die Bio-Treppe
// richtig — nicht für die Beimischung insgesamt. Wir rechnen bewusst NUR die
// Bio-Treppe (Neuanlagen); die Quote hat noch keine belastbaren Zahlen.
//
// Referenz-Gebäude: MFH-Werte des Reports (Beispielhaushalt MFH1). Der Report
// weist für EFH minimal andere Ausgangswerte aus (Erdgas 5,5 statt 5,2; Netz 2,6
// statt 2,2 ct/kWh) — die Differenz liegt bei <3 % des Gaspreises und damit weit
// innerhalb der Szenario-Bandbreite. Bewusst nicht getrennt gepflegt.

export type GasScenario = "low" | "base" | "high";

export interface GreenGasConfig {
  /** Kalenderjahr → verpflichtender Grüngas-Anteil (0..1). Stützstellen bis 2040 =
   *  die gesetzlichen Stufen der Bio-Treppe (§ 43 GModG); die Stützstelle 2045 ist
   *  die IW-Modellannahme aus § 42a (kein Gesetzeswert). Zwischenjahre werden
   *  linear interpoliert (wie im IW-Report). */
  quoteStops: Record<number, number>;
  /** Erdgas Beschaffung + Vertrieb, ct/kWh netto (Ausgangswert 2026, MFH). */
  erdgasCt2026: number;
  /** Faktor auf den Erdgas-Preis 2045 je Szenario (Basis konstant, ±15 % Rand). */
  erdgasEndFactor: Record<GasScenario, number>;
  /** Biomethan Beschaffung + Vertrieb, ct/kWh netto — 2026 und 2045 je Szenario. */
  biomethanCt2026: number;
  biomethanCt2045: Record<GasScenario, number>;
  /** Gasnetzentgelt, ct/kWh netto (MFH) — 2026 und 2045 je Szenario. */
  netzCt2026: number;
  netzCt2045: Record<GasScenario, number>;
  /** Energiesteuer + Konzessionsabgabe, ct/kWh netto — konstant über alle Szenarien. */
  steuerKonzessionCt: number;
  /** CO₂-Preis (€/t) — Ausgangswert 2026 und Endwert 2045 je Szenario. */
  co2EurT2026: Record<GasScenario, number>;
  co2EurT2045: Record<GasScenario, number>;
  /** Emissionsfaktor Erdgas, kg CO₂e/kWh (brennwertbezogen: EBeV 2030 × 0,903). */
  emissionFactorKgPerKwh: number;
  /** Mehrwertsteuer auf alle Komponenten. */
  vat: number;
  source: string;
  /** Stand der Werte selbst — nur hochsetzen, wenn sich einer ändert. */
  validFrom: string;
  /**
   * Tag, an dem ein Lauf den IW-Report zuletzt wirklich aufgeschlagen hat —
   * also die PREISBESTANDTEILE (Biomethan, Netzentgelte, CO₂). Jährlich, mit
   * dem Nachfolge-Report.
   */
  geprueftIso: string;
  /**
   * Tag, an dem ein Lauf den RECHTSSTAND zuletzt nachgelesen hat (Verkündung,
   * Inkrafttreten, Stufen der Bio-Treppe). Eigenes Datum, weil es eine eigene
   * Sache mit eigenem Takt ist: Der tägliche News-Wächter sieht hier nach,
   * während die Report-Werte einmal im Jahr geprüft werden. Ein gemeinsames
   * Datum wäre für eines von beiden gelogen — dieselbe Aufteilung wie bei der
   * BEG-Förderung im Wärmepumpen-Rechner.
   *
   * Beide wandern auch bei „geprüft und unverändert" mit und bleiben bei einem
   * gescheiterten Abruf stehen (scripts/waechter-gate.md → Regel 9). Sichtbar
   * auf /waermepumpe-rechner über lib/stand.ts.
   */
  geprueftRechtIso: string;
  reviewBy: string;
}

export const GREEN_GAS_CONFIG: GreenGasConfig = {
  // Gesetzliche Stufen (§ 43 GModG): 2029: 10 %, 2030: 15 %, 2035: 30 %, 2040: 60 %.
  // Die Bio-Treppe hat KEINE 2028er-Stufe — Tabelle 2-2 (S. 9) führt 2028 für sie
  // ausdrücklich als „–". Das „bis zu 1 % ab 2028" steht in derselben Tabelle in
  // der Spalte der Quote nach § 42a (Inverkehrbringer-Ebene); für 2029–2040 ist
  // dort „noch kein konkreter gesetzlicher Quotenpfad festgelegt". Hier deshalb
  // konservativ als 0 angesetzt.
  // 2045: 100 % ist KEINE Gesetzesstufe, sondern die IW-Annahme aus § 42a (siehe oben).
  quoteStops: { 2026: 0, 2028: 0, 2029: 0.1, 2030: 0.15, 2035: 0.3, 2040: 0.6, 2045: 1.0 },
  erdgasCt2026: 5.2,
  erdgasEndFactor: { low: 0.85, base: 1.0, high: 1.15 },
  biomethanCt2026: 12,
  biomethanCt2045: { low: 12, base: 15, high: 18 },
  netzCt2026: 2.2,
  netzCt2045: { low: 2.2, base: 4.3, high: 6.4 },
  steuerKonzessionCt: 0.58,
  co2EurT2026: { low: 55, base: 60, high: 65 },
  co2EurT2045: { low: 150, base: 250, high: 350 },
  emissionFactorKgPerKwh: 0.1833,
  vat: 0.19,
  source:
    "IW-Report 36/2026 (Henger/Küper/Wünsch), Anhang Kap. 6 (S. 31–32) und Tabelle 3-2 " +
    "(S. 15): 1.080 € (2026) / 1.952 € (2040) / 2.366 € (2045) bei 10.000 kWh im " +
    "Basisszenario; der 2045er-Wert unter der Annahme vollständiger Grüngas-Versorgung. " +
    "Das Basisszenario ist laut Report ein analytischer Referenzpfad, keine Prognose",
  validFrom: "2026-07-25",
  // Preisbestandteile: Stand des IW-Reports, am 25.07.2026 im Volltext gelesen.
  geprueftIso: "2026-07-25",
  // Rechtsstand: Council mit Legal-Judge am 29.07.2026 — Gesetzestext und
  // Gesetzesbegründung (BT-Drs. 21/6278) im Volltext, Geltungsbereich
  // korrigiert. Der tägliche News-Wächter zieht dieses Datum ab jetzt nach.
  geprueftRechtIso: "2026-07-29",
  reviewBy: "2027-07-25",
};

// ─── Rechtsstand + Stufen als EINE Quelle für alle Texte ────────────────────
// Ratgeber, FAQ und das Rechner-Modal haben die Stufen jeweils selbst getippt und
// sind dabei auseinandergelaufen (eine erfundene 100-%-Stufe stand monatelang in
// drei Texten). Deshalb kommen die Zahlen ab hier aus einer Quelle.

/** Die gesetzlichen Stufen der Bio-Treppe nach § 43 GModG. Bewusst getrennt von
 *  `quoteStops` (das enthält zusätzlich Modell-Stützstellen des IW-Reports). */
export const BIO_TREPPE_STUFEN: ReadonlyArray<{ year: number; pct: number }> = [
  { year: 2029, pct: 10 },
  { year: 2030, pct: 15 },
  { year: 2035, pct: 30 },
  { year: 2040, pct: 60 },
];

/** Fließtext-Aufzählung der gesetzlichen Stufen, z. B.
 *  „10 % (2029), 15 % (2030), 30 % (2035) und 60 % (2040)". */
export function bioTreppeStufenText(unit: "%" | "Prozent" = "%"): string {
  const parts = BIO_TREPPE_STUFEN.map((s) => `${s.pct} ${unit} (${s.year})`);
  return `${parts.slice(0, -1).join(", ")} und ${parts[parts.length - 1]}`;
}

/** Datierter Sachstand des Gesetzgebungsverfahrens — kein rollierender Wert.
 *  Stand: Bundestag und Bundesrat haben das GModG am 10.07.2026 beschlossen; es
 *  wurde am 28.07.2026 im Bundesgesetzblatt verkündet (BGBl. 2026 I Nr. 226,
 *  Gesetz vom 23.07.2026) und tritt nach Artikel 9 Absatz 1 am Tag nach der
 *  Verkündung in Kraft — dem 29.07.2026. § 43 (Bio-Treppe) steht in Artikel 1 und
 *  ist von den späteren Stufen in Artikel 9 Absätze 2–4 (Art. 2 + 7 zum
 *  01.01.2027, Art. 3 zum 01.01.2028, Art. 4 zum 01.01.2030) NICHT erfasst.
 *  Volltext im Repo: docs/gmodg/BGBl-2026-I-Nr-226_GModG_verkuendet-2026-07-28.pdf
 *  — am 28.07.2026 Seite für Seite gegen die Werte hier geprüft.
 *  Ändert sich der Verfahrensstand, ist DAS hier die einzige Stelle.
 *  Quellen: recht.bund.de (Bundesgesetzblatt), gmodg.bund.de (GEG-Infoportal).
 *  Gepflegt vom täglichen `foerder-news-waechter` (Schritt 4c) nach dem Runbook
 *  scripts/gruengas-verify.md. */
export const GMODG_RECHTSSTAND = {
  stand: "Juli 2026",
  /** Dritte Lesung im Bundestag. Beleg ist die amtliche Chronologie auf
   *  gmodg.bund.de — NICHT das Bundesgesetzblatt: dort steht dieses Datum nicht.
   *  Und es war der Bundestag; das Bundesgesetzblatt trägt die Formel „Der
   *  Bundestag hat das folgende Gesetz beschlossen" und „Die verfassungsmäßigen
   *  Rechte des Bundesrates sind gewahrt" (Einspruchsgesetz). „Bundestag und
   *  Bundesrat haben beschlossen" stand hier bis zum 28.07.2026 und war falsch. */
  beschlossenAm: "10. Juli 2026",
  verkuendet: true,
  verkuendetAm: "28. Juli 2026",
  /** Ausfertigung durch den Bundespräsidenten — trägt die Vollzitierung. */
  ausgefertigtAm: "23. Juli 2026",
  /** Fundstelle der Verkündung — gehört in jede Rechtsaussage darüber. */
  fundstelle: "BGBl. 2026 I Nr. 226",
  inKraftSeit: "29. Juli 2026",
  /** Echter Stichtag (kein Renderdatum): bis dahin ist das Gesetz verkündet, aber
   *  noch nicht in Kraft — der Standsatz muss das unterscheiden, sonst behauptet
   *  er einen Tag zu früh geltendes Recht. */
  inKraftSeitIso: "2026-07-29",
  /** § 42a GModG: die eigentliche Grüngasquote für Inverkehrbringer soll bis zu
   *  diesem Datum in einem gesonderten Gesetz festgelegt werden. Stand
   *  28.07.2026: noch nicht vorgelegt. */
  quoteGesetzBis: "1. Dezember 2026",
  /** Artikel 2: ab hier gilt im Neubau das neue Referenzgebäude mit dem
   *  technologieneutralen Referenzwärmeerzeuger (siehe Zeitachse oben). */
  neubauReferenzAb: "1. Januar 2027",
  /** Bis hierhin errichtete Neubauten fallen unter die Bio-Treppe; danach
   *  verdrängt das Nullemissionsgebäude den Verweis in § 10 Absatz 2 Nummer 3.
   *  Beleg: Begründung zu § 5b KostAufG, BT-Drs. 21/6278, S. 125 — „Erfasst
   *  werden nur Neubauten, die bis zum 31.12.2029 errichtet werden." OHNE diese
   *  Grenze ist jede Neubau-Aussage zu weit. */
  neubauBioTreppeBis: "31. Dezember 2029",
  /** Artikel 4: ab hier ist jeder Neubau Nullemissionsgebäude — am Standort
   *  keine CO₂-Emissionen aus fossilen Brennstoffen. */
  neubauNullemissionAb: "1. Januar 2030",
} as const;

/** Ein Satz zum Verfahrensstand — für Ratgeber, FAQ, Rechner-Modal und
 *  /datenstand. `today` nur für Tests; im Betrieb der echte Kalendertag.
 *
 *  Vier Genauigkeiten, die ein Legal-Judge am 28.07.2026 angemahnt hat und die
 *  hier bewusst so und nicht kürzer stehen:
 *   1. Kein „Bundestag und Bundesrat haben beschlossen" — es ist ein
 *      Einspruchsgesetz (siehe `beschlossenAm`).
 *   2. „Gas, Heizöl oder Flüssiggas", nicht nur „Gas" — § 43 erfasst alle drei;
 *      wer nur Gas nennt, sagt einem Ölheizungs-Besitzer, er sei nicht gemeint.
 *   3. Der Stichtag im Wortlaut des Gesetzes („nach dem 29. Juli 2026"), nicht
 *      „danach" — sonst verschiebt er sich still um einen Tag gegen das
 *      Inkrafttreten am selben Datum.
 *   4. Der Hinweis auf die weiteren Erfüllungswege — ohne ihn überzeichnet der
 *      Satz die Pflicht, und zwar ausgerechnet dort, wo wir die Wärmepumpe
 *      rechnen. Genau benannt (Legal-Judge, 29.07.2026): § 43 Abs. 3 bis 5 sind
 *      Erfüllungswege (Solarthermie, Lüftung mit Wärmerückgewinnung,
 *      WP-Hybrid), Abs. 7 ist ein Aufschub bei irreparablem Ausfall. Abs. 6 ist
 *      KEIN Ersatzweg (er verlagert die Pflicht auf den Betreiber), und der
 *      echte Härtefall-Dispens steht in § 102, nicht in § 43 — die früher hier
 *      stehende Spanne „Abs. 3–7" mit dem Etikett „Ersatzwege und Härtefälle"
 *      war beides zu weit und falsch beschriftet.
 *   5. Nachgetragen am 29.07.2026: Der Satz darf den Geltungsbereich NICHT auf
 *      bestehende Gebäude verengen. Genau das tat er einen Tag lang — der
 *      Wortlaut von § 43 legt es nahe, aber § 10 Absatz 2 Nummer 3 zieht den
 *      Neubau ausdrücklich mit hinein (Herleitung im Kopf dieser Datei). Wer nur
 *      den Bestand nennt, sagt jedem Bauherrn, er sei nicht gemeint.
 *   6. „Einbau in ein bestehendes Gebäude", nicht „Heizungstausch": § 43 Abs. 1
 *      knüpft am NEU EINGEBAUT an, nicht am Ersetzen. Wer in einen Anbau oder
 *      ein bisher unbeheiztes Bestandsgebäude erstmals eine Gasheizung setzt,
 *      ist erfasst — aus „Tausch" liest er sich heraus. (§ 42 Abs. 1 spricht vom
 *      Ersetzen, § 43 Abs. 1 nicht.) */
export function gmodgStandSatz(today: Date = new Date()): string {
  const R = GMODG_RECHTSSTAND;
  if (!R.verkuendet) {
    return `Der Bundestag hat das GModG am ${R.beschlossenAm} beschlossen. Die Verkündung im Bundesgesetzblatt stand im ${R.stand} noch aus; das Gesetz tritt am Tag nach der Verkündung in Kraft.`;
  }
  const ersteStufe = BIO_TREPPE_STUFEN[0];
  const inKraft = today.getTime() >= new Date(`${R.inKraftSeitIso}T00:00:00`).getTime();
  if (!inKraft) {
    return `Das GModG wurde am ${R.ausgefertigtAm} ausgefertigt und am ${R.verkuendetAm} im Bundesgesetzblatt verkündet (${R.fundstelle}); es tritt am ${R.inKraftSeit} in Kraft.`;
  }
  return `Das GModG wurde am ${R.verkuendetAm} im Bundesgesetzblatt verkündet (Gesetz vom ${R.ausgefertigtAm}, ${R.fundstelle}) und ist seit dem ${R.inKraftSeit} in Kraft. Die Beimischpflicht gilt damit für Heizungen für Gas, Heizöl oder Flüssiggas, die nach dem ${R.inKraftSeit} neu eingebaut werden — beim Einbau in ein bestehendes Gebäude, typischerweise beim Heizungstausch (§ 43 GModG), ebenso wie in Neubauten, die bis zum ${R.neubauBioTreppeBis} errichtet werden (§ 10 Absatz 2 Nummer 3 in Verbindung mit § 43 GModG); ihre erste Stufe greift ${ersteStufe.year}, und neben der Beimischung lässt das Gesetz weitere Erfüllungswege sowie einen Aufschub bei irreparablem Ausfall zu (§ 43 Absatz 3 bis 5 und Absatz 7 GModG).`;
}
