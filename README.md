# PV Rechner

Ehrlicher PV-Rentabilitätsrechner ohne Leadfunnel.

## Setup

```bash
npm install
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

## Deploy auf Vercel

1. Repo auf GitHub pushen
2. [vercel.com/new](https://vercel.com/new) → GitHub-Repo importieren
3. Framework: Next.js (wird automatisch erkannt)
4. Deploy klicken
5. Domain verbinden unter Settings → Domains

## Struktur

```
app/
  layout.tsx    → HTML-Grundgerüst, Fonts, SEO-Meta
  page.tsx      → Einstiegspunkt
  rechner.tsx   → PV-Rechner Komponente (client-side)
```
