import React from "react";

export default function HtmlStructureSectionEditor({
  props,
  updateProps
}: {
  props: Record<string, unknown>;
  updateProps: (props: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-zinc-500">
        Paste external CMS HTML structure. We preserve semantic wrappers and
        common attributes/classes/styles.
      </p>
      <textarea
        className="min-h-40 w-full rounded-md border border-zinc-300 px-2 py-1 font-mono text-[11px] leading-5"
        value={typeof props.html === "string" ? props.html : ""}
        onChange={e =>
          updateProps({
            ...props,
            html: e.target.value
          })
        }
        placeholder={
          '<section class="hero"><div class="container">...</div></section>'
        }
      />
    </div>
  );
}
