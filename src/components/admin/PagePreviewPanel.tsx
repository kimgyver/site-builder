"use client";

import { useState } from "react";

export default function PagePreviewPanel({
  previewHref
}: {
  previewHref: string;
}) {
  const [showInlinePreview, setShowInlinePreview] = useState(false);

  return (
    <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3">
      <h2 className="text-sm font-medium text-zinc-900">Preview</h2>
      <p className="text-xs text-zinc-600">
        Share this private preview URL to review draft content before
        publishing.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={previewHref}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex rounded-md border border-blue-500 bg-blue-600 px-3 py-1.5 text-xs text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
        >
          Open preview in new tab
        </a>
        <button
          type="button"
          onClick={() => setShowInlinePreview(prev => !prev)}
          className="inline-flex rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          {showInlinePreview ? "Hide inline preview" : "Show inline preview"}
        </button>
      </div>
      {showInlinePreview ? (
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
          <iframe
            src={previewHref}
            title="Inline preview"
            className="h-[520px] w-full"
          />
        </div>
      ) : null}
    </div>
  );
}
