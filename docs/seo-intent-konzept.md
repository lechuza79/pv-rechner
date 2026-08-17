# Intent-Konzept: was wir bauen, wenn die Antwort schon oben steht

**Stand 13.08.2026** · Datengrundlage: `docs/seo/befund-2026-08-13.md` (gemessen, nicht
geschätzt) · Löst die bisherige Reichweiten-Logik von Phase 4 ab, ersetzt sie aber nicht
vollständig — was bleibt, steht in Abschnitt 7.

---

## 1. Der Auslöser in fünf Zeilen

Unsere Sichtbarkeit hat sich in vier Wochen verdoppelt (1.939 → 4.018 Einblendungen).
Die Klicks nicht (14 → 40, Klickrate konstant ~1 %). Die Ursache ist gemessen und liegt
nicht bei uns: Auf drei von vier geprüften Suchbegriffen, bei denen wir gut stehen,
liefert Google die Antwort selbst — als KI-Antwort über allen Ergebnissen. Der einzige
geprüfte Begriff ohne KI-Antwort ist der, dessen Antwort sich laufend ändert
(„strommix deutschland live").

**Mehr Text zu beantwortbaren Fragen zu schreiben, erzeugt ab jetzt Einblendungen und
keine Besucher.** Das ist keine Prognose, das ist die Messung der letzten vier Wochen.

---

## 2. Leitidee

> **Wir bauen, was eine Antwortmaschine nicht ersetzen kann — und wir bauen es dort,
> wo die Antwortmaschine gerade jemanden stehen lässt.**

Drei Sorten Bedarf sind strukturell KI-fest:

1. **Veränderlich** — die Antwort gilt nur jetzt (Live-Strommix, aktuelle
   Einspeisesätze, Förderstatus „ausgeschöpft").
2. **Persönlich** — die Antwort hängt an Zahlen, die nur der Nutzer hat (sein Dach,
   sein Verbrauch, seine Heizung, sein Wohnort).
3. **Handelnd** — der Nutzer will nicht wissen, sondern tun (beantragen, anmelden,
   vergleichen, mitnehmen, vorlegen).

Der zweite Punkt ist unser Kerngeschäft, seit es die Seite gibt. Der erste ist die
Datenseite, die wir mit den Energiedaten schon haben. **Der dritte ist die Lücke** — und
genau der Bedarf, mit dem jemand nach der KI-Antwort noch klickt.

### Der Filter für jede künftige Content-Entscheidung

Drei Fragen, in dieser Reihenfolge, **bevor** eine Seite gebaut oder erweitert wird:

1. **Steht auf dieser Suche eine KI-Antwort?** (SERP-Abruf, 0,002 $.) Wenn ja: Eine
   Seite, die nur erklärt, wird keine Besucher bekommen — egal wie gut sie ist.
2. **Was bleibt offen, nachdem jemand die KI-Antwort gelesen hat?** Das ist der
   Rest-Bedarf. Er ist fast immer persönlich oder handelnd.
3. **Ist unsere Antwort darauf ein Werkzeug oder ein Absatz?** Ein Absatz verliert
   gegen die Antwortbox. Ein Werkzeug steht gar nicht erst im Wettbewerb mit ihr.

---

## 3. Intent-Landkarte

Je Feld: was gesucht wird · was die KI-Antwort bereits liefert · was offen bleibt ·
was wir dagegen bauen. **Die Spalte „Rest-Bedarf" ist die eigentliche Roadmap.**

### 3.1 Förderung — größte Fläche, schlechteste Klickrate, klarster Rest-Bedarf

*Gesucht:* „photovoltaik förderung <ort>", „klimabonus frankfurt", „förderung pv anlage rlp"
*Die KI liefert:* Programmnamen, grobe Beträge, den Hinweis „je nach Kommune unterschiedlich"
*Wettbewerb:* Platz 1–2 amtlich (Energieagentur, Verbraucherzentrale), dahinter zehn Anbieter mit Lead-Absicht

**Rest-Bedarf — was die KI-Antwort niemand beantwortet:**

| Offene Frage | Warum KI-fest | Was wir bauen | Datenlage |
|---|---|---|---|
| „Muss ich **vor** dem Auftrag beantragen?" | Programmspezifisch, Fehler kostet die gesamte Förderung | **Reihenfolge-Warnung**, prominent, je Programm | 14 von 40 Programmen tragen es heute als Freitext in `conditions` — muss strukturiertes Feld werden |
| „Was brauche ich dafür?" | Unterlagenliste je Träger | **Checkliste zum Abhaken/Mitnehmen** | fehlt, muss erhoben werden |
| „Bekomme **ich** das überhaupt?" | Hängt an Wohnort, Gebäude, Eigentum, Anlagengröße | **Berechtigungs-Check**, führt auf die passenden Programme | `eligibility`, `conditions`, `agsCode` vorhanden — Logik fehlt |
| „Kann ich zwei Programme kombinieren?" | Kombinationsregeln sind der häufigste Irrtum | Kombinierbarkeit sichtbar machen | `combinableWith` liegt vor, wird nicht ausgespielt |
| „Gibt es das Geld noch?" | Verändert sich, KI-Antworten hinken hinterher | Status („ausgeschöpft") als **Vorteil ausspielen** | `status` + `capped` + Förder-Wächter laufen bereits |
| „Wie viel bleibt am Ende bei mir?" | Persönlich | Bestehender Förder-Check mit der Rechnung verbinden | vorhanden |

**Grenze, die nicht überschritten wird:** Wir informieren, wir beraten nicht
(Legal-Checkliste Punkt 4). Eine Checkliste, ein Reihenfolge-Hinweis und ein Link zum
Träger sind Information. „Wir füllen Ihren Antrag aus" wäre Beratung — und bei 40
kommunalen Programmen mit eigenen Formularen auch fachlich nicht haltbar. Verbindlich
bleibt immer die Trägerseite, mit Stand-Datum und „ohne Gewähr".

### 3.2 Energiedaten — die einzige Fläche mit freier Bahn

*Gesucht:* „strommix deutschland live", „energiemonitor deutschland live"
*KI-Antwort:* **keine** — der Wert ändert sich laufend
*Wettbewerb:* Electricity Maps, SMARD, Agorameter, NDR, Energy-Charts — gleichartige Dashboards, keine Lead-Portale
*Unsere Position:* 10,1 — Schwelle zu Seite 1

**Rest-Bedarf:** Diese Konkurrenz gewinnt man nicht über Textarbeit, sondern über
Bekanntheit. Der vorhandene Hebel dafür ist die **Widget-Verbreitung**: Jede Einbettung
auf einer fremden Seite verweist auf genau die Seite, die als einzige eine echte Chance
auf Seite 1 hat. Das ist keine neue Strategie, sondern die bestehende — sie bekommt hier
nur zum ersten Mal einen gemessenen Grund und ein konkretes Ziel.

### 3.3 Wissensfragen (Atomstrom, Strommix-Erklärstücke) — Traffic aufgeben, Zitation anstreben

*Gesucht:* „wieviel atomstrom importiert deutschland"
*KI-Antwort:* vollständig, ganz oben, dazu ein Fragenblock
*Unsere Position:* 8 · Klicks: 0

Hier ist der Rest-Bedarf **ehrlicherweise nahe null**. Wer die Zahl wissen will, hat sie
gelesen. Diese Seiten als Besucherquelle zu optimieren, ist verlorene Arbeit.

**Sie behalten trotzdem einen Wert, aber einen anderen:** als Quelle, die in der
KI-Antwort *zitiert* wird. Das ist Reputation, kein Traffic — siehe Abschnitt 5.

### 3.4 Rechner — unberührt und der Grund, warum es die Seite gibt

Persönliche Fragen („lohnt sich das **bei mir**") sind strukturell KI-fest. Hier ist
nichts zu retten und nichts umzubauen. Der einzige Handlungspunkt: Die Rechner müssen
von den Flächen aus erreichbar sein, auf denen jemand mit Rest-Bedarf landet — also aus
den Förder- und Datenseiten heraus, mit einem Übergang, der zur gerade gestellten Frage
passt (nicht „Jetzt berechnen", sondern „Mit dem Zuschuss aus Bonn durchrechnen").

### 3.5 Solar-Atlas — vorerst kein Intent-Kandidat

Die Landesseiten ranken für Ortsstatistik-Anfragen mit geringem Volumen. Der große
Nachbarbegriff („Solarkataster") gehört amtlichen Dachflächen-Werkzeugen und ist eine
andere Frage (Beleg: Befund 2.1). Der Atlas bleibt, was er ist — Datengrundlage,
Widget-Quelle und Aufhänger für den Kommunen-Kontakt. **Kein Ausbau als Suchfläche.**

---

## 4. Roadmap

Reihenfolge nach dem Verhältnis „Rest-Bedarf × vorhandene Datenlage" zu Aufwand. Jede
Stufe ist einzeln lieferbar und einzeln abnehmbar.

### Stufe 1 — Förderseiten vom Text zum Werkzeug *(größter Hebel, Daten größtenteils da)*

1. **Antragsreihenfolge strukturiert erfassen.** Neues Feld je Programm statt Freitext
   in `conditions`; die 14 vorhandenen Nennungen migrieren, die übrigen 26 erheben.
   Sichtbar als Warnung dort, wo sie Geld spart — oberhalb der Beträge, nicht darunter.
2. **Antrags-Checkliste je Programm** — Unterlagen, Reihenfolge, Träger-Link,
   Stand-Datum. Zum Abhaken auf dem Bildschirm, mitnehmbar als Druck/PDF.
3. **Kombinierbarkeit ausspielen** (`combinableWith` liegt ungenutzt vor).
4. **Berechtigungs-Check**: wenige Fragen (Wohnort, Eigentum, Gebäude, geplante Größe)
   → die Programme, die zutreffen, mit dem, was zu tun ist. Nutzt den vorhandenen
   Förder-Check als Rechenteil.

*Abhängigkeit:* Punkt 1 und 2 brauchen eine Datenerhebung über 40 Programme. Die gehört
in denselben Rhythmus wie der bestehende Förder-Wächter, nicht in eine Einmal-Aktion.

### Stufe 2 — Übergänge, die zur gestellten Frage passen

Auf jeder Fläche mit Rest-Bedarf ein Weiterweg, der die konkrete Frage aufnimmt statt
allgemein zum Rechner zu zeigen. Kleiner Aufwand, betrifft Förderseiten, Datenseiten
und Ratgeber gleichermaßen.

### Stufe 3 — Widget-Verbreitung mit dem Strommix als Aufhänger

Bestehende Strategie, jetzt mit gemessenem Ziel: Verweise auf `/strommix-deutschland`,
um von Position 10 auf Seite 1 zu kommen. Zielgruppen sind die ohnehin vorbereiteten
Kommunen sowie Stadtwerke und Redaktionen.

### Stufe 4 — Antrags-Assistent *(bewusst zurückgestellt)*

Ein dialogischer Helfer für Förderanträge ist der naheliegende Endausbau von Stufe 1.
Er wird **nicht** vorgezogen, aus drei Gründen: Er kostet je Anfrage Geld, er braucht
die strukturierten Daten aus Stufe 1 ohnehin als Grundlage, und bei 40 Klicks im Monat
wäre seine Wirkung nicht von Rauschen zu unterscheiden. **Auslöser für die
Wiedervorlage:** Stufe 1 steht und die Förderflächen erreichen zusammen ~500 Klicks im
Monat.

---

## 5. Ratgeber: ja, parallel — aber mit anderem Ziel und anderem Maß

**Antwort auf die Frage des Betreibers (13.08.2026): ja, weiterführen, aber nicht als
Besucherquelle.**

Als Traffic-Instrument sind erklärende Texte durch die KI-Antworten entwertet; das ist
oben gemessen. Als **Reputationscontent** haben sie einen Zweck, den nichts anderes
erfüllt: Die KI-Antwort wird ja aus Quellen gebaut. Wer dort als Quelle auftaucht, ist
in der Antwort präsent, auch ohne Klick — und wird von Menschen wie von Modellen als
Referenz gelesen.

**Das ändert, woran ein Ratgeber gemessen wird:**

| | Bisher | Ab jetzt |
|---|---|---|
| Ziel | Besucher über die Suche | Als Quelle zitiert werden |
| Maß | Einblendungen, Klicks | Nennung in der KI-Antwort; Verweise von außen |
| Machart | umfassend, alle Aspekte | **eine Frage, klar beantwortet, eigene Zahl** |

Was zitierfähig macht, ist nicht Länge, sondern **eigene, nachvollziehbar hergeleitete
Zahlen** — also genau das, was wir ohnehin produzieren und was die Wettbewerber
abschreiben müssen. Unsere Ratgeber rechnen ihre Beispiele bereits live mit den
geteilten Funktionen; das ist der richtige Ansatz und bleibt.

**Messbar machen:** Der Monats-Wächter kann bei den KI-Antworten unserer Kernbegriffe
die aufgeführten Quellen mitlesen. Damit wird „werden wir zitiert?" eine Zahl statt
einer Vermutung. Aufwand gering, weil der SERP-Abruf ohnehin dazukommt (Befund,
Punkt 4.3).

---

## 6. Was wir ab jetzt messen

Die bisherigen Kennzahlen (Einblendungen, Durchschnittsposition) haben in diesem Lauf
beide in die Irre geführt. Ersetzt durch:

| Kennzahl | Warum | Woher |
|---|---|---|
| Klicks je Fläche (Förderung / Daten / Rechner / Ratgeber) | überlebt die KI-Antwort als Aussage | GSC, Seitenebene |
| Anteil unserer Top-20-Begriffe **mit** KI-Antwort | erklärt Klickverluste, die nicht unsere Schuld sind | SERP-Abruf |
| Zitate in KI-Antworten | einziges Maß für den Ratgeber-Strang | SERP-Abruf, Quellenliste |
| Aktive Widget-Einbettungen | Fortschritt der einzigen freien Fläche | eigene Zählung |

**Nicht mehr als Erfolg gewertet:** Einblendungen ohne Klicks und
Durchschnittspositionen ohne Query-Ebene.

---

## 7. Was aus Phase 4 bleibt und was fällt

**Bleibt:** Ratgeber (mit neuem Ziel, Abschnitt 5) · Widget-Verbreitung (aufgewertet zur
Stufe 3) · „PV kaufen vs. mieten" als Vergleichsstück, weil es eine persönliche
Entscheidung betrifft und damit KI-fest ist.

**Fällt vorerst:** weitere Förder-Landingpages in die Breite (dichtestes Wettbewerbsfeld
**und** KI-Antwort obenauf — der teuerste denkbare Weg) · Atlas-Ausbau als Suchfläche ·
alles, was eine beantwortbare Frage ein weiteres Mal beantwortet.

**Unberührt:** die Thin-Content-Frage vor der Atlas-Index-Freischaltung. Sie hat mit
diesem Konzept nichts zu tun und bleibt, wo sie ist.

---

## 8. Offene Entscheidungen — gehören dem Betreiber

1. **Stufe 1 freigeben?** Sie bindet Arbeit an einer Fläche, die heute fast keine Klicks
   bringt — die Wette ist, dass der Rest-Bedarf dort real ist. *Empfehlung: ja*, weil
   die Daten größtenteils vorliegen und die Reihenfolge-Warnung allein schon jemandem
   die gesamte Förderung retten kann.
2. **Erhebung der Antragswege über 40 Programme** — das ist wiederkehrende Pflege, keine
   einmalige Arbeit. *Empfehlung: an den bestehenden Förder-Wächter hängen.*
3. **Ratgeber-Frequenz:** Wie viele pro Monat, wenn das Ziel Zitation statt Reichweite
   ist? *Empfehlung: weniger und tiefer* — je Stück eine Frage mit einer eigenen Zahl.
4. **Antrags-Assistent** bleibt zurückgestellt (Stufe 4) — Wiedervorlage bei ~500
   Klicks/Monat auf den Förderflächen.
