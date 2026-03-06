"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EditableSection } from "@/types/sections";
import {
  buildSectionsSignature,
  putSectionsRequest,
  saveSectionsViaAction,
  toUserError
} from "@/components/admin/sections/sectionPersistenceUtils";

export type AutosaveState = "idle" | "saving" | "saved" | "error" | "conflict";

type ActionResult = { ok: boolean; error?: string; updatedAt?: string };

type UseSectionPersistenceArgs = {
  pageId: string;
  expectedUpdatedAt: string;
  initialSections: EditableSection[];
  action: (formData: FormData) => Promise<ActionResult | undefined>;
  readOnly?: boolean;
  onSuccess?: (mode: "autosave" | "manual", updatedAt?: string) => void;
};

export function useSectionPersistence({
  pageId,
  expectedUpdatedAt,
  initialSections,
  action,
  readOnly,
  onSuccess
}: UseSectionPersistenceArgs) {
  const [sections, setSections] = useState<EditableSection[]>(initialSections);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expectedUpdatedAtLocal, setExpectedUpdatedAtLocal] =
    useState(expectedUpdatedAt);
  const [lastSavedSignature, setLastSavedSignature] = useState(
    buildSectionsSignature(initialSections)
  );
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");

  const autosaveTimerRef = useRef<number | null>(null);
  const autosavePromiseRef = useRef<Promise<void> | null>(null);
  const firstRenderRef = useRef(true);
  const lastInitialSectionsJsonRef = useRef<string>(
    buildSectionsSignature(initialSections)
  );

  const putSections = useCallback(
    async (args: { sections: EditableSection[]; expectedUpdatedAt: string }) =>
      putSectionsRequest({
        pageId,
        sections: args.sections,
        expectedUpdatedAt: args.expectedUpdatedAt
      }),
    [pageId]
  );

  const saveViaServerAction = useCallback(async () => {
    return saveSectionsViaAction({
      action,
      sections,
      pageId,
      expectedUpdatedAt: expectedUpdatedAtLocal
    });
  }, [action, expectedUpdatedAtLocal, pageId, sections]);

  const handleSectionsChange = useCallback(
    (nextSections: EditableSection[]) => {
      setSections(nextSections);
      setAutosaveState("idle");
    },
    []
  );

  useEffect(() => {
    const incomingJson = buildSectionsSignature(initialSections);
    if (incomingJson === lastInitialSectionsJsonRef.current) {
      return;
    }

    lastInitialSectionsJsonRef.current = incomingJson;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    setSections(initialSections);
    setLastSavedSignature(incomingJson);
    setAutosaveState("idle");
    setError(null);
    firstRenderRef.current = true;
  }, [initialSections]);

  useEffect(() => {
    setExpectedUpdatedAtLocal(expectedUpdatedAt);
  }, [expectedUpdatedAt]);

  const isDirty = buildSectionsSignature(sections) !== lastSavedSignature;

  useEffect(() => {
    if (readOnly) {
      return;
    }
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    const nextJson = buildSectionsSignature(sections);
    if (nextJson === lastSavedSignature) {
      return;
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    autosaveTimerRef.current = window.setTimeout(async () => {
      const autosaveTask = (async () => {
        setAutosaveState("saving");
        const serverResult = await saveViaServerAction();
        if (serverResult.ok) {
          if (serverResult.updatedAt) {
            setExpectedUpdatedAtLocal(serverResult.updatedAt);
          }
          setLastSavedSignature(nextJson);
          setAutosaveState("saved");
          setError(null);
          if (onSuccess) onSuccess("autosave", serverResult.updatedAt);
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
      })();

      autosavePromiseRef.current = autosaveTask;
      try {
        await autosaveTask;
      } finally {
        if (autosavePromiseRef.current === autosaveTask) {
          autosavePromiseRef.current = null;
        }
      }
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
    sections,
    lastSavedSignature
  ]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (readOnly) return;

      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }

      if (autosavePromiseRef.current) {
        await autosavePromiseRef.current;
      }

      const nextSignature = buildSectionsSignature(sections);
      if (nextSignature === lastSavedSignature) {
        return;
      }

      if (!isDirty) return;
      setIsSaving(true);
      setError(null);

      const result = await putSections({
        sections,
        expectedUpdatedAt: expectedUpdatedAtLocal
      });
      setIsSaving(false);
      if (result.ok) {
        setExpectedUpdatedAtLocal(result.updatedAt);
        setLastSavedSignature(nextSignature);
        setAutosaveState("saved");
        if (onSuccess) onSuccess("manual", result.updatedAt);
        return;
      }

      if (result.error === "STALE_PAGE") {
        setAutosaveState("conflict");
        setError(
          "Conflict detected: this page was updated elsewhere. Reload to continue editing."
        );
        return;
      }

      try {
        const serverResult = await saveSectionsViaAction({
          action,
          sections,
          pageId,
          expectedUpdatedAt: expectedUpdatedAtLocal
        });
        if (serverResult?.ok) {
          if (serverResult.updatedAt) {
            setExpectedUpdatedAtLocal(serverResult.updatedAt);
          }
          setLastSavedSignature(nextSignature);
          setAutosaveState("saved");
          if (onSuccess) onSuccess("manual", serverResult.updatedAt);
        } else {
          setAutosaveState("error");
          setError(
            toUserError(serverResult?.error || "Failed to save sections")
          );
        }
      } catch (err) {
        setAutosaveState("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [
      action,
      expectedUpdatedAtLocal,
      isDirty,
      lastSavedSignature,
      onSuccess,
      pageId,
      putSections,
      readOnly,
      sections
    ]
  );

  return {
    sections,
    expectedUpdatedAtLocal,
    isSaving,
    error,
    autosaveState,
    isDirty,
    handleSectionsChange,
    handleSubmit
  };
}
