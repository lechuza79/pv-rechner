"use client";

import { useState } from "react";
import { v, space, pad } from "../../lib/theme";
import { DetailAbschnitt } from "../admin/DetailAbschnitt";

// Ein neues Thema prüfen, bevor es in den Plan kommt.
//
// Der Sinn ist nicht Bequemlichkeit, sondern eine Reihenfolge: Wer ein Thema
// vorschlägt, sieht Zahlen UND Trefferliste, bevor er es aufnimmt. Das Projekt
// hat sich einmal ein Thema mit 1.900 Suchen als größte Chance notiert, ohne
// die Ergebnisseite anzusehen — dort standen amtliche Werkzeuge, also eine
// andere Frage, und wir kamen auf fünf Einblendungen in vier Wochen.
//
// Das Ergebnis wird NICHT gespeichert. Die Aufnahme in den Plan bleibt ein
// Commit; nur so prüft ein Test, dass jede Zahl ihr Erhebungsdatum trägt.

interface Begriff {
  begriff: string;
  volumen: number | null;
  schwierigkeit: number | null;
  klickpreis: number | null;
  absicht: string | null;
}

interface Treffer {
  platz: number;
  domain: string;
  titel: string;
}

interface Ergebnis {
  gemessenAm: string;
  begriffe: Begriff[];
  gesamtVolumen: number;
  trefferlisteFuer: string | null;
  kiAntwortDavor: boolean;
  auszugDavor: boolean;
  trefferliste: Treffer[];
}

const ABSICHT: Record<string, string> = {
  informational: "will etwas wissen",
  commercial: "vergleicht vor dem Kauf",
  transactional: "will kaufen",
  navigational: "sucht eine bestimmte Seite",
};

function n(x: number | null): string {
  return x === null ? "—" : x.toLocaleString("de-DE");
}

export function ThemaPruefen() {
  const [eingabe, setEingabe] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  async function pruefen() {
    const begriffe = eingabe
      .split("\n")
      .map((z) => z.trim())
      .filter(Boolean);
    if (begriffe.length === 0) return;
    setLaeuft(true);
    setFehler(null);
    try {
      const res = await fetch("/api/admin/artikelplan/pruefen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ begriffe }),
      });
      const daten = await res.json();
      if (!res.ok) setFehler(daten?.fehler ?? "Die Prüfung ist fehlgeschlagen.");
      else setErgebnis(daten as Ergebnis);
    } catch {
      setFehler("Die Prüfung war nicht erreichbar.");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div>
      <textarea
        value={eingabe}
        onChange={(e) => setEingabe(e.target.value)}
        rows={3}
        placeholder={"Suchbegriffe, einer je Zeile — so wie ein Nutzer sie tippt"}
        style={{
          width: "100%",
          maxWidth: 620,
          font: "inherit",
          fontSize: v("--font-size-body"),
          padding: pad("sm", "md"),
          border: `1px solid ${v("--color-border")}`,
          borderRadius: v("--radius-sm"),
          background: v("--color-bg"),
          color: v("--color-text-primary"),
          resize: "vertical",
        }}
      />
      <div style={{ marginTop: space.sm }}>
        <button
          type="button"
          onClick={pruefen}
          disabled={laeuft || !eingabe.trim()}
          style={{
            font: "inherit",
            fontSize: v("--font-size-body"),
            color: laeuft ? v("--color-text-muted") : v("--color-accent"),
            background: "none",
            border: `1px solid ${v("--color-border-muted")}`,
            borderRadius: v("--radius-sm"),
            padding: pad("xs", "md"),
            cursor: laeuft || !eingabe.trim() ? "default" : "pointer",
          }}
        >
          {laeuft ? "prüft …" : "Prüfen"}
        </button>
      </div>

      {fehler && (
        <p style={{ color: v("--color-negative"), marginTop: space.sm }}>{fehler}</p>
      )}

      {ergebnis && (
        <div style={{ marginTop: space.xl }}>
          <DetailAbschnitt titel="Nachfrage" erster>
            <table style={{ borderCollapse: "collapse", fontSize: v("--font-size-body") }}>
              <thead>
                <tr style={{ color: v("--color-text-muted"), textAlign: "left" }}>
                  <th style={{ paddingRight: space.lg, fontWeight: 400 }}>Begriff</th>
                  <th style={{ paddingRight: space.lg, fontWeight: 400 }}>Suchen/Mo</th>
                  <th style={{ paddingRight: space.lg, fontWeight: 400 }}>Schwierigkeit</th>
                  <th style={{ paddingRight: space.lg, fontWeight: 400 }}>Klickpreis</th>
                  <th style={{ fontWeight: 400 }}>Absicht</th>
                </tr>
              </thead>
              <tbody>
                {ergebnis.begriffe.map((b) => (
                  <tr key={b.begriff}>
                    <td style={{ paddingRight: space.lg }}>{b.begriff}</td>
                    <td style={{ paddingRight: space.lg }}>{n(b.volumen)}</td>
                    <td style={{ paddingRight: space.lg }}>{n(b.schwierigkeit)}</td>
                    <td style={{ paddingRight: space.lg }}>
                      {b.klickpreis === null ? "—" : `${b.klickpreis.toFixed(2)} €`}
                    </td>
                    <td style={{ color: v("--color-text-muted") }}>
                      {b.absicht ? (ABSICHT[b.absicht] ?? b.absicht) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: space.sm, marginBottom: 0 }}>
              zusammen {ergebnis.gesamtVolumen.toLocaleString("de-DE")} Suchen im Monat · gemessen
              am {new Date(ergebnis.gemessenAm).toLocaleDateString("de-DE")}
            </p>
          </DetailAbschnitt>

          {(ergebnis.kiAntwortDavor || ergebnis.auszugDavor) && (
            <DetailAbschnitt titel="Achtung">
              <p style={{ margin: 0, color: v("--color-negative") }}>
                {ergebnis.kiAntwortDavor
                  ? "Über den Treffern steht eine KI-Antwort. Google beantwortet die Frage selbst — eine gute Platzierung bringt hier Einblendungen und kaum Besucher."
                  : "Über den Treffern steht ein hervorgehobener Auszug. Ein Teil der Klicks wird dort abgefangen."}
              </p>
            </DetailAbschnitt>
          )}

          {ergebnis.trefferliste.length > 0 && (
            <DetailAbschnitt titel={`Wer dort steht — „${ergebnis.trefferlisteFuer}"`}>
              <p style={{ marginTop: 0, color: v("--color-text-muted") }}>
                Die entscheidende Frage ist nicht die Zahl daneben, sondern: Beantworten diese
                Seiten dieselbe Frage wie wir — und können wir es besser?
              </p>
              <ol style={{ margin: 0, paddingLeft: space.lg }}>
                {ergebnis.trefferliste.map((t) => (
                  <li key={`${t.platz}-${t.domain}`} style={{ marginBottom: space.xs }}>
                    <strong style={{ fontWeight: 600 }}>{t.domain}</strong>{" "}
                    <span style={{ color: v("--color-text-muted") }}>— {t.titel}</span>
                  </li>
                ))}
              </ol>
            </DetailAbschnitt>
          )}

          <DetailAbschnitt titel="Aufnehmen">
            <p style={{ margin: 0, color: v("--color-text-muted") }}>
              Nur angesehen, nichts gespeichert. Wenn das Thema taugt, kommt es mit diesen Zahlen
              und einer Begründung in den Plan — das bleibt ein Commit, damit die Prüfungen greifen.
            </p>
          </DetailAbschnitt>
        </div>
      )}
    </div>
  );
}
