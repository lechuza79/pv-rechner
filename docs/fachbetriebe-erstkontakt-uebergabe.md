# Fachbetriebe ansprechen: Übergabe für die Konzept-Session

**Angelegt 29.08.2026** am Ende der Erhebungs-Session. Auftrag des Betreibers: **erst
konzeptionell/strategisch die Anfrage prüfen**, nicht bauen.

## Was da ist

**3.114 regionale PV-Fachbetriebe**, davon 2.596 mit amtlichem Gemeindeschlüssel. Erreichbar
sind 94 % (84 % E-Mail, 82 % Telefon, dazu Kontaktformulare). Geschäftsfelder zu 96 %:
Photovoltaik 96, Speicher 61, Wärmepumpe 55, Wallbox 55, Balkonkraftwerk 19 %. Gewerk bei
67 %: Elektro 47, Heizung/Sanitär 17, Solarteur 16, Dachdecker 8 %.

Trust-Signale sind dünn und das ist gemessen, nicht versäumt: Meisterbetrieb 27 %,
Handwerkskammer 15 %, Zertifikate 14 %, Gründungsjahr 16 %, Bewertung 5 %. **Wer
Meisterbetrieb ist, schreibt es auf die Startseite; wer es dort nicht schreibt, schreibt es
nirgends.** Über die Website ist diese Grenze nicht zu überwinden — der Erstkontakt ist der
billigste Weg zu diesen Angaben.

**Die Versandmechanik der Kommunen trägt** und ist fast frei von Kommunen-Vokabular:
Versandbremsen (Schulferien und Feiertage des Ziel-Bundeslands, Di–Do, Tagespensum,
Pflichtangaben je Text, Anbieter-Erlaubnisliste, kein Versand ohne DKIM),
Rücklauf-Erkennung und Arbeitsstand. Neu zu bauen wären Brieftext und Zielgruppen-Auswahl.
Fundstellen: `lib/outreach-mail.ts`, `lib/outreach-ruecklauf.ts`, `lib/outreach-status.ts`,
`scripts/kommunen-versand.ts`, `scripts/kommunen-versand-runbook.md`.

## Die Frage, die diese Session beantworten soll

**Mit welchem Anliegen schreiben wir an?** Drei Kandidaten, in der Sitzung vom 29.08.2026
umrissen:

1. **Widget-Einbettung** — „Sie beraten zu PV, wir haben einen unabhängigen Rechner ohne
   Leadfunnel zum Einbetten." Der ursprüngliche Zweck der Erhebung (der Wettbewerbsbefund
   zeigt: Fachbetriebe sind die größte Gruppe unter den 2.080 verweisenden Domains des
   HTW-Rechners). Braucht keine Vorarbeit, ist heute schon wahr.
2. **Datenabgleich** — „Wir führen Sie im Verzeichnis, stimmt das?" Bringt Meisterbrief und
   Angebotsdaten. Setzt aber ein öffentliches Verzeichnis voraus, das es nicht gibt.
3. **Angebots-Feature** — „Nutzer könnten Sie anfragen." Für den Betrieb das
   Interessanteste, aber die Zusage „keine Lead-Erfassung · kein Vertriebskontakt" steht an
   vierzehn Stellen und müsste vorher umformuliert werden. Merkliste:
   `docs/solarteur-widget-offene-fragen.md`.

**Empfehlung aus der Erhebungs-Session: mit dem Widget anfangen.** Es ist ohne Vorarbeit
wahr, und die Antwortquote sagt, ob überhaupt jemand mit uns reden will. Die anderen beiden
lassen sich anhängen, wenn ein Erstkontakt steht.

## Was VOR dem ersten Versand erledigt sein muss

**Die Datenschutzerklärung nennt diese Erhebung mit keinem Wort.** Zwei Legal-Judges haben
das unabhängig festgestellt, und die Ausnahme „unverhältnismäßiger Aufwand" (Art. 14 Abs. 5
lit. b DSGVO) trägt hier nicht: 94 % der Betriebe haben einen Kontaktweg, und wer
Kontaktdaten erhebt, UM Kontakt aufzunehmen, kann sich nicht darauf berufen, Kontakt sei zu
aufwendig. Die Information kann im Anschreiben selbst erfolgen (Art. 14 Abs. 3 lit. b), für
die Nicht-Angeschriebenen braucht es eine öffentliche Datenschutz-Unterseite.

**Rechtsrahmen ist kalibriert, nicht offen** (siehe CLAUDE.md, Legal-Checkliste Punkt 6):
Maßvolle, schubweise Kaltakquise per Mail ist eine unternehmerische Entscheidung, kein
Verbot — der Empfänger selbst ist nach § 8 Abs. 3 UWG nicht abmahnbefugt. Risikofrei sitzt
es über das **Kontaktformular** der Zielstelle oder einen Permission-Ask. Pflicht in jeder
Mail: Klarname, „Betreiber solar-check.io", Impressum-Link, Datenschutz-Einzeiler.

## Was NICHT nochmal gemacht werden soll

- **Versorger als Anbieter behandeln.** Vier Messversuche am 29.08.2026, keiner zuverlässig:
  Ein Versorger hat eine Informationspflicht, seine Erklärseiten sehen aus wie
  Produktseiten. Von sechs gelesenen Balkon-Seiten verkauften zwei. Herleitung:
  `docs/fachbetriebe-quellen.md`, Abschnitt 1d.
- **Bewertungen öffentlich zeigen.** Scheitert am Bewertungsrecht (§ 5b Abs. 3 UWG, Anhang
  Nr. 23b), nicht an Google. Abschnitt 1b.
- **Die Handwerkskammer-Betriebsdatenbank abfragen.** Zwölf Betriebe gesucht, einer
  gefunden — der Eintrag ist freiwillig. Abschnitt 2.

## Der Bestand ist NICHT für den Versand gebaut

Die Arbeitsstände heißen „offen · vorgemerkt · angesehen · ungeeignet"; ein Zustand wie
„angeschrieben" existiert bewusst nicht und ist per Test verboten, weil er einen Apparat
behaupten würde, den es nicht gibt. Wer den Versand baut, hebt diese Sperre bewusst auf —
sie ist kein Versehen.
