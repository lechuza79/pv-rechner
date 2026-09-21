/**
 * Der Ablauf hinter jeder Kontakterfassung: bewerten, gezielt nachrecherchieren,
 * zusammenfassen — unabhängig davon, WER erfasst wird (19.09.2026).
 *
 * Gebaut aus der Gemeinde-Erfassung, deren Lehren hier alle drinstecken:
 *  - Jede Seite wird EINMAL ausgewertet und nach ihrem Fingerabdruck
 *    zwischengespeichert; eine Regeländerung wertet neu, die geholten Seiten
 *    bleiben liegen.
 *  - Jeder Fund trägt seine Belegseite mit Fingerabdruck. Ohne Beleg kein Fund.
 *  - Die Nachrecherche hat ein Budget je Eintrag und endet in einem festen
 *    Zustand; ein zweiter Anlauf nur, wenn die Seite gar nicht erreichbar war.
 *  - Abgerufen wird nur die eigene Website (und die belegte gemeinsame
 *    Verwaltung), ein Abruf je Host alle 1,2 Sekunden.
 *  - Der Lauf hält sich selbst am Leben: eine hängende Anfrage darf nicht wie
 *    ein fertiger Lauf aussehen (zweimal passiert, 18.09.2026).
 *
 * Was je Bestand verschieden ist, steht im `Bestand`: welche Einträge, welche
 * Rollen, welche gespeicherten Seiten es schon gibt und wohin geschrieben wird.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { contactCandidates, type ContactCandidate } from "../../lib/contact-evidence";
import { contactLinks } from "../../lib/contact-discovery";
import { contactRoleContext } from "../../lib/contact-role-context";
import { vcardToHtml } from "../../lib/mail-deobfuscation";
import {
  applyScope, consolidate, headingContext, host, judgeEvidence, selectAndCompare, siteOf,
  type Evidence, type Mailbox, type Rollenwerk, type ScopeRegeln, type Verbund,
} from "../../lib/kontakt-suche";

export const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
export const readJson = (p: string) => JSON.parse(readFileSync(p, "utf8"));
export function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 1) + "\n", { mode: 0o600 });
  renameSync(tmp, path);
}

export type Seite = { url: string; digest: string; path: string | null; kind: string; valid: boolean; origin: "stored" | "research" };
export type Eintrag = {
  id: string;
  name: string;
  website: string | null;
  /** Bisher bekannte Adressen — sie gehen nie verloren, sondern werden bewertet. */
  baseline: string[];
  /** Gemeinsame Verwaltung o. Ä., falls belegt. */
  verbund: Verbund | null;
  /** Bereits vorhandene Seiten (aus früheren Erhebungen), ohne die selbst geholten. */
  gespeicherteSeiten: Seite[];
  /** Weitere bekannte, aber ungelesene Adressen mit Priorität. */
  offeneLinks?: { url: string; priority: number }[];
  /** Fließt in den Eingabe-Fingerabdruck ein: ändert sich das, wird neu bewertet. */
  eingabe: unknown[];
  /** Wird unverändert ins Ergebnis übernommen. */
  zusatz?: Record<string, unknown>;
};

export type Bestand = {
  /** Kurzname, erscheint im Ergebnis. */
  name: string;
  /** Arbeitsverzeichnis: Ergebnisse, Seiten-Zwischenspeicher, geholte Seiten. */
  out: string;
  /** Fassung der Regeln und der Extraktion — eine Änderung wertet neu. */
  rules: string;
  extraction: string;
  rollenwerk: Rollenwerk;
  scope: ScopeRegeln;
  /** Linkprofil für die Seitensuche ("kommunen" oder "betriebe"). */
  linkProfil: string;
  /** Alle Einträge des Bestands. */
  eintraege(): Eintrag[];
  /** Ergebnis-Felder, die dieser Bestand zusätzlich führt (z. B. eigene Kanalnamen). */
  ergebnisForm?(basis: Ergebnis, mailboxes: Mailbox[]): Record<string, unknown>;
  /** Wie viele Kanäle ein Eintrag haben kann — erreicht er sie alle, wird nicht weiter gesucht. */
  fertigWenn?(ergebnis: Ergebnis): boolean;
  /**
   * Welche Seite zuerst geholt wird. Die Grundwertung ist auf Verwaltungen
   * geeicht (Ansprechpartner-Verzeichnisse zuerst, Impressum zuletzt). Bei
   * einem redaktionellen Angebot ist es umgekehrt: Dort steht die
   * Pflichtangabe im Impressum, und Verzeichnisse gibt es gar nicht.
   */
  linkVorrang?(url: string, grundwert: number): number;
};

