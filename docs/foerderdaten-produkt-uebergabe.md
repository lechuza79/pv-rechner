# Förderdaten der KfW ins Produkt — Übergabe

**Für eine eigene Sitzung.** Ziel ist nicht eine Datengeschichte, sondern der Einbau in
Wärmepumpen-Rechner und Förderseiten. Die Geschichten fallen danach ab; der Katalog
(`docs/datenstories-katalog.md`, Abschnitt „Ausbaustufe 2") hält fest, welche.

**Stand:** 26.08.2026. Alles unten ist an der Primärquelle geprüft, nicht aus Sekundärberichten
übernommen. Was ungeprüft blieb, ist als solches gekennzeichnet.

---

## Was es ist

Der KfW-Förderreport weist **je Landkreis und je Förderprogramm** die Anzahl der Zusagen und das
Volumen in Mio. Euro aus. 404 Kreis-Abschnitte, alle 65 Programme des Berichts, Jahrgänge
2020–2025 (davor nicht abrufbar). Ein PDF von rund 1.230 Seiten je Jahrgang, kein Excel, kein CSV.

Adresse: `https://www.kfw.de/Presse-Newsroom/Pressematerial/Förderreport/KfW-Förderreport_JJJJ.pdf`

**Die Datei des laufenden Jahres wird unter derselben Adresse überschrieben.** Wer einen
Zwischenstand später noch belegen können will, legt ihn selbst ab.

---

## Rechtslage — geklärt, mit Auflagen

Zwei unabhängige Prüfungen am 25.08.2026, eine mit dem Auftrag, die andere zu widerlegen. Ergebnis:
**nutzbar.** Tragend ist die Erlaubnis im Impressum der KfW — Newsroom-Material darf „unter Angabe
der Quelle zu Informations-Zwecken an Dritte weitergereicht und vervielfältigt werden".

**Zwei Begründungen, die NICHT tragen** und deshalb nirgends dokumentiert werden dürfen:
- **§ 5 UrhG (amtliche Werke)** greift nicht gegen das Datenbankherstellerrecht. Der EuGH hat das in
  *Apis-Hristovich* (C-545/07, Rn. 70/71) ausdrücklich entschieden; Volltext liegt in
  `docs/quellen/eugh-datenbankrecht/`.
- **Das Datennutzungsgesetz** trägt hier nicht. Der Satz, mit dem wir das Crawlen kommunaler Seiten
  begründen, funktioniert bei Gemeinden, weil deren Informationsarbeit in den Gemeindeordnungen
  verankert ist. Das KfW-Gesetz kennt keine Veröffentlichungspflicht für Fördererfolge.

**Sieben Auflagen, alle nicht verhandelbar:**
1. Quellenzeile im Wortlaut: „Quelle: KfW-Förderreport [Jahrgang], Stichtag [Datum], KfW
   Bankengruppe. Eigene Berechnung." — in jeder Oberfläche, jedem exportierten Bild und jedem
   Embed, **unabhängig vom Marken-Schalter**. Die Erlaubnis steht unter Quellenvorbehalt; ein Embed
   ohne Nennung verlässt genau den Boden, auf dem wir stehen.
2. Jeder Jahrgang mit **eigenem** Stichtag. Die Stichtage sind unterjährig verschieden; eine Reihe
   über gemischte Stichtage wäre unabhängig vom Recht schlicht falsch.
3. Der Zusatz „Eigene Berechnung" ist Pflicht, nicht Kosmetik: Das Änderungsverbot der KfW wird von
   ihrer Newsroom-Ausnahme nicht aufgehoben. Die Kennzeichnung stellt klar, dass wir kein
   verändertes fremdes Werk zeigen.
4. Kein Roh-Download, keine offene Schnittstelle auf den übernommenen Bestand.
5. Die Lizenzseite nimmt den KfW-Bestand ausdrücklich aus der offenen Freigabe aus, datiert und nur
   nach vorn wirkend.
6. **Keine Zelle unter zehn ausweisen, auch nicht als errechnete Restgröße.**
7. Kein KfW-Logo, keine Formulierung, die Zusammenarbeit oder Billigung nahelegt.

**Nicht gefragt und bewusst so entschieden:** Eine Rückfrage bei der KfW-Pressestelle würde die
letzte Unsicherheit beseitigen, lädt aber eine Rechtsabteilung ein, über etwas zu entscheiden, das
gerade erlaubt ist. Ein Nein wäre schlechter als keine Frage. Entscheidung des Betreibers,
26.08.2026.

---

## Datenschutz — der Fund, nach dem niemand gefragt hat

Die KfW unterdrückt Anzahlen unter zehn. Wer mehrere Jahrgänge, Stichtage und Aggregationsebenen
vollständig übernimmt, kann unterdrückte Zellen **über Differenzbildung rekonstruieren** — Summe
minus alle ausgewiesenen Posten. In einem kleinen Landkreis bedeutet „eine Zusage" faktisch einen
identifizierbaren Haushalt.

Das ist ein eigenständiges Risiko, das kein Urheberrechtsargument abdeckt, und es entsteht **erst
durch die Vollübernahme**. Abhilfe ist billig: die Schwelle der KfW übernehmen und keine Zelle
unter zehn ausweisen oder errechnen.

**Und ein Konflikt mit unserer eigenen Regel:** Unsere Konvention verlangt, dass jede Pro-Kopf-Zahl
ihren Nenner sichtbar trägt. Genau das macht sie umkehrbar — „14,2 je 1.000 Einwohner, Bezugsgröße
57.000" ist die Rohzahl mit einem Zwischenschritt. Für diese Quelle gilt deshalb: Nenner im
Einzelfall ja, **in einer flächendeckenden Tabelle nein.** Das gehört in einen Test.

---

## Was brauchbar ist — je Programm gemessen

Die Unterdrückung trifft die Programme sehr verschieden. Gemessen am Jahrgang 2025:

| Programm | unterdrückte Kreis-Zeilen | brauchbar |
|---|---|---|
| BEG WG – Heizungsförderung Priv. – Zuschuss | **0 von 323** | ja, flächendeckend |
| BEG Wohngebäude – Kredit Effizienzhaus | 73 von 398 (18 %) | ja |
| KFN Wohngebäude Selbstnutzung | 179 von 379 (47 %) | eingeschränkt |
| BEG WG – Einzelm. – Ergänzungskredit | 247 von 370 (67 %) | nein |
| KfW-Programm Erneuerbare Energien Standard | 266 von 298 (89 %) | nein |

Zwei Details: Die Unterdrückung gilt nur der **Anzahl**, nie dem Volumen — eine Auswertung
„Fördervolumen je Kreis" ist lückenlos, eine über Anzahlen nicht. Und die Sammelposten „keine
Angabe" enthalten **keine einzige** Zeile der Gebäudeförderung.

**Bundeswerte 2025 zur Einordnung:** Heizungsförderung privat 375.475 Zusagen / 5.225,8 Mio €
(2024: 219.092). Sanierung auf Effizienzhaus 14.230 / 5.254,9 Mio €. Klimafreundlicher Neubau
15.226 / 4.824,9 Mio €.

---

## Der inhaltlich stärkste Teil: die Verwendungszwecke

Die Sektion „Förderschwerpunkte auf Programmebene nach Verwendungszwecken" schlüsselt jede
Förderung nach Boni auf. Für die private Heizungsförderung 2025 (Bund):

| Verwendungszweck | Maßnahmen | Mio. € |
|---|---|---|
| Heizungsförderung (Basis) | 314.049 | 3.191,4 |
| Effizienzbonus | 230.834 | 395,2 |
| Klimabonus | 212.700 | 1.093,5 |
| Einkommensbonus | 74.393 | 500,0 |
| Emissionsminderungszuschlag | 18.502 | 45,7 |

**Das ist eine Aussage über Menschen, nicht über Technik.** Der Klimabonus setzt den Austausch
einer alten fossilen Heizung voraus, der Effizienzbonus eine Erdwärme-, Wasser- oder
Abwasser-Wärmepumpe beziehungsweise ein natürliches Kältemittel, der Einkommensbonus ein
Haushaltseinkommen unter einer Schwelle. Der durchschnittliche Zuschuss je Fall fällt aus Volumen
÷ Anzahl direkt an.

**Schranke: nur auf Bundesebene.** Es gibt keine Kreuztabelle Verwendungszweck × Region. Wer diese
Anteile auf einen Kreis anwendet, macht denselben Fehler wie mit der kursierenden
87-Prozent-Wärmepumpen-Quote.

---

## Wofür es im PRODUKT taugt

**Im Wärmepumpen-Rechner** — der eigentliche Grund für diese Übergabe:
- Die Bonus-Anteile beantworten die Frage, mit der jemand auf dem Rechner landet: „bekomme ich das
  auch?" Heute steht dort nur, was die Förderung *maximal* hergibt.
- Der durchschnittliche Zuschuss je Fall ist ein Realitäts-Anker gegen unsere eigene
  Förderrechnung: Wenn unser Rechner systematisch mehr ausweist als der Bundesdurchschnitt real
  auszahlt, ist entweder unsere Rechnung zu optimistisch oder die Beispielkonfiguration untypisch.
  **Beides will man wissen.**
- Die Zahl der Zusagen im eigenen Landkreis ist eine Einordnung, die kein Wettbewerber hat.

**Auf den Förderseiten:**
- Die Bundesförderung steht dort heute als Regelwerk. Wie viele sie tatsächlich in Anspruch nehmen,
  steht nirgends — und ist genau die Frage, die den Unterschied zwischen einer Merkblattseite und
  einer nützlichen Seite ausmacht.
- Der Kreisbezug fügt sich in die vorhandene Ortsstruktur ein, ohne eine neue Seitengattung zu
  brauchen.

**Was es NICHT werden soll: rund 400 Landkreisseiten.** Auf Kreisebene wird praktisch nicht
gesucht; das ist im Freigabe-Nachweis des Atlas für den 18.08.2026 gemessen und der Grund, warum
die Kreisebene gesperrt ist. Wer daraus eine Seitengattung macht, wiederholt eine Prüfung, die
schon beantwortet ist.

---

## Absagen, damit sie niemand noch einmal prüft

- **Photovoltaik und Batteriespeicher aus dieser Quelle.** Das einzige PV-nahe Programm ist ein
  gewerblicher Investitionskredit, auf Kreisebene zu 89 % unterdrückt, bundesweit rund 700
  Maßnahmen. Gezählt werden Kredite, nicht Anlagen. Unser Anlagenregister ist dort in jeder
  Hinsicht besser: feinere Gebietsebene, Leistung in Kilowatt, keine Unterdrückungsschwelle. Ein
  eigenes Speicherprogramm gibt es seit 2020 nicht mehr.
- **Eine durchgehende Reihe seit 2020.** Die Gebäudeförderung wurde 2021 vollständig umbenannt,
  2024 kam die Heizungsförderung als eigenes Programm dazu, und Zusagen aus Altprodukten werden
  laut Bericht in den Nachfolgeprodukten ausgewiesen. Ehrlich sind Vergleiche innerhalb 2021–2023
  und ab 2024.
- **Die Spalte „geförderte Wohneinheiten".** Gibt es nur im Jahrgang 2024, 2025 ersatzlos entfallen.
- **Kommunalkredite „Nachhaltige Mobilität" als Ladeinfrastruktur-Ersatz.** Das sind Fuhrpark- und
  Verkehrskredite, kein Ladepunkt-Zähler.
- **BAFA weitgehend.** Rund 80 Statistiken auf der Übersichtsseite, ausschließlich PDF, kein Excel.
  Die Heizungsförderung läuft seit 2024 über die KfW und ist dort nicht mehr enthalten; die
  verbliebenen Reihen (Kraft-Wärme-Kopplung, Wärmenetze, Energieberatung) berühren unsere Themen
  nicht. **Ungeprüft geblieben:** ob die Monatsstatistik nach Bundesland aufschlüsselt — der Server
  weist unsere Abrufe pauschal ab. Wer das klären will, braucht denselben Abrufweg aus der eigenen
  Produktion, den der Förder-Wächter schon benutzt.
- Die BAFA-Liste förderfähiger Wärmepumpen gehört zu einer anderen Sitzung und wird hier nicht
  angefasst.

---

## Zwei Fallen für den Parser

**Programmnamen brechen im ausgelesenen Text mitten in der Zeile um.** Ein naiver Parser verliert
etwa jede zehnte Zeile — und merkt es nicht. Deshalb zwingend eine **Kontrollsumme gegen die
Bundeswerte**: Wer sie wegläßt, bekommt eine plausible Zahl, die zu niedrig ist, und niemand sieht
es. (Dieselbe Fehlerklasse wie ein Wächter, der nichts findet und trotzdem grün meldet.)

**Doppelzählungen sind im Bericht selbst benannt:** Bei Wohneigentumsgemeinschaften und
Mehrfamilienhäusern enthält die Anzahl der Zusagen sowohl Basis- als auch Zusatzanträge. Bei
Globaldarlehen ist die Anzahl hochgerechnet, nicht gezählt. Vorjahreszahlen werden bei Nachbuchung
oder Storno nicht korrigiert.

---

## Vorschlag für den Zuschnitt

Zwei Jahrgänge (2024 und 2025), ein Programm flächendeckend (Heizungsförderung privat), zwei
weitere eingeschränkt (Sanierung, Neubau), plus die Bundestabelle der Verwendungszwecke. Alles
davor ist Extraarbeit mit Definitionsvorbehalt.

Der Ertrag steckt in **einer** Sektion des PDF („Landkreise nach Bundesländern") plus **einer**
Bundestabelle. Ein Parser dafür ist überschaubar — die Sorgfalt liegt nicht im Auslesen, sondern in
der Kontrollsumme und in der Unterdrückungsschwelle.
