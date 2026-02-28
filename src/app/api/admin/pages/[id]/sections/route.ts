import { NextResponse, type NextRequest } from "next/server";
import { Prisma, RevisionSource } from "@prisma/client";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  canEditContent,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "@/lib/adminAuth";
import type { IncomingRawSectionInput } from "@/types/sections";

function isMissingSectionRevisionTable(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  if (error.code !== "P2021") {
    return false;
  }
  const table =
    error.meta && typeof error.meta === "object" && "table" in error.meta
      ? String((error.meta as Record<string, unknown>).table ?? "")
      : "";
  return table.toLowerCase().includes("sectionrevision");
}

function sanitizeRichHtml(input: unknown) {
  const html = typeof input === "string" ? input : "";
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "span",
      "mark",
      "blockquote",
      "code",
      "pre",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "colgroup",
      "col"
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      span: ["style"],
      mark: ["data-color", "style"],
      img: [
        "src",
        "alt",
        "title",
        "loading",
        "data-width",
        "data-width-px",
        "data-in-table",
        "data-align",
        "style"
      ],
      table: ["style"],
      th: [
        "colspan",
        "rowspan",
        "data-bg",
        "data-colwidth",
        "data-height-px",
        "data-border",
        "data-border-color",
        "data-border-width",
        "data-align",
        "style"
      ],
      td: [
        "colspan",
        "rowspan",
        "data-bg",
        "data-colwidth",
        "data-height-px",
        "data-border",
        "data-border-color",
        "data-border-width",
        "data-align",
        "style"
      ],
      col: ["span", "style"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"]
    },
    allowProtocolRelative: false,
    allowedStyles: {
      span: {
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/]
      },
      mark: {
        "background-color": [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/]
      },
      img: {
        width: [/^\d+(\.\d+)?%$/, /^\d+(\.\d+)?px$/]
      },
      table: {
        width: [
          /^\d+(\.\d+)?px$/,
          /^\d+(\.\d+)?%$/,
          /^auto$/,
          /^fit-content$/,
          /^max-content$/
        ]
      },
      col: {
        width: [/^\d+(\.\d+)?px$/, /^\d+(\.\d+)?%$/]
      },
      th: {
        "background-color": [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/],
        width: [/^\d+(\.\d+)?px$/, /^\d+(\.\d+)?%$/],
        height: [/^\d+(\.\d+)?px$/],
        "text-align": [/^(left|center|right)$/],
        "border-color": [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/],
        "border-width": [/^\d+(\.\d+)?px$/],
        "border-style": [/^(solid|dashed)$/]
      },
      td: {
        "background-color": [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/],
        width: [/^\d+(\.\d+)?px$/, /^\d+(\.\d+)?%$/],
        height: [/^\d+(\.\d+)?px$/],
        "text-align": [/^(left|center|right)$/],
        "border-color": [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/],
        "border-width": [/^\d+(\.\d+)?px$/],
        "border-style": [/^(solid|dashed)$/]
      }
    }
  });
}

