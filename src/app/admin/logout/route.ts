import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(
    new URL("/admin/login", request.url),
    303
  );
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
