"use client";

import { useEffect, useState } from "react";
import { computeGemeindePotential, type GemeindePotential } from "../../lib/gemeinde-potential";
import { DEFAULT_PRICES } from "../../lib/prices-config";
import { DEFAULT_HEATPUMP_CONFIG } from "../../lib/heatpump-config";
import { LoadingDots } from "../LoadingDots";

/**
 * "Was bedeutet das für Bürgerinnen und Bürger?" — three example calculations
 * for this town, in the approved design's cards.
 *
 * Same calculation as the old page (computeGemeindePotential on the shared
 * calculation base); the town's yield comes from /api/pvgis in the browser,
 * so a slow external service can never hold up the page (the reason the old
 * page loads it the same way, 07/2026). Labels and links stand at once; only
 * the amounts show loading dots until the yield is there.
 */
const eur = (n: number) => Math.round(n).toLocaleString("de-DE");
const rund = (n: number, auf: number) => Math.round(n / auf) * auf;

const plus = (
  <span className="v3-result-plus" aria-label="Plus">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M12 4v16M4 12h16" />
    </svg>
  </span>
);
const pfeil = (
  <svg className="sc-live-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3.333 8h9.334m0 0L8 3.333M12.667 8 8 12.667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function GemeindeBeispiele({
  name,
  plz,
  lat,
  lon,
  foerderung,
}: {
  name: string;
  plz: string | null;
  lat: number | null;
  lon: number | null;
  /** Kommunale oder Landesförderung, wenn sie hier gilt — sonst nichts. */
  foerderung?: { href: string; text: string; titel: string } | null;
}) {
  const [p, setP] = useState<GemeindePotential | null>(null);
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    let aus = false;
    const params = new URLSearchParams();
    if (lat != null && Number.isFinite(lat)) params.set("lat", String(lat));
    if (lon != null && Number.isFinite(lon)) params.set("lon", String(lon));
    if (plz) params.set("plzPrefix", plz.slice(0, 2));
    fetch(`/api/pvgis?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("pvgis"))))
      .then((d: { annual: number; monthly: number[] | null }) => {
        if (!aus) setP(computeGemeindePotential({ annual: d.annual, monthly: d.monthly }));
      })
      .catch(() => !aus && setFehler(true));
    return () => {
      aus = true;
    };
  }, [plz, lat, lon]);

  // A saving that is not positive gets no "plus" and no amount: the card
  // would claim a gain the calculation does not show.
  const betrag = (wert: number | undefined, zeitraum: string) =>
    p == null ? (
      fehler ? <span className="v3-delta-value">–</span> : <LoadingDots size={6} />
    ) : wert != null && wert > 0 ? (
      <>
        {plus}
        <span className="v3-delta-value">
          {eur(wert)} <span className="v3-delta-currency">€</span>
        </span>
        <small>{zeitraum}</small>
      </>
    ) : (
      <span className="v3-delta-value">keine Ersparnis</span>
    );

  const karten = [
    {
      motif: "house",
      titel: "Eigenes Dach",
      wert: p ? rund(p.pvFiveYearBenefit, 100) : undefined,
      zeitraum: "in fünf Jahren",
      text: "Mit Solar auf dem Dach sparen Sie Stromkosten und erhalten Geld für überschüssigen Strom. Die Anschaffungskosten sind hier noch nicht abgezogen.",
      href: "/photovoltaik-rechner",
      cta: "Solar selbst durchrechnen",
    },
    {
      motif: "heatpump-modern",
      titel: "Heizung erneuern",
      wert: p ? rund(p.wpTco20, 100) : undefined,
      zeitraum: `über ${DEFAULT_HEATPUMP_CONFIG.years} Jahre`,
      text: "So viel kann eine Wärmepumpe gegenüber einer neuen Gasheizung sparen – gerechnet für ein Einfamilienhaus mit 140 m².",
      href: "/waermepumpe-rechner",
      cta: "Wärmepumpe durchrechnen",
    },
    {
      motif: "balcony-modern",
      titel: "Balkonkraftwerk",
      wert: p ? rund(p.balkonSavingPerYear, 10) : undefined,
      zeitraum: "pro Jahr",
      text: "Eigener Strom vom sonnigen Südbalkon senkt Ihre Stromrechnung. Ein kleiner Speicher hält einen Teil davon für den Abend bereit.",
      href: "/balkonkraftwerk/rechner",
      cta: "Balkonkraftwerk durchrechnen",
    },
  ];

  return (
    <section className="atlas-section v3-conclusion">
      <div className="atlas-wrap">
        <div className="atlas-head">
          <details className="v3-calculation-help">
            <summary aria-label="Grundlagen der Beispielrechnungen" title="Grundlagen der Beispielrechnungen">
              ?
            </summary>
            <div>
              <strong>Grundlagen der Beispielrechnungen</strong>
              <p>
                Gerechnet mit den Rechnern von Solar Check.
                {p && <> Standortertrag {name}: {eur(p.yieldKwhKwp)} kWh/kWp pro Jahr (PVGIS);</>} Haushaltsstrom:{" "}
                {(DEFAULT_PRICES.electricityPrice * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} ct/kWh. Beträge
                gerundet. Ihr Ergebnis hängt von Verbrauch, Anlage, Investition und Energiepreisen ab.
              </p>
            </div>
          </details>
          <div>
            <p className="atlas-kicker">Vom Ort zum eigenen Zuhause</p>
            <h2>Was bedeutet das für Bürgerinnen und Bürger?</h2>
          </div>
          <p>Die Entwicklung im Ort ist das eine. Was sich für Ihren Haushalt lohnt, zeigen drei Beispielrechnungen.</p>
        </div>
        <div className="v3-examples sc-feature-list">
          {karten.map((k) => (
            <article key={k.titel} className="sc-feature-card">
              {/* @ts-expect-error — web component from /illustrations-motion/solar-illustrations.js */}
              <solar-illustration class="v3-example-art sc-feature-visual" motif={k.motif} label={k.titel} circle="" loading="lazy" />
              <div className="v3-example-copy sc-feature-content">
                <p className="atlas-kicker">{k.titel}</p>
                <h3>
                  <span className="v3-result-amount sc-delta">{betrag(k.wert, k.zeitraum)}</span>
                </h3>
                <p>{k.text}</p>
              </div>
              <a className="v3-example-cta sc-feature-action" href={k.href}>
                {k.cta} {pfeil}
              </a>
            </article>
          ))}
        </div>
        {foerderung && (
          // Der Zuschuss der Gemeinde gehört zu den Beispielrechnungen: Er
          // ändert jede von ihnen. Verlinkt statt gerechnet, weil die Höhe an
          // Bedingungen hängt, die diese Seite nicht kennt. Eigener Abschnitt,
          // damit die Sprungleiste ihn anspringen kann.
          <div className="v3-examples-foerderung" id="atlas-foerderung">
            <h3>{foerderung.titel}</h3>
            <p>Zuschüsse zusätzlich zur bundesweiten Regelung.</p>
            <a className="atlas-link" href={foerderung.href}>
              {foerderung.text} {pfeil}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
