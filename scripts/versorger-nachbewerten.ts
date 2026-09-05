// Die gespeicherten Funde neu einordnen — OHNE einen einzigen neuen Abruf.
//
// WARUM DAS GEHT: Die Erhebung speichert alle Rohfunde mit ihrer Einordnung,
// nicht nur das Urteil. Genau dafür ist das gebaut — eine Neubewertung kostet
// eine Abfrage statt eines Laufs über 910 fremde Websites.
//
// WAS HIER PASSIERT (Gegenprüfung 05.09.2026):
//
//  1. POSTFÄCHER NEU EINORDNEN. Der Versorger-Weg hat die Liste ungeeigneter
//     Adressen nie angewandt; `datenschutz@`, `bewerbung@` und `noreply@`
//     zählten als „Weg ins Unternehmen". Dazu Behördenadressen, die durch den
//     unvollständigen Länderfilter kamen — zehnmal die Universalschlichtungs-
//     stelle. Eine Outreach-Mail dorthin ist der peinliche Ausfall, den man vor
//     dem ersten Schub abstellt.
//
//  2. DIE VERTRIEBSADRESSE HINTER DER NETZGESELLSCHAFT. 129 Versorger haben
//     ihre Postfächer ausschließlich auf einer FREMDEN Domain — die
//     Netzgesellschaft verweist auf die Mutter, und dort sitzt der Vertrieb.
//     Das ist der Blocker, an dem die Ansprache sonst hängt: Das Anlagenregister
//     kennt nur die Meldeadresse des Netzbetriebs, und der darf nach § 7a EnWG
//     für den Vertrieb nicht einmal werben. Der Fund lag längst in den Daten,
//     das Feld dafür war in allen 937 Zeilen leer.
//
//  3. DER SITZ UND SEIN BUNDESLAND. Ohne Bundesland greift die Bremse des
//     Versands nicht, die Schulferien und Feiertage des ZIELLANDES aussparen
//     soll — sie stünde da und täte nichts.
//
// Aufruf:  npx tsx scripts/versorger-nachbewerten.ts [--schreiben]
// Ohne --schreiben wird nur berichtet.

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { alleZeilen, datenbank, log } from "../lib/skript-umgebung";
import { istBrauchbar, postfachArt, type PostfachArt } from "../lib/versorger-erhebung";
import { VERSORGER_VOKABULAR, domainOf } from "../lib/kommunen-profil";

const HIER = dirname(fileURLToPath(import.meta.url));

type Postfach = { mail: string; art: PostfachArt };

type Zeile = {
  id: string;
  name: string;
  website: string | null;
  plz: string | null;
  postfaecher: Postfach[] | null;
};

/** Postleitzahl → mögliche Gemeindeschlüssel. Eine Postleitzahl kann mehrere
 *  Gemeinden treffen; das Bundesland ist trotzdem fast immer eindeutig. */
function ladePlzAgs(): Map<string, string[]> {
  const datei = resolve(HIER, "..", "public", "plz-ags.json");
  const out = new Map<string, string[]>();
  if (!existsSync(datei)) return out;
  const roh = JSON.parse(readFileSync(datei, "utf8")) as Record<string, { ags?: string }[]>;
  for (const [plz, eintraege] of Object.entries(roh)) {
    const ags = eintraege.map((e) => e.ags).filter((a): a is string => !!a);
    if (ags.length) out.set(plz, Array.from(new Set(ags)));
  }
  return out;
}

/**
 * Die Domain, unter der die brauchbaren Postfächer dieses Hauses wirklich
 * liegen — wenn das eine ANDERE ist als die der Website.
 *
 * Fremde Adressen kommen nur aus dem Impressum in die Funde, und Behörden,
 * Schlichtungsstellen und Agenturen sind dort bereits aussortiert. Was übrig
 * bleibt und mehrfach auftritt, ist die Muttergesellschaft.
 */
function verbundDomain(postfaecher: Postfach[], eigene: string | null): string | null {
  const zaehler = new Map<string, number>();
  for (const p of postfaecher) {
    if (!istBrauchbar(p.art)) continue;
    const dom = p.mail.split("@")[1];
    if (!dom) continue;
    const istEigen = eigene && (dom === eigene || dom.endsWith(`.${eigene}`) || eigene.endsWith(`.${dom}`));
    if (istEigen) return null; // eigene Adresse vorhanden — kein Verbundfall
    zaehler.set(dom, (zaehler.get(dom) ?? 0) + 1);
  }
  const beste = [...zaehler.entries()].sort((a, b) => b[1] - a[1])[0];
  return beste ? beste[0] : null;
}

