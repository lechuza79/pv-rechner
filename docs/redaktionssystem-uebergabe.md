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
hell", „Ringpaar Highlight", „Gefüllte Umrisse hell". Vier sind abgenommen. Acht Bildformen gibt es
(Balken, Einzelkennzahl, Ringpaar, Säule, gefüllte Umrisse, Rangliste, Aufteilung, Verlauf), jede
mit ihrer Regel an einer Stelle: Wofür sie taugt, und unter welcher Bedingung sie TRÄGT. Der
Umschalter im Redaktionstisch liest diese Regel und bietet nur an, was für die Zahlen des Beitrags
passt. Die drei zuletzt dazugekommenen sind noch kein Template — siehe unten.

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

## Drei neue Bildformen (27.08.2026, abends)

**Acht Formen statt fünf: dazu Rangliste, Aufteilung, Verlauf.** Keine davon ist ein
abgenommenes Template — sie sind über den Umschalter erreichbar, die Abnahme steht aus.

**Geprüft wurde am BESTAND, nicht an der Idee** — das war die Vorgabe, und sie hat zwei der drei
Formen zurechtgestutzt. Ergebnis der Messung (`npm run social:zahlen`, dann `npm run social:formen`):

- **Rangliste** trägt zwei Beiträge (Freiflächenanteil, Privatdach-Anteil) und weist zwei ab.
- **Aufteilung** trägt einen (die drei Solarsegmente) und weist einen ab.
- **Verlauf** trägt einen (Pro-Kopf-Vergleich mit dem Ausland) — die einzige Story mit einer echten
  Zeitreihe dahinter. Die Registerzahlen kennen nur Stichtage.

**Die Reihe ist keine zweite Liste** (`PostBild.reihe`). Die Serien sind die zwei Werte, die der
Beitragstext nennt; die Reihe ist die Menge, aus der sie stammen. Ein Test verlangt, dass jede Serie
darin vorkommt — mit demselben Wert. Ohne diese Bindung wären es zwei Listen, die beim nächsten
Datenstand auseinanderlaufen.

**Zwei Bedingungen, die am Bild entstanden sind und ohne Bild nicht gefunden worden wären:**

- **Eine Rangliste braucht ABSTAND.** „Ein Balkenpaar taugt nur, wenn die Längen auseinandergehen"
  gilt bei sechzehn Werten genauso — nur sieht man den Verstoß dort nicht: Zwei fast gleich lange
  Balken fallen auf, sechzehn liest man als Liste und hält sie für eine Aussage. Gemessen (kleinster
  Wert als Anteil des größten): Freifläche 1 %, Privatdach 18 %, Wachstum 22 %, Balkonquote 26 %,
  Heimspeicher 58 %. Die Schwelle steht bei 40 % und trennt den Speicher-Fall ab.
- **Eine Reihe, die nicht bei null beginnt, ist keine Länge** (`PostBild.nullpunkt`). Ein
  Wachstumsfaktor startet bei 1. Beide Zeichenweisen ausprobiert und beide sind falsch: ab 1
  gezeichnet füllt Thüringen (1,75) 22 Prozent von Hamburg (4,38) — richtig als Zuwachs, aber wer
  die beiden Zahlen ins Verhältnis setzt, kommt auf 40 und liest im Balken einen Fehler. Ab 0
  gezeichnet stimmt die Länge mit den Zahlen und verzerrt die Aussage. Deshalb gar keine Balkenform
  für solche Reihen. **Die Säule hat dasselbe Problem und wurde nicht angefasst** — sie ist
  abgenommen; siehe offene Punkte.

**Die Rundung ist eine Eigenschaft der REIHE, nicht der einzelnen Zahl.** Zwei Fälle, beide nur im
Bild sichtbar: Berlin und Hamburg standen als „0 %" da (tatsächlich 0,4) neben einem Balken, der
sichtbar nicht null war; und Schleswig-Holstein (50,2) stand neben Sachsen (50,0) mit derselben Zahl
bei verschieden langen Balken. `ranglistenStellen` erhöht deshalb um eine Stelle, wenn ein Wert auf
null fiele oder zwei Ränge ununterscheidbar würden. **Der Balken zeigt die ANGEZEIGTE Zahl**, nicht
den Rohwert — sonst widerspricht die Grafik der Beschriftung, und im Zweifel glaubt man der Grafik.

