// Standalone funding-program dataset — the single source of truth for PV /
// storage subsidies across all levels (Bund → Land → Landkreis → Kommune).
// Region pages reference programs by id; an overview page can render the whole
// set. Curated by hand (no machine-readable source exists), each entry carries
// a `stand` (as-of), `source`, `status` and a `verified` flag. Programs change
// and budgets run dry mid-year — treat `status` as a point-in-time snapshot.

export type Eligibility = "privat" | "gewerblich";
export type FundingLevel = "bund" | "land" | "landkreis" | "kommune";

/**
 * Welche Technik ein Programm fördert.
 *
 * WARUM DAS EIN EIGENES FELD IST (18.08.2026): Der Katalog war bis hierhin ein
 * reiner PV-Katalog — Dach-Anlage plus Speicher, und beides fest verdrahtet in
 * `fundingAmount`. Balkonkraftwerke kamen in einem guten Dutzend Programmen vor,
 * aber ausschließlich als Fließtext in `rates` und `conditions`: München fördert
 * seit Dezember 2024 NUR NOCH Steckersolar und stand trotzdem im PV-Rechner,
 * während der Balkon-Rechner gar keine Förderung kannte. Wärmepumpen fehlten
 * ganz; dort führen wir bis heute nur die Bundesförderung.
 *
 * Die Technik lässt sich NICHT aus den Rechenfeldern ableiten, und genau das ist
 * der Grund für ein eigenes Feld: Ein Programm ohne strukturierten Satz (weil
 * seine Bauform sich nicht ausdrücken lässt) hätte sonst keine Zuordnung — und
 * das sind ausgerechnet die, die nur informieren sollen.
 */
export type FundingTechnik = "pv" | "balkon" | "waermepumpe";

/**
 * Eine Förderbedingung — als blanker Satz oder auf eine Technik eingegrenzt.
 *
 * Die Textform bleibt der Normalfall, damit 85 Programme mit genau einer
 * Technik unverändert bleiben. Siehe die Begründung an `conditions`.
 */
export type FundingCondition = string | { text: string; nur: FundingTechnik[] };

/** Der Wortlaut einer Bedingung, gleich in welcher Form sie notiert ist. */
export function bedingungText(c: FundingCondition): string {
  return typeof c === "string" ? c : c.text;
}

/**
 * Die Bedingungen, die für DIESE Technik gelten.
 *
 * Ohne Technik-Angabe kommt alles zurück — der Fall der Übersichtsseiten, die
 * ein Programm als Ganzes zeigen. Mit Angabe fallen die Bedingungen weg, die
 * ausdrücklich für eine andere Technik notiert sind; ein blanker Satz bleibt
 * immer drin, weil er für alle gilt.
 */
export function bedingungenFuer(
  conditions: FundingCondition[],
  technik?: FundingTechnik,
): string[] {
  return conditions
    .filter((c) => !technik || typeof c === "string" || c.nur.includes(technik))
    .map(bedingungText);
}

/**
 * Die Fördersätze, die für DIESE Technik gelten — dieselbe Regel wie bei den
 * Bedingungen.
 */
export function saetzeFuer<T extends { nur?: FundingTechnik[] }>(rates: T[], technik?: FundingTechnik): T[] {
  return rates.filter((r) => !technik || !r.nur || r.nur.includes(technik));
}

/** Beschriftung der Technik — eine Quelle, damit Rechner und Seiten gleich sprechen. */
export const FUNDING_TECHNIK_LABEL: Record<FundingTechnik, string> = {
  pv: "Photovoltaik", balkon: "Balkonkraftwerk", waermepumpe: "Wärmepumpe",
};
export type FundingStatus = "aktiv" | "ausgeschoepft" | "pausiert" | "eingestellt" | "unsicher";

export const FUNDING_STATUS_LABEL: Record<FundingStatus, string> = {
  aktiv: "aktiv", ausgeschoepft: "ausgeschöpft", pausiert: "pausiert", eingestellt: "eingestellt", unsicher: "Status unklar",
};

/** Short status phrase for inline prose on city/archive pages — reads naturally
 *  after "… ist {phrase}" / "… — {phrase}". Keeps the wording in one place so
 *  the city page, the example note and any future caller stay consistent. */
export const FUNDING_STATUS_NOTE: Record<FundingStatus, string> = {
  aktiv: "nimmt aktuell Anträge an",
  ausgeschoepft: "aktuell ausgeschöpft (Fördertopf leer)",
  pausiert: "aktuell pausiert (keine neuen Anträge)",
  eingestellt: "eingestellt (wird nicht mehr angeboten)",
  unsicher: "Status unklar",
};

export interface FundingProgram {
  id: string;
  name: string;
  traeger: string;
  level: FundingLevel;
  /** Display region, e.g. "Stuttgart", "Berlin", "bundesweit". */
  region: string;
  /** Bundesland for grouping on the overview page; omitted for federal programs. */
  bundesland?: string;
  /** Geo key for PLZ→AGS matching: an AGS prefix the location's 8-digit AGS must
   *  start with. Land = 2-digit, Kreis/kreisfreie Stadt = 5-digit, Gemeinde =
   *  8-digit. Omitted for bund (matches everywhere). */
  agsCode?: string;
  url: string;
  /** Human-readable as-of, e.g. "Juni 2026". */
  stand: string;
  status: FundingStatus;
  /**
   * SEIT WANN läuft das Programm, und seit wann ist es vorbei?
   *
   * Beide ISO, beide so genau wie belegt und nicht genauer: `2024-07-15`,
   * `2024-07` oder `2024`. Kein Wert ist besser als ein geschätzter — ein
   * erfundenes Startjahr verschiebt in der Auswertung unten die ganze Kurve.
   *
   * WOFÜR (01.09.2026): Der Katalog wusste bisher nur, DASS ein Programm läuft
   * oder vorbei ist, nie ab wann. Damit lässt sich die Frage nicht beantworten,
   * für die dieser Katalog neben dem Rechner überhaupt taugt: Wie hat sich der
   * Zubau einer Gemeinde entwickelt, bevor und nachdem sie gefördert hat? Die
   * Zubauzahlen je Jahr und Gemeinde liegen im Atlas bereits vor; es fehlte
   * ausschließlich die Zeitachse auf dieser Seite. Ohne sie bliebe nur der
   * Vergleich „Gemeinden mit Förderung gegen Gemeinden ohne" — und der ist
   * wertlos, weil die Wirkungsrichtung offenbliebe: Eine Gemeinde, in der viel
   * gebaut wird, beschließt eher ein Programm, nicht nur umgekehrt.
   *
   * `endetIso` ist NICHT die Befristung der Richtlinie. „Gilt bis 31.12.2026"
   * heißt, dass die Richtlinie ausläuft, nicht dass keine Anträge mehr
   * angenommen werden; ein leerer Topf im August endet früher als sein
   * Richtlinientext. Gesetzt wird der Tag, ab dem die Gemeinde keine Anträge
   * mehr annimmt.
   *
   * `beschlossenIso` ist oft das EINZIGE harte Datum auf einer Amtsseite
   * („Der Rat beschloss am 17.09.2025 …"). Es ist nicht der Antragsstart —
   * zwischen Beschluss und erster Antragsmöglichkeit liegen regelmäßig Monate —
   * und ersetzt `beginntIso` deshalb nicht, sondern steht daneben.
   */
  beginntIso?: string;
  endetIso?: string;
  beschlossenIso?: string;
  /** Budget capped / first-come-first-served. */
  capped: boolean;
  /** Confirmed against the official source (vs. only aggregator portals). */
  verified: boolean;
  eligibility: Eligibility[];
  /**
   * Bedingungen als LESBARE Sätze — eine Bedingung je Eintrag.
   *
   * Regeln (aus der Überarbeitung der Frankfurter Karte, 16.08.2026; gelten für
   * ALLE Programme, nicht nur für neue):
   *
   * 1. **Eine Aussage je Eintrag.** Kein Semikolon-Anhängsel, das eine zweite
   *    Sache behauptet. „… keine Mittel mehr; die übrigen Bausteine sind davon
   *    nicht betroffen" ist zwei Bedingungen in einer Zeile — die zweite ist
   *    Beruhigung, die niemand gesucht hat, und sie treibt die Zeile über drei
   *    Zeilen Umbruch.
   * 2. **Aktiv und kurz.** „Balkonkraftwerke werden nicht mehr gefördert" statt
   *    „Für Balkonkraftwerke stehen keine Mittel mehr zur Verfügung".
   * 3. **Was NICHT gilt, gehört nicht in die Liste**, außer es ist der Kern der
   *    Bedingung. Wer eine Ausnahme erklärt, erklärt meist die Regel schlecht.
   * 4. **Keine Herleitung.** Aktenzeichen, Richtliniennummern und „laut Nr. 1.1"
   *    gehören in den Beleg beim Prüfdatum, nicht vor die Augen des Lesers.
   * 5. **Der Antragszeitpunkt steht immer drin** — er ist die einzige Bedingung,
   *    deren Verletzung die ganze Förderung kostet.
   *
   * Wer den Wortlaut ändert, ändert ihn auch in `lib/funding-conditions.ts`
   * (dort steht er zeichengleich als Beleg) — der Test schlägt sonst an, und
   * genau dafür ist er da.
   */
  /** Which costs the funding applies to — varies per program. */
  coveredCosts: string;
  /** Optional overall cap, e.g. "max. 50.000 €". */
  maxFoerderung?: string;
  /**
   * Fördersätze. `nur` grenzt eine Zeile auf eine Technik ein — gebraucht, wo
   * ein Programm Dach und Balkon zugleich fördert und die Karte beides nach
   * Reitern trennt.
   */
  rates: { label: string; value: string; nur?: FundingTechnik[] }[];
  /**
   * Bedingungen. Ein blanker String gilt für ALLE Techniken des Programms —
   * das ist der Normalfall (Antragsfrist, Haltedauer, kein Rechtsanspruch).
   *
   * Die Objektform grenzt auf eine Technik ein und ist die Ausnahme
   * (26.08.2026). Anlass: Niddas Karte zeigte neun Bedingungen in einer Liste,
   * darunter „mindestens 4 kWp" (gilt nicht fürs Balkonkraftwerk) und
   * „höchstens zwei Module" (gilt nicht fürs Dach). Wer sein Balkonkraftwerk
   * plante, las eine Mindestgröße, die ihn ausschloss, obwohl sie ihn nicht
   * betrifft — eine Bedingung am falschen Ort ist eine falsche Auskunft.
   *
   * Bewusst KEIN Pflichtfeld: 85 der 110 Programme fördern genau eine Technik,
   * dort wäre die Angabe reine Zeremonie. Nur wo mehrere Techniken
   * zusammenkommen, lohnt die Unterscheidung.
   */
  conditions: FundingCondition[];
  /** Ids of other programs this one can be combined with (rendered as links). */
  combinableWith: string[];
  // Structured rates so example calculations can show a concrete amount.
  pvPerKwp?: number;
  /** Flat base amount added before the per-kWp part (e.g. Düsseldorf 1.000 €). */
  pvSockel?: number;
  speicherPerKwh?: number;
  /**
   * Fester Grundbetrag für den Speicher, bevor der Satz je kWh greift — das
   * Gegenstück zu {@link pvSockel} auf der Speicherseite.
   *
   * WARUM ES DAS GIBT (19.08.2026): Die Bauform „Grundbetrag für die ersten
   * n kWh, danach je weiterer kWh" ist verbreitet und war bis dahin nicht
   * ausdrückbar. Schwebheim zahlt 400 € bei 3 kWh und 75 € je weiterer voller
   * kWh; mit `speicherTiers` nachgebaut zahlte das Modell bei 7,5 kWh — einer
   * der sechs Standardgrößen des Rechners — 775 € statt 700 €, weil
   * `tierAmount` aufrundet, wo die Richtlinie abrundet. Das Programm stand
   * deshalb ohne Rechenwert im Katalog.
   *
   * Gerechnet wird `speicherSockel + (volle kWh über speicherMin) × speicherPerKwh`,
   * gedeckelt an `speicherCap`. Der Sockel setzt `speicherMin` voraus — ohne
   * Untergrenze wäre nicht bestimmt, ab welcher Kapazität er überhaupt anfällt.
   */
  speicherSockel?: number;
  /** Share of total cost, e.g. 0.2 for 20 %. */
  percentOfCost?: number;
  /** Total € cap on the PV part — gilt für den €/kWp-Satz UND für
   *  `percentOfCost` (dort der Höchstbetrag des prozentualen Zuschusses). */
  pvCap?: number;
  /** Total € cap on the storage part. */
  speicherCap?: number;
  /** Tiered flat amounts by kWp (e.g. Köln): first tier whose `upTo` the size
   *  does not exceed wins. Use a large `upTo` for the open top tier. */
  pvTiers?: { upTo: number; amount: number }[];
  /** Tiered flat amounts by kWh storage. */
  speicherTiers?: { upTo: number; amount: number }[];
  /** Minimum storage kWh below which no storage funding is paid. */
  speicherMin?: number;
  /**
   * Mindestleistung der Dachanlage in kWp — darunter zahlt das Programm für den
   * PV-Teil nichts.
   *
   * WARUM ES DAS GIBT (27.08.2026): Die Untergrenze ist eine der verbreitetsten
   * Bedingungen kommunaler Programme und war als einzige verbreitete NICHT
   * ausdrückbar — die Obergrenze steckt in `pvTiers`, die Speicher-Untergrenze in
   * `speicherMin`, für die Anlage selbst gab es nichts. Sie stand deshalb im
   * Bedingungstext und fehlte in der Rechnung: Nidda schreibt „Die Anlage muss
   * mindestens 4 kWp leisten — kleinere Dachanlagen werden nicht gefördert", und
   * derselbe Katalogeintrag zog bei 3 kWp 300 € ab. Genau die Fehlerklasse, in
   * der die Beschriftung etwas anderes sagt als die Zahl daneben misst.
   *
   * Wirkt NUR auf den PV-Teil. Dass eine Untergrenze für die Anlage auch den
   * Speicherzuschuss ausschließt, ist naheliegend, steht aber in keiner der drei
   * geprüften Richtlinien — es zu unterstellen wäre eine Verschärfung ohne
   * Fundstelle (Wächter-Gate Regel 8). Wo Anlage und Speicher aus EINEM Satz
   * kommen (Mühlhausen), greift die Grenze ohnehin für beides.
   */
  pvMin?: number;

  // ── Technik ──────────────────────────────────────────────────────────────────
  /**
   * Welche Techniken dieses Programm fördert. Fehlt die Angabe, gilt `["pv"]`
   * — der Katalog war bis 18.08.2026 ausschließlich ein PV-Katalog, das ist die
   *  ehrliche Voreinstellung für die Altbestände. Siehe {@link technikenVon}.
   */
  foerdert?: FundingTechnik[];

  // ── Balkonkraftwerk (Steckersolar) ───────────────────────────────────────────
  // Eigene Sätze statt der PV-Felder, weil der Bezugswert ein anderer ist: Dach-PV
  // rechnet je kWp, Steckersolar fast immer als Pauschale je Gerät oder als
  // Anteil des Kaufpreises. Ein Balkon-Set mit 0,8 kWp durch die kWp-Formel eines
  // Dach-Programms zu schicken ergäbe eine Zahl, die kein Programm je zahlt.
  /** Fester Betrag je Gerät, z. B. Linsengericht 75 €. */
  balkonPauschale?: number;
  /** Satz je Wp Modulleistung, z. B. München 0,40 €/Wp. */
  balkonProWp?: number;
  /** Anteil der Anschaffungskosten, z. B. Holzgerlingen 30 %. */
  balkonPercentOfCost?: number;
  /** Deckel auf den Balkon-Teil — gilt für `balkonProWp` UND `balkonPercentOfCost`. */
  balkonCap?: number;
  /** Feste Beträge nach Modulleistung, z. B. Mühlhausen 100 / 150 / 200 € nach Wp.
   *  Erste Stufe gewinnt, deren `upTo` die Leistung nicht überschreitet. */
  balkonTiers?: { upTo: number; amount: number }[];

  // ── Wärmepumpe ───────────────────────────────────────────────────────────────
  // Kommunale WP-Zuschüsse sitzen NEBEN der BEG des Bundes und sind fast immer
  // klein und pauschal. Ein Satz je kW Heizlast kommt praktisch nicht vor und ist
  // deshalb bewusst nicht modelliert — er käme sonst nie zum Einsatz und wäre
  // eine ungetestete Rechenstrecke.
  /** Fester Betrag je Anlage. */
  wpPauschale?: number;
  /** Anteil der Investition. */
  wpPercentOfCost?: number;
  /** Deckel auf den Wärmepumpen-Teil. */
  wpCap?: number;

  // ── Provenance (DB-only; undefined in the code seed) ─────────────────────────
  /** ISO date the program was last verified (Wächter) or last written (resync
   *  fallback = updated_at). Surfaced as "Zuletzt geprüft" and as sitemap lastmod.
   *  Set by lib/funding-data.ts from the funding_programs row, not by the seed. */
  lastVerified?: string;
  /** Letzter geglückter Abruf der Amtsseite durch den Seiten-Wächter (ISO).
   *  Bestätigt: Die Seite ist noch da und unverändert. DB-only. */
  pageSeenAt?: string;
  /** Zeitpunkt der letzten erkannten Änderung der Amtsseite (ISO). Liegt er nach
   *  `lastVerified`, ist der geprüfte Inhalt in Frage gestellt. DB-only. */
  changedSinceIso?: string;
}

/**
 * Display label for a program's provenance. Prefers the DB verification date
 * ("Zuletzt geprüft: 18.06.2026") and falls back to the editorial `stand`
 * ("Stand: Juni 2026") for code-seed entries. Appends "· unbestätigt" when the
 * program is not confirmed against the official source.
 */
export function fundingStandLabel(p: FundingProgram, heute?: string): string {
  const unbestaetigt = p.verified ? "" : " · unbestätigt";
  // Zählt das Programm gerade nicht mit, MUSS das am Prüfdatum stehen — BLOCKER.
  // Sonst liest jemand "Zuletzt geprüft: 05.08.2026" neben einer Beispielrechnung,
  // die diese Förderung stillschweigend weglässt: Text und Zahl widersprechen
  // sich, und das ist die schwerste Fehlerklasse dieses Projekts.
  // NUR bei Programmen, die überhaupt einen Betrag abziehen können. Ein
  // Bundesprogramm wie die 0 % Mehrwertsteuer trägt keinen strukturierten Satz
  // und wird nie eingerechnet — dort wäre "daher nicht eingerechnet" eine
  // beunruhigende Falschaussage über eine dauerhafte Rechtslage.
  // Alle drei Techniken, nicht nur Dach-PV: Seit der Katalog auch Balkon- und
  // Wärmepumpen-Sätze trägt, hätte die reine PV-Liste genau bei diesen
  // Programmen geschwiegen — „Zuletzt geprüft: 18.08.2026" neben einer Rechnung,
  // die den Zuschuss stillschweigend weglässt. Das ist der Widerspruch zwischen
  // Text und Zahl, den der Hinweis verhindern soll.
  const rechenbar = !!(
    p.percentOfCost || p.pvPerKwp || p.pvTiers || p.speicherPerKwh || p.speicherTiers ||
    p.balkonPauschale || p.balkonProWp || p.balkonPercentOfCost || p.balkonTiers ||
    p.wpPauschale || p.wpPercentOfCost
  );
  const nichtGerechnet =
    rechenbar && p.status === "aktiv" && !fundingBelegAktuell(p, heute ?? heuteIso())
      ? " · aktuell nicht bestätigt, daher nicht eingerechnet"
      : "";
  // BEIDE Daten, nicht eines von beiden — dieselbe Regel wie in der Stand-Zeile
  // unter den Rechnern (CLAUDE.md, „Aktualisierungsstand"): Der redaktionelle
  // `stand` sagt, aus welchem Monat die WERTE sind, das Prüfdatum sagt, wann wir
  // sie zuletzt bestätigt haben. Bis zum 19.08.2026 zeigte diese Funktion
  // entweder das eine oder das andere, und zwar bevorzugt das Prüfdatum — wer
  // „Zuletzt geprüft: 19.08.2026" las, konnte nicht wissen, ob die Beträge von
  // gestern oder von vor einem Jahr stammen.
  //
  // Beide auch dann, wenn sie zusammenfallen: Wer die zweite Angabe nur bei
  // Abweichung sieht, lernt nie, dass es sie gibt — und liest ein späteres
  // „Werte von Juni, geprüft im Oktober" nicht als das, was es ist: bestätigt,
  // nicht vergessen.
  if (p.lastVerified) {
    const d = new Date(p.lastVerified);
    if (!isNaN(d.getTime())) {
      const tag = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
      return `Werte von ${p.stand}, zuletzt geprüft am ${tag}${unbestaetigt}${nichtGerechnet}`;
    }
  }
  // Ohne echtes Prüfdatum wird KEINES erfunden — auch kein Rückgriff auf den
  // Schreibzeitpunkt der Zeile. Dann steht nur da, woher die Werte stammen.
  return `Werte von ${p.stand}, noch nicht nachgeprüft${unbestaetigt}${nichtGerechnet}`;
}

// Bund applies everywhere and combines with every regional program.
const BUND = ["bund-nullsteuer", "bund-kfw270"];

