# CLAUDE.md – Solar Check (solar-check.io)

## Deine Rolle

Du bist ein pragmatischer Senior Full-Stack Engineer mit Erfahrung im Aufbau von Consumer-Web-Produkten die als einfaches Tool starten und zu einer Plattform wachsen. Du schreibst Production-Grade Code: typsicher, gut strukturiert, mit sauberer Fehlerbehandlung. Du denkst in Systemen — jede Entscheidung berücksichtigt wohin das Produkt sich entwickeln könnte, ohne heute schon alles zu bauen. Pragmatisch: Shipping schlägt Perfektion, aber du nimmst keine Abkürzungen bei UX und Berechnungsgenauigkeit.

Du arbeitest mit einem UX-Architekten zusammen, der technisch mitdenken kann, aber kein Entwickler ist. Erkläre technische Entscheidungen kurz und klar. Wenn du etwas anders löst als angefragt, begründe warum. Gib direkte, konstruktive Kritik — nicht alles abnicken. Wenn eine Feature-Idee zum jetzigen Zeitpunkt zu früh ist, sag es und erkläre was die Voraussetzung wäre.

**Wichtig:** Der Nutzer führt keine CLI-Befehle aus — Claude übernimmt alle Terminal-Operationen selbst (`npm`, `git`, etc.). Deployments laufen automatisch via git push → Vercel. Kein localhost nötig für den Nutzer — Claude testet lokal und pusht wenn es passt.

**Architektur-Mindset:** Das Projekt startet als rein clientseitige Single-Page-App ohne Backend. Aber die Richtung ist klar: Gespeicherte Berechnungen, Nutzer-Accounts, personalisierte Dashboards, Community-Features sind denkbar. Architekturentscheidungen sollen diese Evolution nicht verbauen — aber auch nichts vorbauen was noch nicht gebraucht wird. Konkretes Beispiel: Berechnung heute als Pure Function, nicht als fest verdrahtete UI-Logik → lässt sich morgen problemlos serverseitig oder in einer API wiederverwenden.

## Projektüberblick

"Solar Check" (solar-check.io) ist ein kostenloser PV-Rentabilitätsrechner ohne Leadfunnel. Nutzer beantworten 4 Fragen und bekommen sofort ein Ergebnis mit Amortisationschart und Szenariovergleich. Alle Berechnungsannahmen sind im Ergebnis transparent editierbar.

**Differenzierung:** Enpal, Klarsolar, Check24 etc. zeigen Ergebnisse erst nach Lead-Erfassung (Name, Telefon, E-Mail). Wir liefern sofort — keine Datensammlung, kein Vertriebskontakt, keine Werbung.

**Zielgruppe:** Menschen die über PV nachdenken und einen schnellen, ehrlichen Realitätscheck wollen. Sekundär: PV-Besitzer die ihre Investition nachrechnen wollen.

## Kernkonzept

### Startseite + Flows

**Startseite (`/`):** Tool-Hub mit 3 Widget-Cards → Live Simulation, Anlage rechnen, Energiedaten

> **Routen-Schema (Stand Juni 2026):** Slugs sind keyword-optimiert (`thema-funktion`, transliteriert). Alte Pfade werden via `next.config.js` dauerhaft (301/308) auf die neuen umgeleitet (Query-Parameter bleiben erhalten — geteilte Links intakt):
> `/rechner`→`/photovoltaik-rechner` · `/waermepumpe`→`/waermepumpe-rechner` · `/energie`→`/strommix-deutschland` · `/empfehlung`→`/pv-bedarf-berechnen` · `/simulation`→`/pv-simulation`.
> **`/klimaanlage-stromkosten`** (Klimaanlagen-Rechner, Kühlkosten): eigener Flow (Gerätetyp → Räume/Größe → Nutzung/PLZ) → Ergebnis mit Gerätevergleich (Monoblock/mobile Split/fest installiert, SEER-getrieben), Anschaffung (je Raum/Innengerät; Split: Sockel + €/Raum inkl. Fachbetrieb-Montage), CO₂ und PV-Deckung. Kühlbedarf weather-driven aus **Kühlgradstunden** (`/api/cooling-degree`), im Ergebnis umschaltbar zwischen drei Standort-Modi: **Ø letzte 5 Sommer** (Default, Open-Meteo Archiv), **letzter Sommer** (Archiv) und **Projektion ~20 J** (Open-Meteo Climate API, CMIP6-Downscaling; Tages-Min/Max → synthetische Stunden via `cdhFromDailyMinMax`). Supabase-Cache `klima_cache` (Spalten `cdh_avg5/_last_summer/_projection`), Bundesland-Fallback + Faktoren aus Config; akuter Hitzewellen-Blick aus 16-Tage-Vorhersage. Reine Funktionen `lib/aircon.ts`, Config `lib/aircon-config.ts` (Geräte/SEER/**SCOP**/Preise/`heatStandards`/Klimatologie/Hitzeschwelle, `validFrom`/`reviewBy`, auf /datenstand; Runbook `scripts/klimaanlage-verify.md` + Quartals-Wächter). Kern ist Kühlung; Split-Geräte können zusätzlich **heizen** — optionaler „Auch heizen?"-Block (`calcAirconHeating`, Wärmepreis Split ÷ SCOP vs. Gas, ehrlich als Übergangszeit-Teilheizung). Das ist der **einzige** Ort für Split-Heizen (nicht im WP-Rechner, siehe WP 10). **Der Gebäudestandard wird nur in diesem Heiz-Block gefragt, nicht im Kühl-Flow:** beim Kühlen dominieren die solaren Gewinne (deshalb Sonne/Lage statt Dämmung), beim Heizen ist die Dämmung der dominante Hebel (Altbau ~3× Neubau). Die kWh/m²·a je Standard sind **geteilte Rechen-Basis** aus `INSULATION_BESTAND`/`INSULATION_NEUBAU` (`lib/constants.ts`, wie im WP-Rechner) × `heatTransitionShare` (0,4) — im Klima-Runbook bewusst nicht pflegen.
> **`/balkonkraftwerk-rechner`** (Balkonkraftwerk-/Steckersolar-Rechner): eigener Flow für Miete/Eigentum ohne Dach. Reihenfolge **Haushalt/PLZ → Ausrichtung → Set-Größe**: der letzte Schritt **empfiehlt** aus den Angaben das wirtschaftlich beste Set (`recommendBalkonSet`, bester 20-J-Gewinn) mit „Empfohlen"-Badge, bietet aber alle 3 mit Ersparnis/Amortisation an; bei knappem Rennen alle gleichwertig. Ergebnis mit Ersparnis/Jahr, Amortisation, **Autarkie**, 20-J-Gewinn, CO₂. Modell in `lib/balkon.ts` + `lib/balkon-config.ts`: Ertrag = Modul-kWp × PVGIS-Ertrag × Ausrichtung, gedeckelt am 800-W-Wechselrichter (Volllaststunden-Grenze → Drosselung sichtbar; deshalb empfiehlt der Rechner bei senkrechter Montage das große Set, bei optimaler Ausrichtung das mittlere). Eigenverbrauch sinkt mit Anlagengröße (kalibriert an HTW Stecker-Solar-Simulator), Default **keine Einspeisevergütung** (Überschuss unvergütet), Fixpreis-Sets statt €/kWp. Miete/Eigentum als Hinweis (privilegierte Maßnahme seit 2024), nicht als Rechenweg. Cross-Link zum PV-Rechner bei hohem Verbrauch. Config-Werte auf `/datenstand`; jährlicher Frühjahrs-Wächter (scheduled-task `solar-check-geraete-config-verify-jaehrlich`) + Runbooks `scripts/balkon-verify.md` (Set-Preise, 800-W-Regel) und `scripts/klimaanlage-verify.md` (SEER/SCOP/Preise/Heizwärme).
>
> **Effizienz-Systematik (BLOCKER beim Pflegen der Geräte-Effizienzen):** Der Gerätevergleich ist der Kern der Seite und kippt still, wenn ein Typ anders behandelt wird als die anderen. Die Typenschilder taugen nicht als gemeinsame Basis: VO (EU) 626/2011 gibt Split + mobile Split einen **SEER** (EN 14825, Teillast, reale ΔT), während Einkanal/Monoblock von EN 14825 **ausgeschlossen** ist und einen Volllast-**EER** (EN 14511) trägt — gemessen in einer 35-°C-Kammer ohne Außen, in der Infiltration strukturell nicht auftreten kann (Einkanal Klasse A ≙ Split Klasse F, seit 2013 verboten). Deshalb ist `seer` in der Config **kein Typenschild-Wert**, sondern die effektive Jahres-Effizienz, für jeden Typ nach derselben Formel abgeleitet: `seer = labelValue × AC_REAL_FACTOR × structuralFactor`. `AC_REAL_FACTOR` (0,85) gilt **einheitlich für alle**; `structuralFactor` trägt **nur** nach, was die jeweilige Prüfnorm ausklammert (SEER-Skala ⇒ immer 1,0; aktuell nur Monoblock 0,7 = Infiltration). **Ein Typ darf nur dann einen abweichenden Faktor bekommen, wenn ein physikalischer Effekt außerhalb seiner Prüfnorm-Grenze benannt ist — „Wert wirkt zu optimistisch" ist kein gültiger Grund.** Erzwungen von `lib/__tests__/aircon.test.ts → "Effizienz-Systematik"` (Handwerte, Ermessens-Abschläge und Label-Metrik-Fehler schlagen an). Jahres-Wächter (scheduled-task) + Runbook `scripts/klimaanlage-verify.md` prüfen die **Systematik**, nicht einzelne Zahlen. Keine Selbstheilung — es gibt keine amtliche Quelle zum Abgleichen, Befund geht an den Menschen.
> Neu: **`/photovoltaik-foerderung`** (Förder-Übersicht) + **`/photovoltaik-foerderung/[bundesland]`** (Bundesland-Seite, listet Kommunen + Landesprogramme) + **`/photovoltaik-foerderung/[bundesland]/[stadt]`** (Stadt-Seiten: MaStR-Bestand + Förderung + Beispiele + FAQ/JSON-LD). Alte flache Slugs `/photovoltaik-foerderung/[stadt]` → 308 auf die verschachtelten (in `next.config.js`; Stadtstaaten Hamburg/Bremen ohne Redirect, da Slug=Bundesland). **Förderdaten in Supabase** (`funding_programs` + `funding_checks`), gelesen via `lib/funding-data.ts → getFundingPrograms()` mit Code-Seed (`lib/funding-programs.ts`) als Fallback; Seiten ISR (revalidate 3600), Rechner via `/api/funding`. Anlegen/Sync: `/api/funding/setup` (`?resync=1` upsert). Quartals-/Wochen-Wächter (scheduled-tasks) + Runbook `scripts/foerder-verify.md`. Städte-Registry `lib/atlas-cities.ts`, geteilte Bausteine `components/FundingProgramParts.tsx`.

**Flow 1: Rechner (`/photovoltaik-rechner`)** — "Ich kenne meine Anlage"
```
Step 0: Anlagengröße          → 5 / 8 / 10 / 15 kWp + "Anderer Wert" (2×2+1 Grid, OptionCard)
Step 1: Speicher               → Nein / 5 / 10 / 15 kWh (2×2 Grid, OptionCard)
Step 2: Haushalt               → Personen + Nutzungsprofil
Step 3: Großverbraucher        → WP + E-Auto + Klimaanlage (TriToggles)
                                 WP an → Gebäude-Detail (Wohnfläche, Dämmung,
                                 Heizsystem, HAUSTYP) für den WP-Strom, konsistent
                                 zum WP-Rechner (Empfehlungs-Flow leitet den
                                 Haustyp-Faktor aus dem Dach-Haustyp ab)
→ Ergebnis (gleiche Seite)
```

**Flow 2: Empfehlung (`/pv-bedarf-berechnen`)** — "Was passt zu mir?"
```
Step 0: Haushalt               → Personen + Nutzungsprofil
Step 1: Großverbraucher        → WP + E-Auto (mit Erklärtext warum relevant)
Step 2: Dach                   → Haustyp (4 Typen) + Dachart (4 Typen) + opt. Budget
→ Zwischenseite: Empfehlung + Warum + Alternativen
→ Ergebnis (auf /photovoltaik-rechner, mit "Warum diese Anlage?"-Sektion)
```

