import React from "react";
import Image from "next/image";
import type { MediaItem, PageReferenceItem } from "@/types/references";

function getImageUrlFromPastedContent(
  text: string,
  html: string
): string | undefined {
  const htmlMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlMatch?.[1]) {
    return htmlMatch[1].trim();
  }

  const textMatch = text.match(
    /data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+|https?:\/\/[^\s"')]+|\/[^\s"')]+/i
  );
  if (textMatch?.[0]) {
    return textMatch[0].trim();
  }

  return undefined;
}

function readClipboardImageAsDataUrl(
  items: DataTransferItemList
): Promise<string | undefined> {
  const imageItem = Array.from(items).find(item =>
    item.type.toLowerCase().startsWith("image/")
  );
  const file = imageItem?.getAsFile();
  if (!file) return Promise.resolve(undefined);

  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : undefined);
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

function isImageLikeUrl(url: string): boolean {
  return (
    /^data:image\//i.test(url) ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)(\?.*)?$/i.test(url) ||
    url.startsWith("https://placehold.co/") ||
    url.startsWith("https://imgnews") ||
    url.startsWith("https://images") ||
    url.startsWith("https://pstatic") ||
    url.startsWith("https://cdn") ||
    url.startsWith("/public/")
  );
}

function isEmbeddedDataImage(url: string): boolean {
  return /^data:image\//i.test(url);
}

export function ImageSectionEditor({
  props,
  updateProps,
  libraryMedia,
  libraryPages,
  isLibraryLoading,
  mediaTotal,
  mediaLimit
}: {
  props: Record<string, unknown>;
  updateProps: (props: Record<string, unknown>) => void;
  libraryMedia: MediaItem[];
  libraryPages: PageReferenceItem[];
  isLibraryLoading: boolean;
  mediaTotal: number;
  mediaLimit: number;
}) {
  const currentUrl = typeof props.url === "string" ? props.url.trim() : "";
  const libraryImageCandidates = libraryMedia.filter(item =>
    isImageLikeUrl(item.url)
  );
  const hasCurrentInCandidates = libraryImageCandidates.some(
    item => item.url === currentUrl
  );
  const mediaCandidates =
    currentUrl && isImageLikeUrl(currentUrl) && !hasCurrentInCandidates
      ? [
          {
            url: currentUrl,
            label: /^data:image\//i.test(currentUrl)
              ? "Current section · data:image;base64,..."
              : currentUrl.length > 84
                ? `Current section · ${currentUrl.slice(0, 81)}...`
                : `Current section · ${currentUrl}`
          },
          ...libraryImageCandidates
        ]
      : libraryImageCandidates;

  const handleImageUrlPaste = async (
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    const clipboardImage = await readClipboardImageAsDataUrl(
      e.clipboardData.items
    );
    if (clipboardImage) {
      e.preventDefault();
      updateProps({
        ...props,
        url: clipboardImage
      });
      return;
    }

    const text = e.clipboardData.getData("text/plain");
    const html = e.clipboardData.getData("text/html");
    const extracted = getImageUrlFromPastedContent(text, html);
    if (!extracted) return;

    e.preventDefault();
    updateProps({
      ...props,
      url: extracted
    });
  };

  return (
    <div className="space-y-1">
      {!isLibraryLoading && mediaLimit > 0 ? (
        <p className="mb-1 text-[11px] text-zinc-500">
          Showing recent {mediaCandidates.length} image references
          {mediaTotal > libraryImageCandidates.length
            ? ` (of ${mediaTotal} total)`
            : ""}
          {mediaTotal > mediaLimit ? ` · cap ${mediaLimit}` : ""}
        </p>
      ) : null}
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
          : mediaCandidates.map(item => {
              const isImage = isImageLikeUrl(item.url);
              const isEmbedded = isEmbeddedDataImage(item.url);
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
                    {isEmbedded ? "[Embedded] " : ""}
                    {item.label}
                  </span>
                  {isEmbedded ? (
                    <span className="mt-1 inline-flex rounded border border-amber-300 bg-amber-50 px-1 py-0.5 text-[10px] font-medium text-amber-700">
                      Embedded
                    </span>
                  ) : null}
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
        onPaste={handleImageUrlPaste}
        onChange={e =>
          updateProps({
            ...props,
            url: e.target.value
          })
        }
        placeholder="Image URL (or paste image with Cmd+V)"
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

      <p className="text-[10px] text-zinc-500">
        Items marked <span className="font-medium">Embedded</span> are pasted
        clipboard images stored as <code>data:image</code> values.
      </p>
    </div>
  );
}
