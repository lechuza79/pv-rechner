/**
 * Municipal contact check, second generation.
 *
 *   --mode=evaluate   offline over stored originals and earlier research pages
 *   --mode=research   bounded page fetches for municipalities without both channels
 *   --mode=summary    aggregate results, full old/new comparison
 *
 * Common: --ids=A,B | --sample=FILE (JSON {group:[ids]}) | --part=i --parts=n
 *         --audit=DIR (default: municipal-full-audit-2026-09-15-v3) --out=DIR
 * research: --budget=15 (new pages per municipality per attempt)
 *
 * Results are written per municipality and reused when rules and inputs are
 * unchanged, so an interrupted run resumes where it stopped. No database writes,
 * no mail, no model calls. Research fetches only the municipality's own or its
 * official administration's website, one request per host every 1.2 s.
 *
 * Completion is bounded on purpose: a municipality is researched at most twice
 * (the second attempt only if the first could not reach the site, and not before
 * 24 h later). After that its outcome is final until one of its pages changes.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { contactCandidates, type ContactCandidate } from "../lib/contact-evidence";
import { contactLinks } from "../lib/contact-discovery";
import { contactRoleContext } from "../lib/contact-role-context";
import { parseGv100, type Gemeindeverband } from "../lib/gemeindeverband";
import { vcardToHtml } from "../lib/mail-deobfuscation";
import {
  applyAdministration, consolidate, headingContext, host, judgeEvidence, selectAndCompare, siteOf,
  type Evidence, type Municipality,
} from "../lib/contact-municipal-judge";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const readJson = (p: string) => JSON.parse(readFileSync(p, "utf8"));
function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 1) + "\n", { mode: 0o600 });
  renameSync(tmp, path);
}

// Evidence lives in the main checkout's cache, also when this runs from a worktree.
const mainCheckout = resolve(execSync("git rev-parse --path-format=absolute --git-common-dir", { cwd: root }).toString().trim(), "..");
const AUDIT = resolve(arg("audit") ?? resolve(mainCheckout, "scripts/.cache/contact-evidence/municipal-full-audit-2026-09-15-v3"));
const OUT = resolve(arg("out") ?? resolve(AUDIT, "workflow/municipal-v2"));
const RECORDS = resolve(AUDIT, "workflow/corrected-selection/records");
const SCOPE = resolve(AUDIT, "workflow/current-municipal-scope.json");
const GV100 = resolve(AUDIT, "workflow/reference-review/GV100AD3108-GV100AD_31082026.txt");
const SNAPSHOT = resolve(AUDIT, "../population-2026-09-14/snapshot.json");
const mode = arg("mode") ?? "evaluate";
const BUDGET = Number(arg("budget") ?? 15);
const RETRY_AFTER_MS = 24 * 3600 * 1000;
const MAX_ATTEMPTS = 2;

// Extraction and judgement files: a change re-judges everything, fetched pages stay.
const EXTRACTION_FILES = ["lib/contact-evidence.ts", "lib/mail-deobfuscation.ts", "lib/contact-role-context.ts", "lib/contact-discovery.ts", "lib/personen-fund.ts", "lib/published-joomla-mail.ts", "lib/uri-sicher.ts", "lib/contact-municipal-judge.ts"];
const JUDGE_FILES = [...EXTRACTION_FILES, "lib/contact-quality-evidence.ts", "lib/gemeindeverband.ts", "scripts/contact-municipal-v2.ts"];
const digestOf = (files: string[]) => sha(JSON.stringify(files.map(f => [f, sha(readFileSync(resolve(root, f)))])));
const EXTRACTION = digestOf(EXTRACTION_FILES).slice(0, 16);
const RULES = digestOf(JUDGE_FILES).slice(0, 16);

function decode(bytes: Buffer) {
  const charset = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(bytes.subarray(0, 8192).toString("latin1"))?.[1];
  try { return new TextDecoder(charset ?? "utf-8").decode(bytes); } catch { return bytes.toString("utf8"); }
}

type Page = { url: string; digest: string; path: string | null; kind: string; valid: boolean; origin: "stored" | "research" };
type Parsed = { candidates: ContactCandidate[]; headings: Record<string, string[]>; title: string; links: { url: string; priority: number }[] };

/** Extraction per page is the expensive part; it is cached by page digest and extraction version. */
function parsePage(page: Page, domain: string): Parsed {
  const cachePath = resolve(OUT, "page-cache", EXTRACTION, page.digest.slice(0, 2), `${sha(page.digest + page.url + domain)}.json`);
  if (existsSync(cachePath)) return readJson(cachePath);
  const html = decode(readFileSync(page.path!));
  const candidates = contactRoleContext(html, contactCandidates(html, page.url, domain)).candidates;
  const context = headingContext(html);
  const parsed: Parsed = { candidates, headings: Object.fromEntries(context.headings), title: context.title, links: contactLinks(html, page.url, domain, "kommunen") };
  writeJson(cachePath, parsed);
  return parsed;
}

