"use client";
import { SectionBuilder } from "@/components/SectionBuilder";
import type { EditableSection } from "@/types/sections";
import { useSectionPersistence } from "@/components/admin/hooks/useSectionPersistence";

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent align-middle" />
  );
}

export default function SaveSectionsWithLoading({
  pageId,
  expectedUpdatedAt,
  initialSections,
  action,
  readOnly,
  onSuccess
}: {
  pageId: string;
  expectedUpdatedAt: string;
  initialSections: EditableSection[];
  action: (
    formData: FormData
  ) => Promise<{ ok: boolean; error?: string; updatedAt?: string } | undefined>;
  readOnly?: boolean;
  onSuccess?: (mode: "autosave" | "manual", updatedAt?: string) => void;
}) {
  const {
    sections,
    expectedUpdatedAtLocal,
    isSaving,
    error,
    autosaveState,
    isDirty,
    handleSectionsChange,
    handleSubmit
  } = useSectionPersistence({
    pageId,
    expectedUpdatedAt,
    initialSections,
    action,
    readOnly,
    onSuccess
  });
  return (
    <form className="relative space-y-3" onSubmit={handleSubmit}>
      <SectionBuilder
        pageId={pageId}
        expectedUpdatedAt={expectedUpdatedAtLocal}
        initialSections={sections}
        onSectionsChange={handleSectionsChange}
      />
      {readOnly ? (
        <p className="text-xs text-zinc-500">
          Read-only role: section editing is disabled.
        </p>
      ) : null}
      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <span>
          {autosaveState === "saving"
            ? "Autosaving…"
            : autosaveState === "saved"
              ? "Saved"
              : autosaveState === "conflict"
                ? "Conflict"
                : autosaveState === "error"
                  ? "Autosave error"
                  : ""}
        </span>
        {autosaveState === "conflict" ? (
          <button
            type="button"
            className="rounded border border-zinc-200 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50"
            onClick={() => window.location.reload()}
          >
            Reload latest
          </button>
        ) : null}
      </div>
      {!readOnly ? (
        <button
          type="submit"
          className="inline-flex rounded-md border border-blue-500 bg-blue-600 px-3 py-1.5 text-xs text-white font-semibold shadow transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-200 disabled:text-zinc-500 disabled:opacity-100"
          style={{ boxShadow: "none" }}
          disabled={isSaving || autosaveState === "saving" || !isDirty}
        >
          {isSaving ? <Spinner /> : "Save sections"}
        </button>
      ) : (
        <p className="text-xs text-zinc-500">
          Read-only role: section saving is disabled.
        </p>
      )}
      {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
    </form>
  );
}
