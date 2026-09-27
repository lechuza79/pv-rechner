// ─── Die Mengen, mit denen die Aufwandsschätzung rechnet ─────────────────────
//
// GEZÄHLT, NICHT GEPFLEGT — bis auf die Rechner. Eine Liste, die jemand von
// Hand nachziehen müsste, ist beim dritten Mal falsch; deshalb kommt alles aus
// dem Dateibaum bzw. aus den Registern, die es ohnehin gibt.
//
// Die Rechner sind die Ausnahme, weil sie sich aus keinem Muster ableiten
// lassen: Eine Rechnerseite sieht im Dateibaum aus wie jede andere Seite. Sie
// stehen deshalb namentlich hier, und ein sechster fiele auf, weil ihn jemand
// eintragen muss — das ist bei fünf Einträgen in einem halben Jahr vertretbar.
//
// WARUM HIER UND NICHT IN `lib/`: Die Zählung liest den Dateibaum über git.
// Im ausgelieferten Serverless-Bündel gibt es weder das Arbeitsverzeichnis noch
// git; ein Import aus `lib/` würde diese Abhängigkeit in Code ziehen, den die
// Seiten mitnehmen. Deshalb wird der Zählstand beim Erfassungslauf MITGESCHRIEBEN
// (Teil der Bestandszeile) und von der Ansicht aus der Ablage gelesen — genau
// wie die Codezeilen, die aus demselben Grund nicht zur Laufzeit gezählt werden.

import { execFileSync } from "node:child_process";
import type { Zaehlstand } from "../../lib/aufwand-schaetzung";
import { WIDGETS } from "../../lib/widget-registry";
import { allFundingPrograms } from "../../lib/funding-programs";

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function zahlDerDateien(...pathspec: string[]): number {
  return git("ls-files", ...pathspec).trim().split("\n").filter(Boolean).length;
}

/** Die fünf Rechner — namentlich, weil sie im Dateibaum wie jede Seite aussehen. */
export const RECHNER = [
  "Photovoltaik",
  "Wärmepumpe",
  "Balkonkraftwerk",
  "Klimaanlage",
  "Einspeisevergütung",
];

export function zaehlstand(): Zaehlstand {
  return {
    rechner: RECHNER.length,
    seiten: zahlDerDateien("app/**/page.tsx"),
    widgets: Object.keys(WIDGETS).length,
    routen: zahlDerDateien("app/**/route.ts"),
    komponenten: zahlDerDateien("components/*.tsx", "components/**/*.tsx"),
    foerderprogramme: allFundingPrograms().length,
  };
}
