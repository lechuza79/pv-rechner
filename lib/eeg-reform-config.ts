// ─── EEG-Reform 2027: Sachstand — EINE Quelle für alle Oberflächen ──────────
//
// WARUM DIESE DATEI EXISTIERT (30.07.2026): Der Verfahrensstand der EEG-Reform
// stand an SECHS Stellen handgetippt — in zwei FAQ-Einträgen, im Ratgeber, in
// der Ergebnis-Notiz des Rechners und in der 2027-Marke der Zubau-Zeitleiste.
// Am 29.07.2026 hat das Kabinett den Entwurf beschlossen; damit war der Satz
// "der Weg durch Kabinett, Bundestag und Bundesrat stand noch aus" auf allen
// Oberflächen gleichzeitig falsch. Der nächste Schritt (Bundestagsbeschluss)
// macht denselben Satz wieder falsch. Deshalb gilt hier dieselbe Systematik wie
// bei der Bio-Treppe (`greengas-config.ts`): Stufen, Fristen und
// Verfahrensstände kommen aus EINER Quelle, festgenagelt von einem Test. Eine
// zweite handgetippte Kopie ist ein Fehler, kein Duplikat.
//
// ZUSTAND (Wächter-Gate Regel 1) — nicht stillschweigend anheben:
//   Regierungsentwurf, vom Bundeskabinett beschlossen am 29.07.2026.
//   Das ist KEIN Gesetz. Geltendes Recht ist nichts davon.
//   Nächster Zustandswechsel: Bundestagsbeschluss → dann Verkündung → in Kraft.
//   Jeder dieser Schritte ist eine eigene Änderung mit eigener Fundstelle.
//
// EEG-Novellen sind EINSPRUCHSGESETZE. Deshalb heißt es "der Bundesrat ist am
// Verfahren beteiligt", nie "Bundestag und Bundesrat müssen zustimmen" — eine
// Zustimmungsbedürftigkeit stand nirgends und wäre eine Verschärfung ohne
// Fundstelle (Legal-Judge, 30.07.2026). Genau dieser Fehler wurde zwei Tage
// vorher schon beim GModG korrigiert.
//
// ── Belegebene 1: Kabinettsebene, amtlich ──────────────────────────────────
// Pressemitteilung des Bundesministeriums für Wirtschaft und Energie vom
// 29.07.2026 ("Die Bundesregierung schlägt das nächste Kapitel der Energiewende
// auf – EEG-Novelle und Netzanschlusspaket im Bundeskabinett beschlossen") und
// bundesregierung.de, "Kabinett beschließt EEG-Novelle und Netzpaket",
// 29.07.2026. Wörtlich daraus:
//   · "Im EEG beenden wir die Einspeisevergütung für Wind, PV und Biomasse."
//   · "Für kleine Anlagen unter 25 Kilowatt wird es daher keine dauerhafte
//     Förderung mehr geben." / "Bestandsanlagen sind aber geschützt. Sie
//     behalten ihre zugesicherte Förderung für die gesamte Laufzeit."
//   · "eine Starthilfe … in Form eines vierjährigen Direktvermarktungsbonus"
//   · "Die Einspeiseleistung kleiner und mittlerer PV-Dachanlagen wird auf 50
//     Prozent begrenzt, um Mittagsspitzen im Einspeiseprofil zu vermeiden, die
//     Eigenverantwortung der Anlagenbetreiber zu stärken und den Zubau von
//     Speichern anzureizen."
//
// ── Belegebene 2: die Kabinettsfassung selbst ──────────────────────────────
// SEIT 04.08.2026 GILT HIER EINE ANDERE LAGE als in den ersten Tagen nach dem
// Beschluss. Der amtliche Volltext der beschlossenen Fassung IST veröffentlicht
// ("Gesetzentwurf der Bundesregierung", 320 Seiten,
// bundeswirtschaftsministerium.de); er liegt im Repo unter docs/quellen/
// EEG-2027_Regierungsentwurf_BMWE_2026-07-29.pdf. Alle Detailwerte sind damit
// auf Kabinettsebene belegt und nicht mehr nur "Referentenentwurf".
//
// DER ABRUF HAT EINE FALLE: Ohne den Parameter ?__blob=publicationFile liefert
// der Server nur HTML. Genau daran ist eine parallele Prüfung gescheitert, die
// daraufhin "Kabinettsfassung weiter unveröffentlicht" meldete — ein Fehlschlag
// beim Abruf ist kein Beleg dafür, dass es die Quelle nicht gibt.
//
// UND DIE FASSUNGEN UNTERSCHEIDEN SICH. Wer Werte aus dem Referentenentwurf
// weiterträgt, trägt an zwei Stellen einen überholten Stand weiter — deshalb
// ist der Referentenentwurf hier nur noch Historie:
//   · Die 7-kW-Stufe endet "vor dem 1. Januar 2031" (Referentenentwurf: 2030).
//   · Die Leistungsschwelle der 50-%-Grenze ist entschieden: unter 100 kW,
//     zweites Segment (Referentenentwurf: eckige Klammern).
//   · Die 36-Monats-Regel steht in § 25 Abs. 2 (Referentenentwurf: Abs. 1a).
//
// Am 04.08.2026 Fundstelle für Fundstelle in der Kabinettsfassung selbst
// aufgeschlagen (nicht aus einem Report übernommen):
//   · § 21 Abs. 1 S. 1 Nr. 1 a–c — Leistungsstaffel der Übergangszahlung:
//     "weniger als 50 Kilowatt, die vor dem 1. Januar 2028 in Betrieb genommen
//     worden sind" / "weniger als 25 Kilowatt … vor dem 1. Januar 2029" /
//     "weniger als 7 Kilowatt … vor dem 1. Januar 2031". Es heißt WENIGER ALS,
//     nicht "bis" — die Fachpresse schreibt regelmäßig "bis 50 kWp", das ist
//     falsch. Steckersolargeräte sind nach Satz 2 ausgenommen.
//   · § 25 Abs. 2 — Dauer: "bis zum 36. auf die Inbetriebnahme der Anlage
//     folgenden Kalendermonat". Kalendermonats-Mechanik, nicht Datum plus 36.
//   · § 53 Abs. 1 — Höhe: "wobei von den anzulegenden Werten 1 Cent pro
//     Kilowattstunde abzuziehen sind".
//   · Begründung S. 199 — "ab dem Inbetriebnahmejahr 2031 steht das
//     Übergangsinstrument der befristeten Übergangszahlung nicht mehr zur
//     Verfügung". § 85 Abs. 2 Nr. 2a gibt der Bundesnetzagentur daneben die
//     Befugnis, die Übergangsphase zu verlängern (Buchst. a Dauer, Buchst. b
//     Anwendbarkeit), beides nur unter 25 kW und höchstens bis 31.12.2032.
//     Diese Kann-Bestimmung nie einrechnen und nur konditional formulieren;
//     deshalb auch nie "ab 2031 endgültig vorbei" schreiben.
//   · § 9 Abs. 2b — 50-%-Grenze: "Betreiber von Solaranlagen des zweiten
//     Segments mit einer installierten Leistung von weniger als 100 Kilowatt"
//     müssen "die Wirkleistungseinspeisung dauerhaft und unabhängig vom Einbau
//     eines intelligentem Messsystems und der Veräußerungsform auf maximal 50
//     Prozent der installierten Leistung … begrenzen"; Steckersolargeräte bis
//     2 kW und 800 VA sind nach Satz 2 ausgenommen. Begründung S. 192 wörtlich:
//     "§ 9 Absatz 2b EEG 2027 findet nur auf Neuanlagen Anwendung." Ohne dieses
//     "nur auf Neuanlagen" liest ein PV-Besitzer, seine laufende Anlage werde
//     gekappt.
//   · § 100 Abs. 1 — Bestandsschutz: für Strom aus Anlagen, "die vor dem 1.
//     Januar 2027 in Betrieb genommen worden sind", gilt das EEG "in der am 31.
//     Dezember 2026 geltenden Fassung".
//   · § 104 — "Die Bestimmungen des Teils 3 … dürfen erst nach der
//     beihilferechtlichen Genehmigung durch die Europäische Kommission und nur
//     nach Maßgabe dieser Genehmigung angewandt werden."
//
// AM 19.08.2026 GEGEN DIE BUNDESRATS-DRUCKSACHE NACHGEPRÜFT — die Auflage des
// Councils vom 04.08.2026 ist damit erledigt. Der Entwurf liegt seit dem
// 14.08.2026 als Drucksache 470/26 beim Bundesrat (Gesetzentwurf der
// Bundesregierung, erster Durchgang nach Art. 76 Abs. 2 GG); Volltext im Repo
// unter EEG_REFORM_STAND.primaerquelle. Nachgeprüft wurden alle Werte, an denen
// sich Referenten- und Kabinettsfassung unterschieden hatten, plus jede Zahl in
// EEG_ENTWURF_WERTE — sämtlich DECKUNGSGLEICH mit der Kabinettsfassung:
//   · Nr. 78 Buchst. a: "In der Angabe vor Nummer 1 wird die Angabe '7 Cent'
//     durch die Angabe '6,2 Cent' ersetzt."
//   · § 21 Abs. 1 S. 1 Nr. 1 Buchst. c: "mit einer installierten Leistung von
//     weniger als 7 Kilowatt, die vor dem 1. Januar 2031 in Betrieb genommen
//     worden sind" — die 7-kW-Stufe bleibt also bei 2031, nicht 2030.
//   · § 9 Abs. 2b: "zweiten Segments mit einer installierten Leistung von
//     weniger als 100 Kilowatt" / "auf maximal 50 Prozent" / Steckersolar bis
//     2 kW und 800 VA ausgenommen — die Schwelle bleibt entschieden.
//   · § 50c Abs. 1/4/5: "weniger als 25 Kilowatt" / "1,5 Cent pro eingespeiste
//     Kilowattstunde" / "bis zu einem Wechsel … in die Netzbetreiberabnahme,
//     längstens bis zum Ende des 48. … Kalendermonats".
//   · § 53 Abs. 1: "wobei von den anzulegenden Werten 1 Cent pro Kilowattstunde
//     abzuziehen sind"; Übergangszahlung "temporär für maximal 36 Monate".
//   · Nr. 20 Buchst. c (§ 21b Abs. 2 S. 3 n. F.): "Die Sätze 1 und 2 sind nicht
//     für die befristete Übergangszahlung, die unentgeltliche Abnahme und den
//     Mieterstromzuschlag anzuwenden" — das ist die Fundstelle, die
//     Übergangszahlung und § 50c-Bonus einander ausschließen lässt.
//   · Nr. 80 (§ 49 S. 1 n. F.): "Der anzulegende Wert nach § 48 Absatz 1
//     verringert sich ab dem 1. August 2027".
//   · § 104 Abs. 1: Beihilfevorbehalt unverändert.
// Der ZUSTAND bleibt "regierungsentwurf": Eine Drucksache ist die amtlich
// gedruckte Fassung desselben Entwurfs, kein Verfahrensfortschritt. Beschlossen
// hat weder Bundesrat noch Bundestag etwas.
//
// BEWUSST NICHT BEHAUPTET (jeweils mangels tragfähiger Fundstelle):
//   · ein Termin für die Bundestagsberatung ("ab September") — nur Fachpresse,
//     keine amtliche Stelle hat einen Termin genannt.
//   · dass die bestehende EU-Beihilfegenehmigung des EEG Ende 2026 ausläuft —
//     plausibel und vielfach referiert, aber die Befristung war in der
//     Kommissionsentscheidung vom 21.12.2022 selbst nicht abrufbar. Wieder
//     aufnehmen nur nach Lektüre dieser Entscheidung, dann als nackte Tatsache
//     ohne die Deutung "Zeitdruck".

