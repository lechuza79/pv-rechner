/**
 * Liest `.env.local` in `process.env`, damit ein Skript dieselben Zugänge nutzt
 * wie der Dev-Server. Vorhandene Variablen gewinnen — in GitHub Actions kommen
 * sie aus den Secrets, dort gibt es keine Datei.
 *
 * WARUM GETEILT: Diese zehn Zeilen standen am 26.08.2026 in zehn Skripten
 * einzeln, jede Kopie leicht anders. Eine elfte anzulegen wäre nach der eigenen
 * Regel ein Fehler, kein Duplikat. Die bestehenden Kopien sind bewusst NICHT im
 * selben Zug umgestellt — sie hängen in nächtlichen Wächter-Läufen, und ein
 * Umbau ohne Anlass riskiert dort mehr, als er einbringt. Wer eines dieser
 * Skripte ohnehin anfasst, ersetzt seine Kopie durch diesen Import.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

export function envLaden(): void {
  const pfad = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(pfad)) return;
  for (const zeile of readFileSync(pfad, "utf8").split("\n")) {
    const treffer = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
    if (treffer && !process.env[treffer[1]]) {
      process.env[treffer[1]] = treffer[2].replace(/^["']|["']$/g, "");
    }
  }
}
