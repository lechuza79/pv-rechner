# Runbook: Kommunen-Anschreiben verschicken

Stand: 19.08.2026. Gilt für den Schub `mail-he-rp-sl` und jeden späteren.
Die Regeln selbst stehen im Code (`lib/schulferien.ts`, `lib/outreach-mail.ts`,
`lib/kommunen-testballon.ts`); hier steht nur die Reihenfolge der Handgriffe.

---

## 1. Postfach einrichten (einmalig, braucht den KAS-Zugang des Betreibers)

Im All-Inkl-KAS unter **E-Mail → E-Mail-Postfächer**:

1. Postfach `sebastian@solar-check.io` anlegen. **Persönlich, nicht `hey@`**
   (Entscheidung des Betreibers, 19.08.2026): Der Brief ist mit „Sebastian
   Schäder, Betreiber solar-check.io" unterschrieben — ein Absender, der genauso
   heißt, ist stimmig. `hey@` ist das Muster von Newsletter-Absendern; im
   Rathaus liest sich eine Personenadresse als Mensch, und genau das ist die
   Erzählung des ganzen Anschreibens.
2. **DKIM ist bei All-Inkl automatisch aktiv** — es gibt keinen Schalter. Der
   Schlüssel steht im KAS unter *Tools → DNS-Einstellungen* als TXT-Eintrag,
   dessen Name auf `._domainkey` endet; bei solar-check.io lautet der Selektor
   `kas202603240809`.

   **Den Selektor NICHT raten.** Die Zone trägt einen Wildcard-Eintrag (`*`),
   also antwortet jede beliebige Selektor-Abfrage — eine Abfrage auf den
   konventionellen Namen `default._domainkey` liefert das Wildcard-Ziel und
   sieht aus wie ein kaputter DKIM-Eintrag. Genau darauf ist am 19.08.2026 eine
   Stunde Suche im KAS verschwendet worden. Prüfen mit dem echten Selektor:

   ```
   curl -s "https://dns.google/resolve?name=kas202603240809._domainkey.solar-check.io&type=TXT"
   ```

   Nur eine Antwort, die `v=DKIM1` enthält, zählt.

   **Wenn der Schlüssel erneuert wird, ändert sich der Selektor** (er trägt ein
   Datum). Dann `OUTREACH_DKIM_SELECTOR` nachziehen — der Versand verweigert
   sonst, und das ist die richtige Richtung.
3. **Keine Weiterleitung ins private Postfach einrichten.** Antworten von
   Gemeinden sind personenbezogene Daten Dritter; eine Auto-Weiterleitung in ein
   privates Google-Konto macht Google zum unbenannten Empfänger — genau der
   Fehler, der beim Kontaktformular schon einmal behoben werden musste. Abruf
   per IMAP aus dem Postfach selbst, nicht per Weiterleitung.
4. Zugangsdaten trägt **der Betreiber selbst** in `.env.local` ein — nicht
   vorlesen, nicht in eine Datei schreiben, die eingecheckt wird:

   ```
   OUTREACH_DKIM_SELECTOR=<selektor aus dem DNS>
   OUTREACH_SMTP_HOST=<kasserver-host>
   OUTREACH_SMTP_PORT=465
   OUTREACH_SMTP_USER=<postfach>@solar-check.io
   OUTREACH_SMTP_PASS=…
   OUTREACH_MAIL_FROM=Vorname Nachname <postfach@solar-check.io>
   OUTREACH_IMAP_HOST=<kasserver-host>
   OUTREACH_IMAP_PORT=993
   OUTREACH_IMAP_USER=<postfach>@solar-check.io
   OUTREACH_IMAP_PASS=…
   ```

   **Hier stehen bewusst Platzhalter statt der echten Werte.** Das Repo ist
   öffentlich, und ein Block aus Host, Postfach und `…_PASS=` liest sich für
   jeden Scanner wie ein Fund — GitGuardian hat ihn am 19.08.2026 als
   „SMTP credentials" gemeldet. Ein Passwort stand nie darin, aber ein Alarm,
   den man als Fehlalarm abtut, ist genau der, den man beim nächsten Mal auch
   abtut. Die konkreten Werte gehören in `.env.local`, sonst nirgendwo hin.

   Den Hostnamen zeigt das KAS am Postfach; der MX-Eintrag der Domain ist die
   wahrscheinliche, aber nicht garantierte Antwort. Der DKIM-Selektor steht im
   DNS und trägt ein Datum — beim Schlüsseltausch ändert er sich.

### Warum nicht über den bestehenden Mail-Dienst

Resend trägt das Kontaktformular und **alle Wächter-Meldungen**. Seine
Nutzungsbedingungen verbieten Kaltakquise wörtlich; eine Sperre träfe dasselbe
Konto, und dann kommen die Alarm-Mails nicht mehr an, ohne dass es jemandem
auffällt. Unabhängig davon erlaubt der SPF-Eintrag der Domain
(`v=spf1 a mx include:spf.kasserver.com ~all`) ausschließlich die Mailserver von
All-Inkl — eine Mail mit Absender `@solar-check.io` über einen anderen Server
verfehlt die DMARC-Ausrichtung. `lib/outreach-mail.ts` verweigert beides.

---

## 2. Versandweg abnehmen (einmalig, vor der ersten echten Mail)

```
npm run kommunen:versand -- --basis=http://localhost:PORT --test=<eigene-adresse>
```

Verschickt EINE Mail mit dem echten Brieftext (Betreff mit `[PROBE]` davor) an
die angegebene Adresse. Danach im Empfangspostfach den **Quelltext** öffnen und
in `Authentication-Results` nachsehen:

- `spf=pass` mit `smtp.mailfrom=…@solar-check.io`
- `dkim=pass` mit `header.d=solar-check.io`
- `dmarc=pass`

