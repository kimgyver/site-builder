import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "./src/lib/adminAuth";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
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
  matcher: ["/admin/:path*"]
};
