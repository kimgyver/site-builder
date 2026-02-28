import { NextResponse, type NextRequest } from "next/server";

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return true;
  }
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  if (!rawUrl) {
    return NextResponse.json({ error: "MISSING_URL" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "INVALID_URL" }, { status: 400 });
  }

  const protocol = target.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    return NextResponse.json(
      { error: "UNSUPPORTED_PROTOCOL" },
      { status: 400 }
    );
  }

  if (isBlockedHost(target.hostname)) {
    return NextResponse.json({ error: "BLOCKED_HOST" }, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: "GET",
      cache: "force-cache",
      redirect: "follow",
      headers: {
        accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "user-agent": "SiteBuilderEditorImageProxy/1.0"
      }
    });
  } catch {
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: "UPSTREAM_ERROR" }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return NextResponse.json({ error: "NOT_IMAGE" }, { status: 415 });
  }

  const headers = new Headers();
  headers.set("content-type", contentType);
  headers.set("cache-control", "public, max-age=3600, s-maxage=3600");

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("content-length", contentLength);

  return new NextResponse(upstream.body, {
    status: 200,
    headers
  });
}
