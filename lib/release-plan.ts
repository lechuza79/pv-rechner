/**
 * Releaseplan der Seitengattungen mit Ortsnamen — eine Quelle für die Frage
 * „welcher Ort, welche Seitensorte, welche Welle, welches Datum".
 *
 * WARUM ES DAS GIBT (19.08.2026)
 * ─────────────────────────────
 * Wir haben zwei Seitenfamilien, die denselben Ortsnamen tragen:
 *
 *   /photovoltaik-foerderung/{land}/{stadt}        — Geld-Wörter + Ort
 *   /solar-atlas/{land}/{kreis}/{gemeinde}         — Bestands-Wörter + Ort
 *
 * Für die Atlas-Seite gab es eine Bremse (`RELEASED` je Ebene in lib/atlas-index.ts,
 * dazu der Freigabe-Nachweis). Für die Förderseite gab es KEINE: `isCityPublished()`
 * hing allein am Status des Förderprogramms. Ein Eintrag in ATLAS_CITIES mit einem
 * aktiven Programm war damit beim nächsten Deploy eine öffentliche, indexierte Seite —
 * ohne dass jemand die Frage gestellt hätte, ob sie gerade jetzt erscheinen soll.
 *
 * Aufgefallen ist das, als der Förderkatalog auf 97 regionale Programme wuchs und
 * 61 davon noch keine Seite hatten. Eine Session war dabei, alle 61 anzulegen. Sie
 * hätte damit nichts falsch gemacht — und trotzdem 61 Seiten auf einen Schlag
 * veröffentlicht, weil die Veröffentlichung kein eigener Schritt war, sondern eine
 * Nebenwirkung des Programmstatus.
 *
 * WAS DER PLAN VERHINDERT
 * ───────────────────────
 * 1. Zwei Seitengattungen für DENSELBEN Ort ohne Abstand dazwischen. Google braucht
 *    Wochen, um zuzuordnen, welche unserer Seiten zu welcher Frage gehört; zwei
 *    frische Seiten mit demselben Ortsnamen machen diese Zuordnung zum Zufall, und
 *    ein falsch zugeordneter Ort ist teuer zu korrigieren (gemessen am 18.08.2026:
 *    bei drei Anfragen steht die Förderseite bereits auf einem reinen Bestands-Wort
 *    besser als die Atlasseite — docs/seo/befund-2026-08-18-atlas-wellen.md).
 * 2. Schübe, die so dicht aufeinanderfolgen, dass sich ihre Wirkung nicht mehr
 *    trennen lässt.
 * 3. Einen Livegang ohne die beiden Fragen aus CLAUDE.md („Zwei Fragen vor jedem
 *    Livegang einer Seitengattung"): Wird auf dieser Ebene gesucht? Steht auf
 *    denselben Anfragen schon eine andere eigene Seitenfamilie?
 *
 * WAS ER NICHT IST
 * ────────────────
 * Keine Priorisierung. WELCHE Orte in welcher Reihenfolge erscheinen, entscheidet
 * der Betreiber — der Plan hält die Entscheidung fest und macht sie prüfbar. Und
 * er ist keine zweite Wahrheit über den Förderkatalog: ob ein Programm Geld abzieht,
 * entscheidet weiterhin allein `fundingZaehlt()`. Ein Ort ohne Seite bleibt im
 * Rechner vollständig wirksam — der Plan steuert nur die öffentliche Seite.
 *
 * Erzwungen von lib/__tests__/release-plan.test.ts, Übersicht: `npm run release:plan`.
 */

/** Seitenfamilien, die einen Ortsnamen im Titel tragen und deshalb um dieselben
 *  Anfragen konkurrieren können. */
export type Seitengattung =
  | "foerder-stadt"
  | "atlas-gemeinde"
  | "atlas-landkreis"
  | "atlas-bundesland";

export const GATTUNG_LABEL: Record<Seitengattung, string> = {
  "foerder-stadt": "Förderseite (Geld-Wörter + Ort)",
  "atlas-gemeinde": "Atlas-Ortsseite (Bestands-Wörter + Ort)",
  "atlas-landkreis": "Atlas-Kreisseite",
  "atlas-bundesland": "Atlas-Landesseite",
};

