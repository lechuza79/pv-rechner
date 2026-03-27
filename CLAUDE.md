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

### Zwei Flows, ein Ergebnis

**Startseite (`/`):** Hub mit 2 Optionen → Rechner oder Empfehlung

**Flow 1: Rechner (`/rechner`)** — "Ich kenne meine Anlage"
```
Step 0: Anlagengröße          → 5 / 8 / 10 / 15 kWp + "Anderer Wert" (2×2+1 Grid, OptionCard)
Step 1: Speicher               → Nein / 5 / 10 / 15 kWh (2×2 Grid, OptionCard)
Step 2: Haushalt               → Personen + Nutzungsprofil
Step 3: Großverbraucher        → WP + E-Auto (TriToggles)
→ Ergebnis (gleiche Seite)
```

**Flow 2: Empfehlung (`/empfehlung`)** — "Was passt zu mir?"
```
Step 0: Haushalt               → Personen + Nutzungsprofil
Step 1: Großverbraucher        → WP + E-Auto (mit Erklärtext warum relevant)
Step 2: Dach                   → Haustyp (4 Typen) + Dachart (4 Typen) + opt. Budget
→ Zwischenseite: Empfehlung + Warum + Alternativen
→ Ergebnis (auf /rechner, mit "Warum diese Anlage?"-Sektion)
```

**Gemeinsame Ergebnisseite:**
```
Hero-Card: Amortisation + editierbares Grid
Quick Settings: WP, E-Auto, Speicher
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
Extra-Verbrauch  = WP→+3500 kWh, E-Auto→Laufleistung×0.18 kWh (Default 15.000 km/a)

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
Preise werden monatlich via Cron von solaranlagen-portal.com gescrapt
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
Einspeisevergütung:  8,03 ct/kWh default, fix 20 Jahre, abschaltbar per Toggle
Szenarien:           Strompreis +1% / +3% / +5% p.a.
EV-Delta:            −5% / 0% / +5% pro Szenario
```

### InlineEdit-Komponente

Click-to-Edit-Pattern. Wert wird als Text mit gestrichelter Unterstreichung angezeigt (Affordance), Klick öffnet Input, Enter/Blur committed, Escape bricht ab. **Kein `type="number"`** (Bug-anfällig bei Dezimalwerten), sondern Text-Input mit manueller Validierung. **Deutsche Zahlenformatierung:** Display nutzt `toLocaleString("de-DE")` (Komma als Dezimaltrenner, Punkt als Tausendertrenner). Eingabe akzeptiert Komma und Punkt — Tausenderpunkte werden entfernt, Dezimalkomma zu Punkt konvertiert.

## Aktueller Fokus: Phase 1 — Live & SEO-Basics

### Phase 0 ✅ MVP (done)
- [x] 4-Step-Flow (Anlage → Speicher → Haushalt → Großverbraucher)
- [x] Ergebnis mit 3-Szenarien-Chart (SVG)
- [x] Editierbare Annahmen im Hero (InlineEdit)
- [x] Einspeisevergütung An/Aus-Toggle
- [x] Auto-Kostenberechnung aus kWp + Speicher
- [x] Auto-Eigenverbrauchsberechnung aus Haushaltsdaten
- [x] Next.js Projekt mit SEO-Meta + OpenGraph

### Phase 1: In Arbeit
- [x] Domain solar-check.io + Vercel Deployment
- [x] Strukturierte Daten (JSON-LD: FAQPage, WebApplication)
- [x] sitemap.xml + robots.txt (inkl. /impressum, /datenschutz)
- [ ] Favicon / OG-Image
- [x] Share-Funktion: Ergebnis als URL teilbar (Query-Parameter, Clipboard, Native Share, WhatsApp)
- [x] Google Search Console einrichten
- [x] TypeScript strict mode + vollständige Typisierung
- [x] Input-Validierung für Share-URL-Parameter (NaN/Infinity/Bounds)
- [x] Error Boundary für fehlerhafte Share-URLs (Fallback-UI statt Whitescreen)
- [x] Impressum + Datenschutz Seiten mit Footer-Links

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

**WP 2: Empfehlungs-Flow ✅ (done)**
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

**WP 8: Automatische Marktpreise ✅ (done)**
- [x] Supabase-Tabelle `market_prices` (Preishistorie, RLS)
- [x] Monatlicher Vercel Cron: Scraping von solaranlagen-portal.com (`/api/prices/scrape`)
- [x] Plausibilitätsprüfung (Grenzen + max. 30% Abweichung)
- [x] `estimateCost()` mit dynamischem `PriceConfig`-Parameter
- [x] `usePrices()` Client-Hook (sessionStorage-Cache)
- [x] Methodik-Seite zeigt aktuelle Preise + "Stand: Monat/Jahr"
- [x] Admin-UI `/admin/prices` (Scrape-Trigger, manuelles Override, Historie)
- [x] Preise aktualisiert auf Q1/2026 Marktpreise

### Phase 4: Content & Reichweite
- [ ] 3–5 Long-Tail-Landingpages (z.B. `/lohnt-sich-pv-mit-speicher`)
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

Aktuelle Priorität: Phase 4 (Content & Reichweite)

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
| Package Manager | **npm** | Standard reicht bei dieser Projektgröße |

