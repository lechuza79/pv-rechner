# Die Werkzeuge im Einzelnen — bedient, nicht angesehen

**Stand 05.09.2026.** Interne Arbeitsgrundlage. Grundlage der Auswahl ist
`versorger-wettbewerb.md`: 26 von 864 deutschen Versorgern haben ein
bestätigtes Rechenwerkzeug, verteilt auf zwölf verschiedene Produkte. Dieses
Papier prüft die Produkte selbst — jedes wurde mit demselben Beispielhaushalt
durchgerechnet, nicht bloß angesehen.

**Referenzfall:** Einfamilienhaus, Satteldach Süd, 30°, 60 m² nutzbar (~10 kWp),
4 Personen, 4.000 kWh im Jahr, Speicher ja. Wo ein Werkzeug regional gesperrt
ist, steht die tatsächlich verwendete Adresse beim jeweiligen Profil.

---

## Der unbequemste Befund zuerst

**„Ergebnis sofort, ohne Kontaktdaten" ist kein Alleinstellungsmerkmal.** Von den
geprüften Werkzeugen geben es heraus, ohne nach Namen zu fragen:

| | Ergebnis ohne Datenabgabe |
|---|---|
| Eturnity | ja, vollständig |
| Reonic | ja, sofort |
| tetraeder-Kataster (Kreis/Stadt) | ja, vollständig |
| PVGIS | ja |
| HTW-Unabhängigkeitsrechner | ja |
| Bundesverband-Wärmepumpe-Förderrechner | ja |
| Stadtwerke Bernau (eigen) | ja, gemessen an null Netzwerkaufrufen |
| **tetraeder-Konfigurator (Emden)** | **nein** — rechnet Kosten und Amortisation, zeigt sie aber nicht |
| **Havelstrom Zehdenick (eigen)** | **nein** — alles hinter Anrede, Name, Adresse, Mail, Telefon |

Zwei von neun halten zurück. Wer den Satz weiter als Vorsprung führt, wird beim
ersten Vergleich widerlegt.

**Auch der gerechnete Eigenverbrauch trägt nicht mehr allein.** Eturnity, Reonic
und das tetraeder-Kataster rechnen ihn aus einem Stundenlastgang, mit
wählbarem oder simuliertem Profil. Abgefragt oder fest verdrahtet ist er nur
dort, wo ohnehin wenig gerechnet wird — bei Zehdenick steht er als feste
60 Prozent im Skript.

### Was tatsächlich unterscheidet

Drei Dinge, und nur drei, hat außer uns fast niemand:

1. **Annahmen sichtbar UND editierbar.** Nur das tetraeder-Kataster (Strompreis,
   Modulpreis, Kredit, Lastprofil bis zur handgezogenen Tageskurve) und
   Solarmaker (Strompreis, Einspeisevergütung, Förderung ausdrücklich als
   Annahmen benannt) kommen da mit. Eturnity zeigt außer dem Strompreis nichts;
   Reonic immerhin Preissteigerung.
2. **Die Ertragsquelle wird genannt.** Nur Solarmaker (PVGIS) und PVGIS selbst.
   Eturnity, Reonic und die Kataster nennen keine.
3. **Kommunale Förderung.** Rechnet **keines** der geprüften Werkzeuge. Bernau
   rechnet die Bundesförderung für Wärmepumpen, sonst niemand irgendetwas.

Dazu die Themenbreite: Balkonkraftwerk kommt bei genau einem Werkzeug vor
(Solarmaker, als Montageort), Wärmepumpe bei zweien (Bernau, Solarmaker).

---

## Die gekauften Werkzeuge

### Eturnity (Sachsenwald, Staßfurt, Torgau)

Acht Schritte, beginnend mit dem Einzeichnen des Dachgrundrisses auf dem
Luftbild. Fragt Dachform, Neigung, Ausrichtung, Warmwasser, Heizung, Kühlung und
die Stromrechnung — nicht die Personenzahl, nicht den Verbrauch in kWh.

