/**
 * Unzustellbare Anschreiben: einordnen, neue Adresse suchen, eintragen.
 *
 * WARUM (Betreiber, 10.09.2026): „wenn wir in Zukunft Bouncer haben > Autofix >
 * Neuversand. Da bringt mir das Protokoll nichts." Eine Liste, die ein Mensch
 * abarbeiten müsste, ist bei vier Bouncern noch machbar und bei vierzig nicht
 * mehr — und dann bleibt sie liegen, während die Gemeinden nie erreicht werden.
 *
 * Nutzung:
 *   npm run kommunen:bounce                 nur zeigen
 *   npm run kommunen:bounce -- --schreiben  neue Adressen eintragen
 *
 * WAS DER LAUF NICHT TUT: verschicken. Der Neuversand gehört zum
 * Anschreiben-Lauf und hat dessen Bremsen (Ferien, Wochentag, Tagespensum);
 * dieser Lauf macht die Gemeinde nur wieder erreichbar und markiert sie.
 *
 * DIE EINE UNTERSCHEIDUNG, AN DER ALLES HÄNGT, steht in lib/outreach-bounce.ts:
 * Ein volles Postfach ist keine falsche Adresse. Ohne sie hätte der erste Lauf
 * Selzens korrekte Adresse durch eine schlechtere ersetzt — und es hätte
 * niemand bemerkt, weil hinterher eine Adresse dasteht und der Lauf grün meldet.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function ladeEnv() {
  const envPath = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const hat = (n: string) => process.argv.includes(`--${n}`);
const log = (s = "") => console.log(s);

/** Wie oft eine Notiz schon eine Unzustellbarkeit vermerkt hat. */
function bouncerBisher(notes: string | null): number {
  return (notes ?? "").split("\n").filter((z) => z.includes("unzustellbar aus Postfach")).length;
}

/** Der Text der JÜNGSTEN Zustellmeldung aus der Notiz. */
function letzteMeldung(notes: string | null): string {
  const zeilen = (notes ?? "").split("\n");
  const start = zeilen.map((z) => z.includes("unzustellbar aus Postfach")).lastIndexOf(true);
  return start < 0 ? "" : zeilen.slice(start).join("\n");
}

async function seite(url: string): Promise<string> {
  try {
    const r = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: {
        // Dieselbe Kennung wie die übrigen Erhebungsläufe: Wir geben uns nicht
        // als Browser aus, aber auch nicht als etwas, das jeder Server sperrt.
        "user-agent": "solar-check.io Kontaktpflege (kontakt@solar-check.io)",
      },
    });
    return r.ok ? await r.text() : "";
  } catch {
    return "";
  }
}

