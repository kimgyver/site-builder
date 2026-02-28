import React from "react";

export function HeroSectionEditor({
  props,
  patchProps
}: {
  props: Record<string, unknown>;
  patchProps: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-1">
      <input
        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
        value={typeof props.title === "string" ? props.title : ""}
        onChange={e => patchProps({ title: e.target.value })}
        placeholder="Hero title"
      />
      <input
        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
        value={typeof props.subtitle === "string" ? props.subtitle : ""}
        onChange={e => patchProps({ subtitle: e.target.value })}
        placeholder="Hero subtitle"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
          BG color
          <input
            type="color"
            className="mt-1 h-7 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0"
            value={
              typeof props.backgroundColor === "string"
                ? props.backgroundColor
                : "#18181b"
            }
            onChange={e => patchProps({ backgroundColor: e.target.value })}
          />
        </label>
        <label className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
          Text color
          <input
            type="color"
            className="mt-1 h-7 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0"
            value={
              typeof props.textColor === "string" ? props.textColor : "#fafafa"
            }
            onChange={e => patchProps({ textColor: e.target.value })}
          />
        </label>
        <label className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
          Subtitle color
          <input
            type="color"
            className="mt-1 h-7 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0"
            value={
              typeof props.subtitleColor === "string"
                ? props.subtitleColor
                : "#d4d4d8"
            }
            onChange={e => patchProps({ subtitleColor: e.target.value })}
          />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
          value={
            typeof props.primaryCtaLabel === "string"
              ? props.primaryCtaLabel
              : ""
          }
          onChange={e => patchProps({ primaryCtaLabel: e.target.value })}
          placeholder="Primary CTA label"
        />
        <input
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
          value={
            typeof props.primaryCtaHref === "string" ? props.primaryCtaHref : ""
          }
          onChange={e => patchProps({ primaryCtaHref: e.target.value })}
          placeholder="Primary CTA URL (/contact or https://...)"
        />
      </div>
      <label className="flex items-center gap-2 text-[10px] text-zinc-600">
        <input
          type="checkbox"
          checked={props.primaryCtaNewTab === true}
          onChange={e => patchProps({ primaryCtaNewTab: e.target.checked })}
        />
        <span>Open primary CTA in new tab</span>
      </label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
          value={
            typeof props.secondaryCtaLabel === "string"
              ? props.secondaryCtaLabel
              : ""
          }
          onChange={e => patchProps({ secondaryCtaLabel: e.target.value })}
          placeholder="Secondary CTA label"
        />
        <input
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
          value={
            typeof props.secondaryCtaHref === "string"
              ? props.secondaryCtaHref
              : ""
          }
          onChange={e => patchProps({ secondaryCtaHref: e.target.value })}
          placeholder="Secondary CTA URL"
        />
      </div>
      <label className="flex items-center gap-2 text-[10px] text-zinc-600">
        <input
          type="checkbox"
          checked={props.secondaryCtaNewTab === true}
          onChange={e => patchProps({ secondaryCtaNewTab: e.target.checked })}
        />
        <span>Open secondary CTA in new tab</span>
      </label>
    </div>
  );
}
