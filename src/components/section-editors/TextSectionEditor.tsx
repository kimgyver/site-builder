import React from "react";
import { TiptapEditor } from "@/components/TiptapEditor";

export function TextSectionEditor({
  props,
  updateProps,
  type
}: {
  props: Record<string, unknown>;
  updateProps: (props: Record<string, unknown>) => void;
  type: "text" | "richText";
}) {
  return (
    <div className="space-y-1">
      <TiptapEditor
        defaultValue={typeof props.html === "string" ? props.html : ""}
        placeholder={
          type === "richText"
            ? "Write and format rich text for this block"
            : "Write text for this block (you can format with the toolbar)"
        }
        onChangeHtml={html => {
          const current = typeof props.html === "string" ? props.html : "";
          if (current === html) {
            return;
          }
          updateProps({
            ...props,
            html
          });
        }}
      />
    </div>
  );
}
