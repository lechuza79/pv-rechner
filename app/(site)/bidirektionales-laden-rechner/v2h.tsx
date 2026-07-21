"use client";
import { useState, useMemo } from "react";
import { v, space, pad } from "../../../lib/theme";
import OptionCard from "../../../components/OptionCard";
import InlineEdit from "../../../components/InlineEdit";
import {
  V2H, V2H_PROFILES, V2G_EXAMPLES, V2G_STAND_DE,
  getVehicles, CUSTOM_VEHICLE, type V2hProfileId,
} from "../../../lib/v2h-config";
import { PERSONEN } from "../../../lib/constants";

export interface ProfileFactor {
  id: V2hProfileId;
  /** Jahresertrag je kWh handelbarem Volumen (€). */
  revenuePerKwh: number;
  medianSpreadCt: number;
  cyclesPerKwh: number;
}

const euro = (n: number) => Math.round(n).toLocaleString("de-DE");

function Card({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "hero" | "note" }) {
  const bg = tone === "hero" ? v("--color-bg-accent") : tone === "note" ? v("--color-bg-muted") : v("--color-bg");
  return (
    <div style={{
      background: bg, border: `1px solid ${v("--color-border")}`,
      borderRadius: v("--radius-lg"), padding: pad("xl"), marginBottom: space.xl,
    }}>{children}</div>
  );
}

/** Fahrzeug-Karte mit Foto und Bildnachweis.
 *
 *  Der Nachweis steht bewusst DIREKT am Bild und nicht auf einer Sammelseite: Die
 *  Lizenz erlaubt zwar eine ausgelagerte Nennung, deutsche Gerichte verlangen aber
 *  die eindeutige Zuordnung zum einzelnen Bild. Genau daran ist schon jemand
 *  gescheitert, der den Urheber nur im Seitenfuß genannt hatte. Bilder werden
 *  ausschließlich skaliert, nie beschnitten — Zuschnitt würde die Weitergabe-
 *  Pflicht auslösen. */
function VehicleCard({ vehicle, selected, onClick }: {
  vehicle: { id: string; label: string; usableKwh: number; note: string; image?: { src: string; author: string; license: string; licenseUrl: string; sourceUrl: string } };
  selected: boolean;
  onClick: () => void;
}) {
  const img = vehicle.image;
  return (
    <div style={{
      border: selected ? `2px solid ${v("--color-accent")}` : `2px solid ${v("--color-border")}`,
      background: selected ? v("--color-accent-dim") : v("--color-bg-muted"),
      borderRadius: v("--radius-md"), overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      <button onClick={onClick} style={{
        border: "none", background: "transparent", padding: 0, cursor: "pointer",
        textAlign: "left", fontFamily: "inherit", display: "block", width: "100%",
      }} aria-pressed={selected}>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.src} alt={vehicle.label} style={{
            width: "100%", aspectRatio: "16 / 10", objectFit: "cover", display: "block",
          }} />
        )}
        <div style={{ padding: pad("md", "lg") }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: v("--color-text-primary") }}>{vehicle.label}</div>
          <div style={{ fontSize: 11.5, color: v("--color-text-secondary"), marginTop: space.xxs, lineHeight: 1.35 }}>
            {vehicle.usableKwh} kWh · {vehicle.note}
          </div>
        </div>
      </button>
      {img && (
        <div style={{ fontSize: 9.5, color: v("--color-text-muted"), padding: pad("xxs", "lg"), lineHeight: 1.35 }}>
          Foto:{" "}
          <a href={img.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>{img.author}</a>
          {" · "}
          <a href={img.licenseUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>{img.license}</a>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ flex: "1 1 130px" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: v("--color-text-muted"), fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: v("--font-mono"), marginTop: space.xs }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: v("--color-text-secondary"), marginTop: space.xxs, lineHeight: 1.35 }}>{sub}</div>}
    </div>
  );
}

