import React from "react";
import type { MediaItem, PageReferenceItem } from "@/types/references";

export function ImageSectionEditor({
  props,
  updateProps,
  libraryMedia,
  libraryPages
}: {
  props: Record<string, unknown>;
  updateProps: (props: Record<string, unknown>) => void;
  libraryMedia: MediaItem[];
  libraryPages: PageReferenceItem[];
}) {
  return (
    <div className="space-y-1">
      <div className="mb-2 grid grid-cols-2 gap-2">
        {libraryMedia.map(item => {
          const isImage =
            (typeof item.url === "string" &&
              /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(item.url)) ||
            item.url.startsWith("https://placehold.co/") ||
            item.url.startsWith("https://imgnews") ||
            item.url.startsWith("https://images") ||
            item.url.startsWith("https://pstatic") ||
            item.url.startsWith("https://cdn") ||
            item.url.startsWith("/public/");
          return (
            <button
              key={item.url}
              type="button"
              className={`flex flex-col items-center rounded border border-zinc-300 bg-white p-2 text-[11px] hover:bg-zinc-100 ${props.url === item.url ? "ring-2 ring-blue-400" : ""}`}
              onClick={() =>
                updateProps({
                  ...props,
                  url: item.url
                })
              }
            >
              {isImage ? (
                <img
                  src={item.url}
                  alt={item.label || "Preview"}
                  className="mb-1 h-16 w-full object-cover rounded"
                  style={{ maxWidth: 120 }}
                />
              ) : (
                <div className="mb-1 flex h-16 w-full items-center justify-center bg-zinc-100 rounded">
                  <span className="text-xs text-zinc-500">
                    {item.url.includes("youtube")
                      ? "YouTube"
                      : item.url.includes("maps")
                        ? "Google Maps"
                        : "Link"}
                  </span>
                </div>
              )}
              <span className="truncate w-full text-center">{item.label}</span>
            </button>
          );
        })}
      </div>
      <input
        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
        value={typeof props.url === "string" ? props.url : ""}
        onChange={e =>
          updateProps({
            ...props,
            url: e.target.value
          })
        }
        placeholder="Image URL"
      />
      <input
        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
        value={typeof props.alt === "string" ? props.alt : ""}
        onChange={e =>
          updateProps({
            ...props,
            alt: e.target.value
          })
        }
        placeholder="Alt text"
      />
      <select
        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
        value={typeof props.href === "string" ? props.href : ""}
        onChange={e =>
          updateProps({
            ...props,
            href: e.target.value || null
          })
        }
      >
        <option value="">No internal link</option>
        {libraryPages.map(item => (
          <option key={item.id} value={`/${item.locale}/${item.slug}`}>
            /{item.locale}/{item.slug} · {item.title}
          </option>
        ))}
      </select>
    </div>
  );
}