**Bewusst nicht im Stack:** Tailwind, shadcn/ui, State Management Libraries, CSS-in-JS, Testing Framework. Erst einführen wenn es einen konkreten Grund gibt.

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
│   └── plz.json           # PLZ → [lat, lon] Lookup (8.298 Einträge, CC BY 4.0)
├── lib/
│   ├── constants.ts                # Alle Konstanten (ANLAGEN, SPEICHER, PERSONEN, NUTZUNG, HAUSTYPEN, DACHARTEN, etc.)
│   ├── prices-config.ts            # PriceConfig Interface + DEFAULT_PRICES (shared server/client)
│   ├── prices.ts                   # usePrices() Client-Hook (fetcht /api/prices, sessionStorage-Cache)
│   ├── calc.ts                     # Pure Berechnungsfunktionen (EV, Amortisation, Kosten, URL-Helpers)
│   ├── consumption.ts              # Zentrales Verbrauchsmodell: WP/E-Auto Konstanten, Stundenprofile (BDEW/VDI 4655)
│   ├── simulation.ts               # Live-Simulation: PV-Momentanleistung aus Wetterdaten (NOCT-Modell)
│   ├── recommend.ts                # Empfehlungs-Algorithmus (optimale kWp + Speicher aus Haushalt + Dach)
│   ├── types.ts                    # CalcParams, CalculationRow, Konvertierung
│   ├── supabase-server.ts          # Supabase Server-Client mit Service Key
│   ├── supabase-browser.ts         # Supabase Browser-Client (@supabase/ssr)
│   ├── supabase-server-component.ts # Supabase Client für Server Components
│   ├── auth.ts                     # useUser() Hook, signIn/signOut Helpers
│   └── theme.ts                    # Design-Tokens, CSS-Variablen-Generator, v() Helper
├── components/
│   ├── Header.tsx                 # Shared Header-Navigation (Logo links, Nav rechts)
│   ├── Logo.tsx                   # SVG-Logo + Text (solar-check.io)
│   ├── Icons.tsx                  # SVG-Icon-Bibliothek (16 Icons, stroke-basiert)
│   ├── OptionCard.tsx              # Auswahl-Karte (2×2 Grids, SVG-Icon-Mapping)
│   ├── TriToggle.tsx               # Dreier-Toggle (Nein/Geplant/Vorhanden, optionales Icon)
│   ├── InlineEdit.tsx              # Click-to-Edit Zahlenwert
│   ├── Chart.tsx                   # SVG-Amortisationskurve
│   └── ErrorBoundary.tsx          # Error Boundary für fehlerhafte Share-URLs
└── app/
    ├── layout.tsx                 # Root Layout: HTML, Fonts, SEO-Meta, CSS-Variablen
    ├── page.tsx                   # Hub-Startseite: 2 Flows (Empfehlung / Rechner)
    ├── rechner/
    │   ├── page.tsx               # Error Boundary + <PVRechner />
    │   └── rechner.tsx            # "use client" — Rechner-Flow + Ergebnisseite
    ├── empfehlung/
    │   ├── page.tsx               # Metadata + <Empfehlung />
    │   └── empfehlung.tsx         # "use client" — Empfehlungs-Flow (3 Steps + Zwischenseite)
    ├── auth/callback/route.ts     # Magic Link Callback Handler
    ├── api/prices/route.ts        # GET (aktuelle Preise, cached) + POST (Admin-Update)
    ├── api/prices/scrape/route.ts # Vercel Cron: Scraping + Plausibilitätsprüfung
    ├── api/pvgis/route.ts         # PVGIS API-Proxy mit Supabase-Cache
    ├── api/weather/route.ts       # Open-Meteo Proxy mit In-Memory-Cache (Live Simulation)
    ├── api/calculations/route.ts  # GET (Liste), POST (Speichern)
    ├── api/calculations/[id]/route.ts # GET, PUT, DELETE einzelne Berechnung
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
    ├── methodik/page.tsx          # Berechnungsmethodik (statisch)
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
| Layout | Mobile-first, max-width 480px, zentriert |
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
npm run dev           # Dev-Server (localhost:3000)
npm run build         # Production Build
```

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

## Hinweise

- Immer lauffähigen Code erzeugen — keine Pseudocode-Fragmente
- Wenn etwas unklar: fragen statt Annahmen treffen
- Lokal testen bevor du sagst es funktioniert
- `npm run build` muss durchlaufen bevor du sagst es ist fertig
- Commit-Messages auf Deutsch
- UI-Texte auf Deutsch
- Code und Variablennamen auf Englisch, außer Domänen-Begriffe (Eigenverbrauch, Einspeisevergütung, Strompreis etc.)

## Workflow-Konventionen

### Session-Ende (automatisch vor jedem Commit)

Claude führt vor dem finalen Commit selbstständig folgende Prüfungen durch:

1. `npm run build` — Build muss sauber durchlaufen
2. **Docs-Check:** Gab es strukturelle Änderungen (neue Features, geänderte Konventionen, neue Seiten, abgeschlossene Roadmap-Punkte)? Wenn ja → CLAUDE.md updaten. Nicht bei reinen Bugfixes.
3. **Kurzcheck auf offensichtliches Tech Debt:** Wurden temporäre Workarounds, auskommentierter Code oder TODOs hinterlassen? Wenn ja und schnell behebbar (< 5 Min) → direkt fixen. Wenn größer → als TODO-Kommentar mit Kontext.
4. **Immer pushen nach Commit:** `git push` nach jedem erfolgreichen Commit.

Der Nutzer muss nichts davon manuell triggern.

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
