# Projektanleitung: datenstories

Verbindliches Fachkapitel zu [CLAUDE.md](../../CLAUDE.md). Nur die für den Auftrag relevanten Abschnitte laden. Codepfade in Backticks beziehen sich auf das Repository-Hauptverzeichnis; Verweise wie „oben“ und „siehe Abschnitt“ meinen die entsprechenden Fachabschnitte, die in der zentralen Anleitung verlinkt sind.

## Datenstories und Social-Posting (interner Bereich)

Das Projekt veröffentlicht seit 26.08.2026 selbst auf LinkedIn. Der Redaktionsbereich liegt unter
`/admin/redaktion` (Entwicklung, Planung, Auswertung); der Ausbau der Ansicht zum Design-Werkzeug
läuft in einer eigenen Sitzung — Übergabe mit den Fallen: `docs/redaktionssystem-uebergabe.md`.
Der Vorrat an Geschichten steht in `docs/datenstories-katalog.md`.

### Der Story-Bucket: was die Daten hergeben, bevor jemand einen Post schreibt

`/admin/redaktion/bucket` zeigt, was ein Suchlauf in den eigenen Daten gefunden
hat — 13 Muster aus dem Katalog, je Fund ein gerechneter Satz mit seinen Zahlen
und seiner Grundlage. Ein Mensch stöbert, merkt vor, verwirft; aus dem
Vorgemerkten wird ein Beitrag. Der Fluss ist **Bucket → Entwurf → Beitrag →
geplant**, und die späten Stände werden ABGELEITET (ein Beitrag trägt die
Kennung seines Fundes, der Kalenderplatz hängt am Beitrag) — sie zusätzlich
mitzuschreiben wäre eine zweite Wahrheit.

**Der Entwurf wird bei jedem Aufruf NEU gerechnet, nie abgelegt.** Ein
abgelegter Entwurf trüge die Zahlen von damals; nach dem nächsten Suchlauf
stünde dort eine Zahl, die die Daten widerlegen. Was die Maschine nicht kann,
bleibt sichtbar offen: der letzte Absatz mit dem eigenen Gedanken. Eine gefüllte
Lücke merkt niemand, eine offene sieht jeder.

**Der Lauf schreibt NIE den Stand oder die Notiz — BLOCKER.** Was nicht in der
Nutzlast steht, bleibt beim Aktualisieren stehen; sie mitzugeben, und sei es mit
dem Vorgabewert, setzte bei jedem Lauf jede Vormerkung zurück.

**Die Kennung setzt der FINDER, nie eine Ableitung aus dem Satz.** Aus dem Satz
geraten kollidierten 116 von 399 Funden — zwei verschiedene Funde unter einem
Griff, und der zweite überschrieb den ersten stumm. Sie ist lesbar und nicht
bloß eindeutig, weil sie in einem Zuruf funktionieren muss.

**Seitenweise lesen ohne Sortierung liest nicht denselben Bestand — BLOCKER.**
Postgres darf die Zeilenfolge zwischen zwei Abfragen ändern; über Seitengrenzen
hinweg kommen dann Zeilen doppelt und andere gar nicht. Gemessen: derselbe Ort
in drei Läufen mit 35, 64 und 39 Anlagen, bei unveränderten Daten. Und der
zweite Teil derselben Falle: **ein Abruf ohne Paginierung liefert stumm nur die
ersten 1.000 Zeilen.** Bei den KfW-Kreisdaten fehlten so 597 von 1.597 — die
Sätze nennen absolute Jahreszahlen, die damit Teilsummen waren, und der
Vergleichsmedian entstand aus der halben Menge. Jeder Abruf auf einer Tabelle,
die wachsen kann, wird paginiert UND sortiert.

**Die Lesegrenze kappt JE MUSTER, nicht global nach Stärke.** Die Stärke bedeutet
je Muster etwas anderes (Prozentpunkte beim Flächenmix, Faktoren sonst); global
gekappt fielen ganze Muster heraus — gemessen an 590 Funden fehlten Umkehrung,
Heizungsförderung und Förderlücke vollständig, vom Kontrast kamen 27 von 256 an.
Die Filterleiste bot sie mit Zahlen an, in der Liste standen sie nie. **Und die
Trefferzahl nennt, was die Liste zeigt, nicht was es gibt** — sonst hält man den
Vorrat für abgearbeitet.

