# Grüngas-/GModG-Verifikation — Runbook

**Zweck:** Die Aussagen zur Bio-Treppe (§ 43 GModG) und zum Verfahrensstand des
Gebäudemodernisierungsgesetzes in `lib/greengas-config.ts` gegen die amtliche
Quelle abgleichen. Sie tragen den Ratgeber `/ratgeber/gasheizung-oder-waermepumpe`,
die FAQ, das Grüngas-Modal im Wärmepumpen-Rechner, die Datenstand-Seite und —
über `gasQuoteForYear` — den gesamten Gas-Preispfad im WP-Rechner.

**Warum es dieses Runbook gibt (Juli 2026):** In drei Texten stand eine
„100 % ab 2045"-Stufe der Bio-Treppe, die es in § 43 GModG nie gab — sie war aus
einer Modellannahme des IW-Reports zu einer Gesetzesaussage geworden. Gleichzeitig
fehlte die 2030er-Stufe in den Texten, obwohl die Rechenkurve sie hatte. Beides
stand monatelang öffentlich. Seitdem gilt: Stufen und Verfahrensstand kommen aus
**einer** Quelle (`BIO_TREPPE_STUFEN`, `bioTreppeStufenText()`, `gmodgStandSatz()`),
ein Test nagelt die Stufenliste fest, und dieses Runbook prüft sie gegen das Gesetz.

## Die zwei Dinge, die auseinanderlaufen können

1. **Der Verfahrensstand** (`GMODG_RECHTSSTAND.verkuendet`). Das ist der akute
   Fall: Das Gesetz wurde am 10.07.2026 beschlossen, die Verkündung im
   Bundesgesetzblatt stand danach noch aus. Sobald sie erfolgt, ist der Satz
   „die Verkündung stand noch aus" auf jeder betroffenen Seite falsch. Deshalb
   prüft das der **tägliche** `foerder-news-waechter` mit (Schritt 4c), nicht
   erst der Jahres-Lauf.
2. **Die Stufen selbst** (`BIO_TREPPE_STUFEN`) und die Modellannahme für 2045
   (`quoteStops[2045]`). Ändert der Gesetzgeber die Bio-Treppe oder beschließt er
   das in § 42a angekündigte Quotengesetz, ändern sich Zahlen im Rechner.

## So wird die Routine ausgelöst

Dem Assistenten sagen: **„Lauf die Grüngas-Prüfung."** Er liest dieses Runbook und
spawnt einen Recherche-Agenten.

Mitgeben: den aktuellen Inhalt von `lib/greengas-config.ts` (`BIO_TREPPE_STUFEN`,
`quoteStops`, `GMODG_RECHTSSTAND`, `validFrom`, `reviewBy`, `source`) und das
heutige Datum.

## Agent-Prompt (Vorlage)

> Du bist Verifizierer für die Grüngas-Pflicht nach dem deutschen
> Gebäudemodernisierungsgesetz (GModG). Heute ist {DATUM}.
>
> Hinterlegt: {BIO_TREPPE_STUFEN, quoteStops, GMODG_RECHTSSTAND, source}
>
> Vorgehen (WebSearch + WebFetch), **ausschließlich Primärquellen** — amtliche
> Seiten und Gesetzestext, KEINE Presseartikel, KEINE Portale von
> Heizungsanbietern, KEINE Affiliate-Seiten:
> 1. **Verkündung:** Ist das GModG im Bundesgesetzblatt verkündet? Wenn ja: mit
>    welchem Datum und welcher Fundstelle? Quellen: recht.bund.de /
>    Bundesgesetzblatt, gmodg.bund.de (GEG-Infoportal, Chronologie),
>    bundesregierung.de. Wenn ja: Wann sind die Heizungsregeln in Kraft getreten?
> 2. **Bio-Treppe (§ 43):** Welche Prozentstufen mit welchen Jahren stehen im
>    geltenden Gesetzestext? Zähle sie vollständig auf. Gibt es eine Stufe nach
>    2040? Sind die anrechenbaren Brennstoffe unverändert (Biomethan, Bioöl,
>    biogenes Flüssiggas, Wasserstoff und Derivate)?
> 3. **§ 42a / Quotengesetz:** Ist das angekündigte Gesetz zur Grüngas- und
>    Grünheizölquote für Inverkehrbringer vorgelegt oder beschlossen? Wenn ja:
>    welche Quoten mit welchen Jahren? Das ist der Punkt, an dem aus der heutigen
>    IW-Annahme („100 % bis 2045") echte Gesetzeszahlen werden könnten.
>
> Für JEDE Angabe die Fundstelle (URL + Datum) nennen. Wo du nichts Amtliches
> findest, schreibe „nicht belegbar" — rate nicht und nimm keinen Presseartikel
> als Ersatz.

## Apply-Politik

Dieselbe Linie wie bei den anderen Wächtern — automatisch nur, was genau **eine**
richtige Antwort hat:

- **Verkündungs-Flag: Auto-Fix erlaubt**, aber erst nach Council gemäß
  `scripts/council-verify.md` (drei unabhängige Verifizierer, einer adversarial)
  und nur mit einer konkreten Bundesgesetzblatt-Fundstelle als Beleg. Dann in
  `lib/greengas-config.ts` `GMODG_RECHTSSTAND.verkuendet` auf `true` setzen und
  `stand` auf den aktuellen Monat. Mehr nicht — der Satz selbst kommt aus
  `gmodgStandSatz()` und zieht überall automatisch nach. `npx vitest run` +
  `npm run build` grün, dann mergen und pushen.
- **Stufenwerte, anrechenbare Brennstoffe, Quotengesetz: kein Auto-Fix.** Das sind
  zitierfähige Rechtsaussagen, die in die Berechnung durchschlagen — Befund in den
  Report, Formulierung und Eintrag macht ein Mensch. Gilt ausdrücklich auch, wenn
  der Befund eindeutig aussieht.
- **Schwellen aufweichen ist nie die Lösung.** Wenn der Test
  `lib/__tests__/greengas.test.ts → "die Stufen-Liste für Texte enthält genau die
  vier Gesetzesstufen"` anschlägt, ist entweder das Gesetz geändert (→ Mensch) oder
  jemand hat eine Stufe erfunden (→ zurücknehmen). Den Test anzupassen, damit er
  wieder grün wird, ist der Fehler, den er verhindern soll.
- **Texte mitziehen:** Ändert sich eine Zahl, im selben Fix prüfen, ob sie auch in
  `lib/faq.ts`, im Ratgeber, im WP-Rechner-Modal oder auf `/datenstand` als
  Fließtext steht. Die geteilten Helfer decken die Stufen und den Standsatz ab —
  freie Formulierungen drumherum nicht.

## Prüfrhythmus

- **Täglich:** `foerder-news-waechter`, Schritt 4c — Verkündung + Ad-hoc-Änderungen.
- **Jährlich:** zusammen mit `waermepumpe-werte-verify-jaehrlich` (Januar), weil
  der Grüngas-Pfad die Gas-Referenz des WP-Rechners ist. Stichtag steht in
  `GREEN_GAS_CONFIG.reviewBy`.
