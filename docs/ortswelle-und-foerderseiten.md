# Ortswelle und Förderseiten — zwei Seitenfamilien für dieselben Orte

**Stand 18.08.2026.** Grundlage ist die Messung in `docs/seo/befund-2026-08-18-atlas-wellen.md`;
der ältere `docs/atlas-index-wellen.md` bleibt gültig, **außer** wo dieses Papier ihm
widerspricht (Ortsgröße, siehe Abschnitt 3). Zweck: Bevor die Gemeindeseiten in den Index
gehen, muss geklärt sein, wie sie sich zu den Förder-Stadtseiten verhalten — beide Familien
tragen sonst denselben Ortsnamen und nehmen sich gegenseitig die Position.

## 1. Die Ausgangslage in Zahlen (Search Console, 18.07.–15.08.2026)

| Familie | Seiten mit Einblendungen | Einblendungen | Klicks |
|---|---|---|---|
| Förderseiten (`/photovoltaik-foerderung/…`) | 41 | 1.879 | 12 |
| davon Stadtseiten | 33 | 1.551 | 11 |
| Solar-Atlas (`/solar-atlas/…`) | 18 | 926 | 9 |

**Die Förderseiten sind heute der stärkere Teil** — und der einzige Bereich, in dem wir
überhaupt Begriffe mit Kaufabsicht besetzen. Die Ortswelle kommt also nicht auf eine leere
Fläche, sondern neben etwas Funktionierendes.

## 2. Die Rollentrennung — das ist der Kern

Gemessen an der Anfragen-Ebene halten sich die beiden Familien heute sauber auseinander:

| Frage des Nutzers | Beispielanfrage | zuständige Seite | gemessene Position |
|---|---|---|---|
| „Was zahlt mir jemand?" | photovoltaik förderung frankfurt | Förder-Stadtseite | 12,2 |
| „Was zahlt mir jemand?" | klimabonus frankfurt 2026 | Förder-Stadtseite | 9,1 |
| „Was steht hier schon?" | pv frankfurt | Förder-Stadtseite **78,5** | — |
| „Was steht hier schon?" | solaranlage hameln | Atlas (Kreisseite als Notnagel) | 63,4 |

Die dritte Zeile ist die wichtige: Auf dem nackten Ortsnamen ist die Förderseite praktisch
nicht vorhanden. **Diese Lücke soll die Atlas-Ortsseite füllen — und nur sie.**

**Regel:** Förderseite = Geld-Wörter (förderung, zuschuss, klimabonus, programm) + Ort.
Atlasseite = Bestands-Wörter (pv, solar, photovoltaik, solaranlagen) + Ort. Wer die Titel
schreibt, hält diese Trennung ein; sie steht deshalb auch als Prüfpunkt im wöchentlichen
Wellen-Monitor (Schritt 3b).

**Warnzeichen, das den Umbau stoppt:** Sobald eine Förder-Anfrage von der Atlasseite bedient
wird oder umgekehrt, konkurrieren zwei eigene Seiten um dieselbe Anfrage. Dann gewinnt
keine von beiden. Erkennbar in der Anfragen-Ebene der Search Console, nicht in den Summen.

## 3. Welche Orte zuerst — hier widerspricht die Messung dem alten Plan

`docs/atlas-index-wellen.md` sieht für Welle 1 „die größten Gemeinden" vor. Die Messung am
Wettbewerber sagt das Gegenteil: Seine **8 Top-10-Platzierungen liegen bei Orten bis rund
90.000 Einwohnern** — Erdweg (~6.000), Winterberg, Nienburg, Rendsburg, Weinheim,
Friedrichshafen, Düren. Die großen Städte stehen bei ihm auf Seite 2 (Fürth 11, Münster 12,
Kaiserslautern 12, Bottrop 12).

