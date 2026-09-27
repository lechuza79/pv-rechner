# PV-Fachbetriebe: welche Quelle trägt, welche nicht

**Alles hier ist gemessen oder im Volltext geprüft, nichts geschätzt** (Hauptteil
27.08.2026, Nachträge mit eigenem Datum). Wer diese Erhebung erweitert, liest zuerst diese
Datei — **acht Quellen sind durchgeprüft, sechs davon verworfen.** Der Weg muss nicht
noch einmal gegangen werden.

**Kurzfassung für die eilige Sitzung:** Google gesperrt · Kammer-Werbeverzeichnis leer
(1 von 12 Betrieben darin) · OpenStreetMap zu dünn · **Handelsregister liefert nicht das
Gründungsjahr, sondern das Alter der Rechtsform — bei alten Betrieben bis zu 76 Jahre
daneben** · Ortssuche über die Suchmaschine ist der Weg für die Grundgesamtheit · **die
Innungsverzeichnisse finden 33 % der Elektrobetriebe wieder und sind trotzdem abgesagt —
nicht wegen ihrer Verbotsklausel, sondern weil eine Anzeige bei zwei Dritteln ohne Treffer
behauptet, die seien keine Innungsbetriebe** · Bewertungen liegen bei Google, das heißt: Link statt Wert.

---

## Warum überhaupt

Der Wettbewerbsbefund (`docs/seo/wettbewerb-solarcheck-deutschland.md`, Abschnitt 4) hat
gemessen, wer den Solar- und Speicherrechner der HTW Berlin verlinkt — kostenlos,
unabhängig, ohne Leadfunnel, also unser Zwilling. 2.080 verweisende Domains; wir haben
null echte. Unter den 1.000 stärksten sind Fachbetriebe mit 146 Domains die größte
Gruppe. Ein Fachbetrieb verlinkt einen unabhängigen Rechner, weil er die eigene
Beratung stützt und selbst keinen bauen will.

**Kalibrierung dieser 146 beim Eichen:** Die Zahl beruht auf einer Namensheuristik, nicht
auf einer geprüften Einordnung. Gegenprobe an drei Beispielen aus der Liste —
`heidel-solar.de` ist **kein Fachbetrieb**, sondern eine ehrenamtliche
Balkonstrom-Initiative der Heidelberger Energiegenossenschaft, die auf ihrer Seite
ausdrücklich schreibt, sie arbeite „ehrenamtlich und semi-professionell" und könne keine
Einzelberatung leisten. Die Kernaussage (Fachbetriebe sind die größte Gruppe) bleibt; die
Zahl 146 ist eine Obergrenze, keine Messung.

---

## Die geprüften Quellen

### 1. Google Places / Maps — GESPERRT, nicht bloß heikel

Rechtlich ausgeschlossen, dreifach, aus den Google Maps Platform Terms of Service
(Volltext-Auszug in `docs/quellen/fachbetriebe/google-maps-platform-terms-2026-08-27.txt`):

- **3.2.3(a) No Scraping**, Ziffer (iii): „copy and save business names, addresses, or
  user reviews" — also Name, Anschrift **und** Bewertungen.