export type SchubStatus = "geplant" | "live" | "zurueckgenommen";

/**
 * Die beiden Fragen aus CLAUDE.md, je Schub beantwortet — mit Zahlen, nicht mit
 * Adjektiven. `null` heißt: noch nicht erhoben. Ein Schub ohne Nachweis darf nicht
 * auf `live` stehen; das ist die eigentliche Sperre.
 */
export type SchubNachweis = {
  /** Tag, an dem beide Antworten erhoben wurden (ISO). */
  gemessenAm: string;
  /** Wird auf dieser Ebene für diese Orte gesucht? Suchvolumen + Gegenprobe. */
  nachfrage: string;
  /** Steht auf denselben Anfragen schon eine andere eigene Seitenfamilie? */
  kannibalisierung: string;
  /** Wo die Messung nachlesbar ist (Datei im Repo). */
  beleg: string;
};

export type Schub = {
  /** Kurzname, taucht in Berichten und Commit-Nachrichten auf. */
  id: string;
  gattung: Seitengattung;
  /**
   * Tag des Livegangs (ISO). Bei `geplant` der vorgesehene, bei `live` der
   * tatsächliche. Bewusst ein fester Stichtag und kein gerechnetes Datum: Er
   * beschreibt ein Ereignis, das an genau einem Tag stattgefunden hat oder
   * stattfinden soll (siehe CLAUDE.md, „Wartungsfreier Code" — Stichtage sind
   * der zulässige Fall).
   */
  datum: string;
  status: SchubStatus;
  /** Gemeindeschlüssel (AGS) der Orte in diesem Schub. */
  orte: string[];
  /** Warum genau diese Orte, in einem Satz. */
  begruendung: string;
  nachweis: SchubNachweis | null;
};

/**
 * Mindestabstand zwischen zwei Seitengattungen für DENSELBEN Ort.
 *
 * Warum 28 Tage: Das ist das Fenster, mit dem in diesem Projekt überhaupt gemessen
 * wird (Search Console, `?days=28` in allen SEO-Routen). Wer die zweite Gattung
 * früher live nimmt, nimmt sie blind live — die Wirkung der ersten ist dann noch
 * nicht ablesbar. Die Zahl ist also nicht gegriffen, sondern die kürzeste Frist,
 * nach der eine Aussage über den ersten Schub möglich ist.
 */
export const MIN_ABSTAND_GATTUNG_TAGE = 28;

/**
 * Mindestabstand zwischen zwei Schüben überhaupt, auch bei verschiedenen Orten.
 *
 * Warum 14 Tage: Die Search-Console-Daten hinken zwei bis drei Tage nach und
 * brauchen danach eine Woche Verlauf, bevor aus einer Bewegung eine Aussage wird
 * (CLAUDE.md: Einblendungen nur mit `byDate` lesen, nie als Summe). Unter zwei
 * Wochen ließe sich nicht mehr sagen, welcher Schub eine Veränderung ausgelöst
 * hat — und genau diese Zuordnung ist der Zweck der Staffelung.
 */
export const MIN_ABSTAND_SCHUB_TAGE = 14;

/**
 * Was live war, BEVOR es diesen Plan gab (Stand 19.08.2026): 37 Förder-Stadtseiten
 * aus den Batches vom 17.–19.06.2026 und die Atlas-Welle 0a.
 *
 * Diese Liste ist Altbestand, kein Nachweis. Sie rückwirkend als geprüft
 * auszuweisen wäre ein erfundenes Prüfdatum — dieselbe Fehlerklasse, die das
 * Projekt beim Förder-Prüfdatum schon einmal getroffen hat. Sie darf deshalb
 * NICHT wachsen; der Test nagelt ihre Länge fest. Jeder weitere Ort geht durch
 * einen Schub.
 */
export const ALTBESTAND_LIVE_SEIT = "2026-06-19";

