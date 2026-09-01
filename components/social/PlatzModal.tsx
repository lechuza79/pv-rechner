"use client";

import { useState } from "react";
import Modal from "../Modal";
import OptionCard from "../OptionCard";
import { SocialKarte } from "./SocialKarte";
import { v, space, pad } from "../../lib/theme";
import type { PostBild } from "../../lib/social-posts";

// Einen Kalendertag belegen.
//
// GEORDNET WIE DER KATALOG, nicht nach dem Zustand eines Beitrags. Die erste
// Fassung fragte zuerst „fertig oder noch nicht" („Aus dem Bestand" gegen
// „Datengeschichte") — das ist die Frage des Systems, nicht die des Planenden.
// Wer einen Dienstag belegt, denkt zuerst „was für eine Sorte Beitrag", und
// erst danach, ob es den schon gibt. Also: fünf Sorten, darunter die
// Unterkategorien, und der fertige Beitrag steht bei seiner Unterkategorie.
//
// Der Baustein baut NICHTS selbst: Beiträge kommen aus dem Bestand, die
// Unterkategorien aus dem Redaktionsplan, die Ratgeber aus der Registry, die
// Widgets aus dem Widget-Register. Eine eigene Liste hier wäre eine zweite
// Wahrheit.
//
// WAS AUF DEM PLATZ LANDET, hängt daran, ob es den Beitrag schon gibt:
//   ein fertiger Beitrag  → der Platz zeigt auf IHN und kann gesendet werden
//   eine Unterkategorie   → der Platz ist ein Vorhaben: hier entsteht etwas
// Beides sieht im Kalender verschieden aus, und das ist der Punkt.

export type PlatzWahl = {
  posts: {
    id: string;
    titel: string;
    sendbar: boolean;
    /** Schlüssel der Unterkategorie, zu der der Beitrag gehört. */
    familie: string;
    /** Für die Vorschau im Dialog. */
    bild: PostBild | null;
  }[];
  familien: { schluessel: string; name: string; zustand: string; bereich: string }[];
  ratgeber: { slug: string; titel: string }[];
  widgets: { id: string; titel: string }[];
};

/**
 * Die fünf Sorten, aus denen sich ein Platz füllen lässt.
 *
 * Die Schlüssel sind die Bereiche des Redaktionsplans — die eine Wahrheit —,
 * die Beschriftungen sind länger als dort. Das ist kein Doppel: In der
 * Navigationsleiste muss ein Bereich mit EINEM Wort auskommen, sonst bricht sie;
 * in einem Auswahldialog darf und soll dastehen, was gemeint ist.
 *
 * „widget" ist kein Bereich des Katalogs, weil dort keine Geschichten-Familien
 * dafür liegen — die Unterkategorien kommen aus dem Widget-Register. Ein
 * fünfter Bereich ohne eine einzige Familie wäre eine leere Spalte in jeder
 * anderen Ansicht.
 */
const SORTEN = [
  { schluessel: "daten", name: "Datenstories", unter: "aus dem Datenkatalog" },
  { schluessel: "ratgeber", name: "Ratgeber & Redaktion", unter: "Artikel und Textformate" },
  { schluessel: "ux", name: "UX-Beispiel", unter: "aus der eigenen Werkstatt" },
  { schluessel: "feature", name: "Feature-Vorstellung", unter: "ein fertiges Werkzeug" },
  { schluessel: "widget", name: "Widget", unter: "einbettbare Charts" },
] as const;

type Sorte = (typeof SORTEN)[number]["schluessel"];

/** Breite der Bildvorschau im Dialog. Die kleine Kartenstufe ist dafür gebaut. */
const VORSCHAU_BREITE = 260;

