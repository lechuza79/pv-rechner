# Balkonkraftwerk-Vergleichsseite + Affiliate — Konzept und Sachstand

**Stand: 18.08.2026. Entscheidung des Betreibers: zurückgestellt, nicht verworfen.**
Zuerst kommt der Anmelde-Guide, dann wird gemessen, ob unser Muster überhaupt
greift. Dieses Dokument hält fest, was recherchiert ist — damit die Arbeit beim
Wiederaufnehmen nicht bei null anfängt.

---

## 1. Warum überhaupt: die Suchabsicht ist gemessen, nicht geschätzt

Am 17./18.08.2026 über DataForSEO die echten Suchergebnisseiten (Deutschland,
Top 10 organisch) abgerufen und nach Shop-Anteil und Produktkarussells
klassifiziert. **Das ist der wichtigste Teil dieses Dokuments**, weil ohne diese
Messung zweimal die falsche Seite gebaut worden wäre.

| Art | Keyword | Vol./Monat | KD | Shops in Top 10 | Produktkarussell |
|---|---|---|---|---|---|
| INFO | lohnt sich ein balkonkraftwerk | 1.600 | 6 | 11 % | – |
| INFO | balkonkraftwerk speicher test | 880 | 0 | 11 % | – |
| INFO | lohnt sich ein bkw mit speicher | 720 | 6 | 22 % | – |
| INFO | balkonkraftwerk mit speicher sinnvoll | 390 | 0 | 22 % | – |
| gemischt | balkonkraftwerk rechner | 2.400 | 4 | 30 % | – |
| KAUF | balkonkraftwerk halterung | 3.600 | 0 | 56 % | 3× |
| KAUF | balkonkraftwerk 800 watt | 12.100 | 16 | 70 % | 4× |
| KAUF | balkonkraftwerk | 301.000 | 32 | 67 % | 3× |
| KAUF | balkonkraftwerk mit speicher | 135.000 | 29 | 80 % | 3× |
| INFO | balkonkraftwerk anmelden | 27.100 | 17 | ~0 % | – (aber KI-Antwort) |

**Die Lehre daraus — bitte nicht wiederholen:** „balkonkraftwerk mit speicher"
sieht mit 135.000 Suchen wie der große Preis aus. Die Suchergebnisseite besteht
zu 80 % aus Shops plus drei Produktkarussellen. **Ein Ratgeber kann dort nicht
ranken, egal wie gut er ist.** Die Schwierigkeitszahl (29) misst Backlink-Stärke,
nicht Absichts-Konflikt — sie hätte diesen Fehler nicht verhindert.

Die Vergleichs-Absicht lebt in den INFO-Zeilen: zusammen rund **3.600 Suchen im
Monat bei Schwierigkeit 0–6**, Konkurrenz sind NDR, ADAC, Vattenfall, Stiftung
Warentest und zwei kleine Fachseiten. **Reddit rankt auf drei von vier** — Google
belohnt hier erkennbar echte Erfahrung statt Marketing-Prosa.

**Ebenfalls gemessen (18.08.2026):** Wir ranken für genau zwei Balkon-Keywords,
beide auf Position 102/103, beide über `/photovoltaik-foerderung/hessen`.
Domainweit 45 rankende Keywords. Also praktisch bei null.

---

## 2. Was die Seite können muss, das keine andere kann

Die Shops schreiben Herstellerangaben ab. Stiftung Warentest misst Geräte, sagt
aber nichts über den einzelnen Haushalt. **Unser Alleinstellungsmerkmal ist die
Rechnung dazwischen:**

> Nicht „2,7 kWh Kapazität", sondern: bei 2.800 kWh Jahresverbrauch und Südbalkon
> holt dir dieser Speicher 49 €/Jahr — und amortisiert sich nach 8,3 Jahren, also
> **nicht** innerhalb seiner Lebensdauer.

Das kann `calcBalkon` heute schon. Die Vergleichsseite ist im Kern eine
Produkt-Tabelle, deren Zeilen durch unser Modell laufen.

