# Klimaanlagen-Werte — Runbook (quartalsweise)

**Zweck:** Die geräte- und preisabhängigen Annahmen in `lib/aircon-config.ts`
(`DEFAULT_AIRCON_CONFIG`) gegen den Markt prüfen. Sie bestimmen Stromkosten,
Anschaffung, den Gerätevergleich und — für den „Auch heizen?"-Block — die Heiz-
Effizienz. Der **Strompreis** kommt bereits live (aus `market_prices`), die
**Kühlgradstunden** live aus `/api/cooling-degree`; hier geht es um die statischen
Geräte-/Preis-Werte. Vom „Auch heizen?"-Block gehört nur der **SCOP** hierher —
Split-Heizen gibt es NUR im Klima-Rechner. Der Heizwärmebedarf je Gebäudestandard
ist dagegen **geteilte Rechen-Basis** und wird im WP-Runbook gepflegt (siehe unten).

**Warum quartalsweise:** Gerätepreise und Effizienzklassen fallen mit den
Produktgenerationen; ein Quartals-Check hält sie aktuell (Consumer-Preise ändern
sich zu schnell für einen Jahresrhythmus).
Stichtag steht in `DEFAULT_AIRCON_CONFIG.reviewBy`.

---

## 0. Die wichtigste Regel: prüfe die SYSTEMATIK, nicht die einzelne Zahl

Der Wächter-Befund vom 15.07.2026 war **nicht** „ein Wert ist falsch". Alle drei
Effizienzwerte lagen einzeln in einem vertretbaren Korridor. Kaputt war das
*Verhältnis*: die mobile Split-Anlage war ~30 % vom Label abgewertet, die fest
installierte stand praktisch am Label, der Monoblock trug unmarkiert einen Wert
von einer **anderen Messskala**. Jeder Wert für sich verteidigbar, der Vergleich
trotzdem verzerrt — und der Vergleich ist das Produkt.

Deshalb: **„Wert X wirkt zu optimistisch, setz ihn runter" ist KEIN gültiger Fix.**
Ein `seer` ändert sich ausschließlich über seinen `labelValue` oder über einen
**benannten** strukturellen Effekt. Nie direkt.

## 1. Die Systematik (Soll-Zustand)

`seer` ist **kein Typenschild-Wert**, sondern die effektive Jahres-Effizienz:

```
seer = labelValue × AC_REAL_FACTOR × structuralFactor
```

| Feld | Bedeutung | Regel |
|---|---|---|
| `labelValue` | markttypischer Labelwert | nicht Bestwert, nicht gesetzliches Minimum |
| `labelMetric` | Skala des Labels | Einkanal → `EER`, alles andere → `SEER` |
| `AC_REAL_FACTOR` | Labor → Realbetrieb | **einheitlich für ALLE Typen**, aktuell 0,85 |
| `structuralFactor` | was die Prüfnorm ausklammert | SEER-Skala **immer 1,0** |

Kern in einem Satz: **Unterschiedliche Strenge zwischen Gerätetypen ist nur
zulässig, wenn ein physikalischer Effekt benannt ist, der außerhalb der Grenze
des jeweiligen Prüfverfahrens liegt.** Alles andere ist Ermessen und verboten.

Aktuell hat genau ein Typ `structuralFactor < 1`: der Monoblock (0,7,
Infiltration). Begründung ausführlich im Code.

`lib/__tests__/aircon.test.ts → "Effizienz-Systematik"` erzwingt das. **Änderst du
einen Wert und kein Test schlägt an, hast du vermutlich am falschen Ort gedreht.**

### Warum die Typenschilder nicht vergleichbar sind

- **VO (EU) 626/2011** kennt zwei Skalen. Split + mobile Split sind „room air
  conditioner" → **SEER** nach **EN 14825** (Teillast, 27 °C innen / 35 °C außen).
  Einkanal/Monoblock ist von EN 14825 **ausdrücklich ausgeschlossen** → nur
  **EER** nach **EN 14511** (Volllast).
