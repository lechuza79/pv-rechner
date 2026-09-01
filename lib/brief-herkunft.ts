// ─── Woher kam der Klick? Die Herkunftskennung der Outreach-Briefe. ──────────
//
// WARUM ES SIE GIBT (27.08.2026): Ein Klick aus einer E-Mail kommt ohne
// Verweis-Angabe an — er ist in der Auswertung von einem getippten Direktaufruf
// nicht zu unterscheiden. Der Erfolg der Kommunen-Briefe war damit unsichtbar,
// obwohl er der ganze Zweck der Aktion ist. Die Einbettungs-Zählung
// (`embed-herkunft-core.ts`) misst die Stufe danach — wer das Widget wirklich
// eingebaut hat —, aber nicht, ob überhaupt jemand die Seite geöffnet hat.
//
// DER WERT IST IN JEDEM BRIEF DERSELBE, und das ist die tragende Bedingung,
// nicht eine Feinheit. Zwei Legal-Judges am 27.08.2026 (der zweite mit dem
// Auftrag, den ersten zu widerlegen), Fundstellen unten:
//
//   * Ein Wert JE EMPFÄNGER wäre ein Pseudonym — wir halten die Versandliste,
//     also ist die Zuordnung für uns möglich (ErwGr. 26 DSGVO). Und er wäre
//     genau der „identifier which is not relevant in terms of resource
//     identification" aus EDSA-Leitlinien 2/2023 (Fassung 2.0, 07.10.2024)
//     Rn. 49 — einwilligungspflichtig nach § 25 Abs. 1 TDDDG.
//   * DER ORTSNAME GEHÖRT NICHT HINEIN. Je Gemeinde geht genau eine Mail
//     hinaus; `?utm_source=riedstadt` wäre deshalb eine Empfängerkennung, die
//     sich nur harmloser anhört. Der Ortsname im PFAD ist dagegen unschädlich:
//     Er bezeichnet dort die Seite und stünde ohne jede Aktion genauso da.
//   * KEIN WEITERLEITUNGSDIENST und KEIN ZÄHLPIXEL. Beide erzeugen einen
//     Abruf, den es ohne die Messung nicht gäbe — genau das Merkmal, mit dem
//     der EDSA in Rn. 47 das Zählpixel definiert. Damit fiele die einzige
//     tragfähige Begründung weg (siehe nächster Absatz).
//
// DIE BEGRÜNDUNG LAUTET NICHT „es wird nichts gespeichert". Dieser Satz ist
// unter EDSA Rn. 50 f. falsch — und schlimmer: Er würde einen individuellen
// Wert je Empfänger genauso decken, also den Fall, der wirklich kippt. Eine
// Begründung, die den Unterschied nicht bemerkt, ist keine Grenze. Sie lautet:
// Der Server kann die angeforderte Adresse nicht ausliefern, ohne die
// Anfragezeile samt Parameter zu empfangen — es gibt keinen abtrennbaren
// zusätzlichen Vorgang, und keinen unterscheidbaren Empfänger.
//
// EHRLICH DAZU, weil es in die Datenschutzerklärung gehört: Wer nach dieser
// Kennung filtert und dann auf die aufgerufene Gemeindeseite sieht, liest ab,
// WELCHE Gemeinde geklickt hat. Das liegt nicht an der Kennung, sondern daran,
// dass die Zieladresse gemeindespezifisch ist — mit oder ohne sie. Deshalb
// behauptet `/datenschutz` an dieser Stelle keine Anonymität, sondern nennt es.
//
// Fundstellen (Volltext gelesen 27.08.2026): EDSA-Leitlinien 2/2023 v2.0
// Rn. 4/40/56 (Ausnahmen ausdrücklich NICHT Gegenstand der Leitlinie),
// Rn. 47–51 (URL- und Pixel-Tracking); DSK-Orientierungshilfe für Anbieter:innen
// von digitalen Diensten V 1.2 (11/2024) Rz. 78, 88, 90, 94; EuGH C-673/17
// Rn. 70 (Schutzzweck: verborgene Kennungen, die ohne Wissen des Nutzers
// eindringen — eine im Klartext lesbare Kennung ist das Gegenteil davon).
//
// WARUM `utm_source` UND NICHT EIN EIGENER NAME: Vercel fasst Seiten ohne
// Query-Parameter zusammen; ein selbst erfundener Name taucht in der Auswertung
// gar nicht auf. Ausgewertet wird die Kennung deshalb über unser eigenes
// Ereignis (`components/HerkunftsMelder.tsx`) — das Zusatzpaket für die
// UTM-Auswertung (10 $/Monat auf Pro, Stand 27.08.2026) braucht es dafür nicht.
// Der Standardname bleibt trotzdem: Er ist für Empfänger unauffälliger als ein
// Eigenbau, und falls das Paket je dazukommt, liegt der Wert schon richtig.

/** Der Parametername. Standard, damit er nicht nach Eigenbau aussieht. */
export const HERKUNFT_PARAM = "utm_source";

/**
 * Der Wert — in JEDEM Brief identisch.
 *
 * „gemeinde" statt „kommunenbrief": Der Hauptlink steht in der fertigen
 * Meldung, die die Gemeinde übernehmen und auf ihrer eigenen Website
 * veröffentlichen soll. Stünde dort „kommunenbrief" im Link, verriete er jedem
 * Leser, dass die scheinbar eigene Meldung von einem Anbieter kam — die Sorte
 * Detail, an der eine Pressestelle einen Text im letzten Moment doch nicht
 * veröffentlicht.
 */
export const HERKUNFT_WERT = "gemeinde";

/**
 * Hängt die Kennung an eine unserer Adressen — vor den Anker, nicht dahinter.
 *
 * Ein `#` am Ende ist im Briefcode der Normalfall (der Link stellt den
 * Umschalter der Gemeindeseite), und `...#balkon?utm_source=...` wäre kein
 * Parameter mehr, sondern Teil des Ankers: still wirkungslos, im Diff
 * unauffällig.
 *
 * Eine Adresse, die den Parameter schon trägt, bleibt unverändert — doppelt
 * angehängt würde er je nach Auswertung zu „gemeinde,gemeinde".
 */
export function mitHerkunft(url: string): string {
  const [vorAnker, ...ankerTeile] = url.split("#");
  const anker = ankerTeile.length ? `#${ankerTeile.join("#")}` : "";
  if (new RegExp(`[?&]${HERKUNFT_PARAM}=`).test(vorAnker)) return url;
  const trenner = vorAnker.includes("?") ? "&" : "?";
  return `${vorAnker}${trenner}${HERKUNFT_PARAM}=${HERKUNFT_WERT}${anker}`;
}

/**
 * Trägt diese Adresse unsere Herkunftskennung? Liest aus einer Suchzeile
 * (`window.location.search`), nicht aus einer vollständigen Adresse.
 */
export function istHerkunftsAufruf(suche: string): boolean {
  try {
    return new URLSearchParams(suche).get(HERKUNFT_PARAM) === HERKUNFT_WERT;
  } catch {
    return false;
  }
}
