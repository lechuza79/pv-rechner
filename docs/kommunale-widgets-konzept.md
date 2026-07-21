# Konzept: Kommunale Widgets — Regions-Setting + Hero-Widget in Teilen

**Status:** Konzept, noch nicht gebaut. Eigene, fokussierte Session (2026-07-20 vertagt,
weil die Atlas-Session zu lang wurde). Auslöser: der Upselling-Block auf den Gemeinde-
Seiten (`components/atlas/GemeindeEmbedBox.tsx`) soll nicht einen rohen iframe-Code für
*ein* Widget zeigen, sondern das ganze kommunale Widget-Angebot erschließen.

## Die Idee in einem Satz
Jedes Atlas-Widget ist „**Modul × Region**": man wählt das Modul (Hero-Stats, Karte, …)
und die Region (PLZ / Gemeinde / Kreis / Land / Bund) — die Region ist eine **Einstellung**
auf der Widget-Seite, aus der URL vorausgefüllt.

## Terminologie (vom Nutzer geklärt)
- **Hero-Widget** = das **Statistik-Modul** auf der Gemeinde-Seite: Kennzahlen-Kacheln
  (Solaranlagen / Installiert / Speicher / je Einwohner …) **+ Donut** (Segment-Mix)
  **+ „Top Kommunen"-Rangliste**. Heute: `components/atlas/GemeindeHero.tsx`.
  **NICHT** die Karte.
- **Karte** = eigenes Widget: „nur die Karte" (`MastrHeroSection`/`MastrMap`) **+
  Hierarchie-Setting** (welche Ebene/Region sie zeigt). Existiert schon als `/embed/karte`.

## Was gebaut werden soll
1. **Regions-/Hierarchie-Setting in der Widget-Galerie** (`app/(site)/energie-widgets`):
   - Ein Eingabefeld „Region" (PLZ oder Gemeinde/Kreis suchen → AGS auflösen).
   - Gilt für **alle** kommunalen Widgets gleichzeitig (nicht pro Widget durchgereicht).
   - **Vorausgefüllt aus der URL** (`?ags=…&name=…` bzw. `?plz=…`) — z. B. wenn man über
     den Knopf einer Gemeinde-Seite kommt.
   - Reiht sich in die bestehende Anpassung ein (Theme hell/dunkel, Größe, Flags).
2. **Hero-Widget einbettbar — komplett ODER in Teilen** (per Setting):
   - „Komplett" = Kacheln + Donut + Rangliste.
   - „In Teilen" = nur Kacheln / nur Donut / nur Rangliste (einzeln wählbar).
   - Löst die heutigen drei fast gleichen Gemeinde-Widgets auf: `/embed/gemeinde-solar`
     (= Kacheln-Teil), `/embed/gemeinde-erneuerbare` (= Donut-Teil), `/embed/
     gemeinde-solarleistung` → besser **ein** Hero-Widget mit Teil-Settings statt drei
     Embeds pflegen. Migration/Redirects der alten Embed-Routen mitdenken.
3. **Karte als Widget mit Hierarchie-Setting** sauber in dieselbe Region-Logik einhängen
   (zeigt DE / Bundesland / Kreis / Gemeinde je nach Setting).
4. **Gemeinde-Seiten-Kasten** (`GemeindeEmbedBox`, Phase 1 schon gebaut: Vorschau + Knopf
   + Kontakt, **kein Code**): Knopf „Ansehen, anpassen & einbetten" führt in die Galerie
   **mit vorausgefüllter Region** → dort sieht die Kommune alle Module ihrer Gemeinde,
   passt an, holt den Code (samt SEO-Backlink) — oder nimmt Kontakt auf.

## Betroffene Bausteine
- `components/atlas/GemeindeHero.tsx` → muss als eigenständiges Embed lauffähig werden
  (heute nur auf der Detailseite), Region als Prop/Query, Teil-Modus.
- `app/(embed)/embed/*` (gemeinde-solar / -erneuerbare / -solarleistung / karte) →
  auf Hero-Teile + Karte konsolidieren.
- `app/(site)/energie-widgets/client.tsx` → Region-Setting (SSOT `lib/widget-settings.ts`?),
  Prefill aus URL, Deep-Link-Anker je Sektion (`#gemeinde-solar` etc.).
