# Runbook: Impressum und Datenschutzerklärung

**Turnus:** quartalsweise, zusammen mit `solar-check-legal-waechter`.
**Gilt für:** `app/(site)/impressum/page.tsx`, `app/(site)/datenschutz/page.tsx`,
`components/ContactForm.tsx` (Hinweis an der Erhebungsstelle).
**Gate:** `scripts/waechter-gate.md` hat Vorrang. Rechtsbezug ⇒ **Legal-Judge Pflicht**,
Auto-Fix nur nach den Regeln unten.

## Warum es dieses Runbook gibt

Am 16.08.2026 stand in der Datenschutzerklärung **nichts** über das Kontaktformular,
das einen Tag vorher live gegangen war — kein Empfänger, kein US-Transfer, keine
IP-Speicherung, und am Formular selbst kein Hinweis. Dazu vier weitere überholte
Stellen. Niemand hatte die Erklärung angefasst, weil kein Wächter dafür zuständig war:
Der Legal-Wächter beobachtet **Gesetzesänderungen**, nicht die Frage, ob unser eigener
Text noch zu unserem eigenen Code passt.

**Die Fehlerklasse ist nicht „Gesetz geändert", sondern „Feature gebaut, Text vergessen".**
Sie entsteht bei jedem Deploy, nicht bei jeder Gesetzesnovelle. Deshalb ist der
**Datenfluss-Abgleich unten Schritt 1** und die Gesetzesprüfung Schritt 2.

## Schritt 1 — Datenfluss-Abgleich (Code gegen Text)

Nicht die Erklärung lesen und fragen „klingt das noch richtig?", sondern **aus dem Code
die Liste der Datenflüsse neu erheben** und gegen den Text halten. Erhebungsbefehle:

