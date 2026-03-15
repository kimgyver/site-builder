import React from "react";
import { TiptapEditor } from "@/components/TiptapEditor";
import type { CSSProperties } from "react";

export function TextSectionEditor({
  props,
  updateProps,
  type,
  richContentStyle
}: {
  props: Record<string, unknown>;
  updateProps: (props: Record<string, unknown>) => void;
  type: "text" | "richText";
  richContentStyle?: CSSProperties;
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
        editorContainerStyle={richContentStyle}
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
