import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  buildSessionCookieValue,
  isAdminAuthEnabled,
  resolveRoleForPassword
} from "@/lib/adminAuth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const nextPathRaw = String(formData.get("next") ?? "/admin");
  const nextPath = nextPathRaw.startsWith("/admin") ? nextPathRaw : "/admin";

  if (!isAdminAuthEnabled()) {
    return NextResponse.redirect(new URL(nextPath, request.url), 303);
  }

  const role = resolveRoleForPassword(password);
  if (!role) {
    const redirectUrl = new URL("/admin/login", request.url);
    redirectUrl.searchParams.set("error", "1");
    redirectUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(redirectUrl, 303);
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  response.cookies.set(SESSION_COOKIE_NAME, buildSessionCookieValue(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });

  return response;
}
