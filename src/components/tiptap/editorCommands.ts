import type { Editor } from "@tiptap/core";
import { updateCurrentTableCells } from "./tableUtils";

type SelectionRange = { from: number; to: number };

export function setOrUnsetLink(editor: Editor) {
  editor.chain().focus().run();

  const previousUrl = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("Link URL", previousUrl ?? "https://");
  if (url === null) return;

  const trimmed = url.trim();
  if (!trimmed) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }

  editor
    .chain()
    .focus()
    .extendMarkRange("link")
    .setLink({ href: trimmed })
    .run();
}

export function setTextColor(
  editor: Editor,
  lastSelection: SelectionRange | null,
  color: string
) {
  if (lastSelection && lastSelection.from !== lastSelection.to) {
    const appliedWithRange = editor
      .chain()
      .focus()
      .setTextSelection({ from: lastSelection.from, to: lastSelection.to })
      .setColor(color)
      .run();
    if (appliedWithRange) return;
  }
  editor.chain().focus().setColor(color).run();
}

export function clearTextColor(
  editor: Editor,
  lastSelection: SelectionRange | null
) {
  if (lastSelection && lastSelection.from !== lastSelection.to) {
    const clearedWithRange = editor
      .chain()
      .focus()
      .setTextSelection({ from: lastSelection.from, to: lastSelection.to })
      .unsetColor()
      .run();
    if (clearedWithRange) return;
  }
  editor.chain().focus().unsetColor().run();
}

export function setHighlightColor(
  editor: Editor,
  lastSelection: SelectionRange | null,
  color: string
) {
  if (lastSelection && lastSelection.from !== lastSelection.to) {
    const appliedWithRange = editor
      .chain()
      .focus()
      .setTextSelection({ from: lastSelection.from, to: lastSelection.to })
      .setHighlight({ color })
      .run();
    if (appliedWithRange) return;
  }
  editor.chain().focus().setHighlight({ color }).run();
}

export function clearHighlightColor(
  editor: Editor,
  lastSelection: SelectionRange | null
) {
  if (lastSelection && lastSelection.from !== lastSelection.to) {
    const clearedWithRange = editor
      .chain()
      .focus()
      .setTextSelection({ from: lastSelection.from, to: lastSelection.to })
      .unsetHighlight()
      .run();
    if (clearedWithRange) return;
  }
  editor.chain().focus().unsetHighlight().run();
}

function applyTableAttrs(editor: Editor, attrs: Record<string, unknown>) {
  if (!editor.isActive("table")) return;
  if (updateCurrentTableCells(editor, attrs)) return;
}

export function setCellBackgroundColor(editor: Editor, color: string) {
  applyTableAttrs(editor, { backgroundColor: color, borderMode: null });
}

export function clearCellBackgroundColor(editor: Editor) {
  applyTableAttrs(editor, { backgroundColor: null });
}

export function setCellBorderTransparent(editor: Editor) {
  applyTableAttrs(editor, { borderMode: "transparent" });
}

export function setCellBorderNormal(editor: Editor) {
  applyTableAttrs(editor, { borderMode: null });
}

export function setCellBorderColor(editor: Editor, color: string) {
  applyTableAttrs(editor, { borderColor: color, borderMode: null });
}

export function clearCellBorderColor(editor: Editor) {
  applyTableAttrs(editor, { borderColor: null });
}

export function setCellBorderWidth(editor: Editor, width: number) {
  const clamped = Math.max(1, Math.min(12, width));
  applyTableAttrs(editor, { borderWidth: String(clamped), borderMode: null });
}

export function setCellAlign(
  editor: Editor,
  align: "left" | "center" | "right"
) {
  applyTableAttrs(editor, { textAlign: align });
}

export function insertImagePrompt(editor: Editor) {
  const url = window.prompt("Image URL", "https://");
  if (!url) return;
  const src = url.trim();
  if (!src) return;

  const alt = window.prompt("Alt text (optional)", "") ?? "";
  editor
    .chain()
    .focus()
    .setImage({ src, alt: alt.trim() || undefined })
    .updateAttributes("image", {
      width: "100",
      widthPx: null,
      align: "center"
    })
    .run();
}

export function setImageWidth(
  editor: Editor,
  imagePos: number | null,
  percent: number | null
) {
  if (!imagePos) return;
  editor.chain().focus().setNodeSelection(imagePos).run();
  if (percent === null) {
    editor
      .chain()
      .focus()
      .updateAttributes("image", { width: null, widthPx: null })
      .run();
    return;
  }
  const clamped = Math.max(5, Math.min(100, percent));
  editor
    .chain()
    .focus()
    .updateAttributes("image", { width: String(clamped), widthPx: null })
    .run();
}

export function setImageAlign(
  editor: Editor,
  imagePos: number | null,
  align: "left" | "center" | "right"
) {
  if (!imagePos) return;
  editor.chain().focus().setNodeSelection(imagePos).run();
  editor.chain().focus().updateAttributes("image", { align }).run();
}

export function insertTable(editor: Editor) {
  editor
    .chain()
    .focus()
    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
    .run();
}
