import React from "react";
import { EditableSection } from "../../types/sections";

interface PageStyleSectionEditorProps {
  section: EditableSection;
  patchProps: (patch: Partial<Record<string, unknown>>) => void;
  updateProps: (newProps: Record<string, unknown>) => void;
}

const PageStyleSectionEditor: React.FC<PageStyleSectionEditorProps> = ({
  section,
  updateProps
}) => {
  const props = (section.props || {}) as Record<string, unknown>;
  return (
    <div className="space-y-1">
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
        <input
          type="url"
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
          value={
            typeof props.backgroundImageUrl === "string"
              ? props.backgroundImageUrl
              : ""
          }
          onChange={e =>
            updateProps({
              ...props,
              backgroundImageUrl: e.target.value
            })
          }
          placeholder="https://... or /images/bg.jpg"
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
        shared header/footer blocks for consistent look.
      </p>
    </div>
  );
};

export default PageStyleSectionEditor;
