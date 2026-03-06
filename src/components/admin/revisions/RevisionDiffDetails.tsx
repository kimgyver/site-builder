import { getChangeTone } from "./revisionTone";
import type { ReturnTypeBuildRevisionDiffSummary } from "./types";

function formatFieldChangeLabel(kind: "added" | "removed" | "modified") {
  if (kind === "added") return "added";
  if (kind === "removed") return "removed";
  return "changed";
}

function normalizeDiffValue(value: string) {
  return value.length > 0 ? value : "(empty)";
}

function splitDiffParts(beforeRaw: string, afterRaw: string) {
  const before = normalizeDiffValue(beforeRaw);
  const after = normalizeDiffValue(afterRaw);

  if (before === after) {
    return {
      equal: true,
      prefix: before,
      beforeChanged: "",
      afterChanged: "",
      suffix: ""
    };
  }

  let start = 0;
  const minLength = Math.min(before.length, after.length);
  while (start < minLength && before[start] === after[start]) {
    start += 1;
  }

  let beforeEnd = before.length - 1;
  let afterEnd = after.length - 1;
  while (
    beforeEnd >= start &&
    afterEnd >= start &&
    before[beforeEnd] === after[afterEnd]
  ) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }

  return {
    equal: false,
    prefix: before.slice(0, start),
    beforeChanged: before.slice(start, beforeEnd + 1),
    afterChanged: after.slice(start, afterEnd + 1),
    suffix: before.slice(beforeEnd + 1)
  };
}

function renderDiffValue(
  beforeRaw: string,
  afterRaw: string,
  side: "before" | "after"
) {
  const parts = splitDiffParts(beforeRaw, afterRaw);
  const changed = side === "before" ? parts.beforeChanged : parts.afterChanged;

  if (parts.equal) {
    return <span className="break-all font-mono">{parts.prefix}</span>;
  }

  return (
    <span className="break-all font-mono">
      {parts.prefix}
      {changed ? <strong className="font-semibold">{changed}</strong> : null}
      {parts.suffix}
    </span>
  );
}

function BeforeAfterDiff({ before, after }: { before: string; after: string }) {
  return (
    <div className="mt-1 grid gap-0.5 sm:grid-cols-2">
      <p className="text-zinc-600">
        <span className="mr-1 font-medium">Before:</span>
        {renderDiffValue(before, after, "before")}
      </p>
      <p className="text-zinc-900">
        <span className="mr-1 font-medium">After:</span>
        {renderDiffValue(before, after, "after")}
      </p>
    </div>
  );
}

export default function RevisionDiffDetails({
  diff
}: {
  diff: ReturnTypeBuildRevisionDiffSummary;
}) {
  return (
    <div className="space-y-2">
      {diff.metaChanges.length > 0 ? (
        <div className="space-y-1">
          <p className="font-medium text-zinc-900">Metadata changes</p>
          <ul className="space-y-0.5">
            {diff.metaChanges.map(change => (
              <li key={change.field}>
                <span className="font-medium">{change.label}</span>
                <BeforeAfterDiff before={change.before} after={change.after} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-1">
        <p className="font-medium text-zinc-900">Sections summary</p>
        <p>
          before {diff.sections.beforeCount} · after {diff.sections.afterCount}{" "}
          · changed {diff.sections.changed} · added {diff.sections.added} ·
          removed {diff.sections.removed} · visibility changed{" "}
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
                    {sectionChange.beforeType ?? sectionChange.afterType}
                    {sectionChange.kind === "modified" ? (
                      <span className="ml-2 text-[11px] font-normal text-zinc-500">
                        changed {sectionChange.fieldChanges.length} field
                        {sectionChange.fieldChanges.length === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span
                        className={`ml-1 inline-flex rounded border px-1 py-0.5 text-[10px] uppercase ${tone.badge}`}
                      >
                        {sectionChange.kind}
                      </span>
                    )}
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
                              <span className="mr-1 font-medium capitalize">
                                {formatFieldChangeLabel(field.kind)}
                              </span>
                              <span className="font-medium">{field.path}</span>
                              <BeforeAfterDiff
                                before={field.before}
                                after={field.after}
                              />
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
