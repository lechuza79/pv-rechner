import { v } from "../../../lib/theme";

/**
 * Shows the full Strommix widget exactly as it embeds (chart + legend + period
 * switch + share/embed footer), via the real /embed/strommix iframe. The widget
 * is self-explanatory and carries its own share + embed actions in the footer.
 */
export default function AtomstromWidget() {
  return (
    <iframe
      src="/embed/strommix"
      title="Strommix Deutschland mit Atomstrom-Import"
      loading="lazy"
      style={{
        width: "100%",
        height: 460,
        border: `1px solid ${v("--color-border")}`,
        borderRadius: v("--radius-md"),
        display: "block",
      }}
    />
  );
}
