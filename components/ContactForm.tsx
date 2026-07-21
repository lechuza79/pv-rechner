"use client";

import { useState } from "react";
import { v, iconSizes } from "../lib/theme";
import { IconCheck, IconClose } from "./Icons";
import { CONTACT_TOPICS, DEFAULT_CONTACT_TOPIC, type ContactTopic } from "../lib/contact-topics";

const S = {
  form: { marginTop: 24, display: "flex", flexDirection: "column", gap: 14 } as React.CSSProperties,
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: v('--color-text-secondary'),
    textTransform: "uppercase",
    letterSpacing: "0.02em",
  } as React.CSSProperties,
  field: { display: "flex", flexDirection: "column", gap: 6 } as React.CSSProperties,
  input: {
    fontFamily: v('--font-text'),
    fontSize: 14,
    color: v('--color-text-primary'),
    background: v('--color-bg-muted'),
    border: `1px solid ${v('--color-border')}`,
    borderRadius: v('--radius-sm'),
    padding: "10px 12px",
    outline: "none",
  } as React.CSSProperties,
  textarea: {
    fontFamily: v('--font-text'),
    fontSize: 14,
    color: v('--color-text-primary'),
    background: v('--color-bg-muted'),
    border: `1px solid ${v('--color-border')}`,
    borderRadius: v('--radius-sm'),
    padding: "10px 12px",
    outline: "none",
    resize: "vertical",
    minHeight: 120,
  } as React.CSSProperties,
  honeypot: {
    position: "absolute",
    left: "-9999px",
    width: 1,
    height: 1,
    overflow: "hidden",
  } as React.CSSProperties,
  button: {
    fontFamily: v('--font-text'),
    fontSize: 14,
    fontWeight: 700,
    color: v('--color-text-on-accent'),
    background: v('--color-accent'),
    border: "none",
    borderRadius: v('--radius-md'),
    padding: "12px 20px",
    cursor: "pointer",
    marginTop: 4,
  } as React.CSSProperties,
  buttonDisabled: { opacity: 0.6, cursor: "default" } as React.CSSProperties,
  message: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    borderRadius: v('--radius-sm'),
    padding: "10px 12px",
    marginTop: 4,
  } as React.CSSProperties,
  success: {
    color: v('--color-positive'),
    // Derived from the positive token so the tint follows the theme (no fixed green).
    background: 'color-mix(in srgb, var(--color-positive) 9%, transparent)',
    border: '1px solid color-mix(in srgb, var(--color-positive) 24%, transparent)',
  } as React.CSSProperties,
  error: {
    color: v('--color-negative'),
    background: v('--color-negative-dim'),
    border: `1px solid ${v('--color-negative-border')}`,
  } as React.CSSProperties,
};

type Status = "idle" | "sending" | "success" | "error";

/**
 * Das Kontaktformular. Eine Implementierung für zwei Orte: die Kontaktseite und
 * das Modal auf den Gemeinde-Seiten (dort mit vorbelegtem Thema + Text, damit
 * niemand die Seite verlassen muss, um eine Frage zu stellen).
 *
 * Vorbelegen heißt vorbelegen, nicht festnageln: Thema und Text bleiben
 * editierbar. Der Mail-Betreff entsteht serverseitig ausschließlich aus der
 * CONTACT_TOPICS-Allowlist — durchgereichter Text landet nie im Header.
 */
export default function ContactForm({
  initialTopic = DEFAULT_CONTACT_TOPIC,
  initialMessage = "",
}: {
  initialTopic?: ContactTopic;
  initialMessage?: string;
} = {}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<ContactTopic>(initialTopic);
  const [message, setMessage] = useState(initialMessage);
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errorText, setErrorText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorText("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, topic, message, website }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorText(data.error || "Deine Nachricht konnte nicht gesendet werden. Bitte versuch es später erneut.");
        return;
      }

      setStatus("success");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
      setErrorText("Deine Nachricht konnte nicht gesendet werden. Bitte prüfe deine Internetverbindung und versuch es erneut.");
    }
  }

  if (status === "success") {
    return (
      <div style={{ ...S.message, ...S.success }}>
        <IconCheck size={iconSizes.md} />
        <span>Danke für deine Nachricht! Wir melden uns in der Regel innerhalb von 1–2 Werktagen bei dir.</span>
      </div>
    );
  }

  return (
    <form style={S.form} onSubmit={handleSubmit}>
      <div style={S.field}>
        <label style={S.label} htmlFor="contact-name">Name (optional)</label>
        <input
          id="contact-name"
          type="text"
          style={S.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>

      <div style={S.field}>
        <label style={S.label} htmlFor="contact-email">E-Mail</label>
        <input
          id="contact-email"
          type="email"
          required
          style={S.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      <div style={S.field}>
        <label style={S.label} htmlFor="contact-topic">Worum geht es?</label>
        <select
          id="contact-topic"
          style={{ ...S.input, cursor: "pointer" }}
          value={topic}
          onChange={(e) => setTopic(e.target.value as ContactTopic)}
        >
          {CONTACT_TOPICS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div style={S.field}>
        <label style={S.label} htmlFor="contact-message">Nachricht</label>
        <textarea
          id="contact-message"
          required
          minLength={10}
          maxLength={5000}
          style={S.textarea}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {/* Honeypot: hidden from real users via CSS, tabIndex -1 keeps keyboard
          users from tabbing into it. Bots that fill every input trip this. */}
      <div style={S.honeypot} aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {status === "error" && (
        <div style={{ ...S.message, ...S.error }}>
          <IconClose size={iconSizes.md} />
          <span>{errorText}</span>
        </div>
      )}

      <button
        type="submit"
        style={{ ...S.button, ...(status === "sending" ? S.buttonDisabled : {}) }}
        disabled={status === "sending"}
      >
        {status === "sending" ? "Wird gesendet …" : "Nachricht senden"}
      </button>
    </form>
  );
}
