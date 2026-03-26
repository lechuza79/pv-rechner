import { v } from "../lib/theme";

/** Horizontal logo: solar panel icon + "solar-check" (accent) + ".io" (muted) */
export default function Logo({ height = 24 }: { height?: number }) {
  const fontSize = Math.round(height * 0.5);
  const iconW = Math.round(height * 0.68);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(height * 0.22) }}>
      <svg width={iconW} height={height} viewBox="0 0 21.09 31" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", flexShrink: 0 }}>
        <defs>
          <linearGradient id="logo-grad" x1="10.677" y1="19.269" x2="10.677" y2="6.119" gradientUnits="userSpaceOnUse">
            <stop stopColor={v('--color-accent')} />
            <stop offset="1" stopColor={v('--color-accent')} stopOpacity="0" />
          </linearGradient>
          <clipPath id="logo-clip">
            <path d="M0 5.208C0 2.332 2.332 0 5.208 0h10.676c2.876 0 5.208 2.332 5.208 5.208v20.571c0 2.876-2.332 5.208-5.208 5.208H5.208C2.332 30.987 0 28.655 0 25.779V5.208Z" fill="white" />
          </clipPath>
        </defs>
        <g clipPath="url(#logo-clip)">
          <path d="M0 5.208C0 2.332 2.332 0 5.208 0h10.676c2.876 0 5.208 2.332 5.208 5.208v20.571c0 2.876-2.332 5.208-5.208 5.208H5.208C2.332 30.987 0 28.655 0 25.779V5.208Z" fill="currentColor" fillOpacity="0.06" />
          <path opacity="0.4" d="M19.943 7.497 8.468 18.901a.369.369 0 0 1-.737-.003L1.408 12.508a.369.369 0 0 1 .003-.736L12.885.368a.369.369 0 0 1 .737.003l6.324 6.39a.369.369 0 0 1-.003.736Z" fill="url(#logo-grad)" />
          <path d="M20.942 12.513 9.224 24.358a.369.369 0 0 1-.891-.366v-3.59c0-.136.054-.268.15-.365L20.201 8.192a.369.369 0 0 1 .891.366v3.59c0 .136-.054.268-.15.365Z" fill={v('--color-accent')} />
          <path d="M20.942 18.242 9.224 30.086a.369.369 0 0 1-.891-.366v-3.59c0-.136.054-.268.15-.365L20.201 13.92a.369.369 0 0 1 .891.366v3.59c0 .136-.054.268-.15.365Z" fill={v('--color-accent')} />
          <path d="M7.784 25.504.892 18.492a.369.369 0 0 0-.892.365v3.585c0 .136.054.268.15.365l6.891 7.013a.369.369 0 0 0 .892-.366v-3.584a.518.518 0 0 0-.15-.366Z" fill={v('--color-accent-dark')} />
          <path d="M7.784 19.898.892 12.886a.369.369 0 0 0-.892.365v3.585c0 .136.054.268.15.365l6.891 7.012a.369.369 0 0 0 .892-.365v-3.584a.518.518 0 0 0-.15-.366Z" fill={v('--color-accent-dark')} />
        </g>
      </svg>
      <span style={{
        fontFamily: v('--font-text'), fontWeight: 700, fontSize, letterSpacing: "-0.03em",
        lineHeight: 1, whiteSpace: "nowrap",
      }}>
        <span style={{ color: v('--color-accent') }}>solar-check</span>
        <span style={{ color: "#BEBEBE" }}>.io</span>
      </span>
    </span>
  );
}
