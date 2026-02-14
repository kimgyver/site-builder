import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PageStatus, Prisma, RevisionSource } from "@prisma/client";
import {
  SectionBuilder,
  type EditableSection
} from "@/components/SectionBuilder";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import {
  SESSION_COOKIE_NAME,
  getRoleFromSessionCookie,
  isAdminAuthEnabled,
  type AdminRole
} from "@/lib/adminAuth";
import sanitizeHtml from "sanitize-html";

type RawSectionInput = Partial<EditableSection> & {
  props?: Record<string, unknown>;
};

function normalizeSnapshotSections(rawSections: unknown): Array<{
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

async function getAdminRoleForAction(nextPath: string): Promise<AdminRole> {
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
        "style"
      ],
      td: [
        "colspan",
        "rowspan",
        "data-bg",
        "data-colwidth",
        "data-height-px",
        "data-border",
        "style"
      ],
      col: ["span", "style"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"]
    },
    allowProtocolRelative: false,
    // Preserve only the styles we deliberately generate/support.
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
        // Keep a table from being forced to full width when user resizes.
        width: [
          /^\d+(\.\d+)?px$/,
          /^\d+(\.\d+)?%$/,
          /^auto$/,
          /^fit-content$/,
          /^max-content$/
        ]
      },
      col: {
        // TipTap column resize writes <col style="width: Npx">.
        width: [/^\d+(\.\d+)?px$/, /^\d+(\.\d+)?%$/]
      },
      th: {
        "background-color": [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/],
        width: [/^\d+(\.\d+)?px$/, /^\d+(\.\d+)?%$/],
        height: [/^\d+(\.\d+)?px$/],
        "text-align": [/^(left|center|right)$/]
      },
      td: {
        "background-color": [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/],
        width: [/^\d+(\.\d+)?px$/, /^\d+(\.\d+)?%$/],
        height: [/^\d+(\.\d+)?px$/],
        "text-align": [/^(left|center|right)$/]
      }
    }
  });
}

async function updatePage(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const status = String(formData.get("status") ?? PageStatus.DRAFT);
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();

  if (!id || !title || !slug) {
    return;
  }

  const role = await getAdminRoleForAction(`/admin/pages/${id}`);
  if (role === "editor" && status === PageStatus.PUBLISHED) {
    redirect(`/admin/pages/${id}?error=forbidden-publish`);
  }

  const nextStatus =
    status === "PUBLISHED" ? PageStatus.PUBLISHED : PageStatus.DRAFT;

  const previous = await prisma.page.findUnique({
    where: { id },
    select: { status: true }
  });

  const page = await prisma.page.update({
    where: { id },
    data: {
      title,
      slug,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      status: nextStatus,
      lastPublishedAt:
        nextStatus === PageStatus.PUBLISHED ? new Date() : undefined
    }
  });

  const latest = await prisma.pageRevision.findFirst({
    where: { pageId: id },
    orderBy: { version: "desc" },
    select: { version: true }
  });

  await prisma.pageRevision.create({
    data: {
      pageId: id,
      version: (latest?.version ?? 0) + 1,
      source:
        previous?.status !== PageStatus.PUBLISHED &&
        nextStatus === PageStatus.PUBLISHED
          ? RevisionSource.PUBLISH
          : RevisionSource.METADATA,
      note:
        previous?.status !== PageStatus.PUBLISHED &&
        nextStatus === PageStatus.PUBLISHED
          ? "Page published"
          : "Page metadata updated",
      snapshot: {
        title,
        slug,
        status: nextStatus,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null
      }
    }
  });

  redirect(`/admin/pages/${page.id}`);
}

async function deletePage(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  if (!id) return;

  const role = await getAdminRoleForAction(`/admin/pages/${id}`);
  if (role !== "publisher") {
    redirect(`/admin/pages/${id}?error=forbidden-delete`);
  }

  await prisma.page.delete({ where: { id } });
  redirect("/admin");
}