export const ALTBESTAND: Record<Seitengattung, string[]> = {
  "foerder-stadt": [
    "03103", // Wolfsburg
    "03241001", // Hannover — Stadt, nicht Region Hannover (Schlüssel am 19.08.2026 korrigiert)
    "03404", // Osnabrück
    "04011", // Bremen
    "04012", // Bremerhaven
    "05111", // Düsseldorf
    "05113", // Essen
    "05114", // Krefeld
    "05166", // Kreis Viersen
    "05314", // Bonn
    "05315", // Köln
    "05362", // Rhein-Erft-Kreis
    "05512", // Bottrop
    "05515", // Münster
    "05913", // Dortmund
    "05916", // Herne
    "06411", // Darmstadt
    "06412", // Frankfurt am Main
    "06414", // Wiesbaden
    "06431", // Kreis Bergstraße
    "07137", // Landkreis Mayen-Koblenz
    "07314", // Ludwigshafen am Rhein
    "07315", // Mainz
    "08111", // Stuttgart
    "08211", // Baden-Baden
    "08212", // Karlsruhe
    "08221", // Heidelberg
    "08222", // Mannheim
    "08311", // Freiburg im Breisgau
    "09162", // München
    "09362", // Regensburg
    "09662", // Schweinfurt
    "09663", // Würzburg
    "09764", // Memmingen
    "11000", // Berlin
    "12054", // Potsdam
    "13004", // Schwerin
  ],
  // Welle 0a (Deutschland + 16 Bundesländer) ist über lib/atlas-index.ts
  // freigeschaltet und trägt keine Ortsnamen auf Gemeindeebene — sie kann mit
  // der Förderseite eines Ortes nicht um dieselbe Anfrage konkurrieren.
  "atlas-bundesland": [],
  "atlas-landkreis": [],
  "atlas-gemeinde": [],
};

/**
 * DER PLAN.
 *
 * Reihenfolge und Zuschnitt der Schübe entscheidet der Betreiber. Bis dahin steht
 * hier, was ohne Entscheidung feststeht: dass die 61 neuen Förderseiten nicht in
 * einem Stück erscheinen, und dass jeder Schub seinen Nachweis braucht.
 *
 * Ein Schub mit `orte: []` ist ein Platzhalter — er hält Reihenfolge und Datum
 * fest, bevor die Ortsliste entschieden ist, und geht mit leerer Liste
 * folgenlos live.
 */
