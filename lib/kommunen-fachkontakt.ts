/**
 * Proven specialist contacts of a municipality, as stored in the contact list.
 *
 * They come from the second-generation contact search, which only calls a
 * mailbox a climate or press contact when the published page names that role
 * as the person's own unit or title (see lib/contact-municipal-judge.ts).
 * Every proven contact is kept; per channel the best one is named first.
 * Climate protection / energy management is the preferred contact.
 */

export type FachKanal = "klima" | "presse";

export type Fachkontakt = {
  email: string;
  kanal: FachKanal;
  belegUrl: string;
  /** Mail domain of the shared administration, when the proof came from there. */
  verwaltungDomain: string | null;
};

export type Fachkontakte = {
  klima: Fachkontakt | null;
  presse: Fachkontakt | null;
  /** All proven contacts, climate first. */
  alle: Fachkontakt[];
};

type Proof = { email: string; channels: string[]; scope: string; url: string };
type SearchResult = { press: string[]; energy: string[]; proofs: Proof[] };

export function fachkontakteAus(r: SearchResult): Fachkontakte {
  // Independent of the old/new verdict: that one says whether the OLD contact
  // was confirmed; a newly proven contact is proven either way.
  // The selection names the best (at most two per channel); every other proven
  // mailbox of that channel follows, so nothing proven is lost.
  const collect = (list: string[], kanal: FachKanal, channel: string): Fachkontakt[] =>
    [...new Set([...list, ...r.proofs.filter(p => p.channels.includes(channel)).map(p => p.email)])].flatMap(email => {
      const proof = r.proofs.find(p => p.email === email && p.channels.includes(channel));
      if (!proof) return [];
      return [{
        email,
        kanal,
        belegUrl: proof.url,
        verwaltungDomain: proof.scope.startsWith("shared-administration") ? email.split("@")[1] ?? null : null,
      }];
    });
  const klima = collect(r.energy, "klima", "energy");
  const presse = collect(r.press, "presse", "press");
  return { klima: klima[0] ?? null, presse: presse[0] ?? null, alle: [...klima, ...presse] };
}

/** The preferred single contact: climate protection first, else press. */
export function bevorzugterFachkontakt(k: Fachkontakte): Fachkontakt | null {
  return k.klima ?? k.presse;
}
