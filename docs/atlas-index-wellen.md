# Solar-Atlas: gestufte Index-Freischaltung („Wellen")

**Zweck:** Die Atlas-Seiten (~420 Hubs + ~11.000 Gemeinden) so in den Google-Index
bringen, dass ein plötzlicher Schwung dünner Massenseiten die Domain **nicht**
abwertet. Referenz für den Zeitpunkt, an dem wir `noindex` stufenweise entfernen.

**Stand (aktuell):** Alle Atlas-Seiten sind `PILOT_NOINDEX` **und nicht in der
Sitemap** → Google indexiert nichts. Der Merge/Deploy der Features hat daran
nichts geändert. Die Freischaltung ist eine **eigene, bewusste** Aktion.

## Der eigentliche Hebel: Qualität, nicht Tempo
Google straft nicht „viele Seiten auf einmal" ab, sondern **Thin-/Duplicate-Content
bei Masse**. Tempo-Staffelung ist trotzdem klug — um Qualität + Indexierung an
einer kleinen Menge zu validieren, bevor man skaliert.

## Schon erledigt (Content-Qualität)
- [x] Titles/Descriptions dynamisch je Region, Meta-Description auf ~150 Zeichen
- [x] Canonical je Seite, Dataset- + Breadcrumb-JSON-LD (zentraler Helper `atlasDatasetJsonLd`)
- [x] Datenquellen-Credits (MaStR dl-de/by-2-0, Open-Meteo CC BY 4.0, BKG) überall
- [x] **Intro je Gemeinde angereichert** (`lib/gemeinde-highlight.ts`): Charakter-Satz
      + Mix-Fallback + **Rang im Landkreis** + **Zubau-Trend** + Pro-Kopf → genuin
      unterschiedliche Fakten statt einer Schablone. **Das war der zentrale Thin-Fix.**
- [x] Kern-Content serverseitig gerendert (Zahlen, Ranking, Intro) — Karte ist nur
      Progressive Enhancement, blockiert die Crawlbarkeit nicht

## Noch offen (Voraussetzung vor Welle 1 = Gemeinden)
- [ ] **Thin-Schwelle:** Gemeinden ohne nennenswerten Bestand haben keinen Eigenwert.
      Vorschlag: **< ~10 Anlagen → `noindex`** (oder Canonical auf die Landkreis-Seite).
      Zahl tunebar. Nimmt genau die Seiten raus, die als Doorway/Thin durchgehen.
- [ ] Prüfen, ob der Intro-Text bei sehr kleinen Gemeinden noch genug variiert.

## Die Wellen
- **Welle 0a — Fundament (17 Seiten):** Deutschland + 16 Bundesländer freischalten.
  Trivial safe, höchster Wert, etabliert die Sektion. In die Sitemap. ~1 Woche beobachten.
- **Welle 0b — Landkreise (~400):** sobald 0a sauber indexiert. Aggregierte,
  einzigartige Datenseiten, geringes Risiko.
- **Welle 1 — Gemeinde-Pilot (~500–1.000):** begrenzte, starke Teilmenge — größte
  Gemeinden **oder** ein Bundesland komplett, nur oberhalb der Thin-Schwelle.
  Sitemap-Batch, 2–4 Wochen beobachten.
- **Welle 2+ — Skalierung:** restliche Gemeinden gestaffelt (nach Bundesland /
  Chargen ~1–2k pro Woche), wenn Welle 1 sauber läuft.

## Gate zwischen den Wellen (nächste erst wenn)
- Indexierungsquote der letzten Welle ok (Faustzahl > ~70 %, Search Console → Seiten).
- **Keine** manuelle Maßnahme, **kein** sitewide-Impressions-Einbruch.
- Engagement stimmt (Klicks, nicht nur Impressions).

## Rollback
`noindex` ist reversibel: macht eine Welle Ärger → `noindex` zurück + aus Sitemap →
Google deindexiert wieder.

