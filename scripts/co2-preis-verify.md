# CO2-Preis-Verifikation — Runbook (jährlich, jeweils im Dezember)

**Zweck:** Den CO2-Preispfad in `lib/co2-config.ts` (`CO2_PRICE.anchors` +
`annualIncrease`) gegen die offizielle Gesetzeslage und gegen offizielle
Prognosen abgleichen. Der Preis fließt in die Wärmepumpen-Wirtschaftlichkeit ein
(`calcFuelCost` → CO2-Aufschlag auf Gas/Öl). Ein veralteter Pfad verzerrt die
Gas-Referenz und damit die TCO-Differenz im WP-Rechner.

**Warum jährlich im Dezember:** Der nationale BEHG-Preis wird politisch
festgelegt — meist mit dem Bundeshaushalt fürs Folgejahr (Verabschiedung Nov/Dez).
Im Dezember steht damit fest, was im neuen Jahr gilt, und die Config ist aktuell,
bevor das Jahr umspringt. (Korridor 55–65 €/t für 2026 **und** 2027, eingefroren
laut Koalitionsausschuss 05/2026. EU-ETS2-Markt startet 2028 — ab dann echte
Marktpreise statt Schätzung.) Stichtag steht in `CO2_PRICE.reviewBy`.

**Dazu zwei laufende Wächter (melden nur, ändern nichts):**
- **Monatlich** (`co2-prognose-monitor`): scannt die verlässlichen Quellen
  (Agora, Expertenrat, UBA/DEHSt, EU-Kommission, ICIS/BloombergNEF) auf NEUE
  Marktprognosen und meldet Abweichungen vom hinterlegten Pfad.
- **Wöchentlich** (`foerder-news-waechter`): fängt politische/gesetzliche
  Ad-hoc-Beschlüsse zum CO2-Preis mit ab (z. B. ein Koalitionsausschuss zwischen
  den Dezember-Läufen).

## So wird die Routine ausgelöst

Dem Assistenten sagen: **„Lauf die CO2-Preis-Prüfung."** Er liest dieses Runbook,
spawnt **einen Recherche-Agenten** und arbeitet das Ergebnis ab.

Mitgeben: den aktuellen Inhalt von `lib/co2-config.ts` (`anchors`,
`annualIncrease`, `validFrom`, `reviewBy`, `source`) und das heutige Datum.

## Agent-Prompt (Vorlage)

> Du bist Verifizierer für den deutschen CO2-Preispfad (Heizen). Prüfe den
> hinterlegten Preispfad gegen die OFFIZIELLE Gesetzeslage und offizielle
> Prognosen. Heute ist {DATUM}.
>
> Hinterlegt: {anchors als Jahr→€/t, annualIncrease, validFrom, reviewBy, source}
>
> Vorgehen (WebSearch + WebFetch):
> 1. **Nationaler BEHG-Preis** (bis ETS2 greift): Welcher gesetzliche Preis bzw.
>    Korridor gilt für das aktuelle und das kommende Jahr? Primärquellen:
>    Umweltbundesamt (UBA) / Deutsche Emissionshandelsstelle (DEHSt),
>    Bundesfinanzministerium/BMWK, aktueller Koalitions-/Haushaltsbeschluss.
> 2. **EU-ETS2-Start & -Preis**: Ist der Starttermin weiter 2028? Gibt es einen
>    geänderten Soft-Cap (Preisstabilitätsmechanismus, ~45 €/t in 2020-Preisen)?
>    Primärquellen: EU-Kommission (DG CLIMA), EU-Umweltrat.
> 3. **Offizielle/seriöse Forecasts** für den ETS2-Marktpreis ab Start:
>    Agora Energiewende, Expertenrat für Klimafragen, ICIS, BloombergNEF.
>    Sekundärquellen klar kennzeichnen.
> 4. Vergleiche mit den hinterlegten Werten.
>
> Gib NUR dieses Format zurück (keine Einleitung):
> ```
> STATUS: ok | abweichung
> BEHG_AKTUELLES_JAHR: <Jahr> = <€/t> (hinterlegt: <€/t>)
> BEHG_NAECHSTES_JAHR: <Jahr> = <€/t> (hinterlegt: <€/t>)
> ETS2_START: <Jahr> (hinterlegt: 2028)
> ETS2_FORECAST: <Spanne €/t für die nächsten Jahre, mit Quelle>
> EMPFEHLUNG: <konkret: welche anchors/annualIncrease ändern, oder "keine Änderung">
> QUELLEN: <Liste mit URLs, Primärquellen zuerst>
> ```

## Nach der Prüfung

- **Bei `ok`:** nur `validFrom` und `reviewBy` in `lib/co2-config.ts` auf das
  nächste Jahr hochsetzen (bestätigt, dass der Pfad noch stimmt).
- **Bei `abweichung`:** zuerst das **Council** laufen lassen
  (`scripts/council-verify.md`). CO2 ist ein **Ermessensfall** (welcher Anker,
  Korridor-Boden vs. -Decke, ETS2-Encoding) → **kein Auto-Fix, auch bei Konsens**.
  Den vom Council bestätigten Vorschlag mailen; erst nach Freigabe `anchors` /
  `annualIncrease` + `source`/`validFrom`/`reviewBy` in `lib/co2-config.ts`
  anpassen, die Tests in `lib/__tests__/calc.test.ts` (`co2PriceForCalendarYear`)
  auf die neuen Stützstellen, `npm run build` + `npm test` grün, dann committen.
- **Anker müssen lückenlos sein** (Jahr für Jahr ab dem ersten Anker bis zum
  letzten) — `co2PriceForCalendarYear` extrapoliert erst ab dem Jahr NACH dem
  letzten Anker.
