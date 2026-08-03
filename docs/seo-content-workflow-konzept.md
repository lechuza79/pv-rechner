# SEO-Content-Workflow — Konzept

**Stand:** 03.08.2026 · Basis: `docs/seo-analyse-solar-check-io.md` (DataForSEO) + Code-Inventur
**Status:** Entwurf, wartet auf Priorisierung durch den Betreiber

---

## 0. Befund aus der Inventur (was das Konzept bestimmt)

1. **Drei der zehn „neuen" Keyword-Chancen sind bereits gebaute Seiten**, die nur nicht ranken:
   „balkonkraftwerk rechner" (KD 4) → `/balkonkraftwerk-rechner` existiert · „stromverbrauch
   wärmepumpe rechner" → `/waermepumpe-rechner` existiert · „stromkosten rechner" →
   `/klimaanlage-stromkosten` ist die halbe Antwort. Das Problem ist **Auffindbarkeit**
   (interne Links, Titles, Domain-Alter), nicht fehlender Content.
2. **Interne Verlinkung ist die größte ungenutzte Fläche:** ~112 Förder-Stadtseiten verlinken
   ausschließlich nach oben (Hub/Bundesland), **null** Links in Ratgeber oder Rechner.
   Es gibt keinen Related-Links-Baustein; „Verwandte Seiten" ist dreimal handgeschrieben.
3. **Ratgeber-Artikel haben kein Template** — jeder Artikel ist 300–680 Zeilen mit kopiertem
   Style-Objekt. Skalieren auf 2+ Artikel/Monat braucht zuerst eine gemeinsame Hülle.
4. **GSC-Anbindung existiert bereits** (`/api/seo/gsc` Impressionen je Seite,
   `/api/seo/index-status` echter Index-Status + Sitemap-Neueinreichung, IndexNow).
   Was fehlt, ist die **Keyword-Seite** (Positionen, Suchvolumen, Chancen) — genau das
   liefert die DataForSEO-API.
5. Drei unabhängige FAQPage-JSON-LD-Implementierungen; Glossar-Seite ohne OG-Metadaten;
   Förder-Stadtseiten mit identischen FAQ-Formulierungen über alle Städte (Thin-Content-Risiko
   dort ist bekannt und über die 404-Regel für Städte ohne Programm teilentschärft).

---

## 1. Der Workflow: Monatszyklus in fünf Schritten

```
[1] Messen (automatisch)  →  [2] Priorisieren (Betreiber, 5 Min)  →
[3] Produzieren (Claude-Session)  →  [4] Abnahme + Publish  →  [5] Wirkung messen (automatisch)
```

### Schritt 1 — Messen: der SEO-Wächter (neu, monatlich)

Ein scheduled task nach dem Muster der bestehenden Wächter. Er zieht drei Quellen zusammen:

| Quelle | Was | Zugang |
|---|---|---|
| **DataForSEO Labs API** | Rankings der Domain, Positionsänderungen, neue Keyword-Chancen (Volumen/KD/CPC), SERP-Wettbewerber | REST API, Pay-per-Call (Ranked Keywords ~0,02 $/Abruf, Keyword Ideas ~0,01 $ — Monatslauf < 1 €) |
| **GSC** (vorhanden) | Impressionen/Klicks je Seite mit Tagesverlauf, echter Index-Status, Sitemap-Frische | `/api/seo/gsc`, `/api/seo/index-status` |
| **Eigener Content-Stand** | Welche Seiten existieren, Alter, letzte Aktualisierung | `lib/ratgeber.ts`, Sitemap |

**Output:** ein Bericht in der Wächter-Ablage (`waechter_reports`, sichtbar unter `/admin/waechter`) mit:
- Bewegung: welche Seiten hoch/runter, welche neuen Seiten indexiert/nicht indexiert
- **Chancen-Shortlist** (max. 5), gescort nach `Volumen × (100−KD) × Themen-Fit`, je Chance:
  Keyword, Volumen, KD, empfohlener Seitentyp (Ratgeber / Tool / Hub-Erweiterung / Optimierung bestehender Seite)
- Verfallswarnung: Artikel, deren `updated` > 6 Monate alt ist und deren Thema sich bewegt
  (EEG, Förderung — die Fach-Wächter liefern die Anlässe schon)