**Zwei verschiedene Werte dürfen in KEINEM Bild dieselbe Zahl tragen.** Ich hatte diese Regel
zweimal gebaut — einmal für die Rangliste, einmal unvollständig für die Aufteilung — und für die
übrigen Formen gar nicht. Eine parallele Sitzung hat den offenen Fall gemessen: Im Balken des
Aufteilungs-Beitrags standen Gewerbedach (35,04) und Freifläche (35,25) als zweimal „35", während
der Text daneben beide unterschied. Zwei Balken verschiedener Länge mit derselben Zahl lesen sich
als Fehler in der Grafik, und im Zweifel glaubt man dem Balken. Ausdrücklich nur bei
**verschiedenen** Werten — zwei Länder, die wirklich gleich stehen, dürfen dieselbe Zahl tragen.

**Und die Grenze dazu, weil sie zählt:** Ob zwei Werte bei einem Datenstand auf dieselbe Zahl
fallen, entscheidet der Datenstand, nicht der Code. Ein Test mit festen Testwerten kann das nicht
garantieren — er hält nur die Mechanik fest. Die Werkbank prüft es deshalb an den **echten** Zahlen
und meldet; gemeldet und nicht behoben, weil die nötige Rundung eine redaktionelle Entscheidung ist.
Einen Lauf, der bei jedem neuen Datenstand von selbst meldet, gibt es dafür **nicht** — die
Freigabe-Sitzung nimmt den Abgleich in ihre Prüfkette vor dem Senden auf, und dort zählt er. Die
beiden Prüffunktionen sind exportiert, damit niemand sie nachbaut.

**Eine Aufteilung muss aufgehen.** Als ganze Prozente standen in der Legende 35 + 35 + 28 + 1 = 99
neben einem vollen Balken. `aufteilungsStellen` wählt die Genauigkeit so, dass die gezeigten Teile
das Ganze ergeben. Und der Rest zum Ganzen wird **mitgezeichnet und benannt** (`restLabel`) — bei
den Solarsegmenten sind es 1,2 Prozent, im Wesentlichen Steckersolar. Ohne Namen wäre er eine Lücke,
über die das Bild nichts sagt.

**Zwei überlappende Anteile sind keine Aufteilung.** Bei den Förderlücken sind es 21 und 20 Prozent
derselben Programmmenge — ein Programm kann beides haben. Gestapelt behauptete das Bild, sie
ergänzten sich. `schoepftAus` weist das ab.

**Die Aufteilung beschriftet IM Segment, nicht in einer Legende — wegen des Highlight-Schemas.**
Erste Fassung: Balken oben, Legende darunter, Teile über absteigende Deckkraft unterschieden. Im
hellen Schema sah das gut aus und war im Highlight kaputt: Auf blauem Grund wird aus einer
durchscheinenden Fläche wieder Blau, zwei Segmente standen als fast gleiche Töne nebeneinander, der
Rest verschwand. Die Regel des Farbschemas sagt genau das — im Highlight sind Flächen Vollton. Ein
Segment, das seinen Namen trägt, braucht die Farbe zur Unterscheidung nicht, und damit fällt die
Legende weg.

**Steckersolar ist der VIERTE Teil der Solarleistung, nicht ein Rest.** Zuerst als Differenz
gerechnet und mit „vor allem Steckersolar" beschriftet — eine Überschlagsrechnung, keine Messung.
Das Register führt jede Solaranlage in genau einem Segment, und Steckersolar ist eines davon; die
Zahl steht als eigene Spalte in der Gemeinde-Auswertung. Nachgemessen: 36,203 + 44,544 + 44,808 +
1,560 = 127,115 GWp, unerklärter Rest exakt null. Die Aufteilung zeigt jetzt vier gemessene Teile.
**Die Vermutung war richtig und trotzdem falsch am Platz** — eine ungeprüfte Sachaussage im Bild ist
genau die Sorte Fehler, gegen die dieses Modul gebaut ist. Aufgefallen ist es einer parallelen
Sitzung, nicht mir.

**Dass die Rechnung aufgeht, ist eine Eigenschaft der QUELLE — und die wird jetzt nachgehalten.**
Die vier Teile ergeben das Ganze nur, solange die Erfassung jede Anlage in genau ein Segment legt.
Kommt eines dazu oder wird eines doppelt gezählt, stimmt das Bild nicht mehr, und im Code wird
nichts rot. Die Bildform fiele zwar von selbst weg (die Teile schöpfen das Ganze nicht mehr aus) —
aber **still**, und ein Beitrag, der seine Darstellung verliert, fällt niemandem auf. Die
Plausibilitätsprüfung des Datenlaufs hält die Summe deshalb gegen die Gesamtleistung und wird rot;
sie läuft ohnehin nach jedem Einlesen. Toleranz ein Promille — das kleinste echte Segment trägt
1,2 Prozent und liegt gut zehnfach darüber. Gegenprobe gemacht: Ein weggelassenes Segment meldet
1,23 Prozent Abweichung.

