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
// ── Belegebene 2: nur Referentenentwurf vom 18.07.2026 ─────────────────────
// Der Wortlaut der beschlossenen Kabinettsfassung war am 30.07.2026 NICHT
// veröffentlicht. Grundlage des Beschlusses ist der Referentenentwurf vom
// 18.07.2026; Volltext liegt im Repo: docs/quellen/
// EEG-2027_Referentenentwurf_BMWE_2026-07-18.pdf. Am 30.07.2026 Fundstelle für
// Fundstelle selbst aufgeschlagen (nicht aus einem Report übernommen):
//   · § 21 Abs. 1 S. 1 Nr. 1 a–c — Leistungsstaffel der Übergangszahlung:
//     "weniger als 50 Kilowatt, die vor dem 1. Januar 2028 in Betrieb genommen
//     worden sind" / "weniger als 25 Kilowatt … vor dem 1. Januar 2029" /
//     "weniger als 7 Kilowatt … vor dem 1. Januar 2030". Es heißt WENIGER ALS,
//     nicht "bis" — die Fachpresse schreibt regelmäßig "bis 50 kWp", das ist
//     falsch. Steckersolargeräte sind nach Satz 2 ausgenommen.
//   · § 25 Abs. 1a — Dauer: "bis zum Ende des 36. auf die Inbetriebnahme der
//     Anlage folgenden Kalendermonats".
//   · § 53 Abs. 1 — Höhe: "wobei von den anzulegenden Werten 1 Cent pro
//     Kilowattstunde abzuziehen sind".
//   · § 85 Abs. 2 Nr. 2a + Begründung — ab Inbetriebnahmejahr 2030 steht die
//     Übergangszahlung "nicht mehr zur Verfügung"; die Bundesnetzagentur ist
//     aber befugt, sie "bis maximal zum 31. Dezember 2032" zu verlängern, wenn
//     die Direktvermarktung für kleine Anlagen noch nicht praxistauglich ist.
//     Deshalb nie "ab 2030 endgültig vorbei" schreiben.
//   · § 9 Abs. 2b — 50-%-Grenze: "die Wirkleistungseinspeisung dauerhaft und
//     unabhängig vom Einbau eines intelligenten Messsystems und der
//     Veräußerungsform auf maximal 50 Prozent der installierten Leistung …
//     begrenzen". Die Leistungsschwelle steht dort noch in eckigen Klammern:
//     "[weniger als 25/weniger als 100 Kilowatt]" — also OFFEN. Deshalb bleibt
//     es bei der vagen amtlichen Formulierung "kleine und mittlere Dachanlagen";
//     hier darf keine Zahl ergänzt werden, auch nicht "zur Präzisierung".
//     Begründung S. 190 wörtlich: "§ 9 Absatz 2b EEG 2027 findet nur auf
//     Neuanlagen Anwendung." Ohne dieses "nur auf Neuanlagen" liest ein
//     PV-Besitzer, seine laufende Anlage werde gekappt.
//   · § 100 Abs. 1 — Bestandsschutz: für Strom aus Anlagen, "die vor dem 1.
//     Januar 2027 in Betrieb genommen worden sind", gilt das EEG "in der am 31.
//     Dezember 2026 geltenden Fassung".
//   · § 102 — "Die Bestimmungen des Teils 3 … dürfen erst nach der
//     beihilferechtlichen Genehmigung durch die Europäische Kommission und nur
//     nach Maßgabe dieser Genehmigung angewandt werden."
//
// BEWUSST NICHT BEHAUPTET (jeweils mangels tragfähiger Fundstelle):
//   · dass der Direktvermarktungsbonus der Übergangszahlung zeitlich NACHfolgt
//     — der Bonus läuft "vier Jahre nach erstmaligem Eintritt in die
//     Direktvermarktung", die Fristen können also überlappen. Die
//     Abfolge-Behauptung stammt aus Presse.
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
  entwurfIso: "2026-07-18",
  kabinettsfassungVeroeffentlicht: false,
  geprueftIso: "2026-07-30",
  primaerquelle: "docs/quellen/EEG-2027_Referentenentwurf_BMWE_2026-07-18.pdf",
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

/** Die Leistungsstaffel der befristeten Übergangszahlung als Klartext.
 *  Entwurfswert (§ 21 Abs. 1 S. 1 Nr. 1 a–c) — immer als solcher kennzeichnen. */
export const EEG_UEBERGANG_STAFFEL: ReadonlyArray<{ jahr: number; unterKw: number }> = [
  { jahr: 2027, unterKw: 50 },
  { jahr: 2028, unterKw: 25 },
  { jahr: 2029, unterKw: 7 },
];

/** "2027 unter 50, 2028 unter 25 und 2029 unter 7 Kilowatt installierter
 *  Leistung" — Einheit ausgeschrieben, weil die Seite sonst kWp verwendet und
 *  der Entwurf durchgehend "Kilowatt installierter Leistung" sagt. */
export function eegStaffelSatz(): string {
  const teile = EEG_UEBERGANG_STAFFEL.map((s) => `${s.jahr} unter ${s.unterKw}`);
  const letzte = teile.pop() as string;
  return `${teile.join(", ")} und ${letzte} Kilowatt installierter Leistung`;
}
