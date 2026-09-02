/**
 * Wer von den angeschriebenen Gemeinden verlinkt uns WIRKLICH?
 *
 *   npm run kommunen:verweise                 nur ansehen
 *   npm run kommunen:verweise -- --schreiben  Befunde in der Tabelle vermerken
 *   npm run kommunen:verweise -- --trocken    nur zeigen, was gefragt würde
 *
 * WARUM ES DIESEN LAUF BRAUCHT — und warum das Verweis-Verzeichnis ihn nicht
 * ersetzt (gemessen 29.08.2026):
 *
 *   Wallertheim veröffentlichte eine eigene Meldung mit Link auf unsere
 *   Ortsseite in seiner DORF-APP. Ergebnis: 47 Besucher, mehr als jede andere
 *   Atlas-Seite. Das Verweis-Verzeichnis kannte null Links — Verzeichnisse
 *   crawlen App-Plattformen nicht. Die Besucherstatistik half auch nicht: Der
 *   Link trägt `rel="noreferrer"`, es kommt also keine Herkunft an. Gefunden
 *   wurde er erst über eine Suchmaschinen-Abfrage auf ihre Domain.
 *
 * Deshalb fragt dieser Lauf die Suchmaschine je Gemeinde-Domain nach unserem
 * Namen — dasselbe Mittel, mit dem der Förder-Crawl Seiten tief im Menü findet.
 * Er ist die ZWEITE Quelle neben `npm run kommunen:veroeffentlicht`, nicht deren
 * Ersatz: Das Verzeichnis findet Verweise von Domains, an die wir nie
 * geschrieben haben; dieser Lauf findet Verweise, die kein Verzeichnis kennt.
 *
 * Er ändert nichts an der Freigabe — die hängt seit dem 29.08.2026 am Versand,
 * nicht am Nachweis. Er beantwortet die andere Frage: Wirkt der Outreach?
 */
import { envLaden } from "./env-laden";
envLaden();
import { createClient } from "@supabase/supabase-js";

const trocken = process.argv.includes("--trocken");
const schreiben = process.argv.includes("--schreiben");
/** Der Tag wird EINMAL genommen und durchgereicht — kein zweiter Aufruf mitten im Lauf. */
const heute = new Date().toISOString().slice(0, 10);
const LOGIN = process.env.DATAFORSEO_LOGIN;
const PASSWORT = process.env.DATAFORSEO_PASSWORD;
const PREIS_JE_ABRUF = 0.002;
let ausgegeben = 0;

/** Domain ohne Schema, ohne www, ohne Pfad. */
function domain(url: string | null): string {
  if (!url) return "";
  return url
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .replace(/^www\./i, "")
    .toLowerCase();
}

async function serp(frage: string): Promise<{ adressen: string[]; fehler: string | null }> {
  const auth = Buffer.from(`${LOGIN}:${PASSWORT}`).toString("base64");
  try {
    const res = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify([{ keyword: frage, location_code: 2276, language_code: "de", depth: 10 }]),
    });
    ausgegeben += PREIS_JE_ABRUF;
    if (!res.ok) return { adressen: [], fehler: `HTTP ${res.status}` };
    const d: any = await res.json();
    const a = d?.tasks?.[0];
    // „Keine Treffer" ist ein ERGEBNIS, kein Fehlschlag — die Schnittstelle
    // meldet es aber als Fehlercode. Ohne diese Trennung liest der Bericht
    // „Abruf gescheitert", wo sauber „nichts gefunden" geantwortet wurde.
    if (/no search results/i.test(String(a?.status_message ?? ""))) return { adressen: [], fehler: null };
    if (a?.status_code >= 40000) return { adressen: [], fehler: String(a.status_message) };
    const items: any[] = a?.result?.[0]?.items ?? [];
    return {
      adressen: items.filter((i) => i?.type === "organic" && i.url).map((i) => String(i.url)),
      fehler: null,
    };
  } catch (e) {
    ausgegeben += PREIS_JE_ABRUF;
    return { adressen: [], fehler: String((e as Error)?.message ?? e).slice(0, 60) };
  }
}

