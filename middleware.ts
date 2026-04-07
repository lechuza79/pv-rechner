import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session (important for Server Components)
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  // Only run middleware on routes that actually need auth session refresh.
  // Keeps Vercel middleware-invocations (and Supabase getUser() calls) low.
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/calculations/:path*",
    "/auth/callback",
  ],
};
