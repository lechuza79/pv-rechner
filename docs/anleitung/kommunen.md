# Projektanleitung: kommunen

Verbindliches Fachkapitel zu [CLAUDE.md](../../CLAUDE.md). Nur die für den Auftrag relevanten Abschnitte laden. Codepfade in Backticks beziehen sich auf das Repository-Hauptverzeichnis; Verweise wie „oben“ und „siehe Abschnitt“ meinen die entsprechenden Fachabschnitte, die in der zentralen Anleitung verlinkt sind.

## Neue Orte für die Kommunen-Stage

**Neue Orte vor einem Gemeinde-Aussand:** Einstieg ist [`docs/landschaft-neuer-ort-workflow.md`](../../docs/landschaft-neuer-ort-workflow.md), ausführbarer Plan/Serverlauf/Prüfung `scripts/stage-workflow.py`. Bestehenden Hetzner-Bestand und zentrale Stage verwenden. Bundesweit vorbereitete Registerinventare sind keine fertigen Szenen; unterstützte Länderadapter und offene Fälle stehen im Runbook. Wetterfreischaltung, Park-Metadaten, Quellenprüfung, Browserabnahme und öffentliche Linkprüfung gehören zum Abschluss. Keine individuellen Szenenkopien, keine stillen Datenersatzwerte, keine Veröffentlichung allein wegen eines abgeschlossenen Datenlaufs. **Die Szenen liegen im Hetzner-Szenenspeicher, nicht im Repo** (seit 07.10.2026; bis auf fünf Testorte von git ausgenommen): Die Website liest sie über eine Umleitung auf der eigenen Adresse, veröffentlicht wird mit `npm run szenen:hochladen`, das unvollständige Windräder abweist.

## Jede Aussendung steht in der Datenbank — BLOCKER (07.10.2026)

**Egal aus welcher Sitzung: Wer eine Mail an Gemeinden, Redaktionen, Förderstellen oder sonst jemanden außerhalb verschickt, schreibt sie vorher in eine Tabelle.** Eine Datei ist kein Protokoll, ein temporärer Ordner erst recht nicht.

- **Der Anlass:** 138 Pressemitteilungen an Lokalredaktionen (29./30.09.2026) und sieben Update-Mails (28.09.) gingen aus einem nie eingecheckten Skript hinaus, das sein Protokoll in den temporären Ordner der Sitzung schrieb. Der wurde aufgeräumt; eine Woche später meldete eine andere Sitzung „Regionalpresse nie angeschrieben" — der nächste Schub hätte dieselben Redaktionen ein zweites Mal angeschrieben. Zurückgeholt wurde die Liste nur, weil jede Mail zufällig auch im Gesendet-Ordner lag (Tabelle `aussendungen`, Herkunft „nachgetragen").
- **Der Gesendet-Ordner ist KEIN Protokoll.** Das Postfach legt dort nichts von selbst ab — von 468 Kommunen-Anschreiben steht dort keines. Was ein Lauf nicht selbst hineinkopiert, existiert dort nicht.
- **Versandwege und ihre Tabellen:** Gemeinden und Landkreise → `kommunen_kontakt` (`scripts/kommunen-versand.ts`), Förderstellen → `funding_anfragen` (`scripts/funding-anfrage.ts`), **jede andere Zielgruppe → `aussendungen` über den einen Versandlauf** (`npm run aussendung -- --zielgruppe <name>`, für die Presse `npm run presse:versand`; der Entwurf ist ein eigenes Skript, das selbst nicht sendet, Vorlage `scripts/presse-kreise.ts`). Er prüft vor der ersten Mail Pflichtangaben und Vorlagenlücken des ganzen Schubs und verweigert ohne DKIM. Eine neue Zielgruppe braucht keine neue Tabelle und keinen neuen Lauf, nur ihren Namen.
- **Eine neue Zielgruppe steht in `lib/zielgruppen.ts`** — Kontaktsuche, Domain-Belegung, Bestände-Abgleich, Freigabe und Versandweg an einer Stelle; `lib/__tests__/zielgruppen.test.ts` wird rot, sobald eine davon fehlt. Der ganze Weg von der Erhebung bis zur Wirkungsmessung, samt Prüfliste für ein neues Land: `docs/erhebung/kontakte-neuer-bestand.md`, die einzige Anleitung dafür.
- **Zwei Sicherungen, weil eine nicht reicht:** `lib/__tests__/versand-protokoll.test.ts` hält jedes eingecheckte Skript, das über das Postfach sendet, gegen die Liste. `npm run sessions` sucht in jedem Arbeitsstand nach NIE eingecheckten Dateien, die senden — genau dort lag das verlorene Skript, und dort sieht kein Test hin. Steht dort ein Befund, wird vor dem nächsten Versand nichts verschickt, bis der Weg über einen eingecheckten Lauf führt.
- **Was die Sicherungen nicht können:** Ein Skript, das jemand anlegt, ausführt und löscht, ohne dass dazwischen `npm run sessions` läuft, sieht keine von beiden. Deshalb ist die Regel eine Regel und nicht nur ein Test.

## Kommunen-Outreach (interner Bereich)

Widget-Distribution an ~11.000 Gemeinden. Tabelle `kommunen_kontakt` (Supabase, RLS **nur service_role** — interne Daten, bewusste Abweichung vom Atlas-Muster), befüllt von `scripts/kommunen-kontakt-refresh.ts` (Phasen `--setup`, `--wikidata`, `--forms`/`--probe`, `--profil`, `--luecke`, `--wahl`, `--rang`, `--stats`; DB-schonend). Cockpit `/admin/kommunen` mit Anschreiben-Generator (**Template statt LLM**, Einheiten nur aus `atlas-format`). **Kein Auto-Versand — der Absende-Klick bleibt beim Menschen.** Rechtsrahmen: Legal-Checkliste #6.

**Die Kontaktseite wurde jahrelang GEFUNDEN, aber nie GELESEN — BLOCKER-Muster (01.09.2026).** Zwei Läufe suchen seit Juli die Kontaktseite jeder Gemeinde und legen ihre Adresse ab; Postfächer zog daraus aber ausschließlich der Profil-Lauf, und der liest nur das **Impressum**. Die Kontaktseite war damit erfasst und ungenutzt: 5.051 Gemeinden hatten eine hinterlegte Kontaktseite, die nie jemand auf eine E-Mail-Adresse hin angesehen hat. **Die Fehlerklasse ist nicht „vergessen zu crawlen", sondern „gecrawlt und nicht ausgewertet"** — von außen ununterscheidbar von „dort steht nichts", und deshalb fällt sie niemandem auf.
- **Gemessen, bevor gebaut wurde:** 10.980 Gemeinden mit Website, 7.448 davon ohne Postfach. Der Lauf `--luecke` fand 1.875 (25 %) — 1.713 auf der Kontaktseite, 162 bei der Gemeinde, die mitverwaltet. Erreichbarkeit von 3.532 auf 5.407.
- **Drei Ursachen, alle belegt:** Adresse auf der Kontaktseite statt im Impressum (der große Posten) · als Spamschutz verschleiert (`rathaus⚹huerth◦de`, entschlüsselt in `lib/kommunen-profil.ts`, Tests in beide Richtungen) · Postfach gehört der verwaltenden Gemeinde.
- **Geraten wird nichts.** Eine Adresse auf einer Domain außerhalb der Grundgesamtheit ist der Website-Dienstleister und fliegt raus — dieselbe Regel wie im Profil-Lauf, wo sie schon zwei Agenturadressen abgefangen hat. Beim Entschleiern wird nur ERSETZT, nie ergänzt: Ein Trennzeichen ohne erkennbares Muster bleibt stehen, dann entsteht eben keine Adresse. Eine erfundene ginge in den Versand und käme als Unzustellbarkeit zurück.
- **Auch die erfolglosen bekommen ihr Prüfdatum** (`luecke_at`). Ohne das ist „geprüft, nichts gefunden" nicht von „noch nie geprüft" zu unterscheiden, und der nächste Lauf beginnt wieder bei denselben — dieselbe Systematik wie das Gedächtnis des Förder-Screeners.
- **Woher ein Postfach stammt, steht an ihm** (`rollen_email_quelle`: Impressum · Kontaktseite · Verwaltung). Die dritte Herkunft ist die einzige, bei der wir NICHT an die Gemeinde selbst schreiben; das muss ablesbar bleiben, ohne die Adresse zu deuten.

