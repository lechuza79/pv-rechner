// Die Bilanz der Erhebung — und zwar getrennt nach Sicherheit.
//
// WARUM DIE TRENNUNG DER GANZE PUNKT IST: Eine Zahl, die maschinelle Verdachte
// und angesehene Befunde zusammenzählt, ist genau die Zahl, die am 05.09.2026
// zerlegt wurde. Von den vier tragenden Zahlen des ersten Wettbewerbspapiers
// hielt keine der Handprüfung stand. Dieser Bericht zeigt deshalb immer beides:
// was angesehen wurde (belastbar) und was nur vermutet ist (nicht zitierfähig).
//
// Aufruf:  npx tsx scripts/versorger-bilanz.ts

import { alleZeilen, datenbank } from "../lib/skript-umgebung";
import { istBrauchbar, type PostfachArt } from "../lib/versorger-erhebung";
import type { Werkzeugbefund } from "../lib/versorger-werkzeuge";

type Zeile = {
  id: string;
  name: string;
  website: string | null;
  sitz_land: string | null;
  verbund_domain: string | null;
  kontaktformular: boolean | null;
  postfaecher: { mail: string; art: PostfachArt }[] | null;
  werkzeug: Werkzeugbefund | null;
  stromkennzeichnung_url: string | null;
  stromkennzeichnung_jahr: number | null;
  erhebung_geprueft_am: string | null;
  erhebung_fehler: string | null;
};

/** Zustände, die ein vorhandenes Rechenwerkzeug belegen. */
const WERKZEUG = ["rechner", "rechner-mit-leadfunnel", "eingekauft", "gratis-kataster"];

function tabelle(titel: string, zeilen: [string, number | string][]): void {
  console.log(`\n── ${titel} ──`);
  for (const [k, v] of zeilen) console.log(`  ${String(v).padStart(5)}  ${k}`);
}

