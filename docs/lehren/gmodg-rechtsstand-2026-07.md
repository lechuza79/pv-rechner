# Lehren: GModG-Rechtsstand — vier Korrekturen in vier Tagen

Wortlaut aus CLAUDE.md (Abschnitt „Faktenprüfung", Auslöser und Nachträge),
Stand 29.07.2026. Die neun Faktenprüfungs-Regeln und die Kurzfassung der Lehren
stehen weiterhin in CLAUDE.md; hier liegt die vollständige Chronologie mit
Fundstellen.

**Auslöser (Juli 2026):** Im GModG-Content stand in drei Texten — Ratgeber, FAQ und
Rechner-Modal — eine „100 % ab 2045"-Stufe der Bio-Treppe, die es in § 43 GModG
nie gab. Sie war aus der Modellannahme des IW-Reports (Fortschreibung bis zur
Klimaneutralität 2045, die § 42a GModG nur ankündigt) zu einer Gesetzesaussage
geworden. Zusätzlich war die 2030er-Stufe (15 %) in den Texten verlorengegangen,
obwohl die Rechenkurve sie hatte. Konsequenz im Code: Stufen und Verfahrensstand
kommen jetzt aus **einer** Quelle (`BIO_TREPPE_STUFEN`, `bioTreppeStufenText()`,
`gmodgStandSatz()` in `lib/greengas-config.ts`), und ein Test nagelt fest, dass
die Stufenliste genau die vier Gesetzesstufen enthält — dieselbe Logik wie bei
den Einheiten: eine zweite handgetippte Kopie ist ein Fehler, kein Duplikat.

**Ein datierter Rechtsstand braucht einen Wächter, sonst ist er eine tickende
Bombe.** `GMODG_RECHTSSTAND.verkuendet` ist ein Sachstands-Schalter: Solange er
`false` ist, sagen Ratgeber, FAQ, WP-Rechner-Modal und `/datenstand`, die
Verkündung stehe noch aus — nach der Verkündung wäre das eine falsche
Rechtsaussage auf vier Oberflächen. Deshalb prüft ihn der tägliche
`foerder-news-waechter` (Schritt 4c) mit; Runbook `scripts/gruengas-verify.md`.
Selbstheilung nur beim Verkündungs-Flag (Council + Bundesgesetzblatt-Fundstelle,
genau eine richtige Antwort); geänderte Stufenwerte oder ein beschlossenes
Quotengesetz nach § 42a sind **Vorschlag an den Menschen**. Wer künftig einen
„Stand: Monat/Jahr"-Fakt in Content schreibt, hängt ihn an einen Wächter — oder
er wird still falsch.

**Der Wächter hat am 28.07.2026 ausgelöst und damit den Zweck belegt:** Das GModG
wurde an diesem Tag verkündet (BGBl. 2026 I Nr. 226, Gesetz vom 23.07.2026) und
trat am 29.07.2026 in Kraft; ohne den täglichen Lauf hätten vier Oberflächen
weiter behauptet, die Verkündung stehe aus. Zwei Lehren daraus stecken jetzt im
Code: **Verkündet ist nicht in Kraft** — dazwischen lag ein Tag, deshalb kennt
der Rechtsstand neben dem Flag auch `inKraftSeitIso` und `gmodgStandSatz()`
unterscheidet beide Zustände am Kalendertag. Und: **beim Umlegen eines
Rechtsstands die Formulierung mitprüfen, nicht nur den Schalter** — der
Legal-Judge fand dabei drei Fehler, die schon länger dort standen („Bundestag und
Bundesrat haben beschlossen" bei einem Einspruchsgesetz, „gilt für Gasheizungen",
obwohl § 43 auch Heizöl und Flüssiggas erfasst, und eine Pflicht ohne die
Ersatzwege/Härtefälle aus § 43 Abs. 3–7). Der Gesetzestext liegt als Primärquelle
unter `docs/gmodg/`, festgenagelt von `lib/__tests__/greengas.test.ts`
(„Rechtsstand GModG — Realitäts-Anker").

**Und die dritte Lehre, einen Tag später: der Wortlaut EINES Paragrafen ist nicht
der Geltungsbereich.** Bei derselben Prüfung kam als vierte „Korrektur" die
Einschränkung hinzu, die Beimischpflicht gelte nur für den Einbau „in ein
bestehendes Gebäude" — sauber abgelesen aus § 43 Abs. 1 und trotzdem falsch: § 10
Abs. 2 Nr. 3 erklärt die §§ 42 bis 45 für neu zu errichtende Gebäude
„entsprechend" für anwendbar, und die Gesetzesbegründung sagt es wörtlich
(BT-Drs. 21/6278, S. 96). Der Neubau lief immer schon über § 10 — vorher zeigte
dieselbe Nummer 3 auf § 71 Abs. 1, die 65-%-Regel. Die falsche Verengung stand
einen Tag auf fünf Oberflächen, und der Test hielt sie fest; aufgefallen ist sie
dem Betreiber. Daraus **Gate-Regel 8** („ein ‚gilt nicht für X' braucht eine
eigene Fundstelle"), ein umgedrehter Test, die Neubau-Zeitachse (neues
Referenzgebäude ab 01.01.2027, Nullemissionsgebäude für alle Neubauten ab
01.01.2030) im Ratgeber und in der FAQ sowie beide Bundestags-Drucksachen unter
`docs/gmodg/`. Die Rechnung war nie betroffen — nur die Texte.

**Die eigentliche Lehre kam einen Schritt später und betrifft nicht das Gesetz,
sondern uns:** Die Korrektur lief zunächst ohne Council, weil sie „nur aus einem
Gespräch" kam — und wurde dem Betreiber zur Abnahme vorgelegt, der Rechtsfragen
gar nicht beurteilen kann. Der nachgeholte Council bestätigte 3/3, der
adversariale Prüfer fand aber eine **fehlende Zeitgrenze**: Im Neubau greift die
Bio-Treppe nur für Gebäude, die bis zum 31.12.2029 errichtet werden (Begründung
zu § 5b Kohlendioxidkostenaufteilungsgesetz, BT-Drs. 21/6278, S. 125 — zugleich
die stärkere Fundstelle für die Neubau-Geltung überhaupt). Ohne sie wäre die
neue Aussage für Neubauten ab 2030 wieder falsch gewesen. Seither gilt:
`scripts/council-verify.md` hängt an der **Änderung, nicht an ihrer Herkunft**,
der Betreiber nimmt Aussehen ab und keine Fakten, und jede korrigierte
Rechtsaussage bekommt einen Browser-Test an der Stelle, an der ein Nutzer sie
sieht.
