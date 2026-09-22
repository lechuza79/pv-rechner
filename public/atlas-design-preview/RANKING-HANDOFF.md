# Ranking-Entwurf: Integration für Claude
Stand: 08.09.2026. Lokaler Prototyp, keine Produktionsänderung.

## Verhalten
Kategorien wechseln nach sieben Sekunden mit Aus-/Einblenden. Eigene Kategorie- oder Filterwahl, Tastaturfokus und Öffnen der Liste pausieren. Play/Pause ist sichtbar. Bei reduziertem Bewegungswunsch startet der Wechsel pausiert und Übergänge entfallen. Außerhalb des sichtbaren Bereichs und im Hintergrund laufen keine Wechsel.

Gebiet: Landkreis Würzburg, Bayern, Deutschland. Größenklassen entsprechen lib/gemeindegroesse.ts. Anlagenbereich: alle, privat, Gewerbe/Freifläche. Alle sichtbaren Werte und Listen folgen derselben Auswahl. Außerhalb der eigenen Größenklasse wird keine eigene Platzierung behauptet. Leere Gruppen, Ladefehler und Wiederholen sind umgesetzt; bei Fehlern keine alten Werte unter neuen Filtern zeigen.

## Datenanbindung und tatsächliche Grenze
55 Landkreisorte aus dem Server-Payload der Höchberg-Liveseite, Abruf 08.09.2026, Bestandsstand 05.08.2026. Lokal nach Klasse und Eigentümer filtern. Quellenwerte bleiben ungerundet bis zur Anzeige.
Bayern/Deutschland nutzen die bestehende /api/atlas/nachbarn-Schnittstelle. Diese liefert NUR Solarleistung je Einwohner; andere Kategorien sind dort explizit nicht auswählbar. Im lokalen Entwurf ist /ranking-data ein strikt begrenzter Same-Origin-Proxy. In Produktion direkt die vorhandene interne Schnittstelle nutzen, KEINEN Proxy ergänzen. Die Antwort enthält maximal Top 100 plus eigene Zeile und die vollständige Gruppengröße. Niemals die Antwortlänge als Nenner verwenden. Kein eigener Rang aus der gekürzten Liste berechnen. Ohne direkten Vorgänger Abstand zur Spitze anzeigen.

Das ist keine neue globale Ranglogik: Claude verwendet vorhandene Klassen, Eigentümerdefinitionen und Serverabfragen. Für zusätzliche Kennzahlen über Landkreisgrenzen fehlt noch die erweiterte bestehende Schnittstelle. Beliebige andere Bundesländer/Landkreise sind kein vorhandener Auswahlumfang dieses Entwurfs.

Headlines und Zahlen in Montserrat Bold 700, normale Laufweite. Siehe gemeinsame Typografie-Übergabe im Austauschordner. Podesthöhen stellen Ränge dar, keine Mengenverhältnisse. Platzgleichheit wird berücksichtigt. Andere Gemeinden sind mit Atlas-Seiten verlinkt.

## Iteration: fokussierter Rang (08.09.2026)
Rechte Platzliste durch kompakte Kategorietasten ersetzt. Eine eigene Platzierung steht groß neben dem Podest. Vergleichsfilter hinter „Vergleich ändern“; Auswahl bleibt in der Vergleichszeile sichtbar. Automatischer Wechsel: 150 ms Ausblenden, Podeststufen wachsen gestaffelt 850 ms, Namen/Werte und eigener Rang werden nach 1 s über 300 ms aufgelöst. Manuelle Auswahl zeigt das Ergebnis sofort. Verborgene Links bleiben während der Auflösung inert. Reduzierte Bewegung wird berücksichtigt.

## Korrektur des Betreibers: sequenzielle Auflösung
Die rechte Kategorienliste bleibt bestehen, ohne vorab sichtbare Rangzahlen. Nur die gerade aufgedeckte Kategorie zeigt ihren Rang. Podeststufen wachsen einzeln (850 ms) mit synchronem Hochzählen des Werts, anschließend Rangziffer und Ortsname. Fremde Orte zuerst, Höchberg zuletzt; eigene Farbe bleibt bis zur Auflösung neutral. Liegt Höchberg außerhalb Top 3, wird seine Ergebniszeile zuletzt aufgedeckt. Manuelle Kategorienwahl startet dieselbe Sequenz und pausiert Autowechsel. Ein Wechsel während der Sequenz bricht veraltete Animationen und Zähler ab. Reduzierte Bewegung zeigt sofort das fertige Ergebnis. Diese Vorgabe ersetzt die vorherige kompakte Kategorienleiste.