export const FUNDING_PROGRAMS: Record<string, FundingProgram> = {
  // ── Bund (gilt überall) ──────────────────────────────────────────────────
  "bund-nullsteuer": {
    id: "bund-nullsteuer", name: "0 % Mehrwertsteuer auf PV & Speicher",
    traeger: "Bund", level: "bund", region: "bundesweit",
    // QUELLE IST DAS GESETZ, NICHT DIE MINISTERIUMS-STARTSEITE (26.08.2026).
    // Hier stand `bundesfinanzministerium.de` — eine Startseite mit
    // Pressemeldungen, die sich jede Nacht bewegt. Der Seiten-Wächter meldete sie
    // deshalb regelmäßig als „Amtsseite hat sich geändert", obwohl am
    // Nullsteuersatz nichts passiert war; ein Ministerium ändert seine
    // Nachrichtenspalte täglich, § 12 UStG nicht. Jetzt der Paragraf selbst — die
    // Stelle, an der eine echte Änderung tatsächlich sichtbar würde.
    // Am 26.08.2026 im Volltext gelesen: § 12 Abs. 3 Nr. 1 UStG nennt den
    // Steuersatz von 0 % für Solarmodule, wesentliche Komponenten und Speicher
    // samt Installation „in der Nähe von Privatwohnungen, Wohnungen sowie
    // öffentlichen und anderen Gebäuden, die für dem Gemeinwohl dienende
    // Tätigkeiten genutzt werden"; die 30-kWp-Schwelle ist dort die
    // Vereinfachung („gelten die Voraussetzungen […] als erfüllt").
    url: "https://www.gesetze-im-internet.de/ustg_1980/__12.html", stand: "Juni 2026",
    status: "aktiv", capped: false, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts:
      "0 % USt auf Kauf + Installation (Anlage an einem Wohngebäude; bis 30 kWp gilt das ohne Nachweis)",
    rates: [{ label: "Umsatzsteuer", value: "0 %" }],
    conditions: [
      "Anlage an einer Wohnung oder einem dem Gemeinwohl dienenden Gebäude — bis 30 kWp ohne Nachweis der Gebäudeart",
    ],
    combinableWith: ["bund-kfw270"],
  },
  "bund-kfw270": {
    id: "bund-kfw270", name: "KfW 270 – Erneuerbare Energien",
    traeger: "KfW", level: "bund", region: "bundesweit",
    url: "https://www.kfw.de/270", stand: "Juni 2026",
    status: "aktiv", capped: false, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "zinsgünstiger Kredit bis 100 % der Investition (kein Zuschuss)",
    rates: [{ label: "Finanzierung", value: "Kredit, kein Zuschuss" }],
    conditions: ["Antrag vor Vorhabenbeginn über die Hausbank"],
    combinableWith: ["bund-nullsteuer"],
  },

  // ── Land ───────────────────────────────────────────────────────────────────
  "berlin-solarplus": {
    id: "berlin-solarplus", name: "SolarPLUS", traeger: "IBB / Land Berlin",
    level: "land", region: "Berlin", bundesland: "Berlin", agsCode: "11",
    url: "https://www.berlin.de/solarcity/", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Pauschalen für Speicher, Zählerschrank, Denkmal-PV",
    rates: [
      { label: "Speicher (mit neuer PV)", value: "500 – 4.750 € (nach kWp)" },
      { label: "Zählerschrank", value: "750 € pauschal" },
      { label: "Denkmalgerechte PV", value: "600 – 5.700 €" },
    ],
    conditions: [
      "Projektstart erst nach Förderzusage",
      "Recycling-Zusage beim Speicher",
      "Balkonkraftwerke 2026 nicht mehr gefördert",
    ],
    combinableWith: BUND,
  },

  // ── Kommune – aktiv & solide ────────────────────────────────────────────────
  "stuttgart-solaroffensive": {
    id: "stuttgart-solaroffensive", name: "Stuttgarter Solaroffensive",
    traeger: "Landeshauptstadt Stuttgart", level: "kommune", region: "Stuttgart", bundesland: "Baden-Württemberg", agsCode: "08111",
    // Am 05.08.2026 aus der Förderrichtlinie selbst abgeschrieben (Fassung vom
    // 1. Mai 2026, Anlage 1 zu 229/2026 BV; Volltext in docs/quellen/). Vorher
    // standen hier zwei Ungewissheiten als Anzeigetext ("Satz 2026 neu justiert",
    // "ggf. eingestellt") — die Richtlinie beantwortet beide.
    //
    // DER SPEICHER-DECKEL BLEIBT BEI 15.000 € — nicht "korrigieren" (19.08.2026):
    // Die Stadt widerspricht sich auf ihren eigenen Seiten. Die Übersichtsseite
    // nennt unter "Fördersumme pro Antrag" 10.000 €, die Förderrichtlinie in
    // Ziffer 4.2 dagegen "Es werden maximal 15.000 Euro je Antrag bezuschusst" —
    // und dieselbe Übersichtsseite verweist für die Details ausdrücklich auf
    // ebendiese Richtlinie ("Aktuelle Förderrichtlinie", gültig ab 1. Mai 2026,
    // byte-gleich mit unserem Exemplar). Bindend ist der Richtlinientext, nicht
    // die Zusammenfassung. Den Wert auf die Übersichtszahl zu senken wäre kein
    // vorsichtiger Fix, sondern eine falsche Zahl in der sicher aussehenden
    // Richtung. Für ein Hausdach greift ohnehin keiner der beiden Deckel: Bei
    // 100 €/kWh und höchstens 1,0 kWh je kWp wären 15.000 € erst ab 150 kWp
    // erreicht.
    url: "https://www.stuttgart.de/solaroffensive", stand: "August 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "nur Begleitmaßnahmen (Elektrik, Gerüst, Statik…) + Speicher — NICHT die Module",
    rates: [
      { label: "Begleitmaßnahmen Dach-PV", value: "max. 300 €/kWp" },
      { label: "Begleitmaßnahmen Fassade / über Dachbegrünung", value: "max. 400 €/kWp" },
      { label: "PV gesamt", value: "50 % der förderfähigen Kosten, max. 30.000 € je Antrag" },
      { label: "Batteriespeicher", value: "100 €/kWh nutzbarer Kapazität, max. 15.000 € je Antrag" },
    ],
    conditions: [
      "Die Fördermittel für 2026 sind ausgeschöpft: Anträge werden weiterhin angenommen und bearbeitet, die Auszahlung erfolgt aber erst ab 2027",
      "PV-Zuschuss nur für Begleitmaßnahmen (Ertüchtigung der Elektrik und des Zählerplatzes, Gerüst, Statik, Verlegung von Bauteilen, Dachhaut, Blitzschutz) — Module, Montagesysteme und Wechselrichter selbst sind nicht förderfähig",
      "Speicher nur zusammen mit einer neu errichteten PV-Anlage; gefördert wird höchstens 1,0 kWh je kWp (bei 10 kWp also max. 10 kWh)",
      "Der erhöhte Satz von 400 €/kWp gilt nur, wenn die Anlage in die Gründachfläche integriert ist — getrennte Bereiche für PV und Begrünung reichen nicht",
      "Antrag zwingend vor Beauftragung; Eigenleistung ist nicht förderfähig, nur Ausführung durch eine Fachfirma",
      "Anlagen, die aufgrund bestehender Vorschriften errichtet werden müssen (z. B. die PV-Pflicht des Landes), sind nicht förderfähig",
      "Mit BAFA/KfW/L-Bank kombinierbar (deren Mittel werden abgezogen)",
      "Mit gültiger Stuttgarter FamilienCard oder Wohngeldbezug erhöht sich die Gesamtförderung auf Nachweis pauschal um 10 %",
      "Steckersolar-Geräte sind nicht Teil dieser Richtlinie",
    ],
    combinableWith: BUND,
  },
  "karlsruhe-klimabonus": {
    id: "karlsruhe-klimabonus", name: "Karlsruher Klima-Bonus",
    traeger: "Stadt Karlsruhe", level: "kommune", region: "Karlsruhe", bundesland: "Baden-Württemberg", agsCode: "08212",
    // STADT-STARTSEITE ERSETZT (26.08.2026). Hier stand `karlsruhe.de` — die
    // Startseite der Stadt. Sie trägt die Nachrichtenspalte und ändert sich
    // jede Nacht; der Seiten-Wächter meldete Karlsruhe an fünf von sechs Tagen
    // als „geändert", ohne dass am Programm etwas geschehen wäre. Jetzt der
    // Abschnitt, unter dem die Stadt das Programm samt Richtlinien-PDF führt
    // („Förderung für den Klimaschutz (KlimaBonus Karlsruhe)").
    // Status am 26.08.2026 an der amtlichen Meldung bestätigt: die 1,3 Mio. €
    // für 2026 sind „durch vorliegende Anträge bereits vollständig gebunden",
    // die Antragstellung ist „für dieses Jahr geschlossen", das Programm „wird
    // derzeit überarbeitet und soll im Jahr 2027 mit Änderungen an den Start
    // gehen" (karlsruhe.de/stadt-rathaus/aktuelles/meldungen/
    // foerdertopf-klimabonus-karlsruhe-fuer-2026-ausgeschoepft).
    url: "https://www.karlsruhe.de/mobilitaet-stadtbild/bauen-und-immobilien/wohnen", stand: "Mai 2026",
    status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp (Wohngebäude im Stadtkreis)",
    rates: [
      { label: "PV-Anlage", value: "250 €/kWp, max. 2.500 €" },
      { label: "Fassaden-PV / PVT-Bonus", value: "+100 €/kWp, max. 1.000 €" },
    ],
    conditions: [
      "Fördertopf 2026 ausgeschöpft — Neustart 2027 mit ggf. geänderten Sätzen",
      "Kein Speicher gefördert",
      "Antrag nach Installation, Fachbetrieb-Pflicht",
    ],
    combinableWith: BUND,
    pvPerKwp: 250, pvCap: 2500,
  },
  "regensburg-effizient": {
    id: "regensburg-effizient", name: "Regensburg effizient",
    traeger: "Stadt Regensburg", level: "kommune", region: "Regensburg", bundesland: "Bayern", agsCode: "09362",
    // Richtlinie der Stadt Regensburg zum Förderprogramm `Regensburg effizient´ —
    // Förderung der Photovoltaik, vom 1. Januar 2026 (PDF, am 03.08.2026 gelesen,
    // Volltext in docs/quellen/). Tabelle 1 kennt GENAU ZWEI Positionen:
    // PV-Anlage 100 €/kWp (max. 1.500 €) und 200 € Zuschuss bei Denkmal oder
    // Fassade. Die Wörter Speicher, Batterie und kWh kommen im gesamten
    // Richtlinientext nicht vor — der frühere Speicher-Satz (150 €/kWh, max.
    // 1.500 €) hat Regensburger Nutzern bis zu 1.500 € zu viel versprochen.
    // Nur die Nullsteuer bleibt als kombinierbar stehen: Punkt 2 e) schließt die
    // Kombination mit anderen INVESTIVEN Förderprogrammen des Bundes und des
    // Freistaats aus (KfW 270 ist eines), während die Umsatzsteuer ein
    // Steuersatz ist und kein Förderprogramm.
    url: "https://www.regensburg.de/greendeal/mitmachen/staedtische-foerderungen-zum-klimaschutz",
    stand: "August 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp — Batteriespeicher fördert die Stadt nicht",
    rates: [
      { label: "PV-Anlage", value: "100 €/kWp, max. 1.500 €" },
      { label: "Denkmalgeschütztes Gebäude oder Fassade", value: "+200 € pauschal" },
    ],
    conditions: [
      "Antrag muss vor Kauf/Baubeginn bewilligt sein",
      "Pro Gebäude wird eine Maßnahme gefördert; die Anlage muss mindestens fünf Jahre im Stadtgebiet betrieben werden",
      "Reine Freiflächenanlagen und Balkonkraftwerke sind nicht förderfähig",
      "Keine Doppelförderung mit anderen investiven Programmen des Bundes oder des Freistaats Bayern; Einnahmen aus dem EEG bleiben unberührt",
    ],
    combinableWith: ["bund-nullsteuer"],
    pvPerKwp: 100, pvCap: 1500,
  },
  "wuerzburg-klimastadt": {
    id: "wuerzburg-klimastadt", name: "Klimastadt Würzburg",
    traeger: "Stadt Würzburg", level: "kommune", region: "Würzburg", bundesland: "Bayern", agsCode: "09663",
    url: "https://www.wuerzburg.de/themen/umwelt-klima/foerderungen-und-beratungen/photovoltaik",
    // Am 05.08.2026 an der Trägerseite abgeschrieben (Förderseite Photovoltaik und
    // Übersicht „Förderung Klimaschutz und Klimaanpassung", beide wuerzburg.de).
    // Beide Seiten nennen ÜBEREINSTIMMEND genau vier PV-Bausteine — und darunter ist
    // KEINE gewöhnliche Dach-PV: Wer in Würzburg ein Einfamilienhausdach belegt, bekommt
    // von der Stadt nichts. Wir haben hier bis heute „Dach-PV (Vollbelegung) 150 €/kWp"
    // und einen Denkmalschutz-Baustein versprochen; beides gibt es nicht (mehr).
    // Zielgruppe ist bei allen vier Bausteinen Eigentümer/WEG/Mehrfamilienhaus.
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp für vier Sonderfälle (Gebäudeversorgung im MFH, Fassade, PVT, PV auf Gründach) — gewöhnliche Dach-PV wird nicht gefördert",
    rates: [
      { label: "Gemeinschaftliche Gebäudeversorgung (MFH)", value: "2.000 € + 150 €/kWp, max. 5.000 €" },
      { label: "PV an Fassade", value: "250 €/kWp, max. 5.000 €" },
      { label: "PVT-Kollektoren (Strom + Wärme)", value: "250 €/kWp, max. 5.000 €" },
      { label: "PV mit Dachbegrünung", value: "150 €/kWp, max. 3.000 €" },
    ],
    conditions: [
      "Eine gewöhnliche Dachanlage ohne Gründach ist nicht förderfähig — die vier Bausteine decken nur Gebäudeversorgung im Mehrfamilienhaus, Fassade, PVT und PV über einer Dachbegrünung",
      "Zielgruppe aller vier Bausteine: Gebäudeeigentümer, Wohnungseigentümergemeinschaften und Mehrfamilienhäuser",
      "Antrag + Bescheid vor Maßnahmenbeginn; kein Speicher gefördert",
      "Programm zum 25.04.2026 zu „KlimaStadt Würzburg“ umgebaut; die Dachbegrünung selbst ist ein eigener Baustein und mit dem PV-Baustein kombinierbar",
      "Bund/Land kumulierbar, max. 90 % der Kosten",
    ],
    combinableWith: BUND,
  },
  "frankfurt-klimabonus": {
    id: "frankfurt-klimabonus", name: "Frankfurter Klimabonus",
    traeger: "Stadt Frankfurt am Main", level: "kommune", region: "Frankfurt am Main", bundesland: "Hessen", agsCode: "06412",
    url: "https://frankfurt.de/themen/klima-und-energie/stadtklima/klimabonus",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "20 % von Material- und Arbeitskosten",
    maxFoerderung: "max. 100.000 €",
    rates: [
      { label: "PV-Anlage", value: "20 % (30 % als Solar-Gründach)" },
      { label: "Batteriespeicher + Ladesäule", value: "20 %" },
      { label: "Gemeinschaftsprojekte", value: "+5 Prozentpunkte" },
      { label: "Balkonkraftwerk", value: "keine Mittel" },
    ],
    conditions: [
      "Erst nach Zuwendungsbescheid mit der Maßnahme beginnen",
      "Online-Antrag mit Registrierung",
      "Grundstück im Stadtgebiet Frankfurt",
      "Batteriespeicher und Ladesäulen nur in Kombination mit einer neuen PV-Anlage",
      "Balkonkraftwerke werden seit dem 03.06.2025 nicht mehr gefördert",
      "Pflichtmaßnahmen werden nicht gefördert",
      "Die Investitionen dürfen nicht zu einer Mieterhöhung führen",
    ],
    combinableWith: BUND,
    percentOfCost: 0.2,
  },
  "darmstadt-pv": {
    id: "darmstadt-pv", name: "Förderprogramm Photovoltaik",
    traeger: "Wissenschaftsstadt Darmstadt", level: "kommune", region: "Darmstadt", bundesland: "Hessen", agsCode: "06411",
    // Am 03.08.2026 an der Trägerseite geprüft: Sätze unverändert, Programm läuft,
    // kein Hinweis auf ausgeschöpfte Mittel. Geändert wurde nur der Link — er zeigte
    // auf die Stadt-Startseite und führte damit nirgendwohin.
    url: "https://www.darmstadt.de/leben/umwelt/foerderprogramme",
    stand: "August 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp (Anschaffung + Installation)",
    rates: [
      { label: "PV-Anlage (Dach/Fassade)", value: "200 €/kWp, max. 6.000 €" },
      { label: "Balkonkraftwerk", value: "200 – 400 € (max. 50 %)" },
    ],
    conditions: [
      "Freiwillige Leistung, kein Rechtsanspruch",
      "Hier wird der Antrag erst NACH Inbetriebnahme und Registrierung im Marktstammdatenregister gestellt — anders als bei den meisten anderen Programmen",
      "Die Anlage muss im eigenen Eigentum stehen; Rechnungsdatum der Module nach dem 28.06.2022",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    pvPerKwp: 200, pvCap: 6000,
  },
  "badhomburg-energiespar": {
    id: "badhomburg-energiespar", name: "Energiesparförderung",
    traeger: "Stadt Bad Homburg", level: "kommune", region: "Bad Homburg", bundesland: "Hessen", agsCode: "06434001",
    // Schlüssel korrigiert am 19.08.2026: 06434003 gehört Glashütten, nicht Bad
    // Homburg. Ein Altbestand — gefunden von der neuen Schlüsselprüfung, die
    // eigentlich meine eigenen Fehler derselben Runde suchen sollte. Wirkung
    // vorher: Die Bad Homburger Förderung wurde 3.000 Einwohnern im Taunus
    // angeboten und den 57.000 in Bad Homburg vorenthalten.
    // ANTRAGSSTOPP, NICHT AUSGESCHÖPFT (korrigiert 24.08.2026). Hier stand
    // „Haushaltsmittel laut mehreren Quellen derzeit ausgeschöpft" — eine
    // Sekundärquellen-Aussage, die als Adresse nur die nackte Homepage hatte und
    // deshalb nie nachprüfbar war. Die Amtsseite sagt etwas anderes und nennt
    // einen anderen Grund: „Zum 10.08.2026 wird die Annahme neuer Förderanträge
    // im Rahmen des kommunalen Förderprogramms vorübergehend gestoppt.
    // Hintergrund ist eine Umstrukturierung des digitalen Antragsprozesses sowie
    // die Optimierung interner Arbeitsabläufe."
    //
    // Der Unterschied ist die Auskunft, für die jemand die Seite aufschlägt: Ein
    // leerer Topf heißt „im nächsten Haushaltsjahr wieder versuchen", ein
    // Verwaltungsumbau heißt „kommt wieder, Termin offen". Beide Zustände ziehen
    // nichts ab, aber nur einer stimmt. Beträge am 24.08.2026 an der Richtlinie
    // selbst geprüft (§ 3 Abs. 2 Buchst. a und d) und zellgleich bestätigt.
    url: "https://www.bad-homburg.de/de/stadt/umwelt-und-klima/umwelt-und-klimaschutz/energieberatung",
    stand: "August 2026",
    status: "pausiert", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp + je kWh Speicher (derzeit keine Antragsannahme)",
    rates: [
      { label: "PV-Anlage", value: "300 €/kWp, max. 6.000 €" },
      { label: "Batteriespeicher", value: "300 €/kWh, max. 3.000 €" },
    ],
    conditions: [
      "Seit dem 10. August 2026 nimmt die Stadt keine neuen Förderanträge an — sie baut das digitale Antragsverfahren um; wie lange das dauert, sagt sie nicht",
      "Vollständige Anträge, die vor dem 10. August 2026 eingegangen sind, werden regulär weiterbearbeitet",
      "Mieter ausdrücklich antragsberechtigt",
      "Gefördert werden Gebäude mit bis zu acht Wohneinheiten",
    ],
    combinableWith: BUND,
    pvPerKwp: 300, speicherPerKwh: 300, pvCap: 6000, speicherCap: 3000,
  },
  "nidda-solar": {
    // „Balkonkraftwerk" statt des amtlichen „Mini-PV" (26.08.2026): Die Stadt
    // nennt es in ihrer Richtlinie „Mini-PV-Anlagen (auch Balkon-Module oder
    // Stecker-PV genannt)" — wir nehmen das Wort, das Menschen benutzen und in
    // die Suche tippen, und halten es überall gleich.
    id: "nidda-solar", name: "Förderprogramm Photovoltaik, Stromspeicher und Balkonkraftwerke",
    traeger: "Stadt Nidda", level: "kommune", region: "Nidda", bundesland: "Hessen", agsCode: "06440016",
    // Aufgenommen am 26.08.2026, nachdem die Klimaschutz-Beauftragte der Stadt
    // uns die Seite selbst geschickt hat — auf eine Outreach-Mail hin, in der es
    // um etwas anderes ging. Unsere eigene Suche hatte sie nicht: Sie liegt
    // sechs Menüebenen tief, und im ganzen Wetteraukreis führten wir bis dahin
    // kein einziges Programm.
    //
    // ZAHLEN AUS DEN RICHTLINIEN, NICHT AUS DER ÜBERSICHTSSEITE. Beide PDF am
    // 26.08.2026 im Volltext gelesen und im Repo gesichert
    // (docs/quellen/nidda/26-rl-pv.pdf und 26-rl-minipv.pdf, beide Stand
    // 14.08.2025, Förderzeitraum 01.01.–31.12.2026). Die Übersichtsseite
    // weicht an drei Stellen ab, und jede davon hätte hier einen falschen Wert
    // erzeugt:
    //  · Sie nennt „in Kombination mit einem Stromspeicher bis zu 1.500 €" und
    //    lässt offen, wie sich das aufteilt. Die Richtlinie sagt es: 100 €/kWp
    //    bis 1.000 € für die Anlage PLUS 50 €/kWh bis 500 € für den Speicher.
    //    Ohne die Richtlinie hätte hier ein geratener Speichersatz gestanden
    //    oder gar keiner.
    //  · Sie schreibt „startet am 01.01.2025" — ein stehengebliebener
    //    Vorjahrestext, zwei Absätze über der Aussage, der Beschluss gelte 2026.
    //  · Sie sagt nichts zur Antragsberechtigung. Die Richtlinie beschränkt die
    //    Dach-Förderung auf Privatpersonen mit Wohneigentum; „gewerblich" wäre
    //    hier falsch. Bei Mini-PV genügt der Hauptwohnsitz — Mieter sind also
    //    ausdrücklich dabei, und genau darauf zielt die Stadt.
    url: "https://www.nidda.de/leben/infrastruktur/klima-umwelt-wasser/klima/foerderprogramme/foerderung-stadt-nidda/",
    stand: "August 2026",
    status: "aktiv", capped: true, verified: true,
    // Nur privat: „ausschließlich Privatpersonen mit Wohneigentum in Nidda"
    // (PV-Richtlinie Nr. 1), bei Mini-PV „Privatpersonen mit Hauptwohnsitz".
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp und je kWh Speicher; Balkonkraftwerk anteilig",
    // Gilt der Dachanlage; das Balkonkraftwerk hat seinen Deckel in seiner
    // eigenen Zeile und braucht ihn hier nicht ein zweites Mal.
    maxFoerderung: "max. 1.500 € (Dachanlage + Speicher)",
    // JE TECHNIK GETRENNT (26.08.2026). Vorher stand alles in einer Liste, und
    // die widersprach sich für den Leser: „mindestens 4 kWp" neben „höchstens
    // zwei Module" — die erste Bedingung schließt jedes Balkonkraftwerk aus,
    // die zweite jede Dachanlage. Wer sein Balkonkraftwerk plante, las eine
    // Mindestgröße, die ihn gar nicht betrifft, und rechnete sich heraus.
    rates: [
      { label: "Dachanlage (auch Fassade)", value: "100 €/kWp, max. 1.000 €", nur: ["pv"] },
      { label: "Stromspeicher", value: "50 €/kWh, max. 500 €", nur: ["pv"] },
      { label: "Balkonkraftwerk", value: "50 % der Kosten, max. 200 €", nur: ["balkon"] },
    ],
    conditions: [
      // Gilt für beide Techniken
      "Der Antrag wird erst NACH Inbetriebnahme gestellt, und zwar binnen vier Wochen",
      "Die Anlage muss im Marktstammdatenregister registriert sein",
      "Haltedauer zehn Jahre, sonst wird der Zuschuss zurückgefordert",
      "Freiwillige Leistung ohne Rechtsanspruch, nur solange Mittel vorhanden sind",
      "Nicht gefördert: Eigenleistung, gebrauchte Teile, Anlagen aus einer gesetzlichen Pflicht (etwa nach dem Gebäudeenergiegesetz)",
      "Antrag und Nachweise nur digital über das Online-Formular der Stadt",
      // Nur Dachanlage
      { text: "Die Anlage muss mindestens 4 kWp leisten — kleinere Dachanlagen werden nicht gefördert", nur: ["pv"] as FundingTechnik[] },
      { text: "Kein Ersatzneukauf und keine Erweiterung einer bestehenden Anlage", nur: ["pv"] as FundingTechnik[] },
      { text: "Je Wohngebäude eine Anlage im Förderzeitraum; Anlage und Speicher zusammen zählen als eine", nur: ["pv"] as FundingTechnik[] },
      { text: "Wohneigentum in Nidda ist Voraussetzung", nur: ["pv"] as FundingTechnik[] },
      // Nur Balkonkraftwerk
      { text: "Höchstens zwei Module je Haushalt, höchstens 800 W Einspeisung", nur: ["balkon"] as FundingTechnik[] },
      { text: "Hauptwohnsitz in Nidda genügt — Mieterinnen und Mieter sind ausdrücklich antragsberechtigt", nur: ["balkon"] as FundingTechnik[] },
    ],
    // Die Richtlinie erlaubt die Kombination ausdrücklich („Der Zuschuss ist mit
    // Angeboten oder anderen Förderungen kombinierbar"), schiebt die Prüfung auf
    // Rückwirkungen aber der antragstellenden Person zu.
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    pvPerKwp: 100, pvCap: 1000, pvMin: 4,
    speicherPerKwh: 50, speicherCap: 500,
    balkonPercentOfCost: 0.5, balkonCap: 200,
  },
  "koeln-pv": {
    id: "koeln-pv", name: "Klimafreundliches Wohnen & Arbeiten",
    traeger: "Stadt Köln", level: "kommune", region: "Köln", bundesland: "Nordrhein-Westfalen", agsCode: "05315",
    url: "https://www.stadt-koeln.de/klimafreundliches-wohnen-und-arbeiten", stand: "August 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Staffel-Pauschalen, max. 60 % der Kosten",
    rates: [
      { label: "PV-Anlage", value: "1.500–2.500 € (nach kWp)" },
      { label: "Batteriespeicher", value: "500–1.300 € (nach kWh)" },
    ],
    conditions: [
      "Solange Mittel reichen (Budget 8 Mio. € 2026)",
      "Speicher ab 3 kWh",
      "Die Dachanlage muss mindestens 2 kWp leisten — die unterste Förderstufe beginnt dort",
      "Nur Bestandsgebäude: die Baufertigstellung liegt bei Antragstellung mindestens fünf Jahre zurück",
    ],
    combinableWith: BUND,
    // Untergrenze am 27.08.2026 auf der Programmseite selbst gelesen
    // (stadt-koeln.de/leben-in-koeln/klima-umwelt-tiere/klima/photovoltaik-klimafreundliches-wohnen):
    // Die Staffel beginnt bei „Von 2 kWp bis 5 kWp 1.500 Euro". Darunter nennt die
    // Stadt keinen Satz. Die Sammelseite, auf die unser Eintrag zeigt, führt die
    // Beträge gar nicht — dort stehen unter DEMSELBEN Namen die 2024 ausgelaufenen
    // Vorgängerprogramme, was einen Abruf beinahe zu „Programm tot" gelesen hätte.
    pvTiers: [
      { upTo: 5, amount: 1500 },
      { upTo: 9, amount: 2000 },
      { upTo: 14, amount: 2300 },
      { upTo: 999, amount: 2500 },
    ],
    speicherTiers: [
      { upTo: 7, amount: 500 },
      { upTo: 11, amount: 1000 },
      { upTo: 999, amount: 1300 },
    ],
    speicherMin: 3,
    pvMin: 2,
  },
  "duesseldorf-klimafreundlich": {
    id: "duesseldorf-klimafreundlich", name: "Klimafreundliches Wohnen und Arbeiten",
    traeger: "Stadt Düsseldorf", level: "kommune", region: "Düsseldorf", bundesland: "Nordrhein-Westfalen", agsCode: "05111",
    url: "https://www.duesseldorf.de/stadtrecht/1/19/19-303", stand: "Juni 2026",
    status: "pausiert", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Sockel + je kWp + je kWh Speicher, max. 50 % der Kosten",
    rates: [
      { label: "PV-Anlage", value: "1.000 € + 200 €/kWp, max. 10.000 €" },
      { label: "Batteriespeicher", value: "250 €/kWh, max. 10.000 €" },
    ],
    conditions: [
      "Aktuell keine neuen Anträge — Programm wird überarbeitet (Stand Juni 2026)",
      "Speicher max. das 1,5-fache der kWp, mit 10-Jahres-Garantie",
      "Förderung max. 50 % der Gesamtkosten",
    ],
    combinableWith: BUND,
    pvSockel: 1000, pvPerKwp: 200, speicherPerKwh: 250, pvCap: 10000, speicherCap: 10000,
  },
  "hannover-proklima": {
    id: "hannover-proklima", name: "proKlima (enercity-Fonds)",
    traeger: "Region Hannover", level: "landkreis", region: "Region Hannover", bundesland: "Niedersachsen", agsCode: "03241",
    url: "https://www.proklima-hannover.de/wohngebaeude/foerderangebote/solarstrom/dachvolltoll/", stand: "August 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp bei voller Dachbelegung (Baustein DachVollToll)",
    rates: [
      { label: "Dach-PV (Vollbelegung)", value: "100 €/kWp, max. 2.000 €" },
      { label: "Bonus Energiemanagement", value: "500 € (mit Speicher + Smart Meter + dynamischem Tarif)" },
    ],
    conditions: [
      "Nur im Fördergebiet (Hannover + Hemmingen, Laatzen, Langenhagen, Ronnenberg, Seelze)",
      "Volle Belegung aller geeigneten Dachflächen, mindestens 2 kWp",
      "Antrag vor Maßnahmenbeginn; mit BEG kombinierbar",
    ],
    combinableWith: BUND,
    // Info-only: proKlima gilt nur in 6 der ~21 Gemeinden der Region Hannover.
    // Der Kreis-AGS 03241 würde per Präfix-Match den ganzen Landkreis treffen
    // (z. B. Burgdorf, das NICHT förderfähig ist) → falscher €-Abzug. Bis eine
    // exakte 8-stellige AGS-Allowlist der Fördergemeinden hinterlegt ist, wird
    // das Programm nur als Hinweis angezeigt und NICHT automatisch abgezogen.
  },

  // ── Kommune – aktuell ausgeschöpft / eingestellt (zur Lagebeurteilung) ───────
  "bonn-solares": {
    id: "bonn-solares", name: "Solares Bonn", traeger: "Bundesstadt Bonn",
    level: "kommune", region: "Bonn", bundesland: "Nordrhein-Westfalen", agsCode: "05314",
    url: "https://www.bonn.de/themen-entdecken/klima/klima-foerderprogramme/foerderprogramm-solares-bonn.php",
    stand: "Juni 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp (Budget 2026 erschöpft)",
    maxFoerderung: "max. 25.000 € je Objekt (Denkmal 27.500 €)",
    rates: [
      { label: "Dach-PV Wohngebäude bis 3 Wohneinheiten (Vollbelegung)", value: "100 €/kWp" },
      { label: "Mehrfamilienhaus ab 4 Wohneinheiten / Fassade", value: "300 €/kWp" },
      { label: "Denkmal / Nicht-Wohngebäude / Freifläche", value: "200 €/kWp" },
    ],
    conditions: [
      "Mittel 2026 ausgeschöpft — Wiedereröffnung üblicherweise zum Jahresbeginn",
      "Der Antrag darf vor oder nach dem Kauf gestellt werden, spätestens drei Monate nach der Schlussrechnung",
      "Bis zum Bewilligungsbescheid geht der Kauf auf eigenes Risiko; die Stadt empfiehlt deshalb, vorher zu beantragen",
      "Nur Bestandsgebäude (fertiggestellt bis 31.12.2021)",
      "Standardsatz nur bei voller Belegung der geeigneten Dachfläche",
      "Der städtische Zuschuss darf 30 % der Gesamtkosten nicht überschreiten",
      "Mit anderen Förderprogrammen kombinierbar, zusammen höchstens 90 % der Gesamtkosten",
    ],
    combinableWith: BUND,
    // ANTRAGSZEITPUNKT KORRIGIERT (01.09.2026, an Seite und Richtlinie gelesen).
    // Hier stand „Antrag vor Beauftragung" — das ist die Empfehlung der Stadt,
    // nicht ihre Bedingung, und als Bedingung gelesen die teuerste Sorte
    // Falschauskunft: Wer schon bestellt hat, hält den Zuschuss für verloren und
    // beantragt ihn nicht mehr. Die Stadt schreibt auf der Programmseite: „Die
    // Antragstellung erfolgt über ein Online-Formular und kann wahlweise vor oder
    // nach der Beauftragung, dem Kauf oder der Installation der Solaranlage
    // erfolgen – jedoch spätestens drei Monate nach Schlussrechnung", und die
    // Förderrichtlinie (Nr. 8, Fassung ab 01.08.2026) wortgleich: „Der Antrag ist
    // spätestens drei Monate nach (Schluss)Rechnung einzureichen. Eine vorherige
    // Beantragung auf Grundlage eines Angebots bzw. Kostenvoranschlags ist möglich
    // und zu empfehlen." Die Empfehlung steht jetzt als das da, was sie ist.
    //
    // DENKMAL AUS DER 300er-ZEILE GELÖST: Die Richtlinie führt in Nr. 4.2 „M5
    // Denkmalgerechte Photovoltaik — 200 €/kWp", zusammen mit Nicht-Wohngebäuden
    // (M6) und Freiflächen (M8); 300 €/kWp gelten M2 (ab 4 Wohneinheiten), M3
    // (geförderter Wohnungsbau) und M4 (Fassade). „Denkmal … bis 300 €/kWp" hat
    // die drei Sätze in eine Zeile geworfen und für das Denkmal den höheren
    // genannt — das „bis" macht es nicht richtig, nur ungenau.
    //
    // Der Höchstbetrag für Denkmäler ist dagegen BESTÄTIGT und bleibt stehen: Er
    // steht nicht auf der Programmseite, sondern in Nr. 4.2 der Richtlinie
    // („beträgt die maximale Förderhöhe 27.500 Euro, soweit nachgewiesen wird,
    // dass … Mehrkosten von mindestens 20 Prozent … entstanden sind"). Beinahe
    // gestrichen, weil die Seite ihn nicht trägt — Wächter-Gate Regel 6: erst die
    // Fundstelle beschaffen, dann streichen.
    //
    // Zwei Bedingungen ergänzt, die beide seit jeher in der Richtlinie stehen und
    // bei uns fehlten: der 30-%-Deckel auf die Gesamtkosten (Nr. 9) und die
    // Kumulierungsgrenze von 90 % (Nr. 6). Kein Rechenwert im Katalog, also kein
    // Geldeffekt — aber zwei Angaben, nach denen jemand seine Rechnung aufstellt.
  },
  "goettingen-klimafonds": {
    id: "goettingen-klimafonds", name: "KlimaFonds Göttingen",
    traeger: "Stadt Göttingen", level: "kommune", region: "Göttingen", bundesland: "Niedersachsen", agsCode: "03159016",
    // PORTAL-STARTSEITE ERSETZT (26.08.2026), gleicher Grund wie bei Karlsruhe:
    // `nachhaltigkeit.goettingen.de` ist die Startseite des Nachhaltigkeits-
    // portals mit Meldungsspalte. Jetzt die Seite, die die Sätze wirklich trägt.
    // Am 26.08.2026 dort gelesen und mit unseren Werten zellgleich: „bis zu
    // 150 € je Kilowatt-Peak (kWp)" für Anlagen ab 5 kWp und „bis zu 100 € je
    // volle Kilowattstunde Speicherkapazität; maximal jedoch 1.200 € je
    // Förderobjekt". Die Seite nennt zusätzlich Steckersolar (bis 150 €, mit
    // Speicher bis 250 €) und einen Deckel von 3.000 € je Objekt in fünf
    // Jahren — beides hier nicht nachgetragen, weil das Modul „Energie
    // erzeugen" ausgeschöpft ist und nichts abzieht.
    // Status bestätigt (Stand der Seite 08.06.2026): „Aufgrund der hohen
    // Nachfrage sind die bereitgestellten Fördermittel im Fördermodul:
    // ‚Energie erzeugen‘ bereits vollständig ausgeschöpft."
    url: "https://nachhaltigkeit.goettingen.de/portal/seiten/foerderung-solaranlagen-900000937-25480.html", stand: "Juni 2026",
    status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp + je kWh (Topf seit Juni 2026 leer)",
    rates: [
      { label: "PV-Anlage (≥ 5 kWp)", value: "150 €/kWp" },
      { label: "Batteriespeicher", value: "100 €/kWh, max. 1.200 €" },
    ],
    conditions: ["Modul 'Energie erzeugen' aktuell ausgeschöpft"],
    combinableWith: BUND,
  },

  // ── Batch Juni 2026 (je 1 Recherche-Agent → offizielle Quelle) ──────────────
  //
  // Der Jahrestopf 2026 ist leer: Die Stadt hat das Programm am 14.07.2026 per
  // Pressemitteilung gestoppt („Die Mittel für das städtische Förderprogramm
  // ‚Klimafreundlich Wohnen‘ sind für dieses Jahr vollständig ausgeschöpft […]
  // Neue Anträge können ab sofort nicht mehr gestellt werden."
  // freiburg.de/pb/2626054.html), die Programmseite nennt zusätzlich Baustein 3
  // ausdrücklich: „Zu den Bausteinen 2 […] und 3 (Stromerzeugung erneuerbar)
  // können keine Anträge mehr gestellt werden." (freiburg.de/pb/232441.html,
  // abgerufen 16.08.2026). Council 3/3 am 16.08.2026, adversarialer Prüfer
  // eingeschlossen. Deshalb kein `pvPerKwp`/`pvCap` mehr — der Rechner darf
  // kein Geld abziehen, das derzeit niemand bekommt.
  //
  // NICHT abgeschafft, nur geschlossen: Die Förderrichtlinie (Fassung 06.2025)
  // gilt unverändert fort, gestoppt ist allein die Mittelbereitstellung
  // („Die Stadt Freiburg fördert Projekte, solange Fördermittel im Haushalt zur
  // Verfügung stehen. Ein Rechtsanspruch auf Bewilligung besteht nicht.",
  // Ziffer 7). Sätze und Bedingungen bleiben deshalb stehen.
  //
  // Die Wiedereröffnung zum 01.01.2027 steht auf der Programmseite, NICHT in der
  // Pressemitteilung — sie ist eine Ankündigung der Stadt, keine Zusage, und
  // wird von keiner Automatik ausgewertet. Wer den Eintrag im Januar wieder
  // scharf schaltet, prüft das vorher an der Trägerseite nach.
  "freiburg-stromerzeugung": {
    id: "freiburg-stromerzeugung", name: "Klimafreundlich Wohnen – Stromerzeugung",
    traeger: "Stadt Freiburg im Breisgau", level: "kommune", region: "Freiburg im Breisgau", bundesland: "Baden-Württemberg", agsCode: "08311",
    url: "https://www.freiburg.de/pb/232441.html", stand: "August 2026",
    status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp für Dach-PV (nur Anteil über der Solarpflicht-Mindestgröße) — Jahrestopf 2026 leer",
    rates: [
      { label: "Dach-PV (Vollbelegung)", value: "150 €/kWp, max. 1.500 €" },
      { label: "Bonus Gründach/Fassade/Denkmal", value: "+150 €/kWp, max. 1.500 €" },
      { label: "Balkonkraftwerk (Mieter)", value: "150 € (mit Freiburg-Pass 300 €)" },
    ],
    conditions: [
      "Mittel für 2026 vollständig ausgeschöpft: seit dem 14.07.2026 keine neuen Anträge — auch nicht für Balkonkraftwerke; nach Angaben der Stadt wieder ab 1. Januar 2027",
      "Bereits eingegangene Anträge werden weiter bearbeitet",
      "Gefördert nur der Anlagenteil über der gesetzlichen Solarpflicht-Mindestgröße",
      "Antrag bis 6 Monate nach Inbetriebnahme; Ausführung durch Fachbetrieb",
      "Batteriespeicher seit Juni 2025 dauerhaft nicht mehr gefördert (Gemeinderatsbeschluss, unabhängig vom Mittelstopp)",
      "Mit BEG kumulierbar, max. 60 % der Kosten",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
  },
  // Der Status stand bis zum 14.08.2026 auf „unsicher", weil zwei städtische
  // Seiten sich zu widersprechen schienen. Sie tun es nicht: Die Übersichtsseite
  // trägt oben einen Kasten „Förderstopp — einige Förderprogramme sind derzeit
  // ausgesetzt", der drei ANDERE Programme meint (Energieeffizienz in
  // Unternehmen/Vereinen, Wassermanagement, Mobilität); direkt darunter steht
  // beim PV-Programm „Antragstellung ab 1. Juli 2026 wieder möglich". Der
  // Widerspruch war ein falsch zugeordneter Seitenkopf — Council 3/3 am
  // 14.08.2026, adversarialer Prüfer eingeschlossen.
  //
  // BEWUSST OHNE automatischen Abzug (kein pvPerKwp): Der Zuschuss hängt am
  // Anlagenteil ÜBER der PV-Pflicht BW, und der Topf ist mit dem
  // Starkregen-Programm geteilt (250.000 € im Nachtragshaushalt 2026, kein
  // Rechtsanspruch). Ein automatisch abgezogener Betrag wäre ein Geldversprechen,
  // das die Richtlinie in dieser Form nicht gibt.
  "heidelberg-rev": {
    id: "heidelberg-rev", name: "Rationelle Energieverwendung – Photovoltaik",
    traeger: "Stadt Heidelberg", level: "kommune", region: "Heidelberg", bundesland: "Baden-Württemberg", agsCode: "08221",
    url: "https://www.heidelberg.de/hd/HD/Leben/foerderbaustein+_photovoltaikanlagen_.html", stand: "August 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp (Dach + Fassade), max. 10.000 € je Objekt; kein Speicher",
    rates: [
      { label: "Dach-PV (bis 100 kWp)", value: "100 €/kWp, max. 10.000 €" },
      { label: "Fassade / aufgeständert auf Gründach oder über Parkplatz (bis 50 kWp)", value: "200 €/kWp, max. 10.000 €" },
      { label: "Mieterstrom / gemeinschaftliche Gebäudeversorgung", value: "50 % der investiven Kosten, max. 2.500 €" },
    ],
    conditions: [
      "Gefördert nur der Anlagenteil über der PV-Pflicht Baden-Württemberg (Pauschalnachweis 0,06 kWp je m² überbauter Grundstücksfläche); Anlagen außerhalb der PV-Pflicht werden vollständig gefördert",
      "kein Batteriespeicher, keine Wallbox und keine steckerfertigen Anlagen gefördert",
      "Antrag vor Kauf/Installation: bis zur Bewilligung darf kein Liefer- oder Leistungsvertrag geschlossen sein",
      "Anlage muss mindestens 15 Jahre in Heidelberg betrieben werden; Zuschüsse unter 150 € werden nicht bewilligt",
      "Mittel begrenzt und mit dem Programm Starkregen- und Hochwasserschutz geteilt (250.000 € im Nachtragshaushalt 2026); kein Rechtsanspruch",
    ],
    combinableWith: BUND,
  },
  "mannheim-solarbonus": {
    id: "mannheim-solarbonus", name: "SolarBonus Mannheim",
    traeger: "Stadt Mannheim / Klimaschutzagentur", level: "kommune", region: "Mannheim", bundesland: "Baden-Württemberg", agsCode: "08222",
    // Am 07.08.2026 aus der Förderrichtlinie selbst abgeschrieben — bis dahin stand hier
    // nur, was die Presse-Mitteilung der Stadt hergab (verified: false). Volltext im Repo:
    // docs/quellen/Mannheim_SolarBonus_Foerderrichtlinie_2026-03-11.pdf (Beschluss des
    // Gemeinderats vom 11.03.2026, ersetzt die Fassung vom 01.04.2025).
    // Die Programmseite selbst ist eine JS-Anwendung ohne Text im Quelltext; die Sätze
    // stehen zusätzlich in ihrer Datenschnittstelle (api.klima-ma.de/api/subsidies,
    // Eintrag "SolarBonus 2026 der Stadt Mannheim"). Achtung: die .html-Variante des
    // Pfades antwortet mit einem Serverfehler — die hier hinterlegte Adresse trägt.
    // WIDERSPRUCH zwischen zwei Trägerquellen bei der Fassade: Die Seitenübersicht nennt
    // max. 3.750 €, die Richtlinie unter 3.4 max. 3.000 €. Wir folgen der Richtlinie —
    // sie ist der Gemeinderatsbeschluss, die Übersicht nur seine Zusammenfassung.
    url: "https://www.klima-ma.de/foerderprogramme", stand: "August 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp — nur Bestandswohngebäude (Bauantrag vor dem 01.05.2022) und nur in Sonderfällen: Mehrfamilienhaus mit Mieterstrom, Gründach, Denkmal, Fassade oder gemeinnütziger Verein. Ein gewöhnliches Ein-/Zweifamilienhaus-Dach wird nicht gefördert",
    rates: [
      { label: "Mehrfamilienhaus ab 3 Wohneinheiten (Vollbelegung oder ab 20 kWp), nur mit Mieterstrom oder gemeinschaftlicher Gebäudeversorgung", value: "120 €/kWp, max. 2.400 €" },
      { label: "PV auf Dachbegrünung", value: "260 €/kWp, max. 4.000 €" },
      { label: "PV auf denkmalgeschütztem Gebäude", value: "300 €/kWp, max. 4.500 €" },
      { label: "Fassaden-PV und Solarzäune (ab 1,5 kWp)", value: "250 €/kWp, max. 3.000 €" },
      { label: "PV auf Gebäuden gemeinnütziger Vereine (Vollbelegung oder ab 30 kWp)", value: "140 €/kWp, max. 4.200 €" },
      { label: "Umsetzung des Mieterstrom-/Betriebskonzepts (MFH, WEG)", value: "50 % der Kosten, max. 3.000 €" },
    ],
    conditions: [
      "Nur für Gebäude, für die der Bauantrag vor dem 01.05.2022 gestellt wurde — Neubauten sind ausgeschlossen (Nr. 1.1 der Richtlinie)",
      "Ein-/Zweifamilienhäuser nur bei begrüntem Dach oder Denkmalschutz förderfähig; ein gewöhnliches Dach bekommt nichts",
      "Beim Mehrfamilienhaus ist ein gleichzeitig umgesetztes Mieterstrommodell oder eine gemeinschaftliche Gebäudeversorgung zwingende Voraussetzung, nicht nur ein Zusatzbaustein",
      "Antragsberechtigt sind private Wohngebäudeeigentümer samt Eigentümergemeinschaften sowie eingetragene gemeinnützige Vereine",
      "Antrag vor der Beauftragung; nach der vorläufigen Zusage bleiben 12 Monate für Installation und Verwendungsnachweis",
      "Nur Anlagen von Fachbetrieben; selbst beschaffte Anlagenteile und über Mietmodelle finanzierte Anlagen sind ausgeschlossen",
      "Einmalig je PV-Anlage und Objekt; nicht mit dem Balkon-SolarBonus der Stadt kombinierbar",
      "Mittel werden erst bei vollständigem Antrag reserviert und nur im Rahmen des Haushalts vergeben",
    ],
    combinableWith: BUND,
  },
  // Geprüft am 16.08.2026 an der Trägerquelle — Befund: Das Programm fördert
  // KEINE Photovoltaik. Hinterlegt waren 300 €/kWp für Gründach-/MFH-/Fassaden-PV
  // bei status "aktiv", also ein Abzug im Rechner. Gegengeprüft an drei Stellen
  // der Stadt Münster, alle drei ohne jede PV-Position:
  //   - Programmseite: nur die Bausteine "Energetische Sanierung" + "Dachbegrünung"
  //   - Baustein Sanierung: Dämmung, Fenster, Heizungstausch, Boni — kein kWp
  //   - Baustein Dachbegrünung: 50 % der Kosten, max. 40 €/m², max. 10.000 €;
  //     Photovoltaik kommt dort nur als Überschrift "Prima Duo: Solaranlage und
  //     Gründach" und als Verweis aufs Solarkataster vor, ohne Förderbetrag
  //   - amtliche Förderrichtlinie (PDF, 18 Seiten, von der Programmseite verlinkt):
  //     die Wörter Photovoltaik, Solar und kWp kommen kein einziges Mal vor
  // Zusätzlich nimmt der Sanierungsbaustein wegen hoher Nachfrage seit dem
  // 30.07.2026 keine Anträge mehr an.
  //
  // Der Eintrag bleibt sichtbar, statt gelöscht zu werden: Wer in Münster nach
  // PV-Förderung sucht, soll lesen, dass das Stadtprogramm dafür nicht gilt —
  // das ist die Antwort auf seine Frage. Ohne strukturierten Satz wird nichts
  // mehr abgezogen.
  "muenster-klimafreundlich": {
    id: "muenster-klimafreundlich", name: "Klimafreundliche Wohngebäude (ohne Photovoltaik)",
    traeger: "Stadt Münster", level: "kommune", region: "Münster", bundesland: "Nordrhein-Westfalen", agsCode: "05515",
    url: "https://www.stadt-muenster.de/klima/foerderprogramm", stand: "August 2026",
    status: "eingestellt", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Keine Photovoltaik-Förderung — das Programm fördert Dämmung, Fenster, Heizungstausch und Dachbegrünung",
    rates: [
      { label: "Photovoltaik", value: "wird nicht gefördert" },
      { label: "Dachbegrünung (mit PV kombinierbar)", value: "50 % der Kosten, max. 40 €/m², max. 10.000 €" },
    ],
    conditions: [
      "Das Förderprogramm der Stadt Münster enthält keine Photovoltaik-Förderung",
      "Eine Dachbegrünung lässt sich mit einer PV-Anlage kombinieren, gefördert wird aber allein die Begrünung",
      "Für die energetische Sanierung nimmt die Stadt seit dem 30. Juli 2026 keine Anträge mehr an",
    ],
    combinableWith: BUND,
  },
  "wiesbaden-eswe-speicher": {
    id: "wiesbaden-eswe-speicher", name: "ESWE Solar-Speicherbatterie",
    traeger: "ESWE Versorgungs AG / Klimaschutzagentur Wiesbaden", level: "kommune", region: "Wiesbaden", bundesland: "Hessen", agsCode: "06414",
    // Am 20.08.2026 an der Trägerseite gelesen: „Bis 3,0 kWh = 500 Euro / bis
    // 6,0 kWh = 750 Euro / > 6,0 kWh = 1.000 Euro" — zellgleich zu unseren
    // Sätzen. Damit steht der Eintrag nicht mehr auf einer Sekundärquelle.
    url: "https://ksa-wiesbaden.de/foerderung/eswe-solar-speicherbatterie/", stand: "August 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss für Batteriespeicher mit neuer PV (nur ESWE-Kunden)",
    rates: [
      { label: "Speicher bis 3 kWh", value: "500 €" },
      { label: "Speicher bis 6 kWh", value: "750 €" },
      { label: "Speicher über 6 kWh", value: "1.000 €" },
    ],
    conditions: [
      "Nur zusammen mit neuer, netzgekoppelter PV-Anlage; Speicher allein nicht förderfähig",
      "Antragsteller muss ESWE-Kunde sein (Strom + Gas/Wärme) — daher nicht pauschal eingerechnet",
      "Antrag vor Maßnahmenbeginn; Speicher mind. 10 Jahre betreiben",
      "Früheres reines PV-Programm der Stadt zum 01.07.2024 eingestellt",
    ],
    combinableWith: BUND,
  },
  "mainz-kipki-speicher": {
    id: "mainz-kipki-speicher", name: "Photovoltaik-Batteriespeicher (KIPKI)",
    traeger: "Mainzer Stiftung für Klimaschutz / Stadt Mainz", level: "kommune", region: "Mainz", bundesland: "Rheinland-Pfalz", agsCode: "07315",
    url: "https://www.mainzer-stiftung.de/foerderprogramme/photovoltaik-batteriespeicher/", stand: "Juni 2026",
    status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWh Speicher (mit neuer PV)",
    rates: [{ label: "Batteriespeicher", value: "150 €/kWh, max. 1.500 €" }],
    conditions: [
      "Mittel ausgeschöpft, keine Neuanträge; für 2026 keine Fortführung geplant",
      "nur mit neuer PV-Anlage ab 3 kWp, Speicher max. 1:1 zur PV-Leistung",
      "Antrag vor Baubeginn",
    ],
    combinableWith: BUND,
  },
  "muenchen-fkg": {
    id: "muenchen-fkg", name: "Förderprogramm Klimaneutrale Gebäude (FKG)",
    traeger: "Landeshauptstadt München", level: "kommune", region: "München", bundesland: "Bayern", agsCode: "09162",
    url: "https://stadt.muenchen.de/service/info/sachgebiet-forderprogramm-klimaneutrale-gebaude/10414150/", stand: "Juni 2026",
    status: "eingestellt", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Dach-PV seit Dez. 2024 nicht mehr förderfähig — nur noch Balkonkraftwerke",
    rates: [{ label: "Balkonkraftwerk", value: "0,40 €/Wp bis 800 Wp je Wohneinheit, höchstens 50 % der Kosten (mit München-Pass 95 % der förderfähigen Kosten)" }],
    conditions: [
      "Für Dach-Photovoltaik seit dem 18.12.2024 keine neuen Anträge mehr möglich",
      "nur noch Stecker-Solargeräte (Balkonkraftwerke) werden gefördert",
      "Der Antrag ist vor Bestellung oder Kauf zu stellen; eine Rechnung vor der Antragstellung führt zur Ablehnung",
    ],
    // Am 29.08.2026 an der Amtsseite des Balkon-Bausteins nachgelesen
    // (stadt.muenchen.de/service/info/sachgebiet-forderprogramm-klimaneutrale-
    // gebaude/10414151/), Wortlaut: „Der Fördersatz beträgt 0,40 Euro je Wp, bis
    // 800 Wp je Wohneinheit, jedoch maximal 50 Prozent der Kosten. Für
    // München-Pass Inhaber*innen beträgt der Fördersatz 95 % der förderfähigen
    // Investitionskosten."
    //
    // Zwei eigene Angaben waren falsch, beide ohne Wirkung aufs Geld (der
    // Eintrag steht auf `eingestellt`, es wird nichts abgezogen), beide trotzdem
    // eine falsche Auskunft:
    //  * Der 50-%-Deckel auf die Kosten fehlte ganz. Bei einem 800-W-Set für
    //    400 € sind es 200 €, nicht 320 €.
    //  * „mit München-Pass 0,50 €/Wp, max. 400 €" steht so nirgends — der
    //    München-Pass-Satz ist ein PROZENTSATZ auf die Kosten (95 %), keine
    //    Zahl je Wp. Woher die 0,50/400 stammen, ist nicht mehr feststellbar;
    //    sie sind ersatzlos raus, statt sie umzurechnen.
    combinableWith: BUND,
    foerdert: ["balkon"],
  },
  "bremen-rundumshaus": {
    id: "bremen-rundumshaus", name: "Rund ums Haus – PV nach Plan",
    traeger: "BAB Bremer Aufbau-Bank (Land Bremen)", level: "land", region: "Bremen", bundesland: "Bremen", agsCode: "04",
    url: "https://www.bab-bremen.de/de/page/programm/rund-ums-haus", stand: "Juni 2026",
    status: "aktiv", capped: false, verified: true,
    eligibility: ["privat"],
    coveredCosts: "zinsgünstiges Darlehen bis 100 % der Kosten (kein Zuschuss)",
    rates: [{ label: "Finanzierung", value: "Darlehen bis 50.000 €, kein Zuschuss" }],
    conditions: [
      "Antrag vor Maßnahmenbeginn — keine Aufträge vor der Förderzusage",
      "Annuitätendarlehen, Laufzeit bis 10 Jahre, für Wohngebäude im Land Bremen (inkl. Bremerhaven)",
      "kommunaler swb-Zuschuss ggf. zusätzlich (separat beim Versorger)",
    ],
    combinableWith: BUND,
  },

  // ── Batch Juni 2026, Teil 2 ────────────────────────────────────────────────
  "potsdam-klimaschutz": {
    id: "potsdam-klimaschutz", name: "Klimaschutzförderprogramm Potsdam",
    traeger: "Landeshauptstadt Potsdam", level: "kommune", region: "Potsdam", bundesland: "Brandenburg", agsCode: "12054",
    url: "https://www.potsdam.de/de/beantragung-einer-zuwendung-aus-dem-klimaschutzfoerderprogramm-der-landeshauptstadt-potsdam",
    // Am 05.08.2026 gegen die „Potsdamer Klimaschutzförderrichtlinie" vom 26.03.2026
    // geprüft (Schlussfassung als PDF auf potsdam.de, Volltext in docs/quellen/).
    // Die abgezogenen Werte (200 €/kWp, Deckel 1.200 €, 1.000 € Speicher ab 5 kWh)
    // stehen dort zellgleich. Korrigiert wurden drei Anzeigedetails: die
    // Steckersolar-Grenze (die Richtlinie kennt 0,8 kW Wechselrichter und 2,0 kW
    // Modulleistung, nicht 0,6 kWp), das unbelegte „ab 6 kWp" und die fehlende
    // neue Pauschale für Speicher an Steckersolar-Geräten.
    //
    // ANTRAGSFRIST NACHGETRAGEN (25.08.2026). Alle vier Beträge am selben PDF
    // erneut geprüft und zellgleich bestätigt; die Amtsseite trug aber einen
    // Hinweiskasten, den der Eintrag nicht kannte: „Fördermittelanträge können
    // noch bis zum 31.10.2026 per E-Mail […] gestellt werden" — und die
    // Bearbeitung ruht bis zum 16.09.2026. Ein befristetes Programm ohne Frist
    // im Text ist kein kleiner Anzeigefehler: Wer die Seite im November liest,
    // sieht einen Betrag und keinen Grund, sich zu beeilen. Der Abzug bleibt
    // unverändert — die Frist läuft erst.
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp für Dach-/Fassaden-PV + Pauschale für Batteriespeicher",
    rates: [
      { label: "PV (Dach oder Fassade)", value: "200 €/kWp, max. 1.200 € je Objekt" },
      { label: "Batteriespeicher (ab 5 kWh nutzbar)", value: "1.000 € pauschal je Objekt" },
      { label: "Balkonkraftwerk (Wechselrichter bis 0,8 kW, Module bis 2,0 kW)", value: "250 € pauschal" },
      { label: "Speicher für Balkonkraftwerk (ab 3 kWh)", value: "500 € pauschal" },
    ],
    conditions: [
      "Anträge sind nur noch bis zum 31. Oktober 2026 möglich; die Bearbeitung ruht bis zum 16. September 2026 und läuft danach in der Reihenfolge des E-Mail-Eingangs",
      "Energieberatung eines zertifizierten Energieberaters vor Antragstellung und Umsetzung erforderlich",
      "Antrag vor Maßnahmenbeginn; bei Luftwärmepumpe oder Batteriespeicher zusätzlich ein zertifizierter Ökostrom-Tarif",
      "nur für Privatpersonen mit Erstwohnsitz in Potsdam — Eigentum allein genügt nicht",
      "Nicht förderfähig an Passivhäusern Plus/Premium und KfW-Effizienzhäusern 40plus",
      "Je Haushalt und Jahr wird dieselbe Maßnahme nur einmal gefördert",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon", "waermepumpe"],
    pvPerKwp: 200, pvCap: 1200,
    speicherTiers: [{ upTo: 999, amount: 1000 }], speicherMin: 5,
    // WÄRMEPUMPE NACHGETRAGEN (25.08.2026). Die Richtlinie fördert sie seit
    // jeher — der Eintrag kannte sie nicht, also zeigte der Wärmepumpen-Rechner
    // Potsdamern 0 €. Wörtlich in der Richtlinie vom 26.03.2026 (Volltext in
    // docs/quellen/): „Luftwärme- bzw. Erdwärmepumpen oder sog.
    // Luft-Wasser-Wärmepumpen (Split-Wärmepumpen) — 2.000 € pauschal je Objekt".
    //
    // Die übrigen Bedingungen (Energieberatung vorab, Erstwohnsitz, Antrag vor
    // Maßnahmenbeginn, Jahresfrist) kann das Modell nicht rechnen; sie stehen
    // deshalb als Hinweis in `conditions` und niemand bekommt sie abgezogen.
    // Das ist die übliche Trennung: Was rechenbar ist, wird gerechnet; was
    // nicht, wird gesagt.
    wpPauschale: 2000,
  },
  "dortmund-pv": {
    id: "dortmund-pv", name: "Förderung von Photovoltaik auf Ein- und Zweifamilienhäusern",
    traeger: "Stadt Dortmund", level: "kommune", region: "Dortmund", bundesland: "Nordrhein-Westfalen", agsCode: "05913",
    url: "https://www.dortmund.de/services/foerderung-von-photovoltaikanlagen-auf-ein-und-zweifamilienhaeusern.html",
    stand: "Juni 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale je Anlage (selbstgenutztes Ein-/Zweifamilienhaus, ab 5 kWp)",
    rates: [{ label: "PV-Anlage (ab 5 kWp)", value: "1.000 € pauschal" }],
    conditions: [
      "Förderung zum 05.06.2026 wegen hoher Nachfrage gestoppt — derzeit keine Neuanträge",
      "Haushaltseinkommen max. 75.000 € (ledig) bzw. 150.000 € (zusammen veranlagt)",
      "Antrag vor Auftragsvergabe; kein Speicher gefördert",
    ],
    combinableWith: BUND,
  },
  "essen-solar": {
    id: "essen-solar", name: "Förderprogramm Photovoltaik- und Solaranlagen",
    traeger: "Stadt Essen", level: "kommune", region: "Essen", bundesland: "Nordrhein-Westfalen", agsCode: "05113",
    url: "https://www.essen.de/leben/umwelt/klima/klimaschutz/solarfoederung.de.html",
    stand: "Juli 2026", status: "eingestellt", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Sockel + Zuschuss je kWp (Dach-PV); Programm derzeit ausgesetzt",
    rates: [
      { label: "Dach-PV", value: "500 € + 100 €/kWp, max. 4.000 €" },
      { label: "Gründach / Fassade", value: "+100 €/kWp" },
    ],
    conditions: [
      "Antragsannahme wegen der Haushaltslage ausgesetzt — Neuauflage nicht terminiert",
      "bereits bewilligte Anträge bleiben gültig",
      "Antrag galt vor Maßnahmenbeginn",
    ],
    combinableWith: BUND,
    pvSockel: 500, pvPerKwp: 100, pvCap: 4000,
  },

  // ── Batch Juni 2026, Teil 3 (Katalog-Vervollständigung kreisfreie Städte) ────
  "schweinfurt-pv": {
    id: "schweinfurt-pv", name: "Förderprogramm Photovoltaik & Batteriespeicher",
    traeger: "Stadt Schweinfurt", level: "kommune", region: "Schweinfurt", bundesland: "Bayern", agsCode: "09662",
    // TOTE ADRESSE ERSETZT (28.08.2026). Die alte Förderseite antwortet mit 404
    // — das war im Eintrag als Befund vermerkt, stand aber weiter als `url` und
    // damit als Ziel des Links auf der Karte: Wer nachlesen wollte, landete im
    // Nichts. Jetzt die Klimaschutzseite der Stadt, die heute wirklich
    // antwortet; sie führt Solarkataster und Klimaschutzkonzept und nennt kein
    // eigenes Förderprogramm mehr — deckungsgleich mit `eingestellt`.
    // Auch das Online-Antragsformular, das in Suchtreffern noch als
    // „Förderantrag Photovoltaik und Batteriespeicher" auftaucht, antwortet mit
    // 404: ein Verzeichniseintrag, der das Programm überlebt hat, kein Beleg
    // dafür, dass es wieder läuft.
    url: "https://www.schweinfurt.de/umweltverkehr/umwelt--natur/klimaschutz",
    stand: "August 2026", status: "eingestellt", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp + je kWh Speicher (neu angeschaffte Anlage)",
    rates: [
      { label: "PV-Anlage", value: "100 €/kWp, max. 1.000 €" },
      { label: "Batteriespeicher (ab 3 kWh)", value: "300 € + 100 €/kWh, max. 1.000 €" },
    ],
    conditions: [
      "Neu angeschaffte Anlage; Kauf/Auftrag nach dem 03.05.2022",
      "Speicher nur aus eigener PV gespeist; zweistufiger Antrag",
      "Die eigene Förderseite der Stadt ist abgeschaltet; die Klimaschutzseite nennt kein kommunales Förderprogramm mehr — gilt als eingestellt",
    ],
    combinableWith: BUND,
    pvPerKwp: 100, pvCap: 1000,
    speicherPerKwh: 100, speicherMin: 3, speicherCap: 1000,
  },
  "osnabrueck-saniert": {
    id: "osnabrueck-saniert", name: "Osnabrück saniert – Photovoltaik",
    traeger: "Stadt Osnabrück", level: "kommune", region: "Osnabrück", bundesland: "Niedersachsen", agsCode: "03404",
    url: "https://bauen.osnabrueck.de/de/sanieren-modernisieren/osnabrueck-saniert/",
    stand: "Juni 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss für den Anlagenteil über 8 kWp, gedeckelt bei 30 % der Netto-Kosten",
    maxFoerderung: "max. 20.000 € je Sanierungsobjekt",
    rates: [
      { label: "PV-Anlage", value: "400 €/kWp für Leistung über 8 kWp — höchstens 30 % der förderfähigen Netto-Kosten" },
    ],
    conditions: [
      "Antrag vor Auftragsvergabe; Windhundverfahren, kein Rechtsanspruch",
      "Gefördert wird nur der kWp-Anteil oberhalb von 8 kWp",
      // Am 29.08.2026 am Richtlinien-Volltext (Stand Juni 2025) nachgelesen: Die
      // beiden Zahlen sind KEINE Wahlmöglichkeit. Die Richtlinie schreibt über
      // die Tabelle „Die Zuschusshöhe wird nach zwei Kriterien berechnet. Der
      // kleinere Wert gibt den Ausschlag." Unser „oder" las sich wie ein
      // Wahlrecht — und wer eine Wahl liest, nimmt den größeren Betrag an.
      "Von beiden Werten gilt der kleinere",
      // Ergänzt 16.08.2026 aus der Förderrichtlinie (Stand Mai 2025, Abschnitt B):
      // In Niedersachsen gilt eine PV-Pflicht nach § 32a NBauO. Wer sie erfüllt,
      // bekommt für diesen Teil nichts — ohne den Hinweis rechnet sich jemand
      // eine Förderung aus, die genau an seinem Fall vorbeigeht.
      "Nur Neuanlagen; gesetzlich vorgeschriebene Anlagen (GEG, PV-Pflicht nach NBauO, Bebauungsplan) sind nicht förderfähig",
      "Bei einem ab 01.01.2025 sanierten Dach nur der Leistungsanteil über der vorgeschriebenen 50-%-Dachbelegung",
      "Eine bereits vorhandene PV-Anlage wird auf die 8 kWp angerechnet",
      "Auftrag binnen 12 Wochen nach Bewilligung, Fertigstellung binnen 18 Monaten",
    ],
    combinableWith: BUND,
  },
  "memmingen-ee": {
    id: "memmingen-ee", name: "Förderprogramm Erneuerbare Energien",
    traeger: "Stadt Memmingen", level: "kommune", region: "Memmingen", bundesland: "Bayern", agsCode: "09764",
    // Die Förderseite der Stadt trägt am 03.08.2026 wörtlich: „Fördertopf für 2026
    // für das Förderprogramm Klimaschutz ist ausgeschöpft. Bitte stellen Sie keine
    // Anträge mehr." Der Jahrestopf umfasste 12.000 € für alle Maßnahmen zusammen
    // (Richtlinie Klimaschutz 2026, in Kraft seit 10.06.2026, Anträge ab 15.06.2026).
    url: "https://www.memmingen.de/hier-leben/umwelt-klimaschutz/foerderung.html",
    stand: "August 2026",
    status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss für Batteriespeicher, Balkonkraftwerk und Wallbox — nicht die Dach-PV selbst (Topf 2026 leer)",
    rates: [
      { label: "Batteriespeicher", value: "20 %, max. 750 €" },
      { label: "Balkonkraftwerk", value: "50 %, max. 100 €" },
    ],
    conditions: [
      "Der Fördertopf 2026 ist ausgeschöpft; die Stadt bittet ausdrücklich darum, keine Anträge mehr zu stellen",
      "Reine Dach-PV wird nicht bezuschusst — nur Speicher, Balkonkraftwerk, Wallbox",
      "Installation durch Fachbetrieb; Antrag online (Windhundverfahren)",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
  },
  "baden-baden-pvplus": {
    id: "baden-baden-pvplus", name: "PV plus",
    traeger: "Stadtwerke Baden-Baden", level: "kommune", region: "Baden-Baden", bundesland: "Baden-Württemberg", agsCode: "08211",
    url: "https://www.stadtwerke-baden-baden.de/de/bauherren-planer/foerderprogramme/photovoltaikanlage.php",
    stand: "Juni 2026", status: "aktiv", capped: false, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschalbonus für Stromkunden der Stadtwerke (Kauf/Pacht über die Stadtwerke)",
    rates: [{ label: "PV-Anlage", value: "1.000 € (über 4 Jahre als Stromgutschrift)" }],
    conditions: [
      "Nur Strom-Bestandskunden der Stadtwerke Baden-Baden",
      "PV-Anlage bei den Stadtwerken kaufen oder pachten",
      "Nicht für frei beauftragte Anlagen — daher nicht pauschal eingerechnet",
    ],
    combinableWith: BUND,
  },
  "schwerin-pv": {
    id: "schwerin-pv", name: "Förderprogramm Photovoltaik-Anlagen",
    traeger: "Stadtwerke Schwerin", level: "kommune", region: "Schwerin", bundesland: "Mecklenburg-Vorpommern", agsCode: "13004",
    url: "https://www.stadtwerke-schwerin.de/service/foerderprogramme",
    stand: "Juni 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale für PV + Speicher (nur Stromkunden der Stadtwerke)",
    maxFoerderung: "max. 600 € je Anlage",
    rates: [
      { label: "PV-Anlage (bis 20 kWp)", value: "500 € pauschal" },
      { label: "Batteriespeicher (mit PV)", value: "+100 € pauschal" },
    ],
    conditions: [
      "Nur Stromkunden der Stadtwerke Schwerin, Eigentümer der Immobilie",
      "Kontingent: max. 10 Anlagen pro Jahr — kann unterjährig erschöpft sein",
      // Die Frist stand bis 27.08.2026 nicht im Eintrag, obwohl die Stadtwerke sie
      // wörtlich nennen. Dieselbe Klasse wie Potsdam am 25.08.: ein Programm, das
      // an einem Datum endet, ohne das Datum gezeigt.
      "Antragsfrist 31.12.2026; ist das Kontingent vorher erreicht, endet das Programm früher",
      "Kundenbindung — daher nicht pauschal eingerechnet",
    ],
    combinableWith: BUND,
  },
  // ── Aus dem Abdeckungs-Screening, 18.08.2026 ──────────────────────────────
  //
  // Gefunden über das systematische Screening aller Gemeinden mit erfasster
  // Förderseite (scripts/funding-screen.ts), jedes an der Amtsseite selbst
  // gelesen. Es sind kleine Gemeinden — genau die Schicht, die der frühere
  // Blick auf die größten Städte nie erreicht hat, und in der es die Programme
  // im Gegensatz zu den Großstädten noch gibt.
  "hoehr-grenzhausen-energie": {
    id: "hoehr-grenzhausen-energie", name: "Förderung privater Energiegewinnung",
    traeger: "Stadt Höhr-Grenzhausen", level: "kommune", region: "Höhr-Grenzhausen",
    bundesland: "Rheinland-Pfalz", agsCode: "07143032",
    url: "https://www.hoehr-grenzhausen.de/themen-die-uns-bewegen/foerderung-privater-energiegewinnung/foerderrichtlinie-der-stadt-hoehr-grenzhausen/",
    // Am 18.08.2026 nachgelesen und STATUS KORRIGIERT: „Für das Haushaltsjahr
    // 2026 sind alle Fördermittel ausgeschöpft. Es können keine weiteren Anträge
    // bewilligt werden." Der Eintrag stand auf `aktiv`. Die Sätze selbst stimmen
    // und bleiben stehen; sobald der Haushalt 2027 greift, ist nur der Status
    // zurückzudrehen.
    //
    // WAS DAS GEKOSTET HAT — und was nicht, weil die Frage naheliegt: Gerechnet
    // wurde hier NIE. Das Programm hatte kein `last_verified`, und ohne eine
    // inhaltliche Prüfung an der Amtsquelle lässt `fundingBelegAktuell` kein
    // Programm mitrechnen (nachgemessen: 0 €). Falsch war die AUSKUNFT: Auf der
    // Stadtseite stand „nimmt aktuell Anträge an" für ein Programm, das keine
    // mehr annimmt.
    //
    // Und deshalb hat auch kein Wächter angeschlagen: Der Seiten-Wächter meldet
    // eine ÄNDERUNG gegenüber dem zuletzt geprüften Stand — gab es nie einen,
    // gibt es nichts zu vergleichen. `page_changed_at` ist leer, der erste
    // Fingerabdruck stammt von heute. Ein Eintrag ohne Prüfdatum ist damit
    // gegen falsche Zahlen geschützt, gegen falsche Sätze aber nicht.
    stand: "August 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp und je kWh Speicher, gedeckelt",
    maxFoerderung: "max. 1.500 € PV + 1.000 € Speicher je Grundstück",
    rates: [
      { label: "PV-Anlage", value: "150 € pro kWp, max. 1.500 €" },
      { label: "Batteriespeicher", value: "100 € pro kWh, max. 1.000 €" },
    ],
    conditions: [
      "Nur auf Wohngebäuden und deren Nebengebäuden; bestehende Anlagen werden nicht gefördert",
      "Antrag vor Auftragserteilung an eine Fachfirma; Ausführung durch qualifizierte Fachbetriebe",
      "Je Grundstück einmalig bis zum Erreichen des Höchstbetrags",
      "Freiwillige Leistung ohne Rechtsanspruch, im Rahmen der Haushaltsmittel",
      "Für das laufende Haushaltsjahr sind die Mittel ausgeschöpft; neue Anträge werden nicht mehr bewilligt",
      "Die Richtlinie gilt nur für die Stadt Höhr-Grenzhausen, nicht für die übrige Verbandsgemeinde",
    ],
    combinableWith: BUND,
    pvPerKwp: 150, pvCap: 1500, speicherPerKwh: 100, speicherCap: 1000,
  },
  "wietzen-pv": {
    id: "wietzen-pv", name: "Förderung von Photovoltaik und Batteriespeichern",
    traeger: "Gemeinde Wietzen", level: "kommune", region: "Wietzen",
    bundesland: "Niedersachsen", agsCode: "03256036",
    // Die Seite gehört der Samtgemeinde Weser-Aue und wird von mehreren
    // Mitgliedsgemeinden geteilt — das Programm ist aber ausdrücklich das der
    // Gemeinde Wietzen. Das Screening hatte die Seite deshalb zunächst allen
    // Nachbarorten zugeordnet; gefördert wird nur in Wietzen.
    //
    // AUSGESCHÖPFT seit dem 20.08.2026 — an der Amtsseite selbst gelesen, erster
    // Satz der Seite: „Leider stehen aktuell keine weiteren Fördermittel für 2026
    // mehr zur Verfügung!" Der Eintrag stand auf `aktiv` und zog damit bis zu
    // 2.000 € ab (1.000 € PV + 1.000 € Speicher), die es dieses Jahr nicht mehr
    // gibt. Die Sätze selbst stehen unverändert daneben und bleiben deshalb
    // stehen; der Topf ist auf 20.000 € im Jahr begrenzt, das nächste Haushalts-
    // jahr füllt ihn wieder. Wieder einschalten darf das nur ein Träger-Beleg.
    url: "https://www.weser-aue.de/rathaus-politik/foerderprogramme/",
    stand: "August 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteiliger Zuschuss je kWp und je kWh Speicher",
    maxFoerderung: "max. 1.000 € je Förderfall",
    rates: [
      { label: "PV-Anlage", value: "100 € je angefangenem kWp, max. 1.000 €" },
      { label: "Batteriespeicher", value: "200 € je angefangener kWh, max. 1.000 €" },
    ],
    conditions: [
      "Nur für Privathaushalte in der Gemeinde Wietzen",
      "Vergabe nach Eingang der Anträge (Windhundprinzip)",
      "Haushaltsmittel auf 20.000 € pro Jahr begrenzt",
      "Vorerst befristet bis zum 31.12.2026, vorbehaltlich der Haushaltslage",
      "Contracting, Leasing und Pacht sind ausdrücklich nicht förderfähig",
    ],
    combinableWith: BUND,
    pvPerKwp: 100, pvCap: 1000, speicherPerKwh: 200, speicherCap: 1000,
  },
  "gaimersheim-energie": {
    id: "gaimersheim-energie", name: "Förderprogramm Energie",
    traeger: "Markt Gaimersheim", level: "kommune", region: "Gaimersheim",
    bundesland: "Bayern", agsCode: "09176126",
    url: "https://gaimersheim.de/forderprogramme/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "20 % der Anschaffungskosten, je Position gedeckelt",
    maxFoerderung: "max. 300 € PV + 500 € Speicher",
    rates: [
      { label: "PV-Anlage (bis 30 kWp)", value: "20 % der Anschaffungskosten, max. 300 €" },
      { label: "Batteriespeicher", value: "20 % der Anschaffungskosten, max. 500 €" },
    ],
    conditions: [
      "Gilt für Anlagen ab dem 01.01.2026",
      "Je Grundstück (Flurnummer) nur einmal",
      "Der Förderbetrag wird unabhängig von der Zahl der Maßnahmen höchstens einmal je Wohngebäude ausgezahlt — ob sich PV- und Speicherzuschuss addieren lassen, sagt die Seite nicht",
      "Nachweis der Rechnung sowie der Anmeldung im Marktstammdatenregister und beim Netzbetreiber",
      "Montage durch eine Fachfirma ist nicht erforderlich",
    ],
    combinableWith: BUND,
    // Seit dem Deckel für percentOfCost (18.08.2026) abbildbar. Der Deckel gilt
    // dem PV-Teil; die 500 € für den Speicher bleiben außen vor, weil das Modell
    // nur EINEN Prozentsatz je Programm kennt — die Rechnung ist damit
    // vorsichtig, nicht großzügig.
    percentOfCost: 0.2, pvCap: 300,
  },
  "dietmannsried-pv": {
    id: "dietmannsried-pv", name: "Förderprogramm PV-Anlagen",
    traeger: "Markt Dietmannsried", level: "kommune", region: "Dietmannsried",
    bundesland: "Bayern", agsCode: "09780119",
    url: "https://www.dietmannsried.de/rathaus/aktuelles-bekanntmachungen/foerderprogramm-pv-anlagen.html",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Sockelbetrag für die ersten 7 kWp, danach je kWp",
    maxFoerderung: "max. 1.700 € je Gebäude",
    rates: [
      { label: "PV-Dachanlage", value: "500 € für die ersten 7 kWp, danach 150 € je weiterem kWp" },
      { label: "Balkonkraftwerk", value: "200 € pauschal, auch für Mieter" },
    ],
    conditions: [
      "Nur für selbstgenutztes Eigentum; Balkonkraftwerke auch für Mieter",
      "Die Anlage darf bei Antragstellung weder beauftragt noch erworben oder installiert sein",
      "Fördertopf von 50.000 €",
      "Mit anderen Förderungen kombinierbar",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    // 500 € Sockel deckt die ersten 7 kWp ab, darüber 150 €/kWp — im Modell als
    // Sockel plus Satz, der erst oberhalb greift, ist das nicht abbildbar. Der
    // strukturierte Satz für die DACHANLAGE bleibt deshalb weg: lieber keine
    // Zahl als eine falsche.
    //
    // Der Balkon-Teil dagegen ist eine glatte Pauschale und seit 18.08.2026
    // strukturiert hinterlegt. An der Amtsseite gelesen: „einen pauschalen
    // Zuschuss von 200,00 € pro Anlage", Mieter ausdrücklich eingeschlossen,
    // Antrag zwingend vor Beauftragung. Vorher stand die Zahl nur als
    // Anzeigetext da — der Balkon-Rechner konnte damit nichts anfangen.
    balkonPauschale: 200,
  },
  // ── Ausgelaufene Programme: aufgenommen, weil das eine Auskunft ist ────────
  //
  // Entscheidung des Betreibers (17.08.2026): Auch beendete oder ausgesetzte
  // Programme gehören in den Katalog. Wer in Waiblingen nach Förderung sucht,
  // erfährt so „gab es, ist geschlossen" statt gar nichts — und der Seiten-
  // Wächter bemerkt es, wenn die Stadt neu auflegt. Sie tragen bewusst KEINEN
  // strukturierten Satz: Es gibt nichts abzuziehen.
  "ludwigshafen-kipki": {
    id: "ludwigshafen-kipki", name: "Förderprogramme für Bürger (KIPKI)",
    traeger: "Stadt Ludwigshafen am Rhein", level: "kommune", region: "Ludwigshafen am Rhein",
    bundesland: "Rheinland-Pfalz", agsCode: "07314",
    url: "https://ludwigshafen.de/standort-mit-zukunft/klima/foerderprogramme",
    stand: "August 2026", status: "eingestellt", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Die Stadt hat die Förderprogramme für Bürgerinnen und Bürger beendet, weil die Mittel Mitte März 2026 ausgeschöpft waren — gefördert wurden Balkonkraftwerke sowie Dach- und Fassadenbegrünung",
    rates: [{ label: "Balkonkraftwerke", value: "zuletzt 200 € je Anlage — Programm beendet" }],
    conditions: [
      "Die Stadt führt das Programm unter der Überschrift „Förderprogramme für Bürger*innen beendet“",
      "Grund ist, dass die Fördermittel Mitte März 2026 ausgeschöpft waren; neue Anträge sind nicht möglich",
      "Gefördert wurden aus Landesmitteln (KIPKI) 750 private Balkonkraftwerke mit je 200 €",
      "Bereits gestellte Anträge werden noch bearbeitet und beschieden",
      "Eine Dach-Photovoltaikanlage wurde auch davor nicht bezuschusst",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // SELBSTKONTROLLE 30.08.2026 — der Auto-Fix vom 30.08.2026 ist hier
    // teilweise zurückgenommen. Er stellte den Status von `eingestellt` auf
    // `ausgeschoepft` um, und zwar mit der Begründung, die Stadt sage nirgends,
    // dass das Programm beendet sei. Das ist falsch: Die Seite trägt als
    // Überschrift wörtlich „Förderprogramme für Bürger*innen beendet" (Titel und
    // H1, am 30.08.2026 im Rohtext gelesen, nicht über ein Zusammenfassungs-
    // werkzeug). Der frühere Lauf hatte offenbar nur den Abschnitt „Fördermittel
    // ausgeschöpft" gelesen und daraus geschlossen, die Überschrift gebe es
    // nicht — genau der Fehlgriff, gegen den die Selbstkontrolle im Gate steht:
    // eine richtige Angabe wurde durch eine andere ersetzt, weil die Quelle nur
    // halb gelesen war.
    //
    // Beide Wörter stehen auf der Seite, und sie widersprechen einander nicht:
    // Die Stadt beendet die Programme, WEIL das Geld alle ist. Der Status folgt
    // deshalb wieder der Überschrift der Stadt (`eingestellt`), der Grund steht
    // als eigene Bedingung daneben. Das ist die einzige Fassung, der nichts auf
    // der Seite widerspricht — und die vorsichtige Richtung für jemanden, der
    // überlegt, ob er auf eine neue Runde warten soll: Die ganze Seite steht im
    // Rückblick („Was wurde gefördert?"), eine Ankündigung einer Neuauflage gibt
    // es nicht.
    //
    // Kein Geldeffekt in keiner Richtung: `fundingZaehlt` verlangt
    // `status === "aktiv"`, beide Zustände ziehen also nichts ab. Was der Lauf
    // vom 30.08. an FAKTEN ergänzt hat, bleibt: 750 Anlagen à 200 € aus
    // Landesmitteln (KIPKI), ausgeschöpft Mitte März 2026 — alles am
    // 30.08.2026 an der Amtsseite noch einmal wörtlich bestätigt, dazu neu
    // „Bereits gestellte Anträge werden bearbeitet und entsprechende Bescheide
    // verschickt". Der zuletzt gezahlte Satz bleibt bewusst ohne strukturierten
    // Rechenwert.
  },
  "waiblingen-klimaschutz": {
    id: "waiblingen-klimaschutz", name: "Städtisches Förderprogramm Klimaschutz",
    traeger: "Stadt Waiblingen", level: "kommune", region: "Waiblingen",
    bundesland: "Baden-Württemberg", agsCode: "08119079",
    url: "https://www.waiblingen.de/de/Die-Stadt/Unsere-Stadt/Nachhaltigkeit-Umwelt/Energie-Klimaschutz/Foerderprogramm-Klimaschutz",
    stand: "August 2026", status: "pausiert", capped: true, verified: true,
    eligibility: ["gewerblich"],
    coveredCosts: "Geschlossen — der Photovoltaik-Teil war eine Beratung für Unternehmen, kein Zuschuss zur Anlage",
    rates: [{ label: "Photovoltaik-Beratung für Unternehmen", value: "Anträge seit 24.06.2026 nicht mehr möglich" }],
    conditions: [
      "Der Gemeinderat hat das Förderprogramm Klimaschutz zum 24. Juni 2026 geschlossen",
      "Über eine Fortführung wird im Haushaltsplanverfahren beraten",
      "Der Photovoltaik-Baustein förderte eine Beratung für Unternehmen (Firmensitz in Waiblingen, Dachfläche ab 200 m²), nicht die Anlage selbst",
    ],
    combinableWith: BUND,
  },
  "herne-klimafoerderung": {
    id: "herne-klimafoerderung", name: "Förderprogramme Klimaschutz",
    traeger: "Stadt Herne", level: "kommune", region: "Herne",
    bundesland: "Nordrhein-Westfalen", agsCode: "05916",
    url: "https://www.herne.de/Stadt-und-Leben/Klima/Foerderprogramme/",
    stand: "August 2026", status: "pausiert", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Wechselt jährlich — für 2026 sind Balkonkraftwerke und Speicher angekündigt, aber noch nicht beschlossen",
    rates: [{ label: "Balkonkraftwerk und Speicher", value: "für 2026 geplant, Konditionen offen" }],
    conditions: [
      "Die Stadt wechselt die Förderungen jedes Jahr je nach verfügbaren Mitteln und Nachfrage",
      "Photovoltaik und Speicher wurden in früheren Jahren gefördert, diese Programme sind ausgelaufen",
      "Für 2026 sind Stecker-PV-Geräte und Speicher angekündigt — Beträge und Antragsfenster standen bei der Prüfung noch nicht fest",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
  },
  "wolfsburg-pv": {
    id: "wolfsburg-pv", name: "Förderung der Solarstromerzeugung",
    traeger: "Stadt Wolfsburg", level: "kommune", region: "Wolfsburg", bundesland: "Niedersachsen", agsCode: "03103",
    // Adresse ersetzt am 17.08.2026: Die frühere Newsroom-Meldung
    // (/newsroom/2026/04/photovoltaik-foerderprogramm) antwortet mit 404 — der
    // Seiten-Wächter hat sie als tot gemeldet. Eine Pressemeldung ist ohnehin die
    // falsche Quelle für laufende Konditionen; sie verfällt mit dem Nachrichtenwert.
    // Jetzt die Themenseite der Stadt, dazu die amtlichen Förderbedingungen als PDF
    // (Stand 16.03.2026), an denen die Sätze am 17.08.2026 Zeile für Zeile geprüft
    // wurden: Punkt 5.1 (Beträge), 5.2 (50 %), 5.3 (je Wohneinheit), 7.1 (Fenster).
    url: "https://www.wolfsburg.de/umweltnaturschutz/klimaschutz/erneuerbare_energien",
    stand: "August 2026", status: "pausiert", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale nach Anlagengröße + Speicher (max. 50 % der Kosten)",
    maxFoerderung: "max. 2.000 € je Wohneinheit",
    rates: [
      { label: "PV-Anlage", value: "700 € (<6 kWp) / 1.000 € (6–12 kWp) / 1.500 € (ab 12 kWp)" },
      { label: "Batteriespeicher (ab 3 kWh)", value: "+500 €" },
      { label: "Balkonkraftwerk", value: "200 €" },
    ],
    conditions: [
      "Antrag nur im jährlichen Fenster — 2026 vom 14.05. bis 14.06., aktuell geschlossen",
      "Losverfahren bei Überzeichnung, kein Windhundverfahren",
      "max. 50 % der entstandenen Kosten",
      "Je Wohneinheit höchstens eine PV-Anlage oder ein Balkonkraftwerk plus ein Speicher",
      "Nicht förderfähig: gesetzlich vorgeschriebene Anlagen, Anlagen als Teil eines Bauvorhabens, Insel-, Miet-, Leasing- und Eigenbauanlagen sowie gewerblich genutzte Immobilien",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    pvTiers: [{ upTo: 6, amount: 700 }, { upTo: 12, amount: 1000 }, { upTo: 999, amount: 1500 }],
    speicherTiers: [{ upTo: 999, amount: 500 }], speicherMin: 3,
  },
  "bottrop-solaroffensive": {
    id: "bottrop-solaroffensive", name: "Solaroffensive Bottrop",
    traeger: "Stadt Bottrop", level: "kommune", region: "Bottrop", bundesland: "Nordrhein-Westfalen", agsCode: "05512",
    url: "https://www.bottrop.de/klima-umwelt-natur/solarenergie-foerderung/solaroffensive/solaroffensive.php",
    stand: "Juni 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Pauschale + je kWh Speicher (PV nur mit Batteriespeicher)",
    maxFoerderung: "max. 1.000 € je Anlage (50 % der Kosten)",
    rates: [{ label: "PV-Anlage + Speicher", value: "300 € + 100 €/kWh, max. 1.000 €" }],
    conditions: [
      "Fördertopf derzeit ausgeschöpft — keine Antragsannahme",
      "PV nur in Kombination mit Batteriespeicher; Antrag vor Maßnahmenbeginn",
    ],
    combinableWith: BUND,
  },
  "krefeld-klimafreundlich": {
    id: "krefeld-klimafreundlich", name: "Klimafreundliches Wohnen in Krefeld",
    traeger: "Stadt Krefeld", level: "kommune", region: "Krefeld", bundesland: "Nordrhein-Westfalen", agsCode: "05114",
    url: "https://www.krefeld.de/de/umwelt/foerderprogramm-klimafreundliches-wohnen-in-krefeld/",
    stand: "Juni 2026", status: "ausgeschoepft", capped: true, verified: false,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp + je kWh Speicher (allgemeiner Topf seit 12/2024 leer)",
    rates: [
      { label: "PV-Anlage", value: "100 €/kWp, max. 1.000 €" },
      { label: "Batteriespeicher", value: "200 €/kWh, max. 2.000 €" },
    ],
    conditions: [
      "Allgemeine Förderung seit 04.12.2024 ausgeschöpft — Überarbeitung für 2026 angekündigt",
      "offen nur für Balkonkraftwerke + einkommensschwache Haushalte",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    pvPerKwp: 100, pvCap: 1000, speicherPerKwh: 200, speicherCap: 2000,
  },

  // ── Landkreise (eigenes, wiederkehrendes Programm; aktuell ausgeschöpft) ──────
  "rhein-erft-energieoffensive": {
    id: "rhein-erft-energieoffensive", name: "Energieoffensive Rhein-Erft-Kreis",
    traeger: "Rhein-Erft-Kreis", level: "landkreis", region: "Rhein-Erft-Kreis", bundesland: "Nordrhein-Westfalen", agsCode: "05362",
    url: "https://www.rhein-erft-kreis.de/infrastruktur/energieoffensive.php",
    stand: "Juni 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale für PV + Speicher (Jahresprogramm)",
    maxFoerderung: "max. 1.500 € je Haushalt",
    rates: [
      { label: "PV-Anlage (ab 5 kWp)", value: "1.000 €" },
      { label: "Batteriespeicher", value: "500 €" },
    ],
    conditions: [
      "Jahresprogramm — Budget 2026 (1 Mio. €) seit 18.03.2026 erschöpft (Förderampel rot)",
      "Antrag vor Maßnahmenbeginn; Neuauflage üblicherweise zum Jahresbeginn",
    ],
    combinableWith: BUND,
  },
  "viersen-klimaschutz": {
    id: "viersen-klimaschutz", name: "Förderprogramm Klimaschutz Kreis Viersen",
    traeger: "Kreis Viersen", level: "landkreis", region: "Kreis Viersen", bundesland: "Nordrhein-Westfalen", agsCode: "05166",
    url: "https://www.kreis-viersen.de/themen/klima/klimaschutz/foerderprogramm-klimaschutz",
    // BEENDET, NICHT NUR AUSGESCHÖPFT (korrigiert 23.08.2026). Hier stand
    // `ausgeschoepft` und daneben „Neuauflage offen" — beides sagte die
    // Amtsseite schon nicht mehr. Sie trägt unter „aktuelle Informationen vom
    // 13.04.2026": „Das Förderprogramm Klimaschutz wurde beendet. Eine
    // Antragstellung ist nicht mehr möglich. Es ist kein neuer Förderaufruf
    // geplant."
    //
    // Der Unterschied kostet kein Geld — beide Zustände ziehen nichts ab —, aber
    // er ist genau die Auskunft, für die jemand die Seite aufschlägt:
    // „ausgeschöpft, Neuauflage offen" heißt „im nächsten Haushaltsjahr wieder
    // versuchen", „beendet, kein neuer Förderaufruf geplant" heißt „hier kommt
    // nichts mehr". Wer auf die erste Auskunft hin wartet, wartet auf etwas, das
    // der Träger ausgeschlossen hat.
    stand: "August 2026", status: "eingestellt", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp Dach-PV ODER je kWh Speicher (nicht kombinierbar)",
    maxFoerderung: "max. 1.000 € je Position",
    rates: [
      { label: "Dach-PV", value: "200 €/kWp, max. 1.000 €" },
      { label: "Batteriespeicher", value: "200 €/kWh, max. 1.000 €" },
    ],
    conditions: [
      "Programm zum 13.04.2026 beendet; eine Antragstellung ist nicht mehr möglich, ein neuer Förderaufruf ist nicht geplant",
      "PV und Speicher nicht kombinierbar — nur eine Position je Antrag",
    ],
    combinableWith: BUND,
  },
  "bergstrasse-speicher": {
    id: "bergstrasse-speicher", name: "PV-Stromspeicher-Förderprogramm",
    traeger: "Kreis Bergstraße", level: "landkreis", region: "Kreis Bergstraße", bundesland: "Hessen", agsCode: "06431",
    url: "https://www.kreis-bergstrasse.de/themen-projekte/nachhaltigkeit/klimaschutz/",
    stand: "Juli 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWh Batteriespeicher (PV ab 2 kWp Voraussetzung)",
    maxFoerderung: "max. 3.000 € (max. 50 % der Kosten)",
    rates: [{ label: "Batteriespeicher (ab 3 kWh)", value: "180 €/kWh, max. 3.000 €" }],
    conditions: [
      "Keine Antragsannahme: Der 2024er-Topf ist erschöpft, 2025 gab es kein Programm, und für 2026 ist keines aufgelegt (am 28.07.2026 an den Seiten des Kreises geprüft)",
      "Beträge stammen aus der 2024er-Runde und gelten nur als Anhaltspunkt für eine mögliche Neuauflage",
      "PV-Anlage ab 2 kWp Voraussetzung; max. 50 % der Kosten",
    ],
    combinableWith: BUND,
    speicherPerKwh: 180, speicherCap: 3000, speicherMin: 3,
  },
  "mayen-koblenz-speicher": {
    id: "mayen-koblenz-speicher", name: "Solarspeicher-Förderprogramm",
    traeger: "Landkreis Mayen-Koblenz", level: "landkreis", region: "Landkreis Mayen-Koblenz", bundesland: "Rheinland-Pfalz", agsCode: "07137",
    url: "https://www.kvmyk.de/themen/klima/klimaschutzmassnahmen/",
    stand: "September 2026", status: "eingestellt", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWh Batteriespeicher (mit PV) — der Kreis führt das Programm nicht mehr",
    rates: [{ label: "Batteriespeicher", value: "zuletzt 200 €/kWh — Programm nicht mehr im Angebot" }],
    conditions: [
      "Der Landkreis führt das Solarspeicher-Programm auf seinen Förderseiten nicht mehr auf",
      "Von einer Neuauflage steht dort nichts; wer darauf wartet, fragt am besten beim Klimaschutzmanagement des Kreises nach",
      "Der Satz von 200 €/kWh stammt aus der letzten Runde und gilt nur als Anhaltspunkt",
    ],
    combinableWith: BUND,
    // „NEUAUFLAGE ANGEKÜNDIGT" ENTFERNT (01.09.2026). Der Satz stand hier als
    // Bedingung und ist an keiner Amtsseite mehr zu finden — dieselbe Fehlerklasse
    // wie bei Ludwigshafen: eine Aussage ohne Rechenwert dahinter, die deshalb von
    // keinem Test rot wird, aber jemanden warten lässt. Und die Richtung ist die
    // teurere: Wer auf eine angekündigte Neuauflage wartet, schiebt seine
    // Anschaffung auf.
    //
    // Am 01.09.2026 im echten Browser gelesen (die Seiten des Kreises laden ihren
    // Inhalt per Skript nach; ein einfacher Abruf liefert nur die leere Hülle —
    // deshalb erst über die Eskalationsleiter, nicht über eine Sekundärquelle):
    // Die Übersicht „Klimaschutzmaßnahmen" führt nur noch das Zuschussprogramm für
    // Balkonkraftwerke und die Dach- und Fassadenbegrünung; Solarspeicher steht
    // dort überhaupt nicht mehr. Die Seite „Förderinformationen" des Kreises nennt
    // gar kein eigenes Programm, sondern verweist auf die Förderdatenbank des
    // Bundes, den Fördermittelkompass des Landes und die Angebote der Städte und
    // Verbandsgemeinden.
    //
    // NEBENBEFUND, bewusst NICHT hier eingetragen: Der Kreis hatte ein eigenes
    // Zuschussprogramm für Balkonkraftwerke (150.000 € aus dem Landesprogramm
    // KIPKI). Es ist ebenfalls vorbei — die Seite trägt oben „+++ Das
    // Zuschussprogramm ist beendet - eine Antragstellung ist nicht mehr möglich!
    // +++". Ein beendetes Programm neu in den Katalog aufzunehmen ist keine
    // Korrektur, sondern eine Aufnahme, und die bleibt Vorschlag (Wächter-Gate,
    // Teil 3).
  },
  // ── Kommune – aus dem Abdeckungs-Screening, 18.08.2026 ──────────────────────
  //
  // Alle folgenden Einträge stammen aus dem Abdeckungs-Lauf und wurden am
  // 18.08.2026 an der jeweiligen Amtsseite GELESEN — das Screening-Zitat war nur
  // der Anlass hinzusehen, nie die Quelle. Zwei Funde aus dem Lesen, die zeigen,
  // warum das nötig ist: In Hochheim gelten die 100 € dem SPEICHER, das
  // Balkonkraftwerk bekommt 50 €; und Senden führt seine Programme zwar
  // ausführlich auf, hat aber keines mehr im Angebot.

  "ennepetal-steckersolar": {
    id: "ennepetal-steckersolar", name: "Klimaförderprogramm Steckersolar",
    traeger: "Stadt Ennepetal", level: "kommune", region: "Ennepetal",
    bundesland: "Nordrhein-Westfalen", agsCode: "05954008",
    url: "https://www.ennepetal.de/umwelt-klima/klimaschutz-klimaanpassung/klimafoerderprogramme/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale je Haushalt für ein fabrikneues Balkonkraftwerk",
    rates: [{ label: "Balkonkraftwerk", value: "100 € je Haushalt" }],
    conditions: [
      "Das Gerät muss fabrikneu sein",
      "Je Haushalt wird ein Gerät gefördert",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPauschale: 100,
  },

  "wittlich-balkonkraftwerke": {
    id: "wittlich-balkonkraftwerke", name: "Förderprogramm Balkonkraftwerke",
    traeger: "Stadt Wittlich", level: "kommune", region: "Wittlich",
    bundesland: "Rheinland-Pfalz", agsCode: "07231134",
    url: "https://www.wittlich.de/de/planung-umwelt-und-mobilitaet/klima-landwirtschaft-und-forsten/klimaschutz/foerderprogramm-balkonkraftwerke/",
    stand: "August 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale je Balkonkraftwerk — Fördertopf aufgebraucht",
    rates: [{ label: "Balkonkraftwerk", value: "150 € pauschal" }],
    conditions: [
      "Der Fördertopf ist aufgebraucht; gefördert wurden 200 Anlagen aus 30.000 €",
      "Antragsberechtigt sind Privatpersonen mit Erstwohnsitz in Wittlich",
      "Mieter können ebenfalls einen Antrag stellen",
      "Der Antrag wird nach Installation und Registrierung gestellt",
      "Gefördert wird höchstens ein Balkonkraftwerk je Haushalt",
      "Die Anlage muss ab dem 01.01.2024 neu angeschafft worden sein; der Wechselrichter darf höchstens 800 W leisten",
      "Die Anlage ist fünf Jahre lang zu betreiben",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPauschale: 150,
  },

  "hochheim-klimaschutz": {
    id: "hochheim-klimaschutz", name: "Städtisches Förderprogramm Klimaschutz und Klimaanpassung",
    traeger: "Stadt Hochheim am Main", level: "kommune", region: "Hochheim am Main",
    bundesland: "Hessen", agsCode: "06436006",
    url: "https://www.hochheim.de/unsere-stadt/klimaschutz/staedtisches-foerderprogramm",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschalen für Balkonkraftwerk und dessen Speicher — keine Dach-PV",
    rates: [
      { label: "Balkonkraftwerk", value: "50 € inkl. Montage" },
      { label: "Speicher am Balkonkraftwerk", value: "100 €" },
    ],
    conditions: [
      "Der Zuschuss wird rückwirkend gewährt",
      "Dach-Photovoltaik ist nicht Teil des Programms",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // 50 €, nicht 100 € — die 100 € gelten dem Speicher. Der Unterschied fiel
    // erst beim Lesen der Amtsseite auf; im Nachbarabsatz schreibt dieselbe
    // Seite „50% des Kaufpreises, maximal 200,00 Euro pro Baum", trennt Prozent
    // und Euro also sauber. Der Speicher-Betrag bleibt ohne strukturierten
    // Satz: Ein Balkonspeicher ist im Rechner keine eigene Größe.
    balkonPauschale: 50,
  },

  "linsengericht-oekologie": {
    id: "linsengericht-oekologie", name: "Förderprogramm Ökologie",
    traeger: "Gemeinde Linsengericht", level: "kommune", region: "Linsengericht",
    bundesland: "Hessen", agsCode: "06435018",
    url: "https://www.linsengericht.de/bauen-verkehr/klima-energie/foerderprogramme-oekologie/",
    stand: "August 2026", status: "aktiv", capped: false, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp für Dach-PV, Pauschale fürs Balkonkraftwerk, dazu Stromspeicher",
    maxFoerderung: "max. 900 € für die Dachanlage",
    rates: [
      { label: "Photovoltaik", value: "90 € je kWp, max. 900 €" },
      { label: "Balkonkraftwerk", value: "75 € pauschal" },
      { label: "Stromspeicher", value: "50 € je kW, max. 500 €" },
    ],
    conditions: [
      "Der Antrag wird nach Einholung eines Angebots gestellt",
      "Mit der Maßnahme darf erst nach dem Bewilligungsbescheid begonnen werden",
      "Zur Auszahlung sind der Eintrag im Marktstammdatenregister und die Schlussrechnung vorzulegen",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    pvPerKwp: 90, pvCap: 900,
    balkonPauschale: 75,
    // Der Speicher-Satz lautet „50,00 € pro KW" — also je LEISTUNG, während der
    // Rechner die Kapazität in kWh führt. Beides ist nicht ineinander
    // umzurechnen, ohne eine C-Rate zu erfinden. Der Satz steht deshalb als
    // Text da und rechnet nicht mit.
  },

  "holzgerlingen-erneuerbare": {
    id: "holzgerlingen-erneuerbare", name: "Förderprogramm erneuerbare Energien",
    traeger: "Stadt Holzgerlingen", level: "kommune", region: "Holzgerlingen",
    bundesland: "Baden-Württemberg", agsCode: "08115024",
    url: "https://www.holzgerlingen.de/de/verwaltung-politik/wohnen-bauen/foerderprogramme.php",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteil der Kosten eines Balkonkraftwerks",
    maxFoerderung: "max. 200 € (mit Familien- und Sozialpass max. 500 €)",
    rates: [
      { label: "Balkonkraftwerk", value: "30 % der Kosten, max. 200 €" },
      { label: "mit Familien- und Sozialpass", value: "75 % der Kosten, max. 500 €" },
    ],
    conditions: [
      "Antragsberechtigt sind Einwohnerinnen und Einwohner von Holzgerlingen",
      "Nach dem Kauf ist der Antrag nur im Jahr der Rechnungsstellung möglich",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // Gerechnet wird der Regelsatz. Der erhöhte Satz mit Familien- und
    // Sozialpass hängt an einem Nachweis, den der Rechner nicht kennt — ihn
    // anzusetzen verspräche 500 € an alle. Dieselbe Zurückhaltung wie beim
    // München-Pass und der Stuttgarter FamilienCard.
    balkonPercentOfCost: 0.3, balkonCap: 200,
  },

  "wernau-balkonkraftwerke": {
    id: "wernau-balkonkraftwerke", name: "Förderprogramm für Balkonkraftwerke",
    traeger: "Stadt Wernau (Neckar)", level: "kommune", region: "Wernau (Neckar)",
    bundesland: "Baden-Württemberg", agsCode: "08116072",
    url: "https://www.wernau.de/wirtschaft-bauen/klimaschutz-und-nachhaltige-stadt/foerderprogramm-fuer-balkonkraftwerke",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale für Anschaffung, Installation und Inbetriebnahme",
    rates: [{ label: "Balkonkraftwerk", value: "100 € pauschal" }],
    conditions: [
      "Antragsberechtigt sind Mietende und Wohnungseigentümer in Mehrfamilienhäusern ohne Möglichkeit einer Dachanlage",
      "Der Wechselrichter darf höchstens 800 W leisten",
      "Die Mittel werden nach Eingang der vollständigen Anträge vergeben",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPauschale: 100,
  },

  "muehlhausen-sulz-pv": {
    id: "muehlhausen-sulz-pv", name: "Förderprogramm PV-Anlage mit Speicher und Balkonkraftwerke",
    traeger: "Gemeinde Mühlhausen an der Sulz", level: "kommune", region: "Mühlhausen",
    bundesland: "Bayern", agsCode: "09373146",
    url: "https://www.muehlhausen-sulz.de/leben-and-soziales/bauen-and-wohnen/foerderprogramm-pv-anlage-mit-speicher-und-balkonkraftwerke",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Feste Beträge nach Anlagengröße — Dach-PV nur zusammen mit Speicher",
    maxFoerderung: "max. 1.500 € für die Dachanlage",
    rates: [
      { label: "PV mit Speicher, 5–10 kWp", value: "1.000 €" },
      { label: "PV mit Speicher, 10–20 kWp", value: "1.250 €" },
      { label: "PV mit Speicher, 20–30 kWp", value: "1.500 €" },
      { label: "Balkonkraftwerk 340–680 Wp", value: "100 €" },
      { label: "Balkonkraftwerk 680–1.020 Wp", value: "150 €" },
      { label: "Balkonkraftwerk ab 1.020 Wp", value: "200 €" },
    ],
    conditions: [
      "Antragsberechtigt sind natürliche Personen",
      "Die Dachanlage wird nur zusammen mit einem Stromspeicher gefördert",
      "Die Dachanlage muss mindestens 5 kWp leisten — die unterste Stufe beginnt dort",
      "Anlagen, die vor dem 1. Mai 2022 in Betrieb gingen, sind ausgeschlossen",
      "Der Fördertopf umfasst insgesamt 50.000 €",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    // Die Dach-Staffel gilt NUR mit Speicher — das ist im Modell nicht als
    // Bedingung ausdrückbar. `speicherMin: 1` erzwingt sie über die einzige
    // Größe, die der Rechner kennt: Ohne Speicher greift keine Stufe.
    // Die Staffel beginnt „ab 5 kWp bis einschl. 10 kWp" — am 27.08.2026 auf der
    // Gemeindeseite gelesen. Ohne `pvMin` zahlte die unterste Stufe auch bei
    // 3 kWp, wo die Gemeinde nichts zahlt.
    pvTiers: [{ upTo: 10, amount: 1000 }, { upTo: 20, amount: 1250 }, { upTo: 30, amount: 1500 }],
    pvMin: 5,
    speicherMin: 1,
    balkonTiers: [{ upTo: 680, amount: 100 }, { upTo: 1020, amount: 150 }, { upTo: 999999, amount: 200 }],
  },

  "senden-klima": {
    id: "senden-klima", name: "Kommunale Förderprogramme (derzeit keine)",
    traeger: "Gemeinde Senden (Westfalen)", level: "kommune", region: "Senden",
    bundesland: "Nordrhein-Westfalen", agsCode: "05558044",
    url: "https://www.senden-westfalen.de/klima-programme",
    stand: "August 2026", status: "eingestellt", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zurzeit keine kommunale Förderung — die früheren Programme sind ausgelaufen",
    rates: [{ label: "Alle Bausteine", value: "derzeit nicht aufgelegt" }],
    conditions: [
      "Die Gemeinde hat zuletzt für 2025 mitgeteilt, dass keine Förderprogramme vorgesehen sind; für 2026 steht nichts Neues auf der Seite",
      "Zuletzt gefördert wurden 2024 Stecker-Solar-Anlagen bis 600 W mit 50 % des Kaufpreises, höchstens 200 € je Anlage und eine Anlage je Wohneinheit",
      "Ebenfalls gefördert: Erdwärmesonden mit 15 € je Bohrmeter, höchstens 1.500 € je Grundstück",
      "Der Topf 2024 war am 16.09.2024 ausgeschöpft, also nach vier Wochen",
    ],
    combinableWith: BUND,
    // Der Eintrag bleibt sichtbar, statt zu fehlen: Wer in Senden nach
    // Förderung sucht, findet eine ausführliche Programmseite und soll lesen,
    // dass davon derzeit nichts mehr zu holen ist. Dieselbe Überlegung wie bei
    // Münster. Ohne strukturierten Satz wird nichts abgezogen.
    //
    // Am 29.08.2026 an der Amtsseite nachgelesen und dabei ZWEI eigene Angaben
    // korrigiert, beide ohne Wirkung aufs Geld, beide trotzdem falsch:
    // „bis 2023" — die Gemeinde förderte Stecker-Solar zuletzt 2024 („Schon am
    // 16.09.2024 war das Budget für die kommunalen Förderprogramme 2024
    // ausgeschöpft"), und „für das laufende Jahr" — die Seite sagt wörtlich
    // „Aktuell (2025) sind keine gemeindlichen Förderprogramme vorgesehen" und
    // trägt zu 2026 gar nichts. Ein Satz, der ein Jahr behauptet, das die Quelle
    // nicht nennt, ist derselbe Fehler wie ein erfundenes Prüfdatum.
    foerdert: ["pv", "balkon", "waermepumpe"],
  },

  // ── Kommune – erste Wärmepumpen-Funde, 18.08.2026 ───────────────────────────
  //
  // Der Screener suchte bis heute gar nicht nach Wärmepumpen. Die erste Runde
  // brachte vier Fundstellen — und einen ernüchternden Befund, der hier
  // festgehalten gehört: KEINE davon ist ein laufendes, rechenbares Programm.
  // Drei sind ausgeschöpft oder eingestellt, die vierte (Roth) fördert die
  // Erdsonde, nicht die Wärmepumpe. Kommunale WP-Zuschüsse sind offenbar klein,
  // schnell leer und selten — anders als bei Balkonkraftwerken, wo dieselbe
  // Runde acht laufende Programme fand.

  "maintal-klima": {
    id: "maintal-klima", name: "Klima-Förderrichtlinie",
    traeger: "Stadt Maintal", level: "kommune", region: "Maintal",
    bundesland: "Hessen", agsCode: "06435019",
    url: "https://www.maintal.de/klima-f%C3%B6rderrichtlinie",
    stand: "August 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschalen für Wärmepumpe und Balkonkraftwerk, dazu Dämmung und Fenster — Mittel derzeit aufgebraucht",
    rates: [
      { label: "Wärmepumpe", value: "2.000 € je Anlage" },
      { label: "Biomasseheizung", value: "1.000 € je Anlage" },
      { label: "Balkonkraftwerk", value: "50 % des Kaufpreises, max. 150 € je Modul" },
    ],
    conditions: [
      "Die Antragstellung ist derzeit nicht möglich, weil die bewilligten Maßnahmen die Mittel ausschöpfen",
      "Bei der Mini-Photovoltaik werden höchstens zwei Module gefördert",
      "Die Stadt stellt eine erneute Öffnung zu einem späteren Zeitpunkt in Aussicht",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon", "waermepumpe"],
    // Kein strukturierter Satz, solange der Topf leer ist: Die Beträge stehen
    // als Auskunft da („gab es, kommt vielleicht wieder"), rechnen aber nicht
    // mit. Sobald die Stadt wieder öffnet, sind es 2.000 € Pauschale für die
    // Wärmepumpe und ein Prozentsatz je Modul für die Mini-PV.
  },

  "roth-klimaschutz": {
    id: "roth-klimaschutz", name: "Klimaschutzförderprogramm",
    traeger: "Stadt Roth", level: "kommune", region: "Roth",
    bundesland: "Bayern", agsCode: "09576143",
    url: "https://www.stadt-roth.de/umwelt-mobilitaet/klimaschutz/klimaschutzfoerderprogramm",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteil der Kosten für Photovoltaik und für Erdwärmesonden",
    maxFoerderung: "max. 1.000 € für die PV-Anlage",
    rates: [
      { label: "Photovoltaik", value: "10 % der Kosten, max. 1.000 €" },
      { label: "Erdwärmesonden, -kollektoren und -körbe", value: "20 % der Kosten, max. 2.500 €" },
    ],
    conditions: [
      "Antragsberechtigt sind Rother Bürgerinnen und Bürger, Eigentümergemeinschaften und gemeinnützige Rother Organisationen",
      "Der Antrag ist spätestens sechs Monate nach Fertigstellung der Maßnahme schriftlich zu stellen",
      "Gefördert wird die Erdwärmequelle, nicht der Heizungstausch als solcher",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "waermepumpe"],
    percentOfCost: 0.1, pvCap: 1000,
    // Der Wärmepumpen-Teil bekommt bewusst KEINEN Rechenwert. Gefördert wird die
    // Erdwärmequelle — das trifft nur Sole/Wasser-Anlagen, während der Rechner
    // auch Luft/Wasser kennt. Ein `wpPercentOfCost` versprächen 20 % auch dem,
    // der eine Luftwärmepumpe plant, und das wäre schlicht falsch. Die
    // Unterscheidung nach Wärmequelle kann das Modell nicht ausdrücken.
  },

  "wenden-heizungstausch": {
    id: "wenden-heizungstausch", name: "Förderrichtlinie Heizungstausch",
    traeger: "Gemeinde Wenden", level: "kommune", region: "Wenden",
    bundesland: "Nordrhein-Westfalen", agsCode: "05966028",
    url: "https://www.wenden.de/wirtschaft-umwelt-verkehr/klima-umwelt/foerderprogramme",
    stand: "August 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale beim Wechsel auf Wärmepumpe oder Pelletheizung — Förderplätze vergeben",
    rates: [{ label: "Heizungstausch", value: "1.000 € je Wohngebäude" }],
    conditions: [
      "Die Förderplätze des laufenden Programms sind bereits vergeben",
      "Antragsberechtigt sind Eigentümerinnen und Eigentümer von Wohngebäuden in der Gemeinde Wenden",
      "Der Antrag wird online gestellt",
    ],
    combinableWith: BUND,
    foerdert: ["waermepumpe"],
    // 1.000 € Pauschale — ohne Rechenwert, solange die Plätze vergeben sind.
  },

  // ── Kommune – übergeben von der Prüfmechanik-Session, gelesen 18.08.2026 ────
  //
  // Beide Fälle musste die Vorgänger-Session ohne Betrag liegen lassen, weil das
  // Modell „X % der Kosten, höchstens Y €" nicht ausdrücken konnte. Mit
  // `balkonPercentOfCost` + `balkonCap` geht es jetzt. Ihre Zahlen stammten aus
  // dem Screening und waren ausdrücklich NICHT gegengelesen — beide Seiten sind
  // hier zuerst im Volltext geöffnet worden, und bei Leimen kam dabei ein
  // Höchstbetrag zum Vorschein, den der Auszug nicht enthielt.

  "hohenahr-pv": {
    id: "hohenahr-pv", name: "Förderrichtlinie Photovoltaikanlagen",
    traeger: "Gemeinde Hohenahr", level: "kommune", region: "Hohenahr",
    bundesland: "Hessen", agsCode: "06532013",
    url: "https://www.hohenahr.de/bauen-umwelt/energie-umwelt/foerderprogramm-pv-anlagen/",
    stand: "August 2026", status: "aktiv", capped: false, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteil an Anschaffung, Montage und Inbetriebnahme — Balkonkraftwerk und Dachanlage getrennt",
    maxFoerderung: "max. 1.000 € für die Dachanlage, max. 200 € fürs Balkonkraftwerk",
    rates: [
      { label: "Balkonkraftwerk", value: "20 % der Anschaffungskosten, max. 200 € brutto" },
      { label: "Genehmigungspflichtige Anlage bis 30 kWp", value: "10 % der Anschaffungskosten, max. 1.000 € brutto" },
    ],
    conditions: [
      "Der Antrag ist vor Inbetriebnahme zu stellen und der Bewilligungsbescheid abzuwarten",
      "Antragsberechtigt sind Mieterinnen und Mieter, Vermieter, Eigentümer und Wohnungseigentümergemeinschaften in Hohenahr",
      "Das Balkonkraftwerk darf höchstens 600 W Wechselrichterleistung abgeben",
      "Die Dachanlage darf höchstens 30 kWp installierte Leistung haben",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    percentOfCost: 0.1, pvCap: 1000,
    balkonPercentOfCost: 0.2, balkonCap: 200,
    // Die 600-W-Grenze steht so in der Richtlinie von 2023 und ist damit enger
    // als die heute übliche 800-W-Schwelle. Sie bleibt als Bedingung stehen,
    // statt stillschweigend auf 800 aufgerundet zu werden: Wer ein 800-W-Gerät
    // kauft, bekommt hier nach dem Wortlaut nichts.
  },

  "leimen-klimaschutz": {
    id: "leimen-klimaschutz", name: "Klimaschutzförderung Stecker-Solaranlagen",
    traeger: "Stadt Leimen", level: "kommune", region: "Leimen",
    bundesland: "Baden-Württemberg", agsCode: "08226041",
    url: "https://www.leimen.de/leben-wohnen/klimaschutz-und-umwelt/klimaschutzfoerderungen",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteil der Gesamtkosten einer Balkonkraftwerk",
    maxFoerderung: "max. 120 € je Antrag",
    rates: [{ label: "Balkonkraftwerk", value: "15 % der Gesamtkosten, max. 120 €" }],
    conditions: [
      "Gefördert wird nur ein Kauf innerhalb des Förderzeitraums 2026",
      "Nach Angabe der Stadt sind ausreichend Fördermittel vorhanden",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // 120 € Deckel — der stand NICHT im Screening-Auszug, aus dem die
    // Vorgänger-Session ihre 15 % hatte. Ohne ihn hätte ein 800-€-Set 120 statt
    // 45 € Förderung gezeigt: derselbe Prozentsatz, dreifacher Betrag.
    balkonPercentOfCost: 0.15, balkonCap: 120,
  },

  "sandhausen-foerderprogramme": {
    id: "sandhausen-foerderprogramme", name: "Förderprogramme erneuerbare Energien",
    traeger: "Gemeinde Sandhausen", level: "kommune", region: "Sandhausen",
    bundesland: "Baden-Württemberg", agsCode: "08226076",
    url: "https://www.sandhausen.de/de/Wirtschaft-Bauen/(Um)Bauen/Foerderprogramme",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteil an Anschaffung und Einbau — Balkonkraftwerk gedeckelt, Dachanlage ohne genannte Obergrenze",
    maxFoerderung: "max. 200 € für Balkonkraftwerk",
    rates: [
      { label: "Balkonkraftwerk", value: "50 % von Anschaffung und Einbau, max. 200 €" },
      { label: "Photovoltaik mit Speicher", value: "bis 50 % des Anschaffungspreises" },
    ],
    conditions: [
      "Das Steckersolar-Programm läuft seit April 2023",
      "Für die Dachanlage wurden die Haushaltsmittel im Juni 2023 aufgestockt",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    balkonPercentOfCost: 0.5, balkonCap: 200,
    // Für die DACHANLAGE nennt die Seite 50 % ohne Höchstbetrag. Ein
    // ungedeckelter Prozentsatz auf eine 20.000-€-Anlage wären 10.000 € — das
    // zahlt keine 15.000-Einwohner-Gemeinde. Die Obergrenze steht offenbar nur
    // in der Richtlinie; ohne sie bleibt der Satz Text.
  },

  "helmstedt-umwelt-klima": {
    id: "helmstedt-umwelt-klima", name: "Förderrichtlinie Umwelt- und Klimaschutzmaßnahmen",
    traeger: "Stadt Helmstedt", level: "kommune", region: "Helmstedt",
    bundesland: "Niedersachsen", agsCode: "03154028",
    url: "https://www.stadt-helmstedt.de/wirtschaft-bauen/klimaschutz-und-umwelt/foerderrichtlinie-fuer-umwelt-und-klimaschutzmassnahmen.html",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss für Balkonkraftwerk, dazu Dachbegrünung und Regenwasser — keine Dach-PV, kein Speicher",
    maxFoerderung: "max. 100 € je Balkonkraftwerk",
    rates: [{ label: "Balkonkraftwerk", value: "max. 100 € je Anlage" }],
    conditions: [
      "Für Balkonkraftwerke stehen höchstens 20 % der jährlichen Gesamtfördersumme bereit",
      "Für das laufende Haushaltsjahr sind insgesamt 40.000 € eingeplant",
      "Dach-Photovoltaik und Batteriespeicher sind nicht Teil des Programms",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // Rechenwert ergänzt am 19.08.2026, nachdem die Richtlinie gelesen war:
    // Ein Prozentsatz existiert für Balkonsolar NIRGENDS im Dokument — Nr. 2.3.8
    // nennt nur Sacheigenschaften (mindestens 500 W, höchstens 1.000 W). Die
    // Tabelle der Stadt schreibt Prozentsätze acht Mal ausdrücklich aus („bis zu
    // 50 % der förderfähigen Kosten, max. 2.000 €" bei der Dachbegrünung) und
    // lässt sie hier weg. Damit ist „max. 100 € / Anlage" eine Pauschale.
    balkonPauschale: 100,
  },

  "nottuln-klimaschutz": {
    id: "nottuln-klimaschutz", name: "Förderprogramm Klimaschutz",
    traeger: "Gemeinde Nottuln", level: "kommune", region: "Nottuln",
    bundesland: "Nordrhein-Westfalen", agsCode: "05558032",
    url: "https://www.nottuln.de/leben-in-nottuln/klimaschutz-energie-umwelt/foerderprogramm-klimaschutz",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss für Balkonkraftwerke aus einem gedeckelten Jahrestopf",
    rates: [{ label: "Balkonkraftwerk", value: "Betrag nur in der Richtlinie, Jahrestopf 4.000 €" }],
    conditions: [
      "Gefördert werden Geräte, die seit dem 1. Januar des laufenden Jahres gekauft wurden",
      "Vollständige Anträge werden nach Eingangsdatum bearbeitet, bis der Topf leer ist",
      "Der Jahrestopf für Steckersolar beträgt 4.000 €",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // Die Seite nennt den Fördersatz überhaupt nicht, nur den Jahrestopf. Der
    // Eintrag informiert deshalb und rechnet nicht — bei 4.000 € Gesamtbudget
    // ist der Hinweis „schnell sein" ohnehin die wichtigere Auskunft als der
    // Betrag.
  },

  "heddesheim-umwelt": {
    id: "heddesheim-umwelt", name: "Umweltförderprogramm",
    traeger: "Gemeinde Heddesheim", level: "kommune", region: "Heddesheim",
    bundesland: "Baden-Württemberg", agsCode: "08226028",
    url: "https://www.heddesheim.de/Umweltfoerderprogramm",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp für die Dachanlage, Pauschale fürs Balkonkraftwerk",
    maxFoerderung: "max. 1.500 € für die Dachanlage",
    rates: [
      { label: "Photovoltaik", value: "150 € je kWp, höchstens 1.500 €" },
      { label: "Balkonkraftwerk", value: "100 € je Anlage" },
    ],
    conditions: [
      "Für die Dachanlage ist der Antrag vor der Auftragsvergabe zu stellen",
      "Beim Balkonkraftwerk darf die Rechnung bei Antragstellung höchstens sechs Monate alt sein",
      "Batteriespeicher und Wärmepumpen sind nicht Teil des Programms",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    pvPerKwp: 150, pvCap: 1500,
    balkonPauschale: 100,
    // Zwei verschiedene Antragszeitpunkte in EINEM Programm: Dach vorher,
    // Balkon nachher. Das Modell kennt dafür kein Feld, und es ist die
    // Bedingung, deren Verletzung die ganze Förderung kostet — sie steht
    // deshalb ausdrücklich in beiden Zeilen.
  },

  "nittenau-steckersolar": {
    id: "nittenau-steckersolar", name: "Zuschuss Stecker-Solaranlagen",
    traeger: "Stadt Nittenau", level: "kommune", region: "Nittenau",
    bundesland: "Bayern", agsCode: "09376149",
    url: "https://www.nittenau.de/rathaus-service/buergerservice/foerderprogramme",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteil der Anschaffungskosten einer Balkonkraftwerk",
    maxFoerderung: "max. 100 € je Antrag",
    rates: [{ label: "Balkonkraftwerk", value: "10 % der Anschaffungskosten, max. 100 €" }],
    conditions: [
      "Antragsberechtigt sind natürliche Personen und örtliche eingetragene Vereine",
      "Dem Antrag sind Rechnung und ein Foto der installierten Anlage beizulegen",
      "Für das laufende Jahr stehen 1.000 € bereit, ausgezahlt wird bis der Topf leer ist",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPercentOfCost: 0.1, balkonCap: 100,
    // 1.000 € Jahrestopf bedeutet: etwa zehn geförderte Anlagen. Der Betrag
    // stimmt, die Wahrscheinlichkeit ihn zu bekommen hängt am Zeitpunkt — das
    // steht als Bedingung da, weil der Rechner es nicht ausdrücken kann.
  },

  "beratzhausen-effizient": {
    id: "beratzhausen-effizient", name: "Beratzhausen effizient",
    traeger: "Markt Beratzhausen", level: "kommune", region: "Beratzhausen",
    bundesland: "Bayern", agsCode: "09375118",
    url: "https://beratzhausen.com/foerderprogramme/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss für Balkonkraftwerke, daneben Haushaltsgeräte und Energieberatung",
    maxFoerderung: "bis zu 50 € fürs Balkonkraftwerk",
    rates: [{ label: "Balkonkraftwerk", value: "bis zu 50 €" }],
    conditions: [
      "Die Höhe im Einzelfall steht in der Förderrichtlinie, nicht auf der Programmseite",
      "Daneben werden ein Energieberatungsgutschein über 200 € und der Tausch von Haushaltsgeräten gefördert",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // „bis zu 50 Euro" ist ein Deckel, kein Satz — ob jede Anlage die 50 €
    // bekommt oder nur ein ungenannter Anteil davon, steht nicht da. Ohne den
    // Satz kein Rechenwert.
  },

  "rietheim-weilheim-pv": {
    id: "rietheim-weilheim-pv", name: "Kommunales Förderprogramm Photovoltaik",
    traeger: "Gemeinde Rietheim-Weilheim", level: "kommune", region: "Rietheim-Weilheim",
    bundesland: "Baden-Württemberg", agsCode: "08327056",
    url: "http://www.rietheim-weilheim.de/rathaus-service/aktuelles/kommunale-foerderprogramme",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp für die Dachanlage, Pauschale fürs Balkonkraftwerk",
    maxFoerderung: "max. 500 € für die Dachanlage, 100 € fürs Balkonkraftwerk",
    rates: [
      { label: "Photovoltaik", value: "100 € je kWp, max. 500 € je Anlage" },
      { label: "Balkonkraftwerk", value: "100 € pauschal" },
    ],
    conditions: [
      "Antragsberechtigt sind Gebäude- und Wohnungseigentümer in der Gemeinde",
      "Der Zuschuss für die Dachanlage ist zusätzlich auf 10 % des Kaufpreises begrenzt",
      "Je Haushalt wird ein Balkonkraftwerk gefördert",
      "Eine Beschaffung vor Freigabe der Mittel ist zuschussschädlich",
      "Für Photovoltaik und Balkonkraftwerke stehen zusammen 7.500 € bereit, vergeben nach Eingang",
      "Auf die Förderung besteht kein Rechtsanspruch",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    pvPerKwp: 100, pvCap: 500,
    balkonPauschale: 100,
    // Die Dachanlage trägt ZWEI Deckel: 500 € je Anlage und 10 % des
    // Kaufpreises. Gerechnet wird mit dem 500er, weil der zweite erst unter
    // 5.000 € Kaufpreis enger wäre — darunter liegt keine Dachanlage. Der
    // Vollständigkeit halber steht er trotzdem als Bedingung da.
  },

  "forstinning-energiewende": {
    id: "forstinning-energiewende", name: "Förderrichtlinie Energiewende und Klimaschutz",
    traeger: "Gemeinde Forstinning", level: "kommune", region: "Forstinning",
    bundesland: "Bayern", agsCode: "09175118",
    url: "https://www.forstinning.de/wirtschaft-und-energie/energie/foerderrichtlinie-der-gemeinde-forstinning",
    stand: "August 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Balkonkraftwerke, Dachanlagen und Batteriespeicher — Jahrestopf aufgebraucht",
    maxFoerderung: "max. 1.500 € je Antragsteller in drei Jahren",
    rates: [{ label: "Balkonkraftwerk, Dach-PV und Speicher", value: "zusammen max. 1.500 € in drei Jahren" }],
    conditions: [
      "Die Fördersumme von 40.000 € für das laufende Jahr ist ausgeschöpft",
      "Gefördert werden Stecker-Photovoltaik, Dachanlagen und Batteriespeicher",
      "Die Mittel werden nach Eingang der Anträge vergeben",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    // Die Richtlinie nennt nur den Gesamtdeckel über alle Maßnahmen und drei
    // Jahre, keinen Satz je Maßnahme. Selbst bei vollem Topf wäre daraus keine
    // Zahl für EINE Anlage abzuleiten.
  },

  "oftersheim-co2": {
    id: "oftersheim-co2", name: "Förderprogramm zur Reduzierung der CO₂-Emissionen",
    traeger: "Gemeinde Oftersheim", level: "kommune", region: "Oftersheim",
    bundesland: "Baden-Württemberg", agsCode: "08226062",
    url: "https://www.oftersheim.de/3187645",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschüsse für Photovoltaik, Balkonkraftwerk, Solarthermie und Dämmung",
    rates: [{ label: "Photovoltaik und Balkonkraftwerk", value: "Beträge nur in der Förderrichtlinie" }],
    conditions: [
      "Das Programm läuft seit April 2023",
      "Gefördert werden unter anderem Photovoltaik, Balkonkraftwerke, Solarthermie und Dämmung",
      "Die Förderbeträge stehen ausschließlich in der herunterladbaren Richtlinie",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    // Die Programmseite zählt nur auf, WAS gefördert wird, nicht mit wieviel.
    // Die Beträge liegen als PDF dahinter und sind hier nicht gelesen — ohne
    // gelesene Quelle keine Zahl.
  },

  "bad-rothenfelde-klima": {
    id: "bad-rothenfelde-klima", name: "Klimapaket Stecker-Solar und Dachbegrünung",
    traeger: "Gemeinde Bad Rothenfelde", level: "kommune", region: "Bad Rothenfelde",
    bundesland: "Niedersachsen", agsCode: "03459006",
    url: "https://gemeinde.bad-rothenfelde.de/nachricht/1910.html",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss für Balkonkraftwerke, daneben Dachbegrünung",
    rates: [{ label: "Balkonkraftwerk", value: "Betrag nur in der Richtlinie, Jahrestopf 5.000 €" }],
    conditions: [
      "Antragsberechtigt sind Eigentümerinnen und Eigentümer sowie Mieterinnen und Mieter",
      "Mieter brauchen das Einverständnis des Eigentümers oder der Eigentümergemeinschaft",
      "Für Stecker-Solar-Geräte stehen 5.000 € im Haushalt bereit",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // Der Betrag je Gerät steht nur in der Richtlinie als PDF, nicht auf der
    // Seite. Aufgenommen ohne Rechenwert — dass Mieter ausdrücklich
    // antragsberechtigt sind, ist für ein Balkonkraftwerk ohnehin die Auskunft,
    // auf die es ankommt.
  },

  "vilshofen-steckersolar": {
    id: "vilshofen-steckersolar", name: "Förderrichtlinie Steckersolargeräte",
    traeger: "Stadt Vilshofen an der Donau", level: "kommune", region: "Vilshofen an der Donau",
    bundesland: "Bayern", agsCode: "09275154",
    url: "https://www.vilshofen.de/wir-in-vilshofen/bauen-und-stadtentwicklung/foerderprogramme-und-zuschuesse",
    // BETRAG NACHGETRAGEN (25.08.2026). Hier stand „Betrag nur in der
    // Förderrichtlinie" — ehrlich, aber für den Leser wertlos, und es war nicht
    // wahr: Die Richtlinie liegt als PDF auf derselben Amtsseite verlinkt
    // (Stand 30.04.2026, Stadtratsbeschluss vom selben Tag). Ihre Präambel nennt
    // den Betrag im Klartext: „Die Förderung beträgt 50 € je Anlage." Grenzen
    // aus § 3 Abs. 1 (2.000 W Modul / 800 W Wechselrichter), Antragsberechtigung
    // aus § 2, Ein-Antrag-Regel aus § 1 Abs. 6.
    //
    // Weiterhin OHNE Rechenwert: 50 € sind ein fester Betrag, den der Rechner
    // abziehen könnte — aber die Richtlinie gibt ihn nur Mietern (§ 2 Abs. 1),
    // und ob jemand zur Miete wohnt, fragt der Balkon-Rechner nicht ab. Ein
    // Abzug wäre für jeden Eigentümer falsch. Das Programm informiert deshalb,
    // es rechnet nicht.
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss für Balkonkraftwerke — ausdrücklich für Mieter gedacht",
    rates: [{ label: "Balkonkraftwerk", value: "50 € je Anlage" }],
    conditions: [
      "Nur Mieterinnen und Mieter, die die Wohnung selbst bewohnen und dort mit Hauptwohnsitz gemeldet sind",
      "Gefördert werden nur Geräte, die ab dem 1. Mai 2026 gekauft wurden — ein früherer Kauf bekommt nichts",
      "Gefördert werden Geräte bis 2.000 W Modulleistung und 800 W Wechselrichterleistung",
      "Die Anlage muss mindestens fünf Jahre betrieben werden",
      "Je Wohneinheit ist nur ein Antrag möglich; Antrag in Papierform mit Kaufbeleg",
      "Dach-Photovoltaik ist nicht Teil des Programms",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // Zwei Bedingungen am 30.08.2026 aus der Förderrichtlinie selbst ergänzt
    // (Stand 30.04.2026, Volltext des städtischen PDF gelesen — die
    // Programmseite trägt weder Beträge noch Bedingungen, sie verlinkt nur die
    // Richtlinie). § 3 Abs. 6: „Gefördert werden Anlagen, welche ab dem
    // 01.05.2026 erworben werden." Das ist die teure der beiden — wer sein
    // Gerät vorher gekauft hat, bekommt nichts, und dazu stand bei uns kein
    // Wort. § 3 Abs. 7: „Die Anlage ist antragsgemäß mindestens 5 Jahre zu
    // betreiben." Alles Übrige zellgleich bestätigt.
  },

  // ── Kommune – erste Funde der URL-Suche, 18.08.2026 ─────────────────────────
  //
  // Diese Städte standen in KEINER erfassten Liste: Für sie kannten wir nur die
  // Startseite der Verwaltung. Die Förderseite hat erst der neue Suchlauf auf
  // der Amtsdomain gefunden. Neuwied fördert damit 380 Balkonkraftwerke im Jahr,
  // Rodgau hält dafür 100.000 € bereit — beides lief bisher an uns vorbei.

  "neuwied-balkonkraftwerke": {
    id: "neuwied-balkonkraftwerke", name: "Kommunales Förderprogramm Balkonkraftwerke",
    traeger: "Stadt Neuwied", level: "kommune", region: "Neuwied",
    bundesland: "Rheinland-Pfalz", agsCode: "07138045",
    url: "https://www.neuwied.de/klimaschutz/foerderungen",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale je Haushalt für ein Balkonkraftwerk",
    maxFoerderung: "max. 100 € je Haushalt",
    rates: [{ label: "Balkonkraftwerk", value: "100 € pauschal" }],
    conditions: [
      "Antragsberechtigt sind Eigentümerinnen und Eigentümer ebenso wie Mieterinnen und Mieter",
      "Mietende brauchen die schriftliche Zustimmung der Vermieterseite",
      "Der Antrag läuft über ein Online-Formular",
      "Der Topf umfasst 38.000 € und reicht für 380 Anlagen",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPauschale: 100,
  },

  "rodgau-balkonsolar": {
    id: "rodgau-balkonsolar", name: "Förderung von Balkon-Solaranlagen",
    traeger: "Stadt Rodgau", level: "kommune", region: "Rodgau",
    bundesland: "Hessen", agsCode: "06438011",
    url: "https://www.rodgau.de/de/leben/stadtplanung-umwelt-mobiltaet/umwelt/foerderung-von-balkon-solaranlagen/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteil des Rechnungsbetrags eines Balkonkraftwerks",
    maxFoerderung: "max. 200 € je Anlage",
    rates: [{ label: "Balkonkraftwerk", value: "25 % des Rechnungsbetrags, max. 200 €" }],
    conditions: [
      "Die Antragsfrist ist der 31. Dezember des jeweiligen Förderjahres",
      "Mietende sollten sich eine schriftliche Einverständniserklärung der Vermieterseite geben lassen",
      "Vergeben wird nach Eingang, bis der Jahrestopf von 100.000 € leer ist",
      "Die Richtlinie läuft bis zum 31. Dezember 2026",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPercentOfCost: 0.25, balkonCap: 200,
  },

  "tuebingen-balkon-pv": {
    id: "tuebingen-balkon-pv", name: "Balkon-PV für Inhaber der KreisBonusCard",
    traeger: "Universitätsstadt Tübingen", level: "kommune", region: "Tübingen",
    bundesland: "Baden-Württemberg", agsCode: "08416041",
    url: "https://tuebingen.de/1620/47436.html",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Hoher Anteil der Anschaffungskosten — aber nur mit KreisBonusCard",
    maxFoerderung: "max. 800 € je Wohnung",
    rates: [{ label: "Balkonkraftwerk (nur mit KreisBonusCard)", value: "bis zu 75 % der Anschaffungskosten, max. 800 €" }],
    conditions: [
      "Antragsberechtigt sind ausschließlich Inhaberinnen und Inhaber der KreisBonusCard oder KreisBonusCard extra",
      "Gefördert werden Wohngebäude im Stadtgebiet Tübingen",
      "Anträge laufen über tuebingen-macht-blau.de/balkon-pv",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // KEIN Rechenwert, obwohl 75 % und 800 € ausdrücklich dastehen: Die Karte
    // ist eine Sozialleistung mit Einkommensprüfung, die der Rechner nicht kennt.
    // 800 € allen zu versprechen wäre bei einem 600-€-Set eine Förderung über
    // dem Kaufpreis — und für die große Mehrheit schlicht falsch. Dieselbe
    // Zurückhaltung wie beim München-Pass, der Stuttgarter FamilienCard und dem
    // Holzgerlinger Familien- und Sozialpass.
  },

  "zweibruecken-balkonkraftwerke": {
    id: "zweibruecken-balkonkraftwerke", name: "Förderung Balkonkraftwerke",
    traeger: "Stadt Zweibrücken", level: "kommune", region: "Zweibrücken",
    // Fünfstellig, nicht "07320000": Zweibrücken ist eine kreisfreie Stadt, und
    // dafür sieht das Schlüsselschema fünf Stellen vor (Land 2, Kreis/kreisfreie
    // Stadt 5, Gemeinde 8). Achtstellig gefasst war der Schlüssel ENGER als der
    // Verzeichniseintrag der Stadt — die Zuordnung fand ihn deshalb nicht, und
    // Zweibrücken stand als einzige kreisfreie Stadt ohne Seite da, obwohl sie
    // seit Juni im Verzeichnis steht. Für den Rechner ändert sich nichts: Beide
    // Fassungen sind Präfix derselben einen Gemeinde.
    bundesland: "Rheinland-Pfalz", agsCode: "07320",
    url: "https://www.zweibruecken.de/de/verwaltung/aemter/stadtbauamt/klimaschutz-und-klimaanpassung/klimaschutz/balkonkraftwerke-foerderung/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale nach Zahl der Module",
    maxFoerderung: "max. 180 € je Wohneinheit",
    rates: [
      { label: "Ein Modul (300 W)", value: "90 € pauschal" },
      { label: "Zwei Module (600 W)", value: "180 € pauschal" },
    ],
    conditions: [
      "Antragsberechtigt sind Privatpersonen mit Hauptwohnsitz in Zweibrücken",
      "Je Wohneinheit wird höchstens ein Balkonkraftwerk gefördert",
      "Gefördert werden nur Anlagen, die ab dem 1. Juli 2024 gekauft wurden",
      "Der Antrag wird nach Installation und Registrierung gestellt",
      "Mietende sollten vor der Anschaffung mit der Vermieterseite sprechen",
      "Das Programm ist mit 126.000 € ausgestattet; danach werden keine Anträge mehr bewilligt",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // Die Staffel läuft über die MODULZAHL, der Rechner kennt die Modulleistung
    // — 300 W je Modul ist die Umrechnung, die die Stadt selbst in ihre Tabelle
    // geschrieben hat. Ein typisches Set mit 800 Wp landet damit in der zweiten
    // Stufe, was der Sache entspricht (zwei Module).
    balkonTiers: [{ upTo: 300, amount: 90 }, { upTo: 999999, amount: 180 }],
  },

  "unterhaching-energiesparen": {
    id: "unterhaching-energiesparen", name: "Förderprogramm Energiesparen und Klimaschutz",
    traeger: "Gemeinde Unterhaching", level: "kommune", region: "Unterhaching",
    bundesland: "Bayern", agsCode: "09184148",
    url: "https://www.unterhaching.de/klimaschutz/foerderprogramm-energiesparen-klimaschutz",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Anteil der Netto-Investitionskosten, je Baustein eigener Höchstbetrag",
    maxFoerderung: "max. 2.000 € für die PV-Anlage",
    rates: [
      { label: "Photovoltaik", value: "10 % der Netto-Investitionskosten, max. 2.000 €" },
      { label: "Batteriespeicher", value: "10 % der Netto-Investitionskosten, max. 1.000 €" },
      { label: "Heizungsoptimierung", value: "10 % der Netto-Investitionskosten, max. 500 €" },
    ],
    conditions: [
      "Der Antrag ist vor Beauftragung oder Bestellung zu stellen",
      "Antragsberechtigt sind Eigentümer, Erbbauberechtigte, Mieter und Pächter mit Zustimmung des Eigentümers sowie Kleinstunternehmen",
      "Balkonkraftwerke sind nicht Teil der Richtlinie",
    ],
    combinableWith: BUND,
    percentOfCost: 0.1, pvCap: 2000,
    // Gerechnet wird nur der PV-Baustein. Der Speicher hat denselben Satz, aber
    // einen eigenen Deckel — das Modell kennt für Prozentsätze nur EINEN Topf
    // und würde beim Zusammenrechnen den falschen Deckel ziehen. Die Wirkung
    // geht zu unseren Ungunsten (bis zu 1.000 € nicht angesetzt), und das ist
    // die richtige Richtung: lieber eine angenehme Überraschung als eine
    // eingeplante Zahl, die nicht kommt.
  },

  "hueckelhoven-balkonkraftwerke": {
    id: "hueckelhoven-balkonkraftwerke", name: "Förderung Balkonkraftwerke",
    traeger: "Stadt Hückelhoven", level: "kommune", region: "Hückelhoven",
    bundesland: "Nordrhein-Westfalen", agsCode: "05370020",
    url: "https://www.hueckelhoven.de/erfolgreiche-foerderprogramme-gehen-weiter/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale je Balkonkraftwerk bis 800 W",
    maxFoerderung: "max. 150 € je Anlage",
    rates: [{ label: "Balkonkraftwerk bis 800 W", value: "150 € je Anlage" }],
    conditions: [
      "Gefördert werden Anlagen mit höchstens 800 W Leistung",
      "Das Programm läuft seit 2024; im ersten Jahr wurden 139 Anträge bewilligt",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPauschale: 150,
  },

  "weinheim-effizienz": {
    id: "weinheim-effizienz", name: "Zuschuss Gebäudehülle und Anlagentechnik",
    traeger: "Stadt Weinheim", level: "kommune", region: "Weinheim",
    bundesland: "Baden-Württemberg", agsCode: "08226096",
    url: "https://www.weinheim.de/startseite/stadtthemen/foerderung.html",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Aufstockung der Bundesförderung für Gebäudehülle und Anlagentechnik — keine eigene PV-Förderung",
    maxFoerderung: "max. 5.000 € je Gebäude",
    rates: [
      { label: "Gebäudehülle und Anlagentechnik (mit Wärmepumpe)", value: "max. 5.000 € je Gebäude" },
      { label: "Hausanschluss ans Wärmenetz", value: "bis zu 1.000 €" },
      { label: "Photovoltaik", value: "keine Förderung, nur kostenlose Beratung" },
    ],
    conditions: [
      "Der Zuschuss stockt die Bundesförderung für effiziente Gebäude auf und steht nicht für sich",
      "Für Photovoltaik und Balkonkraftwerke bietet die Stadt keine eigene Förderung, sondern nur eine kostenlose Beratung",
      "Die Maßnahme muss bis spätestens 31.12.2026 umgesetzt sein",
      "Der Zuschuss steht unter dem Vorbehalt, dass der Gemeinderat die Mittel bereitstellt",
      "Bei der Stadt registriert wird erst, nachdem der Zuwendungsbescheid des Bundes da ist",
    ],
    combinableWith: BUND,
    foerdert: ["waermepumpe"],
    // REIHENFOLGE ergänzt (01.09.2026, an der Amtsseite gelesen). Die Stadt
    // schreibt: „Nachdem Sie den Zuwendungsbescheid für die Bundesförderung
    // erhalten haben, registrieren Sie sich elektronisch oder schriftlich bei der
    // Förderstelle der Stadt Weinheim." Wir sagten bisher nur, der Zuschuss stocke
    // die Bundesförderung auf — nicht, dass die Stadt erst nach dem Bundesbescheid
    // an der Reihe ist. Wer sich zuerst bei der Stadt meldet, wartet auf eine
    // Bestätigung, die es in dieser Reihenfolge nicht gibt. Die Reihenfolge ist im
    // Förderbereich die teuerste Auskunft (siehe lib/beg-antrag.ts), deshalb steht
    // sie hier ausdrücklich und nicht zwischen den Zeilen.
    // Die beiden letzten Bedingungen am 30.08.2026 an der Amtsseite ergänzt.
    // Sie standen dort die ganze Zeit und fehlten bei uns: „Um den Zuschuss zu
    // erhalten, muss die Maßnahme bis spätestens 31.12.2026 umgesetzt werden"
    // und „unter dem Vorbehalt der Mittelbereitstellung durch den Gemeinderat".
    // Die Frist ist die wichtigere von beiden — eine Wärmepumpe, die im Herbst
    // beauftragt und im Frühjahr eingebaut wird, fällt damit heraus, und das
    // steht in keinem Satz, den wir bisher gezeigt haben.
    //
    // Der Höchstbetrag gilt Gebäudehülle UND Anlagentechnik zusammen, also
    // Dämmung und Wärmeerzeuger in einem Topf. Wieviel davon auf die Wärmepumpe
    // entfällt, hängt am übrigen Vorhaben — das kann der Rechner nicht wissen.
    // Bemerkenswert ist der Eintrag trotzdem: Es ist die erste kommunale
    // Wärmepumpen-Förderung im Katalog, die überhaupt noch Anträge annimmt.
  },

  "ottobrunn-foerderprogramme": {
    id: "ottobrunn-foerderprogramme", name: "Kommunale Förderprogramme Energie",
    traeger: "Gemeinde Ottobrunn", level: "kommune", region: "Ottobrunn",
    bundesland: "Bayern", agsCode: "09184136",
    url: "https://www.ottobrunn.de/online-rathaus/buergerservice/foerderprogramme",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteil der Investition bei Ost-/Westdächern, Balkonkraftwerk nach eingesparter Strommenge",
    maxFoerderung: "max. 200 € fürs Balkonkraftwerk",
    rates: [
      { label: "Photovoltaik auf Ost- oder Westdach", value: "10 % der Investitionskosten" },
      { label: "Balkonkraftwerk", value: "0,20 € je eingesparter kWh, max. 200 €" },
    ],
    conditions: [
      "Der PV-Zuschuss gilt ausdrücklich Ost- und Westdächern, nicht der Südausrichtung",
      "Ein Batteriespeicher wird nicht bezuschusst",
      "Beim Balkonkraftwerk sind mindestens 10 % oder 75 kWh Jahreseinsparung nachzuweisen",
      "Der Antrag ist vor Auftragserteilung zu stellen",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    // Kein Rechenwert, und zwar zweimal aus verschiedenen Gründen: Der
    // PV-Zuschuss gilt NUR Ost- und Westdächern — die Förderung an eine
    // Dachausrichtung zu knüpfen kann das Modell nicht, und für ein Süddach
    // wären 10 % schlicht falsch. Das Balkon-Geld bemisst sich an der
    // eingesparten Strommenge, also am Verbrauchsverhalten und nicht an der
    // Anlage. Beides sind sinnvolle Regeln der Gemeinde und für einen
    // allgemeinen Rechner nicht abbildbar.
  },

  "feucht-klimaschutz": {
    id: "feucht-klimaschutz", name: "Klimaschutz-Förderprogramme",
    traeger: "Markt Feucht", level: "kommune", region: "Feucht",
    bundesland: "Bayern", agsCode: "09574123",
    // Adresse am 30.08.2026 auf die Zielseite der Weiterleitung nachgezogen:
    // Ohne „www." antwortet der Server mit 301. Der Fingerabdruck-Wächter
    // meldete diese Seite dadurch als „unerreichbar/verändert", ohne dass sich
    // am Inhalt etwas bewegt hätte.
    url: "https://www.feucht.de/bauen-wirtschaft-umwelt/klimaschutz-foerderprogramme/foerderprogramme",
    stand: "August 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp und gestaffelt nach Speichergröße — Jahresmittel aufgebraucht",
    maxFoerderung: "max. 1.000 € für die PV-Anlage",
    rates: [
      { label: "Photovoltaik", value: "150 € je kWp, max. 1.000 €" },
      { label: "Speicher unter 4 kWh", value: "300 €" },
      { label: "Speicher 4 bis 6 kWh", value: "400 €" },
      { label: "Speicher 6 bis 8 kWh", value: "500 €" },
      { label: "Speicher ab 8 kWh", value: "600 €" },
    ],
    conditions: [
      "Die Mittel für das laufende Jahr sind ausgeschöpft; Anträge sind derzeit nicht möglich",
      "Balkonkraftwerke sind nicht Teil dieses Programms — die Feuchter Gemeindewerke fördern sie nach Angabe der Gemeinde gesondert",
    ],
    combinableWith: BUND,
    // Der Hinweis auf die Gemeindewerke steht wörtlich auf derselben Seite
    // („Fördermöglichkeiten der Feuchter Gemeindewerke — Die fgw fördert unter
    // anderem den Kauf von energieeffizienten Geräten und von
    // Balkon-Solaranlagen.", am 30.08.2026 gelesen). Unser Satz
    // „Balkonkraftwerke sind nicht Teil des Programms" war für sich richtig und
    // als Auskunft trotzdem irreführend: Wer ihn liest, schließt daraus, dass es
    // in Feucht überhaupt kein Balkon-Geld gibt — die Gemeinde selbst sagt das
    // Gegenteil. Ein eigener Katalog-Eintrag für das fgw-Programm entsteht
    // daraus NICHT im Vorbeigehen: Betrag und Bedingungen stehen beim
    // Versorger, nicht hier, und ein Programm einzuschalten ist keine
    // Selbstbedienung des Wächters.
    //
    // Sätze und Staffel sind vollständig belegt und ließen sich sofort rechnen —
    // sie bleiben ohne Rechenwert, solange der Topf leer ist. Sobald der
    // Haushalt wieder öffnet, sind es 150 €/kWp (max. 1.000 €) und die
    // Speicherstaffel 300/400/500/600 €.
  },

  "limburgerhof-balkonkraftwerke": {
    id: "limburgerhof-balkonkraftwerke", name: "Förderung von Balkonkraftwerken",
    traeger: "Gemeinde Limburgerhof", level: "kommune", region: "Limburgerhof",
    bundesland: "Rheinland-Pfalz", agsCode: "07338017",
    url: "https://www.limburgerhof.de/service/aktionen-und-kampagnen/foerderung-von-balkonkraftwerken/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Einmaliger Zuschuss je Balkonkraftwerk",
    maxFoerderung: "200 € einmalig",
    rates: [{ label: "Balkonkraftwerk", value: "200 € einmalig" }],
    conditions: [
      "Der Antrag wird erst nach der Anschaffung gestellt; eine Vorabgenehmigung ist nicht nötig",
      "Mietende brauchen die Zustimmung der Vermieterseite oder der Eigentümergemeinschaft und müssen sie nachweisen",
      "Beantragt werden kann bis zum 31. Dezember 2026",
      "Ist das Budget ausgeschöpft, besteht kein Anspruch auf weitere Förderung",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPauschale: 200,
  },

  "gernsheim-foerderprogramme": {
    id: "gernsheim-foerderprogramme", name: "Förderprogramme der Stadt Gernsheim",
    traeger: "Stadt Gernsheim", level: "kommune", region: "Gernsheim",
    bundesland: "Hessen", agsCode: "06433004",
    url: "https://www.gernsheim.de/klima-naturschutz/foerderprogramme-der-stadt-gernsheim/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp für die Dachanlage, Pauschale fürs Balkonkraftwerk",
    maxFoerderung: "max. 400 € für die Dachanlage",
    rates: [
      { label: "Dach-Photovoltaik", value: "50 € je kWp, max. 400 €" },
      { label: "Balkonkraftwerk", value: "50 € pauschal" },
    ],
    conditions: [
      "Maßgeblich ist der Tag der Auftragserteilung; er darf nicht vor dem 1. April 2022 liegen",
      "Ausgezahlt wird nach Inbetriebnahme und Vorlage der Unterlagen",
      "Die Dachanlage wird nur privaten Eigentümern auf eigenen Gebäuden gefördert",
      "Die Förderung steht unter dem Vorbehalt der Haushaltsmittel und kann durch eine Haushaltssperre beschränkt werden",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    pvPerKwp: 50, pvCap: 400,
    balkonPauschale: 50,
  },

  "gudensberg-balkonkraftwerke": {
    id: "gudensberg-balkonkraftwerke", name: "Förderung Balkonkraftwerke",
    traeger: "Stadt Gudensberg", level: "kommune", region: "Gudensberg",
    bundesland: "Hessen", agsCode: "06634007",
    url: "https://www.gudensberg.de/wirtschaft-und-stadtentwicklung/klimaschutz/privatfoerderung/balkonkraftwerke/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale je Balkonkraftwerk — Kontingent von 60 Anlagen",
    maxFoerderung: "75 € pauschal",
    rates: [{ label: "Balkonkraftwerk", value: "75 € pauschal" }],
    conditions: [
      "Der Kauf darf erst nach dem Bewilligungsbescheid erfolgen; ein früherer Erwerb schließt die Förderung aus",
      "Antragsberechtigt sind Eigentümer und Mieter mit Erstwohnsitz in Gudensberg",
      "Gefördert werden nur Geräte bis 1.000 € Bruttokaufpreis, höchstens 2.000 Wp Module und 800 VA Wechselrichter",
      "Das Programm ist auf 60 Anlagen begrenzt und endet, sobald das Kontingent ausgeschöpft ist",
      "Je Haushalt wird einmal gefördert; Leasing, Ratenkauf und Gebrauchtgeräte sind ausgeschlossen",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPauschale: 75,
  },

  "poing-energie": {
    id: "poing-energie", name: "Förderrichtlinien Energie",
    traeger: "Gemeinde Poing", level: "kommune", region: "Poing",
    bundesland: "Bayern", agsCode: "09175135",
    url: "https://www.poing.de/bauen-umwelt/energie-klima/foerderrichtlinien",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteil der Kosten für Balkonkraftwerk und Dachanlage, dazu Pauschalen für Wärmepumpen",
    maxFoerderung: "max. 2.000 € für die Dachanlage, 250 € fürs Balkonkraftwerk",
    rates: [
      { label: "Balkonkraftwerk", value: "25 % der förderfähigen Kosten, max. 250 €" },
      { label: "PV-Anlage auf Dach oder Fassade", value: "10 % der förderfähigen Kosten, max. 2.000 €" },
      { label: "Wärmepumpe (Grundwasser oder Erdwärme)", value: "800 € je Anlage" },
      { label: "Wärmepumpe (Luft-Wasser)", value: "600 € je Anlage" },
    ],
    conditions: [
      "Der Förderantrag muss vor dem Kauf gestellt und bewilligt sein",
      "Dach- und Fassadenanlagen werden seit April 2026 bezuschusst, Balkonkraftwerke seit Februar 2023",
      "Die Wärmepumpen-Förderung steht in einer eigenen Richtlinie, nicht in der für Photovoltaik",
      "Ohne Bundesförderung zahlt die Gemeinde nicht — nachzuweisen sind der Antrag beim BAFA und später der Auszahlungsbescheid",
      "Sie gilt nur im Bestand, wenn die Vorgängerheizung mindestens zwei Jahre alt war",
      "Die Anlage muss der BAFA-Förderrichtlinie entsprechen und der hydraulische Abgleich durchgeführt sein",
      "Gerechnet wird der Satz der Luft-Wasser-Pumpe; für Erdwärme oder Grundwasser sind es 200 € mehr",
      "Gefördert werden nur Gebäude im Gemeindegebiet Poing",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon", "waermepumpe"],
    percentOfCost: 0.1, pvCap: 2000,
    balkonPercentOfCost: 0.25, balkonCap: 250,
    // DIE ERSTE RECHENBARE KOMMUNALE WÄRMEPUMPEN-FÖRDERUNG im Katalog. Am
    // 19.08.2026 im Volltext der Richtlinie gelesen (Abschnitt 5.2.2):
    //   „Grundwasser-Wasserwärmepumpe: 800 € je Anlage
    //    Erdwärme-Wasserwärmepumpe:    800 € je Anlage
    //    Luft-Wasserwärmepumpe:        600 € je Anlage"
    //
    // Gerechnet wird der NIEDRIGSTE Satz. Die Sätze unterscheiden nach
    // Wärmequelle, und obwohl der Rechner Luft/Wasser und Sole/Wasser kennt,
    // trägt das Modell dafür kein Feld. 600 € ist zugleich der Satz der
    // Luft-Wasser-Pumpe, also des mit Abstand häufigsten Falls — wer eine
    // Erdwärmepumpe baut, bekommt 200 € mehr als hier steht. Die Richtung ist
    // die gewohnte: lieber eine angenehme Überraschung als eine eingeplante
    // Zahl, die nicht kommt.
    wpPauschale: 600,
    // KORREKTUR 19.08.2026 (Volltext in docs/quellen/): Hier stand als Bedingung
    // „setzt eine vorherige Energieberatung voraus". Das ist falsch — die
    // Energieberatung verlangt Poing für DÄMMUNG und FENSTER (Abschnitt 5.1.6),
    // die Unterlagenliste der Wärmepumpe (5.2.4) nennt sie nicht. Verlangt wird
    // dort stattdessen der Nachweis der BAFA-Antragstellung und beim Abruf der
    // Auszahlungsbescheid; zusammen mit Abschnitt 5.2 („gefördert werden
    // Heizsysteme, die nach den Richtlinien des BAFA im Rahmen der BEG gefördert
    // werden") setzt der Zuschuss die Bundesförderung also VORAUS, statt mit ihr
    // zu konkurrieren. Das ist zugleich der Beleg dafür, dass er neben der BEG
    // stehen darf — Abschnitt 3.4 erlaubt die Kombination ausdrücklich.
  },

  "goch-balkonkraftwerke": {
    id: "goch-balkonkraftwerke", name: "Bürgerförderung Balkonkraftwerke",
    traeger: "Stadt Goch", level: "kommune", region: "Goch",
    bundesland: "Nordrhein-Westfalen", agsCode: "05154016",
    url: "https://www.goch.de/bauen-wohnen/buergerfoerderungen/balkonkraftwerke",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteil der Gesamtkosten inklusive Befestigungsmaterial",
    maxFoerderung: "max. 200 €",
    rates: [{ label: "Balkonkraftwerk", value: "50 % der förderfähigen Gesamtkosten, max. 200 €" }],
    conditions: [
      "Der Antrag muss vor dem Kauf gestellt werden; erst nach Bewilligung ist der Kauf förderfähig",
      "Antragsberechtigt sind Eigentümer, Eigentümergemeinschaften, Erbbauberechtigte und Mieter für die selbst bewohnte Wohnung",
      "Gefördert werden Anlagen bis 2 kW Modulleistung und 800 W Wechselrichter",
      "Je Wohneinheit wird einmal gefördert",
      "Befestigungsmaterial zählt zu den förderfähigen Kosten",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPercentOfCost: 0.5, balkonCap: 200,
  },

  "herzberg-balkonkraftwerke": {
    id: "herzberg-balkonkraftwerke", name: "Förderprogramm Balkonkraftwerke",
    traeger: "Stadt Herzberg am Harz", level: "kommune", region: "Herzberg am Harz",
    bundesland: "Niedersachsen", agsCode: "03159019",
    url: "https://www.herzberg.de/service/themen/klima-und-umwelt/klimaschutz/foerderung-balkonkraftwerke/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale je Balkonkraftwerk",
    maxFoerderung: "bis zu 100 € je Anlage",
    rates: [{ label: "Balkonkraftwerk", value: "bis zu 100 € je Anlage" }],
    conditions: [
      "Der Antrag muss vor Beginn des Vorhabens gestellt und bewilligt sein; als Beginn gilt bereits die Bestellung",
      "Antragsberechtigt sind Mietende und private Hausbesitzende; bei Mietobjekten ist die Genehmigung der Vermietenden nötig",
      "Je Wohneinheit und Zähler wird eine Anlage gefördert, bei Mietobjekten bis zu fünf je Antragsteller",
      "Maßnahmen, die schon aus Bundes- oder Landesmitteln gefördert werden, sind ausgeschlossen",
      "Der Topf umfasst 20.000 € für 200 Anlagen; vergeben wird nach Eingang",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPauschale: 100,
  },

  "herbrechtingen-balkonkraftwerke": {
    id: "herbrechtingen-balkonkraftwerke", name: "Zuschussprogramm Balkonkraftwerke",
    traeger: "Stadt Herbrechtingen", level: "kommune", region: "Herbrechtingen",
    bundesland: "Baden-Württemberg", agsCode: "08135020",
    url: "http://www.herbrechtingen.de/Startseite/stadt+_+buerger/foerderprogramm+balkonkraftwerke.html",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale je Modul, höchstens zwei Module je Wohneinheit",
    maxFoerderung: "max. 100 € je Wohneinheit",
    rates: [{ label: "Balkonkraftwerk", value: "50 € je Modul, höchstens zwei Module" }],
    conditions: [
      "Je Wohneinheit mit abgeschlossenem Stromkreis werden höchstens zwei Module gefördert",
      "Dem Antrag sind die Originalrechnung und die Anmeldung im Marktstammdatenregister beizulegen",
      "Bei einer Miet- oder Eigentumswohnung ist die Erlaubnis der Vermieterseite oder der Eigentümergemeinschaft nötig",
      "Es besteht kein Rechtsanspruch; gefördert wird im Rahmen der Haushaltsmittel",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // Gestaffelt nach Modulleistung, weil der Rechner Module nicht zählt: Ein
    // Ein-Modul-Set liegt bei rund 500 Wp, ab zwei Modulen darüber. Der Deckel
    // von zwei Modulen ist damit als Höchstbetrag abgebildet.
    balkonTiers: [{ upTo: 600, amount: 50 }, { upTo: 999999, amount: 100 }],
  },

  "weyhe-klimaschutz": {
    id: "weyhe-klimaschutz", name: "Klimaschutz-Förderung",
    traeger: "Gemeinde Weyhe", level: "kommune", region: "Weyhe",
    bundesland: "Niedersachsen", agsCode: "03251047",
    url: "https://www.weyhe.de/wohnen-bauen/klima-und-umweltschutz/klimaschutz-foerderung/",
    stand: "August 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Einmalbetrag für Dachanlage oder Speicher — Mittel für das laufende Jahr vergeben",
    maxFoerderung: "500 € je Fördertatbestand",
    rates: [
      { label: "Dach-Photovoltaik ab 3 kWp", value: "einmalig 500 €, höchstens 50 % der Kosten" },
      { label: "Batteriespeicher ab 2,5 kWh nutzbar", value: "einmalig 500 €, höchstens 50 % der Kosten" },
    ],
    conditions: [
      "Die Fördermittel des laufenden Jahres sind vergeben; eine Antragstellung ist nicht mehr möglich",
      "Je Haushalt wird nur ein Fördertatbestand gefördert — PV und Speicher lassen sich nicht kombinieren",
      "Der Antrag ist vor Beginn zu stellen; begonnen werden darf erst nach dem Zuwendungsbescheid",
      "Die Maßnahme darf nicht anderweitig mit öffentlichen Mitteln gefördert werden",
      "Anlagen im Neubau und bei ohnehin verpflichtender Dacherneuerung sind ausgeschlossen",
      "Im Haushaltsjahr 2026 stehen 50.000 € für alle neun Fördertatbestände zusammen bereit",
    ],
    // `combinableWith: []` statt BUND (30.08.2026): Die Richtlinie 2026 schreibt
    // in Nr. 1 wörtlich „Mit Ausnahme des Zuschusses zu Energieberatungen, dürfen
    // die Fördermittel nicht mit Fördermitteln von anderen Stellen kumuliert
    // werden." Der Text daneben sagte das schon, das strukturierte Feld
    // behauptete das Gegenteil — dieselbe Fehlerklasse wie eine Beschriftung,
    // die etwas anderes sagt als die Zahl. Dasselbe Muster wie bei Gaiberg.
    combinableWith: [],
    // Kein Rechenwert: Der Topf ist leer. Der entscheidende Halbsatz „begrenzt
    // auf 50 % der Kosten" steht zudem NUR in der Richtlinie, nicht auf der
    // Seite — wer die Seite allein liest, hält es für eine reine Pauschale.
    //
    // Am 30.08.2026 an der Richtlinie 2026 („Richtlinie 2026 zur Förderung von
    // Maßnahmen des Klimaschutzes", von der Programmseite verlinkt) im Volltext
    // nachgelesen; alle übrigen Angaben zellgleich: Nr. 2.1 „Batteriespeicher-
    // systeme in Verbindung mit einer Photovoltaikanlage … mit einmalig 500 Euro.
    // Die Förderung ist auf 50 Prozent der förderfähigen Kosten … begrenzt",
    // Mindestkapazität 2,5 kWh; Nr. 2.2 „Dach-Photovoltaikanlage ab einer
    // Leistung von 3 kWp mit einmalig 500 Euro", ebenfalls 50 % gedeckelt;
    // Nr. 1 „Pro Haushalt ist nur ein Fördertatbestand förderfähig."
  },

  "moormerland-balkonkraftwerke": {
    id: "moormerland-balkonkraftwerke", name: "Förderung Balkonkraftwerke",
    traeger: "Gemeinde Moormerland", level: "kommune", region: "Moormerland",
    bundesland: "Niedersachsen", agsCode: "03457014",
    url: "https://www.moormerland.de/bauen-wohnen/foerderungen/balkonkraftwerke",
    stand: "August 2026", status: "unsicher", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je Balkonkraftwerk — derzeit kein ausgewiesenes Antragsfenster",
    rates: [{ label: "Balkonkraftwerk", value: "150 € Zuschuss" }],
    conditions: [
      "Die Seite dokumentiert nur zwei abgeschlossene Antragsfenster aus dem Jahr 2023",
      "Ein aktuelles Fenster ist nicht ausgewiesen, ein Ende des Programms aber auch nicht",
      "Gekauft werden darf erst nach der Bewilligung; vorher erworbene Geräte werden nicht bezuschusst",
      "Bei Überzeichnung entscheidet das Los",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // Status bewusst „unsicher" statt „aktiv": Der Betrag ist eindeutig, aber
    // seit Oktober 2023 gibt es kein ausgewiesenes Antragsfenster. Ein „aktiv"
    // würde eine Möglichkeit behaupten, die die Seite nicht belegt.
  },

  "bad-krozingen-balkon-pv": {
    id: "bad-krozingen-balkon-pv", name: "Balkon Photovoltaik (einkommensabhängig)",
    traeger: "Große Kreisstadt Bad Krozingen", level: "kommune", region: "Bad Krozingen",
    bundesland: "Baden-Württemberg", agsCode: "08315006",
    url: "https://www.bad-krozingen.de/Solar",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Hoher Anteil der Gesamtkosten — aber nur für einen einkommensbeschränkten Personenkreis",
    rates: [{ label: "Balkonkraftwerk (nur bei Einkommensgrenze)", value: "60 % der Gesamtkosten" }],
    conditions: [
      "Antragsberechtigt sind nur Haushalte mit kindergeldberechtigten Kindern unterhalb einer Einkommensgrenze: Alleinerziehende mit mindestens einem Kind unter 50.000 €, Familien mit mindestens einem Kind unter 60.000 €, mit mindestens zwei Kindern unter 70.000 € Bruttojahreseinkommen",
      "Ebenfalls berechtigt sind Empfänger von Bürgergeld, Sozialhilfe, Grundsicherung, Wohngeld oder Kinderzuschlag",
      "Der Antrag ist vor dem Kauf zu stellen; nur der Bewilligungsbescheid begründet einen Anspruch",
      "Mietende brauchen das Einverständnis der Vermieterseite oder der Eigentümergemeinschaft",
      "Je Haushalt ist nur ein Antrag möglich; Eigenbauten und überwiegend gebrauchte Anlagen sind ausgeschlossen",
      "Alternativ zahlt die Stadt 60 % direkt an einen ihrer beiden Kooperationspartner, der Haushalt trägt 40 % — bei jedem anderen Händler wird der Zuschuss nachträglich ausgezahlt",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // 60 % ohne Deckel ist der höchste Satz im ganzen Katalog — und bekommt
    // trotzdem KEINEN Rechenwert, weil er an eine Einkommensprüfung gebunden
    // ist, die der Rechner nicht kennt. Ihn allen zu versprechen wäre für die
    // große Mehrheit schlicht falsch. Dieselbe Zurückhaltung wie beim
    // München-Pass, der Tübinger KreisBonusCard und dem Holzgerlinger
    // Familien- und Sozialpass — nur wiegt sie hier am schwersten.
    //
    // Am 29.08.2026 am Richtlinien-Volltext nachgelesen (Richtlinie 2023, in
    // Kraft seit 04.09.2023; Antrags- und Auszahlungsformulare tragen 2026, das
    // Programm läuft also). Satz und Grenzen sind zellgleich, DREI eigene
    // Formulierungen waren es nicht — jede für sich ohne Wirkung aufs Geld, weil
    // hier ohnehin nichts gerechnet wird, und jede trotzdem eine falsche
    // Auskunft an den, der sie liest:
    //  * „Alleinerziehende unter 50.000 €" ließ das Kind weg. Die Richtlinie
    //    verlangt „mit einem oder mehreren kindergeldberechtigten Kindern" —
    //    ein Single ohne Kind las sich als berechtigt.
    //  * „mit einem Kind" / „mit zwei Kindern" ließ das „mindestens" weg und
    //    verengte damit in die Gegenrichtung: Eine Familie mit drei Kindern fällt
    //    unter die 70.000er-Grenze, nach unserem Satz gar nicht.
    //  * Die Direktzahlung gilt nur bei zwei namentlich genannten
    //    Kooperationspartnern, nicht bei „dem Händler".
  },

  "reichelsheim-steckersolar": {
    id: "reichelsheim-steckersolar", name: "Förderung von Stecker-Solaranlagen",
    traeger: "Gemeinde Reichelsheim (Odenwald)", level: "kommune", region: "Reichelsheim (Odenwald)",
    bundesland: "Hessen", agsCode: "06437013",
    url: "https://www.reichelsheim.de/leben-in-reichelsheim/bauen-wohnen/foerderung-von-stecker-solaranlagen/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale je Anlage, gestaffelt nach Leistung",
    maxFoerderung: "max. 100 € je Wohnung",
    rates: [
      { label: "Balkonkraftwerk 300 bis 450 W", value: "50 € einmalig" },
      { label: "Balkonkraftwerk über 450 bis 800 W", value: "100 € einmalig" },
    ],
    conditions: [
      "Antragsberechtigt sind Eigentümer, Vermieter und ausdrücklich auch Mieter im Gemeindegebiet",
      "Bei vermieteten Wohneinheiten ist die Erlaubnis der Vermieterseite nötig",
      "Der Antrag wird nach der Installation gestellt; Rechnung, Kontoauszug, Foto und Marktstammdatenregister-Anmeldung sind beizulegen",
      "Die Anlage ist fünf Jahre zu betreiben",
      "Unternehmen sind ausgeschlossen; gefördert wird einmal je Wohnung",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonTiers: [{ upTo: 450, amount: 50 }, { upTo: 999999, amount: 100 }],
  },

  "putzbrunn-klimaschutz": {
    id: "putzbrunn-klimaschutz", name: "Förderprogramm Energiewende und Klimaschutz",
    traeger: "Gemeinde Putzbrunn", level: "kommune", region: "Putzbrunn",
    bundesland: "Bayern", agsCode: "09184140",
    url: "https://www.putzbrunn.de/klimaschutz/zuschuesse",
    stand: "August 2026", status: "pausiert", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale fürs Balkonkraftwerk, Anteile für Speicher, Brauchwasser-Wärmepumpe und Split-Gerät",
    maxFoerderung: "max. 4.000 € je Jahr und 10.000 € in drei Jahren",
    rates: [
      { label: "Balkonkraftwerk", value: "100 €, mit Batteriespeicher zusätzlich 100 €" },
      { label: "Batteriespeicher (Erstinstallation)", value: "15 % der Investitionskosten, max. 1.000 €" },
      { label: "Brauchwasserwärmepumpe", value: "20 % der Kosten, max. 500 €" },
      { label: "Split-Klimagerät", value: "10 % der Kosten, max. 400 €" },
    ],
    conditions: [
      "Die Antragstellung ist erst nach Freigabe des Haushalts durch das Landratsamt möglich",
      "Beim Steckersolar sind ausdrücklich Mietende die Zielgruppe; Eigentümer mit eigenem Hausdach sind ausgeschlossen",
      "Bei allen übrigen Maßnahmen ist der Antrag vor Beginn zu stellen, beim Steckersolar binnen eines Monats nach Inbetriebnahme",
      "Die Förderquote darf auch bei mehreren Zuschüssen 50 % nicht überschreiten",
      "Die Richtlinie gilt bis zum 31. Dezember 2026; Anträge werden nicht ins Folgejahr übertragen",
    ],
    combinableWith: BUND,
    foerdert: ["pv", "balkon"],
    // Zwei Dinge, die hier bewusst NICHT passieren:
    //
    // Kein Rechenwert, obwohl die Sätze klar sind — die Seite sagt „Eine
    // Antragstellung wird mit Freigabe des Haushaltes durch das Landratsamt
    // möglich sein". Wer heute plant, kann nichts beantragen. Sobald die
    // Freigabe da ist, sind es 100 € fürs Steckersolar und 15 % (max. 1.000 €)
    // für den Speicher.
    //
    // Und die Wärmepumpe zählt NICHT als Wärmepumpen-Förderung: Gefördert wird
    // eine BRAUCHWASSER-Wärmepumpe für die Warmwasserbereitung, während unser
    // Wärmepumpen-Rechner die Heizung rechnet. Beides „Wärmepumpe" zu nennen
    // wäre dieselbe Wortgleichheit, die schon einmal einen Kessel-Nutzungsgrad
    // verwechselt hat.
  },

  "dettelbach-gestaltungssatzung-pv": {
    id: "dettelbach-gestaltungssatzung-pv", name: "Photovoltaik im Gestaltungssatzungsgebiet",
    traeger: "Stadt Dettelbach", level: "kommune", region: "Dettelbach",
    bundesland: "Bayern", agsCode: "09675117",
    url: "http://www.dettelbach.de/kommunale-foerderprogramme/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp für denkmalgerechte Anlagen — nur im Gebiet der Gestaltungssatzung",
    maxFoerderung: "max. 1.500 €",
    rates: [{ label: "Photovoltaik mit Speicher", value: "150 € je kWp (3 bis 10 kWp), höchstens 10 % der Maßnahme und 1.500 €" }],
    conditions: [
      "Gefördert wird nur im räumlichen Geltungsbereich der Gestaltungssatzung, also im Wesentlichen der Altstadt",
      "Verlangt sind Anlagen mit höchsten Gestaltungsanforderungen an Gebäudeintegration, Farbigkeit und Zuschnitt der Module",
      "Ein Batteriespeicher ist Pflichtbestandteil, wird aber nicht gesondert gefördert",
      "Ab 2026 ist der Antrag vor Ausführung zu stellen; begonnen werden darf erst nach der Bewilligung",
      "Mieter brauchen die Zustimmung der Eigentümerseite in Textform",
    ],
    combinableWith: BUND,
    // Der Satz wäre ausdrückbar — die BEDINGUNG nicht: Er gilt nur für
    // denkmalgerechte Sondermodule im Altstadtgebiet. Wer in Dettelbach eine
    // normale Dachanlage plant, bekommt nichts, und genau das trifft die große
    // Mehrheit. Ein Abzug für alle wäre hier falscher als gar keine Zahl.
  },

  // ── Kommune – zweiter Durchgang der Leseliste, 19.08.2026 ───────────────────

  "gailingen-balkonsolar": {
    id: "gailingen-balkonsolar", name: "Förderung Balkon-Solaranlagen",
    traeger: "Gemeinde Gailingen am Hochrhein", level: "kommune", region: "Gailingen am Hochrhein",
    bundesland: "Baden-Württemberg", agsCode: "08335026",
    url: "http://www.gailingen.de/infrastruktur-bauen/energie-klimaschutz/ziele-massnahmen-und-foerderungen",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale je Wohneinheit, unabhängig von der Modulzahl",
    maxFoerderung: "100 € je Anlage",
    // „je Wohneinheit" auf „je Anlage" korrigiert (25.08.2026): Die Gemeinde
    // schreibt „Die Förderung beträgt pauschal 100,00 € pro Anlage." Der
    // Unterschied ist keine Wortklauberei — mit „je Wohneinheit" liest sich der
    // Satz als Begrenzung auf einen Zuschuss je Wohnung, die der Träger so
    // nirgends ausspricht. Betrag und Kontingent (20 Anträge je Jahr) am selben
    // Tag zellgleich bestätigt.
    rates: [{ label: "Balkonkraftwerk", value: "100 € pauschal je Anlage" }],
    conditions: [
      "Antragsberechtigt sind Vermieter, Mieter und Eigentümer einer Wohneinheit in Gailingen",
      "Der Antrag wird nach dem Kauf gestellt; Rechnung und Foto der montierten Anlage sind beizulegen",
      "Gefördert werden nur Geräte, die im laufenden Jahr gekauft wurden",
      "Für das Jahr stehen Mittel für 20 Anträge bereit",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPauschale: 100,
  },

  "hattenhofen-balkonsolar": {
    id: "hattenhofen-balkonsolar", name: "Förderprogramm Balkonsolarkraftwerk",
    traeger: "Gemeinde Hattenhofen", level: "kommune", region: "Hattenhofen",
    bundesland: "Baden-Württemberg", agsCode: "08117029",
    url: "http://www.hattenhofen.de/de/umwelt/energie-klima/foerderprogramm-balkonsolarkraftwerk",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Betrag je Modul, gedeckelt je Anlage",
    maxFoerderung: "max. 100 € je Anlage",
    rates: [{ label: "Balkonkraftwerk", value: "50 € je Modul, höchstens 100 € je Anlage" }],
    conditions: [
      "Antragsberechtigt sind Mieter und Eigentümer von Wohnungen in Hattenhofen",
      "Der Antrag wird nach Kauf und Installation gestellt, mit Rechnung und Foto",
      "Gefördert wird rückwirkend ab Rechnungsdatum 1. Januar 2025 bis 31. Dezember 2026",
      "Bewilligt wird nach Eingang im Rahmen der Haushaltsmittel",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonTiers: [{ upTo: 600, amount: 50 }, { upTo: 999999, amount: 100 }],
  },

  "gaiberg-steckersolar": {
    id: "gaiberg-steckersolar", name: "Förderprogramm Stecker-Solaranlagen",
    traeger: "Gemeinde Gaiberg", level: "kommune", region: "Gaiberg",
    bundesland: "Baden-Württemberg", agsCode: "08226022",
    url: "http://www.gaiberg.de/gemeinde-info/klimaschutz/foerderprogramm-stecker-solaranlagen",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale je Anlage — Kontingent von zehn Zuschüssen",
    maxFoerderung: "150 € je Anlage",
    rates: [{ label: "Balkonkraftwerk", value: "150 € je Anlage" }],
    conditions: [
      "Antragsberechtigt sind Vermieter, Mieter und Eigentümer im Gemeindegebiet; Mieter brauchen die Einbauerlaubnis",
      "Das Kaufdatum muss im laufenden Jahr liegen; der Antrag folgt nach der Installation",
      "Das Programm endet mit der zehnten Bewilligung beziehungsweise 1.500 € Gesamtbudget",
      "Eine Förderung durch KfW, BAFA oder das Land schließt diesen Zuschuss aus",
    ],
    combinableWith: [],
    foerdert: ["balkon"],
    balkonPauschale: 150,
    // `combinableWith: []` statt BUND — die Richtlinie schließt eine Förderung
    // durch KfW, BAFA oder das Land ausdrücklich aus. Der einzige Bundeseintrag,
    // der hier praktisch stören könnte, wäre der KfW-Kredit; die Nullsteuer ist
    // ein Steuersatz und kein Förderprogramm, aber die Unterscheidung gehört
    // nicht in eine Liste, die der Nutzer als „kombinierbar mit" liest.
  },

  "karlshuld-balkonkraftwerke": {
    id: "karlshuld-balkonkraftwerke", name: "Förderprogramm Balkonkraftwerke",
    traeger: "Gemeinde Karlshuld", level: "kommune", region: "Karlshuld",
    bundesland: "Bayern", agsCode: "09185139",
    url: "http://www.karlshuld.de/neues-foerderprogramm-fuer-balkonkraftwerke-mini-pv-anlagen",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale je Anlage, gestaffelt nach Leistung",
    maxFoerderung: "max. 100 € je Anlage",
    rates: [
      { label: "Balkonkraftwerk unter 600 W", value: "50 € einmalig" },
      { label: "Balkonkraftwerk ab 600 W", value: "100 € einmalig" },
    ],
    conditions: [
      "Der Antrag muss vor dem Kauf gestellt werden; begonnene Maßnahmen sind ausgeschlossen",
      "Nachzuweisen ist der Hauptwohnsitz in Karlshuld",
      "Jährlich stehen 5.000 € bereit; ist der Topf leer, ruht die Förderung bis zum Folgejahr",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonTiers: [{ upTo: 599, amount: 50 }, { upTo: 999999, amount: 100 }],
  },

  "walddorfhaeslach-steckersolar": {
    id: "walddorfhaeslach-steckersolar", name: "Förderung Stecker-Solargeräte",
    traeger: "Gemeinde Walddorfhäslach", level: "kommune", region: "Walddorfhäslach",
    bundesland: "Baden-Württemberg", agsCode: "08415087",
    url: "https://www.walddorfhaeslach.com/unsere-gemeinde/aktuelles/foerderprogramme.html",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Einmaliger Förderbetrag je Privathaushalt",
    maxFoerderung: "150 € je Haushalt",
    rates: [{ label: "Balkonkraftwerk bis 800 W", value: "150 € einmalig" }],
    conditions: [
      "Antragsberechtigt sind Menschen, die in Walddorfhäslach zur Miete oder im Eigentum wohnen",
      "Das Gerät muss auf Walddorfhäslacher Gemarkung betrieben werden",
      "Entschieden wird im Rahmen der verfügbaren Haushaltsmittel",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPauschale: 150,
  },

  "klempau-balkonkraftwerke": {
    id: "klempau-balkonkraftwerke", name: "Förderung von Balkonkraftwerken",
    traeger: "Gemeinde Klempau", level: "kommune", region: "Klempau",
    bundesland: "Schleswig-Holstein", agsCode: "01053067",
    url: "https://gemeinde-klempau.de/foerderung-von-balkonkraftwerken/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je Haushalt — Budget reicht für zehn Anlagen",
    maxFoerderung: "200 € je Haushalt",
    rates: [{ label: "Balkonkraftwerk", value: "200 € je Haushalt" }],
    conditions: [
      "Der Antrag wird vor der Anschaffung beim Bürgermeister gestellt; nach der Bewilligung folgt eine Fördernummer",
      "Nach der Installation ist ein Verwendungsnachweis einzureichen",
      "Insgesamt stehen 2.000 € bereit, also zehn Förderungen",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPauschale: 200,
    // Bei zehn Plätzen ist stille Ausschöpfung wahrscheinlicher als bei jedem
    // anderen Programm im Katalog. Die Seite sagt dazu nichts — der
    // Seiten-Abgleich wird es melden, sobald die Gemeinde es hinschreibt.
  },

  "hillscheid-energie": {
    id: "hillscheid-energie", name: "Förderung privater Energiegewinnung",
    traeger: "Ortsgemeinde Hillscheid", level: "kommune", region: "Hillscheid",
    bundesland: "Rheinland-Pfalz", agsCode: "07143031",
    // WIR ZEIGTEN AUF DIE FALSCHE RICHTLINIE (korrigiert 22.08.2026). Hier stand
    // die Seite der STADT Höhr-Grenzhausen — das ist die Quelle des
    // Nachbarprogramms `hoehr-grenzhausen-energie`, nicht die dieses Eintrags.
    // Die Verbandsgemeinde führt zwei getrennte Richtlinien unter derselben
    // Rubrik, und die Ortsgemeinde Hillscheid hat ihre eigene Seite.
    //
    // Das war kein Schönheitsfehler an einem Link: Die Seite der Stadt trägt seit
    // dem 18.08.2026 den Satz „Für das Haushaltsjahr 2026 sind alle Fördermittel
    // ausgeschöpft." Wer dem Quellenlink dieses Eintrags folgte, las also eine
    // Absage für ein Programm, das noch läuft — und der Seiten-Wächter beobachtete
    // für Hillscheid die ganze Zeit die Bewegungen einer fremden Gemeinde.
    // Genau davor warnt der Hinweis unten; die Falle hat diesmal nicht den Status
    // erwischt, sondern die Adresse.
    //
    // An der eigenen Richtlinie der Ortsgemeinde am 22.08.2026 gelesen: kein
    // Ausschöpfungshinweis, nur „Die Förderung stellt eine freiwillige Leistung
    // der Ortsgemeinde Hillscheid dar, auf die kein Rechtsanspruch besteht."
    // Die Sätze sind zellgleich zu den hier hinterlegten — 150 € pro kWp,
    // max. 1.500 €; 100 € pro kWh, max. 1.000 €; Solarthermie 100/150 € pro m²,
    // max. 900 €. Der Status bleibt deshalb `aktiv`.
    url: "https://www.hoehr-grenzhausen.de/themen-die-uns-bewegen/foerderung-privater-energiegewinnung/foerderrichtlinie-der-ortsgemeinde-hillscheid/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp und je kWh Speicher, dazu Solarthermie",
    maxFoerderung: "max. 1.500 € PV + 1.000 € Speicher je Grundstück",
    rates: [
      { label: "Photovoltaik", value: "150 € je kWp, max. 1.500 €" },
      { label: "Batteriespeicher", value: "100 € je kWh, max. 1.000 €" },
      { label: "Solarthermie", value: "100 € je m² Flachkollektor, 150 € je m² Röhrenkollektor, max. 900 €" },
    ],
    conditions: [
      "Der Speicher wird auch zu einer BESTEHENDEN Photovoltaikanlage gefördert, nicht nur zu einer neuen",
      "Mit der Maßnahme darf erst nach der Bewilligung begonnen werden; als Beginn gilt die Auftragserteilung",
      "Antragsberechtigt sind Eigentümer und Eigentümergemeinschaften des Grundstücks",
      "Je Grundstück wird einmalig bis zum Höchstbetrag gefördert",
    ],
    combinableWith: BUND,
    pvPerKwp: 150, pvCap: 1500, speicherPerKwh: 100, speicherCap: 1000,
    // Eigenes Programm der ORTSGEMEINDE Hillscheid, nicht der Stadt
    // Höhr-Grenzhausen — beide stehen auf derselben Seite der Verbandsgemeinde,
    // haben dieselben Sätze und einen UNTERSCHIEDLICHEN Stand: Die Stadt hat
    // ihre Mittel für 2026 ausgeschöpft, Hillscheid nicht. Wer die Seite
    // überfliegt, hält das für ein Programm und trägt den falschen Status ein.
  },

  "schlierbach-energiespeicher": {
    id: "schlierbach-energiespeicher", name: "Förderung von Energiespeichern",
    traeger: "Gemeinde Schlierbach", level: "kommune", region: "Schlierbach",
    bundesland: "Baden-Württemberg", agsCode: "08117044",
    url: "http://www.schlierbach.de/freizeit-kultur/energie-klimaschutz/foerderung-von-energiespeichern",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteil der Anschaffungskosten eines Speichers — nur zusammen mit einer PV-Anlage",
    maxFoerderung: "max. 200 € je Anlage",
    rates: [{ label: "Energiespeicher", value: "50 % der Anschaffungskosten, max. 200 €" }],
    conditions: [
      "Gefördert wird nur zusammen mit einer vorhandenen oder zeitgleich errichteten Photovoltaikanlage; ein Balkonkraftwerk genügt",
      "Eine Antragstellung vor der Installation ist ausdrücklich nicht möglich",
      "Die Anlage ist mindestens fünf Jahre im Eigentum zu betreiben",
      "Für das laufende Jahr sind 30 Anlagen und 6.000 € vorgesehen",
    ],
    combinableWith: BUND,
    // Ein reines SPEICHER-Programm: Der Zuschuss hängt an den Kosten des
    // Speichers, nicht an der Anlagengröße. `percentOfCost` würde ihn auf die
    // gesamte PV-Investition anwenden und damit weit überschätzen — deshalb
    // kein Rechenwert, obwohl der Satz eindeutig ist. Dass ein Balkonkraftwerk
    // als Grundlage genügt, ist ungewöhnlich und steht deshalb ausdrücklich da.
  },

  // ── Aufgenommen 19.08.2026 aus der Leseliste des Abdeckungs-Screenings ─────
  // Jede Zahl unten stammt von der Amtsseite bzw. der dort verlinkten Richtlinie
  // und wurde vor der Aufnahme ein zweites Mal am Original gegengelesen.

  "schiltach-pv": {
    id: "schiltach-pv", name: "Förderung von Photovoltaikanlagen",
    traeger: "Stadt Schiltach", level: "kommune", region: "Schiltach",
    bundesland: "Baden-Württemberg", agsCode: "08325051",
    url: "https://www.schiltach.de/de/Rathaus/Buergerservice-A-Z/Foerderung-von-Photovoltail-Anlagen",
    stand: "August 2026", status: "aktiv", capped: false, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp Dachanlage und je kWh Batteriespeicher",
    maxFoerderung: "max. 2.000 € für die Anlage und 2.000 € für den Speicher",
    rates: [
      { label: "Photovoltaikanlage", value: "200 € je kWp, gefördert werden bis zu 10 kWp" },
      { label: "Batteriespeicher", value: "200 € je kWh, gefördert werden bis zu 10 kWh" },
    ],
    conditions: [
      "Gefördert werden Anlagen, die ab dem 1. August 2022 errichtet wurden",
      "Antragsberechtigt sind Privatpersonen und Schiltacher Vereine mit Wohnsitz in Schiltach",
      "Die Anlage muss auf der Gemarkung Schiltach oder Lehengericht stehen",
      "Der Speicher wird nur zusammen mit einer Photovoltaikanlage gefördert",
      "Die Anlage darf größer als 10 kWp sein; bezuschusst werden nur die ersten 10 kWp",
    ],
    combinableWith: BUND,
    foerdert: ["pv"],
    pvPerKwp: 200, pvCap: 2000,
    speicherPerKwh: 200, speicherCap: 2000,
    // Der Deckel ist eine FÖRDERGRENZE, keine Anlagengrenze: Die Seite sagt
    // ausdrücklich, die Anlage dürfe größer gebaut werden. `pvCap`/`speicherCap`
    // bilden genau das ab — ab 10 kWp bzw. 10 kWh bleibt der Betrag stehen.
    // Den Antragszeitpunkt nennt die Seite nicht, und das verlinkte
    // Richtlinien-PDF ist ein Scan ohne Textebene; deshalb steht er bewusst
    // nicht in den Bedingungen, statt ihn zu raten.
  },

  "altdorf-bb-balkonkraftwerke": {
    id: "altdorf-bb-balkonkraftwerke", name: "Solare Energienutzung / Balkonkraftwerke",
    traeger: "Gemeinde Altdorf (Landkreis Böblingen)", level: "kommune", region: "Altdorf",
    bundesland: "Baden-Württemberg", agsCode: "08115002",
    url: "https://www.altdorf-boeblingen.de/de/wirtschaft-bauen/foerderprogramm-solare-energienutzung-balkonkraftwerke/index.php",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteil an Kauf und Installation eines Balkonkraftwerks",
    maxFoerderung: "max. 200 € je Haushalt",
    rates: [{ label: "Balkonkraftwerk", value: "30 % der Investitionskosten, max. 200 €" }],
    conditions: [
      "Der Antrag kann vor dem Kauf gestellt werden oder danach, dann spätestens drei Monate nach dem Rechnungsdatum",
      "Je Haushalt wird ein Antrag gefördert",
      "Gefördert wird nur die Erstinstallation; Ersatz und Erweiterung sind ausgeschlossen",
      "Der Wechselrichter leistet mindestens 300 W, die Einspeiseleistung höchstens 800 W je Wohneinheit",
      "Mieter brauchen die schriftliche Zustimmung der Eigentümer",
      "Die Anlage muss fünf Jahre im Eigentum bleiben und genutzt werden",
      "Die Anlage wird im Marktstammdatenregister und beim Netzbetreiber angemeldet",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPercentOfCost: 0.3, balkonCap: 200,
    // Die Richtlinie kündigt im Zuwendungszweck eine „sozialgestaffelte
    // Förderung" an, führt aber auf allen fünf Seiten KEINE Einkommensstufe und
    // keine Einkommensgrenze — am 19.08.2026 im Volltext gegengeprüft (null
    // Fundstellen für Einkommen, Bürgergeld, Wohngeld, Sozialpass). Der eine
    // Satz von 30 % / max. 200 € gilt deshalb allen Antragsberechtigten; die
    // Staffelung ist unerfüllt gebliebene Absicht, keine Bedingung. Das ist der
    // Grund, warum hier trotz des Wortes „sozial" ein Rechenwert steht — anders
    // als bei Bad Krozingen, wo die Einkommensbindung ausformuliert ist.
  },

  "steffenberg-balkonkraftwerke": {
    id: "steffenberg-balkonkraftwerke", name: "Förderung von Balkonkraftwerken",
    traeger: "Gemeinde Steffenberg", level: "kommune", region: "Steffenberg",
    bundesland: "Hessen", agsCode: "06534019",
    url: "https://www.steffenberg.de/rathaus-politik-buergerservice/buergerservice/foerderung-von-balkonkraftwerken.html",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteil an den Anschaffungskosten einer Balkonkraftwerk inklusive Installation",
    maxFoerderung: "max. 150 € je Anlage",
    rates: [{ label: "Balkonkraftwerk", value: "20 % der Anschaffungskosten, max. 150 €" }],
    conditions: [
      "Der Antrag wird spätestens drei Monate nach dem Erwerb gestellt, die Anlage muss dann betriebsbereit installiert sein",
      "Gefördert werden nur Bestandsgebäude; Neubauten sind ausgeschlossen",
      "Der Wechselrichter gibt höchstens 800 W ab",
      "Je Wohneinheit wird eine Maßnahme gefördert",
      "Die Anlage läuft mindestens zwei Jahre am beantragten Ort",
      "Die Anlage wird im Marktstammdatenregister angemeldet",
      "Eigenleistungen werden nicht bezuschusst, Installationskosten dagegen schon",
      "Die Richtlinie gilt bis einschließlich 31. Dezember 2026",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPercentOfCost: 0.2, balkonCap: 150,
    // Nur Steckersolar bis 800 W — für Dachanlagen hat Steffenberg kein
    // Programm, obwohl der Vorsortierer „pv" meldete.
  },

  "tegernheim-stecker-pv": {
    id: "tegernheim-stecker-pv", name: "Förderrichtlinie für steckerfertige PV-Anlagen",
    traeger: "Gemeinde Tegernheim", level: "kommune", region: "Tegernheim",
    bundesland: "Bayern", agsCode: "09375204",
    url: "http://www.tegernheim.de/bauen-und-gewerbe/gemeindliche-foerderungen/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteil an den Kosten eines Balkonkraftwerks",
    maxFoerderung: "max. 150 € je Wohnung",
    rates: [{ label: "Balkonkraftwerk", value: "10 % der förderfähigen Kosten, max. 150 € je Wohnung" }],
    conditions: [
      "Geräte, die vor dem Inkrafttreten der Richtlinie am 17. November 2022 angeschafft wurden, werden nicht gefördert",
      "Je Antragstellerin oder Antragsteller werden im Jahr höchstens 150 € bewilligt",
      "Wer zusätzlich eine andere Förderung in Anspruch nimmt, bekommt hier nichts",
      "Der Höchstbetrag gilt je Wohnung, unabhängig von der Zahl der Module",
      "Das Gerät läuft mindestens zwei Jahre in Tegernheim",
      "Anlagen an gewerblich genutzten Gebäuden sind ausgeschlossen",
      "Insgesamt stehen 6.000 € bereit",
    ],
    combinableWith: [],
    foerdert: ["balkon"],
    balkonPercentOfCost: 0.1, balkonCap: 150,
    // `combinableWith` ist LEER, und das ist kein Versehen: Nr. 3 der Richtlinie
    // sagt „Eine Förderung erfolgt nur, sofern keine zusätzlichen
    // Drittförderungen in Anspruch genommen werden." Ein Ausschluss dieser
    // Schärfe kommt im Katalog sonst nicht vor; ihn stillschweigend mit BUND zu
    // kombinieren wäre eine Falschaussage über das, was ein Antragsteller
    // bekommt.
    //
    // Website und Richtlinie widersprechen sich bei der Leistungsgrenze: Die
    // Seite sagt 600 W, die verlängerte Richtlinie (unterzeichnet 27.12.2023,
    // am 19.08.2026 im Scan Seite für Seite gelesen) sagt 800 W. Maßgeblich ist
    // die Richtlinie; weil der Widerspruch aber ungeklärt ist, steht gar keine
    // Wattzahl in den Bedingungen — eine der beiden wäre falsch.
    //
    // 6.000 € Gesamtmittel bei 150 € Höchstbetrag reichen für rund vierzig
    // Anlagen, und die Richtlinie läuft seit November 2022. Ein Ausschöpfungs-
    // hinweis fehlt auf der Seite, das Antragsformular ist auf den 21.01.2026
    // datiert — deshalb „aktiv". Der Seiten-Wächter meldet es, sobald die
    // Gemeinde etwas anderes hinschreibt.
  },

  "lohfelden-100-daecher": {
    id: "lohfelden-100-daecher", name: "100 Dächer für Lohfelden",
    traeger: "Gemeinde Lohfelden", level: "kommune", region: "Lohfelden",
    bundesland: "Hessen", agsCode: "06633017",
    url: "https://www.lohfelden.de/de/klima-und-umwelt/klima-energie/angebote-foerderungen/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Anteil der Gesamtkosten inklusive Montage für Dachanlage und Speicher zusammen",
    maxFoerderung: "max. 1.000 € je Gebäude",
    rates: [{ label: "Photovoltaikanlage und Batteriespeicher", value: "10 % der Gesamtkosten inkl. Montage, max. 1.000 €" }],
    conditions: [
      "Der Antrag wird nach der Inbetriebnahme gestellt, spätestens neun Monate danach",
      "Gefördert werden Anlagen, die ab dem 28. April 2023 in Betrieb gingen",
      "Die Anlage leistet mehr als 2.000 Wp; Balkonkraftwerke sind ausgeschlossen",
      "Gebrauchte Anlagen und Eigenbauten werden nicht gefördert",
      "Die Anlage wird im Marktstammdatenregister angemeldet",
      "Wer die Anlage binnen sieben Jahren abbaut oder stilllegt, zahlt den Zuschuss zurück",
      "Die Richtlinie gilt bis zum 31. Dezember 2026",
    ],
    combinableWith: BUND,
    foerdert: ["pv"],
    percentOfCost: 0.1, pvCap: 1000, pvMin: 2.001,
    // Die Untergrenze ist AUSSCHLIESSEND, und deshalb steht dort nicht 2:
    // Die Gemeinde fördert Besitzer, „die auf ihrem Dach eine PV-Anlage mit mehr
    // als 2000 Wp Leistung errichten möchten" (lohfelden.de, am 28.08.2026
    // wörtlich gelesen). „Mehr als 2000 Wp" heißt, dass genau 2.000 Wp gerade
    // NICHT gefördert werden — die kleinste Anlage, die zählt, hat 2.001 Wp, und
    // das ist keine erfundene Genauigkeit, sondern der Wortlaut. `pvMin` kennt
    // nur einschließende Grenzen (`kwp < pvMin` fällt heraus); mit 2 bekäme die
    // 2,0-kWp-Anlage bis zu 1.000 €, die die Richtlinie ausschließt. Wer das
    // hier auf 2 „glättet", baut genau den Fehler wieder ein, gegen den `pvMin`
    // eingeführt wurde — ein Test hält beide Seiten fest.
    //
    // Anlage UND Speicher teilen sich einen Deckel von 1.000 € — deshalb
    // ausdrücklich KEIN eigener `speicherPerKwh`/`speicherCap`. Beides zu
    // setzen würde den Zuschuss verdoppeln, den die Gemeinde in Wahrheit ein
    // einziges Mal zahlt.
    //
    // Das zweite Programm der Gemeinde (CO2-einsparende Maßnahmen, 500 €
    // Grundförderung plus bis zu 2.500 € je Maßnahme, deckt auch Wärmepumpen)
    // steht hier bewusst NICHT: Es setzt einen von der BAFA geförderten
    // Sanierungsfahrplan voraus — eine Vorbedingung, die das Modell nicht kennt
    // und die die wenigsten erfüllen —, und der Betrag ist eine Ermessensspanne
    // „bis zu". Ein Abzug daraus wäre geraten.
  },

  "schwebheim-batteriespeicher": {
    id: "schwebheim-batteriespeicher", name: "Förderung eines Batteriespeichersystems",
    traeger: "Gemeinde Schwebheim", level: "kommune", region: "Schwebheim",
    bundesland: "Bayern", agsCode: "09678176",
    url: "https://www.schwebheim.de/foerderung-eines-batteriespeichersystems",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss zum Batteriespeicher, gestaffelt nach Kapazität",
    maxFoerderung: "max. 1.000 € je Speichersystem",
    rates: [
      { label: "Batteriespeicher ab 3 kWh", value: "400 € Grundbetrag" },
      { label: "Je weitere volle kWh", value: "zusätzlich 75 €" },
    ],
    conditions: [
      "Der Antrag muss vor Beginn der Arbeiten bei der Gemeinde eingehen; bereits installierte Speicher sind ausgeschlossen",
      "Der Speicher fasst mindestens 3 kWh; die Kapazität wird auf volle kWh abgerundet",
      "Ab 11 kWh bleibt es bei 1.000 €; größere Speicher sind zulässig, werden aber nicht höher gefördert",
      "Je Wohngebäude wird ein Speicher gefördert",
      "Gebrauchte Anlagen, Eigenbauten und Prototypen sind ausgeschlossen",
      "Die Installation übernimmt ein Fachbetrieb, die Anlage wird im Marktstammdatenregister angemeldet",
      "Der Speicher bleibt fünf Jahre in Betrieb",
      "Die Richtlinie gilt seit dem 26. Januar 2026 und tritt am 31. Dezember 2026 außer Kraft, wenn der Gemeinderat sie nicht verlängert",
    ],
    combinableWith: BUND,
    foerdert: ["pv"],
    speicherMin: 3, speicherSockel: 400, speicherPerKwh: 75, speicherCap: 1000,
    // Das erste Programm mit `speicherSockel` — die Bauform „400 € für die
    // ersten 3 kWh, danach 75 € je weiterer voller kWh, höchstens 1.000 €".
    //
    // Es stand bis zum 19.08.2026 bewusst OHNE Rechenwert hier: Mit
    // `speicherTiers` nachgebaut zahlte das Modell bei 7,5 kWh 775 € statt 700 €,
    // weil `tierAmount` die erste nicht überschrittene Stufe nimmt, während die
    // Richtlinie „auf volle kWh abgerundet" rechnet. 7,5 kWh ist eine der sechs
    // Standardgrößen des Rechners, der Fehler also nicht theoretisch. Statt die
    // Zahl zu schönen bekam das Modell das fehlende Feld.
    //
    // Die Richtlinie verlangt nirgends eine PV-Anlage. Ob ein Speicher ohne
    // Erzeugung förderfähig wäre, bleibt offen und steht deshalb nicht in den
    // Bedingungen.
  },

  "asbach-balkonkraftwerke": {
    id: "asbach-balkonkraftwerke", name: "PV-Förderprogramm der Ortsgemeinde Asbach",
    traeger: "Ortsgemeinde Asbach", level: "kommune", region: "Asbach",
    bundesland: "Rheinland-Pfalz", agsCode: "07138003",
    url: "https://www.vg-asbach.de/klima-umweltschutz/foerderungen/pv-foerderprogramm-der-ortsgemeinde-asbach/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale je Balkonkraftwerk",
    maxFoerderung: "150 € je Wohneinheit",
    rates: [{ label: "Balkonkraftwerk", value: "150 € pauschal" }],
    conditions: [
      "Der Antrag wird nach Kauf, Installation und Anmeldung der Anlage gestellt, spätestens bis zum 31. Dezember 2026",
      "Die Module leisten zusammen höchstens 2.000 Wp, der Wechselrichter höchstens 800 W",
      "Je Wohneinheit und Antragsteller wird ein Gerät gefördert",
      "Antragsberechtigt sind Personen mit Hauptwohnsitz in der Ortsgemeinde Asbach",
      "Die Anlage wird im Marktstammdatenregister angemeldet",
      "Vorgarten-Anlagen und Solarzäune werden nicht gefördert",
      "Bewilligt wird in der Reihenfolge des Eingangs, solange Haushaltsmittel da sind",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    balkonPauschale: 150,
    // TRÄGER IST DIE ORTSGEMEINDE, nicht die Verbandsgemeinde — der eigene
    // Ratsbeschluss vom 20.11.2025 und die eigene Kasse machen den Unterschied.
    // Die Verbandsgemeinde Asbach führt nur die Verwaltung und stellt die Seite;
    // deshalb steht dieses Programm im Katalog, während die VG-Programme aus
    // derselben Runde (Hachenburg, Langenlonsheim-Stromberg) zurückgestellt sind.
    //
    // Gefunden über eine FALSCHE Zuordnung: Der Vorsortierer hatte diese Seite
    // der Nachbargemeinde Buchholz zugeschrieben. Buchholz hatte ein eigenes
    // Programm, dessen Mittel Ende 2024 ausgeschöpft waren und das 2025 nicht
    // fortgeführt wurde — mit Asbachs Förderung hat es nichts zu tun.
  },

  "parkstein-nachhaltigkeitszuschuss": {
    id: "parkstein-nachhaltigkeitszuschuss", name: "Parksteiner Nachhaltigkeitszuschuss",
    traeger: "Markt Parkstein", level: "kommune", region: "Parkstein",
    bundesland: "Bayern", agsCode: "09374144",
    url: "https://www.parkstein.de/zuschuesse",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale je Balkonkraftwerk; für Dachanlagen und Hausspeicher nennt die Gemeinde den Satz nicht öffentlich",
    maxFoerderung: "100 € je Balkonkraftwerk",
    rates: [{ label: "Balkonkraftwerk", value: "100 € einmalig" }],
    conditions: [
      "Zuerst wird die geplante Anlage angemeldet, nach der Fertigstellung folgt der Antrag mit Rechnung und Registrierungsbestätigung",
      "Auch Mieterinnen und Mieter können den Zuschuss beantragen",
      "Für Dachanlagen und Hausspeicher gibt es eigene Zuschüsse; die Sätze dazu erfragt man im Rathaus",
    ],
    combinableWith: BUND,
    foerdert: ["balkon", "pv"],
    balkonPauschale: 100,
    // Der Balkon-Satz ist am Träger belegt, die Sätze für Dachanlage und
    // Speicher sind es NICHT: Die Richtlinie steht auf parkstein.de nirgends,
    // die beiden verlinkten PDFs sind reine Formulare ohne Beträge. Eine
    // Sekundärfundstelle nennt 100 €/kWp und 50 €/kWh — sie liegt auf einem
    // fremden Portal und war nicht lesbar, also wird sie nicht übernommen.
    // Deshalb `foerdert` mit "pv" (das Programm fördert Dachanlagen wirklich),
    // aber ohne `pvPerKwp`: Die Seite informiert darüber, der Rechner zieht
    // dafür nichts ab. Sobald die Richtlinie vorliegt, gehört der Satz nach.
  },

  "marburg-balkonkraftwerke": {
    id: "marburg-balkonkraftwerke", name: "Sonderförderprogramm Balkonkraftwerke",
    traeger: "Universitätsstadt Marburg", level: "kommune", region: "Marburg",
    bundesland: "Hessen", agsCode: "06534014",
    url: "https://www.marburg.de/leben-in-marburg/umwelt-und-klima/klimaschutz-und-klimaanpassung/foerderprogramme/balkonkraftwerke/",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Handwerkerkosten der Montage; für Inhaber des MarburgPasses auch das Gerät selbst",
    maxFoerderung: "max. 400 € Handwerkerkosten",
    rates: [
      { label: "Montage durch einen Handwerksbetrieb", value: "50 % der Handwerkerkosten, max. 400 €" },
      { label: "Mit MarburgPass", value: "85 ct je Watt Wechselrichterleistung, max. 85 % der Anlagekosten" },
    ],
    conditions: [
      "Der Antrag wird spätestens sechs Monate nach dem Erwerb gestellt; ein Antrag vorab ist nicht nötig",
      "Gefördert werden Anlagen von 200 bis 800 W Ausgangsleistung des Wechselrichters",
      "Je Wohneinheit oder Gewerberaum wird eine Maßnahme gefördert, je Antragsteller eine in zwölf Monaten",
      "Stromspeicher werden zusammen mit einem Balkonkraftwerk nicht gefördert",
      "Die Anlage läuft mindestens zwei Jahre in Marburg",
      "Anträge nehmen die Stadtwerke Marburg im Auftrag der Stadt entgegen",
      "Bewilligungen ergehen derzeit nur vorläufig, bis das Regierungspräsidium Gießen den Haushalt freigibt",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // KEIN Rechenwert, und zwar aus zwei getrennten Gründen — jeder allein
    // würde schon reichen.
    //
    // Erstens ist die Bemessungsgrundlage im Regelfall NICHT das Gerät, sondern
    // die Handwerkerrechnung für die Montage. Wer selbst montiert, bekommt
    // nichts. `balkonPercentOfCost: 0.5` würde die 50 % auf den Kaufpreis des
    // Sets anwenden — also auf eine Zahl, die in dieser Förderung gar nicht
    // vorkommt, und das bei der mit Abstand größten Stadt dieser Leserunde.
    //
    // Zweitens ist der einzige Satz, der das Gerät selbst erfasst, an den
    // MarburgPass gebunden und damit einkommensabhängig — dieselbe Klasse wie
    // Bad Krozingen und Tübingen, die aus demselben Grund keinen Wert tragen.
    //
    // Das zweite PV-Programm der Stadt („Klimafreundlich Wohnen", Dachanlagen)
    // steht hier NICHT: Es ist ausgesetzt, seine Unterseite ist verschwunden,
    // und die kursierenden 150 €/kWp stammen aus einer Stadtwerke-Richtlinie
    // von 2022, die am Träger nicht zu bestätigen war.
  },

  "schoenbrunn-balkon-pv": {
    id: "schoenbrunn-balkon-pv", name: "Förderung von Balkon-PV-Anlagen",
    traeger: "Gemeinde Schönbrunn", level: "kommune", region: "Schönbrunn",
    bundesland: "Baden-Württemberg", agsCode: "08226081",
    url: "https://www.gemeinde-schoenbrunn.de/seite/593686/terminbuchungen.html",
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zählertausch, Energiesteckdose samt Einbau und Stromkreisprüfung — nicht das Gerät",
    maxFoerderung: "max. 50 € je Anlage",
    rates: [{ label: "Zählertausch, Energiesteckdose, Stromkreisprüfung", value: "max. 50 € je Anlage, gegen Rechnung" }],
    conditions: [
      "Vor Beginn der Maßnahme wird die Anlage per E-Mail bei der Verwaltung angemeldet",
      "Die Module leisten zusammen höchstens 600 W",
      "Je Wohn- oder Nutzungseinheit wird eine Anlage gefördert",
      "Die Anlage darf nicht mit einer Photovoltaikanlage kombiniert werden, die nach dem EEG vergütet wird",
      "Der Verwendungsnachweis liegt bis zum 31. Dezember des Installationsjahres vor",
      "Jährlich stehen 3.000 € bereit, bewilligt wird in der Reihenfolge des Eingangs",
      "Die Richtlinie gilt seit dem 1. Juli 2023 und tritt am 31. Dezember 2026 außer Kraft",
    ],
    combinableWith: BUND,
    foerdert: ["balkon"],
    // KEIN Rechenwert, obwohl „50 €" nach einer Pauschale aussieht — die
    // Übersichtsseite schreibt sogar „fördert eine Anlage … mit 50 EUR". Die
    // Richtlinie sagt etwas anderes, und sie gilt: Die 50 € sind ein Höchstsatz
    // für Zählertausch, Energiesteckdose, deren Installation und die
    // Stromkreisprüfung, und „die Kosten sind über Rechnung nachzuweisen".
    // Wer keine dieser Positionen hat, bekommt nichts. Eine `balkonPauschale`
    // würde also jedem 50 € gutschreiben, den die Gemeinde nur denen zahlt, die
    // umbauen mussten.
    //
    // Damit ist Schönbrunn nach Marburg und Bad Marienberg der dritte Fund
    // dieser Runde, bei dem nicht die Anlage gefördert wird, sondern etwas
    // daneben. Der Satz auf der Übersichtsseite hätte in allen drei Fällen zu
    // einem falschen Abzug geführt.
  },

};

export function getFundingProgram(id: string): FundingProgram | undefined {
  return FUNDING_PROGRAMS[id];
}

export function allFundingPrograms(): FundingProgram[] {
  return Object.values(FUNDING_PROGRAMS);
}

/** Bundesländer that have a Land-level program (from the seed — used to also
 *  give those a Bundesland page even without cities, e.g. Berlin). */
export function landProgramBundeslaender(): { name: string; slug: string }[] {
  const out = new Map<string, string>();
  for (const p of Object.values(FUNDING_PROGRAMS)) {
    if (p.level === "land" && p.bundesland) out.set(blSlug(p.bundesland), p.bundesland);
  }
  return Array.from(out, ([slug, name]) => ({ slug, name }));
}

// Local transliterating slugifier (kept here to avoid an import cycle with
// atlas-cities). Must match atlas-cities.slugify.
function blSlug(s: string): string {
  return s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Programs applicable at a location, given its 8-digit Gemeinde-AGS.
 * Bund applies everywhere; Land/Kreis/Kommune match when the location's AGS
 * starts with the program's agsCode (2/5/8-digit). Ordered Bund → Land →
 * Kreis → Kommune (broadest first).
 */
const LEVEL_ORDER: Record<FundingLevel, number> = { bund: 0, land: 1, landkreis: 2, kommune: 3 };

/** Pure: programs from `list` applicable at `ags`, ordered broadest-first.
 *  Works on any program list — the code seed or the DB-loaded set. */
export function matchFundingForAgs(list: FundingProgram[], ags: string): FundingProgram[] {
  return list
    .filter((p) => (p.level === "bund" ? true : !!p.agsCode && ags.startsWith(p.agsCode)))
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

/** Convenience over the code seed (tests + fallback). DB-backed callers use
 *  {@link matchFundingForAgs} with the loaded program list instead. */
export function fundingForAgs(ags: string): FundingProgram[] {
  return matchFundingForAgs(allFundingPrograms(), ags);
}

/** Pick the first tier whose `upTo` the value fits into; falls back to the last. */
function tierAmount(tiers: { upTo: number; amount: number }[], value: number): number {
  for (const t of tiers) if (value <= t.upTo) return t.amount;
  return tiers[tiers.length - 1].amount;
}

// ─── Vertrauen verfällt — BLOCKER ────────────────────────────────────────────
//
// WARUM (16./17.08.2026): Ein Förderbetrag wurde abgezogen, solange
// `status: "aktiv"` dastand — unbefristet, gedeckt allein dadurch, dass kein
// Wächter widersprach. Die erste Fassung dieser Regel setzte deshalb ein festes
// Höchstalter von 180 Tagen auf die letzte inhaltliche Prüfung.
//
// Das war die falsche Größe, und der Betreiber hat es zu Recht zurückgewiesen:
// Ein halbes Jahr alter Stand ist keine Absicherung, sondern ein halbes Jahr
// alter Stand. Die Frist war als Notbremse gedacht und wurde zum Ersatz für die
// Prüfung.
//
// DIE RICHTIGE GRÖSSE IST NICHT DAS ALTER, SONDERN DIE BESTÄTIGUNG. Der
// Seiten-Wächter ruft jede Amtsseite täglich ab und vergleicht sie mit dem
// Stand, den wir inhaltlich geprüft haben (scripts/funding-watch.ts). Ist die
// Seite unverändert, gilt der geprüfte Inhalt weiter — dafür braucht es keine
// Frist, das ist einfach wahr. Die Uhr läuft nur, wenn wir NICHT bestätigen
// können, und dann kurz:
//
//   1. Die Seite hat sich geändert  → wir kennen den neuen Inhalt nicht.
//      Ab da bleiben NACHPRUEF_FRIST_TAGE, um sie inhaltlich neu zu prüfen.
//   2. Die Seite ist nicht erreichbar → wir wissen nicht, ob sie sich geändert
//      hat. Ab dem letzten geglückten Abruf bleiben BESTAETIGUNG_MAX_TAGE.
//
// Danach fliegt der Abzug raus. Beides sind zwei Wochen, nicht sechs Monate:
// Der Wächter läuft täglich, ein Programm hat also rund vierzehn Anläufe. Wer
// in vierzehn Anläufen nicht durchkommt, kommt nicht wegen einer Laune nicht
// durch.
//
// Die Richtung bleibt zu unseren Ungunsten: Wer eine Förderung bekommt, die wir
// nicht einrechnen, erlebt eine angenehme Überraschung. Umgekehrt hat jemand mit
// einer Zahl geplant, die es nicht mehr gibt.

/** So lange gilt ein geprüfter Inhalt ohne neuen geglückten Abruf weiter. */
export const FOERDER_BESTAETIGUNG_MAX_TAGE = 14;

/** So lange darf ein Programm nach einer Seitenänderung ungeprüft mitrechnen. */
export const FOERDER_NACHPRUEF_FRIST_TAGE = 14;

function heuteIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function tageSeit(iso: string | undefined | null, heute: string): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const a = Date.parse(iso.slice(0, 10));
  const b = Date.parse(heute.slice(0, 10));
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.round((b - a) / 86_400_000);
}

/**
 * Ist der Beleg dieses Programms belastbar genug, um damit zu RECHNEN?
 *
 * Drei Bedingungen, alle nötig:
 *  - die Werte wurden überhaupt einmal an der Amtsquelle gelesen,
 *  - seither ist keine unbeantwortete Seitenänderung offen (oder sie liegt
 *    innerhalb der Nachprüf-Frist),
 *  - der Seiten-Wächter hat die Seite kürzlich noch erreicht.
 */
export function fundingBelegAktuell(
  f: Pick<FundingProgram, "lastVerified" | "pageSeenAt" | "changedSinceIso">,
  heute: string = heuteIso(),
): boolean {
  if (!f.lastVerified) return false;

  // Eine erkannte Änderung, die nach unserer letzten inhaltlichen Prüfung liegt,
  // stellt den geprüften Stand in Frage. Kurze Frist zum Nachprüfen, dann Schluss.
  if (f.changedSinceIso && f.changedSinceIso.slice(0, 10) > f.lastVerified.slice(0, 10)) {
    if (tageSeit(f.changedSinceIso, heute) > FOERDER_NACHPRUEF_FRIST_TAGE) return false;
  }

  // Ohne geglückten Abruf wissen wir nicht, ob sich etwas geändert hat.
  //
  // Fehlt `pageSeenAt` ganz, zählt ersatzweise die inhaltliche Prüfung. Das
  // greift, solange die Bestätigungs-Spalten in der Datenbank noch fehlen
  // (lib/funding-data.ts liest dann schmal weiter). Es greift NICHT beim reinen
  // Code-Seed: Der trägt gar kein `lastVerified`, also scheitert schon die erste
  // Bedingung oben. Fällt die Datenbank komplett aus, wird deshalb KEINE
  // Förderung mehr abgezogen — bewusst die sichere Richtung, aber es ist kein
  // sanfter Rückfall, sondern ein Aus. Wer das ändern will, müsste Prüfdaten in
  // den Seed schreiben; das wäre eine zweite Wahrheit und ist bewusst nicht getan.
  const bestaetigt = f.pageSeenAt ?? f.lastVerified;
  return tageSeit(bestaetigt, heute) <= FOERDER_BESTAETIGUNG_MAX_TAGE;
}

/**
 * Darf dieses Programm in einer Rechnung Geld abziehen?
 *
 * Die EINZIGE Stelle, an der das entschieden wird — Seiten, Rechner und CTA
 * fragen sie, statt `status === "aktiv"` selbst zu prüfen.
 */
export function fundingZaehlt(
  f: Pick<FundingProgram, "status" | "lastVerified" | "pageSeenAt" | "changedSinceIso"> | undefined,
  heute: string = heuteIso(),
): boolean {
  return !!f && f.status === "aktiv" && fundingBelegAktuell(f, heute);
}

export type FundingAmount = {
  /** Grant in € the program yields for this system (0 if not computable). */
  total: number;
  /** A concrete € amount could be derived (structured rule present). */
  computable: boolean;
  /** Nimmt Anträge an UND der Quellenbeleg ist frisch (siehe fundingZaehlt). */
  active: boolean;
};

/**
 * Die Anlage, für die gerechnet wird — eine je Technik.
 *
 * WARUM EIN OBJEKT UND KEINE PARAMETERLISTE (18.08.2026): Vorher hieß es
 * `fundingAmount(f, kwp, speicherKwh, bruttoCost)`. Drei Techniken durch dieselbe
 * Liste zu schicken hätte bedeutet, dass der Balkon-Rechner eine Dach-Anlagengröße
 * und ein Wärmepumpen-Rechner eine Speicherkapazität übergibt — beides
 * Platzhalter, die niemand liest, bis sie einmal doch jemand liest. Die
 * unterschiedenen Varianten machen stattdessen unmöglich, eine Größe an eine
 * Technik zu hängen, zu der sie nicht gehört.
 *
 * `kosten` ist durchgängig der BRUTTO-Preis der Maßnahme: Bezugswert für
 * prozentuale Zuschüsse und zugleich der Deckel, den keine Förderung übersteigen
 * darf.
 */
export type FundingAnlage =
  | { technik: "pv"; kwp: number; speicherKwh: number; kosten: number }
  | { technik: "balkon"; wattPeak: number; kosten: number }
  | { technik: "waermepumpe"; kosten: number };

/**
 * Welche Techniken fördert dieses Programm?
 *
 * Ohne ausdrückliche Angabe gilt Photovoltaik. Das ist keine Bequemlichkeit,
 * sondern der tatsächliche Stand der Altbestände: Der Katalog wurde als
 * PV-Katalog aufgebaut, und ein Programm ohne `foerdert` ist eines, das noch
 * niemand auf Balkon oder Wärmepumpe hin gelesen hat. Es hier stillschweigend
 * allen drei Rechnern zuzuordnen wäre eine Behauptung über Seiten, die wir nicht
 * geprüft haben.
 */
export function technikenVon(f: Pick<FundingProgram, "foerdert">): FundingTechnik[] {
  return f.foerdert?.length ? f.foerdert : ["pv"];
}

/** Fördert das Programm diese Technik? */
export function foerdertTechnik(f: Pick<FundingProgram, "foerdert">, technik: FundingTechnik): boolean {
  return technikenVon(f).includes(technik);
}

/**
 * Die Programme, die für diese Technik überhaupt in Frage kommen.
 *
 * Rechner fragen IMMER hierüber und filtern nie selbst: Ein Programm, das seit
 * Dezember 2024 nur noch Steckersolar fördert (München), gehört in den
 * Balkon-Rechner und nicht in den PV-Rechner — und das ist eine Eigenschaft des
 * Programms, keine Entscheidung der aufrufenden Seite.
 */
export function programmeFuerTechnik(list: FundingProgram[], technik: FundingTechnik): FundingProgram[] {
  return list.filter((p) => foerdertTechnik(p, technik));
}

/**
 * Schließt das Programm eine gleichzeitige Bundesförderung aus?
 *
 * WOZU: Der Wärmepumpen-Rechner zieht die BEG des Bundes bereits ab, bevor der
 * Katalog überhaupt gefragt wird — sie ist kein Katalog-Eintrag, sondern kommt
 * aus lib/heatpump.ts. `combinableWith` kann sie deshalb nicht benennen, und ein
 * Programm, das Bundesmittel ausschließt, würde sonst stumm OBEN DRAUF gerechnet.
 *
 * Gelesen wird die vorhandene Angabe, kein neues Feld: Eine leere
 * `combinableWith`-Liste ist im Katalog bereits die Art, „geht nur allein" zu
 * sagen — Gaiberg trägt sie, weil die Richtlinie eine Förderung durch KfW, BAFA
 * oder das Land ausdrücklich ausschließt. Jedes andere Programm nennt dort
 * mindestens die Bundeseinträge.
 *
 * Die Richtung ist bewusst vorsichtig: Wer nichts angibt, gilt als
 * ausschließend. Eine zu Unrecht weggelassene Förderung ist eine angenehme
 * Überraschung, eine zu Unrecht gewährte ein Zuschuss, den jemand einplant und
 * nicht bekommt.
 */
export function schliesstBundesfoerderungAus(f: Pick<FundingProgram, "combinableWith">): boolean {
  return (f.combinableWith?.length ?? 0) === 0;
}

/**
 * Die Programme, die NEBEN der Bundesförderung stehen dürfen. Nur diese darf ein
 * Rechner abziehen, der die BEG schon eingerechnet hat.
 */
export function programmeNebenBundesfoerderung(list: FundingProgram[]): FundingProgram[] {
  return list.filter((p) => !schliesstBundesfoerderungAus(p));
}

/**
 * Die Förderzeilen, die zu einem gedeckelten Gesamtbetrag GEHÖREN.
 *
 * WOZU: Ein Deckel wirkt auf den Stapel, nicht auf ein einzelnes Programm.
 * Zeigte man die vollen Ansprüche an und zöge nur den gedeckelten Betrag ab,
 * stünde eine Förderzeile auf dem Bildschirm, die in der Investition nicht
 * steckt — der Widerspruch zwischen Text und Zahl, den dieses Projekt als
 * schwersten Fehler führt.
 *
 * Aufgefüllt wird der REIHE NACH, bis der Deckel erreicht ist: eine
 * deterministische, erklärbare Regel. Eine anteilige Verteilung wäre erfunden —
 * kein Programm kürzt sich anteilig, weil ein anderes auch zahlt.
 *
 * Zusicherung, auf die sich die Oberfläche verlassen darf: Die Summe der
 * zurückgegebenen Beträge ist exakt `min(deckel, Σ applied)`.
 */
export function zeilenBisDeckel(
  applied: { program: FundingProgram; amount: number }[],
  deckel: number,
): { program: FundingProgram; amount: number }[] {
  let rest = Math.max(0, deckel);
  const zeilen: { program: FundingProgram; amount: number }[] = [];
  for (const eintrag of applied) {
    const betrag = Math.min(eintrag.amount, rest);
    rest -= betrag;
    if (betrag > 0) zeilen.push({ program: eintrag.program, amount: betrag });
  }
  return zeilen;
}

/** Prozentsatz mit optionalem Deckel — die häufigste Bauform kommunaler Zuschüsse. */
function anteil(kosten: number, satz: number, deckel?: number): number {
  const roh = kosten * satz;
  return Math.round(deckel ? Math.min(roh, deckel) : roh);
}

/**
 * Computes the € grant a single program yields for a given system — the one
 * place this math lives, shared by the city pages and every rechner. `total` is
 * purely the rule's output; callers decide whether to subtract it (typically
 * only when `computable && active`).
 *
 * Fördert das Programm die gefragte Technik nicht, ist das Ergebnis nicht
 * `computable` — auch dann nicht, wenn es für eine ANDERE Technik einen
 * strukturierten Satz trägt. Sonst zöge ein reines Dach-PV-Programm im
 * Balkon-Rechner Geld ab, das dort niemand bekommt.
 */
export function fundingAmount(
  f: FundingProgram | undefined,
  anlage: FundingAnlage,
  heute?: string,
): FundingAmount {
  const active = fundingZaehlt(f, heute);
  if (!f || !foerdertTechnik(f, anlage.technik)) return { total: 0, computable: false, active };

  if (anlage.technik === "balkon") {
    const computable = !!(f.balkonPauschale || f.balkonProWp || f.balkonPercentOfCost || f.balkonTiers);
    if (!computable) return { total: 0, computable: false, active };
    if (f.balkonPauschale) return { total: Math.round(f.balkonPauschale), computable: true, active };
    if (f.balkonTiers) return { total: tierAmount(f.balkonTiers, anlage.wattPeak), computable: true, active };
    if (f.balkonProWp) {
      const roh = anlage.wattPeak * f.balkonProWp;
      return { total: Math.round(f.balkonCap ? Math.min(roh, f.balkonCap) : roh), computable: true, active };
    }
    return { total: anteil(anlage.kosten, f.balkonPercentOfCost!, f.balkonCap), computable: true, active };
  }

  if (anlage.technik === "waermepumpe") {
    const computable = !!(f.wpPauschale || f.wpPercentOfCost);
    if (!computable) return { total: 0, computable: false, active };
    if (f.wpPauschale) return { total: Math.round(f.wpPauschale), computable: true, active };
    return { total: anteil(anlage.kosten, f.wpPercentOfCost!, f.wpCap), computable: true, active };
  }

  const computable = !!(f.percentOfCost || f.pvPerKwp || f.pvTiers || f.speicherPerKwh || f.speicherTiers);
  if (!computable) return { total: 0, computable: false, active };

  // Unter der Mindestleistung zahlt das Programm für die Anlage nichts. Das
  // Programm bleibt `computable` — der Betrag ist bekannt, er ist null. „Lässt
  // sich nicht berechnen" wäre eine andere Aussage und stünde als solche auf der
  // Karte (dieselbe Unterscheidung wie bei der Kumulierungsgrenze im WP-Rechner).
  const unterMindestleistung = f.pvMin !== undefined && anlage.kwp < f.pvMin;

  if (f.percentOfCost) {
    if (unterMindestleistung) return { total: 0, computable: true, active };
    // Prozentsatz MIT Deckel — ergänzt 18.08.2026. Vorher rechnete dieser Zweig
    // ungedeckelt und kehrte sofort zurück; „20 % der Kosten, höchstens 300 €"
    // war damit nicht ausdrückbar, und solche Programme mussten ohne
    // strukturierten Satz aufgenommen werden. Das ist die häufigste Bauform
    // kommunaler Zuschüsse — gemessen an einem Drittel der Fundstellen aus dem
    // Abdeckungs-Screening (Gaimersheim, Hohenahr, Holzgerlingen …). Der
    // Hinweis kam aus der Balkon-Session.
    return { total: anteil(anlage.kosten, f.percentOfCost, f.pvCap), computable: true, active };
  }
  let pv = 0;
  if (unterMindestleistung) {
    pv = 0;
  } else if (f.pvPerKwp) {
    pv = (f.pvSockel ?? 0) + anlage.kwp * f.pvPerKwp;
    if (f.pvCap) pv = Math.min(pv, f.pvCap);
  } else if (f.pvTiers) {
    pv = tierAmount(f.pvTiers, anlage.kwp);
  }
  let sp = 0;
  const speicherKwh = anlage.speicherKwh;
  if (f.speicherPerKwh && speicherKwh >= (f.speicherMin ?? 0) && speicherKwh > 0) {
    if (f.speicherSockel !== undefined) {
      // Sockel plus Satz: Der Satz greift erst OBERHALB der Mindestkapazität,
      // und gezählt werden volle kWh. Beides steht so in den Richtlinien dieser
      // Bauform („für jede weitere kWh", „auf volle kWh abgerundet") — wer
      // stattdessen die volle Kapazität mal dem Satz nimmt, zahlt den Sockel
      // ein zweites Mal.
      const weitere = Math.floor(speicherKwh) - (f.speicherMin ?? 0);
      sp = f.speicherSockel + Math.max(0, weitere) * f.speicherPerKwh;
    } else {
      sp = speicherKwh * f.speicherPerKwh;
    }
    if (f.speicherCap) sp = Math.min(sp, f.speicherCap);
  } else if (f.speicherTiers && speicherKwh >= (f.speicherMin ?? 0)) {
    sp = tierAmount(f.speicherTiers, speicherKwh);
  }
  return { total: Math.round(pv + sp), computable: true, active };
}

/**
 * Total stackable grant across a set of programs (e.g. the result of
 * {@link fundingForAgs}) for one system. Only active & computable programs
 * contribute; the sum is capped at the gross cost. Returns the contributing
 * programs so the UI can name them.
 */
export function stackFunding(
  programs: FundingProgram[],
  anlage: FundingAnlage,
  heute?: string,
): { total: number; applied: { program: FundingProgram; amount: number }[] } {
  const applied: { program: FundingProgram; amount: number }[] = [];
  let total = 0;
  for (const p of programs) {
    const a = fundingAmount(p, anlage, heute);
    if (a.computable && a.active && a.total > 0) {
      applied.push({ program: p, amount: a.total });
      total += a.total;
    }
  }
  return { total: Math.min(total, anlage.kosten), applied };
}
