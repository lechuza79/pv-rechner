# Rollentrennung Atlas / Förderseiten: wie sie gemessen wird

**Warum es diese Datei gibt (24.08.2026):** Der Wellen-Monitor zählt bei jedem
Lauf, wie viele Suchanfragen auf Förderseiten kein Geld-Wort tragen — die Zahl
soll als Reihe wachsen und anzeigen, ob Google die beiden Seitenfamilien
auseinanderhält. Bis heute stand die Zählregel nur im Kopf der jeweiligen
Sitzung. **Nachgemessen auf demselben Fenster (13.07.–21.08.2026, 147 sichtbare
Förder-Anfragen) macht die Zählweise 39 % gegen 22 % aus — ein Unterschied von
25 Anfragen an identischen Daten.** Zwei Sitzungen, die verschieden zählen,
erzeugen also eine Reihe, die Bewegungen behauptet, die es nie gab.

## Die zwei Korrekturen, ohne die der Zähler überzeichnet

### 1. Umlautlose Schreibweisen zählen als Geld-Wort

Suchende tippen „forderung" ohne Umlaut, und zwar nicht selten: Im Fenster oben
sind es acht Anfragen, darunter „solaranlage forderung nahe düsseldorf",
„pv-speicher forderung nahe mannheim" und „photovoltaik forderung memmingen".
Ein Muster, das nur `förder` kennt, hält jede davon für eine Bestandsanfrage —
dabei ist es die Geld-Frage, buchstäblich. Dieselbe Falle hat schon die
Förder-Suche getroffen (CLAUDE.md: „forderprogramme" bei Gaimersheim und
Kempten).

Gültiges Muster, klein geschrieben verglichen:

```
f[öo]rder | zuschuss | zusch[üu]ss | klimabonus | subvention |
pr[äa]mie | beihilfe | kfw | \bbeg\b | finanzier
```

Das nackte `forderung` ohne PV-Kontext ist ausdrücklich **nicht** mit drin — es
ist ein eigenes Wort, und „Forderungsmanagement" ist das Eintreiben offener
Beträge.

### 2. Eingabe-Rauschen ist keine Bestandsanfrage

