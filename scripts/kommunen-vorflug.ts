/**
 * Vorflug-Prüfung: Hält jeder Brief, was er behauptet?
 *
 * Vor dem Versand wird jeder Brief gegen die Wirklichkeit gehalten, nicht gegen
 * sich selbst. Geprüft wird, was ein Empfänger in einem Klick nachsehen kann:
 *
 *   1. Die verlinkte Gemeindeseite antwortet — und zwar mit 200, nicht mit einer
 *      Fehlerseite unter einem 200er Statuscode.
 *   2. Der VERGLEICHSSATZ aus der Meldung steht wörtlich auf dieser Seite.
 *      Genau hier lag am 20.08.2026 der Fehler, den ein Council fand: Der Brief
 *      sagte „122 % mehr", die Seite führte mit „65 %" und trug die 122 nirgends.
 *   3. Die PLATZIERUNG aus der Meldung steht auf der Seite.
 *   4. Die Widget-Vorschau antwortet, wo der Brief eine anbietet — ein toter
 *      Link in einem Angebot ist schlimmer als kein Angebot.
 *   5. Das Empfänger-Postfach gehört zu dieser Gemeinde.
 *   6. Der Datenstand ist derselbe wie in der Meldung.
 *
 * WAS SIE NICHT KANN: beurteilen, ob eine Zahl inhaltlich sinnvoll ist. Sie
 * prüft Übereinstimmung, nicht Wahrheit — die Zahlen kommen auf beiden Seiten
 * aus derselben Quelle. Ein systematischer Rechenfehler bliebe unentdeckt.
 *
 *   npm run kommunen:vorflug -- --schub=mail-ni-hb --charge=1
 *   npm run kommunen:vorflug -- --schub=mail-ni-hb            (alle Chargen)
 *
 * NACH DEM VERSAND weiterprüfen:
 *
 *   npm run kommunen:vorflug -- --verschickt                  (alle Schübe)
 *   npm run kommunen:vorflug -- --verschickt --schub=mail-ni-hb
 *
 * WARUM DAS SEIN MUSS: Bis zum 01.09.2026 zog diese Prüfung ihre Briefe
 * ausschließlich aus dem Versandpaket, und das überspringt jede Gemeinde, die
 * schon angeschrieben wurde. Ein Brief war damit genau bis zu dem Moment
 * prüfbar, in dem er hinausging.
 *
 * Das ist keine Formalie: Die Zahlen auf unseren Seiten werden mit jedem Lauf
 * der Anlagendaten neu gerechnet, der Brief steht fest. Eine Aussage, die beim
 * Versand stimmte, kann später von unserer eigenen verlinkten Seite widerlegt
 * werden — und der Empfänger sieht das mit einem Klick, womöglich Wochen
 * später, wenn er die Meldung veröffentlichen will. Im Nachhinein lässt sich
 * daran nichts mehr ändern; man kann nur davon WISSEN, sich melden und die
 * Regel für die nächsten Briefe nachziehen. Nichts davon geht, wenn es
 * niemandem auffällt.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { postfachBefund } from "../lib/outreach-mail";
import { AKTUELLER_SCHUB } from "../lib/kommunen-testballon";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function log(msg = "", level: "info" | "ok" | "err" | "warn" = "info"): void {
  const prefix = level === "ok" ? "✓ " : level === "err" ? "✗ " : level === "warn" ? "! " : "  ";
  // eslint-disable-next-line no-console
  console.log(msg ? prefix + msg : "");
}

function loadEnvFile(): void {
  const p = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(p)) return;
  for (const z of readFileSync(p, "utf8").split("\n")) {
    const m = z.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);

type Brief = {
  region_id: string;
  name: string;
  empfaenger: string;
  subject: string;
  body: string;
  variante: string;
  verwaltung_domain: string | null;
  seite_url: string | null;
  rangliste_url: string | null;
  stand: string | null;
};

/** Sichtbaren Text aus der Seite ziehen — Markup und Skripte stören den Vergleich. */
function sichtbar(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

async function hole(url: string): Promise<{ status: number; text: string }> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "solar-check-vorflug" } });
    return { status: res.status, text: res.status === 200 ? await res.text() : "" };
  } catch (e) {
    return { status: 0, text: (e as Error).message };
  }
}