```
grep -rl "fetch(\"https\?://\|fetch(`https\?://" app/api/     # externe Empfänger
grep -rn "localStorage\|sessionStorage\|cacheStorage" lib/ components/
grep -rn "x-forwarded-for\|x-real-ip" app/api/                 # IP-Verarbeitung
grep -rn "supabase\|resend\|RESEND_FROM" app/api/ lib/
```

Für **jeden** Treffer prüfen, ob die Erklärung ihn nennt, und zwar mit:
Zweck · Rechtsgrundlage (Art. 6 DSGVO) · **Empfänger** (Art. 13 Abs. 1 lit. e) ·
**Drittlandtransfer + Garantie + wo es eine Kopie gibt** (lit. f) ·
**Speicherdauer oder Kriterien** (Art. 13 Abs. 2 lit. a).

Stand 16.08.2026 sind das: Vercel (Hosting + Reichweitenmessung), Supabase (Konto),
PVGIS, Open-Meteo (**vier** Routen: `weather`, `cooling-degree`, `heatwave`, `solar-now`),
Resend (Kontaktformular), das E-Mail-Postfach beim Mailhoster, Google Search Console.

**Neues Formularfeld, neuer externer Dienst, neuer Speicher-Eintrag ⇒ Text ist überfällig.**

## Schritt 2 — Absolute Aussagen jagen

Der schwerste Befund ist nicht eine fehlende Angabe, sondern eine **falsche Zusage**;
sie ist zusätzlich § 5 UWG relevant. Suchmuster im gerenderten Text:
„keine …", „ausschließlich", „nur", „alle", „in zwei Fällen", „niemals", „anonymisiert".

Jede solche Stelle **am Code widerlegen versuchen**, nicht bestätigen. Historische Treffer:
„keine Nutzer-Accounts, keine Cookies" (es gab beides), „Berechnungen laufen ausschließlich
im Browser" (PLZ ging an zwei Dienste), „IP-Adresse (anonymisiert)" (die Kontakt-Route liest
die volle Adresse), „In zwei Fällen" (es waren vier), „Diese Einträge enthalten keine
Identifier" (`sc-admin-<userId>` steht im sessionStorage).

## Schritt 3 — Fundstellen und Drittland-Status

- **Impressum:** § 5 DDG (Pflichtangaben) und § 18 **Abs. 2** MStV (Verantwortlicher).
  **Nicht** § 18 Abs. 1 dazuschreiben — Abs. 1 ist die Anbieterkennzeichnung (Name +
  Anschrift), die der DDG-Block schon trägt, und kennt keinen „Verantwortlichen für den
  Inhalt". Ein Judge hat das am 16.08.2026 falsch vorgeschlagen, ein zweiter es korrigiert.
- **Kein OS-Plattform-Link** — die ODR-Verordnung ist zum 20.07.2025 aufgehoben.
- **DPF-Status** der US-Empfänger **im amtlichen Register** prüfen:
  `dataprivacyframework.gov/list`, Teilnehmersuche. **Nicht** `privacyshield.gov` — dort
  steht der alte Privacy-Shield-Datensatz, der für Vercel „Inactive" zeigt und schon einmal
  als Fehlalarm gemeldet wurde. Ebenso wenig genügt die Selbstauskunft des Anbieters.
  Stand 16.08.2026 geprüft: Vercel Inc. „Active"; Resend (Rechtsträger **Plus Five Five,
  Inc.**) „Active – Re-certification under Review", Non-HR Data, nächste Zertifizierung
  fällig 03.03.2027 — **das ist der Wecker für diesen Eintrag.**
- **Supabase läuft nicht über das DPF**, sondern über Standardvertragsklauseln
  (Modul 2, Durchführungsbeschluss (EU) 2021/914); Vertragspartei ist die
  **Supabase Pte. Ltd., Singapur** — nicht „Supabase Inc.". Quelle: supabase.com/legal/dpa.

## Schritt 4 — § 25 TDDDG (Browser-Speicher)

Getrennt bewerten, die beiden Fälle vertragen keine gemeinsame Begründung:

| Was | Bewertung |
|---|---|
| Einstellungen, die der Nutzer selbst setzt (PLZ, Farbschema, Heimatort, „Speichern"-Vormerkung, Admin-Flag) | Nr. 2 trägt — **dauerhaft zulässig** |
| Reine **Daten**-Caches (Energie-/Preisreihen) | Nr. 2 trägt **nicht** dauerhaft ⇒ nur Sitzungsdauer |

**§ 25 gilt unabhängig vom Personenbezug** (EuGH C-673/17 *Planet49* Rn. 70; EDSA-Leitlinien
2/2023 Rn. 6, 10, 12 — „information", nicht „personal data"; keine Mindestspeicherdauer,
Rn. 37). „Unbedingt erforderlich" ist **technisch** zu lesen, nicht wirtschaftlich, und hat
eine Dauer-Dimension (DSK-Orientierungshilfe Digitale Dienste Rn. 78, 79, 95;
BT-Drs. 19/27441 S. 38). Ein dauerhafter Geschwindigkeits-Cache fällt darunter nicht — und
§ 25 kennt **keine Interessenabwägung** (DSK Rn. 68), es gäbe also nur den Banner.
Deshalb liegen die Daten-Caches seit 16.08.2026 in der Sitzung
(`LONG_CACHE_TTL` in `lib/energy.ts`, Warnhinweis an `longLived` in `lib/use-cached-fetch.ts`).

**Nr. 2 ist keine Rechtsgrundlage**, sondern eine Ausnahme vom Einwilligungserfordernis —
nie „Rechtsgrundlage ist § 25 …" schreiben (DSK Rn. 69, 96 f.).

**Prüfe bei jedem Lauf, ob wieder etwas dauerhaft im `localStorage` landet:**

```
grep -rn "cacheStorage(\"local\")\|longLived: true" lib/ components/ app/
```

Treffer ⇒ entweder es ist eine Nutzer-Einstellung (dann in Abschnitt 7 nennen) oder es ist
ein Daten-Cache (dann zurück in die Sitzung).

## Befugnis

- **Auto-Fix erlaubt:** Tippfehler, tote Links, ein im Register nachgeprüfter DPF-Status,
  das Datum in „Stand: …", wenn inhaltlich etwas geändert wurde.
- **Vorschlag an den Menschen, nie Auto-Fix:** jede neue oder geänderte Rechtsaussage,
  jede neue Empfängernennung, jede Änderung an Rechtsgrundlagen. Vorher durchs Council
  (`scripts/council-verify.md`) **mit Legal-Judge** — und zwar mit einem zweiten, der den
  ersten widerlegen soll: Am 16.08.2026 lag der erste Judge beim Impressum falsch und
  beim Rechtsträger von Resend daneben, beides fand erst der zweite.
- **Der Betreiber nimmt hier keine Fakten ab** (er ist kein Jurist). Ihm vorgelegt wird
  nur, was er allein weiß oder entscheiden muss — nicht, ob eine Fundstelle stimmt.

**Das Zielpostfach ist eine Rechtsfrage, keine Konfiguration.** Am 16.08.2026 gingen die
Formular-Nachrichten an `ADMIN_EMAILS`, also an ein privates Gmail-Konto: Damit war Google
zweiter Empfänger jeder Nutzernachricht im Drittland, und ein privates Konto kann keinen
Auftragsverarbeitungsvertrag nach Art. 28 tragen. Der Versand geht deshalb an das
Domain-Postfach beim deutschen Anbieter; `ADMIN_EMAILS` behält seine eigene Aufgabe
(Admin-Zugang, Wächter-Mail). Festgenagelt von `lib/__tests__/kontakt-empfaenger.test.ts` —
**wer den Empfänger wieder auf `ADMIN_EMAILS` legt, ändert damit die Empfängerliste der
Datenschutzerklärung.**

## Offene Punkte

- **OFFEN (bis 03/2027):** Resend-Zertifizierung im DPF-Register nachprüfen (fällig 03.03.2027).
- **Einbettungs-Zählung nach § 25 Abs. 1 TDDDG — Restrisiko bewusst getragen
  (Betreiber-Entscheidung 25.08.2026).** Kein offener Punkt mehr, aber auch keine
  Unbedenklichkeitsbescheinigung: Die Bauweise ist am selben Tag einmal an dieser
  Frage gescheitert und umgestellt worden, und die Gegenprüfung der neuen
  Einordnung ist **schwächer ausgefallen als der erste Eindruck**.
  - **Was die Gegenprüfung wirklich ergab:** Das Hauptargument („Rn. 43 nennt
    Kopfzeilen-Mechanismen nur im Zusammenhang mit Fingerprinting") trägt nicht —
    dort steht „for example", also eine Aufzählung, keine Einschränkung. Dazu
    Rn. 39 (Herkunft und Art der Information sind gleichgültig) und Rn. 32
    („usually", nicht „always", für die aktive Anweisung ans Gerät). Es bleibt:
    Wir werten nur aus, was der Browser ohnehin sendet, die Angabe beschreibt die
    einbettende Website statt des Geräts, und nichts Gespeichertes zeigt auf eine
    Person. Vertretbar, nicht sicher.
  - **Die Entscheidung war eine Abwägung, keine Rechtsauskunft:** Nutzen konkret
    (einziges Maß für den Erfolg des Kommunen-Outreach), möglicher Verstoß formal
    und ohne Schaden für einen Besucher. Wer sie neu aufmacht, braucht einen neuen
    Anlass — eine Aufsichtsäußerung, eine Gerichtsentscheidung oder eine
    Erweiterung der gespeicherten Felder.
  - **Die Gegenprüfung kam von derselben Instanz, die die Einordnung getroffen
    hat** (die unabhängigen Prüfläufe waren in der Sitzung abgeschaltet). Wer
    ohnehin einen Legal-Lauf fährt, hängt sie mit dran.
  - **Verworfen (erste Fassung, wenige Stunden live):** Ein Baustein im Embed-Layout
    las die Herkunft im Browser (`ancestorOrigins`, ersatzweise `document.referrer`)
    und meldete sie an eine eigene Route. Die EDSA-Leitlinien 2/2023 (Fassung 2.0,
    07.10.2024, Volltext am 25.08.2026 gelesen) beschreiben genau das: Rn. 33
    („JavaScript code, where the accessing entity instructs the browser … to send
    asynchronous requests with the targeted information. Such access **clearly**
    falls within the scope"), Rn. 53 für lokal erzeugte Information und Rn. 63 für
    ausgelieferten Client-Code. Die Ausnahme in § 25 Abs. 2 greift nicht — für die
    Anzeige des Widgets ist die Zählung nicht erforderlich.
  - **Gebaut:** Die Middleware liest den `referer`-Anfragekopf beim Ausliefern des
    eingebetteten Dokuments (`middleware.ts`, Logik in `lib/embed-herkunft-core.ts`).
    Der Unterschied ist der aus Rn. 32: Dort weist die auslesende Stelle das Gerät
    an, etwas zu senden — hier weist niemand etwas an, die Angabe kommt mit der
    Anfrage, weil das Protokoll sie vorsieht, und sie beschreibt die **einbettende
    Website**, nicht das Gerät.
  - **Der befürchtete Preis tritt nicht ein.** Beim Abwägen stand hier, der
    serverseitige Weg koste die statische Auslieferung aller Embed-Seiten. Falsch:
    Die Middleware sitzt vor der Auslieferung und ersetzt sie nicht — auf der
    Produktion antwortet `/embed/strommix` weiterhin aus dem CDN (`x-vercel-cache:
    HIT`, gemessen 25.08.2026). Es bleibt eine Middleware-Ausführung je Abruf.
  - **Was die Gegenprüfung angreifen soll:** Rn. 43 nennt Kopfzeilen-Mechanismen
    ausdrücklich und sagt, deren Auswertung *könne* die Vorschrift auslösen — dort
    allerdings im Zusammenhang mit Fingerprinting und dem Verfolgen von
    Ressourcen-Kennungen. Ob diese Einschränkung trägt, ist die eigentliche Frage.
  - **Nicht vergessen:** An der Einordnung hängen zwei Texte, die live sind —
    Datenschutzerklärung Abschnitt 14 und der Textbaustein, den Einbettende in ihre
    eigene Erklärung übernehmen (`/energie-widgets`). Beide sagen inzwischen
    ausdrücklich, dass im Browser des Besuchers **kein Code von uns läuft**; fällt
    die Einordnung anders aus, ist das keine Ungenauigkeit mehr, sondern eine
    Falschaussage — auch in der Erklärung jeder einbettenden Gemeinde.
  - Festgenagelt von `lib/__tests__/embed-herkunft.test.ts` → „liest die Herkunft
    NUR aus dem Anfrage-Kopf": Der Browser-Weg darf nicht zurückkommen.

## Erledigt, aber nachzumessen

**Was das Messskript vom Gerät liest, wird am Skript gemessen, nicht der Dokumentation
geglaubt.** Am 16.08.2026 am Live-System geprüft (`fetch("/_vercel/insights/script.js")`,
2.495 Bytes): Der einzige Gerätezugriff ist
`navigator.webdriver || navigator.userAgent.includes("Headless")` — eine Bot-Erkennung,
deren Ergebnis die Messung **unterdrückt** und die selbst nichts überträgt. Kein
`screen.*`, kein `innerWidth`, kein `devicePixelRatio`, keine Zeitzone, kein Canvas,
kein `localStorage`/`sessionStorage`, kein `document.cookie`. Gerätetyp und Herkunftsregion
leitet der Dienst aus der Anfrage selbst ab. Deshalb sagt Abschnitt 5 seit dem 16.08.2026
nicht mehr pauschal „keine Informationen … ausgelesen", sondern benennt diesen einen
Zugriff.

**Bei jedem Lauf neu messen** — das Skript wird von Vercel ausgeliefert und kann sich
ohne unser Zutun ändern. Wächst es deutlich oder tauchen neue Zugriffe auf, ist Abschnitt 5
überfällig und die Einordnung nach § 25 Abs. 1 neu zu stellen (EDSA-Leitlinien 2/2023:
Auslesen kann auch ohne Speicherung ein „Zugriff" sein).
