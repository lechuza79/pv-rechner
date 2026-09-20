/**
 * Kontakterfassung der Gemeinden — die erste Anwendung des allgemeinen Ablaufs
 * (scripts/lib/kontakt-lauf.ts). Hier steht nur, was an Gemeinden besonders ist:
 * woher die Einträge kommen, welche Seiten aus der früheren Erhebung schon
 * vorliegen, wie eine gemeinsame Verwaltung belegt wird und wohin die Funde
 * geschrieben werden.
 *
 *   --mode=evaluate   offline über gespeicherte Originale und früher geholte Seiten
 *   --mode=research   begrenzte Abrufe für Gemeinden ohne beide Kanäle
 *   --mode=summary    Zahlen über alle Ergebnisse, vollständiger Alt/Neu-Vergleich
 *   --mode=recheck    --recipients=<Datei>: Belegseite je Adresse erneut abrufen
 *   --mode=apply      belegte Fachkontakte in die Kontaktliste schreiben (--schreiben)
 *
 * Gemeinsam: --ids=A,B | --sample=DATEI (JSON {gruppe:[ids]}) | --part=i --parts=n
 *            --audit=DIR --out=DIR · research: --budget=15
 *
 * Ergebnisse liegen je Gemeinde und werden wiederverwendet, solange Regeln und
 * Eingaben gleich sind; ein abgebrochener Lauf macht dort weiter, wo er aufhörte.
 * Keine Mails, keine Modell-Aufrufe.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { parseGv100, hasSharedAdministration, type Gemeindeverband } from "../lib/gemeindeverband";
import { fachkontakteAus } from "../lib/kommunen-fachkontakt";
import { fold } from "../lib/kontakt-suche";
import { KOMMUNEN_ROLLENWERK, KOMMUNEN_SCOPE } from "../lib/contact-municipal-judge";
import {
  bewerten, laufen, nachpruefen, readJson, recherchieren, writeJson,
  type Bestand, type Eintrag, type Ergebnis, type Seite,
} from "./lib/kontakt-lauf";
import { DEFAULT_AUDIT, MAIN_CHECKOUT, extractionVersion, outDir, rulesVersion } from "./lib/contact-v2-config";

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const AUDIT = resolve(arg("audit") ?? DEFAULT_AUDIT);
const OUT = resolve(arg("out") ?? outDir(AUDIT));
const RECORDS = resolve(AUDIT, "workflow/corrected-selection/records");
const SCOPE = resolve(AUDIT, "workflow/current-municipal-scope.json");
const GV100 = resolve(AUDIT, "workflow/reference-review/GV100AD3108-GV100AD_31082026.txt");
const SNAPSHOT = resolve(AUDIT, "../population-2026-09-14/snapshot.json");
const mode = arg("mode") ?? "evaluate";
const BUDGET = Number(arg("budget") ?? 15);

/** Seiten, die die frühere Erhebung für diese Gemeinde schon geholt hat. */
function gespeicherteSeiten(record: any, inventoryId: string): Seite[] {
  const pages: Seite[] = [];
  const seen = new Set<string>();
  for (const s of record.sourceManifest ?? []) {
    seen.add(s.digest);
    pages.push({ url: s.url, digest: s.digest, path: s.path, kind: s.kind, valid: !!s.valid, origin: "stored" });
  }
  // Später nachgetragene Quellen: aufnehmen, auch wenn der Datensatz sie nicht kennt.
  const obsRoot = resolve(AUDIT, "supplemental", inventoryId, "observations");
  if (existsSync(obsRoot)) for (const file of readdirSync(obsRoot).filter(f => f.endsWith(".json"))) {
    const o = readJson(resolve(obsRoot, file));
    if (seen.has(o.sourceDigest)) continue;
    const kind = o.sourceKind === "original-http-html" ? "html" : o.sourceKind === "original-http-pdf" ? "pdf" : "browser";
    pages.push({ url: o.finalUrl, digest: o.sourceDigest, path: resolve(AUDIT, "supplemental", inventoryId, o.sourceDigest + (kind === "pdf" ? ".pdf" : ".html")), kind, valid: (o.httpStatus ?? 200) < 400, origin: "stored" });
  }
  return pages;
}

/** Die Wörter, an denen die gemeinsame Verwaltung in Titel und Domain erkennbar ist. */
function verbundVon(v: Gemeindeverband | undefined) {
  if (!hasSharedAdministration(v)) return null;
  const tokens = (v!.verbandName ?? "").split(/[\s,()/-]+/).map(fold)
    .filter(w => w.length >= 5 && !/^(verbands|samt|gemeinde|verwaltung|stadt)/.test(w));
  return { name: v!.verbandName ?? "", tokens };
}

