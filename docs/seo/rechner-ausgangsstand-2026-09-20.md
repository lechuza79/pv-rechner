# Ausgangsstand der Rechner-Seiten vor der Wort-Optimierung

Aufgenommen am 2026-09-20, **bevor** Ueberschriften und Titel der fuenf Rechner
auf ihren Suchbegriff hin geaendert werden. Zweck: in vier bis acht Wochen
dieselbe Messung wiederholen und die Bewegung zuordnen koennen.

Search-Console-Werte ueber 90 Tage (2026-06-19 bis 2026-09-17). Seitenwerte live
von der Produktion, mit der eigenen Kennung geholt — mit einer fremden Kennung
liefert die Firewall eine Pruefseite aus, und die Messung zaehlt dann 24 Woerter
statt 860. Genau dieser Fehlmessung bin ich beim ersten Anlauf aufgesessen.

## Je Seite

| Seite | Position | Impressionen | Klicks | Titel (Zeichen) | Suchbegriff im Text | Woerter | Abschnitte |
|---|---|---|---|---|---|---|---|
| `/photovoltaik-rechner` | 60.5 | 111 | 0 | 62 | 0x | 860 | 9 |
| `/waermepumpe-rechner` | 90 | 150 | 0 | 66 | 0x | 531 | 8 |
| `/balkonkraftwerk/rechner` | 64 | 123 | 1 | 56 | 1x | 1575 | 15 |
| `/klimaanlage-stromkosten` | 59.3 | 84 | 0 | 64 | 0x | 608 | 8 |
| `/einspeiseverguetung-rechner` | 32.9 | 136 | 1 | 66 | 1x | 1054 | 11 |

Die Seitenueberschrift ist auf allen fuenf vorhanden, genau einmal:

| Seite | Ueberschrift heute | Titel heute |
|---|---|---|
| `/photovoltaik-rechner` | Lohnt sich Photovoltaik? | Photovoltaik-Rechner – Amortisation & Rendite sofort berechnen |
| `/waermepumpe-rechner` | Lohnt sich eine Wärmepumpe? | Wärmepumpen-Rechner – Stromverbrauch, Kosten & Ersparnis berechnen |
| `/balkonkraftwerk/rechner` | Lohnt sich ein Balkonkraftwerk? | Balkonkraftwerk-Rechner: Ertrag & Amortisation berechnen |
| `/klimaanlage-stromkosten` | Was kostet eine Klimaanlage? | Klimaanlagen-Rechner – Stromkosten & Verbrauch ehrlich berechnet |
| `/einspeiseverguetung-rechner` | Einspeisevergütung-Rechner | Einspeisevergütung-Rechner 2026 – aktueller Satz & Jahresvergütung |

## Anfragen, auf denen die Rechner heute erscheinen

| Anfrage | Impressionen | Klicks | Position |
|---|---|---|---|
| autarkierechner mit wärmepumpe | 35 | 0 | 85.3 |
| balkonkraftwerk rechner | 29 | 0 | 79.2 |
| pv amortisationsrechner | 28 | 0 | 95.2 |
| balkonkraftwerk rechner | 22 | 0 | 88.3 |
| klimaanlage kosten rechner | 21 | 0 | 69.8 |
| wärmepumpe stromverbrauch rechner | 20 | 0 | 93.6 |
| stromverbrauch wärmepumpe rechner | 18 | 0 | 95.0 |
| pv rechner | 13 | 0 | 95.3 |
| autarkierechner mit wärmepumpe | 10 | 0 | 77.1 |
| balkonkraftwerk amortisation rechner | 10 | 0 | 66.6 |
| pv anlage rechner | 10 | 0 | 97.0 |
| solarrechner saarland | 10 | 0 | 43.5 |
| einspeisevergütung berechnen | 9 | 0 | 90.2 |
| photovoltaik rechner | 9 | 0 | 90.2 |
| photovoltaik wärmepumpe rechner | 9 | 0 | 97.4 |
| wärmepumpe: stromverbrauch rechner | 9 | 0 | 90.0 |
| wärmepumpenrechner | 9 | 0 | 92.0 |
| amortisation pv anlage rechner | 8 | 0 | 98.1 |
| balkonkraftwerk ertragsrechner | 8 | 0 | 78.8 |
| einspeisevergütung 2024 rechner | 8 | 0 | 65.4 |

## Wer auf "photovoltaik rechner" vorn steht

| Platz | Domain | Ueberschrift der Seite |
|---|---|---|
| 1 | solar.htw-berlin.de | Rechner |
| 2 | adac.de | (nicht auslesbar) |
| 3 | test.de | (nicht auslesbar, 1.286 Woerter) |
| 4 | sma.de | Solarrechner: Jetzt Ersparnis berechnen und Angebot anfordern |
| 5 | co2online.de | (nicht auslesbar, 369 Woerter) |
| 7 | rechnerphotovoltaik.de | Photovoltaik |
| 8 | ibc-solar.de | Rechner und Kalkulatoren fuer Solaranlagen |

