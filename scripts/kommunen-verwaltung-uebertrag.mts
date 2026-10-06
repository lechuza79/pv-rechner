/**
 * Give a municipality without an address the mailbox of its shared
 * administration (Amt, Samtgemeinde, Verbandsgemeinde), when at least two other
 * members of the same official association already carry that SAME mailbox.
 *
 *   npx tsx scripts/kommunen-verwaltung-uebertrag.mts             count only
 *   npx tsx scripts/kommunen-verwaltung-uebertrag.mts --schreiben write
 *
 * 30.09.2026: 2,401 of 3,138 municipalities without an address belong to a
 * shared administration; 923 were filled this way ("info@amt-eider.de" for the
 * fifteen members of Amt Eider). Same mailbox twice, not the same domain: a
 * domain alone would also carry a mayor's personal address.
 * Association data: Destatis GV100AD in the municipal audit directory.
 */
import { readFileSync } from "node:fs";
import * as G from "./lib/gemeindeverband.ts";
const { parseGv100, hasSharedAdministration } = (G as any).default ?? G;
const GV = "/Users/eule/projects/pv-rechner/scripts/.cache/contact-evidence/municipal-full-audit-2026-09-15-v3/workflow/reference-review/GV100AD3108-GV100AD_31082026.txt";
const gv = parseGv100(readFileSync(GV, "latin1"));
const U = process.env.NEXT_PUBLIC_SUPABASE_URL!, K = process.env.SUPABASE_SERVICE_KEY!;
async function alle() { const out: any[] = []; for (let o = 0; ; o += 1000) { const r = await fetch(`${U}/rest/v1/kommunen_kontakt?select=region_id,rollen_email,rollen_email_quelle,email,website&region_id=like.________&order=region_id`, { headers: { apikey: K, Authorization: `Bearer ${K}`, Range: `${o}-${o + 999}` } }); const d = await r.json(); out.push(...d); if (d.length < 1000) return out; } }
const rows = await alle();
const leer = rows.filter(r => r.website && !r.rollen_email && !r.email);
const jeVerband = new Map<string, any[]>();
for (const r of rows) { const v = gv.get(r.region_id); if (v && hasSharedAdministration(v)) jeVerband.set(v.verbandKey, [...(jeVerband.get(v.verbandKey) ?? []), r]); }
const { postfachTauglich } = await import("./lib/kontakt-tauglichkeit.ts") as any;
const schreiben = process.argv.includes("--schreiben");
let n = 0, geschrieben = 0; const bsp: string[] = [];
for (const r of leer) {
  const v = gv.get(r.region_id); if (!v || !hasSharedAdministration(v)) continue;
  const adressen = (jeVerband.get(v.verbandKey) ?? []).filter(x => x.region_id !== r.region_id).map(x => x.rollen_email ?? x.email).filter(Boolean);
  const zaehl = new Map<string, number>(); for (const a of adressen) zaehl.set(a, (zaehl.get(a) ?? 0) + 1);
  const top = [...zaehl].sort((a, b) => b[1] - a[1])[0];
  // The SAME mailbox for at least two other members: that is the shared office, not a mayor.
  if (!top || top[1] < 2 || !postfachTauglich(top[0]).ok) continue;
  n++; if (bsp.length < 10) bsp.push(`${v.name} (${v.verbandName}) -> ${top[0]} (bei ${top[1]} Mitgliedern)`);
  if (!schreiben) continue;
  const res = await fetch(`${U}/rest/v1/kommunen_kontakt?region_id=eq.${r.region_id}&rollen_email=is.null&email=is.null`, { method: "PATCH", headers: { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" }, body: JSON.stringify({ rollen_email: top[0], rollen_email_quelle: "verwaltung", verwaltung_domain: top[0].split("@")[1] }) });
  if (!res.ok) throw new Error(r.region_id + " " + res.status); geschrieben++;
}
console.log({ fuellbar: n, schreiben, geschrieben }); console.log(bsp.join("\n"));
