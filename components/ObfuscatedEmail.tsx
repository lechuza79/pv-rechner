"use client";

// Assembles a mailto address from two parts at runtime so it never appears as
// a plain "user@domain" string in the server-rendered HTML — simple bots that
// scrape static markup for email addresses won't find it, while real users
// get a normal clickable mailto link (identical to a static one visually).
interface ObfuscatedEmailProps {
  user: string;
  domain: string;
  style?: React.CSSProperties;
}

export default function ObfuscatedEmail({ user, domain, style }: ObfuscatedEmailProps) {
  const address = `${user}@${domain}`;
  return (
    <a href={`mailto:${address}`} style={style}>
      {address}
    </a>
  );
}
