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
 *
 * DIESES SKRIPT HOLT NUR DIE DATEN. Das Urteil steht in
 * `lib/funding-ags-urteil.ts` und ist von dort aus einzeln prüfbar; hier wäre
 * es nur zusammen mit einer Datenbankverbindung zu testen, also gar nicht.
 */
import { resolve } from "node:path"; import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { FUNDING_PROGRAMS, foerdergebiete } from "../lib/funding-programs";
import { pruefeProgramm, pruefeVerzeichnis } from "../lib/funding-ags-urteil";
import { ATLAS_CITIES } from "../lib/atlas-cities";
const e = resolve(process.cwd(), ".env.local");
if (existsSync(e)) for (const l of readFileSync(e,"utf8").split("\n")) { const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,""); }
// Der Namensvergleich ist seit dem 12.09.2026 in `lib/funding-ags-urteil.ts`
// zu Hause — er war die einzige Stelle hier, die ein Urteil fällte, und ein
// Urteil im Abrufskript ist ohne Datenbank nicht prüfbar.

/**
 * Nachschlagen statt raten: `npm run foerder:ags -- --suche Nidda`
 *
 * Die Regel lautet, den Gemeindeschlüssel IMMER aus dem Melderegister zu holen
 * und nie aus einer Bildschirmliste — nur gab es dafür bisher keinen Weg außer
 * einer selbstgeschriebenen Abfrage. Eine Regel ohne Werkzeug wird umgangen,
 * und das Umgehen ist hier ein vertippter Schlüssel, der niemandem auffällt.
 *
 * Sucht über den Namen und zeigt Schlüssellänge und Einwohnerzahl mit, weil
 * beides bei der Aufnahme entscheidet: fünf Stellen sind eine kreisfreie Stadt
 * oder ein Landkreis, acht eine kreisangehörige Gemeinde — und ein
 * Kreisschlüssel unter einem Stadtnamen setzt den Bestand des ganzen Kreises
 * dorthin.
 */
async function suche(sb: any, begriff: string): Promise<void> {
  const { data } = await sb
    .from("mastr_regions")
    .select("region_id, name, population")
    .ilike("name", `%${begriff}%`)
    .order("population", { ascending: false })
    .limit(25);
  const treffer = (data ?? []) as { region_id: string; name: string; population: number | null }[];
  if (!treffer.length) { console.log(`Nichts gefunden für „${begriff}".`); return; }
  console.log(`Treffer für „${begriff}":\n`);
  for (const t of treffer) {
    const art = t.region_id.length === 2 ? "Land" : t.region_id.length === 5 ? "Kreis/kreisfrei" : "Gemeinde";
    console.log(`  ${t.region_id.padEnd(9)} ${art.padEnd(16)} ${(t.population ?? 0).toLocaleString("de-DE").padStart(10)} Einw.  ${t.name}`);
  }
}

async function main(){
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const i = process.argv.indexOf("--suche");
  if (i >= 0) { await suche(sb, process.argv.slice(i + 1).join(" ")); return; }
  // JEDES Fördergebiet wird geprüft, nicht nur das erste (12.09.2026).
  //
  // Bis heute sah die Prüfung allein `agsCode` an. Seit dem 09.09.2026 kann ein
  // Programm MEHRERE Gebiete haben (`agsCodes`) — und die waren damit sämtlich
  // ungeprüft: 32 Schlüssel, darunter die neun Mitgliedsgemeinden der
  // StädteRegion Aachen, deren Programm überhaupt kein `agsCode` trägt und
  // deshalb durch den Filter fiel. Ein vertippter Schlüssel dort ist genau der
  // stille Fehler, gegen den es diese Prüfung gibt.
  //
  // Gelesen wird über `foerdergebiete()` — dieselbe Funktion, die auch Rechner
  // und Stadtseite benutzen. Eine zweite Veroderung der beiden Felder hier wäre
  // die Kopie, gegen die es diese Funktion gibt.
  const mitGebiet = Object.values(FUNDING_PROGRAMS)
    .map((p:any)=>({ p, gebiete: foerdergebiete(p).filter((g:string)=>g.length===8) }))
    .filter(({ gebiete }) => gebiete.length > 0);
  const schluessel = [...new Set(mitGebiet.flatMap(({ gebiete }) => gebiete))];
  const { data } = await sb.from("mastr_regions").select("region_id, name").in("region_id", schluessel);
  const name = new Map((data??[]).map((r:any)=>[r.region_id, r.name]));
  let falsch=0;
  for (const { p } of mitGebiet as any[]) {
    for (const b of pruefeProgramm(p, name)) { falsch++; console.log(`FALSCH  ${b.id}: ${b.text}`); }
  }
  const geprueft = schluessel.length;
  console.log(falsch ? `\n${falsch} Befunde bei ${geprueft} Fördergebiet-Schlüsseln.` : `\nAlle ${geprueft} achtstelligen Fördergebiet-Schlüssel stimmen.`);

  // Dasselbe für das Städte-Verzeichnis. Seit dem 19.08.2026 trägt es
  // achtstellige Gemeindeschlüssel, und ein vertippter zeigt genauso stumm auf
  // den falschen Ort — nur wirkt er hier nicht auf einen Förderbetrag, sondern
  // auf den Anlagenbestand, der unter dem Ortsnamen steht. Die Prüfung gehört
  // deshalb in denselben täglichen Lauf.
  const staedte = ATLAS_CITIES.filter((c) => c.ags.length === 8);
  const { data: sd } = await sb.from("mastr_regions").select("region_id, name").in("region_id", staedte.map((c) => c.ags));
  const sname = new Map((sd ?? []).map((r: any) => [r.region_id, r.name]));
  let sFalsch = 0;
  for (const c of staedte) {
    for (const b of pruefeVerzeichnis(c, sname)) { sFalsch++; console.log(`FALSCH  ${b.id}: ${b.text}`); }
  }
  console.log(sFalsch ? `${sFalsch} Verzeichnis-Einträge zeigen auf die falsche Gemeinde.` : `Alle ${staedte.length} Verzeichnis-Schlüssel stimmen.`);

  process.exit(falsch + sFalsch ? 1 : 0);
}
main();
