/**
 * Text so absichern, dass er in HTML als Text ankommt und nicht als Markup.
 *
 * Steht seit 31.08.2026 an EINER Stelle. Vorher lag dieselbe Funktion privat in
 * `lib/alert-format.ts`; als die Abo-Mails dazukamen, wäre sie ein zweites Mal
 * getippt worden. Bei einer Formatierung wäre das die bekannte Drift-Falle —
 * hier wäre es schlimmer: Zwei Fassungen einer Escape-Funktion laufen
 * auseinander, indem eine ein Zeichen weniger behandelt, und das sieht man
 * weder im Diff noch im Browser, sondern erst, wenn jemand es ausnutzt.
 *
 * Deckt die fünf Zeichen ab, die in HTML-Text und in Attributwerten
 * ausbrechen können. `&` MUSS zuerst ersetzt werden, sonst zerlegt der Lauf
 * die eigenen Ersetzungen ein zweites Mal.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