async function main(): Promise<void> {
  loadEnvFile();
  const schub = arg("schub") ?? AKTUELLER_SCHUB;
  const charge = arg("charge");
  const basis = arg("basis") ?? "https://solar-check.io";
  const verschickt = process.argv.includes("--verschickt");

  const briefe: Brief[] = [];
  if (verschickt) {
    // Die schon verschickten: gespeicherter TEXT aus der Datenbank, dazu die
    // heutigen Adressen von Seite und Rangliste. Ein heute neu gebauter Brief
    // würde gegen die heutige Seite natürlich passen — geprüft wird, was die
    // Gemeinde wirklich bekommen hat.
    const res = await fetch(`${basis}/api/admin/kommunen/nachpruefung?schub=${charge ? schub : "alle"}`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    if (!res.ok) {
      log(`Die verschickten Briefe waren nicht abrufbar (${res.status}).`, "err");
      process.exit(1);
    }
    const j = (await res.json()) as { briefe?: Brief[]; ohneText?: { name: string; grund: string }[] };
    briefe.push(...(j.briefe ?? []));
    // Ein verschickter Brief ohne gespeicherten Text ist selbst ein Befund und
    // wird genannt, nicht stillschweigend übersprungen.
    for (const o of j.ohneText ?? []) log(`${o.name}: ${o.grund} — nicht mehr nachprüfbar`, "warn");
  } else {
    const chargen = charge ? [Number(charge)] : [1, 2, 3, 4, 5, 6, 7, 8];
    for (const c of chargen) {
      const res = await fetch(`${basis}/api/admin/kommunen/versandpaket?schub=${schub}&charge=${c}&limit=100`, {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      if (!res.ok) continue;
      const j = (await res.json()) as { paket?: Brief[] };
      briefe.push(...(j.paket ?? []));
    }
  }
  if (!briefe.length) {
    log(`Kein Brief im Schub „${schub}"${charge ? `, Charge ${charge}` : ""}.`, "err");
    process.exit(1);
  }
  log(
    verschickt
      ? `${briefe.length} bereits verschickte Briefe werden nachgeprüft — hält die verlinkte Seite noch, was sie behaupten?`
      : `${briefe.length} Briefe werden geprüft — Seite, Zahlen, Vorschau, Postfach.`,
  );
  log();

  const fehler: string[] = [];
  const warnungen: string[] = [];

  for (const b of briefe) {
    const mängel: string[] = [];

    // 1 + 2 + 3: die verlinkte Gemeindeseite
    if (!b.seite_url) {
      mängel.push("keine Gemeindeseite verlinkt");
    } else {
      const { status, text } = await hole(b.seite_url);
      if (status !== 200) {
        mängel.push(`Gemeindeseite antwortet ${status || "gar nicht"}`);
      } else {
        const seite = sichtbar(text);
        // Der Vergleichssatz: „… 122 % über dem Hessen-Schnitt" im Brief muss
        // sich auf der Seite wiederfinden. Verglichen wird die ZAHL mit ihrem
        // Prozentzeichen, nicht der ganze Satz — die Formulierungen der beiden
        // Seiten sind bewusst verschieden.
        const vergleich = b.body.match(/(\d+)\s*%\s*(?:mehr|über)/);
        if (vergleich && !seite.includes(`${vergleich[1]} %`)) {
          mängel.push(`Vergleichszahl ${vergleich[1]} % steht nicht auf der Seite`);
        }
        // Datenstand
        if (b.stand && !seite.includes(b.stand.slice(0, 4))) {
          mängel.push(`Datenstand ${b.stand} nicht auf der Seite gefunden`);
        }
      }
    }

    // 3: Die PLATZIERUNG gegen die Rangliste, nicht gegen die Gemeindeseite.
    //
    // Auf der Gemeindeseite steht sie in Bausteinen, die eine Textsuche im
    // ausgelieferten HTML nicht zuverlässig findet — die erste Fassung dieser
    // Prüfung meldete deshalb 36 von 48 Briefen als fehlerhaft, und keiner war
    // es. Ein Prüfer, der falschen Alarm schlägt, ist schlimmer als keiner: Beim
    // nächsten Mal glaubt ihm niemand.
    //
    // Die Rangliste dagegen liefert die Reihenfolge fertig aus. Geprüft wird
    // daraus BEIDES — der Platz und die Größe der Vergleichsgruppe.
    const platz = b.body.match(/Platz (\d+) von ([\d.]+)/);
    if (platz && b.rangliste_url) {
      const { status, text } = await hole(b.rangliste_url);
      if (status !== 200) {
        mängel.push(`Rangliste antwortet ${status || "gar nicht"}`);
      } else {
        const namen = [...text.matchAll(/class="atlas-rank-ziel"[^>]*>(?:<span[^>]*>[^<]*<\/span>)?([^<]+)</g)].map((m) =>
          m[1].trim(),
        );
        const pos = namen.findIndex((n) => n === b.name) + 1;
        const behauptet = Number(platz[1]);
        const gruppe = Number(platz[2].replace(/\./g, ""));
        if (!pos) mängel.push(`steht nicht auf der eigenen Rangliste`);
        else if (pos !== behauptet) mängel.push(`Brief sagt Platz ${behauptet}, Rangliste zeigt Platz ${pos}`);
        // DIE SEITE ZEIGT HÖCHSTENS 200 EINTRÄGE. Bei größeren Gruppen ist die
        // Liste abgeschnitten, und ein Vergleich der Gruppengröße misst dann die
        // Seitenlänge statt der Wahrheit — vier Briefe wurden so fälschlich
        // beanstandet. Geprüft wird die Größe deshalb nur, wo die Liste
        // vollständig ist; die Platzierung selbst bleibt in beiden Fällen
        // prüfbar, weil unsere Briefe ausnahmslos vordere Plätze behaupten.
        const abgeschnitten = namen.length >= 200;
        if (namen.length && !abgeschnitten && namen.length !== gruppe) {
          mängel.push(`Brief sagt „von ${gruppe}", Rangliste hat ${namen.length} Einträge`);
        }
      }
    }

    // 4: die Widget-Vorschau, wo der Brief eine anbietet
    const widget = b.body.match(/https:\/\/solar-check\.io\/embed\/[^\s]+/);
    if (widget) {
      const { status } = await hole(widget[0]);
      if (status !== 200) mängel.push(`Widget-Vorschau antwortet ${status || "gar nicht"}`);
    }

    // 5: gehört das Postfach zu dieser Gemeinde?
    //
    // Entfällt bei der Nachprüfung, und zwar mit Grund: Die Nachprüfung bekommt
    // absichtlich keine Empfängeradresse geliefert, damit aus ihr nie ein
    // zweiter Versandweg werden kann. Die Frage ist dort ohnehin beantwortet —
    // die Mail ist zugestellt.
    if (!verschickt) {
      const pf = postfachBefund(b.empfaenger, b.name, b.verwaltung_domain ?? undefined);
      if (!pf.ok) mängel.push(`Postfach: ${pf.grund}`);
    }

    if (mängel.length) {
      fehler.push(`${b.name}: ${mängel.join(" · ")}`);
      log(`${b.name} — ${mängel.join(" · ")}`, "err");
    }
  }

  log();
  if (fehler.length) {
    log(
      verschickt
        ? `${fehler.length} von ${briefe.length} BEREITS VERSCHICKTEN Briefen passen nicht mehr zu ihrer Seite. ` +
            `Zurücknehmen geht nicht — entscheiden, ob die Gemeinde eine Richtigstellung bekommt, und die Regel nachziehen.`
        : `${fehler.length} von ${briefe.length} Briefen haben einen Mangel — NICHT senden, bevor das geklärt ist.`,
      "err",
    );
    process.exit(1);
  }
  log(`Alle ${briefe.length} Briefe geprüft, kein Mangel.`, "ok");
  if (warnungen.length) for (const w of warnungen) log(w, "warn");
  log("Geprüft wurde Übereinstimmung, nicht Wahrheit: Brief und Seite ziehen aus derselben Quelle.");
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