export type Ergebnis = {
  schema: number; rules: string; inputDigest: string; evaluatedAt: string;
  id: string; name: string; website: string | null;
  verbund: { name: string; sites: string[] } | null;
  pages: { read: number; pdf: number; unreadable: number };
  baseline: { email: string; status: string; channels: string[] }[];
  kanaele: Record<string, string[]>;
  general: string[]; selected: string[];
  verdict: string; reason: string; outcome: string;
  proofs: { email: string; channels: string[]; scope: string; url: string; digest: string; block: string; headings: string[] }[];
  openLinks: { url: string; priority: number }[];
  [extra: string]: unknown;
};

function decode(bytes: Buffer) {
  const charset = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(bytes.subarray(0, 8192).toString("latin1"))?.[1];
  try { return new TextDecoder(charset ?? "utf-8").decode(bytes); } catch { return bytes.toString("utf8"); }
}

type Parsed = { candidates: ContactCandidate[]; headings: Record<string, string[]>; title: string; links: { url: string; priority: number }[] };

/** Die Extraktion je Seite ist der teure Teil; sie hängt am Fingerabdruck der Seite. */
export function parsePage(b: Bestand, page: Seite, domain: string): Parsed {
  const cachePath = resolve(b.out, "page-cache", b.extraction, page.digest.slice(0, 2), `${sha(page.digest + page.url + domain)}.json`);
  if (existsSync(cachePath)) return readJson(cachePath);
  const html = decode(readFileSync(page.path!));
  const candidates = contactRoleContext(html, contactCandidates(html, page.url, domain)).candidates;
  const context = headingContext(html);
  const parsed: Parsed = { candidates, headings: Object.fromEntries(context.headings), title: context.title, links: contactLinks(html, page.url, domain, b.linkProfil as "kommunen") };
  writeJson(cachePath, parsed);
  return parsed;
}

/** Selbst geholte Seiten eines Eintrags (aus früheren Läufen dieses Bestands). */
export function eigeneSeiten(b: Bestand, id: string): Seite[] {
  const dir = resolve(b.out, "sources", id);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith(".json")).map(f => {
    const meta = readJson(resolve(dir, f));
    return { url: meta.finalUrl ?? meta.url, digest: meta.digest, path: resolve(dir, `${meta.digest}.html`), kind: "html", valid: true, origin: "research" as const };
  });
}