/** Was gewählt wurde: ein fertiger Beitrag oder ein Vorhaben. */
type Ziel =
  | { art: "post"; id: string }
  | { art: "familie"; schluessel: string }
  | { art: "artikel"; slug: string }
  | { art: "widget"; id: string };

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
  const [sorte, setSorte] = useState<Sorte | null>(null);
  const [ziel, setZiel] = useState<Ziel | null>(null);
  const [titel, setTitel] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  function schliessen() {
    setSorte(null);
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
        body: JSON.stringify(loeschen ? { datum, loeschen: true } : { datum, ...nutzlast(ziel, titel) }),
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

  const gewaehlterPost =
    ziel?.art === "post" ? wahl.posts.find((p) => p.id === ziel.id) : undefined;
  // Ein Vorhaben braucht einen Arbeitstitel, ein fertiger Beitrag hat einen.
  const brauchtTitel = ziel?.art === "familie" || ziel?.art === "widget";
  const bereit = !!ziel && (!brauchtTitel || !!titel.trim() || ziel.art === "widget");

  return (
    <Modal open={offen} onClose={schliessen} title={tagText} maxWidth={640}>
      {!sorte ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: space.sm }}>
          {SORTEN.map((s) => (
            <OptionCard
              key={s.schluessel}
              selected={false}
              onClick={() => setSorte(s.schluessel)}
              label={s.name}
              sub={s.unter}
            />
          ))}
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => {
              setSorte(null);
              setZiel(null);
              setTitel("");
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

          <Inhalt sorte={sorte} wahl={wahl} ziel={ziel} onZiel={setZiel} />

          {brauchtTitel && ziel?.art === "familie" && (
            <Titelfeld wert={titel} onWert={setTitel} hinweis="Arbeitstitel (leer = Name der Kategorie)" />
          )}
        </div>
      )}

      {/* Die Vorschau zeigt, was am Tag wirklich im Feed steht. Bei einem
          Vorhaben gibt es nichts zu zeigen — dort wäre ein Platzhalterbild eine
          Behauptung über etwas, das noch niemand gebaut hat. */}
      {gewaehlterPost?.bild && (
        <div style={{ marginTop: space.md, display: "flex", justifyContent: "center" }}>
          {/* Der Maßstab steuert nur die BREITE — die kleine Stufe setzt ihre
              Schriftgrößen absolut. Ohne ihn stünde die Karte in voller
              Feed-Breite da und liefe aus dem Dialog heraus. */}
          <SocialKarte bild={gewaehlterPost.bild} stufe="teaser" skala={VORSCHAU_BREITE / 1080} />
        </div>
      )}

      {fehler && (
        <p style={{ color: v("--color-negative"), fontSize: v("--font-size-small"), marginTop: space.md }}>{fehler}</p>
      )}

      <div style={{ display: "flex", gap: space.sm, marginTop: space.lg, flexWrap: "wrap" }}>
        {sorte && (
          <button
            type="button"
            disabled={laeuft || !bereit}
            onClick={() => speichern()}
            style={{
              padding: pad("xs", "lg"),
              borderRadius: v("--radius-sm"),
              border: "none",
              background: bereit ? v("--color-accent") : v("--color-border"),
              color: bereit ? v("--color-text-on-accent") : v("--color-text-muted"),
              cursor: bereit ? "pointer" : "default",
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

/** Was die Route bekommt. Der Ratgeber- und der Widget-Weg landen dort als Vorhaben. */
function nutzlast(ziel: Ziel | null, titel: string) {
  if (!ziel) return {};
  switch (ziel.art) {
    case "post":
      return { art: "post", postId: ziel.id };
    case "familie":
      return { art: "datenstory", familie: ziel.schluessel, titel };
    case "artikel":
      return { art: "artikel", slug: ziel.slug };
    case "widget":
      return { art: "widget", widget: ziel.id };
  }
}

/**
 * Die zweite Ebene: Unterkategorien mit ihren fertigen Beiträgen darunter.
 *
 * EINE Liste mit Zwischenüberschriften statt einer dritten Klickebene. Drei
 * Ebenen in einem Dialog heißt: zweimal klicken, bevor man sieht, ob überhaupt
 * etwas da ist — und in den meisten Unterkategorien ist genau ein Beitrag oder
 * keiner.
 */
function Inhalt({
  sorte,
  wahl,
  ziel,
  onZiel,
}: {
  sorte: Sorte;
  wahl: PlatzWahl;
  ziel: Ziel | null;
  onZiel: (z: Ziel) => void;
}) {
  if (sorte === "widget") {
    return (
      <>
        <Notiz>Reine Planung: Der Platz merkt sich das Widget, gebaut ist damit nichts.</Notiz>
        <Rollflaeche>
          {wahl.widgets.map((w) => (
            <Zeile
              key={w.id}
              an={ziel?.art === "widget" && ziel.id === w.id}
              onClick={() => onZiel({ art: "widget", id: w.id })}
              text={w.titel}
            />
          ))}
        </Rollflaeche>
      </>
    );
  }

  const familien = wahl.familien.filter((f) => f.bereich === sorte && f.zustand !== "spaeter");

  return (
    <Rollflaeche>
      {familien.map((f) => {
        const posts = wahl.posts.filter((p) => p.familie === f.schluessel);
        return (
          <div key={f.schluessel}>
            <Gruppe name={f.name} zusatz={zustandsText(f.zustand)} />
            {posts.map((p) => (
              <Zeile
                key={p.id}
                an={ziel?.art === "post" && ziel.id === p.id}
                onClick={() => onZiel({ art: "post", id: p.id })}
                text={p.titel}
                zusatz={p.sendbar ? "sendbar" : "noch gesperrt"}
                gedaempft={!p.sendbar}
                eingerueckt
              />
            ))}
            <Zeile
              an={ziel?.art === "familie" && ziel.schluessel === f.schluessel}
              onClick={() => onZiel({ art: "familie", schluessel: f.schluessel })}
              text={posts.length ? "weiteren Beitrag vorsehen" : "als Vorhaben planen"}
              gedaempft
              eingerueckt
            />
          </div>
        );
      })}

      {/* Die Ratgeber-Artikel gehören zur redaktionellen Sorte, kommen aber aus
          der Registry und nicht aus dem Katalog — sie sind veröffentlichte
          Seiten, keine Geschichten-Familien. */}
      {sorte === "ratgeber" && wahl.ratgeber.length > 0 && (
        <div>
          <Gruppe name="Artikel featuren" zusatz={`${wahl.ratgeber.length}`} />
          {wahl.ratgeber.map((r) => (
            <Zeile
              key={r.slug}
              an={ziel?.art === "artikel" && ziel.slug === r.slug}
              onClick={() => onZiel({ art: "artikel", slug: r.slug })}
              text={r.titel}
              eingerueckt
            />
          ))}
        </div>
      )}
    </Rollflaeche>
  );
}

function zustandsText(zustand: string): string {
  if (zustand === "gebaut") return "gebaut";
  if (zustand === "daten-da") return "Daten da";
  return "Daten fehlen";
}

function Notiz({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: 0 }}>{children}</p>
  );
}

function Rollflaeche({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.xxs, maxHeight: 320, overflowY: "auto" }}>
      {children}
    </div>
  );
}

