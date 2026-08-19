/**
 * Zeigt jedes Programm auf die Gemeinde, zu der es gehört?
 *
 *   npm run foerder:ags
 *
 * WARUM (19.08.2026): Ein achtstelliger Gemeindeschlüssel ist eine Zahl ohne
 * Aussehen — vertippt man sich um eine Stelle, bleibt er gültig und zeigt auf
 * einen anderen Ort. Nichts fällt um: kein Typfehler, kein roter Test, keine
 * kaputte Seite. Nur bekommt die falsche Gemeinde eine Förderung angeboten und
 * die richtige nicht.
 *
 * Gemessen an dem Lauf, der diese Prüfung ausgelöst hat: SECHS von 43 an einem
 * Tag neu aufgenommenen Programmen zeigten woandershin — Limburgerhofs 200 €
 * nach Neuhofen, Poings Förderung nach Moosach, Herzberg am Harz nach
 * Göttingen. Und beim ersten Lauf über den GESAMTEN Katalog fiel zusätzlich ein
 * Altbestand auf: Bad Homburgs Programm hing an Glashütten, also an 3.000
 * Einwohnern im Taunus statt an 57.000 in Bad Homburg.
 *
 * Die Prüfung ist billig und braucht kein Urteil: Der Ortsname des Programms
 * muss zum Namen passen, den das Melderegister unter diesem Schlüssel führt.
 * Deshalb läuft sie täglich mit, statt auf die nächste Handkontrolle zu warten.
 *
 * Beendet mit Code 1, wenn etwas nicht passt — der Cloud-Lauf wird davon rot.
 */
import { resolve } from "node:path"; import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { FUNDING_PROGRAMS } from "../lib/funding-programs";
const e = resolve(process.cwd(), ".env.local");
if (existsSync(e)) for (const l of readFileSync(e,"utf8").split("\n")) { const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,""); }
function norm(s:string){return s.toLowerCase().replace(/[^a-zäöüß]/g,"");}
async function main(){
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const alle = Object.values(FUNDING_PROGRAMS).filter((p:any)=>p.agsCode && p.agsCode.length===8);
  const { data } = await sb.from("mastr_regions").select("region_id, name").in("region_id", alle.map((p:any)=>p.agsCode));
  const name = new Map((data??[]).map((r:any)=>[r.region_id, r.name]));
  let falsch=0;
  for (const p of alle as any[]) {
    const echt = name.get(p.agsCode);
    if (!echt || !norm(echt).startsWith(norm(p.region).slice(0,5))) {
      falsch++; console.log(`FALSCH  ${p.id}: ${p.agsCode} → "${echt ?? "existiert nicht"}" statt "${p.region}"`);
    }
  }
  console.log(falsch ? `\n${falsch} Programme zeigen auf die falsche Gemeinde.` : `\nAlle ${alle.length} achtstelligen Schlüssel stimmen.`);
  process.exit(falsch ? 1 : 0);
}
main();
