/**
 * Vorlauf-Messung für einen Schub des Releaseplans.
 *
 * Aufruf:  npm run release:messen [schub-id]
 *          npm run release:messen -- --trocken   (ohne Netz, zeigt nur die Fragen)
 *
 * WOZU: Ein Schub darf nur live gehen, wenn zwei Fragen mit Zahlen beantwortet
 * sind (CLAUDE.md, „Zwei Fragen vor jedem Livegang einer Seitengattung"):
 *   1. Wird auf dieser Ebene für diese Orte überhaupt gesucht?
 *   2. Steht auf denselben Anfragen schon eine andere eigene Seitenfamilie?
 *
 * Bis zum 19.08.2026 stand beides als Prosa im Runbook des SEO-Wächters — also
 * an einer Stelle, die einmal im Monat gelesen wird, während ein Schub an einem
 * beliebigen Tag ansteht. Dieser Befehl hängt die Messung an den PLAN statt an
 * den Kalender und liefert den Block, der in `nachweis` eingetragen wird.
 *
 * WICHTIG: Er entscheidet nichts. Er misst und legt das Ergebnis ab; ob der
 * Schub kommt, kleiner wird oder wegfällt, entscheidet danach ein Mensch oder
 * eine Sitzung mit Urteil. „Keine Nachfrage" ist ein gutes Ergebnis, kein
 * Fehlschlag — dann bleibt Arbeit ungetan, die niemandem genützt hätte.
 */
import fs from "node:fs";
import path from "node:path";
import { RELEASE_PLAN, naechsterSchub, type Schub } from "../lib/release-plan";
import { ATLAS_CITIES } from "../lib/atlas-cities";

const args = process.argv.slice(2);
const trocken = args.includes("--trocken");
const schubId = args.find((a) => !a.startsWith("--"));

const schub: Schub | undefined = schubId
  ? RELEASE_PLAN.find((s) => s.id === schubId)
  : (RELEASE_PLAN.find((s) => s.status === "geplant" && !s.nachweis && s.orte.length > 0) ?? naechsterSchub());

if (!schub) {
  console.log("Kein Schub zu messen — alle geplanten Schübe haben ihre Messung oder sind leer.");
  process.exit(0);
}
if (schub.orte.length === 0) {
  console.log(`Schub „${schub.id}" hat keine Orte — nichts zu messen.`);
  process.exit(0);
}

const ortName = (ags: string) => ATLAS_CITIES.find((c) => c.ags === ags)?.name ?? ags;
const orte = schub.orte.map((a) => ({ ags: a, name: ortName(a) }));

// Die Suchmuster je Seitengattung — das, was Nutzer wirklich tippen, nicht was
// wir die Seite nennen. Geld-Wörter für die Förderseite, Bestands-Wörter für die
// Atlas-Ortsseite; die Trennung ist dieselbe wie in der Rollentrennung.
const MUSTER: Record<string, (ort: string) => string[]> = {
  "foerder-stadt": (o) => [`photovoltaik förderung ${o}`, `solar zuschuss ${o}`],
  "atlas-gemeinde": (o) => [`photovoltaik ${o}`, `solaranlagen ${o}`],
  "atlas-landkreis": (o) => [`photovoltaik ${o}`],
  "atlas-bundesland": (o) => [`photovoltaik ${o}`],
};
const begriffe = orte.flatMap((o) => (MUSTER[schub.gattung] ?? MUSTER["foerder-stadt"])(o.name));

console.log(`\nVorlauf-Messung für „${schub.id}" (${schub.gattung}, ${schub.datum})`);
console.log(`  ${orte.length} Orte, ${begriffe.length} Suchbegriffe\n`);

if (trocken) {
  console.log("Trockenlauf — es werden keine Dienste abgefragt. Zu messen wäre:\n");
  for (const b of begriffe) console.log(`  ${b}`);
  console.log(
    "\nFrage 1 (Nachfrage): Suchvolumen je Begriff über DataForSEO, dazu die Gegenprobe an\n" +
      "wieistmeinsolar.de — dieselbe Datenbasis, dasselbe Produkt.\n" +
      "Frage 2 (Kannibalisierung): Für jeden Ortsnamen in der Search Console nachsehen, ob\n" +
      "bereits BEIDE Seitenfamilien auf denselben Anfragen erscheinen.\n",
  );
  process.exit(0);
}

const login = process.env.DATAFORSEO_LOGIN;
const passwort = process.env.DATAFORSEO_PASSWORD;
const cronSecret = process.env.CRON_SECRET;
const basis = process.env.SEO_BASE_URL || "https://solar-check.io";

const fehlend = [
  !login || !passwort ? "DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD" : null,
  !cronSecret ? "CRON_SECRET" : null,
].filter(Boolean);
if (fehlend.length) {
  console.error(
    `Zugangsdaten fehlen: ${fehlend.join(", ")}.\n` +
      "Der Befehl läuft dort, wo .env.local liegt (Haupt-Repo bzw. Wächter-Umgebung):\n" +
      "  source .env.local && npm run release:messen\n" +
      "Zum Ansehen ohne Netz: npm run release:messen -- --trocken",
  );
  process.exit(1);
}

