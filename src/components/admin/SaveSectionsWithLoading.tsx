"use client";
import { useRef, useState } from "react";
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
  action
}: {
  pageId: string;
  expectedUpdatedAt: string;
  initialSections: EditableSection[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [sections, setSections] = useState<EditableSection[]>(initialSections);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    const formData = new FormData();
    formData.set("sections", JSON.stringify(sections));
    formData.set("pageId", pageId);
    formData.set("expectedUpdatedAt", expectedUpdatedAt);
    const result = await action(formData);
    setIsSaving(false);
    if (result?.ok) {
      window.location.reload();
    } else {
      setError(result?.error || "Failed to save sections");
    }
  };
  return (
    <form className="relative space-y-3" onSubmit={handleSubmit}>
      <SectionBuilder
        pageId={pageId}
        expectedUpdatedAt={expectedUpdatedAt}
        initialSections={sections}
        onSectionsChange={setSections}
      />
      <button
        type="submit"
        className="inline-flex rounded-md border border-blue-500 bg-blue-600 px-3 py-1.5 text-xs text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
        style={{ boxShadow: "none" }}
        disabled={isSaving}
      >
        {isSaving ? <Spinner /> : "Save sections"}
      </button>
      {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
    </form>
  );
}
