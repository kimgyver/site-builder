import React from "react";
import { EditableSection } from "../../types/sections";
import type { MediaItem } from "@/types/references";
import { isEmbeddedDataImage, isImageLikeUrl } from "@/lib/media/imageUrlUtils";

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

function isSupportedBackgroundImageValue(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  if (
    /^data:image\/(png|jpe?g|webp|gif|bmp|avif);base64,[a-z0-9+/=\s]+$/i.test(
      raw
    )
  ) {
    return raw.length <= 2_500_000;
  }
  if (raw.startsWith("/")) return true;
  return /^https?:\/\//i.test(raw);
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

const PageStyleSectionEditor: React.FC<PageStyleSectionEditorProps> = ({
  section,
  updateProps,
  libraryMedia,
  isLibraryLoading,
  mediaTotal,
  mediaLimit
}) => {
  const props = (section.props || {}) as Record<string, unknown>;
  const backgroundMode =
    props.backgroundMode === "color" ||
    props.backgroundMode === "image" ||
    props.backgroundMode === "both"
      ? String(props.backgroundMode)
      : "both";
  const backgroundImageUrl =
    typeof props.backgroundImageUrl === "string"
      ? props.backgroundImageUrl
      : "";
  const backgroundImageRenderMode =
    props.backgroundImageRenderMode === "cover" ||
    props.backgroundImageRenderMode === "original" ||
    props.backgroundImageRenderMode === "tile"
      ? String(props.backgroundImageRenderMode)
      : "cover";
  const backgroundColor =
    typeof props.backgroundColor === "string"
      ? props.backgroundColor
      : "#f8fafc";
  const imageCandidates = libraryMedia.filter(item => isImageLikeUrl(item.url));
  const imageModeEnabled =
    backgroundMode === "image" || backgroundMode === "both";
  const hasImageValue = backgroundImageUrl.trim().length > 0;
  const imageValueValid = isSupportedBackgroundImageValue(backgroundImageUrl);
  const isDataImageValue = /^data:image\//i.test(backgroundImageUrl.trim());
  const normalizedCurrentImageUrl = backgroundImageUrl.trim();
  const hasCurrentImageInCandidates = imageCandidates.some(
    item => item.url === normalizedCurrentImageUrl
  );
  const imageCandidatesWithCurrent =
    imageValueValid &&
    isImageLikeUrl(normalizedCurrentImageUrl) &&
    normalizedCurrentImageUrl.length > 0 &&
    !hasCurrentImageInCandidates
      ? [
          {
            url: normalizedCurrentImageUrl,
            label: isEmbeddedDataImage(normalizedCurrentImageUrl)
              ? "Current page · data:image;base64,..."
              : normalizedCurrentImageUrl.length > 84
                ? `Current page · ${normalizedCurrentImageUrl.slice(0, 81)}...`
                : `Current page · ${normalizedCurrentImageUrl}`
          },
          ...imageCandidates
        ]
      : imageCandidates;
  const backgroundImageDimPercent =
    typeof props.backgroundImageDimPercent === "number"
      ? props.backgroundImageDimPercent
      : 0;
  const previewRepeat =
    backgroundImageRenderMode === "tile" ? "repeat" : "no-repeat";
  const previewSize = backgroundImageRenderMode === "cover" ? "cover" : "auto";
  const previewPosition =
    backgroundImageRenderMode === "cover" ? "center" : "top left";
  const previewDimAlpha = Number((backgroundImageDimPercent / 100).toFixed(2));
  const escapedPreviewUrl = backgroundImageUrl.replace(/"/g, '\\"');
  const previewBackgroundImage =
    backgroundImageDimPercent > 0
      ? `linear-gradient(rgba(255, 255, 255, ${previewDimAlpha}), rgba(255, 255, 255, ${previewDimAlpha})), url("${escapedPreviewUrl}")`
      : `url("${escapedPreviewUrl}")`;
  const previewBackgroundRepeat =
    backgroundImageDimPercent > 0
      ? `no-repeat, ${previewRepeat}`
      : previewRepeat;
  const previewBackgroundSize =
    backgroundImageDimPercent > 0 ? `cover, ${previewSize}` : previewSize;
  const previewBackgroundPosition =
    backgroundImageDimPercent > 0
      ? `center, ${previewPosition}`
      : previewPosition;
  const [showFullPreview, setShowFullPreview] = React.useState(false);

  const handleBackgroundPaste = async (
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    const clipboardImage = await readClipboardImageAsDataUrl(
      e.clipboardData.items
    );
    if (clipboardImage) {
      e.preventDefault();
      updateProps({
        ...props,
        backgroundImageUrl: clipboardImage
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
      backgroundImageUrl: extracted
    });
  };

  const handleOpenFullView = () => {
    const raw = backgroundImageUrl.trim();
    if (!raw) {
      return;
    }
    setShowFullPreview(true);
  };

  return (
    <div className="space-y-1">
      <div className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-[10px] text-blue-800">
        <p className="font-medium">Background setup (quick steps)</p>
        <p>
          1) Set mode to Image only or Both. 2) Copy an image and paste (Cmd+V)
          into Background image URL, or pick one from media library. 3) Save.
        </p>
      </div>
      <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
        Background mode
        <select
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
          value={backgroundMode}
          onChange={e =>
            updateProps({
              ...props,
              backgroundMode: e.target.value
            })
          }
        >
          <option value="color">Color only</option>
          <option value="image">Image only</option>
          <option value="both">Both (image over color)</option>
        </select>
      </label>
      <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
        Background color
        <input
          type="color"
          className="mt-1 h-7 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0"
          value={backgroundColor}
          onChange={e =>
            updateProps({
              ...props,
              backgroundColor: e.target.value
            })
          }
        />
      </label>
      <div className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
        <span className="font-medium">Image status:</span>{" "}
        {!imageModeEnabled
          ? "disabled by mode"
          : !hasImageValue
            ? "no image set"
            : imageValueValid && isDataImageValue
              ? "ready (embedded data image; library list may not include this)"
              : imageValueValid
                ? "ready"
                : "invalid value (use https://, /path, or data:image;base64)"}
      </div>
      <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
        Background image URL (optional)
        {!isLibraryLoading && mediaLimit > 0 ? (
          <span className="ml-1 text-zinc-500">
            · {imageCandidatesWithCurrent.length} available
            {mediaTotal > imageCandidates.length
              ? ` (of ${mediaTotal} in library)`
              : ""}
          </span>
        ) : null}
        <input
          type="text"
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
          value={backgroundImageUrl}
          onPaste={handleBackgroundPaste}
          disabled={!imageModeEnabled}
          onChange={e =>
            updateProps({
              ...props,
              backgroundImageUrl: e.target.value
            })
          }
          placeholder="https://... or /images/bg.jpg or data:image/..."
        />
        <p className="mt-1 text-[10px] text-zinc-500">
          Easy way: copy any image and press Cmd+V here.
        </p>
        <p className="mt-1 text-[10px] text-zinc-500">
          You can also paste a URL or HTML with <code>&lt;img src /&gt;</code>.
        </p>
      </label>
      <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
        Image layout
        <select
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
          value={backgroundImageRenderMode}
          disabled={!imageModeEnabled}
          onChange={e =>
            updateProps({
              ...props,
              backgroundImageRenderMode: e.target.value
            })
          }
        >
          <option value="cover">Single (cover)</option>
          <option value="original">Single (original size)</option>
          <option value="tile">Tile (repeat original size)</option>
        </select>
      </label>
      {imageModeEnabled && hasImageValue && imageValueValid ? (
        <div className="rounded-md border border-zinc-200 bg-white p-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[10px] text-zinc-600">Image preview</p>
            <button
              type="button"
              onClick={handleOpenFullView}
              className="rounded border border-zinc-300 px-2 py-0.5 text-[10px] text-zinc-700 hover:bg-zinc-100"
            >
              Full view
            </button>
          </div>
          <div
            className="h-16 rounded border border-zinc-200"
            style={{
              backgroundColor,
              backgroundImage: previewBackgroundImage,
              backgroundSize: previewBackgroundSize,
              backgroundRepeat: previewBackgroundRepeat,
              backgroundPosition: previewBackgroundPosition
            }}
          />
        </div>
      ) : null}
      {!isLibraryLoading && imageCandidatesWithCurrent.length > 0 ? (
        <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
          Pick from media library (URL images)
          <select
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
            value={backgroundImageUrl}
            disabled={!imageModeEnabled}
            onChange={e =>
              updateProps({
                ...props,
                backgroundImageUrl: e.target.value
              })
            }
          >
            <option value="">Select an image…</option>
            {imageCandidatesWithCurrent.map(item => (
              <option key={item.url} value={item.url}>
                {isEmbeddedDataImage(item.url)
                  ? `[Embedded] ${item.label}`
                  : item.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-zinc-500">
            <span className="font-medium">[Embedded]</span> means clipboard
            image data (<code>data:image</code>), not an external URL.
          </p>
        </label>
      ) : null}
      <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
        Background image fade (%)
        <input
          type="number"
          min={0}
          max={90}
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
          disabled={!imageModeEnabled}
          value={backgroundImageDimPercent}
          onChange={e =>
            updateProps({
              ...props,
              backgroundImageDimPercent: Number(e.target.value)
            })
          }
        />
        <p className="mt-1 text-[10px] text-zinc-500">
          Higher value makes the image lighter.
        </p>
      </label>
      {showFullPreview && backgroundImageUrl.trim().length > 0 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <button
            type="button"
            onClick={() => setShowFullPreview(false)}
            className="absolute right-4 top-4 rounded border border-white/30 bg-black/40 px-3 py-1 text-xs text-white hover:bg-black/60"
          >
            Close
          </button>
          <div
            role="img"
            aria-label="Full preview"
            className="h-full w-full"
            style={{
              backgroundColor,
              backgroundImage: previewBackgroundImage,
              backgroundRepeat: previewBackgroundRepeat,
              backgroundPosition: previewBackgroundPosition,
              backgroundSize: previewBackgroundSize
            }}
          />
        </div>
      ) : null}
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
