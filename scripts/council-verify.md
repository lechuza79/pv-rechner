# Council-Verifikation vor jeder Rechts- oder Zahlenänderung

**Zweck:** Bevor eine Rechts- oder Zahlenaussage live geht, lassen wir sie von
**mehreren unabhängigen Agenten** gegenprüfen. So schiebt kein einzelner —
womöglich falsch gelesener — Rechercheschritt einen falschen Wert in Production.

## Wann das greift — BLOCKER

**Der Auslöser ist die ÄNDERUNG, nicht ihre Herkunft.** Ein Council läuft bei
jeder Abweichung in den Verify-Wächtern (EEG, CO2, Wärmepumpe, Förderung) —
**und genauso**, wenn dieselbe Art von Aussage auf einem anderen Weg entsteht:
aus einem Gespräch mit dem Betreiber, aus einer eigenen Recherche, aus einem
Review-Befund oder aus einem Nutzerhinweis. Wer eine Zahl, eine Frist, einen
Geltungsbereich oder eine Rechtsfolge in den Code oder in einen sichtbaren Text
schreibt, durchläuft dieses Protokoll — auch wenn er sich sicher ist.

**Und: Der Betreiber ist keine Prüfinstanz für Fakten.** Er ist UX-Architekt und
Product Owner; ob ein Verweis in einem Artikelgesetz trägt, kann er nicht
beurteilen — ihn danach zu fragen, verlagert die Verantwortung an die falsche
Stelle und erzeugt eine Freigabe, die nichts absichert. Seine Abnahme gilt dem
**Aussehen und der Verständlichkeit**, nie der Richtigkeit einer Zahl oder einer
Rechtsaussage. Die stellt dieses Protokoll sicher, bevor er die Seite überhaupt
zu sehen bekommt.

*Auslöser (29.07.2026):* Der Betreiber fand selbst, dass die Grüngas-Pflicht
entgegen unserer Aussage auch im Neubau gilt. Die Korrektur lief ohne Council,
weil sie „nur aus einem Gespräch" kam — und wurde ihm anschließend zur Abnahme
vorgelegt. Der nachgeholte Council bestätigte zwar 3/3, der adversariale Prüfer
fand aber eine fehlende Zeitgrenze, ohne die die neue Aussage für Neubauten ab
2030 wieder falsch gewesen wäre. Genau dafür gibt es das Protokoll.

## Sichtbar geprüft, nicht nur im Quelltext — BLOCKER

