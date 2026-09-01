// Auf welche Kanäle ein geplanter Platz geht.
//
// DREI EBENEN, und sie sagen Verschiedenes:
//
//   Die Story sagt, wofür sie TAUGT.       (`kanal` am Beitrag)
//   Der Platz sagt, wohin sie GEHEN SOLL.  (die Wahl im Kalender)
//   Das Protokoll sagt, wo sie WAR.        (der Versand)
//
// Ohne die mittlere Ebene ginge jeder Beitrag auf alles, wofür er taugt — die
// Entscheidung „diesmal nur LinkedIn" ließe sich gar nicht ausdrücken. Und
// umgekehrt: Ein Platz kann keinen Kanal wählen, den die Story nicht vorsieht.
// Das ist keine Bevormundung, sondern der Unterschied zwischen „will nicht" und
// „geht nicht": Ein Beitrag ohne Bild kann auf Instagram nicht erscheinen, egal
// was jemand anhakt.

import type { SocialPlattform } from "./social-ablauf";

/**
 * Die Kanäle, die für einen Beitrag überhaupt in Frage kommen.
 *
 * Instagram fällt heraus, sobald kein Bild da ist — die Plattform kennt keinen
 * reinen Textbeitrag. Das hier zu prüfen statt erst beim Senden erspart einen
 * Haken, der aussieht wie eine Möglichkeit und keine ist.
 */
export function moeglicheKanaele(
  kanalDerStory: readonly SocialPlattform[],
  hatBild: boolean,
): SocialPlattform[] {
  return kanalDerStory.filter((k) => k !== "instagram" || hatBild);
}

/**
 * Was beim Belegen eines Tages voreingestellt ist: ALLE möglichen Kanäle.
 *
 * Die Voreinstellung ist eine Aussage, keine Bequemlichkeit. Ein Beitrag, der
 * für zwei Kanäle taugt, soll auf beide — wer das nicht will, wählt ab. Die
 * Gegenrichtung (nichts vorausgewählt) hieße, dass ein vergessener Haken
 * stillschweigend die halbe Reichweite kostet, und das merkt niemand.
 */
export function kanalVorgabe(
  kanalDerStory: readonly SocialPlattform[],
  hatBild: boolean,
): SocialPlattform[] {
  return moeglicheKanaele(kanalDerStory, hatBild);
}

export type KanalwahlBefund =
  | { ok: true; kanaele: SocialPlattform[] }
  | { ok: false; grund: string };

/**
 * Prüft eine Kanalwahl gegen das, was die Story hergibt.
 *
 * Eine leere Wahl ist ein FEHLER, kein Sonderfall: Ein Platz, der auf keinen
 * Kanal geht, ist ein belegter Tag, an dem nichts passiert — genau der
 * verstrichene Plan, den dieser Kalender sichtbar machen soll, nur diesmal von
 * Anfang an eingebaut.
 */
export function pruefeKanalwahl(
  gewaehlt: readonly string[],
  kanalDerStory: readonly SocialPlattform[],
  hatBild: boolean,
): KanalwahlBefund {
  const moeglich = moeglicheKanaele(kanalDerStory, hatBild);
  if (!gewaehlt.length) {
    return { ok: false, grund: "Kein Kanal gewählt — dann passiert an diesem Tag nichts." };
  }
  const unmoeglich = gewaehlt.filter((k) => !moeglich.includes(k as SocialPlattform));
  if (unmoeglich.length) {
    return {
      ok: false,
      grund: `Nicht möglich für diesen Beitrag: ${unmoeglich.join(", ")}.${
        unmoeglich.includes("instagram") && !hatBild
          ? " Instagram kennt keinen reinen Textbeitrag."
          : ""
      }`,
    };
  }
  return { ok: true, kanaele: gewaehlt as SocialPlattform[] };
}

/** Für die Anzeige am Platz: „LinkedIn + Instagram" bzw. „nur LinkedIn". */
export function kanalText(kanaele: readonly SocialPlattform[]): string {
  const namen = kanaele.map((k) => (k === "linkedin" ? "LinkedIn" : "Instagram"));
  if (namen.length === 0) return "kein Kanal";
  if (namen.length === 1) return `nur ${namen[0]}`;
  return namen.join(" + ");
}
