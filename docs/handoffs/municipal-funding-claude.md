# Übergabe an Claude: Förderung auf den Gemeindeseiten

Stand: 24.09.2026. Betreiberentscheidung: Backend, Förderstatus und Datenpflege bleiben bei Claude und dem Förderwächter. Codex bearbeitet hier die Darstellung.

## Integrationsstand

- Branch: `codex/municipal-story-artwork-fix`
- UI-Commit: `cebf0288` (`Improve municipal funding cards and archive unavailable programs`)
- Lokal geprüft auf Port 4199, Meinersen, Desktop 1226 px und mobil 390 px. Typprüfung und 4.961 Tests erfolgreich, 1 übersprungen.
- Nicht auf main integriert, nicht veröffentlicht. Der Commit ist auf dem bestehenden integrierten App-Stand aufgebaut; keine alten Prototyp-Zweige übernehmen. Für diesen Fix kann der einzelne Commit übernommen werden.

## Umgesetzt

- Buttons innerhalb des Textblocks bei Bürgerbeispielen und Förderkarten.
- Gemeinsames FundingStatusBadge auch in der Vorschau.
- Link zur offiziellen Programmquelle mit tatsächlichem Fördergeber statt pauschal „Programm der Gemeinde“.
- Programme mit Status ausgeschoepft, eingestellt oder pausiert in einem standardmäßig geschlossenen Archiv unter den übrigen Programmen. Status unsicher bleibt sichtbar. Das Archiv ist im Server-HTML enthalten.
- Förderhinweis in heller Textfarbe, Details-Link in Sekundärfarbe mit gelber Unterstreichung.

Dateien: `components/gemeinde/GemeindeFoerderung.tsx`, `components/gemeinde/GemeindeBeispiele.tsx`, `public/gemeinde/seite.css`, `lib/__tests__/gemeinde-foerderung-archive.test.tsx`.

## Keine Backend- oder Katalogänderung durch Codex

Keine Änderung an funding-programs, fundingZaehlt, Förderwächter, Quellenbelegen, Berechnungsregeln oder Datenbank. Die Archivdarstellung verwendet vorhandene Statuswerte. Der serverseitig übergebene Wert zaehlt bleibt unverändert für den Einleitungstext zuständig.

## Bitte durch Claude prüfen

1. `gifhorn-kreis-balkonkraftwerke` ist im übernommenen Katalog bereits **ausgeschoepft**. Der Betreiber bezeichnete das Programm als abgelaufen. Nicht ohne neue Belege in eingestellt umbenennen: Der Katalog dokumentiert fehlende Mittel, keinen ausdrücklichen Einstellungsbeschluss. Das UI hatte den vorhandenen Status schlicht nicht gezeigt.
2. Dieser Eintrag nennt als Träger Landkreis Gifhorn und eine fünfstellige Kreiskennung, trägt aber `level: kommune`. Bitte die fachliche Zuordnung samt Auswirkungen auf Förderwächter und Gebietsauswahl prüfen. Die UI nennt jetzt den tatsächlichen Träger, ohne das Backend-Feld umzudeuten.
3. `meinersen-solar` ist im Katalog aktiv. Die Gemeindeseite beschreibt weiterhin Antragstellung. Aktualität und Mittelverfügbarkeit über den bestehenden Förderwächter prüfen, nicht über einen zweiten lokalen Statusmechanismus.
4. Aktuell zeigt das Badge den Katalogstatus, die Geldwirksamkeit entscheidet weiterhin fundingZaehlt einschließlich Belegaktualität. Falls ein formal aktiver, aber veralteter Beleg anders beschriftet werden soll: zentral im bestehenden Fördermodell lösen. Keine zweite Frische- oder Laufzeitberechnung in der UI einführen.

Quellen:
- Meinersen: https://www.sg-meinersen.de/Samtgemeinde/Gemeinde-Meinersen/Photovoltaik-und-Solarthermief%C3%B6rderung/
- Gifhorn, Richtlinie: https://openrathaus.gifhorn.de/dienstleistungen/-/egov-bis-detail/dokument/55840/download?_9_WAR_vrportlet_priv_r_p_action=bisview-dienstleistung-show

Die Richtlinie allein belegt nicht den aktuellen Mittelstand. Für dessen Bewertung die bereits dokumentierten Haushalts- und Quellenbelege des Förderwächters nutzen.

## Abnahme bei Integration

Meinersen: aktives PV-Programm oben; ausgeschöpfter Kreis-Balkonzuschuss im geschlossenen Archiv; beide offizielle Quellenlinks korrekt; Einzelheiten weiterhin erreichbar; am Balkon-Beispiel kein Hinweis „Förderung verfügbar“ wegen des ausgeschöpften Programms. Desktop und mobil visuell prüfen. Keine Tests abschwächen und keine parallele Statusquelle anlegen.
