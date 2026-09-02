// ─── Belegregister für Rechtsaussagen ───────────────────────────────────────
//
// Jede Vorschrift, die in einem nach außen sichtbaren Text genannt wird, steht
// hier mit der Fundstelle, an der jemand sie im ORIGINALTEXT gelesen hat, und
// mit dem Tag, an dem das geschah.
//
// Warum es das gibt (Inhalts-Inventur 25.08.2026): Der Betreiber beginnt mit
// regelmäßigem Posting auf LinkedIn — damit lesen erstmals Fachleute und
// abmahnbefugte Mitbewerber mit. Die Frage war nicht mehr „sind die Zahlen
// aktuell" (das leisten die Wächter), sondern „hat jede Aussage überhaupt einen
// Beleg". Der Anlass war eine Meldung, die plausibel klang und falsch war: Über
// 30 kW ende der umsatzsteuerliche Nullsatz. Der Gesetzestext macht aus der
// 30-kW-Marke eine Vermutungsregel, keine Sperre — darüber gilt der Nullsatz
// weiter, man muss die Voraussetzungen nur nachweisen statt sie vermutet zu
// bekommen. Aufgefallen ist das nur, weil der Betreiber nachfragte.
//
// Die Regel, die daraus folgt, steht seit langem in der Faktenprüfung: Eine
// Quellenangabe im Code ist unbelegt, bis jemand sie SELBST im Original gesehen
// hat — Konkretheit ist kein Beleg. Neu ist nur, dass sie ab jetzt erzwungen
// wird statt erinnert: `lib/__tests__/rechtsbelege.test.ts` liest die genannten
// Vorschriften aus dem ausgelieferten Text und verlangt für jede einen Eintrag.
//
// GRENZE DES REGISTERS — bewusst gezogen: Es deckt Vorschriften ab, die ein
// NUTZER liest, nicht die in Code-Kommentaren. Kommentare sind Arbeitsmaterial
// und gelten ohnehin als unbelegt; eine Belegpflicht für alle ~280 dortigen
// Nennungen würde niemand einhalten, und eine Pflicht, die niemand einhält,
// verdirbt die, die trägt.
//
// WAS EIN EINTRAG NICHT IST: eine Zusage, dass die Aussage daneben stimmt. Er
// sagt, dass die Vorschrift an diesem Tag im Originaltext gelesen wurde. Ob der
// Satz sie richtig wiedergibt, entscheidet die inhaltliche Prüfung — dafür gibt
// es das Council.

export type Rechtszustand =
  /** Geltendes, verkündetes und in Kraft getretenes Gesetz. */
  | "gesetz"
  /** Entwurf — noch nicht geltendes Recht. Aussagen darüber tragen einen Vorbehalt. */
  | "entwurf"
  /** Verwaltungsanweisung (z. B. UStAE): bindet die Verwaltung, ist kein Gesetz. */
  | "verwaltungsanweisung"
  /** Verordnung des Bundes oder der EU. */
  | "verordnung";

export interface Rechtsbeleg {
  /**
   * Kanonischer Schlüssel „KÜRZEL §N", genau wie ihn der Test aus dem Text
   * liest. Absatz, Satz und Nummer gehören NICHT hierher — sie stehen in
   * `fundstelle`, weil ein Paragraf mehrere Aussagen tragen kann.
   */
  norm: string;
  /** Ausgeschriebener Name des Gesetzes, für die Meldung des Tests. */
  gesetz: string;
  /** Wofür wir die Vorschrift in Anspruch nehmen — ein Satz, in Klartext. */
  traegt: string;
  /**
   * Die genaue Stelle, die gelesen wurde: Absatz, Satz, Nummer — und wo.
   * Ohne Absatz ist eine Fundstelle keine Fundstelle.
   */
  fundstelle: string;
  /** Wo der Originaltext liegt: Repo-Pfad unter docs/ oder die amtliche Adresse. */
  quelle: string;
  /**
   * Volltext im Repo. Ist er angegeben, prüft der Test, dass die Datei
   * WIRKLICH EXISTIERT — das ist der Teil, den ein Kommentar nicht kann.
   */
  volltext?: string;
  /** Tag, an dem jemand den Originaltext gesehen hat. Nie geschätzt, nie geerbt. */
  geprueftIso: string;
  zustand: Rechtszustand;
  /**
   * Nur bei `zustand: "entwurf"`: Wörter, von denen mindestens eines im selben
   * sichtbaren Text stehen muss, damit ein Entwurf nicht als geltendes Recht
   * gelesen wird. Ohne diese Angabe verlangt der Test die Standardliste.
   */
  vorbehaltWoerter?: string[];
}

