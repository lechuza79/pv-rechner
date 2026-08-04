# Wächter: Marktwert Solar & Direktvermarktungskosten

**Rhythmus:** jährlich im Februar (der Jahreswert erscheint im Januar), zusätzlich
sofort bei einer Änderung am EEG-2027-Verfahrensstand.
**Gilt für:** `lib/marktwert-config.ts`
**Vorrang:** `scripts/waechter-gate.md` — dieses Runbook sagt nur, *was* geprüft wird.

## Wofür diese Zahlen stehen

Der Entwurf zum EEG 2027 ersetzt die feste Einspeisevergütung für Neuanlagen
durch die Direktvermarktung. Wer diesen Fall rechnet, braucht eine Antwort auf
„was bringt eine eingespeiste Kilowattstunde dann?" — und das ist **nicht** der
mittlere Börsenpreis, sondern der Marktwert Solar. Diese Config ist die einzige
Quelle dafür; sie speist den Rechner (`ResultRegime`) und den Renditevergleich im
Ratgeber.

## Was zu prüfen ist

### 1. Jahresmarktwert Solar (`MARKTWERT_SOLAR_HISTORIE`)

Die Übertragungsnetzbetreiber veröffentlichen ihn im Januar für das Vorjahr auf
netztransparenz.de. **Die Werte-Übersicht dort steht hinter einem Login** — das
ist bekannt und kein Grund, auf eine Sekundärquelle auszuweichen und sie als
amtlich zu etikettieren (Wächter-Gate Regel 2: Quelle ist, wer gemessen hat).

Zwei zulässige Wege, in dieser Reihenfolge:

1. **Amtlich**, falls zugänglich: netztransparenz.de, Marktwertübersicht.
2. **Selbst nachrechnen** aus den beiden öffentlichen Zeitreihen, die den Wert
   definieren — deutsche Solarerzeugung und Day-Ahead-Preis DE-LU von
   Energy-Charts (Fraunhofer ISE):

   ```
   Marktwert Solar = Σ(Erzeugung × Preis) / Σ(Erzeugung)
   ```

   Die Methode ist belegt: Für 2024 und 2025 lieferte sie 4,603 bzw. 4,610 ct/kWh
   gegenüber amtlich 4,624 bzw. 4,508 ct/kWh — 0,5 % und 2,3 % Abweichung. Die
   Restdifferenz ist erwartbar (die Netzbetreiber rechnen auf dem EEG-relevanten
   Anlagenbestand, wir auf der gesamten deutschen Erzeugung).

**Beide Werte in die Config eintragen** (`ctKwh` und `nachgerechnetCtKwh`). Der
Realitäts-Anker in `lib/__tests__/einspeise-regime.test.ts` schlägt an, sobald sie
um mehr als 5 % auseinanderlaufen — dann stimmt entweder die Zahl oder die
Methode nicht mehr, und beides ist ein Befund, kein Rundungsproblem.

### 2. Das gerechnete Niveau (`MARKTWERT_NIVEAU_CT`)

Wir rechnen mit dem **bei null gekappten** Wert (negative Stunden zahlen nichts,
statt Geld zu kosten), weil ein Haushalt in der Direktvermarktung für negative
Stunden keine Rechnung bekommt. Er muss über dem veröffentlichten Wert liegen —
liegt er darunter, ist die Kappung falsch herum angewendet (auch das ein Test).

Mitprüfen: der **Anteil der Erzeugung bei negativem Preis**. 2024 waren es
18,6 %, 2025 bereits 24,2 %. Steigt er weiter deutlich, wächst der Abstand
zwischen rohem und gekapptem Wert, und der Kommentar in der Config nennt dann
veraltete Größenordnungen.

### 3. Preisform (`PREISFORM_MONAT_STUNDE`)

Alle **zwei Jahre** neu erzeugen, nicht öfter und nicht seltener: Ein einzelnes
Jahr ist wetterverzerrt, mehr als zwei Jahre beschreiben eine Preisstruktur, die
es nicht mehr gibt (der Mittagstrog vertieft sich mit jedem Zubaujahr).

**Die Normierung ist der heikle Teil.** Sie muss gegen das nationale Solarprofil
mit *derselben* Glättung gebildet werden wie die Preisform selbst. Wer gegen den
echten, viertelstündlich gewichteten Marktwert normiert, bekommt einen um rund
5 % zu niedrigen Nenner — und damit einen Profilfaktor über 1, also die Aussage,
ein Einfamilienhaus verkaufe besser als der deutsche Anlagenbestand. Genau dieser
Fehler ist beim ersten Bauen passiert; der Test „ist so normiert, dass das
nationale Solarprofil genau 1,0 ergibt" hält ihn fest. `SOLARPROFIL_MONAT_STUNDE`
wird im selben Lauf mit erzeugt und muss zur Preisform passen.

### 4. Kosten der Direktvermarktung (`DIREKTVERMARKTUNG`)

**OFFEN (bis 03/2027):** Aktuell steht dort die Mitte einer Marktspanne
(3–10 €/Monat plus 0,2–0,4 ct/kWh, Stand 08/2026), weil es für Kleinanlagen unter
der neuen Rechtslage noch keine zugeschnittenen Tarife gibt. Sobald es sie gibt,
gehören echte Angebote hierher — mindestens drei Anbieter, Anbieterseite als
Quelle, keine Vergleichsportale (dieselbe Regel wie bei den Hardware-Preisen:
eine Portal-Kostenseite ist keine Preisquelle).

### 5. Erlöspfad (`MARKTWERT_PFAD`)

**Keine Selbstheilung.** Der Pfad ist eine ausgewiesene Annahme, keine Messung —
niemand weiß, wohin der Marktwert über 25 Jahre läuft. Ändern nur, wenn eine
belastbare Studie eine Richtung belegt, und dann als Entscheidung an den
Betreiber, nie als Auto-Fix.

## Befugnis (ergänzt die Tabelle im Wächter-Gate)

| Feld | Auto-Fix? |
|---|---|
| `MARKTWERT_SOLAR_HISTORIE` (neues Jahr ergänzen) | **ja** — eine richtige Antwort, beide Werte belegt, Anker-Test grün |
| `MARKTWERT_NIVEAU_CT` | **ja**, wenn aus demselben Lauf nachgerechnet |
| `PREISFORM_MONAT_STUNDE` / `SOLARPROFIL_MONAT_STUNDE` | **ja**, aber nur gemeinsam und nur mit grüner Normierungs-Gegenprobe |
| `DIREKTVERMARKTUNG` | **nein** — Marktspanne, mehrere vertretbare Antworten |
| `MARKTWERT_PFAD` | **nein** — Annahme, gehört dem Betreiber |
| Alles in `EEG_ENTWURF_WERTE` | **nein** — Rechtsstand, siehe `scripts/eeg-verify.md` |

## Prüfskripte

Die Skripte, die die Zahlen erzeugt haben, liegen nicht im Repo (Einmal-Läufe
gegen die Energy-Charts-API mit lokalem Antwort-Cache). Der Rechenweg steht
vollständig im Kopfkommentar von `lib/marktwert-config.ts` und ist in wenigen
Zeilen nachgebaut; wichtiger als das Skript ist die **Gegenprobe**, und die liegt
als Test im Repo.
