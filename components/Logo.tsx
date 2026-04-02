/** Horizontal logo: PNG image, width-prop controls size */
export default function Logo({ width = 130 }: { width?: number }) {
  return (
    <img
      src="/logo.png"
      alt="solar-check.io"
      width={width}
      style={{ display: "block", flexShrink: 0, height: "auto" }}
    />
  );
}