/** Erkenntniszustand der Reform. Ein Auto-Fix darf Werte ändern, nie diesen
 *  Zustand — ein Zustandswechsel ist eine eigene Änderung mit eigener
 *  Fundstelle (Wächter-Gate Regel 1). */
export type EegReformZustand =
  | "referentenentwurf"
  | "regierungsentwurf"
  | "bundestag-beschlossen"
  | "verkuendet"
  | "in-kraft";

export interface EegReformStand {
  zustand: EegReformZustand;
  /** Tag des Kabinettsbeschlusses (ISO). */
  kabinettBeschlussIso: string;
  /** Datum des Entwurfs, auf dem der Beschluss beruht (ISO). */
  entwurfIso: string;
  /** Lag der Wortlaut der beschlossenen Fassung öffentlich vor? */
  kabinettsfassungVeroeffentlicht: boolean;
  /** Prüfdatum dieses Sachstands (ISO) — steht als "Stand" auf den Seiten. */
  geprueftIso: string;
  /** Pfad zur archivierten Primärquelle im Repo. */
  primaerquelle: string;
}

export const EEG_REFORM_STAND: EegReformStand = {
  zustand: "regierungsentwurf",
  kabinettBeschlussIso: "2026-07-29",
  // Geprüfte Fassung ist jetzt die Kabinettsfassung selbst, nicht mehr der
  // Referentenentwurf, auf dem sie beruht.
  entwurfIso: "2026-07-29",
  kabinettsfassungVeroeffentlicht: true,
  // 20.08.2026 erneut geprüft, Zustand und Werte unverändert: Der Entwurf liegt
  // weiterhin als Bundesrats-Drucksache 470/26 im ersten Durchgang; die nächste
  // Bundesratssitzung ist der 25.09.2026, eine erste Lesung im Bundestag hat es
  // nicht gegeben. Die drei Werte, die zwischen Referenten- und Kabinettsfassung
  // schon einmal gewandert sind, im Drucksachen-Volltext nachgeschlagen und
  // zellgleich vorgefunden: „6,2 Cent", „vor dem 1. Januar 2031 — also im Laufe
  // der Jahre 2029 und 2030" und die 50-%-Grenze für Anlagen „weniger als 100
  // Kilowatt des zweiten Segments".
  //
  // 22.08.2026 erneut geprüft, Zustand unverändert — diesmal über die beiden
  // Terminkalender, weil sie die Frage abschließend beantworten, statt sie
  // wahrscheinlich zu machen: Der Bundesrat führt als nächste Plenarsitzung den
  // 25.09.2026 (bundesrat.de, Termine der Plenarsitzungen), seit dem Eingang der
  // Drucksache am 14.08.2026 hat also gar keine Sitzung stattgefunden. Der
  // Bundestag ist im August ohne Sitzungswoche; die erste nach der Sommerpause
  // ist der 07.–11.09.2026. Eine erste Lesung kann es damit nicht gegeben haben.
  //
  // 23.08.2026 erneut geprüft, Zustand unverändert: Der Entwurf liegt seit dem
  // 14.08.2026 als Bundesrats-Drucksache 470/26 im ersten Durchgang, die nächste
  // Plenarsitzung des Bundesrates bleibt der 25.09.2026 — dazwischen liegt keine
  // Sitzung. Der Kabinettsbeschluss vom 29.07.2026 ist auf bundesregierung.de
  // unverändert der letzte Verfahrensschritt, den eine amtliche Stelle nennt;
  // weder Bundestag noch Bundesrat haben sich befasst.
  //
  // BEWUSST NICHT ÜBERNOMMEN: Die Fachpresse beziffert die Übergangszahlung
  // inzwischen auf „5,20 ct, ab August 2027 rund 5,14 ct". Das ist keine vierte
  // Zahl neben unseren Werten, sondern dieselbe — der anzulegende Wert 6,2 ct
  // minus 1 ct nach § 53 Abs. 1, gerundet. Ein zweiter getippter Wert daneben
  // wäre genau die Kopie, die dieser Config-Block verhindern soll; gerechnet
  // wird weiter aus AW und Abschlag.
  //
  // 24.08.2026 nachgesehen, unverändert: Die Bundesrats-Drucksache 470/26 steht
  // weiter als Grunddrucksache der Bundesregierung („Entwurf eines Gesetzes für
  // einen planbaren, kosteneffizienten, netzverträglichen und marktorientierten
  // Ausbau der erneuerbaren Energien im Stromsektor") ohne verzeichneten
  // Beschluss; das nächste Bundesratsplenum bleibt der 25.09.2026. Im Bundestag
  // ist der Entwurf nicht aufgerufen worden — die energiepolitischen Vorgänge
  // dieses Sommers betreffen Versorgungssicherheit und Netzausbau, nicht diesen.
  //
  // 25.08.2026 nachgesehen, unverändert — beide Kammern einzeln geprüft, weil
  // „Regierungsentwurf" erst kippt, wenn EINE von ihnen sich befasst hat:
  // bundesrat.de führt 470/26 weiter allein als Grunddrucksache der
  // Bundesregierung, ohne verzeichneten Beschluss; die Tagesordnungsseite des
  // Bundestages steht unverändert auf dem Stand vom 13.07.2026 (Sitzungen
  // 91.–94., also vor der Sommerpause) und nennt keinen EEG-Punkt. Der Entwurf
  // ist damit in keiner Kammer aufgerufen.
  //
  // 26.08.2026 nachgesehen, unverändert, beide Kammern erneut einzeln: 470/26
  // steht auf bundesrat.de weiter ohne verzeichneten Beschluss, die
  // Tagesordnungsseite des Bundestages trägt unverändert den Stand 13.07.2026
  // (Sitzungen 91.–94.) und nennt keinen EEG-Punkt. Was in der Fachpresse als
  // „Bundestag und Bundesrat beraten ab September" kursiert, ist eine
  // Ankündigung, kein Verfahrensschritt — der Zustand bleibt
  // „Regierungsentwurf".
  //
  // 28.08.2026 nachgesehen, unverändert, wieder beide Kammern einzeln:
  // bundesrat.de führt unter 470/26 weiterhin ausschließlich die
  // „BReg 470/26 Grunddrucksache", keine Beschlussdrucksache; die
  // Tagesordnungsseite des Bundestages nennt weder „Erneuerbare" noch
  // „Brennstoff", ruft also weder diesen Entwurf noch die BEHG-Novelle auf. Auf
  // bundesregierung.de ist der Kabinettsbeschluss vom 29.07.2026 unverändert der
  // letzte Verfahrensschritt, den eine amtliche Stelle nennt.
  //
  // EINE SUCHFALLE, damit sie nicht wiederkommt: Eine Verbände-Mitteilung mit
  // dem Titel „Erste Lesung der EEG-Novelle" steht weit oben in den
  // Suchtreffern und stammt vom 30.10.2020 — sie betrifft das EEG 2021. Ein
  // Treffer, der die richtige Sache benennt, ist noch kein Treffer aus der
  // richtigen Zeit; das Datum gehört zu jeder Fundstelle.
  //
  // 29.08.2026 nachgesehen, unverändert — diesmal wieder über die beiden
  // Sitzungskalender, weil sie die Frage abschließend beantworten statt sie
  // wahrscheinlich zu machen: Der Sitzungskalender des Bundestages
  // (bundestag.de/parlament/plenum/sitzungskalender) führt für August 2026
  // ÜBERHAUPT KEINE Sitzungswoche; die erste nach der Sommerpause ist der
  // 07.–11.09.2026. Der Bundesrat führt als letzte Plenarsitzung die 1067. am
  // 10.07.2026 und als nächste den 25.09.2026 — zwischen dem Eingang der
  // Drucksache 470/26 am 14.08.2026 und heute liegt also in beiden Kammern
  // keine einzige Sitzung. Ein Beschluss KANN es nicht gegeben haben; der
  // Zustand bleibt „Regierungsentwurf".
  geprueftIso: "2026-08-29",
  // Seit dem 19.08.2026 die Bundesrats-Drucksache statt des Ministeriums-PDF:
  // dieselbe Kabinettsfassung, aber die amtlich gedruckte und dauerhaft
  // zitierfähige Ausgabe. Das BMWE-PDF bleibt daneben liegen.
  primaerquelle: "docs/quellen/EEG-2027_Bundesrats-Drucksache-470-26_2026-08-14.pdf",
};

