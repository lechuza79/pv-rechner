"use client";

import { useRef, useState } from "react";
import { ModalHeader } from "../Modal";
import { IconCheck, IconHourglass } from "../Icons";
import { v, space, pad } from "../../lib/theme";
import { FeedVorschau } from "./FeedVorschau";
import { SeitenVorschau, type OrtsVorschau } from "./SeitenVorschau";
import { Umschalter } from "./Umschalter";
import { VorlagenEditor } from "./VorlagenEditor";
import { Kennung } from "./Kennung";
import { fuelle, beitragsText } from "../../lib/social-vorlage";
import { KARTEN_STILE, KARTEN_STIL_NAME, KARTEN_STIL_STANDARD, type KartenStil } from "../../lib/social-karten-stil";
import { urteil, type Pruefung } from "../../lib/social-pruefung-kern";
import type { Befund as MechanikBefund } from "../../lib/social-mechanik";
import { Freigabe } from "./Freigabe";
import { StoryFesthalten } from "./StoryFesthalten";
import { SendenKnopf } from "./SendenKnopf";
import { BILDFORM_NAME, moeglicheFormen, templateVon, type PostBild, type SocialPost } from "../../lib/social-posts";

// Eine Story am Redaktionstisch: so, wie sie im Feed steht, plus die drei
// Stellschrauben — Farbschema, Formulierung, Freigabe.
//
// Der Editor ist ZU, bis jemand ihn aufmacht. Vorher stand er neben jeder
// Vorschau, und die Seite war eine Reihe von Textfeldern mit Bildern daneben.
// Ein Werkzeug, an dem das Design ausgearbeitet werden soll, muss zuerst das
// Design zeigen.
//
// Das Urteil über die Freigabe wird HIER gerechnet, nicht auf dem Server
// mitgeliefert: Wer das Farbschema umschaltet oder eine Formulierung ändert,
// soll im selben Moment sehen, dass die Freigabe damit weg ist. Genau das ist
// die Eigenschaft, die vorher fehlte — der Abdruck hing nur am Text, also blieb
// eine Freigabe bestehen, während das Bild ein anderes wurde.

