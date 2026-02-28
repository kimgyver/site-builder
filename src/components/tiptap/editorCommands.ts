import type { Editor } from "@tiptap/core";
import type { SelectionRange } from "@/types/tiptap";
import { updateCurrentTableCells } from "./tableUtils";

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

function applyTableAttrsToSelection(
  editor: Editor,
  attrs: Record<string, unknown>,
  selectedCellPositions?: number[] | null
) {
  if (!editor.isActive("table")) return;
  if (updateCurrentTableCells(editor, attrs, selectedCellPositions)) return;
}

export function setCellBackgroundColor(
  editor: Editor,
  color: string,
  selectedCellPositions?: number[] | null
) {
  applyTableAttrsToSelection(
    editor,
    { backgroundColor: color, borderMode: null },
    selectedCellPositions
  );
}

export function clearCellBackgroundColor(
  editor: Editor,
  selectedCellPositions?: number[] | null
) {
  applyTableAttrsToSelection(
    editor,
    { backgroundColor: null },
    selectedCellPositions
  );
}

export function setCellBorderTransparent(
  editor: Editor,
  selectedCellPositions?: number[] | null
) {
  applyTableAttrsToSelection(
    editor,
    { borderMode: "transparent" },
    selectedCellPositions
  );
}

export function setCellBorderNormal(
  editor: Editor,
  selectedCellPositions?: number[] | null
) {
  applyTableAttrsToSelection(
    editor,
    { borderMode: null },
    selectedCellPositions
  );
}

export function setCellBorderColor(
  editor: Editor,
  color: string,
  selectedCellPositions?: number[] | null
) {
  applyTableAttrsToSelection(
    editor,
    { borderColor: color, borderMode: null },
    selectedCellPositions
  );
}

export function clearCellBorderColor(
  editor: Editor,
  selectedCellPositions?: number[] | null
) {
  applyTableAttrsToSelection(
    editor,
    { borderColor: null },
    selectedCellPositions
  );
}

export function setCellBorderWidth(
  editor: Editor,
  width: number,
  selectedCellPositions?: number[] | null
) {
  const clamped = Math.max(1, Math.min(12, width));
  applyTableAttrsToSelection(
    editor,
    { borderWidth: String(clamped), borderMode: null },
    selectedCellPositions
  );
}

export function setCellAlign(
  editor: Editor,
  align: "left" | "center" | "right",
  selectedCellPositions?: number[] | null
) {
  applyTableAttrsToSelection(
    editor,
    { textAlign: align },
    selectedCellPositions
  );
}

export function setTableAlign(
  editor: Editor,
  align: "left" | "center" | "right"
) {
  if (!editor.isActive("table")) return;

  const { state, view } = editor;
  const { $from } = state.selection;

  let tablePos: number | null = null;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "table") {
      tablePos = $from.before(depth);
      break;
    }
  }

  if (tablePos === null) return;
  const tableNode = state.doc.nodeAt(tablePos);
  if (!tableNode) return;

  const tr = state.tr.setNodeMarkup(tablePos, undefined, {
    ...tableNode.attrs,
    align
  });
  view.dispatch(tr);

  const domAtPos = view.domAtPos(state.selection.from);
  const baseNode =
    domAtPos.node instanceof Element ? domAtPos.node : domAtPos.node.parentElement;
  const tableEl = baseNode?.closest("table");
  if (tableEl) {
    tableEl.setAttribute("data-align", align);
    if (align === "center") {
      tableEl.style.marginLeft = "auto";
      tableEl.style.marginRight = "auto";
    } else if (align === "right") {
      tableEl.style.marginLeft = "auto";
      tableEl.style.marginRight = "0";
    } else {
      tableEl.style.marginLeft = "0";
      tableEl.style.marginRight = "auto";
    }
  }
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