**Meldelogik wie überall:** Bericht in die Ablage, Mail nur, wenn eine Entscheidung ansteht
(= die Shortlist). Zugangsdaten (DataForSEO Login/Passwort) als Env-Var, nie im Prompt/Code.

### Schritt 2 — Priorisieren (Betreiber)

Der Betreiber wählt aus der Shortlist 1–2 Themen pro Monat (Produktentscheidung). Alles
Weitere — Format, Aufbau, Umsetzung — liegt bei Claude. Kein Thema gewählt = kein Content
in dem Monat; der Wächter läuft trotzdem weiter.

### Schritt 3 — Produzieren (Claude-Session, je Thema)

Pro Seitentyp ein festes Playbook (Details §2). Immer enthalten, unabhängig vom Typ:
- **Faktenprüfung nach CLAUDE.md** (Primärquellen, Council bei Rechts-/Zahlenbezug — der
  Auslöser ist die Änderung, nicht die Herkunft)
- **Zahlen live gerechnet** mit den geteilten Rechenfunktionen + Marktpreisen (driftet nie)
- **Glossar-Pass:** neue Fachbegriffe des Artikels als Glossar-Einträge, Erstnennung im
  Text mit `GlossaryTerm` ausgezeichnet
- **FAQ-Builder** in `lib/faq.ts` (render-zeit-interpoliert, nie hartkodierte Jahre/Beträge)
- **Interne Links nach Linking-Regeln** (§3): Aufwärts- und Abwärtslinks im Cluster,
  Related-Links aus dem Register
- **Registry-Eintrag** (`lib/ratgeber.ts` bzw. Pendant) → Sitemap-`lastmod`, Übersicht,
  Breadcrumb fallen automatisch heraus

### Schritt 4 — Abnahme + Publish

Local-First wie gehabt: sichtbare neue Seiten testet der Betreiber im Browser (Aussehen,
Verständlichkeit — **nicht** Fakten, die sichern Council + Tests). Merge → Vercel-Deploy →
Sitemap aktualisiert sich → IndexNow-Ping + ggf. Sitemap-Neueinreichung (Mechanik existiert).

### Schritt 5 — Wirkung messen

Der nächste Wächter-Lauf prüft neue Seiten explizit: indexiert? Erste Impressionen
(Tagesverlauf, nicht Summe)? Position? Nach 8–12 Wochen ohne Bewegung → Befund mit
Diagnose-Vorschlag (Title, Links, Content-Tiefe) statt stillem Vergessen.

---

## 2. Seiten-Schemata (Templates + strukturierte Daten)

### Vorarbeit einmalig: ArticleShell

Gemeinsame Artikel-Hülle (Breadcrumb, ArticleMeta, Typo-Stile aus den Tokens, FAQ-Slot,
Related-Links-Slot, Quellen-Fuß) statt kopierter Style-Objekte. Senkt einen neuen Artikel
von ~500 auf ~150 Zeilen Inhalt. **Voraussetzung für jede Skalierung, erste Baustelle.**

### Die vier Seitentypen