export const RELEASE_PLAN: Schub[] = [
  {
    id: "w1-foerder-dach",
    gattung: "foerder-stadt",
    datum: "2026-09-02",
    // ZURÜCKGENOMMEN am 19.08.2026, bevor eine Zeile Seite gebaut wurde — genau
    // dafür gibt es die Vorlauf-Messung. Nach diesen Orten sucht praktisch
    // niemand: 1 von 14 hat überhaupt ein messbares Suchvolumen (Roth, 10/Monat),
    // zusammen 10/Monat für vierzehn Seiten. Das Messinstrument ist an bekannten
    // Fällen gegengeprüft und liefert dort plausible Werte (Köln 70, München 40,
    // Frankfurt 20, Würzburg 10) — die Null ist also echt und kein Fehlgriff.
    //
    // Der Wert dieser Programme liegt im RECHNER, wo die Postleitzahl zählt,
    // nicht in eigenen Seiten. Sie wirken dort unverändert weiter; hier entsteht
    // nur keine Seite. Wer den Schub wieder aufmachen will, braucht eine neue
    // Messung, die diese widerlegt — nicht ein gutes Gefühl.
    status: "zurueckgenommen",
    orte: [
      "03256036", // Wietzen (Niedersachsen)
      "06433004", // Gernsheim (Hessen)
      "06435018", // Linsengericht (Hessen)
      "06532013", // Hohenahr (Hessen)
      "06633017", // Lohfelden (Hessen)
      "08325051", // Schiltach (Baden-Württemberg)
      "07143031", // Hillscheid (Rheinland-Pfalz)
      "08226028", // Heddesheim (Baden-Württemberg)
      "08327056", // Rietheim-Weilheim (Baden-Württemberg)
      "09175135", // Poing (Bayern)
      "09176126", // Gaimersheim (Bayern)
      "09184148", // Unterhaching (Bayern)
      "09373146", // Mühlhausen (Bayern)
      "09576143", // Roth (Bayern)
    ],
    begruendung:
      "Die vierzehn Gemeinden, deren Programm einen aktiven, rechenbaren Satz für DACH-PV trägt — " +
      "gemessen am 19.08.2026 die einzigen unter 71 wartenden Orten, bei denen eine Seite mit dem " +
      "Titel Photovoltaik-Förderung auch hält, was sie verspricht. 37 der übrigen fördern " +
      "ausschließlich Balkonkraftwerke, 2 nur Wärmepumpen; die gehören in eine andere " +
      "Seitenfamilie, nicht in diesen Schub. Reihenfolge und Zuschnitt sind ein Vorschlag; " +
      "die Priorisierung gehört dem Betreiber.",
    nachweis: {
      gemessenAm: "2026-08-19",
      nachfrage:
        "Nein. 1 von 14 Orten mit messbarem Suchvolumen (Roth, 10/Monat), zusammen 10/Monat. " +
        "Gegenprobe an bekannten Fällen im selben Abruf: Köln 70, München 40, Frankfurt 20, " +
        "Würzburg 10 — das Messmuster trifft also, die Null ist echt.",
      kannibalisierung:
        "Keine Anfrage, auf der beide Seitenfamilien gleichzeitig erscheinen — bei dieser " +
        "Nachfrage aber auch ohne Aussagekraft.",
      beleg: "docs/seo/schub-w1-foerder-dach-2026-08-19.md",
    },
  },
  {
    id: "w2-foerder-dach-archiv",
    gattung: "foerder-stadt",
    datum: "2026-09-16",
    // Ebenfalls zurückgenommen: 0 von 1 Ort mit messbarem Suchvolumen. Eine
    // Archivseite ohne Geldversprechen für einen Ort, nach dem niemand sucht,
    // hat keinen Adressaten.
    status: "zurueckgenommen",
    orte: [
      "07143032", // Höhr-Grenzhausen (Rheinland-Pfalz), Topf ausgeschöpft
    ],
    begruendung:
      "Nachzügler mit Dach-PV-Satz, dessen Topf ausgeschöpft ist — als Archivseite ohne Geldversprechen. " +
      "Bad Homburg (06434001) fehlt hier bewusst: Status unsicher, und Daten, denen wir nicht trauen, " +
      "werden nicht veröffentlicht.",
    nachweis: {
      gemessenAm: "2026-08-19",
      nachfrage: "Nein. 0 von 1 Ort mit messbarem Suchvolumen.",
      kannibalisierung: "Keine Anfrage, auf der beide Seitenfamilien gleichzeitig erscheinen.",
      beleg: "docs/seo/schub-w2-foerder-dach-archiv-2026-08-19.md",
    },
  },
  {
    id: "w3-atlas-orte-pilot",
    gattung: "atlas-gemeinde",
    datum: "2026-10-14",
    status: "geplant",
    orte: [],
    begruendung:
      "Platzhalter für Welle 1 des Atlas (Gemeinde-Pilot). Hält Reihenfolge und Abstand fest, bevor die " +
      "Ortsliste entschieden ist. Zweite Sperre bleibt lib/atlas-index.ts — der Plan ordnet die Reihenfolge, " +
      "die Ebene schaltet dort frei.",
    nachweis: null,
  },
];

// ── Auswertung ────────────────────────────────────────────────────────────────

const TAG_MS = 24 * 60 * 60 * 1000;

/** AGS auf Gemeindeebene normalisieren: eine kreisfreie Stadt (5) trägt als
 *  Gemeinde dieselbe Kennung mit drei Nullen. So sind Förder- und Atlas-Ort
 *  vergleichbar, ohne dass eine zweite Zuordnungsliste entsteht. */
export function ortSchluessel(ags: string): string {
  return ags.length === 5 ? `${ags}000` : ags;
}

function tage(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / TAG_MS;
}

/** Der Schub, der diesen Ort in dieser Gattung veröffentlicht — falls es ihn gibt. */
export function schubFuer(gattung: Seitengattung, ags: string): Schub | undefined {
  const k = ortSchluessel(ags);
  return RELEASE_PLAN.find((s) => s.gattung === gattung && s.orte.some((o) => ortSchluessel(o) === k));
}

