# Wächter: Zuschlagswerte der Freiflächen-Ausschreibungen

**Rhythmus:** dreimal jährlich, 25. Januar / 25. April / 25. August — je gut sechs
Wochen nach einem Gebotstermin.
**Gilt für:** `lib/freiflaeche-config.ts`
**Vorrang:** `scripts/waechter-gate.md` — dieses Runbook sagt nur, *was* geprüft wird.

## Wofür diese Zahlen stehen

Der Solar-Atlas beziffert, was der Anlagenbestand einer Region je Jahr an Strom
wert ist (`lib/atlas-impact.ts`). Für einen Freiflächen-Park ist die richtige
Größe **nicht** der Börsenpreis, sondern sein **anzulegender Wert**: Er verkauft
an der Börse und bekommt die Marktprämie obendrauf, die auf den anzulegenden Wert
auffüllt. Für die ausgeschriebenen Anlagen — und die tragen den Löwenanteil der
Leistung — ist dieser Wert der **Zuschlagswert seiner Ausschreibungsrunde**.

Die Datei pflegt daraus zwei getrennte Dinge, und sie zu verwechseln war der
Fehler, den die Reihe bis 08/2026 hatte:

| Was | Konstante | Beschreibt |
|---|---|---|
| Gleitendes Fenster der **vier jüngsten Runden** | `FREIFLAECHE_AUSSCHREIBUNGEN` → `FREIFLAECHE_AW_CT` | was **heute** zugeschlagen wird — also der Erlös eines Parks, der in bis zu zwei Jahren ans Netz geht |
| **Jahresmittel** je Ausschreibungsjahr ab 2015 | `FREIFLAECHE_AUSSCHREIBUNG_JAHRE` | woran ein Park hängt, der **damals** ans Netz ging |

Ein heute in Betrieb genommener Park hängt an den Zuschlägen der Vorjahre
(`FREIFLAECHE_VERSATZ_JAHRE`, § 37e EEG), nicht am heutigen Niveau.

## Die Leitquelle

Bundesnetzagentur, **„Solaranlagen des ersten Segments — Beendete Ausschreibungen
/ Statistiken"**:

```
https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/BeendeteAusschreibungen/start.html
```

(Pfad in der Seitennavigation: Fachthemen → Elektrizität und Gas →
Ausschreibungen → Solaranlagen1 → Beendete Ausschreibungen.)

**Die Tabelle steht NICHT im Seitentext — sie liegt in der verlinkten Amtsdatei**
(gemessen am 25.08.2026: die HTML-Seite sind 18 kB Navigation, die Datei 3,5 MB):

```
https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/_DL/Statistiken/statistik_solar1.xlsx?__blob=publicationFile
```

Blatt **„Übersicht"** trägt alle Runden als Zeilen (daneben ein Blatt je
Gebotstermin). Wer stattdessen nur die HTML-Seite abruft, muss der
Zusammenfassung eines Lesewerkzeugs glauben, statt die Zahl zu sehen — und die
Datei führt die Werte **ungerundet**, was die Gegenprobe unten erst scharf macht
(2024 kommt darüber auf 4,9752, nicht auf ein aus gerundeten Runden gebasteltes
Ergebnis). Der Parameter `?__blob=publicationFile` ist Pflicht; ohne ihn kommt
eine HTML-Hülle (dieselbe Falle wie bei den Ministeriums-PDFs).

**Spaltenfalle in der Datei:** Die Kopfzeile ist zweistöckig. Es gibt **zwei**
Spalten „Gew. Mittel" — eine im Block GEBOTE, eine im Block ZUSCHLÄGE. Es gilt
die im Block **ZUSCHLÄGE**; die andere mittelt alle eingereichten Gebote und
liegt regelmäßig darüber (07/2026: 4,90 gegen 4,79). Danebengegriffen ist das
rechnerisch nicht als falsch erkennbar — genau der Fall, vor dem der Absatz oben
warnt. Ebenso zweimal vorhanden ist die **Zuschlagsmenge**: die zweite Spalte
steht nach Entwertungen und weicht in älteren Runden ab (03/2021: 619.735 gegen
553.540 kW). Für das Jahresmittel gilt die Zuschlagsmenge **bei
Zuschlagserteilung**, also die erste — das ist die Menge, hinter der die
Zuschlagswerte stehen, die gemittelt werden.

