# Briefing: Kontaktaufnahme mit dem IW zum Report 36/2026

Stand: 27.07.2026. Für eine eigene Session gedacht, die den Kommentar/die Anfrage
ans Institut der deutschen Wirtschaft formuliert. Alles hier ist am Volltext
geprüft (`docs/gmodg/IW-Report_2026-Gebäudemodernisierungsgesetz.pdf`),
Seitenzahlen beziehen sich auf die Seitennummerierung des PDF.

## Der Report

**IW-Report 36/2026**, „Wie hoch sind die Mehrkostenrisiken durch das
Gebäudemodernisierungsgesetz (GModG)? Modellrechnungen für den Einbau neuer
fossiler Heizungen auf die Heizkosten für Vermieter und Mieter".
Ralph Henger / Malte Küper / Laurens Wünsch, Köln, 25.07.2026.
DOI 10.67087/12.21419.

Kontakte laut Impressum (S. 2): henger@iwkoeln.de (0221 4981-744),
kueper@iwkoeln.de (0221 4981-673), wuensch@iwkoeln.de (0221 4981-429).
Malte Küper ist Senior Economist für Energie- und Klimapolitik — für Fragen zu
den Preispfaden vermutlich der richtige Adressat.

## Was wir mit dem Report machen

solar-check.io nutzt die Preisannahmen des Reports als zuschaltbares Szenario im
Wärmepumpen-Rechner und im Ratgeber „Gasheizung oder Wärmepumpe". Umgesetzt in
`lib/greengas-config.ts` + `lib/greengas.ts`. Attribution: Quelle mit Autoren,
Report-Nummer und Fundstelle auf `/datenstand` und unter jeder Grafik, Deep-Link
auf die Studienseite. Das IW wird als arbeitgebernahes Institut benannt, das
Basisszenario ausdrücklich als analytischer Referenzpfad, nicht als Prognose.

Unsere Nachrechnung trifft die Reportwerte exakt: 1.080 € (2026) / 1.952 € (2040)
/ 2.366 € (2045) bei 10.000 kWh, Basisszenario, Referenzhaushalt MFH1.
Festgehalten in `lib/__tests__/greengas.test.ts`.

## Der eigentliche Anlass: Fußnote 3 auf S. 9

In der Presse und in Ratgeberportalen kursiert die Bio-Treppe verbreitet mit einer
fünften Stufe „100 % ab 2045". Die gibt es nicht. Der Report ist die klarste
Quelle, die das benennt — Fußnote 3, S. 9, wörtlich:

> „Im Gesetzgebungsprozess wurde die Perspektive für Brennstoffe ab 2045
> nachgeschärft. Zwar wurde in § 43 GModG keine 100-Prozent-Stufe ab 2045
> ergänzt, dafür aber ein weiterer Paragraf § 42a GModG neu aufgenommen, wonach
> die Bundesregierung bis zum 1. Dezember 2026 ein separates Gesetz zur Grüngas-
> und Grünheizölquote vorlegen muss […]" (BT-Drs. 21/7009)

Wir hatten die Falschaussage selbst auf der Seite stehen und haben sie anhand
dieser Fußnote korrigiert. Das ist ein möglicher Aufhänger für den Kontakt:
Rückmeldung, dass genau diese Fußnote die sauberste verfügbare Klarstellung ist.

## Belegte Fakten (mit Fundstelle)

