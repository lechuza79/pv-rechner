# Grüngas-/GModG-Verifikation — Runbook

**Zweck:** Die Aussagen zur Bio-Treppe (§ 43 GModG) und zum Verfahrensstand des
Gebäudemodernisierungsgesetzes in `lib/greengas-config.ts` gegen die amtliche
Quelle abgleichen. Sie tragen den Ratgeber `/ratgeber/gasheizung-oder-waermepumpe`,
die FAQ, das Grüngas-Modal im Wärmepumpen-Rechner, die Datenstand-Seite und —
über `gasQuoteForYear` — den gesamten Gas-Preispfad im WP-Rechner.

**Warum es dieses Runbook gibt (Juli 2026):** In drei Texten stand eine
„100 % ab 2045"-Stufe der Bio-Treppe, die es in § 43 GModG nie gab — sie war aus
einer Modellannahme des IW-Reports zu einer Gesetzesaussage geworden. Gleichzeitig
fehlte die 2030er-Stufe in den Texten, obwohl die Rechenkurve sie hatte. Beides
stand monatelang öffentlich. Seitdem gilt: Stufen und Verfahrensstand kommen aus
**einer** Quelle (`BIO_TREPPE_STUFEN`, `bioTreppeStufenText()`, `gmodgStandSatz()`),
ein Test nagelt die Stufenliste fest, und dieses Runbook prüft sie gegen das Gesetz.

## Die zwei Dinge, die auseinanderlaufen können

1. **Der Verfahrensstand** (`GMODG_RECHTSSTAND.verkuendet`). **Erledigt am
   28.07.2026** — das Gesetz ist im Bundesgesetzblatt verkündet (BGBl. 2026 I
   Nr. 226, Gesetz vom 23.07.2026) und seit dem 29.07.2026 in Kraft; der Schalter
   steht auf `true`, der Volltext liegt unter
   `docs/gmodg/BGBl-2026-I-Nr-226_GModG_verkuendet-2026-07-28.pdf`. **Nicht mehr
   als offener Punkt melden.** Der nächste Verfahrensschritt, auf den zu achten
   ist, ist das Quotengesetz nach § 42a (Punkt 2). Warum das hier stehen bleibt:
   Ein Runbook, das einen erledigten Punkt weiter als akut führt, produziert
   Fehlalarme, die den echten Befund verdecken.
2. **Die Stufen selbst** (`BIO_TREPPE_STUFEN`) und die Modellannahme für 2045
   (`quoteStops[2045]`). Ändert der Gesetzgeber die Bio-Treppe oder beschließt er
   das in § 42a angekündigte Quotengesetz, ändern sich Zahlen im Rechner.

## So wird die Routine ausgelöst

Dem Assistenten sagen: **„Lauf die Grüngas-Prüfung."** Er liest dieses Runbook und
spawnt einen Recherche-Agenten.

Mitgeben: den aktuellen Inhalt von `lib/greengas-config.ts` (`BIO_TREPPE_STUFEN`,
`quoteStops`, `GMODG_RECHTSSTAND`, `validFrom`, `reviewBy`, `source`) und das
heutige Datum.

## Agent-Prompt (Vorlage)

