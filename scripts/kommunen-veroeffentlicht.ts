/**
 * Sucht Veröffentlichungen: Welche angeschriebene Gemeinde verlinkt uns?
 *
 * DAS IST DIE EIGENTLICHE MESSGRÖSSE des Kommunen-Outreach. Die Antwortquote
 * misst Höflichkeit — wer die Meldung übernimmt, schreibt uns dafür nicht. Der
 * Beleg ist der Link auf der Gemeindeseite, und den findet man, ohne jemanden
 * zu fragen.
 *
 *   npm run kommunen:veroeffentlicht              nur ansehen
 *   npm run kommunen:veroeffentlicht -- --schreiben   Status nachtragen
 *
 * EINE Anfrage für alle Gemeinden, nicht eine je Gemeinde: Gefragt wird nach
 * den Verweisen auf UNSERE Domain, danach werden die verweisenden Domains gegen
 * die Websites der angeschriebenen Gemeinden gehalten. Kostet rund drei Cent je
 * Lauf statt neunundsiebzig Abrufen fremder Server.
 *
 * ZWEI GRENZEN, die das Ergebnis zur UNTERGRENZE machen — wer sie übersieht,
 * liest ein zu niedriges Ergebnis als Misserfolg:
 *
 *   1. Ein Verzeichnis der Verweise hinkt nach. Ein heute veröffentlichter Link
 *      taucht dort Tage bis Wochen später auf. Kurz nach einem Versand ist ein
 *      leeres Ergebnis kein Befund.
 *   2. Eine Veröffentlichung OHNE Link zählt nicht mit — Mitteilungsblatt auf
 *      Papier, oder jemand übernimmt den Text und lässt die Adresse weg. Genau
 *      darum bittet der Brief, aber es passiert.
 *
 * Der schnellere, kostenlose Gegenkanal ist die Besucherstatistik: Aufrufe mit
 * einer Gemeinde-Domain als Herkunft erscheinen sofort. Sie ist über die
 * Abfrage-Schnittstelle für dieses Konto nicht erreichbar, im Dashboard aber
 * sichtbar.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { notizZeile } from "../lib/outreach-ruecklauf";
import { releaseFreigegeben } from "../lib/release-plan";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function log(msg = "", level: "info" | "ok" | "err" | "warn" = "info"): void {
  const prefix = level === "ok" ? "✓ " : level === "err" ? "✗ " : level === "warn" ? "! " : "  ";
  // eslint-disable-next-line no-console
  console.log(msg ? prefix + msg : "");
}

function loadEnvFile(): void {
  const p = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(p)) return;
  for (const zeile of readFileSync(p, "utf8").split("\n")) {
    const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const hat = (name: string) => process.argv.includes(`--${name}`);

/** Domain ohne www und ohne Pfad — beide Seiten müssen gleich normalisiert werden. */
function domain(url: string | null): string {
  if (!url) return "";
  const roh = url.replace(/^https?:\/\//i, "").split("/")[0];
  return roh.replace(/^www\./i, "").toLowerCase();
}

async function main(): Promise<void> {
  loadEnvFile();
  const login = process.env.DATAFORSEO_LOGIN;
  const passwort = process.env.DATAFORSEO_PASSWORD;
  if (!login || !passwort) {
    throw new Error(
      "DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD fehlen — ohne Zugang lässt sich nicht sagen, ob jemand verlinkt. " +
        "Nicht dasselbe wie „niemand verlinkt\".",
    );
  }
  const auth = "Basic " + Buffer.from(`${login}:${passwort}`).toString("base64");

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, key, { auth: { persistSession: false } });

  // Nur angeschriebene Gemeinden. Ein Verweis von einer Gemeinde, die wir nie
  // angeschrieben haben, ist erfreulich, gehört aber nicht in diese Auswertung.
  const { data, error } = await db
    .from("kommunen_kontakt")
    .select("region_id, website, outreach_status, contacted_at, notes, mastr_regions!inner(name)")
    .not("contacted_at", "is", null);
  if (error) throw new Error(`Konnte die Gemeinden nicht lesen: ${error.message}`);
  const gemeinden = (data ?? []) as unknown as {
    region_id: string;
    website: string | null;
    outreach_status: string;
    notes: string | null;
    mastr_regions: { name: string };
  }[];
  const perDomain = new Map<string, (typeof gemeinden)[number]>();
  for (const g of gemeinden) {
    const d = domain(g.website);
    if (d) perDomain.set(d, g);
  }
  log(`${gemeinden.length} angeschriebene Gemeinden, davon ${perDomain.size} mit bekannter Website`);

  const res = await fetch("https://api.dataforseo.com/v3/backlinks/backlinks/live", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify([
      {
        target: "solar-check.io",
        mode: "as_is",
        limit: 1000,
        backlinks_status_type: "live",
        // Interne Verweise interessieren hier nicht.
        exclude_internal_backlinks: true,
      },
    ]),
  });
  if (!res.ok) throw new Error(`DataForSEO antwortete ${res.status}`);
  const j = (await res.json()) as {
    cost?: number;
    tasks?: { status_message?: string; result?: { items?: { domain_from?: string; url_from?: string; first_seen?: string }[] }[] }[];
  };
  const items = j.tasks?.[0]?.result?.[0]?.items ?? [];
  log(`${items.length} Verweise abgerufen · Kosten ${(j.cost ?? 0).toFixed(4)} $`);

  const treffer = new Map<string, { name: string; url: string; seit: string; region_id: string; status: string; notes: string | null }>();
  for (const it of items) {
    const d = domain(it.domain_from ?? null);
    const g = perDomain.get(d);
    if (!g) continue;
    // Je Gemeinde der ERSTE gefundene Verweis — mehrere Unterseiten derselben
    // Gemeinde sind eine Veröffentlichung, nicht drei.
    if (!treffer.has(g.region_id)) {
      treffer.set(g.region_id, {
        name: g.mastr_regions.name,
        url: it.url_from ?? "",
        seit: (it.first_seen ?? "").slice(0, 10),
        region_id: g.region_id,
        status: g.outreach_status,
        notes: g.notes,
      });
    }
  }

  log();
  if (!treffer.size) {
    log("Keine angeschriebene Gemeinde verlinkt uns bisher.", "warn");
    log("Kurz nach einem Versand ist das erwartbar — Verweis-Verzeichnisse hinken Tage bis Wochen nach.");
    return;
  }
  log(`${treffer.size} ${treffer.size === 1 ? "Gemeinde verlinkt" : "Gemeinden verlinken"} uns:`, "ok");
  for (const t of treffer.values()) log(`  ${t.name} — ${t.url}${t.seit ? ` (seit ${t.seit})` : ""}`);

  // Zeigt der Verweis auf eine Seite, die wir für Suchmaschinen gesperrt haben?
  //
  // WOZU: Am 29.08.2026 verlinkte Heringen (Werra) unsere Gemeindeseite in einer
  // eigenen Meldung — der erste redaktionelle Verweis dieses Projekts. Die Seite
  // stand auf `noindex, nofollow`, die Empfehlung lief also ins Leere. Aufgefallen
  // ist das durch Zufall bei einer Wettbewerbsanalyse, nicht durch einen Lauf.
  //
  // Freigegeben wird weiterhin von Hand über den Releaseplan (ein Ort, ein
  // Eintrag, ein Nachweis) — eine Seite, die live geht, weil ein Datenbankfeld
  // kippt, wäre genau die Automatik, gegen die der Plan gebaut wurde. Dieser
  // Block ersetzt die Entscheidung nicht, er sorgt nur dafür, dass sie ansteht.
  const offen = [...treffer.values()].filter((t) => !releaseFreigegeben("atlas-gemeinde", t.region_id));
  if (offen.length) {
    log();
    log(`${offen.length} davon zeigen auf eine GESPERRTE Seite — die Empfehlung verpufft:`, "warn");
    for (const t of offen) log(`  ${t.name} (${t.region_id})`);
    log();
    log("Zu tun: je Ort einen Beleg-Schub in lib/release-plan.ts eintragen");
    log("(zweck: \"beleg\", genau ein Ort, Nachweis mit ausdrücklichem „keine Nachfrage\").");
    log("Muster: w5-atlas-outreach-beleg.");
  }

  if (!hat("schreiben")) {
    log();
    log("Nichts geschrieben. Zum Nachtragen: --schreiben", "warn");
    return;
  }

  let geschrieben = 0;
  for (const t of treffer.values()) {
    if (t.status === "veroeffentlicht") continue;
    const notiz = notizZeile({
      datum: t.seit || new Date().toISOString().slice(0, 10),
      art: "antwort",
      betreff: `veröffentlicht: ${t.url}`,
      von: domain(t.url),
    });
    if ((t.notes ?? "").split("\n").includes(notiz)) continue;
    const { error: e } = await db
      .from("kommunen_kontakt")
      .update({
        outreach_status: "veroeffentlicht",
        notes: t.notes ? `${t.notes}\n${notiz}` : notiz,
        updated_at: new Date().toISOString(),
      })
      .eq("region_id", t.region_id)
      // GESPERRT BLEIBT GESPERRT, auch wenn irgendwo ein Link steht — dieselbe
      // Einbahnstraße wie beim Rücklauf.
      .neq("outreach_status", "gesperrt");
    if (e) throw new Error(`${t.name}: ${e.message}`);
    geschrieben++;
  }
  log();
  log(`${geschrieben} ${geschrieben === 1 ? "Gemeinde" : "Gemeinden"} auf „veröffentlicht" gesetzt`, "ok");
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
