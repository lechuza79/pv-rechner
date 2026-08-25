# Lehren: Monitoring, Selbstheilung und Meldelogik

Wortlaut aus CLAUDE.md, Stand 29.07.2026. Die Regeln daraus stehen weiterhin in
CLAUDE.md unter „Monitoring & Meldelogik"; hier liegen die vollständigen
Begründungen (warum GitHub-Action statt scheduled-task, warum ein Modell-Lauf statt
einer Mail, warum die Schleuse in `/api/alert` sitzt, warum der Bericht in die
Ablage gehört).

### Monitoring

Zwei getrennte Ebenen — Datenwerte und Verfügbarkeit:

- **Datenwerte:** die Wächter als scheduled-tasks (Preise, EEG, CO₂, BEG-Förderung, Geräte-Config, Legal, Atlas-Index-Wellen). Sie prüfen, ob die *Zahlen* noch stimmen, und melden per Mail (`/api/alert`).
- **Sichtbarkeit bei Google — BLOCKER: Impressionen sind kein Indexierungsstatus.** `/api/seo/gsc` liefert Impressionen/Klicks je Seite; `/api/seo/index-status` (`lib/gsc-index-status.ts`, Bearer `CRON_SECRET`) liefert den **echten** Status je URL (gecrawlt wann, aufgenommen ja/nein, sonst der Grund) plus Sitemap-Frische. Eine Seite ohne Impressionen kann indexiert sein oder Google völlig unbekannt — grundverschiedene Befunde, grundverschiedene Maßnahmen. Am 27.07.2026 wurde aus einer 28-Tage-Impressionssumme geschlossen, die Atlas-Seiten liefen „seit Wochen ohne Nachfrage"; tatsächlich waren es vier Tage mit steigendem Verlauf. Deshalb: **Status fragen, nicht aus Impressionen ableiten**, und Impressionen nur mit Tagesverlauf (`byDate`) lesen, nie als Summe.
- **Sitemap: automatisch erzeugt ≠ automatisch eingereicht.** `app/sitemap.ts` ist immer aktuell, aber Google holt sie nach eigenem Rhythmus (im Juli 2026 fünf Tage gar nicht — die am 25.07. umgezogenen Ratgeber-URLs galten als „Google nicht bekannt"). Der Wellen-Monitor prüft `tageSeitAbruf` und reicht ab drei Tagen über `?resubmit=1` neu ein (Selbstheilung in der sicheren Richtung: eigene Sitemap, idempotent). Der frühere Ping-Endpunkt ist bei Google abgeschaltet. **`lastmod` nur mit echtem Datum** — Build-Zeit wäre bei jedem Deploy „jetzt" und wird von Google ignoriert; Ratgeber tragen es je Eintrag in `lib/ratgeber.ts`, Förderseiten aus `lastVerified`, Atlas aus dem Datenstand. Seiten ohne ehrliches Datum lassen es weg.
- **Verfügbarkeit + Antwortzeit — der harte Automatismus:** GitHub-Action `.github/workflows/health-check.yml` (alle 3 h + nach jedem Push auf `main`, der `app/`, `lib/`, `components/`, `vercel.json` oder `next.config.js` berührt) ruft `npm run health-check` (`scripts/health-check.ts`). Misst Statuscodes, Antwortzeiten, Function-Region und drei echte Atlas-**Kaltrender** (zufällige Gemeinden, `x-vercel-cache: MISS` erzwungen; gewertet wird die langsamste).
- **Auswertung + Selbstheilung:** scheduled-task `solar-check-error-triage-daily` (täglich). Liest die Action-Läufe und Vercels Fehler-Cluster, repariert selbst was eindeutig ist, und meldet dem Betreiber nur, was er selbst entscheiden muss.

- **Behebung:** GitHub-Action `.github/workflows/claude-autofix.yml` springt an, wenn der Gesundheitscheck rot wird (`workflow_run` auf „Health Check", nur bei `conclusion == failure`). Claude grenzt die Ursache ein, behebt sie, lässt `tsc` + Tests laufen, misst mit `npm run health-check` am lebenden System nach und committet. Braucht `ANTHROPIC_API_KEY` als Repo-Secret.

**Warum die Action und nicht nur der scheduled-task:** scheduled-tasks laufen nur, wenn die App offen ist. Ein Monitoring mit dieser Voraussetzung hätte den Juli-Ausfall genauso verschlafen. Die Action läuft immer; der Task ist die klügere Auswertung obendrauf.

**Warum ein Modell-Lauf und nicht eine Meldung an den Betreiber:** Der Betreiber ist UX-Architekt und programmiert nicht. Ein Befund wie „eine Atlas-Seite braucht 5,4 s" ist für ihn keine Handlungsanweisung — ein Alarm an einen Menschen, der ihn nicht beheben kann, ist keine Benachrichtigung, sondern eine Sackgasse. Die erste Fassung des Wächters hatte genau diesen Fehler (Kategorie hieß „Muss ein Mensch anschauen"). Deshalb heißt sie jetzt `forClaude`, und der Betreiber hört nur, wenn eine **Entscheidung** ansteht, die ihm gehört — formuliert als Frage mit Empfehlung, nie als technische Aufgabe.

**Grenzen des Autofix (im Prompt festgeschrieben):** keine Änderungen an Berechnungslogik, Zahlen, Einheiten, Rechtstexten oder der Datenbank ohne Rückfrage — und ausdrücklich **kein Hochsetzen der Schwellen**, damit ein Befund verschwindet (das versteckt, statt zu beheben; dieselbe Linie wie bei den Geräte-Effizienzen: „Wert wirkt zu optimistisch" ist kein gültiger Grund). Kommt Claude nicht weiter, entsteht ein GitHub-Issue statt eines Commits. **Kostenbremse:** höchstens ein Modell-Lauf pro Tag — ein Befund, der auf eine menschliche Entscheidung wartet, würde sonst alle 3 h einen Lauf auslösen, ohne dass sich etwas ändert (~1–2 € je Lauf).

**Meldelogik — Benachrichtigung nur bei echtem Handlungsbedarf.** Vorgabe des Betreibers: „im grunde brauch ich keine mail – sondern einen alert an dich und autofix. nur benachrichtigung wenn ich was tun muss." Daraus folgen drei Stufen, die im Code als `selfHealed` / `warnings` / `problems` getrennt sind:
- **selbst repariert** → Protokollzeile, keine Nachricht. Der Check korrigiert `vercel.json`, die Action committet und deployt (Exit-Code 2 heißt „repariert", nicht „fehlgeschlagen").
- **auffällig** → steht im Workflow-Log und im Tagesbericht, keine Nachricht. Gelb sitzt bei 4 s (Normalbereich 1,8–3,4 s) — eine Warnung, die bei jedem Lauf angeht, filtert man nach zwei Wochen weg und verpasst dann die rote.
- **muss Claude anschauen** → Workflow rot, die Autofix-Action springt an. **Keine Mail.** Bis zum 28.07.2026 ging genau das doch als „Handlungsbedarf" raus — sieben Mails in drei Tagen über Befunde, die der Betreiber weder beheben kann noch soll. Erst wenn dieselbe Stelle **drei Läufe in Folge** rot bleibt, ist die Selbstheilung erkennbar gescheitert und daraus wird eine Frage an ihn (`eskalationNoetig` in `scripts/health-check.ts`, festgenagelt von `lib/__tests__/health-check-eskalation.test.ts`).
- **muss der Betreiber entscheiden** → Mail über `/api/alert`. Nur Fälle mit mehreren vertretbaren Antworten: War das Absicht? Geld ausgeben? Produkt/Priorität? Im Gesundheitscheck ist das aktuell genau ein Fall — jemand hat die Function-Region bewusst geändert.

**Die Schleuse steht in `/api/alert`, nicht in den Wächter-Prompts** (`lib/alert-format.ts`): Eine Meldung ohne `decisions` wird **nicht zugestellt**, egal wie aufregend der Lauf war; `audience: "claude"` nie. Die Mail zeigt genau zwei Dinge: was zu entscheiden ist (mit Empfehlung) und was der Wächter selbst erledigt hat — je eine Zeile. Format und Abgrenzung „Entscheidung vs. Aufgabe" stehen in `scripts/waechter-gate.md`, Teil 3; alle Wächter-Prompts rufen die Route in dieser Form auf. **Ausnahme mit `force`:** der Sonntags-Wochenbericht und der Monats-Heartbeat des Förder-Wächters — dort IST „nichts zu melden" die Nachricht (sonst ließe sich „keine Änderung" nicht von „Wächter läuft nicht mehr" unterscheiden).

**Der Bericht steht in der Ablage, nicht in der Mail** (`lib/waechter-reports.ts`, Ansicht `/admin/waechter`): Jeder Lauf wird in Supabase (`waechter_reports`) abgelegt — **auch der stumme**, der keine Mail auslöst. Sonst wäre die Schleuse ein Reißwolf: „selbst repariert, nichts zu entscheiden" ist genau das, was man vier Wochen später nachlesen will. Die Mail trägt nur einen Link dorthin; den Volltext nimmt sie nur mit, wenn die Ablage ausgefallen ist (sichtbar als Ausnahme gekennzeichnet — ein verlorener Bericht ist schlimmer als eine lange Mail). **Eingeklappt (`<details>`) reicht nicht:** Gmail entfernt das Element und zeigt den Inhalt ausgeklappt, die Mail wäre wieder seitenlang. Tabelle anlegen: `GET /api/alert/setup` mit `CRON_SECRET`; RLS ohne Policy, also nur über den Service-Key lesbar.

**Selbstheilung nur in der sicheren Richtung** (gleiche Linie wie beim Förder-Wächter): Automatisch korrigiert wird ausschließlich die Function-Region — der einzige Befund mit genau *einer* richtigen Antwort, solange die Datenbank in Frankfurt steht. Steht in `vercel.json` bewusst eine andere Region, wird **nicht** überschrieben, sondern gemeldet; eine menschliche Entscheidung zu überfahren wäre gefährlicher als das Problem. Festgenagelt von `lib/__tests__/health-check-selbstheilung.test.ts` (beide Richtungen, plus: keine Vercel-fremden Schlüssel schreiben, Crons erhalten, kaputtes JSON nicht überschreiben).

**Konfiguration und Messung sind zwei Fragen — beide stellen.** Der Check prüft nicht nur, ob es *gerade* richtig läuft (Antwort-Header), sondern unabhängig davon, ob es richtig *bleibt* (`vercel.json`). Nur zu messen wäre zu spät: Nimmt jemand den `regions`-Eintrag heraus, läuft Production bis zum nächsten Deploy weiter in Frankfurt und der Check meldet grün — der Ausfall ist dann schon scharf und geht beim nächsten Push los.

**Der Frühindikator ist der Abstand zur Notbremse, nicht der Statuscode.** Genau daran ist der Juli-Ausfall zwei Tage lang vorbeigelaufen: 500er tauchen erst auf, wenn es schon zu spät ist — eine Seite, die 6 s statt 1 s braucht, liefert noch sauber 200 und steht trotzdem kurz vorm Kippen. Beide Wächter schlagen deshalb bei einem Kaltrender über 5 s an, **auch ohne einen einzigen Fehler im Log**, und prüfen dann als Erstes die Function-Region.

---

## Nachtrag 24.08.2026: ausgelagert aus CLAUDE.md

### Vier Tage „cancelled", und der Prüfstand war grün (20.–23.08.2026)

Der Förder-Seiten-Wächter endete viermal in Folge mit „cancelled" — das Job-Zeitlimit reichte dem
gewachsenen Seitenbestand nicht mehr (2.672 → 6.922 Seiten in vier Tagen). Vier Tage lang fielen
Technik-Einordnung, Screening und Leseliste aus.

`npm run stand:faellig` war die ganze Zeit vollständig grün — **zu Recht**: Der Abschnitt erkennt einen
Ausfall daran, dass ein Prüfdatum stillsteht, und ein GitHub-Workflow stempelt keins.

Der Tagesbericht lief weiter und trug den Beweis sogar bei sich: dreimal „unverändert" in Folge bei genau
den Zahlen, die die toten Schritte bewegen. Nur ist „unverändert" auch das Normalergebnis.

**„cancelled" ist die gefährlichste Endung** — Rot sieht man, „abgebrochen" liest man als „egal".

Beim Zusammenstellen der beobachteten Läufe stand die Sitemap-Einreichung zunächst in der Liste, weil ihr
Zeitplan **angenommen** statt nachgesehen wurde (Gate-Regel 3) — sie hat gar keinen, nur Handstart.

### Die Urlaubswoche (09.–13.08.2026)

Es lief **kein einziger** Wächter: keine automatischen Commits, die Laufzeitstempel springen vom 08.08.
auf den 13./15.08. Die Health-Check-Action lief in derselben Zeit lückenlos alle drei Stunden weiter.

Beim Zurückkommen feuerten die aufgelaufenen Läufe gleichzeitig — am 13.08. vier in 31 Minuten, am 15.08.
zwei in derselben Sekunde, jeder mit eigenem Bericht.

Niemand hat die Lücke bemerkt. Es gibt keinen Totmann-Schalter, der prüft, ob ein Wächter überhaupt noch
meldet.

### Der Soft-404 im Atlas (bis 29.07.2026)

`/solar-atlas/quatsch/quatsch/quatsch` antwortete mit **HTTP 200** und der 404-Seite im Text; kreisfreie
Städte mit 200 statt 307. Ursache: eine Ladehülle über der ganzen Route — die Antwort geht raus, bevor die
Seite weiß, ob es die angefragte Sache gibt.

Für Google zählt der Statuscode, nicht der Text. Erfundene Adressen galten als gültige Seiten und wurden
weiter gecrawlt, ausgerechnet auf dem SEO-Hebel des Projekts. Von außen unsichtbar: Die Seite ist schnell,
grün und liefert 200.
