# Solar-Atlas: Landkreis-Übersicht + Gemeinde-Detailseiten

**Stand:** 2026-07-15 · **Status:** Konzept, abgestimmt · **Auslöser:** Anfrage der Gemeinde Höchberg (Lkr. Würzburg)

---

## 1. Ziel

Eine durchgehende Hierarchie vom Bund bis zur Gemeinde — jede Ebene mit dem tatsächlichen
Solar-Anlagenbestand und einer Rangliste ihrer Kinder. Die Daten dafür laufen bereits jeden
Monat durch unsere Pipeline; wir werfen die Gemeindeebene bisher nur weg. Die oberen drei
Ebenen zeigt die Startseiten-Karte heute schon — sie haben nur keine Adressen.

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
| Umfang | **Pilot Landkreis Würzburg** (~32 Gemeinden), danach Rollout in Wellen (siehe 8.1) |
| Verhältnis zu den Förder-Stadtseiten | **Trennen:** Förderseite = Geld, Atlas = Bestand. Die Zahlen-Sektion der Förderseiten weicht einem Link auf den Atlas |
| URL-Schema | `/solar-atlas/[bundesland]/[kreis]/[gemeinde]` — Produktname statt Keyword, weil im Kommunen-Gespräch pitchbar |
| Kennzahl | **Beide** — W/Kopf gesamt *und* W/Kopf Dach. Umschalter im Detail, beide Spalten in der Rangliste |
| Segmente | Freifläche vs. Dach, innerhalb Dach gewerblich vs. privat, plus Steckersolar |
| Zeiträume | **Beide** — letztes volles Jahr *und* laufendes Jahr, klar beschriftet |
| Kreis-Slugs | Aus der amtlichen Bezeichnung ableiten (Destatis), nicht pauschal `landkreis-` (siehe 6.4) |
| Index | Wellen mit Search Console als Ampel; Pilot bleibt noindex |