**Eine Richtung wird GERECHNET, nicht am Satz abgelesen.** Der Aufholer-Sucher
(hinten im Bestand, vorn beim Tempo) filterte auf ein Wort im Satz — wirkungslos,
weil der Satz IMMER beide Messgrößen nennt. Herausgekommen wären Regionen, die
nachlassen, etikettiert als Aufholer: genau die Bloßstellung, die das Muster
ausschließt.

**Welcher Zeitraum noch läuft, sagt der KALENDER, nicht die Datenreihe.** Zwei
Anläufe sind daran gescheitert, es aus den Daten zu erraten; beide Ergebnisse
sahen plausibel aus, gefangen hat es erst ein Test. Eine halb erhobene Woche ist
von einer schwachen nicht zu unterscheiden — beide zeigen wenig. Gilt für den
Wochenvergleich wie für die Karenz der Monats-Anomalie: Der Stichtag kommt von
außen, und die Karenz zählt Kalendermonate, nicht Einträge der Liste.

**Was aus einem gleitenden Fenster fällt, wird gelöscht.** Der Monatslauf
schreibt nur die Monate seines Fensters; ohne Aufräumen bliebe alles Ältere mit
dem Stand liegen, den es beim letzten Schreiben hatte — und die Anomalie-Suche
bildet ihren Vergleichsmedian über ALLE Fenster. Eingefrorene Monate sind
systematisch zu niedrig, der Median sinkt, und es erscheinen Ausschläge, die
keine sind.

**Ein Fund, den der jüngste Lauf nicht mehr findet, wird als veraltet
gekennzeichnet, nicht gelöscht** — die Vormerkung soll nicht verschwinden, aber
er darf auch nicht wie ein frischer aussehen.

**Die Ablage trägt `server-only`, ihre Beschriftungen nicht.** Zustandsnamen und
die Ableitung der späten Stände liegen in einem eigenen Modul ohne Server-Bindung
(`lib/social-fundstand.ts`); sonst zieht eine Client-Komponente, die nur ein
Label braucht, die halbe Serverschicht ins Browser-Bündel — der Bau bricht ab.
`lib/__tests__/server-only-grenze.test.ts` hält das fest.

**Der Suchlauf läuft wöchentlich** (`.github/workflows/story-bucket.yml`) und
schlägt bei einem leeren Lauf fehl: Ein Automatismus, der nichts findet, ist von
einem, der nicht lief, sonst nicht zu unterscheiden.

**OFFEN (bis 12/2026): Datenstories und Abo-Meldungen aus einer Quelle**
(Betreiber, 01.09.2026). Beide rechnen aus denselben Zahlen und wissen
nichts voneinander: Der Story-Katalog rechnet bundesweit für die
Social-Beiträge, `gemeindeMeldungen()` rechnet je Ort für die Abo-Mail.
Eine Geschichte, die eine Gemeinde betrifft, ist damit zweimal zu
formulieren — und genau daraus entsteht der Widerspruch, den dieses
Projekt beim Kommunen-Anschreiben schon einmal hatte. Umgekehrt liegt der
Hebel auf der Hand: Was einen Social-Beitrag trägt, trägt auch eine
Meldung an die Abonnenten des betroffenen Orts, ohne dass jemand sie
schreibt. **Erst angehen, wenn es Abonnenten gibt** — vorher wäre es eine
Zusammenführung von etwas, das noch niemand liest.

**Ein Post wird GERECHNET, nicht getippt — BLOCKER.** Text und Bild entstehen aus derselben
Funktion (`lib/social-posts.ts`), gespeist aus einer Kennzahlen-Abfrage (`lib/social-kennzahlen.ts`).
Ein Beitrag kann damit keine Zahl behaupten, die das Diagramm daneben widerlegt. Wer das Bearbeiten
ausbaut, hält diese Eigenschaft über Platzhalter (`lib/social-vorlage.ts`): Im bearbeitbaren Text
stehen Namen, die Werte setzt die Berechnung ein. Dieselbe Fehlerklasse wie bei den Gemeindebriefen,
wo ein Brief einen Rang behauptete, den die verlinkte Seite widerlegte.

