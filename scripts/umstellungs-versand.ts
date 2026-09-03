/**
 * Die einmalige Nachricht zur Umstellung der Anmeldung.
 *
 * OHNE `--senden` GEHT NICHTS RAUS. Der Lauf zeigt dann nur, wer sie bekäme
 * und warum die übrigen nicht — das ist die Vorgabe, nicht der Sonderfall.
 *
 * NUR AN BESTÄTIGTE ADRESSEN. Wer den Anmeldelink nie eingelöst hat, bekommt
 * nichts (Begründung im Kopf von lib/umstellungs-mail.ts). Der Lauf zählt sie
 * getrennt auf, damit man sieht, dass sie bewusst übersprungen wurden und
 * nicht durchgerutscht sind.
 *
 * JEDE ADRESSE HÖCHSTENS EINMAL: Der Lauf legt neben sich eine Liste der
 * bereits angeschriebenen Adressen ab und überspringt sie beim nächsten Mal.
 * Ohne diesen Merker würde ein zweiter Lauf — nach einem Abbruch, nach einem
 * Fehler — dieselben Menschen ein zweites Mal anschreiben, und genau das darf
 * bei einer Nachricht ohne Werbeeinwilligung nicht passieren.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { umstellungsMail, beipackBefund, loeschdatum, type Empfaengergruppe } from "../lib/umstellungs-mail";
import { versandzeitOk, AB_EMPFAENGERN } from "../lib/versandzeit";

const PROTOKOLL = "docs/versand/umstellung-anmeldung.json";

type Eintrag = { adresse: string; gesendetAm: string; beleg: string | null };

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

function protokollLesen(): Eintrag[] {
  if (!existsSync(PROTOKOLL)) return [];
  try {
    return JSON.parse(readFileSync(PROTOKOLL, "utf8")) as Eintrag[];
  } catch {
    return [];
  }
}

function protokollSchreiben(eintraege: Eintrag[]) {
  mkdirSync(dirname(PROTOKOLL), { recursive: true });
  writeFileSync(PROTOKOLL, JSON.stringify(eintraege, null, 2) + "\n");
}

async function main() {
  const senden = process.argv.includes("--senden");
  // Das Versandfenster der Abo-Meldungen gilt hier mit — dieselben Empfänger,
  // dieselbe Überlegung: Privatleute lesen nach Feierabend. Anders als dort
  // greift es UNABHÄNGIG von der Menge: Das ist eine einmalige Nachricht, die
  // ohnehin von Hand ausgelöst wird, also kostet das Warten auf den Abend
  // nichts. `--egal-wann` hebt es auf, wenn es einen Grund gibt.
  const egalWann = process.argv.includes("--egal-wann");
  // Persönlicher Absender statt der Marke: Die Nachricht ist als Mail eines
  // Menschen geschrieben, und ein Absender „solar-check.io" widerspräche dem
  // im Postfach, bevor jemand den ersten Satz liest. Muss auf derselben Domain
  // liegen, sonst brechen SPF und DKIM — der Versandweg weist das ab.
  const ABSENDER = "Sebastian von Solar Check <sebastian@solar-check.io>";
  const env = { ...umgebung(".env.local"), ...process.env } as Record<string, string>;
  Object.assign(process.env, umgebung(".env.local"));

  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const schluessel = env.SUPABASE_SERVICE_KEY;
  if (!url || !schluessel) throw new Error("Zugangsdaten der Datenbank fehlen.");

  const jetzt = new Date();
  const fassungen = {
    bestaetigt: umstellungsMail({ gruppe: "bestaetigt", jetzt }),
    unbestaetigt: umstellungsMail({ gruppe: "unbestaetigt", jetzt }),
  } as const;

  // Erst die Nachrichten prüfen, dann erst Adressen anfassen. Ein Beipack
  // über den zugestandenen Rahmen hinaus darf nicht am Versandtag auffallen.
  for (const [gruppe, m] of Object.entries(fassungen)) {
    const beipack = [...beipackBefund(m.html), ...beipackBefund(m.text)];
    if (beipack.length) {
      console.error(`Die Fassung für „${gruppe}" trägt Beipack und darf so nicht raus:`);
      for (const b of beipack) console.error("  · " + b);
      process.exit(1);
    }
  }

  const antwort = await fetch(`${url}/auth/v1/admin/users?per_page=200`, {
    headers: { apikey: schluessel, Authorization: `Bearer ${schluessel}` },
  });
  const { users } = (await antwort.json()) as {
    users: { email?: string; email_confirmed_at?: string | null }[];
  };

  const schon = new Set(protokollLesen().map((e) => e.adresse));
  const bestaetigt: string[] = [];
  const unbestaetigt: string[] = [];
  for (const u of users) {
    if (!u.email) continue;
    (u.email_confirmed_at ? bestaetigt : unbestaetigt).push(u.email.toLowerCase());
  }
  const offen: { adresse: string; gruppe: Empfaengergruppe }[] = [
    ...bestaetigt.map((adresse) => ({ adresse, gruppe: "bestaetigt" as const })),
    ...unbestaetigt.map((adresse) => ({ adresse, gruppe: "unbestaetigt" as const })),
  ].filter((e) => !schon.has(e.adresse));

  console.log(`Konten gesamt:            ${users.length}`);
  console.log(`davon bestätigt:          ${bestaetigt.length}  → „Anmeldung hat sich geändert"`);
  console.log(`davon nie eingelöst:      ${unbestaetigt.length}  → „Wir löschen deinen Eintrag am ${loeschdatum(jetzt)}"`);
  console.log(`schon angeschrieben:      ${schon.size}`);
  console.log(`\nWürde jetzt rausgehen an: ${offen.length}`);
  for (const e of offen) {
    console.log(`  · ${e.adresse.replace(/^(..)[^@]*/, "$1***").padEnd(30)} ${e.gruppe}`);
  }

  const fenster = versandzeitOk(jetzt, AB_EMPFAENGERN);
  if (!fenster.ok) {
    console.log(`\nVersandfenster: ZU — ${fenster.grund}.`);
    console.log(`Offen ab: ${fenster.naechstes}.`);
  } else {
    console.log("\nVersandfenster: offen.");
  }

  if (!senden) {
    console.log("\nProbelauf. Zum wirklichen Versand: --senden");
    return;
  }
  if (!offen.length) {
    console.log("\nNichts zu tun.");
    return;
  }

  if (!fenster.ok && !egalWann) {
    console.error("\nAbgebrochen: außerhalb des Versandfensters. Mit --egal-wann trotzdem senden.");
    process.exit(1);
  }

  const { sendeAboMail } = await import("../lib/abo-versand");
  const protokoll = protokollLesen();
  for (const { adresse, gruppe } of offen) {
    const mail = fassungen[gruppe];
    // VOR dem Versand vermerken: Bricht der Lauf zwischen zwei Adressen ab,
    // darf der Neustart niemanden zweimal anschreiben. Der Preis ist eine
    // verlorene Nachricht im Fehlerfall, und das ist die günstigere Richtung.
    protokoll.push({ adresse, gesendetAm: new Date().toISOString(), beleg: null });
    protokollSchreiben(protokoll);

    const ergebnis = await sendeAboMail({
      an: adresse,
      subject: mail.betreff,
      html: mail.html,
      text: mail.text,
      art: "umstellung",
      absender: ABSENDER,
    });
    protokoll[protokoll.length - 1].beleg = ergebnis.ok ? ergebnis.beleg : `FEHLER: ${ergebnis.fehler}`;
    protokollSchreiben(protokoll);
    console.log(`  ${ergebnis.ok ? "ok" : "FEHLGESCHLAGEN"}  ${adresse.replace(/^(..)[^@]*/, "$1***")}  (${gruppe})`);
  }
  console.log(`\n${offen.length} Nachricht(en) verarbeitet. Protokoll: ${PROTOKOLL}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
