# Wettbewerb: Wer bietet Versorgungskunden einen Rechner an?

> Erhebung vom 25.08.2026, maschinell über **alle** Strom- und Gasversorger unserer
> Datenbank. Grundgesamtheit 910, abgerufen 859. Nachrechenbar: Der Lauf steht als
> `npm exec tsx scripts/versorger-erhebung.ts -- --alle` bereit, die Befunde je Versorger
> liegen in der Spalte `werkzeug` der Versorgertabelle.
>
> **Alle Zahlen sind Untergrenzen.** Warum, steht am Ende — das ist der wichtigste
> Abschnitt dieses Papiers, nicht sein Kleingedrucktes.

## Wofür das Papier da ist

Zwei Zwecke, und sie stellen verschiedene Anforderungen:

1. **Intern:** die Marktlage kennen, bevor über Angebot, Preis und Reihenfolge der
   Ansprache entschieden wird. Dafür ist dieses Dokument gebaut.
2. **Später auf der Website:** eine Funktionstabelle im üblichen Format
   („wir gegen die anderen"). Das machen alle Anbieter dieser Gattung so, und es ist
   gut für die Auffindbarkeit in KI-Antworten. **Noch nicht gebaut** — die Rohdaten
   dafür stehen unten, damit niemand sie erneut erheben muss.

**Vor der Veröffentlichung einer namentlichen Gegenüberstellung:** Das ist
vergleichende Werbung (§ 6 UWG). Zulässig, aber nur mit objektiven, nachprüfbaren
Aussagen und ohne Herabsetzung — und jede Aussage über einen Wettbewerber muss auf
dessen eigener, datierter Angabe beruhen. Im Pitch an einen einzelnen Versorger ist
das unproblematisch, öffentlich nicht. Eine Fassung für die Website gehört durch die
Rechtsprüfung des Projekts, bevor sie live geht.

---

## Der Kernbefund

**756 von 859 abgerufenen Versorgern haben auf ihrer Photovoltaik- oder
Wärmepumpen-Seite kein Rechenwerkzeug.**

| Befund | Versorger |
|---|---|
| kein Werkzeug | 756 |
| Rechner vorhanden | 53 |
| nur Anfrageformular, als Rechner bezeichnet | 44 |
| Werkzeug erkennbar, Bauart nicht bestimmbar | 5 |

Die Trennung zwischen **Rechner** und **Anfrageformular** ist keine Feinheit, sondern
der Kern der Auswertung: Der eine Fall belegt, dass jemand im Haus ein Werkzeug
gewollt, durchgesetzt und bezahlt hat — es gibt also einen Zuständigen und eine Zeile
im Budget. Der andere belegt nichts davon. Eine erste Fassung der Erhebung warf beides
zusammen und meldete deshalb 26 „Rechner" statt 12.

## Photovoltaik gegen Wärmepumpe

| Art des Werkzeugs | Photovoltaik | Wärmepumpe |
|---|---|---|
| eingekauftes Werkzeug eines Anbieters | 23 | 1 |
| eigener Rechner, Ergebnis ohne Datenabgabe | 6 | 8 |
| Rechner, Ergebnis nur gegen Kontaktdaten | 8 | 4 |
| Anfrageformular, als Rechner bezeichnet | 35 | 8 |
| kostenloses Kataster eingebunden | 1 | 0 |
| Bauart nicht bestimmbar | 5 | 0 |

**Die acht Wärmepumpen-„Rechner" sind bei Einzelprüfung fast durchweg TARIFSEITEN**
für Wärmepumpenstrom mit einem Verbrauchsregler — die Adressen heißen
`waermepumpentarif`, `privilegierung-waermepumpenstrom`, `24h-tarif-fuer-waermepumpen`.
Sie beantworten nicht, ob sich der Umstieg rechnet. Das Thema ist richtig zugeordnet,
die Bauart nicht: Ein Verbrauchsregler ist eine Zahleneingabe, und mehr prüft die
Maschine nicht.

**Einen echten Wärmepumpen-Wirtschaftlichkeitsrechner betreibt genau einer:**
Stadtwerke Bernau (`/waermepumpenrechner/`) — und der gibt sein Ergebnis erst gegen
Kontaktdaten heraus.

**Warum das die wichtigste Zahl des Papiers ist:** Der Wärmepumpen-Heizstromkunde ist
laut Monitoringbericht 2025 von Bundesnetzagentur und Bundeskartellamt der Privatkunde
mit dem höchsten Anteil „Vertrieb und Marge" (4,69 ct/kWh bei getrennter Messung gegen
4,45 ct beim gewöhnlichen Haushaltskunden), sein Bestand wächst um 7 % im Jahr, und
seine Wechselquote ist von 9,3 auf 19 % gesprungen. Bei Photovoltaik haben 23 Versorger
ein Werkzeug eingekauft — bei der wertvolleren Kundengruppe einer.

