# Roadmap-Archiv — abgeschlossene Phasen und Arbeitspakete

Wortlaut aus CLAUDE.md, Stand 29.07.2026. Diese Liste ist Archiv: Was hier abgehakt
steht, steht im Code. Offene Punkte leben weiter in CLAUDE.md unter „Roadmap: offene
Punkte" — nur dort werden sie gepflegt. Ausgelagert bei der CLAUDE.md-Kürzung
(siehe `docs/claude-md-kuerzung.md`).

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
- [x] Config in `lib/heatpump-config.ts` (zentralisiert, Admin-fähig strukturiert). `validFrom` + `reviewBy`; **quartalsweiser** Wächter (scheduled-task, Jan/Apr/Jul/Okt) + Runbook `scripts/waermepumpe-verify.md` prüft die preis-/förderabhängigen Werte (BEG, Investition, §14a-Tarif, Gas) gegen offizielle Quellen. **Die Investitionswerte fixt er selbst** (Commit + Deploy), aber nur unter fünf Bedingungen: Leitquelle ist eine Auswertung echter Angebote mit Median-Preis **und** Median-Leistung **und** Kostenkategorien, Council-Konsens, die dokumentierte Rechenregel statt Handfaktor, Sprung ≤ 30 % je Feld und grüne Marktanker-Tests. Förderung, Tarife und Gaspreis bleiben Vorschlag (Rechtsfolge/Ermessen); mid-year-Förderänderungen fängt der `foerder-news-waechter` ab
- [x] Heizwärmebedarf: Wohnfläche × spez. kWh/m²·a (dena-Gebäudereport, DIN V 18599) × **Haustyp-Faktor** (geteilte Wände, `HAUSTYP_WP` in constants) + 650 kWh/Person Warmwasser
- [x] **Dämmzustand: vier Bestandsstufen, eine Quelle.** `INSULATION_BESTAND` (`lib/constants.ts`) ist die einzige Quelle für Jahresbedarf (`specKwh`) **und** spezifische Heizlast (`heatLoadW`); `heatpump-config` leitet `specDemandBestand`/`specHeatLoadBestand` daraus ab, `aircon-config` den Split-Heizbedarf. Bis 28.07.2026 standen die Zahlen doppelt im Code. Die vierte Stufe **„Vollsaniert" (70 kWh/m²·a, 45 W/m²)** kam nach Nutzerkritik dazu: Die beste Bestandsstufe war mit 100 schlechter als die *schlechteste* Neubaustufe (75) und hieß trotzdem „Vollsanierung" — ein rundum saniertes Haus war nicht abbildbar und bekam über die zu hohe Heizlast eine zu große, zu teure Wärmepumpe (im Beispiel 11,3 statt 5,4 kW). Beleg: dena-Studie „Auswertung von Verbrauchskennwerten energieeffizienter Wohngebäude", S. 25/Abb. 7 (sanierte Gebäude mit gut gedämmter Hülle: 10–90 kWh/(m²AN·a), 90 % unter ~70). Festgenagelt von `lib/__tests__/heatpump.test.ts → „Dämmzustands-Skala"` (Doppelpflege, Monotonie, belegtes Band, Bestand-vs-Neubau-Lücke)
- [x] **Referenzheizung Gas vs. Heizöl sauber getrennt** (`fuelKind` in `HeatPumpInputs`, `kind`/`refLabel` in `WP_FUEL_OPTIONS`): Der Energieträger wirkte zwar immer auf Preis/Wirkungsgrad/CO₂, aber (a) **jede** Beschriftung sagte weiter „Gas" (bis hin zu „TCO Gas-Referenz“, obwohl Heizöl gewählt war) und (b) die **Grundgebühr des Gasanschlusses** wurde auch dem Öltank aufgeschlagen — 3.600 €/20 J zugunsten der WP. Jetzt: `fixCostPerYear: { gas, oil: 0 }` (Strukturfrage, kein Preis — der Öl-Wert bleibt 0), Beschriftungen durchgehend aus `refLabel`, **Grüngas-Szenario nur bei Netzgas** (der GModG-Preispfad hängt an Biomethan + Gas-Netzentgelten; bei Öl steht stattdessen offen dabei, dass die Bioheizöl-Pflicht nicht eingerechnet ist), Heizöl im **Neubau** gar nicht erst zur Wahl (GEG-65-%-Pflicht). Tests: „Referenzheizung Gas vs. Heizöl". Offen mit Frist bis 01/2027: belastbarer Öl-Wartungswert (`scripts/waermepumpe-verify.md`)
- [x] **Fossile Referenz im Bestand = Ersatz, nicht Weiterbetrieb** (28.07.2026, Entscheidung des Betreibers): Die Bio-Treppe (§ 43 Abs. 1 GModG) gilt **nur für Heizungen, die neu in ein bestehendes Gebäude eingebaut werden** — der Rechner belastete damit aber die Referenz „Gasheizung weiterbetreiben" und ließ zugleich den Neueinbau kostenlos. Zwei Hälften verschiedener Fälle. Jetzt trägt die fossile Seite **auch im Bestand** die Anschaffung (`fossilErsatzInvest`, 12.000 €, im Ergebnis editierbar → 0 für eine junge Heizung); damit gehören Beimischungspflicht und Neueinbau zusammen. Begründung: Über 20 Jahre überlebt kaum ein Kessel, und die BEG-Förderlogik des Rechners unterstellt den Austausch einer alten fossilen Heizung ohnehin. Wirkung im Standardbeispiel: WP-Vorteil 26.999 € → 38.999 € (reiner Weiterbetrieb ohne Pflicht wären 17.819 €). Tests: „die fossile Alternative kostet auch im Bestand eine Anschaffung" + „wer eine junge Heizung hat, setzt die Anschaffung auf 0"
- [x] **Bioheizöl bewusst nicht gerechnet, sichtbar ausgewiesen:** § 43 nennt Heizöl gleichrangig, aber der IW-Preispfad modelliert nur den Gas-Mix, und für Bioheizöl gibt es keine belastbare Preisreihe (Marktangaben streuen von wenigen Prozent bis rund der Hälfte — nur Portale). Statt einer geratenen Zahl steht im Öl-Ergebnis ein Hinweis, der die Lücke benennt **und ihre Richtung**: Öl wird zu günstig gerechnet, die WP schneidet real eher besser ab. Beobachtet wird das **täglich** vom `foerder-news-waechter` (Runbook `scripts/gruengas-verify.md`, Schritt 4), zusammen mit dem Quotengesetz nach § 42a, das bis **01.12.2026** vorzulegen ist und Heizöl ausdrücklich einschließt („Grüngas- und **Grünheizöl**quote"). Bewusst nicht im Quartals-Wächter: Sobald eine Regelung steht, muss sie sofort in die Rechnung — und ist zugleich ein Anlass, den Rechner aktiv zu zeigen. Der Befund geht deshalb am selben Tag als **Entscheidung** an den Betreiber (einrechnen + Sichtbarkeit), nie als stiller Auto-Fix
- [x] **Preis-Unsicherheit steht im Hero, nicht im Tooltip:** unter der großen Einsparungs-Zahl die Spanne über alle gerechneten Annahmen („Künftige Energiepreise kennt niemand. Je nach Annahme sind es X bis Y €"). Anlass: „Woher kennst Du die Gas- und Ölpreise der Zukunft?" — eine einzelne große Zahl liest sich als Prognose, auch wenn darunter drei Szenarien liegen. Die Spanne ist ehrlich breit (im Standardfall −8.340 € bis +38.730 €)
- [x] **Heizlast (Anlagengröße) getrennt vom Bedarf**: `calcHeatLoad` = Wohnfläche × spez. W/m² (`specHeatLoadBestand/Neubau`, Feldwerte) × Haustyp × `auslegungsfaktor` (0,85, reale monoenergetische Auslegung, min 4 kW). Ersetzt die alte `qGes/2000h`-Formel, die das Warmwasser mitzählte. **Editierbar** im Ergebnis (`override.heizlast`) — wer eine DIN-EN-12831-Berechnung hat, trägt sie ein
- [x] **Haustyp-Abfrage** im Flow-Step „Größe & Typ" (freistehend / Doppelhaus / Reihenend / Reihenmitte)
- [x] JAZ-Modell linear aus Fraunhofer ISE „WPsmart im Bestand" (LWWP/SWWP × Vorlauftemp)
- [x] **Split-Heizen bewusst NICHT im WP-Rechner** (mehrfach durchdacht): Eine Split-Klima gegen Gas zu vergleichen passt nicht in den WP-Rechner (dort ist die Prämisse „ich hole eine Wärmepumpe"), und eine Split *zusätzlich* zur wasserführenden WP ergibt keinen Sinn (die WP heizt ohnehin alles inkl. Warmwasser). Der WP-Rechner kennt daher NUR Luft/Wasser + Sole/Wasser. Die ehrliche „Split heizt Teil der Übergangszeit günstiger als Gas"-Rechnung lebt im **Klima-Rechner** („Auch heizen?", `calcAirconHeating` in `lib/aircon.ts`, `device.scop` + `heatStandards` × `heatTransitionShare` in `aircon-config`) — dort hat man ein Kühlgerät, das nebenbei heizt. Der Heizwärmebedarf je Gebäudestandard ist dabei dieselbe Tabelle wie hier (`INSULATION_BESTAND`/`INSULATION_NEUBAU`) — beide Rechner teilen sie, damit sie nicht auseinanderdriften. Split-Heizwerte auf /datenstand (Klima-Sektion), Quartals-Geräte-Wächter prüft den SCOP.
- [x] Investition nach Heizlast, kalibriert an 160 echten Angeboten (Verbraucherzentrale RLP; Median 34.979 € bei 10 kW). **Heizkörpertausch (+4.000 €, ≈ 6 kritische Heizkörper à 679 €) ist eine Maßnahme/Wahl** (bei alten Heizkörpern), nicht mehr automatisch aufgeschlagen — aktiv → Kosten UND bessere JAZ (55→45°C). Früher: Kosten ohne JAZ-Nutzen (Inkonsistenz behoben)
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
- [x] ~~WP-Grundpreis (Luft/Wasser) mitgescrapt (Paket C)~~ **am 27.07.2026 wieder
  abgeschaltet — bewusste Rolle rückwärts.** Der Cron leitete die Luft/Wasser-Basis aus
  einer Portal-Kostenübersicht ab (Einbau dort mit 3.000–7.500 € beziffert) und kam auf
  ~9.500 € Basis. Für ein kleines, gut saniertes Haus (4,6 kW) rechnete der WP-Rechner
  damit **15.020 €** — **weniger als das günstigste von 160 echten Angeboten**, die die
  Verbraucherzentrale Rheinland-Pfalz ausgewertet hat (Minimum 20.228 €, Median 34.979 €
  bei Median-Leistung 10 kW). Aufgefallen ist es an einem Nutzerkommentar („kein Angebot
  unter 25.000 €"), nicht am Wächter. **Lehre:** Eine Portal-Kostenseite ist keine
  Preisquelle für Gewerke — sie zählt den Einbau strukturell zu knapp, und ein
  Korrekturfaktor darauf wäre geraten (dieselbe Linie wie bei den Geräte-Effizienzen:
  „Wert wirkt zu niedrig" ist kein zulässiger Handfaktor). Investition liegt jetzt
  vollständig in `lib/heatpump-config.ts`, kalibriert an der VZ-Angebotsauswertung
  (Volltext in `docs/quellen/`), Regel: Basis = Summe der leistungsunabhängigen
  Kostenkategorien, Steigung so, dass der Median-Fall den Median-Preis trifft. Gepflegt
  vom quartalsweisen WP-Wächter (`scripts/waermepumpe-verify.md`, fixt die Investition
  selbst), festgenagelt von den Marktankern in `lib/__tests__/heatpump.test.ts`. PV-/Speicher-/Strompreis-Scraping
  läuft unverändert weiter; die DB-Spalten `wp_lwwp_*` bleiben als toter Altbestand liegen.

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
- [ ] EE-Ampel auf Startseite und Simulation einbinden (das Widget selbst ist fertig, nur die Einbindung fehlt)

**MaStR-Datenpipeline (Anlagenstammdaten für Choropleth)**
- [x] Quellwechsel von open-MaStR (Zenodo, jährlich) auf BNetzA Gesamtdatenexport (monatlich)
- [x] `scripts/mastr-bnetza-refresh.ts` mit vier Phasen: `--download`, `--inspect`, `--aggregate`, `--upload`
- [x] XML-Streaming via `sax` + `iconv-lite` (UTF-16 → UTF-8), 3 GB ZIP wird nicht entpackt
- [x] URL-Resolver mit Datums-Fallback (heute → -7 Tage), Schema-Version via `BNETZA_SCHEMA_VERSION` env
- [x] Aggregation analog zur Zenodo-Pipeline: `(region_id × energietraeger × segment × jahr) → (count, kwp)`
- [x] GitHub Actions Workflow `mastr-refresh.yml`: monatlich am 5. um 04:00 UTC + manueller Trigger. Vercel-Cron geht nicht (Function-Timeout 10 s, 3 GB sprengt Edge)
- [x] Alte Zenodo-Pipeline (`scripts/mastr-refresh.ts`) bleibt als Fallback im Repo, ohne Auto-Trigger
- [x] Daten landen in `mastr_aggregates`/`mastr_regions`/`mastr_meta` (Schema unverändert), `data_as_of` aus dem ZIP-Stichtag

**Kommunen-Outreach (interner Bereich, für Widget-Distribution an Gemeinden)**
- Ziel: die ~11.000 Gemeinden anschreiben, damit sie das Solar-Widget einbetten (Backlinks/Reichweite). Rechtsrahmen kalibriert (Legal-Checkliste #6): maßvolle, schubweise Outreach ist eine bewusste Entscheidung, Kontaktformular/Permission-first ist risikofrei.
- **Tabelle `kommunen_kontakt`** (Supabase, RLS **nur service_role** — interne Daten, kein anon-Read; bewusste Abweichung vom Atlas-Muster): `region_id` = 8-stelliger AGS (FK auf `mastr_regions`). Spalten: `website`/`email`/`kontakt_url`, Workflow (`outreach_status`, `channel`, `contacted_at`, `responded_at`, `notes`, `draft_subject/body`), Politik (`gruene_pct/linke_pct/spd_pct`, BTW 2025 Zweitstimme), Rang (`dach_perzentil`, `dach_rang_kreis`, `kreis_gemeinden` — Dach-Leistung pro Kopf, park-immun).
- **Befüllung: `scripts/kommunen-kontakt-refresh.ts`** (Phasen kombinierbar): `--setup` (Tabelle/Spalten), `--wikidata` (Website je Gemeinde aus P856), `--forms`/`--probe` (Kontakt-/Formularlink: Startseiten-Scan + Pfad-Anklopfen), `--wahl` (Grünen/Linke/SPD-Anteil aus den Bundeswahlleiterin-Wahlbezirks-Ergebnissen, je Gemeinde aggregiert), `--rang` (Dach-pro-Kopf-Perzentil + Landkreis-Rang aus Rollup `mastr_gemeinde_solar`), `--stats`. DB-schonend (500er-Upserts, keine Voll-Aggregation der großen Tabelle).
- **Cockpit `/admin/kommunen`** (Admin-Guard + `InternalShell`, als Kachel in `/admin` + Sidebar): filtern (Bundesland/Status/hat-Link) + Namenssuche + Sortierung „Grün-/Links-affin"; Status pflegen; **Anschreiben-Generator** (`lib/kommunen-outreach-draft.ts`, reine Funktion, **Template statt LLM**): rang-abhängiger Catcher-Betreff (park-immun), Link auf die Gemeinde-Atlas-Seite, Pflicht-Signatur, Einheiten nur aus `atlas-format`. API `/api/admin/kommunen` (GET/PATCH/POST). Kein Auto-Versand — der Absende-Klick bleibt beim Menschen.
- **Award-Konzept** (evaluiert, geparkt) als stärkerer Embed-Aufhänger: gehört zusammen mit der Thin-Content-/Atlas-Arbeit in **eine** fokussierte Session (gleiche Gemeinde-Seiten) — Briefing in `docs/kommunen-award-konsolidierung.md`.

### Phase 4: Content & Reichweite
- [x] Flaggschiff-Ratgeber **`/lohnt-sich-pv-mit-speicher`**: Server Component (ISR 3600), rechnet die Beispieltabelle (10 kWp × 0/5/10 kWh: Investition, EV, Autarkie aus der Stundensimulation, Amortisation, 25-J-Gewinn) live mit den geteilten Funktionen (`calcEigenverbrauch`, `calc`, `estimateCost`, `simulatePvYear`) und Live-Marktpreisen — driftet nie vom Rechner. FAQ via `pvSpeicherFaq(prices)` in `lib/faq.ts` (bekommt die Live-Preise durchgereicht, damit FAQ und Tabelle auf derselben Seite identische Beträge zeigen) + `<Faq>` (FAQPage-JSON-LD). In Sitemap (0.8); Rechner-FAQ verlinkt hin.
  - Zwei **Beispiel-Teaser** (ohne / mit 10 kWh Speicher): recyceln die Rechner-`Chart`-Komponente (3-Szenarien-Amortisationskurve) + ResultStats-Kacheln (Amortisation / Rendite 25 J / ⌀ Ersparnis), gerechnet aus derselben `computeExample`-Quelle wie die Tabelle. Jeder Teaser hat einen Deep-Link `/photovoltaik-rechner?a=2&s=…&p=2&n=1&st=…&er=…`, der den Rechner exakt auf die Teaser-Zahlen vorbelegt (`st`/`er` explizit, weil der Rechner-Default-Strompreis 0,34 € vom kanonischen prices-config-Wert abweicht).
- [x] Ratgeber **`/lohnt-sich-pv-ohne-einspeiseverguetung`** (EEG-Reform 2027): gleiches Muster wie der Speicher-Ratgeber (ISR, live gerechnet, `pvOhneEinspeisungFaq` in `lib/faq.ts`, Teaser mit Deep-Link `eia=0` = Einspeise-3-State „Aus"). Reform-Aussagen als datierter Sachstand (`REFORM_STAND`, Entwurf ≠ beschlossen) — EEG-Wächter pflegt sie zusammen mit der Rechner-Notiz. Preis-Fetch der Guide-Seiten geteilt in `lib/prices-server.ts` (Speicher-Seite umgestellt).
- [x] Daten-Story **`/photovoltaik-zubau-deutschland`** („Wie Förderung den Solarausbau geformt hat", in Hauptnav unter PV-Förderung + Sitemap): nationaler PV-Zubau pro Jahr (Balken) mit überlagerter Einspeisevergütung (grün) + Haushaltsstrompreis (grau, beide ct/kWh, geteilte rechte Achse) und interaktiver **Ereignis-Timeline** (ARIA-Tabs, tippen/wischen/←→, alle Panels im DOM). Erzählt den Vergütungs-getriebenen Boom bis 2012 und den Eigenverbrauchs-getriebenen ab 2022. **Artikel = Fließtext über dem Widget; das Chart+Timeline ist ein eigenständiges, einbettbares Widget** (`components/charts/ZubauWidget.tsx`, geteilt): eigene Route `/embed/pv-zubau-deutschland` (ISR, noindex, `useWidgetTheme`, `embed=`/`branding=`-Flags, eigenes Label für Fremd-Embeds), Galerie-Sektion `pv-zubau-deutschland`, Quelle/`PoweredBy`/Export nach Widget-Konvention. Bausteine: `components/charts/ZubauTimelineChart.tsx` (Balken + 2 Halo-Linien) + `EventTimeline.tsx`.
  - **Datenpflege (Runbook `scripts/zubau-story-verify.md`):** Balken = MaStR (`getNationalSolarByYear`, live/ISR, laufendes Jahr auto als unvollständig — **selbstwartend**). Vergütungsreihe `lib/feedin-history.ts` (2000–heute, gegen BNetzA-/SFV-Monatstabellen geprüft) + Strompreisreihe `lib/strommix-history.ts` = jährliche Ein-Wert-Anhänge, **automatisiert am `eeg-verguetung-verify-halbjaehrlich`-Wächter** (Januar: Vergütung, Juli: Eurostat-Preis). Neue **Politik-Marken** (`ZUBAU_EVENTS`) schlägt der `foerder-news-waechter` nur **vor** (Kandidat im Report) — Formulierung + Eintrag macht ein Mensch (zitierfähige Seite). Neue Quelle `eurostat` in `lib/data-sources.ts`; Reihe auf `/datenstand`.
- [ ] Weitere Long-Tail-Landingpages (z.B. `/pv-kaufen-vs-enpal-mieten`)
- [ ] "Vergleich: PV kaufen vs. Enpal mieten" als Killer-Content
- [ ] Blog/Ratgeber-Sektion
- [ ] Thin-Content-Konzept vor der Atlas-Index-Freischaltung (gehört mit dem Award-Konzept in EINE Session)

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
