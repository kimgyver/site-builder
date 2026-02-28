import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "./src/lib/adminAuth";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./src/lib/i18n";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    const segments = pathname.split("/").filter(Boolean);
    const isSingleSegment = segments.length === 1;
    const first = segments[0];
    const isLocale = first
      ? (SUPPORTED_LOCALES as readonly string[]).includes(first)
      : false;
    const isBypassedPrefix =
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml" ||
      pathname === "/favicon.ico";

    if (
      isSingleSegment &&
      first &&
      !isLocale &&
      !isBypassedPrefix &&
      !first.includes(".")
    ) {
      const target = new URL(
        `/${DEFAULT_LOCALE}/${encodeURIComponent(first)}${search || ""}`,
        request.url
      );
      return NextResponse.redirect(target);
    }

    return NextResponse.next();
  }

  if (!isAdminAuthEnabled()) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/admin/login";
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const role = getRoleFromSessionCookie(session);
  const authed = Boolean(role);

  if (isLoginPage) {
    if (authed) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!authed) {
    const nextPath = `${pathname}${search || ""}`;
    const loginUrl = new URL(
      `/admin/login?next=${encodeURIComponent(nextPath)}`,
      request.url
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
