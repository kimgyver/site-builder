"use client";
import { useState } from "react";
import { Toast } from "@/components/Toast";
import SaveSectionsClientWrapper from "@/components/admin/SaveSectionsClientWrapper";
import UpdatePageWithLoading from "@/components/admin/UpdatePageWithLoading";
import RestoreRevisionWithLoading from "@/components/admin/RestoreRevisionWithLoading";
import type { EditableSection } from "@/types/sections";
import type { Prisma } from "@prisma/client";

type PageWithSectionsAndRevisions = Prisma.PageGetPayload<{
  include: {
    sections: true;
    revisions: {
      select: {
        id: true;
        version: true;
        source: true;
        createdAt: true;
        note: true;
      };
    };
  };
}>;

type ActionResult = { ok: boolean; error?: string };

export default function AdminPageClientWrapper({
  page,
  canEdit,
  canDelete,
  canPublish,
  saveSections,
  updatePage,
  deletePage,
  restoreRevision
}: {
  page: PageWithSectionsAndRevisions;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  saveSections: (
    formData: FormData
  ) => Promise<(ActionResult & { updatedAt?: string }) | undefined>;
  updatePage: (
    formData: FormData
  ) => Promise<(ActionResult & { updatedAt?: string }) | undefined>;
  deletePage: (formData: FormData) => Promise<unknown>;
  restoreRevision: (formData: FormData) => Promise<unknown>;
}) {
  const [sectionsExpectedUpdatedAt, setSectionsExpectedUpdatedAt] = useState(
    page.updatedAt.toISOString()
  );
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: ""
  });
  const handleShowToast = (message: string) =>
    setToast({ show: true, message });

  return (
    <>
      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
      />
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Edit page</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Update the page details. All visible content is controlled by the
              sections below.
            </p>
          </div>
          {canDelete ? (
            <form
              action={async (formData: FormData) => {
                await deletePage(formData);
              }}
              className="sm:ml-4"
            >
              <input type="hidden" name="id" value={page.id} />
              <button
                type="submit"
                className="rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 w-full sm:w-auto"
              >
                Delete
              </button>
            </form>
          ) : null}
        </div>
        <UpdatePageWithLoading
          page={{
            id: page.id,
            title: page.title,
            slug: page.slug,
            locale: page.locale,
            seoTitle: page.seoTitle ?? "",
            seoDescription: page.seoDescription ?? "",
            status: page.status
          }}
          action={updatePage}
          readOnly={!canEdit}
          onSuccess={updatedAt => {
            if (updatedAt) {
              setSectionsExpectedUpdatedAt(updatedAt);
            }
            handleShowToast("Page info saved!");
          }}
        />
        <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3">
          <h2 className="text-sm font-medium text-zinc-900">Preview</h2>
          <p className="text-xs text-zinc-600">
            Share this private preview URL to review draft content before
            publishing.
          </p>
          <a
            href={`/${page.locale}/${page.slug}?preview=${page.previewToken}`}
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
                image, or FAQ sections, reorder them, and toggle their
                visibility.
              </p>
            </div>
          </div>
          <SaveSectionsClientWrapper
            pageId={page.id}
            expectedUpdatedAt={sectionsExpectedUpdatedAt}
            initialSections={page.sections as unknown as EditableSection[]}
            action={saveSections}
            readOnly={!canEdit}
            onSuccess={() => handleShowToast("Sections saved!")}
          />
        </div>
        <div className="space-y-2 border-t border-dashed border-zinc-200 pt-4">
          <h2 className="text-sm font-medium text-zinc-900">
            Recent revisions
          </h2>
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
                      {typeof revision.createdAt === "string"
                        ? revision.createdAt
                        : revision.createdAt
                            .toISOString()
                            .replace("T", " ")
                            .slice(0, 19)}
                    </span>
                    {canPublish ? (
                      <RestoreRevisionWithLoading
                        pageId={page.id}
                        revisionId={revision.id}
                        version={revision.version}
                        action={restoreRevision}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