> Du bist Verifizierer für die Grüngas-Pflicht nach dem deutschen
> Gebäudemodernisierungsgesetz (GModG). Heute ist {DATUM}.
>
> Hinterlegt: {BIO_TREPPE_STUFEN, quoteStops, GMODG_RECHTSSTAND, source}
>
> Vorgehen (WebSearch + WebFetch), **ausschließlich Primärquellen** — amtliche
> Seiten und Gesetzestext, KEINE Presseartikel, KEINE Portale von
> Heizungsanbietern, KEINE Affiliate-Seiten:
> 1. **Verkündung:** Ist das GModG im Bundesgesetzblatt verkündet? Wenn ja: mit
>    welchem Datum und welcher Fundstelle? Quellen: recht.bund.de /
>    Bundesgesetzblatt, gmodg.bund.de (GEG-Infoportal, Chronologie),
>    bundesregierung.de. Wenn ja: Wann sind die Heizungsregeln in Kraft getreten?
> 2. **Bio-Treppe (§ 43):** Welche Prozentstufen mit welchen Jahren stehen im
>    geltenden Gesetzestext? Zähle sie vollständig auf. Gibt es eine Stufe nach
>    2040? Sind die anrechenbaren Brennstoffe unverändert (Biomethan, Bioöl,
>    biogenes Flüssiggas, Wasserstoff und Derivate)?
> 2b. **Geltungsbereich (§ 43 + § 10 Absatz 2 Nummer 3):** Gilt die Bio-Treppe
>    weiterhin für neu eingebaute Heizungen **im Bestand UND im Neubau**? Der
>    Wortlaut von § 43 Absatz 1 nennt nur das „bestehende Gebäude" — der Neubau
>    hängt an einer zweiten Vorschrift (§ 10 Absatz 2 Nummer 3: „die Maßgaben der
>    §§ 42 bis 45 entsprechend"). Prüfe **beide** Stellen, und prüfe zusätzlich,
>    ob die Neubau-Stichtage noch stimmen: neues Referenzgebäude ab 01.01.2027
>    (Artikel 2), Nullemissionsgebäude für alle Neubauten ab 01.01.2030
>    (Artikel 4, ersetzt § 10 vollständig — dort fällt der Verweis auf die
>    §§ 42 bis 45 weg).
> 3. **§ 42a / Quotengesetz:** Ist das angekündigte Gesetz zur Grüngas- und
>    Grünheizölquote für Inverkehrbringer vorgelegt oder beschlossen? Wenn ja:
>    welche Quoten mit welchen Jahren, und ab wann (Start war mit 2028 angekündigt)?
>    Das ist der Punkt, an dem aus der heutigen IW-Annahme („100 % bis 2045") echte
>    Gesetzeszahlen werden könnten — und der einzige Strang, der auch
>    **Bestandsheizungen** verteuert (die Quote setzt beim Brennstoff an, nicht bei
>    der Anlage). Kommt sie, muss der Ratgeber-Abschnitt „Und wenn ich schon eine
>    Gasheizung habe?" mit echten Zahlen nachgezogen werden — bis dahin steht dort
>    bewusst „belastbar rechnen lässt sich das heute noch nicht".
> 4. **Bioheizöl-Preispfad — täglich mitprüfen, hohe Dringlichkeit.** § 43 Abs. 1
>    nennt Heizöl gleichrangig neben Gas, aber der Wärmepumpen-Rechner rechnet die
>    Beimischung **nur für Gas**: Der IW-Report modelliert ausschließlich den
>    Gas-Mix (Biomethan + Gasnetzentgelte), und für Bioheizöl existiert bislang
>    keine belastbare Preisreihe. Solange das so ist, steht die Lücke sichtbar im
>    Öl-Ergebnis. **Prüfe bei jedem Lauf:** Gibt es (a) eine gesetzliche Regelung,
>    die den Bioheizöl-Anteil oder dessen Bepreisung konkretisiert — insbesondere
>    das Quotengesetz nach § 42a, das bis zum **1. Dezember 2026** vorzulegen ist
>    und Heizöl ausdrücklich einschließt („Grüngas- und **Grünheizöl**quote") —
>    oder (b) eine Trägerquelle mit echter Preisreihe für Bioheizöl/HVO (amtliche
>    Statistik, Branchenverband, Nachfolge-Report mit Ölpfad)? Portale mit
>    Preisschätzungen zählen NICHT, in keine Richtung.
>
> Für JEDE Angabe die Fundstelle (URL + Datum) nennen. Wo du nichts Amtliches
> findest, schreibe „nicht belegbar" — rate nicht und nimm keinen Presseartikel
> als Ersatz.

## Apply-Politik

Dieselbe Linie wie bei den anderen Wächtern — automatisch nur, was genau **eine**
richtige Antwort hat:

- **Verkündungs-Flag: Auto-Fix erlaubt**, aber erst nach Council gemäß
  `scripts/council-verify.md` (drei unabhängige Verifizierer, einer adversarial)
  und nur mit einer konkreten Bundesgesetzblatt-Fundstelle als Beleg. Dann in
  `lib/greengas-config.ts` `GMODG_RECHTSSTAND.verkuendet` auf `true` setzen und
  `stand` auf den aktuellen Monat. Der Satz selbst kommt aus `gmodgStandSatz()`
  und zieht überall automatisch nach. `npx vitest run` + `npm run build` grün,
  dann mergen und pushen.

  **Verkündet heißt nicht in Kraft — die Falle beim Umlegen (28.07.2026).** Das
  GModG wurde am 28.07. verkündet und trat am 29.07. in Kraft. Ein Schalter, der
  nur „verkündet ja/nein" kennt, hätte einen Tag lang „ist geltendes Recht"
  behauptet, obwohl das Gesetz noch nicht galt. Deshalb trägt der Rechtsstand
  jetzt auch `inKraftSeitIso`, und `gmodgStandSatz()` unterscheidet die beiden
  Zustände am Kalendertag. Wer künftig einen Rechtsstand umlegt, prüft **beide**
  Daten — Verkündung und Inkrafttreten stehen im Gesetz an verschiedenen Stellen
  (Kopf des Gesetzblatts bzw. der Inkrafttretens-Artikel am Ende).

  **Formulierung vom Legal-Judge prüfen lassen, nicht nur das Flag.** Beim
  Umlegen am 28.07.2026 fand der Legal-Judge drei Fehler, die schon vorher im
  Text standen: „Bundestag und Bundesrat haben beschlossen" (es ist ein
  Einspruchsgesetz — das Gesetzblatt nennt nur den Bundestag), „gilt für
  Gasheizungen" (§ 43 erfasst Gas, **Heizöl und Flüssiggas**) und eine Pflicht
  ohne die Ersatzwege/Härtefälle aus § 43 Abs. 3–7. Das Flag war der Anlass, die
  Fehler waren älter.

  **Der Wortlaut EINES Paragrafen ist nicht der Geltungsbereich (29.07.2026).**
  Bei derselben Prüfung wurde aus „§ 43 Absatz 1 sagt: in ein bestehendes
  Gebäude" die Aussage „der Neubau ist nicht erfasst" — auf fünf Oberflächen,
  einen Tag lang, und ein Test hat sie festgenagelt. Falsch: § 10 Absatz 2
  Nummer 3 erklärt die §§ 42 bis 45 für neu zu errichtende Gebäude
  „entsprechend" für anwendbar; die amtliche Begründung sagt es wörtlich
  (BT-Drs. 21/6278, S. 96). Aufgefallen ist es dem Betreiber, nicht dem Wächter.
  **Lehre: Bei jeder Geltungsbereichs-Aussage die Verweisketten mitlesen** —
  gerade wenn ein Paragraf in einem Kapitel steht, dessen Überschrift den
  Anwendungsfall schon einzugrenzen scheint. Und: Ein Negativ-Satz („X ist nicht
  erfasst") braucht eine eigene Fundstelle, die das sagt. Das Fehlen einer
  Erwähnung ist keine.
- **Stufenwerte, anrechenbare Brennstoffe, Quotengesetz: kein Auto-Fix.** Das sind
  zitierfähige Rechtsaussagen, die in die Berechnung durchschlagen — Befund in den
  Report, Formulierung und Eintrag macht ein Mensch. Gilt ausdrücklich auch, wenn
  der Befund eindeutig aussieht.
- **Bioheizöl-Regelung: kein Auto-Fix, aber SOFORT melden — als Entscheidung, nicht
  als Notiz.** Kommt eine Regelung oder eine belastbare Preisreihe für Bioheizöl
  (Schritt 4 oben), ist das kein Wert, den der Wächter still nachträgt: Er verteuert
  die Ölheizung spürbar und verschiebt jedes Öl-Ergebnis. Deshalb geht der Befund
  **am selben Tag** über `/api/alert` an den Betreiber, und zwar als `decisions`-
  Eintrag (nur der wird zugestellt, siehe `scripts/waechter-gate.md` Teil 3) — nicht
  als „erledigt"-Zeile. Zwei Dinge stehen dann an, und beide gehören dem Menschen:
  **(1) einrechnen** — Preispfad für Öl analog zum Gas-Mix, aber ohne Netzentgelte
  (die es beim Öltank nicht gibt); der sichtbare Lücken-Hinweis im Öl-Ergebnis
  (`waermepumpe.tsx`) und der Prüfpunkt in `scripts/waermepumpe-verify.md` fallen
  im selben Zug weg. **(2) Sichtbarkeit** — eine bezifferte Aussage dazu, was die
  Pflicht eine Ölheizung kostet, ist ein Anlass, den Rechner aktiv zu zeigen
  (Ratgeber, Datenstand, Außenkommunikation). Formuliere die Meldung so, dass der
  Betreiber beides entscheiden kann, ohne den Gesetzestext selbst zu lesen: was gilt
  ab wann, wie groß der Effekt ungefähr ist, und was du vorschlägst.
- **Schwellen aufweichen ist nie die Lösung.** Wenn der Test
  `lib/__tests__/greengas.test.ts → "die Stufen-Liste für Texte enthält genau die
  vier Gesetzesstufen"` anschlägt, ist entweder das Gesetz geändert (→ Mensch) oder
  jemand hat eine Stufe erfunden (→ zurücknehmen). Den Test anzupassen, damit er
  wieder grün wird, ist der Fehler, den er verhindern soll.
- **Texte mitziehen:** Ändert sich eine Zahl, im selben Fix prüfen, ob sie auch in
  `lib/faq.ts`, im Ratgeber, im WP-Rechner-Modal oder auf `/datenstand` als
  Fließtext steht. Die geteilten Helfer decken die Stufen und den Standsatz ab —
  freie Formulierungen drumherum nicht.

## Prüfrhythmus

- **Täglich:** `foerder-news-waechter`, Schritt 4c — Verkündung + Ad-hoc-Änderungen.
- **Jährlich:** zusammen mit `waermepumpe-werte-verify-jaehrlich` (Januar), weil
  der Grüngas-Pfad die Gas-Referenz des WP-Rechners ist. Stichtag steht in
  `GREEN_GAS_CONFIG.reviewBy`.
