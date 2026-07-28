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

## Befugnis: Vorschlag, keine Selbstheilung — BLOCKER

Der Wächter **meldet** eine neue Ausgabe und trägt **nichts** selbst ein.

Grund: Die Werte stammen aus einer achtspaltigen PDF-Tabelle über einen
Seitenumbruch. Ein Automat, der sich in der Spalte vertut, produziert genau den
Fehlertyp, der auf dieser Seite am teuersten ist — eine plausibel aussehende,
falsche Zahl, die niemandem auffällt. Es gibt hier auch keine „sichere Richtung"
wie beim Abschalten eines Förderprogramms: jede Spalte liefert Zahlen, die richtig
wirken.

Meldung enthält: neue Reihennummer, Erscheinungsmonat, Anzahl abweichender
Altwerte, die zwei bis drei größten Abweichungen im Klartext.
