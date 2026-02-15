import type { Editor } from "@tiptap/core";

export function updateCurrentTableCells(
  editor: Editor,
  attrs: Record<string, unknown>,
  selectedCellPositions?: number[] | null
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

  const applyCellPositions = (positions: number[]) => {
    for (const pos of positions) {
      if (touched.has(pos)) continue;
      const node = state.doc.nodeAt(pos);
      if (!node) continue;
      if (node.type.name !== "tableCell" && node.type.name !== "tableHeader") {
        continue;
      }
      touched.add(pos);
      tr = tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        ...attrs
      });
      changed = true;
    }
  };

  if (
    Array.isArray(selectedCellPositions) &&
    selectedCellPositions.length > 0
  ) {
    applyCellPositions(selectedCellPositions);
  }

  // ProseMirror tables plugin uses a dedicated CellSelection for rectangle
  // selections. In that mode, iterate selected cells directly.
  const maybeCellSelection = state.selection as unknown as {
    forEachCell?: (
      fn: (node: { attrs: Record<string, unknown> }, pos: number) => void
    ) => void;
  };
  if (!changed && typeof maybeCellSelection.forEachCell === "function") {
    maybeCellSelection.forEachCell((node, pos) => {
      if (touched.has(pos)) return;
      touched.add(pos);
      tr = tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        ...attrs
      });
      changed = true;
    });
  }

  // Apply only to the current selection range.
  // - Single caret inside a cell => that cell
  // - Multi-cell/table selection => selected cells only
  if (!changed) {
    applyCellRange(from, to);
  }

  // Fallback for caret selections where `nodesBetween(from, to)` may not
  // include the containing table cell in some cases.
  if (!changed && from === to) {
    for (let depth = $from.depth; depth >= 0; depth -= 1) {
      const node = $from.node(depth);
      if (node.type.name !== "tableCell" && node.type.name !== "tableHeader") {
        continue;
      }

      const pos = $from.before(depth);
      tr = tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        ...attrs
      });
      changed = true;
      break;
    }
  }

  if (!changed) return false;

  tr.setMeta("tableAttrUpdate", true);
  view.dispatch(tr);
  return true;
}
