import React from "react";

export default function ColumnsSectionEditor({
  props,
  updateProps
}: {
  props: Record<string, unknown>;
  updateProps: (props: Record<string, unknown>) => void;
}) {
  const ratio =
    props.ratio === "2:1" || props.ratio === "1:2" ? props.ratio : "1:1";

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
          Column ratio
          <select
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
            value={ratio}
            onChange={e =>
              updateProps({
                ...props,
                ratio: e.target.value
              })
            }
          >
            <option value="1:1">1:1</option>
            <option value="2:1">2:1</option>
            <option value="1:2">1:2</option>
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2 text-[10px] text-zinc-600">
          <input
            type="checkbox"
            checked={props.reverseOnMobile === true}
            onChange={e =>
              updateProps({
                ...props,
                reverseOnMobile: e.target.checked
              })
            }
          />
          <span>Reverse column order on mobile</span>
        </label>
      </div>

      <textarea
        className="min-h-28 w-full rounded-md border border-zinc-300 px-2 py-1 font-mono text-[11px] leading-5"
        value={typeof props.leftHtml === "string" ? props.leftHtml : ""}
        onChange={e =>
          updateProps({
            ...props,
            leftHtml: e.target.value
          })
        }
        placeholder="Left column HTML"
      />

      <textarea
        className="min-h-28 w-full rounded-md border border-zinc-300 px-2 py-1 font-mono text-[11px] leading-5"
        value={typeof props.rightHtml === "string" ? props.rightHtml : ""}
        onChange={e =>
          updateProps({
            ...props,
            rightHtml: e.target.value
          })
        }
        placeholder="Right column HTML"
      />
    </div>
  );
}