**Erst mit diesem Beleg ist der Versandweg abgenommen.** Ein „die Mail kam an"
sagt nichts: Sie kann angekommen und trotzdem bei jedem größeren Empfänger im
Spam gelandet sein.

Empfehlung für die Probe: an ein Postfach schicken, das nicht auf derselben
Domain liegt (Gmail, Outlook) — der eigene Server prüft sich sonst selbst.

---

## 3. Schub festschreiben

Einmal je Kampagne. Zieht die Auswahl aus dem Aufhänger-Rechenkern und schreibt
`kampagne` + `charge` an die Gemeinden.

```
curl -X POST "$BASIS/api/admin/kommunen/testballon" \
  -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
  -d '{"schub":"mail-he-rp-sl","dry":true}'
```

`dry` weglassen, wenn der Bericht passt. Der Bericht sagt, was NICHT
hineinkam — `ohneKanal`, `verbundGeschwister`, `kleinFehlend`/`grossFehlend`.
Eine Auswahl, die ihre Lücken nicht nennt, liest sich wie Vollständigkeit.

---

## 4. Vor jedem Versandtag

```
npm run kommunen:versand -- --charge=N --liste
npm run kommunen:versand -- --charge=N --vorschau --n=5
```

Ansehen: Empfängeradressen (gehören sie zur richtigen Verwaltung?),
Betrefflängen, übersprungene Gemeinden mit Grund.

## 5. Senden

```
npm run kommunen:versand -- --charge=N --senden --limit=20
```

Läuft mit 90 Sekunden Abstand, schreibt nach jeder Mail sofort den Status und
legt ein Protokoll unter `scripts/.cache/versand/` ab. Bricht der Lauf ab, ist
alles bis dahin protokolliert und in der Datenbank — ein zweiter Lauf
überspringt, was schon draußen ist.

Das Skript verweigert von sich aus:

- an Ferientagen und Feiertagen des Ziel-Bundeslands,
- montags und freitags,
- über einen Anbieter, der nicht im SPF-Eintrag steht, oder mit einem Absender,
  der nicht das angemeldete Konto ist,
- ohne Pflichtangaben im Text (Klarname, Impressum, Art. 14),
- über 25 Mails **am Tag** (nicht je Lauf — es zählt, was heute schon in der
  Datenbank steht),
- **solange kein DKIM-Schlüssel veröffentlicht ist.** Das ist die Bremse aus
  Schritt 1: Ohne DKIM scheitert DMARC bei jeder weitergeleiteten Mail, und
  genau diese Empfängerliste besteht überwiegend aus Ortsgemeinden, deren
  `info@`-Adresse weitergeleitet wird. Mit `--ohne-dkim` lässt sich das für
  einen Probelauf an eigene Adressen übergehen.

Bricht das Schreiben des Status fehl, hält der Lauf an: Die Mail ist draußen,
die Gemeinde steht aber noch auf „offen" — ein zweiter Lauf schickte ihr
denselben Brief ein zweites Mal, und das ist bei einer Aussendung ohne
Nachfassen genau der Fall, den es nicht geben darf.

## 6. Am Folgetag

```
npm run kommunen:ruecklauf -- --tage=3
npm run kommunen:ruecklauf -- --tage=3 --schreiben
```

Erst ansehen, dann schreiben. Was das Skript nicht eindeutig zuordnen kann,
meldet es, statt zu raten — ein falsch gesetztes „gesperrt" verliert eine
Gemeinde für immer.

**Kein Nachfassen.** Wer nicht antwortet, wird nicht erinnert. Das ist die
Zusage, mit der die Aussendung vertretbar ist.

---

## Was gemessen wird

Primär: **veröffentlichte Meldung mit Link** — nach zwei bis vier Wochen von
Hand auf den Gemeindeseiten nachsehen und in der Search Console nach neuen
verweisenden Domains suchen. Sekundär: Antworten, Widget-Anfragen
(`widget_anfrage`). Je Gemeinde protokolliert die Datenbank Variante, Kanal und
Datum; die Auswertung je Variante liefert `/api/admin/kommunen/bilanz`.

Der Klickzähler (`ref_klicks`) misst hier nichts: Der Brief trägt seit dem
31.07.2026 keinen zählenden Link mehr.

### Schub 1 und Schub 2 sind nicht derselbe Text — BLOCKER für die Auswertung

Die 20 Briefe des Schubs `mail-he-rp-sl` (verschickt am **20.08.2026**) tragen
noch die Fassung **vor** dem Umbau vom selben Tag. Zwei Unterschiede, beide
sichtbar für den Empfänger:

1. **Keine Ranglisten-Zeile.** Schub 1 belegt seine Platzierung nicht; ab
   Schub 2 steht „Die ganze Rangliste bei <Messgröße>: …" mit Sprung direkt
   in die Tabelle.
2. **Der Vergleichssatz fehlt in einem Teil der Briefe.** Bis zum Umbau
   schwieg er, sobald die Gesamtleistung des Orts unter dem Landesschnitt lag
   (die Bremse `seiteSagtNachzuegler`) — betroffen waren gerade die Orte, in
   denen die Bürger viel gebaut haben und ein Investorenpark fehlt. Ab Schub 2
   steht er überall, wo er wahr ist.

**Wer Rückläufe zwischen den Schüben vergleicht, vergleicht deshalb zwei
Texte, nicht zwei Zielgruppen.** Ein Unterschied in der Veröffentlichungsquote
ist zwischen Schub 1 und 2 nicht als Wirkung der Auswahl lesbar. Innerhalb
eines Schubs bleibt der Vergleich der beiden Ask-Varianten gültig — sie
unterscheiden sich weiterhin um genau einen Absatz.
