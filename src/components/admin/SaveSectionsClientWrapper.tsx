"use client";
import SaveSectionsWithLoading from "./SaveSectionsWithLoading";
import type { EditableSection } from "@/types/sections";

export default function SaveSectionsClientWrapper({
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
  return (
    <SaveSectionsWithLoading
      pageId={pageId}
      expectedUpdatedAt={expectedUpdatedAt}
      initialSections={initialSections}
      action={action}
      readOnly={readOnly}
      onSuccess={onSuccess}
    />
  );
}
