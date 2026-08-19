/**
 * Übersicht über den Releaseplan: was ist live, was steht an, was ist überfällig,
 * und ist der Plan in sich schlüssig.
 *
 * Aufruf: npm run release:plan
 *
 * Dieselbe Trennung wie bei `npm run stand:faellig`: Strukturfehler des Plans
 * fängt der Test ab (sie sind Codefehler), das Altern des Plans meldet dieser
 * Befehl (das ist kein Codefehler, sondern Arbeitsvorrat).
 */
import {
  RELEASE_PLAN,
  ALTBESTAND,
  GATTUNG_LABEL,
  planBefunde,
  ueberfaellig,
  naechsterSchub,
  MIN_ABSTAND_GATTUNG_TAGE,
  MIN_ABSTAND_SCHUB_TAGE,
} from "../lib/release-plan";

const heute = new Date();
const tag = (iso: string) => new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

console.log("\nReleaseplan der Seitengattungen mit Ortsnamen\n");
console.log(`  Altbestand vor dem Plan: ${ALTBESTAND["foerder-stadt"].length} Förderseiten`);
console.log(`  Abstand zweier Gattungen für denselben Ort: ${MIN_ABSTAND_GATTUNG_TAGE} Tage`);
console.log(`  Abstand zwischen zwei Schüben: ${MIN_ABSTAND_SCHUB_TAGE} Tage\n`);

for (const s of RELEASE_PLAN.slice().sort((a, b) => a.datum.localeCompare(b.datum))) {
  const marke = s.status === "live" ? "live" : s.status === "zurueckgenommen" ? "zurückgenommen" : "geplant";
  console.log(`  ${tag(s.datum)}  ${s.id}  [${marke}]`);
  const orte = s.orte.length === 1 ? "1 Ort" : `${s.orte.length} Orte`;
  console.log(`      ${GATTUNG_LABEL[s.gattung]} · ${orte}`);
  if (!s.nachweis && s.orte.length > 0) {
    console.log("      Nachweis fehlt — vor dem Livegang zu beantworten:");
    console.log("        1. Wird auf dieser Ebene für diese Orte gesucht?");
    console.log("        2. Steht auf denselben Anfragen schon eine andere eigene Seitenfamilie?");
  } else if (s.nachweis) {
    console.log(`      Nachweis vom ${tag(s.nachweis.gemessenAm)} · ${s.nachweis.beleg}`);
  }
  console.log("");
}

const faellig = ueberfaellig(heute);
if (faellig.length) {
  console.log("  Überfällig — Datum erreicht, aber noch nicht live:");
  for (const s of faellig) console.log(`    ${s.id} (seit ${tag(s.datum)})`);
  console.log("");
}

const naechster = naechsterSchub(heute);
if (naechster) {
  const inTagen = Math.ceil((new Date(naechster.datum).getTime() - heute.getTime()) / 86400000);
  const frist = inTagen === 1 ? "morgen" : `in ${inTagen} Tagen`;
  console.log(`  Als Nächstes: ${naechster.id} ${frist} (${tag(naechster.datum)}).`);
  if (!naechster.nachweis && naechster.orte.length > 0) {
    console.log("  Davor läuft die Vorlauf-Messung des SEO-Wächters (scripts/seo-verify.md, Schritt 4b).");
  }
  console.log("");
}

const befunde = planBefunde();
if (befunde.length) {
  console.log("  Der Plan widerspricht sich:");
  for (const b of befunde) console.log(`    [${b.regel}] ${b.schub}: ${b.text}`);
  process.exit(1);
}
console.log("  Der Plan ist in sich schlüssig.\n");