## Wer die Werkzeuge liefert

Bei 33 Versorgern ließ sich der Anbieter benennen. Kein Anbieter erreicht mehr als ein
Prozent der Grundgesamtheit — der Markt ist unkonzentriert.

| Anbieter | Angebot | Versorger |
|---|---|---|
| tetraeder.solar | Solarkataster, weiß etikettierter Rechner | 7 |
| co2online | Beratungsrechner, gemeinnützig | 2 |
| Enpal | Anlagenverkauf, Rechner als Einstieg | 2 |
| solarmaker | Rechner unter eigener Adresse | 1 |
| **Solantiq** | weiß etikettierter PV-Rechner, ausgepreist | **0** |

### Solantiq — der Preisanker, aber kein Wettbewerber im Markt

*Alle Angaben von deren eigener Website, abgerufen 25.08.2026; den Rechner selbst
durchgerechnet.*

- **Betreiber:** contexagon GmbH, Bahnhofstrasse 31, 8280 Kreuzlingen, Schweiz.
  Handelsregister CHE-249.142.582. Also kein deutscher Anbieter.
- **Preis:** 49 €/Monat (mit Fremdmarke, 500 Berechnungen), 149 €/Monat (ohne
  Fremdmarke, 5.000 Berechnungen), Enterprise auf Anfrage. **1.788 €/Jahr** ist damit
  der einzige veröffentlichte Preis für genau diese Produktgattung.
- **Zielgruppe laut eigener Darstellung: Solarinstallateure**, nicht Versorger. Der
  Preis belegt einen Marktpreis der Gattung, **nicht** die Zahlungsbereitschaft eines
  Stadtwerks. Nachweislich zahlt ihn kein Versorger unserer Liste.
- **Datenbasis:** PVGIS der EU-Kommission, dazu Open-Meteo für die Solarprognose.
- **Gebiet:** Deutschland, Österreich, Schweiz.
- **Ergebnis kommt sofort, ohne Datenabgabe** (München, 9,24 kWp → Amortisation
  11 Jahre; selbst durchgerechnet). Die Lead-Weiterleitung ist eine Funktion für ihre
  Kunden, keine Sperre auf ihrer eigenen Seite.

**Was sie besser können als wir:**
- Mehrere Dachflächen mit **eigener Ausrichtung und Größe je Fläche** (Satteldach mit
  getrennter Süd- und Nordseite). Wir fragen eine Dachform ab.
- **Verschattung als Regler** (0–50 %). Haben wir nicht.
- Österreich und Schweiz.
- Zweites Produkt: 7-Tage-Solarprognose.

**Was wir besser können — und das ist der inhaltlich wichtigere Punkt:**
- **Bei ihnen ist der Eigenverbrauchsanteil eine Nutzereingabe** (Vorgabe 30 %, Presets
  „ohne Speicher 20–30 %", „mit Speicher + E-Auto 60–80 %"). Das ist die Größe mit dem
  stärksten Einfluss auf die Wirtschaftlichkeit; wer sie raten lässt, macht das
  Ergebnis beliebig. Wir berechnen sie aus dem an 25.000 Konfigurationen kalibrierten
  HTW-Kennfeld.
- Drei Strompreis-Szenarien statt eines festen Preises.
- Kommunale Förderung wird abgezogen.
- Einspeisevergütung nach Inbetriebnahme-Monat samt Umschalter auf die Konditionen
  ab 2027.
- Marktpreise laufend erhoben statt fester Annahme.

### tetraeder.solar — der verbreitetste

Sieben Versorger, der höchste Wert der Erhebung. Kommt aus dem kommunalen Solarkataster
und verkauft daneben weiß etikettierte Rechner an Stadtwerke; belegter Einsatz unter
Stadtwerke-Marke: **Emden** (`hub.tetraeder.solar/calculator/…` im Rahmen auf
`/strom/photovoltaik`). Preise nicht veröffentlicht. Zusätzlich Dachanalyse aus
Luftbild — die härteste Grenze unseres Angebots, wir messen Dächer nicht.

**Vorsicht bei der Zählung:** Ein Teil der tetraeder-Funde sind **Kataster des
Landkreises oder Landes**, eingebunden auf der Versorgerseite. Dort hat der Versorger
nichts bezahlt, es gibt keinen Budgetposten und keinen Zuständigen. Die Erhebung führt
diesen Fall deshalb als eigenen Zustand und weist dort **keinen Anbieternamen** aus —
der wäre technisch richtig und läse sich wie ein Kaufbeleg.

