import React from "react";
import { EditableSection } from "../../types/sections";
import type { MediaItem } from "@/types/references";

interface PageStyleSectionEditorProps {
  section: EditableSection;
  patchProps: (patch: Partial<Record<string, unknown>>) => void;
  updateProps: (newProps: Record<string, unknown>) => void;
  libraryMedia: MediaItem[];
  isLibraryLoading: boolean;
  mediaTotal: number;
  mediaLimit: number;
}

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

function isLikelyImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)(\?.*)?$/i.test(url);
}

const PageStyleSectionEditor: React.FC<PageStyleSectionEditorProps> = ({
  section,
  updateProps,
  libraryMedia,
  isLibraryLoading,
  mediaTotal,
  mediaLimit
}) => {
  const props = (section.props || {}) as Record<string, unknown>;
  const backgroundImageUrl =
    typeof props.backgroundImageUrl === "string"
      ? props.backgroundImageUrl
      : "";
  const imageCandidates = libraryMedia.filter(item =>
    isLikelyImageUrl(item.url)
  );

  const handleBackgroundPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text/plain");
    const html = e.clipboardData.getData("text/html");
    const extracted = getImageUrlFromPastedContent(text, html);
    if (!extracted) return;

    e.preventDefault();
    updateProps({
      ...props,
      backgroundImageUrl: extracted
    });
  };

  return (
    <div className="space-y-1">
      <div className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-[10px] text-blue-800">
        <p className="font-medium">Background image setup</p>
        <p>
          1) Paste into the URL field: direct image URL, HTML with{" "}
          <code>&lt;img src="..." /&gt;</code>, or clipboard image ({" "}
          <code>data:image;base64,...</code>). 2) Or choose one from{" "}
          <span className="font-medium">Pick from media library</span>.
        </p>
      </div>
      <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
        Background color
        <input
          type="color"
          className="mt-1 h-7 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0"
          value={
            typeof props.backgroundColor === "string"
              ? props.backgroundColor
              : "#f8fafc"
          }
          onChange={e =>
            updateProps({
              ...props,
              backgroundColor: e.target.value
            })
          }
        />
      </label>
      <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
        Background image URL (optional)
        {!isLibraryLoading && mediaLimit > 0 ? (
          <span className="ml-1 text-zinc-500">
            · {imageCandidates.length} from library
            {mediaTotal > imageCandidates.length ? ` (of ${mediaTotal})` : ""}
          </span>
        ) : null}
        <input
          type="text"
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
          value={backgroundImageUrl}
          onPaste={handleBackgroundPaste}
          onChange={e =>
            updateProps({
              ...props,
              backgroundImageUrl: e.target.value
            })
          }
          placeholder="https://... or /images/bg.jpg or data:image/..."
        />
        <p className="mt-1 text-[10px] text-zinc-500">
          Tip: if you paste HTML containing <code>&lt;img src="..." /&gt;</code>
          or clipboard image data, the first image source is auto-filled.
        </p>
      </label>
      {!isLibraryLoading && imageCandidates.length > 0 ? (
        <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
          Pick from media library
          <select
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
            value={backgroundImageUrl}
            onChange={e =>
              updateProps({
                ...props,
                backgroundImageUrl: e.target.value
              })
            }
          >
            <option value="">Select an image…</option>
            {imageCandidates.map(item => (
              <option key={item.url} value={item.url}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
        Background image dim (%)
        <input
          type="number"
          min={0}
          max={90}
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
          value={
            typeof props.backgroundImageDimPercent === "number"
              ? props.backgroundImageDimPercent
              : 0
          }
          onChange={e =>
            updateProps({
              ...props,
              backgroundImageDimPercent: Number(e.target.value)
            })
          }
        />
      </label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
          Brand name (header slot)
          <input
            type="text"
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
            value={typeof props.brandName === "string" ? props.brandName : ""}
            onChange={e =>
              updateProps({
                ...props,
                brandName: e.target.value
              })
            }
            placeholder="My Site"
          />
        </label>
        <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
          Brand link URL
          <input
            type="text"
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
            value={typeof props.brandHref === "string" ? props.brandHref : "/"}
            onChange={e =>
              updateProps({
                ...props,
                brandHref: e.target.value
              })
            }
            placeholder="/ or https://example.com"
          />
        </label>
      </div>
      <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
        Brand logo URL (optional)
        <input
          type="url"
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
          value={
            typeof props.brandLogoUrl === "string" ? props.brandLogoUrl : ""
          }
          onChange={e =>
            updateProps({
              ...props,
              brandLogoUrl: e.target.value
            })
          }
          placeholder="https://... or /images/logo.png"
        />
      </label>
      <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
        Brand logo height (px)
        <input
          type="number"
          min={20}
          max={96}
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
          value={
            typeof props.brandLogoHeightPx === "number"
              ? props.brandLogoHeightPx
              : 32
          }
          onChange={e =>
            updateProps({
              ...props,
              brandLogoHeightPx: Number(e.target.value)
            })
          }
        />
      </label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
          Content width
          <select
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
            value={
              props.contentWidth === "narrow" ||
              props.contentWidth === "default" ||
              props.contentWidth === "wide" ||
              props.contentWidth === "wider" ||
              props.contentWidth === "full"
                ? String(props.contentWidth)
                : "default"
            }
            onChange={e =>
              updateProps({
                ...props,
                contentWidth: e.target.value
              })
            }
          >
            <option value="narrow">Narrow</option>
            <option value="default">Default</option>
            <option value="wide">Wide</option>
            <option value="wider">Wider</option>
            <option value="full">Full</option>
          </select>
        </label>
        <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
          Section gap (px)
          <input
            type="number"
            min={8}
            max={96}
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
            value={
              typeof props.sectionGapPx === "number" ? props.sectionGapPx : 32
            }
            onChange={e =>
              updateProps({
                ...props,
                sectionGapPx: Number(e.target.value)
              })
            }
          />
        </label>
      </div>
      <label className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2 text-[10px] text-zinc-600">
        <input
          type="checkbox"
          checked={props.showPageTitle !== false}
          onChange={e =>
            updateProps({
              ...props,
              showPageTitle: e.target.checked
            })
          }
        />
        <span>Show page title heading</span>
      </label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
          Menu text color
          <input
            type="color"
            className="mt-1 h-7 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0"
            value={
              typeof props.menuTextColor === "string"
                ? props.menuTextColor
                : "#52525b"
            }
            onChange={e =>
              updateProps({
                ...props,
                menuTextColor: e.target.value
              })
            }
          />
        </label>
        <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
          Menu hover color
          <input
            type="color"
            className="mt-1 h-7 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0"
            value={
              typeof props.menuHoverColor === "string"
                ? props.menuHoverColor
                : "#18181b"
            }
            onChange={e =>
              updateProps({
                ...props,
                menuHoverColor: e.target.value
              })
            }
          />
        </label>
      </div>
      <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
        Menu font size (px)
        <input
          type="number"
          min={12}
          max={24}
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
          value={
            typeof props.menuFontSizePx === "number" ? props.menuFontSizePx : 14
          }
          onChange={e =>
            updateProps({
              ...props,
              menuFontSizePx: Number(e.target.value)
            })
          }
        />
      </label>
      <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
        Header/Footer divider color
        <input
          type="color"
          className="mt-1 h-7 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0"
          value={
            typeof props.dividerColor === "string"
              ? props.dividerColor
              : "#e4e4e7"
          }
          onChange={e =>
            updateProps({
              ...props,
              dividerColor: e.target.value
            })
          }
        />
      </label>
      <p className="text-[10px] text-zinc-500">
        Keep one enabled Page Style section. Use the same controls in pages and
        shared header/footer blocks for consistent look. Divider color applies
        to the block where this Page Style exists.
      </p>
    </div>
  );
};

export default PageStyleSectionEditor;