/**
 * Darf diese Seite öffentlich sein?
 *
 * Altbestand ja; sonst nur, wenn ein Schub sie auf `live` gesetzt hat UND sein
 * Datum erreicht ist. `geplant` genügt ausdrücklich nicht — sonst ginge die Seite
 * am Stichtag von selbst live, ohne dass jemand den Nachweis erbracht hat.
 */
export function releaseFreigegeben(gattung: Seitengattung, ags: string, heute: Date = new Date()): boolean {
  const k = ortSchluessel(ags);
  if (ALTBESTAND[gattung].some((o) => ortSchluessel(o) === k)) return true;
  const s = schubFuer(gattung, ags);
  if (!s || s.status !== "live") return false;
  return new Date(s.datum).getTime() <= heute.getTime();
}

export type PlanBefund = { schub: string; regel: string; text: string };

/**
 * Alle Regelverstöße des Plans — eine Quelle für Test und Übersicht.
 * Leeres Ergebnis heißt: der Plan ist in sich schlüssig.
 */
export function planBefunde(plan: Schub[] = RELEASE_PLAN): PlanBefund[] {
  const b: PlanBefund[] = [];

  const gesehen = new Set<string>();
  for (const s of plan) {
    if (gesehen.has(s.id)) b.push({ schub: s.id, regel: "id-eindeutig", text: `Die Schub-Kennung ${s.id} kommt zweimal vor.` });
    gesehen.add(s.id);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.datum)) {
      b.push({ schub: s.id, regel: "datum-form", text: `${s.datum} ist kein Datum in der Form JJJJ-MM-TT.` });
    }
    if (!s.begruendung.trim()) {
      b.push({ schub: s.id, regel: "begruendung", text: "Ohne ausgeschriebenen Grund ist nicht erkennbar, warum gerade diese Orte." });
    }

    // Ein Ort steht in einem Schub nur einmal.
    const inSchub = new Set<string>();
    for (const o of s.orte) {
      const k = ortSchluessel(o);
      if (inSchub.has(k)) b.push({ schub: s.id, regel: "ort-doppelt", text: `Der Ort ${o} steht zweimal in diesem Schub.` });
      inSchub.add(k);
    }

    // Live heißt: beide Fragen sind beantwortet.
    if (s.status === "live" && s.orte.length > 0 && !s.nachweis) {
      b.push({
        schub: s.id,
        regel: "nachweis",
        text:
          "Steht auf live, ohne dass die beiden Fragen beantwortet sind: Wird auf dieser Ebene " +
          "gesucht? Steht auf denselben Anfragen schon eine andere eigene Seitenfamilie? " +
          "Beides mit Zahl und Beleg in `nachweis` eintragen.",
      });
    }
  }

  // Ein Ort bekommt seine Seite einer Gattung nur einmal.
  const jeGattung = new Map<string, string>();
  for (const s of plan) {
    for (const o of s.orte) {
      const key = `${s.gattung}|${ortSchluessel(o)}`;
      const vorher = jeGattung.get(key);
      if (vorher) {
        b.push({ schub: s.id, regel: "ort-zwei-schuebe", text: `Der Ort ${o} steht in dieser Gattung schon in ${vorher}.` });
      } else jeGattung.set(key, s.id);
    }
    for (const o of ALTBESTAND[s.gattung]) {
      const key = `${s.gattung}|${ortSchluessel(o)}`;
      if (jeGattung.get(key) === s.id) {
        b.push({ schub: s.id, regel: "ort-im-altbestand", text: `Der Ort ${o} ist in dieser Gattung längst live (Altbestand).` });
      }
    }
  }

  // Kernregel: derselbe Ort in zwei Gattungen braucht Abstand.
  type Eintrag = { schub: string; gattung: Seitengattung; datum: string };
  const jeOrt = new Map<string, Eintrag[]>();
  for (const g of Object.keys(ALTBESTAND) as Seitengattung[]) {
    for (const o of ALTBESTAND[g]) {
      const k = ortSchluessel(o);
      jeOrt.set(k, [...(jeOrt.get(k) ?? []), { schub: "Altbestand", gattung: g, datum: ALTBESTAND_LIVE_SEIT }]);
    }
  }
  for (const s of plan) {
    if (s.status === "zurueckgenommen") continue;
    for (const o of s.orte) {
      const k = ortSchluessel(o);
      jeOrt.set(k, [...(jeOrt.get(k) ?? []), { schub: s.id, gattung: s.gattung, datum: s.datum }]);
    }
  }
  for (const [ort, eintraege] of jeOrt) {
    for (let i = 0; i < eintraege.length; i++) {
      for (let j = i + 1; j < eintraege.length; j++) {
        const a = eintraege[i], c = eintraege[j];
        if (a.gattung === c.gattung) continue;
        const d = tage(a.datum, c.datum);
        if (d < MIN_ABSTAND_GATTUNG_TAGE) {
          b.push({
            schub: c.schub,
            regel: "gattungen-zu-dicht",
            text:
              `Der Ort ${ort} bekommt in ${a.schub} (${GATTUNG_LABEL[a.gattung]}) und ${c.schub} ` +
              `(${GATTUNG_LABEL[c.gattung]}) zwei Seiten im Abstand von ${Math.round(d)} Tagen. ` +
              `Nötig sind ${MIN_ABSTAND_GATTUNG_TAGE} — sonst ist die Zuordnung durch Google Zufall.`,
          });
        }
      }
    }
  }

  // Abstand zwischen Schüben überhaupt.
  const aktiv = plan.filter((s) => s.status !== "zurueckgenommen" && s.orte.length > 0)
    .slice().sort((x, y) => x.datum.localeCompare(y.datum));
  for (let i = 1; i < aktiv.length; i++) {
    const d = tage(aktiv[i - 1].datum, aktiv[i].datum);
    if (d < MIN_ABSTAND_SCHUB_TAGE) {
      b.push({
        schub: aktiv[i].id,
        regel: "schuebe-zu-dicht",
        text:
          `Folgt ${aktiv[i - 1].id} nach ${Math.round(d)} Tagen; nötig sind ${MIN_ABSTAND_SCHUB_TAGE}. ` +
          "Sonst lässt sich eine Bewegung keinem der beiden Schübe mehr zuordnen.",
      });
    }
  }

  return b;
}

