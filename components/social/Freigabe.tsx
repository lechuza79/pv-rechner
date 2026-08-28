"use client";

import { useState } from "react";
import { v, space, pad } from "../../lib/theme";
import { IconCheck, IconClose, IconLock } from "../Icons";
import {
  BEFUND_MIN_ZEICHEN,
  NOETIGE_PRUEFUNGEN,
  pruefBeschreibung,
  pruefeBefund,
  urteil,
  type PruefArt,
  type Pruefung,
} from "../../lib/social-pruefung-kern";
import { regelnFuer } from "../../lib/redaktionsplan";
import type { Befund as MechanikBefund } from "../../lib/social-mechanik";

// Die Freigabe erteilen — die Stelle, an der ein Mensch für eine konkrete
// Fassung geradesteht.
//
// EINE PRÜFUNG GILT DER FASSUNG, NICHT DEM BEITRAG. Deshalb steht der Abdruck
// dessen, was gerade auf dem Bildschirm steht, in jeder Anfrage, und deshalb
// verfällt eine Freigabe, sobald sich Text oder Bild bewegen. Der Prüfstand
// darüber zeigt das ohnehin schon; hier kommt nur dazu, dass man ihn setzen
// kann.
//
// UNGESPEICHERTES LÄSST SICH NICHT FREIGEBEN. Der Redaktionstisch ist ein
// Entwurf, bis jemand ihn ablegt — die Senderoute baut den Text später aus der
// ABLAGE neu, nicht aus dem Browser. Eine Freigabe auf einen ungespeicherten
// Entwurf zeigte auf eine Fassung, die es nirgends gibt; sie würde beim Senden
// abgewiesen, aber das ist zwei Schritte zu spät. Dieselbe Regel wie beim
// Farbumschalter: Die Ansicht darf nichts zeigen, was nicht in der Ablage steht.
//
// KEIN HÄKCHEN OHNE BEFUND. Eine Freigabe ohne Klartext hielte fest, dass jemand
// geklickt hat, nicht was er angesehen hat — dieselbe Fehlerklasse wie ein
// Prüfdatum ohne Prüfung. Bei „nicht bestanden" ist der Befund die ganze
// Aussage.

