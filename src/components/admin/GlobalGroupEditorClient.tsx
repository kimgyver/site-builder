"use client";

import { useState } from "react";
import { SectionBuilder } from "@/components/SectionBuilder";
import type { EditableSection, SectionType } from "@/types/sections";

type SaveResult = { ok: boolean; updatedAt?: string; error?: string };

type Props = {
  groupId: string;
  location: string;
  initialName: string;
  initialSections: Array<{
    id: string;
    type: string;
    order: number;
    enabled: boolean;
    props: Record<string, unknown>;
  }>;
  initialUpdatedAt: string;
};

const ALLOWED_SECTION_TYPES: SectionType[] = [
  "hero",
  "text",
  "image",
  "faq",
  "richText",
  "embed",
  "pageStyle",
  "callout",
  "accordion"
];

function toEditableSections(
  input: Props["initialSections"]
): EditableSection[] {
  return input.map((section, index) => ({
    id: section.id,
    type: ALLOWED_SECTION_TYPES.includes(section.type as SectionType)
      ? (section.type as SectionType)
      : "text",
    order: typeof section.order === "number" ? section.order : index,
    enabled: section.enabled !== false,
    props: section.props ?? {}
  }));
}

export default function GlobalGroupEditorClient({
  groupId,
  location,
  initialName,
  initialSections,
  initialUpdatedAt
}: Props) {
  const [name, setName] = useState(initialName);
  const [sections, setSections] = useState<EditableSection[]>(
    toEditableSections(initialSections)
  );
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(initialUpdatedAt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const hiddenCount = sections.filter(section => !section.enabled).length;

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    let result: SaveResult;
    try {
      const response = await fetch(`/api/admin/globals/${groupId}/sections`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          name,
          expectedUpdatedAt,
          sections
        })
      });

      const json = (await response.json()) as Record<string, unknown>;

      if (response.status === 409) {
        result = { ok: false, error: "STALE" };
      } else if (!response.ok) {
        result = {
          ok: false,
          error: typeof json.error === "string" ? json.error : "SAVE_FAILED"
        };
      } else {
        result = {
          ok: true,
          updatedAt:
            typeof json.updatedAt === "string" ? json.updatedAt : undefined
        };
      }
    } catch (e) {
      result = {
        ok: false,
        error: e instanceof Error ? e.message : String(e)
      };
    }

    setSaving(false);

    if (result.ok) {
      if (result.updatedAt) {
        setExpectedUpdatedAt(result.updatedAt);
      }
      setSaved(true);
      return;
    }

    if (result.error === "STALE") {
      setError(
        "다른 탭/사용자가 먼저 저장했습니다. 최신 상태를 불러오려면 페이지를 새로고침하세요."
      );
      return;
    }

    setError(result.error ?? "저장에 실패했습니다.");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-800">Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          required
        />
      </div>

      <div className="space-y-1">
        <h2 className="text-sm font-medium text-zinc-900">Sections</h2>
        <p className="text-xs text-zinc-500">
          복잡한 +type::JSON 문법 없이, 아래에서 섹션을 추가/수정해서
          저장하세요.
        </p>
        {hiddenCount > 0 ? (
          <p className="text-xs text-amber-700">
            숨김 섹션 {hiddenCount}개: 공개 페이지에는 표시되지 않습니다.
          </p>
        ) : null}
      </div>

      <SectionBuilder
        pageId={groupId}
        expectedUpdatedAt={expectedUpdatedAt}
        initialSections={sections}
        onSectionsChange={setSections}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {saving ? "Saving..." : `Save ${location} globals`}
        </button>
        {saved ? <span className="text-xs text-emerald-700">Saved</span> : null}
      </div>

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}
    </div>
  );
}
