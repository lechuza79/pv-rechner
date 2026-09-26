"use client";

import { useEffect, useRef, useState } from "react";
import { ABO_OEFFNEN } from "../atlas/GemeindeAboBox";
import { AKTUELLE_EINWILLIGUNG } from "../../lib/abo-einwilligung";
import { ABO_TECHNIKEN } from "../../lib/abo-technik";
import { istHerkunftsAufruf } from "../../lib/brief-herkunft";
import { trackEvent } from "../../lib/analytics";

/**
 * The subscription dialog in the approved design (atlas.js, openAbo): role
 * toggle, e-mail field, one button — wired to the real sign-up
 * (/api/abo/anmelden, double opt-in) instead of the prototype's placeholder.
 *
 * The consent wording comes from the archive (lib/abo-einwilligung.ts), never
 * typed here: the stored version must name the text the person actually saw.
 * "Für die Gemeinde" is the old sign-up's "arbeite für die Verwaltung".
 */
export default function GemeindeAboDialog({ name, ags, verwaltungLabel="Für die Gemeinde" }: { name: string; ags: string; verwaltungLabel?:string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [verwaltung, setVerwaltung] = useState(false);
  const [email, setEmail] = useState("");
  const [falle, setFalle] = useState("");
  const [status, setStatus] = useState<"bereit" | "sendet" | "fertig" | { fehler: string }>("bereit");

  useEffect(() => {
    const auf = () => {
      if (!ref.current?.open) ref.current?.showModal();
    };
    window.addEventListener(ABO_OEFFNEN, auf);
    return () => window.removeEventListener(ABO_OEFFNEN, auf);
  }, []);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sendet") return;
    setStatus("sendet");
    try {
      const antwort = await fetch("/api/abo/anmelden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ags,
          email,
          website: falle,
          quelle: "gemeinde",
          ueberBrief: istHerkunftsAufruf(location.search),
          techniken: ABO_TECHNIKEN,
          ausVerwaltung: verwaltung,
          einwilligung: AKTUELLE_EINWILLIGUNG.version,
        }),
      });
      if (!antwort.ok) {
        const daten = (await antwort.json().catch(() => ({}))) as { error?: string };
        setStatus({ fehler: daten.error ?? "Das hat gerade nicht geklappt. Bitte später erneut." });
        return;
      }
      trackEvent("abo_anmeldung");
      setStatus("fertig");
    } catch {
      setStatus({ fehler: "Keine Verbindung. Bitte später erneut." });
    }
  }

  const rolle = (gemeinde: boolean) => (
    <button type="button" aria-pressed={verwaltung === gemeinde} onClick={() => setVerwaltung(gemeinde)}>
      {gemeinde ? verwaltungLabel : "Als Bürger:in"}
    </button>
  );

  return (
    <dialog
      ref={ref}
      className="atlas-dialog"
      // The pre-hydration fallback (lib/abo-sofort.ts) finds the dialog by
      // this mark; the funding dialog carries the same class.
      data-abo=""
      aria-labelledby="atlas-abo-titel"
      onClick={(e) => {
        // A click on the backdrop closes, as in the prototype.
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <form method="dialog">
        <button type="submit" className="atlas-close" aria-label="Schließen">×</button>
      </form>
      <h2 id="atlas-abo-titel">{name} abonnieren</h2>
      <div className="atlas-dialog-body">
        {status === "fertig" ? (
          <p role="status">
            Fast geschafft: Wir haben eine Mail an {email} geschickt. Ein Klick darin, und Sie bekommen Bescheid, wenn sich in {name}{" "}
            etwas tut. Wenn nichts ankommt, sehen Sie bitte im Spam-Ordner nach.
          </p>
        ) : (
          <>
            <div className="atlas-roles">
              {rolle(false)}
              {rolle(true)}
            </div>
            <p data-role-copy="">
              {verwaltung ? "Neue Ortsmeldungen, Zahlen und Grafiken für Ihre kommunale Öffentlichkeitsarbeit. " : ""}
              {AKTUELLE_EINWILLIGUNG.gemeinde}
            </p>
            <form onSubmit={absenden}>
              <label htmlFor="atlas-email">E-Mail-Adresse</label>
              <input
                id="atlas-email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@beispiel.de"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (typeof status === "object") setStatus("bereit");
                }}
                disabled={status === "sendet"}
              />
              {/* Honeypot against bots, as in the old sign-up. */}
              <input
                type="text"
                name="website"
                value={falle}
                onChange={(e) => setFalle(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
              />
              <button className="atlas-button" disabled={status === "sendet"}>
                Kostenlos abonnieren
              </button>
              <p role="status" className="gemeinde-abo-klein">
                {typeof status === "object" ? (
                  status.fehler
                ) : (
                  <>
                    {AKTUELLE_EINWILLIGUNG.zusage.replace(/ Was wir speichern, steht in der Datenschutzerklärung\.$/, "")}{" "}
                    Was wir speichern, steht in der <a href="/datenschutz">Datenschutzerklärung</a>. {AKTUELLE_EINWILLIGUNG.nachweisHinweis}
                  </>
                )}
              </p>
            </form>
          </>
        )}
      </div>
    </dialog>
  );
}
