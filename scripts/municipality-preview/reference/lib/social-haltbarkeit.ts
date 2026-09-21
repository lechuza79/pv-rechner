// Wie lange eine Geschichte trägt — und was daraus für einen zweiten Kanal folgt.
//
// DER ANLASS: Kommt später ein Kanal dazu, liegt der Gedanke nahe, die bereits
// gesendeten Beiträge dort nachzureichen. Für einen Teil von ihnen wäre das
// falsch. „251.000 neue Anlagen in zwölf Monaten" ist im November eine andere
// Aussage als im September, auch wenn kein Wort sich ändert; „Balkonkraftwerke
// stehen auf dem Land, nicht in der Stadt" trägt über Jahre.
//
// WAS DER FINGERABDRUCK SCHON LEISTET — und warum er hier nicht genügt: Bewegen
// sich die Zahlen, ändert sich der gerechnete Text, der Abdruck wird ein anderer
// und die Freigabe verfällt von selbst. Ein Beitrag im Vorrat veraltet also
// nicht. Was er NICHT fängt, ist die Zeitbindung der AUSSAGE: „in den letzten
// zwölf Monaten" meint im November ein anderes Fenster als im September, selbst
// wenn die Zahl zufällig gleich bleibt. Und ein Beitrag, der auf ein Ereignis
// antwortet, ist nach ein paar Wochen kalt, obwohl jede Zahl darin stimmt.
//
// DIE FRIST GEHÖRT AN DIE GESCHICHTE, nicht an den Versand. Sie sagt, wie lange
// die Aussage trägt — nicht, wann jemand gesendet hat.

/**
 * Wie lange die Aussage eines Beitrags trägt.
 *
 * `dauerhaft` heißt nicht „für immer richtig", sondern „nicht an ein Zeitfenster
 * gebunden". Ein Strukturbefund (Stadt gegen Land) bleibt zitierfähig, bis die
 * Zahlen ihn umdrehen — und dann greift der Fingerabdruck.
 */
export type Haltbarkeit =
  | { art: "dauerhaft" }
  | {
      art: "zeitgebunden";
      /** Wie viele Tage die Aussage nach dem ersten Versand noch trägt. */
      tage: number;
      /** Woran sie hängt — ein Satz, der im Redaktionstisch steht. */
      grund: string;
    };

/**
 * Die Vorgabe für Beiträge ohne eigene Angabe.
 *
 * ZEITGEBUNDEN, nicht dauerhaft — die vorsichtige Richtung. Ein Beitrag, den
 * niemand eingeordnet hat, wird nicht Monate später auf einem neuen Kanal
 * nachgereicht; eine dauerhafte Vorgabe wäre eine Behauptung über etwas, das
 * niemand geprüft hat. Vier Wochen sind der Zeitraum, in dem dieses Projekt
 * ohnehin misst.
 */
export const HALTBARKEIT_VORGABE: Haltbarkeit = {
  art: "zeitgebunden",
  tage: 28,
  grund: "Nicht eingeordnet — vorsichtshalber als zeitgebunden behandelt.",
};

export type NachreichBefund =
  | { darf: true }
  | { darf: false; grund: string };

/**
 * Darf dieser Beitrag auf einem WEITEREN Kanal nachgereicht werden?
 *
 * KEINE UHR IN DIESEM MODUL — der Tag wird hereingereicht. Sonst ließe sich die
 * Regel nicht gegen einen Stichtag prüfen, und genau das ist in diesem Projekt
 * schon einmal teuer geworden.
 *
 * Ohne ersten Versand gibt es nichts nachzureichen: Der Beitrag ist dann noch
 * gar nicht draußen und läuft den normalen Weg.
 */
export function darfNachgereichtWerden(
  haltbarkeit: Haltbarkeit,
  ersterVersandIso: string | null,
  heuteIso: string,
): NachreichBefund {
  if (!ersterVersandIso) return { darf: true };
  if (haltbarkeit.art === "dauerhaft") return { darf: true };

  const alter = tageZwischen(ersterVersandIso.slice(0, 10), heuteIso);
  if (alter <= haltbarkeit.tage) return { darf: true };
  return {
    darf: false,
    grund: `Die Aussage ist an ihren Zeitpunkt gebunden (${haltbarkeit.grund}) und seit ${alter} Tagen draußen — nach ${haltbarkeit.tage} Tagen wird sie nicht mehr nachgereicht.`,
  };
}

/** Ganze Tage zwischen zwei Kalendertagen. Über UTC-Mittag, wie überall hier. */
function tageZwischen(vonIso: string, bisIso: string): number {
  const ms = Date.parse(`${bisIso}T12:00:00Z`) - Date.parse(`${vonIso}T12:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Kurzform für die Anzeige: „trägt 28 Tage" bzw. „dauerhaft". */
export function haltbarkeitText(h: Haltbarkeit): string {
  return h.art === "dauerhaft" ? "dauerhaft" : `trägt ${h.tage} Tage`;
}