function Gruppe({ name, zusatz }: { name: string; zusatz?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: space.sm,
        fontSize: v("--font-size-caption"),
        color: v("--color-text-muted"),
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginTop: space.sm,
        marginBottom: space.xxs,
      }}
    >
      <span>{name}</span>
      {zusatz && <span>{zusatz}</span>}
    </div>
  );
}

function Zeile({
  an,
  onClick,
  text,
  zusatz,
  gedaempft,
  eingerueckt,
}: {
  an: boolean;
  onClick: () => void;
  text: string;
  zusatz?: string;
  gedaempft?: boolean;
  eingerueckt?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={an}
      onClick={onClick}
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: space.sm,
        width: "100%",
        textAlign: "left",
        marginLeft: eingerueckt ? space.sm : 0,
        marginBottom: space.xxs,
        padding: pad("sm", "md"),
        borderRadius: v("--radius-sm"),
        border: `1px solid ${an ? v("--color-accent") : v("--color-border")}`,
        background: an ? v("--color-accent-dim") : "transparent",
        color: gedaempft && !an ? v("--color-text-muted") : v("--color-text-primary"),
        cursor: "pointer",
        fontSize: v("--font-size-small"),
        fontFamily: "inherit",
        boxSizing: "border-box",
      }}
    >
      <span>{text}</span>
      {zusatz && <span style={{ color: v("--color-text-muted") }}>{zusatz}</span>}
    </button>
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
