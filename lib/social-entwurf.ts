import type { VorratsFund } from "./social-fundvorrat";
import type { BildSerie, PostBild, SocialPost } from "./social-posts";
import { KARTEN_STIL_STANDARD } from "./social-karten-stil";

/**
 * Aus einem Fund einen Beitrags-Entwurf.
 *
 * DIE ARBEITSTEILUNG IST DER GANZE PUNKT. Das Bild kann die Maschine: Ein Fund
 * trägt bereits die Struktur, die eine Karte braucht — zwei bis drei Werte mit
 * Namen und Einheit. Den Textrumpf kann sie auch, denn der Satz ist der
 * Aufhänger und die Grundlage der Vorbehalt. Was sie NICHT kann, ist der letzte
 * Absatz: Bei den bestehenden Beiträgen steht dort ein eigener Gedanke („Ich
 * finde die zweite Zahl aussagekräftiger, auch wenn sie in keiner Statistik
 * auftaucht"), und genau der unterscheidet einen Beitrag von einer
 * Datenmeldung.
 *
 * Deshalb steht diese Stelle im Entwurf sichtbar offen, statt mit einer
 * plausibel klingenden Zeile gefüllt zu werden. Eine gefüllte Lücke merkt
 * niemand; eine offene sieht jeder.
 *
 * DER ENTWURF KOPIERT KEINE ZAHL, DIE ER NICHT MITFÜHRT. Er trägt die Kennung
 * des Fundes, und der Fund wird bei jedem Suchlauf neu gerechnet. Ein Entwurf,
 * der eine Woche liegt, zeigt beim nächsten Öffnen den Stand von heute — sonst
 * stünde dort eine Zahl, die die Daten inzwischen widerlegen, und das ist genau
 * die Fehlerklasse, gegen die die ganze Beitrags-Mechanik gebaut ist.
 */

/** Was im Entwurf noch von einem Menschen kommen muss. */
export const OFFENE_STELLE = "[[ dein Gedanke dazu — was findest du daran bemerkenswert? ]]";

/**
 * EIN ENTWURF IST EIN BEITRAG, kein eigenes Ding.
 *
 * Ein eigener Typ daneben hätte eine zweite Ansicht verlangt — mit eigener
 * Vorschau, eigenem Bild, eigener Prüfanzeige. Zwei Oberflächen für dieselbe
 * Sache driften, und man merkt es erst, wenn der Entwurf anders aussieht als
 * der Beitrag, der aus ihm wird. Deshalb dieselbe Form: Der Redaktionstisch
 * zeigt ihn wie jeden anderen, nur dass sein letzter Absatz noch offen ist und
 * er noch nirgends abgelegt wurde.
 */
export type Entwurf = SocialPost & {
  /** Was noch fehlt, im Klartext — steht in der Ansicht über dem Entwurf. */
  offen: string[];
};

/**
 * Welche Bildform zu diesem Fund passt.
 *
 * Aus der EINHEIT, nicht aus dem Muster: Prozentwerte haben ein Ganzes (der
 * Rest bedeutet etwas), Faktoren und Mengen nicht. Ein Ring für „1.947 gegen
 * 652 Watt" behauptete ein Ganzes, das es nicht gibt.
 */
function bildform(fund: VorratsFund): PostBild["art"] {
  const einheiten = new Set(fund.werte.map((w) => w.einheit));
  if (fund.werte.length === 1) return "kennzahl";
  if (einheiten.has("prozent")) return "donut";
  return "saeule";
}

function serien(fund: VorratsFund): BildSerie[] {
  // Der GRÖSSERE Wert wird hervorgehoben, nicht der erste: Die Reihenfolge im
  // Fund folgt der Erzählung, die Hervorhebung soll die Aussage tragen.
  const groesster = Math.max(...fund.werte.map((w) => w.wert));
  return fund.werte.map((w) => ({
    label: w.name,
    wert: w.wert,
    einheit: w.einheit === "prozent" ? "%" : "",
    stellen: Number.isInteger(w.wert) ? 0 : 1,
    hervorgehoben: w.wert === groesster,
  }));
}

export function entwurfAus(fund: VorratsFund, quelle: string): Entwurf {
  const hatGanzes = fund.werte.some((w) => w.einheit === "prozent");

  const text = [
    // Die Aussage in die ersten zwei Zeilen — alles danach steht im Feed hinter
    // „mehr anzeigen" und liest nur, wer schon interessiert ist.
    fund.satz,
    ``,
    // Die Grundlage sagt, worauf die Zahl beruht UND was sie nicht hergibt. Sie
    // gehört in den Beitrag, nicht nur in die Prüfung: Ein Satz ohne seinen
    // Vorbehalt ist die halbe Wahrheit, und die fällt uns beim ersten
    // Widerspruch in den Kommentaren auf die Füße.
    fund.grundlage,
    ``,
    OFFENE_STELLE,
    ``,
    quelle,
  ].join("\n");

  const offen = [
    "Der letzte Absatz — die Maschine hat keine Haltung.",
    "Die Grundlage ist als Rohtext eingesetzt und liest sich noch wie eine Fußnote.",
  ];
  if (fund.werte.length === 0) {
    offen.push("Keine Zahlen im Fund — das Bild muss von Hand gebaut werden.");
  }
  if (!fund.evergreen) {
    offen.push("Zeitgebunden: Der Beitrag wird kalt, je länger er liegt.");
  }

  return {
    // Die Kennung des Fundes IST die Kennung des Entwurfs: Damit lässt er sich
    // zurufen, und ein Beitrag, der später daraus wird, trägt seine Herkunft.
    id: fund.kennung,
    // Kein erfundener Titel: Der erste Halbsatz des Fundes sagt, worum es geht,
    // und ein ausgedachter Titel wäre eine zweite Aussage, die niemand geprüft
    // hat. Er ist ohnehin nur die interne Bezeichnung in der Vorschau.
    titel: fund.satz.split(/[—.:]/)[0].trim().slice(0, 80),
    kategorie: fund.kategorie,
    // Beide Kanäle: Was auf welchem läuft, entscheidet sich am fertigen
    // Beitrag, nicht am Entwurf.
    kanal: ["linkedin", "instagram"],
    text,
    bild:
      fund.werte.length > 0
        ? {
            // Der Standard-Stil, nicht geraten: Das Farbschema gehört an den
            // fertigen Beitrag und wird dort gewählt, nicht am Entwurf.
            stil: KARTEN_STIL_STANDARD,
            art: bildform(fund),
            aussage: fund.satz.split(/[—.]/)[0].trim(),
            gemessen: fund.werte[0]?.name ?? "",
            serien: serien(fund),
            quelle,
            ...(hatGanzes ? { ganzes: 100 } : {}),
          }
        : null,
    belege: fund.werte.map(
      (w) =>
        `${w.name}: ${w.wert.toLocaleString("de-DE", { maximumFractionDigits: 2 })}${
          w.einheit === "prozent" ? " %" : ""
        }`,
    ),
    offen,
  };
}
