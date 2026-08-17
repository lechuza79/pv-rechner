/**
 * Seiten-Wächter für die Förderprogramme — der deterministische Teil der Prüfung.
 *
 *   npm run foerder:watch          # abrufen, vergleichen, Änderungen protokollieren
 *   npm run foerder:watch -- --dry # nur messen, nichts schreiben
 *
 * WARUM ES DAS GIBT (17.08.2026): Bis hierher war JEDE Prüfung ein Modell-Lauf am
 * Rechner des Betreibers. Lief der nicht, prüfte niemand — und niemand merkte es.
 * Für die Frage „hat sich an der Amtsseite etwas bewegt?" braucht es aber kein
 * Modell und kein Urteilsvermögen: Es genügt, die Seite abzurufen und mit dem
 * letzten Stand zu vergleichen. Das läuft in GitHub Actions, unabhängig von
 * irgendeinem Rechner, und kostet nichts.
 *
 * WAS ER KANN: zuverlässig melden, dass sich eine Seite geändert hat oder nicht
 * mehr erreichbar ist. Die geänderten Programme wandern damit an die Spitze des
 * Arbeitsvorrats (lib/funding-verify-state.ts) — die inhaltliche Prüfung macht
 * danach ein Wächter-Lauf.
 *
 * WAS ER NICHT KANN: verstehen, WAS sich geändert hat, und neue Förderprogramme
 * finden, von denen wir noch nichts wissen. Beides braucht Urteilsvermögen und
 * bleibt beim Modell-Lauf. Diese Grenze ist wichtig: Ein grüner Seiten-Wächter
 * heißt „nichts hat sich bewegt", nicht „alles ist korrekt".
 *
 * DER FINGERABDRUCK ist bewusst grob — nur der sichtbare Text, normalisiert, ohne
 * Skripte, Stile und Zahlen-Rauschen wie Zugriffszähler. Ein zu feiner Abdruck
 * schlägt bei jedem Deploy der Stadt an und wird dann ignoriert; genau so stirbt
 * ein Wächter.
 */

import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { FundingProgram } from "../lib/funding-programs";

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen.");
  process.exit(1);
}
const sb = createClient(url, key);
const dry = process.argv.includes("--dry");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

