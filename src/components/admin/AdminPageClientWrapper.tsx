"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";
import SaveSectionsClientWrapper from "@/components/admin/SaveSectionsClientWrapper";
import UpdatePageWithLoading from "@/components/admin/UpdatePageWithLoading";
import RestoreRevisionWithLoading from "@/components/admin/RestoreRevisionWithLoading";
import type { EditableSection } from "@/types/sections";
import type { Prisma } from "@prisma/client";
import { buildRevisionDiffSummary } from "@/lib/revisionDiff";

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
  const [showInlinePreview, setShowInlinePreview] = useState(false);
  const [expandedRevisionId, setExpandedRevisionId] = useState<string | null>(
    null
  );
  const [sectionsExpectedUpdatedAt, setSectionsExpectedUpdatedAt] = useState(
    page.updatedAt.toISOString()
  );
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: ""
  });
  const handleShowToast = (message: string) =>
    setToast({ show: true, message });
  const previewHref = `/${page.locale}/${page.slug}?preview=${page.previewToken}`;
  const revisionDiffMap = useMemo(() => {
    return new Map(
      page.revisions.map(revision => [
        revision.id,
        buildRevisionDiffSummary({
          currentPage: {
            title: page.title,
            slug: page.slug,
            status: page.status,
            seoTitle: page.seoTitle,
            seoDescription: page.seoDescription
          },
          currentSections: page.sections.map(section => ({
            type: section.type,
            order: section.order,
            enabled: section.enabled,
            props:
              section.props && typeof section.props === "object"
                ? (section.props as Record<string, unknown>)
                : {}
          })),
          snapshotRaw: revision.snapshot
        })
      ])
    );
  }, [
    page.revisions,
    page.sections,
    page.slug,
    page.status,
    page.title,
    page.seoTitle,
    page.seoDescription
  ]);

  const getRestoreConfirmMessage = (version: number, revisionId: string) => {
    const diff = revisionDiffMap.get(revisionId);
    if (!diff) {
      return `Restore revision v${version}? Current unpublished changes will be replaced.`;
    }

    const chunks = [
      `메타 변경 ${diff.metaChanges.length}개`,
      `섹션 변경 ${diff.sections.changed}개`,
      `추가 ${diff.sections.added}개`,
      `삭제 ${diff.sections.removed}개`
    ];

    return [
      `Restore revision v${version}? Current unpublished changes will be replaced.`,
      `요약: ${chunks.join(", ")}`
    ].join("\n");
  };

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
            router.refresh();
          }}
        />
        <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3">
          <h2 className="text-sm font-medium text-zinc-900">Preview</h2>
          <p className="text-xs text-zinc-600">
            Share this private preview URL to review draft content before
            publishing.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={previewHref}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex rounded-md border border-blue-500 bg-blue-600 px-3 py-1.5 text-xs text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            >
              Open preview in new tab
            </a>
            <button
              type="button"
              onClick={() => setShowInlinePreview(prev => !prev)}
              className="inline-flex rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
            >
              {showInlinePreview
                ? "Hide inline preview"
                : "Show inline preview"}
            </button>
          </div>
          {showInlinePreview ? (
            <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
              <iframe
                src={previewHref}
                title="Inline preview"
                className="h-[520px] w-full"
              />
            </div>
          ) : null}
        </div>
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
                router.refresh();
              }
            }}
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
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between gap-3">
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
                        <button
                          type="button"
                          className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-100"
                          onClick={() =>
                            setExpandedRevisionId(prev =>
                              prev === revision.id ? null : revision.id
                            )
                          }
                        >
                          {expandedRevisionId === revision.id
                            ? "Hide diff"
                            : "Diff"}
                        </button>
                        {canPublish ? (
                          <RestoreRevisionWithLoading
                            pageId={page.id}
                            revisionId={revision.id}
                            version={revision.version}
                            confirmMessage={getRestoreConfirmMessage(
                              revision.version,
                              revision.id
                            )}
                            action={restoreRevision}
                            onSuccess={updatedAt => {
                              if (updatedAt) {
                                setSectionsExpectedUpdatedAt(updatedAt);
                              }
                              handleShowToast(`Restored v${revision.version}`);
                              router.refresh();
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                    {expandedRevisionId === revision.id ? (
                      <div className="rounded border border-zinc-200 bg-zinc-50 p-2 text-[11px] text-zinc-700">
                        {(() => {
                          const diff = revisionDiffMap.get(revision.id);
                          if (!diff) {
                            return (
                              <p className="text-zinc-500">
                                Diff 정보를 불러오지 못했습니다.
                              </p>
                            );
                          }

                          return (
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <p className="font-medium text-zinc-900">
                                  Metadata before vs after
                                </p>
                                {diff.metaChanges.length === 0 ? (
                                  <p className="text-zinc-500">
                                    메타 변경 없음
                                  </p>
                                ) : (
                                  <ul className="space-y-0.5">
                                    {diff.metaChanges.map(change => (
                                      <li key={change.field}>
                                        <span className="font-medium">
                                          {change.label}
                                        </span>{" "}
                                        · {change.before} → {change.after}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              <div className="space-y-1">
                                <p className="font-medium text-zinc-900">
                                  Sections summary
                                </p>
                                <p>
                                  before {diff.sections.beforeCount} · after{" "}
                                  {diff.sections.afterCount} · changed{" "}
                                  {diff.sections.changed} · added{" "}
                                  {diff.sections.added} · removed{" "}
                                  {diff.sections.removed} · visibility changed{" "}
                                  {diff.sections.visibilityChanged}
                                </p>
                              </div>

                              <div className="space-y-1">
                                <p className="font-medium text-zinc-900">
                                  Changed sections detail
                                </p>
                                {diff.sectionChanges.length === 0 ? (
                                  <p className="text-zinc-500">
                                    섹션 상세 변경 없음
                                  </p>
                                ) : (
                                  <ul className="space-y-1">
                                    {diff.sectionChanges.map(sectionChange => (
                                      <li
                                        key={`${sectionChange.order}-${sectionChange.kind}`}
                                        className="rounded border border-zinc-200 bg-white p-2"
                                      >
                                        <p className="font-medium text-zinc-900">
                                          #{sectionChange.order + 1} ·{" "}
                                          {sectionChange.beforeType ??
                                            sectionChange.afterType}
                                          {" · "}
                                          {sectionChange.kind === "modified"
                                            ? "수정"
                                            : sectionChange.kind === "added"
                                              ? "추가"
                                              : "삭제"}
                                        </p>
                                        {sectionChange.kind === "modified" ? (
                                          sectionChange.fieldChanges.length ===
                                          0 ? (
                                            <p className="text-zinc-500">
                                              변경 필드 파악 실패
                                            </p>
                                          ) : (
                                            <ul className="mt-1 space-y-0.5 text-[10px]">
                                              {sectionChange.fieldChanges.map(
                                                field => (
                                                  <li
                                                    key={`${sectionChange.order}-${field.path}`}
                                                  >
                                                    <span className="font-medium">
                                                      {field.path}
                                                    </span>{" "}
                                                    · {field.before} →{" "}
                                                    {field.after}
                                                  </li>
                                                )
                                              )}
                                            </ul>
                                          )
                                        ) : (
                                          <p className="mt-1 text-[10px] text-zinc-600">
                                            섹션 전체가
                                            {sectionChange.kind === "added"
                                              ? " 추가"
                                              : " 삭제"}
                                            되었습니다.
                                          </p>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              <details className="rounded border border-zinc-200 bg-white p-2">
                                <summary className="text-[11px] font-medium text-zinc-700">
                                  Raw JSON 보기 (before / after)
                                </summary>
                                <div className="mt-2 grid gap-2 md:grid-cols-2">
                                  <div>
                                    <p className="mb-1 font-medium text-zinc-900">
                                      Before
                                    </p>
                                    <pre className="max-h-56 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2 text-[10px] leading-relaxed">
                                      {diff.beforeSectionsJson}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="mb-1 font-medium text-zinc-900">
                                      After
                                    </p>
                                    <pre className="max-h-56 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2 text-[10px] leading-relaxed">
                                      {diff.afterSectionsJson}
                                    </pre>
                                  </div>
                                </div>
                              </details>
                            </div>
                          );
                        })()}
                      </div>
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
