# Inhalts-Inventur 25.08.2026 — Rohbefunde der Prüfer

Arbeitsmaterial. Der Bericht steht am Ende dieser Datei, die Korrekturen im Code.
Jeder Befund gilt als unbestätigt, bis ein Gegenprüfer ihn angegriffen hat —
in diesem Projekt ist ein einzelner Prüfer schon zweimal mit einem gründlich
begründeten und im Ergebnis falschen Befund durchgekommen.

## Stand der Prüfer

| Gebiet | Prüfer | Gegenprüfer |
|---|---|---|
| A EEG-Reform 2027 | läuft | offen |
| B Grüngas / GModG | fertig | läuft |
| C Einspeisevergütung / Marktwert / Freifläche | läuft | offen |
| D Balkon / Umsatzsteuer | fertig | läuft |
| E Wärmepumpe / BEG / Gebäude | läuft | offen |
| F Rechtstexte / Lizenzen / Werbeaussagen | läuft | offen |
| G FAQ (78 Antworten) | fertig | läuft (Rechtsteil) |
| H Ratgeber-Fließtext | läuft | offen |
| I Glossar / Methodik / Tooltips | läuft | offen |

---

## A — EEG-Reform 2027 (Prüfer fertig, Gegenprüfer läuft)

Geprüft gegen die Bundesrats-Drucksache 470/26 vom 14.08.2026, mit Gegenproben
gegen Kabinettsfassung und Referentenentwurf. **Der Kern des Gebiets stimmt** —
6,2 ct, Wegfall der Gebäude-Staffeln und des Volleinspeisungs-Aufschlags,
36 Monate Übergangszahlung, Bonus 1,5 ct/48 Monate, Degression ab 01.08.2027,
50-%-Deckel nur für Neuanlagen, Bestandsschutz: alles zeichengleich bestätigt.
Falsch ist durchweg das DRUMHERUM: Paragrafennummern und Seitenzahlen aus einer
überholten Fassung.

1. **Beihilfevorbehalt: § 102 → § 104.** Die Nummer stammt aus dem
   Referentenentwurf; schon die Kabinettsfassung führt § 104. § 102 ist in der
   Drucksache eine völlig andere Norm (negative Preise). Die inhaltliche Aussage
   trägt weiter. — Lehrreich: Zwei dokumentierte Nachprüfungen haben es
   übersehen, eine hat den Fehler ausdrücklich BESTÄTIGT. Genau die Fehlerklasse
   „Kommentar gilt als Beleg" aus Faktenprüfungs-Regel 6.
2. **Dauer der Übergangszahlung: § 25 Abs. 1a → Abs. 2.** Dieselbe Datei
   korrigiert diese Nummer an zwei anderen Stellen ausdrücklich; im Kommentar
   der Konstante ist sie stehengeblieben.
3. **Fünf Begründungs-Seitenzahlen** zeigen auf den Referentenentwurf. Bei einer
   davon steht an der genannten Seite der überholte Wert (2030), den das Zitat
   gerade korrigieren will. — GEGENPRÜFUNG ANGEORDNET: gedruckte vs. PDF-Seite.
4. **Ausschluss Übergangszahlung ⇄ Bonus** im Kommentar mit einer Begründung,
   die das Projekt schon einmal verworfen hat.
5. **„ab 2030" statt „ab 2031"** im Kommentar; der Code rechnet richtig.
6. **„beide Schwellen in eckigen Klammern"** — nur eine war verklammert.
7. **RECHENFEHLER:** Die Steckersolar-Ausnahme vom 50-%-Deckel wird auf JEDE
   Anlage bis 2 kWp angewandt. Der Entwurf verlangt zusätzlich 800 VA
   Wechselrichter und Betrieb hinter der Entnahmestelle. Wirkung zugunsten des
   Nutzers, also stille Überschätzung des Einspeiseerlöses.
8. **„Dachanlagen" ist zu eng** (3 nutzersichtbare Stellen): Der Entwurf erfasst
   Anlagen auf, an oder in einem Gebäude sowie an Lärmschutzwänden. Fassaden-
   anlagen lesen, der Deckel gelte für sie nicht.
9. **Zwei Ministeriums-Zitate nicht auffindbar** — Pressemitteilung hinter
   Bot-Sperre. Inhaltlich durch die Drucksache gedeckt, die Zuschreibung als
   wörtliches Zitat ist ungeprüft. NICHT streichen, erst beschaffen.

Verfahrensstand am 25.08.2026 an Bundesrat und Bundestag geprüft: nur die
Grunddrucksache, keine Ausschussempfehlung, kein Beschluss. Der im Code
hinterlegte Zustand stimmt.

## B — Grüngas / Gebäudemodernisierungsgesetz (Prüfer fertig, Gegenprüfer läuft)

Die vier Rechtsfehler vom Juli 2026 sind sauber behoben und durch Tests
gehalten; sämtliche Preiswerte sind am Institutsbericht zellgenau belegt.
Neu gefunden:

