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

  const body = await req.json();

  const { data, error } = await supabase
    .from("calculations")
    .insert({
      user_id: user.id,
      name: body.name || "Meine Berechnung",
      description: body.description || null,
      anlage: body.anlage,
      custom_kwp: body.custom_kwp,
      speicher: body.speicher,
      personen: body.personen,
      nutzung: body.nutzung,
      wp: body.wp,
      ea: body.ea,
      ea_km: body.ea_km,
      o_kosten: body.o_kosten,
      o_ev: body.o_ev,
      o_strom: body.o_strom,
      o_einsp: body.o_einsp,
      einspeisung_an: body.einspeisung_an,
      o_ertrag: body.o_ertrag,
      plz: body.plz,
      fuel_type: body.fuel_type,
      ...(body.flow_type ? { flow_type: body.flow_type } : {}),
      ...(body.haustyp != null ? { haustyp: body.haustyp } : {}),
      ...(body.dachart != null ? { dachart: body.dachart } : {}),
      ...(body.budget_limit != null ? { budget_limit: body.budget_limit } : {}),
      kwp: body.kwp,
      amortisation_jahre: body.amortisation_jahre,
      rendite_25j: body.rendite_25j,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