Das Ergebnis hat sechs Reiter: Unabhängigkeit, Eigenverbrauch, „ein typischer
Tag", CO₂, Wirtschaftlichkeit, wie weiter. Gemessen für Reinbek: 11,27 kWp,
Autarkie 82 %, Eigenverbrauch 31 %, Investition 20.232 €, Amortisation 13,9
Jahre, Stromgestehungskosten 10,6 ct.

**Stärken.** Autarkie und Eigenverbrauch getrennt und je Jahreszeit, dazu ein
Stundenlastgang mit Batterieladung — das kann keine Faustformel. Die Variante
mit und ohne Batterie ist mit einem Klick vergleichbar. Interner Zinsfuß gegen
Bankzins, für Laien verständlich. Ergebnis als teilbarer Link. Sauberes
Mobil-Layout.

**Schwächen.** Regional gesperrt auf 50 km um den Versorger. Fast keine Annahme
sichtbar: kein Einspeisesatz, keine Preissteigerung, keine Förderhöhe, keine
Ertragsquelle. Der intern verwendete Verbrauch weicht unbemerkt von der Eingabe
ab. Dachform-Symbole ohne Beschriftung. Der Kontaktdialog springt beim ersten
Öffnen ungefragt über das Ergebnis.

### Reonic (Schwäbisch Gmünd, Garbsen)

Sechs Schritte, dann eine Auswahl aus vier Festpreis-Paketen des Stadtwerks mit
vollständiger Stückliste. Gemessen: 11,4 kWp mit 5 kWh Speicher, 21.449 €,
Break-Even 9 Jahre, Autarkie 88 %.

**Stärken.** Schnellster Weg zum Ergebnis. Strompreis und Preissteigerung stehen
sichtbar und sind wählbar. Echte Festpreise statt Schätzung. Die
Gegenüberstellung „ohne / mit Investition" in Euro pro Jahr ist die klarste der
geprüften Werkzeuge. Der ganze Zustand steht in der Adresse — teilbar, jede
Angabe einzeln nachträglich änderbar.

**Schwächen.** **Das Dach wird überhaupt nicht gefragt.** Süd mit 30 Grad steckt
als unsichtbare Vorgabe in der Adresse; ein Ost-West-Dach bekommt dasselbe
Ergebnis wie ein Süddach. Der zugrunde gelegte Ertrag von rund 1.216 kWh je kWp
für München ist auffällig hoch und ohne Quellenangabe nicht nachprüfbar. Keine
Förderung, kein Einspeisesatz als Zahl. Auf dem Handy liegt das Ergebnis unter
der Paketliste.

### tetraeder — zwei verschiedene Produkte

**Das Kataster** (Kreis Grafschaft Bentheim, Kreis Plön, Stadt Iserlohn, und als
gekaufte Instanz bei den Blomberger Versorgungsbetrieben) ist eine vorab
gerechnete Dachdatenbank aus Laserscan-Daten. Jedes Gebäude im Gebiet ist
vermessen: Teilflächen mit Neigung, Ausrichtung, Fläche und einer
Einstrahlungs-Wärmekarte, die Verschattung durch Nachbarhäuser und Bäume
sichtbar macht.

Gemessen für Schüttorf: 5,72 kWp, 4.811 kWh, Autarkie 35 %, Eigenverbrauch 32 %,
Baukosten 8.580 €, Amortisation 19 Jahre, Kapitalrendite 0,25 % — alles ohne
jede Datenabgabe.

**Stärken.** Vermessene Dächer statt Angaben. Vollständige Wirtschaftlichkeit
ohne Formular. Alles editierbar bis zur manuellen Modulplatzierung auf dem
Dachpolygon und der von Hand verformbaren Tageskurve. Neun wählbare Lastprofile.
Solarthermie und Gründach. Ein ehrlicher Hinweis, dass die Preise abweichen
können, mit Verweis auf die unabhängige Energieberatung.

**Schwächen.** Man muss sein Dach auf einer Karte treffen — am Handy Glückssache.
Der Assistent öffnet in einem neuen Fenster ohne Adressbezug, nur mit einer
Gebäudenummer. Keine Förderung, kein Einspeisesatz als Zahl. Die Voreinstellungen
(32 ct, 1.500 €/kWp) stehen ohne Quelle und ohne Datum. Die Befliegungsdaten sind
teils fünf Jahre alt, neue Häuser fehlen.

