import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeCmsHtml } from "@/lib/sanitizeCmsHtml";
import {
  SESSION_COOKIE_NAME,
  canEditContent,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "@/lib/adminAuth";
import type { IncomingRawSectionInput } from "@/types/sections";

function sanitizeRichHtml(input: unknown) {
  return sanitizeCmsHtml(input);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await context.params;

  if (!groupId) {
    return NextResponse.json({ error: "INVALID_GROUP_ID" }, { status: 400 });
  }

  if (isAdminAuthEnabled()) {
    const role = getRoleFromSessionCookie(
      request.cookies.get(SESSION_COOKIE_NAME)?.value
    );
    if (!role || !canEditContent(role)) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  let body: {
    sections?: unknown;
    expectedUpdatedAt?: unknown;
    name?: unknown;
  } = {};
  try {
    body = (await request.json()) as {
      sections?: unknown;
      expectedUpdatedAt?: unknown;
      name?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const expectedUpdatedAt =
    typeof body.expectedUpdatedAt === "string" ? body.expectedUpdatedAt : "";
  const expectedDate = expectedUpdatedAt ? new Date(expectedUpdatedAt) : null;

  const parsedSections = Array.isArray(body.sections)
    ? (body.sections as IncomingRawSectionInput[])
    : [];

  const nextSections = parsedSections
    .map((section, index) => {
      const props = section?.props ?? {};
      const rawType = String(section?.type ?? "text");
      const nextProps =
        rawType === "richText" || rawType === "text" || rawType === "rawHtml"
          ? { ...props, html: sanitizeRichHtml(props.html) }
          : rawType === "columns"
            ? {
                ...props,
                leftHtml: sanitizeRichHtml(props.leftHtml),
                rightHtml: sanitizeRichHtml(props.rightHtml)
              }
            : props;

      const normalizedProps = JSON.parse(
        JSON.stringify(nextProps)
      ) as Prisma.InputJsonValue;

      return {
        type: rawType,
        order: index,
        enabled: section?.enabled !== false,
        props: normalizedProps
      };
    })
    .filter(section => Boolean(section.type));

  try {
    const result = await prisma.$transaction(async tx => {
      const group = await tx.globalSectionGroup.findUnique({
        where: { id: groupId },
        select: { id: true, name: true, updatedAt: true }
      });

      if (!group) {
        throw new Error("GROUP_NOT_FOUND");
      }

      if (
        expectedDate &&
        Number.isFinite(expectedDate.getTime()) &&
        group.updatedAt.getTime() !== expectedDate.getTime()
      ) {
        throw new Error("STALE_GROUP");
      }

      const nextName =
        typeof body.name === "string" && body.name.trim()
          ? body.name.trim()
          : group.name;

      const updated = await tx.globalSectionGroup.update({
        where: { id: groupId },
        data: { name: nextName },
        select: { updatedAt: true }
      });

      await tx.globalSection.deleteMany({ where: { groupId } });

      if (nextSections.length) {
        await tx.globalSection.createMany({
          data: nextSections.map(s => ({
            groupId,
            type: s.type,
            order: s.order,
            enabled: s.enabled,
            props: s.props
          }))
        });
      }

      return { updatedAt: updated.updatedAt.toISOString() };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "STALE_GROUP") {
      return NextResponse.json({ error: "STALE" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "GROUP_NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "UNKNOWN" }, { status: 500 });
  }
}