async function saveSections(formData: FormData) {
  "use server";

  const pageId = String(formData.get("pageId"));
  const raw = String(formData.get("sections") ?? "[]");
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "");

  if (!pageId) return;

  await getAdminRoleForAction(`/admin/pages/${pageId}`);

  let sections: RawSectionInput[] = [];
  try {
    const parsed: unknown = JSON.parse(raw);
    sections = Array.isArray(parsed) ? (parsed as RawSectionInput[]) : [];
  } catch {
    sections = [];
  }

  const expectedDate = expectedUpdatedAt ? new Date(expectedUpdatedAt) : null;

  const nextSections = sections
    .map((section, index) => {
      const props = section?.props ?? {};
      const nextProps =
        section?.type === "richText" || section?.type === "text"
          ? { ...props, html: sanitizeRichHtml(props.html) }
          : props;

      const normalizedProps = JSON.parse(
        JSON.stringify(nextProps)
      ) as Prisma.InputJsonValue;

      return {
        id: typeof section?.id === "string" ? section.id : undefined,
        type: String(section?.type ?? "text"),
        order: index,
        enabled: section?.enabled !== false,
        props: normalizedProps
      };
    })
    .filter(section => Boolean(section.type));

  try {
    await prisma.$transaction(
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

        await tx.pageRevision.create({
          data: {
            pageId,
            version: (latest?.version ?? 0) + 1,
            source: RevisionSource.SECTIONS,
            note: "Sections updated",
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

        await tx.page.update({
          where: { id: pageId },
          data: { updatedAt: new Date() }
        });
      },
      { timeout: 20000, maxWait: 10000 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "STALE_PAGE") {
      redirect(`/admin/pages/${pageId}?error=stale`);
    }
    throw error;
  }

  redirect(`/admin/pages/${pageId}`);
}

async function restoreRevision(formData: FormData) {
  "use server";

  const pageId = String(formData.get("pageId") ?? "");
  const revisionId = String(formData.get("revisionId") ?? "");
  if (!pageId || !revisionId) {
    redirect(`/admin/pages/${pageId}`);
  }

  const role = await getAdminRoleForAction(`/admin/pages/${pageId}`);
  if (role !== "publisher") {
    redirect(`/admin/pages/${pageId}?error=forbidden-restore`);
  }

  const revision = await prisma.pageRevision.findFirst({
    where: { id: revisionId, pageId },
    select: {
      id: true,
      version: true,
      snapshot: true
    }
  });

  if (
    !revision ||
    !revision.snapshot ||
    typeof revision.snapshot !== "object"
  ) {
    redirect(`/admin/pages/${pageId}?error=restore-failed`);
  }

  const snapshot = revision.snapshot as Record<string, unknown>;
  const sections = normalizeSnapshotSections(snapshot.sections);

  await prisma.$transaction(
    async tx => {
      const page = await tx.page.findUnique({
        where: { id: pageId },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          seoTitle: true,
          seoDescription: true
        }
      });

      if (!page) {
        throw new Error("PAGE_NOT_FOUND");
      }

      const title =
        typeof snapshot.title === "string" && snapshot.title.trim()
          ? snapshot.title.trim()
          : page.title;
      const slug =
        typeof snapshot.slug === "string" && snapshot.slug.trim()
          ? snapshot.slug.trim()
          : page.slug;
      const status =
        snapshot.status === PageStatus.PUBLISHED
          ? PageStatus.PUBLISHED
          : PageStatus.DRAFT;
      const seoTitle =
        typeof snapshot.seoTitle === "string" && snapshot.seoTitle.trim()
          ? snapshot.seoTitle.trim()
          : null;
      const seoDescription =
        typeof snapshot.seoDescription === "string" &&
        snapshot.seoDescription.trim()
          ? snapshot.seoDescription.trim()
          : null;

      await tx.page.update({
        where: { id: pageId },
        data: {
          title,
          slug,
          status,
          seoTitle,
          seoDescription,
          lastPublishedAt: status === PageStatus.PUBLISHED ? new Date() : null,
          updatedAt: new Date()
        }
      });

      if (Array.isArray(snapshot.sections)) {
        await tx.section.deleteMany({ where: { pageId } });

        for (const section of sections) {
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

      await tx.pageRevision.create({
        data: {
          pageId,
          version: (latest?.version ?? 0) + 1,
          source: RevisionSource.MANUAL,
          note: `Restored from revision v${revision.version}`,
          snapshot: {
            title,
            slug,
            status,
            seoTitle,
            seoDescription,
            sections
          }
        }
      });
    },
    { timeout: 20000, maxWait: 10000 }
  );

  redirect(`/admin/pages/${pageId}`);
}

export default async function EditPage({
  params,
  searchParams
}: {
  params: Promise<{ id?: string }>;
  searchParams: Promise<{
    error?:
      | "stale"
      | "forbidden-delete"
      | "forbidden-publish"
      | "forbidden-restore"
      | "restore-failed";
  }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  if (!id) {
    notFound();
  }

  const cookieStore = await cookies();
  const role = isAdminAuthEnabled()
    ? getRoleFromSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value)
    : ("publisher" as const);

  if (!role) {
    redirect(`/admin/login?next=${encodeURIComponent(`/admin/pages/${id}`)}`);
  }

  const canPublish = role === "publisher";
  const canDelete = role === "publisher";

  const page = await prisma.page.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { order: "asc" } },
      revisions: {
        orderBy: { version: "desc" },
        take: 5,
        select: {
          id: true,
          version: true,
          source: true,
          createdAt: true,
          note: true
        }
      }
    }
  });

  if (!page) {
    notFound();
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit page</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Update the page details. All visible content is controlled by the
            sections below.
          </p>
        </div>
        {canDelete ? (
          <form action={deletePage}>
            <input type="hidden" name="id" value={page.id} />
            <button
              type="submit"
              className="rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </form>
        ) : null}
      </div>

      {error === "stale" ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Another editor saved this page first. Please review latest content and
          save again.
        </div>
      ) : null}

      {error === "forbidden-publish" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Editor role cannot publish pages.
        </div>
      ) : null}

      {error === "forbidden-delete" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Editor role cannot delete pages.
        </div>
      ) : null}

      {error === "forbidden-restore" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Editor role cannot restore revisions.
        </div>
      ) : null}

      {error === "restore-failed" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Failed to restore the selected revision.
        </div>
      ) : null}

      <form action={updatePage} className="space-y-4">
        <input type="hidden" name="id" value={page.id} />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-800">
            Title
          </label>
          <input
            name="title"
            defaultValue={page.title}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-800">
            Slug
          </label>
          <div className="flex items-center gap-1 text-sm text-zinc-500">
            <span className="rounded-l-md border border-r-0 border-zinc-300 bg-zinc-50 px-3 py-2 text-xs">
              /
            </span>
            <input
              name="slug"
              defaultValue={page.slug}
              className="w-full rounded-r-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-800">
            SEO title (optional)
          </label>
          <input
            name="seoTitle"
            defaultValue={page.seoTitle ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder="Custom title for search/preview"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-800">
            SEO description (optional)
          </label>
          <textarea
            name="seoDescription"
            defaultValue={page.seoDescription ?? ""}
            className="h-20 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder="Short summary for search and link previews"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-800">
            Status
          </label>
          <select
            name="status"
            defaultValue={page.status}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            <option value={PageStatus.DRAFT}>Draft</option>
            <option value={PageStatus.PUBLISHED} disabled={!canPublish}>
              Published
            </option>
          </select>
          {!canPublish ? (
            <p className="text-[11px] text-zinc-500">
              Current role: editor (publish permission required)
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Save changes
        </button>
      </form>

      <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3">
        <h2 className="text-sm font-medium text-zinc-900">Preview</h2>
        <p className="text-xs text-zinc-600">
          Share this private preview URL to review draft content before
          publishing.
        </p>
        <a
          href={`/${page.slug}?preview=${page.previewToken}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-100"
        >
          Open preview in new tab
        </a>
      </div>

      <div className="space-y-3 border-t border-dashed border-zinc-200 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-zinc-900">Sections</h2>
            <p className="text-xs text-zinc-500">
              These blocks define the content of the page. Add hero, text,
              image, or FAQ sections, reorder them, and toggle their visibility.
            </p>
          </div>
        </div>

        <form action={saveSections} className="space-y-3">
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={page.updatedAt.toISOString()}
          />
          <SectionBuilder
            pageId={page.id}
            initialSections={page.sections as unknown as EditableSection[]}
          />

          <button
            type="submit"
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Save sections
          </button>
        </form>
      </div>

      <div className="space-y-2 border-t border-dashed border-zinc-200 pt-4">
        <h2 className="text-sm font-medium text-zinc-900">Recent revisions</h2>
        {page.revisions.length === 0 ? (
          <p className="text-xs text-zinc-500">No revisions yet.</p>
        ) : (
          <ul className="space-y-1 text-xs text-zinc-700">
            {page.revisions.map(revision => (
              <li
                key={revision.id}
                className="flex items-center justify-between rounded border border-zinc-200 bg-white px-2 py-1"
              >
                <span>
                  v{revision.version} · {revision.source.toLowerCase()} ·{" "}
                  {revision.note ?? "updated"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">
                    {revision.createdAt.toLocaleString()}
                  </span>
                  {canPublish ? (
                    <form action={restoreRevision}>
                      <input type="hidden" name="pageId" value={page.id} />
                      <input
                        type="hidden"
                        name="revisionId"
                        value={revision.id}
                      />
                      <ConfirmSubmitButton
                        message={`Restore revision v${revision.version}? Current unpublished changes will be replaced.`}
                        className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-100"
                      >
                        Restore
                      </ConfirmSubmitButton>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
