"use client";

import { useCallback, useEffect, useState } from "react";
import { v, space, pad } from "../../../../lib/theme";
import AdminSeitenkopf from "../../../../components/admin/AdminSeitenkopf";
import { DatenTabelle, type Spalte } from "../../../../components/admin/DatenTabelle";
import { DetailAbschnitt } from "../../../../components/admin/DetailAbschnitt";
import InfoTooltip from "../../../../components/InfoTooltip";
import SelectField from "../../../../components/SelectField";
import { STAENDE, KONTAKTARTEN, GESCHICHTEN, PAKETE } from "../../../../lib/presse-stand";
import {
  adressenNachDomain,
  kontaktArt,
  mediumName,
  notizen,
  themenText,
  zeilenPrioritaet,
  type KontaktZeile,
  type MediumZeile,
} from "../../../../lib/presse-katalog";

// Ansicht des Presse- und Creator-Katalogs.
//
// WOFÜR SIE DA IST, und das begrenzt sie: Bevor irgendetwas an eine Redaktion
// geht, muss ein Mensch die Zeilen durchsehen — welches Medium passt, welcher
// Name stimmt, welcher Aufhänger trägt. Dafür braucht es Filter, die Belege je
// Fund und einen Platz für eine Notiz. Alles darüber hinaus wäre Vorrat für
// einen Versandweg, den es bewusst nicht gibt.
//
// EINE ZEILE IST EIN MEDIUM, nicht ein Kontakt: Ein Fachtitel trägt bis zu
// dreißig Menschen, und eine Liste, in der pv magazine dreißig Zeilen belegt,
// lässt sich weder überfliegen noch sortieren. Die Menschen stehen aufgeklappt,
// jeder mit eigenem Arbeitsstand — angeschrieben wird schließlich ein Mensch.
//
// GEBAUT AUF DER TABELLE DES INTERNEN BEREICHS, nicht daneben. Sie ist am
// 27.08.2026 genau deshalb entstanden, weil zwei handgebaute Kopien derselben
// Tabelle bereits auseinandergelaufen waren; eine dritte hätte das Muster
// endgültig verloren.

type Antwort = { medien: MediumZeile[]; kontakte: KontaktZeile[]; gesamt: number };

