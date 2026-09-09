/**
 * Der Anschreiben-Entwurf — als DENKSTÜTZE, nicht als Versandtext.
 *
 * Er beantwortet die Frage, die eine Beleg-Notiz allein nicht beantwortet:
 * Ergibt der Aufhänger einen Brief, den man abschicken würde? Solange das
 * Angebot nur als Absatz danebenstand, blieb ein Fehlgriff unsichtbar — ein
 * Fachbeitrag über die Einspeisevergütung bekam „Zubau je Gemeinde" angeboten,
 * und erst im Briefformat liest sich das als das, was es ist: eine Antwort auf
 * eine Frage, die niemand gestellt hat.
 *
 * ES GIBT KEINEN VERSANDWEG, und dieser Entwurf ist keiner. Er wird angezeigt,
 * kopiert und von Hand überarbeitet. Wer hier einen Versand anbaut, klärt
 * vorher, dass die Datenschutzerklärung diese Erhebung nennt — heute tut sie
 * es nicht.
 */

import { werkzeugVon } from "./presse-werkzeuge";

export type AnschreibenEingabe = {
  /** Name des Mediums, wie er im Brief steht. */
  medium: string;
  /** Der Mensch, wenn Name und Weg aus derselben Quelle stammen. */
  person: string | null;
  /** Überschrift des gelesenen Beitrags. */
  beitrag: string | null;
  beitragUrl: string | null;
  /** Wie alt der Beitrag ist, in Tagen; null heißt undatiert. */
  tage: number | null;
  /** Was der Beitrag offenlässt — der eine Satz, nicht der ganze Grund. */
  luecke: string | null;
  /** Schlüssel aus der Werkzeugliste. */
  werkzeuge: string[];
};

const BASIS = "https://solar-check.io";

/**
 * Die Anrede. Ohne Namen KEIN „Sehr geehrte Damen und Herren" an eine Person,
 * sondern an die Redaktion — der Unterschied ist, dass wir nicht so tun, als
 * wüssten wir, wer liest.
 */
function anrede(person: string | null): string {
  if (!person) return "Sehr geehrte Redaktion,";
  return `Sehr geehrte/r ${person},`;
}

/**
 * Der Bezug auf den Beitrag. Ein Datum wird nur genannt, wenn wir eines haben —
 * „Ihr aktueller Beitrag" über einem drei Jahre alten Text ist die Sorte
 * Behauptung, die ein Redakteur in einer Sekunde widerlegt.
 */
function bezug(e: AnschreibenEingabe): string {
  if (!e.beitrag) return `ich lese ${e.medium} regelmäßig.`;
  if (e.tage != null && e.tage <= 30) return `ich habe gerade Ihren Beitrag „${e.beitrag}" gelesen.`;
  if (e.tage != null && e.tage <= 180) return `ich bin auf Ihren Beitrag „${e.beitrag}" gestoßen.`;
  // UNDATIERT IST NICHT ALT. Ein Ratgeber ohne Datum kann von gestern sein;
  // „nicht der neueste" wäre eine Behauptung über etwas, das wir nicht wissen.
  if (e.tage == null) return `ich bin auf Ihren Beitrag „${e.beitrag}" gestoßen.`;
  return `ich bin über Ihren Beitrag „${e.beitrag}" gestolpert — er ist nicht der neueste, aber er beschreibt die Frage genau.`;
}

export function anschreibenEntwurf(e: AnschreibenEingabe): string {
  const zeilen: string[] = [];
  zeilen.push(anrede(e.person));
  zeilen.push("");
  zeilen.push(`${bezug(e)}${e.beitragUrl ? ` (${e.beitragUrl})` : ""}`);
  zeilen.push("");
  if (e.luecke) zeilen.push(e.luecke);

  const w = e.werkzeuge.map(werkzeugVon).filter((x): x is NonNullable<typeof x> => !!x);
  if (w.length) {
    zeilen.push("");
    zeilen.push(
      w.length === 1
        ? `Dafür gibt es bei uns ein Werkzeug: ${w[0].name} (${BASIS}${w[0].pfad}) — es ${w[0].leistet}.`
        : `Dafür haben wir zwei Werkzeuge:`,
    );
    if (w.length > 1) for (const x of w) zeilen.push(`· ${x.name} (${BASIS}${x.pfad}) — ${x.leistet}.`);
  }

  zeilen.push("");
  zeilen.push(
    "Beides ist kostenlos, ohne Anmeldung und ohne Datenabfrage; die Diagramme lassen sich einbetten, cookiefrei und mit Quellenangabe im Bild. Wenn Sie eine Zahl für Ihre Region brauchen, rechne ich sie Ihnen heraus.",
  );
  zeilen.push("");
  zeilen.push("Viele Grüße");
  zeilen.push("Sebastian Schäder · solar-check.io");
  return zeilen.join("\n");
}
