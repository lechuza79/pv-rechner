/** Horizontal logo: PNG image, height-prop controls size */
export default function Logo({ height = 24 }: { height?: number }) {
  return (
    <img
      src="/logo.png"
      alt="solar-check.io"
      height={height}
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}