1. **„der 31.12.2029 steht nicht im Gesetzestext"** — er steht dort
   (Kostenaufteilungsgesetz im selben Artikelgesetz). Absolute Negativaussage
   über einen Gesetzestext, die der Gesetzestext widerlegt. NUTZERSICHTBAR,
   steht doppelt (FAQ + Ratgeber).
2. **„liegt rechnerisch über dem Vergleichswert"** — nicht nachgerechnet. Der
   eigene Schutzvermerk im Code verbietet die Aussage ausdrücklich („deshalb
   steht dazu NIRGENDS eine Aussage im Produkt"). Sie steht zweimal im Produkt.
   Fachlich zusätzlich schief: verglichen werden Jahres-Primärenergiebedarfe
   ganzer Gebäude, nicht Faktoren.
3. **„Bundestag und Bundesrat haben beschlossen"** ist im Kommentarkopf genau
   der Konstante zurück, deren Feldkommentar den Fehler beschreibt.
   Einspruchsgesetz.
4. **Wortlaut:** Das Gesetz sagt „Bioöl", nicht „Bioheizöl", und beschränkt
   Wasserstoff auf grünen/blauen/orangenen/türkisen — grauer ist ausgeschlossen.
   Fünf nutzersichtbare Stellen.
5. **Erfüllungsoptionen ohne ihre Bedingungen:** „ganz ohne Beimischung über
   Solarthermie/Lüftung/Hybrid" gilt nur befristet (2029–2034) und nur bei
   Mindestauslegung.
6. **Zwei Seitenzahlen** einer Studienfundstelle zeigen auf die falsche Seite;
   die Werte stimmen.

## D — Balkonkraftwerk und Umsatzsteuer (Prüfer fertig, Gegenprüfer läuft)

1. **DER ANLASSFALL, bestätigt und live:** Die 30-kW-Marke ist im Fördercheck
   als Sperre verbaut — und zusätzlich mit „Wohngebäude" UND-verknüpft, obwohl
   beides Alternativen sind. Wer über 30 kWp angibt, bekommt „Gilt nur bis
   30 kWp" und das Programm als ausgeschlossen. Ein Test schreibt den Fehler
   fest. Der PV-Rechner selbst hat gar keine Umsatzsteuer-Logik — die Meldung
   vom 24.08. war insoweit zu Recht zurückgewiesen, der Fehler saß woanders.
2. **Falscher Rechtsmaßstab bei Miete/Eigentum:** „nur aus wichtigem Grund
   ablehnen" — das Gesetz kennt hier Unzumutbarkeit bzw. Angemessenheit.
   Zwei Oberflächen.
3. **Falsche Gesetzeszuordnung:** Die Steckersolar-Privilegierung stammt nicht
   aus dem Solarpaket I (Mai 2024), sondern aus einem eigenen Gesetz vom
   Oktober 2024.
4. **„Balkonkraftwerk kommt im Register nicht vor"** — die Auswahl heißt live
   „Steckerfertige Solaranlage (sogenanntes Balkonkraftwerk)", der voreingetragene
   Anzeigename lautet „Balkonkraftwerk". In einem Klick widerlegbar, ausgerechnet
   auf der Seite, die davor warnen will.
5. **„gemessener Wirkungsgrad"** in zwei Kurzbeschreibungen — die Quelle schreibt
   „angenommen". Der Fließtext derselben Seite sagt es richtig.
6. Bußgeld-Kette, Monatsfrist, Wirkungsgrad-Zahl, VDE-Vornorm: alle bestätigt.

## G — FAQ, 78 Antworten (Prüfer fertig, Gegenprüfer läuft für den Rechtsteil)

24 beanstandet: 2 falsch, 9 unbelegt, 9 riskant, 4 mit fehlerhafter Einbettung.

- **„BEG-Förderung deckt oft 50 bis 70 Prozent"** widerspricht der Nachbar-
  antwort auf derselben Seite (30 bis 80). Beide gehen ins strukturierte Datenformat.
- **„bis zu 50.000 Euro"** steht in der einen Balkon-FAQ, während ein Test die
  Zahl verbietet — er prüft die andere. Als abgeschnittenes Snippet bleibt der
  Drohsatz übrig, den das Projekt bewusst vermeidet.
- **„Das Heizungsgesetz hebt die 65-Prozent-Pflicht auf"** ohne Fundstelle, und
  zugleich in Widerspruch zur dokumentierten Prämisse des Wärmepumpen-Rechners.
- **Amortisation getippt statt gerechnet** an der sichtbarsten Stelle der Seite
  (9–12 Jahre), und zwei Antworten weiter eine andere Spanne (8–14) für dieselbe
  Größe. Die Datei verbietet in ihrem eigenen Kopf getippte Zahlen.
- **Herabsetzung einer Anbietergruppe** („verkaufen dir einen Behördengang") —
  im strukturierten Datenformat, ab jetzt neben Mitbewerbern auf LinkedIn.
- **Gesetzliche Grenzen aus Produktfeldern gelesen:** Ändert jemand das größte
  Verkaufsset, behauptet die FAQ eine falsche Rechtsgrenze.
- **Schaltjahr:** „wer am 31. Januar startet, hat bis zum 28. Februar Zeit" —
  die Fristfunktion des Projekts liefert 2028 den 29.
