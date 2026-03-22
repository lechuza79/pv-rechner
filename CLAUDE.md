# CLAUDE.md – PV Rechner

## Deine Rolle

Du bist ein pragmatischer Senior Full-Stack Engineer mit Erfahrung im Aufbau von Consumer-Web-Produkten die als einfaches Tool starten und zu einer Plattform wachsen. Du schreibst Production-Grade Code: typsicher, gut strukturiert, mit sauberer Fehlerbehandlung. Du denkst in Systemen — jede Entscheidung berücksichtigt wohin das Produkt sich entwickeln könnte, ohne heute schon alles zu bauen. Pragmatisch: Shipping schlägt Perfektion, aber du nimmst keine Abkürzungen bei UX und Berechnungsgenauigkeit.

Du arbeitest mit einem UX-Architekten zusammen, der technisch mitdenken kann, aber kein Entwickler ist. Erkläre technische Entscheidungen kurz und klar. Wenn du etwas anders löst als angefragt, begründe warum. Gib direkte, konstruktive Kritik — nicht alles abnicken. Wenn eine Feature-Idee zum jetzigen Zeitpunkt zu früh ist, sag es und erkläre was die Voraussetzung wäre.

**Wichtig:** Der Nutzer führt keine CLI-Befehle aus — Claude übernimmt alle Terminal-Operationen selbst (`npm`, `git`, etc.). Deployments laufen automatisch via git push → Vercel. Kein localhost nötig für den Nutzer — Claude testet lokal und pusht wenn es passt.

**Architektur-Mindset:** Das Projekt startet als rein clientseitige Single-Page-App ohne Backend. Aber die Richtung ist klar: Gespeicherte Berechnungen, Nutzer-Accounts, personalisierte Dashboards, Community-Features sind denkbar. Architekturentscheidungen sollen diese Evolution nicht verbauen — aber auch nichts vorbauen was noch nicht gebraucht wird. Konkretes Beispiel: Berechnung heute als Pure Function, nicht als fest verdrahtete UI-Logik → lässt sich morgen problemlos serverseitig oder in einer API wiederverwenden.

## Projektüberblick

"PV Rechner" ist ein kostenloser PV-Rentabilitätsrechner ohne Leadfunnel. Nutzer beantworten 4 Fragen und bekommen sofort ein Ergebnis mit Amortisationschart und Szenariovergleich. Alle Berechnungsannahmen sind im Ergebnis transparent editierbar.

**Differenzierung:** Enpal, Klarsolar, Check24 etc. zeigen Ergebnisse erst nach Lead-Erfassung (Name, Telefon, E-Mail). Wir liefern sofort — keine Datensammlung, kein Vertriebskontakt, keine Werbung.

**Zielgruppe:** Menschen die über PV nachdenken und einen schnellen, ehrlichen Realitätscheck wollen. Sekundär: PV-Besitzer die ihre Investition nachrechnen wollen.

## Kernkonzept

### User Flow: 4 Schritte → Ergebnis

```
Step 0: Anlagengröße          → 5 / 8 / 10 / 15 kWp + "Anderer Wert" (2×2+1 Grid, OptionCard)
                                 Bei "Anderer Wert": freie kWp-Eingabe (1–50)
Step 1: Speicher               → Nein / 5 / 10 / 15 kWh (2×2 Grid, OptionCard)
Step 2: Haushalt               → Personen (1/2/3–4/5+, 4×1 Buttons)
                                 + Nutzungsprofil (weg/teils/home/immer, 2×2 OptionCards)
Step 3: Großverbraucher        → Wärmepumpe + E-Auto (je TriToggle: Nein/Geplant/Vorhanden)
                                 Bei E-Auto aktiv: Laufleistung (10k/15k/20k/custom km)
─────────────────────────────────
Ergebnis:
  Hero-Card:
    - Große Amortisationszahl ("X Jahren")
    - Editierbares 2×3 Grid: Investition, Eigenverbrauch, Strompreis,
      Einspeisevergütung (mit An/Aus-Toggle), spez. Ertrag, Anlageninfo
    - Hint: "Werte anklicken zum Anpassen"
  Quick Settings: "Was wäre wenn?" Toggle-Chips (WP, E-Auto, Speicher)
    - E-Auto zeigt Laufleistung-Presets (10k/15k/20k + custom)
  Stats: Rendite 25J + ⌀ Ersparnis/Jahr (2×1 Grid)
  Chart: SVG-Amortisationskurve mit 3 Szenarien
  Szenario-Pills: Pessimistisch / Realistisch / Optimistisch
  Methodik-Hinweis
  Neu-Berechnen-Button
  Footer: Keine Datensammlung · Keine Werbung · Disclaimer
```

