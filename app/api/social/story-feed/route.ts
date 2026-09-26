import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "../../../../lib/admin-guard";
import { ortsBeitraegeFuerId } from "../../../../lib/orts-beitraege-server";
import { storyEdition } from "../../../../lib/orts-story-feed";
import { saveStoryEdition } from "../../../../lib/orts-story-feed-db";
import { fassungsAbdruck, pruefungGueltig } from "../../../../lib/social-pruefung";
import { supabase } from "../../../../lib/supabase-server";

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || !/^\d{8}$/.test(body.regionId) || typeof body.postId !== "string" ||
      typeof body.fassung !== "string" || !["save", "publish"].includes(body.action)) {
    return NextResponse.json({ error: "Gemeinde, Beitrag, Fassung und Aktion erforderlich" }, { status: 400 });
  }
  try {
    const page = await ortsBeitraegeFuerId(body.regionId);
    const beitrag = page?.beitraege.find(b => b.post.id === body.postId);
    if (!page || !beitrag) return NextResponse.json({ error: "Beitrag nicht gefunden" }, { status: 404 });
    const fassung = { text: beitrag.post.text, bild: beitrag.post.bild };
    if (fassungsAbdruck(fassung) !== body.fassung) return NextResponse.json({ error: "Der Beitrag hat sich geändert. Bitte neu prüfen." }, { status: 409 });
    if (body.action === "publish") {
      const approval = await pruefungGueltig(beitrag.post.id, fassung);
      if (!approval.ok) return NextResponse.json({ error: approval.grund }, { status: 409 });
    }
    const edition = storyEdition(body.regionId, page.standIso.slice(0, 10), beitrag, new Date().toISOString());
    await saveStoryEdition(edition);
    if (body.action === "publish") {
      if (!supabase) throw new Error("Datenbank nicht konfiguriert");
      const { error } = await supabase.from("municipality_story_publications").upsert({
        region_id: edition.regionId, edition_id: edition.id,
      }, { onConflict: "region_id,edition_id", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    }
    return NextResponse.json({ ok: true, edition, published: body.action === "publish" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const regionId = req.nextUrl.searchParams.get("regionId") ?? "";
  const postId = req.nextUrl.searchParams.get("postId") ?? "";
  if (!/^\d{8}$/.test(regionId) || !postId.startsWith(`ort-${regionId}-`)) return NextResponse.json({ error: "Ungültiger Beitrag" }, { status: 400 });
  if (!supabase) return NextResponse.json({ error: "Datenbank nicht konfiguriert" }, { status: 503 });
  const { data, error } = await supabase.from("municipality_story_editions").select("payload")
    .eq("region_id", regionId).eq("payload->beitrag->post->>id", postId)
    .order("created_at", { ascending: false }).limit(30);
  if (error) return NextResponse.json({ error: "Gespeicherte Stories nicht abrufbar" }, { status: 503 });
  return NextResponse.json({ editions: (data ?? []).map(r => r.payload) });
}