/** Sichtbarer Text, so weit normalisiert, dass nur echte Inhaltsänderungen zählen. */
function fingerprint(html: string): string {
  const text = html
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    // Sitzungs-/Cache-Kennungen und Datumsstempel, die sich bei jedem Abruf
    // ändern, würden sonst täglich eine Änderung vortäuschen.
    .replace(/\b[0-9a-f]{16,}\b/gi, " ")
    .replace(/\b\d{1,2}[.:]\d{2}(:\d{2})?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return createHash("sha256").update(text).digest("hex");
}

type Zeile = { id: string; data: FundingProgram; page_fingerprint: string | null };

async function main(): Promise<void> {
  const { data, error } = await sb
    .from("funding_programs")
    .select("id, data, page_fingerprint, archived");
  if (error) {
    console.error(`Programme nicht lesbar: ${error.message}`);
    process.exit(1);
  }

  const zeilen = (data ?? []).filter((r: any) => !r.archived) as (Zeile & { archived: boolean })[];
  const geaendert: string[] = [];
  const unerreichbar: string[] = [];
  const ueberArchiv: string[] = [];
  let unveraendert = 0;

  for (const z of zeilen) {
    const p = z.data;
    if (!p?.url) continue;

    // Mehrere Anläufe mit wachsender Geduld — BLOCKER für die Verlässlichkeit.
    // Der erste Cloud-Lauf meldete Freiburg, Heidelberg und Karlsruhe als
    // unerreichbar; alle drei antworten von einem normalen Anschluss sofort. Es
    // waren keine Sperren, sondern Zeitüberschreitungen im Rechenzentrum. Ein
    // Wächter, der beim ersten Timeout aufgibt, meldet genau die Städte nicht,
    // deren Seiten sich ändern — und meldet dabei auch noch Grün.
    let html = "";
    let status = 0;
    for (const versuch of [0, 1, 2]) {
      try {
        const res = await fetch(p.url, {
          headers: {
            "User-Agent": UA,
            "Accept-Language": "de-DE,de;q=0.9",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(25_000 + versuch * 20_000),
        });
        status = res.status;
        if (res.ok) {
          html = await res.text();
          break;
        }
        // 403/429 ist eine Entscheidung der Gegenseite — die ändert sich durch
        // schnelles Nachfassen nicht, aber durchaus über die Zeit (siehe
        // Frankfurt). Einmal nachfassen genügt, dann weiter.
        if (status !== 403 && status !== 429 && status < 500) break;
      } catch {
        status = 0;
      }
      if (versuch < 2) await new Promise((r) => setTimeout(r, 3_000 * (versuch + 1)));
    }

    // Rückfallebene Archiv — die technische Antwort auf den Frankfurt-Fall.
    //
    // frankfurt.de lässt automatisierte Abrufe nicht durch und stellt zeitweise
    // sogar echten Browsern eine Mensch-Prüfung. Die klickt hier niemand weg. Das
    // Internet-Archiv liefert dieselbe Amtsseite aber mit einem gewöhnlichen
    // Abruf aus, ohne jede Prüfung — gemessen am 16.08.2026 mit HTTP 200.
    //
    // Damit wird eine Änderung auch bei gesperrten Trägern zuverlässig bemerkt,
    // ohne Mensch und ohne Browser. Der Preis ist ein Zeitverzug: Das Archiv
    // erfasst die Seite, wann es will (bei Frankfurt zuletzt gut einen Monat
    // vorher). Für „hat sich etwas bewegt" reicht das; für „gilt heute noch"
    // nicht — deshalb bleibt ein Archiv-Beleg auch hier kein Prüfdatum.
    //
    // `id_` liefert die Originalfassung ohne die Navigationsleiste des Archivs;
    // ohne das würde deren Rahmen im Fingerabdruck landen und bei jeder
    // Archiv-Änderung eine Bewegung auf der Amtsseite vortäuschen.
    // Zwei Wege ins Archiv, jeder mit Wiederholung — das Archiv ist selbst nicht
    // immer da. Gemessen am 17.08.2026: Mittags lieferte es die Frankfurter Seite
    // mit HTTP 200, abends antwortete es mit 500/503, und die Verfügbarkeits-
    // Abfrage lief zwischendurch in ein Anfragelimit. Es ist also eine gute
    // Rückfallebene, aber keine Garantie — deshalb ist und bleibt der
    // Beleg-Verfall nach 180 Tagen die eigentliche Absicherung.
    let ausArchiv = false;
    if (!html) {
      const jahr = new Date().getFullYear();
      const wege = [
        async () => {
          const av = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(p.url)}`, {
            signal: AbortSignal.timeout(25_000),
          });
          const j = (await av.json()) as { archived_snapshots?: { closest?: { timestamp?: string } } };
          const ts = j.archived_snapshots?.closest?.timestamp;
          return ts ? `https://web.archive.org/web/${ts}id_/${p.url}` : null;
        },
        // Ohne Zeitstempel: Das Archiv leitet selbst auf den nächstgelegenen
        // Schnappschuss um. Braucht die Verfügbarkeits-Abfrage nicht und
        // funktioniert deshalb auch, wenn die gerade limitiert.
        async () => `https://web.archive.org/web/${jahr}id_/${p.url}`,
        // Letzte Stufe: das Archiv bitten, die Seite JETZT zu holen. Nicht wir
        // rufen dann ab, sondern deren Crawler — und der kommt bei Trägern durch,
        // die unseren Abruf abweisen.
        //
        // Das ist erlaubt und nicht getarnt: Frankfurts eigene robots.txt setzt
        // für `User-agent: *` ein `Allow: /` mit `Content-Signal:
        // search=yes, use=reference`; gesperrt sind dort ausdrücklich nur
        // KI-Trainings-Crawler (GPTBot, ClaudeBot, CCBot, Google-Extended …).
        // Ein Abruf, um zu prüfen, ob ein Fördersatz noch stimmt, ist genau die
        // erlaubte Referenz-Nutzung. Die 403 ist eine Bot-Erkennung, keine
        // Hausordnung — deshalb wird sie umgangen, indem wir jemanden fragen,
        // der durchkommt, und NICHT indem wir eine Mensch-Prüfung lösen.
        async () => `https://web.archive.org/save/${p.url}`,
      ];

      for (const weg of wege) {
        if (html) break;
        for (const versuch of [0, 1]) {
          try {
            const ziel = await weg();
            if (!ziel) break;
            const res = await fetch(ziel, {
              headers: { "User-Agent": UA },
              redirect: "follow",
              signal: AbortSignal.timeout(45_000),
            });
            if (res.ok) {
              const t = await res.text();
              // Eine Fehlerseite des Archivs ist keine Amtsseite. Ohne diese
              // Schwelle landete deren Hinweistext als Fingerabdruck in der
              // Datenbank und gälte fortan als "die Seite der Stadt".
              if (t.length > 2_000) {
                html = t;
                ausArchiv = true;
                break;
              }
            }
          } catch {
            /* nächster Versuch */
          }
          if (versuch === 0) await new Promise((r) => setTimeout(r, 4_000));
        }
      }
    }

    if (!html) {
      unerreichbar.push(`${p.name} (${p.region}) — HTTP ${status || "keine Antwort"}, auch nicht im Archiv`);
      if (!dry) {
        // WICHTIG: eigene Kennung, NICHT "pruefseite"/"gesperrt" — BLOCKER.
        // Ein gescheiterter Abruf dieses Crawlers ist KEIN Fehlversuch im Sinne
        // der Eskalation. Gemessen am ersten Cloud-Lauf (17.08.2026): vom Rechner
        // des Betreibers waren 2 Seiten unerreichbar, aus GitHubs Rechenzentrum
        // 5 — dieselben Seiten, andere IP-Reputation. Würden diese Abbrüche als
        // Fehlversuche zählen, hätte der Crawler nach drei Tagen Programme auf
        // "unsicher" gesetzt, die von einem echten Browser problemlos erreichbar
        // sind. Ein Fehlversuch entsteht erst, wenn die volle Eskalationsleiter
        // inklusive echtem Browser gescheitert ist — das kann nur ein
        // Wächter-Lauf feststellen, nicht ein Abruf.
        await sb.from("funding_checks").insert({
          program_id: z.id,
          verdict: "UNREACHABLE",
          source: "seite-unerreichbar",
          note: `Seiten-Wächter: HTTP ${status || "keine Antwort"} (Abruf aus dem Rechenzentrum — sagt nichts über einen echten Browser)`,
        });
      }
      continue;
    }

    // Der Fingerabdruck trägt seine Herkunft. Live- und Archivfassung derselben
    // Seite unterscheiden sich immer ein wenig; ohne diese Kennzeichnung meldete
    // jeder Wechsel zwischen beiden Wegen eine Änderung, die es nie gab.
    const fp = `${ausArchiv ? "archiv" : "live"}:${fingerprint(html)}`;
    const gleicheHerkunft = z.page_fingerprint?.split(":")[0] === (ausArchiv ? "archiv" : "live");
    if (z.page_fingerprint && gleicheHerkunft && z.page_fingerprint !== fp) {
      geaendert.push(`${p.name} (${p.region})`);
      if (!dry) {
        await sb.from("funding_checks").insert({
          program_id: z.id,
          verdict: "CHANGED",
          source: "seite-geaendert",
          note: `Seiten-Wächter: Inhalt der Amtsseite hat sich geändert (${p.url})`,
        });
      }
    } else if (z.page_fingerprint && gleicheHerkunft) {
      unveraendert++;
    }
    if (ausArchiv) ueberArchiv.push(`${p.name} (${p.region})`);

    if (!dry) {
      await sb
        .from("funding_programs")
        .update({ page_fingerprint: fp, page_seen_at: new Date().toISOString() })
        .eq("id", z.id);
    }
  }

  console.log(`Seiten-Wächter: ${zeilen.length} Programme abgerufen.`);
  console.log(`  unverändert:  ${unveraendert}`);
  console.log(`  geändert:     ${geaendert.length}`);
  for (const g of geaendert) console.log(`     → ${g}`);
  console.log(`  über Archiv:  ${ueberArchiv.length}`);
  for (const a of ueberArchiv) console.log(`     → ${a}`);
  console.log(`  unerreichbar: ${unerreichbar.length}`);
  for (const u of unerreichbar) console.log(`     → ${u}`);

  if (geaendert.length) {
    console.log("\nDiese Programme stehen jetzt oben im Arbeitsvorrat (npm run foerder:probe -- --vorrat).");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
