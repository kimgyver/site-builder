import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PageStatus, Prisma, RevisionSource } from "@prisma/client";
import sanitizeHtml from "sanitize-html";
import type { EditableSection, RawSectionInput } from "@/types/sections";

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
import {
  SESSION_COOKIE_NAME,
  canEditContent,
  getRoleFromSessionCookie,
  isAdminAuthEnabled,
  type AdminRole
} from "@/lib/adminAuth";

export function normalizeSnapshotSections(rawSections: unknown): Array<{
  type: string;
  order: number;
  enabled: boolean;
  props: Prisma.InputJsonValue;
}> {
  if (!Array.isArray(rawSections)) return [];
  return rawSections
    .map((section, index) => {
      const candidate =
        section && typeof section === "object"
          ? (section as Record<string, unknown>)
          : {};
      const type = String(candidate.type ?? "text");
      const enabled = candidate.enabled !== false;
      const rawProps =
        candidate.props && typeof candidate.props === "object"
          ? (candidate.props as Record<string, unknown>)
          : {};
      const nextProps = {
        ...rawProps,
        html: sanitizeRichHtml(rawProps.html),
        url:
          typeof rawProps.url === "string"
            ? String(rawProps.url)
            : rawProps.url,
        src:
          typeof rawProps.src === "string"
            ? String(rawProps.src)
            : rawProps.src,
        title:
          typeof rawProps.title === "string"
            ? String(rawProps.title)
            : rawProps.title,
        subtitle:
          typeof rawProps.subtitle === "string"
            ? String(rawProps.subtitle)
            : rawProps.subtitle,
        alt:
          typeof rawProps.alt === "string" ? String(rawProps.alt) : rawProps.alt
      };
      const props = JSON.parse(
        JSON.stringify(nextProps)
      ) as Prisma.InputJsonValue;
      return {
        type,
        order: index,
        enabled,
        props
      };
    })
    .filter(section => Boolean(section.type));
}

export function sanitizeRichHtml(input: unknown) {
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

export async function getAdminRoleForAction(
  nextPath: string
): Promise<AdminRole> {
  if (!isAdminAuthEnabled()) return "publisher";
  const cookieStore = await cookies();
  const role = getRoleFromSessionCookie(
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );
  if (!role) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
  return role;
}

export async function updatePage(formData: FormData) {
  "use server";
  try {
    const id = formData.get("id");
    const title = formData.get("title");
    const slug = formData.get("slug");
    const locale = formData.get("locale");
    const seoTitle = formData.get("seoTitle");
    const seoDescription = formData.get("seoDescription");
    const status = formData.get("status");
    if (!id || !title || !slug || !status) {
      return { ok: false, error: "Missing required fields" };
    }
    const role = await getAdminRoleForAction(`/admin/pages/${id}`);
    if (!canEditContent(role)) {
      return { ok: false, error: "Unauthorized" };
    }
    const updated = await prisma.page.update({
      where: { id: String(id) },
      data: {
        title: String(title),
        slug: String(slug),
        locale: locale ? String(locale) : undefined,
        seoTitle: seoTitle ? String(seoTitle) : undefined,
        seoDescription: seoDescription ? String(seoDescription) : undefined,
        status: status as PageStatus
      },
      select: { updatedAt: true }
    });
    return { ok: true, updatedAt: updated.updatedAt.toISOString() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function deletePage(formData: FormData) {
  "use server";
  // ...existing code from deletePage...
}

export async function saveSections(formData: FormData) {
  "use server";
  try {
    // 인증 체크
    const pageId = formData.get("pageId");
    const sectionsRaw = formData.get("sections");
    if (!pageId || !sectionsRaw) {
      return { ok: false, error: "Missing pageId or sections" };
    }
    const role = await getAdminRoleForAction(`/admin/pages/${pageId}`);
    if (!canEditContent(role)) {
      return { ok: false, error: "Unauthorized" };
    }
    // 섹션 데이터 정규화
    let sections;
    try {
      sections = normalizeSnapshotSections(JSON.parse(sectionsRaw as string));
    } catch (e) {
      return { ok: false, error: "Invalid sections format" };
    }
    // 기존 섹션 삭제 후 새 섹션 추가
    await prisma.section.deleteMany({ where: { pageId: String(pageId) } });
    await prisma.section.createMany({
      data: sections.map(section => ({
        pageId: String(pageId),
        type: section.type,
        order: section.order,
        enabled: section.enabled,
        props: section.props
      }))
    });
    // revision 생성 - note에 섹션 변경 요약 기록
    const lastRevision = await prisma.pageRevision.findFirst({
      where: { pageId: String(pageId) },
      orderBy: { version: "desc" }
    });
    let nextSectionVersion = 1;
    let sectionRevisionEnabled = true;
    try {
      const lastSectionRevision = await prisma.sectionRevision.findFirst({
        where: { pageId: String(pageId) },
        orderBy: { version: "desc" }
      });
      nextSectionVersion = lastSectionRevision
        ? lastSectionRevision.version + 1
        : 1;
    } catch (error) {
      if (isMissingSectionRevisionTable(error)) {
        sectionRevisionEnabled = false;
      } else {
        throw error;
      }
    }
    const nextVersion = lastRevision ? lastRevision.version + 1 : 1;
    // 섹션 변경 요약 note 생성
    const sectionTypes = sections.map(s => s.type).join(", ");
    const sectionCount = sections.length;
    const note = `Changed ${sectionCount} section(s): ${sectionTypes}`;
    await prisma.pageRevision.create({
      data: {
        pageId: String(pageId),
        version: nextVersion,
        source: "SECTIONS",
        note,
        snapshot: JSON.stringify(sections),
        createdAt: new Date()
      }
    });
    if (sectionRevisionEnabled) {
      try {
        await prisma.sectionRevision.create({
          data: {
            pageId: String(pageId),
            version: nextSectionVersion,
            note,
            snapshot: sections,
            createdAt: new Date()
          }
        });
      } catch (error) {
        if (!isMissingSectionRevisionTable(error)) {
          throw error;
        }
      }
    }
    const updated = await prisma.page.update({
      where: { id: String(pageId) },
      data: { updatedAt: new Date() },
      select: { updatedAt: true }
    });
    return { ok: true, updatedAt: updated.updatedAt.toISOString() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
  // 함수 끝에 중괄호 추가하지 않음
}

export async function restoreRevision(formData: FormData) {
  "use server";
  // ...existing code from restoreRevision...
}