### Berechnungslogik

**Eigenverbrauch (automatisch berechnet, manuell überschreibbar):**
```
Grundverbrauch   = f(Personen): 1→1800, 2→2800, 3–4→3800, 5+→5000 kWh/a
Tagquote         = f(Nutzung): weg→20%, teils→30%, home→40%, immer→50%
Extra-Verbrauch  = WP→+3500 kWh, E-Auto→Laufleistung×0.18 kWh (bei "ja" oder "geplant", Default 15.000 km/a)
Speicher-Boost   = min(kWh × 200, Jahresertrag × 0.25)
Eigenverbrauch   = min(Direktverbr. + Boost, Gesamtverbrauch, Ertrag × 90%)
Ergebnis: 10–90%, gerundet
```

**Kostenschätzung (automatisch, manuell überschreibbar):**
```
PV:       ≤10 kWp → 1.500 €/kWp, >10 kWp → 1.350 €/kWp (über 10)
Speicher: 2.000 € Basis + 650 €/kWh
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

Click-to-Edit-Pattern. Wert wird als Text mit gestrichelter Unterstreichung angezeigt (Affordance), Klick öffnet Input, Enter/Blur committed, Escape bricht ab. **Kein `type="number"`** (Bug-anfällig bei Dezimalwerten), sondern Text-Input mit manueller Validierung. Komma-Eingabe wird zu Punkt konvertiert.

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
- [ ] Domain registrieren + Vercel Deployment
- [x] Strukturierte Daten (JSON-LD: FAQPage, WebApplication)
- [x] sitemap.xml + robots.txt (inkl. /impressum, /datenschutz)
- [ ] Favicon / OG-Image
- [x] Share-Funktion: Ergebnis als URL teilbar (Query-Parameter, Clipboard, Native Share, WhatsApp)
- [x] Google Search Console einrichten
- [x] TypeScript strict mode + vollständige Typisierung
- [x] Input-Validierung für Share-URL-Parameter (NaN/Infinity/Bounds)
- [x] Error Boundary für fehlerhafte Share-URLs (Fallback-UI statt Whitescreen)
- [x] Impressum + Datenschutz Seiten mit Footer-Links

### Phase 2: Content & Reichweite (geplant)
- [ ] 3–5 Long-Tail-Landingpages (z.B. `/lohnt-sich-pv-mit-speicher`)
- [ ] "Vergleich: PV kaufen vs. Enpal mieten" als Killer-Content
- [ ] Blog/Ratgeber-Sektion

### Phase 3: Produkt-Erweiterung (Horizont)
- [ ] Gespeicherte Berechnungen (→ Accounts, Supabase)
- [ ] "Meine Anlage tracken" für PV-Besitzer
- [ ] Standort-basierter Ertrag (PLZ → spezifischer Ertrag)
- [ ] PDF-Export des Ergebnisses
- [ ] Finanzierungsrechner (Kredit vs. Eigenkapital)
- [ ] Community-Features (Erfahrungsberichte, Vergleiche)

Baue nur was in der aktuellen Phase steht. Wenn eine Architekturentscheidung spätere Phasen betrifft, kurz ansprechen.

## Tech-Stack

| Komponente | Technologie | Warum |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | SEO-fähig, Vercel-Integration, erweiterbar für Content-Seiten |
| UI | **React 18 (Client Components)** | Interaktiver Rechner braucht Client-State |
| Styling | **Inline Styles** | Bewusst kein Tailwind — Projekt zu klein, harte Farbwerte |
| Fonts | **DM Sans + JetBrains Mono** | Google Fonts, geladen in layout.tsx |
| Deployment | **Vercel** | Zero-Config für Next.js, Preview Deployments |
| Backend | **Keins (Phase 0–2)** | Alles clientseitig. Supabase kommt wenn Accounts nötig (Phase 3) |
| Package Manager | **npm** | Standard reicht bei dieser Projektgröße |

**Bewusst nicht im Stack:** Tailwind, shadcn/ui, State Management Libraries, CSS-in-JS, Testing Framework. Erst einführen wenn es einen konkreten Grund gibt.

## Projektstruktur

```
pv-rechner/
├── CLAUDE.md              # Dieses Dokument (Projekt-Kontext für Claude)
├── README.md              # Setup-Anleitung
├── package.json
├── next.config.js
├── .gitignore
├── public/                # Statische Assets (Favicon, OG-Image — TODO)
└── app/
    ├── layout.tsx         # Root Layout: HTML, Fonts (DM Sans + JetBrains Mono), SEO-Meta
    ├── page.tsx           # Einstiegspunkt, Error Boundary + <PVRechner />
    ├── rechner.tsx        # "use client" — Hauptkomponente, gesamte Logik + UI
    ├── impressum/page.tsx # Impressum (statisch)
    └── datenschutz/page.tsx # Datenschutzerklärung (statisch)