export function bewerten(b: Bestand, e: Eintrag): Ergebnis {
  const pages = [...e.gespeicherteSeiten, ...eigeneSeiten(b, e.id)];
  const inputDigest = sha(JSON.stringify([pages.map(p => [p.url, p.digest, p.valid]), e.website, ...e.eingabe]));
  const resultPath = resolve(b.out, "results", `${e.id}.json`);
  if (existsSync(resultPath)) {
    const prior = readJson(resultPath) as Ergebnis;
    if (prior.rules === b.rules && prior.inputDigest === inputDigest) return prior;
  }
  const domain = host(e.website ?? "");
  const asOf = new Date().toISOString();
  let evidence: Evidence[] = [];
  const titles = new Map<string, string>();
  const links = new Map<string, number>();
  const limits = { unreadable: 0, pdf: 0, read: 0 };
  for (const page of pages) {
    if (page.kind !== "html") { limits.pdf++; continue; }
    if (!page.valid || !page.path || !existsSync(page.path) || sha(readFileSync(page.path)) !== page.digest) { limits.unreadable++; continue; }
    limits.read++;
    const parsed = parsePage(b, page, domain);
    titles.set(page.url, parsed.title);
    const org = { id: e.id, name: e.name, website: e.website };
    for (const c of parsed.candidates) evidence.push(judgeEvidence(c, parsed.headings[c.email.toLowerCase()] ?? [], { url: page.url, digest: page.digest, valid: true }, org, asOf, b.rollenwerk));
    for (const l of parsed.links) if (l.priority >= 70) links.set(l.url, Math.max(links.get(l.url) ?? 0, l.priority));
  }
  for (const l of e.offeneLinks ?? []) links.set(l.url, Math.max(links.get(l.url) ?? 0, l.priority));
  for (const p of pages) links.delete(p.url);
  evidence = applyScope(evidence, titles, { id: e.id, name: e.name, website: e.website }, e.verbund, b.scope);
  const mailboxes = consolidate(evidence, b.rollenwerk);
  const comparison = selectAndCompare(mailboxes, e.baseline, b.rollenwerk);
  const verbundSites = [...new Set(evidence.filter(x => x.scope.startsWith("shared-administration")).map(x => siteOf(host(x.url))))];
  const basis: Ergebnis = {
    schema: 2, rules: b.rules, inputDigest, evaluatedAt: asOf, id: e.id, name: e.name, website: e.website,
    verbund: e.verbund ? { name: e.verbund.name, sites: verbundSites } : null,
    pages: limits, baseline: comparison.baselineStatus,
    kanaele: Object.fromEntries(comparison.proKanal),
    general: comparison.general, selected: comparison.selected,
    verdict: comparison.verdict, reason: comparison.reason, outcome: comparison.outcome,
    proofs: mailboxes.filter(x => x.proof).map(x => ({ email: x.email, channels: x.channels, scope: x.scope, url: x.proof!.url, digest: x.proof!.digest, block: x.proof!.block, headings: x.proof!.headings })),
    openLinks: [...links].sort((a, b2) => b2[1] - a[1]).slice(0, 60).map(([url, priority]) => ({ url, priority })),
    ...(e.zusatz ?? {}),
  };
  const result = { ...basis, ...(b.ergebnisForm?.(basis, mailboxes) ?? {}) } as Ergebnis;
  writeJson(resultPath, result);
  return result;
}

// ── Nachrecherche ───────────────────────────────────────────────────────────
const ROLE_URL = /klima|energie|umwelt|presse|oeffentlich|öffentlich|kommunikation|nachhaltig/i;
const DIRECTORY_URL = /ansprechpartner|mitarbeiter|verwaltung|organisation|kontakt|rathaus|aemter|ämter|fachbereich|telefon|zustaendig|zuständig|dienststelle|abteilung|organigramm|impressum/i;
export const linkScore = (u: string, p: number) => (ROLE_URL.test(u) ? 200 : 0) + (DIRECTORY_URL.test(u) ? 80 : 0) + p
  - (/\.(?:pdf|docx?|xlsx?|jpe?g|png|zip)(?:$|\?)/i.test(u) ? 1000 : 0)
  - (/\/(?:news|aktuelles|nachrichten|pressemitteilung|veranstaltung|termine|kalender)/i.test(u) ? 150 : 0);

const lastHit = new Map<string, number>();
export const UA = "Mozilla/5.0 (compatible; solar-check-kontaktpruefung/2.0; +https://solar-check.io/impressum)";
const RETRY_AFTER_MS = 24 * 3600 * 1000;
const MAX_ATTEMPTS = 2;