function ladeBestand(): { bestand: Bestand; eintraege: Map<string, Eintrag> } {
  const snap = readJson(SNAPSHOT);
  const snapshot = new Map<string, any>(snap.kommunen.map((r: any) => [r.region_id, r]));
  const gv = parseGv100(readFileSync(GV100, "utf8"));
  const scope: any[] = readJson(SCOPE).items;
  const eintraege = new Map<string, Eintrag>();
  for (const row of scope) {
    const id = row.currentMunicipalityId;
    const s = snapshot.get(id) ?? snapshot.get(row.inventoryOrganizationId) ?? {};
    const record = readJson(resolve(RECORDS, `${id}.json`));
    const verband = gv.get(id);
    eintraege.set(id, {
      id, name: row.name, website: s.website ?? null,
      baseline: [s.email, s.rollen_email, s.presse_email, s.personen_email].filter((e: unknown): e is string => typeof e === "string"),
      verbund: verbundVon(verband),
      gespeicherteSeiten: gespeicherteSeiten(record, row.inventoryOrganizationId),
      offeneLinks: (record.researchGaps ?? []).filter((g: any) => g.kind === "unread-published-contact-link").map((g: any) => ({ url: g.url, priority: g.priority ?? 0 })),
      eingabe: [s.email, s.rollen_email, s.presse_email, s.personen_email],
      zusatz: {
        inventoryId: row.inventoryOrganizationId,
        verbandType: verband?.verbandType ?? null,
        verbandMembers: verband?.verbandMembers ?? null,
      },
    });
  }
  const bestand: Bestand = {
    name: "kommunen", out: OUT, rules: rulesVersion(), extraction: extractionVersion(),
    rollenwerk: KOMMUNEN_ROLLENWERK, scope: KOMMUNEN_SCOPE, linkProfil: "kommunen",
    eintraege: () => [...eintraege.values()],
    // Die gewachsenen Namen bleiben: Ergebnisse und Kontaktliste arbeiten damit.
    ergebnisForm: (basis: Ergebnis) => ({
      energy: basis.kanaele.energy ?? [],
      press: basis.kanaele.press ?? [],
      outcome: basis.outcome === "all-channels" ? "both-channels" : basis.outcome === "some-channels" ? "one-channel" : basis.outcome,
      administration: basis.verbund && Number(basis.verbandMembers ?? 0) > 1
        ? { name: basis.verbund.name, type: basis.verbandType, members: basis.verbandMembers, sites: basis.verbund.sites }
        : null,
    }),
    fertigWenn: (r: Ergebnis) => r.outcome === "both-channels",
  };
  return { bestand, eintraege };
}

function summary(bestand: Bestand, anzahl: number) {
  const dir = resolve(OUT, "results");
  const rows = readdirSync(dir).filter(f => f.endsWith(".json")).map(f => readJson(resolve(dir, f)));
  const count = (key: (r: any) => string) => rows.reduce((acc: Record<string, number>, r) => { const k = key(r); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
  const researchDir = resolve(OUT, "research");
  const logs = existsSync(researchDir) ? readdirSync(researchDir).map(f => readJson(resolve(researchDir, f))) : [];
  const out = {
    observedAt: new Date().toISOString(), rules: bestand.rules, population: anzahl, evaluated: rows.length,
    currentRules: rows.filter(r => r.rules === bestand.rules).length,
    verdicts: count(r => r.verdict), outcomes: count(r => r.outcome), reasons: count(r => r.reason.replace(/:.*/, "")),
    baselineStatuses: rows.flatMap(r => r.baseline).reduce((a: Record<string, number>, b: any) => { a[b.status] = (a[b.status] ?? 0) + 1; return a; }, {}),
    lostProvenContacts: rows.filter(r => r.verdict === "worse").length,
    municipalitiesWithEnergy: rows.filter(r => r.energy.length).length,
    municipalitiesWithPress: rows.filter(r => r.press.length).length,
    sharedAdministrationProofs: rows.filter(r => r.proofs.some((p: any) => p.scope.startsWith("shared-administration"))).length,
    research: { municipalities: logs.length, attempts: logs.reduce((n, l) => n + l.attempts.length, 0), pages: logs.reduce((n, l) => n + l.attempts.reduce((m: number, a: any) => m + a.fetched.length, 0), 0), errors: logs.reduce((n, l) => n + l.attempts.reduce((m: number, a: any) => m + a.fetched.filter((f: any) => f.error).length, 0), 0) },
    sendApproved: false,
  };
  writeJson(resolve(OUT, "summary.json"), out);
  console.log(JSON.stringify(out, null, 1));
}

/** Belegte Fachkontakte in die Kontaktliste schreiben; nur die eigenen Spalten. */
async function apply(bestand: Bestand) {
  const write = process.argv.includes("--schreiben");
  const dir = resolve(OUT, "results");
  const rows = readdirSync(dir).filter(f => f.endsWith(".json")).map(f => readJson(resolve(dir, f)));
  const stale = rows.filter(r => r.rules !== bestand.rules).length;
  if (stale) throw new Error(`${stale} Ergebnisse stammen aus älteren Regeln — erst neu auswerten`);
  const COLS = ["klima_email", "klima_beleg_url", "presse_kontakt_email", "presse_kontakt_beleg_url", "fachkontakte"] as const;
  const want = new Map<string, Record<(typeof COLS)[number], unknown>>(rows.map(r => {
    const k = fachkontakteAus(r);
    return [r.id, {
      klima_email: k.klima?.email ?? null, klima_beleg_url: k.klima?.belegUrl ?? null,
      presse_kontakt_email: k.presse?.email ?? null, presse_kontakt_beleg_url: k.presse?.belegUrl ?? null,
      fachkontakte: k.alle.length ? k.alle : null,
    }];
  }));
  const db = await dbClient();
  const current = new Map<string, any>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("kommunen_kontakt").select(`region_id, ${COLS.join(", ")}`).order("region_id").range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of (data ?? []) as any[]) current.set(r.region_id, r);
    if (!data || data.length < 1000) break;
  }
  const changes: any[] = [];
  const counts = { geaendert: 0, gleich: 0, nichtInListe: 0 };
  const now = new Date().toISOString();
  for (const [id, next] of want) {
    const cur = current.get(id);
    if (!cur) { if (next.fachkontakte) counts.nichtInListe++; continue; }
    if (COLS.every(c => JSON.stringify(cur[c] ?? null) === JSON.stringify(next[c]))) { counts.gleich++; continue; }
    counts.geaendert++;
    changes.push({ region_id: id, ...next, fachkontakte_at: next.fachkontakte ? now : null });
  }
  const values = [...want.values()];
  console.log(JSON.stringify({
    write, rules: bestand.rules, ...counts,
    mitKlima: values.filter(v => v.klima_email).length,
    mitPresse: values.filter(v => v.presse_kontakt_email).length,
    mitBeiden: values.filter(v => v.klima_email && v.presse_kontakt_email).length,
    kontakteGesamt: values.reduce((n, v) => n + ((v.fachkontakte as unknown[] | null)?.length ?? 0), 0),
  }, null, 1));
  if (!write) return console.log("Probelauf — nichts geschrieben. Mit --schreiben eintragen.");
  for (let i = 0; i < changes.length; i++) {
    const { region_id, ...fields } = changes[i];
    const { error } = await db.from("kommunen_kontakt").update(fields).eq("region_id", region_id);
    if (error) throw new Error(`${region_id}: ${error.message}`);
    if ((i + 1) % 500 === 0 || i + 1 === changes.length) console.log(`${i + 1} von ${changes.length} eingetragen`);
  }
}