async function main(): Promise<void> {
  const db = datenbank();
  const alle = await alleZeilen<Zeile>(
    db,
    "utilities",
    "id, name, website, sitz_land, verbund_domain, kontaktformular, postfaecher, werkzeug, stromkennzeichnung_url, stromkennzeichnung_jahr, erhebung_geprueft_am, erhebung_fehler",
  );
  const mitWebsite = alle.filter((z) => z.website);
  const erhoben = mitWebsite.filter((z) => z.erhebung_geprueft_am);

  tabelle("Grundgesamtheit", [
    ["Versorger insgesamt", alle.length],
    ["davon mit Website", mitWebsite.length],
    ["davon abgerufen", erhoben.length],
    ["nicht erreichbar (KEIN Befund)", mitWebsite.length - erhoben.length],
  ]);

  // ─── Erreichbarkeit ────────────────────────────────────────────────────────
  const brauchbar = (z: Zeile) => (z.postfaecher ?? []).filter((p) => istBrauchbar(p.art));
  const mitWeg = erhoben.filter((z) => brauchbar(z).length > 0 || z.kontaktformular);
  tabelle("Schriftlich erreichbar", [
    ["irgendein Weg (Postfach oder Formular)", mitWeg.length],
    ["  davon am Website-Schreibtisch", erhoben.filter((z) => brauchbar(z).some((p) => p.art === "website")).length],
    ["  davon nur über ein Formular", erhoben.filter((z) => !brauchbar(z).length && z.kontaktformular).length],
    ["gar kein Weg gefunden", erhoben.length - mitWeg.length],
    ["Vertriebsadresse liegt auf fremder Domain", erhoben.filter((z) => z.verbund_domain).length],
    ["Bundesland bekannt (Versandbremse greift)", alle.filter((z) => z.sitz_land).length],
  ]);

  // ─── Werkzeuge ─────────────────────────────────────────────────────────────
  const angesehen = erhoben.filter((z) => z.werkzeug?.sicherheit === "angesehen");
  const vermutet = erhoben.filter((z) => z.werkzeug && z.werkzeug.sicherheit !== "angesehen");
  const jeZustand = new Map<string, { angesehen: number; vermutet: number }>();
  for (const z of erhoben) {
    const k = z.werkzeug?.zustand ?? "keins";
    const e = jeZustand.get(k) ?? { angesehen: 0, vermutet: 0 };
    if (z.werkzeug?.sicherheit === "angesehen") e.angesehen++;
    else e.vermutet++;
    jeZustand.set(k, e);
  }
  console.log("\n── Werkzeuge, getrennt nach Sicherheit ──");
  console.log("        angesehen  vermutet  Zustand");
  for (const [k, v] of [...jeZustand.entries()].sort((a, b) => b[1].angesehen + b[1].vermutet - a[1].angesehen - a[1].vermutet)) {
    console.log(`  ${String(v.angesehen).padStart(9)}  ${String(v.vermutet).padStart(8)}  ${k}`);
  }

  const echteWerkzeuge = angesehen.filter((z) => WERKZEUG.includes(z.werkzeug!.zustand));
  const jeThema = new Map<string, number>();
  for (const z of echteWerkzeuge) jeThema.set(z.werkzeug!.thema, (jeThema.get(z.werkzeug!.thema) ?? 0) + 1);
  tabelle(
    "Bestätigte Werkzeuge nach Thema (nur angesehen)",
    [...jeThema.entries()].sort((a, b) => b[1] - a[1]),
  );

  const jeAnbieter = new Map<string, number>();
  for (const z of angesehen) {
    const a = z.werkzeug?.anbieter;
    if (a) jeAnbieter.set(a, (jeAnbieter.get(a) ?? 0) + 1);
  }
  tabelle("Anbieter (nur angesehen)", [...jeAnbieter.entries()].sort((a, b) => b[1] - a[1]));

  // Die Kernaussage, und wie weit sie trägt.
  const eigen = angesehen.filter((z) => ["rechner", "rechner-mit-leadfunnel"].includes(z.werkzeug!.zustand));
  const gekauft = angesehen.filter((z) => z.werkzeug!.zustand === "eingekauft");
  const gratis = angesehen.filter((z) => z.werkzeug!.zustand === "gratis-kataster");
  console.log("\n── Kernaussage ──");
  console.log(`  Angesehen wurden ${angesehen.length} Seiten: alle ${erhoben.filter((z) => z.werkzeug && z.werkzeug.zustand !== "keins").length} Kandidaten`);
  console.log(`  plus eine Stichprobe aus den vermeintlich leeren.`);
  console.log(`  Bestätigtes Rechenwerkzeug          : ${echteWerkzeuge.length}`);
  console.log(`    davon eingekauft                  : ${gekauft.length}`);
  console.log(`    davon selbst gebaut               : ${eigen.length}`);
  console.log(`    davon kostenloses Fremdangebot    : ${gratis.length}`);
  console.log(`  Rest der Kandidaten war Tarifrechner, Netz-Pflichtprozess oder Anfrageformular.`);
  if (vermutet.length) {
    console.log(`\n  ${vermutet.length} Befunde sind NUR VERMUTET (aus dem Quelltext, nicht angesehen).`);
    console.log(`  Sie gehören in keine Zahl, die nach außen geht.`);
  }

  // ─── Stromkennzeichnung ────────────────────────────────────────────────────
  const mitKenn = erhoben.filter((z) => z.stromkennzeichnung_url);
  const mitJahr = mitKenn.filter((z) => z.stromkennzeichnung_jahr !== null);
  tabelle("Stromkennzeichnung (§ 42 EnWG)", [
    ["Seite gefunden", mitKenn.length],
    ["Bezugsjahr erkannt", mitJahr.length],
    ["davon veraltet (vor 2025)", mitJahr.filter((z) => (z.stromkennzeichnung_jahr ?? 0) < 2025).length],
  ]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