/** Holt eine Seite, speichert sie samt Herkunft und gibt ihren Fingerabdruck zurück. */
export async function fetchPage(b: Bestand, url: string, id: string) {
  const h = host(url);
  const wait = Math.max(0, (lastHit.get(h) ?? 0) + 1200 - Date.now());
  if (wait) await new Promise(r => setTimeout(r, wait));
  lastHit.set(h, Date.now());
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Ein referenzierter Wecker, nicht die eingebaute Abbruchuhr: die ist
    // unreferenziert, eine nie beantwortete Anfrage ließ den Lauf mit Code 0
    // enden — zweimal am 18.09.2026, stumm und wie ein fertiger Lauf aussehend.
    const controller = new AbortController();
    // Er deckt auch das Lesen des Inhalts ab, sonst hängt der Lauf daran fest.
    timer = setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), 20000);
    const res = await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "user-agent": UA, accept: "text/html,text/vcard;q=0.9" } });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok) return { url, status: res.status, ms: Date.now() - started, error: `HTTP ${res.status}` };
    let bytes = Buffer.from(await res.arrayBuffer());
    let originalDigest: string | null = null;
    if (!/html/i.test(type)) {
      // Eine vCard bleibt im Original erhalten und wird einmal als Kontaktkarte gerendert.
      const card = /vcard|x-vcard/i.test(type) || /\.vcf(?:$|\?)/i.test(url) ? vcardToHtml(bytes.toString("utf8")) : null;
      if (!card) return { url, status: res.status, ms: Date.now() - started, error: null, skipped: "not html" };
      originalDigest = sha(bytes);
      const dir = resolve(b.out, "sources", id);
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      writeFileSync(resolve(dir, `${originalDigest}.vcf`), bytes, { mode: 0o600 });
      bytes = Buffer.from(card);
    }
    const digest = sha(bytes);
    const dir = resolve(b.out, "sources", id);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(resolve(dir, `${digest}.html`), bytes, { mode: 0o600 });
    writeJson(resolve(dir, `${digest}.json`), { url, finalUrl: res.url, status: res.status, observedAt: new Date().toISOString(), digest, originalDigest });
    return { url, status: res.status, ms: Date.now() - started, error: null, finalUrl: res.url, digest };
  } catch (e: any) {
    return { url, status: 0, ms: Date.now() - started, error: e?.name === "TimeoutError" ? "timeout" : String(e?.cause?.code ?? e?.message ?? e) };
  } finally {
    clearTimeout(timer);
  }
}

/** Holt gezielt weitere Seiten, solange das Budget reicht und noch etwas fehlt. */
export async function recherchieren(b: Bestand, e: Eintrag, budget: number) {
  const logPath = resolve(b.out, "research", `${e.id}.json`);
  const log = existsSync(logPath) ? readJson(logPath) : { id: e.id, attempts: [] as any[] };
  const fertig = b.fertigWenn ?? ((r: Ergebnis) => r.outcome === "all-channels");
  let result = bewerten(b, e);
  if (fertig(result)) return { id: e.id, skipped: "complete" };
  const last = log.attempts.at(-1);
  if (last) {
    // Nur eine gescheiterte Verbindung rechtfertigt einen zweiten Anlauf; eine
    // übersprungene Datei nicht.
    const unreachable = last.fetched.length > 0 && last.fetched.every((f: any) => f.error);
    if (log.attempts.length >= MAX_ATTEMPTS || !unreachable || !e.website) return { id: e.id, skipped: "final" };
    if (Date.now() - Date.parse(last.at) < RETRY_AFTER_MS) return { id: e.id, skipped: "retry-later" };
  }
  const own = siteOf(host(e.website ?? ""));
  const allowed = new Set([own, ...(result.verbund?.sites ?? [])].filter(Boolean));
  const done = new Set<string>(eigeneSeiten(b, e.id).map(p => p.url));
  for (const a of log.attempts) for (const f of a.fetched) done.add(f.url);
  const queue = new Map<string, number>(result.openLinks.map(l => [l.url, l.priority]));
  if (result.pages.read === 0 && e.website) queue.set(e.website, 999);
  const fetched: any[] = [];
  const started = Date.now();
  while (fetched.length < budget && !fertig(result)) {
    const wert = (u: string, p: number) => b.linkVorrang?.(u, linkScore(u, p)) ?? linkScore(u, p);
    const next = [...queue].filter(([u]) => !done.has(u) && allowed.has(siteOf(host(u))))
      .sort((a, b2) => wert(b2[0], b2[1]) - wert(a[0], a[1]))[0];
    if (!next || wert(next[0], next[1]) < 0) break;
    done.add(next[0]);
    const f = await fetchPage(b, next[0], e.id);
    fetched.push({ url: f.url, status: f.status, ms: f.ms, error: f.error, skipped: (f as any).skipped ?? null });
    if (f.error || (f as any).skipped) continue;
    result = bewerten(b, e);
    for (const l of result.openLinks) if (!queue.has(l.url)) queue.set(l.url, l.priority);
    // Neu belegte Verwaltungs-Seiten werden erlaubt.
    for (const s of result.verbund?.sites ?? []) allowed.add(s);
  }
  log.attempts.push({ at: new Date().toISOString(), budget, fetched, ms: Date.now() - started, outcomeAfter: result.outcome });
  writeJson(logPath, log);
  return { id: e.id, fetched: fetched.length, errors: fetched.filter(f => f.error).length, outcome: result.outcome, verdict: result.verdict };
}