| Typ | Muster | Bausteine | JSON-LD |
|---|---|---|---|
| **Ratgeber-Artikel** | existiert (4 Artikel) | ArticleShell, ProConLists, Charts, live gerechnete Beispiele, FAQ, Glossar-Terme | Article + FAQPage + BreadcrumbList (vorhanden) |
| **Tool-/Rechner-Seite** | existiert (6 Rechner) | Flow-Komponenten, geteilte Rechen-Basis (BLOCKER-Tabelle!), Methodik-Link | SoftwareApplication (site-weit) + FAQPage ergänzen |
| **Guide mit Schritten** (neu, für „balkonkraftwerk anmelden") | neu | ArticleShell + nummerierte Schritt-Sektionen + Checklisten-Interaktion | **HowTo** (neu in `lib/json-ld.ts`) + FAQPage |
| **Vergleichsseite** (neu, z. B. Gerätevergleiche, „kaufen vs. mieten") | neu | ArticleShell + **Vergleichstabellen-Komponente** (existiert nicht — hand-gerollte Tabellen vereinheitlichen) + ScenarioTabs | Article + FAQPage; ItemList wo sinnvoll |

**Produkte/Preise:** Kein Shop, kein Product-Schema. Preise sind live gerechnete Beispiele
aus `market_prices` — genau das ist die Differenzierung (driftet nie, im Gegensatz zu
statischen Preistabellen der Konkurrenz). Bei Gerätevergleichen (Klima-Muster) kommen
Zahlen aus den Configs mit `validFrom`/Wächter-Pflege.

**Konsolidierung nebenbei:** die drei FAQPage-Implementierungen auf eine
(`components/Faq.tsx`) zusammenziehen; `/glossar` auf `pageMetadata()` umstellen.

### Geo-Content

Das Muster existiert (Förderseiten Bundesland/Stadt, Solar-Atlas). Regeln, die bleiben:
- Neue Geo-Seiten nur mit **echtem Daten-Unterschied** je Ort (MaStR-Zahlen, Förderprogramm) —
  reine Text-Interpolation ist Thin Content und wird von der 404-/noindex-Systematik
  bewusst unterdrückt
- Wallbox-Förderung (Chance #2, KD 8 bei 18k Volumen!) nutzt **dieselbe Hub-Systematik**:
  eigene Programm-Datenbank-Einträge, Hub-Seite, Länder nach Datenlage — kein zweites Fundament
- Atlas-Indexfreischaltung (Wellen) läuft separat weiter; Thin-Content-Konzept bleibt
  Voraussetzung für Welle Gemeinden

### GEO im zweiten Sinn (KI-Zitierfähigkeit)

Bereits die erklärte Ratgeber-Strategie („Hebel für KI-Zitate"). Zusätzlich ab jetzt
systematisch: jede Kernaussage als **zitierfähiger Absatz** (Frage-Überschrift + direkte
Antwort in 2–3 Sätzen mit Zahl + Quelle), FAQPage-Markup, Stand-Datum sichtbar. Der
SEO-Wächter kann perspektivisch die DataForSEO „AI/LLM Mentions"-Daten mit beobachten.

---

## 3. Interne Verlinkung: drei Regeln + ein Baustein

**Baustein:** `RelatedLinks`-Komponente, gespeist aus einem erweiterten Register
(`lib/ratgeber.ts` bekommt `cluster` + `related`-Felder; Rechner-Seiten bekommen
Registry-Einträge). Keine handgeschriebenen „Verwandte Seiten"-Absätze mehr.

**Regeln:**
1. **Jede Seite gehört zu genau einem Cluster** (PV-Wirtschaftlichkeit · Förderung ·
   Balkonkraftwerk · Wärme · Energiedaten). Artikel verlinken: 1× Cluster-Hub/Pillar,
   2–3× Geschwister, 1× passender Rechner mit vorbelegtem Deep-Link (Muster existiert).
2. **Geldseiten sind Link-Empfänger:** Förder-Stadtseiten (112 Stück) bekommen einen
   Related-Block Richtung Ratgeber + Rechner — der größte ungenutzte Hebel, ein
   Template-Edit für alle Seiten.
3. **Anchor-Text = Ziel-Keyword,** nicht „hier klicken"; erste Nennung verlinkt (die
   FAQ-linkify-Mechanik macht das bereits vor — auf Fließtext ausdehnen wo sinnvoll).

---

## 4. Glossar-Ausbau

- **Prozess statt Projekt:** jeder neue Artikel bringt seine Begriffe mit (Schritt 3).
  Zusätzlich einmalig die Lücken zur Keyword-Liste schließen (Neigungswinkel, Wallbox,
  kWp vs. kWh-Begriffe rund um Balkonkraftwerk, MaStR/Anmeldung).
- Glossar-Einträge mit `long`-Text sind selbst Long-Tail-Landeflächen („was ist
  einspeisevergütung") — Anker-URLs (`/glossar#begriff`) sind schon stabil.
- Technisch: `/glossar` auf `pageMetadata()` heben; optional später DefinedTerm-JSON-LD.

---

## 5. Werkzeuge — was wir nutzen (und was nicht)

| Werkzeug | Rolle | Kosten |
|---|---|---|
| **DataForSEO API** (REST) | Keyword-Daten, Rankings, SERP, Wettbewerber — Datenquelle des SEO-Wächters | Pay-per-Call, Monatslauf < 1 € |
| **GSC-API** (integriert) | Index-Status, Impressionen, Sitemap-Management | 0 € |
| **Claude scheduled task** | SEO-Wächter (monatlich) nach bestehendem Wächter-Muster + Gate | Modell-Lauf |
| **Claude-Sessions** | Content-Produktion nach Playbook, Council-Faktenprüfung | — |
| **IndexNow + Sitemap-Resubmit** (integriert) | Publish-Beschleunigung | 0 € |

**Bewusst nicht:** kein SEO-SaaS-Abo (Ahrefs/Semrush/Sistrix, 100–400 €/Monat — DataForSEO
liefert dieselben Rohdaten per API für Cent-Beträge), kein CMS (Artikel als Code hält die
Live-Rechnungen), keine automatische Publikation ohne Abnahme (Local-First bleibt).

**DataForSEO-Onboarding-Formular:** Use Cases „Keyword Research, Rank Tracking, Content
Optimization, Competitor Analysis, AI/LLM Mentions, Local SEO"; Integrationsmethode
„REST API". Zugangsdaten nach Registrierung als Env-Var ablegen (nie in Shell-History/Code).

---

## 6. Quick Wins aus der Analyse (Reihenfolge)

**A — Sofort, reine Optimierung bestehender Seiten (eine Session):**
1. **Interne-Link-Welle:** RelatedLinks-Baustein + Förderseiten→Ratgeber/Rechner-Block +
   Startseiten-/Footer-Prüfung, dass alle 6 Rechner von der Startseite erreichbar verlinkt sind
2. **`/pv-simulation`** (Pos. 16, 260/Mo): Title auf „PV-Simulation" als führendes Keyword
   schärfen, interne Links aus Ratgebern/Startseite, FAQ-Block ergänzen
3. **RLP-/Hessen-Förderseiten** (Pos. 14–24): Content-Tiefe (regionale Besonderheiten,
   Programm-Historie), „Klimabonus Frankfurt" als Begriff prominent auf der Frankfurt-Seite
4. **`/waermepumpe-rechner`**: „Stromverbrauch" in Title/H1-Umfeld aufnehmen
   (1.000/Mo-Keyword, Seite kann es schon rechnen)
5. Konsolidierung: FAQPage-Implementierungen, Glossar-Metadaten

**B — Monat 1–2, kleine Neubauten (KD < 10):**
6. **Einspeisevergütungs-Rechner** (KD 1!, +84 % Trend): kleines Tool aus `feedin-config` +
   Ratgeber-Unterbau — fast alles existiert als Rechenbasis
7. **Neigungswinkel-Seite** (KD 4): Tabelle + Mini-Check, verlinkt hart auf `/pv-simulation`
   (pusht Quick Win 2)
8. **ArticleShell** als Voraussetzung für alles Weitere

**C — Monat 2–3, die großen Hebel:**
9. **„Balkonkraftwerk anmelden"-Guide** (27.100/Mo, KD 17): HowTo-Guide + Anmelde-Check,
   verlinkt auf den bestehenden Balkon-Rechner (löst dessen Ranking-Problem gleich mit)
10. **Wallbox-Förderungs-Hub** (18.100/Mo, KD 8): Hub-Systematik der PV-Förderung wiederverwenden

**D — Monat 3+:** nationale Förder-Pillar ausbauen (KfW-/BAFA-Unterseiten), dann erst die
harten Keywords („photovoltaik rechner", KD 46+).

---

## 7. Offene Entscheidungen (Betreiber)

1. **DataForSEO-Konto/Budget:** API-Guthaben aufladen (10 $ reichen monatelang) — ja/nein
2. **Frequenz:** Empfehlung 1–2 neue Inhalte/Monat + der monatliche Wächter-Lauf
   (mehr skaliert erst nach ArticleShell sinnvoll)
3. **Reihenfolge:** Empfehlung wie §6 (A zuerst — kostet nichts, wirkt auf alles Bestehende)
4. **Wallbox-Förderung** ist eine Produkterweiterung (neue Programm-Datenpflege durch den
   Förder-Wächter nötig) — bewusst freigeben, nicht nebenbei
