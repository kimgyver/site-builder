"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";
import SaveSectionsClientWrapper from "@/components/admin/SaveSectionsClientWrapper";
import UpdatePageWithLoading from "@/components/admin/UpdatePageWithLoading";
import RecentRevisionsPanel from "@/components/admin/RecentRevisionsPanel";
import PagePreviewPanel from "@/components/admin/PagePreviewPanel";
import { usePagedRevisions } from "@/components/admin/hooks/usePagedRevisions";
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
        snapshot: true;
      };
    };
  };
}>;

type ActionResult = { ok: boolean; error?: string };
const REVISION_PAGE_SIZE = 10;

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
  restoreRevision: (
    formData: FormData
  ) => Promise<{ ok?: boolean; error?: string; updatedAt?: string } | unknown>;
}) {
  const router = useRouter();
  const [sectionsExpectedUpdatedAt, setSectionsExpectedUpdatedAt] = useState(
    page.updatedAt.toISOString()
  );
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: ""
  });
  const {
    revisions,
    hasMoreRevisions,
    isLoadingMoreRevisions,
    refreshRecentRevisions,
    loadMoreRevisions
  } = usePagedRevisions<PageWithSectionsAndRevisions["revisions"][number]>({
    pageId: page.id,
    initialRevisions: page.revisions,
    pageSize: REVISION_PAGE_SIZE
  });
  const handleShowToast = (message: string) =>
    setToast({ show: true, message });

  const refreshPreservingScroll = () => {
    if (typeof window === "undefined") {
      router.refresh();
      return;
    }

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    router.refresh();

    let frame = 0;
    const restore = () => {
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "auto" });
      frame += 1;
      if (frame < 4) {
        window.requestAnimationFrame(restore);
      }
    };

    window.requestAnimationFrame(restore);
  };
  const previewHref = `/${page.locale}/${page.slug}?preview=${page.previewToken}`;
  const normalizedCurrentSections = useMemo(
    () =>
      page.sections.map(section => ({
        type: section.type,
        order: section.order,
        enabled: section.enabled,
        props:
          section.props && typeof section.props === "object"
            ? (section.props as Record<string, unknown>)
            : {}
      })),
    [page.sections]
  );

  return (
    <>
      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
      />
      <div className="mx-auto w-full max-w-2xl md:max-w-4xl space-y-6">
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
            void refreshRecentRevisions();
            refreshPreservingScroll();
          }}
        />
        <PagePreviewPanel previewHref={previewHref} />
        <div className="space-y-3 border-t border-dashed border-zinc-200 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-zinc-900">Sections</h2>
              <p className="text-xs text-zinc-500">
                These blocks define the content of the page. Add hero/text/image
                sections or HTML Structure blocks to preserve external CMS
                markup, then reorder and toggle visibility.
              </p>
            </div>
          </div>
          <SaveSectionsClientWrapper
            pageId={page.id}
            expectedUpdatedAt={sectionsExpectedUpdatedAt}
            initialSections={page.sections as unknown as EditableSection[]}
            action={saveSections}
            readOnly={!canEdit}
            onSuccess={(mode, updatedAt) => {
              if (updatedAt) {
                setSectionsExpectedUpdatedAt(updatedAt);
              }
              if (mode === "manual") {
                handleShowToast("Sections saved!");
              }
              void refreshRecentRevisions();
            }}
          />
        </div>
        <RecentRevisionsPanel
          revisions={revisions}
          hasMore={hasMoreRevisions}
          isLoadingMore={isLoadingMoreRevisions}
          onLoadMore={loadMoreRevisions}
          pageId={page.id}
          canPublish={canPublish}
          currentPage={{
            title: page.title,
            slug: page.slug,
            status: page.status,
            seoTitle: page.seoTitle,
            seoDescription: page.seoDescription
          }}
          currentSections={normalizedCurrentSections}
          restoreRevision={restoreRevision}
          onRestored={(version, updatedAt) => {
            if (updatedAt) {
              setSectionsExpectedUpdatedAt(updatedAt);
            }
            handleShowToast(`Restored v${version}`);
            refreshPreservingScroll();
          }}
        />
      </div>
    </>
  );
}
