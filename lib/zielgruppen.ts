/**
 * Jede Zielgruppe, die wir erheben und anschreiben — an EINER Stelle, mit den
 * Stellen, an denen sie sonst noch eingetragen sein muss.
 *
 * WOZU (07.10.2026): Eine neue Zielgruppe — Solarparks, Gemeinden in der
 * Schweiz — war bisher an fünf Stellen einzutragen: Kontaktsuche, Belegung der
 * Domains, Abgleich der Bestände, Freigabe vor dem Versand, Versandweg mit
 * Protokoll. Vergessen hat man immer eine davon, und keine hat es gemeldet; bei
 * der Presse war es das Protokoll, und 138 verschickte Mails standen danach
 * nirgends. lib/__tests__/zielgruppen.test.ts hält diese Liste gegen alle fünf
 * Stellen — fehlt ein Eintrag, wird der Lauf rot.
 *
 * Wie man eine neue anlegt: docs/erhebung/kontakte-neuer-bestand.md.
 */

export type ZielgruppenEintrag = {
  /** Kurzer Name; zugleich der Wert in `aussendungen.zielgruppe`. */
  name: string;
  /** Skripte, die die gemeinsame Kontaktsuche für diese Zielgruppe ausführen. */
  kontakte: string[];
  /** Schlüssel in scripts/lib/bestand-belegung.ts — null, wenn der Bestand keine eigenen Domains führt. */
  belegung: string | null;
  /** Wo vor dem Versand geprüft wird, ob die Adresse noch stimmt. */
  freigabe: { art: "kontakte-freigabe"; bestand: string } | { art: "im-versandlauf"; skript: string };
  /** Über welchen Lauf verschickt wird, und wo jede Mail steht — null: noch nie angeschrieben. */
  versand: { skript: string; tabelle: string } | null;
};

export const ZIELGRUPPEN: ZielgruppenEintrag[] = [
  {
    name: "gemeinden",
    kontakte: ["scripts/contact-municipal-v2.ts", "scripts/kommunen-nachsuche.ts"],
    belegung: "gemeinde",
    freigabe: { art: "im-versandlauf", skript: "scripts/kommunen-versand.ts" },
    versand: { skript: "scripts/kommunen-versand.ts", tabelle: "kommunen_kontakt" },
  },
  {
    // Kreisverwaltungen stehen als eigene Zeilen in derselben Kontaktliste wie
    // die Gemeinden und bekommen Briefe derselben Familie.
    name: "landkreise",
    kontakte: ["scripts/kreise-kontakte.ts"],
    belegung: "gemeinde",
    freigabe: { art: "im-versandlauf", skript: "scripts/kommunen-versand.ts" },
    versand: { skript: "scripts/kommunen-versand.ts", tabelle: "kommunen_kontakt" },
  },
  {
    name: "presse",
    kontakte: ["scripts/liab-medien.ts", "scripts/presse-kontakte.ts"],
    belegung: "presse",
    freigabe: { art: "kontakte-freigabe", bestand: "presse" },
    versand: { skript: "scripts/aussendung.ts", tabelle: "aussendungen" },
  },
  {
    name: "fachbetriebe",
    kontakte: ["scripts/fachbetriebe-kontakte.ts"],
    belegung: "fachbetrieb",
    freigabe: { art: "kontakte-freigabe", bestand: "fachbetriebe" },
    versand: null,
  },
  {
    name: "versorger",
    kontakte: ["scripts/versorger-kontakte.ts"],
    belegung: "versorger",
    freigabe: { art: "kontakte-freigabe", bestand: "versorger" },
    versand: null,
  },
  {
    name: "windbetreiber",
    kontakte: ["scripts/windbetreiber-kontakte.ts"],
    belegung: "windbetreiber",
    freigabe: { art: "kontakte-freigabe", bestand: "windbetreiber" },
    versand: null,
  },
];
