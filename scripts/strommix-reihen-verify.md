# Langzeit-Datenreihen Strommix — Datenpflege (Runbook)

Betrifft die drei Jahresreihen in `lib/strommix-history.ts`, die `/langzeit-strommix`
und die Zubau-Datenstory speisen. Sie sind **Stichtags-Datenstände**, kein Live-Abruf —
ohne Pflege veralten sie still.

| Reihe | Konstanten | Quelle | Erscheint | Gepflegt von |
|---|---|---|---|---|
| **CO₂-Intensität + absolute Emissionen** | `CO2_INTENSITY_VALUES`, `CO2_ABSOLUTE_VALUES`, `CO2_INTENSITY_META` | UBA, Reihe „CLIMATE CHANGE", Titel „Entwicklung der spezifischen Treibhausgas-Emissionen des deutschen Strommix" | jährlich, **März** | `co2-prognose-monitor` (Teil A) |
| **Bruttostromerzeugung nach Energieträgern** | `STROMMIX_HISTORY_*` | UBA „Erneuerbare und konventionelle Stromerzeugung", Datenbasis AGEB/AGEE-Stat | jährlich, **Frühjahr** | `co2-prognose-monitor` (Teil B) |
| **Strompreise Haushalt/Industrie** | `PRICE_*` | Eurostat `nrg_pc_204` / `nrg_pc_205` | jährlich | `eeg-verguetung-verify-halbjaehrlich`, Juli-Lauf → `scripts/zubau-story-verify.md` Teil B |

---

## Warum dieses Runbook existiert

Am **27.07.2026** stellte sich heraus, dass die CO₂-Reihe auf der Ausgabe
**13/2025** stand, während seit **März 2026** die Ausgabe **16/2026** vorlag. Über
der Reihe stand seit jeher der Kommentar „einmal jährlich aktualisieren" — **ein
Kommentar ist kein Wecker**. Aufgefallen ist es nur, weil die Fundstelle nach der
neuen Quellen-Konvention ohnehin nachgeprüft wurde.

Sichtbare Folge: Auf `/langzeit-strommix` lief die Erzeugungskurve bis 2025, die
CO₂-Kurve nur bis 2024 — zwei unterschiedlich lange Linien auf derselben Zeitachse.

---

## Die Falle: es ist NICHT „ein Jahr anhängen"

**Das UBA revidiert bei jeder Ausgabe auch zurückliegende Jahre.** Beim Wechsel
13/2025 → 16/2026 änderten sich **14 der 35 Altwerte**:

- frühe 1990er um 1–2 g/kWh (Inventar-Neuberechnung)
- **2023: 386 → 379**, **2024: 363 → 353** — hier wurden Schätzungen durch
  belastbare Daten ersetzt, das sind keine Rundungsdifferenzen

Wer nur das neue Jahr anhängt, lässt den Rest der Kurve still falsch stehen.
**Immer die vollständige Spalte übernehmen, nie einzelne Werte nachtragen.**

---

## Teil A — CO₂-Reihe (jährlich, ab März prüfen)

1. **Neue Ausgabe suchen.** Websuche nach dem Reihentitel + Jahr. Die Übersichtsseite
   des UBA verlinkt die jeweils aktuelle Ausgabe; die Reihennummer (`CLIMATE CHANGE
   xx/JJJJ`) steht auf der Publikationsseite. Vergleiche sie mit
   `CO2_INTENSITY_META.source`. Gleich → fertig, nichts zu tun.
2. **Volltext beschaffen**, nicht die Pressemitteilung. Das PDF nach
   `docs/quellen/` (Konvention aus `scripts/waechter-gate.md`, Regel 6). Namensschema
   wie beim vorhandenen: `UBA_CC-<nr>-<jahr>_Strommix-Emissionen_<von>-<bis>.pdf`.