- **Anhang VII, Fußnote:** Beim Einkanalgerät wird der Kondensator „not supplied
  with outdoor air, but indoor air" — das Gerät steht komplett in EINER 35-°C-
  Kammer. Kein Außen, kein Fenster, kein Pfad für nachströmende Luft. Die
  Infiltration ist nicht „übersehen", sie liegt außerhalb der Testgrenze.
- **Konsequenz** (Topten, aus Anhang II reproduzierbar): Einkanal Klasse A
  (EER 2,6) ≙ Split Klasse F (SEER 2,6) — seit 2013 verboten.

→ **„Alle am Typenschild" wäre also gerade KEINE einheitliche Grundlage.** Falls
das jemand vorschlägt: hier gegenlesen.

**Klassengrenzen (626/2011 Anhang II)**

| Klasse | Split/RAC SEER | Einkanal EER | Split SCOP |
|---|---|---|---|
| A+++ | ≥ 8,50 | ≥ 4,10 | ≥ 5,10 |
| A++ | ≥ 6,10 | ≥ 3,60 | ≥ 4,60 |
| A+ | ≥ 5,60 | ≥ 3,10 | ≥ 4,00 |
| A | ≥ 5,10 | ≥ 2,60 | ≥ 3,40 |
| B | ≥ 4,60 | ≥ 2,40 | ≥ 3,10 |

Ecodesign-Minimum (206/2012 Tier 2, < 6 kW): Split SEER 4,60 · Einkanal EER 2,60
(bei GWP < 150, also R290: 4,14 bzw. 2,34).

## 2. Was prüfen (markt-/produktabhängig) vs. was nicht (Modell)

**Prüfen:**
- `devices[].labelValue` / `labelClass` — der **Typenschild**-Wert, nicht `seer`.
  Hinterlegt: Monoblock EER 2,6 (A) · mobile Split SEER 6,1 (A++) · fest
  installiert SEER 6,5 (A++).
- `devices[].scop` — Heiz-Effizienz: mobile Split ~3,6, fest installiert ~4,2.
  Herstellerdatenblätter / A+++-Wärmepumpen-Split. Monoblock heizt nicht
  (`canHeat: false`). Für den „Auch heizen?"-Block. **Siehe 4.5.**
- `heatTransitionShare` — welcher Anteil des Jahres-Heizwärmebedarfs in der
  Übergangszeit anfällt (die Split heizt nur diesen Teil). Die kWh/m²·a je
  Gebäudestandard werden daraus **abgeleitet**, nicht gepflegt: Quelle ist die
  geteilte `INSULATION`-Tabelle in `lib/constants.ts`, auf der auch der
  Wärmepumpen-Rechner rechnet. Also hier NUR den Anteil prüfen — wer die
  kWh/m² anfassen will, prüft die geteilte Tabelle (siehe
  `scripts/waermepumpe-verify.md`), sonst driften die beiden Rechner.
- `devices[].pricePerUnit` / `priceBase` / `pricePerRoom` — Anschaffung je Typ.
  ADAC, daibau, reduco, Fachbetrieb-Festpreise.

**Nicht prüfen (Modell-/Klimatologie-Konstanten):**
- `buildingGain`, `sizingWPerM2`, `targetFactor`, `windowFactor`,
  `exposureOptions[].factor` (kalibriertes Kühlmodell)
- `heatStandards[].specKwh` — **hier NICHT anfassen.** Das ist die geteilte
  Rechen-Basis: die Werte kommen aus `INSULATION_BESTAND`/`INSULATION_NEUBAU`
  (`lib/constants.ts`, dena Gebäudereport / DIN V 18599) und werden vom
  Wärmepumpen-Rechner mitbenutzt. Gepflegt wird das im **WP-Runbook**
  (`scripts/waermepumpe-verify.md`) — ein Fix hier würde die beiden Rechner
  auseinanderdriften lassen.
