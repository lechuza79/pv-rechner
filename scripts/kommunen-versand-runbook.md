# Runbook: Kommunen-Anschreiben verschicken

Stand: 19.08.2026. Gilt für den Schub `mail-he-rp-sl` und jeden späteren.
Die Regeln selbst stehen im Code (`lib/schulferien.ts`, `lib/outreach-mail.ts`,
`lib/kommunen-testballon.ts`); hier steht nur die Reihenfolge der Handgriffe.

---

## 1. Postfach einrichten (einmalig, braucht den KAS-Zugang des Betreibers)

Im All-Inkl-KAS unter **E-Mail → E-Mail-Postfächer**:

1. Postfach `hey@solar-check.io` anlegen (falls noch nicht vorhanden). Diese
   Adresse steht bereits im User-Agent des Kontakt-Sammlers und in der
   Absenderzeile — sie ist die Adresse, unter der wir ansprechbar sind.
2. **DKIM einschalten** — im KAS unter *Tools → DNS-Einstellungen* bzw. direkt
   an der Domain. Gemessen am 19.08.2026: Der CNAME
   `default._domainkey.solar-check.io → w01cbc22.kasserver.com` steht schon, am
   Ziel liegt aber **kein Schlüssel**. DKIM ist also eingerichtet, aber nicht
   aktiv. Nach dem Einschalten prüfen:

   ```
   curl -s "https://dns.google/resolve?name=w01cbc22.kasserver.com&type=TXT"
   ```

   Solange dort keine Antwort mit `v=DKIM1` steht, ist DKIM aus.
3. **Keine Weiterleitung ins private Postfach einrichten.** Antworten von
   Gemeinden sind personenbezogene Daten Dritter; eine Auto-Weiterleitung in ein
   privates Google-Konto macht Google zum unbenannten Empfänger — genau der
   Fehler, der beim Kontaktformular schon einmal behoben werden musste. Abruf
   per IMAP aus dem Postfach selbst, nicht per Weiterleitung.
4. Zugangsdaten trägt **der Betreiber selbst** in `.env.local` ein — nicht
   vorlesen, nicht in eine Datei schreiben, die eingecheckt wird:

   ```
   OUTREACH_SMTP_HOST=w01cbc22.kasserver.com
   OUTREACH_SMTP_PORT=465
   OUTREACH_SMTP_USER=hey@solar-check.io
   OUTREACH_SMTP_PASS=…
   OUTREACH_MAIL_FROM=Sebastian Schäder <hey@solar-check.io>
   OUTREACH_IMAP_HOST=w01cbc22.kasserver.com
   OUTREACH_IMAP_PORT=993
   OUTREACH_IMAP_USER=hey@solar-check.io
   OUTREACH_IMAP_PASS=…
   ```

   Der genaue Hostname steht im KAS am Postfach; `w01cbc22.kasserver.com` ist
   der MX der Domain und damit die wahrscheinliche, aber nicht garantierte
   Antwort.

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

Das Skript verweigert von sich aus: an Ferientagen des Ziel-Bundeslands,
montags und freitags, über einen unzulässigen Anbieter, ohne Pflichtangaben im
Text und über 25 Mails je Lauf.

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
