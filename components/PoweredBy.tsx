import { v } from "../lib/theme";
import { type DataSource, sourceLabel } from "../lib/data-sources";

/**
 * Data-source credit line for widget/chart footers, e.g.
 * "Datenquelle: Energy-Charts (Fraunhofer ISE), CC BY 4.0". Pass an array when
 * the view combines datasets — they render as
 * "Datenquelle: Energy-Charts … · Marktstammdatenregister …".
 *
 * Licence-required attribution — render it whenever a widget shows external
 * data, and keep it visible regardless of the `branding` flag (that flag only
 * hides "Powered by", not the data credit). The provider name links to its
 * homepage; the muted styling follows the surrounding footer.
 */
export function DataSourceNote({ source }: { source: DataSource | DataSource[] }) {
  const sources = Array.isArray(source) ? source : [source];
  return (
    <span>
      Datenquelle:{" "}
      {sources.map((s, i) => (
        <span key={s.name}>
          {i > 0 && " · "}
          {s.url ? (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}
            >
              {s.name}
            </a>
          ) : (
            s.name
          )}
          {s.license ? `, ${s.license}` : ""}
        </span>
      ))}
    </span>
  );
}

/** Same credit as {@link DataSourceNote} but flat (no link) — for chart-export
 * captions and other non-interactive contexts. */
export function dataSourceCredit(source: DataSource): string {
  return `Datenquelle: ${sourceLabel(source)}`;
}

/**
 * Shared "Powered by solar-check.io" attribution for embed widgets. One source
 * of truth so every widget's footer looks identical. The brand mark keeps its
 * fixed brand colours (it's a logo); the link text follows the widget accent so
 * it fits the host theme (on the default theme the accent IS the brand blue).
 */
export function PoweredBy() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
      <span>Powered by</span>
      <a
        href="https://solar-check.io"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          textDecoration: "none",
          color: v("--color-accent"),
          fontWeight: 600,
        }}
      >
        <SolarCheckMark />
        <span>solar-check.io</span>
      </a>
    </span>
  );
}

/**
 * Solar-Check brand mark — the rounded-square icon from the official logo, with
 * the original two brand colours hardcoded so it stays on-brand regardless of
 * widget theme overrides.
 */
function SolarCheckMark() {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 21 31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="sc-mark-clip">
          <path d="M0 5.20788C0 2.33165 2.33165 0 5.20788 0H15.8842C18.7605 0 21.0921 2.33165 21.0921 5.20788V25.7789C21.0921 28.6552 18.7605 30.9868 15.8842 30.9868H5.20788C2.33165 30.9868 0 28.6552 0 25.7789V5.20788Z" />
        </clipPath>
        <linearGradient id="sc-mark-grad" x1="10.6766" y1="19.2691" x2="10.6766" y2="6.11926" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1365EA" />
          <stop offset="1" stopColor="#1365EA" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath="url(#sc-mark-clip)">
        <path
          d="M0 5.20788C0 2.33165 2.33165 0 5.20788 0H15.8842C18.7605 0 21.0921 2.33165 21.0921 5.20788V25.7789C21.0921 28.6552 18.7605 30.9868 15.8842 30.9868H5.20788C2.33165 30.9868 0 28.6552 0 25.7789V5.20788Z"
          fill="#1365EA"
          fillOpacity="0.1"
        />
        <path
          opacity="0.4"
          d="M19.9426 7.4969L8.46848 18.9012C8.26417 19.1043 7.9338 19.1029 7.73118 18.8982L1.40751 12.5079C1.20551 12.3038 1.20688 11.9747 1.41056 11.7722L12.8846 0.367931C13.089 0.164858 13.4193 0.166227 13.622 0.370985L19.9456 6.76121C20.1476 6.96533 20.1463 7.29445 19.9426 7.4969Z"
          fill="url(#sc-mark-grad)"
        />
        <path
          d="M20.9417 12.5133L9.22402 24.3575C8.89676 24.6883 8.33301 24.4566 8.33301 23.9913V20.4021C8.33301 20.2649 8.38711 20.1333 8.48357 20.0358L20.2013 8.19161C20.5286 7.86082 21.0923 8.09256 21.0923 8.55789V12.1471C21.0923 12.2842 21.0382 12.4158 20.9417 12.5133Z"
          fill="#1365EA"
        />
        <path
          d="M20.9417 18.242L9.22402 30.0862C8.89676 30.417 8.33301 30.1853 8.33301 29.7199V26.1308C8.33301 25.9936 8.38711 25.862 8.48357 25.7645L20.2013 13.9203C20.5286 13.5895 21.0923 13.8212 21.0923 14.2866V17.8757C21.0923 18.0129 21.0382 18.1445 20.9417 18.242Z"
          fill="#1365EA"
        />
        <path
          d="M7.78404 25.5043L0.892121 18.4919C0.565371 18.1594 0 18.3908 0 18.8569V22.4412C0 22.5777 0.0535 22.7088 0.1492 22.8062L7.0411 29.8186C7.3679 30.1511 7.9334 29.9197 7.9334 29.4536V25.8694C7.9334 25.7328 7.8797 25.6017 7.78404 25.5043Z"
          fill="#073C93"
        />
        <path
          d="M7.78404 19.8983L0.892121 12.8859C0.565371 12.5535 0 12.7848 0 13.251V16.8352C0 16.9717 0.0535 17.1028 0.1492 17.2002L7.0411 24.2126C7.3679 24.5451 7.9334 24.3137 7.9334 23.8476V20.2634C7.9334 20.1268 7.8797 19.9957 7.78404 19.8983Z"
          fill="#073C93"
        />
      </g>
    </svg>
  );
}