**Die Quellenzeile kommt aus dem Quellen-Register, nie getippt** — sonst fehlt die Lizenz, und zwar
still: Sie fehlte an zwölf Beiträgen, während der Ember-Zweig sie trug, weil beide Fassungen von Hand
geschrieben waren und VERSCHIEDEN abwichen. Im geteilten Bild ist die Nennung Lizenzpflicht
(dl-de/by-2-0 · CC BY 4.0). Ein Test, der nur auf das Vorhandensein eines Namens prüft, fängt das
nicht — er ließ „Bundesnetzagentur" als Lizenz durchgehen.

**Was ein Beitrag über die Daten sagt, wird im Datenlauf nachgerechnet.** Die vier Solar-Segmente
müssen die Gesamtleistung ergeben (Toleranz 1 ‰); eine Aufteilung, deren Teile nicht aufgehen, ist
ein Bild über etwas, das es nicht gibt. Das vierte Segment (Steckersolar) ist **gemessen, nicht als
Differenz gerechnet**, und kommt aus DEMSELBEN Bundes-Rollup wie die drei anderen — aus der Summe
der Gemeindezeilen verfehlt es den Bund, und dann geht die Bilanz nicht mehr auf.

**Jede Aussage rechnet ihre RICHTUNG mit, statt sie zu behaupten.** Kippt ein Verhältnis, kippt der
Satz. Der Anlass: Im Katalog stand als Beispiel „beim Solarstrom liegt der Osten vorn, bei
Balkonkraftwerken umgekehrt" — ausgedacht, und beide Hälften falsch. Gemessen ist der Kontrast
Stadt gegen Land und stärker als der erfundene. **Kein Beispielsatz gilt, bevor er einmal gegen die
Daten lief.**

**Die Karte hat STUFEN, keinen Maßstab** (`components/social/SocialKarte.tsx`). Eine 1080er Karte
auf 240 Pixel herunterzurechnen macht die Quellenzeile fünf Pixel groß. Die kleine Stufe lässt
deshalb weg (kein Untertitel, keine Fußzeile, eine Zahl statt zwei) und setzt ihre Schriftgrößen
absolut. Wer eine dritte Größe braucht, ergänzt eine Stufe — er skaliert nicht. Die Quellenangabe
fällt nur dort weg, wo sie nicht geschuldet ist: Als Seiteninhalt nennt die Seite ihre Quellen
ohnehin, als Bild ist die Nennung Lizenzpflicht.

**Die Bildform folgt aus den Zahlen, nicht aus dem Geschmack — BLOCKER** (`lib/social-bildformen.ts`).
Acht Formen, und jede trägt ihre eigene Bedingung: **Ring und gefüllter Umriss bilden einen Anteil ab
und brauchen ein Ganzes; die Säule zeigt ein Verhältnis und braucht das Fehlen eines. Normiert wird
bei Anteilen am Ganzen, nie am größeren Wert.** Wer am größeren Wert normiert, malt aus 35 % einen
vollen Balken. Drei Formen kamen am 05.09.2026 dazu, jede erst nach der Frage, welche Beiträge sie im
Bestand wirklich tragen — **eine Form ohne Beitrag ist Zierde**: die **Rangliste** (ab drei Werten,
und nur wenn sie weit genug auseinanderliegen — bei sechzehn fast gleich langen Balken sieht man
nichts), die **Aufteilung** (ab drei Teilen eines Ganzen, überlappende Anteile sind keine Aufteilung)
und der **Verlauf** (eine echte Zeitreihe, keine Momentaufnahme mit Jahreszahl).
- **Was die Zahl SAGT, entscheidet über die Stellen, die sie zeigt.** Zwei verschiedene Werte dürfen
  nicht als dieselbe Zahl dastehen, und kein Wert darf zu null werden — sonst behauptet das Bild
  einen Gleichstand oder ein Nichtvorhandensein, das die Daten nicht hergeben (0,4 % als „0 %" ist
  dieselbe Fehlerklasse wie eine falsche Einheit). Die Stellenzahl wächst deshalb, bis beides
  aufhört; der Balken folgt der ANGEZEIGTEN Zahl, nicht der ungerundeten.