function storedPages(record: any, inventoryId: string): Page[] {
  const pages: Page[] = [];
  const seen = new Set<string>();
  for (const s of record.sourceManifest ?? []) {
    seen.add(s.digest);
    pages.push({ url: s.url, digest: s.digest, path: s.path, kind: s.kind, valid: !!s.valid, origin: "stored" });
  }
  // Later source recoveries are registered here; include those the record does not know yet.
  const obsRoot = resolve(AUDIT, "supplemental", inventoryId, "observations");
  if (existsSync(obsRoot)) for (const file of readdirSync(obsRoot).filter(f => f.endsWith(".json"))) {
    const o = readJson(resolve(obsRoot, file));
    if (seen.has(o.sourceDigest)) continue;
    const kind = o.sourceKind === "original-http-html" ? "html" : o.sourceKind === "original-http-pdf" ? "pdf" : "browser";
    pages.push({ url: o.finalUrl, digest: o.sourceDigest, path: resolve(AUDIT, "supplemental", inventoryId, o.sourceDigest + (kind === "pdf" ? ".pdf" : ".html")), kind, valid: (o.httpStatus ?? 200) < 400, origin: "stored" });
  }
  const own = resolve(OUT, "sources", record.currentMunicipalityId);
  if (existsSync(own)) for (const file of readdirSync(own).filter(f => f.endsWith(".json"))) {
    const meta = readJson(resolve(own, file));
    pages.push({ url: meta.finalUrl ?? meta.url, digest: meta.digest, path: resolve(own, `${meta.digest}.html`), kind: "html", valid: true, origin: "research" });
  }
  return pages;
}

type Context = { gv: Map<string, Gemeindeverband>; snapshot: Map<string, any>; scope: any[] };
function loadContext(): Context {
  const snap = readJson(SNAPSHOT);
  return { gv: parseGv100(readFileSync(GV100, "utf8")), snapshot: new Map(snap.kommunen.map((r: any) => [r.region_id, r])), scope: readJson(SCOPE).items };
}

function evaluate(row: any, ctx: Context) {
  const id = row.currentMunicipalityId;
  const record = readJson(resolve(RECORDS, `${id}.json`));
  const snap = ctx.snapshot.get(id) ?? ctx.snapshot.get(row.inventoryOrganizationId) ?? {};
  const m: Municipality = { ags: id, name: row.name, website: snap.website ?? null, verband: ctx.gv.get(id) };
  const pages = storedPages(record, row.inventoryOrganizationId);
  const inputDigest = sha(JSON.stringify([pages.map(p => [p.url, p.digest, p.valid]), snap.website, snap.email, snap.rollen_email, snap.presse_email, snap.personen_email]));
  const resultPath = resolve(OUT, "results", `${id}.json`);
  if (existsSync(resultPath)) {
    const prior = readJson(resultPath);
    if (prior.rules === RULES && prior.inputDigest === inputDigest) return prior;
  }
  const domain = host(m.website ?? "");
  const asOf = new Date().toISOString();
  let evidence: Evidence[] = [];
  const titles = new Map<string, string>();
  const links = new Map<string, number>();
  const limits = { unreadable: 0, pdf: 0, read: 0 };
  for (const page of pages) {
    if (page.kind !== "html") { limits.pdf++; continue; }
    if (!page.valid || !page.path || !existsSync(page.path) || sha(readFileSync(page.path)) !== page.digest) { limits.unreadable++; continue; }
    limits.read++;
    const parsed = parsePage(page, domain);
    titles.set(page.url, parsed.title);
    for (const c of parsed.candidates) evidence.push(judgeEvidence(c, parsed.headings[c.email.toLowerCase()] ?? [], { url: page.url, digest: page.digest, valid: true }, m, asOf));
    for (const l of parsed.links) if (l.priority >= 70) links.set(l.url, Math.max(links.get(l.url) ?? 0, l.priority));
  }
  for (const g of record.researchGaps ?? []) if (g.kind === "unread-published-contact-link") links.set(g.url, Math.max(links.get(g.url) ?? 0, g.priority ?? 0));
  for (const p of pages) links.delete(p.url);
  evidence = applyAdministration(evidence, titles, m);
  const mailboxes = consolidate(evidence);
  const baseline = [snap.email, snap.rollen_email, snap.presse_email, snap.personen_email].filter((e: unknown): e is string => typeof e === "string");
  const comparison = selectAndCompare(mailboxes, baseline);
  const adminSites = [...new Set(evidence.filter(e => e.scope.startsWith("shared-administration")).map(e => siteOf(host(e.url))))];
  const result = {
    schema: 2, rules: RULES, inputDigest, evaluatedAt: asOf, id, inventoryId: row.inventoryOrganizationId, name: row.name,
    website: m.website, administration: m.verband && m.verband.verbandMembers > 1 ? { name: m.verband.verbandName, type: m.verband.verbandType, members: m.verband.verbandMembers, sites: adminSites } : null,
    pages: limits, baseline: comparison.baselineStatus,
    energy: comparison.energy, press: comparison.press, general: comparison.general, selected: comparison.selected,
    verdict: comparison.verdict, reason: comparison.reason, outcome: comparison.outcome,
    proofs: mailboxes.filter(x => x.proof).map(x => ({ email: x.email, channels: x.channels, scope: x.scope, url: x.proof!.url, digest: x.proof!.digest, block: x.proof!.block, headings: x.proof!.headings })),
    openLinks: [...links].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([url, priority]) => ({ url, priority })),
    sendApproved: false,
  };
  writeJson(resultPath, result);
  return result;
}

