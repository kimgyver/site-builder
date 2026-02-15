import SaveSectionsWithLoading from "@/components/admin/SaveSectionsWithLoading";
import SaveSectionsClientWrapper from "@/components/admin/SaveSectionsClientWrapper";
import type { EditableSection } from "@/types/sections";
import RestoreRevisionWithLoading from "@/components/admin/RestoreRevisionWithLoading";
import UpdatePageWithLoading from "@/components/admin/UpdatePageWithLoading";

import {
  normalizeSnapshotSections,
  sanitizeRichHtml,
  getAdminRoleForAction,
  updatePage,
  deletePage,
  saveSections,
  restoreRevision
} from "./actions";

import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

import { PageStatus } from "@prisma/client";
import {
  SESSION_COOKIE_NAME,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "@/lib/adminAuth";

export default async function EditPage({
  params,
  searchParams
}: {
  params: Promise<{ id?: string }>;
  searchParams: Promise<{
    error?:
      | "stale"
      | "invalid-sections"
      | "db-unavailable"
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

      {error === "db-unavailable" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Database is temporarily unavailable. Please try again shortly.
        </div>
      ) : null}

      {error === "invalid-sections" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Failed to save sections because the submitted payload was invalid.
          Please retry after editing once more.
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

      {/* 클라이언트 컴포넌트로 교체: 외부 <form> 제거 */}
      <UpdatePageWithLoading
        page={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          seoTitle: page.seoTitle ?? "",
          seoDescription: page.seoDescription ?? "",
          status: page.status
        }}
        action={updatePage}
      />

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
          className="inline-flex rounded-md border border-blue-500 bg-blue-600 px-3 py-1.5 text-xs text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
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

        <SaveSectionsClientWrapper
          pageId={page.id}
          expectedUpdatedAt={page.updatedAt.toISOString()}
          initialSections={page.sections as unknown as EditableSection[]}
          action={saveSections}
        />
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
                    <RestoreRevisionWithLoading
                      pageId={page.id}
                      revisionId={revision.id}
                      version={revision.version}
                    />
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