- **Das Fehlen eines Nullpunkts ist ein Ausschlusskriterium, kein Rechenparameter.** Eine Rangliste
  über Wachstumsfaktoren wurde am Bild verworfen: Thüringen stand bei 40 % Länge, obwohl sein Zuwachs
  ein Fünftel von Hamburgs ist. Wer den Nullpunkt stattdessen in die Länge einrechnet, erzeugt
  Verhältnisse, die niemand nachrechnen kann.
- **Jede Variante hat eine KENNUNG** (`rangliste-hell`, `ringpaar-dunkel` …), damit man über ein
  Design reden kann, bevor es einen Template-Namen hat.

**Der Templates-Bereich zeigt TEMPLATES, nicht Beiträge** (`/admin/redaktion/templates`). Eine Story
ist der Inhalt, sie verwendet ein Template, und ein Template gibt es in drei Farbvarianten — die
Variante ist die Einheit, die abgenommen wird. Zwei Ansichten: **Bibliothek** (abgenommen, die
Referenz) und **neu entwickeln** (der Arbeitsvorrat). Zwei Eigenschaften, ohne die er nichts taugt:
- **Angeboten wird nur, was die Form wirklich trägt** — dieselbe Bedingung wie im Redaktionstisch.
  Ein Design an einem Fall abzunehmen, den es nie geben wird, ist wertlos.
- **Jede Zeile lässt sich mit verschiedenen Beiträgen füllen**, und die Wahl steht in der Adresse.
  Ein Design an einem einzigen Beitrag zu beurteilen heißt, es für den Referenzfall abzunehmen und
  für die übrigen zu hoffen — die Formen scheitern verschieden: ein langer Ländername sprengt die
  Namensspur, eine enge Verteilung macht gleich lange Balken, ein winziger Anteil verschwindet.
- **Die Karte wird in Ausgabegröße gerendert und per Transformation verkleinert.** Kleiner
  *gerechnet* bricht der Text an anderen Stellen um als im ausgelieferten Bild — wer eine so
  verkleinerte Karte beurteilt, beurteilt eine, die es nicht gibt. **Jedes Bild wird am gerenderten
  Bild beurteilt, nie am Code:** Vier Fehler dieser Runde waren nur dort sichtbar.
- **Die Werkbank auf der Kommandozeile rendert dieselbe Galerie** (`npm run social:formen`) und
  weist ein Ziel im öffentlichen Ordner aktiv ab: Was dort landet, ist ohne Login abrufbar, und ein
  interner Arbeitsstand gehört nicht ins Netz. Ein Filterlauf schreibt in eine eigene Datei, sonst
  überschreibt er die Übersicht.

**Die Freigabe vor dem Versand hängt am INHALT, nicht am Post** (`lib/social-pruefung-kern.ts`).
Zwei Prüfungen je Beitrag, und ein Fingerabdruck über die normalisierte Fassung macht sichtbar, wenn
nach der Prüfung etwas anderes daraus wurde. Reine Formatierung geht durch — eine Sperre, die an
einem Zeilenumbruch anschlägt, wird zur Schikane und irgendwann umgangen. **Der Abdruck deckt Text
UND Bild** (Bildform, Farbschema, Serien, Beschriftungen): Vorher hätte ein Wechsel des Kartentyps
die Freigabe unberührt gelassen, obwohl das Bild ein anderes ist — und geprüft wird das Bild, nicht
der Text darüber.