**Zwei Fehler im Bestand, gefunden beim Ansehen der Bilder:**

- **Anteile ohne Bezugsgröße.** Die drei Solarsegmente sind Prozentwerte, trugen aber kein `ganzes` —
  der Balken normierte am größten der drei. Das private Dach mit 28,5 Prozent bekam vier Fünftel der
  Länge, während die Überschrift daneben „nur gut ein Viertel" sagte. Ein Test verlangt jetzt: Wo
  Prozentwerte stehen, steht ihre Bezugsgröße am Bild.
- **Eine Jahreszahl mit Tausenderpunkt.** „Wind- und Solarstrom je Einwohner, 2.024" im Bild und
  „Stand 2.024" im Text — durch die Zahlenformatierung geschickt, die für Mengen gedacht ist.

**Ein Superlativ, den niemand gerechnet hatte.** Der Speicher-Beitrag sagte, das 1,7-fache sei „der
größte Unterschied zwischen den Ländern, den wir im Bestand finden. Größer als beim Zubau, größer
als bei der Anlagengröße". Nachgemessen ist es der **kleinste**: Freiflächenanteil 188-fach, Leistung
je Kopf 9-fach, Balkonquote 3,8-fach, Wachstum 2,5-fach. Der Satz vergleicht die Spannen jetzt
selbst und kippt mit ihnen. Dieselbe Klasse wie das erfundene Ost-West-Gefälle im Katalog, nur eine
Ebene tiefer versteckt — **jede vergleichende Aussage über die Länder gehört gerechnet.**

## Die Templates sind ein Bereich der Redaktion (28.08.2026)

**Unter „Redaktion → Templates", nicht als lose Datei daneben** (Betreiber: „wieso sind die
eigentlich wieder irgendwo im Äther?"). Zwei Ansichten, und die Trennung ist der Arbeitszustand:
**Bibliothek** zeigt, was abgenommen ist — die Referenz, an der sich das nächste Design misst.
**Neu entwickeln** zeigt die Formen ohne abgenommene Variante, darunter die Beiträge, die eine
ungeprüfte Kombination verwenden. Das ist der Arbeitsvorrat, nicht der Bestand.

**Je Form eine Zeile, darin die drei Farbvarianten** — das ist die Einheit, die abgenommen wird, und
die Ansicht, in der man sieht, ob ein Design in allen drei Schemata trägt. Genau dort saßen die
Fehler der letzten Runden, beide nur im Highlight sichtbar.

**Jede Variante trägt eine Kennung** (`ringpaar-dunkel`), auch die nicht abgenommenen: Man muss über
eine Variante reden können, bevor sie einen Template-Namen hat — sonst hat gerade das, woran
gearbeitet wird, keinen Namen. Sie hängt NICHT am Anzeigenamen, sonst wanderte sie beim Umbenennen
mit und ein Verweis von gestern zeigte auf etwas anderes.

**Die Karte wird immer in Ausgabegröße gerendert und nur für die Anzeige verkleinert.** Nicht
kleiner gerechnet: Dann bricht der Text an anderen Stellen um als im ausgelieferten Bild — der
Lizenzvermerk brach so mitten im Kürzel, im echten Bild sauber dahinter. Wer eine verkleinert
gerechnete Karte beurteilt, beurteilt eine, die es nicht gibt.

**Die Kommandozeilen-Fassung bleibt** (`npm run social:zahlen`, dann `npm run social:formen`) und
rendert **dieselbe Komponente** — sie ist der Weg, ein Design ohne Anmeldung anzusehen, und der
einzige Ort, an dem die Rundungsprüfung gegen die echten Zahlen läuft. Zwei Fassungen derselben
Ansicht würden driften. `FORM=` zeigt eine Form größer und schreibt in eine EIGENE Datei — sonst
überschreibt die gefilterte Ansicht die Übersicht, was zweimal passiert ist. Sie steht fest auf der
hellsten Tagesstufe, sonst erbt sie die Uhrzeit und wird abends unlesbar.