**Die Zugriffssperre ist selbst ein Verkaufsargument.** Nach wenigen Aufrufen je
Anschluss schaltet tetraeder ein Captcha vor den Assistenten, mit dem Hinweis
„für gewerbliche Zwecke kontaktieren Sie uns". Gemessen: Die Sperre hielt über
22 Minuten. Wer als Stadtwerk drei Nachbarhäuser vergleichen oder das Kataster am
Telefon vorführen will, sitzt nach ein paar Klicks fest — und ein Kunde, der
zwischen zwei Dachvarianten schwankt, ebenfalls. Ein eingebettetes Werkzeug ohne
diese Grenze ist an dieser Stelle schlicht besser.

**Der wichtigste Einzelbefund dieser Erhebung steht hier:** Die beiden Häuser,
die bei tetraeder gekauft haben, haben Verschiedenes gekauft — und keines davon
ist eine bessere Rechnung.

Blomberg betreibt exakt das Landkreis-Produkt als eigene Instanz: identische
Software, identisches Gebäude-Fenster, identischer Assistent wie die kostenlosen
Kataster der Kreise Grafschaft Bentheim und Plön und der Stadt Iserlohn. Ohne
Gründach-Modul und ohne die erklärende Beiseite, die Plön und Iserlohn haben —
also eher weniger als das Gratis-Angebot.

Emden hat den Vertriebstrichter gekauft. **Gekauft wird bei tetraeder nicht
Rechenqualität, sondern die Lead-Erfassung.** Wer einem Stadtwerk ein Werkzeug
verkaufen will, sollte wissen, dass genau das die Kaufmotivation der bisherigen
Kunden war.

**Der Konfigurator** (Stadtwerke Emden) ist etwas anderes: kein Kataster, sondern
ein Vertriebstrichter. Er lädt das Oberflächenmodell beim Klick nach (rund 25
Sekunden) und funktioniert dadurch überall, wo Höhendaten vorliegen — der
Landkreis muss nichts vorab bezahlen.

**Er hält die entscheidenden Zahlen zurück.** Die Rechenschnittstelle liefert
Baukosten (12.900 €), Amortisation (11 Jahre) und Eigenverbrauch (66 %); die
Oberfläche zeigt davon nur „du gewinnst 566 € im Jahr" und „71 % Unabhängigkeit".
Kosten und Amortisation gibt es erst gegen Name, Adresse, Mail und Telefon.

### Solarmaker (Fürstenfeldbruck) — nicht bedient

Vor der ersten Eingabe steht ein Pflichthaken „Ich akzeptiere die AGB und die
Datenschutzbestimmungen" eines Drittanbieters. Eine Vertragsannahme wird hier
nicht ungefragt vorgenommen; das Werkzeug ist deshalb **nicht durchgerechnet**.

Aus dem ausgelieferten Skript erkennbar, also NICHT im Betrieb bestätigt: die
breiteste Themenabdeckung aller geprüften Werkzeuge — mehrere Solarflächen mit
Montageort Dach, Flachdach, Fassade, freistehend oder **Balkon**, Wärmepumpe mit
Gebäudeklassen und Jahresarbeitszahl, E-Mobilität mit Jahreskilometern,
Rechtsform mit Vorsteuerabzug für Gewerbe. Als einziges nennt es PVGIS als
Datenbasis und benennt Strompreis, Einspeisevergütung und Förderung ausdrücklich
als editierbare Annahmen.

Damit ist es nach Aktenlage das Werkzeug, das unserem eigenen Anspruch am
nächsten kommt — und genau das, worüber wir am wenigsten wissen.

---

## Die kostenlosen Werkzeuge

### PVGIS (EU-Forschungsstelle)

Dieselbe Ertragsquelle, die unser Rechner im Hintergrund fragt. Zwei Eingaben
genügen. Gemessen für München: 5.475 kWh bei 5 kWp, mit vollständiger
Verlustaufschlüsselung, Monatsbalken und Horizontlinie.

**Stärken.** Transparenz und Datenqualität ohne Konkurrenz — jede Annahme ist ein
Eingabefeld, Verluste sind aufgeschlüsselt, alle Rohdaten exportierbar, Quelle
und Version stehen auf der Seite.