### ASEW im Verband kommunaler Unternehmen — der Preisanker im Kopf

Kein Wettbewerber im engeren Sinn und in der Website-Erhebung nicht messbar, aber die
Stelle, gegen die wir preislich verglichen werden.

- Knapp **400 Mitgliedsversorger**, Mindestbeitrag **2.500 €/Jahr** für das
  Gesamtpaket.
- Gibt Werkzeuge dieser Bauart **ohne Aufpreis** an ihre Mitglieder weiter, darunter ein
  Photovoltaik-Kalkulationswerkzeug und eine weiß etikettierte Web-Anwendung.
- **Ein Wärmepumpen-Wirtschaftlichkeitsrechner ist dort nicht bekannt** — ungeprüft,
  und die Frage gehört in das erste Gespräch mit der ASEW.

## Die Pflichtangabe zum Strommix

§ 42 EnWG verlangt von jedem Stromlieferanten den Energieträgermix jährlich zum 1. Juli
als Grafik auf der Website, ergänzt um die deutschen Durchschnittswerte.

| Befund | Versorger |
|---|---|
| Seite mit Stromkennzeichnung gefunden | 299 |
| davon mit erkennbarer Grafik | 163 |
| davon nur als PDF | 89 |
| Bezugsjahr maschinell lesbar | 214 |
| **davon mit veraltetem Bezugsjahr** | **29** |

**Als Produkt erledigt** (siehe `docs/versorger-preisstrategie.md`, Abschnitt C): Der
Branchenverband liefert Vergleichszahlen, Leitfaden und Berechnungswerkzeug allen
Stromlieferanten kostenlos, und § 95 EnWG kennt für § 42 keinen Bußgeldtatbestand.
**Als Aufhänger brauchbar:** feste Frist, maschinell prüfbar, 29 belegte Fälle.

---

## Was diese Erhebung nicht sieht

**Alle Zahlen oben sind Untergrenzen.** Die Erhebung liest ausgelieferten
Seitenquelltext; sie bedient keine Websites.

1. **Werkzeuge, die erst per JavaScript entstehen, sind unsichtbar.** Bei einem
   eingebetteten Fremdwerkzeug ist der Inhalt des Rahmens grundsätzlich nicht
   einsehbar — erkannt wird der Anbieter, nicht die Funktion. Genau deshalb gibt es den
   Zustand „eingekauft": Der Anbietername im Rahmen ist der Beleg.
2. **51 von 910 Versorgern waren nicht abrufbar** — Verbindungsfehler oder Bot-Sperre.
   Für sie liegt **kein Befund** vor, nicht der Befund „nichts vorhanden". Vorher waren
   es 97; 63 davon waren eine falsch gespeicherte Adresse, meist `http` statt `https`.
3. **Die Themenzuordnung** stammt aus Adresse und sichtbarem Seitentext ohne
   Navigation. Die Adresse schlägt den Fließtext — sonst gilt eine
   Erdgas-Tarifrechnerseite als „solar", weil Photovoltaik im Menü steht.
4. **Bei 5 Versorgern** war ein Werkzeug erkennbar, seine Bauart nicht bestimmbar.
5. **Keine Aussage über Qualität.** Erhoben ist Vorhandensein und Bauart, nicht ob
   richtig gerechnet wird. Die einzige inhaltliche Aussage über einen Wettbewerber in
   diesem Papier — der Eigenverbrauchsanteil als Nutzereingabe bei Solantiq — beruht
   auf einem eigenen Durchlauf, nicht auf einer Messung.

## Was für die Funktionstabelle noch fehlt

Damit die Website-Fassung nicht bei null anfängt — offen und **ungeprüft**:

- **tetraeder und co2online selbst durchgerechnet.** Bisher nur Solantiq. Ohne das
  lässt sich keine Zeile über deren Funktionsumfang schreiben, die einer Nachfrage
  standhält.
- **Preise von tetraeder, co2online und Leadgenerator Solar.** Alle drei veröffentlichen
  nichts. Der einzige belastbare Weg wäre eine Auskunft von einem Versorger, der
  gekauft hat.
- **Hat die ASEW ein Wärmepumpen-Werkzeug?** Entscheidet, ob der stärkste Aufhänger
  dieses Papiers trägt.
- **Verschattung und mehrere Dachflächen** sind zwei Funktionen, die Solantiq hat und
  wir nicht. In einer eigenen Tabelle stehen sie als Lücke — das ist ein Argument für
  den Bau, nicht gegen die Tabelle.
