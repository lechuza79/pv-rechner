# Einspeisevergütung: Komponentenprüfung

Stand: 30.09.2026. Lokale Arbeitskopie `verguetung-seitenrunde`, Vorschau Port 4297.
Diese Notiz dokumentiert die Seitenprüfung; verbindliche Komponenten bleiben im
`lib/bausteine-registry.ts`. Keine zweite Komponentenbibliothek.

## 1. Prüfweg

Der funktionierende Vorschau-Tab wurde identifiziert. Der zuvor verwendete Tab
zeigte eine alte Fehlerseite. DOM-Messung und Screenshots funktionieren wieder.
Desktop und 375px Mobilbreite sind prüfbar. Ein erfolgreicher Typcheck ersetzt
keine visuelle Prüfung.

## 2. Zuordnung der gesamten Seite

| Bereich | Gemeinsame Quelle | Befund / Zuständigkeit |
| --- | --- | --- |
| Seitenrahmen, Überschriften, Fließtext | EditorialPage, EditorialContent, zentrale Schrift-Tokens | Bestehende redaktionelle Rollen verwenden. |
| Datum und Brotkrümel | ArticleMeta, Breadcrumb | Datum steht über der Überschrift; kein automatisch erneuertes Prüfdatum. |
| Kurzantwort und Einordnung | EditorialContent | Gemeinsamer Antwortblock; Navigation folgt danach. |
| Ankernavigation | GemeindeAbschnittNav, section-nav.css | Bestehende Kommunen-Navigation; Position beibehalten. |
| Aktuelle, monatliche und jährliche Tabellen | ContentTable | Gemeinsamer Rahmen, Zahlenstil und Scrollsteuerung; Unterschiede über Eigenschaften. |
| Drei Rechenbeispiele und Bestandsanlagen-CTA | ExampleCard, ExampleAmount, ExampleSize | Gemeinsame Karte auch für GemeindeBeispiele; Bild- und Textkonflikte unten bereinigt. |
| Illustrationen | solar-illustrations Runtime und registrierte Motive | Fertige Kompositionen verwenden; keine separaten Artikelbilder. |
| Annahmen aufklappen | ResultSection | Bestehenden Ergebnisbaustein weiterverwenden. |
| Verlauf und Ereignisse | VerlaufMitMeilensteinen, EventTimeline, WidgetExport | Fachlicher Chart bleibt eigenständig, Ereignisse und Widget-Funktionen geteilt. |
| Reformhinweis | EditorialContent und eeg-reform-config | Inhalt aus gemeinsamer Fachquelle; Hinweisrolle bleibt erhalten. |
| Quellen und Begriffshilfen | DataSourceNote, GlossaryTerm | Bestehende Quellen-/Tooltip-Bausteine. |
| Verbraucher-Vorschau | PVRechner, CalculatorContent, ResultSettings, ResultChoiceHeader, Carousel | Rechnerfamilie; parallele Rechnerarbeit nicht überschreiben. |
| Konfigurationsdialoge | Rechnerdialoge | Aufräumen und Übergänge an Rechner-Session übergeben; hier noch nicht als abgenommen gewertet. |
| FAQ | Faq und faq-design | Gemeinsame Homepage-FAQ-Regeln. |
| Weiterlesen | ArticleTeasers | Wiederverwendbarer redaktioneller Baustein. |
| Feste CTA, Grundlagen, Footer | StickyCta und Site-Komponenten | Bestehende Site-Bausteine. |

## 3. Bereinigung und Grenzen

- ExampleCard: Absatztext nutzt Body-Größe, Textschrift, Sekundärfarbe und
  Zeilenhöhe 1,7. Vorher war die Zeilenhöhe nur `normal`.
- Der gemeinsame Feature-Bildrahmen akzeptiert sein Seitenverhältnis über
  `--sc-feature-visual-aspect`; Standard bleibt quadratisch. Die drei vorhandenen
  PV-Kompositionen liefern ihre passenden Verhältnisse. Dadurch gewinnt keine
  alte Quadrat-Regel mehr gegen die Motive.
- Negative vertikale Bildabstände der ExampleCard entfernt. Mobil liegen Bild
  und Inhalt ohne Überlappung im normalen Raster.
- Die initiale Navigation bleibt unter der Kurzantwort, mit 32px davor und
  48px danach. Der feste Zustand beim Scrollen wurde nicht tiefer versetzt.

Noch offen: Rechnerdialog-Integration aus der zuständigen Session sowie eine
vollständige Vereinheitlichung der älteren Secondary-Button-Definitionen in
Gemeinde- und Feature-CSS. Der vorhandene gemeinsame Hover ist kein Nachweis,
dass sämtliche älteren Button-Regeln bereits entfernt wurden.

Die vollständige Seitenabnahme (Schritt 4) und Übertragung auf weitere Seiten
(Schritt 5) bleiben ausdrücklich separat. Keine Veröffentlichung erfolgt.

## Nachweise

- Beispielkarten bei ursprünglicher Fensterbreite: Höhe von rund 409 auf 328px;
  Absatz-Zeilenhöhe 27,2px bei 16px Schriftgröße.
- Mobil 375px: einspaltige Karten, 20px zwischen Bild und Inhalt, kein horizontaler
  Seitenüberlauf.
- ContentTable- und Komponentenregister-Prüfung: 14 Tests bestanden.
- Typprüfung ohne Schreibcache erfolgreich; Diff auf Formatfehler geprüft.

## Abschlussprüfung vor Auslieferung

- Breadcrumb verwendet die kompakte Variante des gemeinsamen Bausteins und dessen bestehende Atlas-Darstellung; strukturierte Daten bleiben erhalten.
- Statische Absatzabstände und die abschließende Schriftgrößen-Ausnahme aus der Seite in gemeinsame redaktionelle Rollen überführt.
- Die dynamische Balkenbreite in der Jahrestabelle bleibt eine Daten-Eigenschaft. Die Positionsangaben des bestehenden Charts sind fachliche Visualisierung, kein zusätzlicher Seitenstil.
- Historischer Renditevergleich bleibt im Backlog. Veröffentlichung der Artikelrunde vom Betreiber freigegeben; Auslieferungsnachweis folgt separat.

### Verbleibende gemeinsame CSS-Überschreibungen

`ExampleCard.module.css`, `pv-consumer-section.css` und `gemeinde/section-nav.css` enthalten weiterhin Vorrangregeln (`!important`) gegenüber älteren gemeinsamen Karten-, Formular- und Navigationsstilen. Sie sind nicht vollständig bereinigt. Eine globale Ablösung ist ein separater Schritt mit Prüfung der weiteren Verbraucher; die Artikelrunde führt dafür keine neue parallele Gestaltung ein.
