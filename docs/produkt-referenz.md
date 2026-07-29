# Produkt- und Struktur-Referenz (Stand vor der CLAUDE.md-Kürzung)

Wortlaut aus CLAUDE.md, Stand 29.07.2026. Reine Referenz — Seitenbeschreibungen,
Berechnungs-Detailwerte, Ordnerbaum, Komponententabelle, SEO-Abschnitt und die
ausführliche Fassung des Design-System-Kapitels. In CLAUDE.md steht davon die
Kurzfassung plus alle Regeln; hier liegt der vollständige alte Text, damit kein
Detail verloren ist. **Achtung: driftet.** Verbindlich sind Code und Config —
insbesondere der Ordnerbaum war schon beim Auslagern in Teilen veraltet
(Route-Groups `(site)`/`(embed)` fehlten).


## Kernkonzept: Seiten, Flows, Berechnungslogik (alte Fassung)

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
                     ab 08/2026: Teileinspeisung 7,70 / 6,66 ct/kWh
                                 Volleinspeisung 12,22 / 10,24 ct/kWh
                     02–07/2026: Teileinspeisung 7,78 / 6,73 ct/kWh
                                 Volleinspeisung 12,34 / 10,35 ct/kWh
                     Gewichteter Mischsatz bei Anlagen >10 kWp
                     3-State: Aus / Teil / Voll (auto-berechnet, manuell überschreibbar)
                     Zahlung nur 20 Jahre (FEED_IN_YEARS): EEG-Garantie endet nach
                     20 J., danach 0 (Marktwert konservativ nicht angesetzt);
                     Eigenverbrauchs-Ersparnis läuft weiter. Ergebnis-Notiz +
                     FAQ-Eintrag zur geplanten EEG-Reform 2027 (Referentenentwurf,
                     Neuanlagen ab 2027; Bestandsschutz für ≤2026) — Notiz nur bei
                     aktiver Einspeisung; wächter-gepflegter Stichtags-Fakt
                     Quelle = lib/feedin-config.ts; die Supabase-Tabelle
                     feed_in_rates ist NICHT angelegt, daher ist die Config die
                     De-facto-Quelle. EEG degressiert 1%/Halbjahr (1.2. / 1.8.),
                     fest — deshalb liegt die Config als STICHTAGS-PLAN vor
                     (FEED_IN_SCHEDULE + feedInRatesFor()): der Wechsel passiert
                     am Stichtag von selbst, nicht erst beim nächsten Deploy.
                     Rechenregel: anzulegender Wert = Basiswert × 0,99^n auf 2
                     Stellen gerundet, minus 0,4 ct (§ 53 Abs. 1). Der
                     ungerundete Wert wird fortgeschrieben (§ 49 Abs. 1 S. 2) —
                     wer stattdessen den gerundeten Vergütungssatz degressiert,
                     verfehlt 11 amtliche Zellen (dort entsteht das kursierende
                     10,25 statt 10,24). Realitäts-Anker:
                     lib/__tests__/feedin-config.test.ts rechnet die Kette
                     unabhängig nach und hält sie gegen jedes veröffentlichte
                     Halbjahr. Wächter + Runbook scripts/eeg-verify.md.
                     Sätze, die aus dem Gesetz abgeleitet sind, BEVOR die
                     Bundesnetzagentur ihre (nur nachrichtliche) Liste
                     veröffentlicht, tragen `note` — sichtbarer Herkunfts-
                     Vorbehalt auf /datenstand — und nennen die Behörde NICHT
                     als Quelle. Beides fällt weg, sobald die Liste da ist.
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

## Projektstruktur und Komponenten (alte Fassung, in Teilen veraltet)

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

## Design-System (alte, ausführliche Fassung)

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

**Farb-Single-Source — BLOCKER:** Kein Grün (und generell keine Design-Farbe) wird als Hex-Literal getippt. `lib/theme.ts` ist die **einzige** Quelle. In CSS-Kontexten `v('--token')`; in CSS-losen Kontexten (OG-Bild via satori, Preis-Mail, Chart-Szenario-Configs) `tokens['--token']` importieren — nie neu tippen. Grund (Audit Juli 2026): Grün war an ~20 Stellen kopiert (u. a. der Ausreißer `#00A03C` nur in der Preis-Mail), driftete gegeneinander und ließ sich nicht zentral steuern. Bewusst fix bleibt einzig das Ampel-Grün der EE-Ampel (`ee-ampel/client.tsx`, per Konvention semantisch fest, darf dem Theme NICHT folgen). `lib/theme-v1.ts` (Alt-Token-Set) wurde gelöscht.

