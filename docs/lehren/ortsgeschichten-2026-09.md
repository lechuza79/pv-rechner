# Ortsgeschichten auf den Gemeindeseiten — was schiefgelaufen ist (05.09.2026)

Auftrag des Betreibers, am Anfang der Sitzung in einem Satz gestellt: die
Gemeindeseite **einfacher verständlich** machen, **besseres Charting**, und das
**Einbetten und Herunterladen direkt auf der Seite** — vor dem nächsten
Outreach-Schub. Daraus wurde ein Story-Feed je Gemeinde, gespeist aus den
**vorhandenen** Kategorien des Datenstory-Katalogs.

Herausgekommen ist: sieben Story-Familien je Ort, ein Slider mit Endlosschleife,
ein Einbetten-Dialog mit fertigem Code für DIESEN Ort, ein Skelett für die
Platzierungen — und ein **ausgeblendeter Block**, weil das Bild fehlt.

Dieser Bericht ist die Fehlerliste dazu. Die Regeln, die daraus folgen, stehen in
CLAUDE.md unter „Ortsgeschichten auf den Gemeindeseiten"; hier steht, was sie
gekostet hat.

---

## 1. Die teuersten Fehler waren keine Codefehler

### 1.1 Die Eingangsansage viermal nicht umgesetzt

Der Betreiber hat denselben Auftrag im Lauf der Sitzung **viermal** wiederholen
müssen. Seine Sätze, in Reihenfolge:

- „alter, das hatte ich doch eingangs erklärt?!"
- „du solltest nix neu erfinden, sondern einfach das aus den datenstories ziehen.
  ich will das syncen bzw. zentralisiert nutzen und recyclen"
- „nicht parallel was neues bauen"
- „nein lass sie drin und mach jetzt endlich das was ich von anfang an gesagt hab"

Jedes Mal war der Auslöser derselbe: Ich habe eine **eigene Fassung** von etwas
gebaut, das es zentral schon gab — eigene Story-Logik statt der Katalog-Kategorien,
eigene Bildformen statt der abgenommenen Vorlagen, eigene Zeichnung im Modal statt
der Redaktions-Karte.

**Die Lehre ist nicht „besser zuhören".** Sie ist konkreter: Wenn ein Auftrag das
Wort „recyceln", „zentral" oder „aus X ziehen" enthält, ist der ERSTE Arbeitsschritt,
das vorhandene X zu öffnen und zu lesen — nicht, die Aufgabe zu lösen und danach zu
prüfen, ob etwas Ähnliches existiert. Beim zweiten Weg entsteht immer eine zweite
Fassung, und sie sieht immer plausibel aus.

### 1.2 Gebaut, ohne zu zeigen

Der Betreiber musste sagen: „mach einfach mal was, ich muss das sehen um zu
entscheiden." Ich hatte zu diesem Zeitpunkt lange über Struktur und Schwellen
gearbeitet, ohne dass er etwas im Browser hatte. Eine Entscheidung über Aussehen
kann er nur an etwas Sichtbarem treffen — vorher ist jede Frage an ihn eine, die
er nicht beantworten kann.

### 1.3 „Vorflug-Prüfung"

Ich habe „preflight" wörtlich eingedeutscht. Der Betreiber: „was ist eine
vorflug-prüfung!? man muss nicht jeden mist übersetzen." Fachbegriffe, die im
Projekt gelebt werden, bleiben stehen; die Klartext-Regel verlangt, interne
Namen zu ÜBERSETZEN, nicht sie zu verdeutschen.

### 1.4 Eine Entscheidung auf einer falschen Prämisse umgekippt

Zur Frage, ob der Platzhalter für die Auszeichnungs-Kachel immer stehen soll,
argumentierte ich: „öffentlich erreichbar sind ohnehin nur die angeschriebenen
Orte, also gibt es fast immer eine Auszeichnung." Der Betreiber: „hä? natürlich
kann man die seiten aufrufen über den atlas."

Er hatte recht, und der Fehler war nicht klein: Die Outreach-Freigabe steuert die
**Indexierung**, nicht die Erreichbarkeit — über den Atlas kommt man auf jede der
11.000 Gemeindeseiten. Meine Prämisse hätte auf rund zwei Dritteln der Seiten einen
Platzhalter stehen lassen, hinter dem nie etwas kommt.

**Gelöst wurde es serverseitig:** eine Ja/Nein-Frage beim Seitenaufbau, die
Rangdaten selbst lädt die Kachel weiter im Browser nach. Ohne dieses Kennzeichen
gibt es nur zwei schlechte Antworten — nie ein Platzhalter (Inhalt springt beim
Eintreffen) oder immer einer (er springt bei den Orten ohne Auszeichnung, nur
andersherum).

