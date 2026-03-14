import React from "react";
import { EditableSection } from "../../types/sections";
import type { MediaItem } from "@/types/references";
import { isEmbeddedDataImage, isImageLikeUrl } from "@/lib/media/imageUrlUtils";
import { PageStyleBackgroundHelp } from "./PageStyleBackgroundHelp";
import { PageStyleFullPreviewModal } from "./PageStyleFullPreviewModal";
import {
  derivePageStyleEditorState,
  getBackgroundPreviewStyles,
  getImageUrlFromPastedContent,
  readClipboardImageAsDataUrl
} from "./pageStyleSectionEditorUtils";

interface PageStyleSectionEditorProps {
  section: EditableSection;
  patchProps: (patch: Partial<Record<string, unknown>>) => void;
  updateProps: (newProps: Record<string, unknown>) => void;
  libraryMedia: MediaItem[];
  isLibraryLoading: boolean;
  mediaTotal: number;
  mediaLimit: number;
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
  const {
    backgroundMode,
    backgroundImageUrl,
    backgroundImageRenderMode,
    backgroundColor,
    imageCandidatesWithCurrent,
    imageModeEnabled,
    hasImageValue,
    imageValueValid,
    isDataImageValue,
    backgroundImageDimPercent
  } = derivePageStyleEditorState({
    props,
    libraryMedia,
    isImageLikeUrl,
    isEmbeddedDataImage
  });
  const {
    previewBackgroundImage,
    previewBackgroundRepeat,
    previewBackgroundSize,
    previewBackgroundPosition
  } = getBackgroundPreviewStyles({
    backgroundImageRenderMode,
    backgroundImageDimPercent,
    backgroundImageUrl
  });
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
  return (
    <div className="space-y-1">
      <PageStyleBackgroundHelp />
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
            {mediaTotal > imageCandidatesWithCurrent.length
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
              onClick={() => {
                const raw = backgroundImageUrl.trim();
                if (!raw) return;
                setShowFullPreview(true);
              }}
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
                  ? `[Embedded] ${"label" in item ? item.label : item.url}`
                  : "label" in item
                    ? item.label
                    : item.url}
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
          onFocus={e => {
            if (e.currentTarget.value === "0") {
              e.currentTarget.select();
            }
          }}
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
      <PageStyleFullPreviewModal
        open={showFullPreview && backgroundImageUrl.trim().length > 0}
        onClose={() => setShowFullPreview(false)}
        backgroundColor={backgroundColor}
        previewBackgroundImage={previewBackgroundImage}
        previewBackgroundRepeat={previewBackgroundRepeat}
        previewBackgroundPosition={previewBackgroundPosition}
        previewBackgroundSize={previewBackgroundSize}
      />
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
          onFocus={e => {
            if (e.currentTarget.value === "0") {
              e.currentTarget.select();
            }
          }}
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
            onFocus={e => {
              if (e.currentTarget.value === "0") {
                e.currentTarget.select();
              }
            }}
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
          onFocus={e => {
            if (e.currentTarget.value === "0") {
              e.currentTarget.select();
            }
          }}
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