Zum URL-Schema: Der Suchbegriff („Solaranlagen Höchberg") lebt in H1, Title und Fließtext.
Keywords in der URL sind ein schwacher Rankingfaktor — die Entscheidung kostet praktisch nichts
und gewinnt einen kommunizierbaren Produktnamen.

---

## 3. Kennzahlen: beide, nicht eine

**Watt pro Einwohner (gesamt)** und **Watt pro Einwohner (nur Dach)** werden beide gezeigt —
umschaltbar auf der Detailseite, nebeneinander als Spalten in der Kreis-Rangliste.

Der Unterschied ist erheblich und erklärt sich an Höchberg:

| Kennzahl | Höchberg | Aussage |
|---|---|---|
| W/Einwohner gesamt | **965 W** | Wie viel Solarleistung steht hier — unabhängig davon, warum |
| W/Einwohner nur Dach | **728 W** | Was die Gemeinde und ihre Bürger auf den eigenen Gebäuden gemacht haben |

Höchberg liegt gesamt unter dem Bundesschnitt (~1.200 W), weil es ein dichter Würzburger Vorort
ohne nennenswerte Freifläche ist — nur 18 Anlagen über 30 kW.

**Beide Zahlen haben ihre Berechtigung:**

- Die Gesamtzahl ist der ehrliche Ist-Zustand. Wenn eine Gemeinde hinten liegt, ist das so —
  und ein Grund zu handeln, kein Grund zum Beschönigen.
- Die Dach-Zahl trennt Struktur von Anstrengung und macht dichte Gemeinden vergleichbar.

Was bleibt: der **Erklärsatz**, dass Freifläche die Gesamtzahl dominiert. Das ist keine
Weichspülerei, sondern die Information, die die Zahl überhaupt interpretierbar macht.

Alle Referenzwerte (Kreis, Bundesland, Bund) kommen aus derselben Tabelle — kein externer
Abgleich nötig, kein Drift.

### Segmente

Die Trennung **Freifläche vs. Dach** und innerhalb Dach **gewerblich vs. privat** wird
durchgehalten — sie entspricht dem, was die Pipeline ohnehin schon klassifiziert. Plus
Steckersolar als vierte Kategorie (siehe 6.2).

### Zeiträume

**Letztes volles Jahr und laufendes Jahr werden beide gezeigt**, klar beschriftet — sie
beantworten verschiedene Fragen:

- „2025: 112 Anlagen" — vollständig, vergleichbar, ranking-tauglich
- „2026 bisher: 63 Anlagen (Stand Juli)" — aktuelle Dynamik

Nur das laufende Jahr zu zeigen ließe jede Gemeinde im Januar wie einen Totalausfall aussehen;
nur das letzte volle Jahr würde im Dezember 11 Monate Realität unterschlagen. Beide Werte
rollover-sicher zur Laufzeit ableiten, nicht hardcoden.

---

## 4. Die Hierarchie: vier Ebenen, zwei Vorlagen

| Ebene | URL | Kinder |
|---|---|---|
| Deutschland | `/solar-atlas` | 16 Bundesländer |
| Bundesland | `/solar-atlas/bayern` | ~30 Kreise |
| Kreis | `/solar-atlas/bayern/landkreis-wuerzburg` | ~32 Gemeinden |
| Gemeinde | `/solar-atlas/bayern/landkreis-wuerzburg/hoechberg` | — (Blatt) |

**Die obersten drei Ebenen haben wir visuell schon** — die Karte auf der Startseite macht
Deutschland → Bundesland → Kreis inklusive Breadcrumb, Energieträger- und Segmentfilter. Ihr
fehlen nur Adressen, redaktioneller Inhalt drumherum und die vierte Ebene. Sie nimmt bereits
eine Startregion als Parameter entgegen (das nutzt das Karten-Embed), lässt sich also ohne
Umbau je Ebene einsetzen.

### 4.1 Übersichtsvorlage (Deutschland · Bundesland · Kreis)

Alle drei Ebenen sind dieselbe Seite mit anderem Zuschnitt — **eine Vorlage, drei Ebenen**:

1. **H1** — „Solaranlagen in Deutschland" / „… in Bayern" / „… im Landkreis Würzburg"
2. **Kacheln:** Anlagen · installierte Leistung · W pro Kopf · Neu im letzten vollen Jahr ·
   Neu in diesem Jahr
3. **Karte** der Kinder (vorhandene Komponente)
4. **Rangliste der Kinder** — der Kern der Seite
   - Spalten: Rang · Name · Anlagen · Leistung · **W/Kopf gesamt** · **W/Kopf Dach**
   - Sortierbar über jede Spalte; Default = W/Kopf gesamt
   - Jede Zeile führt eine Ebene tiefer
5. **Zubaukurve** nach Jahr
6. **Einordnung** gegen die Elternebene
7. **Quellen + Disclaimer**

„Wo stehen wir?" ist die Frage, die geteilt wird — auf jeder Ebene. Auf Bundesebene ist es
„Welches Bundesland hat am meisten Solar pro Kopf?", im Kreis fragt sie der Bürgermeister.

**Je Ebene abweichend:**

- **Deutschland** hat keine Elternebene. Statt „Einordnung" der Verweis auf den vorhandenen
  Ländervergleich (`/laendervergleich`), der Deutschland international einordnet.
- **Bundesland** verlinkt zusätzlich auf die Landes-Förderseite (Trennung Geld/Bestand, siehe 2).
- **Kreisfreie Städte** stehen auf Kreisebene, haben aber keine Kinder → sie rendern die
  Blatt-Vorlage aus 4.2.

### 4.2 Karte: klicken heißt navigieren

Auf den Atlas-Seiten ist die **URL die Wahrheit** — sonst läuft die Rangliste neben der Karte
aus dem Tritt, wenn jemand herumklickt. Die Karte bekommt dafür einen optionalen Parameter:
Ist er gesetzt, navigieren Klicks; ohne ihn bleibt das heutige Verhalten (Drilldown im Zustand).

Damit bleibt die **Startseite unverändert** — dort ist die Karte ein Vertrauenselement und darf
in Ruhe erkundbar bleiben. Sie bekommt nur einen Ausgang: „Alle Zahlen im Solar-Atlas →",
der auf die gerade gewählte Region zeigt.

---

## 5. Blatt-Vorlage: Gemeinde-Detail

`/solar-atlas/bayern/wuerzburg/hoechberg`

**Aufbau von oben nach unten:**

1. **Breadcrumb:** Solar-Atlas › Bayern › Landkreis Würzburg › Höchberg
2. **H1:** Solaranlagen in Höchberg
3. **Hero:** große Zahl = W pro Einwohner, daneben der Rang im Landkreis.
   **Umschalter „gesamt / nur Dach"** — die Zahl und der Rang wechseln mit
   („965 W · Platz 24 von 32" ↔ „728 W · Platz 18 von 32")
4. **Kacheln:** Anlagen · Leistung · Batteriespeicher · Neu im letzten vollen Jahr ·
   Neu in diesem Jahr
5. **Aufteilung** (Balken): Steckersolar · Dach privat · Dach gewerblich · Freifläche
6. **Zubaukurve** nach Jahr — die vorhandene Komponente von den Förderseiten; laufendes Jahr
   sichtbar als solches markiert (angeschnittener Balken o. Ä.), damit es nicht als Einbruch liest
7. **Einordnung** (Balkenvergleich): Gemeinde · Kreis · Bundesland · Bund, folgt dem Umschalter
   aus dem Hero, plus Erklärsatz zur Freiflächen-Verzerrung
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

### 6.4 Slug-Regeln

**Gemeinden:** „Neustadt" gibt es rund zwanzigmal. Die Schachtelung unter dem Kreis löst das
ohne Sonderlogik.

**Kreise:** Ein pauschales `landkreis-xx` wäre in rund einem Viertel der Fälle falsch:

- **Nordrhein-Westfalen und Schleswig-Holstein** nennen ihre Kreise amtlich nur „Kreis"
  (Kreis Höxter, Kreis Pinneberg)
- Drei Sonderfälle: **Region Hannover**, **Städteregion Aachen**, **Regionalverband Saarbrücken**
  — die einzigen drei, die auch in unseren aktuellen Daten einen Namenszusatz tragen
- **Baden-Württemberg** nennt seine kreisfreien Städte „Stadtkreis"

**Problem:** Die Bundesnetzagentur liefert nackte Namen ohne Bezeichnung. In unserer Tabelle
stehen 09679 (Landkreis) und 09663 (kreisfreie Stadt) beide als „Würzburg" — ununterscheidbar.

**Lösung:** Die amtliche Bezeichnung aus dem Destatis-Gemeindeverzeichnis ableiten (dort als
Kennzeichen geführt), das wir für die Einwohnerzahlen ohnehin brauchen. Kein Regelwerk zu pflegen:

| Amtlich | Slug |
|---|---|
| Landkreis Würzburg | `landkreis-wuerzburg` |
| Kreis Höxter | `kreis-hoexter` |
| Region Hannover | `region-hannover` |
| Würzburg (kreisfreie Stadt) | `wuerzburg` — ohne Präfix, ist keiner |

Das Präfix ist damit gleichzeitig die Auflösung der Zweideutigkeit und amtlich korrekt.

**Kreisfreie Städte** sind Kreis- und Gemeindeebene in einem. Sie bekommen eine Seite auf
Kreisebene (`/solar-atlas/bayern/wuerzburg`), die als Gemeinde-Detailseite rendert — es gibt
keine Rangliste, weil es keine Untergemeinden gibt.

**Stadtstaaten** (Berlin, Hamburg, Bremen) brauchen eine Sonderregel, sonst entsteht
`/solar-atlas/berlin/berlin/berlin`. Die Förderseiten lösen das bereits (Slug = Bundesland);
dort abschauen. Bremen hat zwei Gemeinden (Bremen + Bremerhaven) und ist der unangenehme Fall.

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
| **Index-Flut** | Der ernsteste — siehe 8.1 | Ausrollen in Wellen, Search Console als Bremse |
| **Personenbezug in kleinen Gemeinden** | Bei wenigen Anlagen im Ort sind Einzelanlagen re-identifizierbar | Nur Aggregate, keine Einzelanlagen, keine Adressen, keine Betreiber |
| **Kannibalisierung der Förderseiten** | 117 Städte hätten zwei Seiten mit fast gleicher Überschrift | Entschieden: Förderseiten verlieren ihre Zahlen-Sektion und verlinken auf den Atlas |

### 8.1 Die Index-Flut — und warum eine Schwelle sie nicht löst

**Der naheliegende Reflex (Mindestschwelle, z. B. ab 50 Anlagen) greift nicht.** Deutschland hat
grob 4 Mio. Solaranlagen auf 10.750 Gemeinden. Selbst ein 2.000-Einwohner-Dorf hat bei
durchschnittlicher Dichte rund 100 Anlagen — genug für Zubaukurve, Segmente und einen Rang.
Eine 50er-Schwelle siebt vielleicht 10–15 % aus. **Aus 10.750 werden 9.000. Das Problem bleibt.**

**Das eigentliche Risiko ist nicht Dünne, sondern das Wachstum.** Wir haben heute rund
**150 indexierte Seiten**. Ein Sprung auf 10.000 ist das **Sechzigfache** — und genau dieser
Sprung ist das Muster, das Google als manipulativ liest, völlig unabhängig davon, wie gut die
einzelne Seite ist. Ein etabliertes Portal mit 50.000 Seiten könnte 10.000 nachlegen, ohne dass
es auffällt. Wir können das nicht.

**Deshalb: nicht vorab entscheiden, sondern in Wellen ausrollen und Google antworten lassen.**

Die Search Console liefert das Signal direkt: Der Status **„Gecrawlt – zurzeit nicht indexiert"**
ist Googles wörtliche Aussage, dass eine Seite den Aufwand nicht wert war. Das ist ein
beobachtbarer Wert, kein Bauchgefühl — und damit unsere Ampel.

| Welle | Umfang | Index | Zweck |
|---|---|---|---|
| **0 — Pilot** | Lkr. Würzburg: 1 Kreisseite + ~32 Gemeinden | **noindex** | Feedback von Höchberg, Seite schärfen |
| **1 — Kopf** | Deutschland + 16 Bundesländer = **17 Seiten** | index + Sitemap | Kein Flutrisiko, und zugleich die stärksten Seiten des Atlas („Welches Bundesland hat am meisten Solar pro Kopf?"). Kann direkt nach dem Piloten raus |
| **2 — Kreise** | ~400 Kreisseiten | index + Sitemap | Jede trägt eine einzigartige Rangliste — unstrittig gehaltvoll. Verdreifacht den Index; spürbar, aber vertretbar |
| **3+ — Gemeinden** | Wellen à ~500–1.000, größte zuerst | index + Sitemap | Nach jeder Welle 4–6 Wochen Search Console beobachten |

Der Kopf der Hierarchie (Welle 1) ist der eigentliche Glücksfall: 17 Seiten mit hoher
Suchnachfrage, null Flutrisiko, und sie entstehen ohnehin als Nebenprodukt der Vorlage aus 4.1.

**Die Ampel für Welle 3+:**

- Indexierungsquote der letzten Welle **hoch** → nächste Welle
- Viele Seiten hängen in **„Gecrawlt – zurzeit nicht indexiert"** → **Stopp.** Google sagt uns,
  dass die Seite zu dünn ist. Erst Inhalt nachschärfen, dann weiter

**Ausnahme Outreach:** Eine Gemeinde, die wir aktiv anschreiben, kommt in die laufende Welle und
wird indexiert. Ein Backlink auf eine noindex-Seite verpufft — das wäre der teuerste Fehler,
den wir hier machen können.

**Nebeneffekt:** Wenn Welle 1 gut läuft und Welle 2 stockt, haben wir immer noch 400 starke
Seiten und nichts verloren. Der Kernwert (Kommunen-Outreach) hängt ohnehin nicht am Ranking,
sondern daran, dass die Seite existiert und die Kommune sie herzeigt.

**Legal-Checkliste** (siehe CLAUDE.md): Punkt 1 (neue Datenquelle → Registry + `/datenstand`),
Punkt 4 (Seiten mit Zahlen → Stand-Datum + Unverbindlichkeit), Punkt 5 (falls Widget),
Punkt 7 (Personenbezug — hier durch Aggregation gelöst).

---

## 9. Pilot: Landkreis Würzburg

**Warum Pilot:** Der Kommunen-Kontakt ist da. Wir schärfen die Seite an echtem Feedback, bevor
tausende Seiten im Index stehen.

**Reihenfolge:**

1. Pipeline: Gemeindeschlüssel behalten + Steckersolar-Segment → einmaliger Lauf
2. Einwohnerzahlen + amtliche Bezeichnungen aus dem Destatis-Gemeindeverzeichnis einlesen,
   Quelle registrieren
3. Leseweg umbauen (vorberechnete Ebenen für die Karte)
4. Übersichtsvorlage (4.1) — deckt Deutschland, Bundesland und Kreis in einem ab
5. Blatt-Vorlage: Gemeinde-Detailseite (Höchberg als Referenz)
6. Karte auf Navigations-Modus erweitern + Ausgang von der Startseite
7. Abnahme im Browser → Höchberg die Seite zeigen
8. Erst danach: Welle 1 (Kopf), Förderseiten-Umbau, weitere Wellen

**Nicht im Pilot:** Widget, Förderseiten-Umbau, Sitemap-Eintrag, Index (Welle 0 ist noindex).

Weil Schritt 4 alle drei Übersichtsebenen abdeckt, fällt der Kopf der Hierarchie
(Deutschland + Bundesländer) im Piloten praktisch nebenbei ab — er muss danach nur noch in den
Index gelassen werden.

---

## 10. Offene Punkte

- **Meldeverzug:** Anlagen dürfen bis zu einen Monat nach Inbetriebnahme gemeldet werden — die
  jüngsten Wochen sind immer untererfasst. Auf der Seite erwähnen, oder das laufende Jahr
  bewusst unscharf halten?
- **Stadtstaaten:** Berlin/Hamburg unkritisch (Slug = Bundesland, wie bei den Förderseiten).
  Bremen hat zwei Gemeinden und braucht eine echte Entscheidung.
- **Kreisfreie Städte im Vergleich:** Sie stehen in keiner Kreis-Rangliste (sie *sind* der
  Kreis). Wogegen vergleichen wir sie — Bundesland, oder eine bundesweite Liga vergleichbarer
  Städte?
