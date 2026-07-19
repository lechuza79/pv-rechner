# Audit-Backlog (Stand 2026-07-19)

Ergebnisse aus vier read-only Audits (Fable-Session 2026-07-19). Alle Funde am Code
verifiziert. Reihenfolge = Priorität. Nichts hiervon ist umgesetzt — reiner Backlog.

Zugehöriger Bau-Stapel derselben Session (committete Worktree-Branches, warten auf
Abnahme/Merge): EE-Ampel-Widget, Speicher-Ratgeber (+2 Beispiele), SEO-Quick-Wins,
Rechen-Fixes (WP-Kachel/Autarkie/Strompreis), Karten-Lazy-Load, Modal-Fix (Escape/Scroll).

---

## 1. Content-Strategie (Stratege + adversarialer Skeptiker, konvergent)

**Kernentscheidung: „PV kaufen vs. Enpal mieten" als Namensartikel wird NICHT gebaut.**
Beide Gutachten unabhängig einig:
- Frage ist autoritativ beantwortet (Verbraucherzentrale/Finanztip: Kauf gewinnt klar) →
  junge Domain überholt das SERP per Text nicht; KI-Overviews zitieren die etablierten Quellen.
- Wettbewerber namentlich in Preisvergleich = § 6 UWG: nur mit aktuellen, nachprüfbaren
  Zahlen haltbar; Enpal-Mietpreise nicht öffentlich standardisiert → Dauerpflege + Abmahnrisiko
  (Enpal prozessiert nachweislich). Widerspricht Legal-Checkliste Punkt 8.
- Beschädigt den „neutral/ehrlich"-USP, der das Outreach-Narrativ trägt.

**Empfohlene Content-Roadmap (priorisiert):**
1. **EEG-2027-Ratgeber „Lohnt sich PV ohne Einspeisevergütung?"** — neue Top-Priorität.
   Größtes offenes Suchfenster des Jahres (Reform-Entwurf), und als Einziger im Markt kann
   unser Rechner Einspeisung=0 durchrechnen. Perfekt KI-zitierbar mit eigenen Beispielrechnungen.
   Zweite Datenstory fürs Outreach. Aufwand niedrig-mittel (Rechenmaschine steht).
2. **Speicher-Ratgeber** fertigstellen (liegt im Bau-Stapel).
3. **„PV kaufen oder mieten?" generisch + Mini-Tool** — statt Namensartikel: „Mietangebot
   nachrechnen" als Rechner-Feature (Nutzer trägt Monatsrate + Laufzeit ein → Vergleich mit
   Kauf-TCO). Rechtlich sauber (eigene Zahlen, kein Name), einzigartig im Markt, ideales
   Foren-/Reddit-Link-Asset. Die 25-J-TCO-Maschinerie existiert bereits.
4. **„Speicher nachrüsten: lohnt sich das 2026?"** — günstiger Ableger von Nr. 2.
5. (Später) Dynamischer Stromtarif — erst wenn ein Feature dahintersteht, nicht als reiner Text.

**Reihenfolge-Hinweis Skeptiker:** Zuerst Outreach-Welle 1 versenden (fertig vorbereitet,
noch nicht raus) — validiert die ganze Strategie, bevor neuer Content gebaut wird.

---

## 2. Widget-Konsistenz (8 Embed-Widgets gegen Konvention)

**Keine Blocker** — legal-kritische Punkte (Impressum-Menüpunkt, DataSourceNote
branding-unabhängig, kein Browser-Storage, noindex) überall erfüllt.

**Nacharbeit — ERST nach dem EE-Ampel-Merge (sonst Galerie-Konflikt):**
1. **`share=0`-Flag flächendeckend durchreichen:** `erzeugung`, `karte`, `kennzahl`,
   `gemeinde-solar` lesen in `onSettings` nur embed/branding; `SimulationPanel` kennt keinen
   share-Prop. Flag in State nehmen + ChartActionBar damit gaten. Muster: strommix-anteil-Footer.
2. **Strommix-Share zustandsbehaftet:** Share-URL aus aktivem Tab bauen
   (`/strommix-deutschland?range=…`) statt Konstante (`strommix/client.tsx:25`).