Der Grund steht in der Ergebnisseite. Für „pv bonn" (210 Suchen/Monat) stehen auf 1–8:
Stadtwerke Bonn, bonn.de, BonnSolar, wegatech, energie-experten, Bonner Energieagentur,
Bonn-Netz. Um eine Großstadt kümmern sich Stadtwerk, Stadtverwaltung und ein Dutzend
Installateure — um Erdweg kümmert sich niemand. **Unsere Stärke ist die Fläche, nicht die
Spitze.**

Konsequenz für Welle 1: nicht nach Einwohnerzahl absteigend, sondern **die Mitte zuerst** —
Orte mit genug Anlagen für eine substanzvolle Seite (Thin-Schwelle) und ohne besetzte
Ergebnisseite. Die Auswahl gehört gemessen, nicht geschätzt: eine Handvoll SERP-Abrufe
(0,002 $ je Begriff) über verschiedene Ortsgrößen, bevor die Charge festgelegt wird.

## 4. Reihenfolge

1. **Jetzt (erledigt 18.08.):** Der Eigenname kommt in die **Titel** der Landesseiten
   („Solaratlas Bayern: Solaranlagen, Bestand & Zubau"); die Überschrift bleibt die
   beschreibende („Solaranlagen in Bayern"), weil die beschreibenden Begriffe zusammen
   das Vierfache des Eigennamens wiegen (210 + 110 + 50 gegen 90 Suchen/Monat).
   Gemeindeseiten tragen „Photovoltaik in <Ort>". Kostet nichts und wirkt sofort.
2. **Vor Welle 1:** Award-Rangliste (liefert Rang und Nachbarvergleich als *eine* Quelle)
   und die zwei echten Fakten je Ort — größte Einzelanlage, benannter Nachbarvergleich.
   Ohne sie ist jede Ortsseite eine Schablone mit anderen Zahlen.
3. **Welle 1:** begrenzte Charge mittelgroßer Orte oberhalb der Thin-Schwelle, Sitemap-
   Batch, 2–4 Wochen beobachten. **Nicht im selben Schub** wie neue Förder-Stadtseiten für
   dieselben Orte (siehe unten).
4. **Danach:** Charge für Charge, solange die Indexierungsquote hält.

**Landkreise bleiben noindex** — kein Suchziel (Abschnitt 1 des Befunds). Sie bleiben
gebaut, intern verlinkt und im Gesundheitscheck; sie sind der Weg von der Landes- zur
Ortsebene, nicht selbst ein Ziel.

## 5. Warum nicht beide Familien gleichzeitig für denselben Ort

Google braucht Wochen, um zu entscheiden, welche unserer Seiten es für welche Anfrage
nimmt. Zwei frische Seiten mit demselben Ortsnamen im selben Schub machen diese Entscheidung
zum Zufall, und ein falsch getroffener Zuordnungsfall ist teuer zu korrigieren: Man merkt
ihn erst nach Wochen und muss ihn dann mit internen Links und Titeln wieder auseinander
ziehen. Deshalb: erst die eine Familie für einen Ort, ein paar Wochen messen, dann die
andere.

Die Verknüpfung selbst läuft über **eine** Ableitung (`fundingFor`/`fundingForFrom` in
`lib/atlas-cities.ts`) — nie über eine zweite handgepflegte Liste. Das ist dieselbe Regel,
an der sich Herne, Ludwigshafen und Bremerhaven schon einmal aufgehängt haben.

## 6. Woran wir merken, ob es funktioniert

Nicht an Einblendungen und nicht an der Durchschnittsposition (beide sind bei uns
nachweislich Artefakte — Bonn steht auf Position 7,7 und hat auf Anfragen-Ebene *keine
einzige* sichtbare Anfrage). Sondern an:

- **Platzierungen auf Ortsanfragen in den Top 10** — die Zahl, die der Wettbewerber auf 8
  hat und wir auf 0.
- **Klicks je Ortsseite**, nicht Einblendungen.
- **Keine geteilte Anfrage:** Für keine Anfrage sollen Förder- und Atlasseite gleichzeitig
  in den Ergebnissen stehen.