/**
 * Vorbehaltswörter, die einen Entwurf als solchen kenntlich machen. Ein Text,
 * der eine Entwurfsnorm nennt und keines davon enthält, behauptet geltendes
 * Recht — genau der Fehler, der beim Gebäudemodernisierungsgesetz viermal
 * hintereinander passiert ist (docs/lehren/gmodg-rechtsstand-2026-07.md).
 */
export const VORBEHALT_WOERTER = [
  "Entwurf", "entwurf", "geplant", "soll ", "sollen ", "künftig", "ab 2027",
  "vorgesehen", "noch nicht", "beschlossen ist", "Kabinett", "Referenten",
];

/**
 * Das Register. Gefüllt aus der Inhalts-Inventur vom 25.08.2026; jede Zeile
 * steht für einen Originaltext, den ein Prüfer an diesem Tag selbst gelesen hat.
 */
export const RECHTSBELEGE: Rechtsbeleg[] = [
  // ── Verjährung: wie lange der Einwilligungsnachweis aufbewahrt wird ───────
  //
  // Beide Fristen bestimmen zusammen, wann der Nachweis eines abgemeldeten
  // Abos gelöscht wird. Die zivilrechtliche ist die längere und deckt die
  // bußgeldrechtliche mit ab; maßgeblich ist deshalb § 199 Abs. 1 BGB mit
  // seiner Ultimo-Regel.
  {
    norm: "BGB §195",
    gesetz: "Bürgerliches Gesetzbuch",
    traegt:
      "Regelmäßige Verjährungsfrist von drei Jahren. Zusammen mit § 199 Abs. 1 " +
      "(Beginn mit dem Schluss des Jahres) ergibt sich der Löschtermin für den " +
      "Einwilligungsnachweis: 31.12. des dritten Jahres nach der letzten Meldung.",
    fundstelle: "§ 195, dazu § 199 Abs. 1",
    quelle: "gesetze-im-internet.de/bgb/__195.html",
    geprueftIso: "2026-09-01",
    zustand: "gesetz",
  },
  {
    norm: "OWiG §31",
    gesetz: "Gesetz über Ordnungswidrigkeiten",
    traegt:
      "Verfolgungsverjährung von drei Jahren bei einem Bußgeldrahmen über " +
      "15.000 € (Abs. 2 Nr. 1); Beginn, sobald die Handlung beendet ist " +
      "(Abs. 3 Satz 1) — hier also mit der einzelnen versandten Mail, nicht " +
      "mit der Abmeldung. Anwendbar über § 41 Abs. 1 BDSG.",
    fundstelle: "§ 31 Abs. 2 Nr. 1 und Abs. 3 Satz 1",
    quelle: "gesetze-im-internet.de/owig_1968/__31.html",
    geprueftIso: "2026-09-01",
    zustand: "gesetz",
  },

  // ── Umsatzsteuer ──────────────────────────────────────────────────────────
  {
    norm: "UStG §12",
    gesetz: "Umsatzsteuergesetz",
    traegt:
      "Nullsteuersatz auf Kauf und Installation. Die 30-kW-Marke ist eine Vermutungsregel, " +
      "keine Obergrenze — darüber muss die Belegenheit nachgewiesen statt vermutet werden.",
    fundstelle: "§ 12 Abs. 3 Nr. 1 Satz 1 und Satz 2",
    quelle: "gesetze-im-internet.de/ustg_1980/__12.html",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "UStG §27a",
    gesetz: "Umsatzsteuergesetz",
    traegt: "Umsatzsteuer-Identifikationsnummer im Impressum.",
    fundstelle: "§ 27a Abs. 1 Satz 1 (in Bezug genommen von § 5 Abs. 1 Nr. 6 DDG)",
    quelle: "gesetze-im-internet.de/ustg_1980/__27a.html",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },

  // ── Gebäudemodernisierungsgesetz ─────────────────────────────────────────
  {
    norm: "GModG §43",
    gesetz: "Gebäudemodernisierungsgesetz",
    traegt:
      "Die Bio-Treppe: vier Beimischstufen (2029/2030/2035/2040 → 10/15/30/60 %) für " +
      "Heizungen mit Gas, Heizöl oder Flüssiggas, die nach dem 29.07.2026 neu eingebaut " +
      "werden. Dazu die Erfüllungswege (Abs. 3–5) und die Regelung beim irreparablen " +
      "Ausfall (Abs. 7).",
    fundstelle: "§ 43 Abs. 1, Abs. 3–5 und Abs. 7 (BGBl. 2026 I Nr. 226, S. 9 f.)",
    quelle: "Bundesgesetzblatt 2026 I Nr. 226, verkündet 28.07.2026",
    volltext: "docs/gmodg/BGBl-2026-I-Nr-226_GModG_verkuendet-2026-07-28.pdf",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "GModG §42",
    gesetz: "Gebäudemodernisierungsgesetz",
    traegt: "Gas, Heizöl und Flüssiggas sind als Erfüllungsoption zulässig — Heizöl gleichrangig.",
    fundstelle: "§ 42 Abs. 2 Nr. 1 (BGBl. 2026 I Nr. 226, S. 8)",
    quelle: "Bundesgesetzblatt 2026 I Nr. 226",
    volltext: "docs/gmodg/BGBl-2026-I-Nr-226_GModG_verkuendet-2026-07-28.pdf",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "GModG §42a",
    gesetz: "Gebäudemodernisierungsgesetz",
    traegt:
      "Ankündigung einer Grüngas- und Grünheizölquote: ein eigenes Gesetz, vorzulegen bis " +
      "zum 01.12.2026, soll die Inverkehrbringer bis 2045 auf klimaneutrale Brennstoffe " +
      "verpflichten. Der Paragraf nennt keinen Zwischenpfad — die 1 % ab 2028 stehen nur " +
      "in der Begründung.",
    fundstelle: "§ 42a (BGBl. 2026 I Nr. 226, S. 9)",
    quelle: "Bundesgesetzblatt 2026 I Nr. 226",
    volltext: "docs/gmodg/BGBl-2026-I-Nr-226_GModG_verkuendet-2026-07-28.pdf",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "GModG §10",
    gesetz: "Gebäudemodernisierungsgesetz",
    traegt:
      "Neubau: Der Verweis auf die §§ 42 bis 45 zieht die Bio-Treppe auch für zu " +
      "errichtende Gebäude heran. Ab 01.01.2030 ersetzt Artikel 4 den Paragrafen durch " +
      "das Nullemissionsgebäude.",
    fundstelle:
      "§ 10 Abs. 2 Nr. 3 n. F. (Art. 1 Nr. 9 Buchst. a, BGBl. 2026 I Nr. 226, S. 8); " +
      "Neufassung ab 2030: Art. 4 Nr. 2, S. 48",
    quelle: "Bundesgesetzblatt 2026 I Nr. 226",
    volltext: "docs/gmodg/BGBl-2026-I-Nr-226_GModG_verkuendet-2026-07-28.pdf",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "GModG §44",
    gesetz: "Gebäudemodernisierungsgesetz",
    traegt: "Teil der Spanne §§ 42–45, auf die der Neubau-Paragraf verweist.",
    fundstelle: "§ 44, zitiert innerhalb der Spanne „§§ 42 bis 45\" (BGBl. 2026 I Nr. 226, S. 8)",
    quelle: "Bundesgesetzblatt 2026 I Nr. 226",
    volltext: "docs/gmodg/BGBl-2026-I-Nr-226_GModG_verkuendet-2026-07-28.pdf",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "GModG §45",
    gesetz: "Gebäudemodernisierungsgesetz",
    traegt: "Teil der Spanne §§ 42–45, auf die der Neubau-Paragraf verweist.",
    fundstelle: "§ 45, zitiert innerhalb der Spanne „§§ 42 bis 45\" (BGBl. 2026 I Nr. 226, S. 8)",
    quelle: "Bundesgesetzblatt 2026 I Nr. 226",
    volltext: "docs/gmodg/BGBl-2026-I-Nr-226_GModG_verkuendet-2026-07-28.pdf",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },

  // ── Erneuerbare-Energien-Gesetz ──────────────────────────────────────────
  {
    norm: "EEG §25",
    gesetz: "Erneuerbare-Energien-Gesetz",
    traegt:
      "20 Jahre Zahlungsdauer ab Inbetriebnahme; bei gesetzlich bestimmtem anzulegendem " +
      "Wert verlängert bis zum 31.12. des zwanzigsten Jahres.",
    fundstelle: "§ 25 Abs. 1 Sätze 1–3 EEG 2023",
    quelle: "gesetze-im-internet.de/eeg_2014/__25.html",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "EEG §48",
    gesetz: "Erneuerbare-Energien-Gesetz",
    traegt: "Basiswerte der Einspeisevergütung für Gebäudeanlagen (Teil- und Volleinspeisung).",
    fundstelle:
      "§ 48 Abs. 2 und Abs. 2a EEG 2023 in der am 15.05.2024 geltenden Fassung — die " +
      "Bundesnetzagentur führt die Degressionskette weiterhin von diesen Werten fort " +
      "(§ 100 Abs. 40 EEG). Wer heute § 48 aufschlägt, findet andere Zahlen.",
    quelle: "gesetze-im-internet.de/eeg_2014/__48.html",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "EEG §49",
    gesetz: "Erneuerbare-Energien-Gesetz",
    traegt:
      "Degression: 1 % je Halbjahr zum 1.2. und 1.8., auf zwei Stellen gerundet; " +
      "fortgeschrieben wird der UNGERUNDETE Wert. Der Paragraf hat keine Absätze, " +
      "nur Sätze — „§ 49 Abs. 1\" wäre eine Fundstelle, die es nicht gibt.",
    fundstelle: "§ 49 Sätze 1 und 2 EEG 2023",
    quelle: "gesetze-im-internet.de/eeg_2014/__49.html",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "EEG §53",
    gesetz: "Erneuerbare-Energien-Gesetz",
    traegt: "Abzug von 0,4 ct/kWh bei Solaranlagen zwischen anzulegendem Wert und Vergütungssatz.",
    fundstelle: "§ 53 Abs. 1 Nr. 2 EEG 2023",
    quelle: "gesetze-im-internet.de/eeg_2014/__53.html",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "EEG §8",
    gesetz: "Erneuerbare-Energien-Gesetz",
    traegt:
      "Die einzige verbindliche Grenze für Steckersolar: bis 2 kW installierte Leistung " +
      "UND bis 800 Voltampere Wechselrichterleistung; dann entfällt die Meldung beim " +
      "Netzbetreiber.",
    fundstelle: "§ 8 Abs. 5a Sätze 1 und 2 EEG 2023",
    quelle: "gesetze-im-internet.de/eeg_2014/__8.html",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "EEG §11",
    gesetz: "Erneuerbare-Energien-Gesetz",
    traegt:
      "Vergütungssätze und Degressionskette der Jahrgänge 2004–2008 (EEG 2004): " +
      "45,7 ct Grundsatz, Gebäude-Staffel 57,4 / 54,6 / 54,0 ct, Fassadenbonus 5,0 ct, " +
      "Degression 5 % bzw. 6,5 % ab 2006.",
    fundstelle: "§ 11 Abs. 1, Abs. 2 Sätze 1 und 2, Abs. 5 EEG 2004 (BGBl. I 2004 Nr. 40, S. 1922 f.)",
    quelle: "Bundesgesetzblatt I 2004 Nr. 40",
    volltext: "docs/quellen/EEG-2004_BGBl-I-2004-Nr40-S1918.pdf",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  // ── Fristen ──────────────────────────────────────────────────────────────
  {
    norm: "BGB §186",
    gesetz: "Bürgerliches Gesetzbuch",
    traegt: "Die Auslegungsregeln der §§ 187 f. gelten auch für gesetzliche Fristen.",
    fundstelle: "§ 186 (einziger Satz)",
    quelle: "gesetze-im-internet.de/bgb/__186.html",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "BGB §187",
    gesetz: "Bürgerliches Gesetzbuch",
    traegt: "Der Tag der Inbetriebnahme zählt nicht mit — die Frist beginnt am Folgetag.",
    fundstelle: "§ 187 Abs. 1",
    quelle: "gesetze-im-internet.de/bgb/__187.html",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "BGB §188",
    gesetz: "Bürgerliches Gesetzbuch",
    traegt:
      "Monatsfrist endet am gleichlautenden Tag des Folgemonats; fehlt der Tag dort, " +
      "endet sie mit dem Monatsletzten — deshalb 28. ODER 29. Februar.",
    fundstelle: "§ 188 Abs. 2 und Abs. 3",
    quelle: "gesetze-im-internet.de/bgb/__188.html",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },

  // ── Website-Pflichten ────────────────────────────────────────────────────
  {
    norm: "DDG §5",
    gesetz: "Digitale-Dienste-Gesetz",
    traegt: "Anbieterkennzeichnung im Impressum: Name, Anschrift, Kontakt, Umsatzsteuer-ID.",
    fundstelle: "§ 5 Abs. 1 Nr. 1, 2 und 6",
    quelle: "gesetze-im-internet.de/ddg/__5.html",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "MStV §18",
    gesetz: "Medienstaatsvertrag",
    traegt:
      "Absatz 1 ist die allgemeine Anbieterkennzeichnung für alle nicht rein privaten " +
      "Telemedien; Absatz 2 verlangt ZUSÄTZLICH einen Verantwortlichen — aber nur bei " +
      "journalistisch-redaktionellen Angeboten, die Inhalte periodischer Druckerzeugnisse " +
      "wiedergeben. Die beiden Absätze sind schon einmal vertauscht worden.",
    fundstelle: "§ 18 Abs. 1 und Abs. 2",
    quelle:
      "Konsolidierte Fassung der Landesmedienanstalten (Siebter Medienänderungsstaatsvertrag, " +
      "in Kraft seit 01.12.2025) — nichtamtliche Textfassung; amtlich verkündet in den 16 " +
      "Landesgesetzblättern, eine Bundes-Fundstelle gibt es nicht",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "TDDDG §25",
    gesetz: "Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz",
    traegt:
      "Speichern im und Auslesen aus dem Endgerät braucht eine Einwilligung; Absatz 2 " +
      "Nr. 2 nimmt davon aus, was für den ausdrücklich gewünschten Dienst unbedingt " +
      "erforderlich ist. Das ist eine AUSNAHME vom Einwilligungserfordernis, keine " +
      "Rechtsgrundlage — nie als solche schreiben.",
    fundstelle: "§ 25 Abs. 1 und Abs. 2 Nr. 2",
    quelle: "gesetze-im-internet.de/ttdsg/__25.html (die Kennung lautet weiterhin „ttdsg\")",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "EEG §20",
    gesetz: "Erneuerbare-Energien-Gesetz",
    traegt:
      "Die einmalige Absenkung der Vergütung Mitte 2010 (Dach −13 %, Freifläche −12 %, " +
      "ab Oktober je weitere −3 %) und die Rundung auf zwei Stellen am Ende der Kette — " +
      "Grundlage der Jahrgänge 2010 und 2011.",
    fundstelle:
      "§ 20 Abs. 4 Satz 1 Nr. 1–3 und Abs. 5 EEG 2009 i. d. F. vom 11.08.2010 " +
      "(BGBl. I 2010 Nr. 43, S. 1171). Vor dem 11.08.2010 stand die Rundung in Abs. 3.",
    quelle: "Bundesgesetzblatt I 2010 Nr. 43",
    volltext: "docs/quellen/EEG-2009-Aenderung_11-08-2010_BGBl-I-2010-Nr43-S1170.pdf",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "EEG §32",
    gesetz: "Erneuerbare-Energien-Gesetz",
    traegt: "Freiflächen-Vergütungssatz des Jahrgangs 2009 (31,94 ct/kWh).",
    fundstelle: "§ 32 Abs. 1 EEG 2009 (BGBl. I 2008 Nr. 49, S. 2083)",
    quelle: "Bundesgesetzblatt I 2008 Nr. 49",
    volltext: "docs/quellen/EEG-2009_BGBl-I-2008-Nr49-S2074.pdf",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "EEG §33",
    gesetz: "Erneuerbare-Energien-Gesetz",
    traegt:
      "Gebäude-Vergütungssätze des Jahrgangs 2009 (43,01 / 40,91 / 39,58 / 33,0 ct/kWh) " +
      "und die Eigenverbrauchsvergütung bis 30 kW.",
    fundstelle: "§ 33 Abs. 1 Nr. 1–4 und Abs. 2 EEG 2009 (BGBl. I 2008 Nr. 49, S. 2083)",
    quelle: "Bundesgesetzblatt I 2008 Nr. 49",
    volltext: "docs/quellen/EEG-2009_BGBl-I-2008-Nr49-S2074.pdf",
    geprueftIso: "2026-08-25",
    zustand: "gesetz",
  },
  {
    norm: "MaStRV §5",
    gesetz: "Marktstammdatenregisterverordnung",
    traegt:
      "Registrierungspflicht für jede Stromerzeugungseinheit — Grundlage dafür, dass wir " +
      "die Anmeldung im Marktstammdatenregister als allgemeine Pflicht bezeichnen und " +
      "nicht als besondere Auflage einzelner Förderprogramme.",
    // Am 26.08.2026 im Original gelesen. Absatz 1 Satz 1 ist der Kern
    // („Betreiber müssen ihre Einheiten … registrieren"); Absatz 2 Nr. 1 nimmt
    // aus, was weder unmittelbar noch mittelbar ans Stromnetz angeschlossen ist
    // — also reine Inselanlagen. Für alles, was diese Seite rechnet, greift die
    // Pflicht deshalb ausnahmslos.
    fundstelle: "§ 5 Abs. 1 Satz 1, Ausnahme in Abs. 2 Nr. 1",
    quelle: "gesetze-im-internet.de/mastrv/__5.html",
    geprueftIso: "2026-08-26",
    zustand: "gesetz",
  },

  // ── Wettbewerbsrecht ──────────────────────────────────────────────────────
  {
    norm: "UWG §5",
    gesetz: "Gesetz gegen den unlauteren Wettbewerb",
    traegt:
      "Warum das Wort „Test“ auf dieser Seite nirgends steht: Wir messen keine Geräte. " +
      "Trägt außerdem die Schranken für absolute Werbeaussagen in der Vertrauensleiste.",
    // Am 27.08.2026 im Original gelesen. Absatz 1 ist die Generalklausel
    // (irreführende Handlung, die zu einer anderen geschäftlichen Entscheidung
    // veranlasst). Der für uns einschlägige Teil steht in Absatz 2 Nr. 1: dort
    // sind neben den „wesentlichen Merkmalen der Ware oder Dienstleistung“
    // ausdrücklich „die Ergebnisse oder wesentlichen Bestandteile von Tests der
    // Waren oder Dienstleistungen“ genannt. Eine Seite, die „Test“ in den Titel
    // nimmt, ohne gemessen zu haben, macht damit eine Angabe über ein
    // Testergebnis, das es nicht gibt — die Fundstelle ist also nicht nur die
    // allgemeine Irreführung, sondern der ausdrücklich benannte Fall.
    fundstelle: "§ 5 Abs. 1 und Abs. 2 Nr. 1 (Tests der Waren oder Dienstleistungen)",
    quelle: "gesetze-im-internet.de/uwg_2004/__5.html",
    geprueftIso: "2026-08-27",
    zustand: "gesetz",
  },
];


/**
 * Vorschriften, die eine Seite nennt, für die aber in der Inventur vom
 * 25.08.2026 KEIN Originaltext gelesen wurde.
 *
 * Sie stehen hier statt im Register, weil ein Beleg ohne Lesung genau das wäre,
 * wogegen es das Register gibt — dieselbe Fehlerklasse wie ein Prüfdatum für
 * eine Prüfung, die nie stattfand. Und sie stehen hier statt nirgends, weil eine
 * Lücke, die niemand führt, keine Lücke mehr ist, sondern ein blinder Fleck.
 *
 * Die Frist ist echt: Läuft sie ab, wird der Test rot. Wer sie verlängert, ohne
 * gelesen zu haben, verschiebt nur das Problem — dann lieber die Aussage aus der
 * Oberfläche nehmen.
 */
export const NOCH_NICHT_BELEGT: { norm: string; warum: string; frist: string }[] = [
  // Leer — und das ist ein Ergebnis, kein Zustand.
  //
  // Am 25.08.2026 standen hier neun Vorschriften. Sechs davon sind nicht belegt
  // worden, sondern ENTFERNT: Ihre Nennung trug nicht. Das Impressum führte
  // einen alten Textbaustein, in dem jemand nur das Gesetzeskürzel getauscht
  // hatte — die vier zitierten Paragrafen regeln im neuen Gesetz Sperransprüche,
  // Behördenlisten und Auskunftsverlangen, nicht die Haftung für eigene Inhalte;
  // die Freistellung von der Überwachungspflicht steht heute in einer
  // EU-Verordnung, und sie ginge uns ohnehin nichts an, weil wir keine fremden
  // Inhalte verbreiten. Eine Datenquelle trug eine Bereitstellungspflicht als
  // „Lizenz". Und eine Marktzahl war mit einer Vorschrift beschriftet, die
  // keinen Preis setzt.
  //
  // Die drei übrigen galten als „nicht beschaffbar" — auch das war falsch. Die
  // Bundesgesetzblatt-Faksimiles sind frei abrufbar, nur nicht über die Wege,
  // die zuerst probiert wurden; die nach dem Gesetz eingerichtete Clearingstelle
  // führt zu jeder Fassung den amtlichen Auszug. Sie stehen jetzt im Register.
  //
  // Merksatz aus beidem: Eine Vorschrift, die sich nicht belegen lässt, ist
  // häufiger falsch zitiert als unauffindbar.
];

/** Schneller Zugriff für den Test und für Aufrufer. */
export function belegFuer(norm: string): Rechtsbeleg | undefined {
  return RECHTSBELEGE.find((b) => b.norm === norm);
}

/**
 * Ältestes Prüfdatum im Register — das ist der Stand, den die Sammlung als
 * Ganzes behaupten kann. Ein Mittelwert wäre hier die falsche Größe: Er würde
 * einen vergessenen Eintrag hinter frisch geprüften verstecken.
 */
export function rechtsbelegeGeprueftIso(): string {
  if (RECHTSBELEGE.length === 0) return "";
  return RECHTSBELEGE.map((b) => b.geprueftIso).sort()[0];
}
