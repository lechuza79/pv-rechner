/**
 * Der Seitentitel der Atlas-Seiten — EINE Quelle für Regions- und Gemeindeseiten.
 *
 * WARUM ES DIESE DATEI GIBT (02.09.2026): Der Titel stand zweimal getippt da, in
 * der Regionsseite und in der Gemeindeseite, und beide waren zu lang. Google hat
 * sie deshalb verworfen und stattdessen die sichtbare Überschrift angezeigt.
 *
 * DIE MESSUNG, die das entschieden hat — neun Landesseiten, live abgerufene
 * Ergebnisseiten am 02.09.2026, sortiert nach Länge des Titels OHNE Markenzusatz:
 *
 *   Bayern 52 · Berlin 52 · Hamburg 53 · Hessen 54 · Brandenburg 58 ·
 *   Niedersachsen 60   → Google zeigt UNSEREN Titel
 *   Rheinland-Pfalz 62 · Baden-Württemberg 64 · Nordrhein-Westfalen 66
 *                      → Google zeigt „Solaranlagen in <Land> - Solar Check“
 *
 * Neun von neun, ohne Ausnahme, mit dem Schnitt zwischen 60 und 62 Zeichen. Das
 * ist die Breite, ab der ein Titel in der Ergebnisliste nicht mehr passt.
 *
 * WAS DARAUS NICHT FOLGT — und im Monatsbericht 09/2026 zunächst falsch stand:
 * „Google zieht die Überschrift heran, also muss der Titel an die Überschrift
 * angeglichen werden.“ Google greift auf die Überschrift NUR zurück, wenn unser
 * Titel nicht passt; bei sechs der neun Seiten hat er ihn unverändert genommen.
 * Die Gegenprobe, mit der der Bericht eine Längenwirkung ausschließen wollte
 * (/strommix-deutschland, 55 Zeichen ohne Marke), lag selbst unterhalb der
 * Grenze und konnte deshalb nichts ausschließen. Der Hebel ist die LÄNGE.
 *
 * WELCHE WÖRTER — gemessen an den echten Anfragen der Atlas-Seiten
 * (Search Console, 01.06.–30.08.2026, 225 Anfragen, 1.227 Einblendungen):
 *
 *   photovoltaik 372 Einblendungen (30 %) · solaranlage 176 (14 %) ·
 *   solarkataster 160 (13 %) · solaratlas 130 (11 %) · pv 66 (5 %)
 *
 * „Photovoltaik“ bleibt deshalb das führende Wort. „Solaranlagen“ fällt aus dem
 * Titel und ist damit nicht verloren: Es ist die sichtbare Überschrift und steht
 * am Anfang jeder Beschreibung, aus der Google den Auszug baut.
 *
 * Der Zusatz „Bestand & Zubau“ ist der einzige Teil des Titels, der diese Seite
 * von ihrer Nachbarschaft unterscheidet. Auf den Ergebnisseiten dieser Anfragen
 * stehen Installateure und amtliche Dachflächen-Kataster; „Bestand & Zubau“ ist
 * die Ansage, dass hier eine Statistik über vorhandene Anlagen steht und weder
 * ein Angebot noch eine Dachprüfung.
 *
 * Die Ortsangabe kommt aus ortPhrase(), damit die Präposition stimmt („im
 * Landkreis Würzburg“, „in der Region Hannover“, „im Saarland“).
 *
 * Frühere Herleitung der Wortwahl (18.08.2026) und die zwei damals vom Betreiber
 * gestoppten Anläufe mit „Solaratlas“: docs/seo/befund-2026-08-18-atlas-wellen.md.
 */

import { ortPhrase, type OrtRegion } from "./atlas-orte";

/**
 * Zeichen-Budget für den Titel OHNE den Markenzusatz „ | Solar Check“.
 *
 * 60 ist der längste Titel, den Google am 02.09.2026 nachweislich noch
 * unverändert angezeigt hat (Niedersachsen); bei 62 hat er ihn ersetzt. Der
 * Wert ist die gemessene Grenze, nicht das Ziel — die heutige Vorlage landet bei
 * höchstens 55 Zeichen und hat damit Reserve. Wer den Titel ändert, hält diese
 * Reserve: „passt gerade" ist bei einer Grenze, die Google in Pixeln misst und
 * nicht in Zeichen, kein Zustand, auf den man bauen kann.
 */
export const ATLAS_TITEL_BUDGET = 60;

/** Titel einer Atlas-Seite, ohne Markenzusatz (den hängt pageMetadata an). */
export function atlasSeitenTitel(region: OrtRegion): string {
  return `Photovoltaik ${ortPhrase(region)}: Bestand & Zubau`;
}
