# Solar-Atlas: Landkreis-Übersicht + Gemeinde-Detailseiten

**Stand:** 2026-07-15 · **Status:** Konzept, abgestimmt · **Auslöser:** Anfrage der Gemeinde Höchberg (Lkr. Würzburg)

---

## 1. Ziel

Für jede deutsche Gemeinde eine Seite mit dem tatsächlichen Solar-Anlagenbestand, eingebettet
in eine Landkreis-Rangliste. Die Daten dafür laufen bereits jeden Monat durch unsere Pipeline —
wir werfen die Gemeindeebene bisher nur weg.

**Der strategische Punkt ist nicht Onsite-SEO, sondern Distribution.** Wir haben festgehalten
(Memory `feedback_backlinks`), dass Rechner-Verzeichnisse als Backlink-Quelle wertlos sind und
der echte Hebel Embed-Distribution plus Outreach ist. Eine Gemeindeseite ist genau dieser Hebel:
Die Kommune verlinkt von sich aus, weil die Seite über sie ist. Rund 10.750 Gemeinden, jede mit
Bauamt oder Klimaschutzmanagement. Die Anschlussfrage — „Können wir die Zahlen bei uns
einbinden?" — führt direkt auf unser Widget.

Die Höchberg-Anfrage ist der Beweis, dass die Nachfrage von selbst kommt.

---

## 2. Getroffene Entscheidungen

| Frage | Entscheidung |
|---|---|
| Umfang | **Pilot Landkreis Würzburg** (~32 Gemeinden), danach bundesweiter Rollout |
| Verhältnis zu den Förder-Stadtseiten | **Trennen:** Förderseite = Geld, Atlas = Bestand. Die Zahlen-Sektion der Förderseiten weicht einem Link auf den Atlas |
| URL-Schema | `/solar-atlas/[bundesland]/[landkreis]/[gemeinde]` — Produktname statt Keyword, weil im Kommunen-Gespräch pitchbar |

