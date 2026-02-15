"use client";
import SaveSectionsWithLoading from "./SaveSectionsWithLoading";
import type { EditableSection } from "@/types/sections";

export default function SaveSectionsClientWrapper({
  pageId,
  expectedUpdatedAt,
  initialSections,
  action,
  onSuccess
}: {
  pageId: string;
  expectedUpdatedAt: string;
  initialSections: EditableSection[];
  action: (formData: FormData) => Promise<any>;
  onSuccess?: () => void;
}) {
  return (
    <SaveSectionsWithLoading
      pageId={pageId}
      expectedUpdatedAt={expectedUpdatedAt}
      initialSections={initialSections}
      action={action}
      onSuccess={onSuccess}
    />
  );
}