3. **Tabelle 2 lesen** („Gerundete Ausgangsgrößen und Berechnungsergebnis"). Sie
   liegt etwa auf Dokumentseite 14–16 und geht über einen Seitenumbruch — die letzten
   Jahre stehen im zweiten Teil. Textextraktion mit Layout-Erhalt, sonst verrutschen
   die Spalten:
   ```sh
   pdftotext -layout docs/quellen/<datei>.pdf /tmp/uba.txt
   grep -n "Tabelle 2" /tmp/uba.txt
   ```
4. **Die richtigen zwei Spalten nehmen — hier ist der teuerste Fehler möglich.**
   Die Tabelle hat **acht** Spalten, mehrere davon plausible Zahlen in ähnlicher
   Größenordnung:
   - `CO2_INTENSITY_VALUES` ← Spalte **„CO₂-Emissionsfaktor Strommix [g/kWh]"**
     (die **dritte**). **Nicht** „CO₂-Emissionsfaktor Strominlandsverbrauch"
     (berücksichtigt den Handelssaldo) und **nicht** „THG-Emissionsfaktor ohne/mit
     Vorketten" (andere Gase bzw. Vorkette).
   - `CO2_ABSOLUTE_VALUES` ← Spalte **„Kohlendioxidemissionen der Stromerzeugung
     [Mio. t]"** (die **erste**). **Nicht** die letzte Spalte „THG-Emissionen der
     Stromerzeugung [Mio. t CO₂-Äquivalente]".
   Gegenprobe: 1990 liegt beim Emissionsfaktor Strommix bei **765**, beim
   Inlandsverbrauch bei 764, ohne Vorketten bei 771. Wer 764 oder 771 herausbekommt,
   ist in der falschen Spalte.
5. **Beide Reihen vollständig ersetzen**, `CO2_INTENSITY_YEARS` verlängern,
   `CO2_INTENSITY_META.source` und `dataAsOf` auf die neue Ausgabe setzen.
6. **Reifegrad der letzten Jahre** aus den Fußnoten übernehmen (typisch: vorletztes
   Jahr „vorläufig", letztes „geschätzt") und im Kommentar über der Reihe
   dranschreiben. Das ist eine Aussage, keine Kosmetik.
7. **Ankerwerte im Test nachziehen** (`lib/__tests__/strommix-history.test.ts`) und
   `npx vitest run` laufen lassen. Der Test prüft Länge, Gleichlauf mit der
   Erzeugungsreihe und eine Größenordnungs-Schranke gegen erwischte Nachbarspalten.

## Teil B — Erzeugungsreihe (jährlich, Frühjahr)

Gleiche Logik, andere Quelle: UBA „Erneuerbare und konventionelle Stromerzeugung"
(Datenbasis AGEB/AGEE-Stat). Neues Jahr anhängen, `dataAsOf` setzen. Granularität
beachten: 1990, 1995, 2000, danach lückenlos jährlich — die Einzeljahre 1991–1994
und 1996–1999 gibt es in der Quelle nicht und werden bewusst **nicht** interpoliert.
Gegenprobe gegen die AGEB-Tabelle „Bruttostromerzeugung in Deutschland nach
Energieträgern" (STRERZ).

---

## Teil C — Selbstheilung: Council als Prüfinstanz

Der Wächter **darf die Reihen selbst ersetzen**, aber nur über die Prüfinstanz —
dasselbe Verfahren wie bei EEG-Sätzen und Förderprogrammen
(`scripts/council-verify.md`). Die Besonderheit hier ist **worauf** der Council
angesetzt wird.

### Warum der Council hier die Spaltenüberschrift prüft, nicht die Plausibilität

Die übliche Frage „ist die Zahl plausibel?" trägt hier **nicht**. Die Tabelle hat
acht Spalten, und die Nachbarn der richtigen liefern Zahlen, die genauso plausibel
aussehen. Gemessen an den 1990er-Werten, über den impliziten Stromverbrauch geprüft:

| Genommene Spalte | impliziter Verbrauch | maschinell erkennbar? |
|---|---|---|
| **Emissionsfaktor Strommix** (richtig) | 479,7 TWh | — |
| Emissionsfaktor Strominlandsverbrauch | 480,4 TWh | **nein** |
| THG-Emissionsfaktor ohne Vorketten | 476,0 TWh | **nein** |
| THG-Emissionsfaktor mit Vorketten | 425,8 TWh | ja |

Der Realitäts-Anker im Test (`lib/__tests__/strommix-history.test.ts`) fängt also
nur den groben Fehlgriff. **Die beiden gefährlichen Nachbarspalten sind rein
rechnerisch nicht von der richtigen zu unterscheiden.** Deshalb ist die Aufgabe des
Councils hier nicht „prüfe die Zahlen", sondern **„lies die Überschrift"**.

### Ablauf

1. **Vorprüfung maschinell** — ohne diese vier gibt es keinen Council-Lauf:
   - Volltext liegt in `docs/quellen/` (nicht nur ein Link).
   - `CO2_INTENSITY_VALUES` und `CO2_ABSOLUTE_VALUES` haben dieselbe Länge wie
     `CO2_INTENSITY_YEARS`, Jahre lückenlos.
   - Impliziter Stromverbrauch aller Jahre zwischen 400 und 650 TWh.
   - Kein Einzeljahr springt gegenüber der Vorausgabe um mehr als **10 %**
     (Gate-Grenze sind 30 %, hier enger: Revisionen liegen erfahrungsgemäß bei
     1–3 %, ein 2023er-Sprung von 386 → 379 sind knapp 2 %. Alles über 10 % ist
     eher Spaltenfehler als Revision).
2. **Council, drei unabhängige Prüfer, einer adversarial.** Jeder öffnet das PDF
   selbst. Jeder meldet — unabhängig, ohne die Antwort der anderen zu sehen:
   - die **wörtliche Spaltenüberschrift**, aus der er die Intensitätsreihe gelesen hat,
   - dieselbe Angabe für die Absolutreihe,
   - den Wert des **ersten und des letzten Jahres** je Reihe,
   - die Seitenzahl der Tabelle.
3. **Konsens heißt: die Überschriften stimmen wörtlich überein.** Nicht „alle drei
   halten die Zahlen für plausibel". Weicht ein Prüfer bei der Überschrift ab →
   kein Auto-Fix, Meldung an den Menschen mit allen drei Antworten im Klartext.
4. **Der adversariale Prüfer hat einen konkreten Auftrag**, keinen allgemeinen:
   *„Zeige, dass hier die Spalte Strominlandsverbrauch oder eine THG-Spalte
   erwischt wurde."* Er bekommt die Tabelle oben mit. Findet er einen Beleg →
   Abbruch.
5. **Reifegrad mitziehen** (welches Jahr „vorläufig", welches „geschätzt") — das
   ist eine Aussage und wandert mit den Zahlen, nicht getrennt.
6. `npx tsc --noEmit` + `npx vitest run` grün, Commit mit `[auto]` im Betreff,
   Fundstelle mit Seitenzahl im Text, Ausgabennummer in `CO2_INTENSITY_META`.

### Was der Wächter NICHT selbst darf

- **Die Ankertests aufweichen**, damit neue Werte durchgehen (Gate Regel 7). Wenn
  der implizite Verbrauch aus dem Korridor läuft, ist die Extraktion falsch, nicht
  der Test.
- **Eine neue Spalte wählen**, weil die alte in der neuen Ausgabe fehlt oder
  umbenannt wurde. Eine geänderte Tabellenstruktur ist ein Fall für den Menschen —
  dann stimmt womöglich auch die Definition der Reihe nicht mehr.
- **Teil B (Erzeugungsreihe) automatisch pflegen.** Dort gibt es keine vergleichbare
  Identität als Anker, die Reihe hat Lücken in den 1990ern und mehrere
  Energieträger-Spalten nebeneinander. Bleibt Vorschlag.

### Meldung bei Abbruch

Neue Reihennummer, Erscheinungsmonat, Anzahl abweichender Altwerte, die zwei bis
drei größten Abweichungen im Klartext — und **welche der Bedingungen oben gerissen
ist**, damit der Mensch nicht bei null anfängt.
