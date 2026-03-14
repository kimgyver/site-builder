import type { Editor as CoreEditor } from "@tiptap/core";

export function syncTableAlignmentInDom(activeEditor: CoreEditor) {
  activeEditor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "table") return;

    const domNode = activeEditor.view.nodeDOM(pos);
    const tableEl =
      domNode instanceof HTMLTableElement
        ? domNode
        : domNode instanceof HTMLElement
          ? domNode.querySelector("table")
          : null;

    if (!tableEl) return;

    const align = node.attrs.align as "left" | "center" | "right" | null;
    if (align !== "left" && align !== "center" && align !== "right") {
      tableEl.removeAttribute("data-align");
      tableEl.style.marginLeft = "";
      tableEl.style.marginRight = "";
      return;
    }

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
  });
}

export function getSelectedTableCellPositions(activeEditor: CoreEditor) {
  const selectionWithCells = activeEditor.state.selection as unknown as {
    forEachCell?: (
      fn: (node: { attrs: Record<string, unknown> }, pos: number) => void
    ) => void;
    $from?: {
      depth: number;
      node: (depth: number) => { type: { name: string } };
      before: (depth: number) => number;
    };
  };

  if (typeof selectionWithCells.forEachCell === "function") {
    const positions: number[] = [];
    selectionWithCells.forEachCell((_, pos) => {
      positions.push(pos);
    });
    if (positions.length) return positions;
  }

  const anchor = selectionWithCells.$from ?? activeEditor.state.selection.$from;
  for (let depth = anchor.depth; depth >= 0; depth -= 1) {
    const node = anchor.node(depth);
    if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
      return [anchor.before(depth)];
    }
  }

  return null;
}

export function normalizeColorToHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  const hexMatch = raw.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return `#${hex
        .split("")
        .map(ch => ch + ch)
        .join("")
        .toLowerCase()}`;
    }
    return `#${hex.toLowerCase()}`;
  }

  const rgbMatch = raw.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:\d*\.?\d+))?\s*\)$/i
  );
  if (!rgbMatch) return null;

  const [r, g, b] = rgbMatch.slice(1, 4).map(Number);
  if (
    !Number.isFinite(r) ||
    !Number.isFinite(g) ||
    !Number.isFinite(b) ||
    r < 0 ||
    r > 255 ||
    g < 0 ||
    g > 255 ||
    b < 0 ||
    b > 255
  ) {
    return null;
  }

  return `#${[r, g, b]
    .map(channel => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function detectTextPreset(activeEditor: CoreEditor): string {
  if (activeEditor.isActive("heading", { level: 1 })) return "heading1";
  if (activeEditor.isActive("heading", { level: 2 })) return "heading2";
  if (activeEditor.isActive("heading", { level: 3 })) return "heading3";
  if (activeEditor.isActive("heading", { level: 4 })) return "heading4";

  const textStyleAttrs = activeEditor.getAttributes("textStyle") as Record<
    string,
    unknown
  >;
  const activeFontSize = textStyleAttrs.fontSize;
  if (typeof activeFontSize === "string") {
    const parsed = Number.parseFloat(activeFontSize.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(parsed)) {
      if (parsed >= 36) return "title";
      if (parsed >= 24) return "subtitle";
    }
  }

  if (activeEditor.isActive("paragraph")) return "normal";
  return "normal";
}