**Admin-Theming pro Helligkeitsstufe (`/admin/theme` → „Signalfarben-Theming"):** Das 7-stufige Tageslicht-Theme (s0 Nacht … s6 volle Sonne, `lib/theme.ts` + `theme-schedule.ts`) bleibt die berechnete Grundlage. Darüber liegt eine **Admin-Overlay-Schicht**: jede Signalfarbe (Positiv-Rolle Grün + **Negativ-Rolle Rot** + Energie-Rolle, Katalog `THEME_TOKENS` in `lib/theme-overrides.ts`) ist **pro Stufe einzeln** editierbar. Gespeicherte Overrides (Supabase `theme_overrides`, Single-Row-JSONB) werden im Site-Layout als zusätzliche `:root[data-theme="sN"]`-Blöcke **nach** Basis + Stufen-CSS injiziert (gewinnen per Source-Order, theme.ts bleibt unangetastet). Read gecacht (`getSavedThemeOverrides`, `unstable_cache` + Tag → 1 DB-Read pro Cache-Fenster, statische Seiten bleiben statisch), Refresh sofort via `revalidateTag` beim Speichern (`saveThemeOverrides`). Editor `app/(site)/admin/theme/GreenThemingEditor.tsx`: Stufen-Wähler → Live-Vorschau der Shades im echten Kontext (Rendite/Ersparnis-Kachel, Amortisationskurve, Energie-Strommix-Balken, **Tendenz-Badges** aus dem Solar-Atlas) in der gewählten Stufe + Farbregler pro Token. Save = admin-guarded `POST /api/theme` (sanitisiert: nur bekannte Tokens, nur Hex/rgba — der Wert wird CSS im `<head>`). Tabelle anlegen: `GET /api/theme/setup` (CRON_SECRET). Sichtbare UI folgt sofort; abgeleitete Bilder (OG, Mail, Embeds) ziehen beim nächsten Aufbau nach.

**Admin-Backend (`/admin`):** Geschützte Übersicht (gleicher `ADMIN_EMAILS`-Guard) mit Kacheln zu den internen Views (Grün-Theming, Marktpreise) — neue Admin-Seiten hier als Kachel ergänzen. Erreichbar über einen **„Admin"-Eintrag im Header**, der nur eingeloggten Admins erscheint. Die Admin-Erkennung läuft **client-seitig** über `useIsAdmin` (`lib/auth.ts`) → `GET /api/admin/status` (nur für eingeloggte Nutzer, pro Session gecacht), damit die öffentlichen Seiten **statisch bleiben** und die Admin-Mail-Liste nicht in den Browser wandert — bewusst NICHT im Layout auf `getUser()` prüfen (das würde jede Seite dynamisch machen).

**Abstands-Skala (`space` + `pad()` in `lib/theme.ts`):** Zahlen statt CSS-Variablen — wie `iconSizes`, weil Abstände in Inline-Styles stehen (`gap: space.md`, `padding: pad("lg", "xl")`). Stufen: 2 · 4 · 6 · 8 · 12 · 16 · 24 · 32 · 48. **10, 14, 18 und 28 gibt es bewusst nicht** — sie waren Drift, keine Absicht; wer sie brauchte, entscheidet sich sichtbar für die Stufe darunter oder darüber. Neue Komponenten setzen Abstände **nur** aus der Skala.
*Migrationsstand:* umgestellt sind Solar-Atlas-Gemeindeseite, Kommunen-Box + Kontakt-Einstieg, `Modal`, `ContactForm`/`ContactPerson`, `AtlasKpiRow`. Der Rest (Rechner-Flows, Energie-Seiten, Embed-Widgets) ist noch handgesetzt und wird stückweise nachgezogen — bewusst nicht in einem Rutsch, weil jede Rundung eine sichtbare Änderung ist.

**Header→Content-Abstand (`headerContentGap` + `--content-lede-top` in `lib/theme.ts`) — BLOCKER:** Der Abstand zwischen Header und Seiteninhalt kommt aus **einer** Quelle, nicht mehr aus jeder Seite einzeln. Früher brachte der Header einen `marginBottom:20` mit und **jede** Seite legte zusätzlich eigenes Top-Padding drauf (20/24/40/0 + innere Hero-`paddingTop`) — projektweit driftend, sichtbar 32–108px. Jetzt:
- **`headerContentGap`** (= `space.huge`, 48px) sitzt als unteres Padding des Header-Wrappers im `app/(site)/layout.tsx`. Der Header hat **kein** `marginBottom` mehr, und **keine** (site)-Seite setzt eigenes Top-Padding — Wurzel-Container tragen nur noch horizontales Gutter (16px) + Bottom. Gilt für alle Tool-/Daten-Seiten (Rechner, Startseite, Strommix, Atlas, Förderung, Simulation, …) einheitlich, Desktop **und** Mobile.
- **Lese-/Textseiten** (Ratgeber, Methodik, Glossar, Impressum, Datenschutz, Kontakt, Datenstand, `lohnt-sich-*`, Atomstrom, Nutzungsbedingungen) legen über die Basis noch `--content-lede-top` (Token, Desktop 48px → Total 96px; auf ≤640px per Media-Query 24px → Total 72px). Das ist die einzige zulässige Extra-Kopf-Luft und lebt ausschließlich in diesem Token, nicht als handgetippter `paddingTop` in den Seiten.
- **Neue (site)-Seite:** KEIN eigenes Top-Padding am Wurzel-Container setzen (der Gap kommt zentral). Lese-Seite → inneren Text-Wrapper mit `paddingTop: "var(--content-lede-top)"` versehen. Innere Hero-/Titel-Wrapper bekommen **kein** eigenes `paddingTop` (war die alte Drift-Quelle).

## SEO-Strategie (alte Fassung)

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
