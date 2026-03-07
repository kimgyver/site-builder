import { NextResponse, type NextRequest } from "next/server";
import { PageStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getSiteSettings,
  normalizeCronIntervalMinutes
} from "@/lib/siteSettings";

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
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const triggerSource = userAgent.includes("vercel-cron")
    ? "vercel-cron"
    : userAgent.includes("github-actions")
      ? "github-actions"
      : "manual-or-other";

  if (!isAuthorized(request)) {
    console.warn("[cron:publish] unauthorized request", {
      triggerSource,
      userAgent
    });
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const now = new Date();
  const settings = await getSiteSettings();
  const interval = normalizeCronIntervalMinutes(
    settings.cronPublishIntervalMinutes
  );

  console.info("[cron:publish] invoked", {
    triggerSource,
    nowIso: now.toISOString(),
    intervalMinutes: interval
  });

  if (now.getUTCMinutes() % interval !== 0) {
    console.info("[cron:publish] skipped", {
      reason: "INTERVAL_NOT_REACHED",
      currentUtcMinute: now.getUTCMinutes(),
      intervalMinutes: interval
    });
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "INTERVAL_NOT_REACHED",
      intervalMinutes: interval
    });
  }

  try {
    const firstTry = await runScheduledPublish(now);
    console.info("[cron:publish] completed", {
      published: firstTry.published,
      intervalMinutes: interval,
      retried: false
    });
    return NextResponse.json({
      ok: true,
      published: firstTry.published,
      intervalMinutes: interval
    });
  } catch (error) {
    if (!isRetryableDbError(error)) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[cron:publish] failed", {
        stage: "first-try",
        retryable: false,
        message
      });
      return NextResponse.json(
        { ok: false, error: "SCHEDULE_PUBLISH_FAILED", detail: message },
        { status: 500 }
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    console.warn("[cron:publish] retrying after retryable db error", {
      stage: "first-try",
      retryable: true,
      message
    });
  }

  try {
    const secondTry = await runScheduledPublish(now);
    console.info("[cron:publish] completed", {
      published: secondTry.published,
      intervalMinutes: interval,
      retried: true
    });
    return NextResponse.json({
      ok: true,
      published: secondTry.published,
      intervalMinutes: interval,
      retried: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron:publish] failed", {
      stage: "second-try",
      retryable: false,
      message
    });
    return NextResponse.json(
      { ok: false, error: "DB_UNAVAILABLE", detail: message },
      { status: 503 }
    );
  }
}
