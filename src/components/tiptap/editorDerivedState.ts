import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";
import type { EditorDerivedState } from "@/types/editor";

export function getEditorDerivedState(editor: Editor): EditorDerivedState {
  const { selection } = editor.state;
  let selectedImagePos: number | null = null;
  let selectedImageAttrs: Record<string, unknown> | null = null;

  if (
    selection instanceof NodeSelection &&
    selection.node.type.name === "image"
  ) {
    selectedImagePos = selection.from;
    selectedImageAttrs = selection.node.attrs as Record<string, unknown>;
  } else {
    const after = selection.$from.nodeAfter;
    if (after?.type.name === "image") {
      selectedImagePos = selection.from;
      selectedImageAttrs = after.attrs as Record<string, unknown>;
    } else {
      const before = selection.$from.nodeBefore;
      if (before?.type.name === "image") {
        selectedImagePos = selection.from - before.nodeSize;
        selectedImageAttrs = before.attrs as Record<string, unknown>;
      }
    }
  }

  const isImageActive = selectedImagePos !== null;
  const isTableActive = editor.isActive("table");

  const tableCellAttrs = editor.getAttributes("tableCell") as Record<
    string,
    unknown
  >;
  const tableHeaderAttrs = editor.getAttributes("tableHeader") as Record<
    string,
    unknown
  >;
  const activeTableAttrs =
    Object.keys(tableCellAttrs).length > 0 ? tableCellAttrs : tableHeaderAttrs;

  const activeTextColor = editor.getAttributes("textStyle").color as
    | string
    | undefined;
  const activeBorderColor =
    typeof activeTableAttrs.borderColor === "string"
      ? activeTableAttrs.borderColor
      : null;

  const rawImageWidth = (selectedImageAttrs?.width ?? null) as string | null;
  const parsedImageWidth = rawImageWidth
    ? Number(String(rawImageWidth).replace(/[^0-9.]/g, ""))
    : NaN;
  const effectiveImageWidth = Number.isFinite(parsedImageWidth)
    ? Math.max(5, Math.min(100, parsedImageWidth))
    : null;

  return {
    selectedImagePos,
    selectedImageAttrs,
    isImageActive,
    isTableActive,
    activeTextColor,
    activeBorderColor,
    effectiveImageWidth
  };
}
