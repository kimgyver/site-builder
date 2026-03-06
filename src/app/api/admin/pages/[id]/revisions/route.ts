import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "@/lib/adminAuth";

function parseTake(rawTake: string | null) {
  if (!rawTake) {
    return 10;
  }
  const parsed = Number.parseInt(rawTake, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 10;
  }
  return Math.min(parsed, 20);
}

function parseSkip(rawSkip: string | null) {
  if (!rawSkip) {
    return 0;
  }
  const parsed = Number.parseInt(rawSkip, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: pageId } = await context.params;

  if (!pageId) {
    return NextResponse.json({ error: "INVALID_PAGE_ID" }, { status: 400 });
  }

  if (isAdminAuthEnabled()) {
    const role = getRoleFromSessionCookie(
      request.cookies.get(SESSION_COOKIE_NAME)?.value
    );
    if (!role) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  const take = parseTake(request.nextUrl.searchParams.get("take"));
  const skip = parseSkip(request.nextUrl.searchParams.get("skip"));

  try {
    const rows = await prisma.pageRevision.findMany({
      where: { pageId },
      orderBy: { version: "desc" },
      skip,
      take: take + 1,
      select: {
        id: true,
        version: true,
        source: true,
        createdAt: true,
        note: true,
        snapshot: true
      }
    });

    const hasMore = rows.length > take;
    const revisions = hasMore ? rows.slice(0, take) : rows;

    return NextResponse.json({ ok: true, revisions, hasMore });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P1001"
    ) {
      return NextResponse.json({ error: "DB_UNAVAILABLE" }, { status: 503 });
    }
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json({ error: "DB_UNAVAILABLE" }, { status: 503 });
    }
    return NextResponse.json(
      { error: "LOAD_REVISIONS_FAILED" },
      { status: 500 }
    );
  }
}
