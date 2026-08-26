"use client";

import { useEffect, useState } from "react";
import Modal from "../Modal";
import { SocialKarte } from "./SocialKarte";
import { v, space, pad } from "../../lib/theme";
import type { SocialPost } from "../../lib/social-posts";

// Datengeschichten als Teaser-Reihe; ein Klick öffnet die Geschichte im Fenster
// über der Seite.
//
// SUCHMASCHINEN-BEDINGUNG, die den ganzen Aufbau bestimmt: Der Text jeder
// Geschichte steht von Anfang an im ausgelieferten HTML und wird nur verborgen.
// Er darf NICHT erst beim Öffnen entstehen — im Projekt an den Ausklapp-Menüs
// gemessen: deren Einträge stehen in keinem ausgelieferten Markup und zählen
// als interner Verweis nicht. Wer den Inhalt beim Klick nachlädt, zeigt ihn dem
// Besucher und keiner Suchmaschine.
//
// Deshalb: kein Nachladen, kein bedingtes Rendern der Texte. Das Fenster
// bekommt seinen Inhalt aus derselben Liste, die bereits auf der Seite steht.
//
// KEIN Karussell-Baustein: Bei einer Handvoll Teasern trägt eine Scroll-Reihe
// mit Einrastpunkten dasselbe. Eine Bibliothek lohnt erst mit Endlos-Lauf,
// Automatik und Pfeilen — bis dahin wäre sie Abhängigkeit ohne Gegenwert.

export function StoryTeaser({ stories }: { stories: SocialPost[] }) {
  const [offen, setOffen] = useState<string | null>(null);
  const aktiv = stories.find((s) => s.id === offen) ?? null;

  // Ein Beitrag kann direkt auf eine Geschichte verlinken (…/seite#anker).
  // Dann öffnet sie sich beim Ankommen, statt dass jemand sie suchen muss.
  useEffect(() => {
    const ausAnker = () => {
      const anker = window.location.hash.replace("#", "");
      if (!anker) return;
      const treffer = stories.find((s) => s.onsite?.anker === anker);
      if (treffer) setOffen(treffer.id);
    };
    ausAnker();
    window.addEventListener("hashchange", ausAnker);
    return () => window.removeEventListener("hashchange", ausAnker);
  }, [stories]);

  const nutzbar = stories.filter((s) => s.onsite && s.bild);
  if (!nutzbar.length) return null;

  return (
    <section style={{ margin: `${space.huge}px 0` }}>
      <h2 style={{ fontSize: v("--font-size-h2"), marginBottom: space.xs }}>Aus unseren Daten</h2>
      <p style={{ color: v("--color-text-secondary"), marginTop: 0, marginBottom: space.lg }}>
        Auswertungen aus dem Anlagenregister — gerechnet, nicht geschätzt.
      </p>

      <div
        style={{
          display: "flex",
          gap: space.lg,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBottom: space.sm,
          // Die Reihe darf über den Textrand hinauslaufen, sonst wirkt sie
          // beschnitten, wo sie eigentlich weitergeht.
          marginInline: `calc(-1 * ${space.md}px)`,
          paddingInline: space.md,
        }}
      >
        {nutzbar.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setOffen(s.id)}
            style={{
              flex: "0 0 auto",
              width: 280,
              scrollSnapAlign: "start",
              textAlign: "left",
              cursor: "pointer",
              background: v("--color-bg-muted"),
              border: `1px solid ${v("--color-border-muted")}`,
              borderRadius: v("--radius-md"),
              padding: pad("lg", "lg"),
              color: "inherit",
              font: "inherit",
            }}
          >
            <div style={{ fontSize: v("--font-size-h3"), fontWeight: 600, lineHeight: 1.3, marginBottom: space.xs }}>
              {s.onsite!.ueberschrift}
            </div>
            <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), lineHeight: 1.45 }}>
              {s.onsite!.absaetze[0].slice(0, 110)}…
            </div>
            <div style={{ fontSize: v("--font-size-small"), color: v("--color-accent"), marginTop: space.sm }}>
              Ansehen
            </div>
          </button>
        ))}
      </div>

      {/* Die Texte stehen hier im Markup und sind nur verborgen — genau das ist
          der Unterschied zu nachgeladenem Inhalt. Für Suchmaschinen ist das
          Text der Seite; für den Besucher liegt er im Fenster. */}
      <div hidden>
        {nutzbar.map((s) => (
          <article key={s.id} id={s.onsite!.anker}>
            <h3>{s.onsite!.ueberschrift}</h3>
            {s.onsite!.absaetze.map((a) => (
              <p key={a.slice(0, 40)}>{a}</p>
            ))}
          </article>
        ))}
      </div>

      <Modal open={!!aktiv} onClose={() => setOffen(null)} title={aktiv?.onsite?.ueberschrift ?? ""} maxWidth={720}>
        {aktiv && (
          <>
            <div style={{ marginBottom: space.xl }}>
              <SocialKarte bild={aktiv.bild!} skala={0.3} />
            </div>
            {aktiv.onsite!.absaetze.map((a) => (
              <p key={a.slice(0, 40)} style={{ fontSize: v("--font-size-body"), lineHeight: 1.6 }}>
                {a}
              </p>
            ))}
          </>
        )}
      </Modal>
    </section>
  );
}
