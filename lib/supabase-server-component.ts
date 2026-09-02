import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { nurFuerDieSitzung } from "./auth-cookies";

export async function createClient() {
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
              cookieStore.set(name, value, nurFuerDieSitzung(name, options))
            );
          } catch {
            // Ignore - this is called from Server Components where cookies can't be set
          }
        },
      },
    }
  );
}