**Schwächen.** Kein Haushalt, kein Geld, keine Entscheidung: Es beantwortet „wie
viele Kilowattstunden", nicht „lohnt sich das". Fachbegriffe ohne Erklärung. Die
Dachdaten muss man kennen. Auf dem Handy läuft die Seite seitlich über.

### HTW-Unabhängigkeitsrechner

Schlägt Autarkie und Eigenverbrauch in 25.000 vorsimulierten Konfigurationen
nach — dieselbe Datengrundlage, auf der unser eigenes Eigenverbrauchs-Modell
beruht. Gemessen: 4.000 kWh, 10 kWp, 5 kWh Speicher → 70 % Autarkie, 30 %
Eigenverbrauch. Kein Geld, kein Standort, kein Dach. Stadtwerke Heiligenhaus
betreibt eine ältere Fassung unter eigener Adresse.

### Förderrechner des Bundesverbands Wärmepumpe

Rechnet ausschließlich die Bundesförderung, live bei jeder Eingabe. Geprüft:
30.000 € Investition, Gasheizung älter als 20 Jahre, Einkommen über 60.000 € →
12.880 € bei 46 % — deckungsgleich mit dem, was der Bernauer Rechner ausgibt.
Keine Investitionsschätzung, keine Wirtschaftlichkeit, kein Bezug zum
einbettenden Versorger.

---

## Die zwei Eigenbauten

### Stadtwerke Bernau — Wärmepumpe

Der einzige selbst gebaute Wärmepumpen-Rechner in Deutschland. Dreizehn Fragen
bis hin zum Haushaltseinkommen für die Förderstufe. Das Ergebnis erscheint
vollständig ohne Datenabgabe — gemessen an null Netzwerkaufrufen zwischen
Eingabe und Ergebnis, die Rechnung läuft komplett im Browser.

Ausgegeben werden Heizlast (9,5 kW), Anlagenempfehlung (11 kW, 250 l),
Bruttopreis (31.582 €), Förderung mit voller Herleitung (46 %, 12.880 €),
Eigenanteil und Betriebskosten (1.728 € im Jahr).

**Was fehlt, ist der ganze Wirtschaftlichkeitsteil:** kein Vergleich zur alten
Heizung, kein Gaspreis, keine Ersparnis, keine Amortisation, kein CO₂. Die
Jahresarbeitszahl ist fest verdrahtet (3,0 bei Heizkörpern), der Strompreis auch
(25 ct) — nichts davon sichtbar oder änderbar.

**Er beantwortet „was kostet mich eine Wärmepumpe", nicht „lohnt sie sich".**

### Havelstrom Zehdenick — Photovoltaik

Sechs Schritte, und **kein einziges Zwischenergebnis** vor der Datenabgabe. Der
letzte Schritt verlangt Anrede, Name, Adresse, Mail, Telefon plus Einwilligung
zum Anruf für einen Vor-Ort-Termin.

Die Rechnung läuft trotzdem vorher im Browser und stand wegen eingeschaltetem
Fehlersuch-Modus in der Konsole: 6 kWp als Mindestgröße, 13.339 €, 527 € Ersparnis
im Jahr. **Der Eigenverbrauch ist fest auf 60 Prozent verdrahtet, der Ertrag auf
900 kWh je kWp** — kein Standort, keine Ausrichtung, keine Amortisation.

Nebenbefund, nicht unser Thema, aber bemerkenswert: Google Analytics lief dort
trotz abgelehnter Einwilligung.

---

## Was noch offen ist

- **VLink, geoplex, PlexMap, greenventory und IBC Solar** sind noch nicht
  durchgerechnet. Das sind sechs der fünfzehn gekauften Werkzeuge; ohne sie ist
  dieses Papier unvollständig.
- **Solarmaker** braucht eine Freigabe zur AGB-Annahme.
- **Preise** kennen wir für keines dieser Werkzeuge. Solantiq nennt seinen
  öffentlich, hat aber keinen einzigen deutschen Versorger als Kunden.
- Die tetraeder-Nachträge (Blomberg, Plön, „mehr Optionen") hängen an einer
  Zugriffssperre des Anbieters.
