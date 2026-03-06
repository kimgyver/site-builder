"use client";

import { useMemo, useState } from "react";
import RestoreRevisionWithLoading from "@/components/admin/RestoreRevisionWithLoading";
import RevisionDiffDetails from "@/components/admin/revisions/RevisionDiffDetails";
import {
  buildRevisionDiffSummary,
  parseRevisionSnapshot,
  type CurrentPageMeta,
  type CurrentSection
} from "@/lib/revisionDiff";

type RevisionItem = {
  id: string;
  version: number;
  source: string;
  createdAt: string | Date;
  note: string | null;
  snapshot: unknown;
};

function formatRevisionSummary(
  diff: ReturnType<typeof buildRevisionDiffSummary>
) {
  const parts: string[] = [];

  if (diff.sections.changed > 0) {
    parts.push(
      `${diff.sections.changed} section${diff.sections.changed > 1 ? "s" : ""} updated`
    );
  }
  if (diff.sections.added > 0) {
    parts.push(`${diff.sections.added} added`);
  }
  if (diff.sections.removed > 0) {
    parts.push(`${diff.sections.removed} removed`);
  }
  if (diff.sections.visibilityChanged > 0) {
    parts.push(
      `${diff.sections.visibilityChanged} visibility change${diff.sections.visibilityChanged > 1 ? "s" : ""}`
    );
  }

  if (diff.metaChanges.length > 0) {
    const metaLabels = diff.metaChanges.map(change => change.label);
    const preview = metaLabels.slice(0, 2).join(", ");
    parts.push(
      `metadata updated (${preview}${metaLabels.length > 2 ? ", …" : ""})`
    );
  }

  const changedTypes = Array.from(
    new Set(
      diff.sectionChanges
        .map(change => change.afterType ?? change.beforeType ?? null)
        .filter((value): value is string => Boolean(value))
    )
  );

  if (changedTypes.length > 0) {
    parts.push(
      `types: ${changedTypes.slice(0, 4).join(", ")}${changedTypes.length > 4 ? ", …" : ""}`
    );
  }

  if (parts.length === 0) {
    return "No effective content change from previous revision.";
  }

  return parts.join(" · ");
}

export default function RecentRevisionsPanel({
  revisions,
  hasMore,
  isLoadingMore,
  onLoadMore,
  pageId,
  canPublish,
  currentPage,
  currentSections,
  restoreRevision,
  onRestored
}: {
  revisions: RevisionItem[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  pageId: string;
  canPublish: boolean;
  currentPage: CurrentPageMeta;
  currentSections: CurrentSection[];
  restoreRevision: (
    formData: FormData
  ) => Promise<{ ok?: boolean; error?: string; updatedAt?: string } | unknown>;
  onRestored: (version: number, updatedAt?: string) => void;
}) {
  const [expandedRevisionId, setExpandedRevisionId] = useState<string | null>(
    null
  );

  const revisionDiffVsCurrentMap = useMemo(() => {
    return new Map(
      revisions.map(revision => [
        revision.id,
        buildRevisionDiffSummary({
          currentPage,
          currentSections,
          snapshotRaw: revision.snapshot
        })
      ])
    );
  }, [revisions, currentPage, currentSections]);

  const revisionDiffMap = useMemo(() => {
    return new Map(
      revisions.map((revision, index) => {
        const previousRevision = revisions[index + 1];
        if (!previousRevision) {
          return [
            revision.id,
            buildRevisionDiffSummary({
              currentPage,
              currentSections,
              snapshotRaw: revision.snapshot
            })
          ] as const;
        }

        const previousSnapshot = parseRevisionSnapshot(
          previousRevision.snapshot
        );
        return [
          revision.id,
          buildRevisionDiffSummary({
            currentPage: {
              title: previousSnapshot.title ?? "",
              slug: previousSnapshot.slug ?? "",
              status: previousSnapshot.status ?? currentPage.status,
              seoTitle: previousSnapshot.seoTitle ?? null,
              seoDescription: previousSnapshot.seoDescription ?? null
            },
            currentSections: previousSnapshot.sections,
            snapshotRaw: revision.snapshot
          })
        ] as const;
      })
    );
  }, [revisions, currentPage, currentSections]);

  const getRestoreConfirmMessage = (version: number, revisionId: string) => {
    const diff = revisionDiffVsCurrentMap.get(revisionId);
    if (!diff) {
      return `Restore revision v${version}? Current unpublished changes will be replaced.`;
    }

    const chunks = [
      `metadata changed ${diff.metaChanges.length}`,
      `sections changed ${diff.sections.changed}`,
      `added ${diff.sections.added}`,
      `removed ${diff.sections.removed}`
    ];

    return [
      `Restore revision v${version}? Current unpublished changes will be replaced.`,
      `Summary: ${chunks.join(", ")}`
    ].join("\n");
  };

  return (
    <div className="space-y-2 border-t border-dashed border-zinc-200 pt-4">
      <h2 className="text-sm font-medium text-zinc-900">Recent revisions</h2>
      {revisions.length === 0 ? (
        <p className="text-xs text-zinc-500">No revisions yet.</p>
      ) : (
        <div className="space-y-2">
          <ul className="space-y-1 text-xs text-zinc-700">
            {revisions.map(revision => {
              const diff = revisionDiffMap.get(revision.id);
              const summary = diff ? formatRevisionSummary(diff) : null;

              return (
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
                            pageId={pageId}
                            revisionId={revision.id}
                            version={revision.version}
                            confirmMessage={getRestoreConfirmMessage(
                              revision.version,
                              revision.id
                            )}
                            action={restoreRevision}
                            onSuccess={updatedAt =>
                              onRestored(revision.version, updatedAt)
                            }
                          />
                        ) : null}
                      </div>
                    </div>
                    {summary ? (
                      <p className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600">
                        {summary}
                      </p>
                    ) : null}
                    {expandedRevisionId === revision.id ? (
                      <div className="rounded border border-zinc-200 bg-zinc-50 p-2 text-[11px] text-zinc-700">
                        {(() => {
                          if (!diff) {
                            return (
                              <p className="text-zinc-500">
                                Failed to load diff details.
                              </p>
                            );
                          }

                          return <RevisionDiffDetails diff={diff} />;
                        })()}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          {hasMore ? (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="inline-flex rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 enabled:hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400"
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
