"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MastrHeroSection } from "../../../components/MastrHeroSection";
import { v } from "../../../lib/theme";

function MastrLabInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialRegion = params.get("region") ?? undefined;

  const handleRegionChange = useCallback(
    (ags: string | undefined) => {
      const next = new URLSearchParams(params.toString());
      if (ags) next.set("region", ags);
      else next.delete("region");
      router.replace(`/lab/mastr${next.toString() ? `?${next}` : ""}`, { scroll: false });
    },
    [params, router],
  );

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 20px" }}>
      <header style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 11,
            color: v("--color-text-muted"),
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Lab · work in progress
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            margin: "4px 0 6px",
            color: v("--color-text-primary"),
          }}
        >
          MaStR Hero-Karte
        </h1>
        <p style={{ fontSize: 14, color: v("--color-text-secondary"), margin: 0 }}>
          Anlagen aus dem Marktstammdatenregister. Klick auf ein Bundesland für Detail. Region in
          der URL — shareable.
        </p>
      </header>

      <MastrHeroSection initialRegion={initialRegion} onRegionChange={handleRegionChange} />
    </main>
  );
}

export function MastrLab() {
  return (
    <Suspense fallback={null}>
      <MastrLabInner />
    </Suspense>
  );
}
