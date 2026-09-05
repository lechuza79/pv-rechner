import "server-only";

/**
 * Vercel Web Analytics — die dritte Messquelle neben Search Console und
 * DataForSEO, und die einzige, die sagt, was NACH dem Klick passiert.
 *
 * WARUM SIE GEFEHLT HAT (28.08.2026): Die Messung läuft seit Mai und sammelt
 * Daten, aber niemand kam an sie heran. Das mitgelieferte Werkzeug antwortet
 * für jedes Projekt dieses Kontos „Web Analytics not found" — auch für Projekte,
 * bei denen die Auswertung nachweislich aktiviert ist und Daten hat. Der in der
 * Dokumentation beschriebene Weg funktioniert dagegen auf Anhieb. Wer hier
 * wieder auf ein „nicht gefunden" stößt: nicht die Aktivierung prüfen, sondern
 * den Aufrufweg.
 *
 * WAS SIE BEANTWORTET, WAS DIE ANDEREN NICHT KÖNNEN: Die Search Console zählt
 * Klicks in der Trefferliste, hier kommen die Besucher wirklich an — und man
 * sieht, woher. Erste Messung: 662 Besucher in 28 Tagen, davon 40 über Google
 * und 66 über Reddit. Ein Forum bringt also mehr als die Suchmaschine, und das
 * hätte keine der beiden anderen Quellen zeigen können.
 *
 * ZUGANG: `VERCEL_TOKEN` in der Umgebung, dazu Projekt- und Team-Kennung. Fehlt
 * das Token, meldet die Funktion das ausdrücklich, statt Nullen zu liefern —
 * eine Null ist von „gemessen, aber niemand kam" nicht zu unterscheiden.
 */

const BASE = "https://api.vercel.com/v1/query/web-analytics";

const TOKEN = process.env.VERCEL_TOKEN;
const PROJEKT = process.env.VERCEL_PROJECT_ID;
const TEAM = process.env.VERCEL_TEAM_ID;

export function analyticsKonfiguriert(): boolean {
  return !!(TOKEN && PROJEKT && TEAM);
}

export interface Aufrufe {
  /** Seitenaufrufe insgesamt. */
  aufrufe: number;
  /** Verschiedene Besucher. Immer kleiner als die Aufrufe. */
  besucher: number;
}

export interface HerkunftZeile {
  /** Die verweisende Domain — null bedeutet „ohne Herkunftsangabe". */
  herkunft: string | null;
  aufrufe: number;
  besucher: number;
}

function pruefeZugang(): void {
  if (!analyticsKonfiguriert()) {
    throw new Error(
      "Vercel-Zugang fehlt: VERCEL_TOKEN, VERCEL_PROJECT_ID und VERCEL_TEAM_ID müssen gesetzt sein.",
    );
  }
}

async function hole(pfad: string, params: Record<string, string>): Promise<unknown> {
  pruefeZugang();
  const url = new URL(`${BASE}/${pfad}`);
  url.searchParams.set("projectId", PROJEKT!);
  url.searchParams.set("teamId", TEAM!);
  for (const [k, val] of Object.entries(params)) url.searchParams.set(k, val);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Vercel-Analytics ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Aufrufe einer einzelnen Seite. Der Filter ist eine OData-Bedingung; der
 * Pfad wird in einfache Anführungszeichen gesetzt.
 *
 * Ein Pfad mit einem Apostroph würde den Ausdruck zerreißen — bei uns kommt das
 * nicht vor (unsere Adressen sind kleingeschrieben mit Bindestrichen), aber die
 * Verdopplung ist die Regel der Sprache und kostet nichts.
 */
export async function aufrufeFuerSeite(
  pfad: string,
  von: Date,
  bis: Date,
): Promise<Aufrufe> {
  const sicher = pfad.replace(/'/g, "''");
  const daten = (await hole("visits/count", {
    since: von.toISOString(),
    until: bis.toISOString(),
    filter: `requestPath eq '${sicher}'`,
  })) as { data?: { pageviews?: number; visitors?: number } };
  return {
    aufrufe: daten.data?.pageviews ?? 0,
    besucher: daten.data?.visitors ?? 0,
  };
}

/**
 * Woher die Besucher einer Seite kommen.
 *
 * „Ohne Herkunftsangabe" ist bei uns die mit Abstand größte Gruppe und **nicht**
 * gleichbedeutend mit „direkt eingetippt": Darin stecken Lesezeichen, Apps,
 * Verweise von verschlüsselten Seiten und ein Teil Maschinenverkehr. Sie wird
 * deshalb als eigene Zeile geführt und nicht als „direkt" beschriftet.
 */
export async function herkunftFuerSeite(
  pfad: string,
  von: Date,
  bis: Date,
  limit = 10,
): Promise<HerkunftZeile[]> {
  const sicher = pfad.replace(/'/g, "''");
  const daten = (await hole("visits/aggregate", {
    by: "referrerHostname",
    since: von.toISOString(),
    until: bis.toISOString(),
    limit: String(limit),
    filter: `requestPath eq '${sicher}'`,
  })) as { data?: { referrerHostname?: string | null; pageviews?: number; visitors?: number }[] };
  return (daten.data ?? [])
    .map((r) => ({
      // Vercel liefert für „ohne Herkunft" einen LEEREN Text, nicht null. Wer
      // nur auf null prüft, bekommt in der Anzeige eine namenlose Zeile mit der
      // größten Zahl — und die ist genau die, die erklärt werden muss.
      herkunft: r.referrerHostname ? r.referrerHostname : null,
      aufrufe: r.pageviews ?? 0,
      besucher: r.visitors ?? 0,
    }))
    .sort((a, b) => b.aufrufe - a.aufrufe);
}

/** Aufrufe je Seite über die ganze Domain — für Übersichten. */
export async function aufrufeJeSeite(
  von: Date,
  bis: Date,
  limit = 30,
): Promise<{ pfad: string; aufrufe: number; besucher: number }[]> {
  const daten = (await hole("visits/aggregate", {
    by: "requestPath",
    since: von.toISOString(),
    until: bis.toISOString(),
    limit: String(limit),
  })) as { data?: { requestPath?: string; pageviews?: number; visitors?: number }[] };
  return (daten.data ?? [])
    .map((r) => ({
      pfad: r.requestPath ?? "(unbekannt)",
      aufrufe: r.pageviews ?? 0,
      besucher: r.visitors ?? 0,
    }))
    .sort((a, b) => b.aufrufe - a.aufrufe);
}
