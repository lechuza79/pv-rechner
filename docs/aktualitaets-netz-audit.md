# Welche Zahlen haben kein Aktualitäts-Netz? (Erhebung, 19.08.2026)

**Anlass:** Vorgabe des Betreibers — „alle werte die wir nutzen brauchen einen
aktualitäts safty-net." Ausgelöst hat es `lib/freiflaeche-config.ts`, das am
18.08.2026 auf `main` kam und weder Wächter noch Prüfstand-Eintrag hatte.

**Was diese Datei ist:** eine Bestandsaufnahme, keine Bauanleitung. Jeder Wächter
kostet laufend (die Läufe hängen am Rechner des Betreibers, der Cloud-Umzug ist
aus Kostengründen zurückgestellt) — welche Lücken geschlossen werden, entscheidet
der Betreiber. Erledigt ist nur die Freifläche.

**Wie geprüft wurde:** `npm run stand:faellig --alle` liefert die Werte, die ein
Netz HABEN. Die Gegenprobe lief über drei Wege: alle `lib/*-config.ts`; alle
Dateien in `lib/` mit `validFrom` / `geprueftIso` / `reviewBy` / `dataAsOf` /
Quellenangabe im Kopf; und ein Abgleich jedes Runbooks (`scripts/*-verify.md`)
gegen die Auftragsliste unter `~/.claude/scheduled-tasks/`.

**Die drei Fragen je Fund:** Wie schnell altert der Wert? Wird bei Veralterung
eine Zahl STILL falsch, oder sieht man es? Und: braucht er überhaupt ein Netz?
Werte, die nicht altern, gehören nicht auf die Liste — sonst wird sie zu Lärm
und niemand liest sie mehr.

---

## Erledigt in dieser Sitzung

| Wert | Was fehlte | Jetzt |
|---|---|---|
| Freiflächen-Zuschlagswerte (`lib/freiflaeche-config.ts`) | kein Wächter, kein Prüfstand-Eintrag, kein Prüfdatum | `FREIFLAECHE_GEPRUEFT_ISO`, Prüfstand-Eintrag, `scripts/freiflaeche-verify.md`, Befugnis-Zeile im Gate, Anker-Test, Auftrag `solar-check-freiflaeche-verify` (3× jährlich) |
| Prüfstand-Eintrag „Regionale Förderprogramme" | nannte den Auftrag `solar-check-foerder-waechter` — den gibt es nicht | zeigt auf `foerder-vollpruefung-quartal + foerder-news-waechter` |
| Vertagte Punkte in Runbooks | `offene-punkte-waechter.test.ts` las nur Configs; die Hälfte aller Marker steht in Runbooks (allein `waermepumpe-verify.md` führt drei) | Der Test liest jetzt zusätzlich `scripts/*-verify.md`, per Verzeichnis statt per Liste |

---

## Offen — nach Dringlichkeit

### 1. Marktwert Solar und Direktvermarktungskosten · `lib/marktwert-config.ts`

**Was:** Was eine eingespeiste Kilowattstunde ab 2027 an der Börse einbringt
(`MARKTWERT_NIVEAU_CT`, `MARKTWERT_SOLAR_HISTORIE`, `MARKTWERT_PFAD`) und was
die Direktvermarktung kostet (`DIREKTVERMARKTUNG`).

**Sichtbar:** ja, an sechs Stellen — der „Ab 2027"-Umschalter im PV-Rechner und
im Einspeisevergütungs-Rechner (`lib/einspeise-regime.ts`), zwei Ratgeber,
`/datenstand`, und im Solar-Atlas wird die Vermarktungsgebühr von jedem
Freiflächen-Erlös abgezogen.

**Altert:** der Jahresmarktwert jährlich (die Netzbetreiber veröffentlichen ihn
im Januar), die Vermarktungskosten schneller — dort steht heute die Mitte einer
Marktspanne mit dem Vermerk `OFFEN (bis 03/2027)`.

**Still falsch?** Vollständig. Keine Stand-Zeile eines Rechners nennt diesen
Wert; ein Nutzer sieht ihm nicht an, wie alt er ist.

**Der eigentliche Befund:** Das Runbook `scripts/marktwert-verify.md` existiert
und ist gut — nur führt es niemand aus. Kein Auftrag nennt es, es gibt kein
`geprueftIso`, und `MARKTWERT_REVIEW_BY = "2027-02-01"` wird von nichts
kontrolliert. Genau die Lage, die die Freifläche gerade hatte.

**Vorschlag:** an `eeg-verguetung-verify-halbjaehrlich` hängen — dessen
Januar-Lauf (28.01.) fällt mit der Veröffentlichung des Jahresmarktwerts
zusammen. Dazu `MARKTWERT_GEPRUEFT_ISO` und ein Prüfstand-Eintrag. **Kein neuer
Auftrag, also keine zusätzlichen laufenden Kosten.**

### 2. Rechtstexte gegen den eigenen Code · `scripts/rechtstexte-verify.md`

**Was:** Ob Datenschutzerklärung, Impressum und die Vertrauens-Leiste
(`lib/trust-signals.ts`) noch beschreiben, was der Code wirklich tut.