**Der Engpass war nie die Adresse, sondern der AUFHÄNGER.** Die Auswahl nimmt nur Gemeinden, die in irgendetwas auf Platz 1 stehen („Testballon nimmt nur echte Sieger"). In den acht Ländern des Nord/Ost-Schubs sind 3.730 Gemeinden unangetastet, im Topf landen 399. Wer den Ausbau plant, rechnet mit dieser Zahl, nicht mit den 11.000 Gemeinden und nicht mit den 5.208 per Mail erreichbaren.

**Ein Anschreiben entsteht an EINER Stelle: `lib/kommunen-brief.ts` — BLOCKER.** Cockpit-Entwurf und Versandpaket rufen dieselbe Funktion; eine zweite Zusammensetzung hieße, dass die abgenommene Vorschau und die verschickte Mail verschiedene Zahlen tragen können. Der Aufhänger kommt aus dem Award-Rechenkern (`server-only`), deshalb liegt das Versandpaket als Route (`/api/admin/kommunen/versandpaket`, Admin-Session **oder** `CRON_SECRET`) und nicht als Skript vor — ein Skript hätte die Ranglisten ein zweites Mal nachgebaut.

**Was ein Brief behauptet, muss die verlinkte Seite tragen — BLOCKER.** Drei adversariale Prüfer über die 100 echten Briefe des ersten Schubs (19.08.2026) fanden vier Fehlerklassen, die alle dieselbe Form haben: Der Brief sagt etwas, das auf **unserer eigenen** verlinkten Seite in einem Klick zu widerlegen ist.
- **Der Betreff nennt die Gruppengröße** (`hookText`). „Riedstadt … auf Platz 1 in Hessen" behauptete den ersten Platz unter allen hessischen Kommunen; der Rang gilt nur unter den Mittelgroßen Städten, und Nieste steht auf der verlinkten Rangliste höher. „von 53" macht die Teilmenge sichtbar, ohne den Betreff zu sprengen — die volle Vergleichsgruppe steht in der Meldung.
- **Schlusslichter bekommen keinen Aufhänger** (`schlusslichterImKreis`). Fünf Briefe titelten „Platz 1", während die Gemeindeseite denselben Ort als Letzten seines Landkreises ausweist. Beides ist wahr (verschiedene Messgrößen), aber eine Pressestelle liest es als Widerspruch.
- **Ein Aufhänger braucht eine Grundmenge** (`MIN_MENGE_FUER_AUFHAENGER`, 5). Hamm im Eifelkreis: 16 Einwohner, ein Balkonkraftwerk, „Platz 1 von 150" — der Superlativ entsteht vollständig im Nenner. **Als Merker an der Platzierung, nie als Filter auf den Topf**: Wer die Gemeinde aus der Gruppe nimmt, ändert die Gruppengröße und schreibt „von 149", während die Rangliste „von 150" zeigt.
- **Die Stückzahl steht neben der Rate** (`basis` → `rangBasis`). Das Feld gab es längst, es war im Brief nur nie angekommen.

**Der Versand hat Bremsen, keine Merksätze** (`scripts/kommunen-versand.ts` + `lib/outreach-mail.ts` + `lib/schulferien.ts`). „Nie in den Schulferien senden" stand als Notiz — jetzt verweigert der Lauf: Ferien und Feiertage des Ziel-Bundeslands (KMK-Kalender, alle 16 Länder; **läuft die Tabelle aus, sagt sie „ich weiß es nicht" statt „keine Ferien"**), Di–Do, Tagespensum aus der Datenbank statt Laufpensum, Pflichtangaben je Text, Erlaubnisliste statt Sperrliste beim Anbieter, Absender = angemeldetes Konto, **kein Versand ohne veröffentlichten DKIM-Schlüssel** (SPF bricht bei jeder Weiterleitung, DKIM nicht — und diese Empfänger leiten weiter). Schlägt das Statusschreiben fehl, hält der Lauf an: Die Mail ist draußen, und ein zweiter Lauf schickte sie erneut.

**„Bereit" sagt nur der Vorflug — BLOCKER (06.10.2026).** `npm run kommunen:versand -- --pruefen --schub=… --charge=…` läuft jede Bremse des Versands ohne zu senden (Versandtag/Ferien, DKIM, Kontaktprüfung, Pflichtangaben, leere Platzhalter wie „undefined", jeder Link) und endet mit BEREIT / NICHT BEREIT. Anlass: Der Betreiber fragte zehnmal „ist alles bereit?", geprüft waren nur Links und Texte; der Versand stoppte dann am von All-Inkl rotierten DKIM-Selektor, nachdem 31 Briefe mit „undefined" aufgefallen waren. Ablauf samt Fallen: `docs/versand/ablauf.md`.

**Ein Brief bleibt prüfbar, NACHDEM er draußen ist (01.09.2026).** Die Vorabprüfung hält jeden Brief gegen die Seite, die er verlinkt — sie zog ihre Briefe aber aus dem Versandpaket, und das überspringt jede schon angeschriebene Gemeinde. Ein Brief war damit exakt bis zu dem Moment prüfbar, in dem er hinausging. Das ist keine Formalie: Unsere Seitenzahlen werden mit jedem Datenlauf neu gerechnet, der Brief steht fest — eine Aussage, die beim Versand stimmte, kann später von unserer EIGENEN verlinkten Seite widerlegt werden, und der Empfänger klickt womöglich Wochen später darauf. Ändern lässt sich das dann nicht mehr; man kann nur davon wissen, sich melden und die Regel nachziehen. `--verschickt` prüft deshalb den **gespeicherten** Text (nicht einen heute neu gebauten, der gegen die heutige Seite natürlich passt) gegen die heutigen Adressen. **Die Route liefert bewusst keine Empfängeradresse** — ohne sie kann aus ihr kein zweiter Versandweg werden, auch nicht versehentlich. Erster Lauf: 107 von 127 geprüft, kein Mangel; die restlichen 20 sind der erste Schub vom 20.08., für den der Text noch nicht gespeichert wurde (seit 24.08. schon). **„Nicht mehr nachprüfbar" wird je Gemeinde genannt, nie stillschweigend übersprungen** — sonst wäre die Lücke ein zweites Mal gebaut.

**Ein Brief, der nie ankam, ist kein angeschriebener Ort — BLOCKER (10.09.2026).** Die Empfängerauswahl hängt am KONTAKTDATUM, nicht am Zustand, und das trägt jeder Ort, der einmal im Versandlauf war. Der Rücklauf-Lauf ersetzt nach einer Unzustellbarkeit die Adresse und übergibt den Ort auf `bounce-behoben` zurück — der Versand konnte ihn nicht wieder aufnehmen. Die Fehlerklasse ist die teure: Der Zustand sähe richtig aus, die Übergabe liefe ins Leere, und der Lauf meldete grün. Die Entscheidung steht deshalb als reine Funktion daneben (`lib/outreach-wiedervorlage.ts` → `darfInDenVersand`), nicht als Bedingung in der Route: Eingebaut wäre sie nur über die Reihenfolge der Zeilen im Quelltext prüfbar, also gar nicht.
- **Das Kontaktdatum wird NICHT zurückgesetzt** — die naheliegende Reparatur und die falsche: Daran hängt die Tagesmengen-Zählung des Versands, und der Zeitpunkt des ersten, gescheiterten Versuchs wäre für immer weg.
- **Ein volles Postfach bleibt liegen.** Dort stimmt die Adresse, es gibt nichts zu ersetzen, und in ein paar Tagen ist es wieder leer (Selzen). Nur die dauerhafte Unzustellbarkeit rechtfertigt eine neue Adresse.
- **GEZÄHLT WERDEN FEHLVERSUCHE, NICHT ADRESSEN** (`dauerhafteBouncer`). Die Obergrenze soll den Kreislauf „neue Adresse → prellt wieder → neue Adresse" beenden. Die erste Fassung zählte dafür die toten Adressen in der Notiz — und sperrte Lassan nach seinem EINZIGEN Fehlversuch: Dessen Zustellmeldung nennt zwei Adressen, weil unser Empfänger auf ein gelöschtes Personenpostfach in Wolgast weiterleitete und der Server beide meldet. Dieselbe Verdopplung entsteht bei jeder Alias-Erweiterung (Selzen: `info@` und `webmaster@` aus einer Meldung). **Gefunden nur, weil die Ausnahme gegen die vier echten Fälle lief statt gegen ausgedachte Notizen** — die trugen je eine Adresse und waren grün. Eine Handkorrektur zählt nicht mit; sie ist die Reparatur eines Fehlversuchs, nicht ein zweiter.

