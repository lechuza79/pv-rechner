/** Einmaliger Versandtest: uns selbst als Fachbetrieb eintragen. */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHmac } from "node:crypto";
function env(): void {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const l of readFileSync(p, "utf8").split("\n")) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const DOMAIN = "testbetrieb.solar-check.io";
async function main() {
  env();
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const modus = process.argv[2];
  if (modus === "--weg") {
    const { error } = await db.from("fachbetriebe").delete().eq("domain", DOMAIN);
    console.log(error ? `Fehler: ${error.message}` : "Testbetrieb entfernt.");
    return;
  }
  const { error } = await db.from("fachbetriebe").upsert({
    domain: DOMAIN,
    firmenname: "Solar Check Testbetrieb GmbH",
    ort: "Höchberg",
    plz: "97204",
    email: "hey@solar-check.io",
    art: "betrieb",
  }, { onConflict: "domain" });
  if (error) { console.error(`Fehler: ${error.message}`); process.exit(1); }
  const k = createHmac("sha256", process.env.CRON_SECRET!).update(`fachbetrieb:${DOMAIN}`).digest("hex").slice(0, 16);
  console.log(`angelegt. Kennung: ${k}`);
  console.log(`http://localhost:3061/fuer/${k}`);
}
main();