/** Schübe, deren Datum erreicht ist, die aber noch nicht live sind — der
 *  Arbeitsvorrat. Bewusst keine Test-Regel: ein Plan altert, das ist kein
 *  Codefehler, sondern eine Meldung. */
export function ueberfaellig(heute: Date = new Date(), plan: Schub[] = RELEASE_PLAN): Schub[] {
  return plan.filter((s) => s.status === "geplant" && new Date(s.datum).getTime() <= heute.getTime());
}

/**
 * Vorlauf: So viele Tage vor dem Datum eines Schubes muss die Messung stehen.
 *
 * Warum 14: Die Messung kann „keine Nachfrage" ergeben — dann wird der Schub
 * verkleinert oder gestrichen. Fällt dieses Ergebnis erst am Stichtag, ist die
 * Arbeit schon getan. Vierzehn Tage sind zugleich der Mindestabstand zweier
 * Schübe: Ein Schub, dessen Messung fehlt, ist damit spätestens dann auffällig,
 * wenn der vorige gerade ausgewertet werden könnte.
 */
export const MESSUNG_VORLAUF_TAGE = 14;

/**
 * Eine Meldung geht IMMER an Claude, nie an den Betreiber — deshalb hat sie kein
 * Adressatenfeld. Ein anstehender Schub, eine fehlende Messung, ein verstrichenes
 * Datum: Das sind Arbeitsschritte, keine Entscheidungen. Ihn damit anzuschreiben
 * wäre dieselbe Sackgasse wie ein Alarm an jemanden, der ihn nicht beheben kann.
 * Steht wirklich eine Entscheidung an (soll dieser Schub überhaupt kommen?),
 * läuft sie über die Alarm-Route mit `decisions`, nicht über den Gesundheitscheck.
 */
