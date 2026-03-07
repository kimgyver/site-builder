import { NextResponse, type NextRequest } from "next/server";
import { PageStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRetryableDbError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Error in PostgreSQL connection") ||
    message.includes("kind: Closed") ||
    message.includes("P1001") ||
    message.includes("P1002")
  );
}

async function runScheduledPublish(now: Date) {
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
    return { published: 0 };
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

  return { published: result.count };
}

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
  try {
    const firstTry = await runScheduledPublish(now);
    return NextResponse.json({ ok: true, published: firstTry.published });
  } catch (error) {
    if (!isRetryableDbError(error)) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { ok: false, error: "SCHEDULE_PUBLISH_FAILED", detail: message },
        { status: 500 }
      );
    }
  }

  try {
    const secondTry = await runScheduledPublish(now);
    return NextResponse.json({
      ok: true,
      published: secondTry.published,
      retried: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: "DB_UNAVAILABLE", detail: message },
      { status: 503 }
    );
  }
}