## Technische Umsetzung (bei Aktivierung zu bauen)
1. **`PILOT_NOINDEX` durch eine Freischalt-Logik ersetzen** — steuerbar pro Ebene
   (Hub an/aus) + Anlagen-Schwelle je Gemeinde. Betroffen: `generateMetadata` in
   `app/(site)/solar-atlas/[[...pfad]]/page.tsx` und `…/[bundesland]/[kreis]/[gemeinde]/page.tsx`.
2. **`app/sitemap.ts`** erweitern: freigeschaltete Wellen aufnehmen (11k URLs passen
   in eine Sitemap-Datei — Limit 50.000; sauberer ist ein Split je Bundesland).
3. **Search Console:** Sitemaps einreichen, Indexierung + Impressions je Welle beobachten.
4. Welle-Steuerung am einfachsten über eine kleine Config/Flag (welche Ebenen +
   welche Bundesländer freigeschaltet sind), damit das Ausrollen ohne Code-Deploy je
   Charge geht — oder bewusst per Deploy je Welle.

## Wirkungsmessung (Google Search Console API)
Angebunden wie bei life-is-a-binge, dependency-frei (Service-Account-JWT, `node:crypto`):
- `lib/google-auth.ts` (Token) + `lib/gsc-search-analytics.ts` (Search-Analytics-Query).
- Route `GET /api/seo/gsc?prefix=/solar-atlas` (Auth: `Bearer $CRON_SECRET`) liefert
  Impressions/Klicks je Atlas-Seite; der Wellen-Monitor ruft sie ab.
- **Zwei manuelle Setup-Schritte (einmalig):**
  1. Search Console (solar-check.io-Property) → Einstellungen → Nutzer → die
     Service-Account-E-Mail (aus dem liab-Setup) als Nutzer hinzufügen (Lesend reicht).
  2. Vercel (pv-rechner) → Env `GOOGLE_SERVICE_ACCOUNT_JSON` = derselbe base64-Key wie
     bei liab. Optional `GSC_SITE_URL`, falls es eine URL-Präfix- statt Domain-Property
     ist (Default `sc-domain:solar-check.io`).
- Ohne diese Schritte liefert die Route `{configured:false}` und der Monitor erinnert
  nur; danach liefert er die echten Zahlen.

## Empfehlung
Start mit **0a (17)** → **0b (~400 Kreise)** → **Gemeinde-Wellen**. Vor Welle 1 die
Thin-Schwelle setzen. Die Content-Qualität (Intro-Varianz, Credits, Meta) ist bereits
adressiert — offen ist im Kern nur die Freischalt-Mechanik + die Schwelle.

---

## Entschieden: Wie zeigen wir Speicher ehrlich? (2026-07-21)

**Gelöst.** Die Kachel misst Hausspeicher, Großspeicher ist eine eigene Aussage:

- Die Kachel „Batteriespeicher" zeigt die Batteriekapazität, und die Unterzeile
  zählt **Batterien statt aller Speicher** — Zahl und Unterzeile meinen damit
  überall dasselbe. Das betrifft nicht nur Pumpspeicher-Orte, sondern **432 von
  11.247 Gemeinden** (siehe Messung unten).
- Wo ein Nicht-Batterie-Speicher steht, kommt darunter eine **eigene sichtbare
  Zeile mit der echten Zahl und der Begründung** („Kraftwerksmaßstab, deshalb
  steht es nicht in der Kachel oben"). Nichts wird unterschlagen, die Regel steht
  an der Kachel statt nur im Code.
- Die Zeile erscheint **nur unter „Alle"** — ein Pumpspeicherwerk ist weder privat
  noch gewerblich. Der Eigentümer-Filter bleibt damit sauber auf seiner Achse.
- Ranglisten und Widget heißen ebenfalls „Batteriespeicher"; die Regel steht auf
  `/datenstand`. Pure Funktion + Tests: `speicherHinweis` in `lib/atlas.ts`,
  `lib/__tests__/atlas-owner-slice.test.ts`.

**Verworfen wurde bewusst:** Pumpspeicher in die Kapazität mitzuzählen (Herdecke
läge dann bei 648 MWh und die 512 Hausbatterien wären unsichtbar; jeder
Gemeindevergleich würde nur noch messen, ob zufällig ein Kraftwerk dasteht) —
und „bei privat nur Batterien, bei gewerbe beides" (lässt den Eigentümer-Filter
doch wieder die Bauform verschieben).

