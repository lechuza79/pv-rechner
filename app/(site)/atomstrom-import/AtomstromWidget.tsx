import AutoHeightIframe from "../../../components/AutoHeightIframe";

/**
 * Zeigt das vollständige Strommix-Widget exakt so, wie es einbettet (Chart +
 * Legende + Zeitraum-Umschalter + Share/Embed-Footer), via echtes
 * /embed/strommix iframe. Höhe passt sich automatisch an den Content an.
 */
export default function AtomstromWidget() {
  return (
    <AutoHeightIframe
      src="/embed/strommix"
      title="Strommix Deutschland mit Atomstrom-Import"
      fallbackHeight={460}
    />
  );
}
