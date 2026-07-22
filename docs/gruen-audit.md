# Grün-Audit — Übersicht zum Nacharbeiten

Stand: 2026-07-22. Ausgangslage: Grün taucht an vielen Stellen als fester
Hex-Wert statt als Token auf. Dieses Dokument listet **jede** Grün-Stelle, damit
sie schrittweise auf Tokens gezogen werden kann. Es ändert nichts — es ist die
Landkarte für die Aufräum-Session.

## Kernbefund in einem Satz

Es kursieren **8 verschiedene grüne Hex-Werte** im Code (außerhalb der
Token-Definition). Davon sind **7 exakte Kopien** vorhandener Tokens (Drift-Risiko,
aber optisch gleich) und **1 echter Ausreißer** (`#00A03C` in der Preis-Mail), der
einen eigenen, nirgends definierten Grünton einführt.

Zwei **getrennte** semantische Rollen — nicht vermischen beim Aufräumen:

- **Positiv-Grün** = UI-Feedback (Rendite, Ersparnis, Zuwachs-Pfeile). Signalfarbe.
- **Energie-Grün** = Datenvisualisierung (Erneuerbaren-Anteil in Strommix-Charts).
  Bewusst theme-unabhängig, weil es Daten kodiert, keine Oberfläche.

---

## A) Soll-Zustand: die definierten Tokens (`lib/theme.ts`)

### A1) Positiv-Grün (UI-Feedback)

| Token | Light | Zweck |
|---|---|---|
| `--color-positive` | `#00D950` | Flächen, Balken, Chart-Linien (positiv) |
| `--color-positive-text` | `#0C6E2F` | dieselbe Semantik als **lesbarer Text** (AA 6,02:1) |
| `--color-chart-positive-bg` | `rgba(0,217,80,0.08)` | Chart-Hintergrund positive Zone |
| `--color-highlight` / `--color-awareness` | `#3DFFC1` | Live-Indikator (Mint, grenzwertig grün) |

Dark/Dusk/Overcast-Varianten existieren für alle drei Positiv-Tokens (theme.ts).

### A2) Energie-Grün (Datenvisualisierung, theme-unabhängig)

| Token | Wert | Träger |
|---|---|---|
| `--color-energy-solar` | `#4CAF50` | Solar |
| `--color-energy-wind` | `#66BB6A` | Wind onshore |
| `--color-energy-wind-offshore` | `#2E7D32` | Wind offshore |
| `--color-energy-hydro` | `#81C784` | Wasserkraft |
| `--color-energy-biomass` | `#A5D6A7` | Biomasse |
| `--color-energy-geothermal` | `#C8E6C9` | Geothermie |
| `--color-energy-cat-renewable` | `#4CAF50` | Erneuerbare-Summe (= solar) |

---

## B) Aufräum-Ziel: hardcodete Grüntöne

### B1) `#00D950` — Positiv-Grün als Literal (= Token-Wert, nur nicht referenziert)

Optisch korrekt, aber jede Stelle pflegt den Wert selbst. Beim Nacharbeiten auf
`tokens['--color-positive']` bzw. `v('--color-positive')` ziehen — außer dort, wo
bewusst theme-fest (siehe Anmerkung).

- `app/(embed)/layout.tsx:61` — Embed-CSS dupliziert den Token-Wert
- `app/(embed)/embed/ee-ampel/client.tsx:39` — Ampel „grün" (bewusst theme-fest)
- `lib/constants.ts:131` — Szenario „Realistisch" (PV-Chart-Serie)
- `lib/heatpump.ts:362` — Szenario „Realistisch" (WP-Chart-Serie)
- `app/(site)/admin/theme/client.tsx:42` — Demo-Chart-Serie
- `app/api/og/route.tsx:142, 162, 316, 322` — OG-Bild (Zubau-Punkt, Rendite, Ersparnis)
- `lib/theme-v1.ts:36, 39` — Legacy-Token-Set, veraltet → kann entfallen

**Anmerkung theme-fest:** Chart-Serien-Literale (`constants.ts`, `heatpump.ts`,
`admin/theme`, `og/route`) und die EE-Ampel nutzen `#00D950` absichtlich als
Fixwert (Chart-Farben folgen nicht dem Theme). Trotzdem sinnvoll, den Wert an
EINER Stelle zu halten (`tokens['--color-positive']`), statt ihn zu streuen.

### B2) `#00A03C` — der einzige echte Ausreißer

Ein dritter Positiv-Grünton, nirgends definiert, weicht sowohl von `#00D950`
(Fläche) als auch `#0C6E2F` (Text) ab.

- `app/api/prices/report/route.ts:46` — Health-Farbe (Pipeline OK)
- `app/api/prices/report/route.ts:108` — „günstiger = grün" (Delta-Vorzeichen)

Kontext: HTML-E-Mail kann keine CSS-Variablen. → Auf einen definierten Wert
vereinheitlichen (z. B. `#0C6E2F` als lesbares Text-Grün, oder ein neues
E-Mail-taugliches Positiv-Token). **Erste Priorität**, weil es der einzige
„fremde" Ton ist.

### B3) Energie-Palette als Embed-Duplikat

`app/(embed)/layout.tsx:86–91, 100` deklariert die komplette Energie-Palette per
Hand — Werte **exakt** identisch mit `lib/theme.ts`. Reine Duplikation
(Drift-Gefahr), keine abweichenden Töne. Aus `tokens` generieren statt doppelt
pflegen.

---

## C) Bereits sauber (kein Aufräumbedarf, nur zur Orientierung)

- **Positiv-Grün via Token:** `EnergyFlowModal`, `SimulationPanel`,
  `DayProfileChart`, `FundingProgramParts`, `GemeindePotential`, `ContactForm`,
  `ZubauTimelineChart` — alle über `v('--color-positive')`.
- **Energie-Grün via Token:** `lib/chart-utils.ts` (`CATEGORY_COLORS`/`ENERGY_COLORS`
  lesen die Tokens) ist die zentrale Quelle für alle Strommix-Charts. Sauber.

---

## Empfohlene Reihenfolge fürs Nacharbeiten

1. **`#00A03C` in der Preis-Mail** vereinheitlichen (einziger fremder Ton) — B2.
2. **Embed-Layout** (`app/(embed)/layout.tsx`) aus `tokens` generieren statt die
   7 Werte doppelt zu pflegen — B1 (Zeile 61) + B3 (Energie-Palette).
3. **Legacy `lib/theme-v1.ts`** prüfen und entfernen, falls ungenutzt.
4. **Chart-Serien-Literale** optional auf `tokens['--color-positive']` ziehen —
   bleiben theme-fest, aber der Wert lebt dann an einer Stelle.
