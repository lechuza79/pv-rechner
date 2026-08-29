"use client";

import { useState } from "react";
import Modal from "../Modal";
import OptionCard from "../OptionCard";
import { v, space, pad } from "../../lib/theme";

// Einen Kalendertag belegen.
//
// DREI WEGE, und sie unterscheiden sich darin, WORAUF der Platz zeigt:
//
//   Aus dem Bestand — ein fertiger Beitrag. Der Normalfall, und der einzige
//                     Weg, an dessen Ende gesendet werden kann.
//   Datengeschichte — eine Familie aus dem Katalog, aus der noch nichts gebaut
//                     ist. Der Platz sagt: hier entsteht etwas aus DIESEN Daten.
//   Individuell     — ein Thema aus einer freien Kategorie (Feature, UX,
//                     Ratgeber). Dazu gibt es keine Berechnung und keinen
//                     Beitrag; es ist reine Planung, und das steht auch dabei.
//
// Der Baustein baut NICHTS selbst: Die Beiträge kommen aus dem Bestand, die
// Familien aus dem Redaktionsplan, die Ratgeber aus der Registry. Eine vierte
// Liste hier wäre eine zweite Wahrheit.

export type PlatzWahl = {
  posts: { id: string; titel: string; sendbar: boolean }[];
  familien: { schluessel: string; name: string; zustand: string; bereich: string }[];
  ratgeber: { slug: string; titel: string }[];
};

type Weg = "post" | "datenstory" | "individuell" | "artikel";

export function PlatzModal({
  datum,
  offen,
  onClose,
  wahl,
  belegt,
}: {
  /** Der Tag, der belegt wird. Leer = geschlossen. */
  datum: string | null;
  offen: boolean;
  onClose: () => void;
  wahl: PlatzWahl;
  /** Ist der Tag schon belegt? Dann gibt es zusätzlich „freigeben". */
  belegt: boolean;
}) {
  const [weg, setWeg] = useState<Weg | null>(null);
  const [ziel, setZiel] = useState<string | null>(null);
  const [titel, setTitel] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  function schliessen() {
    setWeg(null);
    setZiel(null);
    setTitel("");
    setFehler(null);
    onClose();
  }

  async function speichern(loeschen = false) {
    if (!datum) return;
    setLaeuft(true);
    setFehler(null);
    try {
      const res = await fetch("/api/social/platz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          loeschen
            ? { datum, loeschen: true }
            : {
                datum,
                art: weg,
                ...(weg === "post" ? { postId: ziel } : {}),
                ...(weg === "datenstory" ? { familie: ziel, titel } : {}),
                ...(weg === "artikel" ? { slug: ziel } : {}),
                ...(weg === "individuell" ? { kategorie: ziel, titel } : {}),
              },
        ),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFehler(j.error ?? `Fehler ${res.status}`);
        return;
      }
      // Neu laden statt den Zustand hier nachzuführen: Der Kalender hängt an
      // Warteschlange, Versandprotokoll und Zuweisungen gleichzeitig. Die eine
      // Stelle, die das zusammenrechnet, sitzt auf dem Server — sie hier ein
      // zweites Mal nachzubauen wäre genau die Doppelung, die driftet.
      window.location.reload();
    } catch (e) {
      setFehler((e as Error).message);
    } finally {
      setLaeuft(false);
    }
  }

  const tagText = datum
    ? new Date(`${datum}T12:00:00Z`).toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      })
    : "";

  // Nur die Kategorien, aus denen sich frei etwas planen lässt — Feature, UX,
  // Ratgeber. Die Datenfamilien haben ihren eigenen Weg, weil dort die Zahlen
  // die Aussage tragen und nicht ein Arbeitstitel.
  const freieKategorien = wahl.familien.filter((f) => f.bereich !== "daten");
  const datenFamilien = wahl.familien.filter((f) => f.bereich === "daten" && f.zustand !== "spaeter");

  return (
    <Modal open={offen} onClose={schliessen} title={tagText} maxWidth={620}>
      {!weg ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: space.sm }}>
          <OptionCard
            selected={false}
            onClick={() => setWeg("post")}
            label="Aus dem Bestand"
            sub={`${wahl.posts.filter((p) => p.sendbar).length} sendbar`}
          />
          <OptionCard
            selected={false}
            onClick={() => setWeg("datenstory")}
            label="Datengeschichte"
            sub="neu anlegen"
          />
          <OptionCard selected={false} onClick={() => setWeg("artikel")} label="Ratgeber" sub="featuren" />
          <OptionCard selected={false} onClick={() => setWeg("individuell")} label="Individuell" sub="Feature, UX" />
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => {
              setWeg(null);
              setZiel(null);
              setFehler(null);
            }}
            style={{
              background: "none",
              border: "none",
              color: v("--color-accent"),
              cursor: "pointer",
              fontSize: v("--font-size-small"),
              padding: 0,
              marginBottom: space.md,
            }}
          >
            ← zurück
          </button>

          {weg === "post" && (
            <Liste
              eintraege={wahl.posts.map((p) => ({
                wert: p.id,
                text: p.titel,
                zusatz: p.sendbar ? "sendbar" : "noch gesperrt",
                gedaempft: !p.sendbar,
              }))}
              gewaehlt={ziel}
              onWahl={setZiel}
            />
          )}

          {weg === "datenstory" && (
            <>
              <Liste
                eintraege={datenFamilien.map((f) => ({
                  wert: f.schluessel,
                  text: f.name,
                  zusatz: f.zustand === "gebaut" ? "gebaut" : f.zustand === "daten-da" ? "Daten da" : "Daten fehlen",
                  gedaempft: f.zustand === "fehlt-daten",
                }))}
                gewaehlt={ziel}
                onWahl={setZiel}
              />
              <Titelfeld wert={titel} onWert={setTitel} hinweis="Arbeitstitel (leer = Name der Familie)" />
            </>
          )}

          {weg === "artikel" && (
            <>
              <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: 0 }}>
                Ein Ratgeber, der auf Social aufgegriffen wird. Es entsteht dadurch kein Beitrag —
                der wird an dem Tag noch gebaut.
              </p>
              <Liste
                eintraege={wahl.ratgeber.map((r) => ({ wert: r.slug, text: r.titel }))}
                gewaehlt={ziel}
                onWahl={setZiel}
              />
            </>
          )}

          {weg === "individuell" && (
            <>
              <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: 0 }}>
                Reine Planung: Der Platz merkt sich das Thema, gebaut ist damit nichts.
              </p>
              <Liste
                eintraege={freieKategorien.map((f) => ({ wert: f.schluessel, text: f.name }))}
                gewaehlt={ziel}
                onWahl={setZiel}
              />
              <Titelfeld wert={titel} onWert={setTitel} hinweis="Arbeitstitel" />
            </>
          )}
        </div>
      )}

      {fehler && (
        <p style={{ color: v("--color-negative"), fontSize: v("--font-size-small"), marginTop: space.md }}>{fehler}</p>
      )}

      <div style={{ display: "flex", gap: space.sm, marginTop: space.lg, flexWrap: "wrap" }}>
        {weg && (
          <button
            type="button"
            disabled={laeuft || !ziel || (weg === "individuell" && !titel.trim())}
            onClick={() => speichern()}
            style={{
              padding: pad("xs", "lg"),
              borderRadius: v("--radius-sm"),
              border: "none",
              background: ziel ? v("--color-accent") : v("--color-border"),
              color: ziel ? v("--color-text-on-accent") : v("--color-text-muted"),
              cursor: ziel ? "pointer" : "default",
              fontSize: v("--font-size-small"),
              fontWeight: 600,
            }}
          >
            {laeuft ? "…" : "Platz belegen"}
          </button>
        )}
        {belegt && (
          <button
            type="button"
            disabled={laeuft}
            onClick={() => speichern(true)}
            style={{
              padding: pad("xs", "lg"),
              borderRadius: v("--radius-sm"),
              border: `1px solid ${v("--color-border")}`,
              background: "transparent",
              color: v("--color-text-secondary"),
              cursor: "pointer",
              fontSize: v("--font-size-small"),
            }}
          >
            Platz freigeben
          </button>
        )}
      </div>
    </Modal>
  );
}

