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
