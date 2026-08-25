// Abruf fremder Websites — die geteilte Mechanik für alle Erhebungen.
//
// WARUM ES DIESES MODUL GIBT: Am 23.08.2026 wurde gezählt, dass dieselbe
// Maschine im Repo dreimal existiert (Kommunen, Förderträger, Versorger) —
// `loadEnvFile` identisch in vier Skripten, dazu je ein eigener Abruf und eine
// eigene Linkauswertung. Jede Neuauflage verdient sich dieselben
// Kinderkrankheiten neu. Wer die vierte Zielgruppe erschließt (Solarteure),
// nimmt dieses Modul und schreibt nur noch das Vokabular dazu.
//
// Node-Modul, kein Browser: Es macht Netzzugriffe und gehört deshalb in Skripte
// und Server-Routen, nicht in Client-Komponenten.

/** Kennung, unter der wir auftreten. Ein Absender, unter dem man uns erreichen
 *  kann, ist bei einem Abruf über zehntausend fremde Server das Mindeste. */
export const UA = "solar-check.io erhebung/1.0 (+https://solar-check.io; hey@solar-check.io)";
export const ABRUF_TIMEOUT_MS = 15_000;
/** Gleichzeitige Abrufe. Vier verschiedene Hosts parallel ist höflich; mehr
 *  bringt wenig, weil ohnehin jeder Host nur einmal drankommt. */
export const PARALLEL = 4;

export type Abgerufen = { html: string } | { fehler: string };

/**
 * Eine HTML-Seite holen.
 *
 * Der Fehlgrund wird zurückgegeben statt verschluckt: Ein gescheiterter Abruf
 * ist ein eigener Zustand und darf nie als Befund „gibt es nicht" durchgehen —
 * dieselbe Trennung, die der Förder-Wächter mit seiner Kennung
 * `seite-unerreichbar` erzwingt.
 */
export async function holeSeite(url: string): Promise<Abgerufen> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ABRUF_TIMEOUT_MS);
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    if (!res.ok) return { fehler: `HTTP ${res.status}` };
    const typ = res.headers.get("content-type") ?? "";
    if (typ && !/text\/html|application\/xhtml/i.test(typ)) return { fehler: `Kein HTML (${typ.split(";")[0]})` };
    return { html: await res.text() };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { fehler: /abort/i.test(m) ? "Zeitüberschreitung" : m.slice(0, 120) };
  }
}

/** Roher Text einer Datei. Sitemaps sind XML — `holeSeite` würde sie wegen des
 *  Inhaltstyps verwerfen. */
export async function holeRoh(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ABRUF_TIMEOUT_MS);
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/**
 * Das Seitenverzeichnis einer Website aus ihrer eigenen Sitemap.
 *
 * WARUM DAS SEIN MUSS (gemessen 23.08.2026 an stadtwerke-lingen.de): Die
 * Hauptnavigation wird dort per JavaScript aufgebaut. Ein Abruf der Startseite
 * sieht zehn beschriftete Verweise — die Fußzeile — und keine einzige
 * Produktseite. Ein Crawl von der Startseite aus ist auf solchen Websites
 * strukturell blind, und er meldet das nicht, sondern liefert „nichts
 * gefunden". Dieselbe Lehre wie bei der Förder-Suche, die von der Startseite
 * aus nur 13 % der Förderseiten fand.
 *
 * Die Adresse der Sitemap kommt aus robots.txt — kein Rateweg über bekannte
 * CMS-Pfade, sondern die Stelle, an der die Website sie selbst nennt.
 */
export async function sitemapAdressen(basis: string, maxSitemaps = 8): Promise<string[]> {
  let robots: string | null = null;
  try {
    robots = await holeRoh(new URL("/robots.txt", basis).toString());
  } catch {
    return [];
  }
  const ausRobots = robots ? Array.from(robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)).map((m) => m[1]) : [];
  // DIE STANDARDADRESSE IMMER MITVERSUCHEN, nicht nur wenn robots.txt fehlt.
  // Eine erste Fassung nahm sie nur als Ersatz für eine fehlende robots.txt —
  // eine Website MIT robots.txt, aber ohne Sitemap-Zeile darin, war damit
  // vollständig unsichtbar, obwohl ihre Sitemap an der üblichen Stelle liegt.
  // Das ist kein Rateweg über CMS-Pfade: /sitemap.xml ist die im Standard
  // festgelegte Adresse, keine Vermutung über ein bestimmtes System.
  const erste = [...ausRobots];
  const standard = new URL("/sitemap.xml", basis).toString();
  if (!erste.includes(standard)) erste.push(standard);

  const adressen = new Set<string>();
  const offen = erste.slice(0, 3);
  const gesehen = new Set<string>();
  // Eine Ebene Sitemap-Index auflösen. Mehr wäre bei großen Websites ein
  // eigener Crawl, und den wollen wir hier nicht.
  for (let runde = 0; runde < 2 && offen.length; runde++) {
    for (const sm of offen.splice(0, maxSitemaps)) {
      if (gesehen.has(sm)) continue;
      gesehen.add(sm);
      const xml = await holeRoh(sm);
      if (!xml) continue;
      const istIndex = /<sitemapindex/i.test(xml);
      for (const m of Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi))) {
        const u = m[1].replace(/&amp;/g, "&");
        if (istIndex) offen.push(u);
        else adressen.add(u);
      }
    }
  }
  return [...adressen];
}

/** Wenige Aufgaben gleichzeitig, Reihenfolge egal. */
export async function inHaeppchen<T, R>(items: T[], groesse: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += groesse) {
    out.push(...(await Promise.all(items.slice(i, i + groesse).map(fn))));
  }
  return out;
}
