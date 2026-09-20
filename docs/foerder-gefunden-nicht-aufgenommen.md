# Gefunden, gelesen, noch nicht aufgenommen

Programme, die ein Wächter-Lauf **an der Amtsseite selbst gelesen** hat, die aber
aus einem benannten Grund nicht in `lib/funding-programs.ts` stehen. Der Zweck
ist eng: Was einmal im Wortlaut vorlag, soll nicht ein zweites Mal recherchiert
werden müssen — ein Lauf, der bei null anfängt, sucht dieselben Seiten wieder.

**Kein Ersatz für die Aufnahme.** Solange ein Programm hier steht, sagt die
Stadtseite „keine kommunale Förderung", wo es eine gibt. Jeder Eintrag nennt
deshalb, was ihm zur Aufnahme fehlt, und wird beim nächsten Lauf, der die Lücke
schließen kann, abgearbeitet und gelöscht.

---

## Emmendingen (Baden-Württemberg) — Förderprogramm „Energiehaus Emmendingen+"

**Gefunden am 08.09.2026**, im Rohtext der Programmseite der Stadt gelesen:
`https://klima.emmendingen.de/foerderprogramm-energiehaus/beratung-foerderung/photovoltaik-foerderungen`

**Was die Stadt schreibt** (wörtlich, aus dem HTML derselben Seite):

> „2025 und 2026 gab es sehr viele Anträge für Zuschüsse und der Fördertopf ist
> bereits überzeichnet. Deshalb gilt zum Stichtag 01.06.2026 ein Antragstopp für
> Zuschüsse aus dem städtischen Förderprogramm. Alle Anträge, die seit dem
> 01.06.2026 gestellt wurden und werden, können bis auf weiteres nicht mehr
> berücksichtigt werden. Der Antragstopp bezieht sich nur auf direkte Zuschüsse
> für Photovoltaik- und Balkonsolar-Anlagen, für die Sanierungsbegleitung sowie
> für die Anmeldung zum Carsharing."

> „Hier erhalten Sie 80 € pro installiertem kWp. Maximal 1.000 €."

> „Für Balkonkraftwerke erhalten Sie pauschal 50 € Förderung."

**Bedingungen, ebenfalls im Wortlaut auf der Seite:**

- Antragsberechtigt sind Eigentümer, Erbbauberechtigte und
  Eigentümergemeinschaften; **beim Balkonkraftwerk zusätzlich Mieter**
  („Bei Installation eines Balkonkraftwerkes in der Stadt Emmendingen sind
  außerdem auch Mieter_innen antragsberechtigt.").
- Der Antrag muss **vor** dem Beginn gestellt werden: „Förderfähig sind
  Maßnahmen, mit denen zum Zeitpunkt der Antragstellung noch nicht begonnen
  wurde. … Aufträge und Bestellungen dürfen erst nach Erhalt der Bewilligung
  getätigt werden."
- Dachanlage: Umsetzung binnen 6 Monaten ab Bewilligung, Balkonkraftwerk binnen
  3 Monaten.
- **Neubauten sind ausgeschlossen** („Für Neubauten gibt es keine Förderung.").
- Wo die Photovoltaik-Pflicht des Landes greift, zählt für die Förderhöhe nur
  der Teil der Leistung, der **über** die Pflicht hinausgeht.
- Balkonkraftwerk: Einspeisesteckdose durch eine Fachkraft, ersatzweise
  normgerechter Anschluss; Registrierung im Marktstammdatenregister als
  Nachweis.
- Richtlinienfassung laut Downloadbereich: „Förderrichtlinien 2026", Datei vom
  30.12.2025.

**Status wäre `ausgeschoepft`** — die Stadt nennt den Topf „überzeichnet", und
das ist die Bedeutung von „Fördertopf leer"; `pausiert` beschriebe dieselbe Folge
mit dem falschen Grund. Ein ausgeschöpftes Programm zieht ohnehin kein Geld ab;
der Wert der Aufnahme liegt allein in der ehrlichen Auskunft „gab es, ist seit
dem 1. Juni überzeichnet" statt „keine kommunale Förderung".

**Was zur Aufnahme fehlt: der achtstellige Gemeindeschlüssel.** Emmendingen steht
nicht im Ortsverzeichnis (`ATLAS_CITIES`), ein Programm ohne Ortseintrag macht
`atlas-funding-sync.test.ts` rot, und der Eintrag braucht den Schlüssel aus dem
Melderegister plus einen gemessenen Standort-Ertrag. Beides hängt an der
Datenbank; der Lauf vom 08.09.2026 hatte keinen Zugang zu ihr
(`npm run foerder:ags` und `npm run foerder:probe` brachen an den fehlenden
Zugangsdaten ab).

**Und der Schlüssel wurde bewusst NICHT aus der amtlichen Kreistabelle
abgeschrieben.** Der Versuch lief: Die Destatis-Datei „04-kreise" ließ sich
herunterladen und auslesen, ihre Zeilen kommen beim Parsen aber um eine Zeile
versetzt heraus — die Zeile mit dem Namen „Emmendingen" trug den Schlüssel
`08317` und das Etikett „Stadtkreis", beides gehört den Nachbarzeilen
(Ortenaukreis bzw. Freiburg). Genau daraus entsteht der Fehler, den CLAUDE.md als
Blocker führt: Ein Gemeindeschlüssel hat kein Aussehen, ein danebenliegender
bleibt gültig und zeigt auf einen anderen Ort — keine kaputte Seite, kein roter
Test, nur die falsche Gemeinde bekommt die Förderung angeboten. Der Schlüssel
kommt aus `npm run foerder:ags -- --suche Emmendingen` oder gar nicht.

**Nächster Lauf mit Datenbank:** Schlüssel nachschlagen, Ortseintrag anlegen
(Landkreis Emmendingen, Standort-Ertrag aus dem Ertragsdienst), Programm mit den
Werten oben aufnehmen, diesen Abschnitt löschen.