- `heatTransitionShare` (0,4) — Modell-Annahme: Anteil des Jahres-Heizwärme-
  bedarfs, der in der Übergangszeit anfällt (Herleitung über Heizgradtage, siehe
  Kommentar in der Config). Kein Marktwert, kein Quartals-Thema.
- `cdhNational` / `cdhByBundesland` / Faktoren — Baseline/Fallback, die Live-API
  verfeinert pro PLZ
- `gridCo2PerKwh` (Strommix-Faktor, identisch zu WP-/Balkon-Rechner)

**Nicht ohne Anlass anfassen:** `AC_REAL_FACTOR` und `structuralFactor`. Die
ändern sich nur, wenn eine **neue Studie** oder eine **Regeländerung** vorliegt
(siehe 4.2/4.4) — nicht, weil ein Ergebnis komisch aussieht.

## 3. So wird die Routine ausgelöst

Dem Assistenten sagen: **„Lauf die Klimaanlagen-Prüfung."**
(Der Quartals-Wächter ruft sie zusammen mit der Balkonkraftwerk-Prüfung auf.)

## 4. Prüfschritte

### 4.1 Systematik-Integrität (immer zuerst)

```bash
npx vitest run lib/__tests__/aircon.test.ts
```

Dann per Auge in `lib/aircon-config.ts`:

- [ ] Hat ein Typ mit `labelMetric: "SEER"` einen `structuralFactor ≠ 1`?
      → **Rot.** Da hat jemand ein Ermessens-Urteil eingebaut.
- [ ] Hat jeder `structuralFactor < 1` einen Kommentar, der den **physikalischen
      Effekt benennt** und sagt, **warum die Prüfnorm ihn nicht enthält**?
      Fehlt das → **Rot**.
- [ ] Ist ein `seer` handgesetzt statt via `effectiveSeer(...)`? → **Rot**.
- [ ] Gibt es einen typeigenen Zweit-Abschlag neben `AC_REAL_FACTOR`? → **Rot**.

### 4.2 Haben sich die Regeln geändert?