**Der Zugangsschlüssel läuft alle zwei Monate ab** und lässt sich nur durch einen Browser-Login des
Betreibers erneuern. Der Gesundheitscheck warnt gestaffelt (14/7/3/1/0 Tage) und macht den Lauf
dabei bewusst NICHT rot: Rot startet den Autofix, der hier nichts ausrichten könnte, und gewöhnt
uns ab, Rot ernst zu nehmen. Die Staffelung ist nötig, weil der Check alle drei Stunden läuft —
täglich zu warnen wären über hundert Mails in zwei Wochen.

**Kein externer Link im Beitrag.** Er drückt die Verbreitung; der Link gehört in den ersten
Kommentar, den dieselbe Berechtigung mitsendet. Die Erwähnung der Unternehmensseite bleibt dagegen
innerhalb von LinkedIn und kostet nichts — sie greift nur, wo der Seitenname wörtlich im Text
steht, deshalb trägt ihn die Quellenzeile.

**Gemessen und nicht zu wiederholen:** Die Story-Themen haben kein Suchvolumen („Balkonkraftwerk
Stadt Land", „wo stehen die meisten": null), die BESTANDSfragen dagegen rund 240 Suchen im Monat
bei geringer Konkurrenz. Verborgener Text im HTML wird indexiert — Googles Spam-Richtlinie nennt
Akkordeons ausdrücklich als zulässig; verloren geht nur, was erst per Klick NACHGELADEN wird.
Adress-Anker gelten nicht als eigene Adressen.

Tabellen: `social_konten`, `social_pruefungen`, `social_vorlagen`, angelegt über
`/api/social/setup`. Alle drei mit RLS und ohne Policy — sie halten Zugangsschlüssel und sind
ausschließlich über den Service-Key erreichbar.

## Ortsgeschichten auf den Gemeindeseiten

Jede Gemeindeseite rechnet aus ihren eigenen Zahlen die Familien des
Story-Katalogs (`lib/orts-stories.ts`) — sieben Stück: was der Ort an
Einspeisevergütung eingespielt hat, wem sie dieses Jahr ausläuft, wo er unter
gleich großen Orten seines Kreises bzw. Landes steht, was im letzten
abgeschlossenen Monat ans Netz ging, ein Monat, der aus seiner eigenen Reihe
fällt, wie viele Dächer es überhaupt gibt, wie die typische Anlage gewachsen
ist, und worauf der Strom steht.

**Die SCHWELLEN wandern, nicht die Frage — BLOCKER.** Der bundesweite Suchlauf
(`lib/social-funde.ts`) sucht Ausreißer über alle 11.000 Gemeinden und setzt
seine Schranken entsprechend: 1.000 Anlagen je Baujahr für die Kohorte, 20.000
kWp für den Flächenmix. **Keine einzige Gemeinde erreicht das**, die Familien
fielen auf Ortsebene also ersatzlos aus. Gefragt wird deshalb dieselbe Frage mit
einer ortsgroßen Vergleichsgruppe — nicht dieselbe Rechnung mit gesenkten
Schwellen, denn dann kommen die Superlative auf zehn Anlagen zurück, gegen die
die Schranken gebaut sind. Gemessen (05.09.2026): 313 Funde des Suchlaufs nennen
einen Ort, verteilt auf 197 von 11.000 Gemeinden — auf 98 % der Ortsseiten stünde
sonst nie einer.