**Es gilt genau eine Spalte:** „**Durchschnittlicher, mengengewichteter
Zuschlagswert (ct/kWh)**". Nicht der niedrigste, nicht der höchste, nicht der
Höchstwert der Runde — die stehen in der Tabelle daneben und sind rechnerisch
nicht als falsch erkennbar, wenn man die falsche erwischt. Wer die Spalte nicht
wörtlich so vorfindet, hat entweder die falsche Tabelle (zweites Segment,
Innovationsausschreibung, Wind) oder die Seite ist umgebaut — dann **Vorschlag,
kein Auto-Fix**, und den Umbau im Bericht beschreiben.

Mitzunehmen sind je Runde: **Gebotstermin**, **ausgeschriebene Menge (kW)**,
**Zuschlagsmenge (kW)** und der Zuschlagswert.

**Ein gescheiterter Abruf ist kein Beleg dafür, dass es die Runde nicht gibt**
(Gate, Regel 6). Bot-Prüfung, 500er, Umbau der Seite → Prüfdatum **bleibt
stehen**, Fehlschlag in den Bericht, nächster Lauf holt es nach.

## Wann ein Ausschreibungsjahr vollständig ist

Gebotstermine für Solaranlagen des ersten Segments sind der **1. März, 1. Juli
und 1. Dezember** — § 28a Abs. 1 EEG 2023, Wortlaut: „Die Ausschreibungen für
Solaranlagen des ersten Segments finden in den Jahren 2023 bis 2029 jeweils zu
den Gebotsterminen am 1. März, 1. Juli und 1. Dezember statt."

**Ein Jahr kommt erst in `FREIFLAECHE_AUSSCHREIBUNG_JAHRE`, wenn ALLE DREI Runden
beendet und veröffentlicht sind.** Das Ergebnis des Dezember-Termins erscheint
erfahrungsgemäß im Januar; ein Ausschreibungsjahr ist deshalb frühestens im
Januar des Folgejahres vollständig. Stand 19.08.2026: **2026 ist NICHT
vollständig** — der Dezember-Termin fehlt, die Reihe endet zu Recht bei 2025.

Ein halbes Jahr einzutragen wäre keine vorläufige Zahl, sondern eine erfundene:
Das Mittel aus zwei von drei Runden ist kein Jahresmittel. Bis das Jahr komplett
ist, bekommt ein noch jüngerer Jahrgang das jüngste vollständige Jahr
(Randjahr-Regel in `freiflaecheZuschlagHerkunft`) — die letzte belegte Tatsache
statt einer Hochrechnung.

> **OFFEN (bis 06/2029):** § 28a Abs. 1 EEG 2023 regelt die Gebotstermine nur
> „in den Jahren 2023 bis 2029". Was danach gilt, steht heute nirgends. Bevor die
> letzte Runde 2029 gelaufen ist, muss die Rechtsgrundlage neu nachgesehen
> werden — sonst behauptet dieses Runbook ab 2030 einen Rhythmus, den es nicht
> mehr gibt.

## Wie das Jahresmittel gebildet wird

Mengengewichtet über die Termine des Jahres, **gewichtet mit der bezuschlagten
Menge**:

```
Jahresmittel = Σ(Zuschlagsmenge_Runde × Zuschlagswert_Runde) / Σ(Zuschlagsmenge_Runde)
```

Auf zwei Nachkommastellen kaufmännisch gerundet, so wie die vorhandenen Zeilen.