- `components/atlas/GemeindeEmbedBox.tsx` → Knopf-Ziel finalisieren.
- Widget-Konvention beachten (Memory `feedback_widget_convention`, CLAUDE.md „Embed-
  Widgets"): `useWidgetTheme`, `DataSourceNote`/`PoweredBy` immer sichtbar, kein
  Browser-Storage im Embed (§ 25 TDDDG), Backlink erhalten (SEO-Hebel der Gemeinde-Ebene).

## Offene Design-Fragen für die nächste Session
- Region-Eingabe: PLZ-Feld (wie `StandortField`) **oder** Gemeinde-/Kreis-Suche? Beides?
- „Teile" als getrennte Embeds (mehrere iframes) oder ein Embed mit `parts=`-Query?
- Was passiert mit den alten `/embed/gemeinde-*`-URLs (Redirects, damit bestehende
  Einbettungen nicht brechen)?
- Kontakt: eigener „Für Kommunen"-Betreff in `lib/contact-topics.ts`?

---

## Nachtrag 2026-07-21 — entschiedene Punkte (Briefing für die Umsetzungs-Session)

Aus dem Gespräch nach dem Perf-/Infra-Tag. Das hier ist **beschlossen**, nicht mehr offen:

### 1. KPI-Kacheln werden Teil des Hero-Widgets
Heute steht `AtlasKpiRow` **über** `GemeindeHero` als eigenes Geschwister-Element,
serverseitig über *alle* Anlagen gerechnet. Deshalb reagieren Werte und Tendenzen
nicht auf den Eigentümer-Filter, der **im** Hero sitzt.

→ Die Kacheln wandern **ins Hero-Widget**. Der dort vorhandene Filter
(alle/privat/gewerbe) steuert sie damit automatisch mit.

### 2. Filter wirkt auf Werte UND Vergleichsbasis
Bei „Privat" zeigen die Kacheln die **privaten** Zahlen, und die Tendenz vergleicht
gegen die **privaten** Zahlen der gewählten Ebene (Landkreis/Land/Deutschland).
Zweck: „Wie schlägt sich die Kommune **in dieser Kategorie**?" — nicht Privat gegen
Gesamt, das wäre eine unsinnige Prozentzahl.

### 3. Datenlage — kein DB-Umbau nötig
`mastr_region_series` liefert pro Zeile **Segment UND Jahr**; `getRegionAtlasData`
aggregiert das heute nur getrennt weg (`by_segment` bzw. `by_year`). Wer die
Kombination behält, kann **alle fünf Kacheln** eigentümer-filtern:
- direkt splittbar (aus `by_segment`): Solaranlagen, Installiert, je Einwohner
- braucht Segment×Jahr: **Neu {Jahr}**
- braucht Speicher-nach-Segment: **Batteriespeicher** (`batterie_privat`/`_gewerbe`
  stehen bereits in `SEGMENT_OWNER`)
Die Eigentümer-Zuordnung **muss** `SEGMENT_OWNER` aus `lib/atlas.ts` benutzen —
dieselbe Quelle wie Donut und Rangliste, sonst driften Kacheln und Diagramm.

### 4. Hero-Teile einzeln einbettbar
Gewünscht: nicht nur das ganze Hero-Widget, sondern auch **Teile** (nur Kacheln /
nur Donut / nur Rangliste).
**Empfehlung (mit dem Nutzer abgestimmt):** *ein* Widget mit **Teil-Settings**
(`parts=kacheln,donut,rangliste`) statt drei neuer Widgets — sonst sind bald sechs
Varianten zu pflegen. Deckt sich mit der Konsolidierungs-Idee weiter oben
(die drei alten `/embed/gemeinde-*` zusammenführen, alte URLs per Redirect halten).

### 5. Widget-Galerie bekommt Kategorien
`/energie-widgets` wird langsam unübersichtlich → Kategorien einführen, u. a.
**„Kommunen"** und **„Allgemein"**. Kommt sinnvollerweise zusammen mit dem
Regions-Setting (oben beschrieben) in einem Rutsch.

### Reihenfolge-Vorschlag
1. Segment×Jahr in `getRegionAtlasData` erhalten (Datenform)
2. KPI-Kacheln ins Hero ziehen + Filter auf Werte & Vergleichsbasis
3. Teil-Settings + Konsolidierung der Gemeinde-Embeds (inkl. Redirects)
4. Galerie-Kategorien + Regions-Setting
