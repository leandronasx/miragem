import { isStaff } from "@/lib/auth/staff";
import type { Database } from "@/lib/database.types";
import { assertBrowserSafeSupabaseKey } from "@/lib/supabase/anon-key";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (isAdminRoute(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  try {
    assertBrowserSafeSupabaseKey(key, "middleware");
  } catch {
    if (isAdminRoute(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();

  if (isAdminRoute(request.nextUrl.pathname)) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;

    if (!user) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(login);
    }

    const meta = user.user_metadata as { is_banned?: boolean } | undefined;
    if (meta?.is_banned === true) {
      const login = new URL("/login", request.url);
      login.searchParams.set("error", "banned");
      return NextResponse.redirect(login);
    }

    if (!isStaff(user)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return supabaseResponse;
}
