// ─── Was eine Anmeldung annimmt, und wie ein Fehlschlag heißt ────────────────
//
// EINE Quelle für Formular, Server-Route und Test. Vorher hätte jede der drei
// Stellen ihre eigene Mindestlänge und ihre eigene Fehlermeldung getragen —
// dieselbe Fehlerklasse wie zwei Formatter für eine Einheit: Der Knopf sagt
// dann etwas anderes, als die Prüfung dahinter verlangt, und das fällt im
// Browser nicht auf, weil beide Seiten für sich plausibel aussehen.
//
// Die Mindestlänge ist bewusst die von Supabase erzwungene (8 Zeichen). Eine
// strengere Regel im Formular würde ein Passwort ablehnen, das der Dienst
// dahinter annehmen würde — und eine schwächere ließe eines durch, das dort
// scheitert, mit einer Fehlermeldung, die der Nutzer nicht einordnen kann.

export const PASSWORT_MIN = 8;

export type AuthFehler =
  | "ungueltige_eingabe"
  | "falsche_zugangsdaten"
  | "passwort_zu_kurz"
  | "email_vergeben"
  | "zu_viele_versuche"
  | "nicht_eingerichtet"
  | "fehlgeschlagen";

/**
 * Was der Nutzer zu lesen bekommt. Deutsch, ohne Fachwort, und ohne zu
 * verraten, ob es die Adresse überhaupt gibt: „falsche Zugangsdaten" nennt
 * bewusst nicht, welche der beiden Angaben falsch war — sonst wäre das
 * Anmeldeformular ein Abfragedienst dafür, wer hier ein Konto hat.
 */
export const FEHLERTEXT: Record<AuthFehler, string> = {
  ungueltige_eingabe: "Bitte E-Mail-Adresse und Passwort eingeben.",
  falsche_zugangsdaten: "E-Mail-Adresse oder Passwort stimmt nicht.",
  passwort_zu_kurz: `Das Passwort braucht mindestens ${PASSWORT_MIN} Zeichen.`,
  email_vergeben: "Für diese Adresse gibt es schon ein Konto. Melde dich an oder setze dein Passwort neu.",
  zu_viele_versuche: "Zu viele Versuche. Bitte in einer Stunde noch einmal probieren.",
  nicht_eingerichtet: "Die Anmeldung ist hier gerade nicht eingerichtet.",
  fehlgeschlagen: "Das hat nicht geklappt. Bitte später noch einmal versuchen.",
};

export function istEmail(wert: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wert.trim());
}

export function passwortOk(wert: string): boolean {
  return wert.length >= PASSWORT_MIN;
}

/**
 * Supabase-Meldung → unsere Kennung. Der Dienst antwortet auf Englisch und in
 * Prosa; wir übersetzen an genau einer Stelle, damit eine geänderte Formulierung
 * dort nur hier nachgezogen werden muss.
 */
export function fehlerAusMeldung(meldung: string): AuthFehler {
  const m = meldung.toLowerCase();
  if (m.includes("invalid login credentials")) return "falsche_zugangsdaten";
  if (m.includes("email not confirmed")) return "falsche_zugangsdaten";
  if (m.includes("already registered") || m.includes("already been registered")) return "email_vergeben";
  if (m.includes("password should be at least") || m.includes("password is too short")) return "passwort_zu_kurz";
  if (m.includes("rate limit") || m.includes("too many requests")) return "zu_viele_versuche";
  return "fehlgeschlagen";
}
