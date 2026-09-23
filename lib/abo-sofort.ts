/**
 * Der Abo-Knopf wirkt, BEVOR React ihn übernommen hat.
 *
 * GEMESSEN 23.09.2026: Der Knopf steht im Server-HTML, ist also sichtbar,
 * bedienbar und unverdeckt, lange bevor React seinen Handler anhängt. Ein
 * Klick in diesem Fenster wird STUMM verschluckt — kein Fehler, keine
 * Meldung, nur ein Anmeldefenster, das nicht aufgeht. In sechs kalten Aufrufen
 * ging einer verloren; der Browser-Test, der sofort nach dem ersten Dokument
 * klickt, fiel genauso durch und sah dabei aus wie ein kaputter Knopf.
 *
 * Der Schnipsel steht INLINE im Dokument, nicht als eigene Datei: Ein
 * `<script src>` in einer React-Komponente wird in den Kopf gehoben und
 * nebenläufig geladen — es könnte also erst nach der Übernahme laufen und
 * genau das Fenster verpassen, um das es geht.
 *
 * Er kann nicht mit Reacts eigenem Handler kollidieren: Beide öffnen dasselbe
 * Element, und beide prüfen vorher, ob es schon offen ist.
 */
export const ABO_SOFORT_SKRIPT =
  'document.addEventListener("click",function(e){' +
  'var k=e.target&&e.target.closest?e.target.closest("[data-page-subscribe]"):null;if(!k)return;' +
  'var f=document.querySelector("dialog[data-abo]");' +
  'if(f&&!f.open&&typeof f.showModal==="function")f.showModal();});';