- [ ] Sind **626/2011 / 206/2012** noch in Kraft?
      → [EUR-Lex 626/2011](https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:02011R0626-20230930) ·
      [EU-Produktseite](https://energy-efficient-products.ec.europa.eu/product-list/air-conditioners-and-comfort-fans_en)
      **Offener Punkt (Stand 07/2026):** Eine Review-Studie läuft. Sekundärquellen
      nennen „revidierte Verordnungen ab 2026" — an keiner Primärquelle bestätigt.
      **Falls die Revision die Einkanal-Sonderskala abschafft und Monoblöcke einen
      echten SEER bekommen, fällt die Begründung für `structuralFactor: 0.7` in
      sich zusammen** → Neubewertung, nicht nachjustieren.
- [ ] Schließt **EN 14825** Einkanal weiterhin aus? (Scope-Text)

### 4.3 Labelwerte gegen den Markt

- [ ] **Fest installierte Split** (`labelValue` 6,5): Marktkorridor noch SEER 6–7?
      → [Topten Selection Criteria](https://www.topten.eu/private/selection-criteria/selection-criteria-air-conditioners)
      (dort steht die BAT-Spitze 8,5–9,5 — **das ist NICHT unser Wert**, wir wollen
      den Median dessen, was eingebaut wird).
- [ ] **Mobile Split** (`labelValue` 6,1): noch der PortaSplit-Datenblattwert?
      → [Midea Datenblatt](https://www.midea.com/content/dam/midea-aem/de/klimatisieren-heizen/portasplit/20240325-Midea-PortaSplit-Datenblatt-final.pdf)
      Gibt es inzwischen mehrere mobile Splits am Markt? → Median statt Midea.
- [ ] **Monoblock** (`labelValue` 2,6 = Klasse A): noch markttypisch? Bei Media
      Markt / Amazon-Bestsellern prüfen: liegt die Masse noch bei A, oder ist A+
      (3,1) inzwischen Standard?

### 4.4 Realitäts-Abschlag (`AC_REAL_FACTOR` = 0,85)

- [ ] Neue Messstudien Label → Realbetrieb?
      Basis heute: [Energy and Buildings 2025](https://www.sciencedirect.com/science/article/abs/pii/S0378778825013611)
      (akkreditiert kalorimetrisch, 4 Split-Inverter, Abweichung „bis zu 50 %").
      Wir setzen 15 % an — das konservative Ende, weil ein Rechner den typischen
      und nicht den Extremfall treffen soll.
      **Bekannte Schwäche, bewusst akzeptiert:** Die Studie misst Split-Inverter.
      Ob 15 % auch für Monoblöcke stimmt, ist nicht belegt. Wir wenden ihn trotzdem
      einheitlich an — Einheitlichkeit schlägt hier Genauigkeit im Einzelwert, weil
      sonst wieder Ermessen einzieht. Tauchen belastbare Monoblock-Feldmessungen
      auf: **melden statt raten.**
- [ ] Deutsches Feld-Monitoring für Kühl-SEER? (Stand 07/2026: **existiert nicht**,
      Fraunhofer ISE macht nur Wärmepumpen.) Falls doch → großer Fund, Config neu
      herleiten.

### 4.5 SCOP: Systematik umgestellt, Faktor noch übertragen (Frist 10/2026)

**Erledigt am 28.07.2026 (Entscheidung des Betreibers):** `scop` läuft jetzt über
dieselbe Ableitung wie `seer` — `effectiveScop(labelScop) = labelScop ×
AC_REAL_FACTOR`. Labelwerte: mobile Split 4,0 · fest installiert 4,2 → effektiv
3,4 · 3,6. Der frühere Handwert 3,6 für die mobile Split ist weg. Wirkung: Die
Ersparnis gegenüber Gas im „Auch heizen?"-Block war rund ein Drittel zu hoch
(Beispiel 40 m² teilsaniert: 106 € statt 71 € im Jahr); die Grundaussage — Split
heizt in der Übergangszeit günstiger als Gas — bleibt (9,4 gegen 12,2 ct/kWh).

**Was noch offen ist:** Der Abschlag ist am KÜHLEN gemessen und auf das Heizen
ÜBERTRAGEN. Das ist die konservative Wahl (kann die Ersparnis höchstens zu
niedrig zeigen), aber kein Beleg. Die Übertragung darf **nicht** als belegter
Wert weitergereicht werden — Gate-Regel 6.

**Und der eigentliche Grund, den Volltext trotzdem zu beschaffen:** Dieselbe
Studie trägt auch den am Kühlen belegten Abschlag. `AC_REAL_FACTOR = 0,85` ist
heute aus dem frei genannten „bis zu 50 %" **gewählt**, nicht daraus abgelesen —
und dieser Faktor trägt die Effizienz **aller** Gerätetypen und damit den
Gerätevergleich, den Kern der Seite. Der Volltext prüft also nicht einen
Nebenwert, sondern die tragende Konstante.

**Recherchestand 07/2026 — recherchiert, am Gate gescheitert.** Das ist kein
„noch nicht angeschaut", sondern ein benannter fehlender Beleg:

| | Befund |
|---|---|
| Mobile Split (Label 4,0) | **Belegt.** Einziger Labelwert der ganzen Kategorie ist SCOP 4,0 (Midea PortaSplit; dieselbe OEM-Plattform auch als Qlima QsplitFlex und Trotec PAC-S 3510 SH, alle 4,0). Die Kategorie hat faktisch nur zwei Hardware-Plattformen. Seit 28.07.2026 als `labelScop` hinterlegt. |
| Fest installiert (Label 4,2) | **Konsistent.** SCOP und SEER sind im Markt gekoppelt, weil Hersteller exakt auf die nächste Effizienzklasse zielen: SEER 6,1–7,0 → SCOP 4,0–4,2 · 8,5–8,8 → 4,6–4,8 · 9,5–10,5 → 5,1–5,2. Unser SEER-Label 6,5 gehört zu 4,0–4,2. |
| Realabschlag Heizen | **Nicht belegt.** Erginer & Aydogdu (Energy and Buildings 350/2026, akkreditiertes Kalorimeter, 4 Split-Inverter) behandelt SEER und SCOP gemeinsam und berichtet „bis zu 50 %" für beide — die Aufteilung je Metrik steht nur im paywalled Volltext. |
| Struktureller Faktor | **1,0.** Hilfsenergie und Abtauung sind in EN 14825 Abschnitt 3.19 enthalten (bestätigt über EHPA-Testregulation). Der eine echte Effekt außerhalb der Normgrenze — die Norm unterstellt ideale Wärmeverteilung, ein Split ist eine Punktquelle (Nordsyn 2019) — ist nirgends quantifiziert. |

**Warum das kein Auto-Fix war:** Gate-Bedingung 1 verlangt eine Leitquelle, die
*alle* Angaben enthält, die das Modell braucht. Der Heiz-Abschlag ist begründbar
(dieselbe Studie, beide Richtungen), aber nicht belegt. Zusätzlich fällt die
Umstellung in die Spalte „neue Effizienz-Systematik" der Befugnis-Tabelle →
Vorschlag. Entschieden hat sie deshalb ein Mensch, nicht der Wächter.

**Zwei Fallen beim Auflösen:**
1. **Nur als Paar bewegen.** Wer den SCOP allein auf den Mittelklasse-Median 4,6
   zieht, beschreibt ein Gerät, das es nicht gibt (SEER 6,5 mit SCOP 4,6 kommt am
   Markt nicht vor). Entweder beide auf Einstiegsklasse (6,5 / 4,1) oder beide auf
   Mittelklasse (8,5 / 4,6).
2. **Klimazone.** Das EU-Label deklariert drei Zonen; dasselbe Gerät trägt für
   „Average" 4,0 und für „Warmer" 4,9. Nur **Average** (Straßburg, 1400 h) ist
   unsere Basis. Wer versehentlich die Warmer-Spalte zieht, überschätzt um ~20 %.
   Erkennbar an den 1400 Volllaststunden: `SCOP = Pdesign × 1400 h / Verbrauch`.

**Schritte zum Auflösen (bis 10/2026):**
- [x] `labelScop` + `effectiveScop` analog `effectiveSeer` eingeführt, beide
      Split-Typen gemeinsam umgestellt (28.07.2026).
- [x] Wärmepreis-Invariante gegengeprüft: 3,4/3,6 ergibt 10,0 bzw. 9,4 ct/kWh
      gegen Gas 12,2 ct/kWh — hält, aber der Abstand ist geschrumpft.
- [x] `/datenstand`-Zeilen mitgezogen (Typenschild + Herleitung + Vorbehalt).
- [ ] Volltext der Studie beschaffen (ca. 30 € oder Bibliothek) → `docs/quellen/`.
      Gate-Regel 6: erst beschaffen, dann streichen. Ein Abruf, der an der Paywall
      scheitert, ist kein Beleg für „gibt es nicht". Direktabruf über
      sciencedirect.com läuft in 403 (geprüft 28.07.2026); OpenAlex, Crossref und
      Semantic Scholar führen kein Abstract. Nächste Stufen: Bibliothekszugang,
      Autorenanfrage (Volkan Erginer / G. Aydoğdu), Fernleihe.
- [ ] Trägt der Volltext einen **SCOP**-spezifischen Abschlag → `effectiveScop`
      bekommt einen eigenen Faktor statt `AC_REAL_FACTOR`.
- [ ] Trägt er einen **SEER**-spezifischen Abschlag → `AC_REAL_FACTOR` selbst
      gegenprüfen. Die heutigen 15 % sind aus „bis zu 50 %" gewählt, nicht
      abgelesen; sie tragen alle Gerätetypen. Weicht der belegte Wert ab, ist das
      der größere Fund — Sprunggrenze und Marktanker beachten.
- [ ] Trägt er keinen von beiden → bewusst so lassen und das hier als „geprüft,
      Beleg existiert nicht" abschließen, statt die Frist stumpf zu verlängern.

Die Frist selbst hängt am Marker `OFFEN (bis 10/2026)` in `lib/aircon-config.ts`
und wird von `lib/__tests__/offene-punkte-waechter.test.ts` erzwungen — läuft sie
ab, schlägt der Pre-commit-Hook an.

### 4.6 Plausibilität gegen die Sekundärquellen

- [ ] Monoblock effektiv noch **< 2**? ([energie-lexikon.info](https://www.energie-lexikon.info/kompakt_raumklimageraet.html):
      nominell „SEER um 3", real „effektiv sogar deutlich unter 2")
- [ ] Verhältnis Monoblock ↔ fest installierte Split zwischen **2× und 7×**?
      Untergrenze aus Verbrauchsangaben, Obergrenze aus [test.de](https://www.test.de/Mobile-Klimaanlagen-im-Test-Flexibel-aber-wenig-effizient-6228399-0/)
      („bis zu siebenmal geringer", eigene Berechnung, **keine Zahl veröffentlicht**).
      Aktuell ~3,7×.
- [ ] Mobile Split ≈ „Niveau mancher fester Splitgeräte"? (test.de 2025 — beachte
      **„mancher"**, also der schwächeren. Deshalb 5,2 vs. 5,5, nicht gleichauf.)

### 4.7 Folgewirkung im PV-Rechner

- [ ] `AC_SIMPLE.seer` (`lib/aircon.ts`) ist der Gerätemix für die Schnellschätzung
      aus der Wohnfläche, abgeleitet aus den Split-Werten (5,2/5,5 → konservativ 5).
      **Ändern sich die Split-Effizienzen, hier mitziehen.**
- [ ] `npx vitest run lib/__tests__/consumption.test.ts` — der Kalibrierungs-Guard
      (`KLIMA_KWH_PER_M2 ≈ 3`) fängt Drift zum PV-Rechner ab.

## 5. Agent-Prompt (Vorlage)

> Du prüfst die Geräte- und Preisannahmen des Klimaanlagen-Rechners von
> solar-check.io. Heute ist {DATUM}.
>
> **Wichtig:** Gesucht sind **Typenschild-/Labelwerte** (EU-Energielabel), NICHT
> die effektiven Werte aus unserer Config. Wir leiten daraus selbst nach fester
> Formel ab. Beachte die zwei Skalen: Split + mobile Split tragen **SEER**
> (EN 14825), Einkanal/Monoblock trägt **EER** (EN 14511) — niemals vermischen
> und niemals einen EER als SEER melden.
>
> Hinterlegt (aus lib/aircon-config.ts): Label Monoblock {labelMetric labelValue
> labelClass} / mobile Split {…} / fest {…}; SCOP mobile Split {…}/fest {…};
> Anschaffung Monoblock {pricePerUnit} €, mobile Split {pricePerUnit} €, fest
> {priceBase} €+{pricePerRoom} €/Raum.
>
> Vorgehen (WebSearch + WebFetch):
> 1. Markttypische **Labelwerte** je Klasse (Monoblock EER, mobile Split SEER, fest
>    installierte Split SEER) — Median dessen, was verkauft/eingebaut wird, NICHT
>    die Spitzengeräte und nicht das gesetzliche Minimum. Quellen:
>    Herstellerdatenblätter, Topten, Händler-Listungen.
> 2. SCOP (Heizen) mobile + fest installierte Split: Herstellerdatenblätter.
> 3. Anschaffungs-/Montagepreise: ADAC, daibau, reduco, Fachbetriebe.
> 4. Neue Messstudien „Label vs. Realbetrieb" (SEER/SCOP)? Neue EU-Verordnung/Norm
>    für Raumklimageräte (Revision 626/2011 oder 206/2012)?
>
> Gib NUR dieses Format zurück:
> ```
> STATUS: ok | abweichung
> LABEL: Mono <EER x,x / Klasse> | mobil <SEER x,x> | fest <SEER x,x> (hinterlegt: <…>)
> SCOP: <mobil/fest> (hinterlegt: <…>)
> PREISE: <Anschaffung je Typ> (hinterlegt: <…>)
> STUDIEN/REGELN: <neue Studie oder Verordnungsänderung — sonst "keine">
> QUELLEN: <URLs, Datenblätter/Topten/ADAC zuerst>
> ```

## 6. Nach der Prüfung

- **Bei `abweichung` an einem Labelwert oder Preis:** das sind Markt-/Produktwerte
  (kein Ermessens-/Rechtsfall) → `labelValue`/`labelClass`/Preise in
  `lib/aircon-config.ts` anpassen — **nie `seer` direkt**, der rechnet sich neu.
  `validFrom`/`reviewBy`/`source` hochsetzen, `npm run build` + `npx vitest run`
  grün (`lib/__tests__/aircon.test.ts`), committen.
- **Bei `abweichung` an STUDIEN/REGELN:** Systematik-Frage, **nicht** eigenmächtig
  nachziehen. Befund an den Menschen, ggf. Council (`scripts/council-verify.md`).
- **Bei `ok`:** nur `validFrom` + `reviewBy` aufs nächste Quartal setzen.
- **Keine Selbstheilung für diese Config** — anders als bei EEG/Förderung gibt es
  keine amtliche Quelle zum automatischen Abgleich. Befund melden, Mensch
  entscheidet.
- Die Werte sind auf `/datenstand` öffentlich sichtbar (inkl. Typenschild und
  beider Abschläge). Änderungen sind damit sofort öffentlich — das ist gewollt.

## Quellen

**Recht/Norm**
- [VO (EU) 626/2011 Anhang II — Klassengrenzen](https://www.legislation.gov.uk/eur/2011/626/annex/II)
- [VO (EU) 626/2011 Anhang VII — Prüfbedingungen (Einkanal-Fußnote)](https://www.legislation.gov.uk/eur/2011/626/annex/VII)
- [VO (EU) 626/2011 konsolidiert (EUR-Lex)](https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:02011R0626-20230930)
- [VO (EU) 206/2012 Ecodesign](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32012R0206)

**Skalen/Markt**
- [Topten — Policy Recommendations 2014 (A-Einkanal ≙ F-Split; SEER ≈ EER + 3 nur für Inverter)](https://storage.topten.eu/source/files/Aircon_recommendations_April_2014.pdf)
- [Topten — Selection Criteria Air Conditioners](https://www.topten.eu/private/selection-criteria/selection-criteria-air-conditioners)
- [Midea PortaSplit Datenblatt (SEER 6,1 / A++, SCOP 4,0 / A+)](https://www.midea.com/content/dam/midea-aem/de/klimatisieren-heizen/portasplit/20240325-Midea-PortaSplit-Datenblatt-final.pdf)

**Realbetrieb**
- [Energy and Buildings 2025 — SEER/SCOP-Abweichungen bis 50 %](https://www.sciencedirect.com/science/article/abs/pii/S0378778825013611)
- [test.de — Mobile Klimaanlagen (Monoblock „bis zu siebenmal", PortaSplit-Einordnung)](https://www.test.de/Mobile-Klimaanlagen-im-Test-Flexibel-aber-wenig-effizient-6228399-0/)
- [test.de — Klimageräte im Test (DIN EN 14825/14511, Kompensationsmethode)](https://www.test.de/Klimageraete-im-Test-4722766-0/)
- [energie-lexikon.info — Kompakt-Raumklimagerät](https://www.energie-lexikon.info/kompakt_raumklimageraet.html)
- [US-DOE — Portable AC Test Procedure (Infiltrations-Rechenweg, SACC)](https://www.energy.gov/sites/prod/files/2016/04/f30/Portable%20AC%20TP%20Final%20Rule.pdf)
- [ADAC — Klimaanlage mit Einbau (Überschlagswerte)](https://www.adac.de/rund-ums-haus/wohnen/haushalt/klimaanlage-mit-einbau-kosten/)