// ── research ────────────────────────────────────────────────────────────────
const ROLE_URL = /klima|energie|umwelt|presse|oeffentlich|öffentlich|kommunikation|nachhaltig/i;
const DIRECTORY_URL = /ansprechpartner|mitarbeiter|verwaltung|organisation|kontakt|rathaus|aemter|ämter|fachbereich|telefon|zustaendig|zuständig|dienststelle|abteilung|organigramm|impressum/i;
const score = (u: string, p: number) => (ROLE_URL.test(u) ? 200 : 0) + (DIRECTORY_URL.test(u) ? 80 : 0) + p
  - (/\.(?:pdf|docx?|xlsx?|jpe?g|png|zip)(?:$|\?)/i.test(u) ? 1000 : 0)
  - (/\/(?:news|aktuelles|nachrichten|pressemitteilung|veranstaltung|termine|kalender)/i.test(u) ? 150 : 0);
const lastHit = new Map<string, number>();
const UA = "Mozilla/5.0 (compatible; solar-check-kontaktpruefung/2.0; +https://solar-check.io/impressum)";

async function fetchPage(url: string, id: string) {
  const h = host(url);
  const wait = Math.max(0, (lastHit.get(h) ?? 0) + 1200 - Date.now());
  if (wait) await new Promise(r => setTimeout(r, wait));
  lastHit.set(h, Date.now());
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "user-agent": UA, accept: "text/html,text/vcard;q=0.9" } });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok) return { url, status: res.status, ms: Date.now() - started, error: `HTTP ${res.status}` };
    let bytes = Buffer.from(await res.arrayBuffer());
    let originalDigest: string | null = null;
    if (!/html/i.test(type)) {
      // A vCard is kept as original and rendered once into a single contact card.
      const card = /vcard|x-vcard/i.test(type) || /\.vcf(?:$|\?)/i.test(url) ? vcardToHtml(bytes.toString("utf8")) : null;
      if (!card) return { url, status: res.status, ms: Date.now() - started, error: null, skipped: "not html" };
      originalDigest = sha(bytes);
      const dir = resolve(OUT, "sources", id);
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      writeFileSync(resolve(dir, `${originalDigest}.vcf`), bytes, { mode: 0o600 });
      bytes = Buffer.from(card);
    }
    const digest = sha(bytes);
    const dir = resolve(OUT, "sources", id);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(resolve(dir, `${digest}.html`), bytes, { mode: 0o600 });
    writeJson(resolve(dir, `${digest}.json`), { url, finalUrl: res.url, status: res.status, observedAt: new Date().toISOString(), digest, originalDigest });
    return { url, status: res.status, ms: Date.now() - started, error: null, finalUrl: res.url, digest };
  } catch (e: any) {
    return { url, status: 0, ms: Date.now() - started, error: e?.name === "TimeoutError" ? "timeout" : String(e?.cause?.code ?? e?.message ?? e) };
  }
}