export default function PresseAnsicht() {
  const [medien, setMedien] = useState<MediumZeile[]>([]);
  const [kontakte, setKontakte] = useState<KontaktZeile[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  const [paket, setPaket] = useState("1");
  const [prio, setPrio] = useState("");
  const [geschichte, setGeschichte] = useState("");
  const [mediumArt, setMediumArt] = useState("medium");
  const [kontaktart, setKontaktart] = useState("");
  const [stand, setStand] = useState("");
  const [suche, setSuche] = useState("");
  const [nurPerson, setNurPerson] = useState(false);

  const parameter = useCallback(() => {
    const p = new URLSearchParams();
    if (paket) p.set("paket", paket);
    if (prio) p.set("prio", prio);
    if (geschichte) p.set("geschichte", geschichte);
    p.set("medium", mediumArt);
    if (kontaktart) p.set("kontaktart", kontaktart);
    if (stand) p.set("stand", stand);
    if (suche) p.set("q", suche);
    if (nurPerson) p.set("person", "1");
    return p;
  }, [paket, prio, geschichte, mediumArt, kontaktart, stand, suche, nurPerson]);

  const laden = useCallback(async () => {
    setLaedt(true);
    setFehler(null);
    try {
      const r = await fetch(`/api/admin/presse?${parameter().toString()}`);
      if (!r.ok) throw new Error(`Laden fehlgeschlagen (${r.status})`);
      const d = (await r.json()) as Antwort;
      setMedien(d.medien);
      setKontakte(d.kontakte);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaedt(false);
    }
  }, [parameter]);

  useEffect(() => {
    void laden();
  }, [laden]);

  async function aendern(
    domain: string,
    schluessel: string,
    feld: { stand?: string; notiz?: string | null },
  ) {
    const r = await fetch("/api/admin/presse", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, schluessel, ...feld }),
    });
    if (!r.ok) {
      setFehler(`Speichern fehlgeschlagen (${r.status})`);
      return;
    }
    const { kontakt } = (await r.json()) as { kontakt: KontaktZeile };
    setKontakte((alt) =>
      alt.map((k) =>
        k.domain === kontakt.domain && k.schluessel === kontakt.schluessel ? kontakt : k,
      ),
    );
  }

  const mailKommtVor = adressenNachDomain(kontakte);
  const jeDomain = new Map<string, KontaktZeile[]>();
  for (const k of kontakte) jeDomain.set(k.domain, [...(jeDomain.get(k.domain) ?? []), k]);
  const von = (m: MediumZeile) =>
    (jeDomain.get(m.domain) ?? []).slice().sort((a, b) => b.rang - a.rang);

  const spalten: Spalte<MediumZeile>[] = [
    {
      key: "medium",
      kopf: "Medium",
      sortWert: (m) => mediumName(m),
      umbruch: true,
      zelle: (m) => (
        <span style={{ lineHeight: 1.3 }}>
          <span style={{ display: "block", fontWeight: 600 }}>{mediumName(m)}</span>
          <span
            style={{ display: "block", fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}
          >
            {m.domain}
            {m.gruppe ? ` · ${m.gruppe}` : ""}
          </span>
        </span>
      ),
    },
    {
      key: "themen",
      kopf: "Themen",
      umbruch: true,
      // Sortiert nach dem STÄRKSTEN gemessenen Thema, nicht nach dem Text:
      // Alphabetisch stünde „balkonkraftwerk (2)" vor „photovoltaik (45)", und
      // die Spalte sähe sortiert aus, ohne es zu sein.
      sortWert: (m) => -(m.themen?.[0]?.treffer ?? 0),
      zelle: (m) => (
        <span style={{ color: v("--color-text-muted") }}>{themenText(m.themen) ?? "ungeprüft"}</span>
      ),
    },
    {
      key: "gebiet",
      kopf: "Gebiet",
      umbruch: true,
      sortWert: (m) => m.saat_gebiet ?? "",
      zelle: (m) => <span style={{ color: v("--color-text-muted") }}>{m.saat_gebiet ?? "—"}</span>,
    },
    {
      key: "kontakte",
      kopf: "Kontakte",
      umbruch: true,
      sortWert: (m) => -von(m).filter((k) => k.name).length,
      zelle: (m) => {
        const ks = von(m);
        const personen = ks.filter((k) => k.name).length;
        const mitAdresse = ks.filter((k) => k.name && k.mail).length;
        if (!ks.length) return <span style={{ color: v("--color-text-muted") }}>kein Kontakt</span>;
        if (!personen)
          return <span style={{ color: v("--color-text-muted") }}>{ks.length} Postfach</span>;
        return (
          <span>
            {personen} Person{personen === 1 ? "" : "en"}
            {mitAdresse ? (
              <span style={{ color: v("--color-text-muted") }}>, {mitAdresse} mit Adresse</span>
            ) : null}
          </span>
        );
      },
    },
    {
      key: "reichweite",
      kopf: "Reichweite",
      umbruch: true,
      sortWert: (m) => (m.reichweite ? 0 : 1),
      zelle: (m) => (
        <span style={{ color: v("--color-text-muted") }}>{m.reichweite ?? "ungeprüft"}</span>
      ),
    },
    {
      key: "prio",
      kopf: "Prio",
      sortWert: (m) => m.prioritaet ?? "Z",
      zelle: (m) => (
        <span
          style={{
            fontWeight: 700,
            color:
              m.prioritaet === "A"
                ? v("--color-positive")
                : m.prioritaet === "C"
                  ? v("--color-text-muted")
                  : v("--color-text-primary"),
          }}
        >
          {m.prioritaet ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", paddingBottom: space.xxl }}>
      <AdminSeitenkopf
        titel="Presse & Creator"
        hilfe={
          <>
            Redaktionen, Fachdienste, Newsletter und Creator — erhoben aus Impressum,
            Redaktions-, Team- und Kontaktseiten. Jeder Fund hat eine Fundstelle mit Adresse
            und Prüfdatum; keine Adresse ist aus einem Namensmuster abgeleitet.
            <br />
            <br />
            Es gibt keinen Versandweg. Die Ansicht dient dem Durchsehen, Vormerken und
            Aussortieren. Priorität, Aufhänger und passende Geschichten sind aus den
            gemessenen Themen abgeleitet, nicht getippt — wer die Muster ändert, ändert alle
            drei.
          </>
        }
      />

      {/* ── Filter ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: space.sm,
          alignItems: "center",
          marginBottom: space.md,
          padding: pad("sm", "md"),
          background: v("--color-bg-muted"),
          borderRadius: v("--radius-md"),
        }}
      >
        <input
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="Medium, Adresse oder Gebiet"
          aria-label="Suche"
          style={{ ...eingabeStil, flex: "1 1 220px", minWidth: 200 }}
        />
        <Filter label="Paket" wert={paket} setzen={setPaket}>
          {PAKETE.map((p) => (
            <option key={p.wert} value={String(p.wert)}>
              {p.text}
            </option>
          ))}
          <option value="">alle Pakete</option>
        </Filter>
        <Filter label="Priorität" wert={prio} setzen={setPrio}>
          <option value="">jede Priorität</option>
          <option value="A">nur A</option>
          <option value="B">nur B</option>
          <option value="C">nur C</option>
        </Filter>
        <Filter label="Geschichte" wert={geschichte} setzen={setGeschichte} breit>
          <option value="">jede Geschichte</option>
          {GESCHICHTEN.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Filter>
        <Filter label="Kontaktart" wert={kontaktart} setzen={setKontaktart} breit>
          <option value="">jede Kontaktart</option>
          {KONTAKTARTEN.map((k) => (
            <option key={k.wert} value={k.wert}>
              {k.text}
            </option>
          ))}
        </Filter>
        <Filter label="Arbeitsstand" wert={stand} setzen={setStand}>
          <option value="">jeder Arbeitsstand</option>
          {STAENDE.map((s) => (
            <option key={s.wert} value={s.wert}>
              {s.text}
            </option>
          ))}
        </Filter>
        <Filter label="Einordnung" wert={mediumArt} setzen={setMediumArt} breit>
          <option value="medium">redaktionelles Angebot belegt</option>
          <option value="unklar">unklar</option>
          <option value="kein-medium">kein Medium</option>
          <option value="">alle</option>
        </Filter>
        <label style={hakenStil}>
          <input
            type="checkbox"
            checked={nurPerson}
            onChange={(e) => setNurPerson(e.target.checked)}
          />
          nur mit benannter Person
        </label>
      </div>

      <div
        style={{ display: "flex", alignItems: "center", gap: space.sm, marginBottom: space.sm }}
      >
        <p style={{ color: v("--color-text-muted"), fontSize: v("--font-size-small"), margin: 0 }}>
          {laedt ? "lädt …" : `${medien.length.toLocaleString("de-DE")} Medien`}
        </p>
        {/* Der Abzug nimmt alles, was die Filter übrig lassen. Ein Export, der
            stillschweigend bei der sichtbaren Menge endet, sieht vollständig aus
            und ist es nicht. */}
        <a
          href={`/api/admin/presse?${(() => {
            const p = parameter();
            p.set("format", "csv");
            return p.toString();
          })()}`}
          style={{ ...knopfStil, textDecoration: "none", display: "inline-block" }}
        >
          Als CSV laden
        </a>
        <InfoTooltip title="Als CSV laden" size={12} exportNote={false}>
          Lädt genau das, was die Filter oben übrig lassen — mit allen Kontakten je Medium,
          nicht nur dem besten. Spaltennamen sind stabil und ändern sich nicht mehr.
        </InfoTooltip>
      </div>
      {fehler && <p style={{ color: v("--color-negative"), marginBottom: space.sm }}>{fehler}</p>}

      <DatenTabelle
        zeilen={medien}
        spalten={spalten}
        schluessel={(m) => m.domain}
        startSortierung={[{ key: "prio", richtung: "auf" }]}
        leerText={laedt ? "lädt …" : "Kein Medium passt zu diesen Filtern."}
        minBreite={900}
        detail={(m) => {
          const ks = von(m);
          return (
            <div>
              <DetailAbschnitt titel="Einordnung" erster>
                <div style={{ display: "flex", flexWrap: "wrap", gap: space.md }}>
                  <Feld titel="Medientyp">
                    {m.medientyp?.length
                      ? m.medientyp.join(" · ")
                      : `${m.saat_typ ?? "—"} (ungeprüft)`}
                  </Feld>
                  <Feld titel="Redaktionelles Angebot">
                    {m.ist_medium === "medium"
                      ? `belegt${m.medium_merkmale?.length ? ` — ${m.medium_merkmale.join(", ")}` : ""}`
                      : m.ist_medium === "kein-medium"
                        ? `nein — ${m.medium_grund}`
                        : "unklar — zu wenige Merkmale"}
                  </Feld>
                  <Feld titel="Zuletzt geprüft">
                    {m.profil_at ? new Date(m.profil_at).toLocaleDateString("de-DE") : "—"}
                  </Feld>
                </div>
                {(m.hinweis || m.fehler) && (
                  <p style={{ color: v("--color-negative"), margin: `${space.xs}px 0 0` }}>
                    {m.fehler ? `Abruf: ${m.fehler}` : m.hinweis}
                  </p>
                )}
              </DetailAbschnitt>

              <DetailAbschnitt titel="Was wir anbieten könnten">
                <div style={{ display: "flex", flexWrap: "wrap", gap: space.md }}>
                  <Feld titel="Passende Geschichten">
                    {m.geschichten?.length ? m.geschichten.join(" · ") : "—"}
                  </Feld>
                  <Feld titel="Vorschlag für den Aufhänger">{m.aufhaenger ?? "—"}</Feld>
                </div>
              </DetailAbschnitt>

              <DetailAbschnitt titel={`Kontakte (${ks.length})`}>
                {ks.length === 0 ? (
                  <p style={{ margin: 0 }}>Kein öffentlich ausgewiesener Kontaktweg gefunden.</p>
                ) : (
                  <div style={{ display: "grid", gap: space.xs }}>
                    {ks.map((k) => (
                      <div
                        key={k.schluessel}
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: space.sm,
                          padding: pad("xs", "sm"),
                          background: v("--color-bg-muted"),
                          borderRadius: v("--radius-sm"),
                          border: `1px solid ${v("--color-border-muted")}`,
                        }}
                      >
                        <span style={{ flex: "1 1 210px", minWidth: 0, lineHeight: 1.3 }}>
                          <span style={{ ...einzeilig, fontWeight: 600 }}>
                            {k.name ?? "Redaktion (Postfach)"}
                          </span>
                          <span
                            style={{
                              ...einzeilig,
                              fontSize: v("--font-size-caption"),
                              color: v("--color-text-muted"),
                            }}
                          >
                            {k.funktion ?? kontaktArt(k, !!m.formular_url)} · Prio{" "}
                            {zeilenPrioritaet(m.prioritaet, k)}
                          </span>
                        </span>

                        <span style={{ flex: "1 1 230px", minWidth: 0 }}>
                          {k.mail ? (
                            <a href={`mailto:${k.mail}`} style={{ ...einzeilig, ...linkStil }}>
                              {k.mail}
                            </a>
                          ) : k.formular_url || m.formular_url ? (
                            <a
                              href={(k.formular_url ?? m.formular_url) as string}
                              target="_blank"
                              rel="noreferrer"
                              style={{ ...einzeilig, ...linkStil }}
                            >
                              Kontaktformular
                            </a>
                          ) : (
                            <span style={{ color: v("--color-text-muted") }}>keine Adresse</span>
                          )}
                          {/* Die Quelle steht an jedem Fund. Ohne sie ist er nicht
                              nachprüfbar, und ein Fund, den niemand nachprüfen
                              kann, ist eine Behauptung. */}
                          <a
                            href={k.quelle_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              ...einzeilig,
                              fontSize: v("--font-size-caption"),
                              color: v("--color-text-muted"),
                            }}
                          >
                            Fundstelle: {k.seitenart ?? "Seite"}
                          </a>
                        </span>

                        {/* Eigene Breite, sonst schrumpft das Auswahlfeld in der
                            Flex-Zeile auf die Breite seines Pfeils zusammen — im
                            Browser gemessen: 36 px, der Zustand war nicht mehr
                            lesbar. */}
                        <span style={{ flex: "0 0 132px" }}>
                          <SelectField
                            value={k.stand ?? "offen"}
                            onChange={(e) =>
                              void aendern(k.domain, k.schluessel, { stand: e.target.value })
                            }
                            ariaLabel={`Arbeitsstand für ${k.name ?? k.mail ?? "Kontakt"}`}
                            size="sm"
                          >
                            {STAENDE.map((s) => (
                              <option key={s.wert} value={s.wert}>
                                {s.text}
                              </option>
                            ))}
                          </SelectField>
                        </span>

                        <input
                          defaultValue={k.notiz ?? ""}
                          placeholder="Notiz"
                          aria-label={`Notiz zu ${k.name ?? k.mail ?? "Kontakt"}`}
                          onBlur={(e) => {
                            if ((k.notiz ?? "") === e.target.value) return;
                            void aendern(k.domain, k.schluessel, { notiz: e.target.value });
                          }}
                          style={{ ...eingabeStil, flex: "1 1 180px" }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </DetailAbschnitt>

              <DetailAbschnitt titel="Belege">
                <div style={{ display: "flex", flexWrap: "wrap", gap: space.md }}>
                  <Feld titel="Gelesene Seiten">
                    {m.seiten && Object.keys(m.seiten).length ? (
                      <span style={{ display: "flex", flexWrap: "wrap", gap: space.xs }}>
                        {Object.entries(m.seiten).map(([art, url]) => (
                          <a key={art} href={url} target="_blank" rel="noreferrer" style={linkStil}>
                            {art}
                          </a>
                        ))}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Feld>
                  {m.reichweite && (
                    <Feld titel="Reichweite, wie sie dort steht">
                      {m.reichweite_quelle ? (
                        <a
                          href={m.reichweite_quelle}
                          target="_blank"
                          rel="noreferrer"
                          style={linkStil}
                        >
                          {m.reichweite}
                        </a>
                      ) : (
                        m.reichweite
                      )}
                    </Feld>
                  )}
                </div>
                {(() => {
                  const anmerkung = notizen(m, ks[0] ?? null, mailKommtVor);
                  return anmerkung ? (
                    <p style={{ color: v("--color-text-muted"), margin: `${space.xs}px 0 0` }}>
                      {anmerkung}
                    </p>
                  ) : null;
                })()}
              </DetailAbschnitt>
            </div>
          );
        }}
      />
    </div>
  );
}

/**
 * Ein Filter mit Beschriftung darüber.
 *
 * Ohne die Beschriftung tragen die Auswahlfelder ihren Zustand nur im
 * ausgewählten Eintrag — und sobald einer gesetzt ist („nur A"), sieht man der
 * Leiste nicht mehr an, welche Fragen sie überhaupt stellt. Gemessen an der
 * ersten Fassung: Bei sieben Feldern nebeneinander wurden die längeren
 * Beschriftungen abgeschnitten und die Leiste war nicht mehr lesbar.
 */
function Filter({
  label,
  wert,
  setzen,
  breit,
  children,
}: {
  label: string;
  wert: string;
  setzen: (w: string) => void;
  breit?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 2, minWidth: breit ? 190 : 140 }}>
      <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
        {label}
      </span>
      <SelectField value={wert} onChange={(e) => setzen(e.target.value)} ariaLabel={label} size="sm">
        {children}
      </SelectField>
    </label>
  );
}

function Feld({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 200, flex: "1 1 260px" }}>
      <div
        style={{
          fontSize: v("--font-size-caption"),
          color: v("--color-text-muted"),
          marginBottom: 2,
        }}
      >
        {titel}
      </div>
      <div>{children}</div>
    </div>
  );
}

const einzeilig: React.CSSProperties = {
  display: "block",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const eingabeStil: React.CSSProperties = {
  padding: pad("xs", "sm"),
  borderRadius: v("--radius-sm"),
  border: `1px solid ${v("--color-border")}`,
  background: v("--color-bg"),
  color: v("--color-text-primary"),
  fontSize: v("--font-size-small"),
  fontFamily: "inherit",
};

const hakenStil: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: space.xxs,
  color: v("--color-text-primary"),
  fontSize: v("--font-size-small"),
  cursor: "pointer",
};

const linkStil: React.CSSProperties = {
  color: v("--color-accent"),
  fontSize: v("--font-size-small"),
};

const knopfStil: React.CSSProperties = {
  padding: pad("xs", "sm"),
  borderRadius: v("--radius-sm"),
  border: `1px solid ${v("--color-border")}`,
  background: "transparent",
  color: v("--color-text-primary"),
  cursor: "pointer",
  fontSize: v("--font-size-small"),
  fontFamily: "inherit",
};
