# Runbook: Klimaanlagen-Config prüfen

**Was:** Jahres-Check der Werte in `lib/aircon-config.ts` gegen die Originalquellen.
**Wann:** bis `reviewBy` (aktuell **2027-04-30**), am besten **vor** der Kühlsaison.
**Wer:** scheduled-task `solar-check-geraete-config-verify-jaehrlich`.
**Warum:** Die Seite lebt vom Gerätevergleich. Kippt eine Effizienz, kippt die
Kernaussage der Seite — still und ohne Fehlermeldung.

---

## 0. Die wichtigste Regel dieses Runbooks

**Prüfe die SYSTEMATIK, nicht die einzelne Zahl.**

Der Wächter-Befund vom 15.07.2026 war *nicht* „ein Wert ist falsch". Alle drei
Effizienzwerte lagen damals einzeln in einem vertretbaren Korridor. Kaputt war das
*Verhältnis*: die mobile Split-Anlage war ~30 % vom Label abgewertet, die fest
installierte stand praktisch am Label, der Monoblock trug ohne Kennzeichnung einen
Wert von einer ganz anderen Messskala. Jeder Wert für sich verteidigbar, der
Vergleich trotzdem verzerrt — und der Vergleich ist das Produkt.

Ein Befund wie „Wert X wirkt zu optimistisch, setz ihn runter" ist deshalb **kein
gültiger Fix**. Ein Wert ändert sich nur über seinen `labelValue` oder über einen
**benannten** strukturellen Effekt.

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

Der Kern in einem Satz: **Unterschiedliche Strenge zwischen Gerätetypen ist nur
zulässig, wenn ein physikalischer Effekt benannt ist, der außerhalb der Grenze des
jeweiligen Prüfverfahrens liegt.** Alles andere ist Ermessen und damit verboten.

Aktuell hat genau ein Typ `structuralFactor < 1`: der Monoblock (0,7,
Infiltration). Begründung steht ausführlich im Code.

`lib/__tests__/aircon.test.ts → "Effizienz-Systematik"` erzwingt das. **Wenn du
einen Wert änderst und kein Test schlägt an, hast du vermutlich am falschen Ort
gedreht.**

## 2. Warum die Typenschilder nicht vergleichbar sind (der Kern)

- **VO (EU) 626/2011** kennt zwei getrennte Skalen. Split + mobile Split sind
  „room air conditioner" → **SEER** nach **EN 14825** (Teillast, 27 °C innen /
  35 °C außen). Einkanal/Monoblock ist von EN 14825 **ausdrücklich ausgeschlossen**
  → nur **EER** nach **EN 14511** (Volllast).
- **Anhang VII, Fußnote:** Beim Einkanalgerät wird der Kondensator „not supplied
  with outdoor air, but indoor air" — das Gerät steht komplett in EINER 35-°C-Kammer.
  Es gibt kein Außen, kein Fenster, keinen Pfad für nachströmende Luft. Die
  Infiltration ist nicht „übersehen", sie liegt außerhalb der Testgrenze.
- **Konsequenz** (Topten, aus Anhang II reproduzierbar): Einkanal Klasse A
  (EER 2,6) ≙ Split Klasse F (SEER 2,6) — seit 2013 verboten.

→ **„Alle am Typenschild" wäre also gerade KEINE einheitliche Grundlage.** Falls
jemand das vorschlägt: hier gegenlesen.

### Klassengrenzen (626/2011 Anhang II) — zum Nachschlagen

| Klasse | Split/RAC SEER | Einkanal EER |
|---|---|---|
| A+++ | ≥ 8,50 | ≥ 4,10 |
| A++ | ≥ 6,10 | ≥ 3,60 |
| A+ | ≥ 5,60 | ≥ 3,10 |
| A | ≥ 5,10 | ≥ 2,60 |
| B | ≥ 4,60 | ≥ 2,40 |

Ecodesign-Minimum (206/2012 Tier 2, < 6 kW): Split SEER 4,60 · Einkanal EER 2,60
(bei GWP < 150, also R290: 4,14 bzw. 2,34).

## 3. Prüfschritte

### 3.1 Systematik-Integrität (immer zuerst)

```bash
npx vitest run lib/__tests__/aircon.test.ts
```

Dann per Auge in `lib/aircon-config.ts`:

- [ ] Hat ein Typ mit `labelMetric: "SEER"` einen `structuralFactor ≠ 1`?
      → **Rot.** Da hat jemand ein Ermessens-Urteil eingebaut.
- [ ] Hat ein `structuralFactor < 1` einen Kommentar, der den **physikalischen
      Effekt benennt** und sagt, **warum die Prüfnorm ihn nicht enthält**?
      → Fehlt das: **Rot**.