/** Suchvolumen je Begriff (DataForSEO Labs). Ein Aufruf für alle Begriffe. */
async function volumen(): Promise<Map<string, number | null>> {
  const auth = Buffer.from(`${login}:${passwort}`).toString("base64");
  const res = await fetch("https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify([{ keywords: begriffe, location_code: 2276, language_code: "de" }]),
  });
  if (!res.ok) throw new Error(`DataForSEO antwortete ${res.status}`);
  const daten: any = await res.json();
  const treffer = daten?.tasks?.[0]?.result ?? [];
  const map = new Map<string, number | null>();
  for (const t of treffer) map.set(String(t.keyword).toLowerCase(), t.search_volume ?? null);
  return map;
}

/** Anfragen der Search Console, auf denen ein Ortsname vorkommt. */
async function anfragenJeOrt(): Promise<Map<string, { query: string; page: string; impressions: number; position: number }[]>> {
  const res = await fetch(`${basis}/api/seo/gsc?dim=query&days=90`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  if (!res.ok) throw new Error(`Search-Console-Route antwortete ${res.status}`);
  const daten: any = await res.json();
  const zeilen: any[] = daten?.queries ?? [];
  const map = new Map<string, any[]>();
  for (const o of orte) {
    const nadel = o.name.toLowerCase();
    map.set(
      o.ags,
      zeilen.filter((z) => String(z.query).toLowerCase().includes(nadel)),
    );
  }
  return map;
}

// Der Schub wird hereingereicht statt aus dem Aussenraum gelesen: Die Pruefungen
// oben schliessen `undefined` aus, aber TypeScript traegt diese Verengung nicht in
// eine verschachtelte Funktion hinein.
async function main(schub: Schub) {
  const vol = await volumen();
  const anfragen = await anfragenJeOrt();

  let mitNachfrage = 0;
  let gesamtVolumen = 0;
  const zeilen: string[] = [];
  const kollisionen: string[] = [];

  for (const o of orte) {
    const muster = (MUSTER[schub.gattung] ?? MUSTER["foerder-stadt"])(o.name);
    const werte = muster.map((b) => vol.get(b.toLowerCase()) ?? 0);
    const summe = werte.reduce((a, b) => a + b, 0);
    gesamtVolumen += summe;
    if (summe > 0) mitNachfrage++;

    const treffer = anfragen.get(o.ags) ?? [];
    const familien = new Set(
      treffer.map((t) => (String(t.page).includes("/solar-atlas/") ? "atlas" : String(t.page).includes("/photovoltaik-foerderung/") ? "foerderung" : "sonstige")),
    );
    familien.delete("sonstige");
    if (familien.size > 1) kollisionen.push(`${o.name}: ${treffer.length} Anfragen, beide Familien sichtbar`);

    zeilen.push(
      `| ${o.name} | ${muster.map((b, i) => `${b} = ${werte[i] ?? 0}`).join(" · ")} | ${summe} | ${treffer.length} |`,
    );
  }

  const heute = new Date().toISOString().slice(0, 10);
  const belegPfad = `docs/seo/schub-${schub.id}-${heute}.md`;
  const bericht = [
    `# Vorlauf-Messung „${schub.id}"`,
    "",
    `Gemessen am ${heute} · Gattung ${schub.gattung} · geplant für ${schub.datum}`,
    "",
    "## Frage 1 — wird gesucht?",
    "",
    `${mitNachfrage} von ${orte.length} Orten haben überhaupt ein messbares Suchvolumen; Summe ${gesamtVolumen}/Monat.`,
    "",
    "| Ort | Begriffe | Summe | eigene Anfragen (90 T) |",
    "|---|---|---|---|",
    ...zeilen,
    "",
    "## Frage 2 — steht schon eine andere eigene Seitenfamilie darauf?",
    "",
    kollisionen.length
      ? kollisionen.map((k) => `- ${k}`).join("\n")
      : "Keine Anfrage, auf der beide Seitenfamilien gleichzeitig erscheinen.",
    "",
    "## Rohdaten",
    "",
    "```json",
    JSON.stringify({ schub: schub.id, gemessenAm: heute, orte: orte.map((o) => o.ags), volumen: Object.fromEntries(vol) }, null, 2),
    "```",
    "",
  ].join("\n");

  fs.mkdirSync(path.dirname(belegPfad), { recursive: true });
  fs.writeFileSync(belegPfad, bericht);

  console.log(`Nachfrage: ${mitNachfrage} von ${orte.length} Orten messbar, Summe ${gesamtVolumen}/Monat`);
  console.log(kollisionen.length ? `Kollisionen: ${kollisionen.length}` : "Kollisionen: keine");
  console.log(`Beleg abgelegt: ${belegPfad}\n`);
  console.log("Für lib/release-plan.ts, falls der Schub kommen soll:\n");
  console.log(`    nachweis: {
        gemessenAm: "${heute}",
        nachfrage:
          "${mitNachfrage} von ${orte.length} Orten mit messbarem Suchvolumen, zusammen ${gesamtVolumen}/Monat.",
        kannibalisierung:
          "${kollisionen.length ? `${kollisionen.length} Orte, an denen beide Seitenfamilien auf denselben Anfragen stehen.` : "Keine Anfrage, auf der beide Seitenfamilien gleichzeitig erscheinen."}",
        beleg: "${belegPfad}",
      },`);
  console.log(
    "\nUnd das Urteil dazu faellt ein Mensch: Traegt die Nachfrage die Seiten? Wenn nicht,\n" +
      "wird der Schub kleiner oder faellt weg — das ist ein Ergebnis, kein Fehlschlag.\n",
  );
}

main(schub).catch((e) => {
  console.error(`Messung fehlgeschlagen: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