Siebzehn der 58 Treffer im Fenster oben sind gar keine Anfragen im Wortsinn:
nackte Postleitzahlen (30889, 46242, 93055, 49076, 54668, 93183, „28755
bremen"), Ein-Wort-Fragmente („ja" dreimal, „antrag", „pv", „in viersen", „in
würzburg") und Satzreste aus einem Formular („es handelt sich um eine
doppelhaushälfte"). Sie entstehen, weil Nutzer in ein Suchfeld tippen, das sie
für unseres halten. Als „Bestandsanfrage auf einer Förderseite" gezählt,
verdoppeln sie den Befund fast.

```
^\d{5}( .*)?$  |  ^(ja|nein|antrag|pv|in [a-zäöüß]+|es handelt sich .*)$
```

Die Liste ist bewusst eng und wird **nur erweitert, wenn ein neuer Fall
auftaucht** — ein großzügiger Rauschfilter lässt den Befund verschwinden, statt
ihn zu messen. Jeder Eintrag steht hier mit dem Fall, der ihn ausgelöst hat.

## Was der Bericht nennen muss

Nicht nur den Prozentsatz, sondern die vier Zahlen dahinter — sonst lässt sich
später nicht mehr feststellen, welche Zählweise dahinterstand:

> *n* sichtbare Anfragen auf Förderseiten · davon *x* mit Geld-Wort · *y* ohne,
> davon *r* Eingabe-Rauschen und *e* echte Bestandsanfragen.

Dazu die echten Anfragen im Klartext mit Position. Zehn Zeilen, die man lesen
kann, sagen mehr als eine Quote — und nur an ihnen fällt auf, wenn sich die
Sorte der Anfragen ändert.

## Die zwei Zahlen, die ohne Filter auskommen

Sie sind über Läufe hinweg vergleichbar und deshalb die verlässlichere Reihe:

1. **Wie viele Atlas-Anfragen tragen ein Geld-Wort?** Am 24.08.2026: **0 von
   171.** Der Atlas drängt sich nicht in die Geld-Frage — diese Richtung war nie
   das Problem und ist es weiterhin nicht.
2. **Bei wie vielen Anfragen erscheinen beide Familien gleichzeitig?**
   Am 24.08.2026: **9** im 39-Tage-Fenster, **1** im 28-Tage-Fenster.

## Der Befund, der die Konzeptaussage präzisiert (24.08.2026)

`docs/ortswelle-und-foerderseiten.md` warnt, die Förderseiten besetzten „längst
die Bestands-Ortsanfragen, auf die die neuen Ortsseiten zielen". Die
Überschneidung liegt gemessen aber **ausschließlich auf der Bundesland-Ebene**,
nicht auf der Ortsebene. Alle neun Fälle:

| Anfrage | Förderseite | Atlasseite | vorn |
|---|---|---|---|
| photovoltaik pfalz | 33,3 (16 Einbl.) | 40,7 (23) | Förder |
| photovoltaik rheinland-pfalz | 82,8 (9) | 94,0 (12) | Förder |
| solaranlage rheinland-pfalz | 90,6 (5) | 90,6 (7) | gleichauf |
| photovoltaik hessen | 86,0 (2) | 92,3 (4) | Förder |
| solaranlage hessen | 98,7 (3) | 92,0 (2) | Atlas |
| photovoltaikanlage hessen | 94,0 (1) | 90,0 (1) | Atlas |
| pv anlage mecklenburg vorpommern | 100,0 (3) | 86,7 (7) | Atlas |
| photovoltaik mecklenburg vorpommern | 96,7 (3) | 92,0 (1) | Atlas |
| „ja" (Eingabe-Rauschen) | 6,3 (3) | 2,0 (1) | Atlas |

**Drei Bundesländer, kein einziger Ort.** Der Grund ist strukturell und nicht
etwa ein gutes Zeichen: Auf Ortsebene gibt es gar keine Konkurrenz, weil die
Atlas-Ortsseiten noindex sind. Die Förderseiten stehen dort sehr wohl auf
Bestandsanfragen — „photovoltaik osnabrück" auf Position 3, „photovoltaik
krefeld" auf 4, „solaranlage krefeld" auf 6 —, nur steht ihnen niemand von uns
gegenüber. **Die Frage des Konzepts ist damit nicht beantwortet, sondern
vertagt: Sie stellt sich am Tag von Welle 1, für genau diese Orte.**

Auf Bundesland-Ebene, wo beide Familien seit Welle 0a indexiert sind, ist die
Konkurrenz dagegen real — nur bisher folgenlos: Acht der neun Paarungen liegen
jenseits von Position 80, also weit außerhalb jeder Sichtbarkeit. Einzige
Ausnahme ist „photovoltaik pfalz" mit 33,3 gegen 40,7. Handlungsbedarf entsteht
daraus heute nicht; die Zeile gehört beobachtet, nicht repariert.

## Messwerte

| Datum | Fenster | sichtbare Förder-Anfragen | ohne Geld-Wort, bereinigt | Atlas mit Geld-Wort | beide Familien |
|---|---|---|---|---|---|
| 18.08.2026 | 18.07.–15.08. | 108 | 33 (Zählweise nicht dokumentiert) | 0 von 149 | 7 |
| 24.08.2026 | 24.07.–21.08. (28 T.) | 55 | 10 (18 %) | 0 von 170 | 1 |
| 24.08.2026 | 13.07.–21.08. (39 T.) | 147 | 33 (22 %) | 0 von 171 | 9 |

**Die Zeile vom 18.08. ist mit den beiden anderen nicht vergleichbar** — wie
damals gezählt wurde, lässt sich nicht mehr rekonstruieren, und die Rohdaten
gibt die Search Console für ein zurückliegendes Fenster nicht wieder heraus.
Fortgeschrieben wird ab dem 24.08.2026 die bereinigte Zahl, und **immer mit dem
Fenster daneben**: Die beiden Werte desselben Tages (18 % und 22 %) zeigen, dass
schon die Fensterlänge den Prozentsatz bewegt.

Der Rückgang von 108 auf 55 sichtbare Anfragen im 28-Tage-Fenster ist **kein**
Nachfragerückgang: Die Search Console zeigt nur Anfragen oberhalb ihrer
Anonymisierungsschwelle. Die Gesamtnachfrage der Förderfamilie lag im
28-Tage-Fenster bis 21.08. bei 1.568 Einblendungen und 8 Klicks.