type Befund = "link" | "erwaehnt" | "fehltreffer" | "unerreichbar";

/**
 * Steht auf der gefundenen Seite wirklich ein Verweis auf uns?
 *
 * Drei Ausgänge, und die Unterscheidung trägt Bedeutung: Ein echter Link zählt
 * für die Autorität. Eine bloße Erwähnung heißt, dass die Gemeinde unseren Text
 * übernommen und die Adresse weggelassen hat — ein Ergebnis für den Outreach,
 * kein Verweis. Ein Fehlgriff ist gar nichts.
 */
async function pruefeSeite(url: string): Promise<Befund> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return "unerreichbar";
    const html = await res.text();
    // Es zählt NUR ein Link auf unsere DOMAIN — nicht das Wort „Solar-Check".
    // Gemessen am 29.08.2026: Wedemark schien uns zweimal zu erwähnen, gemeint
    // war die „Solar-Check-Beratung" der Klimaschutzagentur Hannover, eine
    // Meldung davon von 2013. „Solar-Check" ist ein Gattungsbegriff, den
    // mindestens sechs Anbieter führen.
    if (/<a[^>]*href="[^"]*solar-check\.io[^"]*"[^>]*>/i.test(html)) return "link";
    return /solar-check\.io/i.test(html) ? "erwaehnt" : "fehltreffer";
  } catch {
    return "unerreichbar";
  }
}

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db
    .from("kommunen_kontakt")
    .select("region_id, website, outreach_status, mastr_regions!inner(name)")
    .not("contacted_at", "is", null)
    .limit(1000);
  if (error) throw new Error(error.message);

  const gemeinden = ((data ?? []) as any[])
    .map((z) => ({
      ags: z.region_id,
      name: z.mastr_regions?.name ?? z.region_id,
      domain: domain(z.website),
      status: z.outreach_status,
    }))
    .filter((g) => g.domain);

  console.log(`${gemeinden.length} angeschriebene Gemeinden mit bekannter Website\n`);

  if (trocken) {
    console.log(`Zu fragen wären ${gemeinden.length} Suchmaschinen-Abrufe`);
    console.log(`(je „site:<domain> solar-check"), geschätzt ${(gemeinden.length * PREIS_JE_ABRUF).toFixed(2)} $.\n`);
    for (const g of gemeinden.slice(0, 8)) console.log(`  site:${g.domain} solar-check`);
    console.log(`  … und ${gemeinden.length - 8} weitere`);
    return;
  }

  if (!LOGIN || !PASSWORT) {
    console.error("Zugangsdaten fehlen (DATAFORSEO_LOGIN/PASSWORD).");
    process.exit(1);
  }

  const treffer: { name: string; ags: string; url: string; status: string; art: Befund }[] = [];
  const fehlgeschlagen: string[] = [];

  for (const g of gemeinden) {
    // Auch die App-Subdomain fragen: Wallertheims Verweis lag unter app.<domain>,
    // und die site:-Abfrage auf die Hauptdomain fand ihn nicht.
    const fragen = [`site:${g.domain} solar-check`, `site:app.${g.domain} solar-check`];
    const gesehen = new Set<string>();
    let gescheitert = 0;
    for (const f of fragen) {
      const { adressen, fehler } = await serp(f);
      if (fehler) {
        gescheitert++;
        continue;
      }
      for (const u of adressen) gesehen.add(u);
    }
    if (gescheitert === fragen.length) {
      fehlgeschlagen.push(`${g.name}: Abruf kam nicht durch`);
      continue;
    }
    for (const u of gesehen) {
      treffer.push({ name: g.name, ags: g.ags, url: u, status: g.status, art: await pruefeSeite(u) });
    }
  }

  // NACH ART GETRENNT AUSWEISEN. Die Suchmaschine liefert auch Seiten, auf denen
  // unser Name gar nicht vorkommt (gemessen 29.08.2026: von acht Treffern waren
  // zwei echte Verweise, zwei reine Erwähnungen und zwei Fehlgriffe — darunter
  // ein Flächennutzungsplan von 2021). Eine ungeprüfte Trefferzahl wäre eine
  // Behauptung, keine Messung.
  const echte = treffer.filter((t) => t.art === "link");
  const erwaehnt = treffer.filter((t) => t.art === "erwaehnt");
  const daneben = treffer.filter((t) => t.art === "fehltreffer");

  console.log(`ECHTE VERWEISE: ${echte.length}\n`);
  for (const t of echte) {
    console.log(`  ${t.name.padEnd(26)} ${t.url}`);
    console.log(`  ${"".padEnd(26)} Status im Outreach: ${t.status}`);
  }

  if (erwaehnt.length) {
    console.log(`\nNUR ERWÄHNT, KEIN LINK: ${erwaehnt.length}`);
    console.log(`  (Der Text wurde übernommen, die Adresse weggelassen — der Brief bittet darum.)`);
    for (const t of erwaehnt) console.log(`  ${t.name.padEnd(26)} ${t.url}`);
  }
  if (daneben.length) console.log(`\nFehlgriffe der Suchmaschine (aussortiert): ${daneben.length}`);

  // BEFUNDE IN DIE TABELLE SCHREIBEN, sonst beginnt jeder Lauf bei null.
  //
  // Ohne das stand der wichtigste Fund dieses Laufs nur in einer Bildschirm-
  // ausgabe: Wedemark hat unseren Text in zwei Meldungen übernommen und die
  // Adresse weggelassen. Beim nächsten Lauf wäre er erneut „gefunden" worden,
  // ohne dass jemand gemerkt hätte, dass er längst bekannt ist — dieselbe
  // Fehlerklasse, die den Förder-Screening ohne Gedächtnis unbrauchbar machte.
  //
  // Geschrieben wird NUR die Notiz, nie der Status: Ob eine Gemeinde als
  // „veröffentlicht" gilt, entscheidet der Veröffentlichungs-Lauf. Zwei
  // Schreibwege auf dasselbe Feld wären die Doppelpflege, an der hier schon
  // anderes gescheitert ist.
  if (!schreiben) {
    console.log(`\nNichts in die Tabelle geschrieben. Zum Nachtragen: --schreiben`);
  } else {
    let notiert = 0;
    for (const t of [...echte, ...erwaehnt]) {
      const { data: zeile } = await db
        .from("kommunen_kontakt")
        .select("notes")
        .eq("region_id", t.ags)
        .maybeSingle();
      const alt = (zeile as { notes: string | null } | null)?.notes ?? "";
      const notiz =
        t.art === "link"
          ? `[${heute}] verweis gefunden: ${t.url}`
          : `[${heute}] text uebernommen OHNE link: ${t.url}`;
      // Dieselbe Adresse nicht zweimal vermerken — der Lauf wiederholt sich.
      if (alt.includes(t.url)) continue;
      const { error: e } = await db
        .from("kommunen_kontakt")
        .update({ notes: alt ? `${alt}\n${notiz}` : notiz, updated_at: new Date().toISOString() })
        .eq("region_id", t.ags)
        .neq("outreach_status", "gesperrt");
      if (e) throw new Error(`${t.name}: ${e.message}`);
      notiert++;
    }
    console.log(`\n${notiert} ${notiert === 1 ? "Befund" : "Befunde"} in der Tabelle vermerkt`);
  }

  if (fehlgeschlagen.length) {
    console.log(`\nABRUF KAM NICHT DURCH: ${fehlgeschlagen.length}`);
    for (const f of fehlgeschlagen.slice(0, 10)) console.log(`  ${f}`);
  }

  console.log(`\nKosten: ${ausgegeben.toFixed(3)} $`);
  console.log(
    `\nVORBEHALT: Gefunden wird nur, was eine Suchmaschine kennt. Ein Verweis in einem\n` +
      `gedruckten Mitteilungsblatt oder einem geschlossenen Kanal taucht hier nicht auf —\n` +
      `die Zahl ist eine Untergrenze, keine Bilanz.`,
  );
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
