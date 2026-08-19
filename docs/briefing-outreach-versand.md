# Übergabe: Kommunen-Anschreiben verschicken (Schub 1)

> Briefing für eine eigene Session (Opus genügt). Stand: 19.08.2026, aus der
> Outreach-Audit-Session. Der Auftrag ist VERSAND, kein Neubau — Brief, Rechenkern,
> Cockpit und Rechtsrahmen stehen und sind am 18./19.08. komplett auditiert.
> Vorher lesen: Memory `project_outreach_versandregeln` (BLOCKER), `project_kommunen_outreach`,
> `project_kaltakquise_kalibriert`; CLAUDE.md Legal-Checkliste #6.

## Auftrag

Eine schlichte Mail mit Link — fertige Meldung im Text, Link auf Gemeindeseite und
Rangliste, kein Anhang, keine Grafik, kein Siegel (Betreiber-Ansage 19.08.). Konkret:

1. **Testgruppe neu festschreiben** — die bestehende `kampagne='testballon'` (BW+BY)
   ist obsolet: **NIE in Schulferien des Ziel-Bundeslands senden** (BW bis 12.09.,
   BY bis 14.09.). Neu ziehen über `POST /api/admin/kommunen/testballon` mit
   `bl`-Parameter: **Hessen (06), Rheinland-Pfalz (07), Saarland (10)** — Ferien dort
   seit 07.08. vorbei. Reserve für Schub 2: Niedersachsen (03), Bremen (04).
   **Nur Gemeinden MIT Rollen-Postfach** aufnehmen (Zielbild ist Mail-Vollautomatik —
   der Test muss den Kanal testen, der später skaliert). Stärkste Aufhänger zuerst
   (Sieger), Neutrale raus. A/B-Varianten (`nur_meldung` / `meldung_plus_widget`)
   beibehalten. Die alte BW+BY-Liste NICHT löschen — Kampagnen-Feld umbenennen
   (z. B. `testballon-bwby-geparkt`), sie wird ab Mitte September die zweite Welle.
2. **Versand-Skript** (`scripts/` + nodemailer o. ä.): Versand über **All-Inkl-SMTP**
   (Absender `hey@solar-check.io` — SPF erlaubt NUR kasserver, deshalb nie Gmail/Resend,
   siehe unten). Gedrosselt **15–25 Mails/Tag**. Bei jedem Versand sofort in
   `kommunen_kontakt` schreiben: `outreach_status='kontaktiert'`, `contacted_at`,
   `channel='mail'`, `versendet_variante`. Zugang: Postfach-Passwort legt der
   Betreiber selbst in `.env.local` (nie echoen, nie committen).
3. **Rückläufer + Antworten:** Unzustellbar-Mails im Postfach erkennen → Status
   `bounce` + aus künftigen Läufen raus. Antworten → `responded_at` + Notiz.
   (Postfach-Frage — All-Inkl-IMAP oder Workspace-Empfang — entscheidet der Betreiber;
   bei Sessionstart nachfragen, was er eingerichtet hat.)
4. **Freigabe-Fluss:** Vor Schub 1 dem Betreiber **5 echte Musterbriefe** zeigen
   (Cockpit oder Text) und die Schub-Liste (Ort, Betreff, Aufhänger) — Versand erst
   auf sein Go. Danach ist das Go pro Schub ein Satz.

## Was existiert und geprüft ist (NICHT neu bauen, Stand 19.08.)

- **Brief:** `lib/kommunen-outreach-draft.ts` — Meldung als Ask, DSGVO-Zeile (Art. 14),
  Impressum, kein Zähl-Link. Betreff/Einstieg aus `lib/award-hook.ts`.
- **Konsistenz Brief ↔ Seite verifiziert:** Brief, Platzierungsblock der Gemeindeseite
  (`/api/atlas/platzierungen`) und Ranglisten-Seiten rechnen aus demselben Kern; live
  gegengeprüft. Ranglisten-Links funktionieren auf Production.
- **Datenstand:** MaStR 05.08., nächster Lauf 05.09. — stabiles Versandfenster.
- **Cockpit:** `/admin/kommunen` (Draft-Generator, Status, „als kontaktiert markieren").
- **Datenschutzerklärung** Abschnitt 15 (Kommunen-Anschreiben) ist live und korrekt.

## Bekannte offene Punkte (aus dem Audit, im Lauf miterledigen)

- **3 Betreffe > 80 Zeichen** bei langen Ortsnamen (bis 105 möglich; der Test misst
  mit „Musterdorf" und ist dafür blind). Kürzungs-Wortlaut ist **Wortwahl-Entscheidung
  des Betreibers** — Vorschläge vorlegen (z. B. „bei Heimspeichern" statt „bei der
  privaten Speicherkapazität"), NICHT stillschweigend ändern. Danach den Test auf
  einen realistisch langen Ortsnamen umbauen.
- **`channel` wird beim Kontaktiert-Markieren im Cockpit nicht gesetzt** — das
  Versand-Skript setzt ihn selbst; den Cockpit-Knopf bei Gelegenheit nachziehen.

## Rechtsrahmen (kalibriert, Judge-geprüft Juli 2026 — nicht neu aufmachen)

Unverlangte B2G-Mail = formal Werbung nach § 7 UWG, aber: Empfänger-Gemeinde ist
nicht abmahnbefugt, Restrisiko klein und bewusst akzeptiert (Betreiber-Entscheidung
18.08.). Auflagen, alle bereits im Brief/Prozess: nur Rollen-Postfächer, Klarname +
Impressum + Datenschutz-Zeile, sofortiger Stopp bei Widerspruch (Status `gesperrt`),
schubweise, **kein Nachfassen per Mail** bei Nichtantwort. **NIE über Resend senden**
(AUP verbietet Kaltakquise wörtlich; eine Sperre träfe unsere Alert-Mails im selben
Konto) und nie über das private Gmail des Betreibers.

## Erfolgsmessung (vor Schub 1 festhalten)

Primär: veröffentlichte Meldung mit Link (manuell prüfen + GSC-Backlinks, nach 2–4
Wochen). Sekundär: Antworten, Widget-Anfragen (`widget_anfrage`). Je Gemeinde
protokolliert: Variante, Kanal, Datum — liegt alles in `kommunen_kontakt`.

## Koordination

`git fetch` + `npm run sessions` vor Start. Die Audit-Session (Haupt-Repo) hat dieses
Briefing geschrieben und übergibt vollständig — bei Fragen per `send_message` melden.
Eine Badge-/Siegel-Idee ist ausdrücklich VERWORFEN (19.08.) — nicht wiederbeleben.
