/**
 * Ruft eine Route unsere EIGENE öffentliche Adresse über HTTP ab?
 *
 * Das ist im Betrieb ein Fehler, und zwar ein unsichtbarer. Eine Serverless-
 * Function verhält sich nicht wie ein Browser; seit der Bot-Schutz scharf steht
 * (08.09.2026) beantwortet er ihren Abruf selbst — mit HTML. Trägt diese
 * Antwort HTTP 200 (eine Prüfaufgabe tut das), ist `r.ok` wahr und das Auslesen
 * als JSON bricht am ersten Zeichen ab; trägt sie 429, fällt der Abruf still
 * auf den Fehlerzweig. Beides sieht man der Seite nicht an.
 *
 * Dreimal in diesem Repo passiert: das Vorschaubild holte seine Schrift über
 * die eigene Domain (08.09.2026, vierzehn Stunden leere Vorschaubilder), die
 * Startseiten-Erzeugung holte ihre Daten so (sieben Serverfehler am
 * 20.09.2026), und die Ausgabenbremse meldete so (latent — ihre Meldung ist
 * genau das, was nie stumm ausfallen darf).
 *
 * Die Regel steht im Repo längst an zwei Stellen, nur hat sie nichts erzwungen:
 * die Szenendaten-Route schreibt sie als Kommentar hin, der Vorschaubild-Test
 * prüft sie für genau eine Datei. Deshalb hier: ÜBER ALLE ROUTEN.
 *
 * Geprüft wird die VERWENDUNG — ein Abruf, dessen Ziel aus einem Merkmal
 * unserer eigenen Adresse gebaut ist —, nicht das bloße Vorkommen einer
 * Domain: Adressen für Links, Mail-Texte und Anzeigen sind völlig in Ordnung
 * und die Mehrheit der Treffer.
 */

/** Woran eine eigene Adresse zu erkennen ist, wenn sie in einem Abruf steht. */
const EIGENE_ADRESSE = [
  /nextUrl\.origin/,
  /\bsolar-check\.io/,
  /NEXT_PUBLIC_BASE_URL/,
  /\bVERCEL_URL\b/,
];

/** Kommentare und Zeichenketten-Inhalte stören die Klammerzählung nicht, wohl
 *  aber die Trefferlage: Ein Kommentar, der den Fehler BESCHREIBT, ist kein
 *  Fehler. Zeilen- und Blockkommentare fallen deshalb vorher weg. */
export function ohneKommentare(quelle: string): string {
  return quelle.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** Der erste Aufruf-Parameter ab der öffnenden Klammer, über Zeilen hinweg. */
function argumente(quelle: string, ab: number): string {
  let tiefe = 0;
  for (let i = ab; i < quelle.length; i++) {
    const z = quelle[i];
    if (z === "(") tiefe++;
    else if (z === ")") {
      tiefe--;
      if (tiefe === 0) return quelle.slice(ab, i + 1);
    }
  }
  return quelle.slice(ab, ab + 400);
}

/**
 * Bezeichner, die in DIESER Datei aus einem Merkmal unserer eigenen Adresse
 * gebaut werden. Ohne sie bliebe der häufigste Fall unsichtbar: die Adresse
 * steht oben als Konstante, der Abruf unten nennt nur noch ihren Namen.
 */
export function eigeneAdressBezeichner(quelle: string): string[] {
  const namen: string[] = [];
  const zuweisung = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*([^;\n]+)/g;
  for (const t of quelle.matchAll(zuweisung)) {
    if (EIGENE_ADRESSE.some((m) => m.test(t[2]))) namen.push(t[1]);
  }
  return namen;
}

export type Selbstabruf = { zeile: number; text: string };

/** Jeder Abruf in dieser Quelle, dessen Ziel unsere eigene Adresse ist. */
export function selbstabrufe(quelle: string): Selbstabruf[] {
  const code = ohneKommentare(quelle);
  const bezeichner = eigeneAdressBezeichner(code);
  const muster = [
    ...EIGENE_ADRESSE,
    ...bezeichner.map((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`)),
  ];
  const funde: Selbstabruf[] = [];
  for (const t of code.matchAll(/\bfetch\s*\(/g)) {
    const start = t.index! + t[0].length - 1;
    const arg = argumente(code, start);
    // Nur der ERSTE Parameter ist das Ziel. Der zweite trägt Kopfzeilen und
    // Rumpf, und dort darf unsere Adresse selbstverständlich vorkommen.
    const ziel = arg.slice(1, ersteKommaTiefe0(arg));
    if (muster.some((m) => m.test(ziel))) {
      funde.push({ zeile: code.slice(0, t.index!).split("\n").length, text: ziel.trim().replace(/\s+/g, " ").slice(0, 160) });
    }
  }
  return funde;
}

/** Position des Kommas, das den ersten Parameter beendet — auf Klammerebene 0. */
function ersteKommaTiefe0(arg: string): number {
  let tiefe = 0;
  for (let i = 0; i < arg.length; i++) {
    const z = arg[i];
    if (z === "(" || z === "{" || z === "[") tiefe++;
    else if (z === ")" || z === "}" || z === "]") {
      tiefe--;
      if (tiefe === 0) return i;
    } else if (z === "," && tiefe === 1) return i;
  }
  return arg.length;
}