async function main() {
  ladeEnv();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error("Kein Datenbankzugang.");
    return process.exit(1);
  }
  const kopf = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  const { bounceArt, ersatzAdresseTaugt, toteAdressen, MAX_DAUERHAFTE_BOUNCER, WIEDERVORLAGE_TAGE } = await import(
    "../lib/outreach-bounce"
  );
  const { postfachBefund } = await import("../lib/outreach-mail");
  const { toText, extractAdressen, findImpressumUrl, domainOf } = await import("../lib/kommunen-profil");
  const { heuteInBerlin } = await import("../lib/zeit");

  const zeilen = (await (
    await fetch(
      `${url}/rest/v1/kommunen_kontakt?outreach_status=eq.bounce&select=region_id,rollen_email,website,kontakt_url,impressum_url,notes,mastr_regions!inner(name)`,
      { headers: kopf },
    )
  ).json()) as {
    region_id: string;
    rollen_email: string | null;
    website: string | null;
    kontakt_url: string | null;
    impressum_url: string | null;
    notes: string | null;
    mastr_regions: { name: string } | { name: string }[];
  }[];

  if (!Array.isArray(zeilen) || !zeilen.length) {
    log("Keine unzustellbaren Anschreiben.");
    return;
  }
  log(`${zeilen.length} unzustellbare Anschreiben\n`);

  let ersetzt = 0;
  for (const z of zeilen) {
    const reg = Array.isArray(z.mastr_regions) ? z.mastr_regions[0] : z.mastr_regions;
    const ort = reg?.name ?? z.region_id;
    // ALLE bisher gescheiterten Adressen, nicht nur die aktuell hinterlegte:
    // Die toten stehen weiter im Impressum, und ohne die Geschichte trägt der
    // Lauf sie nach einer Handkorrektur wieder ein.
    const tote = [...toteAdressen(z.notes), ...(z.rollen_email ? [z.rollen_email] : [])];
    const tot = z.rollen_email ?? "";
    const art = bounceArt(letzteMeldung(z.notes));

    if (art === "voruebergehend") {
      log(`${ort}: vorübergehend (Postfach voll o. Ä.) — Adresse bleibt, erneut in ${WIEDERVORLAGE_TAGE} Tagen`);
      continue;
    }
    if (art === "unklar") {
      log(`${ort}: Zustellmeldung sagt nichts Eindeutiges — bitte selbst ansehen`);
      continue;
    }
    // SCHON BEHOBEN? Dann gibt es nichts zu suchen. Steht auf der Zeile eine
    // Adresse, die noch nie geprellt hat, ist der Bouncer bereits beantwortet —
    // von einem früheren Lauf oder von Hand — und was fehlt, ist allein der
    // Neuversand. Ohne diesen Zweig hätte der Lauf hier gemeldet, die gerade
    // eingetragene Adresse sei tot; das ist die Sorte Falschaussage, die man
    // einem grünen Lauf nicht ansieht.
    if (tot && !toteAdressen(z.notes).includes(tot.toLowerCase())) {
      log(`${ort}: Adresse steht schon (${tot}) — es fehlt nur der Neuversand`);
      continue;
    }
    if (bouncerBisher(z.notes) >= MAX_DAUERHAFTE_BOUNCER) {
      log(`${ort}: schon ${bouncerBisher(z.notes)} Unzustellbarkeiten — hier stimmt mehr als die Adresse nicht`);
      continue;
    }

    // Impressum und Kontaktseite, in dieser Reihenfolge: Das Impressum ist die
    // rechtlich verbindliche Angabe, die Kontaktseite die bequemere.
    const kandidatenSeiten = [z.impressum_url, z.kontakt_url, z.website].filter((s): s is string => !!s);
    const eigene = domainOf(z.website ?? "");
    let neu: string | null = null;
    let woher = "";
    for (const s of kandidatenSeiten) {
      const html = await seite(s);
      if (!html) continue;
      // Manche Seiten verstecken das Impressum erst hinter einem Link.
      const tieferer = findImpressumUrl(html, s);
      const texte = [toText(html)];
      if (tieferer && tieferer !== s) {
        const zweit = await seite(tieferer);
        if (zweit) texte.push(toText(zweit));
      }
      for (const t of texte) {
        const gefunden = extractAdressen(t, eigene, () => true);
        for (const kandidat of [gefunden.rollenEmail].filter((x): x is string => !!x)) {
          const taugt = ersatzAdresseTaugt(kandidat, tote, (a) => postfachBefund(a, ort).ok);
          if (taugt.ok) {
            neu = kandidat;
            woher = s;
            break;
          }
        }
        if (neu) break;
      }
      if (neu) break;
    }

    if (!neu) {
      // KEIN STILLER FEHLSCHLAG. „Nichts gefunden" ist eine Auskunft und gehört
      // ausgesprochen — sonst ist sie von „nie nachgesehen" nicht zu
      // unterscheiden, und genau daran ist der Förderkatalog schon einmal
      // hängengeblieben.
      log(`${ort}: keine brauchbare Adresse auf den eigenen Seiten gefunden — bleibt liegen`);
      continue;
    }

    log(`${ort}: ${tot} → ${neu}   (${woher})`);
    ersetzt++;
    if (!hat("schreiben")) continue;

    const zeile = `[${heuteInBerlin()}] Postfach nach Unzustellbarkeit ersetzt: ${tot} → ${neu}. Beleg: ${woher}`;
    await fetch(`${url}/rest/v1/kommunen_kontakt?region_id=eq.${z.region_id}`, {
      method: "PATCH",
      headers: kopf,
      body: JSON.stringify({
        rollen_email: neu,
        rollen_email_quelle: "bounce-recherche",
        notes: z.notes ? `${z.notes}\n${zeile}` : zeile,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  log();
  log(hat("schreiben") ? `${ersetzt} Adressen ersetzt.` : `${ersetzt} Adressen wären zu ersetzen. Zum Eintragen: --schreiben`);
  // DER STATUS BLEIBT AUF „BOUNCE", und das ist kein Versäumnis: Ob eine
  // Gemeinde wieder in den Versandtopf kommt, ist eine Entscheidung über die
  // Kampagne und gehört in den Anschreiben-Lauf, nicht hierher.
  log("Der Kampagnen-Status bleibt unverändert — den Neuversand löst der Anschreiben-Lauf aus.");
}

const direktAufgerufen = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direktAufgerufen) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