function Liste({
  eintraege,
  gewaehlt,
  onWahl,
}: {
  eintraege: { wert: string; text: string; zusatz?: string; gedaempft?: boolean }[];
  gewaehlt: string | null;
  onWahl: (w: string) => void;
}) {
  if (!eintraege.length) {
    return (
      <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
        Hier steht noch nichts zur Auswahl.
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.xxs, maxHeight: 320, overflowY: "auto" }}>
      {eintraege.map((e) => {
        const an = e.wert === gewaehlt;
        return (
          <button
            key={e.wert}
            type="button"
            aria-pressed={an}
            onClick={() => onWahl(e.wert)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: space.sm,
              textAlign: "left",
              padding: pad("sm", "md"),
              borderRadius: v("--radius-sm"),
              border: `1px solid ${an ? v("--color-accent") : v("--color-border")}`,
              background: an ? v("--color-accent-dim") : "transparent",
              color: e.gedaempft ? v("--color-text-muted") : v("--color-text-primary"),
              cursor: "pointer",
              fontSize: v("--font-size-small"),
            }}
          >
            <span>{e.text}</span>
            {e.zusatz && <span style={{ color: v("--color-text-muted") }}>{e.zusatz}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Titelfeld({ wert, onWert, hinweis }: { wert: string; onWert: (w: string) => void; hinweis: string }) {
  return (
    <input
      value={wert}
      onChange={(e) => onWert(e.target.value)}
      placeholder={hinweis}
      style={{
        width: "100%",
        boxSizing: "border-box",
        marginTop: space.sm,
        padding: pad("sm", "sm"),
        borderRadius: v("--radius-sm"),
        border: `1px solid ${v("--color-border")}`,
        background: v("--color-bg"),
        color: v("--color-text-primary"),
        fontSize: v("--font-size-small"),
        fontFamily: "inherit",
      }}
    />
  );
}
