"use client";

import { useMemo, useState } from "react";
import RestoreRevisionWithLoading from "@/components/admin/RestoreRevisionWithLoading";
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

function getChangeTone(kind: "added" | "removed" | "modified") {
  if (kind === "added") {
    return {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      text: "text-emerald-700"
    };
  }
  if (kind === "removed") {
    return {
      badge: "border-rose-200 bg-rose-50 text-rose-700",
      text: "text-rose-700"
    };
  }
  return {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    text: "text-amber-700"
  };
}

export default function RecentRevisionsPanel({
  revisions,
  pageId,
  canPublish,
  currentPage,
  currentSections,
  restoreRevision,
  onRestored
}: {
  revisions: RevisionItem[];
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
        <ul className="space-y-1 text-xs text-zinc-700">
          {revisions.map(revision => (
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
                {expandedRevisionId === revision.id ? (
                  <div className="rounded border border-zinc-200 bg-zinc-50 p-2 text-[11px] text-zinc-700">
                    {(() => {
                      const diff = revisionDiffMap.get(revision.id);
                      if (!diff) {
                        return (
                          <p className="text-zinc-500">
                            Failed to load diff details.
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <p className="font-medium text-zinc-900">
                              Metadata changes
                            </p>
                            {diff.metaChanges.length === 0 ? (
                              <p className="text-zinc-500">
                                No metadata changes
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
                              {diff.sections.removed}· visibility changed{" "}
                              {diff.sections.visibilityChanged}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="font-medium text-zinc-900">
                              Changed sections detail
                            </p>
                            {diff.sectionChanges.length === 0 ? (
                              <p className="text-zinc-500">
                                No section changes
                              </p>
                            ) : (
                              <ul className="space-y-1">
                                {diff.sectionChanges.map(sectionChange => {
                                  const tone = getChangeTone(
                                    sectionChange.kind
                                  );
                                  return (
                                    <li
                                      key={`${sectionChange.order}-${sectionChange.kind}`}
                                      className="rounded border border-zinc-200 bg-white p-2"
                                    >
                                      <p className="font-medium text-zinc-900">
                                        #{sectionChange.order + 1} ·{" "}
                                        {sectionChange.beforeType ??
                                          sectionChange.afterType}{" "}
                                        <span
                                          className={`ml-1 inline-flex rounded border px-1 py-0.5 text-[10px] uppercase ${tone.badge}`}
                                        >
                                          {sectionChange.kind}
                                        </span>
                                      </p>
                                      {sectionChange.kind === "modified" ? (
                                        sectionChange.fieldChanges.length ===
                                        0 ? (
                                          <p className="text-zinc-500">
                                            No field-level changes detected
                                          </p>
                                        ) : (
                                          <ul className="mt-1 space-y-0.5 text-[10px]">
                                            {sectionChange.fieldChanges.map(
                                              field => {
                                                const fieldTone = getChangeTone(
                                                  field.kind
                                                );
                                                return (
                                                  <li
                                                    key={`${sectionChange.order}-${field.path}`}
                                                    className={`rounded px-1 py-0.5 ${fieldTone.text}`}
                                                  >
                                                    <span
                                                      className={`mr-1 inline-flex rounded border px-1 py-0.5 uppercase ${fieldTone.badge}`}
                                                    >
                                                      {field.kind}
                                                    </span>
                                                    <span className="font-medium">
                                                      {field.path}
                                                    </span>
                                                    · {field.before} →{" "}
                                                    {field.after}
                                                  </li>
                                                );
                                              }
                                            )}
                                          </ul>
                                        )
                                      ) : (
                                        <p
                                          className={`mt-1 text-[10px] ${tone.text}`}
                                        >
                                          Section was {sectionChange.kind}.
                                        </p>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>

                          <details className="rounded border border-zinc-200 bg-white p-2">
                            <summary className="text-[11px] font-medium text-zinc-700">
                              Raw JSON (before / after)
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
  );
}