async function research(row: any, ctx: Context) {
  const id = row.currentMunicipalityId;
  const logPath = resolve(OUT, "research", `${id}.json`);
  const log = existsSync(logPath) ? readJson(logPath) : { id, attempts: [] as any[] };
  let result = evaluate(row, ctx);
  if (result.outcome === "both-channels") return { id, skipped: "complete" };
  const last = log.attempts.at(-1);
  if (last) {
    // Only failed connections or HTTP errors justify a second attempt; a skipped download does not.
    const unreachable = last.fetched.length > 0 && last.fetched.every((f: any) => f.error);
    const noSite = !result.website;
    if (log.attempts.length >= MAX_ATTEMPTS || !unreachable || noSite) return { id, skipped: "final" };
    if (Date.now() - Date.parse(last.at) < RETRY_AFTER_MS) return { id, skipped: "retry-later" };
  }
  const own = siteOf(host(result.website ?? ""));
  const allowed = new Set([own, ...(result.administration?.sites ?? [])].filter(Boolean));
  const ownSources = resolve(OUT, "sources", id);
  const done = new Set<string>(existsSync(ownSources) ? readdirSync(ownSources).filter(f => f.endsWith(".json")).map(f => readJson(resolve(ownSources, f)).url) : []);
  for (const a of log.attempts) for (const f of a.fetched) done.add(f.url);
  const queue = new Map<string, number>(result.openLinks.map((l: any) => [l.url, l.priority]));
  if (result.pages.read === 0 && result.website) queue.set(result.website, 999);
  const fetched: any[] = [];
  const started = Date.now();
  while (fetched.length < BUDGET && result.outcome !== "both-channels") {
    const next = [...queue].filter(([u]) => !done.has(u) && allowed.has(siteOf(host(u))))
      .sort((a, b) => score(b[0], b[1]) - score(a[0], a[1]))[0];
    if (!next || score(next[0], next[1]) < 0) break;
    done.add(next[0]);
    const f = await fetchPage(next[0], id);
    fetched.push({ url: f.url, status: f.status, ms: f.ms, error: f.error, skipped: (f as any).skipped ?? null });
    if (f.error || (f as any).skipped) continue;
    result = evaluate(row, ctx);
    for (const l of result.openLinks) if (!queue.has(l.url)) queue.set(l.url, l.priority);
    // Newly confirmed administration sites become allowed.
    for (const s of result.administration?.sites ?? []) allowed.add(s);
  }
  log.attempts.push({ at: new Date().toISOString(), budget: BUDGET, fetched, ms: Date.now() - started, outcomeAfter: result.outcome });
  writeJson(logPath, log);
  return { id, fetched: fetched.length, errors: fetched.filter(f => f.error).length, outcome: result.outcome, verdict: result.verdict };
}

function summary() {
  const dir = resolve(OUT, "results");
  const rows = readdirSync(dir).filter(f => f.endsWith(".json")).map(f => readJson(resolve(dir, f)));
  const ctx = loadContext();
  const count = (key: (r: any) => string) => rows.reduce((acc: Record<string, number>, r) => { const k = key(r); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
  const researchDir = resolve(OUT, "research");
  const logs = existsSync(researchDir) ? readdirSync(researchDir).map(f => readJson(resolve(researchDir, f))) : [];
  const out = {
    observedAt: new Date().toISOString(), rules: RULES, population: ctx.scope.length, evaluated: rows.length,
    currentRules: rows.filter(r => r.rules === RULES).length,
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

async function main() {
  mkdirSync(resolve(OUT, "sources"), { recursive: true, mode: 0o700 });
  if (mode === "summary") return summary();
  const ctx = loadContext();
  let rows = ctx.scope;
  const ids = arg("ids")?.split(",") ?? (arg("sample") ? Object.values(readJson(resolve(arg("sample")!)) as Record<string, string[]>).flat() : null);
  if (ids) { const wanted = new Set(ids); rows = rows.filter(r => wanted.has(r.currentMunicipalityId)); }
  const parts = Number(arg("parts") ?? 1), part = Number(arg("part") ?? 0);
  rows = rows.filter((_, i) => i % parts === part);
  const progressPath = resolve(OUT, `progress-${mode}-${part}.json`);
  let done = 0, errors = 0;
  const started = Date.now();
  for (const row of rows) {
    try {
      const r = mode === "research" ? await research(row, ctx) : evaluate(row, ctx);
      if (ids) console.log(row.currentMunicipalityId, row.name, JSON.stringify(mode === "research" ? r : { verdict: (r as any).verdict, outcome: (r as any).outcome, reason: (r as any).reason }));
    } catch (e) {
      errors++;
      writeJson(resolve(OUT, "errors", `${row.currentMunicipalityId}.json`), { id: row.currentMunicipalityId, mode, error: String((e as Error)?.stack ?? e), at: new Date().toISOString() });
    }
    done++;
    if (done % 25 === 0 || done === rows.length) writeJson(progressPath, { mode, part, parts, rules: RULES, done, total: rows.length, errors, seconds: Math.round((Date.now() - started) / 1000), updatedAt: new Date().toISOString() });
  }
}

main().catch(error => { console.error(error); process.exit(1); });
