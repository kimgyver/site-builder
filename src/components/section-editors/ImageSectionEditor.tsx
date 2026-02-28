import React from "react";
import Image from "next/image";
import type { MediaItem, PageReferenceItem } from "@/types/references";

export function ImageSectionEditor({
  props,
  updateProps,
  libraryMedia,
  libraryPages,
  isLibraryLoading
}: {
  props: Record<string, unknown>;
  updateProps: (props: Record<string, unknown>) => void;
  libraryMedia: MediaItem[];
  libraryPages: PageReferenceItem[];
  isLibraryLoading: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="mb-2 grid grid-cols-2 gap-2">
        {isLibraryLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`library-skeleton-${index}`}
                className="animate-pulse rounded border border-zinc-200 bg-zinc-50 p-2"
              >
                <div className="h-16 w-full rounded bg-zinc-200" />
                <div className="mt-2 h-3 w-2/3 rounded bg-zinc-200" />
              </div>
            ))
          : libraryMedia.map(item => {
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
                    <div className="relative mb-1 h-16 w-full max-w-30 overflow-hidden rounded">
                      <Image
                        src={item.url}
                        alt={item.label || "Preview"}
                        fill
                        unoptimized
                        sizes="120px"
                        className="object-cover"
                      />
                    </div>
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
                  <span className="truncate w-full text-center">
                    {item.label}
                  </span>
                </button>
              );
            })}
      </div>
      {!isLibraryLoading && libraryMedia.length === 0 ? (
        <p className="mb-2 text-[11px] text-zinc-500">
          No media in library yet. You can still paste an image URL below.
        </p>
      ) : null}
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
        value={
          props.align === "left" || props.align === "right"
            ? String(props.align)
            : "center"
        }
        onChange={e =>
          updateProps({
            ...props,
            align:
              e.target.value === "left" || e.target.value === "right"
                ? e.target.value
                : "center"
          })
        }
      >
        <option value="left">Align image left</option>
        <option value="center">Align image center</option>
        <option value="right">Align image right</option>
      </select>
      <select
        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
        value={typeof props.href === "string" ? props.href : ""}
        disabled={isLibraryLoading}
        onChange={e =>
          updateProps({
            ...props,
            href: e.target.value || null
          })
        }
      >
        <option value="">No internal link</option>
        {isLibraryLoading ? (
          <option value="" disabled>
            Loading page links…
          </option>
        ) : null}
        {libraryPages.map(item => (
          <option key={item.id} value={`/${item.locale}/${item.slug}`}>
            /{item.locale}/{item.slug} · {item.title}
          </option>
        ))}
      </select>
    </div>
  );
}
