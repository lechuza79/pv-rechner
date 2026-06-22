# Council-Verifikation bei Wächter-Abweichung

**Zweck:** Bevor eine vom Wächter gefundene Abweichung umgesetzt oder als
belastbar gemeldet wird, lassen wir sie von **mehreren unabhängigen Agenten**
gegenprüfen. So schiebt kein einzelner — womöglich falsch gelesener —
Rechercheschritt einen falschen Wert in Production. Greift bei JEDER Abweichung
in den Verify-Wächtern (EEG, CO2, Wärmepumpe, Förderung).

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
- **CO2-Preis, Wärmepumpe, Förderung** (Ermessen — das Encoding braucht ein
  Urteil: welcher Anker, welcher Korridorwert, welches Feld, „aktiv vs.
  unsicher"): **nicht selbst ändern.** Auch bei Konsens nur einen
  **hoch-konfidenten Vorschlag** mailen.
- **Kein Konsens** (gespalten/unklar): nur melden, klar als **unsicher**
  kennzeichnen, Einzelstimmen + Quellen mitschicken.

## In die Mail

Immer das Council-Ergebnis aufnehmen — `Council: 3/3 bestätigt` /
`2/3, 1 unklar` / `gespalten`, mit Quelle je Stimme. Bei EEG-Auto-Fix den
Commit/Diff anhängen: „automatisch übernommen (Council-Konsens), bitte nachsehen".

**Warum nur EEG auto-fixt:** Dort ist sowohl die *Zahl* eindeutig (Bundesnetz-
agentur-Bekanntgabe) als auch das *Encoding* trivial (vier Sätze + Datum). Bei
CO2/WP/Förderung kann selbst eine korrekt bestätigte Zahl ein Encoding-Urteil
verlangen — das bleibt beim Menschen.
