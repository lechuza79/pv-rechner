# Energy-Charts: Lizenzlage, geprüft am 22.08.2026

**Ergebnis: CC BY 4.0 gilt — die Angabe im Register war richtig, aber unbelegt.**
Council 3/3 bestätigt, zwei Legal-Judges (der zweite mit dem Auftrag, den ersten
zu widerlegen). Anlass war ein Prüfbericht, der keine freie Lizenz finden konnte
und die Streichung der Angabe empfahl.

## Warum der Bericht zum falschen Schluss kam

Er hat das Feld `info.license` der API-Spezifikation gelesen — dort steht
tatsächlich nicht CC BY, sondern ein Verweis auf `publishing-notes.html`. Die
Lizenzaussage steht zwei Felder weiter oben in `info.description`, unter der
Überschrift „Data License". **Das ist die Lehre: Eine Lizenz kann in einer
Spezifikation an einer anderen Stelle stehen als im dafür vorgesehenen Feld.**

## Die vier Fundstellen bei Fraunhofer selbst

1. `openapi.json`, `info.description`, Abschnitt „Data License":
   „Unless stated otherwise, the data provided by the Energy-Charts API is
   licensed under the CC BY 4.0 license. Proper attribution to Energy-Charts.info
   as the source is required."
2. `llms.txt`: dieselbe Aussage plus die Vorrangregel („unless the response's
   `license` field states otherwise").
3. **Das Feld `license` in JEDER v2-Antwort** — der stärkste Beleg, weil die
   Lizenz mit der einzelnen Lieferung mitkommt:
   `CC BY 4.0 (creativecommons.org/licenses/by/4.0), attribution: energy-charts.info`
4. Die Ausnahme bei `/price` beweist, dass Fraunhofer bewusst lizenziert: Dort
   wird **je Gebotszone** unterschieden.

Abgelegt: `openapi-2026-08-22.json`, `llms-2026-08-22.txt`,
`lizenzfelder-2026-08-22.txt` (die abgerufenen Lizenzfelder unserer fünf
Endpunkte mit Zeitstempel).

## Die Gegenstimme — kennen, nicht neu aufmachen

`publishing-notes.html` ist das Fraunhofer-**Impressum**: „Alle Rechte
vorbehalten … insbesondere die kommerzielle Nutzung und Verbreitung, sind
grundsätzlich nicht gestattet." Dass die Spezifikation ausgerechnet dorthin
verlinkt, ist der ernsthafteste Angriffspunkt.

Warum die CC-BY-Angabe trotzdem vorgeht: Der Text regelt nach seinem eigenen
Wortlaut „**diese Webseite**" und „Download oder Ausdruck dieser
Veröffentlichungen", und er verlangt anschließend **zwei Belegexemplare** und
verbietet Änderungen an **Bildmotiven** — eine Presse- und Bildnutzungsklausel.
Wortgleich steht sie auf `ise.fraunhofer.de`; es ist Konzern-Boilerplate, keine
Aussage über API-Daten. Die speziellere, mit jeder Lieferung mitgeschickte
Erklärung geht vor.

## Was daraufhin geändert wurde

Nicht die Lizenz, sondern die **zwei Pflichten daneben**, die fehlten
(`lib/data-sources.ts`):

- **Lizenzverweis** (Sec. 3(a)(1)(A)(iii), 3(a)(2)) — ohne `licenseUrl` rendert
  der Vermerk die Pflichtangabe als toten Text statt als Link.
- **Änderungshinweis** (Sec. 3(a)(1)(B)) — wir mitteln Viertelstunden zu Wochen
  und leiten Größen ab, die so nicht geliefert werden.

Betroffen waren **alle drei** CC-BY-Quellen: Energy-Charts, Ember und
Open-Meteo. Festgenagelt von `lib/__tests__/quellenangaben.test.ts` und
`e2e/lizenz-abgrenzung.spec.ts`.

**Der Änderungshinweis ist keine Pauschalpflicht.** Er ist geschuldet, wo wir
wirklich verändern — deshalb steht im Test eine benannte Liste mit Grund und
keine Regel für alle CC-BY-Quellen. Eine unverändert durchgereichte Quelle dürfte
ihn gar nicht tragen: Das wäre eine falsche Angabe, derselbe Fehlertyp wie ein
erfundenes Prüfdatum, nur in die andere Richtung.

## Börsenpreise sind die Ausnahme — BLOCKER für den Spotpreis-Chart (WP 9)

`/price` steht **nicht** pauschal unter CC BY. Für einen Teil der Gebotszonen
gilt: „The utilization of any data whether in its raw or derived form, for
external or commercial purposes is expressly prohibited" (Rechte der Börsen,
u. a. EPEX SPOT SE). **„derived form" heißt: auch ein Chart daraus ist nicht
gedeckt.**

**Die Zonenliste der Dokumentation darf NICHT in den Code.** Sie ist bereits
falsch: IT-North steht dort auf der CC-BY-Seite und antwortete am 22.08.2026 live
mit der restriktiven Fassung. Maßgeblich ist allein das Feld `license_info` der
jeweiligen Antwort — `spotPreisFreigegeben()` in `lib/energy-api.ts` wertet es
aus, `fetchSpotPrices` liefert gesperrte Zonen als leere Reihe. Wer den
Spotpreis-Chart baut, darf diese Prüfung nicht umgehen.

Für Deutschland (DE-LU) ist der Chart unproblematisch: Diese Preise kommen von
SMARD und sind CC BY 4.0.

## Offen — vor dem ersten Bezahlangebot zu klären

**Die Rechtekette nach oben ist nicht geprüft.** ENTSO-E beansprucht für die
Transparency Platform ein eigenes Datenbankrecht und untersagt die
Unterlizenzierung. Auf ENTSO-Es Liste frei weiterverwendbarer Daten stehen die
**physikalischen Grenzflüsse**, nach der Recherche aber **weder Erzeugung nach
Energieträger noch installierte Leistung**. Offen bleibt damit: Durfte Fraunhofer
diese beiden Größen unter CC BY weitergeben? Eine Lizenz von jemandem, der das
Recht nicht hat, geht ins Leere, und CC BY 4.0 Sec. 5(a) schließt jede
Rechtsmängelhaftung ausdrücklich aus — das Risiko trägt der Lizenznehmer.

Entlastung, die dagegen spricht: Für **deutsche** Daten veröffentlicht SMARD
kraft § 111d EnWG unter CC BY 4.0, an ENTSO-Es Bedingungen vorbei. Unsere
Hauptnutzung ist Deutschland.

**Zweiter offener Punkt, und der praktisch wichtigere: der Zugang.** Die Lizenz
erlaubt die Nutzung der Daten, begründet aber keinen Anspruch auf beliebige
Abrufmengen. Fraunhofer nennt im Änderungsprotokoll ausdrücklich strengere
Ratenbegrenzungen und einen API-Schlüssel für kommerzielle Kunden. Ein
Bezahlangebot, das aus der kostenlosen öffentlichen API bedient wird, ist deshalb
kein Urheberrechts-, sondern ein Zugangsproblem — und das trifft den Betrieb
sofort.

Beides ist mit **einer** Mail an den verantwortlichen Redakteur zu klären. Das
ist eine Entscheidung des Betreibers (Außenkontakt), keine technische.