**Gemeinsame Ergebnisseite:**
```
Hero-Card: Amortisation + editierbares Grid
Quick Settings: WP, E-Auto, Speicher
Energie-Paar: Autarkie % (Netz-Unabhängigkeit) + Eigenverbrauch % (mit Erklärung des Unterschieds)
Stats: Rendite 25J + ⌀ Ersparnis/Jahr
Chart: SVG-Amortisationskurve mit 3 Szenarien
[Empfehlungs-Flow: aufklappbare "Warum diese Anlage?"-Sektion]
Methodik · Save · Share · Neu-Berechnen
```

### Berechnungslogik

**Eigenverbrauch (automatisch berechnet, manuell überschreibbar):**
```
Grundverbrauch   = f(Personen): 1→1800, 2→2800, 3–4→3800, 5+→5000 kWh/a
Tagquote         = f(Nutzung): weg→24%, teils→30%, home→38%, immer→45%
Extra-Verbrauch  = WP→+3500 kWh, E-Auto→Laufleistung×0.18 kWh (Default 15.000 km/a),
                   Klimaanlage→Wohnfläche×3 kWh/m²·a (nur Kühlung, Default 120 m²)
                   Klimaanlage ist sun-aligned (Bedarf = Mittag/Sommer), deckt aber
                   nur Kühlen ab — Heizen läuft über den Wärmepumpen-Rechner.

Empirisches Power-Law (kalibriert an HTW Berlin Simulationsdaten, ±2pp):
  x              = kWp / (Gesamtverbrauch in MWh)
  y              = Speicher kWh / (Gesamtverbrauch in MWh)
  EV_Basis       = tagQuote × x^(-0.69)
  EV_Speicher    = 0.61 × x^(-0.72) × (1 - e^(-0.6×y))
  EV_Max         = Gesamtverbrauch / Jahresertrag
  Eigenverbrauch = min(EV_Basis + EV_Speicher, EV_Max, 90%)
Ergebnis: 10–90%, gerundet

Quelle: HTW Berlin, Quaschning/Weniger (25.000 Konfigurationen, 1-Min-Auflösung, VDI 4655)
tagQuote 0.30 ≈ HTW Standard-Profil, andere Werte skaliert nach Nutzungsprofil
```

**Kostenschätzung (automatisch, manuell überschreibbar):**
```
Preise werden monatlich via Cron von taptaphome.com (vormals
solaranlagen-portal.com, DAA GmbH) gescrapt
und in Supabase (market_prices) gespeichert. Admin-UI: /admin/prices
Fallback-Defaults in lib/prices-config.ts (Q1/2026):
PV:       ≤10 kWp → 1.400 €/kWp, >10 kWp → 1.250 €/kWp
Speicher: 700 €/kWh
Gerundet auf 500 €
```

**Amortisation:**
```
Zeitraum:            25 Jahre
Degradation:         0,5%/Jahr
Einspeisevergütung:  EEG-konform, 4 Sätze (Teil/Voll × ≤10/>10 kWp)
                     Teileinspeisung: 7,78 / 6,73 ct/kWh
                     Volleinspeisung: 12,34 / 10,35 ct/kWh
                     Gewichteter Mischsatz bei Anlagen >10 kWp
                     3-State: Aus / Teil / Voll (auto-berechnet, manuell überschreibbar)
                     Zahlung nur 20 Jahre (FEED_IN_YEARS): EEG-Garantie endet nach
                     20 J., danach 0 (Marktwert konservativ nicht angesetzt);
                     Eigenverbrauchs-Ersparnis läuft weiter. Ergebnis-Notiz +
                     FAQ-Eintrag zur geplanten EEG-Reform 2027 (Referentenentwurf,
                     Neuanlagen ab 2027; Bestandsschutz für ≤2026) — Notiz nur bei
                     aktiver Einspeisung; wächter-gepflegter Stichtags-Fakt
                     Quelle = lib/feedin-config.ts (Stand 02–07/2026); die
                     Supabase-Tabelle feed_in_rates ist NICHT angelegt, daher ist
                     die Config die De-facto-Quelle. EEG degressiert 1%/Halbjahr
                     (1.2. / 1.8.) — Wächter + Runbook scripts/eeg-verify.md.
                     Wächter-Abweichungen werden per Council gegengeprüft
                     (scripts/council-verify.md: 3 unabhängige Verifizierer, 1
                     adversarial); bei Konsens fixen sich EEG und die
                     Förder-Abschaltung selbst (Auto-Commit + Deploy) — Förderung
                     nur in der sicheren Richtung (Programm abschalten/kein Abzug),
                     Förder-Einschalten sowie CO2/WP bleiben Vorschlag.
Szenarien:           Strompreis +1% / +3% / +5% p.a.
EV-Delta:            −5% / 0% / +5% pro Szenario
```

### InlineEdit-Komponente

Click-to-Edit-Pattern. Wert wird als Text mit gestrichelter Unterstreichung angezeigt (Affordance), Klick öffnet Input, Enter/Blur committed, Escape bricht ab. **Kein `type="number"`** (Bug-anfällig bei Dezimalwerten), sondern Text-Input mit manueller Validierung. **Deutsche Zahlenformatierung:** Display nutzt `toLocaleString("de-DE")` (Komma als Dezimaltrenner, Punkt als Tausendertrenner). Eingabe akzeptiert Komma und Punkt — Tausenderpunkte werden entfernt, Dezimalkomma zu Punkt konvertiert.

## Aktueller Fokus

Live unter solar-check.io. Phase 0–3 + WP 1–3, 5, 8, 10 abgeschlossen. WP 9 (Energiedaten-Datalake) und Phase 4 (Content/Reichweite) sind die offenen Posten.

### Phase 0 ✅ MVP (done)
- [x] 4-Step-Flow (Anlage → Speicher → Haushalt → Großverbraucher)
- [x] Ergebnis mit 3-Szenarien-Chart (SVG)
- [x] Editierbare Annahmen im Hero (InlineEdit)
- [x] Einspeisevergütung An/Aus-Toggle
- [x] Auto-Kostenberechnung aus kWp + Speicher
- [x] Auto-Eigenverbrauchsberechnung aus Haushaltsdaten
- [x] Next.js Projekt mit SEO-Meta + OpenGraph

### Phase 1 ✅ Live & SEO-Basics (done bis auf Favicon)
- [x] Domain solar-check.io + Vercel Deployment
- [x] Strukturierte Daten (JSON-LD: FAQPage, WebApplication) — Jahres-Frage rotiert dynamisch
- [x] sitemap.xml + robots.txt (inkl. /impressum, /datenschutz)
- [x] Share-Funktion: Ergebnis als URL teilbar (Query-Parameter, Clipboard, Native Share, WhatsApp)
- [x] Google Search Console einrichten
- [x] TypeScript strict + noUnusedLocals/noUnusedParameters/noImplicitReturns
- [x] Input-Validierung für Share-URL-Parameter (NaN/Infinity/Bounds)
- [x] Error Boundary für fehlerhafte Share-URLs (Fallback-UI statt Whitescreen)
- [x] Globale Error-Page (`app/(site)/error.tsx`) für Routen unter dem Site-Layout
- [x] Open-Redirect-Validierung im Auth-Callback (next-Param)
- [x] Impressum + Datenschutz Seiten mit Footer-Links
- [x] Test-Infrastruktur: Vitest, ~150 Tests (calc, heatpump, recommend, consumption, chart-utils, energy-api), läuft im Pre-commit-Hook
- [ ] Favicon / OG-Image

### Phase 2 ✅ Berechnungsgenauigkeit + Standort (done)
- [x] EV-Modell kalibriert an HTW Berlin Simulationsdaten
- [x] Standort-basierter Ertrag (PLZ → PVGIS API → kWh/kWp)
- [x] Monatliche Amortisation + Monatsertrag-Chart
- [x] Saisonaler Verbrauchsfaktor (BDEW H0 Lastprofil)
- [x] Gas/Öl-Referenzkosten bei WP (inkl. CO₂-Abgabe, EU ETS2)
- [x] Supabase Infrastruktur (PVGIS-Cache, Schema für Berechnungen)
- [x] Quick Settings (WP, E-Auto, Speicher)
- [x] E-Auto Laufleistung
- [x] Custom kWp Eingabe
- [x] Methodik-Seite mit transparenter Berechnungserklärung

### Phase 3: Accounts & Empfehlungs-Flow

**WP 1: Accounts & Rollen ✅ (done)**
- [x] Supabase Auth (Magic Link, passwordless)
- [x] 3 Rollen in DB (Interessent/PV-Besitzer/Solateur), aktiv ab WP 3/4
- [x] Berechnung speichern + wieder laden
- [x] Dashboard "Meine Berechnungen" (`/dashboard`)
- [x] Inline Login (Header + Sticky Bottom Bar im Ergebnis)
- [x] Auto-Save nach Magic Link Redirect (localStorage pending → Dashboard)
- [x] Login leitet zum Dashboard weiter (nicht zurück zum Rechner)
- [x] "Neue Berechnung" Button im Dashboard
- [x] Name + Beschreibung für gespeicherte Berechnungen (Inline-Edit im Dashboard)
- [x] Doppeltes Login-Formular auf Ergebnis-Seite behoben

**WP 2: Empfehlungs-Flow ✅ (done, geparkt — nicht auf Startseite verlinkt)**
- [x] Hub-Startseite (/) mit 2 Flow-Optionen
- [x] Empfehlungs-Flow (/empfehlung): Haus+Dach → Haushalt → WP/E-Auto → Empfehlung
- [x] Empfehlungs-Algorithmus (lib/recommend.ts): EV-optimierte kWp + Speicher-Empfehlung
- [x] Zwischenseite mit Empfehlung, Warum-Erklärung, Alternativen
- [x] Ergebnis-Erweiterung: aufklappbare "Warum diese Anlage?" Sektion
- [x] Code-Extraction: lib/calc.ts, lib/constants.ts, components/ (aus rechner.tsx)
- [x] URL-Routing: /, /rechner, /empfehlung + Redirect für alte Share-URLs
- [x] DB-Schema erweitert: flow_type, haustyp, dachart, budget_limit
- [x] Share-URLs + Dashboard für beide Flows

**WP 3: Design-System & Theming ✅ (done)**
- [x] CSS Custom Properties: alle Design-Tokens zentral in `lib/theme.ts`
- [x] Migration aller Inline-Styles auf `var()` Referenzen (10+ Dateien)
- [x] Admin Theme-Seite (`/admin/theme`): Farben, Fonts, Spacing, Komponenten
- [x] Admin-Zugang via `ADMIN_EMAILS` Env-Variable
- [x] Grundlage für Whitelabeling (WP 4: anderes Token-Set pro Tenant)
- [x] Light Theme mit blauem Akzent (Figma-basiert)
- [x] Semantisches Farbsystem: Grün=positiv, Blau=interaktiv, Rot=negativ, Grau=neutral
- [x] Neue Tokens: `--color-positive`, `--color-text-on-accent`, `--color-accent-dark/light/bg`
- [x] OG-Image auf Light Theme + Solar Check Branding

**WP 5: Live Simulation (Phase 1) ✅ (done)**
- [x] Open-Meteo Wetter-API-Route (`/api/weather`) mit In-Memory-Cache (5 Min TTL)
- [x] PV-Momentanleistung: NOCT-Temperaturmodell + Temperaturkoeffizient
- [x] Seite `/simulation`: PLZ → Wetter-Card → Anlagen-Grid (5/8/10/15 kWp) → Tagesverlauf-Chart (SVG)
- [x] Auto-Refresh alle 15 Min, Nacht-Modus, PLZ via URL-Parameter
- [x] Hub-Startseite: "Weitere Tools" Sektion mit Link zu Live Simulation
- [x] Phase 2: Verbrauchsprofil-Overlay (WP + E-Auto + Haushalt → Live-Eigenverbrauch)
- [x] Zentrales Verbrauchsmodell (`lib/consumption.ts`): WP/E-Auto/Haushalt Konstanten + Stundenprofile
- [x] PLZ-Submit-Button statt Auto-Fetch (Simulation + Rechner)
- [ ] Phase 3: Mehrtägige Simulation (Open-Meteo Forecast bis 16 Tage)

