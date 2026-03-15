"use server";

import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/siteSettings";
import { parseDateTimeLocalInTimeZone } from "@/lib/publishTimeZone";
import { PageStatus, Prisma, RevisionSource } from "@prisma/client";
import {
  SESSION_COOKIE_NAME,
  canDeleteContent,
  canEditContent,
  canPublishContent,
  getRoleFromSessionCookie,
  isAdminAuthEnabled,
  type AdminRole
} from "@/lib/adminAuth";
import {
  buildSectionsSignature,
  extractRevisionPayload,
  isIgnorableRevisionError,
  isRevisionSchemaIssue,
  normalizeSnapshotSections
} from "./actions.helpers";

async function getAdminRoleForAction(
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

export async function listPageRevisions(args: {
  pageId: string;
  skip?: number;
  take?: number;
}) {
  const pageId = String(args.pageId ?? "").trim();
  if (!pageId) {
    return { ok: false, error: "INVALID_PAGE_ID", revisions: [], hasMore: false };
  }

  const role = await getAdminRoleForAction(`/admin/pages/${pageId}`);
  if (!role) {
    return { ok: false, error: "UNAUTHORIZED", revisions: [], hasMore: false };
  }

  const skip = Number.isFinite(args.skip) ? Math.max(0, Number(args.skip)) : 0;
  const takeInput = Number.isFinite(args.take) ? Number(args.take) : 10;
  const take = Math.max(1, Math.min(20, takeInput));

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
    return { ok: true, revisions, hasMore };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      revisions: [],
      hasMore: false
    };
  }
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
    const headerGlobalGroupId = formData.get("headerGlobalGroupId");
    const footerGlobalGroupId = formData.get("footerGlobalGroupId");
    const publishAtRaw = formData.get("publishAt");
    const status = formData.get("status");
    if (!id || !title || !slug || !status) {
      return { ok: false, error: "Missing required fields" };
    }
    const role = await getAdminRoleForAction(`/admin/pages/${id}`);
    if (!canEditContent(role)) {
      return { ok: false, error: "Unauthorized" };
    }
    const settings = await getSiteSettings();
    const publishTimeZone = settings.publishTimeZone;
    const normalizeOptionalText = (value: FormDataEntryValue | null) => {
      if (typeof value !== "string") {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const normalizeOptionalId = (value: FormDataEntryValue | null) => {
      if (typeof value !== "string") {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const nextHeaderGlobalGroupId = normalizeOptionalId(headerGlobalGroupId);
    const nextFooterGlobalGroupId = normalizeOptionalId(footerGlobalGroupId);
    const publishAtInput =
      typeof publishAtRaw === "string" ? publishAtRaw.trim() : "";
    let nextPublishAt: Date | null = null;
    if (publishAtInput) {
      const parsed = parseDateTimeLocalInTimeZone(
        publishAtInput,
        publishTimeZone
      );
      if (!parsed || Number.isNaN(parsed.getTime())) {
        return { ok: false, error: "Invalid schedule datetime" };
      }
      nextPublishAt = parsed;
    }

    if (nextHeaderGlobalGroupId) {
      const headerGroup = await prisma.globalSectionGroup.findUnique({
        where: { id: nextHeaderGlobalGroupId },
        select: { id: true, location: true }
      });
      if (!headerGroup || headerGroup.location !== "header") {
        return { ok: false, error: "Invalid header global group" };
      }
    }

    if (nextFooterGlobalGroupId) {
      const footerGroup = await prisma.globalSectionGroup.findUnique({
        where: { id: nextFooterGlobalGroupId },
        select: { id: true, location: true }
      });
      if (!footerGroup || footerGroup.location !== "footer") {
        return { ok: false, error: "Invalid footer global group" };
      }
    }

    const updated = await prisma.page.update({
      where: { id: String(id) },
      data: {
        title: String(title),
        slug: String(slug),
        locale: locale ? String(locale) : undefined,
        seoTitle: normalizeOptionalText(seoTitle),
        seoDescription: normalizeOptionalText(seoDescription),
        headerGlobalGroupId: nextHeaderGlobalGroupId,
        footerGlobalGroupId: nextFooterGlobalGroupId,
        status: status as PageStatus,
        publishAt: status === "PUBLISHED" ? null : nextPublishAt
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

    const pageForCheck = await prisma.page.findUnique({
      where: { id: String(pageId) },
      select: {
        updatedAt: true,
        sections: {
          orderBy: { order: "asc" },
          select: {
            type: true,
            order: true,
            enabled: true,
            props: true
          }
        }
      }
    });
    if (!pageForCheck) {
      return { ok: false, error: "Page not found" };
    }

    if (expectedUpdatedAt) {
      if (pageForCheck.updatedAt.toISOString() !== expectedUpdatedAt) {
        return { ok: false, error: "STALE_PAGE" };
      }
    }

    const currentSectionsSignature = buildSectionsSignature(
      pageForCheck.sections.map(section => ({
        type: section.type,
        order: section.order,
        enabled: section.enabled,
        props: section.props as Prisma.InputJsonValue
      }))
    );
    const nextSectionsSignature = buildSectionsSignature(sections);

    if (currentSectionsSignature === nextSectionsSignature) {
      return { ok: true, updatedAt: pageForCheck.updatedAt.toISOString() };
    }

    // 기존 섹션 삭제 후 새 섹션 추가
    await prisma.section.deleteMany({ where: { pageId: String(pageId) } });
    if (sections.length > 0) {
      await prisma.section.createMany({
        data: sections.map(section => ({
          pageId: String(pageId),
          type: section.type,
          order: section.order,
          enabled: section.enabled,
          props: section.props
        }))
      });
    }
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
