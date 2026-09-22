# Gemeindeseite: Integration des neuen Designs (Arbeitsplan)

Stand 22.09.2026. Arbeitszweig `claude/gemeindeseite-integration`.
Ziel (Betreiber, 22.09.2026): die alte Atlas-Gemeindeseite **vollständig und in einem
Schritt** durch das abgenommene Höchberg-Design ersetzen — für alle rund 11.000
Gemeinden, erst wenn jedes Element für jede Gemeinde Daten hat. Vorher eine
gesperrte Vorschau im echten Projekt, Abnahme an mehreren Orten, dann Umschalten.

## Quellen (gesichert)

- Geschichten: `codex/kommunen-templates-sicherung` @ 6d707e8b — gemergt (4e690f5f).
- Design: `codex/kommunenseite-design` @ a1b75669 — gemergt (8b7c5c61).
  Übergabe: `scripts/municipality-preview/HANDOFF.md`, `DATA-PREPARATION.md`.
- Bewusst NICHT übernommen: zweite Warteliste (live gibt es eine), Open-Meteo-
  Vorhersage-Route (Regel: kein Wetterwert aus der freien Schnittstelle),
  Story-Vorbereitungs-Workflow + Rang-Beobachtung im MaStR-Lauf (gehören in Stufe 2).

## Der Prototyp ist Höchberg-only

Jede Datenaufbereitung hat `09679147` hart drin; Titel, Bürgerbeispiele,
Teilen-Texte sind getippt; Inhalte entstehen im Browser (iframes + DOM-Skripte).
Er ist **Referenz für Aussehen und Verhalten**, nicht Code, der live geht.

## Stufen

1. **Quellen zusammenführen** — erledigt.
2. **Daten für alle Gemeinden** (größter Brocken). Je Element prüfen: gibt es eine
   zentrale Quelle für alle Orte? Sonst Datenlauf bauen, der vorberechnet ablegt
   (nie im Seitenaufbau rechnen — Lehre aus Auszeichnungs-Liste 09/2026).
   - Monats-Bestand (Monatsenden, 25 Monate) je Gemeinde — Monitor-KPIs/Sparklines.
   - Monatsprofil Solar (ERA5, Monat × Tag × Stunde) je Gemeinde.
   - Jahres-Energieprofil (ERA5) je Gemeinde.
   - Stromwert / Einspeisewert je Gemeinde und Monat.
   - Ranglisten: alle Positionen einer Gemeinde + Verlauf seit Jahresbeginn
     (`municipality_rank_observations`); Volllisten global, nicht je Seite.
   - Bürgerbeispiele aus Rechenkern (PVGIS-Ertrag des Orts, Strompreis), nie getippt.
3. **Seite im Projekt bauen**: Server-Komponenten, alle Texte/Zahlen im HTML,
   Interaktion als Client-Inseln; Metadaten/Canonical/JSON-LD aus der App;
   genau eine H1; zentrale Formatierer; unter einer gesperrten Adresse parallel
   zur alten Seite (noindex in Markup UND Header).
4. **Abnahme** an Höchberg + kleinem Dorf + Stadt + Ort mit dünnen Daten +
   kreisfreier Stadt; Browser-Checks Desktop/Mobil, ohne JavaScript, Kaltlast.
5. **Umschalten**: alte Route ersetzt, gleiche Adressen, gleiche Freigaberegeln
   (Sitemap/Index nur angeschriebene Orte, RELEASED.gemeinde bleibt, wie es ist).

## Regeln, die hier besonders greifen

- Kein Element geht mit Höchberg-Werten oder geratenen Werten raus; fehlt ein
  Wert für einen Ort, fehlt das Element (sichtbar begründet), nie „0".
- Performance: Seite darf nicht mit den Daten teurer werden; Kaltaufbau messen
  gegen Produktion (Juli-Ausfall). 3D-Kopf: lokal 16–17 s bis erstes Bild — Budget
  muss vor dem Umschalten stehen.
- Abo, Einbett-Knopf, Brief-Herkunft: die echten Bausteine der alten Seite
  weiterverwenden (Prototyp-Abo verschickt nichts).
