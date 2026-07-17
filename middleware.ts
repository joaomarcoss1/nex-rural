import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  response.headers.set("x-nex-rural-area", pathname.startsWith("/portal") ? "portal" : "internal");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");

  // A autenticacao principal usa Supabase Auth no cliente. Quando a sessao SSR for
  // adotada, /master deve validar admin_master_global aqui antes de renderizar.
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|nex-rural-logo|manifest.webmanifest|sw.js).*)"]
};
