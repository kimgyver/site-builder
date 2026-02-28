"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SectionBuilder } from "@/components/SectionBuilder";
import type { EditableSection } from "@/types/sections";

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
  onSuccess?: () => void;
}) {
  const [sections, setSections] = useState<EditableSection[]>(initialSections);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expectedUpdatedAtLocal, setExpectedUpdatedAtLocal] =
    useState(expectedUpdatedAt);
  const [autosaveState, setAutosaveState] = useState<
    "idle" | "saving" | "saved" | "error" | "conflict"
  >("idle");
  const autosaveTimerRef = useRef<number | null>(null);
  const firstRenderRef = useRef(true);
  const lastSavedJsonRef = useRef<string>(JSON.stringify(initialSections));

  type PutSectionsOk = { ok: true; updatedAt: string };
  type PutSectionsErr = { ok: false; error: string };
  type PutSectionsResponse = PutSectionsOk | PutSectionsErr;

  const toUserError = (code: string) => {
    if (code === "DB_UNAVAILABLE") {
      return "Database is unavailable. Please try again in a moment.";
    }
    if (code === "SAVE_FAILED") {
      return "Autosave failed. Please click Save sections and retry.";
    }
    return code;
  };

  const readJsonSafe = useCallback(
    async (response: Response): Promise<Record<string, unknown>> => {
      try {
        const data = (await response.json()) as unknown;
        return data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : {};
      } catch {
        return {};
      }
    },
    []
  );

  const putSections = useCallback(
    async (args: {
      sections: EditableSection[];
      expectedUpdatedAt: string;
    }): Promise<PutSectionsResponse> => {
      try {
        const response = await fetch(`/api/admin/pages/${pageId}/sections`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            sections: args.sections,
            expectedUpdatedAt: args.expectedUpdatedAt
          })
        });

        if (response.status === 409) {
          return { ok: false, error: "STALE_PAGE" };
        }

        const json = await readJsonSafe(response);
        if (!response.ok) {
          const err =
            typeof json.error === "string" ? json.error : "SAVE_FAILED";
          return { ok: false, error: err };
        }
        if (json.ok === true && typeof json.updatedAt === "string") {
          return { ok: true, updatedAt: json.updatedAt };
        }

        const err = typeof json.error === "string" ? json.error : "SAVE_FAILED";
        return { ok: false, error: err };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    [pageId, readJsonSafe]
  );

  const saveViaServerAction = useCallback(async () => {
    const formData = new FormData();
    formData.set("sections", JSON.stringify(sections));
    formData.set("pageId", pageId);
    formData.set("expectedUpdatedAt", expectedUpdatedAtLocal);
    const serverResult = await action(formData);
    if (serverResult?.ok) {
      return { ok: true as const, updatedAt: serverResult.updatedAt };
    }
    return {
      ok: false as const,
      error: serverResult?.error || "Failed to save sections"
    };
  }, [action, expectedUpdatedAtLocal, pageId, sections]);

  const handleSectionsChange = (nextSections: EditableSection[]) => {
    setSections(nextSections);
    setAutosaveState("idle");
  };

  useEffect(() => {
    setExpectedUpdatedAtLocal(expectedUpdatedAt);
  }, [expectedUpdatedAt]);

  useEffect(() => {
    if (readOnly) {
      return;
    }
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    const nextJson = JSON.stringify(sections);
    if (nextJson === lastSavedJsonRef.current) {
      return;
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(async () => {
      setAutosaveState("saving");
      const serverResult = await saveViaServerAction();
      if (serverResult.ok) {
        if (serverResult.updatedAt) {
          setExpectedUpdatedAtLocal(serverResult.updatedAt);
        }
        lastSavedJsonRef.current = nextJson;
        setAutosaveState("saved");
        setError(null);
        if (onSuccess) onSuccess();
        return;
      }

      if (serverResult.error === "STALE_PAGE") {
        setAutosaveState("conflict");
        setError(
          "Conflict detected: this page was updated elsewhere. Reload to continue editing."
        );
        return;
      }

      setAutosaveState("error");
      setError(toUserError(serverResult.error ?? "Failed to autosave"));
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    expectedUpdatedAtLocal,
    onSuccess,
    readOnly,
    saveViaServerAction,
    sections
  ]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setIsSaving(true);
    setError(null);

    // Prefer API route (transactional upsert + optimistic locking).
    const result = await putSections({
      sections,
      expectedUpdatedAt: expectedUpdatedAtLocal
    });
    setIsSaving(false);
    if (result.ok) {
      setExpectedUpdatedAtLocal(result.updatedAt);
      lastSavedJsonRef.current = JSON.stringify(sections);
      setAutosaveState("saved");
      if (onSuccess) onSuccess();
      return;
    }

    if (result.error === "STALE_PAGE") {
      setAutosaveState("conflict");
      setError(
        "Conflict detected: this page was updated elsewhere. Reload to continue editing."
      );
      return;
    }

    // Fallback to server action if the API path fails for non-conflict reasons.
    try {
      const formData = new FormData();
      formData.set("sections", JSON.stringify(sections));
      formData.set("pageId", pageId);
      formData.set("expectedUpdatedAt", expectedUpdatedAtLocal);
      const serverResult = await action(formData);
      if (serverResult?.ok) {
        if (serverResult.updatedAt) {
          setExpectedUpdatedAtLocal(serverResult.updatedAt);
        }
        lastSavedJsonRef.current = JSON.stringify(sections);
        setAutosaveState("saved");
        if (onSuccess) onSuccess();
      } else {
        setAutosaveState("error");
        setError(toUserError(serverResult?.error || "Failed to save sections"));
      }
    } catch (e) {
      setAutosaveState("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  };
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
          className="inline-flex rounded-md border border-blue-500 bg-blue-600 px-3 py-1.5 text-xs text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
          style={{ boxShadow: "none" }}
          disabled={isSaving}
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