const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/** ISO-Datum als deutscher Langtext ("29. Juli 2026") — damit die Daten in den
 *  Texten nicht neben der Config nochmal getippt werden. */
export function eegDatum(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}. ${MONATE[m - 1]} ${y}`;
}

/** Das Stand-Datum für die sichtbaren Texte ("30. Juli 2026"). */
export function eegReformStandLabel(stand: EegReformStand = EEG_REFORM_STAND): string {
  return eegDatum(stand.geprueftIso);
}

/** Wo das Verfahren steht — der eine Satz, der auf JEDER Oberfläche gilt.
 *
 *  Er wird am Tag des Bundestagsbeschlusses falsch; genau darum steht er hier
 *  und nicht sechsmal im Code. `kurz` für enge Stellen (Ergebnis-Notiz,
 *  Zeitleisten-Marke), Langform für FAQ und Ratgeber.
 *
 *  Kein Beratungstermin: Den hat keine amtliche Stelle genannt. */
export function eegVerfahrenSatz(
  opts: { kurz?: boolean } = {},
  stand: EegReformStand = EEG_REFORM_STAND,
): string {
  const tag = eegDatum(stand.kabinettBeschlussIso);
  if (stand.zustand !== "regierungsentwurf") {
    // Absicht: Wer den Zustand weiterdreht, muss hier bewusst formulieren,
    // statt einen Satz zu erben, der den neuen Zustand falsch beschreibt.
    throw new Error(
      `eegVerfahrenSatz: kein Text für Zustand "${stand.zustand}" — Satz beim Zustandswechsel neu formulieren.`,
    );
  }
  if (opts.kurz) {
    return `die Bundesregierung hat dazu am ${tag} einen Gesetzentwurf beschlossen, der Bundestag muss noch entscheiden`;
  }
  return `Die Bundesregierung hat den Entwurf am ${tag} im Kabinett beschlossen — ein Gesetz ist er damit noch nicht. Als Nächstes befassen sich Bundesrat und Bundestag mit dem Entwurf; die Förderregeln brauchen zusätzlich die beihilferechtliche Genehmigung der EU-Kommission, der Entwurf stellt sie ausdrücklich unter diesen Vorbehalt.`;
}

/**
 * Die Leistungsstaffel der befristeten Übergangszahlung.
 * Entwurfswert (§ 21 Abs. 1 S. 1 Nr. 1 a–c) — immer als solcher kennzeichnen.
 *
 * ACHTUNG, hier hat sich die Kabinettsfassung vom Referentenentwurf UNTERSCHIEDEN
 * (geprüft am 04.08.2026): Buchstabe c lautete im Referentenentwurf "vor dem
 * 1. Januar 2030", in der beschlossenen Fassung "vor dem 1. Januar 2031". Die
 * 7-kW-Stufe deckt damit die Inbetriebnahmejahre 2029 UND 2030 ab, und die
 * Übergangszahlung entfällt erst ab Inbetriebnahmejahr 2031. Die Begründung
 * (S. 199) sagt es wörtlich: "im Laufe der Jahre 2029 und 2030" und "ab dem
 * Inbetriebnahmejahr 2031 steht das Übergangsinstrument der befristeten
 * Übergangszahlung nicht mehr zur Verfügung."
 *
 * Genau deshalb steht die Staffel als Liste im Code und nicht als Satz: Ein
 * handgetippter "bis 2029"-Satz hätte diese Änderung stumm überlebt.
 */
export const EEG_UEBERGANG_STAFFEL: ReadonlyArray<{ jahr: number; unterKw: number }> = [
  { jahr: 2027, unterKw: 50 },
  { jahr: 2028, unterKw: 25 },
  { jahr: 2029, unterKw: 7 },
  { jahr: 2030, unterKw: 7 },
];

/** "2027 unter 50, 2028 unter 25 und 2029 bis 2030 unter 7 Kilowatt
 *  installierter Leistung" — Einheit ausgeschrieben, weil die Seite sonst kWp
 *  verwendet und der Entwurf durchgehend "Kilowatt installierter Leistung"
 *  sagt. Jahre mit derselben Schwelle werden zusammengefasst, sonst liest sich
 *  die Aufzählung wie zwei verschiedene Stufen. */
export function eegStaffelSatz(): string {
  const gruppen: { jahre: number[]; unterKw: number }[] = [];
  for (const stufe of EEG_UEBERGANG_STAFFEL) {
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && letzte.unterKw === stufe.unterKw) letzte.jahre.push(stufe.jahr);
    else gruppen.push({ jahre: [stufe.jahr], unterKw: stufe.unterKw });
  }
  const teile = gruppen.map((g) => {
    const jahre = g.jahre.length > 1 ? `${g.jahre[0]} bis ${g.jahre[g.jahre.length - 1]}` : `${g.jahre[0]}`;
    return `${jahre} unter ${g.unterKw}`;
  });
  const letzte = teile.pop() as string;
  return `${teile.join(", ")} und ${letzte} Kilowatt installierter Leistung`;
}

// ─── Die Geldwerte des Entwurfs ─────────────────────────────────────────────
//
// ALLE WERTE HIER SIND ENTWURFSWERTE (Referentenentwurf vom 18.07.2026, Grundlage
// des Kabinettsbeschlusses vom 29.07.2026). Sie sind KEIN geltendes Recht und
// werden auf jeder Oberfläche als Entwurfswerte gekennzeichnet. Am 01.08.2026
// Paragraf für Paragraf im Volltext selbst aufgeschlagen (Pfad in
// EEG_REFORM_STAND.primaerquelle), nicht aus einem Bericht übernommen:
//
//  · § 48 Abs. 1 Satz 1 (Änderungsbefehl Nr. 78 Buchst. a): "In der Angabe vor
//    Nummer 1 wird die Angabe '7 Cent' durch die Angabe '6,2 Cent' ersetzt."
//    Die Begründung (S. 251) sagt dazu ausdrücklich, der anzulegende Wert werde
//    "nominell einheitlich auf 6,2 Cent pro Kilowattstunde festgelegt" und die
//    höheren Werte für Gebäudeanlagen nach § 48 Abs. 2, 2a und 3 EEG 2023
//    würden "demnach abgeschafft". Das betrifft ausdrücklich AUCH den Aufschlag
//    für Volleinspeisung (§ 48 Abs. 2a EEG 2023) — die Unterscheidung
//    Teil-/Volleinspeisung, die unser Rechner heute kennt, gäbe es für
//    Neuanlagen nicht mehr. Die ausführliche Passage dazu steht auf S. 253;
//    beide Seiten sind zitierbar.
//    ACHTUNG bei Formulierungen nach außen: "einheitlicher Wert bis 100 kW" ist
//    FALSCH. Der gesetzlich bestimmte Wert reicht bis zur Ausschreibungsschwelle
//    des zweiten Segments (über 750 kW); bei 100 kW greifen lediglich die
//    Direktvermarktungspflicht und die Zahlungspflicht nach § 21d.
//    Ebenfalls zu stark wäre "einheitlich für alle Solaranlagen": Die Begründung
//    sagt "nominell einheitlich", und § 48 Abs. 1b gibt besonderen Solaranlagen
//    (Agri- und Moor-PV) 0,5 ct mehr. Für Gebäudeanlagen ohne Belang, aber der
//    Satz muss "nicht ausgeschriebene Solaranlagen" sagen, nicht "alle".
//  · § 53 Abs. 1: Die befristete Übergangszahlung "berechnet sich aus den
//    anzulegenden Werten, wobei von den anzulegenden Werten 1 Cent pro
//    Kilowattstunde abzuziehen sind" → 6,2 − 1,0 = 5,2 ct/kWh.
//  · § 25 Abs. 2: gezahlt "bis zum 36. auf die Inbetriebnahme der Anlage
//    folgenden Kalendermonat". (Im Referentenentwurf war das noch Abs. 1a —
//    Fundstellen driften zwischen den Fassungen, Absatznummern also nie aus
//    einer älteren Fassung übernehmen.)
//  · § 50c Abs. 4 und 5: Bonus "1,5 Cent pro eingespeiste Kilowattstunde",
//    "bis zu einem Wechsel von der sonstigen Direktvermarktung in die
//    Netzbetreiberabnahme, längstens bis zum Ende des 48. auf die erstmalige
//    Zuordnung zur Veräußerungsform einer Direktvermarktung folgenden
//    Kalendermonats", nur für Anlagen unter 25 Kilowatt. Das "längstens" nie
//    weglassen: Ein Rückwechsel in die Netzbetreiberabnahme beendet den Bonus
//    ENDGÜLTIG, die Frist pausiert nicht.
//  · § 49 Satz 1: Der anzulegende Wert sinkt "ab dem 1. August 2027 und sodann
//    jeweils alle sechs Monate ... um 1 Prozent".
//  · § 9 Abs. 2b: "Betreiber von Solaranlagen des zweiten Segments mit einer
//    installierten Leistung von weniger als 100 Kilowatt" müssen die
//    Wirkleistungseinspeisung "dauerhaft und unabhängig vom Einbau eines
//    intelligentem Messsystems und der Veräußerungsform auf maximal 50 Prozent
//    der installierten Leistung" begrenzen; Steckersolargeräte bis 2 kW und
//    800 VA sind nach Satz 2 ausgenommen. Nur für Neuanlagen (§ 100 Abs. 1).
//    Die Schwelle stand im Referentenentwurf noch in eckigen Klammern
//    ("[weniger als 25/weniger als 100 Kilowatt]") — in der Kabinettsfassung
//    ist sie ENTSCHIEDEN. Wer den alten Kommentar "keine Zahl ergänzen" liest,
//    liest einen überholten Stand.
//
// ÜBERGANGSZAHLUNG UND BONUS SCHLIESSEN EINANDER AUS — aber die tragende
// Fundstelle ist nicht die naheliegende. § 50c Abs. 2 gewährt den Bonus "nur für
// Kalendermonate, in denen der in ein Netz eingespeiste Strom nach § 21a auf
// sonstige Weise direkt vermarktet wird", und die Übergangszahlung ist eine
// Variante der Netzbetreiberabnahme (Legaldefinition § 3 Nr. 5a). Das allein
// trägt den Ausschluss aber NICHT: § 21b Abs. 2 Satz 1 erlaubt grundsätzlich,
// eine Anlage prozentual auf mehrere Veräußerungsformen aufzuteilen — dann wären
// beide gleichzeitig denkbar. Tragend ist der geänderte § 21b Abs. 2 Satz 3, der
// die prozentuale Aufteilung bei Zuordnung zur Übergangszahlung ausschließt
// (Begründung S. 202). Erst damit ist es ein echtes Entweder-oder.
// (Fundstelle ergänzt nach dem Council vom 04.08.2026 — § 50c Abs. 2 wurde
// vorher als alleiniger Beleg geführt.)
//
// Folge für das Modell: Die 48-Monats-Frist des Bonus beginnt erst mit der
// erstmaligen Zuordnung zu einer DIREKTVERMARKTUNG, verfällt während der
// Übergangszahlung also nicht, sondern startet danach. Die Reihenfolge
// Übergangszahlung → Bonus ist möglich; ein Zurück in die Netzbetreiberabnahme
// beendet den Bonus dagegen endgültig (§ 50c Abs. 5: "bis zu einem Wechsel von
// der sonstigen Direktvermarktung in die Netzbetreiberabnahme"), ein
// Bonus → Übergangszahlung → Bonus gibt es nicht.
export const EEG_ENTWURF_WERTE = {
  /** Einheitlicher anzulegender Wert, ct/kWh (§ 48 Abs. 1 Satz 1). */
  anzulegenderWertCt: 6.2,
  /** Abschlag auf den anzulegenden Wert für die Übergangszahlung (§ 53 Abs. 1). */
  uebergangAbschlagCt: 1.0,
  /** Dauer der Übergangszahlung in Monaten (§ 25 Abs. 2). */
  uebergangMonate: 36,
  /** Direktvermarktungsbonus, ct/kWh (§ 50c Abs. 4). */
  bonusCt: 1.5,
  /** Höchstdauer des Bonus in Monaten (§ 50c Abs. 5). */
  bonusMonate: 48,
  /** Leistungsgrenze für den Bonus, kW (§ 50c Abs. 1: "weniger als"). */
  bonusUnterKw: 25,
  /** Halbjährliche Degression des anzulegenden Werts ab 01.08.2027 (§ 49 S. 1). */
  degressionProHalbjahr: 0.01,
  /** Deckel der Einspeiseleistung als Anteil der installierten Leistung (§ 9 Abs. 2b). */
  einspeiseGrenzeAnteil: 0.5,
  /** Leistungsschwelle des Deckels, kW (§ 9 Abs. 2b S. 1: "weniger als"). */
  einspeiseGrenzeUnterKw: 100,
  /** Steckersolar ist vom Deckel ausgenommen, kW (§ 9 Abs. 2b S. 2). */
  einspeiseGrenzeSteckerBisKw: 2,
} as const;

/**
 * ALLE Geldwerte oben stehen unter EU-Beihilfevorbehalt. § 104 des Entwurfs:
 * Die Bestimmungen des Teils 3 "dürfen erst nach der beihilferechtlichen
 * Genehmigung durch die Europäische Kommission und nur nach Maßgabe dieser
 * Genehmigung angewandt werden." Wo eine Geldzahl nach außen steht, gehört
 * dieser Vorbehalt als eigener Satz dazu.
 *
 * NICHT dagegen bei der 50-%-Einspeisegrenze: Die steht in Teil 2 (§ 9) und ist
 * von § 104 nicht erfasst. Den Vorbehalt pauschal über alles zu legen wäre
 * bequem und falsch. (Auflage des Legal-Judge, 04.08.2026.)
 */
export const EEG_BEIHILFEVORBEHALT =
  "Die Fördersätze stehen unter dem Vorbehalt der beihilferechtlichen Genehmigung durch die EU-Kommission; der Entwurf ordnet das ausdrücklich an.";

/** Höhe der befristeten Übergangszahlung in ct/kWh (§ 53 Abs. 1). */
export function eegUebergangszahlungCt(w = EEG_ENTWURF_WERTE): number {
  return Math.round((w.anzulegenderWertCt - w.uebergangAbschlagCt) * 100) / 100;
}

/** Darf eine Anlage dieser Größe im Inbetriebnahmejahr die Übergangszahlung
 *  nutzen? Der Entwurf sagt "weniger als", nicht "bis" — die Fachpresse
 *  schreibt regelmäßig "bis 50 kWp", das ist falsch und würde eine Anlage mit
 *  genau 50 kW fälschlich einschließen.
 *
 *  Dass ab Inbetriebnahmejahr 2031 gar nichts mehr geht, folgt aus der Staffel
 *  selbst (§ 21 Abs. 1 S. 1 Nr. 1 a–c nennt nur 2028/2029/2031 als Endtermine)
 *  und der Begründung S. 199 — NICHT aus § 85 Abs. 2 Nr. 2a. Der regelt
 *  ausschließlich die Befugnis der Bundesnetzagentur, und zwar in zwei
 *  Buchstaben: Buchst. a verlängert die DAUER des Anspruchs, Buchst. b
 *  erweitert seine ANWENDBARKEIT; beide nur für Anlagen unter 25 kW und beide
 *  gedeckelt auf den 31.12.2032. Diese Kann-Bestimmung wird NIE eingerechnet
 *  und nur konditional formuliert. Deshalb weder "ab 2031 endgültig vorbei"
 *  schreiben noch § 85 als Grund für das Ende zitieren.
 *  (Fundstellen präzisiert nach den Councils vom 04.08.2026.) */
export function eegUebergangBerechtigt(kwp: number, inbetriebnahmeJahr: number): boolean {
  const stufe = EEG_UEBERGANG_STAFFEL.find((s) => s.jahr === inbetriebnahmeJahr);
  if (!stufe) return false;
  return kwp < stufe.unterKw;
}
