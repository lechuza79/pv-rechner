// ─── Entschlüsseln, ohne dass ein kaputter Wert den Lauf abreißt — BLOCKER ────
//
// `decodeURIComponent` WIRFT bei einer kaputten Kodierung („%zz"). Das hat in
// diesem Projekt zweimal einen Erhebungslauf mitten im Betrieb abgerissen (am
// 28.08.2026 nach 450 von 1.254 Domains, am 29.08.2026 nach 2.400 von 2.850) —
// beim zweiten Mal, obwohl die Absicherung an der ersten Fundstelle längst
// existierte: Zwei neue Aufrufer hatten sie nicht mitbekommen.
//
// WARUM DIESE DATEI (02.09.2026): Es gab danach ZWEI unabhängig gebaute
// Absicherungen — eine im Fachbetriebe-Bereich, eine im Förderbereich — und der
// Wächter dazu führte beide als benannte Ausnahme. Sein eigener Kommentar sagte
// für diesen Fall an, was zu tun ist: „Ein drittes Modul ist ein Anlass
// nachzudenken, ob die Funktion nicht doch gemeinsam gehört — nicht, die Liste
// zu verlängern." Der dritte Fall kam mit den Anmelde-Cookies, und er ist
// fachlich ein ganz anderer (fremde Webadressen gegen eigene Cookie-Werte) —
// gerade deshalb gehört nicht die Zuständigkeit zusammen, sondern nur diese
// eine Zeile Vorsicht.

/**
 * Entschlüsselt eine prozentkodierte Zeichenkette. Ist die Kodierung kaputt,
 * kommt der Rohwert zurück, statt dass der Aufrufer eine Ausnahme bekommt.
 */
export function entschluesseltOderRoh(wert: string): string {
  try {
    return decodeURIComponent(wert);
  } catch {
    return wert;
  }
}
