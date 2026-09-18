import Link from "next/link";
import KostenrennenMini from "../../../components/charts/KostenrennenMini";
import OrtsGeschichten from "./OrtsGeschichten";
import "./startseite-abschnitte.css";

/**
 * Sections shared by the homepage and the PV simulation (same order and copy
 * in the reviewed preview). Server-rendered: text and links are in the HTML
 * without any script.
 */

function Pfeil() {
  return (
    <svg className="hs-arrow" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Haken() {
  return (
    <svg className="hs-list-check" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const WERKZEUGE = [
  {
    nr: "01 / PHOTOVOLTAIK",
    bild: "house-v20.webp",
    alt: "Einfamilienhaus mit Solardach",
    titel: "Dein Dach kann mehr.",
    text: "Finde die passende Anlage oder rechne deine konkrete Planung durch.",
    links: [
      { href: "/pv-bedarf-berechnen", label: "Passende Anlage finden" },
      { href: "/photovoltaik-rechner", label: "Anlage durchrechnen" },
    ],
  },
  {
    nr: "02 / BALKONKRAFTWERK",
    bild: "balcony-modern-v20.webp",
    alt: "Balkon mit Solarmodulen",
    titel: "Kleine Fläche. Eigener Strom.",
    text: "Was bringt dein Balkon – und welches Set lohnt sich für dich?",
    links: [{ href: "/balkonkraftwerk/rechner", label: "Balkonkraftwerk berechnen" }],
  },
  {
    nr: "03 / WÄRMEPUMPE",
    bild: "heatpump-modern-v20.webp",
    alt: "Wärmepumpe am Wohnhaus",
    titel: "Wie heizt du morgen?",
    text: "Vergleiche Anschaffung und laufende Heizkosten mit deiner bisherigen Heizung.",
    links: [{ href: "/waermepumpe-rechner", label: "Wärmepumpe durchrechnen" }],
  },
  {
    nr: "04 / FÖRDERCHECK",
    bild: "funding-check-v20.webp",
    alt: "Illustration zum Fördercheck",
    titel: "Welche Förderung bekommst du?",
    text: "Entdecke Zuschüsse für deine Solaranlage – passend zu deinem Bundesland und deinem Ort.",
    links: [{ href: "/photovoltaik-foerderung", label: "Förderung finden" }],
  },
];

// Destinations the previous homepage linked and the new cards do not carry.
// Kept as plain links so no internal link disappears with the redesign.
const WEITERE = [
  { href: "/klimaanlage-stromkosten", label: "Klimaanlage: Stromkosten berechnen" },
  { href: "/einspeiseverguetung-rechner", label: "Einspeisevergütung berechnen" },
  { href: "/pv-simulation", label: "PV-Simulation" },
  { href: "/strommix-deutschland", label: "Strommix Deutschland live" },
];

const RATGEBER = [
  { href: "/ratgeber/lohnt-sich-pv-mit-speicher", nr: "01", thema: "PHOTOVOLTAIK", titel: "Lohnt sich eine Solaranlage mit Speicher?" },
  { href: "/ratgeber/gasheizung-oder-waermepumpe", nr: "02", thema: "HEIZEN", titel: "Gasheizung oder Wärmepumpe?" },
  { href: "/balkonkraftwerk/ratgeber/mit-speicher", nr: "03", thema: "BALKONKRAFTWERK", titel: "Wann lohnt sich ein Balkonspeicher?" },
];

export function Werkzeuge({ id }: { id?: string }) {
  return (
    <section className="hs-section hs-tools hs-art-ready" id={id}>
      <div className="hs-wrap">
        <div className="hs-intro">
          <p className="hs-kicker">AUS SONNENLICHT WIRD KLARHEIT</p>
          <h2>
            Eine gute Entscheidung
            <br />
            beginnt mit deinen Zahlen.
          </h2>
          <p>
            Ein eigenes Dach? Ein freier Balkon? Oder eine neue Heizung?
            <br />
            Finde heraus, was sich für dich rechnet.
          </p>
        </div>
        <div className="hs-toolgrid hs-five-tools">
          {WERKZEUGE.map((w) => (
            <article className="hs-tool" key={w.nr}>
              <div className="hs-tool-top">{w.nr}</div>
              <div className="hs-tool-art">
                {/* eslint-disable-next-line @next/next/no-img-element -- static illustration with fixed art direction */}
                <img className="is-loaded" alt={w.alt} loading="lazy" src={`/startseite/${w.bild}`} width={480} height={480} />
              </div>
              <h3>{w.titel}</h3>
              <p>{w.text}</p>
              <div className="hs-tool-actions">
                {w.links.map((l) => (
                  <Link key={l.href} href={l.href}>
                    {l.label} <Pfeil />
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
        <ul className="sc-weitere-rechner">
          {WEITERE.map((l) => (
            <li key={l.href}>
              <Link href={l.href}>
                {l.label} <Pfeil />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>

  );
}

export function Rennen({ id }: { id?: string }) {
  return (
    <section id={id} className="hs-section sc-startseite-rennen" aria-label="Stromkosten mit und ohne Solaranlage">
      <div className="hs-wrap">
        <KostenrennenMini />
      </div>
    </section>

  );
}

export function OrteAbschnitt() {
  return (
    <section className="hs-section hs-local-atlas">
      <div className="hs-wrap">
        <article className="hs-product-feature">
          <div className="hs-product-copy">
            <p className="hs-kicker">DIE ENERGIEWENDE VOR DEINER HAUSTÜR</p>
            <h2>Wie weit ist dein Ort?</h2>
            <p>
              Entdecke, wie viel Solarenergie schon in deiner Gemeinde steckt. Sieh dir lokale Zahlen an und finde
              heraus, wie dein Ort im Vergleich zur Umgebung dasteht.
            </p>
            <ul>
              <li><Haken />Solaranlagen und Speicher in deiner Gemeinde</li>
              <li><Haken />Deinen Ort mit der Region vergleichen</li>
              <li><Haken />Lokale Zahlen und Geschichten entdecken</li>
            </ul>
            <Link className="sc-btn sc-btn-primary" href="/solar-atlas">
              Deinen Ort entdecken <Pfeil />
            </Link>
          </div>
          <figure className="av-gallery av-stories" aria-label="Lokale Zahlen und Geschichten">
            <OrtsGeschichten />
          </figure>
        </article>
      </div>
    </section>

  );
}

export function Ratgeber() {
  return (
    <section className="hs-section hs-guides hs-art-ready">
      <div className="hs-wrap">
        <div className="hs-section-heading">
          <div>
            <h2>Erst verstehen. Dann entscheiden.</h2>
          </div>
          <Link href="/ratgeber">
            Alle Ratgeber <Pfeil />
          </Link>
        </div>
        <div className="hs-guide-list">
          {RATGEBER.map((r) => (
            <Link key={r.href} href={r.href}>
              <span>{r.nr}</span>
              <div>
                <small>{r.thema}</small>
                <h3>{r.titel}</h3>
              </div>
              <Pfeil />
            </Link>
          ))}
        </div>
      </div>
    </section>

  );
}

export function Person() {
  return (
    <section className="hs-section hs-person-section hs-art-ready">
      <div className="hs-wrap">
        <section className="sc-person">
          <picture className="sc-person-picture">
            {/* eslint-disable-next-line @next/next/no-img-element -- portrait with fixed crop */}
            <img src="/startseite/sebastian-portrait.webp" alt="Sebastian Schäder" loading="lazy" />
          </picture>
          <div className="sc-person-body">
            <p className="sc-person-text">
              Wir machen erneuerbare Energien <strong>verständlich und berechenbar</strong>. Mit kostenlosen Rechnern
              und aktuellen Energiedaten.
            </p>
            <p className="sc-person-signature">
              <strong>Sebastian Schäder</strong> · Solar Check
            </p>
            <div className="sc-person-actions">
              <Link href="/ueber" className="sc-person-primary">Über Solar Check</Link>
              <Link href="/kontakt" className="hs-person-message" aria-label="Schreib mir" title="Schreib mir">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 6h16v12H4zM4 7l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

