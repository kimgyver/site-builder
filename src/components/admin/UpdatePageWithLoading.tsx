"use client";
import { useState } from "react";

export default function UpdatePageWithLoading({
  page,
  action,
  onSuccess
}: {
  page: {
    id: string;
    title: string;
    slug: string;
    seoTitle?: string;
    seoDescription?: string;
    status: string;
  };
  action: (formData: FormData) => Promise<any>;
  onSuccess?: () => void;
}) {
  const [form, setForm] = useState({
    title: page.title,
    slug: page.slug,
    seoTitle: page.seoTitle ?? "",
    seoDescription: page.seoDescription ?? "",
    status: page.status
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", page.id);
    formData.set("title", form.title);
    formData.set("slug", form.slug);
    formData.set("seoTitle", form.seoTitle);
    formData.set("seoDescription", form.seoDescription);
    formData.set("status", form.status);
    const result = await action(formData);
    setIsSaving(false);
    if (result?.ok) {
      if (onSuccess) onSuccess();
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
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          required
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
            className="w-full rounded-r-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            required
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-800">
          SEO title (optional)
        </label>
        <input
          name="seoTitle"
          value={form.seoTitle}
          onChange={handleChange}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          placeholder="Custom title for search/preview"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-800">
          SEO description (optional)
        </label>
        <textarea
          name="seoDescription"
          value={form.seoDescription}
          onChange={handleChange}
          className="h-20 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          placeholder="Short summary for search and link previews"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-800">
          Status
        </label>
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        >
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>
      <button
        type="submit"
        className="inline-flex rounded-md border border-blue-500 bg-blue-600 px-4 py-2 text-sm text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
        disabled={isSaving}
      >
        {isSaving ? "Saving..." : "Save changes"}
      </button>
      {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
    </form>
  );
}
