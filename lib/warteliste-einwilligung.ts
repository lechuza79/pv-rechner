// ─── Waitlist: what exactly did someone consent to? ─────────────────────────
//
// Same reasoning and same shape as lib/abo-einwilligung.ts: the proof of
// consent covers the WORDING (DSK Orientierungshilfe Direktwerbung 2/2022,
// Ziff. 3.3; EDSA 05/2020 Rn. 108), so every entry stores the version it was
// made under, and versions are dated and NEVER overwritten.
//
// The wording itself lives in the header menu (public/shared-nav/nav.js, taken
// over one to one from the design package). The version key is the one that
// script sends (`consent: 'offer-check-v1'`). lib/__tests__/warteliste.test.ts
// holds every text here against the shipped script: change the menu text
// without adding a version here and the test goes red.

export type WartelisteFassung = {
  /** Stored on the entry; sent by the form. Never reuse. */
  version: string;
  /** Which waitlist this version belongs to. */
  liste: WartelisteName;
  /** From when this wording was shipped (ISO date). */
  seit: string;
  /** Explanation in the dialog. */
  einleitung: string;
  /** The line above/below the submit button. */
  zusage: string;
};

export const WARTELISTEN = ["angebotscheck"] as const;
export type WartelisteName = (typeof WARTELISTEN)[number];

export const WARTELISTE_TITEL: Record<WartelisteName, string> = {
  angebotscheck: "Angebotscheck für Photovoltaik und Wärmepumpe",
};

export const WARTELISTE_FASSUNGEN: WartelisteFassung[] = [
  {
    version: "offer-check-v1",
    liste: "angebotscheck",
    seit: "2026-09-18",
    einleitung:
      "Prüfe künftig dein Photovoltaik- oder Wärmepumpen-Angebot: Passen Preis, Auslegung und Leistungen? Trag dich ein – wir sagen Bescheid, sobald er startet.",
    zusage:
      "Mit der Anmeldung erhältst du eine Bestätigungsmail und nach deiner Bestätigung eine Nachricht zum Start. Kein Newsletter.",
  },
];

/** Look up a stored or submitted version; unknown → null. */
export function wartelisteFassung(version: unknown): WartelisteFassung | null {
  if (typeof version !== "string") return null;
  return WARTELISTE_FASSUNGEN.find((f) => f.version === version) ?? null;
}
