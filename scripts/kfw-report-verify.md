# Prüfauftrag: KfW-Förderreport

**Was hier geprüft wird:** ob ein neuer Jahrgang des KfW-Förderreports vorliegt, und ob die
Zahlen, die daraus auf dem Wärmepumpen-Rechner und im Förder-Ratgeber stehen, noch zum Bericht
passen.

**Wann:** als Schritt des quartalsweisen Wärmepumpen-Laufs (`waermepumpe-werte-verify-jaehrlich`,
Runbook `scripts/waermepumpe-verify.md`). Ein eigener Lauf wäre einer, der elf Monate im Jahr
nichts findet.

**Erwartungswert:** Der Jahrgang des Vorjahres erscheint im Januar. In den übrigen Quartalen ist
„unverändert" das Normalergebnis — und genau die Auskunft, für die das Prüfdatum da ist.

---

## Der Ablauf

1. **Nachsehen, ob ein neuer Jahrgang da ist.**
   Adresse: `https://www.kfw.de/Presse-Newsroom/Pressematerial/Förderreport/KfW-Förderreport_JJJJ.pdf`
   (mit URL-kodierten Umlauten). **Die Datei des laufenden Jahres wird unter derselben Adresse
   überschrieben** — wer einen Zwischenstand später noch belegen können will, legt ihn selbst ab.

2. **Herunterladen nach `docs/quellen/kfw-foerderreport/KfW-Foerderreport_JJJJ.pdf`.**

3. **Einlesen:** `npm run kfw:import -- --jahr JJJJ`
   Braucht `pdftotext` (poppler). Der Lauf schreibt nur, was seine Kontrollsumme bestanden hat —
   und bricht ab, wenn die Kreissumme den Bundeswert verfehlt oder ein Kreisname sich nicht
   eindeutig einem Gebietsschlüssel zuordnen lässt.

4. **`KFW_REPORT_STAND` in `lib/kfw-format.ts` nachziehen** (Prüftag und Stichtag des neuen
   Jahrgangs). Der Import-Lauf verlangt das selbst, wenn er einen Jahrgang mit anderem Stichtag
   ablegt — er meldet es und endet mit Fehler.

5. **Tests:** `npx vitest run lib/__tests__/kfw` muss grün sein. Darin steckt der Realitäts-Anker:
   Was unsere eigene Förderrechnung für einen typischen Fall ausgibt, wird gegen den gemessenen
   Bundesdurchschnitt gehalten.

---

## Was dabei schiefgehen kann — jedes davon ist gemessen

**Die Kontrollsumme ist nicht optional.** Programmnamen brechen im ausgelesenen Text mitten in der
Zeile um, und die Zahlen stehen dabei auf der Zeile DAZWISCHEN. Ein Parser ohne Kontrolle verliert
Zeilen und meldet trotzdem Erfolg: Beim Bau am 26.08.2026 fehlten so 1.255 von 5.226 Mio € bei der
Heizungsförderung — die Zeilen waren gelesen, standen aber unter einem verschmolzenen Namen. Von
außen sah nichts falsch aus.

**Was die Kontrolle nicht besteht, wird nicht abgelegt.** Beim ersten Lauf fiel „KFN Wohngebäude
Selbstnutzung" durch: Die Summe seiner Kreiswerte liegt um rund ein Prozent ÜBER dem Bundeswert,
verteilt über vier Bundesländer. Der Bericht ist dort in sich nicht deckungsgleich — die Summe
seiner sechzehn Landeswerte trifft den Bundeswert auf die Nachkommastelle, die seiner Kreiswerte
nicht. Eine Ursache ist nicht belegt; das Programm hat die kleinsten Zellen des Vergleichs, was auf
Rundung deutet, aber das ist ein Verdacht. Wer diese Grenze aufweicht, damit das Programm
„durchgeht", hebelt die einzige Prüfung aus, die es hier gibt.

**Keine Zelle unter zehn — auch keine errechnete.** Die KfW unterdrückt Anzahlen unter zehn aus
Datenschutzgründen. Über mehrere Jahrgänge und Aggregationsebenen ließe sich eine unterdrückte
Zelle aus Differenzen zurückrechnen, und in einem kleinen Landkreis ist „eine Zusage" faktisch ein
identifizierbarer Haushalt. Die Schranke steht doppelt (Einlesen und Lesepfad) und wird nicht
gelockert.

**Kein Nenner in der Fläche.** Unsere eigene Konvention verlangt, dass jede Pro-Kopf-Zahl ihren
Nenner sichtbar trägt — genau das macht sie umkehrbar. Für diese Quelle gilt deshalb: Nenner im
Einzelfall ja, in einer flächendeckenden Tabelle nein. Ein Test hält das fest.

**Die Erlaubnis ist keine Lizenz.** Sie steht als Ausnahme im Impressum der KfW und gilt nur für
Beiträge aus den Rubriken „Research", „Newsroom" und „Marketingunterstützung". Ein KfW-Dokument von
woanders — Merkblätter, Formulare, Programmseiten — fällt nicht darunter. Volltext-Auszug:
`docs/quellen/kfw-foerderreport/kfw-impressum-nutzungsklausel.txt`. Ändert sich der Wortlaut, geht
das als **Entscheidung** an den Betreiber, nicht als Auto-Fix.

**Die Regeln der Förderung ändern sich schneller als der Bericht.** Der Jahrgang 2025 wurde nach
den Regeln von 2025 gefördert — damals gab es einen Effizienzbonus, den es heute nicht mehr gibt.
Wer die Zahlen als Erwartung für heute darstellt, ohne das zu sagen, macht aus einer Messung eine
Prognose. Der Block sagt es; wer ihn umbaut, prüft, ob er es noch sagt.

---

## Befugnis

| Was | Auto-Fix? |
|---|---|
| Neuen Jahrgang einlesen, Stand nachziehen | **ja** — die Kontrollsumme entscheidet, nicht das Urteil |
| Ein durchgefallenes Programm doch ablegen | **nein** |
| Toleranz der Kontrollsumme ändern | **nein** — Vorschlag an den Menschen, mit Messung |
| Unterdrückungsschwelle ändern | **nein** |
| Wortlaut der Quellenzeile ändern | **nein** — Auflage, nicht Formulierung |