3. **Zubau: feste Länderfarben** im DE↔CN-Vergleich (feste Hex statt `--color-accent`-Token —
   Verstoß gegen „semantische Farben fest").
4. **Zubau + Erzeugung fixierbar** machen (URL-Param `?view=`/`?traeger=` nach kennzahl-Muster) →
   löst zugleich die „Multi-Widget"-Aufteilung; in Galerie als params-Varianten anbieten.
5. **Karten-Quellenvermerk** auf geteilten `DataSourceNote`-Baustein umstellen (BKG ggf. als
   Eintrag in `lib/data-sources.ts`).
6. **Simulation-Fehlerfall:** Impressum-/Quellenzeile auch ohne geladene Wetterdaten rendern.

---

## 3. Test-Coverage (Rechenmodule)

Kein Coverage-Setup installiert (`@vitest/coverage-v8` fehlt). Bewertung per Code-Lesart.
**Hinweis:** WP-Deckungs-Tests liegen bereits im Rechen-Fix-Branch — den zuerst mergen,
bevor Tests nachgeschrieben werden (Doppelarbeit vermeiden). Strompreis-Fix bleibt danach die
einzige heutige Änderung ohne Test (absicherbar über Playwright-Smoke gegen den Startwert).

**Top 5 zuerst zu schreiben:**
1. **HOCH** `selectByMarginalReturn`/`marginalPaybackYears` (calc.ts) — komplett ohne Test,
   entscheidet über JEDE Speicher-Empfehlung. Gate-Semantik: gleich teuer / teurer+lohnend /
   teurer+unlohnend / Infinity / NaN-Filter. (S)
2. **HOCH** `calc()` mit `batteryReplace > 0` — Akku-Tausch Jahr 13 + Break-even = erstes
   *dauerhaftes* ≥0 (Kurve kreuzt vor 13, fällt zurück, kreuzt erneut). (S)
3. **MITTEL-HOCH** Drift-Invariante `economicsForScenario` ≡ `recommend()` (npv25, paybackYears,
   investition identisch) — sonst zeigt Zwischenseiten-Umschalter andere Zahlen als Empfehlung. (S)
4. **MITTEL** pv-sim Ertrags-Normierung (`monthlyScaledTo`): Monatsprofil × editiertes ertragKwp →
   jahresertrag ≈ kwp × ertragKwp, Autarkie steigt mit ertragKwp. (S)
5. **MITTEL** Geteilte-Basis-Invariante Einspeise-Mischsatz: `effectiveFeedInCtPerKwh` ≈
   `calcWeightedFeedIn` (±Rundung) — oder Duplikat auflösen. (S)

Weitere: WP-Konsistenz PV-Rechner vs. WP-Rechner (M), WP-Saisonkorrektur im EV-Power-Law (S),
Heatpump PV-Synergie-Zweig (S), simulation.ts Overlay-Pfad (S–M), Config-Plausibilitäts-Guards (S),
balkon-sim Energieerhaltung (S).

---

## 4. Barrierefreiheit (WCAG 2.1 AA / BFSG — seit Juni 2025 in Kraft)

**Top 5 nach Wirkung/Aufwand:**
1. **Grau-Tokens abdunkeln** (`lib/theme.ts`): muted #949494 (3,0:1) → ~#6E6E6E,
   secondary #777 (4,48:1) → ~#6B6B6B, faint #BEBEBE (1,86:1) entschärfen. **Eine Datei,
   ~350 Kontrastverstöße behoben.** ⚠️ Design-Entscheidung des UX-Architekten (ändert Look site-weit). (S)
2. **Text-Grün/-Rot-Tokens:** `--color-positive-text` ~#0B7A3B (statt #00D950 = **1,9:1**, die
   wichtigsten Ergebniszahlen!), `--color-negative-text` ~#D32F2F (statt #EF4444 = 3,76:1). (M)
3. **`aria-pressed`** in OptionCard + TriToggle + QuickSettings — Auswahlzustand ist für
   Screenreader in jedem Flow-Step unsichtbar. Drei Komponenten, alle fünf Rechner. (S)
4. **Modal-Basics als geteilter Hook** (Escape, initialer Fokus, Fokus-Restore, Trap) für
   EnergyFlowModal / KlimaDetailModal / ResultFunding. (Teilweise im Modal-Fix-Branch erledigt.) (M)
5. **Reduced-Motion-Guards** vervollständigen (`.fu` fadeUp + Endlos-Pulse ungeschützt) +
   `role="img"`/aria-label am Amortisations-Chart. (S)

**Weiterer Blocker mit Produktentscheidung:** MastrMap nur per Maus bedienbar (2.1.1). Pragmatisch:
Rangliste als gleichwertige Text-Alternative deklarieren (einfach) statt SVG-Pfade fokusierbar
machen (aufwendig/fragil).

**Wichtig:** Fokus-Sichtbarkeit — 16× `outline:none` auf Inputs ohne Ersatz (W4); Charts ohne
Textalternative (W3); Step-Wechsel ohne Fokus-Management (W5); E-Mail-Felder nur mit Placeholder (W6);
Jahres-Dropdown ohne aria-expanded/Escape (W7).

**Positiv (kein Handlungsbedarf):** InlineEdit/InfoTooltip/GlossaryTerm/SunControl/ChartActionBar
vorbildlich; kein `user-scalable=no`; `lang="de"`; Akzent-Blau #1365EA = 5,15:1 (bestanden).
Dark/Dusk-Themes nach Token-Fix separat nachrechnen.
