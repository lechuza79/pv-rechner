# Presse- und Creator-Katalog

Vierte Erhebung dieses Repos nach Gemeinden, Versorgern und Fachbetrieben.
Mechanik geteilt, Vokabular eigen — Befunde der anderen drei übertragen sich
ausdrücklich **nicht**.

- Muster (reine Logik): `lib/presse-extrakt.ts`, Tests `lib/__tests__/presse-extrakt.test.ts`
- Saat (benannte Medien): `lib/presse-saat.ts`
- Lauf: `scripts/presse-refresh.ts` (`npm run presse`)
- Tabellen: `presse_medien`, `presse_kontakte`, `presse_belege` (RLS an, keine
  Policy — die Sätze enthalten Namen und Funktionen von Journalistinnen und
  Journalisten)
- Ausgabe: `docs/presse/*.csv`

## Warum die Trefferquote hier höher ist als bei den drei vorigen

Bei Gemeinden, Versorgern und Fachbetrieben ist der Ansprechpartner eine
Fundsache. Bei einem journalistisch-redaktionellen Angebot ist er **gesetzlich
verlangt**: § 18 Abs. 2 MStV nennt eine natürliche Person mit Namen und
Anschrift, zusätzlich zu § 5 DDG. Der Anker dieser Erhebung ist deshalb nicht
die persönliche Mailadresse, sondern die Funktionsbezeichnung.

Gemessen am 03.09.2026 über 382 Adressen: **1.381 Kontakte mit Namen, 758 davon
mit persönlicher Adresse.** Zum Vergleich: Bei den Versorgern war ein
namentlicher Ansprechpartner nicht zu holen (0 von 20 Impressen).

## Der größte Einzelhebel: verschleierte Adressen

`ohneAdressVerschleierung` setzt Cloudflares Adress-Verschleierung in den
Klartext zurück, den jeder Browser ohnehin anzeigt. Ohne diesen Schritt findet
die Erhebung auf der Teamseite von pv magazine **null** Adressen — dort stehen
69 verschleierte — und hält die Seite für eine ohne Kontaktweg.

Das ist kein Umgehen einer Schutzmaßnahme: Die Adresse ist veröffentlicht,
verschleiert wird sie gegen Sammler ohne JavaScript. Was nicht passiert: eine
Adresse erfinden, die dort nicht steht.

## Die vier Pakete

| Paket | Was | Zeilen |
|---|---|---|
| 1 | bundesweite Fach-, Energie-, Kommunal- und Verbrauchermedien | 804 |
| 2 | Regionalmedien mit eindeutig zuordenbarem Gebiet | 356 |
| 3 | Newsletter, Podcasts, Creator | 22 |
| 4 | **Prüfliste** — was die Suche gefunden hat, noch niemand angesehen | 2.042 |

**Paket 4 ist kein Katalogpaket.** Ein Suchtreffer ist eine Adresse, kein Befund;
grob die Hälfte ist nichts (im Förderbereich gemessen, hier nicht anders). Neben
die benannten Medien gestellt sähe eine Vermutung aus wie eine Messung.

**Paket 3 ist dünn, und das ist ein Befund.** Deutsche Creator zum Thema haben
selten eine eigene Website mit Impressum; wer eine hat, ist überwiegend Händler
mit Magazin (im Katalog als solcher vermerkt). Wer das Paket füllen will, kommt
an der Plattform nicht vorbei — und YouTube gibt seine Kanaldaten weder ohne
JavaScript noch ohne Verstoß gegen seine Bedingungen her.

## Neun gemessene Fehlerklassen

Jede stammt aus einer Handprüfung von 26–32 Zeilen, jede ist in
`lib/__tests__/presse-extrakt.test.ts` festgenagelt. **Keine einzige war an einer
Quote zu erkennen.**

1. **Adressen verschleiert** — 27 Redakteure gemeldet, 0 Adressen (pv magazine).
2. **Namen quer über Einträge** — „Emiliano Bellini News Director" als Name. Der
   Aufbau ist zeilenorientiert, `\s` überspringt aber Zeilenumbrüche.
3. **Funktionszusatz verloren** — „Editor, France" wurde zu „Editor". Für einen
   deutschen Verteiler ist das der Unterschied zwischen richtig und falsch.
4. **Menü als Person** — „Magazine Netiquette Impressum" (energiezukunft.eu).
5. **Funktion als Person** — „Chief Content Officer" (ikz.de).
6. **Marke als Person** — „Springer Professional", „National Geographic Magazin".
7. **Artikeltext als Redaktion** — auf sueddeutsche.de landete ein
   Ministerpräsident aus einer Schlagzeile als „Redakteur" im Katalog. Seitdem
   werden Rollen **nicht mehr von der Startseite** gelesen.
8. **Nichtssagender Seitentitel** — drei Medien hießen im Katalog „Startseite".
9. **Stehengebliebene Werte** — nach einem gescheiterten Abruf blieb die
   Einstufung des letzten geglückten Laufs stehen: energieverbraucher.de stand
   mit Priorität A da, ohne einen einzigen Kontakt.

Dazu zwei Fehler in der Mechanik, die dieselbe Form haben wie anderswo im Repo:
**verwaiste Kontakte** (ein Upsert schreibt nur, was jetzt gefunden wurde — die
Fehltreffer des Laufs davor blieben stehen, der Fix sah im Diff richtig aus und
änderte nichts) und **eine gesperrte Startseite als „Medium nicht erreichbar"**
(sechs Madsack-Titel antworten der Startseite mit 403 und dem Impressum mit 200;
die Meldung war eine Auskunft über uns, nicht über das Medium).

## Was der Katalog behauptet und was nicht

- **Gemessen:** Name, Funktion, Adresse, Quell-Adresse, Prüfdatum, Themen (aus
  der Zahl der Fundstellen auf der Startseite), Medientyp, Reichweite (nur mit
  Beschriftung), redaktionelles Angebot ja/nein.
- **Abgeleitet:** passende Geschichten, Aufhänger, Priorität — alle drei
  mechanisch aus den gemessenen Themen. Wer die Muster ändert, ändert alle drei.
- **Ungeprüft und als solches gekennzeichnet:** Gebiet und, wo die Messung
  nichts hergab, Medientyp und Schwerpunkt.

**Priorität ist eine Zeilen-, keine Medien-Eigenschaft.** Ein A-Medium kann einen
C-Kontakt tragen: Bei pv magazine steht die Australien-Redaktion auf derselben
Seite wie die deutsche.

## Was NICHT gebaut ist

Kein Anschreiben, kein Versandweg, kein Cockpit. Diese Erhebung erhebt.

**Vor dem ersten Kontakt zu klären** (gehört dem Betreiber, nicht mir):
- Die Datenschutzerklärung nennt diese Verarbeitung mit keinem Wort. Die Ausnahme
  „unverhältnismäßiger Aufwand" nach Art. 14 Abs. 5 DSGVO trägt hier nicht — wer
  Kontaktdaten erhebt, *um* Kontakt aufzunehmen, kann Kontakt nicht als zu
  aufwendig ausgeben. Dieselbe offene Frage wie bei den Fachbetrieben.
- § 7 UWG ist für Presseanfragen milder als für Werbung, aber nicht abgeschaltet:
  Eine Pressemitteilung an eine Redaktion, die dafür ein Postfach ausweist, ist
  etwas anderes als ein Angebot an eine namentlich genannte Person. Die Grenze
  gehört vor dem ersten Schub durch zwei Legal-Judges.