Eine geänderte Aussage gilt erst als geändert, wenn sie **auf der Seite** steht.
Am 29.07.2026 landete eine Textkorrektur in einem Feld, das nie gerendert wird:
Der Diff war richtig, die Seite zeigte weiter den alten Satz, und ein Unit-Test
auf den String hätte es nicht gefunden — der String existierte ja. Deshalb:
Jede korrigierte Rechtsaussage bekommt einen **Browser-Test**, der die Stelle
öffnet und liest, an der ein Nutzer sie sieht (Muster: „Grüngas-Modal nennt den
Geltungsbereich vollständig und sichtbar" in `e2e/waermepumpe.spec.ts`). Ein
Test auf die Konstante allein genügt nicht.

## Protokoll

Sobald eine Prüfung eine ABWEICHUNG ergibt, NICHT sofort handeln, sondern ein
Council spawnen — **drei unabhängige Verifizier-Agenten** (Agent-Tool). Jeder
bekommt NUR die strittige Einzeltatsache (welcher Wert, hinterlegt vs. vermutet
neu) — **nicht** die Schlussfolgerung des Wächters, damit niemand ihr nachläuft:

- **Agent A** — ermittle den aktuell gültigen Wert aus der **Primärquelle**.
- **Agent B** — ermittle ihn aus einer **unabhängigen zweiten Quelle**.
- **Agent C (adversarial)** — versuche aktiv zu **widerlegen**, dass sich etwas
  geändert hat: zeige, dass der hinterlegte Wert noch gilt oder die vermutete
  Zahl falsch/veraltet/missverstanden ist.

Jeder gibt strikt zurück: `BESTÄTIGT <Wert + Quelle + Zitat>` | `WIDERLEGT
<Begründung>` | `UNKLAR`.

**Konsens** = mindestens **2 von 3** bestätigen **denselben** neuen Wert UND
keiner widerlegt ihn mit einer harten Primärquelle.

## Was der Konsens auslöst

- **EEG-Sätze** (mechanisch, eindeutig — feste offizielle Zahl, triviales
  Encoding): **Bei Konsens den Fix SELBST ausführen.** Worktree → `DEFAULT_FEED_IN`
  + `validFrom` + `source` in `lib/feedin-config.ts` auf die bestätigten Sätze,
  die Berechnungslogik-Zeilen in `CLAUDE.md` mitziehen → `npm run build` +
  `npm test` müssen grün sein → auf `main` mergen + pushen → Worktree auflösen.
  Bei KEINEM Konsens: nichts ändern.
- **Förderung — sichere Richtung (Abschalten): bei Konsens SELBST ausführen.**
  Wenn ein Programm aktuell abzieht (`status: "aktiv"` + strukturierter Satz) und
  das Council bestätigt, dass es NICHT mehr abziehen darf (Topf leer / Programm
  tot / Zielgruppe geändert / Satz gestrichen), dann ist der Fix richtungssicher:
  schlimmstenfalls verstecken wir eine noch existierende Förderung — nie ein
  falsches Geldversprechen. Also Auto-Fix wie beim EEG: Worktree → in
  `lib/funding-programs.ts` den Abzug stoppen (`status` auf
  `eingestellt`/`ausgeschoepft`/`pausiert`, je nach Befund, ODER die
  strukturierten Satz-Felder entfernen), Regressionstest in
  `lib/__tests__/funding-data.test.ts` festschreiben → `npm run build` +
  `npx vitest run` grün → auf `main` mergen + pushen → DB nachziehen
  (`/api/funding/setup?resync=1` + `node scripts/set-funding-verified.mjs $(date +%F) <geprüfte-id …>` — nur die Programme nennen, die in DIESEM Lauf an der Trägerquelle geprüft wurden; `--all` ist dem Voll-Lauf vorbehalten)
  → Worktree auflösen. Encoding-Regel: „eingestellt/ausgeschoepft" (Archiv-Seite
  bleibt) statt „unsicher" (nimmt die Stadtseite auf 404).
- **Förderung — Ermessens-Richtung (Einschalten / Betrag rauf): NICHT selbst
  ändern.** Ein neues `status: "aktiv"`, ein höherer/neuer Satz oder ein
  geänderter Betrag kann live ein Geldversprechen setzen, das nicht stimmt
  (vergebliche Anträge, falsche Amortisation, Haftung). Auch bei Konsens nur
  **hoch-konfidenten Vorschlag** mailen — der Mensch entscheidet Feld + „aktiv vs.
  unsicher".
- **CO2-Preis, Wärmepumpe** (Ermessen — welcher Anker, welcher Korridorwert):
  **nicht selbst ändern.** Auch bei Konsens nur einen **hoch-konfidenten
  Vorschlag** mailen.
- **Kein Konsens** (gespalten/unklar): nur melden, klar als **unsicher**
  kennzeichnen, Einzelstimmen + Quellen mitschicken.

## In die Mail

Immer das Council-Ergebnis aufnehmen — `Council: 3/3 bestätigt` /
`2/3, 1 unklar` / `gespalten`, mit Quelle je Stimme. Bei EEG-Auto-Fix den
Commit/Diff anhängen: „automatisch übernommen (Council-Konsens), bitte nachsehen".

**Warum EEG + Förder-Abschaltung auto-fixen, der Rest nicht:** Beim EEG ist die
*Zahl* eindeutig und das *Encoding* trivial. Bei der Förderung ist die
*Abschalt-Richtung* richtungssicher — ein Fehler kann dort nur eine echte
Förderung verstecken, nie eine falsche versprechen; deshalb darf sie sich selbst
fixen. Die *Einschalt-Richtung* (neues „aktiv", höherer Satz) und CO2/WP können
selbst bei korrekt bestätigter Zahl ein Encoding-/Ermessens-Urteil verlangen und
ein falsches Geldversprechen setzen — das bleibt beim Menschen.