**Empfänger werden beim Versand noch einmal geprüft** (`postfachBefund`). Die Erkennung beim Einsammeln erlaubte hinter dem Rollenwort einen beliebigen Zusatz — `buergermeister-klein@` galt als Funktionspostfach und ist der Nachname einer Person. Und eine Domain, die schlicht einen anderen Ortsnamen trägt (`stadtbuergermeister@bad-sobernheim.de` für Daubach), ist ein gültiges Amtspostfach der falschen Kommune. Beides wird abgewiesen und **gemeldet**, statt den Datenbestand rückwirkend umzuschreiben.

**Der Rücklauf wird TÄGLICH abgeholt und gemeldet — BLOCKER (09.09.2026).** Den Abruf gab es seit Wochen, aber nur als Befehl, den jemand von Hand startet; also startete ihn niemand. Trier antwortete am 09.09. auf ein Anschreiben, die Antwort lag Tage später unentdeckt im Postfach, und vierzehn automatische Antworten von Gemeinden waren nirgends verzeichnet — während die Auswertung „keine Reaktion" meldete. **Ein Rücklauf, dessen Abholung an einer Erinnerung hängt, ist keine Auswertung.** Jetzt: `kommunen-ruecklauf.yml`, täglich, mit `--tage=14 --schreiben --melden`; der Lauf steht in `GEPLANTE_LAEUFE`, damit sein Ausfall nicht wieder wie ein ruhiges Postfach aussieht.
- **Er darf ohne Menschen schreiben, obwohl der Versand es ausdrücklich nicht darf.** Er liest ein Postfach und trägt nach, was dort steht; nach außen geht nichts. Die zwei gefährlichen Fälle waren vorher abgesichert — „gesperrt" ist eine Einbahnstraße, und jede Notiz wird nur einmal eingetragen.
- **Was eine Entscheidung ist, steht als reine Funktion in `lib/outreach-ruecklauf-bericht.ts`.** Antwort und Widerspruch gehen als Entscheidung an den Betreiber, Unzustellbarkeiten und maschinelle Meldungen stumm in die Ablage. **Die zweite Richtung ist die wichtigere:** Vierzehn Urlaubsnotizen an einem Tag sind der Normalfall — als Mail wären sie der Lärm, nach dem niemand mehr hinsieht. Gemeldet wird nur, was der Lauf WIRKLICH neu nachgetragen hat; sonst stünde dieselbe Antwort jeden Morgen erneut da.
- **`--melden` ist eine ausdrückliche Option**, kein Automatismus am Vorhandensein eines Geheimnisses: Ein Probelauf von Hand soll keine Mail auslösen, und eine Bremse, die sich beim Fehlen einer Variablen stillschweigend abschaltet, merkt niemand.
- **Eine Antwort auf eine SACHFRAGE ist keine Antwort auf den Brief — BLOCKER (10.09.2026).** Dasselbe Postfach trägt zwei Gespräche, und beide gehen an dieselben Amtsadressen: Gemessen tragen **64 der 289 angeschriebenen Gemeinden ein Förderprogramm** im Katalog, im offenen Versandtopf 19 von 175 — der Absender allein unterscheidet dort nichts. Ohne Weiche verbucht der Lauf die Antwort einer Förderstelle als Reaktion auf unser Anschreiben, setzt den Status, schreibt den Zeitstempel und meldet eine Entscheidung, die es nicht gibt; verdorben wäre ausgerechnet die einzige Kennzahl, an der der Erfolg des Briefes hängt. Erkannt wird sie am Betreff der Anfrage (`istAntwortAufSachfrage`, Marke aus `INQUIRY_BETREFF_ANFANG` — **importiert, nie getippt**, sonst fällt die Weiche beim ersten Umformulieren stumm aus). **Aussortiert, aber gezählt und benannt:** Eine stumme Ausblendung wäre von einem leeren Postfach nicht zu unterscheiden. **Kein Präfix in eckigen Klammern als Merkmal** — das ist die Maschinen-Signatur, gegen die die Anfrage-Mail ausdrücklich gebaut ist. Beim Bauen gemessen und deshalb im Code: Ein zitierter Betreff, den das Mailprogramm umbricht, trägt mitten in sich ein „> " und blieb sonst unerkannt.
- **Die Ausblendliste wurde am echten Postfach GEMESSEN erweitert** (Awin, ADCELL, GoAffPro — neun Fehltreffer in 30 Tagen). Hersteller und Behörden bleiben draußen: Von dort kann etwas Inhaltliches kommen, und eine Ausblendung, die einmal zu weit ging, merkt niemand mehr.
**Ob eine Ansprache gewirkt hat, wird GETAKTET NACH DEM VERSAND gemessen — für jeden Bestand (`npm run wirkung`, `lib/outreach-wirkung.ts`, Tabelle `outreach_wirkung`, nächtlich im Förder-Wächter).** Je Versandtag entsteht an **Tag 3, 7, 14 und 28** eine Zeile mit Angeschriebenen, Antworten, Verweisen auf uns und (nur bei Kommunen) Abo-Anmeldungen.
- **Der Kalender ist der falsche Takt.** Ein Monatslauf misst bei einem Schub vom 2. etwas anderes als bei einem vom 28. — und beantwortet die eigentliche Frage nicht, nämlich wie lange eine Reaktion auf sich warten lässt.
- **Eine gemessene Zahl wird NIE überschrieben:** Der Wert an Tag 7 ist eine Aussage über Tag 7, nicht über heute. Ein ausgefallener Lauf holt den Punkt nach, und ein nachgeholter sagt das im Bericht („nachgemessen am …") — sonst verkauft eine Nachmessung sich als Verlaufskurve.
- **Ohne Verweis-Abruf wird gar nichts geschrieben.** Eine Zeile „0 verlinken uns" wäre keine vorsichtige Schätzung, sondern eine erfundene Null, die niemand je wieder anfasst; der Messpunkt bleibt offen und kommt morgen wieder. Ist nichts fällig, wird nichts abgerufen und nichts bezahlt (sonst ein Abruf, ~0,03 $).
- **Der Anlass ist ein Zählfehler:** Nidda verlinkt uns mit einer eigenen Seite zum Balkonsolar-Programm und galt trotzdem nur als „geantwortet", weil Verweis-Prüfung und Stand zwei getrennte Dinge waren. Was die Messung NICHT sieht, steht an jeder Auswertung: Veröffentlichungen ohne Verweis (Print, App-Plattformen, soziale Netze).

- **Die Übersicht führt seitdem zusammen, was vorher in drei Quellen lag** (`kommunen:stand`): Briefe, Antworten, Veröffentlichungen und bestätigte Abos auf einem Bildschirm, dazu der Satz, was sie NICHT sehen kann. Wer nur die Besucherstatistik las, meldete „drei Veröffentlichungen, sonst nichts", während 22 Rückmeldungen im Postfach lagen — **eine Auswertung aus einer Quelle ist keine Auswertung, sondern ein Ausschnitt.** Sie fragt die Abo-Tabelle direkt und steht dafür in der Ausnahmeliste des Zweckbindungs-Wächters; die Ausnahme trägt seit demselben Tag eine **Gegenprobe**, die anschlägt, sobald eine dieser Stellen eine Adresse mitliest — ein Begründungstext altert lautlos, eine Prüfung nicht.

**„Mach eine Outreach-Auswertung" heißt `npm run kommunen:auswertung` — nie die Übersicht allein — BLOCKER (26.09.2026).** Die Übersicht LIEST nur, was andere Läufe irgendwann abgelegt haben. Aus ihr allein kam an einem Samstagabend eine Auswertung, der vier Veröffentlichungen fehlten (Trier per Pressemitteilung, Meinersen auf Facebook, ein zweiter Berkenthin-Artikel, die Lübecker Nachrichten auf der Kreisseite) und die „heute darf gesendet werden" meldete. Alles war mit vorhandenen Werkzeugen auffindbar; sie liefen nur nicht. Der Befehl fragt jede Quelle jetzt, meldet je Quelle, ob sie durchkam („nichts gefunden" gilt nur dort), und die Besucherherkunft schaut auf die GANZE Website: Eine Veröffentlichung verlinkt, wohin ihr Autor will — die Zeitung auf die Kreisseite, die Stadt auf die Startseite (`lib/outreach-website-verweise.ts`). Ein Treffer ist ein Hinweis; eingetragen wird erst nach dem Lesen der Seite. Die Versandampel der Übersicht fragt seitdem dieselbe Wochentagsregel wie der Versand (`lib/kommunen-versandtag.ts`); vorher stand sie nur im Versand. Hinweis-Läufe: Besucherherkunft täglich. **Die bezahlte Websuche je Gemeinde ist seit 28.09.2026 raus** (Betreiber: der Suchdienst ist für Backlink-Bewertung gedacht, nicht für einen Dauerlauf; sein leeres Guthaben hatte den Lauf still scheitern lassen). Quelle ist die Besucherherkunft (Betreiber: „wenn niemand geklickt hat, ist der Beitrag ohnehin nahezu irrelevant“); den Beitrag zu einer verweisenden Domain findet eine Google-Suche im Browser: auf die Domain eingeschränkt, mit unserer Adresse und ihren Schreibweisen, hinter einer Bezahlschranke ersatzweise mit Ort und Messgröße. Claudes eigenes Suchwerkzeug ignoriert den site:-Filter. Besucher von einem Medium oder sozialen Netz gelten als Beleg einer Veröffentlichung, auch hinter Bezahlschranke. **Seit 07.10.2026 fragt der Lauf eine dritte Quelle, und erst damit ist er vollständig** (`npm run outreach:fundstellen`, Regeln `lib/outreach-fundstellen.ts`): jede verlinkende Seite aus dem Backlink-Index einzeln und die Websites aller angeschriebenen Gemeinden und Redaktionen, gelesen nach einer Erwähnung auch ohne Link. Ohne sie fehlten an einem Tag sechs Veröffentlichungen (Niedere Börde, Kreis Kaiserslautern, Radioartikel zu Moers und Mönchengladbach, Blieskastel, ein zweiter Kaiserslauterer Artikel) — drei davon kannte der Index längst und gab sie nur als Domainnamen aus. Der Lauf endet mit einem **Urteil**: „VOLLSTÄNDIG" nur, wenn jede Quelle durchkam und keine Fundstelle offen ist; offen ist ein Fund, bis seine Adresse eingetragen oder in einer Notiz verworfen ist. **Ohne dieses Urteil wird kein Recap als vollständig gemeldet.** Orte ohne Brief, die eine Pressemitteilung nannte, stehen in `aussendung_veroeffentlichung` und zählen nicht in die Quote der Gemeindebriefe.

**Je Aussendung eine Zeile, in festen Fenstern (07.10.2026).** `npm run outreach:kennzahlen` (Regeln `lib/aussand-kennzahlen.ts`, Laden `lib/aussand-kennzahlen-server.ts`) steht zuerst in der Übersicht von `kommunen:auswertung` und als erste Tabelle unter `/admin/kommunen/versand`: zugestellte Mails, Ortsseite aufgerufen und Links auf uns (davon soziale Netze), je 2, 7 und 28 Tage nach dem Versandtag sowie „bisher". Ein Fenster, das noch nicht vorbei ist, heißt „noch offen", nie eine kleinere Zahl. Alles ist datiert, also rückwirkend gerechnet, ohne Schnappschuss. **Ein Link gehört der FRÜHESTEN Aussendung, die seinen Ort vor dem ersten Sehen erreicht hat** — Brief an genau diese Region oder Pressemail, deren Bezug den Ort deckt (Kreis ⊃ Gemeinde, beide Richtungen); am selben Tag gewinnt der Brief. **Ausnahme: Hat das veröffentlichende Medium selbst die Pressemail zu diesem Ort bekommen, gehört der Artikel zu dieser Pressemail**, auch wenn der Ort vorher einen Brief bekam (homburg1.de über Blieskastel, nachrichten-kl.de über Kaiserslautern). Seitenaufrufe nur in zwei Fenstern (2 Tage, bisher): Vercel erlaubt 400 Abfragen je Stunde, vier Fenster haben sie in einem Lauf verbraucht. gude.news über Nidda gehört deshalb zum Brief vom August, nicht zur Pressemitteilung vom 29.09.; radiokw.de über Moers (kein Brief) zur Pressemitteilung. Die Presse hat keinen Seitenwert je Mail, weil sie dieselben Ortsseiten verlinkt. Die Atlas-Adressen baut `lib/outreach-adressen.ts`, gelesen von dieser Tabelle und von `kommunen:klicks`.

**Die Lücken in angeschriebenen Kreisen werden GEMESSEN, nicht geführt (05.10.2026).** `npm run kommunen:luecken` (`lib/kommunen-luecken.ts`) gibt für jede Gemeinde ohne Brief in einem Kreis, in dem schon ein Brief hinausging, genau einen Grund: kein Ziel, gesperrt, keine verwendbare Adresse, kein Platz-1-Aufhänger, Windgemeinde, eingeplant, nachzuholen, Ferien (auch Ferienbeginn binnen zehn Tagen), versandbereit; `--liste=` schreibt sie einzeln, `--tag=` prüft einen anderen Versandtag. Dazu je Land, ob die Kreisverwaltung selbst schon angeschrieben ist. **Eine Adresse in der Kontaktliste ist noch keine verwendbare:** Beim ersten Lauf lehnte die Versandprüfung 2.130 von ihnen ab, weil das Postfach einer Amts- oder Verbandsgemeindeverwaltung gehörte, ohne dass dies belegt war. Für 1.258 war die eigene Website der Gemeinde der Beleg (sie liegt auf derselben Domain), dort steht seitdem `verwaltung_domain`; der Rest bleibt als „keine verwendbare Adresse" in der Liste.

**Kontakte erfassen ist EIN Ablauf für alle Bestände (20.09.2026).** `lib/kontakt-suche.ts` entscheidet Zuständigkeit, Rolle und Alt/Neu-Vergleich, `scripts/lib/kontakt-lauf.ts` führt bewerten, begrenzte Nachrecherche, Nachprüfung der Belegseite und Fortschritt. Was je Bestand verschieden ist, sind drei Angaben: welche Rollen gesucht werden, welche Domains als eigen gelten, welche Einträge es gibt (Muster: `KOMMUNEN_ROLLENWERK`, Anleitung `docs/erhebung/kontakte-neuer-bestand.md`). **Wer für Fachbetriebe, Versorger oder einen Presseverteiler eine zweite Erfassung baut, baut den Fehler, den dieses Projekt bei den Fachbetrieben schon einmal bezahlt hat.** Belegt ist die Gleichwertigkeit gemessen: Nach dem Herausziehen lieferten alle 10.747 Gemeinden zeichengleich dasselbe Ergebnis wie vorher. **Vor jedem Lauf und jedem neuen Bestand: Fehlerkatalog `docs/lehren/kontakt-engine-fehler.md` (jede bisherige Fehlerklasse mit ihrer maschinellen Sicherung) und der Schritt-für-Schritt-Ablauf in der Anleitung oben; jeder Lauf beginnt mit dem Vorflug (BEREIT / NICHT BEREIT).** Bezahlte Websuche ist in allen Erhebungsskripten gesperrt und braucht eine ausdrückliche Freigabe im Befehl (`scripts/lib/bezahlte-suche.ts`).

**Eine Adresse geht erst hinaus, wenn sie drei Prüfungen besteht — für jeden Bestand (22.09.2026).** Ein Beleg sagt, wo eine Adresse steht, nicht wofür sie taugt: Die Erfassung fand auf genau den Seiten, die sie liest, Datenschutz-Postfächer, Vorlagen-Platzhalter („vorname.nachname@", „email@example.com") und die Adressen von Schlichtungsstelle und Webagentur im selben Impressum.
- **Taugt das Postfach?** `lib/kontakt-tauglichkeit.ts` ist die EINE Liste ungeeigneter Postfächer und Platzhalter; die Versandprüfung der Gemeinden liest sie mit, die Auswahl der Fachkontakte überspringt ungeeignete und nimmt die nächste belegte Adresse. **webmaster@ steht bewusst nicht darin** — bei kleinen Gemeinden das einzige Postfach und oft die Person, die ein Widget einbauen kann.
- **Nimmt die Domain Mails an?** Ohne Mailserver ist es eine falsch gelesene Adresse (angeklebter Text, Tippfehler im Impressum).
- **Steht sie heute noch auf der Fundstelle?** Frisch abgerufen, bei Seiten, die erst im Browser entstehen, mit einem echten Browser. Gemeinden: Nachprüfung im Versandlauf (höchstens drei Tage alt). Fachbetriebe, Versorger und Presse: `npm run kontakte:freigabe -- --bestand=…` (eine Prüfung für alle, `scripts/lib/kontakt-freigabe.ts`) schreibt Freigabedatum oder Sperrgrund an jeden Kontakt; **ein künftiger Versand an diese Bestände nimmt nur Adressen mit frischer Freigabe.**
- **Seiten, die ein einfacher Abruf nicht lesen kann, liest ein zweiter Durchgang mit echtem Browser** (`scripts/lib/kontakt-browser.ts`), ohne Tarnung. Gemessen an den Fachbetrieben: 159 von 308 Betrieben ohne Adresse hatten danach eine belegte.

**Empfänger kommen aus der Kontaktsuche der zweiten Generation (19.09.2026).** `scripts/contact-municipal-v2.ts` belegt je Gemeinde Klimaschutz- und Pressekontakte an der veröffentlichten Seite und trägt alle belegten in eigene Spalten der Kontaktliste ein (`--mode=apply --schreiben`); die allgemeinen Postfächer bleiben unberührt. **Klimaschutz ist der bevorzugte Kontakt** (Betreiber), dann Presse, dann Pressepostfach, dann allgemeines Postfach; eine belegte Person darf dabei einen Personennamen tragen (`lib/kommunen-fachkontakt.ts`, `postfachBefund` mit `belegteRolle`).
- **Die erste Generation ist als Sperre ausgebaut.** Sie verlangte vor jedem Versand, dass bundesweit keine Gemeinde mehr ungeklärt ist — 10.741 von 10.747 waren es, der Versand war damit dauerhaft gesperrt. Jetzt prüft der Versandlauf jeden Empfänger einzeln (`lib/contact-v2-gate.ts`): Ergebnis unter den aktuellen Regeln, Adresse in der geprüften Auswahl, und die Seite, auf der sie steht, unmittelbar vor dem Versand noch einmal abgerufen.
- **Das LESEN der Rückmeldungen macht der Wächter, nicht ein Mensch** (`scripts/kommunen-rueckmeldungen-verify.md`, Schritt 4i des zweistündlichen Förder-Wächters). Abholen und Nachtragen liefen längst automatisch; angesehen werden mussten die Reste trotzdem von Hand, und genau deshalb blieben sie liegen — Berkenthins Antwort neun Tage, zwei Veröffentlichungs-Hinweise drei Wochen. Jede nicht zuzuordnende Mail und jeder offene Hinweis wird im Lauf selbst geöffnet und entweder eingetragen oder mit Grund in der Notiz verworfen. **Über Antworten wird dabei NICHT gemeldet** (Betreiber, 23.09.2026): Sie liegen in seinem Postfach, weil der Brief genau dorthin zurückverweist — eine Mail „X hat geantwortet" wäre die zweite Nachricht über denselben Vorgang. Hinaus geht nur, was eine Folge hat, die er dort nicht sieht: ein erkannter Widerspruch, der die Gemeinde dauerhaft sperrt.
- **Jeder Versand speichert Adresse UND Art des Empfängers** (Klimaschutz, Pressekontakt, Pressepostfach, allgemeines Postfach). Die ersten 289 Briefe gingen ohne jeden Vermerk hinaus; ob Fachkontakte besser antworten als info@, ließ sich deshalb nur nachträglich aus heutigen Adressen erschließen. Die Art steht neben der Adresse, weil sich Adressen einer Gemeinde nach Rückläufern und neuen Suchen ändern.
- **Eine Regeländerung macht alle Ergebnisse ungültig**, bis sie neu ausgewertet sind (`--mode=evaluate`, offline) — der Versand hält sonst jeden Brief an.

**Die Rückläufer-Erkennung liest nur den selbst geschriebenen Teil** (`ohneZitat`). Unser eigener Brief endet mit „Ihr Widerspruchsrecht"; Outlook zitiert ihn in jede Antwort. Eine Wortsuche über den ganzen Text hätte **jede freundliche Antwort** als Widerspruch eingestuft und die Gemeinde dauerhaft gesperrt — bei allen 100 Briefen. Wer den Zweig für maschinelle Zustellmeldungen betreten hat, kommt nie als „Widerspruch" heraus, sondern im Zweifel als `unklar-maschinell` in die Liste „bitte selbst ansehen".

## Gemeinde-Abo: „Bescheid bekommen, wenn sich hier etwas tut"

Auf jeder Gemeindeseite im Solar-Atlas UND auf jeder Förder-Stadtseite steht rechts neben
der Überschrift ein Knopf „<Ort> abonnieren", daneben in derselben Zeile der Erklärtext;
das Formular liegt im Fenster dahinter (`components/atlas/GemeindeAboBox.tsx`). Wer sich
einträgt, bekommt eine Nachricht, wenn sich im Ort etwas Nennenswertes bewegt.

**Der Ortsname steht im Knopf, obwohl die Überschrift daneben ihn schon trägt.** Der
doppelte Name ist der kleinere Preis: In der klebenden Leiste am Seitenende ist die
Überschrift weggescrollt, und dort steht der Knopf neben „Für dein Haus durchrechnen" —
ein nacktes „Abonnieren" ließe offen, was man abonniert.

**Die Herkunft wird mitgeschrieben** (`quelle`, `ueber_brief`): auf welcher Seitengattung
angemeldet wurde und ob der Aufruf über ein Kommunen-Anschreiben kam. Beide Gattungen
tragen denselben Ortsnamen und sprechen verschiedene Leute an — ohne die Unterscheidung
ließe sich nach dem ersten Schub nicht sagen, welcher Einstieg trägt. Die Brief-Kennung ist
in JEDEM Brief dieselbe; sie sagt „über ein Anschreiben", nicht welche Gemeinde. Beides
steht in der Datenschutzerklärung (Abschnitt 16) und ist per Test daran gebunden.

**Der Ortsschlüssel ist FÜNF- oder achtstellig — BLOCKER.** Die Förderseiten tragen für
kreisfreie Städte fünf Stellen, für kreisangehörige Gemeinden acht. Die erste Fassung der
Anmelde-Adresse verlangte genau acht; auf jeder kreisfreien Stadt wäre die Anmeldung stumm
gescheitert — die Seite funktioniert, nur der Knopf nicht. Die tragende Prüfung ist nicht
die Länge der Zahl, sondern ob es den Ort im Melderegister gibt.

**Das Formular steht NICHT auf der Seite** (Betreiber, 31.08.2026): Ein Eingabefeld mit
Beschriftung, Knopf und Zusage-Zeile ist im Kopfbereich ein zweites Anliegen mitten im
ersten und schiebt die Zahlen nach unten. Der Erklärtext steht **neben** dem Knopf, nicht
darin — eine Beschriftung wie „Förderprogramm, Leistung u. v. m. abonnieren" macht ihn so
breit, dass er die Überschrift erdrückt, und ein Knopf sagt ohnehin, was passiert, nicht
warum man ihn drückt. Die Feinheiten (was kommt, woran wir es merken, wie man wieder herauskommt)
hängen am „?".

**Die klebende Aktionsleiste am Seitenende öffnet dasselbe Fenster** — über ein
Fenster-Ereignis (`ABO_OEFFNEN`), nicht über einen hochgezogenen Zustand: Den nach oben zu
ziehen machte die halbe Gemeindeseite zur Client-Komponente. Denselben Weg geht der
Förder-Check auf den Stadtseiten (`sekundaer.ereignis`).

**Beide Wege sind im Browser festgenagelt** (`e2e/gemeinde-abo.spec.ts`), samt Layout:
bündig zur Überschrift, Text auf der Mitte des Knopfes, auf 375 px gestapelt mit
vollbreitem Knopf und ohne seitlichen Überlauf. Der Grund ist gemessen — im Prüf-Browser
meldete die Seite „hydratisiert", und trotzdem öffnete keiner der beiden Knöpfe das
Fenster; ohne diesen Test wäre das eine Zusage geblieben, die man erst bemerkt, wenn sich
niemand anmeldet.
Angelegt 31.08.2026, **vor dem nächsten Outreach-Schub** — der Brief soll das Abo als
zweite, niedrigere Bitte anbieten können.

**Warum das der stärkere Hebel ist als ein weiterer Kaltbrief:** Ein Abo hebt die
rechtliche Fessel des Outreach auf. Wer sich anmeldet, hat eingewilligt — kein
Ferienkalender, keine Tagesgrenze, kein Nachfass-Verbot. Aus einem Einmalkontakt wird
ein Kanal. Für eine Verwaltung ist es außerdem die niedrigste Hürde, die wir anbieten:
Das Widget braucht Redaktionssystem, IT und Datenschutzbeauftragten, die fertige Meldung
braucht die Entscheidung, dass es ein Thema ist — ein Abo braucht einen Klick.

**Der Inhalt wird GERECHNET, nicht getippt** (`lib/gemeinde-meldungen.ts`). Eine reine
Funktion über die Zahlen, die die Gemeindeseite ohnehin lädt; sie speist Seite, Abo-Mail
und später den Brief. Dieselbe Systematik wie bei den Social-Posts und aus demselben
Anlass wie `lib/gemeinde-vergleich.ts`: Zwei getrennt formulierte Oberflächen
widersprechen sich irgendwann, und beim Kommunen-Anschreiben ist genau das passiert.
Jede Meldung prüft ihre eigenen Schranken und **meldet sich ab, wenn sie nicht trägt** —
leer ist ein zulässiges Ergebnis. Mindestmengen (5 Anlagen, beim Vergütungs-Auslauf 20),
Nenner sichtbar, Lob mit Namen und Kritik ohne, Singular/Plural gebaut statt getippt.
Festgenagelt von `lib/__tests__/gemeinde-meldungen.test.ts`.

**Der Monat des Netzanschlusses fehlt — und er steht in der Quelldatei.** `parseYear` in
`scripts/mastr-refresh.ts` schneidet das Inbetriebnahmedatum auf vier Stellen, der
Aggregat-Schlüssel trägt nur das Jahr. Eine Monatsaussage wäre deshalb nicht gerechnet,
sondern erfunden; die kleinste ehrliche Einheit ist das Jahr. Nachrüstbar über eine
Stelle im Import plus eine schmale Monatstabelle für die letzten zwei Jahre — **nicht**
eine Monatsachse über die ganze Historie, das verzwölffacht 562.000 Zeilen.
**Ungeprüft und vor der ersten Monatsmeldung zu messen:** Anlagen werden verspätet
gemeldet, ein Monatswert wächst also nach dem Versand vermutlich noch. Denselben Monat
über zwei Datenstände vergleichen, bevor eine Zahl rausgeht.

**Drei Regeln kippen gegenüber dem Kommunen-Anschreiben — wer sie kopiert, baut jeweils
den falschen Fall** (`lib/abo-mail.ts`, `lib/abo-versand.ts`):
- **`List-Unsubscribe` gehört HIER hinein.** Im Anschreiben ist die Kopfzeile nach einer
  Messung absichtlich leer (Apple Mail setzt ein „Mailing-Liste"-Banner über den Brief,
  und der lebt davon, dass ein Mensch einem anderen schreibt). Bei einer Abo-Mail IST es
  eine Liste — das Banner sagt die Wahrheit, und der Ein-Klick nach RFC 8058 ist genau
  das, was der Anmeldeknopf zusagt. Die Adresse muss deshalb **auf POST ohne Rückfrage**
  antworten; wer dort eine Bestätigungsseite vorschaltet, meldet niemanden ab und gilt
  bei großen Anbietern als nicht abbestellbar.
- **Herkunftszeile ist Art. 13, nicht Art. 14.** Dort stammen die Adressen von
  Amtsseiten, hier trägt sie der Empfänger selbst ein.
- **Ferien und Tagespensum entfallen.** Das sind Bremsen gegen Kaltakquise;
  einem Abonnenten seine Meldung vorzuenthalten, weil in seinem Bundesland Ferien sind,
  wäre keine Rücksicht. Was bleibt: Prüfung des Versandwegs und die Pflichtangaben.
- **Ein VERSANDFENSTER gibt es trotzdem — aber erst ab Menge** (`lib/versandzeit.ts`,
  **Di–Do 17–20 Uhr und Sa 13–16 Uhr deutscher Zeit**, ab 20 Meldungen je Lauf).
  - **Der Abend ist die Zielgruppen-Entscheidung, nicht der Durchschnitt.** Empfänger
    sind Privatleute zu Hause; wer über seine eigene Dachfläche nachdenkt, tut das nach
    Feierabend. Die verbreitete Empfehlung „Di–Do vormittags" gilt GESCHÄFTS-Empfängern
    — sie stand hier zuerst und war schlicht die falsche Zielgruppe, von außen
    unsichtbar. Für Privatempfänger zeigen Brevo, Mailjet, ActiveCampaign, GetResponse
    und rapidmail übereinstimmend den Abend; MailerLites Auswertung von 2,1 Mio
    Kampagnen sieht die höchsten **Klick**raten bei Privat-Zielgruppen zwischen 18 und
    21 Uhr (alle 03.09.2026 gelesen). Dazu: rund 80 % aller Öffnungen fallen in die
    ersten vier Stunden nach Zustellung — Versand und Lesen liegen damit im selben Abend.
  - **Öffnungsraten taugen seit 09/2021 nicht mehr für eine Zeitaussage — BLOCKER.**
    Apples Mail-Datenschutz lädt die Bilder beim EINGANG, nicht beim Lesen, und Apple
    Mail steht für rund 58 % aller gemeldeten Öffnungen. Eine Auswertung „welche
    Versandstunde hat die beste Öffnungsrate" misst damit zu gutem Teil die
    Versandstunde selbst. Daher stammt das sonst unerklärliche Ergebnis des
    **Inxmail-Benchmarks 2026** (4 Mrd. Mails), die beste Versandzeit liege zwischen
    **3 und 6 Uhr morgens** — eine große, seriös wirkende Zahl, die hier ausdrücklich
    NICHT benutzt wird; ein Test verbietet das Nachtfenster. MailerLite empfiehlt aus
    demselben Grund, nur noch über Klickraten zu testen.
  - **Keine dieser Auswertungen ist ein Experiment.** Sie vergleichen Kampagnen, die zu
    verschiedenen Zeiten rausgingen, also verschiedene Absender an verschiedene Listen;
    keine nennt Signifikanz oder Streuung, die Unterschiede liegen bei wenigen
    Prozentpunkten. Übernommen wird die RICHTUNG, nicht die Genauigkeit — und sobald es
    genug Abonnenten gibt, wird über **Klicks** nachgemessen statt über Öffnungen.
  - **DER SAMSTAG ZÄHLT MIT, und er fehlte zuerst — Recherchelücke, kein Urteil.** Die
    erste Suche lieferte wörtlich „B2C-Newsletter erreichen früh morgens, abends und **am
    Wochenende** die besten Werte"; der Satz stand im Ergebnis und wurde nicht ausgewertet,
    das Fenster ging ohne ihn live. Der Betreiber hat es bemerkt (05.09.2026), die
    Nachrecherche hat ihm recht gegeben. **Die Lehre ist nicht „mehr suchen", sondern: eine
    Suchantwort, die eine dritte Möglichkeit nennt, wird beantwortet oder ausdrücklich
    verworfen — nicht überlesen.**
  - **Der Samstag trägt sich über einen MECHANISMUS, nicht über eine Öffnungsrate.** Die
    höchste weist der Inxmail-Benchmark 2026 im B2C dem Montag zu (26,9 %). Für den Samstag
    spricht, dass deutlich weniger Absender am Wochenende verschicken: leereres Postfach,
    und wer samstags liest, hat Zeit. Uhrzeit ist der **frühe Nachmittag** (13–16 Uhr) —
    die einzige, die die Quellen für den Wochenendversand nennen; samstags abends ist
    niemand am Postfach, das Werktagsfenster taugt dort nicht. **Der Sonntag bleibt
    draußen** (21,8 %), der einzige Tag mit einem deutlich schlechteren belegten Wert.
  - **Deshalb die Schwelle:** Bei siebzehn Empfängern ist die Spanne kein ganzer Mensch,
    und ein Lauf, der dafür einen Abend wartet, kostet mehr, als er bringt.
  - **Der Lauf sammelt ERST alle Empfänger und schickt DANN.** Zwei Durchgänge statt
    einem, weil das Fenster die Menge kennen muss, bevor die erste Mail draußen ist:
    Ein Fenster, das mitten im Lauf zuschlägt, hätte die Hälfte verschickt und die
    andere vertagt — und wer nachsieht, findet einen Lauf, der weder gelaufen noch
    gestoppt ist. Verschoben wird als `verschoben` im Ergebnis benannt, nie stumm.
  - **Im Probelauf greift es NICHT.** Der verschickt ohnehin nichts; schwiege er
    außerhalb des Fensters, verbärge er genau das, wofür es ihn gibt.
  - **Gerechnet wird in deutscher Ortszeit**, nicht in UTC — sonst verschiebt sich das
    Fenster zweimal im Jahr um eine Stunde, und zwar unsichtbar.
  - Festgenagelt von `lib/__tests__/versandzeit.test.ts`, vor dem Einchecken viermal
    absichtlich kaputtgemacht. **Eine der vier blieb zuerst grün:** Der Test rechnete
    die Empfängerzahl aus der Schwelle selbst (`AB_EMPFAENGERN - 1`) und verglich den
    Fehler mit sich selbst — dieselbe Klasse wie beim Gemeindeschlüssel-Test.

**Versendet wird über dasselbe Postfach wie die Anschreiben**, nicht über den Dienst, der
Kontaktformular und Wächter-Alarme trägt — eine wachsende Verteilerliste dort träfe bei
der ersten Beschwerdewelle dasselbe Konto, und dann kommen die Alarm-Mails nicht mehr an.

**Das Förder-Abo fragt nach der Technik, das Bestands-Abo nicht** (`lib/abo-technik.ts`).
Auf der Förderseite sind die drei Techniken des Katalogs abwählbar, alle drei als
Ausgangszustand — wer ein Förder-Abo abschließt, will erst einmal jedes Geld sehen, das für
ihn gilt, und abwählen ist leichter als anwählen. Die REICHWEITE wird bewusst **nicht**
gefragt: Der Abonnent bekommt, was für ihn gilt (Ort, Kreis, Land, Bund) — „möchten Sie
auch vom Landesprogramm hören?" ist eine Frage mit genau einer sinnvollen Antwort, und
jeder Schritt im Anmeldefenster kostet Abbrüche. Die Konstanten liegen in einem eigenen
Modul, weil beide Seiten der Grenze sie brauchen: Läge die Liste in der Ablage, zöge das
Anmeldefenster deren Server-Sperre mit.

**Die Pflichtangaben gelten JE MAILART — BLOCKER, beim ersten echten Versand aufgefallen.**
Die Prüfung verlangte von jeder Abo-Mail einen Abmeldelink, den die Bestätigungsmail
bewusst nicht hat (es gibt noch nichts, wovon man sich abmelden könnte). Der Versand wies
sie damit ab: Es wäre **nie eine Bestätigungsmail hinausgegangen** und damit nie ein Abo
zustande gekommen. Kein Test hat es gefangen — sie prüften die Vorlagen einzeln, und die
Bestätigung wurde nur darauf geprüft, dass sie keinen Abmeldelink trägt. Die Vorlage muss
gegen die Schranke geprüft werden, an der sie im Betrieb scheitert, nicht nur für sich.

**Nirgends eine Frequenzzusage** — weder „höchstens eine Mail im Monat" noch eine Rate
(Betreiber, 31.08.2026: „wir haben bestimmt mal mehr ideen"). Eine solche Zusage ist eine
Werbeaussage nach § 5 UWG, die JEDE künftige Meldung bindet; sie später zu brechen ist
teurer, als sie nie gegeben zu haben. Gemessen wäre sie ohnehin nicht: Der Förderverlauf
zeigt auf 110 Programme 24 echte Änderungen in neun Tagen — für einen einzelnen Ort selten,
aber der Zeitraum trägt keine Zahl. Zugesagt wird der **Anlass**, und die Aufzählung ist
ausdrücklich **offen**: Ein „und sonst nichts" hinter drei Beispielen schlösse den vierten
Anlass aus, den wir noch nicht kennen. Die Schranke steht in der Zusage über dem
Absenden-Knopf und im Hilfetext („nur, wenn es etwas zu berichten gibt"), festgenagelt von
`e2e/gemeinde-abo.spec.ts` → „kein Abo verspricht eine Frequenz" — auf ein MUSTER geprüft,
nicht auf den Wortlaut: Die erste Fassung ließ „monatlich eine Mail" durch.

**Jede Gattung stellt genau eine Zusatzfrage.** Das Förder-Abo fragt nach der Technik, das
Bestands-Abo danach, ob jemand **für die Stadt- oder Gemeindeverwaltung arbeitet** — der
Grund liegt am Inhalt: Bestandszahlen sind für eine Verwaltung ein anderer Gegenstand als
für einen Hausbesitzer (sie kann sie veröffentlichen, er kann sich daran messen), die
Förderprogramme des eigenen Orts kennt sie dagegen bereits; dort wäre die Angabe eine ohne
Verwendung. Selbstauskunft, nicht prüfbar und genau deshalb harmlos: Sie steuert den TON
einer künftigen Meldung, nie einen Zugang. **Nicht vorausgewählt** — die überwiegende
Mehrheit arbeitet nicht dort, ein gesetzter Haken wäre eine untergeschobene Angabe. Die
Technik-Häkchen sind umgekehrt alle drei gesetzt: kein Verstoß gegen die Flow-Regel
(die gilt Fragen mit einer Antwort), sondern der Ausgangszustand einer Ein/Aus-Angabe.

**Der Einwilligungsnachweis ist der WORTLAUT und der VERSAND, nicht die IP** (Council mit
zwei Legal-Judges, 01.09.2026, Fundstellen im Volltext gelesen). Der IP-Verzicht ist
richtig und **keine Abweichung von irgendetwas** — er ist die Linie der Aufsicht selbst:
Die DSK sagt wörtlich, das Abspeichern einer IP genüge „auch nach der Rechtsprechung des
BGH zum UWG nicht" (Orientierungshilfe Direktwerbung 2/2022, Ziff. 3.3), und das VG
Düsseldorf hat einen Versender abgewiesen, der genau die empfohlenen zwei IPs vorlegte
(29 K 9714/24). „Beim Double-Opt-in ist die IP Pflicht" ist Ratgeber-Literatur ohne
Fundstelle. Falsch war, worauf sich der Nachweis hier stützte — das signierte Token belegt
nichts, weil es nach der Bestätigung verworfen wird. Zwei Stellen, die niemand angesehen
hatte, sind jetzt gebaut:
- **WOZU** eingewilligt wurde. Der Nachweis umfasst den Wortlaut (DSK Ziff. 3.3, EDSA
  05/2020 Rn. 108: auf eine „korrekte Konfiguration der Website" zu verweisen genügt
  ausdrücklich nicht), und der stand als Konstante im Code der Oberfläche, die sich mit dem
  nächsten Commit ändert. Jetzt trägt jedes Abo seine Fassung, die Wortlaute stehen datiert
  und **nie überschrieben** in `lib/abo-einwilligung.ts` — dieselbe Bauform wie der
  BEG-Fahrplan. Die Oberfläche tippt keinen dieser Sätze selbst, sie liest sie aus dem
  Archiv; `lib/__tests__/abo-einwilligung.test.ts` hält beides aneinander.
- **DASS** eine Bestätigungsmail hinausging. Der BGH verlangt die Erklärung speicher- und
  ausdruckbar (I ZR 164/09 Rn. 38); genau daran scheiterte der Düsseldorfer Fall (Rn. 46).
  Gespeichert wird die Kennung des Mailservers — **keine zweite Kopie der Mail**, ihr Inhalt
  lässt sich aus der Fassung wortgleich neu erzeugen (Datenminimierung, EDSA Rn. 106).

**Die Löschuhr hängt am letzten VERSAND, nicht an der Abmeldung — beides war vorher falsch.**
Der Anspruch, gegen den der Nachweis schützt, entsteht mit der einzelnen Mail (§ 31 Abs. 3
S. 1 OWiG, § 199 Abs. 1 BGB samt Ultimo-Regel); wer sich nach drei Jahren Abo abmeldet,
hätte bei einer Uhr ab Abmeldung drei Jahre zu viel gespeichert. Und die Länge: Die DSK
verlangt Nachweisfähigkeit über die Verjährung hinaus, also drei Jahre (Ziff. 3.7), und
zwar ausdrücklich „auch nach einem Widerruf und der Löschung der personenbezogenen Daten
aus der Werbe-Datenbank". Zugesagt und gerechnet wird deshalb der **31. Dezember des
dritten Jahres nach dem Jahr des letzten Versands**; `ABGEMELDET_MAX_TAGE` bleibt als
`@deprecated`-Konstante stehen, damit ein Test rot wird, wenn jemand die zwölf Monate
zurückbringt. **Der Aufräumlauf braucht drei Zweige, nicht zwei:** Wer nie bestätigt hat und
dann per Abmeldelink abmeldet, hat weder Versand- noch Bestätigungsdatum — und `NULL <
stichtag` ist in Postgres nicht falsch, sondern NULL. Der Fall fiel durch alle Zweige und
wäre für immer stehen geblieben, während die Erklärung seine Löschung zusagt.

**Ein abgemeldeter Eintrag wird nicht gelöscht, sondern vermerkt — und der Grund ist ein
anderer, als hier stand.** Falsch war „der Vermerk IST der Widerspruch, sonst käme die
Adresse ohne Bestätigung durch": Das beschreibt eine Sperrliste, und die DSK sagt
ausdrücklich, eine solche trage nur, wo die zu verhindernde Verarbeitung auf berechtigtem
Interesse beruht (Ziff. 5.1) — bei einem einwilligungsbasierten Verteiler tut sie das nicht.
Die Sorge dahinter war ohnehin ein Programmfehler: Eine erneute Anmeldung läuft IMMER durch
eine neue Bestätigung. **Richtig ist:** Die Zeile bleibt als Nachweis, auf anderer
Rechtsgrundlage (Art. 6 Abs. 1 lit. c i. V. m. Art. 5 Abs. 2, Art. 7 Abs. 1 und lit. f) und
mit eingeschränktem Zweck. Deshalb ist `empfaengerFuerOrt()` die **einzige Tür zum
Versand** — läse ein zweiter Lesepfad dieselbe Tabelle ohne Filter, wäre die
Zweckbeschränkung eine Behauptung, und Erwägungsgrund 67 verlangt, dass sie im System
sichtbar ist. `lib/__tests__/abo-zweckbindung.test.ts` verbietet den zweiten Lesepfad.

**Drei Bremsen gegen Listen-Bombing, und keine ersetzt die andere:** ein unsichtbares Feld
gegen Maschinen · fünf Versuche je Stunde und Herkunft, im Arbeitsspeicher · **höchstens
fünf offene Anmeldungen je ADRESSE** und keine zweite Bestätigung binnen zwei Minuten. Nur
die dritte trägt gegen einen verteilten Angriff, und deshalb sitzt sie in der Datenschicht:
Der Speicherzähler lebt je Instanz und ist nach einem Neustart weg. Sie zählt zudem an der
**Adresse** statt an der Herkunft — geschützt werden soll der Mensch, dessen Postfach
zugeschüttet wird, nicht ein Anschluss, und eine dauerhafte Zählung je IP müsste diese
speichern, was die Datenschutzerklärung ausschließt. **Die Antwort nach außen ist in jedem
Fall dieselbe**, ob die Adresse neu, schon angemeldet oder gerade gedeckelt ist: Eine
Maske, die „bereits angemeldet" sagt, ist ein Abfragedienst für fremde Abos.
`lib/__tests__/abo-bremsen.test.ts`.

**Der Code war geprüft, die Umgebung nie — dritte Ausprägung derselben Klasse.** Das Abo war
lokal vollständig getestet (Browser-Tests, echte Mail, echter Bestätigungsklick) und schlug
beim ersten Live-Versuch fehl, weil auf der Produktion **keine der fünf Zugangsdaten des
Postfachs** gesetzt war: kein roter Test, kein Fehler im Diff, keine kaputte Seite. Der
Spaltenabgleich fand denselben Fall zwischen Code und Tabelle, die Kostenwache zwischen
Mengen und Rechnung — ein lokaler Lauf kann diese Klasse prinzipiell nicht finden, weil
lokal alles gesetzt ist. `/api/abo/bereit` fragt deshalb die **Produktion selbst** nach
ihrer Konfiguration (Signatur, Versandweg, Basis-Adresse, Datenbank, Nachweis-Spalten), der
Gesundheitscheck ruft sie bei jedem Lauf. Zurück kommt nur, WAS fehlt, nie ein Wert — auch
keine Länge, die ist bei einem Passwort schon eine Auskunft. Der Befund geht an Claude, und
ein fehlgeschlagener Abruf ist **kein** Befund, sondern „konnte nicht nachsehen".
`lib/__tests__/abo-produktionsbereit.test.ts`.

**Der Versandlauf schickt nur, wenn es einen Anlass gibt** (`lib/abo-lauf.ts`,
`/api/abo/versenden`, `lib/__tests__/abo-lauf.test.ts`). Er geht die Orte durch, für die es
bestätigte Abos gibt, und fragt je Ort `hatNachricht()` — schärfer als „es gibt eine
Meldung": Eine reine Bestandsbeschreibung stand beim letzten Mal genauso da. Drei
Eigenschaften, jede gegen einen Fehler, den ein Versandlauf üblicherweise macht:
- **Der Versandmerker wird VOR dem Versand gesetzt**, nicht danach. Bricht der Lauf
  zwischen zwei Empfängern ab, darf der Neustart niemanden zweimal anschreiben; der Preis
  ist eine verlorene Meldung im Fehlerfall, und das ist die günstigere Richtung. Schlägt
  das Setzen fehl, wird gar nicht erst gesendet.
- **Zeit und Basis-Adresse kommen von außen.** Die Zeit, weil sich sonst nichts prüfen
  lässt; die Adresse, weil ein Abmeldelink aus einer Testumgebung sonst auf die Produktion
  zeigt und dort ein fremdes Abo abmeldet. **Kein Rückfall** auf die Produktionsadresse.
- **Ein Probelauf** (`?trocken=1`) rechnet alles durch und verschickt nichts. Ein
  Versandlauf, den noch nie jemand ohne Wirkung gesehen hat, ist einer, dessen erste
  Wirkung eine echte Mail an einen echten Menschen ist.

**„Förderprogramm nimmt wieder Anträge an" ist eine Meldung — und je Abonnent datiert (27.09.2026).** Ausgelöst wird sie aus dem Förder-Verlauf (`wiederOffenSeit` in `lib/funding-history.ts`): nur ein mitgeschriebener Wechsel von einem anderen Status auf „aktiv", nie die Aufnahme in den Katalog, und nur, wenn das Programm JETZT aktiv ist. Sie trägt ihr Feststellungsdatum und ihre Technik; `meldungenFuerAbo` (`lib/gemeinde-meldungen.ts`) schickt sie einem Abonnenten nur, wenn sie nach seiner letzten Mail bzw. Bestätigung liegt, und im Förder-Abo nur für gewählte Techniken. Der Vergleich läuft über Zeitpunkte, nicht Text — die Datenbank schreibt „+00:00", der Lauf „Z". Festgenagelt von `lib/__tests__/foerder-wieder-offen.test.ts`, beide Regeln absichtlich kaputtgemacht und rot gesehen. **Stand am selben Tag: Der Versandlauf ist nirgends eingeplant** (nur das Aufräumen läuft nächtlich), es ging noch keine Meldung hinaus; 7 bestätigte Abos, alle aus dem Atlas. **Abgenommen (27.09.2026): die Systemmails und die Wiederöffnungs-Meldung — sonst nichts.** Alle übrigen Meldungsarten (Zubau, Auslauf, Platzierung, Bestand) sind als Mail „so nicht rausschickbar" und werden erst mit Redaktion/Stories neu gebaut. Deshalb eine ERLAUBNISLISTE (`ABO_MAIL_FREIGEGEBEN` in `lib/gemeinde-meldungen.ts`), keine Sperrliste: eine neue Meldungsart darf nicht in Mails rutschen, bevor jemand sie angesehen hat. Der Versandlauf läuft seitdem nächtlich im Förder-Wächter und schickt an den meisten Tagen nichts. Auf der Ortsseite bleiben alle Meldungen stehen; die Sperre gilt nur der Mail. Vorschau aller Mails: `scripts/mail-vorschau.ts`. Zubau und Auslauf-Stichtag tragen seit demselben Tag ein Datum (1. Januar), gehen also je Abonnent einmal im Jahr hinaus statt bei jedem Lauf; der Stichtag gilt auch für den, der sich später im Jahr anmeldet, der Zubau nicht.

Tabelle `gemeinde_abos`, angelegt über `/api/abo/setup` — RLS an ohne Policy, nur über den
Dienstschlüssel erreichbar; am 31.08.2026 mit dem Anon-Key gegengeprüft („permission
denied"), Service-Key als Gegenprobe.

## Verbandsgemeinden (8 October 2026)

Bad Breisig and Weilerbach share `LandkreisSeite` and all its widgets. Official
membership from the bundled GV100AD records adds a navigation group, never a
municipality parent or a second count in the county. Existing municipality URLs
remain unchanged. `scripts/kreis-paket.ts` publishes and refreshes their packages
with the county generation; rendering reads one package, never member packages.
Subscriptions store the association key through the existing confirmation flow;
update scheduling is independent. See `docs/verbandsgemeinde-referenz.md`.

### Municipal district map and image downloads (10.10.2026)

The municipal monitor embeds the shared regional 3D map with the current municipality selected. The existing near-viewport boundary defers loading. Image downloads preserve the current theme and WebGL camera while retaining the designed title, metric, data vintage, source rail and branding; interactive controls and general help stay outside the image. Ranking exports retain their explicit formats plus the current dimensions. Regression coverage: `e2e/municipal-map-release.spec.ts` (opt in with `ATLAS_DATA_E2E=1`; requires the populated municipal database).

### District ranking composition (13 October 2026)

District pages show the shared ranking composition below the municipality directory. Desktop directories initially show three rows; mobile keeps the swipe row. District comparisons use one prepared monthly snapshot, never a rollup scan during page rendering. See `docs/kreis-ranking-daten.md` for preparation and release checks.
