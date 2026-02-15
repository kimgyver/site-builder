"use client";
import SaveSectionsWithLoading from "./SaveSectionsWithLoading";
import type { EditableSection } from "@/types/sections";

export default function SaveSectionsClientWrapper({
  pageId,
  expectedUpdatedAt,
  initialSections,
  action
}: {
  pageId: string;
  expectedUpdatedAt: string;
  initialSections: EditableSection[];
  action: (formData: FormData) => Promise<any>;
}) {
  return (
    <SaveSectionsWithLoading
      pageId={pageId}
      expectedUpdatedAt={expectedUpdatedAt}
      initialSections={initialSections}
      action={action}
    />
  );
}