export async function PUT(
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
    if (!role || !canEditContent(role)) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  let body: { sections?: unknown; expectedUpdatedAt?: unknown } = {};
  try {
    body = (await request.json()) as {
      sections?: unknown;
      expectedUpdatedAt?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const expectedUpdatedAt =
    typeof body.expectedUpdatedAt === "string" ? body.expectedUpdatedAt : "";

  const parsedSections = Array.isArray(body.sections)
    ? (body.sections as IncomingRawSectionInput[])
    : [];

  const nextSections = parsedSections
    .map((section, index) => {
      const props = section?.props ?? {};
      const rawType = String(section?.type ?? "text");
      const nextProps =
        rawType === "richText" || rawType === "text"
          ? { ...props, html: sanitizeRichHtml(props.html) }
          : rawType === "hero"
            ? {
                ...props,
                title:
                  typeof props.title === "string" ? props.title : props.title,
                subtitle:
                  typeof props.subtitle === "string"
                    ? props.subtitle
                    : props.subtitle,
                backgroundColor:
                  typeof props.backgroundColor === "string"
                    ? props.backgroundColor
                    : "#18181b",
                textColor:
                  typeof props.textColor === "string"
                    ? props.textColor
                    : "#fafafa",
                subtitleColor:
                  typeof props.subtitleColor === "string"
                    ? props.subtitleColor
                    : "#d4d4d8"
              }
            : props;

      const normalizedProps = JSON.parse(
        JSON.stringify(nextProps)
      ) as Prisma.InputJsonValue;

      return {
        id: typeof section?.id === "string" ? section.id : undefined,
        type: rawType,
        order: index,
        enabled: section?.enabled !== false,
        props: normalizedProps
      };
    })
    .filter(section => Boolean(section.type));

  const expectedDate = expectedUpdatedAt ? new Date(expectedUpdatedAt) : null;

  try {
    const result = await prisma.$transaction(
      async tx => {
        const page = await tx.page.findUnique({
          where: { id: pageId },
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            seoTitle: true,
            seoDescription: true,
            updatedAt: true
          }
        });

        if (!page) {
          throw new Error("PAGE_NOT_FOUND");
        }

        if (
          expectedDate &&
          Number.isFinite(expectedDate.getTime()) &&
          page.updatedAt.getTime() !== expectedDate.getTime()
        ) {
          throw new Error("STALE_PAGE");
        }

        const existing = await tx.section.findMany({
          where: { pageId },
          select: { id: true }
        });
        const existingIds = new Set(existing.map(section => section.id));

        const keepIds = new Set(
          nextSections
            .map(section => section.id)
            .filter(
              (id): id is string =>
                typeof id === "string" &&
                !id.startsWith("temp-") &&
                existingIds.has(id)
            )
        );

        const deleteIds = existing
          .filter(section => !keepIds.has(section.id))
          .map(section => section.id);

        if (deleteIds.length > 0) {
          await tx.section.deleteMany({
            where: {
              pageId,
              id: { in: deleteIds }
            }
          });
        }

        for (const section of nextSections) {
          if (
            section.id &&
            !section.id.startsWith("temp-") &&
            existingIds.has(section.id)
          ) {
            await tx.section.update({
              where: { id: section.id },
              data: {
                type: section.type,
                order: section.order,
                enabled: section.enabled,
                props: section.props
              }
            });
          } else {
            await tx.section.create({
              data: {
                pageId,
                type: section.type,
                order: section.order,
                enabled: section.enabled,
                props: section.props
              }
            });
          }
        }

        const latest = await tx.pageRevision.findFirst({
          where: { pageId },
          orderBy: { version: "desc" },
          select: { version: true }
        });

        let latestSectionVersion = 0;
        let sectionRevisionEnabled = true;
        try {
          const latestSection = await tx.sectionRevision.findFirst({
            where: { pageId },
            orderBy: { version: "desc" },
            select: { version: true }
          });
          latestSectionVersion = latestSection?.version ?? 0;
        } catch (error) {
          if (isMissingSectionRevisionTable(error)) {
            sectionRevisionEnabled = false;
          } else {
            throw error;
          }
        }

        await tx.pageRevision.create({
          data: {
            pageId,
            version: (latest?.version ?? 0) + 1,
            source: RevisionSource.SECTIONS,
            note: "Sections autosaved",
            snapshot: {
              title: page.title,
              slug: page.slug,
              status: page.status,
              seoTitle: page.seoTitle,
              seoDescription: page.seoDescription,
              sections: nextSections
            }
          }
        });

        if (sectionRevisionEnabled) {
          try {
            await tx.sectionRevision.create({
              data: {
                pageId,
                version: latestSectionVersion + 1,
                note: "Sections autosaved",
                snapshot: nextSections
              }
            });
          } catch (error) {
            if (!isMissingSectionRevisionTable(error)) {
              throw error;
            }
          }
        }

        const updated = await tx.page.update({
          where: { id: pageId },
          data: { updatedAt: new Date() },
          select: { updatedAt: true }
        });

        return updated;
      },
      { timeout: 20000, maxWait: 10000 }
    );

    return NextResponse.json({
      ok: true,
      updatedAt: result.updatedAt.toISOString()
    });
  } catch (error) {
    if (error instanceof Error && error.message === "STALE_PAGE") {
      return NextResponse.json({ error: "STALE_PAGE" }, { status: 409 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P1001"
    ) {
      return NextResponse.json({ error: "DB_UNAVAILABLE" }, { status: 503 });
    }
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json({ error: "DB_UNAVAILABLE" }, { status: 503 });
    }
    return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
  }
}
