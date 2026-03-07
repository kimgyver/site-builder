import { NextResponse, type NextRequest } from "next/server";
import { PageStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return true;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return authHeader === expected;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const now = new Date();

  const readyPages = await prisma.page.findMany({
    where: {
      status: PageStatus.DRAFT,
      publishAt: {
        lte: now
      }
    },
    select: { id: true },
    take: 200,
    orderBy: { publishAt: "asc" }
  });

  if (readyPages.length === 0) {
    return NextResponse.json({ ok: true, published: 0 });
  }

  const ids = readyPages.map(page => page.id);

  const result = await prisma.page.updateMany({
    where: {
      id: { in: ids },
      status: PageStatus.DRAFT
    },
    data: {
      status: PageStatus.PUBLISHED,
      publishAt: null,
      lastPublishedAt: now
    }
  });

  return NextResponse.json({
    ok: true,
    published: result.count
  });
}
