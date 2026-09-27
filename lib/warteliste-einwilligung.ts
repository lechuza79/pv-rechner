// ─── Waitlist: what exactly did someone consent to? ─────────────────────────
//
// Same reasoning and same shape as lib/abo-einwilligung.ts: the proof of
// consent covers the WORDING (DSK Orientierungshilfe Direktwerbung 2/2022,
// Ziff. 3.3; EDSA 05/2020 Rn. 108), so every entry stores the version it was
// made under, and versions are dated and NEVER overwritten.
//
// The shared waitlist form reads its wording from this archive. Each product
// resolves its own latest version; old versions remain valid for open tabs.

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

export const WARTELISTEN = ["angebotscheck", "elektroauto"] as const;
export type WartelisteName = (typeof WARTELISTEN)[number];

export const WARTELISTE_TITEL: Record<WartelisteName, string> = {
  angebotscheck: "Angebotscheck für Photovoltaik und Wärmepumpe",
  elektroauto: "Elektroauto-Check",
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
  {
    // Legal review 18.09.: the withdrawal hint belongs next to the consent
    // itself (Art. 7 Abs. 3 S. 3 DSGVO), not only in the later mail.
    version: "offer-check-v2",
    liste: "angebotscheck",
    seit: "2026-09-18",
    einleitung:
      "Prüfe künftig dein Photovoltaik- oder Wärmepumpen-Angebot: Passen Preis, Auslegung und Leistungen? Trag dich ein – wir sagen Bescheid, sobald er startet.",
    zusage:
      "Mit der Anmeldung erhältst du eine Bestätigungsmail und nach deiner Bestätigung eine Nachricht zum Start. Kein Newsletter, austragen jederzeit.",
  },
  {
    version: "electric-car-v1",
    liste: "elektroauto",
    seit: "2026-09-27",
    einleitung: "Passt ein Elektroauto zu deinem Alltag? Wir arbeiten an einem Check, der dir beim Einordnen hilft. Trag dich ein – wir sagen Bescheid, sobald er startet.",
    zusage: "Mit der Anmeldung erhältst du eine Bestätigungsmail und nach deiner Bestätigung eine Nachricht zum Start. Kein Newsletter, austragen jederzeit.",
  },
];

/** Look up a stored or submitted version; unknown → null. */
export function wartelisteFassung(version: unknown): WartelisteFassung | null {
  if (typeof version !== "string") return null;
  return WARTELISTE_FASSUNGEN.find((f) => f.version === version) ?? null;
}

/** Each product resolves its own latest consent; adding a list must not redirect existing signups. */
export function aktuelleWartelisteFassung(liste: WartelisteName): WartelisteFassung {
  const fassung = [...WARTELISTE_FASSUNGEN].reverse().find((f) => f.liste === liste);
  if (!fassung) throw new Error(`Missing waitlist consent: ${liste}`);
  return fassung;
}
