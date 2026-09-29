# Heat-pump tariff in the rooftop PV comparison

Checked 2026-09-28. This correction belongs to the separate rooftop PV work, not the BKW release.

The current rooftop PV model applies the household electricity price to all grid demand and avoided grid purchases. Its heating comparison must therefore use the same price and shared household meter. Include heat-pump maintenance, but no additional heat-pump meter standing charge. The household meter already exists in both cases.

The previous comparison silently combined a 24 ct/kWh separate heat-pump tariff and its meter standing charge with the household-priced PV model. A discounted separate tariff can be valid with suitable metering, including cascade metering for PV, but cannot be substituted in just one comparison. Supporting that alternative requires the same tariff and metering assumptions in the global baseline, PV valuation and heating comparison.

Sources:
- https://www.verbraucherzentrale.de/wissen/energie/preise-tarife-anbieterwechsel/waermepumpenstrom-so-heizen-sie-guenstiger-mit-der-waermepumpe-13750
- https://www.adac.de/rund-ums-haus/energie/versorgung/kaskadenschaltung/

Regression: `lib/__tests__/pv-heatpump-tariff.test.tsx` verifies the rendered costs at two household prices and rejects the old separate-meter calculation.