| Aussage | Fundstelle |
|---|---|
| Bio-Treppe: 10 % (2029), 15 % (2030), 30 % (2035), 60 % (2040), keine weitere Stufe | Tabelle 2-2, S. 9 |
| 2028: Bio-Treppe „–"; „bis zu 1 %" gehört zur Quote nach § 42a | Tabelle 2-2, S. 9 |
| Quote 2029–2040: „noch kein konkreter gesetzlicher Quotenpfad festgelegt" | Tabelle 2-2, S. 9 |
| Bio-Treppe nur für Neueinbau; maßgeblich ist der tatsächliche Einbau, nicht Bestell-/Rechnungsdatum | Fußnote 2, S. 7 |
| GModG tritt am Tag nach der Verkündung im BGBl. in Kraft | Fußnote 2, S. 7 |
| Bestandsanlagen: keine der Bio-Treppe vergleichbare Pflicht (§ 72 GEG gestrichen) | S. 9 |
| Quote setzt bei Inverkehrbringern an, ab 2028 | Kap. 2.3, S. 9 |
| Anrechenbar: Biomethan, Bioheizöl, biogenes Flüssiggas, grüner/blauer/orangener/türkiser Wasserstoff + Derivate; Wasserstoff teils nur ≥ 70 % THG-Minderung | S. 9 |
| Referenzhaushalt MFH1: teilsanierte Altbauwohnung, 75 m², 10.000 kWh/a, Klasse D | Tabelle 3-1, S. 13 |
| Kostenaufstellung 2026 (netto 907,95 € → brutto 1.080 €) | Tabelle 3-2, S. 15 |
| 1.080 € → 1.952 € (2040) → 2.366 € (2045), Faktor 1,8 bzw. 2,2 | Kap. 4.1, S. 18 |
| Hochpreisszenario: 2.973 € (2045) ≈ 29,7 ct/kWh | Kap. 4.1, S. 19 |
| 74 % der Mehrkosten 2040 entfallen auf die Grüngas-Beschaffung | S. 19 |
| Wärmepumpen-Annahmen bewusst konservativ (JAZ 3,0 teilsaniert / 2,2 unsaniert; Gas-Brennwert 0,95); Vergleich „bewusst zugunsten der Gasheizung ausgestaltet" | Tabelle 4-1 + Text, S. 20 |
| Basisszenario „nicht als wahrscheinlichste Entwicklung zu interpretieren, sondern […] analytischer Referenzpfad" | Anhang Kap. 6, S. 31 |
| Alle Preisannahmen (Erdgas, Biomethan, Netzentgelt, Steuer, CO₂, MwSt., Wärmepumpentarife) | Anhang Kap. 6, S. 31–32 |
| Gas-Mix-Verlauf und Preisspanne, 10,9 → 23,7 ct/kWh | Abb. 6-1 / 6-2, S. 33 |

## Mögliche Punkte für die Anfrage

1. **Emissionsfaktor, kleine Unschärfe.** S. 32 leitet her: 0,2029 kg CO₂e/kWh
   (heizwertbezogen) × 0,903 → der Report nennt daraus „rund 0,1833 kg CO₂e/kWh".
   Nachgerechnet ergibt das Produkt 0,18322, also gerundet 0,1832. Differenz
   0,04 %, ohne sichtbare Wirkung — aber falls eine Neuauflage kommt, ist es ein
   sauberer Hinweis. Wir führen bewusst den Report-Wert 0,1833 weiter.
2. **EFH vs. MFH.** Der Anhang differenziert Erdgas (5,5 / 5,2 ct) und
   Netzentgelt (2,6 / 2,2 → 6,8 / 6,4 ct). Wir führen die MFH-Werte, obwohl unser
   Musterhaus ein Einfamilienhaus ist — Differenz unter 3 % des Gaspreises. Frage,
   ob das IW das für vertretbar hält oder zur Trennung rät.
3. **Fortschreibung nach 2040.** Die 100 % für 2045 sind Modellannahme aus § 42a.
   Falls das Quotengesetz bis 01.12.2026 kommt: Ist eine Aktualisierung des
   Preispfads geplant? Für uns die Frage, wann wir nachziehen müssen.
4. **Nutzungshinweis.** Ob eine Weiterverwendung der Preispfade in einem
   kostenlosen Verbraucher-Rechner mit voller Attribution in Ordnung geht — und
   ob das IW eine bestimmte Zitierweise wünscht.

## Ton

Fachlich, knapp, keine Anbiederung und keine Kritik am Institut. Wir sind Nutzer
ihrer Zahlen, haben sie nachgerechnet, und melden zwei Beobachtungen zurück. Die
Trägerschaft des IW (arbeitgebernah) benennen wir auf der Website offen — das
gehört nicht in den Brief, ist aber gut zu wissen, falls es zur Sprache kommt.