- [ ] Ist `AC_REAL_FACTOR` noch für alle Typen derselbe (d. h. gibt es keinen
      typeigenen Zweit-Abschlag)? → sonst **Rot**.
- [ ] Ist ein `seer` handgesetzt statt via `effectiveSeer(...)`? → **Rot**.

### 3.2 Haben sich die Regeln geändert?

- [ ] Sind **626/2011 / 206/2012** noch in Kraft?
      → [EUR-Lex 626/2011](https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:02011R0626-20230930) ·
      [EU-Produktseite](https://energy-efficient-products.ec.europa.eu/product-list/air-conditioners-and-comfort-fans_en)
      **Offener Punkt (Stand 07/2026):** Eine Review-Studie läuft. Sekundärquellen
      nennen „revidierte Verordnungen ab 2026" — an keiner Primärquelle bestätigt.
      **Falls die Revision die Einkanal-Sonderskala abschafft und Monoblöcke einen
      echten SEER bekommen, fällt die Begründung für `structuralFactor: 0.7` in
      sich zusammen** → dann Neubewertung, nicht nachjustieren.
- [ ] Schließt **EN 14825** Einkanal weiterhin aus? (Scope-Text)

### 3.3 Labelwerte gegen den Markt

- [ ] **Fest installierte Split** (`labelValue` 6,5): Liegt der Marktkorridor noch
      bei SEER 6–7? → [Topten Selection Criteria](https://www.topten.eu/private/selection-criteria/selection-criteria-air-conditioners)
      (dort steht die BAT-Spitze 8,5–9,5 — **die ist NICHT unser Wert**, wir wollen
      den Median dessen, was eingebaut wird).
- [ ] **Mobile Split** (`labelValue` 6,1): noch der PortaSplit-Datenblattwert?
      → [Midea Datenblatt](https://www.midea.com/content/dam/midea-aem/de/klimatisieren-heizen/portasplit/20240325-Midea-PortaSplit-Datenblatt-final.pdf)
      Gibt es inzwischen mehrere mobile Splits am Markt? → dann Median statt Midea.
- [ ] **Monoblock** (`labelValue` 2,6 = Klasse A): noch markttypisch? Prüfen bei
      Media Markt / Amazon-Bestsellern: liegt die Masse noch bei A, oder ist A+
      (3,1) inzwischen Standard?

### 3.4 Realitäts-Abschlag (`AC_REAL_FACTOR` = 0,85)

- [ ] Gibt es neue Messstudien Label → Realbetrieb?
      Basis heute: [Energy and Buildings 2025](https://www.sciencedirect.com/science/article/abs/pii/S0378778825013611)
      (akkreditiert kalorimetrisch, 4 Split-Inverter, Abweichung „bis zu 50 %").
      Wir setzen bewusst 15 % an — das konservative Ende, weil ein Rechner den
      typischen und nicht den Extremfall treffen soll.
      **Bekannte Schwäche, bewusst akzeptiert:** Die Studie misst Split-Inverter.
      Ob 15 % auch für Monoblöcke der richtige Realitäts-Abschlag ist, ist nicht
      belegt. Wir wenden ihn trotzdem einheitlich an — Einheitlichkeit schlägt
      hier Genauigkeit im Einzelwert, weil sonst wieder Ermessen einzieht.
      Falls belastbare Monoblock-Feldmessungen auftauchen: **melden statt raten.**
- [ ] Deutsches Feld-Monitoring für Kühl-SEER? (Stand 07/2026: **existiert nicht**,
      Fraunhofer ISE macht nur Wärmepumpen.) Falls doch → großer Fund, Config neu
      herleiten.

### 3.5 Plausibilität gegen die Sekundärquellen

- [ ] Monoblock effektiv noch **< 2**? ([energie-lexikon.info](https://www.energie-lexikon.info/kompakt_raumklimageraet.html):
      nominell „SEER um 3", real „effektiv sogar deutlich unter 2")
- [ ] Verhältnis Monoblock ↔ fest installierte Split zwischen **2× und 7×**?
      Untergrenze aus Verbrauchsangaben, Obergrenze aus [test.de](https://www.test.de/Mobile-Klimaanlagen-im-Test-Flexibel-aber-wenig-effizient-6228399-0/)
      („bis zu siebenmal geringer", eigene Berechnung, **keine Zahl veröffentlicht**).
      Aktuell ~3,7×.
- [ ] Mobile Split ≈ „Niveau mancher fester Splitgeräte"? (test.de 2025 — beachte:
      **„mancher"**, also der schwächeren. Deshalb 5,2 vs. 5,5, nicht gleichauf.)

### 3.6 Folgewirkung im PV-Rechner

- [ ] `AC_SIMPLE.seer` (`lib/aircon.ts`) ist der Gerätemix für die Schnellschätzung
      aus der Wohnfläche. Er ist aus den Split-Werten abgeleitet (5,2/5,5 →
      konservativ 5). **Wenn sich die Split-Effizienzen ändern, hier mitziehen.**
- [ ] `npx vitest run lib/__tests__/consumption.test.ts` — der Kalibrierungs-Guard
      (`KLIMA_KWH_PER_M2 ≈ 3`) fängt Drift zum PV-Rechner ab.

## 4. Weitere Werte (unverändert prüfen)

- [ ] **Preise** (`pricePerUnit`, `priceBase`, `pricePerRoom`) gegen ADAC/daibau/reduco
- [ ] **`gridCo2PerKwh`** gegen UBA — muss zu `lib/heatpump-config.ts` passen (geteilte Basis!)
- [ ] **`stromPrice`** ist nur Default; die UI nutzt den zentralen Strompreis aus `/api/prices`
- [ ] **Kühlgradstunden** (`cdhNational`, `cdhByBundesland`) — Fallback; Live kommt aus `/api/cooling-degree`

## 5. Wenn etwas abweicht

1. **Nichts stillschweigend nachjustieren.** Erst einordnen: Ist es eine geänderte
   Quelle (→ `labelValue` anpassen), eine geänderte Regel (→ Systematik neu
   bewerten) oder nur ein Bauchgefühl (→ **ignorieren**)?
2. Bei Änderung: `validFrom` + `reviewBy` hochsetzen, `source` ergänzen, Begründung
   als Kommentar in die Config — nicht nur in die Commit-Message.
3. Die Werte sind auf `/datenstand` öffentlich sichtbar (inkl. Typenschild-Angabe
   und beider Abschläge). Änderungen sind damit sofort öffentlich — das ist gewollt.
4. Council-Gegenprüfung bei Abweichung: `scripts/council-verify.md`.
   **Keine Selbstheilung für diese Config** — anders als bei EEG/Förderung gibt es
   hier keine amtliche Quelle, gegen die man automatisch abgleichen könnte. Befund
   melden, Mensch entscheidet.

## Quellen

**Recht/Norm**
- [VO (EU) 626/2011 Anhang II — Klassengrenzen](https://www.legislation.gov.uk/eur/2011/626/annex/II)
- [VO (EU) 626/2011 Anhang VII — Prüfbedingungen (Einkanal-Fußnote)](https://www.legislation.gov.uk/eur/2011/626/annex/VII)
- [VO (EU) 626/2011 konsolidiert (EUR-Lex)](https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:02011R0626-20230930)
- [VO (EU) 206/2012 Ecodesign](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32012R0206)

**Skalen/Markt**
- [Topten — Policy Recommendations 2014 (A-Einkanal ≙ F-Split; SEER ≈ EER + 3 nur für Inverter)](https://storage.topten.eu/source/files/Aircon_recommendations_April_2014.pdf)
- [Topten — Selection Criteria Air Conditioners](https://www.topten.eu/private/selection-criteria/selection-criteria-air-conditioners)
- [Midea PortaSplit Datenblatt (SEER 6,1 / A++)](https://www.midea.com/content/dam/midea-aem/de/klimatisieren-heizen/portasplit/20240325-Midea-PortaSplit-Datenblatt-final.pdf)

**Realbetrieb**
- [Energy and Buildings 2025 — SEER/SCOP-Abweichungen bis 50 %](https://www.sciencedirect.com/science/article/abs/pii/S0378778825013611)
- [test.de — Mobile Klimaanlagen (Monoblock „bis zu siebenmal", PortaSplit-Einordnung)](https://www.test.de/Mobile-Klimaanlagen-im-Test-Flexibel-aber-wenig-effizient-6228399-0/)
- [test.de — Klimageräte im Test (DIN EN 14825/14511, Kompensationsmethode)](https://www.test.de/Klimageraete-im-Test-4722766-0/)
- [energie-lexikon.info — Kompakt-Raumklimagerät](https://www.energie-lexikon.info/kompakt_raumklimageraet.html)
- [US-DOE — Portable AC Test Procedure (Infiltrations-Rechenweg, SACC)](https://www.energy.gov/sites/prod/files/2016/04/f30/Portable%20AC%20TP%20Final%20Rule.pdf)
- [ADAC — Klimaanlage mit Einbau (Überschlagswerte)](https://www.adac.de/rund-ums-haus/wohnen/haushalt/klimaanlage-mit-einbau-kosten/)