---

## 2. Das Story-Visual: drei Anläufe, drei verschiedene Sackgassen

Der Betreiber wollte eine Teaser-Karte mit Bild, im Modal die große Fassung.
Alle drei Versuche sind gescheitert, jeder an einer anderen Stelle:

1. **Die Redaktions-Karte skaliert.** Die Beitrags-Karte der Redaktion ist fest
   1080 Pixel breit. Auf 0,62 herunterskaliert lief sie über das 560 Pixel breite
   Modal hinaus und schnitt die Überschrift ab.

2. **Dieselbe Karte im Teaser.** Dort rendert sie 1080 Pixel breit in eine
   300-Pixel-Karte — und sie überschreibt die Farb-Tokens mit ihrer eigenen
   Palette, also ein weißer Block auf einer Seite, die abends dunkel steht.
   Beides ist für ein Bild in einem fremden Feed **richtig** und auf einer
   Seite mit Tageslicht-Theme **falsch**.

3. **Eigene Formen gezeichnet.** Die dritte Fassung war handgezeichnet — und
   damit die zweite Wahrheit neben den vier abgenommenen Vorlagen. Der
   Einheiten-Wächter hat sie binnen einer Minute erwischt (eine Prozentzahl mit
   angeklebtem Zeichen). Der Betreiber dazu: „absolutes desaster … wir müssen das
   dort machen um das zentralisiert zu haben. wir haben dort schon ein template
   system usw."

**Was daran allgemein gilt:** Eine Bild-Komponente, die für einen fremden Feed
gebaut ist, trägt drei Annahmen, die auf der eigenen Seite alle falsch sind —
feste Breite, eigene Palette, weglassbare Elemente in der kleinen Stufe. Sie
lässt sich deshalb nicht durch Skalieren wiederverwenden; sie braucht eine
Schwester-Stufe **an ihrem eigenen Ort**, mit beliebiger Breite und den Tokens der
Seite. Genau das ist an die Redaktions-Sitzung übergeben.

**Ergebnis:** Der Block ist auf der Gemeindeseite ausgeblendet. Die Geschichten
sind fertig und getestet, sie werden nur nicht gezeigt, bis das quadratische
Visual steht.

---

## 3. Fehler in ausgelieferten Texten und Zahlen

### 3.1 Die doppelte Präposition — seit dem 01.09.2026 in der Abo-Mail live

In **allen fünf** Meldungen des Gemeinde-Abos stand eine Präposition doppelt:
„2025 gingen **in in** Heringen (Werra) …". Die Ursache: Der Ortsname wurde
bereits mit „in" gebildet und an fünf Stellen noch einmal mit „in" eingeleitet.

Behoben an allen fünf Stellen über einen Helfer, der den Ortsnamen groß und ohne
Präposition liefert; der Grammatik-Test läuft jetzt über drei Ortsnamen, weil die
Präposition mit dem Geschlecht wechselt.

**Warum kein Test das gefangen hat:** Die Tests prüften Zahlen, Nenner und
Singular/Plural — kein Test las den Satz als Satz. Eine Prüfung, die Werte
vergleicht, sieht einen doppelten Funktionswort nie.

### 3.2 Zwei Rundungen für dieselbe Größe

Die Kachel zeigte „17.100 € je Anlage", der Satz daneben „17.139 €". Beide für
sich plausibel, nebeneinander ein Widerspruch — genau die Fehlerklasse, gegen die
das ganze Projekt gebaut ist.

Jetzt: eine Rundung je Größe, dazu ein Wächter, der anschlägt, sobald im Text eine
Zahl steht, die einem Kachelwert um weniger als zwei Prozent danebenliegt. (Der
Wächter wurde vor dem Einchecken absichtlich kaputtgemacht und rot gesehen.)

### 3.3 Der Analytics-Wächter war zweimal fast wertlos

Beim Reparieren eines flackernden Tests (er lief 4,9 Sekunden gegen ein
5-Sekunden-Limit) stellte sich heraus, dass seine zweite Hälfte **zirkulär** war:
Sie suchte jedes Ereignis und fand es in seiner eigenen Definition wieder — sie
konnte gar nicht rot werden.

Beim Beheben habe ich ihn **zweimal hintereinander erneut entwertet**, ohne es zu
merken:

- Die Shell hob meine Anführungszeichen auf, danach passte das Muster auf bloße
  Namen und traf überall.
- Ein hinzugefügter Schalter brach ein Nachbarmuster; dessen Fehler verschluckte
  ein pauschales „Fehler ignorieren" zu einem grünen Lauf.