**WP 10: Wärmepumpen-Rechner ✅ (done)**
- [x] Eigener Flow `/waermepumpe` mit Neubau/Bestand-Umschalter (5 Steps)
- [x] Kern-Berechnung in `lib/heatpump.ts` (Pure Functions): Heizwärmebedarf, JAZ, Investition, BEG-Förderung, 20-J-TCO
- [x] Config in `lib/heatpump-config.ts` (zentralisiert, Admin-fähig strukturiert). `validFrom` + `reviewBy`; jährlicher Wächter (scheduled-task, Januar) + Runbook `scripts/waermepumpe-verify.md` prüft die preis-/förderabhängigen Werte (BEG, BWP-Invest, §14a-Tarif, Gas) gegen offizielle Quellen; mid-year-Förderänderungen fängt der `foerder-news-waechter` ab
- [x] Heizwärmebedarf: Wohnfläche × spez. kWh/m²·a (dena-Gebäudereport, DIN V 18599) × **Haustyp-Faktor** (geteilte Wände, `HAUSTYP_WP` in constants) + 650 kWh/Person Warmwasser
- [x] **Heizlast (Anlagengröße) getrennt vom Bedarf**: `calcHeatLoad` = Wohnfläche × spez. W/m² (`specHeatLoadBestand/Neubau`, Feldwerte) × Haustyp × `auslegungsfaktor` (0,85, reale monoenergetische Auslegung, min 4 kW). Ersetzt die alte `qGes/2000h`-Formel, die das Warmwasser mitzählte. **Editierbar** im Ergebnis (`override.heizlast`) — wer eine DIN-EN-12831-Berechnung hat, trägt sie ein
- [x] **Haustyp-Abfrage** im Flow-Step „Größe & Typ" (freistehend / Doppelhaus / Reihenend / Reihenmitte)
- [x] JAZ-Modell linear aus Fraunhofer ISE „WPsmart im Bestand" (LWWP/SWWP × Vorlauftemp)
- [x] **Split-Heizen bewusst NICHT im WP-Rechner** (mehrfach durchdacht): Eine Split-Klima gegen Gas zu vergleichen passt nicht in den WP-Rechner (dort ist die Prämisse „ich hole eine Wärmepumpe"), und eine Split *zusätzlich* zur wasserführenden WP ergibt keinen Sinn (die WP heizt ohnehin alles inkl. Warmwasser). Der WP-Rechner kennt daher NUR Luft/Wasser + Sole/Wasser. Die ehrliche „Split heizt Teil der Übergangszeit günstiger als Gas"-Rechnung lebt im **Klima-Rechner** („Auch heizen?", `calcAirconHeating` in `lib/aircon.ts`, `device.scop` + `heatStandards` × `heatTransitionShare` in `aircon-config`) — dort hat man ein Kühlgerät, das nebenbei heizt. Der Heizwärmebedarf je Gebäudestandard ist dabei dieselbe Tabelle wie hier (`INSULATION_BESTAND`/`INSULATION_NEUBAU`) — beide Rechner teilen sie, damit sie nicht auseinanderdriften. Split-Heizwerte auf /datenstand (Klima-Sektion), Quartals-Geräte-Wächter prüft den SCOP.
- [x] Investition nach Heizlast aus BWP Preisübersicht 2024. **Heizkörpertausch (+6.000 €) ist jetzt eine Maßnahme/Wahl** (bei alten Heizkörpern), nicht mehr automatisch aufgeschlagen — aktiv → Kosten UND bessere JAZ (55→45°C). Früher: Kosten ohne JAZ-Nutzen (Inkonsistenz behoben)
- [x] **Realistische Wege** (Szenario-Vergleich, dauerhaft bei Bestand): Ist / Heizkörper fit / Teilsanierung / Vollsanierung — jeder Weg mit €-Ergebnis + Amortisation + TCO-Aufschlüsselung im Tooltip. Sanierungskosten (Dämmung) NICHT in der WP-Rechnung (eigener Gebäude-Nutzen), Heizkörpertausch schon
- [x] **Transparente BEG-Förderung** oben im Ergebnis: Grundförderung 30 % fest + Klima-Schalter (Eigennutz +16 %) + Einkommens-Auswahl (gestaffelt 40/30/10 % nach Haushaltseinkommen, +Kind-Familienzuschlag), Förderdeckel (28.000 €) sichtbar
- [x] **Werte gegen Fachquellen geprüft (2026)**: spez. Heizlast korrigiert (Unterdimensionierungs-Bias behoben), WP-Tarif 0,24 €/kWh (Feld-Ø), Strom-CO₂ in Config (`gridCo2PerKwh`, konservativ statisch)
- [x] BEG-Förderung KfW Merkblatt 458 (gültig ab 21.07.2026 / GmodG): 30 % Grund + 16 % Klima-Geschwindigkeit + Einkommens-Bonus gestaffelt 40/30/10 % (≤30k/≤40k/≤50k zvE, Familienzuschlag +10.000 € je Kind-Haushalt), Cap 70 % (Regel) bzw. 80 % (unterste Stufe) / 28.000 €. Der frühere Effizienz-Bonus (5 % nat. Kältemittel) ist mit der Reform entfallen. `validFrom` 2026-07-21, `reviewBy` 2027-01-25 (vor der Halbjahres-Degression 01.02.2027). Werte gegen das amtliche KfW-Merkblatt geprüft (nicht Presse). `calcBegSubsidy` nimmt jetzt `haushaltseinkommen` + `kindImHaushalt` statt der alten Bonus-Booleans.
- [x] Gas-Referenz über generalisierten `calcFuelCost` (mit CO₂-Preispfad BEHG/EU ETS2). Preispfad in `lib/co2-config.ts` an absolute Kalenderjahre verankert (rollover-sicher), jährlicher Wächter + Runbook `scripts/co2-preis-verify.md`
- [x] Hero: 20-Jahre-TCO-Differenz als Zahl, Amortisation + ⌀ Ersparnis + CO₂ als Kacheln
- [x] Editierbare Werte (InlineEdit): Q_ges, JAZ, Referenzheizung (3 Varianten), Gas-/Strompreis, Invest, Einkommens-Bonus
- [x] 3-Szenarien-Chart (Pessimistisch/Realistisch/Optimistisch) mit Amortisations-Markern
- [x] `calcFuelCost` verallgemeinert aus `calcFuelCost25` (abwärtskompatibler Wrapper für PV-Rechner)
- [x] Startseite: 4. Widget-Card "Wärmepumpe rechnen"
- [x] Sitemap + SEO-Metadata für `/waermepumpe`
- [ ] PV-Synergie als Toggle im Ergebnis (aktuell nur Link "PV dazu rechnen" zum PV-Rechner)
- [ ] Share-URL + Dashboard-Save für WP-Berechnungen

**WP 8: Automatische Marktpreise ✅ (done)**
- [x] Supabase-Tabelle `market_prices` (Preishistorie, RLS)
- [x] Monatlicher Vercel Cron: Scraping von solaranlagen-portal.com (`/api/prices/scrape`)
- [x] Plausibilitätsprüfung (Grenzen + max. 30% Abweichung)
- [x] `estimateCost()` mit dynamischem `PriceConfig`-Parameter
- [x] `usePrices()` Client-Hook (sessionStorage-Cache)
- [x] Methodik-Seite zeigt aktuelle Preise + "Stand: Monat/Jahr"
- [x] Admin-UI `/admin/prices` (Scrape-Trigger, manuelles Override, Historie)
- [x] Preise aktualisiert auf Q1/2026 Marktpreise
- [x] **WP-Grundpreis (Luft/Wasser) mitgescrapt** (Paket C): der monatliche Cron liest
  zusätzlich die taptaphome-WP-Kostenübersicht (Gerät + Einbau je Typ) und leitet die
  LWWP-Basis ab (`lib/heatpump-prices.ts`: typischer Gesamtpreis − fixe €/kW-Steigung
  bei Referenz-Heizlast → Basis ~9.500 € statt der alten 18.000-Pauschale, die kleine
  Anlagen ~8.500 € zu teuer rechnete). Live-Wert in `market_prices.wp_lwwp_base`
  (Migration: `/api/prices/setup`), gelesen via `useHeatpumpPrices()` (WP-Rechner) +
  `/datenstand`, Fallback = Config. Selbstheilung 1:1 wie bei PV/Speicher (Plausi-Grenzen,
  „letzten Wert halten", Health-String kippt, Report-Zeile, Admin-Carry-forward); ein
  WP-Scrape-Fehler blockiert **nie** die PV-Preise. NUR Luft/Wasser — Sole/Wasser bleibt
  config-basiert (Bohrkosten sind fix, passen nicht ins Basis+kW-Schema). Grundpreis
  damit aus dem jährlichen WP-Wächter herausgelöst (`scripts/waermepumpe-verify.md`).

**WP 9: Energiedaten-Datalake (in Arbeit)**
- [x] Datenquellen-Recherche: Energy-Charts, Eurostat, SMARD, ENTSO-E, MaStR
- [x] `lib/energy-api.ts`: Shared Fetch-Wrapper, Timestamp-Normalisierung, Cache-Factory, Energy-Charts + Eurostat Fetch-Funktionen
- [x] `lib/chart-utils.ts`: Energietyp-Farbpalette (grün=EE, braun=fossil), Formatter, Aggregation (calcPeriodStats)
- [x] `lib/energy.ts`: Client-Hooks (useGenerationMix, useNuclearImport) mit Stale-While-Revalidate, Auto-Retry (2×), localStorage für historische Daten
- [x] Energie-Farbtokens in `lib/theme.ts` (10 Tokens, semantisch: grün-Shades für EE, braun für fossil)
- [x] `/api/energy/generation`: Energy-Charts public_power Proxy mit In-Memory-Cache + Downsampling (15min→1h→3h→6h)
- [x] Visx als Chart-Library (@visx/shape, scale, axis, grid, responsive, tooltip, gradient)
- [x] `components/charts/StackedAreaChart.tsx`: Visx Stacked Area mit smooth curves (curveMonotoneX), custom Tooltip, responsive
- [x] `components/charts/StackedBarChart.tsx`: Visx Stacked Bar mit täglicher/wöchentlicher Aggregation, 52-Wochen-Grid für YTD
- [x] `/energie` Seite: 5 Summary-Widgets horizontal (EE-%, Erzeugt, davon EE, Netto Import/Export, Kernimport), 5 Zeiträume (24h/7d/30d/YTD/12M) + Max (seit 2015)
- [x] `/api/energy/nuclear-import`: Rechnerischer Kernimport aus 6 Nachbarländern (FR, CZ, CH, SE, BE, NL) via Grenzflüsse × Kernanteil, parallelisiert via Promise.allSettled
- [x] Kernimport-Overlay auf Stacked Area + Bar Chart (Magenta-Linie + weiße Outline, SVG-Fade-in, Toggle)
- [x] Inländische Kernenergie als unterster Bar im Strommix (pink #EF85F8, bis April 2023)
- [x] `useNuclearImport()` Client-Hook mit Stale-While-Revalidate + localStorage für historische Daten
- [x] Kernimport in Supabase `energy_weekly` gespeichert (`nuclear_import` Spalte) — Max-View zeigt Kernimport aus DB
- [x] Backfill-Route berechnet Kernimport pro Woche (CBPF × Kernanteil, sequentiell mit 45s Timeout pro Land)
- [x] Kernenergie-Widget zeigt erzeugt + importiert (aufgeschlüsselt mit Farbpunkten)
- [x] Chart-Export: PNG-Download + Share (Native, WhatsApp, Twitter) via `lib/chart-export.ts` + `useChartExport`
- [x] Ergebnis-Refactoring: HeroCard, Stats, QuickSettings, ResultActions als eigene Komponenten
- [x] API-Resilienz: Stale Cache Fallback (server-seitig), 24h-Cache für historische Zeiträume, Client Auto-Retry + Retry-Button
- [x] Graceful Degradation: Nuclear-Fehler blockiert nicht Generation-Chart, "Nicht verfügbar" statt 502-Fehler
- [x] Supabase `energy_weekly`-Tabelle: Voraggregierte wöchentliche GWh (597 Zeilen, 2015–heute)
- [x] `/api/energy/backfill`: Befüllt energy_weekly aus Energy-Charts (jahresweise, CRON_SECRET-geschützt)
- [x] Max-Ansicht (2015–heute): Monatliche Balken aus Supabase-Daten, Jahreslabels auf X-Achse
- [x] Permanentes Caching: localStorage (Infinity TTL) für historische Daten, 30d CDN-Cache für vergangene Zeiträume
- [x] Zeitraum-UI: "Letzte" (24h–12M) + "Andere Zeiträume" (aktuelles Jahr, Jahres-Dropdown mit Pfeilnav, Max)
- [x] Custom Dropdown statt natives Select (gestyltes Flyout, gleiche Höhe, outside-click-close)
- [x] SVG-Chevron-Icons (ChevronLeft, ChevronRight) in Icons.tsx ergänzt
- [x] Kernenergie-Tooltip: "Kernenergie X%" Header + "erzeugt in DE" / "importiert" Zeilen
- [x] Kernenergie-Legende: "Kernenergie [pink] erzeugt [magenta] importiert" als eine Zeile
- [x] Langzeit-Daten (Prototyp-Seiten, noindex): `lib/strommix-history.ts` (AGEB/UBA Bruttostromerzeugung nach Energieträgern 1990–2025 + CO₂-Intensität/-absolut + Eurostat-Strompreise, alle gegen Quelle geprüft, DL-DE-BY/CC BY 4.0), `lib/country-comparison.ts` (Ember-Ländervergleich: Anteil/CO₂-Intensität/Pro-Kopf/Zubau EE vs. Atom). Seiten: `/langzeit-strommix` (DE-Stack Mix+CO₂+Preise gleiche Achse) und `/laendervergleich` (Sonderweg-Einordnung).
- [x] Neue Chart-Komponenten: `components/charts/LineChart.tsx` (Mehrserien-Jahres-Linienchart mit End-Labels + Highlight + fester xDomain), `components/charts/DonutChart.tsx` (Visx-Pie, 1px-Lücken, HTML-Center-Overlay). Chart-Farben als Hex (Energie-Palette), damit sie auch im Embed ohne `--color-energy-*`-Vars färben.
- [x] Zwei echte Embed-Widgets (nach [[feedback_widget_convention]]): `/embed/strommix-anteil` (Kernenergie-Anteil am Verbrauchsmix inkl. Import, Donut; server-berechnet via `lib/strommix-ytd.ts` aus `energy_weekly`, 4 Kategorien SSOT) und `/embed/zubau-erneuerbare-atom` (Zubau EE vs. Atomkraft, Länder-Multitool wie Jahreswähler + DE↔China-Vergleich, KPI-Summen). Beide in `/energie-widgets`-Galerie + als iframe auf `/atomstrom-import`.
- [x] `/atomstrom-import`: Fakten-Check-FAQ (Pro-Atom/Contra-EE-Argumente, neutral, quellenbasiert) als `<details>`-Akkordeon (Kurzantwort fett + Erläuterung mit Glossar-Links), Inhalte in `faq-data.ts`, Rendering `FaqAccordion.tsx`; ein gemeinsames FAQPage-JSON-LD. Methodik-Block (Formel + zitierfähiger Baustein) ausgelagert auf `/atomstrom-import/methodik` (geteilte Live-Zahl/Formatter in `figure.ts`, beide ISR 3600). Glossar um 10 Energie-Begriffe erweitert (ARENH, Blackout, Dunkelflaute, Grenzkosten, Grundlastfähig, Kapazitätsmechanismus, Merit-Order, Redispatch, Residuallast, SAIDI).
- [x] Auto-Height für ALLE Embed-Widgets: `components/WidgetAutoHeight.tsx` (im `(embed)/layout.tsx`, meldet Content-Höhe per postMessage) + `lib/useIframeAutoHeight.ts` + `components/AutoHeightIframe.tsx` (Host passt iframe-Höhe an) → kein Leerraum unten mehr. Energie-Farbtokens `--color-energy-*` ins Embed-Layout ergänzt.
- [ ] Supabase-Tabellen anlegen (energy_timeseries, energy_monthly, data_source_meta) — SQL vorbereitet in /api/energy/setup
- [ ] Cron-Routes (live 15min, daily, monthly) + vercel.json
- [ ] Eurostat-Integration (Haushaltsstrompreise EU)
- [ ] Spotpreis-Chart (Energy-Charts /price)
- [ ] Grenzflüsse-Chart (Energy-Charts /cbpf)
- [x] EE-Ampel als Embed-Widget (`/embed/ee-ampel` + Galerie-Sektion): Ampel grün/gelb/rot nach aktuellem EE-Anteil am Erzeugungsmix (letzter vollständiger Datenpunkt via `trimIncompleteTail`, Ø 24 h via `calcPeriodStats` — dieselbe Datenbasis wie /strommix-deutschland, keine neue Quelle). Schwellen (≥65 % grün, <40 % rot) am typischen EE-Jahresmittel verankert, Ampelfarben fest semantisch. Einbindung auf Startseite/Simulation weiterhin offen
- [ ] /energie/frankreich (Strommix FR inkl. Kernenergie)
- [ ] Navigation-Updates (Hub + Header → /energie)
- [ ] SEO-Metadata für /energie

**MaStR-Datenpipeline (Anlagenstammdaten für Choropleth)**
- [x] Quellwechsel von open-MaStR (Zenodo, jährlich) auf BNetzA Gesamtdatenexport (monatlich)
- [x] `scripts/mastr-bnetza-refresh.ts` mit vier Phasen: `--download`, `--inspect`, `--aggregate`, `--upload`
- [x] XML-Streaming via `sax` + `iconv-lite` (UTF-16 → UTF-8), 3 GB ZIP wird nicht entpackt
- [x] URL-Resolver mit Datums-Fallback (heute → -7 Tage), Schema-Version via `BNETZA_SCHEMA_VERSION` env
- [x] Aggregation analog zur Zenodo-Pipeline: `(region_id × energietraeger × segment × jahr) → (count, kwp)`
- [x] GitHub Actions Workflow `mastr-refresh.yml`: monatlich am 5. um 04:00 UTC + manueller Trigger. Vercel-Cron geht nicht (Function-Timeout 10 s, 3 GB sprengt Edge)
- [x] Alte Zenodo-Pipeline (`scripts/mastr-refresh.ts`) bleibt als Fallback im Repo, ohne Auto-Trigger
- [x] Daten landen in `mastr_aggregates`/`mastr_regions`/`mastr_meta` (Schema unverändert), `data_as_of` aus dem ZIP-Stichtag

### Phase 4: Content & Reichweite
- [x] Flaggschiff-Ratgeber **`/lohnt-sich-pv-mit-speicher`**: Server Component (ISR 3600), rechnet die Beispieltabelle (10 kWp × 0/5/10 kWh: Investition, EV, Autarkie aus der Stundensimulation, Amortisation, 25-J-Gewinn) live mit den geteilten Funktionen (`calcEigenverbrauch`, `calc`, `estimateCost`, `simulatePvYear`) und Live-Marktpreisen — driftet nie vom Rechner. FAQ via `pvSpeicherFaq(prices)` in `lib/faq.ts` (bekommt die Live-Preise durchgereicht, damit FAQ und Tabelle auf derselben Seite identische Beträge zeigen) + `<Faq>` (FAQPage-JSON-LD). In Sitemap (0.8); Rechner-FAQ verlinkt hin.
  - Zwei **Beispiel-Teaser** (ohne / mit 10 kWh Speicher): recyceln die Rechner-`Chart`-Komponente (3-Szenarien-Amortisationskurve) + ResultStats-Kacheln (Amortisation / Rendite 25 J / ⌀ Ersparnis), gerechnet aus derselben `computeExample`-Quelle wie die Tabelle. Jeder Teaser hat einen Deep-Link `/photovoltaik-rechner?a=2&s=…&p=2&n=1&st=…&er=…`, der den Rechner exakt auf die Teaser-Zahlen vorbelegt (`st`/`er` explizit, weil der Rechner-Default-Strompreis 0,34 € vom kanonischen prices-config-Wert abweicht).
- [x] Ratgeber **`/lohnt-sich-pv-ohne-einspeiseverguetung`** (EEG-Reform 2027): gleiches Muster wie der Speicher-Ratgeber (ISR, live gerechnet, `pvOhneEinspeisungFaq` in `lib/faq.ts`, Teaser mit Deep-Link `eia=0` = Einspeise-3-State „Aus"). Reform-Aussagen als datierter Sachstand (`REFORM_STAND`, Entwurf ≠ beschlossen) — EEG-Wächter pflegt sie zusammen mit der Rechner-Notiz. Preis-Fetch der Guide-Seiten geteilt in `lib/prices-server.ts` (Speicher-Seite umgestellt).
- [ ] Weitere Long-Tail-Landingpages (z.B. `/pv-kaufen-vs-enpal-mieten`)
- [ ] "Vergleich: PV kaufen vs. Enpal mieten" als Killer-Content
- [ ] Blog/Ratgeber-Sektion

### Phase 5: Plattform (Horizont)

**WP 3: PV-Besitzer Tracking**
- [ ] "Meine Anlage" Profil (kWp, Speicher, Inbetriebnahme)
- [ ] Ist vs. Soll Vergleich (echte Erträge vs. PVGIS-Prognose)

**WP 4: Solateur-Widget**
- [ ] Embeddable Rechner (iframe/Web Component, White-Label)
- [ ] Lead-Funktion → geht an Solateur
- [ ] Solateur-Dashboard

**WP 6: Weitere Features**
- [ ] PDF-Export
- [ ] Finanzierungsrechner (Kredit vs. Eigenkapital)
- [ ] Community-Features

**WP 7: Mehrfamilienhaus-Rechner**
- [ ] MFH als Haustyp im Empfehlungs-Flow
- [ ] Abfrage Wohneinheiten
- [ ] Angepasstes Verbrauchsmodell (nicht "Personen im Haushalt")
- [ ] Mieterstrom-Thematik (Vergütung, Abrechnung)
- [ ] Andere Kostenstruktur (größere Anlagen)

Aktuelle Priorität: WP 9 (Energiedaten-Datalake) + Phase 4 (Content & Reichweite)

## Tech-Stack

| Komponente | Technologie | Warum |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | SEO-fähig, Vercel-Integration, erweiterbar für Content-Seiten |
| UI | **React 18 (Client Components)** | Interaktiver Rechner braucht Client-State |
| Styling | **Inline Styles + CSS Custom Properties** | Tokens in `lib/theme.ts`, injiziert als `:root` CSS-Variablen, referenziert via `v()` Helper |
| Fonts | **DM Sans + JetBrains Mono** | Google Fonts, geladen in layout.tsx |
| Deployment | **Vercel** | Zero-Config für Next.js, Preview Deployments |
| Backend | **Supabase** | Auth (Magic Link), PVGIS-Cache, Berechnungen speichern |
| PV-Ertrag | **PVGIS API** (EU JRC) | Standortspezifisch via Next.js API-Route, Supabase-Cache |
| Charts | **Visx** (@visx/*) | Low-level SVG-Primitives von Airbnb, volle Kontrolle über Look & Feel |
| Energiedaten | **Energy-Charts API** (Fraunhofer ISE) | Strommix, Preise, Kapazität — kein Auth, JSON, CC BY 4.0 |
| Package Manager | **npm** | Standard reicht bei dieser Projektgröße |

**Im Stack ergänzt (Audit Mai 2026):** **Vitest** als Test-Runner — Pure-Function-Coverage für die Berechnungs-Module. Component-Testing-Library bewusst noch nicht — kommt erst wenn die großen Client-Komponenten zerlegt werden.

**Bewusst nicht im Stack:** Tailwind, shadcn/ui, State Management Libraries, CSS-in-JS, Recharts/Nivo (zu wenig Kontrolle). Erst einführen wenn es einen konkreten Grund gibt.

## Projektstruktur

```
pv-rechner/
├── CLAUDE.md              # Dieses Dokument (Projekt-Kontext für Claude)
├── README.md              # Setup-Anleitung
├── package.json
├── next.config.js         # Env + Redirects (alte Share-URLs / → /rechner)
├── middleware.ts           # Supabase Auth Session-Refresh
├── .env.local             # SUPABASE_URL, SUPABASE_SERVICE_KEY, NEXT_PUBLIC_* (nicht in git)
├── .gitignore
├── public/
│   └── plz.json           # PLZ → [lat, lon] Lookup (8.298 Einträge, WZB plz_geocoord, Apache 2.0)
├── lib/
│   ├── constants.ts                # Alle Konstanten (ANLAGEN, SPEICHER, PERSONEN, NUTZUNG, HAUSTYPEN, DACHARTEN, etc.)
│   ├── prices-config.ts            # PriceConfig Interface + DEFAULT_PRICES (shared server/client)
│   ├── feedin-config.ts            # FeedInRates Interface + DEFAULT_FEED_IN (EEG-Vergütungssätze)
│   ├── co2-config.ts               # Co2PriceConfig + CO2_PRICE: CO2-Preispfad an absolute Kalenderjahre verankert (BEHG → ETS2), rollover-sicher
│   ├── heatpump-config.ts          # WP-Berechnungs-Config (Heizlast, JAZ, Invest, BEG-Förderung)
│   ├── feedin.ts                   # useFeedInRates() Client-Hook (fetcht /api/feedin, sessionStorage-Cache)
│   ├── prices.ts                   # usePrices() Client-Hook (fetcht /api/prices, sessionStorage-Cache)
│   ├── calc.ts                     # Pure Berechnungsfunktionen (EV, Amortisation, Kosten, URL-Helpers)
│   ├── consumption.ts              # Zentrales Verbrauchsmodell: WP/E-Auto/Klimaanlage Konstanten, Stundenprofile (BDEW/VDI 4655)
│   ├── simulation.ts               # Live-Simulation: PV-Momentanleistung aus Wetterdaten (NOCT-Modell)
│   ├── balkon-sim.ts               # GETEILTE Stunden-Jahressimulation (simulateSolarYear): Erzeugung/Verbrauch/Speicher Stunde für Stunde. Balkon UND Dach-PV nutzen sie
│   ├── balkon.ts + balkon-config.ts # Balkonkraftwerk-Rechner: Ertrag (Wechselrichter-Deckel) + Eigenverbrauch + Amortisation
│   ├── pv-sim.ts                   # Dach-PV: Autarkie + Jahresverlauf + Beispieltage aus der Stundensimulation (nicht aus dem Eigenverbrauch zurückgerechnet). Geld bleibt am Power-Law
│   ├── recommend.ts                # Empfehlungs-Algorithmus (optimale kWp + Speicher aus Haushalt + Dach)
│   ├── glossary.ts                 # Fachbegriff-Datensatz (15 Begriffe: short/long/aliases) + Slug-Lookup
│   ├── types.ts                    # CalcParams, CalculationRow, Konvertierung
│   ├── supabase-server.ts          # Supabase Server-Client mit Service Key
│   ├── supabase-browser.ts         # Supabase Browser-Client (@supabase/ssr)
│   ├── supabase-server-component.ts # Supabase Client für Server Components
│   ├── auth.ts                     # useUser() Hook, signIn/signOut Helpers
│   ├── theme.ts                    # Design-Tokens, CSS-Variablen-Generator, v() Helper
│   ├── energy-api.ts               # Datalake: Fetch-Wrapper, Timestamp-Normalisierung, Supabase-Upsert, Energy-Charts/Eurostat
│   ├── energy.ts                   # Client-Hooks: useGenerationMix(), useNuclearImport() (sessionStorage-Cache)
│   ├── chart-utils.ts              # Chart-Utilities: Energietyp-Farben, Formatter, Aggregation (calcPeriodStats)
│   ├── chart-export.ts             # PNG-Export: SVG→Canvas Rendering mit Branding, Stats, Legende
│   └── useChartExport.ts           # React-Hook für Chart-Export (Download, Share, WhatsApp, Twitter)
├── components/
│   ├── Header.tsx                 # Shared Header-Navigation (Logo links, Nav rechts)
│   ├── Logo.tsx                   # SVG-Logo + Text (solar-check.io)
│   ├── Icons.tsx                  # SVG-Icon-Bibliothek (16 Icons, stroke-basiert)
│   ├── OptionCard.tsx              # Auswahl-Karte (2×2 Grids, SVG-Icon-Mapping)
│   ├── TriToggle.tsx               # Dreier-Toggle (Nein/Geplant/Vorhanden, optionales Icon)
│   ├── InlineEdit.tsx              # Click-to-Edit Zahlenwert
│   ├── GlossaryTerm.tsx            # Fachbegriff-Tooltip (Portal) + GlossaryProvider (erste Erwähnung pro Seite)
│   ├── Chart.tsx                   # SVG-Amortisationskurve
│   ├── ChartExportBar.tsx          # Share/Download-Leiste unter Charts
│   ├── QuickSettings.tsx           # WP/E-Auto/Speicher Quick-Toggles (Ergebnis)
│   ├── ResultHeroCard.tsx          # Ergebnis Hero-Card mit editierbaren Werten
│   ├── ResultStats.tsx             # Rendite/Ersparnis Stats unter Hero
│   ├── ResultActions.tsx           # Methodik/Share/Save Buttons (Ergebnis)
│   ├── ErrorBoundary.tsx          # Error Boundary für fehlerhafte Share-URLs
│   └── charts/
│       ├── StackedAreaChart.tsx     # Visx Stacked Area (Strommix 24h/7d, smooth curves, Tooltip)
│       └── StackedBarChart.tsx      # Visx Stacked Bar (30d/YTD/12M/Max, wöchentlich aggregiert)
└── app/
    ├── layout.tsx                 # Root Layout: HTML, Fonts, SEO-Meta, CSS-Variablen
    ├── page.tsx                   # Tool-Hub: 3 Widget-Cards (Simulation / Rechner / Energie)
    ├── rechner/
    │   ├── page.tsx               # Error Boundary + <PVRechner />
    │   └── rechner.tsx            # "use client" — Rechner-Flow + Ergebnisseite
    ├── empfehlung/
    │   ├── page.tsx               # Metadata + <Empfehlung />
    │   └── empfehlung.tsx         # "use client" — Empfehlungs-Flow (3 Steps + Zwischenseite)
    ├── auth/callback/route.ts     # Magic Link Callback Handler
    ├── api/feedin/route.ts        # GET (aktuelle Vergütungssätze, cached) + POST (Admin-Update)
    ├── api/prices/route.ts        # GET (aktuelle Preise, cached) + POST (Admin-Update)
    ├── api/prices/scrape/route.ts # Vercel Cron: Scraping + Plausibilitätsprüfung
    ├── api/alert/route.ts         # POST (CRON_SECRET): generischer Wächter-Alert → Resend-Mail an ADMIN_EMAILS. Die scheduled-task-Wächter (CO2/EEG/WP/Förder) rufen ihn am Lauf-Ende; Report landet im Postfach statt nur in der App. dryRun=1 rendert ohne Senden.
    ├── api/pvgis/route.ts         # PVGIS API-Proxy mit Supabase-Cache
    ├── api/weather/route.ts       # Open-Meteo Proxy mit In-Memory-Cache (Live Simulation)
    ├── api/calculations/route.ts  # GET (Liste), POST (Speichern)
    ├── api/calculations/[id]/route.ts # GET, PUT, DELETE einzelne Berechnung
    ├── api/energy/generation/route.ts # Energy-Charts public_power Proxy + In-Memory-Cache + Downsampling + Supabase-Fallback für Max
    ├── api/energy/nuclear-import/route.ts # Kernimport-Berechnung: CBPF × Kernanteil der 6 Nachbarländer
    ├── api/energy/backfill/route.ts # Befüllt energy_weekly aus Energy-Charts (jahresweise, CRON_SECRET)
    ├── api/energy/setup/route.ts  # Einmalig: Supabase-Tabellen anlegen (energy_weekly etc.)
    ├── energie/
    │   ├── page.tsx               # Metadata + <EnergieClient />
    │   └── client.tsx             # Energiedaten-Dashboard: Widgets + Chart + Zeitraum-Toggle
    ├── dashboard/
    │   ├── page.tsx               # Server Component: Auth-Check + Daten laden
    │   └── client.tsx             # Client Component: Dashboard UI
    ├── admin/prices/
    │   ├── page.tsx               # Server Component: Admin-Guard + Preishistorie laden
    │   └── client.tsx             # Client Component: Scrape-Trigger, Manual-Form, Historie
    ├── admin/theme/
    │   ├── page.tsx               # Server Component: Admin-Email-Check + Redirect
    │   └── client.tsx             # Client Component: Design System Showcase
    ├── simulation/
    │   ├── page.tsx               # Metadata + Suspense + <LiveSimulation />
    │   └── simulation.tsx         # "use client" — Live PV Simulation (Wetter + Grid + Chart)
    ├── glossar/page.tsx           # Fachbegriff-Glossar (statisch, alle Begriffe + Langtexte, SEO)
    ├── methodik/page.tsx          # Berechnungsmethodik (statisch)
    ├── datenstand/page.tsx        # Öffentliche Werte-Übersicht: alle Annahmen mit Stand + Quelle, liest live aus denselben Quellen wie der Rechner (Supabase market_prices/feed_in_rates + Config-Module co2-config/heatpump-config/constants), ISR 3600 — driftet nie
    ├── impressum/page.tsx         # Impressum (statisch)
    └── datenschutz/page.tsx       # Datenschutzerklärung (statisch)
```

**Architektur:** Berechnungslogik, Konstanten und UI-Komponenten sind aus rechner.tsx extrahiert in lib/ und components/. Beide Flows (Rechner + Empfehlung) teilen sich dieselben Komponenten und Berechnungsfunktionen.

### Komponenten

| Komponente | Datei | Funktion |
|---|---|---|
| `Header` | `components/Header.tsx` | Shared Navigation (Logo links, Rechner + Auth rechts) |
| `Logo` | `components/Logo.tsx` | SVG-Icon + Text-Logo mit unique IDs |
| `Icons` | `components/Icons.tsx` | 16 SVG-Icons (stroke-basiert, `IconProps`-Interface) |
| `ErrorBoundary` | `app/rechner/page.tsx` | Fängt Render-Crashes ab, zeigt Fallback-UI |
| `PVRechner` | `app/rechner/rechner.tsx` | Rechner-Flow + Ergebnisseite |
| `Empfehlung` | `app/empfehlung/empfehlung.tsx` | Empfehlungs-Flow (3 Steps + Zwischenseite) |
| `OptionCard` | `components/OptionCard.tsx` | Auswahl-Karte für Steps (Icon-String → SVG-Mapping) |
| `TriToggle` | `components/TriToggle.tsx` | Dreier-Toggle mit optionalem SVG-Icon |
| `InlineEdit` | `components/InlineEdit.tsx` | Click-to-Edit Zahlenwert im Ergebnis |
| `Chart` | `components/Chart.tsx` | SVG-Amortisationskurve (3 Szenarien, kein D3) |

## Geteilte Rechen-Basis (alle Rechner) — BLOCKER

**Alle Rechner (PV, Wärmepumpe, Balkon, Klima, Simulation) rechnen auf derselben Grundlage.** Bevor du für einen Rechner eine Annahme triffst oder eine Konstante setzt: **prüfen, ob es die Größe hier schon gibt.** Eigene Fundamente sind der teuerste Fehler im Projekt — sie fallen erst auf, wenn die Ergebnisse zwischen den Rechnern auseinanderlaufen.

| Wofür | Kanonische Quelle | Typische Falle |
|---|---|---|
| **Standort-Ertrag** | `/api/pvgis` liefert `annual` **und `monthly`** (12 Werte, in Supabase gecacht) | Nur `annual` nehmen → Sommer/Winter existiert nicht mehr, Standort wirkt bei gedeckelten Anlagen gar nicht |
| **Stundenlast Haushalt** | `calcHourlyConsumption(household, hour, month)` + `HouseholdProfile` (`lib/consumption.ts`, BDEW H0 / VDI 4655) | Eigenes Lastprofil bauen |
| **Stunden-Jahressimulation** | `simulateSolarYear` (`lib/balkon-sim.ts`): Erzeugung/Verbrauch/Speicher Stunde für Stunde; Balkon + Dach-PV teilen sie | Eigene Dispatch-Schleife bauen |
| **Autarkie** | aus der Stundensimulation (`lib/pv-sim.ts → simulatePvYear`), NICHT aus dem Eigenverbrauch × Jahresbilanz zurückrechnen | Jahresbilanz → 100 % bei großen Anlagen; Wärmepumpen-Winter fehlt. Gegen HTW-Kennfeld validiert (`lib/__tests__/pv-sim.test.ts`, ±3 pp) |
| **Eigenverbrauch fürs GELD** | `calcEigenverbrauch` (HTW-Power-Law, `lib/calc.ts`) — bewusst NICHT die Simulation | Simulation hat bei Stundenauflösung leichten Optimismus-Bias → würde die Ersparnis schönen |
| **Tag/Nacht-Verhalten** | `tagQuote` (`NUTZUNG` in `lib/constants.ts`) | Eine eigene „Anwesenheits"-Größe erfinden |
| **Jahresverbrauch je Haushalt** | `PERSONEN` (`lib/constants.ts`) | Eigene kWh-Tabelle |
| **Strompreis + Anstieg** | `usePrices()` / `DEFAULT_PRICES` → `electricityPrice`, `electricityIncrease` (3 %/a) | Eigenen Preispfad annehmen oder „konstant" rechnen |
| **Szenarien** | `SCENARIOS` (`lib/constants.ts`, ±1/3/5 %) | Eigene Spannen |
| **CO₂-Preispfad** | `lib/co2-config.ts` | Eigene Pfad-Tabelle |
| **CO₂ Netzstrom** | `gridCo2PerKwh` (WP-/Klima-/Balkon-Config identisch) | Abweichender Faktor je Rechner |
| **Degradation / Laufzeit** | `DEGRAD`, `YEARS` (`lib/constants.ts`) | Eigene Werte |
| **Standort-Eingabe (UI)** | `components/StandortField.tsx` (PV-Rechner + Balkon) | Zweites PLZ-Feld bauen |
| **Marktpreise Hardware** | `market_prices` (gescrapt) → `usePrices()`, `useHeatpumpPrices()`; wo es keine Scrape-Quelle gibt: Config + Wächter-Runbook | Preise im Code verstreuen |

**Drei Fragen vor dem ersten Code eines Rechners/Modells:**
1. Welche Zeile der Tabelle trifft zu? → **benutzen**, nicht nachbauen.
2. Weiche ich bewusst ab? → **Grund als Kommentar in den Code**, nicht nur in den Kopf. (Legitim z. B.: Balkon-Eigenverbrauch ist ein anderer HTW-Datensatz als Dach-PV.)
3. **Welche Konstante rate ich hier gerade — und gibt es dafür im Projekt schon eine Quelle?**

**Warum das hier steht (Balkon-Rechner, Juli 2026):** Der Balkon-Rechner bekam ein eigenes Fundament — eigenes Eigenverbrauchs-Power-Law, eigener Clipping-Deckel, eigene Speicher-Konstanten, konstanter Strompreis, eigene „Anwesenheits"-Größe — obwohl PVGIS-Monatswerte, `calcHourlyConsumption` und der Preispfad längst existierten. Er holte die Monatswerte sogar von PVGIS ab **und warf sie weg**. Folge: Der Standort wirkte auf die Empfehlung gar nicht, Sommer/Winter gab es nicht, und sechs geratene Konstanten mussten von Hand kalibriert werden. Das fiel erst nach mehreren Runden Nutzer-Feedback auf. **Eine Konstante, die du kalibrierst, ist fast immer eine, die woanders schon hergeleitet ist.**

## Embed-Widgets (Energie-Widgets)

Einbettbare Widgets unter `app/(embed)/embed/*` (Strommix, Erzeugung Standard+Kompakt, Karte, Simulation, Kennzahl, EE-Ampel, **Förder-Check** = schlanker BEG-Wärmepumpen-Förderrechner mit Deep-Link in den vollen WP-Rechner; rechnet auf `calcBegSubsidy`, driftet nie). Galerie mit Live-Vorschau + Copy-Paste-Code: `app/(site)/energie-widgets`. **Alle Widgets sind auf einem Stand — beim Bauen eines neuen Widgets dieselbe Konvention einhalten:**

**Geteilte Bausteine (nicht neu erfinden):**
- `lib/useWidgetTheme.ts` — **einziger** Theming-Weg: `useWidgetTheme({ onSettings })`. Wendet Theme (URL-Param + same-origin postMessage) auf `--widget-*` an; `onSettings` liefert die funktionalen Flags. Keine inline-Kopien mehr.
- `lib/widget-settings.ts` — `WidgetSettings` (`share`, `range`, `switchable`, `embed`, `branding`). URL-Param **und** postMessage teilen sich denselben Parser (kein Drift, akzeptiert alle Ranges inkl. 24h).
- `lib/widget-theme.ts` + `app/(embed)/layout.tsx` — Theme-Tokens `--widget-*` + Alias-Kette auf die Site-Tokens `--color-*` (recycelte Komponenten themen dadurch mit).
- `components/ChartActionBar.tsx` — Aktionsleiste: `variant="bar"` (sichtbare Icon-Reihe Herunterladen·Teilen·Einbetten) für **breite UND mittelgroße/zweispaltige** Widgets; `variant="menu"` (⋯) **nur für die ganz kleinen** (Einzel-KPI, Karte), wo eine Reihe die Höhe sprengt (`menuUp` wenn im Footer). `showDownload={false}` wo kein Chart/SVG exportierbar ist (Karte, Kennzahl).
- **Quellenangabe (regulatorisch, dl-de/by-2-0 + CC BY 4.0):** sichtbarer Kurz-Credit **wo die Daten stehen** — reicht **einmal pro Seite** (globaler Seitenfuß, verlinkt Lizenz/`/datenstand`), NICHT unter jedem Block. Im **Embed** trägt das Widget seine Quelle selbst (Standalone) — **vertikal schlank an der rechten Kante** (`writing-mode: vertical-rl`, kompakte Kurzform Name + Lizenzkürzel, voller Text im `title`-Tooltip), **NIE als horizontaler Block** (wuchert über mehrere Zeilen = Fail). **Jedes exportierbare Bild** trägt die volle Quelle fest ein: ein `data-sc-export-only`-Fuß mit `<DataSourceNote plain>` (+ `PoweredBy`) ist im Web `display:none`, erscheint aber im PNG — so bleibt jede verteilte Kopie attribuiert, egal ob der Web-Credit sichtbar ist. Reiner Hover-Tooltip ohne sichtbaren Text ist NICHT ausreichend (fehlt in Screenshot/Druck/Mobil). Muster: `components/atlas/GemeindeWidgetShell.tsx` (+ `strommix-anteil` als bestehendes Beispiel für die vertikale Quelle).
- `components/PoweredBy.tsx` — **das** „Powered by solar-check.io" (Marken-Icon inklusive). Überall verwenden, nie inline nachbauen.
- Download/Teilen: `lib/useChartExport.ts` (composed Widget-Bild: Titel + Werte/Legende + Branding, ohne CTA; braucht eine SVG im `chartRef`).

**Konventionen:**
- **Theme = nur** Hintergrund/Text/Akzent/Highlight/Ecken/Schrift. Semantische Farben (grün=positiv, rot=negativ, Kategorie-/Energieträger-Farben) bleiben **fest** — nie an Theme-Token hängen.
- **Flags:** `embed=0` blendet den Einbetten-Button aus (setzt die Galerie auf ihren Vorschau-iframes; **nicht** im Copy-Paste-Code). `branding=0` blendet „Powered by" aus (interne Integrationen; extern = Premium, nie im Gratis-Code angeboten). Beide default `true`.
- **Teilen = aktueller Zustand** als Deep-Link auf die passende Live-Seite (z. B. `/strommix-deutschland?range=…`, `/pv-simulation?plz=…`).
- **Galerie:** neues Widget als Sektion in `SECTIONS` (`app/(site)/energie-widgets/client.tsx`); fixe Query-Params pro Variante über das `params`-Feld (nicht in `src` hängen — kollidiert mit `embed=0`/Theme). iframe-Höhe **großzügig** (Footer/2-zeilige Legende).
- **Recycling statt Neubau:** Startseite und Karten-Embed nutzen dieselbe `MastrHeroSection` (eine Ansicht, eine Quelle). Einzel-KPIs (`/embed/kennzahl`) recyceln die exportierte `Kachel`.
- **Quellenangabe (BLOCKER):** Jedes Widget, das externe Daten zeigt, trägt einen Quell-Credit — und zwar so, dass er auch im geteilten Bild überlebt:
  1. **Web-Credit über `DataSourceNote`** (`components/PoweredBy.tsx`) mit den Einträgen aus `lib/data-sources.ts` — **nie inline getippt** (driftet gegen die SSOT), einmal sichtbar wo die Daten stehen, **unabhängig vom `branding`-Flag** (branding gated nur „Powered by", nicht den Lizenz-Credit).
  2. **Exportierbares Widget** (Chart/SVG im `chartRef`) → ein `data-sc-export-only`-Fuß mit `<DataSourceNote … plain />` **+ `PoweredBy`** bäckt Quelle + Marke fest ins PNG; der Web-Fuß wird per `data-sc-export-ignore` aus dem Bild gedroppt (Mechanik: `captureNodeToBlob`/`buildExportSvg` in `lib/chart-export.ts`). Kein reiner Hover-Tooltip als Quelle.
  3. **Kein exportierbares SVG** (Karte, Kennzahl, Gemeinde-KPI) → `showDownload={false}`, Credit bleibt trotzdem sichtbar.
  4. **Neue Datenquelle** → zuerst als Eintrag in `lib/data-sources.ts` erfassen (Legal-Checkliste 1), dann rendern — nicht umgekehrt.
- **Kein Browser-Storage im Embed-Kontext (§ 25 TDDDG):** `lib/embed-context.ts → isEmbedContext()` — alle Cache-Hooks (`lib/energy.ts`, `lib/use-cached-fetch.ts`, `lib/prices.ts`, `lib/feedin.ts`) fallen unter `/embed/*` auf In-Memory-Maps zurück. Widgets sind gegenüber Einbettenden als „cookielos, kein Browser-Speicher" beworben — beim Bauen neuer Widgets nicht brechen.
- **Rechtliches:** Nutzungsbedingungen unter `/widget-nutzungsbedingungen` (aus Galerie verlinkt), Datenschutz-Textbaustein für Einbettende in der Galerie, `ChartActionBar` enthält einen branding-unabhängigen „Anbieter & Impressum"-Menüpunkt (§ 5 DDG).
- Icons/Buttons aus `components/Icons.tsx`.

## Modals — BLOCKER

**`components/Modal.tsx` ist DER Modal-Baustein. Modals werden nicht pro Stelle neu gebaut.** Die aufrufende Stelle liefert nur `open`, `onClose`, `title` (optional `intro`, `ariaLabel`, `maxWidth`) und den Inhalt als Children — das gesamte Verhalten kommt aus dem Baustein:

- **Desktop zentriert, schmale Bildschirme (≤ 640 px) als Bottom-Sheet**, das von unten einfährt (oben abgerundet, unten bündig).
- **Sanftes Ein- UND Ausblenden** (180 ms). Der Dialog bleibt bis zum Ende der Ausblende-Animation gemountet — wer ihn selbst mit `{x && <Modal …>}` aus dem Baum nimmt, killt genau diese Animation. Stattdessen `open={!!x}` und den Inhalt kurz halten (Muster: `FundingProgramModal` in `ResultFunding.tsx`). `prefers-reduced-motion` schaltet die Animation ab.
- **Höhe begrenzt, Inhalt scrollt INNEN** (`dvh`) — der Absenden-Knopf bleibt auf flachen Displays und bei eingeblendeter Tastatur erreichbar.
- **Schließen** per Escape, Klick daneben und ×. **Fokus** wandert beim Öffnen in den Dialog, bleibt per Tab-Falle darin und springt beim Schließen auf das auslösende Element zurück. Die Seite dahinter scrollt nicht mit. Gerendert per Portal an `document.body`.

**Die Fokus-Falle beim Nachbauen:** Der Mechanik-Effekt darf NICHT am `onClose`-Callback hängen (die Aufrufer übergeben eine frische Inline-Funktion pro Render) — sonst läuft sein Aufräumen mitten im Tippen und reißt den Fokus aus dem Eingabefeld. Deshalb `onCloseRef` + Effekt nur an `open`. Genau solche Details sind der Grund für den geteilten Baustein.

**Warum zentral (Juli 2026):** Es gab drei handgebaute Overlays (Klima-Detail, Energiefluss, Förderprogramm), die sich in Fokus-Rückgabe, Tab-Falle, Scroll-Sperre und Mobil-Verhalten unterschieden — dieselbe Streuung wie beim Header, bevor er ins Layout wanderte. Alle drei laufen jetzt über `Modal`. **Ausgenommen ist bewusst das Burger-Menü im Header** (`components/Header.tsx`): ein Navigations-Flyout, kein Dialog — es darf weder den Fokus fangen noch als Sheet einfahren.

## Design-System

| Element | Wert |
|---|---|
| Hintergrund | `#FFFFFF` (Light Theme) |
| Karten/Panels | `#FFFFFF` mit `#E9E9E9` Border |
| Input-Hintergrund | `#F8F8F8` mit `#E9E9E9` Border |
| Hero-Hintergrund | `#F1F6FE` (leichter Blauton) |
| Akzent (CTAs, interaktive Elemente) | `#1365EA` (Blau) |
| Akzent dunkel/hell | `#073C93` / `#6A9EF2` |
| Positiv (Rendite, Ersparnis) | `#00D950` (Grün) |
| Negativ / Pessimistisch | `#EF4444` (Rot) |
| Text primär | `#3F3F3F` |
| Text sekundär | `#777777` |
| Text muted | `#949494` |
| Labels (uppercase) | `#777777` |
| Font Text | DM Sans 400–800 |
| Font Zahlen | JetBrains Mono 400–700 |
| Layout | Mobile-first, Content max-width 480px zentriert, Header max-width 960px, Burger-Menu <768px |
| Border-Radius Cards | 14px |
| Border-Radius Buttons | 10–12px |
| Animation | fadeUp 0.3s ease-out bei Step-Wechsel |

**Semantisches Farbsystem:**
- **Blau** (`--color-accent`): Interaktive Elemente (Buttons, Toggles, editierbare Werte, Links, Hero-Zahl)
- **Grün** (`--color-positive`): Positive Werte (Rendite, Ersparnis, Einsparung)
- **Rot** (`--color-negative`): Negative Werte (Kosten, Verluste, Gas-Streichpreis)
- **Grau**: Neutrale Dimensionen (kWh, kWp, Prozent, Labels)

**CSS Custom Properties System:** Alle Design-Tokens in `lib/theme.ts` definiert, als `:root` CSS-Variablen in `layout.tsx` injiziert. Inline-Styles referenzieren Tokens via `v('--color-accent')` Helper. Für Whitelabeling: anderes Token-Set laden (z.B. `[data-theme="solateur-x"]` Overrides).

## SEO-Strategie

### Implementiert (Phase 0)
- Title: "PV Rechner – Lohnt sich Photovoltaik? Ehrlich berechnet."
- Meta Description mit Keywords
- OpenGraph Tags (Title + Description)
- Semantisches HTML in layout.tsx

### Geplant (Phase 1)
- Strukturierte Daten (JSON-LD: `FAQPage`, `WebApplication`)
- `sitemap.xml` + `robots.txt`
- OG-Image (generiert oder statisch)
- Canonical URLs

### Geplant (Phase 2)
Content-Seiten pro Long-Tail-Keyword als eigene Next.js-Seiten:
- `/lohnt-sich-pv-mit-speicher`
- `/pv-amortisation-berechnen`
- `/photovoltaik-eigenverbrauch-optimieren`
- `/pv-rechner-waermepumpe`
- `/pv-kaufen-vs-enpal-mieten` (Killer-Content gegen Leadfunnel-Anbieter)

### Keyword-Strategie
- **Head (langfristig, Enpal-dominiert):** "PV Rechner", "Photovoltaik Rechner"
- **Long-Tail (erreichbar):** "PV Rentabilität berechnen ohne Anmeldung", "Lohnt sich PV mit Speicher Rechner", "PV Eigenverbrauch Rendite"

## Befehle

```bash
npm install           # Dependencies installieren
npm run dev           # Dev-Server (localhost:3000, nutzt .next-dev/)
npm run build         # Production Build (prebuild räumt .next/ auf, nutzt .next/)
```

**Cache-Trennung:** Dev-Server und Build nutzen getrennte Output-Verzeichnisse (`distDir` in `next.config.js`):
- `npm run dev` → `.next-dev/` (NODE_ENV=development)
- `npm run build` → `.next/` (NODE_ENV=production, Vercel-kompatibel)
- `prebuild`-Script löscht `.next/` lokal vor jedem Build, **aber nicht auf Vercel**

Das verhindert "Cannot find module './XXX.js'" Fehler die auftreten wenn Dev-Server und Build sich `.next/` teilen.

**Wichtig:** `prebuild` prüft `process.env.VERCEL` und räumt nur lokal auf. Vercel restored `.next/cache/` (webpack, SWC, tsbuildinfo) aus dem Build-Cache vor dem Build — diesen Cache zu löschen verdoppelt die Build-Zeit und Kosten. Alte Version war `"prebuild": "rm -rf .next"`, das hat jeden Vercel-Build zum Cold Build gemacht.

## Deployment & Workflow

### Infrastruktur

| Komponente | URL / Status |
|---|---|
| Vercel (Production) | `solar-check.io` ✅ |
| Vercel (Preview) | `pv-rechner-alpha.vercel.app` |
| Domain-Registrar | All-Inkl |

### Domains

| Domain | Ziel | Branch |
|---|---|---|
| `solar-check.io` | Production (Hauptdomain) | `main` |
| `www.solar-check.io` | Redirect → `solar-check.io` | `main` |

### Entwicklungs-Workflow

1. **Lokal entwickeln** — `npm run dev` auf localhost:3000
2. **Auf `main` pushen** — `git push` → Vercel deployed automatisch auf solar-check.io

Branching-Strategie (develop/main) erst einführen wenn es einen Staging-Bedarf gibt.

### Env-Variablen

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase Projekt-URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymer Key
- `SUPABASE_SERVICE_KEY` — Supabase Service-Key (serverseitig)
- `ADMIN_EMAILS` — Kommaseparierte Admin-E-Mails (Zugang `/admin/theme`)
- Lokal: `.env.local` (in `.gitignore`)
- Vercel: Dashboard → Project → Settings → Environment Variables

### Vercel-Kostenoptimierungen (Stand Apr 2026)

Gesamt-Org hat vier Projekte (`pv-rechner`, `life-is-a-binge`, `growth-assistant`, `portfolios-katharina`). Der pv-rechner-Anteil an den Vercel-Kosten ist ~$8,50/Monat (~20% der Org-Kosten), davon ~$8,50 Build Minutes. Aktive Fixes:

1. **Build-Cache reaktiviert** — `prebuild` räumt `.next/` nur lokal auf (siehe oben). Spart ~40–60% Build-Zeit auf Vercel.
2. **Ignored Build Step** im Vercel Dashboard (Settings → Build and Deployment):
   ```sh
   bash -c 'if git rev-parse HEAD^ >/dev/null 2>&1; then git diff --quiet HEAD^ HEAD -- ":!*.md" ":!.claude/"; else exit 1; fi'
   ```
   Überspringt Builds für Commits, die nur `*.md`-Dateien oder `.claude/` ändern (~10% der Commits).
3. **Middleware-Matcher** auf `/dashboard`, `/admin`, `/api/calculations`, `/auth/callback` beschränkt — öffentliche Seiten werden statisch ausgeliefert und umgehen Edge Middleware Invocations.
4. **CDN-Cache-Header** auf `/api/weather` (s-maxage=900) und `/api/pvgis` (s-maxage=2592000) — die meisten Requests kommen aus dem Vercel-Edge-Cache statt Functions aufzurufen.

**Wichtig bei Kostenanalyse:** Im Vercel Usage-Dashboard immer nach Projekt filtern (`projectId`-URL-Parameter), sonst siehst du die Org-Gesamtzahlen und fixst das falsche Projekt.

## Hinweise

- Immer lauffähigen Code erzeugen — keine Pseudocode-Fragmente
- Wenn etwas unklar: fragen statt Annahmen treffen
- Lokal testen bevor du sagst es funktioniert
- `npm run build` muss durchlaufen bevor du sagst es ist fertig
- Commit-Messages auf Deutsch
- UI-Texte auf Deutsch
- Code und Variablennamen auf Englisch, außer Domänen-Begriffe (Eigenverbrauch, Einspeisevergütung, Strompreis etc.)
- **Chart-Entwicklung:** Vor jeder Chart-Änderung oder neuen Chart-Implementierung das Chart-Regelwerk in Memory lesen (`feedback_chart_conventions.md`). Dort sind alle Konventionen dokumentiert: Charttyp pro Zeitraum, einheitliche Einheiten, Tooltip-Struktur, Achsenbeschriftung, Export/Sharing, Caching-Architektur, Farb-Zuordnung.
- **Antworten an den Nutzer = Klartext, keine Code-Sprache.** Keine Dateipfade, keine Variablennamen, keine API-Namen im Erklärtext — übersetzen in das, was sie tun. Stichpunkte statt Textwand. Am Ende eine konkrete Frage. Code-Snippets gehören in den Code, nicht in die Antwort. Diese Regel steht ausführlich in der globalen CLAUDE.md unter "Klartext bei technischen Entscheidungen" und gilt hier 1:1.

## Workflow-Konventionen

### Pre-commit Hook — BLOCKER

`.githooks/pre-commit` ist versioniert und wird via `core.hooksPath`
aktiviert. Setup automatisch über `npm install` (postinstall-Script).
Der Hook blockt:

- jede `.env*`-Datei (auch `.env.test` o.Ä.)
- TypeScript-Fehler (`tsc --noEmit`) — fängt Module-not-found,
  falsche Imports, Typfehler ab, **bevor** der Commit landet.
- Test-Failures (`vitest run`) — fängt Regressionen in der
  Berechnungslogik (PV-Wirtschaftlichkeit, WP, Chart-Helpers) bevor
  sie zum Vercel-Build oder in den Browser durchschlagen.

**Browser-Smokes (Playwright)** laufen NICHT im Pre-commit (zu langsam,
~45s), sondern in GitHub Actions bei jedem PR und Push auf `main`. Sechs
End-to-End-Tests klicken die Hauptflows durch (Rechner, Wärmepumpe,
Empfehlung, Share-URL, Live-Simulation, Energie-Dashboard). Bei
Failure landet ein HTML-Report als Artifact am Workflow-Run.

Lokal manuell:
```
npm run test:e2e        # headless, list-Reporter
npm run test:e2e:ui     # interaktive Test-UI
```

**Worktree-Falle:** `core.hooksPath` muss **relativ** (`.githooks`)
gesetzt sein, sonst zeigt jeder Worktree auf das Hauptrepo statt
auf seinen eigenen Hook. Symptom: Hook-Updates im Worktree wirken
beim Commit nicht. Fix: `git config --worktree --unset core.hooksPath`
(falls absolut gesetzt) — der relative Wert in `.git/config` greift
dann automatisch und resolved pro Worktree korrekt.

**Warum der Hook existiert:** Beim Embed-Widget-PR sind nach `git mv`
Dateien geändert worden, aber nur die Renames waren staged. Lokaler
Build lief grün (Working-Tree korrekt), Vercel-Build fiel um, weil
der Commit selbst kaputt war. Mit Hook gilt: was committed wird,
ist auch type-clean — egal welcher Workflow vorher passierte.

**Hook deaktivieren** ist nicht erlaubt (`--no-verify`); wenn er
schlägt, ist der Commit kaputt. Fix vor Commit.

### Git-Workflow nach `git mv` — BLOCKER

`git mv` staged nur den Rename. Wenn die Datei danach **modifiziert**
wird (z. B. weil sich relative Imports beim Verschieben ändern),
muss die Modifikation **separat** mit `git add <datei>` gestaged
werden — sonst commitet Git nur den Rename, nicht den Inhalt.

Zeichen dass das passiert ist: `git status` zeigt nach `git mv`
plus Änderungen die Datei zweimal — einmal als `RM` (renamed,
modified) im Index, einmal als ` M` (modified, unstaged) im
Working-Tree. Den Pre-commit Hook fängt es trotzdem (TypeCheck
schlägt fehl), aber besser direkt richtig stagen.

### Session-Ende (automatisch vor jedem Commit)

Claude führt vor dem finalen Commit selbstständig folgende Prüfungen durch:

1. `npm run build` — Build muss sauber durchlaufen (Pre-commit Hook
   prüft zusätzlich `tsc --noEmit`, deckt aber nicht jeden Build-Fehler ab)
2. **Docs-Check:** Gab es strukturelle Änderungen (neue Features, geänderte Konventionen, neue Seiten, abgeschlossene Roadmap-Punkte)? Wenn ja → CLAUDE.md updaten. Nicht bei reinen Bugfixes.
3. **Kurzcheck auf offensichtliches Tech Debt:** Wurden temporäre Workarounds, auskommentierter Code oder TODOs hinterlassen? Wenn ja und schnell behebbar (< 5 Min) → direkt fixen. Wenn größer → als TODO-Kommentar mit Kontext.
4. **Immer pushen nach Commit:** `git push` nach jedem erfolgreichen Commit.

Der Nutzer muss nichts davon manuell triggern.

### Local-First-Merge: Kein Merge ohne Nutzer-Abnahme — BLOCKER

**Reihenfolge:** Code im Worktree-Branch → lokal Dev-Server → Nutzer
testet im Browser → Nutzer gibt OK → **erst dann** Push auf Branch
und Merge auf `main`.

Vercel ist Production. Ein kaputter Merge bedeutet kaputte Domain
und/oder fehlgeschlagene Vercel-Builds, die Build-Minutes kosten.
Type-Check und `npm run build` decken Compile-Fehler ab — aber
**nicht** UX-Bugs, falsche Berechnungen, hässliche Layouts oder
unintendierte Verhalten. Das fängt nur ein Mensch im Browser.

**Nach Code-Änderungen die im Browser sichtbar sind:**
1. Dev-Server starten (`preview_start` oder `npm run dev`).
2. Konkrete URL nennen, an der getestet werden kann.
3. **Auf das Go warten.** Nicht selbst entscheiden, dass es passt.
4. Erst danach `git push` + Merge auf `main`.

**Ausnahme:** Pure Infrastruktur-Commits ohne Browser-Auswirkung
(z. B. Hooks, Scripts, Docs, Workflow-Dateien) — die dürfen ohne
manuelle Abnahme gemerged werden, nachdem `tsc --noEmit` /
`npm run build` grün waren.

### Hotfix-Regel: Kein Multi-Step ohne Verify

Wenn ein Fix auf Production einen Folgefehler verursacht:
1. **Nicht sofort den nächsten Fix blind pushen.** Stattdessen: lokal reproduzieren oder zumindest den Build prüfen.
2. Bei Änderungen an `layout.tsx` oder anderen Dateien die jede Seite betreffen: Dev-Server starten, Seite laden, auf Fehler prüfen.

### Feature-Entwicklung: Kein Piecemeal

- **Nie** ein Feature über mehrere fix-Commits iterieren, wenn eine Vorab-Analyse es in einem Durchgang hätte lösen können
- Wenn nach einem Deploy ein Folgefehler auftaucht: **Erst alle zusammenhängenden Issues sammeln**, dann in einem Commit fixen — nicht Bug für Bug einzeln deployen
- Ausnahme: Echte unabhängige Bugs die erst durch Nutzertests sichtbar werden

### Kein Overengineering

- Keine Libraries einführen ohne konkreten Grund
- Keine Abstraktion die nur einen Anwendungsfall hat
- Kein CSS-Framework, kein State Management, keine Component Library — erst wenn es wehtut
- Erst aufteilen wenn es wehtut, nicht prophylaktisch

### Legal-Checkliste für Neuentwicklungen — BLOCKER

Lehren aus dem Legal-Audit 2026-07 (Details: Memory `project_legal_audit`). Vor dem Merge
jedes neuen Features die zutreffenden Punkte prüfen — sie sind der Grund, warum die Site
abmahnsicher ist, und jede Abkürzung reißt die Lücke wieder auf:

1. **Neue Datenquelle** → Lizenz klären und als Eintrag in `lib/data-sources.ts` erfassen
   (`license`, `licenseUrl`, ggf. `note` wie "Daten aggregiert" bei dl-de/by-2-0).
   `DataSourceNote`/`sourceLabel` überall rendern, wo die Daten sichtbar sind — auch im
   PNG-Export (`source`-Feld im Export-Context) und in Embeds (dort unabhängig vom
   branding-Flag). Quelle zusätzlich auf `/datenstand` listen.
2. **Neuer externer Dienst** → Fetches laufen über eigene API-Routen (Proxy), damit keine
   Nutzer-IP an Dritte geht. Muss der Browser doch direkt einen Dritt-Host kontaktieren
   (Ausnahmefall!): Datenschutzerklärung ergänzen + prüfen, ob Einwilligung nötig wird.
   Niemals Assets (Fonts, Skripte, Bilder) von Dritt-CDNs laden — self-hosten.
3. **Browser-Storage** → in Client-Hooks NIE direkt `localStorage`/`sessionStorage`,
   sondern immer `cacheStorage()` aus `lib/embed-context.ts` (hält Embeds storage-frei,
   § 25 TDDDG). Neuartige Speicherungen (mehr als Daten-Cache) in Datenschutzerklärung
   Abschnitt 7 erwähnen. Kein Tracking/Analytics ohne vorherige Consent-Prüfung;
   Custom Events (`lib/analytics.ts`) tragen NIE PLZ, Freitext oder Personenbezug.
4. **Neue Seite mit Zahlen/Geldbeträgen** → Unverbindlichkeits-Hinweis (Footer-Disclaimer
   deckt (site)-Seiten ab; Rechner-Ergebnisse und Förderbeträge brauchen zusätzlich
   Stand-Datum + "ohne Gewähr, verbindlich ist die offizielle Quelle"). Förder-/Steuer-
   Aussagen informieren, nie individuell beraten.
5. **Neues Embed-Widget** → Widget-Konvention (oben) einhalten: `PoweredBy`,
   `DataSourceNote` immer sichtbar, kein Browser-Storage, `ChartActionBar` (enthält den
   Impressum-Menüpunkt). Prüfen, ob der Datenschutz-Baustein in der Galerie
   (`/energie-widgets`) noch zutrifft (neue Datenflüsse?).
6. **E-Mail-Versand** → an Nutzer nur transaktional (Auth, angeforderte Funktion).
   Werbe-/Outreach-Mails NUR nach den Leitplanken in `docs/outreach-process-konzept.md`
   (§ 7 UWG: keine Kaltakquise, auch nicht B2B). Newsletter o. Ä. → Double-Opt-in +
   Datenschutzerklärung. Mail-Betreff/Header nie aus Freitext bauen (Allowlist-Muster
   wie `lib/contact-topics.ts`).
7. **Neue personenbezogene Daten** (Formularfelder, Account-Felder) → Datenschutzerklärung
   ergänzen (Zweck, Rechtsgrundlage, Empfänger, Speicherdauer); Eingaben serverseitig
   validieren + escapen; öffentliche POST-Endpoints mit Rate-Limit + Honeypot
   (Muster: `app/api/contact/route.ts`).
8. **Marketing-Claims** → absolute Aussagen ("keine …", "immer …", "100 %") gegen
   Datenschutzerklärung und Realität prüfen (§ 5 UWG Irreführung). Wettbewerber nicht
   herabsetzend nennen (§ 6 UWG). Keine ungeprüften Superlative.
9. **Erste Bezahlfunktion** (Premium-Embeds, Solateur-Leads) → VOR Launch: Open-Meteo auf
   API-Abo umstellen (Free-Tier = nur nicht-kommerziell), Widget-Nutzungsbedingungen zu
   echten AGB ausbauen, Impressum auf Rechtsform-/Registerpflichten prüfen.
10. **Unklarer Fall** → nicht raten: als offene Frage an den Betreiber geben (ggf. mit
    Empfehlung "anwaltlich absichern"). Signierte Verträge/AVVs liegen in `docs/legal/`
    (gitignored, nie committen).

Gesetzes-/Lizenz-Änderungen überwacht der Quartals-Wächter `solar-check-legal-waechter`
(scheduled-task): TDDDG/DDG/UWG-Änderungen, DPF-Status der US-Anbieter, Terms-Drift der
Datenquellen (Open-Meteo, Energy-Charts, MaStR, Ember).

### Wartungsfreier Code: Keine Hardcoded Daten/Jahre — BLOCKER

Was sich automatisch ändern sollte (Jahreszahlen, "aktuelle" Werte, "heute"-bezogene Defaults), darf **nicht** in Config oder als Konstante hardcoded werden — sonst bricht es still beim nächsten Rollover (Jahr, Quartal, Monat).

**Statt hardcoden:**
- **Im Code:** `new Date().getFullYear()` (oder analog für Monat/Quartal). Beispiel: `lib/constants.ts → YEAR` ist die Projektions-Startjahr-Konstante und wird zur Laufzeit ausgewertet, nicht statisch gesetzt.
- **In API-Routes:** Default-Param aus `new Date()` ableiten, statt Cron-Pfad mit `?year=2026` zu führen. Beispiel: `/api/energy/backfill` defaultet auf das aktuelle Jahr, der Vercel-Cron ruft den Pfad ohne Parameter.
- **In SEO-Strings (JSON-LD, Page-Titles, FAQs):** zur Render-Zeit interpolieren. `app/(site)/layout.tsx → buildFaqJsonLd()` als Beispiel.

**Wann Hardcoden OK ist:**
- **Dokument-Versionen** ("Stand: März 2026" in Datenschutz/Impressum) — soll mit Inhalt mitwachsen, NICHT autoupdaten.
- **Config-Snapshots als Fallback** (`lib/feedin-config.ts`, `lib/prices-config.ts`, `lib/heatpump-config.ts`, `lib/co2-config.ts`) — bewusste Stichtags-Datenstände, DB hat die Live-Werte. `validFrom` dort ist eine echte Datenherkunft, kein Renderdatum. `lib/co2-config.ts` verankert die CO2-Preise zusätzlich an **absolute** Kalenderjahre (nicht an Projektions-Offsets), damit die Jahr→Preis-Zuordnung beim Jahreswechsel nicht still verrutscht; `reviewBy` + Runbook `scripts/co2-preis-verify.md` erzwingen die jährliche Prüfung gegen offizielle Prognosen.
- **Historische Fakten** ("Kernenergie inländisch bis April 2023", "BWP Preisübersicht 2024") — passieren wirklich nur einmal.
- **Test-Fixtures** — deterministische Eingaben sind das Ziel.

**Faustregel:** Bevor du irgendwo eine Jahreszahl, ein Datum oder einen "aktuell"-Wert reinschreibst, frag dich: *Was passiert damit am 1. Januar nächstes Jahr?* Wenn die Antwort "ich muss dran denken, das anzupassen" ist → falsch. Wenn die Antwort "soll genau so bleiben, weil es ein Stichtag ist" → richtig.

**Doku statt Mahnmal:** Wenn ein Hardcode unvermeidbar ist (z. B. weil eine Library kein Date-API hat), kommt ein Inline-Kommentar in den Code, der erklärt warum. Kein "TODO 2027 anpassen" — das ist eine tickende Bombe ohne Wecker.