Zum URL-Schema: Der Suchbegriff („Solaranlagen Höchberg") lebt in H1, Title und Fließtext.
Keywords in der URL sind ein schwacher Rankingfaktor — die Entscheidung kostet praktisch nichts
und gewinnt einen kommunizierbaren Produktnamen.

---

## 3. Leitkennzahl — und die Vergleichsfalle

**Die naive Kennzahl (Watt pro Einwohner, alles zusammen) ist irreführend und gefährlich.**

Höchberg: 9,1 MW auf ~9.450 Einwohner = **965 W pro Kopf**, deutlich unter dem Bundesschnitt
(~1.200 W). Klingt nach Nachzügler. Tatsächlich ist Höchberg ein dichter Würzburger Vorort mit
fast keiner Freifläche — nur 18 Anlagen über 30 kW. Die Kennzahl misst dort nicht Engagement,
sondern verfügbare Ackerfläche.

Eine Rangliste auf dieser Basis bestraft ausgerechnet die Kommunen, die wir als Partner wollen,
und macht die Seite unzitierbar für die Verwaltung.

**Deshalb:**

- **Leitkennzahl = Dach-PV pro Einwohner** (Höchberg: **728 W**) — vergleicht Äpfel mit Äpfeln
- **Freifläche separat ausgewiesen**, nie in die Rangliste gemischt
- **Erklärsatz auf jeder Seite:** dichte Gemeinden haben strukturell weniger Freifläche

Alle Referenzwerte (Kreis, Bundesland, Bund) kommen aus derselben Tabelle — kein externer
Abgleich nötig, kein Drift.

---

## 4. Seite 1: Landkreis-Übersicht

`/solar-atlas/bayern/wuerzburg`

Der Klick-Magnet ist die Rangliste. „Wo stehen wir?" ist die Frage, die jeder Bürgermeister
zuerst stellt — und der Grund, warum die Seite geteilt wird.

**Aufbau von oben nach unten:**

1. **H1:** Solaranlagen im Landkreis Würzburg
2. **Kreis-Kacheln:** Anlagen · installierte Leistung · Dach-W pro Kopf · Neu im letzten Jahr
3. **Karte:** die vorhandene Choropleth-Komponente, auf Gemeindeebene gezoomt, eingefärbt nach
   Dach-PV pro Kopf
4. **Rangliste aller Gemeinden** — der Kern der Seite
   - Spalten: Rang · Gemeinde · Anlagen · Leistung · Dach-W/Kopf
   - Sortierbar: Dach pro Kopf (Default) · absolut · Zubau letztes Jahr
   - Jede Zeile führt auf die Gemeindeseite
5. **Zubaukurve** des Kreises nach Jahr
6. **Einordnung:** Kreis vs. Bundesland vs. Bund
7. **Quellen + Disclaimer**

---

## 5. Seite 2: Gemeinde-Detail

`/solar-atlas/bayern/wuerzburg/hoechberg`

**Aufbau von oben nach unten:**

1. **Breadcrumb:** Solar-Atlas › Bayern › Landkreis Würzburg › Höchberg
2. **H1:** Solaranlagen in Höchberg
3. **Hero:** große Zahl = Dach-PV pro Kopf, daneben der Rang im Landkreis
   („728 W pro Einwohner · Platz 18 von 32")
4. **Kacheln:** Anlagen · Leistung · Batteriespeicher · Neu im letzten Jahr
5. **Aufteilung** (Balken): Steckersolar · Dach privat · Dach gewerblich · Freifläche
6. **Zubaukurve** nach Jahr — die vorhandene Komponente von den Förderseiten
7. **Einordnung** (Balkenvergleich): Gemeinde · Kreis · Bundesland · Bund, plus Erklärsatz
   zur Freiflächen-Verzerrung
8. **Förderung:** Landesprogramm gibt es immer, kommunales falls vorhanden → Link auf die
   Förderseite
9. **Was bringt eine Anlage hier?** Beispielrechnung mit dem lokalen Ertrag → CTA in den Rechner
10. **Für die Gemeinde:** „Diese Zahlen auf Ihrer Website einbinden" → Widget.
    **Das ist die eigentliche Conversion dieser Seite** — der Outreach-Hook, nicht der Rechner-CTA.
11. **FAQ + JSON-LD**
12. **Quellen + Disclaimer**

**Bewusst nicht drauf:** Einzelanlagen. In einem 400-Seelen-Dorf mit drei Anlagen wäre
„größte Anlage: 380 kW" faktisch personenbeziehbar. Nur Aggregate.

---

## 6. Datenmodell & Pipeline

### 6.1 Gemeindeschlüssel behalten

Die Pipeline schneidet den Gemeindeschlüssel heute auf fünf Stellen (Kreisebene) ab und wirft
die Gemeindeinformation jeden Monat weg. Künftig: volle acht Stellen behalten.

Der Schlüssel ist geschachtelt (2 Stellen Bundesland → 3 Kreis → 3 Gemeinde). Kreis-, Landes-
und Bundeszahlen lassen sich damit weiterhin aus den Gemeindezahlen aufsummieren.
**Eine Quelle, alle Ebenen, kein Doppelzählen** — die Gemeinde wird die einzige gespeicherte
Granularität, alles darüber ist abgeleitet.

### 6.2 Steckersolar als eigenes Segment

**Fund:** Die Pipeline erkennt Balkonkraftwerke bereits (`ArtDerSolaranlage`), wirft die
Unterscheidung aber weg — sie landen in `privat_dach`.

Für eine Gemeindeseite ist das die falsche Entscheidung:

- In Höchberg sind **253 von 925 Anlagen** Steckersolar (27 % der Anlagen, aber nur 2,6 % der Leistung)
- Balkonkraftwerk-Zuschüsse sind das **mit Abstand häufigste kommunale Förderprogramm** — die
  Zahl ist genau das, was eine Kommune über ihr eigenes Programm wissen will

→ Viertes Segment `steckersolar` einführen. Passt in denselben Pipeline-Durchlauf.

### 6.3 Der einzige echte Umbau: der Leseweg

Die Tabelle wächst von heute **50.745** auf grob **500.000 Zeilen**. Für die Datenbank egal.

Aber: Die Karte lädt heute die komplette Tabelle in den Speicher und aggregiert in JavaScript
(seitenweise à 1.000 Zeilen). Bei 500.000 Zeilen sind das 500 Anfragen pro Seitenaufruf — das
bricht.

**Lösung:** vorberechnete Kreis- und Landesebene für die Karte; Detailzahlen werden nur noch für
die eine gefragte Gemeinde geladen (dieser Pfad existiert bereits und ist für ~60 Buckets
ausgelegt). Die Prefix-Logik bleibt überall gültig, weil der Schlüssel geschachtelt ist.

### 6.4 Namensdopplungen

„Neustadt" gibt es rund zwanzigmal. Die Schachtelung unter dem Landkreis löst das ohne
Sonderlogik.

---

## 7. Neue Datenquelle: Einwohnerzahlen

Für die Leitkennzahl brauchen wir Einwohnerzahlen und amtliche Gemeindenamen.

- **Quelle:** Destatis Gemeindeverzeichnis (GV-ISys), amtlich, enthält Schlüssel, Name,
  Einwohner, Fläche
- **Lizenz:** dl-de/by-2-0 — muss als Eintrag in der Quellen-Registry erfasst und auf
  `/datenstand` gelistet werden (Legal-Checkliste Punkt 1)
- **Warum nicht die Namen aus dem Marktstammdatenregister:** dort sind sie Freitext der
  Betreiber und uneinheitlich geschrieben

---

## 8. Recht & Risiken

| Risiko | Bewertung | Gegenmittel |
|---|---|---|
| **Thin Content / „scaled content abuse"** | Der ernsteste. 10.750 automatisch erzeugte Seiten sind genau das Muster, das Google seit dem Spam-Update 2024 abstraft | Mindestschwelle (Gemeinden unter ~50 Anlagen bekommen keine eigene Seite, stehen nur in der Kreis-Rangliste); echter Vergleichs-Mehrwert je Seite statt Zahlendump |
| **Personenbezug in kleinen Gemeinden** | Bei wenigen Anlagen im Ort sind Einzelanlagen re-identifizierbar | Nur Aggregate, keine Einzelanlagen, keine Adressen, keine Betreiber |
| **Kannibalisierung der Förderseiten** | 117 Städte hätten zwei Seiten mit fast gleicher Überschrift | Entschieden: Förderseiten verlieren ihre Zahlen-Sektion und verlinken auf den Atlas |
| **Rangliste beleidigt Kommunen** | Dichte Orte sehen pro Kopf schlecht aus | Dach-PV pro Kopf als Leitkennzahl, Freifläche separat, Erklärsatz |

**Legal-Checkliste** (siehe CLAUDE.md): Punkt 1 (neue Datenquelle → Registry + `/datenstand`),
Punkt 4 (Seiten mit Zahlen → Stand-Datum + Unverbindlichkeit), Punkt 5 (falls Widget),
Punkt 7 (Personenbezug — hier durch Aggregation gelöst).

---

## 9. Pilot: Landkreis Würzburg

**Warum Pilot:** Der Kommunen-Kontakt ist da. Wir schärfen die Seite an echtem Feedback, bevor
tausende Seiten im Index stehen.

**Reihenfolge:**

1. Pipeline: Gemeindeschlüssel behalten + Steckersolar-Segment → einmaliger Lauf
2. Einwohnerzahlen aus dem Destatis-Gemeindeverzeichnis einlesen, Quelle registrieren
3. Leseweg umbauen (vorberechnete Kreis-/Landesebene)
4. Gemeinde-Detailseite (Höchberg als Referenz)
5. Landkreis-Übersicht mit Rangliste
6. Abnahme im Browser → Höchberg die Seite zeigen
7. Erst danach: Förderseiten-Umbau + bundesweiter Rollout mit Schwelle

**Nicht im Pilot:** Widget, Förderseiten-Umbau, Sitemap-Eintrag für alle Gemeinden.

---

## 10. Offene Punkte

- **Zubau-Referenzjahr:** Das laufende Jahr ist immer unvollständig (Höchberg 2026: 63 Anlagen
  bis Juli). „Neu im letzten Jahr" muss auf das letzte *volle* Jahr zeigen, sonst sieht jede
  Gemeinde im Januar aus wie ein Totalausfall. Rollover-sicher ableiten, nicht hardcoden.
- **Meldeverzug:** Anlagen dürfen einen Monat nach Inbetriebnahme gemeldet werden — die letzten
  Wochen sind immer untererfasst. Auf der Seite erwähnen?
- **Schwellenwert:** ~50 Anlagen ist ein Bauchwert. Am Pilot prüfen, ab wann eine Seite wirklich
  etwas erzählt.
- **Landkreis-Slugs:** „wuerzburg" ist als Slug für Stadt *und* Landkreis Würzburg zweideutig
  (kreisfreie Stadt 09663, Landkreis 09679). Braucht eine Regel.
