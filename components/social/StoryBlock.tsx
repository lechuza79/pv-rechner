import { SocialKarte } from "./SocialKarte";
import { v, space, pad } from "../../lib/theme";
import type { OnsiteFassung, PostBild } from "../../lib/social-posts";

// Eine Datengeschichte als Block auf einer bestehenden Seite.
//
// WARUM KEIN OVERLAY UND KEIN NACHLADEN: Ein Beitrag verlinkt hierher, und der
// Besucher soll direkt auf der Aussage landen — aber der Text muss im
// ausgelieferten HTML stehen, sonst existiert er für Suchmaschinen nicht. Genau
// das ist im Projekt schon gemessen worden: Die Einträge der Ausklapp-Menüs
// werden erst beim Öffnen erzeugt, stehen in keinem ausgelieferten HTML und
// zählen als interner Verweis nicht. Ein Overlay, das die Geschichte nachlädt,
// hätte denselben Effekt — der Besucher sähe sie, Google nie.
//
// Der Anker in der Adresse springt deshalb nur hierher; er erzeugt nichts.
//
// WARUM KEINE EIGENE SEITE: Eine Adresse je Beitrag wären viele dünne Seiten zu
// Themen, auf die niemand sucht. Der Wert eines Beitrags ist der Anlass, nicht
// die Adresse — und der Block macht die Seite besser, auf der er steht.

export function StoryBlock({ onsite, bild }: { onsite: OnsiteFassung; bild: PostBild }) {
  return (
    <section
      id={onsite.anker}
      style={{
        // Abstand nach oben, damit der Sprung aus einem Beitrag nicht direkt
        // unter der Kopfzeile klebt.
        scrollMarginTop: space.huge * 2,
        background: v("--color-bg-muted"),
        borderRadius: v("--radius-lg"),
        padding: pad("xxxl", "xxxl"),
        margin: `${space.huge}px 0`,
      }}
    >
      <h2 style={{ fontSize: v("--font-size-h2"), marginTop: 0, marginBottom: space.lg }}>{onsite.ueberschrift}</h2>

      <div style={{ display: "flex", gap: space.xxxl, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 280 }}>
          {onsite.absaetze.map((a: string) => (
            <p key={a.slice(0, 40)} style={{ fontSize: v("--font-size-body"), lineHeight: 1.6, marginTop: 0 }}>
              {a}
            </p>
          ))}
        </div>
        <div style={{ flex: "0 0 auto", maxWidth: "100%" }}>
          <SocialKarte bild={bild} skala={0.3} />
        </div>
      </div>
    </section>
  );
}