**Der zweite Hebel ist der Wirkungsgrad.** Alle Vergleichsseiten übernehmen das
Datenblatt („bis zu 96 %"). Real sind es rund **82,5 %** — belegt über die
HTW-Messreihe, hinterlegt als `storageRoundtrip` in `lib/balkon-config.ts`
(Herleitung im Kommentar dort). Eine Tabelle, die damit rechnet, kommt bei
mehreren Geräten zu einem **anderen Ergebnis als jede andere Seite im Netz**.
Das ist der Grund, warum die Seite existieren darf.

**Wortwahl — BLOCKER:** Es ist ein **Vergleich**, kein **Test**. Wir messen keine
Geräte. „Test" wäre irreführend (§ 5 UWG) und zerstört genau das, womit die Seite
wirbt. Priwatt macht das übrigens — ein Shop mit einem „Test"-Artikel, in dem
nichts getestet wurde.

---

## 3. Seitenmuster (Vorbild des Betreibers: happycoffee.org)

Referenz: `happycoffee.org/de-de/e/philips-lattego-2300-3200-3300`. Struktur von
oben nach unten, am Original abgelesen:

1. Brotkrumen, Produktbild, Titel
2. **Varianten-Auswahl + Bestpreis** (ein Dropdown statt eigener URLs je Variante)
3. Kurz-Einschätzung mit Autor
4. Ausstattung in Stichpunkten
5. **Preisvergleichs-Tabelle** je Variante/Farbe, mit Händleranzahl
6. Stärken & Schwächen
7. **Kaufentscheidungs-Guide**: vier Szenarien mit Modellempfehlung und Aufpreis
8. Technische Daten (identische vs. unterschiedliche Merkmale getrennt)
9. Stimmen aus Tests und Rezensionen, mit Quelllinks
10. Community-Fragen
11. Alternativen-Karussell

**Was wir übernehmen:** 2, 5, 6, 7, 8, 11. Besonders 7 — die Szenarien sind bei
uns keine Redaktionsmeinung, sondern gerechnet.

**Was wir ersetzen:** Statt „Kurz-Einschätzung" (3) unser gerechnetes Ergebnis
für den eingegebenen Haushalt. Das ist der Platz, an dem wir besser sind.

**Was wir weglassen:** Sterne-Bewertungen. Wir haben nichts getestet.

**Alle Varianten auf EINER URL** (Selector statt Einzelseiten) — verhindert
Thin-Content-Seiten, die sich nur in einer Zahl unterscheiden.

---

## 4. Affiliate: Konditionen (Stand 18.08.2026)

**Fachshops** — Werbeaussagen der Programme selbst, nicht nachverhandelt:

| Programm | Provision | Warenkorb | Netzwerk |
|---|---|---|---|
| Kleines Kraftwerk | bis 10 % | ~920 € | 100partnerprogramme |
| solago | bis 6 % | – | affiliate-marketing.de |
| MyVoltaics | 6 % | – | affiliate-marketing.de |
| Solakon | 5 % | – | **Awin** |
| PVundSO | bis 5 % | – | – |
| Yuma | eigenes Programm | – | – |
| Indevolt | – | – | **Awin** |

10 % auf 920 € sind rund **92 € pro Verkauf**. Awin-Programme liefern
**Produktdatenfeeds** — das löst die Preispflege maschinell.

**Offen:** reale Provision, Cookie-Laufzeit, Stornoquote. Steht erst nach
Anmeldung fest.

### Amazon — am Original geprüft

Die Programmrichtlinien (`partnernet.amazon.de/help/operating/policies`) sagen
in Abschnitt 2b der Teilnahmevoraussetzungen:

> „Da sich Preise und Verfügbarkeit der auf Ihrer Website aufgeführten Produkte
> ändern können, dürfen Sie auf Ihrer Website nur Angaben zu Preisen und
> Verfügbarkeit machen, wenn: (a) wir den Link in dem die Angaben zu Preisen und
> Verfügbarkeit dargestellt sind bedienen oder (b) Sie Daten zu Preisen und
> Verfügbarkeit über die Creators API und die PA API abrufen"

Abschnitt 2i verlangt bei seltener als stündlicher Aktualisierung einen
**Datumsstempel**, Beispiel aus der Richtlinie:

> „Preis auf [Amazon-Website]: EUR 32,77 (Stand 07.01.2008 14:11 Uhr [Zeitzone])"

**Korrektur eines Irrtums vom 18.08.2026:** In der Erörterung stand zuerst,
gespeicherte Preise seien verboten und Amazon könne deshalb erst später
mitspielen. **Das ist falsch** — sie sind ausdrücklich erlaubt, sofern
gestempelt. Und der Zeitstempel ist ohnehin unsere Hausart. Das Vorbild
happycoffee macht es genau so („Amazon Deutschland · Zuletzt geprüft vor 4 h").

**Unverifiziert (nur Fachquellen, kein Amazon-Dokument gelesen):** Zugang zur
PA-API erfordert 3 qualifizierte Verkäufe in 180 Tagen, Erhalt danach 10 Verkäufe
je 30 Tage. Cookie-Laufzeit 24 Stunden. Elektronik-Provision 3–4 %.
**Vor dem Bau am Original nachlesen.**

**Entscheidung des Betreibers (18.08.2026): Amazon ohne Preis wird nicht
angezeigt.** Also entweder mit Preis (setzt API-Zugang voraus) oder gar nicht.
Der zwischenzeitliche Vorschlag „Link ohne Preis von Tag eins" ist damit vom
Tisch.

**Risiko fürs Design:** Fällt der API-Zugang wegen zu weniger Verkäufe weg,
frieren die Amazon-Preise ein. Für uns wäre das schlimmer als kein Preis.
Deshalb muss die Tabelle **ohne Amazon vollständig bleiben** — Amazon ist eine
Zusatzspalte, keine tragende.

---

## 5. Was der Wiederaufnahme im Weg steht

1. **Anmeldung bei mindestens einem Programm** (Empfehlung: Awin + Kleines
   Kraftwerk). Gehört dem Betreiber, da Vertragsbindung.
2. **Datenfeed prüfen:** Enthält er Wechselrichter-Leistung, Modul-Wattpeak und
   nutzbare Speicherkapazität? Ohne diese drei Felder kann unser Modell nicht
   rechnen, und die Seite wäre eine Spezifikationstabelle wie jede andere.
3. **Wächter-Runbook** für die Preis-/Produktpflege, analog `scripts/balkon-verify.md`.
   Ohne das rotten die Daten — und veraltete Preise sind die eine Fehlerklasse,
   die dieser Seite die Existenzberechtigung nimmt.
4. **Legal-Checkliste #9** (`CLAUDE.md`): Erste Bezahlfunktion ⇒ Open-Meteo auf
   API-Abo umstellen (Free-Tier ist nicht-kommerziell), Widget-Nutzungsbedingungen
   zu AGB ausbauen, Impressum auf Rechtsform prüfen. **Vor Launch, nicht danach.**
5. **Kennzeichnung** nach § 5a UWG. Vorbild-Formulierung von happycoffee:
   „Bei einem Klick auf »Zum Angebot« verlässt du solar-check.io. Wir erhalten
   beim Kauf ggf. eine Provision — für dich ändert sich am Preis nichts."
   Position: direkt unter der Preistabelle, nicht im Footer.

---

## 6. Reihenfolge, auf die wir uns geeinigt haben

1. **Anmelde-Guide** live (27.100/Monat, echte Info-Absicht) — gebaut, wartet auf Abnahme.
2. **Messen**, 2–3 Wochen: landet die Seite? Vorher wissen wir nicht, ob unser
   Muster überhaupt greift.
3. **Vergleichsseite** auf die INFO-Keywords ausgerichtet, mit gerechnetem Ranking.
4. **Hub** `/balkonkraftwerk`, sobald drei Seiten stehen.

Der Positionierungs-Konflikt ist geklärt: Der Betreiber hat am 17.08.2026
entschieden, dass Werbefreiheit **nicht** das Versprechen ist — sondern
barrierefreier Zugang zu Information. Eine konkrete Kaufempfehlung gilt als
nächster logischer Serviceschritt, wenn der Bedarf geklärt ist.