Endstand: ein Aufruf ohne Shell dazwischen, nur der eine Rückgabewert „nichts
gefunden" wird abgefangen, und das Modul mit den Definitionen ist von der
Trefferliste ausgenommen. Beide Hälften absichtlich kaputtgemacht und rot gesehen.

**Die Lehre steht schon im Projekt** („geprüft wird die Verwendung, nie das bloße
Vorhandensein") — und ist trotzdem an einem Tag zweimal neu passiert. Ein
Wächter, der grün meldet, ist erst dann ein Beleg, wenn er einmal rot war.

### 3.4 Ein Laufzeit-Import hat den Browser-Bundle gesprengt

Eine Client-Komponente holte sich eine Beschriftung zur Laufzeit aus dem
Story-Modul. Damit landete die gesamte Kette dahinter — Tarifarchive,
Stundensimulation, Konfigurationen — im Browser-Bündel, und die Seite stürzte bei
der Hydratation ab.

Behoben, indem die Beschriftung serverseitig aufgelöst und mit der Geschichte
mitgereicht wird; der Client importiert nur noch Typen. **Dieselbe Trennung wie
bei der Stand-Zeile:** Die Auflösung gehört auf den Server, das Rendern darf
überall passieren.

---

## 4. Was gemessen wurde (damit es niemand neu erhebt)

- **Der Anlass für den Einbetten-Dialog:** 289 Anschreiben an Kommunen haben vier
  Veröffentlichungen erzeugt und **null Einbettungen**. In der Galerie steht der
  Ort in einem Abfrageteil, die Seite ist in Du-Form geschrieben, und die
  kommunalen Widgets stehen hinter acht Deutschland-Widgets. Der Knopf gibt
  deshalb den fertigen Code für DIESEN Ort aus.
- **Der Suchlauf allein kann Ortsseiten nicht füllen:** 313 seiner Funde nennen
  einen Ort, verteilt auf 197 von 11.000 Gemeinden; alle 596 Funde stehen auf
  „offen", also ungeprüft. Auf 98 % der Ortsseiten stünde nie einer.
- **Die bundesweiten Schwellen sind auf Ortsebene unerreichbar** (1.000 Anlagen je
  Baujahr, 20.000 kWp). Nicht eine Gemeinde erreicht sie — die Familien wären
  ersatzlos ausgefallen. Deshalb wandert die FRAGE mit einer ortsgroßen
  Vergleichsgruppe, nicht die Rechnung mit gesenkten Schranken.
- **Gegenprobe an einem zweiten Ort** (Neukirchen-Vluyn gegen Heringen): Die
  typische Dachanlage wuchs dort um das 3,4-fache seit 2003 statt um das
  2,4-fache seit 2004, und der Flächenmix schweigt, weil keine Form 45 % erreicht.
  Die Familien sind also nicht auf den Referenzort zugeschnitten.
- **Zum Textsnippet im Anschreiben** (Ausgangsfrage des Betreibers): Es
  wegzulassen, um die Verlinkungsquote zu heben, lässt sich mit dieser Menge nicht
  prüfen. Bei vier Veröffentlichungen auf 289 Briefe (1,4 %) kann ein
  50/50-Versuch den Unterschied nicht auflösen — man würde die einzige Sache
  entfernen, die nachweislich wirkt, und hätte danach kein Ergebnis.

---

## 5. Offen geblieben

- **Das quadratische Story-Visual** — übergeben an die Redaktions-Sitzung
  (beliebige Breite, Tokens der Seite statt eigener Palette). Erst danach wird der
  Block wieder eingeblendet.
- **Vier Textmängel in den (ausgeblendeten) Geschichten**, gefunden aber nicht
  behoben: eine falsche Groß-/Kleinschreibung in einer Vergleichsgruppe, zwei
  Vergleichskarten mit wortgleichem Text, eine Überschrift („Wo noch nichts
  steht"), die einer Karte widerspricht, die 83 % eigene Dächer ausweist, und ein
  Satz, der die Maßeinheit der Überschrift wiederholt.
- **Vor jedem künftigen Outreach-Schub:** Es dürfen keine ungestylten Geschichten
  auf den Seiten der angeschriebenen Orte stehen. Der Betreiber hat die Reihenfolge
  festgelegt: erst je Schub die Geschichten mit Vorlagen rundmachen (läuft in der
  Redaktion), dann versenden.
- **Der historische PV-Preisverlauf** für den Jahrgangs-Vergleich („go" des
  Betreibers) — Beschaffung und Lizenzfrage nicht begonnen.