export function StoryTisch({
  post,
  pruefungen,
  befunde,
  gesendetAm,
  abdruck,
  kategorieHinweis,
  ohneTitel,
  onPruefung,
  orts,
  templateModus = false,
  onModusWechsel,
}: {
  post: SocialPost;
  /** Template exploration never writes a municipality-specific override. */
  templateModus?: boolean;
  onModusWechsel?: () => void;
  /**
   * Was diese Geschichte auf ihrer ORTSSEITE zeigt.
   *
   * Nur bei Ortsgeschichten gesetzt; ohne die Angabe kennt der Tisch die
   * Seitenfassung nicht und bietet sie auch nicht an.
   */
  orts?: OrtsVorschau;
  pruefungen: Pruefung[];
  /** Was die mechanische Pruefung an dieser Fassung festgestellt hat. */
  befunde: MechanikBefund[];
  /** Ging genau DIESE Fassung schon einmal raus? */
  /**
   * Wann diese Fassung auf welchem Kanal rausging.
   *
   * Eine Zuordnung, kein einzelnes Datum: Derselbe Beitrag geht auf zwei
   * Kanäle, und ein Versand auf dem einen sagt nichts über den anderen.
   */
  gesendetAm?: Record<string, string>;
  /**
   * Der Fingerabdruck der ABGELEGTEN Fassung, vom Server gerechnet.
   *
   * Der Browser rechnet ihn nicht mehr selbst: Die frühere Fassung nahm dafür
   * eine 32-Bit-Prüfsumme, weil sie hier laufen musste — und die war
   * nachbaubar. Jetzt gibt es eine Stelle, die hasht, und sie sitzt auf dem
   * Server. Ob der ENTWURF davon abweicht, weiß diese Komponente ohnehin: Sie
   * hat die Änderung selbst gemacht.
   */
  abdruck: string;
  /**
   * Meldung nach oben, wenn hier eine Prüfung erteilt wurde.
   *
   * Nur für Ansichten, die den Prüfstand NOCH EINMAL anzeigen — das Raster tut
   * das an jeder Kachel. Ohne diese Meldung stünde dort weiter „offen", während
   * das Fenster darüber „freigegeben" sagt: zwei Aussagen über dieselbe Sache
   * auf einem Bildschirm.
   */
  onPruefung?: (postId: string, p: Pruefung) => void;
  /**
   * Überschrift weglassen — für den Tisch im Fenster, dessen Kopfzeile den
   * Titel schon trägt. Sonst stünde er zweimal untereinander.
   */
  ohneTitel?: boolean;
  /**
   * Woher die Story kommt, mit Link dorthin. Nur in der ungefilterten Ansicht:
   * Innerhalb einer Kategorie stünde an jeder Karte dasselbe.
   */
  kategorieHinweis?: { name: string; href: string };
}) {
  // Welche Ausgabeform gerade beurteilt wird. Der Feed ist der Ausgangspunkt:
  // Er ist die Form, die es zu JEDEM Beitrag gibt.
  const [ansicht, setAnsicht] = useState<"feed" | "seite">(templateModus ? "seite" : "feed");
  const [stil, setStil] = useState<KartenStil>(post.bild?.stil ?? KARTEN_STIL_STANDARD);
  const [form, setForm] = useState<PostBild["art"] | null>(templateModus && post.bild?.anteile ? "anteilsdonut" : post.bild?.art ?? null);
  const [entwurf, setEntwurf] = useState(post.vorlage ?? "");
  const [offen, setOffen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  // Erteilte Prüfungen wandern in den Zustand, damit das Urteil im selben Moment
  // umspringt wie beim Umfärben. Ohne das müsste man die Seite neu laden, um zu
  // sehen, dass die eigene Freigabe angekommen ist.
  const [gepruefte, setGepruefte] = useState<Pruefung[]>(pruefungen);
  // Die Karte, die beim Senden aufgenommen wird — dieselbe, die auf dem
  // Bildschirm steht. Ein zweiter Renderweg wäre ein anderes Bild.
  const karte = useRef<HTMLDivElement | null>(null);
  /**
   * Was zuletzt wirklich in der Ablage landete.
   *
   * Braucht es, weil die Eigenschaften von oben nach dem Speichern noch den
   * alten Stand tragen — die Serverseite rendert nicht neu. Ohne diesen Merker
   * bliebe „Speichern" nach dem Speichern aktiv und, viel schlimmer, die
   * Freigabe dauerhaft gesperrt: Sie hängt an genau dieser Frage.
   */
  const [gespeichert, setGespeichert] = useState({
    stil: post.bild?.stil ?? KARTEN_STIL_STANDARD,
    form: post.bild?.art ?? null,
    vorlage: post.vorlage ?? "",
  });

  const werte = Object.fromEntries((post.platzhalter ?? []).map((p) => [p.name, p.wert]));
  // Bearbeitbare Posts zeigen den Entwurf, die übrigen ihren eingebauten Text.
  const text = post.vorlage != null ? beitragsText(entwurf, werte, post.textRahmen) : post.text;
  const bild = post.bild ? { ...post.bild, stil, ...(form ? { art: form } : {}) } : null;
  const formen = post.bild ? moeglicheFormen(post.bild) : [];
  const geaendert =
    stil !== gespeichert.stil ||
    form !== gespeichert.form ||
    (post.vorlage != null && entwurf !== gespeichert.vorlage);
  // Dasselbe Urteil, das die Freigabe-Karte zeigt — hier für den Sende-Knopf.
  // Es wird nicht zweimal gerechnet, sondern einmal und zweimal gelesen.
  const urteilOk = !geaendert && urteil(abdruck, gepruefte).ok;

  // Warum gerade NICHT gesendet werden kann — einmal abgeleitet, für beide
  // Kanäle. Zwei Ableitungen wären zwei Wahrheiten darüber, ob ein Beitrag
  // fertig ist, und die eine ginge beim nächsten Umbau auseinander.
  const gemeinsameSperre = geaendert
    ? "Erst speichern."
    : befunde.some((b) => b.schwere === "sperre")
      ? "Die mechanische Prüfung sperrt — siehe oben."
      : !urteilOk
        ? "Es fehlt eine Freigabe."
        : undefined;

  /** Warum auf DIESEM Kanal gerade nicht gesendet werden kann. */
  const sperreFuer = (kanal: string): string | undefined => {
    if (geaendert) return "Erst speichern.";
    const raus = gesendetAm?.[kanal];
    if (raus) return `Diese Fassung ging dort bereits am ${new Date(raus).toLocaleDateString("de-DE")} raus.`;
    return gemeinsameSperre;
  };

  /**
   * Alles auf einmal ablegen — Text, Farbschema, Bildform.
   *
   * Vorher schrieb jeder Klick sofort. Das war bequem und falsch: Man konnte
   * nichts ausprobieren, ohne es zu speichern, und jede Zwischenstufe entwertete
   * die Freigabe. Jetzt ist der Tisch ein Entwurf, bis jemand ihn ablegt.
   *
   * Der Preis ist die vergessene Änderung, deshalb sagt der Knopf sichtbar an,
   * dass etwas offen ist.
   */
  async function speichern() {
    setLaeuft(true);
    setStatus(null);
    try {
      const res = await fetch("/api/social/fassung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          // Nur mitschicken, was es gibt: Ein Post ohne Vorlage hat keinen
          // bearbeitbaren Text, und ein leeres Feld würde ihn zurücksetzen.
          ...(post.vorlage != null ? { vorlage: entwurf } : {}),
          stil,
          ...(form ? { form } : {}),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; ungenutzt?: string[] };
      if (!res.ok) {
        setStatus(
          res.status === 401
            ? "Nicht gespeichert — die Anmeldung ist abgelaufen."
            : `Nicht gespeichert: ${j.error ?? res.status}`,
        );
      } else {
        // Erst jetzt gilt der Entwurf als abgelegt — und erst jetzt darf er
        // freigegeben werden.
        setGespeichert({ stil, form, vorlage: entwurf });
        setStatus(
          j.ungenutzt?.length
            ? `Gespeichert. Nicht mehr im Text: ${j.ungenutzt.map((x) => `{${x}}`).join(", ")}`
            : "Gespeichert. Die Prüfung muss neu erteilt werden.",
        );
      }
    } catch (e) {
      setStatus(`Nicht gespeichert: ${(e as Error).message}`);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <section
      style={{
        borderTop: `1px solid ${v("--color-border-muted")}`,
        paddingTop: space.xxl,
        display: "flex",
        gap: space.xxxl,
        alignItems: "flex-start",
        flexWrap: "wrap",
      }}
    >
      <ModalHeader><header style={{ flexBasis: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: space.md }}>
        <Umschalter primary eintraege={[{ wert: "feed", text: "Social-Post" }, { wert: "seite", text: "Website" }]} wert={ansicht} onWaehle={setAnsicht} ariaLabel="Ausgabeform" />
        <span role="status" style={{ fontSize: v("--font-size-small"), color: v(bild && templateVon(bild) ? "--color-positive-text" : "--color-pending-text"), background: bild && templateVon(bild) ? "transparent" : v("--color-pending-bg"), padding: pad("xs", "sm"), borderRadius: v("--radius-sm"), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: space.xs }}>{bild && templateVon(bild) ? <IconCheck /> : <IconHourglass />}{bild && templateVon(bild) ? "Abgenommen" : "Abnahme offen"}</span>
      </header></ModalHeader>
      <div style={{ flex: "0 1 440px", minWidth: 0, maxWidth: "100%" }}>
        {/* Die Bildaufnahme greift auf den Feed-Bereich: Das veröffentlichte
            Bild ist das 4:5-Bild, nicht die Seitenfassung. */}
        <div ref={karte} hidden={ansicht !== "feed"}>
          <FeedVorschau bild={bild!} text={text} breite={440} />
        </div>
        {ansicht === "seite" && <SeitenVorschau detailsSichtbar post={{ ...post, text, bild }} orts={orts ? { ...orts, beitrag: { ...orts.beitrag, post: { ...post, text, bild }, text: post.textRahmen ? fuelle(entwurf, werte) : orts.beitrag.text } } : undefined} />}
      </div>

      <div style={{ flex: "1 1 340px", minWidth: 0 }}>
        {kategorieHinweis && (
          <a
            href={kategorieHinweis.href}
            style={{
              fontSize: v("--font-size-caption"),
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: v("--color-accent"),
              textDecoration: "none",
            }}
          >
            {kategorieHinweis.name}
          </a>
        )}
        {!ohneTitel && (
          <h3 style={{ fontSize: v("--font-size-h3"), margin: 0, marginTop: kategorieHinweis ? space.xs : 0 }}>
            {post.titel}
          </h3>
        )}

        {/* Bildform: dieselbe Aussage in einer anderen Darstellung. Angeboten
            wird nur, was für DIESE Zahlen trägt — eine Form, die man wählen
            kann, wählt irgendwann jemand. */}
        {formen.length > 0 && (
          <div style={{ marginTop: space.lg }}>
            <Umschalter
              label="Chart-Template"
              eintraege={formen.map((f) => ({ wert: f, text: BILDFORM_NAME[f] }))}
              wert={(form ?? post.bild?.art) as PostBild["art"]}
              onWaehle={setForm}
            />
          </div>
        )}

        {/* Farbschema: Eigenschaft der Karte, nicht der Ansicht. Wird sofort
            gespeichert und wandert damit ins veröffentlichte Bild mit. */}
        <div style={{ marginTop: space.lg }}>
          <Umschalter
            label="Farbschema"
            eintraege={KARTEN_STILE.map((x) => ({ wert: x, text: KARTEN_STIL_NAME[x] }))}
            wert={stil}
            onWaehle={setStil}
          />
        </div>

        {templateModus && (
          <details style={{ marginTop: space.xl }}>
            <summary style={{ cursor: "pointer", fontSize: v("--font-size-body") }}>Text bearbeiten</summary>
            <p style={{ fontSize: v("--font-size-body"), lineHeight: 1.6, color: v("--color-text-secondary") }}>{orts?.beitrag.text ?? post.text}</p>
            <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>{text.length} Zeichen im Social-Post</span>
            {onModusWechsel && <button type="button" onClick={onModusWechsel} style={{ display: "block", marginTop: space.md }}>Beispieltext bearbeiten</button>}
          </details>
        )}
        {!templateModus && <>
        {onModusWechsel && <button type="button" onClick={onModusWechsel}>Zur Template-Gestaltung</button>}
        <div style={{ display: "flex", gap: space.sm, marginTop: space.md, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={laeuft || !geaendert}
            onClick={speichern}
            style={{
              padding: pad("xs", "lg"),
              borderRadius: v("--radius-sm"),
              border: "none",
              background: geaendert ? v("--color-accent") : v("--color-border"),
              color: geaendert ? v("--color-text-on-accent") : v("--color-text-muted"),
              cursor: geaendert ? "pointer" : "default",
              fontSize: v("--font-size-small"),
              fontWeight: 600,
            }}
          >
            {laeuft ? "…" : geaendert ? "Änderungen speichern" : "Keine offenen Änderungen"}
          </button>
          {status && (
            <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}>{status}</span>
          )}
          {post.vorlage != null ? (
            <button
              type="button"
              aria-expanded={offen}
              onClick={() => setOffen((o) => !o)}
              style={{
                padding: pad("xs", "md"),
                borderRadius: v("--radius-sm"),
                border: `1px solid ${v("--color-border")}`,
                background: "transparent",
                color: v("--color-text-secondary"),
                cursor: "pointer",
                fontSize: v("--font-size-small"),
              }}
            >
              {offen ? "Textfeld einklappen" : "Text bearbeiten"}
            </button>
          ) : (
            <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
              Noch nicht auf Vorlagen umgestellt — Text hier nur lesbar.
            </span>
          )}
          <Kennung id={post.id} template={bild ? templateVon(bild)?.name : undefined} />
        </div>

        {offen && post.vorlage != null && post.platzhalter && (
          <div style={{ marginTop: space.lg }}>
            <VorlagenEditor
              postId={post.id}
              entwurf={entwurf}
              onEntwurf={setEntwurf}
              platzhalter={post.platzhalter}
            />
          </div>
        )}

        </>}

        <details style={{ marginTop: space.md }}>
          <summary
            style={{ cursor: "pointer", fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}
          >
            Belege ({post.belege.length})
          </summary>
          <ul
            style={{
              fontSize: v("--font-size-small"),
              color: v("--color-text-secondary"),
              marginTop: space.sm,
              paddingLeft: space.lg,
            }}
          >
            {post.belege.map((b) => (
              <li key={b} style={{ marginBottom: space.xs }}>
                {b}
              </li>
            ))}
          </ul>
        </details>
        {!templateModus && <>
        {orts && <StoryFesthalten postId={post.id} abdruck={abdruck} disabled={geaendert} name={orts.ortName} />}
        <details style={{ marginTop: space.xl, borderTop: `1px solid ${v("--color-border")}`, paddingTop: space.lg }}>
          <summary style={{ cursor: "pointer", fontSize: v("--font-size-body"), fontWeight: 600 }}>Prüfen und veröffentlichen</summary>
        {/* Freigabe: hängt an Text UND Bild, und wird hier auch erteilt.
            Ungespeichertes lässt sich nicht freigeben — die Senderoute baut den
            Text später aus der Ablage neu, ein Entwurf im Browser käme dort gar
            nicht an. */}
        <Freigabe
          postId={post.id}
          abdruck={abdruck}
          befunde={befunde}
          /* Ein ungespeicherter Entwurf gehört zu KEINER abgelegten Fassung.
             Die Freigabe rechnet ihr Urteil deshalb gegen einen Abdruck, den es
             nicht gibt — das ist genau richtig und ohne Hash im Browser zu
             haben: Was auf dem Bildschirm steht, ist dann nachweislich nicht
             das, wofür je jemand geradegestanden hat. */
          gilt={!geaendert}
          pruefungen={gepruefte}
          onErteilt={(p) => {
            setGepruefte((alte) => [
              // Dieselbe Fassung, dieselbe Art: der neue Befund ersetzt den
              // alten — genauso wie in der Ablage, die darauf einen Schlüssel hat.
              ...alte.filter((a) => !(a.art === p.art && a.fassung_fingerabdruck === p.fassung_fingerabdruck)),
              p,
            ]);
            onPruefung?.(post.id, p);
          }}
          gesperrt={
            geaendert
              ? "Erst speichern, dann freigeben: Eine Prüfung gilt der Fassung in der Ablage, nicht dem Entwurf auf dem Bildschirm."
              : undefined
          }
        />

        {/* Die Auslöser. Sie beurteilen nichts — sie lösen aus, was die Sperren
            ohnehin freigegeben haben. Die Begründung, warum gerade nicht
            gesendet werden kann, steht daneben, statt dass der Knopf nur grau
            ist: Ein toter Knopf ohne Grund schickt jemanden dreimal um den
            Block. */}
        {/* EIN KNOPF JE KANAL. Die Sperren sind dieselben — Mechanik, Freigabe,
            Doppelversand —, nur das Versandprotokoll unterscheidet sie: Ein
            Beitrag, der auf LinkedIn draußen ist, ist auf Instagram noch nicht
            gesendet. Der Instagram-Knopf erscheint nur, wo der Beitrag für
            diesen Kanal überhaupt vorgesehen ist; die Story selbst sagt das. */}
        <div style={{ display: "flex", gap: space.sm, flexWrap: "wrap", alignItems: "flex-start" }}>
          <SendenKnopf
            postId={post.id}
            abdruck={abdruck}
            bildAlt={bild ? `${bild.aussage}. ${bild.gemessen}.` : ""}
            kartenRef={karte}
            gesperrtWeil={sperreFuer("linkedin")}
          />
          {post.kanal.includes("instagram") && (
            <SendenKnopf
              kanal="instagram"
              postId={post.id}
              abdruck={abdruck}
              bildAlt={bild ? `${bild.aussage}. ${bild.gemessen}.` : ""}
              kartenRef={karte}
              gesperrtWeil={
                !bild
                  ? "Instagram kennt keinen reinen Textbeitrag — ohne Bild geht dort nichts."
                  : sperreFuer("instagram")
              }
            />
          )}
        </div>

        </details>

        </>}

      </div>
    </section>
  );
}