```

**Single-File-Architektur:** `rechner.tsx` enthält alles (~590 Zeilen). Erst aufteilen wenn die Datei unübersichtlich wird. Wenn aufgeteilt wird:
- Berechnungslogik → `lib/calc.ts` (Pure Functions)
- UI-Komponenten → `components/`
- Konstanten/Config → `lib/constants.ts`

### Komponenten in rechner.tsx

| Komponente | Datei | Funktion |
|---|---|---|
| `ErrorBoundary` | `page.tsx` | Fängt Render-Crashes ab, zeigt Fallback-UI mit Neu-Berechnen-Link |
| `PVRechner` | `rechner.tsx` | Hauptkomponente, State, Flow-Steuerung |
| `OptionCard` | `rechner.tsx` | Auswahl-Karte für Steps (2×2 Grids) |
| `TriToggle` | `rechner.tsx` | Dreier-Toggle: Nein / Geplant / Vorhanden (WP + E-Auto) |
| `InlineEdit` | `rechner.tsx` | Click-to-Edit Zahlenwert im Ergebnis |
| `Chart` | `rechner.tsx` | SVG-Amortisationskurve mit 3 Szenarien (rein deklarativ, kein D3) |

## Design-System

| Element | Wert |
|---|---|
| Hintergrund | `#0c0c0c` |
| Karten/Panels | `#151515` mit `#252525` Border |
| Input-Hintergrund | `#161616` mit `#2a2a2a` Border |
| Akzent (positiv, CTAs, Auswahl) | `#22c55e` |
| Akzent gedimmt | `rgba(34,197,94,0.1)` |
| Negativ / Pessimistisch | `#ef4444` |
| Optimistisch | `#3b82f6` |
| Text primär | `#f0f0f0` |
| Text sekundär | `#888` |
| Text muted | `#555`–`#666` |
| Labels (uppercase) | `#777`–`#999` |
| Font Text | DM Sans 400–800 |
| Font Zahlen | JetBrains Mono 400–700 |
| Layout | Mobile-first, max-width 480px, zentriert |
| Border-Radius Cards | 14px |
| Border-Radius Buttons | 10–12px |
| Animation | fadeUp 0.3s ease-out bei Step-Wechsel |

Kein CSS-Variablen-System — harte Werte im Code. Wenn das Projekt Theming braucht (z.B. Light Mode), dann CSS-Variablen einführen.

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
| GitHub | Repo anlegen (TODO) |
| Vercel (Production) | Domain verbinden (TODO) |
| Domain | Noch nicht registriert |

### Domains (geplant)

| Domain | Ziel | Branch |
|---|---|---|
| `www.[domain].de` | Production | `main` |
| `[domain].de` | Redirect → www | `main` |

Staging-Umgebung erst einführen wenn es Testnutzer oder ein Backend gibt (Phase 3).

### Entwicklungs-Workflow

1. **Lokal entwickeln** — `npm run dev` auf localhost:3000
2. **Auf `main` pushen** — `git push` → Vercel deployed automatisch
3. **Domain verbinden** wenn registriert (Vercel → Settings → Domains)

Branching-Strategie (develop/main) erst einführen wenn es einen Staging-Bedarf gibt.

### Env-Variablen

Aktuell keine — alles clientseitig. Wenn APIs oder Supabase dazukommen:
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
