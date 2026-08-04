# Briefing: Ratgeber „Einspeisevergütung" (eigene Session)

**Auftrag (Betreiber-Go vom 04.08.2026):** Ratgeber-Seite rund um die Einspeisevergütung,
die das Info-Suchumfeld neben dem Rechner abdeckt. Der Rechner selbst bleibt, wie er ist
(bewusst kein Flow — Sofort-Antwort ist die Suchintention).

## Keyword-Umfeld (Kandidaten — vor dem Bau per DataForSEO prüfen, Zugang siehe scripts/seo-verify.md)

- „einspeisevergütung 2026" / „einspeisevergütung photovoltaik" (Hauptvolumen)
- „einspeisevergütung tabelle" (die historische Tabelle ist unser Alleinstellungsmerkmal)
- „einspeisevergütung bestandsanlagen", „einspeisevergütung nach 20 jahren"
- Der Rechner-Begriff (KD 1) ist schon von `/einspeiseverguetung-rechner` abgedeckt.

## Datenschatz (alles vorhanden, NICHTS neu tippen)

- **`lib/feedin-archiv.ts`** — amtliche Monatstabelle 04/2012–07/2022 (124 Monate,
  ≤10/≤40 kWp, aus 34 BNetzA-Originaldateien in `docs/quellen/bnetza-archiv/`,
  Anker-Tests in `lib/__tests__/feedin-archiv.test.ts`). Als Nachschlage-Tabelle
  rendern — das hat in dieser Qualität niemand.
- **`lib/feedin-config.ts`** — aktuelle Sätze (Stichtags-Plan, flippt am 1.2./1.8. von
  selbst) + `feedInRatesForCommissioning()` + `feedInEndIso()` (§ 25: Ende 31.12. des
  zwanzigsten Jahres, Wortlaut am 04.08.2026 geprüft).
- **`lib/feedin-history.ts`** — Jahres-Reihe 2000–2026 für Charts (per Kohärenz-Test an
  die Monatstabelle genagelt; 2000–2011 dort nur als Jahreswerte, Quelle SFV).
- **`lib/faq.ts → einspeiseverguetungFaq()`** — geprüfte FAQ-Antworten inkl. des
  geteilten EEG-2027-Eintrags (`eegReform2027FaqEntry`, EINE Quelle — nie kopieren).

## Muster

- Redaktionelles Seiten-Muster wie die vier bestehenden Ratgeber (ArticleMeta,
  Breadcrumb, Faq, RelatedLinks, `lib/ratgeber.ts`-Eintrag). Top-Level-Keyword-Slug
  ist okay (Präzedenzfall `/photovoltaik-neigungswinkel`).
- Zahlen IMMER live aus den Modulen rechnen/rendern — kein Wert handgetippt
  (Zahlen-Korrektheit-BLOCKER). Rechtsaussagen: nur die schon geprüften Formulierungen
  aus faq.ts/feedin-config wiederverwenden; NEUE Rechtssätze → Council.
- Deep-Links: Rechner mit Kontext verlinken; RelatedLinks-Blöcke der PV-Seiten um den
  neuen Ratgeber ergänzen.
- Vor-2012-Ära: Jahreswerte aus feedin-history dürfen gezeigt werden (mit
  SFV-Quellvermerk wie dort dokumentiert), aber keine Monats-Scheingenauigkeit.

## Abnahme

Sichtbare neue Seite → Local-First: Dev-Server, Link an den Betreiber, Go abwarten,
dann Merge. Ratgeber-Registry-Eintrag setzt `updated` und damit die Sitemap.
