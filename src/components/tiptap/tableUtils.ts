import type { Editor } from "@tiptap/core";

export function updateCurrentTableCells(
  editor: Editor,
  attrs: Record<string, unknown>
) {
  if (!editor.isActive("table")) return false;

  const { state, view } = editor;
  const { from, to, $from } = state.selection;
  let tr = state.tr;
  let changed = false;
  const touched = new Set<number>();

  const applyCellRange = (rangeFrom: number, rangeTo: number) => {
    state.doc.nodesBetween(rangeFrom, rangeTo, (node, pos) => {
      if (node.type.name !== "tableCell" && node.type.name !== "tableHeader") {
        return;
      }
      if (touched.has(pos)) return;
      touched.add(pos);
      tr = tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        ...attrs
      });
      changed = true;
    });
  };

  let tablePos: number | null = null;
  let tableSize = 0;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== "table") continue;
    tablePos = $from.before(depth);
    tableSize = node.nodeSize;
    break;
  }

  if (tablePos !== null && tableSize > 0) {
    applyCellRange(tablePos + 1, tablePos + tableSize - 1);
  } else {
    applyCellRange(from, to);
  }

  if (!changed) return false;

  view.dispatch(tr);
  return true;
}