- **3.2.3(b) No Caching**: Zwischenspeichern nur, soweit die Service Specific Terms es
  erlauben. Die erlauben in Abschnitt A.3 ausschließlich **Kennnummern** („Customer may
  cache the Google ID values … place_id from Places API"), sonst nichts.
- **3.2.3(d) No Re-Creating Google Products**, Ziffer (iii): die Nutzung „in a listings or
  directory service" — das ist wortwörtlich dieser Anwendungsfall.

**Damit fällt Google als DIREKTE Quelle aus** — die Bedingungen binden jeden, der die
Schnittstelle selbst nutzt.

**KORREKTUR am 29.08.2026 (Gegenprüfer):** Der Satz „damit fällt Google als Quelle
überhaupt aus" war zu weit, und die Verankerung war falsch. Die Maps-Bedingungen binden
den **Kunden der Maps Platform**. Wer die Daten über einen Dritten bezieht, der
Suchergebnisseiten ausliest, ist nicht Vertragspartei — für ihn ist 3.2.3(d)(iii) schlicht
nicht anwendbar. Die Klausel als „wortwörtlich dieser Anwendungsfall" gegen einen
Nichtkunden zu zitieren, belegt eine Aussage, die sie nicht trägt. **Für den Umweg gelten
andere Normen, nicht diese** — siehe den folgenden Abschnitt.

### 1b. Der Umweg über einen Datenlieferanten — geprüft am 29.08.2026, Ergebnis: intern ja, öffentlich nein

Die frühere Fassung schob die Frage weg („eine neue Rechtsfrage, die sich nicht stellt,
solange ein sauberer Weg existiert"). Das war bequem und als Begründung wertlos: Der
saubere Weg deckt 5 % ab. Deshalb am 29.08.2026 durch zwei Legal-Judges geprüft, der
zweite mit dem Auftrag, den ersten zu widerlegen — er hat es an fünf Stellen getan.
Fundstellen: `docs/quellen/fachbetriebe/dataforseo-tos-2026-08-29.txt`.

Gefragt war der engste denkbare Zuschnitt: **nur Bewertungsschnitt und Anzahl**, keine
Rezensionstexte, keine Autorennamen. Kosten wären vernachlässigbar (0,0015 $ je Betrieb,
rund 5 $ für den ganzen Bestand).

**Öffentlich anzeigen: nein — und der tragende Grund ist NICHT Google.** Wer
Verbraucherbewertungen zugänglich macht, muss nach **§ 5b Abs. 3 UWG** angeben, ob und wie
er sicherstellt, dass sie von echten Kunden stammen; die Echtheit ohne angemessene
Überprüfung zu behaupten, ist nach **Anhang Nr. 23b zu § 3 Abs. 3 UWG** per se unlauter.
Wir können nichts überprüfen. **Der Unterschied zu allen anderen Strängen ist die
Durchsetzung:** Hier sind Mitbewerber und Verbände nach § 8 Abs. 3 UWG anspruchsberechtigt
— also Stellen, die tatsächlich abmahnen. Dazu kommt, dass der Lieferant **kein
Nutzungsrecht einräumt** (die Bedingungen enthalten keine Lizenzklausel) und in 7.2 jedes
Risiko auf uns abwälzt.

**Der zuerst genannte Ablehnungsgrund trägt dagegen nicht** und ist hier festgehalten,
damit ihn niemand wieder aufgreift: „Ein gespeicherter Wert veraltet und ist damit eine
unwahre Tatsachenbehauptung (§ 824 BGB)". Ein datiert ausgewiesener Wert sagt etwas über
den Stichtag, und das ist wahr; § 824 Abs. 2 nimmt zudem von der Haftung aus, wo der
Empfänger ein berechtigtes Interesse hat. Wer § 824 für die Hürde hält, glaubt, ein
„Stand: 08/2026" räume sie ab — und lässt die echte stehen.

**Intern zur Priorisierung: vertretbar, aber nicht kostenlos.** Vier Punkte, die dabei
gelten:
- **Schon das Speichern ist Vervielfältigung** (§ 87b Abs. 1 S. 1 UrhG). „Wird ja nicht
  angezeigt" ist keine urheberrechtliche Kategorie. Der Tatbestand ist auch intern
  eröffnet; getragen wird die Zulässigkeit vom Amortisationsmaßstab des EuGH (C-762/19),
  nicht von der Unsichtbarkeit.
- **Ob Google überhaupt ein Datenbankherstellerrecht an den Bewertungen hat, ist offen.**
  Der erste Gutachter hielt es für „sehr wahrscheinlich" — der Gegenprüfer hält dagegen,
  dass die Bewertungen auf Googles eigener Plattform entstehen und der Durchschnitt von
  Google errechnet wird. Nach EuGH C-203/02 ist das **Erzeugen**, nicht Beschaffen, und
  gerade nicht geschützt. Keine Entscheidung dazu gefunden. Weniger Recht auf Googles
  Seite heißt weniger Risiko auf unserer: **vorsichtshalber zu verschärfen ist selbst ein
  Fehler.**
- **Unsichtbarkeit ist datenschutzrechtlich ein Argument GEGEN die Verarbeitung**, nicht
  dafür — ein öffentlicher Eintrag ist wahrnehmbar und widersprechbar, eine
  Priorisierungsliste nicht.
- Bei Kapitalgesellschaften ist es gar keine DSGVO-Frage (Art. 4 Nr. 1: natürliche
  Person). Nur Einzelunternehmer und Namensfirmen sind betroffen.

**Beide Gutachten sind sich einig, was ohnehin fehlt:** Die Datenschutzerklärung nennt die
Fachbetriebs-Erhebung heute mit keinem Wort, und **Art. 14 Abs. 5 lit. b („unverhältnis-
mäßiger Aufwand") trägt hier nicht** — 94 % der Betriebe haben einen Kontaktweg, und wer
Kontaktdaten erhebt, UM Kontakt aufzunehmen, kann sich nicht darauf berufen, Kontakt sei
zu aufwendig. Das gilt unabhängig von jedem Bewertungswert.

**Der saubere Weg für ein späteres Produkt: der Betrieb gibt uns seine eigenen Daten.**
Nach dem Digital Markets Act (Art. 6 Abs. 10) kann ein gewerblicher Nutzer vom Torwächter
kostenlos Zugang zu den Daten verlangen, die im Zusammenhang mit seiner Nutzung entstehen —
und sie einem Dritten zugänglich machen. Das löst Aktualität, Rechtsgrundlage und
Zustimmung in einem und passt genau dazu, dass wir die Betriebe ohnehin ansprechen wollen.
**Der Wortlaut ist am Amtsblatt gegenzulesen**, bevor jemand darauf baut — die
Online-Fassung brach beim Abruf vorzeitig ab.

**Ausdrücklich offen geblieben:** ob die Beschriftung „Google-Bewertung" markenrechtlich
zulässig wäre (§ 23 MarkenG, nicht geprüft), und ob der Lieferant selbst rechtmäßig an die
Daten kommt — das können wir nicht beurteilen, und seine Freistellungsklausel verlagert
genau dieses Risiko auf uns.

**Nicht zu übersehen:** An demselben Zugang hängen die Landkreis-Erhebung und der
monatliche SEO-Wächter. Die Bedingungen erlauben die Kontosperre ohne Vorwarnung und ohne
Erstattung.

**Was stattdessen zulässig ist:** Zeigt ein Betrieb seine Bewertung selbst auf der
eigenen Website — was viele tun, im Eichlauf etwa `eberhardt-solar.de` mit „4,5 aus 24
Bewertungen" —, ist das eine Selbstauskunft auf einer öffentlichen Seite. Sie wird
deshalb mit `bewertung_quelle = 'eigene-website'` erfasst und **nie** als
„Google-Bewertung" beschriftet. Wir lesen die Seite des Betriebs, nicht Google.

### 1c. Eine eigene Suchfrage nach Balkonkraftwerken — gebaut, gemessen, VERWORFEN (29.08.2026)

Die Idee lag nahe: Die zwei laufenden Fragen („Photovoltaik Fachbetrieb <Ort>",
„Solarteur <Ort>") finden den Dach-Fachbetrieb; wer NUR Balkonkraftwerke montiert, müsste
ihnen entgehen. Eine dritte Frage kostet 400 Abrufe, also 0,80 $.

**Zwei unabhängige Messungen, beide negativ:**

- **Keine neuen Betriebe.** „Balkonkraftwerk Installation <Ort>" über 8 Kreise in
  Schleswig-Holstein: 124 Domains, davon **null** noch nicht im Bestand. Zur Gegenprobe
  8 bayerische Kreise: 131 Domains, ebenfalls **null**.
- **Kein brauchbares Merkmal.** Naheliegender zweiter Nutzen wäre gewesen, die
  Treffer-Zugehörigkeit selbst als Signal zu nehmen — 59 der Treffer waren Betriebe, aber
  nur 14 nannten Balkonkraftwerke auf ihrer Seite. Von 15 der übrigen von Hand geprüft
  boten **2** wirklich welche an. Dieselbe Falle wie beim Förder-Screener: **Die
  Suchmaschine liest nicht, sie sortiert thematisch vor** — sie zeigt auf diese Frage
  einfach die PV-Betriebe der Region.

**Der Grund für beides ist derselbe und die eigentliche Erkenntnis: Es gibt kaum reine
Balkonkraftwerk-Montagebetriebe.** Das Geschäft machen dieselben PV-Betriebe nebenbei, die
die zwei vorhandenen Fragen ohnehin finden — oder gar niemand. Wer das Merkmal will, liest
es aus deren Seiten; dort steht es, und das Muster dafür wurde am selben Tag verbreitert
(9 % → 14 %, 424 Betriebe).

**Wer die Frage wieder vorschlägt, braucht einen neuen Grund, nicht die alte Idee.** Die
Messdaten des Probelaufs wurden entfernt, damit die verworfene Frage nicht als Datenbestand
weiterlebt.

**Offen und NICHT gemessen:** Balkonkraftwerke bei Stadtwerken und Energieversorgern. Das
ist ein realer Fall — der Förderkatalog kennt Kommunen, deren Versorger selbst Sets
anbietet. Es gehört aber ins **Versorger-Modul** (937 Stadtwerke,
`docs/versorger-uebergabe.md`), nicht in diese Tabelle: andere Käufer, andere Budgets,
anderer Rechtsrahmen. Ein Versorger, der Balkonkraftwerke verkauft, ist kein Handwerksbetrieb.

### 1d. Bonusprogramme von Versorgern — gemessen 29.08.2026, Ergebnis: es gibt sie praktisch nicht

Die Frage lag nahe, weil Stadtwerke Balkonkraftwerke anteilig häufiger anbieten als
Handwerksbetriebe (21 % gegen 19 %) und der Förderkatalog Kommunen kennt, deren Versorger
selbst Sets verkauft.

**Ergebnis: 30 Versorger mit Balkon-Angebot geprüft, KEIN einziger mit einem Zuschuss
darauf.** Zwei hatten überhaupt ein Förder-Signal, beide für Wärmepumpen, und auch das
waren Rabatte für Stromkunden, keine Förderung. Im gesamten Förderkatalog (110 Programme)
stammen ganze zwei von Stadtwerken, beide für Photovoltaik.

**Die Handprüfung erklärt, warum, und das ist der eigentliche Befund: Ein Versorger
VERKAUFT Balkonkraftwerke, er fördert sie nicht.** Ratingen bietet ein 800-Watt-Set für
499 € an (Lieferung 45 €), Neustadt erklärt auf seiner Balkon-Seite die
Einspeisevergütung, Norderstedt nennt keinen Betrag. Das ist strukturell und nicht
zufällig: Ein Versorger ist Verkäufer, keine Bewilligungsstelle. Die Förderung kommt von
der Kommune — die zwei Ausnahmen im Katalog sind Ausnahmen.

**Für den Zweck ändert das nichts**: Wer Hilfe bei der Montage sucht, ist bei einem
Stadtwerk mit Komplettangebot gut aufgehoben. Es ist nur kein Fördertopf.

**DER ENTSCHEIDENDE FUND kam vom Betreiber, nicht aus der Messung: Wir erfassen den
NETZBETRIEB statt des Vertriebs.** Er verwies auf das Balkonkraftwerk-Angebot der ovag —
10 % Rabatt im Shop eines Partners, auf Wunsch mit Montage. Die Seite gehört zu `ovag.de`;
erfasst hatten wir die **ovag Netz GmbH**. Das ist kein Einzelfall, sondern die Bauart der
Quelle: Die Versorger-Adressen stammen aus dem Anlagenregister und benennen überwiegend den
Netzbetrieb (steht so in `docs/versorger-uebergabe.md`). **225 der 937 Versorger sind
Netzgesellschaften.**

**Bei ihnen maß das Merkmal „erwähnt" statt „bietet an".** 68 trugen ein
Balkonkraftwerk-Merkmal; zwölf von Hand nachgelesen: **kein einziger verkauft**. Sieben
informieren über die Anmeldepflicht („Balkonkraftwerk anmelden", „Zur Anmeldung
steckfertiger Anlagen"), der Rest nennt das Wort ohne Angebot. Das ist die Fehlerklasse,
vor der CLAUDE.md an erster Stelle warnt — die Beschriftung sagt etwas anderes, als die
Zahl misst. Behoben: Bei einem Netzbetrieb wird ein Geschäftsfeld nur gesetzt, wenn
Verkaufssprache danebensteht; die Adresse allein zählt dort nicht („/balkonkraftwerk-
anmelden" trägt das Wort und ist kein Angebot). Festgenagelt in
`lib/__tests__/versorger-netzbetrieb.test.ts`.

**Beim Bau der Regel wurde sie prompt selbst rot** — und das ist der zweite Teil der
Lehre: „wesernetz Bremen" galt nicht als Netzbetrieb, weil das Muster „netz" am
WORTANFANG verlangte. Zusammengeschriebene Gesellschaften (`wesernetz`, `enercity-netz`,
`e-netz`) fielen alle durch, 209 statt 225. Jetzt prüft es „netz" am Wortende — offen
dürfte es nicht sein, das fänge „Vernetzung" und „Netzwerk" mit. **Dieselbe Musterfalle in
beide Richtungen wie am selben Tag bei den Branchenwörtern der Fachbetriebe**, wo ein
offenes „Solar*" den Firmennamen „Solarma" fraß.

**GEGENPROBE AM 29.08.2026: Die Regel gilt für ALLE Versorger, nicht nur für
Netzgesellschaften — und das war die Frage des Betreibers, nicht die Umsetzung.** Auf die
Frage „soll ich die Vertriebsschwestern suchen?" kam die richtige Antwort: „kann ich nicht
beurteilen. sollten wir erst doublechecken, ob das wirklich eine valide Strategie ist."

Sechs Balkon-Seiten von VERTRIEBEN im Wortlaut gelesen: **Schweinfurt, Werl und Neustadt
erklären, was ein Balkonkraftwerk ist** — Neustadt schickt den Leser sogar ausdrücklich zum
Netzbetreiber. Verkauft haben nur zwei: Ratingen (499-€-Set) und die ovag (Rabatt bei einem
Partner). Der Fehler war also nicht auf Netzgesellschaften beschränkt, nur dort besonders
sichtbar.

**Der Grund ist strukturell: Ein Versorger hat eine Informationspflicht gegenüber seinen
Kunden, ein Handwerksbetrieb nicht.** Bei einem Solarteur IST die Erwähnung das Angebot;
bei einem Stadtwerk ist sie oft nur Aufklärung. Deshalb verlangt die Erfassung bei jedem
Versorger Verkaufssprache neben dem Begriff, und **die Adresse allein zählt bei Versorgern
gar nicht mehr** — „/balkonkraftwerk" führt dort genauso oft auf eine Erklärseite wie auf
ein Angebot.

**Die Lehre über diesen Fall hinaus:** Dieselbe Frage an zwei Bestände braucht nicht
dieselbe Beweisschwelle. Was bei der einen Zielgruppe ein Angebot belegt, belegt bei der
anderen nur eine Pflicht. Die Mechanik zu teilen war richtig, die Schwelle mitzuteilen
nicht.

**Die eigentliche Lücke, die daraus folgt:** Wo wir den Netzbetrieb haben, fehlt der
Vertrieb — und der verkauft und montiert. Die ovag Energie ist gar nicht im Bestand. Wer
den Versorger-Bestand für Montage-Empfehlungen nutzen will, muss diese Schwestern erst
zuordnen; das ist offen und nicht gemessen.

**Bei Fachbetrieben ist die Frage strukturell erledigt, nicht bloß ungemessen:** Ein
Handwerksbetrieb ist Förder-EMPFÄNGER, nicht Fördergeber. Was er hat, sind Rabattaktionen —
Werbung, keine Förderung, und sie gehören nicht in denselben Topf.

**Der erste Anlauf dieser Messung war wertlos und ist hier festgehalten, damit der Fehler
nicht wiederkommt.** Ein selbstgebauter Absatz-Test meldete „12 von 25 Versorgern fördern
Balkonkraftwerke". Alle sieben nachgelesenen Fundstellen waren **Navigationsmenüs** — die
Wörter standen im selben Menü, nicht im selben Sachzusammenhang; hinter einem vermeintlichen
Zuschuss stand der geförderte Glasfaserausbau. Ursache: **Es gibt zwei Textfunktionen
gleichen Namens im Projekt.** Die des Förderbereichs wirft Menüs weg (dort dokumentiert als
teuerstes Falsch-Positiv), die der Fachbetriebe behält sie mit Absicht, weil Anschriften und
Angebote dort stehen. Wer zwei Begriffe „im selben Absatz" sucht, braucht die erste. Der
Hinweis steht jetzt an beiden Funktionen.

### 2. Handwerkskammer-Betriebsdatenbanken — fachlich stark, rechtlich offen

**Gemessen (HWK für München und Oberbayern, Suchbegriff „Photovoltaik", PLZ 80331,
Umkreis 50 km):** Die Suche ist ein schlichtes GET-Formular mit lesbaren Feldnamen, die
Trefferliste steht im ausgelieferten HTML, `robots.txt` erlaubt die Betriebsseiten. Je
Betrieb liefert die Detailseite:

- Firmenname mit Rechtsform, vollständige Anschrift
- **den Landkreis** — die regionale Zuordnung frei Haus
- Ansprechpartner, Telefon, E-Mail
- eine Leistungsbeschreibung (dort steht, ob PV gemacht wird)
- **die amtlich eingetragenen Berufe aus der Handwerksrolle** — „Elektrotechniker" ist ein
  zulassungspflichtiges Handwerk nach Anlage A HwO, der Eintrag setzt die Meisterprüfung
  oder eine Ausnahmebewilligung voraus. Das ist das härteste Trust-Signal überhaupt,
  härter als jede Selbstauskunft.
- Website bei **7 von 12** geprüften Betrieben (58 %).

**Warum sie trotzdem nicht die Massenquelle ist — der bequeme Freibrief trägt nicht.**
Naheliegend wäre der Merksatz aus dem Förderbereich gewesen: „Gemeinden sind öffentliche
Stellen, und § 2 Abs. 5 DNG verbietet ihnen die Berufung auf § 87b UrhG." Handwerkskammern
sind ebenfalls öffentliche Stellen (§ 90 Abs. 1 HwO: „sie sind Körperschaften des
öffentlichen Rechts", im Volltext geprüft). **Der Schluss ist trotzdem falsch**, und zwar
aus § 2 Abs. 3 DNG selbst:

- **Nr. 1 Buchst. a Doppelbuchst. aa** — das Gesetz gilt nicht, „soweit der Schutz
  personenbezogener Daten entgegensteht". Die Datenbank führt Einzelunternehmer mit
  Klarnamen und Handynummer.
- **Nr. 1 Buchst. d** — es gilt nicht für Daten, „deren Bereitstellung nicht unter den
  durch Rechtsvorschrift festgelegten öffentlichen Auftrag der öffentlichen Stelle fällt".
  Die Betriebsdatenbank ist ein freiwilliges Werbeangebot der Kammer („Mitgliedsbetriebe
  können sich kostenlos eintragen"), nicht die Handwerksrolle nach § 6 HwO.

Das ist genau der Fall, vor dem CLAUDE.md warnt: *„ein ‚gilt nicht für X' braucht eine
eigene Fundstelle — Verweisketten mitlesen."* Der Förder-Merksatz wäre hier ungeprüft
übernommen worden und hätte danach als Rechtfertigung dagestanden.

**GEPRÜFT am 29.08.2026 durch zwei Legal-Judges, der zweite mit dem Auftrag, den ersten zu
widerlegen. Ergebnis: intern zulässig, öffentlich später — und meine Bewertung oben war ZU
STRENG.**

**Die DNG-Argumentation oben ist hinfällig und darf nicht wiederverwendet werden.** Nicht
weil sie zu streng war, sondern weil sie eine Stufe zu spät ansetzt: Beide Fassungen
streiten über die Ausnahmen des § 2 Abs. 3 DNG, ohne zu prüfen, ob eine Handwerkskammer
überhaupt „öffentliche Stelle" im Sinne des DNG ist. Das DNG hat dafür eine **eigene**
Definition (§ 3 Nr. 1), und von deren drei Merkmalen für Nicht-Gebietskörperschaften sind
zwei erkennbar nicht erfüllt (die Kammer finanziert sich nach § 113 Abs. 1 HwO aus
Mitgliedsbeiträgen, ihre Vollversammlung wird gewählt); das dritte ist offen. **Der Schluss
von „Körperschaft des öffentlichen Rechts" auf „öffentliche Stelle" ist genau die
Verweiskette, die nicht mitgelesen wurde** — derselbe Fehlertyp wie beim Förder-Merksatz,
nur in die andere Richtung.

Dazu kommt: § 1 Abs. 2 DNG begründet ausdrücklich keinen Anspruch, § 13 verweist auf den
Verwaltungsrechtsweg. Ob ein Privater sich in einem Zivilprozess auf das Verbot in § 2 Abs.
5 berufen kann, ist ungeklärt — Rechtsprechung dazu wurde nicht gefunden. **Das DNG trägt
die Entscheidung nicht, in keine Richtung.**

**Was sie trägt, ist das Datenbankrecht selbst.** Nach EuGH C-203/02 (Rn. 89) verbietet
§ 87b Abs. 1 S. 2 UrhG nur Handlungen, die durch ihre kumulative Wirkung die Datenbank oder
einen wesentlichen Teil davon **wieder erstellen**. Rund 60 gezielte Abfragen je Kammer aus
jeweils Zehntausenden Einträgen tun das nicht. Verstärkend nach C-762/19: Maßstab ist die
Gefahr für die **Amortisation** der Investition — eine beitragsfinanzierte Kammer
vermarktet ihr Werbeverzeichnis nicht, die Gefahr fehlt strukturell. Ob überhaupt ein
Schutzrecht besteht, ist zusätzlich offen: In ein Verzeichnis, in das sich Mitglieder selbst
eintragen, wird nichts „beschafft".

**Daraus folgt die eine Bedingung, die wirklich trägt: ABGLEICHEN STATT ABERNTEN.** Nur
gezielt nachschlagen, was wir schon haben; nie ganze Gewerke-Kategorien über alle Kammern
durchgehen. Der Unterschied ist nicht der Zweck, sondern das Vorgehen — und er entscheidet
die ganze Frage.

Weitere Bedingungen, jede mit eigenem Grund:
- **Nur das Gewerk holen, keine Kontaktdaten.** § 6 Abs. 2 S. 6 HwO nimmt elektronische
  Kontaktdaten von der Übermittlung aus; das verbietet uns nichts, zeigt aber die Wertung.
  Wir haben sie ohnehin zu 94 % aus dem eigenen Crawl.
- **Bei jeder technischen Sperre abbrechen, nie umgehen.** BGH I ZR 224/12 sagt, dass
  Geschäftsbedingungen allein keine Unlauterkeit begründen — nennt aber das Überwinden
  einer technischen Schutzvorrichtung ausdrücklich als Gegenbeispiel.
- **Datenschutz-Unterseite VOR dem ersten Lauf**, mit berechtigtem Interesse und
  Widerspruchsrecht (Art. 14 Abs. 1/2, Art. 21 Abs. 2 DSGVO).
- Die Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO, getragen von Erwägungsgrund 47 a. E.
  (Direktwerbung) — **nicht** vom Hinweis im Eintragsformular einer einzelnen Kammer, den
  der erste Judge anführte: Der Erwägungsgrund stellt auf die Erwartung gegenüber dem
  **Verantwortlichen** ab, und das sind wir, nicht die Kammer.

**Öffentlich anzeigen: nicht verboten, aber verschoben.** Ein datiert ausgewiesenes Merkmal
(„eingetragenes Handwerk laut Kammer, abgerufen am …") ist über den Stichtag eine wahre
Angabe; § 5 Abs. 2 Nr. 3 UWG ist damit beherrschbar. Die Auflage, die beide zunächst
übersahen, ist eine andere: **§ 5b Abs. 2 UWG verlangt von jedem Verzeichnis, das
Verbrauchern eine Suche über mehrere Anbieter bietet, die Hauptparameter des Rankings und
ihre Gewichtung offenzulegen** — durchsetzbar von Mitbewerbern und Verbänden. Das gilt
unabhängig davon, woher das Gewerk kommt, und gehört zum Verzeichnis-Produkt, nicht zu
dieser Quelle.

**Nicht einschlägig, obwohl es naheliegt:** § 5b Abs. 3 UWG und Anhang Nr. 23b betreffen
ausschließlich **Verbraucherbewertungen**. Ein amtlicher Registereintrag ist keine
Bewertung. Wer die Bewertungs-Argumentation aus Abschnitt 1b hierher überträgt, überträgt
sie falsch.

**Der sauberere Weg, mit ehrlichen Grenzen: § 6 Abs. 2 HwO — fragen statt abrufen.** Eine
Einzelauskunft aus der Handwerksrolle ist jedem zu erteilen, der ein berechtigtes Interesse
glaubhaft darlegt; S. 3 verneint für Firma, ausgeübtes Handwerk und Anschrift ausdrücklich
ein schutzwürdiges Gegeninteresse. Das liefert das **amtliche** Merkmal statt der
Selbstauskunft aus einem Werbeverzeichnis. Vier Grenzen, die der erste Judge nicht nannte:
S. 4 gibt jedem Betrieb ein Widerspruchsrecht, S. 6 schließt elektronische Kontaktdaten
aus, § 6 Abs. 1 erfasst **nur zulassungspflichtige** Handwerke (reine Solarteure ohne
Eintrag in Anlage A stehen dort nicht — also gerade der Teil des Bestands, bei dem die Frage
interessant wäre), und ob „berechtigtes Interesse" bei einem kommerziellen Anbieter trägt,
entscheidet jede der 53 Kammern selbst. Das ist Außenkontakt und damit eine Entscheidung des
Betreibers.

**GEMESSEN am 29.08.2026 — und das Ergebnis erledigt die Frage praktisch, unabhängig von
jeder Rechtslage: Die frei abrufbare Betriebsdatenbank enthält unsere Betriebe nicht.**
Zwölf Betriebe aus Oberbayern gezielt über Firmenname und Postleitzahl gesucht, **einer**
gefunden. Gegenprobe, damit der Befund kein Gerätefehler ist: Dieselbe Suchmaske liefert
für „Elektro" im selben Umkreis 26 Treffer, und auch ohne jeden Filter findet sie die
Vermissten nicht. Die Suche funktioniert — die Betriebe stehen dort schlicht nicht.

Der Grund liegt in der Bauart der Quelle und war die ganze Zeit erkennbar: **Die
Kammer-MITGLIEDSCHAFT ist Pflicht, der Eintrag in dieses Verzeichnis freiwillig.** Junge,
vertriebsorientierte PV-Gesellschaften tragen sich nicht ein. Damit ist diese Quelle für
unseren Bestand wertlos, so gut das amtliche Signal darin auch wäre (die Detailseite zeigt
„Eingetragene Berufe: … Elektrotechniker …", dazu den Landkreis — fachlich genau das
Richtige, nur eben für die falschen Betriebe).

**Wer das amtliche Merkmal wirklich will, muss die HANDWERKSROLLE fragen, nicht das
Werbeverzeichnis** (§ 6 Abs. 2 HwO, siehe oben). Die ist nicht freiwillig. Preis: 53
Anträge, Ausgang je Kammer offen, und sie erfasst nur zulassungspflichtige Handwerke.

**Der billigste Weg zum selben Ziel ist ein dritter:** Wir sprechen die Betriebe ohnehin
an. Wer dabei sagt, dass er Elektromeister ist, ist die Quelle selbst — kein Abruf, keine
Rechtsfrage, und die Angabe ist aktuell.

**Zur Ausgangsannahme, gemessen an unseren eigenen Daten:** „Solarteure sind vermutlich
Elektriker" stimmt zur Hälfte — von 494 als Solarteur eingeordneten Betrieben tragen 248
(50 %) auch das Elektro-Gewerk, 176 (36 %) nur Solarteur. Das misst allerdings, was auf der
Website steht, nicht die Handwerksrolle.

**Gemessen, nicht vermutet:** Die robots.txt von München, Köln und Düsseldorf sind
zeichengleich und sperren die Betriebssuche nicht; kein Impressum trug einen
Nutzungsvorbehalt oder ein Scraping-Verbot. Damit ist nebenbei die offene Frage von oben
beantwortet — identische Sperrlisten plus identisches Adress-Schema plus ein
Kammer-Auftritt auf der Domain eines gemeinsamen Dienstleisters: die Kammern fahren
dieselbe Plattform. Drei gemessen, nicht 53.

**Die Vorfrage, die alles andere aussticht und kein Kammer-Thema ist:** Die
Datenschutzerklärung nennt die Fachbetriebs-Erhebung heute mit keinem Wort. Solange das so
ist, fehlt die Information nach Art. 14 DSGVO für **jede** Variante — auch für die
Erhebung, die längst läuft. **Nicht gemessen und offen:** wie viele der 53 Kammern dieselbe Software
fahren — ein erster Shell-Versuch war unbrauchbar (Zeichensatzfehler, und die Suche ist
auf vielen Startseiten gar nicht verlinkt).

### 3. OpenStreetMap — gemessen und zu dünn

Overpass-Abfrage über ganz Deutschland, 27.08.2026:

| Abfrage | Objekte |
|---|---|
| `craft=photovoltaic` + `shop=solar` + `craft=solar` | **52** |
| `craft=electrician` | **3.716** |

Bei rund 50.000 Elektrohandwerksbetrieben in Deutschland deckt die zweite Zahl etwa 7 %
ab — zufällig verteilt, ohne jede Aussage darüber, ob PV gemacht wird, und ohne Website
im Regelfall. Als Grundgesamtheit unbrauchbar. Die Lizenz (ODbL) wäre unproblematisch
gewesen; daran liegt es nicht.

### 4. Ortssuche über die Suchmaschine — DIESER WEG

Je Landkreis zwei Fragen an die SERP-Schnittstelle, die wir ohnehin bezahlen
(0,002 $ je Abruf, 400 Kreise × 2 = **1,60 $ für ganz Deutschland**).

**Gemessen an drei Kreisen vorab** (Fulda, Bautzen, Emsland): 10 bis 20 echte
Betriebs-Domains je Kreis, dazwischen klar erkennbare Portale.

Drei Eigenschaften, die keine andere Quelle hat:

1. **Nur Betriebe mit Website** — per Konstruktion. Ein Betrieb ohne Website kann kein
   Widget einbetten; die 42 % ohne Website in der Kammer-Datenbank wären für den Zweck
   Ballast.
2. **Keine fremde Datenbank angefasst.** Wir bekommen Adressen von Websites und lesen
   danach deren Impressen — Angaben, die § 5 DDG ohnehin öffentlich verlangt.
3. **Zwei Fragen, weil eine systematisch etwas verliert.** „Photovoltaik Fachbetrieb X"
   findet die Betriebe aus dem Solargeschäft, „Solarteur X" die, nach denen Suchende
   fragen. Die Trefferlisten überschneiden sich nur etwa zur Hälfte; ein Begriff allein
   verlöre das Elektrohandwerk, das PV mitmacht, ohne es im Namen zu führen.

---

## Regional oder überregional: gemessen, nicht gepflegt

Eine gepflegte Sperrliste von Vergleichsportalen wäre dasselbe Wettrennen wie beim
Förder-Crawl — sie veraltet, sobald ein Portal aufmacht. Stattdessen entscheidet die
**Streuung**: Ein Fachbetrieb bedient einen Umkreis und erscheint in ein bis drei
Landkreisen; ein Vergleichsportal erscheint in jedem. Zwischen vier und zehn liegt
niemand, deshalb ist die Schwelle unkritisch (acht Kreise, mit Sicherheitsabstand nach
unten; sie wächst mit der Zahl der abgefragten Kreise, damit in einem Teillauf nicht
jedes Portal als „Betrieb" durchgeht).

**Gemessen über alle 400 Kreise: 4.792 regional, 61 überregional.** Die Trennung sitzt —
sie fängt my-hammer (373 Kreise), energie-experten (369), meinestadt (326), Gelbe Seiten
(175), Das Telefonbuch (107) und die Vergleichsrechner.

**Und sie hat sofort eine Beschriftungslüge aufgedeckt.** Die erste Fassung nannte die
Klasse `portal`. Unter den 61 stehen aber auch **Enpal (54 Kreise), Zolar (79) und Enerix
(261)** — bundesweite ANBIETER, keine Verzeichnisse. Beide gehören aus der Liste heraus
(ein bundesweiter Konzern ist kein regionaler Verteiler, sondern der Wettbewerber, gegen
den wir positioniert sind), aber sie „Portal" zu nennen wäre genau der Fehler, den
CLAUDE.md an erster Stelle nennt: eine Beschriftung, die etwas anderes behauptet als die
Zahl darunter. Die Klasse heißt deshalb `ueberregional`, und der Grund nennt die Messung
im Klartext („in 54 von 400 abgefragten Kreisen").

Eine kurze Liste großer Plattformen (Facebook, YouTube, Wikipedia …) bleibt trotzdem
nötig: Sie erscheinen zwar überall, aber ein *einzelner* Treffer in einem Kreis käme
sonst als „Betrieb mit einem Kreis" durch.

---

## Was das Eichen an den Extraktoren gefunden hat

Drei Betriebe von Hand, dann 25 maschinell, dann jede Zeile gegengelesen. Die Zahlen des
ersten Laufs sahen plausibel aus (88 % mit Anschrift, 40 % mit Handelsregisternummer) —
**und enthielten sechs Fehlerklassen**, keine davon von außen erkennbar:

| Fehler | Beispiel | Ursache |
|---|---|---|
| Rechtsform aus Wortmitte | „DORFMANAGEMENT" → AG, „WERKZEUG" → UG | keine Wortgrenzen |
| Gründungsjahr aus beliebigem „seit"-Satz | Hamburger Abendblatt → 2021 | Muster zu weit |
| Beispieladresse als Kontakt | `user@example.com` | erste Adresse im Text gewinnt |
| Hoster-Adresse als Kontakt | `info@ionos.de` auf geparkter Domain | dasselbe |
| Überschrift als Kammername | „Handwerkskammer Berufsrechtliche Regelungen" | Muster frisst die nächste Zeile |
| „kein Betrieb" als Urteil ohne Messung | Hersteller mit per Skript nachgeladener Seite | „nichts gefunden" ≠ „ist keiner" |

Der letzte ist der wichtigste und ist jetzt zweistufig gelöst: Ein erkanntes Kommunal-,
Verlags- oder Portalmuster ist ein **Befund** (`kein-betrieb`); ein fehlendes PV-Wort ist
nur eine **Lücke** (`unklar`, mit dem Vermerk „von Hand ansehen").

**Merksatz für die nächste Erweiterung:** Wer einen Extraktor baut, liest dreißig Zeilen
Ergebnis von Hand gegen. Die Trefferquote sagt nichts darüber, ob getroffen wurde, was
gemeint war.

---

## Was am 27.08.2026 herausgekommen ist

Alle 400 Landkreise abgefragt, zwei Fragen je Kreis, **1,68 $ Gesamtkosten** (3 von 800
Abrufen kamen nicht durch). 4.853 Domains gefunden, davon nach Streuung und Impressum:

| Klasse | Zahl | was das heißt |
|---|---|---|
| **betrieb** | **3.119** | regional, mit Website, mit PV-Angebot |
| unklar | 764 | zweimal geprüft, kein PV-Angebot gefunden — überwiegend Elektrobetriebe ohne PV-Geschäft und geparkte Domains |
| kein-betrieb | 909 | Kommunen, Solarkataster, Vereine/Genossenschaften, Presse, Portale |
| ueberregional | 61 | Portale und bundesweite Anbieter |

Dazu **14.965 Belege** — jeder mit Fundstelle, Textstelle und Datum.

**Erreichbarkeit der Betriebe: 94 %** — E-Mail 85 %, Telefon 83 %, Kontaktformular 8 %. Die Zusammenfassung steht neben den Einzelwerten, nicht an ihrer Stelle: Ein Formular
ist ein Kontaktweg, aber kein Postfach, und wer später schreiben will, braucht den
Unterschied.

**Trust-Signale:** Anschrift 84 % · **amtlicher Gemeindeschlüssel 83 %** ·
Handelsregisternummer 57 % · Meisterbetrieb 21 % · Handwerkskammer 14 % · Zertifikat 12 % ·
Gründungsjahr 8 % · Bewertung (Selbstauskunft) 1 % · Innung 1 % ·
Installateurverzeichnis 1 %.

Die niedrigen Quoten unten sind **kein Erfassungsfehler, sondern die Realität**: Diese
Angaben stehen auf den meisten Websites schlicht nicht. Ein loseres Muster brächte höhere
Quoten und falsche Werte — genau das war der erste Lauf.

**Abdeckung: alle 16 Bundesländer, 391 der 400 Kreise mit mindestens einem Betrieb.**
Die Verteilung folgt der Wirtschaftskraft, wie zu erwarten — Bayern 531, Nordrhein-
Westfalen 525, Baden-Württemberg 341, Niedersachsen 308, am unteren Ende die Stadtstaaten
(Hamburg 16, Bremen 20) und das Saarland (29). Die neun Kreise ohne Eintrag heißen
**nicht**, dass es dort keine Betriebe gibt: Dort hatte keiner der gefundenen eine
auslesbare Anschrift, oder die Postleitzahl blieb mehrdeutig.

**Gemessene Restunschärfe der Klasse „betrieb": rund 1 %** (31 von 3.118 vor der
Nachbesserung trugen ein Wort, das auf Vermittlung, Verzeichnis, Presse oder
Finanzdienstleistung deutet; bei Durchsicht war etwa die Hälfte davon eine echte
Fehleinordnung). Zwei Muster sind daraufhin ergänzt worden — Lead-Vermittlung und
erweiterte Presse-Erkennung —, sie haben beim Nachlauf 20 Domains zurückgestuft. **Der
Rest bleibt stehen und wird hier genannt statt weggepoliert:** Die Belege liegen vor, wer
schärfer filtern will, filtert die Belege neu statt neu zu crawlen.

**Die Streuungsverteilung bestätigt die Bauweise:** 2.105 Betriebe erscheinen in genau
einem Kreis, 774 in zwei bis vier, 170 in fünf bis neun, nur 69 in zehn bis neunzehn.
Genau die Verteilung, die eine Schwelle bei 20 unkritisch macht.

**Der Gemeindeschlüssel geht gegen das Melderegister auf: null Abweichungen** bei 3.843
Zuordnungen. 50 blieben offen, weil die Postleitzahl mehrere Gemeinden abdeckt und der
Ortsname aus dem Impressum zu keiner passte — dort steht **kein** Schlüssel, lieber keine
Zuordnung als die falsche Gemeinde.

## Nachtrag 28.08.2026: Kontaktwege, Restklasse, Ansicht

### Die Kontaktseite schließt die Lücke — nicht das Impressum

473 der Betriebe hatten keine auslesbare E-Mail-Adresse, 233 gar keinen Kontaktweg. Der
Grund ist selten, dass es keinen gibt: Er steht auf der **Kontaktseite**, und dort oft als
Formular statt als Adresse. Die Durchgänge über die Kontaktseiten brachten **rund 200 neue
E-Mail-Adressen und 653 Kontaktformulare** — am Ende sind **90 % der Betriebe
erreichbar**.

**Ein Formular IST ein Kontaktweg** und wird als solcher gezählt — bei den Gemeinden war
genau das der Regelfall, und ein Betrieb, der bewusst keine Adresse zeigt, ist deshalb
nicht unerreichbar.

### Ein Denkfehler, den erst das Gegenlesen zeigte

Der erste Anlauf prüfte das GEWERK auf der Kontaktseite — und löste damit fast nichts auf.
Dort steht das Angebot naturgemäß nicht; offensichtliche Elektrobetriebe blieben auf
„unklar". Richtig ist die **Navigation der Startseite**: Sie ist statisch im HTML, auch
wenn der Inhalt per Skript nachlädt. Ein Betrieb, dessen Startseite uns leer erscheint,
hat „Photovoltaik" trotzdem im Menü.

### Die Restklasse enthält kaum verborgene Betriebe — auch das ein Befund

Von den unklaren Domains wurden **64 doch zu Betrieben**, 32 als Nicht-Betrieb erkannt
(überwiegend kommunale Solarkataster), und **722 zweimal geprüft ohne Photovoltaik-
Angebot**. Die Stichprobe erklärt, warum: Dahinter stecken Elektrobetriebe **ohne**
PV-Geschäft und geparkte Domains, nicht verborgene Fachbetriebe.

Diese 722 behalten die Klasse „unklar" — ein Angebot kann auf einer Unterseite stehen,
die wir nicht gelesen haben —, aber ihr Grund sagt jetzt, dass zweimal nachgesehen wurde.
**„Nichts gefunden" und „noch nicht angesehen" müssen unterscheidbar bleiben**, sonst
prüft die nächste Sitzung dieselben 722 noch einmal.

### Der Firmenname: zwanzig Prozent kaputt, und die Quote zeigte es nicht

**Nachtrag 28.08.2026, ausgelöst vom Betreiber.** Er sah eine einzelne Karte —
„& Datenschutz – SED-Solar GmbH" — und sagte, die Firmenbezeichnungen seien unbrauchbar.
Die Auszählung über den ganzen Bestand gab ihm recht und zeigte mehr, als sein Beispiel
ahnen ließ: **633 von 3.115 Namen — 20 % — trugen Müll**, in fünf klaren Klassen.

| Klasse | Beispiel | Ursache |
|---|---|---|
| Rest einer zerlegten Überschrift | „& Datenschutz - SED-Solar GmbH" | Die Impressum-Überschrift lautet „Impressum & Datenschutz"; das erste Wort war entfernt, der Rest blieb |
| nachgestelltes Seitenwort | „Elektro-Klaas GmbH: Impressum" | nur führende Wörter wurden geputzt |
| unaufgelöste HTML-Entität | „&ndash; AURORASOL GmbH" | `&ndash;` fehlte in der Entitätenliste |
| Name HINTEN im Seitentitel | „Photovoltaik und Elektrotechnik - Mac Metzler Energietechnik GmbH" | die Zerlegung nahm den ersten Teil |
| reiner Werbespruch | „Solarprodukte zu den besten Tagespreisen kaufen" | der Seitentitel als Rückfall, ungeprüft |

**Der Grundfehler war, den Seitentitel als Rückfall oberflächlich zu putzen. Ein
Seitentitel ist fast nie der Firmenname.** Die neue Regel: an allen Trennern zerlegen, der
Teil MIT Rechtsform gewinnt (gleich an welcher Stelle), ohne Rechtsform gilt nur, was wie
ein Name aussieht und nicht wie ein Satz — sonst gar kein Name, dann zeigt die Liste die
Adresse.

**Ergebnis: von 20,3 % auf 1,4 %.** Alle 18 gemessenen Fälle sind als Test festgenagelt.

**Und der Fix erzeugte prompt einen neuen Fehler** — sichtbar nur, weil dieselbe Auszählung
noch einmal lief: Aus „Uwe Schmidt Elektroinstallation Gas | Wasser | Sanitär GmbH -
Elektromeisterbetrieb Berlin" wurde **„Sanitär GmbH"**. Dort sind die Striche eine
Aufzählung IM Namen, kein Titel-Trenner, und der Schnitt traf mitten hinein. Ab vier Teilen
wird deshalb nicht mehr zerlegt. **Merksatz: Nach einem Fix an einem Extraktor läuft die
Messung noch einmal — ein Fix kann eine neue Fehlerklasse öffnen, und die sieht genauso
plausibel aus wie die alte.**

### Der Firmenname war der dritte Fehlgriff, und er fiel erst in der Liste auf

In der Datenbank sahen die Namen unauffällig aus. Untereinander in einer Ansicht standen
dann: „Impressum - 3E-Elektrotechnik GmbH", „Home | ABEL ReTec", „Kontakt Wagner GmbH",
„Name 3NERGY GmbH Adresse Am Pönitzer Dreieck 1" — und einmal bloß „GmbH & Co. KG" ganz
ohne Namen. Herkunft: die Überschrift des Impressums oder der Seitentitel als Rückfall.

In einem Anschreiben wäre jeder davon peinlich, und genau dafür wird der Name irgendwann
gebraucht. Die Reinigung ist deshalb streng: **Was nach dem Putzen nur noch aus einer
Rechtsform besteht, wird verworfen — lieber kein Name als ein falscher.**

**Merksatz, jetzt zum dritten Mal bestätigt:** Eine Spalte prüft man nicht in der
Datenbank, sondern dort, wo sie später gelesen wird. Erst die Liste macht sichtbar, was
einzeln plausibel aussieht.

### Wer mehr gesehen hat, gewinnt — und das ist nicht der spätere Lauf

Die schwerste Falle dieser Runde, und sie war nur durch Nachzählen zu finden: Ein
Wiederholungslauf der Profil-Phase **nahm die Erkenntnisse der Kontakt-Phase zurück**. Aus
758 Domains mit dem Vermerk „zweimal geprüft, kein Photovoltaik" wurden wieder 27, und die
55 Betriebe, die erst die Navigation verraten hatte, standen wieder auf „unklar".

Die Ursache ist allgemein: **Zwei Läufe schreiben dasselbe Feld, und der spätere gewinnt —
auch wenn er weniger gesehen hat.** Die Profil-Phase kennt Startseite und Impressum, die
Kontakt-Phase zusätzlich Navigation und Kontaktseite.

Von außen ist der Schaden unsichtbar: Die Zahlen bleiben plausibel, nur die gründlichere
Prüfung ist weg — und dieselben Seiten würden beim nächsten Lauf ein drittes Mal
abgerufen. Die Regel lautet jetzt: Ein erkanntes Nicht-Betrieb-Muster ist ein **Befund**
und gilt immer; die bloße Rückstufung auf „unklar" gilt nur, solange die gründlichere
Prüfung noch nicht gelaufen ist. Festgehalten als Entscheidungstabelle in
`lib/__tests__/fachbetrieb-stand.test.ts`.

### Zwei Fallen beim Schreiben, beide gemessen

Ein einzelnes kaputtes Prozentzeichen in einem fremden Link ließ `decodeURIComponent`
werfen und riss einen Lauf nach 450 von 1.254 Domains ab. Und ein Nullbyte aus einer
Website ließ den ganzen Schreibblock scheitern. Beides ist jetzt abgefangen — wer fremdes
HTML verarbeitet, trifft solche Fälle zwangsläufig; es genügt EINE Seite unter tausenden.

### Das Gewerk — und warum es eine eigene Spalte ist

Auf Vorgabe des Betreibers (28.08.2026), weil die Erhebung später um Heizungsbauer und
weitere Gewerke wachsen soll. **Zu unterscheiden von den Geschäftsfeldern:** Die sagen,
WAS angeboten wird (Photovoltaik, Speicher, Wallbox), das Gewerk sagt, WER es anbietet.
Ein Elektrobetrieb, ein Dachdecker und ein reiner Solarteur bauen dieselbe Anlage und sind
drei verschiedene Gesprächspartner.

Gelesen aus Firmenname, Navigation und Impressum. **Gemessen: 67 % tragen mindestens
eines** — Elektro 1.454, Heizung/Sanitär 513, Solarteur 494, Energieberatung 327,
Dachdecker 241, Zimmerei 98. Mehrere sind erlaubt und der Normalfall im Handwerk; die
Verteilung ist gesund (1.285 mit einem, 608 mit zwei, 153 mit drei, 40 mit vier oder
mehr — und die vierzig sind echte Komplettanbieter, kein Fehlgriff).

Zwei Muster mussten nachgebessert werden, beide vom Test gefunden: **„Elektro" allein**
(die häufigste Schreibweise im Handwerk — die erste Fassung verlangte ein Suffix und fand
„Elektro Klaas GmbH" nicht) und **„Dachdeckerei"**. Gegenprobe im Test: „Elektroauto" und
„Elektromobilität" stehen auf jeder zweiten Solarteur-Seite und sind kein Gewerk.

### Bewertungen: verdreifacht, und trotzdem eine Minderheit

Google bleibt gesperrt. Der zulässige Weg sind die **strukturierten Daten der eigenen
Website** — `AggregateRating` nach schema.org, als JSON-LD oder Microdata. Das ist eine
Selbstauskunft auf einer öffentlichen Seite, genau wie eine Zahl im Fließtext, nur
maschinenlesbar.

**Vorab gemessen an 120 Betrieben:** 6 mit JSON-LD, 3 mit Microdata. Über den ganzen
Bestand hebt das die Quote von 42 auf **156 Betriebe (5 %)**. Die Erwartung „jeder Betrieb
bekommt Sterne" erfüllt kein zulässiger Weg — das ist die ehrliche Antwort auf die Frage,
ob sich Bewertungen ergänzen lassen.

Die Herkunft wird mitgeführt und nie verwischt: Was der Betrieb selbst ausweist, heißt
„eigene Website" — auch dann, wenn er dort seine Google-Sterne wiedergibt. Wir haben die
Zahl von ihm, nicht von Google.

### Das Logo

Das Favicon der eigenen Seite, **Adresse aus dem HTML gelesen statt geraten**. Dieselbe
Lehre wie beim Impressum: `/favicon.ico` ist nur eine von mehreren Konventionen, viele
liegen unter eigenem Pfad, als PNG oder SVG, oft mit Zeitstempel im Namen. Gemessen: 2.796
von 3.117 Betrieben (90 %) haben eines. Geladen ohne Herkunftsangabe, damit der Abruf dem
Betrieb nicht verrät, woher er kommt; fehlt es, bleibt der Platz leer — ein Ersatzbild
würde eine Marke behaupten, die es nicht gibt.

### Die Ansicht

`/admin/fachbetriebe`, eigener Bereich in der Seitenleiste (nicht unter „Versorger" —
Handwerksbetriebe sind eine andere Zielgruppe mit anderem Rechtsrahmen, und der Bereich
wächst um weitere Gewerke).

Eine Tabelle mit Kopfzeile: Logo, Betrieb, Ort, Landkreis (groß) mit Bundesland (klein),
Gewerk, Merkmale, belegte Zahl, Erreichbarkeit, Arbeitsstand. Filter nach Bundesland,
Gewerk, Art, Arbeitsstand, Erreichbarkeit und Meisterbetrieb. Details beim Aufklappen,
Arbeitsstand und Notiz pro Betrieb.

**Die Kopfzeile erklärt sich selbst, wo eine Zahl es nicht tut** — „belegt", „Gewerk" und
„Kontakt" tragen ein „?" mit einer Erklärung. Eine Zahl wie „3/8" ohne Beschriftung ist
eine Behauptung.

**Sie kann bewusst wenig.** Es gibt keinen Versand, kein Anschreiben, keine Auswahlliste.
Die Arbeitsstände heißen „offen · vorgemerkt · angesehen · ungeeignet" — ein Zustand wie
„angeschrieben" würde einen Apparat behaupten, den es nicht gibt; ein Test verbietet
solche Namen.

**Die Zahl neben jedem Betrieb (`3/8`) zählt belegte Merkmale, nicht Qualität.** Ein
Meisterbetrieb, der seinen Titel nicht auf die Website schreibt, bekommt weniger Punkte
als einer, der es tut — die Zahl misst unseren Datenstand, nicht den Betrieb. Deshalb
heißt sie so und steht neben den einzelnen Merkmalen, nicht an ihrer Stelle.

---

# Nachtrag 23.09.2026: die Suche nach NEUEN Quellen für die Trust-Signale

Anlass: Von 3.115 als Betrieb eingeordneten Adressen trägt **weniger als die Hälfte
(1.428, 46 %) überhaupt ein Trust-Signal** — Meisterbetrieb 845, Handwerkskammer 462,
Gründungsjahr 489, Bewertung 160, Innung 44. Zwei Eichungen an je 30 Betrieben hatten
gezeigt, dass ein weiterer Durchgang über dieselben Websites 3 bis 7 Prozent bringt.
Gesucht wurden deshalb **andere Quellen**, nicht ein zweiter Blick auf dieselbe.

Das Ergebnis vorweg: **Von drei geprüften Quellen trägt eine.** Die beiden Register
scheiden aus fachlichen Gründen aus, nicht aus rechtlichen — was die Rechtsprüfung nur
deshalb nicht erspart hat, weil sie parallel lief.

---

## 5. Handelsregister — technisch offen, fachlich UNBRAUCHBAR für das Gründungsjahr

Das ist der teuerste Befund dieser Runde, weil er auf den ersten Blick wie ein Volltreffer
aussieht. Der Zugang ist seit dem DiRUG (01.08.2022) gebührenfrei, das Portal liefert
einen **strukturierten Registerinhalt als XML**, und wir haben zu 1.802 Betrieben eine
Registernummer aus deren eigenem Impressum, bei 1.337 davon zusätzlich das Gericht — also
genau den Schlüssel, mit dem sich gezielt nachschlagen lässt.

**Gemessen am 23.09.2026 an 20 Betrieben aus unserem eigenen Bestand** (10 zufällig über
Registerarten und Bundesländer verteilt, 10 weitere gezielt solche, deren Gründungsjahr
wir aus ihrer Website bereits kennen):

| Was das Register liefert | Ergebnis |
|---|---|
| Treffer über Registernummer + Gericht | 18 von 20 |
| Rechtsform, Sitz, Anschrift, letzte Eintragung | zuverlässig |
| **Datum der ersten Satzung** | **nur 6 von 20** |
| Datum der ersten Satzung bei Personengesellschaften (HRA) | **nie** — eine KG hat keine Satzung |

**Der eigentliche Befund ist aber nicht die Lücke, sondern die systematische Abweichung.**
Wo wir das Gründungsjahr von der Website kennen und das Register ein Datum liefert, sind
es nicht dieselben Jahre:

| Betrieb sagt auf seiner Website | Register sagt | Abstand |
|---|---|---|
| 1932 (Heizungsbetrieb, Landshut) | Gesellschaftsvertrag 2008, „entstanden durch Abspaltung" | 76 Jahre |
| 1931 (Wärmetechnik, Sachsen) | „Beginn: 02.12.2002" | 71 Jahre |
| 1932 (Haustechnik, Osnabrück) | „Tag der ersten Eintragung: 18.01.1951", Beginn 1967 | 19 Jahre |
| 1937 (Elektro, Krefeld) | Satzung 1985 | 48 Jahre |

**Das Register misst, seit wann die heutige RECHTSFORM eingetragen ist — nicht, seit wann
der Betrieb besteht.** Jede Umwandlung, Abspaltung, Sitzverlegung oder Umschreibung auf
EDV setzt die Uhr neu. Der Fehler geht dabei immer in dieselbe Richtung: zu jung, und zwar
am stärksten bei genau den alten Familienbetrieben, bei denen das Signal am meisten wert
wäre. **Zwei Drittel unserer bekannten Gründungsjahre liegen vor 2010** (312 von 489,
Median 2006) — also im Bereich, in dem die Registerzahl systematisch falsch wäre.

Aus einem 94 Jahre alten Handwerksbetrieb würde auf unserer Seite eine Gründung von 2008.
Das ist nicht „ungenau", das ist die Fehlerklasse, die CLAUDE.md an erster Stelle nennt:
eine Zahl, die etwas anderes misst als ihre Beschriftung sagt.

**Zwei Nebenbefunde, die bleiben:**

- **Unsere Registernummern zeigen teils auf eine ANDERE Firma, als der Betrieb heißt.**
  Unter 20 Nachschlägen viermal: Der Name im Register war „b&m GmbH" statt Becker Aalen,
  „Blinktank GmbH" statt AmtsGuide, „ieQ-systems Elektro" statt alpha-solar-power,
  „Konopka & Pasch" statt Elektro Smart. Teils ist das Marke gegen Rechtsträger (also
  richtig), teils vermutlich eine falsch ausgelesene Nummer. **Automatisch ist das nicht
  zu unterscheiden** — ein Lauf würde einem Teil der Betriebe stillschweigend die Daten
  einer fremden Firma anhängen.
- **Was das Register DOCH zuverlässig sagt, ist der Status:** „aktuell" gegen gelöscht.
  Das wäre ein echtes Signal („besteht noch"), aber es ist ein negativer Filter, kein
  Vertrauensmerkmal, und es beantwortet keine Nutzerfrage.

### Die Rechtslage — geprüft, und sie hätte getragen

Die Prüfung lief parallel und ist nicht umsonst, weil ihre Ergebnisse für jeden künftigen
Registerabruf gelten:

- **§ 9 Abs. 1 S. 1 HGB erlaubt die Einsicht „durch einzelne Abrufe".** Die drei Worte
  sind mit dem DiRUG zum 01.08.2022 eingefügt worden, zeitgleich mit dem Wegfall der
  Gebühren; die Begründung (BT-Drs. 19/30523) nennt als Zweck ausdrücklich, „dass ein
  Massenabruf von Registerdaten zu anderen hiervon nicht umfassten Zwecken, insbesondere
  einer kommerziellen Weiterverwendung […] verhindert wird". **Ob eine Kette einzelner
  Abrufe die Schranke verlässt, ist nicht entschieden** — dazu wurde keine Rechtsprechung
  gefunden.
- **Es GIBT eine Nutzungsordnung, und sie ist eindeutig.** Sie liegt unter „Informationen"
  im Portal und ist über einen gewöhnlichen Abruf nicht erreichbar, weil die ganze
  Anwendung über Formular-Absendungen läuft — deshalb wird sie leicht übersehen. Drei
  Zahlen daraus: **höchstens 60 Suchen oder Rechtsträger-Aufrufe pro Stunde**;
  **„systematische Abrufe, um parallele Voll- oder Teilregister aufzubauen, auszubauen
  oder zu aktualisieren, sind unzulässig"**; für mehr gibt es ein **Antragsverfahren** bei
  der Servicestelle am Amtsgericht Hagen. Das Portal sperrt bei Verdacht einzelne
  Adressen.
- **Das Datenbankherstellerrecht trägt hier NICHT** (anders als beim Impressum des
  Unternehmensregisters behauptet): Das Register *erzeugt* seinen Inhalt hoheitlich, statt
  ihn zu beschaffen (EuGH C-444/02), und seit der Abruf gebührenfrei ist, gibt es keine
  Amortisation, die ein Abruf gefährden könnte (EuGH C-762/19).
- **Das Unternehmensregister ist der schlechtere von beiden Wegen.** Seine
  Crawler-Anweisung sperrt Suche und Registerinformationen ausdrücklich (am 23.09.2026
  gemessen), während das Registerportal gar keine hat und seine Erlaubnis positiv
  formuliert.
- **Eine amtliche Schnittstelle für Massenabrufe gibt es nicht** — obwohl die EU-Kategorie
  der hochwertigen Datensätze (Durchführungsverordnung 2023/138, Anhang Nr. 5) seit dem
  09.06.2024 genau „Datum der Eintragung" und „Rechtsform" als maschinenlesbar
  bereitzustellende Merkmale nennt. Ein Umsetzungsstand in Deutschland war nicht
  auffindbar.
- **„Handelsregister" darf kein Etikett für unseren Bestand werden** (§ 8 Abs. 2 HGB):
  Eine Angabe am einzelnen Betrieb ist vertretbar, der Datenbestand als Ganzes darf so
  nicht bezeichnet, beworben oder angeboten werden.

**Nicht erneut aufmachen.** Das Register liefert das gesuchte Merkmal nicht. Wer es
trotzdem für die Rechtsform oder den Fortbestand abrufen will, findet oben die Auflagen —
und stellt vorher die Frage, ob 1.337 Abrufe bei 30 pro Stunde (rund 90 Stunden Laufzeit)
und eine Ergänzung der Datenschutzerklärung den Nutzen wert sind.

### Die Handwerksrolle: Aufwand geschätzt, nicht angegangen

Bleibt als amtliche Quelle für den Meisterbetrieb (§ 6 Abs. 2 HwO, Rechtslage im
Abschnitt 2 oben geprüft). **Der Aufwand ist der Grund, warum sie liegen bleibt:** 53
Kammern, je ein eigener Antrag mit Darlegung des berechtigten Interesses, Ausgang je
Kammer offen, keine Schnittstelle.

**Der Ertrag ist gemessen und kleiner, als er klingt.** Die Handwerksrolle führt nur
zulassungspflichtige Handwerke; von unseren 3.115 Betrieben tragen **1.757 (56 %)**
überhaupt eines davon (Elektro, Heizung/Sanitär, Dachdecker, Zimmerer), und bei **1.035**
davon fehlt der Meisterbeleg — das ist die Obergrenze dessen, was 53 Anträge einbringen
könnten. Die übrigen 1.358 stehen dort strukturell nicht: 327 sind reine Solarteure oder
Energieberater, bei 1.031 haben wir bisher gar kein Gewerk erkannt.

Gegenrechnung: Wir vermuten das Merkmal ohnehin bei fast allen Elektrobetrieben; was fehlt,
ist nicht die Tatsache, sondern ihr Beleg. **Der billigste Beleg bleibt die Frage beim
Erstkontakt** — sie erreicht alle 3.115 statt 1.035 und kostet keinen Antrag.

---

## 6. Die Innungsverzeichnisse — fachlich die beste Quelle, und trotzdem abgesagt

Die Fachbetriebssuche der Elektro- und Informationstechnischen Handwerke führt die
Innungsmitglieder; ein Treffer dort IST das Signal „Innungsfachbetrieb" — eines der fünf
gesuchten, und dasjenige, das uns mit 44 von 3.115 am meisten fehlt. Betrieben wird sie
von einer Werbe-Tochter des Zentralverbands, der nach eigener Angabe rund 49.000 Betriebe
vertritt.

**Gemessen am 23.09.2026 an 24 unserer Elektrobetriebe**, gesucht über den Betriebsnamen,
abgeglichen über die Mail-Domain des Treffers:

| | |
|---|---|
| eindeutig wiedergefunden (Mail-Domain identisch) | **8 von 24 (33 %)** |
| Namenstreffer, aber anderer Ort — also ein fremder Betrieb | 2 |
| kein Treffer | 14 |

Das ist die mit Abstand beste gemessene Quote dieser Runde — viermal so gut wie das
Kammer-Werbeverzeichnis (1 von 12) und deutlich besser als ein erneutes Lesen der eigenen
Websites (3 bis 7 %). Auf die 1.454 Betriebe mit Elektro-Gewerk hochgerechnet wären das
**grob 480 zusätzliche Innungsbelege** — gegenüber 44 heute.

**Drei Eigenschaften, die den Weg überhaupt gangbar machen:**

1. **Die Namenssuche braucht keine Einwilligung.** Nur die Ortssuche verlangt die
   Zustimmung zu einem Kartendienst; über den Betriebsnamen geht es ohne.
2. **Der Treffer trägt eine E-Mail-Adresse** — damit gibt es einen maschinell prüfbaren
   Abgleich gegen unsere Domain statt eines Namensvergleichs.
3. **Die Crawler-Anweisung erfasst den Such-Endpunkt nicht** (sie sperrt Verwaltungs- und
   Upload-Pfade). **Meine erste Messung sagte „es gibt gar keine" und war falsch** — ich
   hatte die Weiterleitungs-Domain abgerufen und bin auf die Suchseite umgeleitet worden,
   also HTML statt der Datei bekommen. Wer eine solche Datei prüft, folgt keiner
   Weiterleitung und sieht sich den Antworttyp an.

**Und drei Fallen, die beim Eichen schon zugeschlagen haben:**

- **Die Namenssuche ist unscharf.** „Blaschke" liefert vier Treffer, keiner davon unser
  Betrieb; „Janssen" vierzehn. **Ein Treffer zählt nur mit übereinstimmender Mail-Domain**
  oder, ersatzweise, übereinstimmender Postleitzahl — sonst hängen wir einem Betrieb die
  Innungsmitgliedschaft eines fremden an. Genau dieser Fehler wäre bei zwei der 24
  passiert.
- **Postleitzahlen weichen um Stadtteile ab** (75175 gegen 75181 in derselben Stadt). Ein
  reiner Postleitzahl-Vergleich ist zu streng, ein reiner Ortsname-Vergleich zu weit.
- **Die Formular-Absendung trägt eine Prüfsumme**, die an die geladene Seite gebunden ist.
  Ein nachgebauter Abruf ohne vorheriges Laden der Seite scheitert stumm mit einer
  Fehlermeldung von 53 Zeichen — er sieht aus wie „kein Treffer". **Wer das nachbaut,
  prüft zuerst gegen einen Betrieb, von dem er WEISS, dass er drin steht.**

### Und dann das Verbot, gefunden eine Stunde vor der Empfehlung

**Beide Verzeichnisse untersagen genau diese Nutzung, im Wortlaut.** Auszüge liegen in
`docs/quellen/fachbetriebe/innungsverzeichnisse-nutzungsklauseln-2026-09-23.txt`.

Bei den E-Handwerken steht die Klausel **nicht** unter der Überschrift
„Nutzungsbedingungen" — die betrifft dort nur Bilder —, sondern im **Impressum** unter
„Hinweis und Haftungsausschluss":

> „Nicht erlaubt ist eine kommerzielle Nutzung der Daten, wie zum Beispiel zum Aufbau
> eigener Systeme und Dienste bzw. **Verzeichnisse jeglicher Art**. Außerdem ist das
> **automatische Auslesen von Daten durch Software untersagt**."

Der SHK-Zentralverband sagt dasselbe noch deutlicher und nennt die Rechtsfolge:

> „Jede zweckfremde Nutzung oder Verwertung ist unzulässig. So ist insbesondere die
> vollständige, teilweise oder auszugsweise Verwendung der gelisteten Daten im Internet
> für gewerbliche Adressenverwertung, kommerzielle Auskunftserteilung oder **als Unterlage
> bzw. Hilfsmittel für die Zusammenstellung oder Ergänzung von Teilnehmer-, Adress- oder
> anderen Verzeichnissen** in jeder medialen Form […] sowie **das Auslesen der Daten im
> Internet zu den vorgenannten Zwecken** […] nicht gestattet und wird von den Anbietern
> nach geltendem Recht unter Ausschöpfung des Rechtsweges verfolgt."

Das sind nicht zwei Formulierungen, die man auslegen müsste. Beide nennen unseren
Anwendungsfall bei seinen zwei Bestandteilen: ein Verzeichnis aufbauen und dafür
maschinell auslesen.

**Eine Lehre ist, WO die Klausel stand.** Gesucht hatte ich unter „Nutzungsbedingungen"
und in der Crawler-Anweisung; sie steht im **Impressum**, zwischen Registernummer und
Haftungsausschluss für Links — und die Überschrift „Nutzungsbedingungen" auf derselben
Seite betrifft nur Bilder. Dieselbe Falle wie beim Registerportal, dessen Nutzungsordnung
hinter einer Formular-Navigation liegt. **Wer eine fremde Quelle bewertet, liest das ganze
Impressum und die ganze Datenschutzerklärung, nicht nur die Stelle, wo so etwas hingehört.**

### Die zweite Lehre ist unbequemer: meine Begründung war falsch, das Ergebnis richtig

Ich hatte den Abgleich mit „die Klausel verbietet es" abgesagt. **Der Legal-Judge hat das
gekippt, und er hat recht.** Der BGH sagt in „Flugvermittlung im Internet" (I ZR 224/12,
Rn. 38) wörtlich, der so erklärte Wille sei „für sich genommen unbeachtlich" — und zwar in
einem Fall, in dem der Nutzer die Bedingungen **aktiv per Häkchen angenommen** hatte. In
„Automobil-Onlinebörse" (I ZR 159/10) war die Klausel **schärfer** als die hier („eine
automatisierte Abfrage durch Scripte o. ä. ist nicht gestattet"), und die Klage wurde
abgewiesen. Vertraglich kommt bei einer frei bedienbaren Suchmaske nichts zustande, und
käme etwas zustande, machte § 87e UrhG die Klausel unwirksam, soweit sie unwesentliche
Teile erfasst. **Wer einen Abruf mit „die Nutzungsbedingungen verbieten es" absagt, sagt
ihn mit einem Argument ab, das vor Gericht nicht hält — und benutzt es beim nächsten
Verzeichnis wieder.**

**Was das Ergebnis wirklich trägt, sind vier andere Gründe:**

1. **Die ANZEIGE ist das Risiko, nicht der Abruf — und das ist der Befund dieser Runde.**
   Bei einem Drittel Trefferquote steht bei einem Drittel der Betriebe „Innungsfachbetrieb"
   und bei zwei Dritteln nichts. Der Leser schließt daraus, die anderen seien **keine** —
   und das ist bei den meisten falsch, weil die Lücke an unserem Namensabgleich liegt, nicht
   an ihrer Mitgliedschaft. Damit ist die Anzeige eine irreführende Angabe über die
   Mitgliedschaft eines Dritten (§ 5 Abs. 2 Nr. 3 UWG nennt „Mitgliedschaften"
   ausdrücklich), und anspruchsberechtigt ist **jeder einzelne nicht gefundene Betrieb**.
   Die Abhilfe — an jedem Betrieb ohne Treffer „nicht geprüft" zu schreiben — nimmt dem
   Merkmal seinen ganzen Wert.
2. **Hier steht eine Organisationsfamilie gegenüber, die das Gesetz zur Verfolgung berufen
   hat.** § 8 Abs. 3 Nr. 4 UWG nennt „die nach der Handwerksordnung errichteten
   Organisationen" — Innungen, Landes- und Bundesinnungsverbände, ohne dass sie in einer
   Liste stehen müssten. Das ist das Gegenteil der Kommunen-Lage, aus der dieses Projekt
   seine Gelassenheit bezieht, und der SHK-Verband kündigt die Verfolgung in seiner Klausel
   sogar an.
3. **Unsere eigene Belegpflicht hebelt das tragende Rechtsargument aus.** „Wir behalten nur
   ein Ja/Nein" gilt nur, solange niemand die Trefferzeile speichert — und CLAUDE.md
   verlangt „kein Merkmal ohne Beleg" mit Fundstelle und Textstelle. Wer das befolgt,
   speichert 1.100 Trefferzeilen mit Name, Anschrift, Telefon und Mail, und dann ist das
   Argument weg. Auflösbar wäre es (Beleg = abgerufene Adresse, Zeitpunkt, Suchbegriff,
   gefunden ja/nein, **ohne Zitat**), aber es muss vor dem Bauen entschieden werden.
4. **Der Ertrag ist ein Drittel eines Merkmals, das beim Erstkontakt vollständig zu haben
   ist.**

**Das Datenbankrecht ist dabei NICHT der Grund**, und der Merksatz aus dem Förderbereich
trägt hier tatsächlich nicht: In einem Mitgliederverzeichnis wird nichts ausgewählt. Ein
Schutzrecht besteht wahrscheinlich trotzdem (die Schwelle ist niedrig, und Geokoordinaten,
Fachgebiete und Qualifikationskategorien sind eine Investition in Überprüfung und
Darstellung) — aber ein lesender Abgleich, der das Verzeichnis nicht wiedererstellt, ist
von der Schranke für unwesentliche Teile nicht erfasst.

**Ebenfalls geprüft und entkräftet:** Die Prüfsumme im Suchformular ist **keine technische
Schutzvorrichtung** im Sinne der Rechtsprechung. Sie steht im Klartext in der ausgelieferten
Seite, ist für jeden Besucher gleich, sichert die zulässigen Feldnamen und unterscheidet
einen Bot von keinem Browser. Ein Captcha gibt es nicht. **Sollte bei einem Lauf je eine
Sperre oder Bot-Erkennung sichtbar werden, kippt diese Bewertung** — ab dann läge eine
technische Maßnahme vor, und sie zu umgehen wäre unlauter.

**Was bleibt, sind zwei Wege ohne Abruf:**

1. **Den Verband fragen.** Beide betreiben ihr Verzeichnis als Werbeleistung für ihre
   Mitglieder; ein unabhängiger Rechner, der Innungsbetriebe als solche ausweist, ist für
   sie nicht offensichtlich ein Gegner. Das ist Außenkontakt und damit eine Entscheidung
   des Betreibers.
2. **Den Betrieb selbst fragen**, beim ohnehin geplanten Erstkontakt. Dasselbe Ergebnis
   wie beim Meisterbrief: Wer Innungsmitglied ist, sagt es — kostenlos, aktuell und ohne
   jede Rechtsfrage.

**Die gemessene Trefferquote bleibt trotzdem wertvoll:** Sie sagt, dass rund ein Drittel
unserer Elektrobetriebe Innungsmitglied ist. Das ist die Erwartung, gegen die sich die
Ausbeute des Erstkontakts messen lässt.

---

## 7. Bewertungen: die Sperre war zu weit, und die Messung dreht die Frage

Die bisherige Linie lautete: Bewertungen anzeigen ist gesperrt, weil wir die Echtheit
nicht sicherstellen können. **Zwei von drei Bausteinen dieser Begründung halten nicht**
(Legal-Judge 23.09.2026, Gegenprüfung lief bei Abfassung noch):

- **§ 5b Abs. 3 UWG verlangt keine Prüfung, sondern eine ANGABE** — „Informationen darüber,
  **ob und wie**". Die Gesetzesbegründung sagt ausdrücklich: „Ergreift er gar keine
  Maßnahmen, muss er auch über diesen Umstand informieren." Nichtprüfen ist kein Verstoß,
  Nichtsagen ist einer.
- **Ein reiner LINK löst die Pflicht gar nicht aus.** Wieder die Begründung im Wortlaut:
  „Verweist der Unternehmer lediglich über einen Link auf Verbraucherbewertungen […],
  besteht die Pflicht nicht."
- **Ein dritter Befund hielt der Gegenprüfung NICHT stand, und das ist festzuhalten,
  damit er nicht zurückkommt.** Der erste Prüfer entnahm der BGH-Entscheidung I ZR 143/23,
  bei Werbung mit einem Sterne-Durchschnitt seien zusätzlich Gesamtzahl **und
  berücksichtigter Zeitraum** anzugeben — und folgerte daraus einen harten Blocker, weil
  eine strukturierte Bewertungsangabe auf einer Website keinen Zeitraum liefert. Der
  Gegenprüfer hat das Urteil im Volltext gelesen: **Zu dieser Angabe hat das Landgericht
  verurteilt, und nur die Klägerin ging in Revision, allein wegen der
  Sterneklassen-Aufschlüsselung.** Der BGH bezeichnet die Verurteilung selbst als
  rechtskräftig und hat die Frage nie geprüft. **Wer diesen Blocker wiederverwendet,
  beschafft zuerst die Fundstelle.**

  **Praktisch bleibt die Angabe trotzdem geschuldet, und das ist die ehrliche Fassung:**
  Der amtliche Leitsatz des BGH stellt die Entbehrlichkeit der Sterneklassen-Aufschlüsselung
  ausdrücklich unter die Bedingung, „wenn die Gesamtzahl und der Zeitraum der
  berücksichtigten Bewertungen angegeben ist". Getragen ist sie nur von einer ersten
  Instanz, aber es gibt keine Gegenstimme, und die Wettbewerbszentrale verfolgt das Thema.
  **Und ein „Stand des Abrufs" ersetzt den Zeitraum nicht** — verlangt ist die
  Erhebungsspanne der eingeflossenen Bewertungen, damit der Leser einschätzen kann, was
  eine Note aussagt; 4,7 aus 30 Bewertungen eines halben Jahres und 4,7 aus 30 über zwölf
  Jahre sind zwei verschiedene Aussagen und können am selben Tag abgerufen sein. Aus einer
  strukturierten Angabe auf einer fremden Website ist diese Spanne nicht ableitbar.

**Und dann die Messung, die die Quellenfrage entscheidet.** An 157 bzw. 116 zufälligen
Betriebs-Startseiten geprüft, wer überhaupt auf welche Bewertungsplattform verweist:

| Plattform | Anteil der Betriebe |
|---|---|
| **Google, echter Profil- oder Bewertungslink** (Kurzlink zum Eintrag, Rezensionsansicht) | **12 %** |
| Google, aber nur eine eingebettete Karte — kein Weg zu den Bewertungen | 8 % |
| strukturierte Bewertungsangabe im Seitenquelltext | 7 % |
| ProvenExpert | 3 % |
| Trustpilot | 1 % |
| Trusted Shops | 0 % |

**Die erste Fassung dieser Messung sagte 34 % und war falsch.** Das Muster zählte jede
Google-Karten-Adresse mit — also auch die Anfahrtskarte im Seitenfuß, die zu keiner
einzigen Bewertung führt. Erst ein Muster, das ausschließlich Eintrags-Kurzlinks und
Rezensionsansichten zählt, ergibt die 12 %. **Ein Link auf eine Karte ist kein Link auf
Bewertungen**, und der Unterschied ist hier der zwischen einem Drittel und einem Achtel
des Bestands.

**Daraus folgt die ganze Strategie.** Eine Lizenz bei der einzigen Plattform, die eine
Drittanzeige überhaupt vertraglich vorsieht (Trustpilot, „Review Syndication", Preis nicht
öffentlich), deckte **rund ein Prozent** unserer Betriebe ab — und verböte zugleich
strukturiertes Markup, verlangte einen Folgen-Link nach außen und das Nicht-Indexieren der
Inhalte. Die Bewertungen dieses Marktes liegen bei Google, und Google ist als Quelle
dreifach zu (Maps-Bedingungen, Business-Profile-Regeln, allgemeine API-Bedingungen) — auch
mit schriftlicher Zustimmung des Betriebs, weil die Klauseln **uns als Abrufer** binden.

**Der Weg, der bleibt und nichts kostet: den Google-Profil-LINK vom Betrieb selbst
einsammeln.** Er steht bei 12 % der Betriebe auf ihrer eigenen Startseite, der Betrieb hat
ihn dort selbst hingesetzt, und ein Link ist keine Vervielfältigung. „Bewertungen bei
Google ansehen" beantwortet die Nutzerfrage, ohne eine einzige der drei Hürden zu berühren.

**Zwölf Prozent sind wenig, und das gehört dazugesagt.** Der Weg trägt die Nutzerfrage
nicht allein; er ist das, was ohne Lizenz, ohne Abruf bei Google und ohne Rechtsfrage zu
haben ist. Die Unterseiten sind dabei ungemessen — geprüft wurden nur Startseiten, und ein
„Über uns" oder „Kontakt" trägt den Link vermutlich häufiger. **Der zweite, sichere Weg ist
wieder der Erstkontakt:** Nach dem Profil-Link zu fragen kostet eine Zeile im Anschreiben.

**Was NICHT wiederkommen darf:** die alte Begründung „wir können nichts überprüfen, also
gar nichts anzeigen". Sie ist in dieser Form widerlegt.

**Was an ihre Stelle tritt, ist enger und härter belegt — drei Funde der Gegenprüfung:**

- **Ein kleingedruckter oder aufklappbarer Gegenhinweis heilt die Sache NICHT.** Das OLG
  Köln (6 U 59/24, Rn. 52) hat genau diese Gestaltung verworfen: Die Aufklärung „erfolgt
  nur dann, wenn das Feld ‚Hinweis zu den Bewertungen' angeklickt wird, was indes nicht
  alle Verbraucher tun werden und die unzulässige Behauptung als solche mithin nicht
  beseitigt." Und: „Eine Blickfangwerbung setzt Nr. 23b des Anhangs zu § 3 Abs. 3 UWG
  nicht voraus." Damit ist der naheliegende Ausweg — Sterne zeigen und daneben klein
  dazuschreiben, dass wir nicht prüfen — versperrt.
- **Schon die BESCHRIFTUNG erzeugt die Behauptung.** Die Leitlinien der EU-Kommission zur
  Richtlinie über unlautere Geschäftspraktiken sagen, „auch allgemeinere Verweise auf
  ‚Verbraucherbewertungen' oder ‚Kunden-/Nutzerbewertungen'" könnten dazu führen, dass der
  Durchschnittsverbraucher sie als Bewertungen von Käufern wahrnimmt. Dieselben Leitlinien
  stellen ausdrücklich klar, dass die Pflicht **auch den trifft, der die Bewertungen eines
  anderen Gewerbetreibenden zeigt** — also uns.
- **Der nächstliegende Präzedenzfall liegt in unserer eigenen Branche.** Das OLG Koblenz
  hat 2026 (9 U 1015/25, Vorinstanz LG Mainz) auf Klage der Wettbewerbszentrale einen
  **Photovoltaik-Anbieter** unter anderem wegen Kundenbewertungen ohne Echtheitsangabe
  verurteilt. **Nicht die Handwerkskammern sind hier der realistische Angreifer** (sie sind
  zwar nach § 8 Abs. 3 Nr. 4 UWG berechtigt, es ist aber kein einziges UWG-Verfahren einer
  Kammer auffindbar), sondern die Wettbewerbszentrale und Mitbewerber — und die haben in
  dieser Branche genau diese Normkombination bereits durchgesetzt.

**Daraus die Linie, die bleibt:** kein Sterne-Durchschnitt, solange wir die Echtheit nicht
positiv zusichern können — und ein Gegenhinweis daneben rettet ihn nicht. Was geht, ist der
**Link** auf das Profil, das der Betrieb selbst veröffentlicht hat; die Pflicht entsteht
dort nach der Gesetzesbegründung gar nicht erst.

**Der Hebel, den beide Prüfer erst spät gesehen haben, hat mit Bewertungen gar nichts zu
tun und greift früher:** Wer Verbrauchern eine Suche über mehrere Anbieter anbietet, muss
die Hauptparameter seiner Reihenfolge und deren Gewichtung offenlegen (§ 5b Abs. 2 UWG).
Das gilt, sobald das Verzeichnis sortiert — also ab dem ersten Tag und unabhängig davon,
ob je eine Bewertung angezeigt wird. Die Wettbewerbszentrale hat deswegen nach Angabe des
Gegenprüfers 33 Vergleichsportale abgemahnt. **Das ist vor dem Livegang des Verzeichnisses
zu klären, nicht danach.**

---

## Was diese Erhebung ausdrücklich NICHT ist

Sie baut keinen Vermittlungsweg, kein Anschreiben, kein Cockpit und verschickt nichts.
Die Zusage „ohne Verkaufsanrufe · keine Lead-Erfassung · kein Vertriebskontakt" steht an
vierzehn Stellen im Code und in der Datenschutzerklärung und wird hier nicht angefasst.

**Zwei Fragen, die vor jeder Nutzung der Adressen zu klären sind — beide gehören dem
Betreiber, nicht dem Code:**

1. **Würde ein Fachbetrieb ein Widget einbetten, das ihm keine Leads liefert?** Der
   Wettbewerbsbefund nennt das selbst als ungeklärt und sagt, es sei „eine Frage an drei
   Betriebe, nicht an eine Datenbank". Erheben ist billig und reversibel, ein Versandschub
   nicht — deshalb ist die Erhebung trotzdem vorgezogen worden; die Frage bleibt offen.
2. **Datenschutz vor dem ersten Kontakt.** Die Sätze enthalten bei Einzelunternehmern
   personenbezogene Daten (Name, Telefon, E-Mail). Für die Erhebung selbst trägt Art. 6
   Abs. 1 lit. f DSGVO; sobald kontaktiert wird, greift die Informationspflicht nach
   Art. 14 — dieselbe Lage wie bei den Gemeindebriefen, wo sie über den
   Datenschutz-Einzeiler in der Mail gelöst ist. Die Datenschutzerklärung nennt diese
   Verarbeitung heute **nicht**; das ist Schritt eins jeder Nutzung, nicht der Erhebung.