### Datenlage (gemessen 2026-07-21, eine aggregierte Abfrage)

- 11.247 Gemeinden gesamt.
- **27** mit Pumpspeicher (0,2 %), 78 Blöcke, zusammen ~147 GWh.
- **405** mit „sonstige" Nicht-Batterie-Speichern (3,6 %), meist winzig
  (Median ~10 kWh) — also gerade **kein** Kraftwerksfall, entsprechend anders
  formuliert.
- Zusammen **432 Gemeinden (3,8 %)**, in denen Anzahl und Kapazität vorher
  auseinanderliefen.
- Größenverhältnis Herdecke: 512 Batterien = 14,2 MWh, ein Koepchenwerk = 634 MWh
  (45-fach). Goldisthal: 9,5 GWh Pumpspeicher, null Hausbatterien.

### Offen (nicht Darstellung, sondern Datenqualität): Doppelzählung Kreis Waldshut

Im Kreis Waldshut tragen **Häusern, Waldshut-Tiengen und Ühlingen-Birkendorf
jeweils exakt dieselben 30,3 GWh mit je 4 Blöcken** — offensichtlich dasselbe
Kraftwerk, das mehreren Gemeinden zugeordnet wird. Die Beträge sind zusätzlich
rechnerisch auf Blöcke gestückelt (Drittel-Werte mit Nachkommastellen,
z. B. 7.569.083,33 kWh).

Das ist ein Problem im Register-Import, nicht in der Darstellung, und wurde hier
**bewusst nur dokumentiert, nicht repariert**. Es ist aber ein weiterer Grund,
**Pumpspeicher nicht zur Leitzahl zu machen**: als benannter Einzelfakt neben der
Kachel ist die Zahl tragbar, als vergleichbare Kennzahl oder Ranglisten-Kriterium
wäre sie es nicht. Vor einer prominenteren Verwendung müsste die Zuordnung je
Gemeinde geprüft werden.

---

## Ursprüngliche Fragestellung (Archiv)

Die Speicher-Kachel der Gemeinde-Seite hatte zwei Fragen offen, die zusammen
evaluiert wurden:

**1. Pumpspeicher raus aus der Kapazität — stimmt das noch?**
Heute zählt die kWh-Zahl nur Batterien; Pumpspeicher fliegt raus, weil ein
Goldisthal (~8,5 GWh) neben Kellerbatterien (~10 kWh) jede Zahl unlesbar macht.
Einwand des Betreibers: **Ein Ausreißer ist trotzdem real.** Steht in einer
Gemeinde ein Pumpspeicherwerk, IST das ihre Speicherkapazität — sie wegzulassen
ist eine Design-Entscheidung, die man auch andersherum treffen kann. Zu klären:
Verschweigen wir gerade eine echte Zahl, oder schützen wir die Lesbarkeit? Und
falls Letzteres: Warum steht das nirgends sichtbar an der Kachel?

**2. Anzahl und Kapazität meinen Unterschiedliches.**
In Gemeinden mit Pumpspeicher zeigt die Kachel z. B. „14,2 MWh" mit Unterzeile
„513 Anlagen" — die Kapazität meint 512 Batterien, die Anzahl 513 Speicher.
Der Vorschlag „513 Speicher, davon 512 Batterien" wurde **verworfen**: versteht
niemand. Ideen des Betreibers stattdessen:
- bei „privat" nur Batteriespeicher zeigen, bei „gewerbe" beides
- oder ganz auf **Kapazität** als Leitgröße gehen statt auf Anlagenzahl

**Nicht einzeln flicken.** Beide Punkte hängen an derselben Frage — was soll die
Kachel eigentlich aussagen? Erst beantworten, dann bauen. Zusammen mit dem
Eigentümer-Filter denken (der regelt privat/gewerbe, NICHT die Bauform — diese
Verwechslung war schon einmal ein Fehler, siehe Tests in lib/__tests__).

→ Beantwortet oben: die Kachel misst Hausspeicher, Großspeicher steht als eigene
Zeile daneben.