Warum die **bezuschlagte** und nicht die ausgeschriebene Menge: Sie ist die
Menge, hinter der die Zuschlagswerte wirklich stehen. In überzeichneten Runden
kommt mit beiden praktisch dasselbe heraus (2025: 4,826 mit beiden Gewichten) —
in einer **unterzeichneten** Runde nicht, und genau dort wäre die ausgeschriebene
Menge falsch: Sie gewichtet Zuschläge, die es nicht gab.

**Gegenprobe vor jedem Eintrag:** Dieselbe Rechnung auf ein bereits belegtes Jahr
anwenden und prüfen, ob sie dessen Zeile zellgleich reproduziert (2024 → 4,975 →
4,98; 2025 → 4,826 → 4,83). Kommt etwas anderes heraus, stimmt die gelesene
Spalte nicht oder die Tabelle wurde umgebaut — **dann kein Eintrag**.

Für das **gleitende Fenster** (`FREIFLAECHE_AUSSCHREIBUNGEN`) gilt abweichend die
**ausgeschriebene** Menge, so wie dort dokumentiert; das Fenster bleibt bei genau
vier Runden — die älteste fällt heraus, wenn eine neue hinzukommt.
`FREIFLAECHE_AW_CT` wird **nicht getippt**, sondern aus der Tabelle gerechnet.

## Der Lauf, Schritt für Schritt

1. **Erst den letzten eigenen Auto-Fix nachprüfen** (Gate, Selbstkontrolle):
   Trägt die Amtstabelle die Runde, die der letzte Lauf eingetragen hat, mit
   demselben Wert? Nein → Revert und Meldung, bevor irgendetwas Neues geprüft
   wird.
2. **Amtstabelle abrufen**, Spaltenüberschrift wörtlich abgleichen.
3. **Neue beendete Runden** seit dem letzten Lauf herausschreiben (Gebotstermin,
   ausgeschriebene Menge, Zuschlagsmenge, Zuschlagswert).
4. **Gegenprobe** auf ein belegtes Jahr fahren (siehe oben).
5. **Gleitendes Fenster** nachführen: neue Runde anhängen, älteste entfernen,
   im Kommentar festhalten, welche Runde herausgefallen ist.
6. **Nur im Januar-Lauf:** Ist das Vorjahr jetzt vollständig (alle drei Runden
   beendet)? Dann Jahresmittel rechnen und in
   `FREIFLAECHE_AUSSCHREIBUNG_JAHRE` anhängen — mit den Einzelrunden als
   Rechenweg im Kommentar, so wie bei 2024 und 2025.
7. **Daten setzen** (Gate, Regel 9): `FREIFLAECHE_GEPRUEFT_ISO` immer auf den
   Tag des Laufs, sobald die Quelle **erreicht** war — auch wenn nichts
   geändert wurde. `FREIFLAECHE_VALID_FROM` **nur**, wenn sich ein Wert bewegt
   hat. `FREIFLAECHE_REVIEW_BY` auf den 31. Januar des nächsten Jahres, in dem
   ein Jahresabschluss ansteht.
8. **`npx tsc --noEmit` und `npx vitest run`** — insbesondere
   `lib/__tests__/freiflaeche-config.test.ts` (Realitäts-Anker) und
   `lib/__tests__/atlas-impact.test.ts`.
9. **Bericht** nach `scripts/waechter-gate.md`, Teil 3.

## Befugnis (ergänzt die Tabelle im Wächter-Gate)

Geprüft gegen die fünf Gate-Bedingungen: Die Bundesnetzagentur **führt die
Ausschreibung selbst durch** — sie ist nicht Referent, sondern die messende
Stelle (Regel 2), und ihre Tabelle enthält alle vier Angaben, die das Modell
braucht (Bedingung 1). Das Jahresmittel ist eine ausgeschriebene Formel, kein
Ermessen (Bedingung 3), und `FREIFLAECHE_AW_CT` wird ohnehin im Code gerechnet.
Eine veröffentlichte Runde hat **genau eine richtige Antwort** — es gibt nichts
zu wägen. Deshalb Auto-Fix für die Zahlen:

| Feld | Auto-Fix? |
|---|---|
| `FREIFLAECHE_AUSSCHREIBUNGEN` (Fenster nachführen) | **ja** — eine richtige Antwort, Gegenprobe grün, Fenstergröße unverändert |
| `FREIFLAECHE_AUSSCHREIBUNG_JAHRE` (vollständiges Jahr anhängen) | **ja** — nur wenn alle drei Runden beendet sind und die Gegenprobe ein belegtes Jahr reproduziert |
| `FREIFLAECHE_GEPRUEFT_ISO` | **ja** — bei jedem Lauf, der die Quelle erreicht hat |
| `FREIFLAECHE_VALID_FROM`, `FREIFLAECHE_REVIEW_BY` | **ja**, gemeinsam mit einer Wertänderung |
| Fenstergröße (vier Runden) oder Gewichtungsregel | **nein** — Modellentscheidung, gehört dem Betreiber |
| `FREIFLAECHE_VERSATZ_JAHRE`, `FREIFLAECHE_ZUSCHLAG_AB` | **nein** — Rechtsbezug (§ 37e EEG), Legal-Judge |
| `FREIFLAECHE_HISTORIE` (2012–2014) | **nein** — abgeschlossene historische Sätze; eine Änderung wäre eine Korrektur eines Lesefehlers, kein Nachtrag |
| `FREIFLAECHE_GESETZLICHER_BASISWERT_CT` | **nein** — Gesetzesstand, gehört zu `scripts/eeg-verify.md` |
| Ein Jahr mit unvollständigen Runden | **nein** — gar nicht eintragen, siehe oben |

**Sprunggrenze (Bedingung 4):** Weicht ein neuer Zuschlagswert um mehr als 30 %
von der vorigen Runde ab, ist das eher ein Lesefehler als ein Marktereignis →
**Vorschlag**, nicht Auto-Fix. Zum Maßstab: Die Runden 2024–2026 lagen alle
zwischen 4,66 und 5,00 ct.

**Was der Wächter beobachtet, aber nie selbst entscheidet:** Ändert die
EEG-Reform 2027 die Ausschreibungssystematik für das erste Segment, ist das ein
Rechtsstand — er geht als Entscheidung an den Betreiber und läuft über
`scripts/eeg-verify.md`, nicht hier.

## Realitäts-Anker (Gate, Regel 7)

`lib/__tests__/freiflaeche-config.test.ts`. Die Anker prüfen nicht, ob eine Zahl
plausibel *aussieht*, sondern ob sie zu den anderen passt:

- Das gleitende Fenster hat genau vier Runden, aufsteigend, ohne Dublette, und
  spannt rund zwölf Monate.
- `FREIFLAECHE_AW_CT` ist **gerechnet, nicht getippt** (der Quelltext enthält
  keine Zuweisung einer Zahl) und liegt zwischen kleinstem und größtem Wert des
  Fensters.
- Fenster und Jahresreihe kommen aus derselben Tabelle: Das Fenstermittel liegt
  höchstens 25 % neben dem jüngsten vollständigen Jahresmittel. Ein
  verrutschtes Komma reißt diese Schranke sofort.
- Die Jahresreihe ist lückenlos ab 2015, und ihr jüngstes Jahr ist **nie das
  laufende** — genau die Regel „erst vollständig, dann eintragen".
- Jeder Satz liegt unter dem gesetzlichen Basiswert (7,00 ct). Läge er darüber,
  wäre die Begründung hinfällig, warum die Auslassung der Kleinanlagen zu
  unseren Ungunsten geht.

**Diese Anker werden nie aufgeweicht, damit ein Wert durchgeht.** Schlägt einer
an, ist der Wert der Verdächtige, nicht der Test.
