import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sanitizeCmsHtml } from "@/lib/sanitizeCmsHtml";
import { PageStatus, Prisma, RevisionSource } from "@prisma/client";

function isMissingTable(error: unknown, tableName: string) {
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
  return table.toLowerCase().includes(tableName.toLowerCase());
}

function isRevisionSchemaIssue(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  if (error.code === "P2022") {
    return true;
  }
  return (
    isMissingTable(error, "pagerevision") ||
    isMissingTable(error, "sectionrevision")
  );
}

function isIgnorableRevisionError(error: unknown) {
  if (isRevisionSchemaIssue(error)) {
    return true;
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return true;
  }
  return false;
}
import {
  SESSION_COOKIE_NAME,
  canDeleteContent,
  canEditContent,
  canPublishContent,
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
  return sanitizeCmsHtml(input);
}

function parseJsonStringMaybe(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractSectionsFromUnknown(input: unknown): unknown[] {
  const parsed = parseJsonStringMaybe(input);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (!parsed || typeof parsed !== "object") {
    return [];
  }
  const obj = parsed as Record<string, unknown>;

  const candidateSections = parseJsonStringMaybe(obj.sections);
  if (Array.isArray(candidateSections)) {
    return candidateSections;
  }

  const numericKeys = Object.keys(obj).filter(key => /^\d+$/.test(key));
  if (numericKeys.length > 0) {
    return numericKeys
      .sort((a, b) => Number(a) - Number(b))
      .map(key => obj[key]);
  }

  if ("snapshot" in obj) {
    return extractSectionsFromUnknown(obj.snapshot);
  }

  return [];
}

function extractRevisionPayload(snapshotRaw: unknown) {
  const parsed = parseJsonStringMaybe(snapshotRaw);
  const snapshotObject =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;

  const sections = normalizeSnapshotSections(
    extractSectionsFromUnknown(parsed)
  );

  return {
    sections,
    title:
      snapshotObject && typeof snapshotObject.title === "string"
        ? snapshotObject.title
        : undefined,
    slug:
      snapshotObject && typeof snapshotObject.slug === "string"
        ? snapshotObject.slug
        : undefined,
    status:
      snapshotObject &&
      (snapshotObject.status === "DRAFT" ||
        snapshotObject.status === "PUBLISHED")
        ? (snapshotObject.status as PageStatus)
        : undefined,
    seoTitle:
      snapshotObject && typeof snapshotObject.seoTitle === "string"
        ? snapshotObject.seoTitle
        : undefined,
    seoDescription:
      snapshotObject && typeof snapshotObject.seoDescription === "string"
        ? snapshotObject.seoDescription
        : undefined
  };
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
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { ok: false, error: "Missing id" };
  }

  const role = await getAdminRoleForAction(`/admin/pages/${id}`);
  if (!canDeleteContent(role)) {
    return { ok: false, error: "Unauthorized" };
  }

  await prisma.page.delete({ where: { id } });
  revalidatePath("/admin");
  redirect("/admin");
}

export async function saveSections(formData: FormData) {
  "use server";
  try {
    // 인증 체크
    const pageId = formData.get("pageId");
    const sectionsRaw = formData.get("sections");
    const expectedUpdatedAt = String(
      formData.get("expectedUpdatedAt") ?? ""
    ).trim();
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
    } catch {
      return { ok: false, error: "Invalid sections format" };
    }

    if (expectedUpdatedAt) {
      const page = await prisma.page.findUnique({
        where: { id: String(pageId) },
        select: { updatedAt: true }
      });
      if (!page) {
        return { ok: false, error: "Page not found" };
      }
      if (page.updatedAt.toISOString() !== expectedUpdatedAt) {
        return { ok: false, error: "STALE_PAGE" };
      }
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
    let nextVersion = 1;
    let pageRevisionEnabled = true;
    try {
      const lastRevision = await prisma.pageRevision.findFirst({
        where: { pageId: String(pageId) },
        orderBy: { version: "desc" }
      });
      nextVersion = lastRevision ? lastRevision.version + 1 : 1;
    } catch (error) {
      if (isRevisionSchemaIssue(error)) {
        pageRevisionEnabled = false;
      } else {
        throw error;
      }
    }
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
      if (isRevisionSchemaIssue(error)) {
        sectionRevisionEnabled = false;
      } else {
        throw error;
      }
    }
    // 섹션 변경 요약 note 생성
    const sectionTypes = sections.map(s => s.type).join(", ");
    const sectionCount = sections.length;
    const note = `Changed ${sectionCount} section(s): ${sectionTypes}`;
    if (pageRevisionEnabled) {
      try {
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
      } catch (error) {
        if (!isIgnorableRevisionError(error)) {
          throw error;
        }
      }
    }
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
        if (!isIgnorableRevisionError(error)) {
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
  try {
    const pageId = String(formData.get("pageId") ?? "").trim();
    const revisionId = String(formData.get("revisionId") ?? "").trim();
    if (!pageId || !revisionId) {
      return { ok: false, error: "Missing pageId or revisionId" };
    }

    const role = await getAdminRoleForAction(`/admin/pages/${pageId}`);
    if (!canPublishContent(role)) {
      return { ok: false, error: "Unauthorized" };
    }

    const revision = await prisma.pageRevision.findUnique({
      where: { id: revisionId }
    });
    if (!revision || revision.pageId !== pageId) {
      return { ok: false, error: "Revision not found" };
    }

    const payload = extractRevisionPayload(revision.snapshot);
    if (payload.sections.length === 0) {
      return {
        ok: false,
        error: "Revision snapshot is not restorable (no sections found)."
      };
    }

    const restoredUpdatedAt = await prisma.$transaction(async tx => {
      const currentPage = await tx.page.findUnique({
        where: { id: pageId },
        select: { id: true, locale: true }
      });
      if (!currentPage) {
        throw new Error("PAGE_NOT_FOUND");
      }

      const updatedPage = await tx.page.update({
        where: { id: pageId },
        data: {
          title: payload.title,
          slug: payload.slug,
          status: payload.status,
          seoTitle: payload.seoTitle,
          seoDescription: payload.seoDescription,
          updatedAt: new Date()
        },
        select: { updatedAt: true }
      });

      await tx.section.deleteMany({ where: { pageId } });
      await tx.section.createMany({
        data: payload.sections.map(section => ({
          pageId,
          type: section.type,
          order: section.order,
          enabled: section.enabled,
          props: section.props
        }))
      });

      try {
        const last = await tx.pageRevision.findFirst({
          where: { pageId },
          orderBy: { version: "desc" },
          select: { version: true }
        });
        await tx.pageRevision.create({
          data: {
            pageId,
            version: (last?.version ?? 0) + 1,
            source: RevisionSource.MANUAL,
            note: `Restored revision v${revision.version}`,
            snapshot: {
              title: payload.title,
              slug: payload.slug,
              status: payload.status,
              seoTitle: payload.seoTitle,
              seoDescription: payload.seoDescription,
              sections: payload.sections
            }
          }
        });
      } catch (error) {
        if (!isIgnorableRevisionError(error)) {
          throw error;
        }
      }

      return updatedPage.updatedAt;
    });

    revalidatePath(`/admin/pages/${pageId}`);
    revalidatePath("/admin");
    return { ok: true, updatedAt: restoredUpdatedAt.toISOString() };
  } catch (error) {
    if (error instanceof Error && error.message === "PAGE_NOT_FOUND") {
      notFound();
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