export default function V2hClient({ factors, priceError, periodStart, periodEnd }: {
  factors: ProfileFactor[];
  priceError: boolean;
  periodStart: string;
  periodEnd: string;
}) {
  const [step, setStep] = useState(0);
  const [vehicleId, setVehicleId] = useState("id3");
  const [customKwh, setCustomKwh] = useState(CUSTOM_VEHICLE.usableKwh);
  const [profileId, setProfileId] = useState<V2hProfileId>("pendler");
  const [personen, setPersonen] = useState(2);
  const [reserve, setReserve] = useState(V2H.defaultReserveKwh);
  const [wallbox, setWallbox] = useState(4500);

  const vehicles = getVehicles();
  const vehicle = vehicles.find(x => x.id === vehicleId) ?? CUSTOM_VEHICLE;
  const akkuKwh = vehicleId === "custom" ? customKwh : vehicle.usableKwh;
  const profile = V2H_PROFILES.find(p => p.id === profileId)!;
  const factor = factors.find(f => f.id === profileId);

  const r = useMemo(() => {
    // Handelbar ist, was über der Fahr-Reserve liegt — gedeckelt durch das, was die
    // Wallbox in drei Stunden je Richtung überhaupt bewegen kann.
    const freeKwh = Math.max(0, akkuKwh - reserve);
    const volume = Math.min(V2H.wallboxKw * 3, freeKwh);
    const revenue = (factor?.revenuePerKwh ?? 0) * volume;
    const cycles = (factor?.cyclesPerKwh ?? 0) * volume;
    const dailyHome = PERSONEN[personen].verbrauch / 365;
    return {
      freeKwh,
      volume,
      revenue,
      cycles,
      // Wie lange trägt der freie Akku das Haus? Winter liegt rund 25 % über dem
      // Schnitt (BDEW-Saisonfaktor) — die ehrlichere Zahl, denn Notstrom braucht
      // man nicht im Juli.
      daysWinter: freeKwh / (dailyHome * 1.25),
      daysAvg: freeKwh / dailyHome,
      payback: revenue > 0 ? wallbox / revenue : null,
    };
  }, [akkuKwh, reserve, factor, personen, wallbox]);

  const isResult = step === 2;

  return (
    <div style={{ background: v("--color-bg"), fontFamily: v("--font-text"), color: v("--color-text-primary"), minHeight: "100vh", padding: pad("xxl", "xl") }}>
      <div style={{ maxWidth: v("--page-max-width"), margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: space.xxl }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {isResult ? "Was in deinem Autoakku steckt" : "Bidirektionales Laden"}
          </h1>
          {!isResult && (
            <p style={{ fontSize: 13, color: v("--color-text-muted"), marginTop: space.sm, lineHeight: 1.45 }}>
              Ein E-Auto hat den fünf- bis achtfachen Akku eines Heimspeichers. Wir zeigen,
              was davon heute nutzbar ist — und was das Zurückspeisen wert wäre.
            </p>
          )}
        </div>

        {step === 0 && (
          <Card>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: space.lg }}>Welches Auto fährst du — oder planst du?</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.lg }}>
              {vehicles.map(x => (
                <VehicleCard key={x.id} vehicle={x} selected={vehicleId === x.id}
                  onClick={() => setVehicleId(x.id)} />
              ))}
              <VehicleCard
                vehicle={{ id: "custom", label: "Anderes Fahrzeug", usableKwh: customKwh, note: "Akkugröße selbst eintragen" }}
                selected={vehicleId === "custom"} onClick={() => setVehicleId("custom")} />
            </div>
            {vehicleId === "custom" && (
              <div style={{ marginTop: space.lg, fontSize: 14 }}>
                Nutzbare Akkukapazität:{" "}
                <InlineEdit value={customKwh} onCommit={setCustomKwh} unit="kWh" />
              </div>
            )}
            <p style={{ fontSize: 12, color: v("--color-text-secondary"), marginTop: space.lg, lineHeight: 1.45 }}>
              Alle gezeigten Modelle können zurückspeisen. Ob dein Fahrzeug es kann, hängt
              oft am Software-Stand — beim Kauf ausdrücklich danach fragen.
            </p>
            <button onClick={() => setStep(1)} style={btn()}>Weiter</button>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: space.lg }}>Wann steht das Auto zuhause?</h2>
            <div style={{ display: "grid", gap: space.md }}>
              {V2H_PROFILES.map(p => (
                <OptionCard key={p.id} selected={profileId === p.id} onClick={() => setProfileId(p.id)}
                  label={p.label} sub={p.what} />
              ))}
            </div>
            <div style={{ marginTop: space.xl }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: space.md }}>Wie viele Personen im Haushalt?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.md }}>
                {PERSONEN.map((p, i) => (
                  <OptionCard key={p.label} selected={personen === i} onClick={() => setPersonen(i)}
                    label={p.label} sub={`${p.verbrauch.toLocaleString("de-DE")} kWh im Jahr`} />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: space.md }}>
              <button onClick={() => setStep(0)} style={btn("ghost")}>Zurück</button>
              <button onClick={() => setStep(2)} style={btn()}>Ergebnis</button>
            </div>
          </Card>
        )}

        {isResult && (
          <>
            {/* ── Hero: das Potenzial, nicht die heutige Ersparnis ────────────── */}
            <Card tone="hero">
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: v("--color-text-muted"), fontWeight: 700 }}>
                Frei verfügbar im Akku
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, fontFamily: v("--font-mono"), color: v("--color-accent"), lineHeight: 1.1, marginTop: space.xs }}>
                {Math.round(r.freeKwh)} kWh
              </div>
              <p style={{ fontSize: 14, marginTop: space.md, lineHeight: 1.5 }}>
                Das trägt deinen Haushalt rund <strong>{r.daysWinter.toFixed(1)} Tage</strong> durch
                den Winter — ein typischer Heimspeicher mit 10 kWh schafft knapp einen.
                Nach Abzug von {reserve} kWh, die du fürs Fahren zurückhältst.
              </p>
              <div style={{ display: "flex", gap: space.xl, flexWrap: "wrap", marginTop: space.xl }}>
                <Stat label="Notstrom" value={`${r.daysWinter.toFixed(1)} Tage`} sub="bei Ausfall im Winter" />
                <Stat label="Im Jahresmittel" value={`${r.daysAvg.toFixed(1)} Tage`} />
                <Stat label="Handelbar am Tag" value={`${Math.round(r.volume)} kWh`} sub="begrenzt durch die Wallbox" />
              </div>
            </Card>

            {/* ── Gedankenmodell Netzhandel ───────────────────────────────────── */}
            <Card>
              <div style={{
                display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 8px",
                borderRadius: 6, background: v("--color-bg-muted"), color: v("--color-text-secondary"),
                marginBottom: space.lg,
              }}>
                Gedankenmodell — so geht es in Deutschland noch nicht
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: space.md }}>
                Was Zurückspeisen wert wäre
              </h2>
              {priceError ? (
                <p style={{ fontSize: 14, color: v("--color-text-secondary") }}>
                  Die Börsenpreise sind gerade nicht abrufbar. Bitte später noch einmal versuchen.
                </p>
              ) : (
                <>
                  <div style={{ fontSize: 34, fontWeight: 800, fontFamily: v("--font-mono"), color: v("--color-positive"), lineHeight: 1.1 }}>
                    {euro(r.revenue)} €
                  </div>
                  <p style={{ fontSize: 14, marginTop: space.md, lineHeight: 1.5 }}>
                    pro Jahr, wenn du günstig lädst und zur Preisspitze zurückspeist.
                    Gerechnet mit den <strong>echten deutschen Börsenpreisen</strong> vom{" "}
                    {new Date(periodStart).toLocaleDateString("de-DE")} bis{" "}
                    {new Date(periodEnd).toLocaleDateString("de-DE")} — die Preise schwankten
                    dabei im Mittel um {factor?.medianSpreadCt.toString().replace(".", ",")} Cent je Kilowattstunde
                    zwischen der günstigsten und der teuersten Zeit des Tages.
                  </p>
                  <div style={{ display: "flex", gap: space.xl, flexWrap: "wrap", marginTop: space.xl }}>
                    <Stat label="Zusätzliche Ladezyklen" value={`${Math.round(r.cycles)}/Jahr`} sub="geht auf die Akkugarantie" />
                    <Stat label="Wallbox" value={`${euro(wallbox)} €`} sub="bidirektional, mit Montage" />
                    {r.payback && (
                      <Stat label="Wäre bezahlt nach" value={`${r.payback.toFixed(1)} Jahren`} />
                    )}
                  </div>
                  <div style={{ fontSize: 13, marginTop: space.xl }}>
                    Wallbox-Preis anpassen: <InlineEdit value={wallbox} onCommit={setWallbox} unit="€" />
                    {"  ·  "}Fahr-Reserve: <InlineEdit value={reserve} onCommit={setReserve} unit="kWh" />
                  </div>
                </>
              )}
            </Card>

            {/* ── Was der Zahl fehlt: ehrlich und sichtbar ─────────────────────── */}
            <Card tone="note">
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: space.md }}>Warum das eine Obergrenze ist</h2>
              <ul style={{ fontSize: 13.5, lineHeight: 1.6, paddingLeft: space.xl, margin: 0, color: v("--color-text-secondary") }}>
                <li>Gerechnet ist der reine Börsenpreis. <strong>Netzentgelte, Steuern und Umlagen fehlen</strong> — die Doppelbelastung ist zwar seit Januar 2026 entfallen, wie abgerechnet wird, ist aber noch offen.</li>
                <li>Du brauchst einen <strong>dynamischen Stromtarif und ein intelligentes Messsystem</strong>. Beides gibt es in Deutschland noch nicht flächendeckend.</li>
                <li>Die zusätzlichen Ladezyklen <strong>zählen auf die Akkugarantie</strong>. Wir rechnen sie nicht in Geld um — dafür ist die Datenlage zu dünn.</li>
                <li>Nicht geschummelt ist dagegen die Voraussicht: Börsenpreise stehen am Vortag fest, eine Steuerung kennt sie also wirklich vorher.</li>
              </ul>
            </Card>

            {/* ── Was heute schon geht ─────────────────────────────────────────── */}
            <Card>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: space.md }}>Was heute schon funktioniert</h2>
              <p style={{ fontSize: 14, lineHeight: 1.55 }}>
                <strong>Notstrom.</strong> Fällt das Netz aus, trägt dein Auto den Haushalt
                rund {r.daysWinter.toFixed(1)} Tage. Das braucht keinen Tarif und keine
                Regulierung — nur die passende Wallbox.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.55, marginTop: space.lg }}>
                <strong>Sonne puffern</strong> geht ebenfalls: eigener Solarstrom tagsüber ins
                Auto, abends zurück ins Haus. Wirtschaftlich bringt das heute allerdings
                wenig — hast du bereits einen Heimspeicher, fängt der den Überschuss schon
                ab. {profile.id === "pendler" && "Und weil dein Auto tagsüber unterwegs ist, verpasst es ohnehin die Sonnenstunden."}
              </p>
            </Card>

            {/* ── Die eigentliche Botschaft ────────────────────────────────────── */}
            <Card tone="hero">
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: space.md }}>Die Entscheidung fällt beim Autokauf</h2>
              <p style={{ fontSize: 14, lineHeight: 1.55 }}>
                Die Wallbox kannst du später kaufen — dann, wenn Tarife und Messsysteme da
                sind. Was du heute entscheidest, ist das Auto. Rückspeisefähigkeit kostet
                beim Kauf fast nichts, lässt sich aber nachträglich nicht ergänzen. Wer sie
                mitnimmt, hat in ein paar Jahren den größten Speicher des Hauses längst in
                der Garage stehen.
              </p>
            </Card>

            {/* ── Ausblick: Ausland ────────────────────────────────────────────── */}
            <Card>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: space.xs }}>Anderswo läuft das bereits</h2>
              <p style={{ fontSize: 12.5, color: v("--color-text-muted"), marginBottom: space.lg }}>
                Beispiele aus dem Ausland — keine Aussage über deutsche Konditionen.
              </p>
              {V2G_EXAMPLES.map(x => (
                <div key={x.country} style={{ marginBottom: space.lg }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{x.country}</div>
                  <div style={{ fontSize: 12, color: v("--color-accent"), fontWeight: 600 }}>{x.status}</div>
                  <div style={{ fontSize: 13.5, color: v("--color-text-secondary"), lineHeight: 1.5, marginTop: space.xxs }}>{x.what}</div>
                </div>
              ))}
              <div style={{ fontSize: 12.5, color: v("--color-text-secondary"), lineHeight: 1.6, marginTop: space.xl, paddingTop: space.lg, borderTop: `1px solid ${v("--color-border")}` }}>
                <strong>Stand Deutschland ({V2G_STAND_DE.stand}):</strong> {V2G_STAND_DE.netzentgelte}{" "}
                {V2G_STAND_DE.abrechnung} {V2G_STAND_DE.norm} {V2G_STAND_DE.huerde}
              </div>
            </Card>

            <div style={{ display: "flex", gap: space.md }}>
              <button onClick={() => setStep(0)} style={btn("ghost")}>Neu berechnen</button>
            </div>

            <p style={{ fontSize: 11.5, color: v("--color-text-muted"), lineHeight: 1.5, marginTop: space.xl, textAlign: "center" }}>
              Alle Angaben ohne Gewähr. Preisdaten: Bundesnetzagentur | SMARD.de über
              Energy-Charts (Fraunhofer ISE), CC BY 4.0. Verbindlich sind die Konditionen
              deines Stromanbieters.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function btn(kind: "primary" | "ghost" = "primary"): React.CSSProperties {
  return {
    marginTop: space.xl, padding: pad("lg", "xl"), borderRadius: 10, fontSize: 14, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit", flex: 1,
    background: kind === "primary" ? v("--color-accent") : "transparent",
    color: kind === "primary" ? v("--color-text-on-accent") : v("--color-text-secondary"),
    border: kind === "primary" ? "none" : `1px solid ${v("--color-border")}`,
  };
}
