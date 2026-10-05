/**
 * May this recipient get a letter? Decided from the stored result of the
 * contact search and a fresh check of the page that publishes the address.
 *
 * Replaces the first-generation gate, which demanded that NO municipality in
 * the whole country was left open before any letter could go out — a state
 * that was never reached (10,741 of 10,747 open), so sending was blocked for good.
 * This one judges each recipient on its own evidence.
 */

export type V2Result = {
  id: string;
  rules: string;
  verdict: string;
  selected: string[];
  proofs: { email: string; channels: string[] }[];
};

export type V2Recheck = {
  id: string;
  email: string;
  checkedAt: string;
  ok: boolean;
  url: string | null;
  reason: string | null;
};

/**
 * An address proven by hand or by the follow-up search, with the page that
 * publishes it. Those never enter the contact search's own selection, so
 * without this the send refused every address found after it (measured
 * 05.10.2026: all gaps filled since 01.10. would have been turned away at the
 * last step). The fresh recheck of the page still has to pass.
 */
export type Handbeleg = {
  email: string;
  url: string;
  quelle: string;
  rolle?: string;
  /**
   * The page sits behind a browser check a plain fetch cannot pass; a person
   * read it in a real browser on `geprueftAm`. Then that reading counts as the
   * recheck, for as long as a recheck may be old.
   */
  liveNichtLesbar?: boolean;
  geprueftAm?: string;
};

export type V2Urteil = { ok: true; belegteRolle: boolean } | { ok: false; grund: string };

export function v2Urteil(
  email: string,
  result: V2Result | null,
  recheck: V2Recheck | null,
  rules: string,
  now: Date,
  maxAgeDays: number,
  handbeleg: Handbeleg | null = null,
): V2Urteil {
  const e = email.trim().toLowerCase();
  if (handbeleg && handbeleg.email.trim().toLowerCase() === e) {
    if (handbeleg.liveNichtLesbar && handbeleg.geprueftAm) {
      const alter = (now.getTime() - Date.parse(`${handbeleg.geprueftAm}T12:00:00Z`)) / 86_400_000;
      if (alter <= maxAgeDays + 1) return { ok: true, belegteRolle: true };
      return { ok: false, grund: `Handprüfung im Browser älter als ${maxAgeDays} Tage — neu ansehen` };
    }
    const r = recheckUrteil(e, recheck, now, maxAgeDays);
    if (!r.ok) return r;
    return { ok: true, belegteRolle: true };
  }
  if (!result) return { ok: false, grund: "kein Ergebnis der Kontaktsuche" };
  if (result.rules !== rules) return { ok: false, grund: "Ergebnis stammt aus älteren Regeln — Kontaktsuche neu auswerten" };
  if (result.verdict !== "better" && result.verdict !== "equivalent") {
    return { ok: false, grund: `Kontaktvergleich ${result.verdict === "worse" ? "zeigt einen verlorenen Kontakt" : "ist ungeklärt"}` };
  }
  if (!result.selected.map(s => s.toLowerCase()).includes(e)) return { ok: false, grund: "Adresse gehört nicht zur geprüften Auswahl" };
  const r = recheckUrteil(e, recheck, now, maxAgeDays);
  if (!r.ok) return r;
  const belegteRolle = result.proofs.some(p => p.email.toLowerCase() === e && p.channels.length > 0);
  return { ok: true, belegteRolle };
}

function recheckUrteil(e: string, recheck: V2Recheck | null, now: Date, maxAgeDays: number): V2Urteil {
  if (!recheck || recheck.email.toLowerCase() !== e) return { ok: false, grund: "keine Nachprüfung der Adresse vor diesem Versand" };
  const age = (now.getTime() - Date.parse(recheck.checkedAt)) / 86_400_000;
  if (!(age >= 0 && age <= maxAgeDays)) return { ok: false, grund: `Nachprüfung älter als ${maxAgeDays} Tage` };
  if (!recheck.ok) return { ok: false, grund: `Adresse steht nicht mehr auf der Seite (${recheck.reason ?? "unbekannt"})` };
  return { ok: true, belegteRolle: false };
}
