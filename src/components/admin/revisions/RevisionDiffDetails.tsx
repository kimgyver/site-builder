import { getChangeTone } from "./revisionTone";
import type { ReturnTypeBuildRevisionDiffSummary } from "./types";

export default function RevisionDiffDetails({
  diff
}: {
  diff: ReturnTypeBuildRevisionDiffSummary;
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="font-medium text-zinc-900">Metadata changes</p>
        {diff.metaChanges.length === 0 ? (
          <p className="text-zinc-500">No metadata changes</p>
        ) : (
          <ul className="space-y-0.5">
            {diff.metaChanges.map(change => (
              <li key={change.field}>
                <span className="font-medium">{change.label}</span> ·{" "}
                {change.before} → {change.after}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-1">
        <p className="font-medium text-zinc-900">Sections summary</p>
        <p>
          before {diff.sections.beforeCount} · after {diff.sections.afterCount}{" "}
          · changed {diff.sections.changed} · added {diff.sections.added} ·
          removed {diff.sections.removed}· visibility changed{" "}
          {diff.sections.visibilityChanged}
        </p>
      </div>

      <div className="space-y-1">
        <p className="font-medium text-zinc-900">Changed sections detail</p>
        {diff.sectionChanges.length === 0 ? (
          <p className="text-zinc-500">No section changes</p>
        ) : (
          <ul className="space-y-1">
            {diff.sectionChanges.map(sectionChange => {
              const tone = getChangeTone(sectionChange.kind);
              return (
                <li
                  key={`${sectionChange.order}-${sectionChange.kind}`}
                  className="rounded border border-zinc-200 bg-white p-2"
                >
                  <p className="font-medium text-zinc-900">
                    #{sectionChange.order + 1} ·{" "}
                    {sectionChange.beforeType ?? sectionChange.afterType}{" "}
                    <span
                      className={`ml-1 inline-flex rounded border px-1 py-0.5 text-[10px] uppercase ${tone.badge}`}
                    >
                      {sectionChange.kind}
                    </span>
                  </p>
                  {sectionChange.kind === "modified" ? (
                    sectionChange.fieldChanges.length === 0 ? (
                      <p className="text-zinc-500">
                        No field-level changes detected
                      </p>
                    ) : (
                      <ul className="mt-1 space-y-0.5 text-[10px]">
                        {sectionChange.fieldChanges.map(field => {
                          const fieldTone = getChangeTone(field.kind);
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
                              <span className="font-medium">{field.path}</span>·{" "}
                              {field.before} → {field.after}
                            </li>
                          );
                        })}
                      </ul>
                    )
                  ) : (
                    <p className={`mt-1 text-[10px] ${tone.text}`}>
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
            <p className="mb-1 font-medium text-zinc-900">Before</p>
            <pre className="max-h-56 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2 text-[10px] leading-relaxed">
              {diff.beforeSectionsJson}
            </pre>
          </div>
          <div>
            <p className="mb-1 font-medium text-zinc-900">After</p>
            <pre className="max-h-56 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2 text-[10px] leading-relaxed">
              {diff.afterSectionsJson}
            </pre>
          </div>
        </div>
      </details>
    </div>
  );
}
