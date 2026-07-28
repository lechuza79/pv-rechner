// Prüft systematisch, ob ein gemessenes Netzgebiet plausibel ist.
//
// Anlass: Die Zuordnung stammt aus einer Auszählung („diese Anlagen hängen an
// diesem Netz"). Dass sie technisch korrekt gerechnet ist, heißt aber nicht,
// dass sie stimmt — ein falsch gepflegter Netzanschlusspunkt im Register zieht
// eine Gemeinde ins falsche Gebiet, und das sieht man der Summe nicht an.
//
// Eine Karte anzusehen ist dafür keine Prüfung, sondern eine Stichprobe. Hier
// laufen deshalb vier Tests über JEDEN Versorger, die sich alle aus vorhandenen,
// unabhängigen Angaben speisen:
//
//   1. SITZ      Die Anschrift im Register (Postleitzahl) zeigt auf eine
//                Gemeinde. Liegt die im gemessenen Gebiet? Ein Stadtwerk, das
//                seine eigene Stadt nicht versorgt, ist ein Widerspruch.
//   2. NAME      Steckt ein Ortsname im Firmennamen („Stadtwerke Schwäbisch
//                Hall"), muss dieser Ort im Gebiet liegen. Unabhängig von 1,
//                weil der Name aus einer anderen Quelle stammt als die Anschrift.
//   3. STREUUNG  Ein Netzgebiet ist zusammenhängend. Eine Gemeinde, die weit
//                außerhalb des übrigen Gebiets liegt, ist verdächtig.
//   4. DOMINANZ  Wer ein Ortsnetz betreibt, hat dort die meisten Anschlüsse.
//                Ein Gebiet aus lauter Fünf-Prozent-Anteilen ist keins.
//
// Kein Test ist für sich beweisend — deshalb liefert die Prüfung nicht „richtig"
// oder „falsch", sondern eine Ampel mit benannten Befunden. Rot heißt „hier
// stimmt etwas nicht", nicht „diese Zuordnung ist falsch".

export type PruefBefund = {
  test: "sitz" | "name" | "streuung" | "dominanz";
  ergebnis: "ok" | "auffaellig" | "unpruefbar";
  text: string;
};

export type Pruefung = {
  ampel: "gruen" | "gelb" | "rot";
  befunde: PruefBefund[];
};

export type PruefEingabe = {
  name: string;
  /** Gemeinde-Schlüssel der Sitz-Anschrift (aus der Postleitzahl), Kandidaten. */
  sitzKandidaten: string[];
  /** Das gemessene Gebiet: Gemeindeschlüssel → Anteil an den Anlagen (0..1). */
  gebiet: { ags: string; name: string; anteil: number; anlagen?: number }[];
  /** Mittelpunkte der Gemeinden, soweit bekannt. */
  zentren: Map<string, { lat: number; lon: number }>;
  /** Namen ALLER Gemeinden — für den Ortsnamen-Test. */
  gemeindeNamen: { ags: string; name: string }[];
  /** Ort aus der Anschrift im Register — zweiter Weg zum Sitz, wenn die
   *  Postleitzahl nicht auflösbar ist. */
  sitzOrt?: string | null;
  /** Je Gemeinde der höchste Anteil, den IRGENDEIN Netzbetreiber dort hat.
   *  Damit wird aus „hat wenig Prozent" die viel schärfere Frage: „ist er dort
   *  der größte?" — in Gemeinden mit drei Netzbetreibern sind 40 % viel. */
  groesstemAnteilJeGemeinde?: Map<string, number>;
};

// ─── Hilfen ───────────────────────────────────────────────────────────────────

const ERDRADIUS_KM = 6371;

