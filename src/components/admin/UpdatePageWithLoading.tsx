"use client";
import { useState } from "react";

export default function UpdatePageWithLoading({
  page,
  action,
  readOnly,
  onSuccess
}: {
  page: {
    id: string;
    title: string;
    slug: string;
    locale?: string;
    seoTitle?: string;
    seoDescription?: string;
    status: string;
  };
  action: (
    formData: FormData
  ) => Promise<{ ok: boolean; error?: string; updatedAt?: string } | undefined>;
  readOnly?: boolean;
  onSuccess?: (updatedAt?: string) => void;
}) {
  const [form, setForm] = useState({
    title: page.title,
    slug: page.slug,
    locale: page.locale ?? "en",
    seoTitle: page.seoTitle ?? "",
    seoDescription: page.seoDescription ?? "",
    status: page.status
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSeoTitle =
    form.seoTitle.trim().length > 0 ? form.seoTitle.trim() : form.title;
  const effectiveSeoDescription =
    form.seoDescription.trim().length > 0 ? form.seoDescription.trim() : "";

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setIsSaving(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", page.id);
    formData.set("title", form.title);
    formData.set("slug", form.slug);
    formData.set("locale", form.locale);
    formData.set("seoTitle", form.seoTitle);
    formData.set("seoDescription", form.seoDescription);
    formData.set("status", form.status);
    const result = await action(formData);
    setIsSaving(false);
    if (result?.ok) {
      if (onSuccess) onSuccess(result.updatedAt);
    } else {
      setError(result?.error || "Failed to update page");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={page.id} />
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-800">Title</label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-800">
          Locale
        </label>
        <input
          name="locale"
          value={form.locale}
          onChange={handleChange}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-800">Slug</label>
        <div className="flex items-center gap-1 text-sm text-zinc-500">
          <span className="rounded-l-md border border-r-0 border-zinc-300 bg-zinc-50 px-3 py-2 text-xs">
            /
          </span>
          <input
            name="slug"
            value={form.slug}
            onChange={handleChange}
            disabled={readOnly}
            className="w-full rounded-r-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            required
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-800">
          SEO title (optional)
        </label>
        <p className="text-xs text-zinc-500">
          비워두면 페이지 Title을 그대로 사용합니다. 권장 길이: 30–60자
        </p>
        <input
          name="seoTitle"
          value={form.seoTitle}
          onChange={handleChange}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          placeholder="Custom title for search/preview"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-800">
          SEO description (optional)
        </label>
        <p className="text-xs text-zinc-500">
          검색/공유 미리보기 설명에 사용됩니다. 비워두면 description 메타태그를
          생략합니다. 권장 길이: 70–160자
        </p>
        <textarea
          name="seoDescription"
          value={form.seoDescription}
          onChange={handleChange}
          disabled={readOnly}
          className="h-20 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          placeholder="Short summary for search and link previews"
        />
      </div>
      <div className="space-y-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
        <p className="text-xs font-medium text-zinc-700">
          Search preview (effective)
        </p>
        <p className="text-sm font-semibold text-zinc-900">
          {effectiveSeoTitle}
        </p>
        <p className="text-xs text-zinc-600">
          {effectiveSeoDescription || "(description not set)"}
        </p>
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-800">
          Status
        </label>
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        >
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>
      {!readOnly ? (
        <button
          type="submit"
          className="inline-flex rounded-md border border-blue-500 bg-blue-600 px-4 py-2 text-sm text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      ) : (
        <p className="text-xs text-zinc-500">
          Read-only role: metadata editing is disabled.
        </p>
      )}
      {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
    </form>
  );
}
