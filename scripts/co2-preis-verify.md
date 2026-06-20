# CO2-Preis-Verifikation — Runbook (jährlich, jeweils im Januar)

**Zweck:** Den CO2-Preispfad in `lib/co2-config.ts` (`CO2_PRICE.anchors` +
`annualIncrease`) gegen die offizielle Gesetzeslage und gegen offizielle
Prognosen abgleichen. Der Preis fließt in die Wärmepumpen-Wirtschaftlichkeit ein
(`calcFuelCost` → CO2-Aufschlag auf Gas/Öl). Ein veralteter Pfad verzerrt die
Gas-Referenz und damit die TCO-Differenz im WP-Rechner.

**Warum jährlich im Januar:** Der nationale BEHG-Korridor wird politisch
festgelegt (Korridor 55–65 €/t für 2026 **und** 2027, eingefroren laut
Koalitionsausschuss 05/2026). Der EU-ETS2-Markt startet 2028 — ab dann gibt es
echte Marktpreise statt einer Schätzung. Beide ändern sich zum Jahreswechsel
bzw. mit neuen Haushalts-/EU-Beschlüssen. Stichtag steht in `CO2_PRICE.reviewBy`.

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
- **Bei `abweichung`:** `anchors` / `annualIncrease` anpassen, `source` +
  `validFrom` + `reviewBy` aktualisieren. Die Tests in
  `lib/__tests__/calc.test.ts` (`co2PriceForCalendarYear`) auf die neuen
  Stützstellen anpassen. `npm run build` + `npm test` grün, dann committen.
- **Anker müssen lückenlos sein** (Jahr für Jahr ab dem ersten Anker bis zum
  letzten) — `co2PriceForCalendarYear` extrapoliert erst ab dem Jahr NACH dem
  letzten Anker.