## Aktuelle Auflösung (ersetzt die vorherige Sequenz)
Alle Balken wachsen gleichzeitig mit hochzählenden Werten (1,4 Sekunden). Erst danach poppen Ortsnamen und Rangziffern gemeinsam ein. Gesehene Kategorien behalten ihre Platzierung rechts beim Kategorienwechsel. Bei Änderung von Gebiet, Größenklasse oder Anlagenbereich wird dieser Sichtbarkeitsstand zurückgesetzt, damit keine alten Ränge unter neuen Filtern stehen.

## Namensauflösung mit Pause
Nach gemeinsamem Balkenaufbau: 400 ms Spannung, dann Ortsnamen einzeln aufdecken, jeweils 750 ms Pause nach dem 320-ms-Einblenden. Fremde Orte vom niedrigeren zum höheren Rang, Höchberg zuletzt. Liegt Höchberg außerhalb des Podests, folgt seine Ergebniszeile nach zusätzlicher Pause. Bereits gesehene Ränge bleiben rechts sichtbar.

## Vergleichskontext und Einheit
Headline „Höchberg im Vergleich“. Einleitung nennt dynamisch Gebiet, Anzahl, Größenklasse und Anlagenbereich. Zentrale Filter standardmäßig geöffnet; Größenbereich steht direkt in der Auswahl statt nur im Tooltip. Einheit einmal im Untertitel der Grafik, nicht wiederholt je Balken. Gemeinsame Nulllinie am Fuß der Podeststufen; Höhen bleiben Rangstufen, keine quantitative Skala.

## Inline-Filter und eigene Position
Ändern steht als Textbutton hinter dem Vergleichstext und klappt zentrale Filter auf. Zurücksetzen erscheint nur bei abweichendem Gebiet/Anlagenbereich/Größenklasse; setzt die drei Filter auf Höchbergs Ausgangsvergleich zurück. Größenklasse erhält Erklärung aller Klassen per Hover, Tastaturfokus und Klick. Bei Top 3 entfällt der doppelte eigene Ergebnisblock; außerhalb Top 3 kompakte hervorgehobene Zeile mit Rang, Höchberg, Wert und Abstand darunter.

## Korrektur: tatsächliche Wertverhältnisse
Balkenhöhen sind jetzt proportional zum ungerundeten Wert, Maximum 160 px für den höchsten Wert der Kategorie. Gemeinsame Nullbasis, keine Mindesthöhe, keine festen Rangstufen. Rangziffern benennen weiterhin die Platzierung. Frühere Hinweise auf symbolische Podesthöhen sind überholt.

## Platzkennzeichnung
Rangziffern aus den Balken entfernt. Die Balken zeigen ausschließlich Werteverhältnisse; Medaillen sollen später die Platzkennzeichnung übernehmen und sind noch nicht eingebaut.

## Aufbau korrigiert
Balken wachsen wieder einzeln nacheinander (je 850 ms), synchron mit ihrem jeweiligen Wert. Fremde Orte zuerst, eigener Balken zuletzt. Erst nach dem gesamten Aufbau werden die Namen mit Pausen aufgedeckt. Der nächste automatische Wechsel wird erst nach der vollständigen Auflösung eingeplant. Dies ersetzt den zwischenzeitlich gleichzeitigen Aufbau.

## CTA-Hierarchie: Ortslink zuerst
Hero primär „Höchberg im Vergleich“, sekundär „Abonnieren“ mit Glocke. Sichtbare Wetterzeile entfernt; Wetterszene bleibt, Ausarbeitung einer Live-Leistungsanzeige ist geparkt. Ranking und Sticky: „Platzierung teilen“, Abo im Sticky sekundär. Teilen-Vorschau übernimmt den aktuellen Vergleich; „Link kopieren“ primär, „Meldung mit Link kopieren“ sekundär. URL ist die echte kanonische Höchberg-Seite ohne erfundene Filterparameter; Kontext steht im kopierten Meldungstext. Footer priorisiert Meldung/Ortslink, danach bestehende Widgets. Neue Ranking-Downloads und Embeds bleiben ausdrücklich noch offen. Abodialog bleibt unverbindlicher Prototyp ohne Versand.