**Ihre Ausgabe gehört NICHT nach `public/` — BLOCKER.** Sie lag dort zwischenzeitlich, damit der
Dev-Server sie ausliefert, und war damit über eine Adresse erreichbar, die kein Zugang schützt
(Betreiber, 28.08.2026: „ohne Login brauchen wir nicht, was soll das? das ist eine Lücke"). Dass
eine `.gitignore`-Zeile sie vom Deploy fernhielt, ist ein Geländer und keine Grenze: Ein
`git add public/` hätte sie live gestellt, und niemand hätte es bemerkt. Das Skript weist ein Ziel
in `public/` jetzt ab, statt sich auf eine Regel zu verlassen, an die jemand denken muss.

**Was der Testlauf NICHT konnte, bis er nachgeschärft wurde:** Die Enge-Schwelle war zunächst gegen
sich selbst geprüft (`reihenEnge(...) < RANGLISTE_MAX_ENGE`) — auf 0,99 hochgesetzt blieb alles
grün. Und die Testdaten trugen für alle Länder denselben Speicherwert, also gab es gar keine
Verteilung zu prüfen. Beides behoben, beide Gegenproben laufen. **Wer hier eine Schwelle ändert,
macht den Test einmal absichtlich kaputt und sieht nach, ob er rot wird.**

**Der Quellenvermerk kommt aus dem Quellenregister, nicht aus der Tastatur.** Beide Zeilen waren
getippt, und sie wichen **verschieden** ab: Die Anlagenregister-Fassung ließ die Lizenz ganz weg
(„Marktstammdatenregister (Bundesnetzagentur), Stand …" ohne „dl-de/by-2-0"), die Ember-Fassung
schrieb einen anderen Änderungshinweis als das Register. Welche stimmte, hing daran, wer die Zeile
gerade schrieb. Der Vermerk steht im **Bild** — also in dem Teil, der beim Weiterteilen mitreist und
für den die Lizenzpflicht überhaupt der Grund war.

**Der Test hatte die Lücke selbst offen gelassen:** Er verlangte „dl-de/by-2-0 ODER CC BY 4.0 ODER
Bundesnetzagentur" und nahm damit den Behördennamen als Ersatz für eine Lizenz. Zwei Prüfungen jetzt:
eine Lizenz ohne Ersatzbedingung, und der Vermerk muss mit einem Registereintrag beginnen. Gefunden
hat es eine parallele Sitzung, kein Test.

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

**`server-only` liegt als Entwicklungs-Abhängigkeit im Projekt.** Next löst den Import selbst auf,
außerhalb des Bundlers gibt es ihn nicht — die Werkbank braucht ihn deshalb, und `npm run
social:zahlen` läuft mit `--conditions react-server`, damit der leere Einstiegspunkt greift statt
des werfenden.

## Offen für die nächste Runde

**Die Säule rechnet ihren Sockel ohne Nullpunkt.** Beim Fünf-Jahres-Wachstum steckt Thüringen
(1,75-fach) als Sockel in Hamburg (4,38-fach) und füllt 40 Prozent der Höhe — als Verhältnis der
Faktoren richtig, als Bild über den Zuwachs (75 gegen 338 Prozent) irreführend. Dasselbe Problem,
wegen dem die Rangliste solche Reihen ablehnt. **Nicht angefasst, weil „Säule hell" ein abgenommenes
Template ist** und die Änderung an einer Karte sichtbar wäre, die der Betreiber schon freigegeben
hat. Gehört ihm vorgelegt, nicht still repariert.

**Bild und Text runden beim Freiflächen-Beitrag verschieden.** Der Text sagt „70 Prozent" und
„9 Prozent", die Rangliste zeigt 70,3 und 9,1 — sie MUSS die Stelle zeigen, sonst stünden Berlin und
Hamburg als „0 %" da. In den anderen Formen desselben Beitrags steht weiter 70. Zwei Auswege: den
Text auf eine Nachkommastelle bringen (dann überall gleich, liest sich im Fließtext technischer) oder
es so lassen (eine Tabellenzeile ist keine Kernaussage). Betreiber-Entscheidung, weil sie die
Formulierung betrifft.

**Die drei neuen Formen sind keine Templates.** Sie stehen im Umschalter, aber `TEMPLATES` kennt sie
nicht — „gestaltet" bleibt an den vier abgenommenen hängen. Das ist Absicht: Abnahme ist keine
Sache, die eine Sitzung sich selbst erteilt.