export function entfernungKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * ERDRADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function quantil(sortiert: number[], q: number): number {
  if (sortiert.length === 0) return 0;
  const i = (sortiert.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sortiert[lo] + (sortiert[hi] - sortiert[lo]) * (i - lo);
}

/** Rechtsform-Anhängsel und Gattungswörter weg — übrig bleibt möglichst der Ort. */
const FUELLWOERTER =
  /\b(gmbh|co|kg|ag|mbh|e\.?\s?g|eg|ohg|se|aör|aoer|anstalt|kgaa|stadtwerke|stadtwerk|gemeindewerke|gemeindewerk|elektrizitätswerk|elektrizitaetswerk|energieversorgung|energie|versorgungsbetriebe|versorgung|netz|netze|netzgesellschaft|netzbetrieb|strom|stromversorgung|werke|werk|der|die|das|und|für|fuer|am|im|an|de[rs])\b/gi;

/** Ortsnamen aus einem Firmennamen herauslösen — als Wortfolgen, die es als
 *  Gemeindenamen wirklich gibt. Bewusst konservativ: erkannt wird nur, was
 *  eindeutig einer Gemeinde entspricht, sonst gilt der Test als unprüfbar. */
export function ortsnamenAusFirma(
  firma: string,
  gemeindeNamen: { ags: string; name: string }[],
): { ags: string; name: string }[] {
  const rest = firma
    .replace(/[.,()]/g, " ")
    .replace(FUELLWOERTER, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (rest.length < 3) return [];

  const treffer: { ags: string; name: string }[] = [];
  for (const g of gemeindeNamen) {
    const n = g.name.toLowerCase();
    // Mindestens fünf Zeichen. Kürzer wird es unzuverlässig: „TauberEnergie
    // Kuhn, Karl und Andreas Kuhn OHG" traf die Gemeinde Karl in der Eifel, weil
    // es sie wirklich gibt. Der Preis sind kurze Städtenamen (Kiel, Köln, Jena),
    // die dadurch ungeprüft bleiben — ein falscher Alarm kostet mehr als eine
    // ausgelassene Prüfung.
    if (n.length < 5) continue;
    const wortgrenze = new RegExp(`(^|[^a-zäöüß])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-zäöüß]|$)`);
    if (wortgrenze.test(rest)) treffer.push(g);
  }
  return treffer;
}

/** Gattungswörter, hinter denen in aller Regel der Ort steht. */
const VOR_ORT =
  /\b(stadtwerke|stadtwerk|gemeindewerke|gemeindewerk|kreiswerke|elektrizit(?:ä|ae)tswerke?|energieversorgung|stromversorgung|versorgungsbetriebe|netzgesellschaft|netzbetrieb|stromnetz|energienetze?)\b[\s.\-]*/i;

/**
 * Der Ort direkt hinter dem Gattungswort — „Stadtwerke **Kiel**".
 *
 * Diese Stelle ist so verlässlich, dass hier auch kurze Namen zählen dürfen:
 * Wer „Stadtwerke Kiel" heißt, meint Kiel. Die freie Suche über den ganzen
 * Firmennamen darf das nicht (dort traf „Karl" die Eifel-Gemeinde) — den
 * Unterschied macht die Position, nicht die Länge.
 */
export function ortNachGattungswort(
  firma: string,
  gemeindeNamen: { ags: string; name: string }[],
): { ags: string; name: string }[] {
  const m = VOR_ORT.exec(firma);
  if (!m) return [];
  const rest = firma
    .slice(m.index + m[0].length)
    .replace(/[.,()\/].*$/, " ")
    .replace(/\b(gmbh|co|kg|ag|mbh|ohg|se|aör|kgaa|und|&)\b.*$/i, " ")
    .trim()
    .toLowerCase();
  if (rest.length < 3) return [];

  // Längster passender Gemeindename gewinnt („Schwäbisch Hall" vor „Hall").
  const treffer = gemeindeNamen.filter((g) => {
    const n = g.name.toLowerCase();
    return n.length >= 3 && (rest === n || rest.startsWith(`${n} `) || rest.startsWith(`${n}-`));
  });
  if (treffer.length === 0) return [];
  const maxLen = Math.max(...treffer.map((t) => t.name.length));
  return treffer.filter((t) => t.name.length === maxLen);
}

// ─── Die Prüfung ──────────────────────────────────────────────────────────────

/** Ab dieser Anteilshöhe gilt ein Netzbetreiber in einer Gemeinde als der
 *  bestimmende. Der Median über das Gebiet entscheidet, nicht ein Einzelwert. */
const DOMINANZ_SCHWELLE = 0.5;

/** Ausreißer: weiter als das Dreifache des oberen Viertels — und mindestens
 *  50 km, damit kleine, kompakte Gebiete nicht an Rundungen scheitern. */
const AUSREISSER_FAKTOR = 3;
const AUSREISSER_MIN_KM = 50;

/** Oberhalb dieser Gebietsgröße ist der Firmensitz kein Beleg mehr (Flächennetz). */
const SITZ_TEST_MAX_GEMEINDEN = 50;

export function pruefeGebiet(e: PruefEingabe): Pruefung {
  const befunde: PruefBefund[] = [];
  const imGebiet = new Set(e.gebiet.map((g) => g.ags));

  // 1. Sitz
  //
  // Bei Flächennetzen sagt der Firmensitz nichts: Die Bayernwerk Netz sitzt in
  // Regensburg, wo die Stadtwerke das Netz betreiben — „Sitz nicht im Gebiet"
  // ist dort der Normalfall und kein Widerspruch. Der Test gilt deshalb nur für
  // Gebiete in der Größe eines Ortsnetzes.
  if (e.gebiet.length > SITZ_TEST_MAX_GEMEINDEN) {
    befunde.push({
      test: "sitz",
      ergebnis: "unpruefbar",
      text: `Flächennetz mit ${e.gebiet.length} Gemeinden — der Firmensitz sagt hier nichts über das Gebiet.`,
    });
  } else if (e.sitzKandidaten.length === 0) {
    // Zweiter Weg: der Ortsname aus der Anschrift. Die Postleitzahl ist der
    // genauere Schlüssel, aber sie fehlt oder ist nicht auflösbar — dann ist der
    // Ortsname immer noch besser als gar keine Prüfung.
    const ort = (e.sitzOrt ?? "").trim().toLowerCase();
    const perOrt = ort.length >= 3 ? e.gemeindeNamen.filter((g) => g.name.toLowerCase() === ort) : [];
    if (perOrt.length === 0) {
      befunde.push({ test: "sitz", ergebnis: "unpruefbar", text: "Anschrift im Register nicht auf eine Gemeinde auflösbar." });
    } else if (perOrt.some((g) => imGebiet.has(g.ags))) {
      befunde.push({ test: "sitz", ergebnis: "ok", text: `Der Ort der Firmenanschrift (${perOrt[0].name}) liegt im Gebiet.` });
    } else if (perOrt.length > 1) {
      befunde.push({ test: "sitz", ergebnis: "unpruefbar", text: `Den Ort „${perOrt[0].name}" der Anschrift gibt es mehrfach — nicht entscheidbar.` });
    } else {
      befunde.push({ test: "sitz", ergebnis: "auffaellig", text: `Der Ort der Firmenanschrift (${perOrt[0].name}) liegt NICHT im Gebiet.` });
    }
  } else if (e.sitzKandidaten.some((a) => imGebiet.has(a))) {
    befunde.push({ test: "sitz", ergebnis: "ok", text: "Die Gemeinde der Firmenanschrift liegt im Gebiet." });
  } else {
    befunde.push({
      test: "sitz",
      ergebnis: "auffaellig",
      text: "Die Gemeinde der Firmenanschrift liegt NICHT im gemessenen Gebiet.",
    });
  }

  // 2. Ortsname im Firmennamen — erst an der verlässlichen Stelle direkt hinter
  //    dem Gattungswort, sonst frei über den ganzen Namen.
  const ausPosition = ortNachGattungswort(e.name, e.gemeindeNamen);
  const orte = ausPosition.length > 0 ? ausPosition : ortsnamenAusFirma(e.name, e.gemeindeNamen);
  const treffer = orte.find((o) => imGebiet.has(o.ags));
  if (orte.length === 0) {
    befunde.push({ test: "name", ergebnis: "unpruefbar", text: "Im Firmennamen steckt kein eindeutiger Ortsname." });
  } else if (treffer) {
    befunde.push({ test: "name", ergebnis: "ok", text: `Der Ort aus dem Firmennamen (${treffer.name}) liegt im Gebiet.` });
  } else if (new Set(orte.map((o) => o.name.toLowerCase())).size < orte.length) {
    // Denselben Ortsnamen gibt es mehrfach („Stadtwerke Reichenbach/Vogtland"
    // trifft jedes Reichenbach). Dann ist offen, welcher gemeint war — das ist
    // kein Widerspruch, sondern eine Prüfung, die nicht entscheiden kann.
    befunde.push({
      test: "name",
      ergebnis: "unpruefbar",
      text: `Den Ort „${orte[0].name}" aus dem Firmennamen gibt es mehrfach — nicht entscheidbar.`,
    });
  } else {
    befunde.push({
      test: "name",
      ergebnis: "auffaellig",
      text: `Der Ort aus dem Firmennamen (${orte[0].name}) liegt NICHT im Gebiet.`,
    });
  }

  // 3. Räumliche Streuung
  const punkte = e.gebiet.map((g) => e.zentren.get(g.ags)).filter((p): p is { lat: number; lon: number } => !!p);
  if (e.gebiet.length <= 2) {
    // Ein Ortsnetz aus einer oder zwei Gemeinden ist zusammenhängend, da gibt es
    // nichts zu streuen. Das als „unprüfbar" zu führen, hat den Test bei zwei
    // Dritteln aller Versorger sinnlos aussehen lassen.
    befunde.push({
      test: "streuung",
      ergebnis: "ok",
      text: e.gebiet.length === 1 ? "Ortsnetz aus einer Gemeinde — zusammenhängend." : "Zwei benachbarte Gemeinden — zusammenhängend.",
    });
  } else if (punkte.length < 3) {
    befunde.push({ test: "streuung", ergebnis: "unpruefbar", text: "Zu wenige Gemeinden mit bekanntem Mittelpunkt." });
  } else {
    const mitte = {
      lat: punkte.reduce((s, p) => s + p.lat, 0) / punkte.length,
      lon: punkte.reduce((s, p) => s + p.lon, 0) / punkte.length,
    };
    const abstaende = punkte.map((p) => entfernungKm(mitte, p)).sort((a, b) => a - b);
    const grenze = Math.max(AUSREISSER_MIN_KM, quantil(abstaende, 0.75) * AUSREISSER_FAKTOR);
    const ausreisser = abstaende.filter((d) => d > grenze).length;
    if (ausreisser === 0) {
      befunde.push({
        test: "streuung",
        ergebnis: "ok",
        text: `Zusammenhängend — die entfernteste Gemeinde liegt ${Math.round(abstaende[abstaende.length - 1])} km vom Mittelpunkt.`,
      });
    } else {
      befunde.push({
        test: "streuung",
        ergebnis: "auffaellig",
        text: `${ausreisser} ${ausreisser === 1 ? "Gemeinde liegt" : "Gemeinden liegen"} weit außerhalb (über ${Math.round(grenze)} km vom Mittelpunkt).`,
      });
    }
  }

  // 4. Dominanz
  //
  // Nicht „hat er viel Prozent", sondern „ist er der Größte" — in einer Gemeinde
  // mit drei Netzbetreibern sind 40 % die Mehrheit, ein absoluter Schwellenwert
  // hätte sie als schwach gemeldet.
  const max = e.groesstemAnteilJeGemeinde;
  if (e.gebiet.length === 0) {
    befunde.push({ test: "dominanz", ergebnis: "unpruefbar", text: "Keine Anteile hinterlegt." });
  } else if (max) {
    const fuehrt = (g: { ags: string; anteil: number }) => g.anteil >= (max.get(g.ags) ?? 0) - 1e-9;
    const fuehrend = e.gebiet.filter(fuehrt).length;
    // Die Kerngemeinde ist die mit den meisten Anlagen dieses Versorgers. Dort
    // der Größte zu sein wiegt schwerer als der Schnitt über alle: ein Stadtwerk
    // teilt sich die Randgemeinden oft mit dem Flächenversorger, sein eigenes
    // Ortsnetz aber nicht.
    const kern = [...e.gebiet].sort((a, b) => (b.anlagen ?? 0) - (a.anlagen ?? 0))[0];
    const kernFuehrt = kern ? fuehrt(kern) : false;
    if (kernFuehrt || fuehrend / e.gebiet.length >= 0.5) {
      befunde.push({
        test: "dominanz",
        ergebnis: "ok",
        text: kernFuehrt
          ? `Größter Netzbetreiber in ${kern.name} — der Gemeinde mit den meisten seiner Anlagen (insgesamt in ${fuehrend} von ${e.gebiet.length}).`
          : `Größter Netzbetreiber in ${fuehrend} von ${e.gebiet.length} Gemeinden des Gebiets.`,
      });
    } else {
      befunde.push({
        test: "dominanz",
        ergebnis: "auffaellig",
        text: `Nur in ${fuehrend} von ${e.gebiet.length} Gemeinden der größte Netzbetreiber — anderswo hat ein anderer mehr Anlagen.`,
      });
    }
  } else {
    const med = quantil(e.gebiet.map((g) => g.anteil).sort((a, b) => a - b), 0.5);
    if (med >= DOMINANZ_SCHWELLE) {
      befunde.push({ test: "dominanz", ergebnis: "ok", text: `In der Hälfte der Gemeinden mindestens ${Math.round(med * 100)} % der Anlagen.` });
    } else {
      befunde.push({ test: "dominanz", ergebnis: "auffaellig", text: `Nur ${Math.round(med * 100)} % der Anlagen je Gemeinde (Median).` });
    }
  }

  // Ampel.
  //
  // Sitz und Name belegen beide die Identität des Gebiets, aber aus
  // unabhängigen Quellen (Anschrift im Register vs. Firmenname). Bestätigt einer
  // von beiden, ist ein Widerspruch des anderen erklärbar: „Gemeindewerke
  // Weidenthal c/o Stadtwerke Kaiserslautern" hat die Anschrift des
  // Dienstleisters, versorgt aber Weidenthal — der Name hat recht, die Anschrift
  // führt in die Irre. Rot wird es deshalb erst, wenn KEIN Identitätstest
  // bestätigt und mindestens einer widerspricht.
  const identitaet = befunde.filter((b) => b.test === "sitz" || b.test === "name");
  const widerspricht = identitaet.filter((b) => b.ergebnis === "auffaellig").length;
  const bestaetigt = identitaet.filter((b) => b.ergebnis === "ok").length;
  const qualitaet = befunde.filter((b) => (b.test === "streuung" || b.test === "dominanz") && b.ergebnis === "auffaellig").length;

  const ampel: Pruefung["ampel"] =
    widerspricht > 0 && bestaetigt === 0
      ? "rot"
      : widerspricht > 0 || bestaetigt === 0 || qualitaet > 0
        ? "gelb"
        : "gruen";

  return { ampel, befunde };
}

export const AMPEL_TEXT: Record<Pruefung["ampel"], string> = {
  gruen: "Gebiet bestätigt",
  gelb: "teilweise prüfbar",
  rot: "widersprüchlich",
};
