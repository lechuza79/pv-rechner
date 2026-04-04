import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component context
          }
        },
      },
    }
  );
}

// GET /api/calculations — Liste aller Berechnungen des Users
export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("calculations")
    .select("id, name, description, kwp, amortisation_jahre, rendite_25j, flow_type, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/calculations — Neue Berechnung speichern
export async function POST(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ─── Validation helpers ──────────────────────────────────────────────────
  const int = (v: unknown, min: number, max: number): number | null => {
    const n = Number(v);
    return Number.isInteger(n) && n >= min && n <= max ? n : null;
  };
  const float = (v: unknown, min: number, max: number): number | null => {
    const n = Number(v);
    return isFinite(n) && n >= min && n <= max ? n : null;
  };
  const str = (v: unknown, allowed: string[]): string | null =>
    typeof v === "string" && allowed.includes(v) ? v : null;
  const optStr = (v: unknown, maxLen: number): string | null =>
    typeof v === "string" ? v.slice(0, maxLen) : null;

  // ─── Required fields ────────────────────────────────────────────────────
  const anlage = int(body.anlage, 0, 4);
  const speicher = int(body.speicher, 0, 3);
  const personen = int(body.personen, 0, 3);
  const nutzung = int(body.nutzung, 0, 3);
  const wp = str(body.wp, ["nein", "geplant", "ja"]);
  const ea = str(body.ea, ["nein", "geplant", "ja"]);
  const kwp = float(body.kwp, 1, 50);
  const oErtrag = int(body.o_ertrag, 700, 1400);

  if (anlage === null || speicher === null || personen === null || nutzung === null || !wp || !ea || !kwp || !oErtrag) {
    return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
  }

  // ─── Optional fields with bounds ────────────────────────────────────────
  const einspeisungModus = str(body.einspeisung_modus, ["aus", "teil", "voll"])
    ?? (body.einspeisung_an === false ? "aus" : "teil");

  const { data, error } = await supabase
    .from("calculations")
    .insert({
      user_id: user.id,
      name: optStr(body.name, 100) || "Meine Berechnung",
      description: optStr(body.description, 500) || null,
      anlage,
      custom_kwp: int(body.custom_kwp, 1, 50) ?? kwp,
      speicher,
      personen,
      nutzung,
      wp,
      ea,
      ea_km: int(body.ea_km, 1000, 50000) ?? 15000,
      o_kosten: float(body.o_kosten, 500, 200000) ?? null,
      o_ev: float(body.o_ev, 5, 95) ?? null,
      o_strom: float(body.o_strom, 0.05, 1.0) ?? 0.34,
      o_einsp: float(body.o_einsp, 0, 20) ?? null,
      einspeisung_modus: einspeisungModus,
      o_ertrag: oErtrag,
      plz: typeof body.plz === "string" && /^\d{5}$/.test(body.plz) ? body.plz : null,
      fuel_type: str(body.fuel_type, ["gas", "oil"]) ?? "gas",
      ...(str(body.flow_type, ["manual", "empfehlung"]) ? { flow_type: body.flow_type as string } : {}),
      ...(int(body.haustyp, 0, 3) !== null ? { haustyp: int(body.haustyp, 0, 3) } : {}),
      ...(int(body.dachart, 0, 3) !== null ? { dachart: int(body.dachart, 0, 3) } : {}),
      ...(float(body.budget_limit, 0, 500000) !== null ? { budget_limit: float(body.budget_limit, 0, 500000) } : {}),
      kwp,
      amortisation_jahre: int(body.amortisation_jahre, 0, 30) ?? null,
      rendite_25j: int(body.rendite_25j, -100000, 500000) ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Berechnung konnte nicht gespeichert werden" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
