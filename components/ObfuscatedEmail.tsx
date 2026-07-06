"use client";

import { useEffect, useState } from "react";

// Spam-safe mailto link: the server-rendered HTML only ever contains the
// "user [at] domain" text (client components are SSR'd too, so assembling the
// address during render would still bake it into the delivered markup). The
// real address + mailto link appear only after mount — plain-HTML scrapers
// never see it, users get a normal clickable link.
interface ObfuscatedEmailProps {
  user: string;
  domain: string;
  style?: React.CSSProperties;
}

export default function ObfuscatedEmail({ user, domain, style }: ObfuscatedEmailProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span style={style}>{user} [at] {domain}</span>;
  }

  const address = `${user}@${domain}`;
  return (
    <a href={`mailto:${address}`} style={style}>
      {address}
    </a>
  );
}
