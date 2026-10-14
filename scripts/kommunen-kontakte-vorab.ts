/**
 * The send-time contact check for EVERY open town of a batch, before its scenes
 * exist and before the draw. Run it the evening before: the failing addresses
 * are then proven by hand (scripts/kommunen-handbelege-eintragen.ts) instead of
 * holding letters back on the sending day (14.10.2026: 20 of 154 NRW and 121 of
 * 278 Brandenburg/Saxony-Anhalt addresses failed, nearly all Amt mailboxes
 * without proof that the town belongs to the Amt).
 *
 *   npm run kommunen:kontakte-vorab -- <schub>
 */
import { empfaengerFuerBrief } from "../lib/kommunen-presse";
import { SCHUEBE } from "../lib/kommunen-testballon";
import { postfachBefund } from "../lib/outreach-mail";
import { verwaltungDomainVon } from "../lib/kommunen-fachkontakt";
import { v2Urteil } from "../lib/contact-v2-gate";
import { RECHECK_MAX_AGE_DAYS, REPO_ROOT, outDir, rulesVersion } from "./lib/contact-v2-config";
import { handbelegLesen, handbelegNachpruefen } from "./lib/handbelege";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
async function main() {
  const schub = SCHUEBE[process.argv[2]];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, key = process.env.SUPABASE_SERVICE_KEY!;
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const rows: any[] = [];
  for (const k of schub.kreise!) {
    const r = await fetch(`${url}/rest/v1/kommunen_kontakt?select=region_id,outreach_status,kampagne,contacted_at,rollen_email,presse_email,klima_email,presse_kontakt_email,rollen_email_quelle,verwaltung_domain,fachkontakte,mastr_regions(name)&region_id=like.${k}*`, { headers: h });
    rows.push(...(await r.json()));
  }
  const briefe: { id: string; name: string; email: string; rolle: string; vd: string | null; belegt: boolean }[] = [];
  for (const z of rows) {
    if (z.region_id.length !== 8 || z.contacted_at || z.outreach_status !== "offen") continue;
    const name = z.mastr_regions?.name ?? z.region_id;
    const ziel = empfaengerFuerBrief({ rollenEmail: z.rollen_email, presseEmail: z.presse_email, klimaEmail: z.klima_email, presseKontaktEmail: z.presse_kontakt_email, rollenQuelle: z.rollen_email_quelle });
    if (!ziel.email) { console.log(`✗ ${z.region_id} ${name} — kein Empfänger`); continue; }
    const vd = (ziel.fach ? verwaltungDomainVon(z.fachkontakte, ziel.email) : null) ?? z.verwaltung_domain;
    briefe.push({ id: z.region_id, name, email: ziel.email, rolle: ziel.rolle, vd, belegt: ziel.belegt });
  }
  const urteile = new Map<string, any>();
  const rest: typeof briefe = [];
  for (const b of briefe) {
    const beleg = handbelegLesen(b.id);
    if (beleg && beleg.email.toLowerCase() === b.email.toLowerCase()) {
      const re = await handbelegNachpruefen(b.id, beleg);
      urteile.set(b.id, v2Urteil(b.email, null, { ...re }, "", new Date(), RECHECK_MAX_AGE_DAYS, beleg));
    } else rest.push(b);
  }
  const out = outDir(); mkdirSync(out, { recursive: true });
  const file = resolve(out, `recheck-vorab-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(rest.map(b => ({ organizationId: b.id, email: b.email }))));
  try { execFileSync(resolve(REPO_ROOT, "node_modules/.bin/tsx"), [resolve(REPO_ROOT, "scripts/contact-municipal-v2.ts"), "--mode=recheck", `--recipients=${file}`], { stdio: "ignore", cwd: REPO_ROOT }); } finally { rmSync(file, { force: true }); }
  const read = (p: string) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
  for (const b of rest) urteile.set(b.id, v2Urteil(b.email, read(resolve(out, "results", `${b.id}.json`)), read(resolve(out, "recheck", `${b.id}.json`)), rulesVersion(), new Date(), RECHECK_MAX_AGE_DAYS));
  let ok = 0;
  for (const b of briefe) {
    const u = urteile.get(b.id);
    const pf = postfachBefund(b.email, b.name, b.vd, { belegteRolle: b.belegt || !!(u?.ok && u.belegteRolle) });
    if (u?.ok && pf.ok) { ok++; continue; }
    console.log(`✗ ${b.id} ${b.name} ${b.email} (${b.rolle}) — ${u?.ok ? "" : u?.grund} ${pf.ok ? "" : (pf as any).grund ?? JSON.stringify(pf)}`);
  }
  console.log(`${ok} von ${briefe.length} Empfängern bestehen die Kontaktprüfung`);
}
main();