export function Freigabe({
  postId,
  abdruck,
  gilt,
  befunde,
  pruefungen,
  onErteilt,
  gesperrt,
}: {
  postId: string;
  /**
   * Abdruck der ABGELEGTEN Fassung, vom Server gerechnet.
   *
   * Wird beim Erteilen mitgeschickt und dort gegen den serverseitig neu
   * gerechneten gehalten. Der Browser hasht nichts mehr selbst — eine
   * Prüfsumme, die an zwei Orten laufen muss, ist nur so stark wie der
   * schwächere Ort, und der war hier eine 32-Bit-Funktion von Hand.
   */
  abdruck: string;
  /**
   * Steht auf dem Bildschirm noch die abgelegte Fassung?
   *
   * Ist sie es nicht, gehört das Urteil zu keinem Abdruck, den es gibt. Dann
   * wird weder gezeigt noch erteilt — ohne dafür im Browser rechnen zu müssen.
   */
  gilt: boolean;
  /**
   * Was die Maschine an dieser Fassung festgestellt hat.
   *
   * Serverseitig gerechnet und bei jedem Aufruf frisch — nicht auf Knopfdruck.
   * Sperren verhindern den Versand; Hinweise sind Urteile über die Welt und
   * bleiben bei dem, der sie beurteilen kann.
   */
  befunde: MechanikBefund[];
  pruefungen: Pruefung[];
  onErteilt: (p: Pruefung) => void;
  /** Grund, warum gerade nicht freigegeben werden darf. Leer = frei. */
  gesperrt?: string;
}) {
  const [offen, setOffen] = useState<PruefArt | null>(null);
  const [befund, setBefund] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  // Gilt der Bildschirm nicht der abgelegten Fassung, gibt es keinen Abdruck,
  // gegen den geurteilt werden könnte — dann zählt nichts als vorliegend.
  const stand = gilt
    ? urteil(abdruck, pruefungen)
    : ({ ok: false, grund: "Ungespeicherte Änderung — die Freigabe gilt der abgelegten Fassung." } as const);

  /** Was für DIESE Fassung vorliegt — nicht, was je vorlag. */
  const fuerDieseFassung = (art: PruefArt) =>
    gilt ? pruefungen.find((p) => p.art === art && p.fassung_fingerabdruck === abdruck) : undefined;
  const fuerAeltere = (art: PruefArt) =>
    pruefungen.some((p) => p.art === art && p.fassung_fingerabdruck !== abdruck);

  async function erteilen(art: PruefArt, bestanden: boolean) {
    const befundUrteil = pruefeBefund(befund);
    if (!befundUrteil.ok) {
      setStatus(befundUrteil.grund);
      return;
    }
    setLaeuft(true);
    setStatus(null);
    try {
      const res = await fetch("/api/social/pruefung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, art, bestanden, befund, fassung: abdruck }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; pruefung?: Pruefung };
      if (!res.ok || !j.pruefung) {
        setStatus(
          res.status === 401
            ? "Nicht gespeichert — die Anmeldung ist abgelaufen."
            : `Nicht gespeichert: ${j.error ?? res.status}`,
        );
        return;
      }
      onErteilt(j.pruefung);
      setBefund("");
      setOffen(null);
      setStatus(null);
    } catch (e) {
      setStatus(`Nicht gespeichert: ${(e as Error).message}`);
    } finally {
      setLaeuft(false);
    }
  }

  const knopf = (aktiv: boolean, farbe: string) =>
    ({
      padding: pad("xs", "md"),
      borderRadius: v("--radius-sm"),
      border: `1px solid ${aktiv ? farbe : v("--color-border")}`,
      background: "transparent",
      color: aktiv ? farbe : v("--color-text-muted"),
      cursor: aktiv ? "pointer" : "default",
      fontSize: v("--font-size-small"),
      fontWeight: 600,
      display: "inline-flex",
      alignItems: "center",
      gap: space.xs,
    }) as const;

  return (
    <div
      style={{
        marginTop: space.lg,
        borderRadius: v("--radius-sm"),
        background: v("--color-bg-muted"),
        padding: pad("md", "md"),
      }}
    >
      <div
        style={{
          fontSize: v("--font-size-small"),
          color: stand.ok ? v("--color-positive-text") : v("--color-text-secondary"),
          marginBottom: space.sm,
          display: "flex",
          alignItems: "center",
          gap: space.xs,
        }}
      >
        {stand.ok ? <IconCheck size={14} /> : <IconLock size={14} />}
        <span>{stand.ok ? "Freigegeben — Text und Bild geprüft." : stand.grund}</span>
      </div>

      {/* Was die MASCHINE festgestellt hat — vor allem Menschlichen.
          Eine Sperre verhindert den Versand, unabhängig von jeder Freigabe:
          Es hat keinen Sinn, jemanden auf einen Beitrag zu schicken, dessen
          Zahlen sich schon untereinander widersprechen. */}
      {befunde.filter((b) => b.schwere === "sperre").map((b, i) => (
        <div
          key={`sperre-${i}`}
          style={{
            fontSize: v("--font-size-small"),
            color: v("--color-negative"),
            marginBottom: space.xs,
            display: "flex",
            gap: space.xs,
            alignItems: "flex-start",
          }}
        >
          <IconClose size={14} style={{ flex: "0 0 auto", marginTop: 2 }} />
          <span>{b.text}</span>
        </div>
      ))}
      {befunde.filter((b) => b.schwere === "hinweis").map((b, i) => (
        <div
          key={`hinweis-${i}`}
          style={{
            fontSize: v("--font-size-caption"),
            color: v("--color-text-muted"),
            marginBottom: space.xxs,
          }}
        >
          {b.text}
        </div>
      ))}

      {gesperrt ? (
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), margin: 0 }}>{gesperrt}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
          {NOETIGE_PRUEFUNGEN.map((art) => {
            const b = pruefBeschreibung(art);
            const da = fuerDieseFassung(art);
            const veraltet = !da && fuerAeltere(art);
            const dieses = offen === art;
            return (
              <div key={art} style={{ borderTop: `1px solid ${v("--color-border-muted")}`, paddingTop: space.sm }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: space.sm, flexWrap: "wrap" }}>
                  <span style={{ fontSize: v("--font-size-small"), fontWeight: 600, flex: "1 1 auto" }}>{b.name}</span>
                  <span
                    style={{
                      fontSize: v("--font-size-caption"),
                      color: da
                        ? da.bestanden
                          ? v("--color-positive-text")
                          : v("--color-negative")
                        : v("--color-text-muted"),
                    }}
                  >
                    {da
                      ? da.bestanden
                        ? "bestanden"
                        : "nicht bestanden"
                      : veraltet
                        ? "galt einer älteren Fassung"
                        : "offen"}
                  </span>
                  <button
                    type="button"
                    aria-expanded={dieses}
                    onClick={() => {
                      setOffen(dieses ? null : art);
                      setBefund(dieses ? "" : (da?.befund ?? ""));
                      setStatus(null);
                    }}
                    style={{
                      padding: pad("xs", "md"),
                      borderRadius: v("--radius-sm"),
                      border: `1px solid ${v("--color-border")}`,
                      background: "transparent",
                      color: v("--color-text-secondary"),
                      cursor: "pointer",
                      fontSize: v("--font-size-caption"),
                    }}
                  >
                    {dieses ? "Schließen" : da ? "Neu prüfen" : "Prüfen"}
                  </button>
                </div>

                {/* Der Befund der geltenden Prüfung bleibt sichtbar, auch wenn
                    das Formular zu ist: Er ist die Aussage, nicht ihr Beiweg. */}
                {da && !dieses && (
                  <p
                    style={{
                      fontSize: v("--font-size-caption"),
                      color: v("--color-text-muted"),
                      margin: 0,
                      marginTop: space.xxs,
                    }}
                  >
                    {da.befund}
                  </p>
                )}

                {dieses && (
                  <div style={{ marginTop: space.sm }}>
                    <p style={{ fontSize: v("--font-size-small"), margin: 0 }}>{b.frage}</p>
                    <p
                      style={{
                        fontSize: v("--font-size-caption"),
                        color: v("--color-text-muted"),
                        margin: 0,
                        marginTop: space.xxs,
                      }}
                    >
                      Nicht mitgeprüft: {b.nichtGeprueft}
                    </p>

                    {/* Die Prüfliste kommt aus dem Redaktionsplan, nicht von
                        hier — eine zweite Fassung derselben Regeln wäre die
                        Stelle, an der eine Regel eines Tages fehlt. */}
                    <ul
                      style={{
                        fontSize: v("--font-size-caption"),
                        color: v("--color-text-secondary"),
                        margin: 0,
                        marginTop: space.sm,
                        paddingLeft: space.lg,
                      }}
                    >
                      {regelnFuer(art).map((r) => (
                        <li key={r.regel} style={{ marginBottom: space.xxs }}>
                          {r.regel}
                        </li>
                      ))}
                    </ul>

                    <label
                      htmlFor={`befund-${postId}-${art}`}
                      style={{
                        display: "block",
                        fontSize: v("--font-size-caption"),
                        color: v("--color-text-muted"),
                        marginTop: space.md,
                        marginBottom: space.xxs,
                      }}
                    >
                      Befund — was hast du angesehen, und was kam dabei heraus?
                    </label>
                    <textarea
                      id={`befund-${postId}-${art}`}
                      value={befund}
                      onChange={(e) => setBefund(e.target.value)}
                      rows={3}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: pad("sm", "sm"),
                        borderRadius: v("--radius-sm"),
                        border: `1px solid ${v("--color-border")}`,
                        background: v("--color-bg"),
                        color: v("--color-text-primary"),
                        fontSize: v("--font-size-small"),
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        gap: space.sm,
                        marginTop: space.sm,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        disabled={laeuft}
                        onClick={() => erteilen(art, true)}
                        style={knopf(!laeuft, v("--color-positive-text"))}
                      >
                        <IconCheck size={14} /> Bestanden
                      </button>
                      <button
                        type="button"
                        disabled={laeuft}
                        onClick={() => erteilen(art, false)}
                        style={knopf(!laeuft, v("--color-negative"))}
                      >
                        <IconClose size={14} /> Nicht bestanden
                      </button>
                      <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
                        mindestens {BEFUND_MIN_ZEICHEN} Zeichen
                      </span>
                    </div>
                    {status && (
                      <p
                        style={{
                          fontSize: v("--font-size-caption"),
                          color: v("--color-negative"),
                          margin: 0,
                          marginTop: space.xs,
                        }}
                      >
                        {status}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
