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

## Vor dem Zusammenführen mit der Hauptlinie (Prüfung 22.09.2026)

- `public/atlas-design-preview/` und `scripts/municipality-preview/` sind Referenz
  und gehen NICHT mit auf `main` (öffentlich erreichbar, u. a. `serve.py` mit
  Open-Meteo-Adresse, Übergabe-Notizen). Die Seite bringt ihr CSS selbst mit.
- `public/hero-system/dist/*`: nur die Chunks, die die neue Seite wirklich lädt.
- Admin-Werkzeuge der Redaktion (`/api/admin/story-text-pattern`,
  `lib/story-design-store.ts`) schreiben unter `scripts/.cache` — auf Vercel
  schreibgeschützt. Nur lokal nutzbar; so kennzeichnen oder umbauen.
- Geschichten-Vorrat: gemessen 0 zur Veröffentlichung vorgemerkte Funde (22.09.2026);
  der Suchlauf erzeugt 639 Funde ohne widersprüchliche Kennung.
- Monatslauf aus EINEM Registerauszug (Atlas + Geschichten + Pakete), sonst
  weichen die Zahlen ab (gemessen: 108 von ~1.200 Paketen mit Abweichung).

## Stand vor dem Livegang (22.09.2026)

**Zwei Zweige.** `claude/gemeindeseite-integration` trägt Vorschau und alles
Gemeinsame; `claude/gemeindeseite-umschalten` (darauf aufgesetzt) nimmt die neue
Seite unter die Atlas-Adresse, löscht die alte und die Vorschau-Route. Live geht
nur der zweite, als ein Merge auf main.

**Erledigt und gemessen:**
- 11.247 Pakete im Speicher `gemeinde-pakete` (Brotli, 673 MB); Lesen gecacht mit
  der Seite, Marke `ATLAS_DATEN_TAG`. Ein Lesefehler lässt den Aufbau scheitern
  (CDN behält die alte Seite), nur ein fehlendes Objekt ist 404.
- Titel, Beschreibung, kanonische Adresse, Index-Regel an fünf Orten gegen die
  Produktion gleich; strukturierte Daten wie vorher (Organization,
  SoftwareApplication, BreadcrumbList, Dataset).
- Besuchszählung und Brief-Herkunft wie auf jeder (site)-Seite.
- Bildvergleich gegen den Prototyp: Ranking, Monitor, Bürger-Karten, Kontakt,
  Kopf deckungsgleich. Bewusste Abweichungen: Quellenzeile (DWD statt freier
  Wetter-API, PVGIS ergänzt), Kurztitel nach Regeln für alle Orte, Abo-Fenster im
  Prototyp-Design mit dem archivierten Einwilligungstext.
- Desktop und Telefon ohne seitlichen Überlauf an fünf Orten; ohne JavaScript
  steht der Inhalt im HTML.

**Offen bzw. bewusst so:**
- **Ein Registerstand:** Datenbank 09-09, Pakete 09-10 — gut jede zwölfte Paket-
  Prüfung weicht ab. Erst der Monatslauf (`scripts/gemeinde-monatslauf.ts`,
  lokal, nach dem Datenbank-Import am 5.) macht beides aus EINEM Export. Er
  läuft im Hauptcheckout; vorher die Story-Caches aus dem Codex-Worktree dorthin
  KOPIEREN (heute Symlinks) und den geplanten Auftrag anlegen.
- **Redaktionstisch „Kommunen":** Die Ortsseite zeigt die Geschichten aus dem
  Paket, nicht mehr die Kette `orts-posts`. Was dort je Ort eingestellt wird,
  erscheint nicht mehr auf der Ortsseite.
- `public/atlas-design-preview` bleibt: die Startseite (Story-Karten) und die
  Redaktion lesen daraus. `scripts/municipality-preview` bleibt als Referenz
  des freigegebenen Entwurfs, bis der Livegang abgenommen ist.