export type PlanMeldung = {
  /**
   * Wie schwer wiegt es?
   *
   * `auffaellig` = Arbeitsvorrat: Ein Schub braucht seine Messung, ein Datum ist
   * verstrichen. Das ist ein legitimer Zustand, der Tage bis Wochen anhält —
   * er gehört ins Protokoll, nicht auf Rot. Ein Wächter, der deswegen alle drei
   * Stunden rot steht, startet jedes Mal die Selbstheilung, eskaliert nach drei
   * Läufen als Frage an den Betreiber und gewöhnt uns ab, Rot ernst zu nehmen
   * (CLAUDE.md, Meldelogik: „eine Warnung, die bei jedem Lauf angeht, filtert
   * man weg und verpasst dann die rote").
   *
   * `fehler` = der Plan widerspricht sich. Das sollte der Test verhindern; kommt
   * es trotzdem vor, ist es ein Defekt und gehört auf Rot.
   */
  schwere: "auffaellig" | "fehler";
  schub: string;
  text: string;
};

/**
 * Was am Plan gerade Aufmerksamkeit braucht — für die laufende Überwachung.
 *
 * WARUM DAS NICHT IM WÄCHTER STEHT (19.08.2026): Ein Plan, der sich nur meldet,
 * wenn jemand ihn abfragt, meldet sich nicht. Genau diese Lehre steht schon
 * einmal im Projekt — `npm run stand:faellig` lief nur INNERHALB von Wächtern,
 * und als der Wärmepumpen-Wächter fünf Wochen ausfiel, fiel die Meldung über
 * seinen Ausfall mit aus. Deshalb läuft diese Auswertung im Gesundheitscheck,
 * der alle drei Stunden in GitHubs Rechenzentrum läuft und keinen offenen
 * Rechner braucht. Sie liest nur Konstanten: kein Netz, keine Datenbank, sie
 * kann den Lauf nicht zum Kippen bringen.
 */
export function planMeldungen(heute: Date = new Date(), plan: Schub[] = RELEASE_PLAN): PlanMeldung[] {
  const m: PlanMeldung[] = [];

  // Strukturfehler fängt normalerweise der Test — hier als Netz darunter, falls
  // jemand am Test vorbei committet.
  for (const b of planBefunde(plan)) {
    m.push({ schwere: "fehler", schub: b.schub, text: `Der Releaseplan widerspricht sich (${b.regel}): ${b.text}` });
  }

  for (const s of plan) {
    if (s.status !== "geplant" || s.orte.length === 0) continue;
    const tageBis = Math.round((new Date(s.datum).getTime() - heute.getTime()) / TAG_MS);

    if (tageBis < 0) {
      m.push({
        schwere: "auffaellig",
        schub: s.id,
        text:
          `Der Schub „${s.id}" war für den ${s.datum} geplant und steht seit ${-tageBis} Tagen. ` +
          (s.nachweis
            ? "Die Messung liegt vor — er wartet nur noch darauf, auf live gesetzt zu werden."
            : "Die Messung fehlt noch (npm run release:messen). Ohne sie geht er nicht live, und das ist so gewollt.") +
          " Ein verstrichenes Datum ist kein Codefehler, sondern Arbeitsvorrat — entweder ausführen oder neu terminieren.",
      });
    } else if (tageBis <= MESSUNG_VORLAUF_TAGE && !s.nachweis) {
      m.push({
        schwere: "auffaellig",
        schub: s.id,
        text:
          `Der Schub „${s.id}" ist in ${tageBis} Tagen dran (${s.datum}) und hat noch keine Messung. ` +
          `Jetzt „npm run release:messen" fahren: Wird nach diesen ${s.orte.length} Orten gesucht, und steht ` +
          "auf denselben Anfragen schon eine andere eigene Seitenfamilie? Ergibt die Messung keine Nachfrage, " +
          "wird der Schub verkleinert oder gestrichen — das ist ein gutes Ergebnis, kein Fehlschlag.",
      });
    }
  }
  return m;
}

/** Der nächste anstehende Schub. */
export function naechsterSchub(heute: Date = new Date(), plan: Schub[] = RELEASE_PLAN): Schub | undefined {
  return plan
    .filter((s) => s.status === "geplant" && new Date(s.datum).getTime() > heute.getTime())
    .slice()
    .sort((a, b) => a.datum.localeCompare(b.datum))[0];
}
