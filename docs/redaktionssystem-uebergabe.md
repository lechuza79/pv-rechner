# Redaktionssystem — Übergabe

**Auftrag des Betreibers (26.08.2026):** Die Entwicklungsansicht wird zum Design-Werkzeug
umgebaut. Kategorien als Navigation oben, darunter je Kategorie eine kurze Beschreibung und
mehrere Stories. Je Kategorie wird das Design ausgearbeitet — Diagrammform, Typografie, Farbe.
Danach Varianten umschalten (Farbschema, „Highlight" mit blauem statt weißem Grund) und die Kette
Bearbeiten → Planen → Senden → Auswerten.

**Reihenfolge ausdrücklich:** Erst das Beschriebene bauen, dann die offenen Punkte am Ende dieses
Dokuments bewerten. Nicht umgekehrt.

**Stand 27.08.2026 (Abend): das Design-Werkzeug steht, die Kette dahinter nicht.**
Was jetzt geht: Raster über alle Beiträge, Kategorien als Wähler je Bereich, Template + Farbschema
je Beitrag umschaltbar, Speichern in einem Zug, Prüfstand sichtbar. Was fehlt: die Freigabe lässt
sich nirgends ERTEILEN — und daran hängt Planen und Senden. Zwei Folgesitzungen sind dafür
verabredet (Templates weiterbauen · Freigabe → Planen → Autopost → Auswertung).

**Der frühere Umbau steht** (Kategorien-Navigation, Design je Kategorie, Farbschema an der
Karte, Prüfung über Text UND Bild). Was dabei entstanden ist, steht unten unter „Der Umbau";
was danach zu bewerten ist, unverändert am Ende.

---

## Was steht (nicht neu bauen)

**Sechs Datengeschichten**, alle aus dem Anlagenregister gerechnet (`lib/social-posts.ts`):
Stadt gegen Land bei Balkonkraftwerken · Balkon-Wachstum gegen Solar-Wachstum · Freiflächenanteil
je Bundesland · Aufteilung privat/Gewerbe/Freifläche · Fünf-Jahres-Wachstum je Land · Gemeinden mit
mehr Kilowatt als Einwohnern.

**Die Zahlen** kommen gebündelt aus `lib/social-kennzahlen.ts` (einmal täglich gecacht, Abfrage
über alle rund 10.700 bewohnten Gemeinden).

**Das Kartenbauteil** `components/social/SocialKarte.tsx` mit zwei Größenstufen und zwei
Bildarten (Vergleich, Einzelkennzahl).

**Die Feed-Vorschau** `components/social/FeedVorschau.tsx` — Kopfzeile, Text gekappt, Bild.

**Der Vorlagen-Editor** `components/social/VorlagenEditor.tsx`, bisher an einer Story.

**Die LinkedIn-Anbindung** (`lib/linkedin.ts`): Login, Zugangsschlüssel mit Ablaufwarnung,
Textbeitrag, Bild-Upload, Erwähnung der Unternehmensseite, erster Kommentar mit dem Link.

**Die Prüfstufe** (`lib/social-pruefung-kern.ts`): zwei Prüfungen je Beitrag, ohne sie kein Versand.

**Die Ansicht** `app/(site)/admin/redaktion/` mit Entwicklung, Planung, Auswertung.

---

## Sieben Dinge, die schon Geld gekostet haben

**1. Die Karte hat STUFEN, keinen Maßstab.** Eine 1080er Karte auf 240 Pixel herunterzurechnen
macht die Quellenzeile fünf Pixel groß. Die kleine Stufe lässt deshalb weg (kein Untertitel, keine
Fußzeile, eine Zahl statt zwei) und setzt ihre Schriftgrößen absolut. Wer eine dritte Größe
braucht, ergänzt eine Stufe — er skaliert nicht.

**2. Text und Bild kommen aus EINER Berechnung.** Das ist der Kern des ganzen Systems: Ein Post
kann keine Zahl behaupten, die das Diagramm daneben widerlegt. Wer das Bearbeiten ausbaut, hält
diese Eigenschaft — dafür gibt es die Platzhalter (`lib/social-vorlage.ts`). Im bearbeitbaren Text
stehen Namen, die Werte setzt die Berechnung ein.

**3. Die Bildaussage darf nicht doppelt stehen.** Im Feed trägt die Karte ihre Aussage als Titel;
im Teaser stand sie zusätzlich als Text darunter — dieselbe Zeile zweimal auf 240 Pixeln.

**4. Rundung gehört zur Aussage.** Der Text sagte „8 Prozent", das Bild zeigte „8,1" — aus
derselben Zahl. Die Nachkommastellen stehen deshalb je Serie am Bild und müssen zur Formulierung
passen. Ein Test allein findet das nicht; sichtbar wurde es erst am gerenderten Bild.

**5. Ein Balkenpaar taugt nur, wenn die Längen auseinandergehen.** 1,20 gegen 1,45 Millionen sind
zwei fast gleich lange Balken über ein Fünftel Wachstum. Dafür gibt es die Einzelkennzahl.

**6. Gruppen werden benannt, nicht aus der Sortierung erraten.** Ein Satz nahm die letzten zwei
Einträge einer sortierten Liste und nannte sie „die Stadtstaaten" — richtig, solange die Sortierung
mitspielte, und falsch beim ersten Datenstand, an dem sie es nicht tat.

**7. Kein Superlativ auf kleiner Grundmenge.** Steht im Redaktionsplan
(`lib/redaktionsplan.ts`) neben sieben weiteren Regeln, jede aus einem echten Fehlgriff.

---

## Drei Korrekturen des Betreibers, die in den Umbau gehören

**A. Die Prüfung muss BILD UND TEXT prüfen — GESCHLOSSEN (27.08.2026).**
Der Fingerabdruck hing allein am Text. Wer den Kartentyp, eine Serie, die Rundung oder das
Farbschema änderte, behielt eine Freigabe für ein Bild, das so nie geprüft wurde — und das Bild ist
der Teil, der beim Weiterteilen mitreist. `fassungsAbdruck` deckt jetzt beides ab.
**Über ALLE Felder des Bildes, nicht über eine Aufzählung der heute bekannten:** Eine Aufzählung
müsste jemand pflegen und würde beim nächsten Feld vergessen, ohne dass irgendwo etwas rot wird.
Ein Test legt dem Bild deshalb ein erfundenes Feld bei und verlangt, dass die Freigabe verfällt.
**Was man dabei wissen muss:** Bewegt sich der Datenstand, bewegen sich die Werte im Bild, und die
Freigabe verfällt. Das ist beabsichtigt — die Zahlenprüfung galt genau diesen Zahlen.

**B. „Text zuerst, die ersten zwei Zeilen tragen alles" war zu absolut.**
Richtig ist: Bild und Text tragen **zusammen**. Der Feed zeigt den Text oben und kappt ihn, das
Bild steht darunter — aber wer nur auf die ersten zwei Zeilen optimiert, baut Textbeiträge mit
Beiwerk statt Beiträge, in denen beides zusammenwirkt. Beim Design je Kategorie ist genau dieses
Zusammenspiel der Gegenstand.

Umgesetzt: Der Editor hatte eine eigene Textvorschau neben dem Feld, also dieselbe Zeile zweimal —
einmal ohne Bild. Die ist weg; was im Feld steht, läuft in der Feed-Vorschau mit, zusammen mit dem
Bild. Beurteilt wird nur noch die Ansicht, die es im Feed wirklich gibt.

**C. Die Datengeschichten sollen die Website aufwerten — nur später.**
Der erste Anlauf (Teaser plus Fenster auf dem Balkon-Einstieg) wurde zurückgenommen, weil er
overengineered war und weil die Story-Themen kein messbares Suchvolumen haben. **Das heißt nicht,
dass der Inhalt der Website nichts bringt.** Der Betreiber will es verschoben, bis das Posten
steht — nicht verworfen. Beim Wiederaufgreifen ist der belegte Stand: Verborgener Text im HTML
wird indexiert (Googles Spam-Richtlinie nennt Akkordeons ausdrücklich als zulässig), Adress-Anker
gelten nicht als eigene Adressen, und die Fragen mit Nachfrage sind Bestandsfragen („wie viele
Balkonkraftwerke gibt es in Deutschland", 90 Suchen im Monat) — dafür läuft eine eigene Sitzung.

---

## Was der Betreiber sich vorstellt, in seinen Worten

> „den text komplett entfernen. dafür unsere kategorien kurz oben als nav, darunter die
> beschreibung und jeweils x stories. dafür arbeiten wir jeweils das design aus (hier in der app,
> charting, typo usw.). wenn das steht kann ich ggfs. dort themes umschalten oder z.b. sowas machen
> wie ‚highlight' was dann blauen statt weißen bg hat. auf edit kann ich dann ggfs. den text
> editieren > dann post planen > autopost > auswertung auto"

**Der Hinweis dazu, umgesetzt:** Farbschema und „Highlight" sind Eigenschaften der KARTE, nicht der
Ansicht. Sie stehen deshalb am Bild (`PostBild.stil`), werden mit ihm gespeichert und gehen von
selbst in den Fingerabdruck ein. Sonst zeigt das Werkzeug etwas anderes, als später rausgeht.

---

## Der Umbau (27.08.2026)

**Der einleitende Absatz ist weg.** Oben steht eine Leiste mit vier Kategorien und der Zahl ihrer
Stories, darunter die Beschreibung der gewählten Kategorie und ihre Stories.

**Eine Kategorie ist eine AUSSAGEFORM, kein Ablagefach** (`lib/redaktions-kategorien.ts`): Kontrast,
Bewegung, Aufteilung, Größenordnung. Jede sagt, was sie behauptet und woran sie scheitert, und trägt
den Vorgabe-Stil für ihre Stories — das ist das „Design je Kategorie". Weicht eine Story davon ab,
sagt der Tisch das dazu; ohne diese Anzeige wäre die Vorgabe eine Behauptung.

**Was die Kategorie ausdrücklich NICHT vorschreibt, ist die Bildform.** Ob ein Balkenpaar oder eine
Einzelkennzahl trägt, entscheidet sich an den Zahlen, nicht am Thema — 1,20 gegen 1,45 Millionen
sind zwei fast gleich lange Balken über ein Fünftel Wachstum, und derselbe Beitrag braucht dann die
Einzelkennzahl, obwohl er eindeutig von Bewegung handelt. Eine Kategorie, die die Form vorschreibt,
würde entweder gebrochen oder erzwänge ein Bild, das nichts zeigt.

**Die neunzehn Geschichten-Familien sind in die Planung gezogen.** Sie sind Themen und schneiden
quer zu den Kategorien: Balkonkraftwerke liefern sowohl einen Kontrast als auch eine Bewegung. Eine
Zuordnung Familie → Kategorie wäre in beiden Richtungen falsch gewesen.

**Drei Farbschemata je Karte:** Hell, Dunkel, Highlight. Der Highlight-Blauton ist NICHT der
Akzent-Blauton der Site — auf dem käme gedämpftes Weiß nur auf 3,9:1 und die Beschriftung unter den
Balken wäre nicht mehr lesbar; auf dem tieferen Markenblau sind es 6,0:1 und für volles Weiß 10,1:1.
Dabei drehen sich die Rollen um: Auf blauem Grund sticht Weiß hervor, nicht ein helleres Blau — der
hervorgehobene Wert wird deshalb weiß, der gewöhnliche gedämpft. Sonst stünde die Betonung auf der
falschen Zahl, und das fällt an einer einzelnen Karte niemandem auf.

**Die Karte bringt ihr Farbschema selbst mit.** Vorher hing das an der Vorschau, die sie in die
hellste Tagesstufe wickelte; wer die Karte woanders rendert oder als Bild aufnimmt, bekam die
Tagesstufe der Seite.

**Ein Umschalter, dessen Speichern scheitert, nimmt die Farbe zurück.** Beim Ausprobieren
aufgefallen: Die Fehlermeldung stand da, die Karte war trotzdem blau — dieselbe Lücke wie oben, nur
eine Etage höher. Die Vorschau darf nichts zeigen, was nicht in der Ablage steht.

**Der Text kommt beim Senden NICHT mehr vom Browser** (`/api/linkedin/post`). Er wird dort aus
denselben Kennzahlen und derselben gespeicherten Fassung neu gebaut. Sonst wäre die Prüfung nur so
gut wie das, was der Aufrufer behauptet: Wer den geprüften Text schickt und ein anderes Bild
aufnimmt, käme durch. Das Bild selbst entsteht weiter im Browser und ist so nicht abzusichern —
absicherbar ist der Abgleich: Der Aufrufer schickt den Abdruck der Fassung, die er aufgenommen hat,
und weicht er vom eigenen ab, wird nicht gesendet.

**Eine Ablagezeile je Story hält Text UND Farbschema** (`social_vorlagen`, Spalte `stil`). „Text
zurücksetzen" löscht deshalb nicht mehr die Zeile — das Farbschema ist eine eigene Entscheidung.

**Nach dem Deploy einmal `/api/social/setup` aufrufen.** Er legt die Spalte `stil` an und benennt
`social_pruefungen.text_fingerabdruck` in `fassung_fingerabdruck` um. Ohne diesen Lauf schlägt jedes
Speichern fehl. Alte Abdrücke werden dabei NICHT umgerechnet — sie decken das Bild nicht ab und sind
damit keine Freigabe für das, was heute rausginge. Sie verfallen, und das ist die sichere Richtung.

**Noch nicht verdrahtet:** Eine Prüfung erteilen kann die Oberfläche nicht — es gibt keinen Weg,
`speicherePruefung` aufzurufen, und damit auch keinen Sende-Knopf. Der Tisch ZEIGT den Prüfstand je
Story und rechnet ihn bei jeder Änderung neu, damit sichtbar ist, dass die Sperre wirkt. Das
Erteilen gehört zur Kette „planen → senden", die der Betreiber als nächsten Schritt genannt hat.

## Das Template-System (27.08.2026)

**Ein Template ist Bildform × Farbschema**, und beliebig viele Beiträge hängen daran — „Säule
hell", „Ringpaar Highlight", „Gefüllte Umrisse hell". Vier sind abgenommen. Fünf Bildformen gibt es
(Balken, Einzelkennzahl, Ringpaar, Säule, gefüllte Umrisse), jede mit ihrer Regel an einer Stelle:
Wofür sie taugt, und unter welcher Bedingung sie TRÄGT. Der Umschalter im Redaktionstisch liest
diese Regel und bietet nur an, was für die Zahlen des Beitrags passt.

**Die Regel, an der alles hängt: Ring und gefüllter Umriss brauchen ein GANZES, die Säule das
Fehlen eines.** Ein Ring bildet einen Anteil ab; ohne Ganzes behauptet der leere Rest etwas, das es
nicht gibt. Eine Säule zeigt ein Verhältnis zwischen zwei Werten; mit einem Ganzen wäre ihr Sockel
plötzlich ein Anteil. Normiert wird bei Anteilen am Ganzen, nie am größeren Wert — sonst steht der
Spitzenreiter immer randvoll, ob er bei 70 oder bei 7 Prozent liegt.

**„Gestaltet" ist kein Häkchen.** Es folgt aus der Frage, ob ein Beitrag ein abgenommenes Template
verwendet. Zwei frühere Fassungen waren falsch: ein handgesetztes Flag (steht irgendwann auf
„fertig" an etwas, das niemand angesehen hat) und „hat jemand im Browser geklickt" (die im Code
gestalteten Beiträge standen dann unter „roh").

**Flächenfarben und Textfarben sind getrennt.** Solange beide an einem Token hingen, konnte man nur
eines von beidem haben: heller gedämpfter Ring hieß keine Unterscheidung mehr, dunkler Ring hieß
matte Werte. Zwei Serientöne je Farbschema, alle Flächen lesen daraus.

**Im Highlight-Schema sind Flächen VOLLTON, nie durchscheinend.** Ein Bogen mit runder Kappe
überlappt sich an seinem Ende selbst; bei durchscheinender Farbe addiert sich die Deckkraft genau
dort, und das Ende trägt einen hellen Klecks. Reiner Text darf durchscheinen, er überlappt sich
nicht.

**Die Kennung trägt das Familienkürzel** (`g14-freiflaeche-ost-west`), damit sie in derselben
Ordnung sortiert wie die Ansicht. Template und Farbschema können NICHT hinein — sie sind
umschaltbar, und eine Kennung, die sich beim Umfärben ändert, verliert ihre gespeicherte Fassung.
Der Kopier-Knopf liefert deshalb beides nebeneinander: Kennung plus Template.

## Was diese Runde an Zahlen gefunden hat

**Eine Registerspalte zählt SPEICHERGERÄTE, nicht Anlagen mit Speicher.** Als Anteil beschriftet
kam ein Bundesland auf 98 Prozent und der Bund auf 67 — beides las sich plausibel und war falsch.
Ein Haushalt kann mehrere anmelden, und ein Balkonspeicher hat gar keine Dachanlage. Es heißt jetzt
„Heimspeicher je 100 private Dachanlagen", ein Verhältnis. **Gefunden hat das keine Prüfung,
sondern das Hinsehen auf ein gerendertes Bild.**

**Der Wächter dagegen prüft die MECHANIK, nicht den Wortlaut**: kein Prozentzeichen an einer
Speicherzahl, kein Ganzes am Bild. Eine erste Fassung suchte nach den Wörtern „Anteil" und „Quote"
und schlug bei dem Satz an, der genau das ausdrücklich verneint.

**Vierzehn Beiträge, elf von zwanzig Familien belegt.** Vier Familien fehlen die Daten wirklich
(Tageswert braucht Wetter-Kopplung, Zubau den Anschlussmonat, Ungebautes den Gebäudebestand,
Wärmepumpe den KfW-Report), eine ist zurückgestellt. Machbar wären als Nächstes: Geld (braucht
Jahrgänge im Bestand), Preis, Zuruf, Fehler, Funktion.

## Betrieb


**Lokal entwickeln, nicht auf die Hauptlinie schieben.** Der Betreiber hat das ausdrücklich
verlangt: Jede Runde auf `main` kostet Bauminuten für eine Ansicht, die noch in Arbeit ist. Dev-Server
mit eigenem Port starten, Abnahme im Browser, erst dann mergen.

**Die Umgebungsdatei fehlt in frischen Arbeitskopien** — ohne sie scheitert der Produktionsbau an
den Atlas-Seiten, nicht am eigenen Code.

**Zugangsdaten stehen bei Vercel:** `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`,
`LINKEDIN_ORG_URN`. Der Zugangsschlüssel liegt in der Datenbank und läuft alle zwei Monate ab; der
Gesundheitscheck warnt gestaffelt vorher.

**Tabellen:** `social_konten`, `social_pruefungen`, `social_vorlagen` — angelegt über
`/api/social/setup` (Admin-Session oder Cron-Schlüssel).
