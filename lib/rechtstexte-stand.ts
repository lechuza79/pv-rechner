// ─── Wann wurden die Rechtstexte zuletzt gegen den CODE abgeglichen? ─────────
//
// Nicht zu verwechseln mit dem „Stand: August 2026" unter der
// Datenschutzerklärung. Das ist die DOKUMENTVERSION — sie wächst mit dem Inhalt
// und darf sich ausdrücklich nicht von selbst aktualisieren (CLAUDE.md,
// „Wartungsfreier Code"). Hier steht die andere Frage: Wann hat zuletzt jemand
// die Datenflüsse aus dem Code neu erhoben und gegen den Text gehalten?
//
// Beide Daten laufen auseinander, und das ist richtig so: Ein Lauf, der prüft
// und nichts findet, bewegt dieses Datum — und lässt die Dokumentversion
// stehen, weil sich am Text nichts geändert hat. Genau dieselbe Trennung wie
// zwischen `validFrom` und `geprueftIso` in den Wächter-Configs
// (scripts/waechter-gate.md, Regel 9).
//
// WARUM ES DIESE DATEI GIBT (Audit 19.08.2026): Das Runbook
// `scripts/rechtstexte-verify.md` existierte seit dem 16.08.2026 — und kein
// Auftrag führte es aus. Damit war die Prüfung aufgeschrieben, aber nicht
// eingerichtet. Seitdem hängt sie am quartalsweisen `solar-check-legal-waechter`
// und dieses Datum steht in `lib/pruefstand.ts`, damit ein ausgefallener Lauf
// auffällt statt zu schweigen.
//
// DIE FEHLERKLASSE IST „FEATURE GEBAUT, TEXT VERGESSEN", nicht
// „Gesetzesnovelle". Sie entsteht bei jedem Deploy — deshalb ist der
// Datenfluss-Abgleich Schritt 1 des Runbooks und die Gesetzesprüfung Schritt 2.

/**
 * Tag des letzten Laufs, der die Datenflüsse aus dem Code erhoben und gegen
 * Datenschutzerklärung und Impressum gehalten hat.
 *
 * Der Wert ist der Tag des Audits, aus dem das Runbook entstand — NICHT der Tag,
 * an dem diese Datei angelegt wurde. Ein Prüfdatum stempelt die Prüfung, nicht
 * die Codeänderung.
 *
 * Ein Lauf setzt es auch dann auf sein Datum, wenn er nichts gefunden hat
 * („geprüft und unverändert" ist das Normalergebnis). Ein Lauf, der abgebrochen
 * ist oder das Live-Messskript nicht laden konnte, lässt es stehen.
 */
export const RECHTSTEXTE_GEPRUEFT_ISO = "2026-08-16";