async function dbClient() {
  const envPath = resolve(MAIN_CHECKOUT, ".env.local");
  const env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Belegseiten der geplanten Empfänger noch einmal abrufen. */
async function recheck(bestand: Bestand, eintraege: Map<string, Eintrag>) {
  const file = arg("recipients");
  if (!file) throw new Error("--recipients=<json: [{organizationId, email}]> fehlt");
  const recipients: { organizationId: string; email: string }[] = readJson(resolve(file));
  let bad = 0;
  for (const { organizationId: id, email } of recipients) {
    const e = eintraege.get(id);
    const out = e
      ? await nachpruefen(bestand, e, email)
      : { id, email: email.trim().toLowerCase(), rules: bestand.rules, checkedAt: new Date().toISOString(), ok: false, url: null as string | null, reason: "Gemeinde nicht im Bestand" };
    if (!out.ok) bad++;
    writeJson(resolve(OUT, "recheck", `${id}.json`), out);
    console.log(`${out.ok ? "✓" : "✗"} ${id} ${e?.name ?? ""} ${out.email}${out.ok ? "" : ` — ${out.reason}`}`);
  }
  console.log(`${recipients.length - bad} von ${recipients.length} bestätigt`);
}

async function main() {
  const { bestand, eintraege } = ladeBestand();
  if (mode === "summary") return summary(bestand, eintraege.size);
  if (mode === "apply") return apply(bestand);
  if (mode === "recheck") return recheck(bestand, eintraege);
  let rows = [...eintraege.values()];
  const ids = arg("ids")?.split(",") ?? (arg("sample") ? Object.values(readJson(resolve(arg("sample")!)) as Record<string, string[]>).flat() : null);
  if (ids) { const wanted = new Set(ids); rows = rows.filter(r => wanted.has(r.id)); }
  const parts = Number(arg("parts") ?? 1), part = Number(arg("part") ?? 0);
  rows = rows.filter((_, i) => i % parts === part);
  await laufen(bestand, rows, async e => {
    const r = mode === "research" ? await recherchieren(bestand, e, BUDGET) : bewerten(bestand, e);
    if (ids) console.log(e.id, e.name, JSON.stringify(mode === "research" ? r : { verdict: (r as Ergebnis).verdict, outcome: (r as Ergebnis).outcome, reason: (r as Ergebnis).reason }));
  }, `${mode}-${part}`);
}

main().catch(error => { console.error(error); process.exit(1); });