/** Holt die Belegseite einer Adresse noch einmal und prüft, ob sie dort noch steht. */
export async function nachpruefen(b: Bestand, e: Eintrag, email: string) {
  const adresse = email.trim().toLowerCase();
  const out = { id: e.id, email: adresse, rules: b.rules, checkedAt: new Date().toISOString(), ok: false, url: null as string | null, reason: null as string | null };
  const result = bewerten(b, e);
  const domain = host(e.website ?? "");
  let url: string | null = result.proofs.find(p => p.email === adresse)?.url ?? null;
  if (!url) for (const page of [...e.gespeicherteSeiten, ...eigeneSeiten(b, e.id)]) {
    if (page.kind !== "html" || !page.valid || !page.path || !existsSync(page.path)) continue;
    if (parsePage(b, page, domain).candidates.some(c => c.email.toLowerCase() === adresse)) { url = page.url; break; }
  }
  out.url = url;
  if (!url) { out.reason = "keine Seite bekannt, auf der die Adresse steht"; return out; }
  const live = await fetchLive(url);
  if ("error" in live) { out.reason = live.error; return out; }
  const found = contactCandidates(live.html, url, domain).some(c => c.email.toLowerCase() === adresse);
  out.ok = found;
  if (!found) out.reason = "Adresse steht nicht mehr auf der Seite";
  return out;
}

/** Ein einzelner Abruf ohne Ablage — für die Nachprüfung vor einer Verwendung. */
export async function fetchLive(url: string): Promise<{ html: string } | { error: string }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), 20000);
    const res = await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "user-agent": UA, accept: "text/html,text/vcard;q=0.9" } });
    if (!res.ok) return { error: `Seite antwortet mit HTTP ${res.status}` };
    const bytes = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get("content-type") ?? "";
    if (/vcard/i.test(type) || /\.vcf(?:$|\?)/i.test(url)) return { html: vcardToHtml(bytes.toString("utf8")) ?? "" };
    return { html: decode(bytes) };
  } catch (e: any) {
    return { error: e?.name === "TimeoutError" ? "Seite antwortet nicht" : `Abruf fehlgeschlagen (${String(e?.cause?.code ?? e?.message ?? e)})` };
  } finally {
    clearTimeout(timer);
  }
}

/** Läuft über eine Teilmenge des Bestands und hält den Fortschritt fest. */
export async function laufen(b: Bestand, eintraege: Eintrag[], schritt: (e: Eintrag) => Promise<unknown> | unknown, kennung: string) {
  // Hält den Lauf am Leben, bis die Schleife wirklich durch ist; ein früher
  // Abgang darf nie wie ein erfolgreicher Lauf aussehen.
  const keepAlive = setInterval(() => {}, 60_000);
  const progressPath = resolve(b.out, `progress-${kennung}.json`);
  let done = 0, errors = 0;
  const started = Date.now();
  try {
    for (const e of eintraege) {
      try { await schritt(e); } catch (err) {
        errors++;
        writeJson(resolve(b.out, "errors", `${e.id}.json`), { id: e.id, kennung, error: String((err as Error)?.stack ?? err), at: new Date().toISOString() });
      }
      done++;
      if (done % 25 === 0 || done === eintraege.length) {
        writeJson(progressPath, { kennung, rules: b.rules, done, total: eintraege.length, errors, seconds: Math.round((Date.now() - started) / 1000), updatedAt: new Date().toISOString() });
      }
    }
  } finally {
    clearInterval(keepAlive);
  }
  return { done, errors };
}