async function main(): Promise<void> {
  const schreiben = process.argv.includes("--schreiben");
  const db = datenbank();

  const zeilen = await alleZeilen<Zeile>(db, "utilities", "id, name, website, plz, postfaecher");
  const regionen = await alleZeilen<{ region_id: string; name: string; level: string }>(
    db,
    "mastr_regions",
    "region_id, name, level",
    "region_id",
  );
  // Am Schlüssel erkannt, nicht am Ebenen-Wort: Der zweistellige Schlüssel IST
  // das Bundesland, und wie die Ebene in der Tabelle heißt, ist eine Annahme.
  const landName = new Map(regionen.filter((r) => r.region_id.length === 2).map((r) => [r.region_id, r.name]));
  const plzAgs = ladePlzAgs();
  log(`${zeilen.length} Versorger, ${landName.size} Bundesländer, ${plzAgs.size} Postleitzahlen`);

  const zaehler: Record<string, number> = {};
  const zaehl = (k: string) => (zaehler[k] = (zaehler[k] ?? 0) + 1);
  const domainBelegung = new Map<string, string[]>();
  const aenderungen: Record<string, unknown>[] = [];

  for (const z of zeilen) {
    const alt = Array.isArray(z.postfaecher) ? z.postfaecher : [];
    if (!alt.length) continue;

    // Neu einordnen. Der Fund bleibt, nur sein Etikett wird richtig.
    const neu: Postfach[] = alt.map((p) => ({
      mail: p.mail,
      art: postfachArt(p.mail, VERSORGER_VOKABULAR.rolle),
    }));
    for (const p of neu) if (p.art !== alt.find((a) => a.mail === p.mail)?.art) zaehl(`umgestuft:${p.art}`);

    const brauchbar = neu.filter((p) => istBrauchbar(p.art));
    if (!brauchbar.length && neu.length) zaehl("nur-unbrauchbare-adressen");

    const eigene = z.website ? domainOf(z.website) : null;
    const verbund = verbundDomain(neu, eigene);
    if (verbund) zaehl("verbunddomain");

    // Wer teilt sich eine Mail-Domain mit wem? Das erfasst BEIDE Bauformen:
    // die Tochter, die über die Mutter kommuniziert (dann ist es die
    // Verbunddomain), und mehrere Häuser mit gemeinsamem Backoffice, für die
    // dieselbe Domain jeweils die eigene ist. Für die Ansprache zählt beides
    // gleich: Ein Weg hinein erreicht mehrere Häuser, und vier Gemeindewerke
    // mit gemeinsamer Verwaltung viermal einzeln anzuschreiben ist der Fehler,
    // den man dabei vermeidet.
    for (const dom of new Set(neu.filter((p) => istBrauchbar(p.art)).map((p) => p.mail.split("@")[1]))) {
      if (!dom) continue;
      const liste = domainBelegung.get(dom) ?? [];
      if (!liste.includes(z.name)) liste.push(z.name);
      domainBelegung.set(dom, liste);
    }

    // Sitz und Bundesland. Der Gemeindeschlüssel nur bei Eindeutigkeit — ein
    // geratener zeigt auf einen anderen Ort und sieht dabei völlig normal aus.
    const kandidaten = z.plz ? (plzAgs.get(z.plz) ?? []) : [];
    const laender = new Set(kandidaten.map((a) => a.slice(0, 2)));
    const land = laender.size === 1 ? [...laender][0] : null;
    const gemeinde = kandidaten.length === 1 ? kandidaten[0] : null;
    if (land) zaehl("bundesland");
    if (gemeinde) zaehl("sitzgemeinde");

    const erste = (art: PostfachArt) => neu.find((p) => p.art === art)?.mail ?? null;
    aenderungen.push({
      id: z.id,
      // Der Name muss mit: Ein Zusammenführen legt sonst eine neue Zeile ohne
      // Pflichtfeld an — die Datenbank weist es zurück, und zwar sichtbar,
      // seit die Schreibfehler nicht mehr verschluckt werden.
      name: z.name,
      postfaecher: neu,
      website_email: erste("website"),
      kundenanfrage_email: erste("kundenanfrage"),
      netz_email: erste("netz"),
      verbund_domain: verbund,
      sitz_land: land,
      ...(gemeinde ? { sitz_gemeinde_id: gemeinde } : {}),
    });
  }

  // Bericht.
  console.log("\n── Neueinordnung ──");
  for (const [k, v] of Object.entries(zaehler).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(5)}  ${k}`);
  }

  // VERBUND ODER AGENTUR — und was die Maschine davon WIRKLICH weiß.
  //
  // Sicher ist nur die eine Richtung: Gehört die geteilte Domain der Website
  // eines der beteiligten Häuser, sitzt dort ein Versorger, der auch
  // entscheidet. Der Umkehrschluss trägt NICHT. Unter den Domains, die keinem
  // der Häuser gehören, stehen echte Verbundmütter neben echten Agenturen —
  // `stawag.de` ist die Mutter von enwor, `stadtwerke-sh.de` ein Zusammenschluss
  // dreier Stadtwerke, `vancado.de` und `trurnit.de` sind Dienstleister. Was
  // davon was ist, entscheidet eine Handprüfung, keine Regel; die Mutter steht
  // meist gar nicht in unserer Liste, weil das Anlagenregister nur
  // Netzbetreiber führt.
  //
  // Die zweite Gruppe heißt deshalb „offen" und nicht „Agentur". Ein Etikett zu
  // vergeben, das zur Hälfte falsch ist, wäre schlimmer als keines.
  const eigeneDomains = new Set(zeilen.map((z) => (z.website ? domainOf(z.website) : null)).filter(Boolean) as string[]);
  const cluster = [...domainBelegung.entries()]
    .filter(([, n]) => n.length > 1)
    .map(([dom, namen]) => ({ dom, namen, verbund: eigeneDomains.has(dom) }))
    .sort((a, b) => b.namen.length - a.namen.length);
  const verbuende = cluster.filter((c) => c.verbund);
  const dienstleister = cluster.filter((c) => !c.verbund);

  console.log(
    `\n── Belegter Verbund (Domain gehört einem der Häuser): ${verbuende.length} Gruppen, ${new Set(verbuende.flatMap((c) => c.namen)).size} Häuser ──`,
  );
  for (const c of verbuende.slice(0, 20)) {
    console.log(`  ${String(c.namen.length).padStart(3)}x ${c.dom}  —  ${c.namen.slice(0, 4).join(", ")}${c.namen.length > 4 ? " …" : ""}`);
  }
  console.log(
    `\n── Offen — Verbundmutter ODER Dienstleister, Handprüfung: ${dienstleister.length} Gruppen, ${new Set(dienstleister.flatMap((c) => c.namen)).size} Häuser ──`,
  );
  for (const c of dienstleister.slice(0, 20)) {
    console.log(`  ${String(c.namen.length).padStart(3)}x ${c.dom}  —  ${c.namen.slice(0, 4).join(", ")}${c.namen.length > 4 ? " …" : ""}`);
  }

  const laender = new Map<string, number>();
  for (const a of aenderungen) {
    const l = a.sitz_land as string | null;
    if (l) laender.set(l, (laender.get(l) ?? 0) + 1);
  }
  console.log("\n── Versorger je Bundesland ──");
  for (const [l, n] of [...laender.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${landName.get(l) ?? l}`);
  }

  if (!schreiben) {
    console.log("\nNur Bericht. Mit --schreiben in die Datenbank übernehmen.");
    return;
  }

  let ok = 0;
  let fehler = 0;
  for (let i = 0; i < aenderungen.length; i += 100) {
    const teil = aenderungen.slice(i, i + 100);
    // Fehler NICHT verschlucken: Ein Rechte- oder Spaltenfehler bliebe sonst
    // stumm, und die Abschlusszeile meldete Erfolg für nichts.
    const { error } = await db.from("utilities").upsert(teil, { onConflict: "id" });
    if (error) {
      fehler += teil.length;
      log(`Schreibfehler (${teil.length} Zeilen): ${error.message}`);
    } else {
      ok += teil.length;
    }
  }
  log(`geschrieben: ${ok}, fehlgeschlagen: ${fehler}`);
  if (fehler) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