**Was schon auf der Seite steht, gehört nicht in den Feed** — aber die Grenze
ist der ZEITRAUM, nicht die Zahl. Eine Kachel zeigt den Zustand („Neu 2025:
124"), eine Geschichte einen Zeitraum mit seiner Reihe. Wer denselben Wert ohne
Zeitbezug wiederholt, schreibt die Kachel ab; ein Test hält die Muster fest
(`lib/__tests__/orts-stories.test.ts`).

**Eine Rundung je Größe.** Der erste Lauf zeigte in der Kachel „17.100 € je
Anlage" und im Satz daneben „17.139 €" — dieselbe Größe, zwei Rundungen, beide
für sich plausibel. Ein Wächter schlägt an, sobald im Text eine Zahl steht, die
einem Kachelwert um weniger als zwei Prozent danebenliegt.

**Zwei Quellen neben dem Anlagenregister**, beide schmale Einzelort-Lesevorgänge
mit weichem Zeitbudget (`lib/orts-daten.ts`): der Zubau nach Monat — die
Jahreszahl kann nicht sagen, was gerade passiert ist — und der Wohnungsbestand
aus dem Zensus, ohne den sich „hier wurde wenig gebaut" nicht von „hier gibt es
kaum eigene Dächer" unterscheiden lässt. Fällt eine aus, entfallen genau ihre
Geschichten.

**LIVE seit 06.09.2026 — und eine Ortsgeschichte IST seitdem ein Beitrag des
Redaktionssystems.** Sie war es an den Daten immer: dieselben Familien des
Katalogs (G2, G3, G4, G10, G14, G15, G16), eine Schlagzeile, benannte Werte mit
Einheit, eine Grundlage. Was fehlte, waren vier Angaben — Farbschema,
Quellenzeile, Messzeile und die Frage, welche Formen ihre Zahlen hergeben.
`lib/orts-posts.ts` ergänzt sie; damit gelten Templates, Formenlehre,
Rundungsregeln und Freigabe ohne eine eigene Zeile Zeichnung.
- **Die Kategorie ist die des Katalogs, keine zweite Aufzählung.** Die Datei
  führte „G4.1", „G3.vergleich", „G10" als eigene Union, während derselbe
  Katalog daneben lag — und die erfundene Ordnung stand in der Ortsansicht. Ein
  Fund reichte sogar den Schlüssel als Beschriftung durch: Auf der Ortsseite
  stand wörtlich „g10", unsichtbar geblieben, weil der Block ausgeblendet war.
- **Der ORT ist eine zweite Dimension, nie eine Kategorie.** Eine 21. Familie
  „Kommune" hätte sieben Familien unter einen Reiter geworfen. Er steht am
  Beitrag; die Kennung trägt den Gemeindeschlüssel, und daran hängt die
  redaktionelle Fassung — deshalb lässt sich vor einem Versandschub JE ORT
  einstellen, ohne dass die Einstellung zu allen anderen wandert.
- **Das Visual ist die dritte Stufe derselben Karte** (`quadrat` in
  `components/social/SocialKarte.tsx`): 1:1 statt 4:5, und mit der Möglichkeit,
  die Farben der SEITE zu erben statt eine eigene Palette mitzubringen. Genau
  daran waren die drei Anläufe vom 05.09.2026 gescheitert. Keine eigene
  Schriftskala und keine eigene Zeichnung — eine dritte wäre die zweite Wahrheit
  neben den abgenommenen Templates.
- **Der Höhenfaktor gehört an die AUSGABEGRÖSSE, nie an das Koordinatensystem.**
  In die viewBox gerechnet standen die Ringradien außerhalb, und der Ring wurde
  an seiner eigenen Zeichenfläche abgeschnitten — im Bild ein blaues Quadrat
  dahinter. Dieselbe Falle beim Verlauf, wo die y-Achse dann gegen ein anderes
  System zeichnet als ihre Beschriftung.
- **Der Fuß gibt nie nach** (`flexShrink: 0`), der Inhaltsbereich schon
  (`minHeight: 0`). Die zweizeilige Quellenzeile (Zensus plus Register) brach
  sonst unten aus der Karte und nahm das Logo halb mit. Ein beschnittener
  Lizenzvermerk ist schlimmer als eine zu kleine Zeichnung.
- **Beurteilt wird am gerenderten Bild** (`npm run orts:visual`), nicht am Code:
  Alle vier Befunde waren nur dort sichtbar. Der Maßstab kommt aus einer
  Messung, nicht aus einer Zahl, weil ein fester Faktor entweder auf dem Telefon
  überläuft oder auf dem Schreibtisch zu klein bleibt.
  **OFFEN (bis 10/2026): Der Browser-Test dazu fehlt.** Er hielt die Skalierung
  auf Telefon- und Schreibtischbreite fest und ist am 22.09.2026 mit den übrigen
  Tests der alten Ortsseite gelöscht worden — die Karte selbst gibt es weiter,
  jetzt im Geschichten-Streifen der neuen Seite. Damit ist die eine Zusage offen,
  die der Betreiber ausdrücklich verlangt hat („ich kann das nicht testen. das
  muss ein system 100 % zuverlässig testen"). Ein Blick ersetzt ihn nicht: Ob
  eine Karte ein paar Pixel über ihren Rahmen ragt, entscheidet keine Sichtung.
- **Der Redaktionstisch der Schübe:** `/admin/redaktion/kommunen`, ein Ort auf
  einmal. Die Kette je Ort kostet ein halbes Dutzend Abfragen; fünfundzwanzig
  auf einer Seite wären die Kopplung „teurer mit den Daten". Beide Seiten holen
  ihre Beiträge aus `lib/orts-beitraege-server.ts`; ein Test verbietet dem Tisch
  die eigene Zusammenstellung, denn seine Auswahl an Funden und Platzierungen
  entscheidet, welche Geschichten es überhaupt gibt.
- **Der Zensus steht NICHT unter dl-de/by-2-0** — die Angabe stand seit dem
  Importlauf so da und ist am Original widerlegt: Auf zensus2022.de trägt allein
  das Shapefile der Verwaltungsgrenzen die Datenlizenz (Quellenvermerk „© GeoBasis-DE
  / BKG 2023", also die BKG-Karte), bei Destatis gilt sie ausdrücklich nur für
  GENESIS-Online. Es gilt der allgemeine Quellennachweis-Vorbehalt, im Register
  im Wortlaut.

**Was diese Arbeit gekostet hat, steht in `docs/lehren/ortsgeschichten-2026-09.md`**
— darunter zwei Fehler, die bereits ausgeliefert waren (eine doppelte Präposition
in allen fünf Abo-Meldungen, zwei Rundungen für dieselbe Größe) und zwei Wächter,
die grün meldeten, ohne etwas zu sehen. Der teuerste Posten war keiner davon,
sondern dass dieselbe Ansage viermal wiederholt werden musste: **Steht „recyceln",
„zentral" oder „aus X ziehen" im Auftrag, ist der erste Arbeitsschritt, X zu
öffnen — nicht, die Aufgabe zu lösen und danach nach Ähnlichem zu suchen.**

**Zahlen sind farblich neutral. Farbe bekommt nur eine Tendenz** (Betreiber,
05.09.2026). „12,6 Mio €" ist weder positiv noch negativ; ein Akzent darauf
entwertet die Stellen, an denen Farbe wirklich etwas sagt.

**Der Einbett-Knopf gibt den Code für DIESEN Ort aus**, nicht einen Sprung in die
Galerie (`components/EinbettenDialog.tsx`). Der Code selbst kommt aus einer
Quelle (`lib/embed-code.ts`), die Galerie liest dieselbe — ein Test verbietet
dort einen eigenen Codebauer. Der Grund ist gemessen: 289 Briefe an Kommunen
haben sieben belegte Veröffentlichungen erzeugt (Stand 22.09.2026) und **null Einbettungen**; in der Galerie
steht der Ort in einem Abfrageteil, die Seite ist in Du-Form geschrieben, und die
kommunalen Widgets stehen hinter acht Deutschland-Widgets.

**Der Platzhalter der Auszeichnung steht nur, wo eine kommt.** Die Seite fragt
beim Aufbau eine Ja/Nein-Frage (`hatAuszeichnung`); die Rangdaten selbst lädt die
Kachel weiter im Browser nach. Ohne das Kennzeichen gäbe es nur zwei schlechte
Antworten — nie ein Platzhalter (der Inhalt springt beim Eintreffen) oder immer
einer (er springt bei den rund zwei Dritteln der Orte ohne Auszeichnung, nur
andersherum). **Die naheliegende Abkürzung ist falsch:** „öffentlich erreichbar
sind ohnehin nur angeschriebene Orte" — die Freigabe steuert die INDEXIERUNG,
nicht die Erreichbarkeit; über den Atlas kommt man auf jede der 11.000 Seiten.