**Altert:** mit jedem Deploy, nicht mit dem Kalender. Das ist der Unterschied zum
Legal-Wächter, der die Gesetze beobachtet, nicht unseren Text.

**Still falsch?** Ja, und es ist die teuerste Sorte: Eine Datenschutzerklärung
liest sich wie eine Bestandsaufnahme und ist in Wahrheit ein Versprechen. Der
Anlass für das Runbook war genau das — das Kontaktformular stand einen Tag nach
dem Livegang mit keinem Wort darin.

**Vorschlag:** an `solar-check-legal-waechter` hängen (läuft bereits
quartalsweise). Wieder kein neuer Auftrag.

### 3. Frische der MaStR-Daten · `mastr_meta.imported_at`

**Was:** Der gesamte Zahlenbestand des Solar-Atlas — Anlagen, Leistung, Speicher
auf über 11.000 Gemeindeseiten.

**Altert:** monatlich, über `scripts/mastr-refresh.ts`.

**Still falsch?** Halb. Der Datenstand steht sichtbar an den Zahlen, ein Leser
könnte ihn also bemerken — aber niemand wird gewarnt. Der Gesundheitscheck liest
`imported_at` bereits, benutzt es aber **nur als Latenz-Vergleichswert** und
bewertet sein Alter nie (`scripts/health-check.ts`, Zeile ~317).

**Vorschlag:** Alterprüfung in den Gesundheitscheck statt eines Wächters. Der
läuft ohnehin alle drei Stunden in GitHub Actions, **ohne Modell und damit ohne
Kosten** — der beste Gegenwert der ganzen Liste.

### 4. Länder-Vergleichsreihen (Ember) · `lib/country-comparison.ts`

**Was:** Wind-/Solar-Anteil und CO₂-Intensität mehrerer Länder,
`/laendervergleich` plus Embed-Widget.

**Altert:** jährlich. **Belegt veraltet:** Die Reihen enden bei 2024; Ember hat
das Jahr 2025 mit dem Global Electricity Review 2026 im April 2026
veröffentlicht (am 19.08.2026 geprüft).

**Still falsch?** Nein — das letzte Jahr steht im Chart, und der Quellenvermerk
nennt den Datenstand. Es ist Alterung, keine Falschaussage.

**Vorschlag:** an `co2-prognose-monitor` hängen (monatlich, fährt schon die
Strommix-Reihen).

### 5. Drei Reihen mit Wächter, aber ohne Prüfstand-Eintrag

`lib/strommix-history.ts` (UBA-Erzeugung und CO₂-Intensität, `co2-prognose-monitor`),
`lib/feedin-history.ts` (Vergütungsreihe der Zubau-Story,
`eeg-verguetung-verify-halbjaehrlich`) und die Preis-Pipeline, deren Runbook
`scripts/preise-verify.md` von keinem Auftragstext genannt wird.

Sie werden geprüft — aber **ein Ausfall des Laufs fiele nicht auf**, weil kein
Prüfdatum unter Beobachtung steht. Genau der Fall, für den `lib/pruefstand.ts`
gebaut wurde. Kosten: eine Zeile je Eintrag, kein neuer Auftrag.

Bei `feedin-history` ist das Risiko am kleinsten: Ein Kohärenz-Test nagelt sie
zellgleich an `lib/feedin-archiv.ts`.

---

## Braucht bewusst KEIN Netz

Damit die Liste oben nicht durch Vollständigkeitsdrang unbrauchbar wird:

| Was | Warum nicht |
|---|---|
| `lib/tilt-config.ts` | Solargeometrie. Neigung × Ausrichtung ändert sich nicht. Physik-Anker-Test genügt. |
| `lib/feedin-archiv.ts`, `feedin-archiv-alt.ts`, `FREIFLAECHE_HISTORIE` | Abgeschlossene historische Sätze. Eine Änderung wäre die Korrektur eines Lesefehlers, kein Nachtrag. |
| `lib/solar-year.ts` | PVGIS-Referenzjahr als methodische Grundlinie, kein Messwert von heute. |
| `lib/prices-config.ts` | Bewusster Rückfall-Schnappschuss; die gültigen Preise stehen in der Datenbank (`standAusDb`). |
| `lib/constants.ts` (Personen, Nutzungsprofil, Dämmstufen, Degradation, Laufzeit) | Modellannahmen, keine Daten mit Stichtag. Sie zu datieren würde Aktualität behaupten, die die Sache nicht hat — angegriffen werden sie vom monatlichen `solar-check-rechenmodell-council`. |
| `lib/data-sources.ts` | Lizenzen und Namen; Drift beobachtet der quartalsweise Legal-Wächter. |

---

## Eine Grenze, die keine Liste schließt

Die Wächter-Aufträge liegen unter `~/.claude/scheduled-tasks/`, also **außerhalb
des Repos**. Ein Test kann deshalb nicht prüfen, ob ein im Prüfstand genannter
Auftrag wirklich existiert — genau daran lag der falsche Name bei den
Förderprogrammen, und er wäre nur bei einem Handabgleich wieder aufgefallen.
Solange die Aufträge nicht im Repo liegen, bleibt dieser Abgleich Handarbeit und
gehört in den Sonntagsbericht.
