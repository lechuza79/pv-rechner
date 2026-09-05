// ─── Wohin nach dem Klick auf einen Link aus der Mail? ───────────────────────
//
// Der Zielpfad reist normalerweise als Angabe an der Rückkehr-Adresse mit
// (`/auth/callback?next=…`). Diese Datei ist der RÜCKFALL für den Fall, dass
// er unterwegs verloren geht: Der Anmeldedienst prüft die Rückkehr-Adresse
// gegen eine Freigabeliste im Dashboard, und je nachdem, wie ein Eintrag dort
// gesetzt ist, kann er die Angabe abschneiden. Im Schwesterprojekt ist genau
// das passiert.
//
// WARUM DAS HIER TEURER IST ALS ANDERSWO: Ohne Ziel landet man nach dem Klick
// angemeldet auf der Startseite — und wer den Link „Passwort setzen"
// angefordert hat, bekommt dann nie ein Formular zu sehen. Er ist eingeloggt,
// hat aber immer noch kein Passwort und weiß nicht, warum. Das trifft
// ausgerechnet die bestehenden Konten, für die dieser Weg der einzige ist.
//
// Der Wert ist kein Geheimnis, sondern ein Pfad auf unserer eigenen Seite —
// und er wird beim Lesen erneut gegen fremde Ziele geprüft.

export const ZIEL_COOKIE = "sc-anmelde-ziel";

/** Eine Stunde: länger als jeder Klick, kürzer als jede Erinnerung daran. */
export const ZIEL_COOKIE_SEKUNDEN = 60 * 60;