Der Erste traegt ein einzelnes Wort als Ueberschrift. Der Suchbegriff in der
Ueberschrift ist damit nachweislich keine Voraussetzung fuers Ranking. Der
Ansatzpunkt ist ein anderer: Auf unseren Rechnern kommt der Begriff im ganzen
Seitentext **gar nicht vor** — 860 Woerter ueber Photovoltaik ohne ein einziges
"Photovoltaik-Rechner".

## Was beim Wiederholen messbar ist

- Suchbegriff im Text: 0x -> kommt vor (sofort pruefbar)
- Titellaenge: vier von fuenf ueber 62 Zeichen -> darunter (sofort pruefbar)
- Position und Impressionen: offen, fruehestens nach vier Wochen beurteilbar.
  Dass die Aenderung sie bewegt, ist NICHT belegt und wird hier nicht behauptet.

```json
[
 {
  "pfad": "/photovoltaik-rechner",
  "anfrage": "photovoltaik rechner|pv rechner",
  "titel": "Photovoltaik-Rechner – Amortisation & Rendite sofort berechnen",
  "titel_zeichen": 62,
  "h1": "Lohnt sich Photovoltaik?",
  "h2": 9,
  "woerter": 860,
  "begriff_im_text": 0,
  "impressionen_90t": 111,
  "klicks_90t": 0,
  "position": 60.5
 },
 {
  "pfad": "/waermepumpe-rechner",
  "anfrage": "wärmepumpe rechner",
  "titel": "Wärmepumpen-Rechner – Stromverbrauch, Kosten & Ersparnis berechnen",
  "titel_zeichen": 66,
  "h1": "Lohnt sich eine Wärmepumpe?",
  "h2": 8,
  "woerter": 531,
  "begriff_im_text": 0,
  "impressionen_90t": 150,
  "klicks_90t": 0,
  "position": 90
 },
 {
  "pfad": "/balkonkraftwerk/rechner",
  "anfrage": "balkonkraftwerk rechner",
  "titel": "Balkonkraftwerk-Rechner: Ertrag & Amortisation berechnen",
  "titel_zeichen": 56,
  "h1": "Lohnt sich ein Balkonkraftwerk?",
  "h2": 15,
  "woerter": 1575,
  "begriff_im_text": 1,
  "impressionen_90t": 123,
  "klicks_90t": 1,
  "position": 64
 },
 {
  "pfad": "/klimaanlage-stromkosten",
  "anfrage": "klimaanlage kosten rechner",
  "titel": "Klimaanlagen-Rechner – Stromkosten & Verbrauch ehrlich berechnet",
  "titel_zeichen": 64,
  "h1": "Was kostet eine Klimaanlage?",
  "h2": 8,
  "woerter": 608,
  "begriff_im_text": 0,
  "impressionen_90t": 84,
  "klicks_90t": 0,
  "position": 59.3
 },
 {
  "pfad": "/einspeiseverguetung-rechner",
  "anfrage": "einspeisevergütung berechnen",
  "titel": "Einspeisevergütung-Rechner 2026 – aktueller Satz & Jahresvergütung",
  "titel_zeichen": 66,
  "h1": "Einspeisevergütung-Rechner",
  "h2": 11,
  "woerter": 1054,
  "begriff_im_text": 1,
  "impressionen_90t": 136,
  "klicks_90t": 1,
  "position": 32.9
 }
]
```

## Nachtrag 2026-09-21: Förderseiten, Suchvolumen, Konkurrenz

Suchvolumen aus Google Ads (DataForSEO), Deutschland, Jahresmittel. Monat für Monat
geprüft: stabil, kein einzelner Ausschlag. Die Werte sind gerundet (Google liefert
nur Stufen).

| Seite | Zielbegriff | Suchen/Monat | im Titel | in der Überschrift | im Text | unsere Position | wer vorn steht |
|---|---|---|---|---|---|---|---|
| `/photovoltaik-foerderung` | photovoltaik förderung | 6.600 | nein | nein | 3× | 57 | KfW, Sparkasse, E.ON, NRW-Tool, NBank |
| `/ratgeber/waermepumpe-foerderung` | wärmepumpe förderung | 33.100 | ja | ja | 9× | nie erschienen | KfW (2×), Klimaschutz Nds., Bosch, tagesschau, BWP, BAFA |
| `/balkonkraftwerk/foerderung` | balkonkraftwerk förderung | 880 | ja | ja | 19× | 76 | Finanztip, SAB Sachsen, thega, co2online, Stadt München |
| `/einspeiseverguetung-tabelle` | einspeisevergütung 2026 | 18.100 | ja | ja | 1× | nie erschienen (Seite selbst Ø 8,6 auf Nebenbegriffen) | photovoltaik.org, Bundesnetzagentur, Solarwatt, ADAC |

Alle vier Seiten sind indexiert, Kanonisierung stimmt (Index-Status 2026-09-21).
Der Wärmepumpen-Förder-Ratgeber hat den Begriff in Titel, Überschrift und 9× im
Text und erscheint auf dem 33.100er-Begriff trotzdem nie. Dort ist die Wortwahl
NICHT der Grund; das Feld gehört KfW, BAFA und Nachrichtenseiten.
