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
