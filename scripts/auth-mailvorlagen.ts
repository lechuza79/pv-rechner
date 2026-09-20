/**
 * Die Mailvorlagen des Anmeldedienstes hochladen.
 *
 * Sie liegen dort, nicht bei uns — deshalb dieser Lauf. Er ist die einzige
 * Stelle, an der sie geschrieben werden; wer die gemeinsame Mail-Hülle ändert,
 * lässt ihn danach laufen, sonst tragen Anmelde- und Abo-Mails wieder
 * verschiedene Gestaltungen.
 *
 * BRAUCHT EIN PERSÖNLICHES ZUGANGS-TOKEN des Anmeldedienstes
 * (`SUPABASE_ACCESS_TOKEN`). Der Dienstschlüssel reicht nicht: Er darf Daten
 * lesen und schreiben, aber keine Projekteinstellungen ändern.
 *
 *   npx tsx scripts/auth-mailvorlagen.ts            → zeigt nur, was sich ändern würde
 *   npx tsx scripts/auth-mailvorlagen.ts --schreiben → lädt hoch
 */
import { readFileSync } from "node:fs";
import { AUTH_MAIL_VORLAGEN, alsDienstEinstellungen } from "../lib/auth-mail";

function umgebung(pfad: string): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(pfad, "utf8")
        .split("\n")
        .filter((z) => z.includes("=") && !z.trim().startsWith("#"))
        .map((z) => {
          const i = z.indexOf("=");
          return [z.slice(0, i).trim(), z.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
        }),
    );
  } catch {
    return {};
  }
}

async function main() {
  const schreiben = process.argv.includes("--schreiben");
  const env = { ...umgebung(".env.local"), ...process.env } as Record<string, string>;
  const token = env.SUPABASE_ACCESS_TOKEN;
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;

  if (!url) throw new Error("Adresse des Anmeldedienstes fehlt.");
  if (!token) {
    console.error("SUPABASE_ACCESS_TOKEN fehlt — ohne persönliches Zugangs-Token lassen sich");
    console.error("die Vorlagen nicht schreiben. Anlegen unter: Supabase → Account → Access Tokens.");
    process.exit(1);
  }

  const ref = new URL(url).hostname.split(".")[0];
  const ziel = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
  const kopf = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const jetzt = (await (await fetch(ziel, { headers: kopf })).json()) as Record<string, string>;
  const soll = alsDienstEinstellungen();

  let abweichend = 0;
  for (const v of AUTH_MAIL_VORLAGEN) {
    const betreffGleich = jetzt[`mailer_subjects_${v.art}`] === v.betreff;
    const htmlGleich = jetzt[`mailer_templates_${v.art}_content`] === v.html;
    if (betreffGleich && htmlGleich) {
      console.log(`  ${v.art.padEnd(18)} unverändert`);
    } else {
      abweichend++;
      console.log(`  ${v.art.padEnd(18)} weicht ab${betreffGleich ? "" : "  (Betreff)"}${htmlGleich ? "" : "  (Inhalt)"}`);
    }
  }

  if (abweichend === 0) {
    console.log("\nAlle Vorlagen sind auf dem Stand des Codes.");
    return;
  }
  if (!schreiben) {
    console.log(`\n${abweichend} Vorlage(n) weichen ab. Zum Hochladen: --schreiben`);
    return;
  }

  const antwort = await fetch(ziel, { method: "PATCH", headers: kopf, body: JSON.stringify(soll) });
  if (!antwort.ok) throw new Error(`Hochladen fehlgeschlagen: ${antwort.status} ${(await antwort.text()).slice(0, 200)}`);
  console.log(`\n${abweichend} Vorlage(n) hochgeladen.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
