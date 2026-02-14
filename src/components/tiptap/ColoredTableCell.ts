import { TableCell } from "@tiptap/extension-table";

export const ColoredTableCell = TableCell.extend({
  addAttributes() {
    const parentAttrs = this.parent?.() ?? {};
    const parentColwidth = (parentAttrs as Record<string, unknown>).colwidth as
      | {
          default?: unknown;
          parseHTML?: (element: HTMLElement) => unknown;
          renderHTML?: (
            attributes: Record<string, unknown>
          ) => Record<string, unknown>;
        }
      | undefined;

    return {
      ...parentAttrs,
      textAlign: {
        default: null,
        parseHTML: element => {
          const attr = element.getAttribute("data-align");
          if (attr === "left" || attr === "center" || attr === "right") {
            return attr;
          }
          const styleAlign = (element as HTMLElement).style?.textAlign;
          if (
            styleAlign === "left" ||
            styleAlign === "center" ||
            styleAlign === "right"
          ) {
            return styleAlign;
          }
          return null;
        },
        renderHTML: () => {
          return {};
        }
      },
      colwidth: {
        ...(parentColwidth ?? { default: null }),
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute("data-colwidth");
          if (raw) {
            const parts = raw
              .split(",")
              .map(p => Number(p.trim()))
              .filter(n => Number.isFinite(n) && n > 0);
            return parts.length ? parts : null;
          }

          const styleWidth = (element as HTMLElement).style?.width;
          if (styleWidth) {
            const trimmed = String(styleWidth).trim();
            if (trimmed.endsWith("px")) {
              const parsed = Number(trimmed.replace(/[^0-9.]/g, ""));
              if (Number.isFinite(parsed) && parsed > 0) {
                const clamped = Math.max(20, Math.min(4000, parsed));
                return [clamped];
              }
            }
          }

          if (parentColwidth?.parseHTML) {
            return parentColwidth.parseHTML(element);
          }
          return null;
        },
        renderHTML: attributes => {
          if (parentColwidth?.renderHTML) {
            return parentColwidth.renderHTML(
              attributes as Record<string, unknown>
            );
          }
          const value = (attributes as Record<string, unknown>).colwidth as
            | number[]
            | null
            | undefined;
          if (!Array.isArray(value) || !value.length) return {};
          return { "data-colwidth": value.join(",") };
        }
      },
      borderMode: {
        default: null,
        parseHTML: element => {
          const attr = element.getAttribute("data-border");
          if (attr === "transparent") return "transparent";
          return null;
        },
        renderHTML: () => {
          return {};
        }
      },
      borderColor: {
        default: null,
        parseHTML: element => {
          const attr = element.getAttribute("data-border-color");
          if (attr) return attr;
          const style = (element as HTMLElement).style?.borderColor;
          return style || null;
        },
        renderHTML: () => {
          return {};
        }
      },
      borderWidth: {
        default: null,
        parseHTML: element => {
          const attr = element.getAttribute("data-border-width");
          if (attr) return attr;
          const style = (element as HTMLElement).style?.borderWidth;
          if (!style) return null;
          const trimmed = String(style).trim();
          if (!trimmed.endsWith("px")) return null;
          const parsed = Number(trimmed.replace(/[^0-9.]/g, ""));
          if (!Number.isFinite(parsed)) return null;
          return String(Math.max(1, Math.min(12, parsed)));
        },
        renderHTML: () => {
          return {};
        }
      },
      backgroundColor: {
        default: null,
        parseHTML: element => {
          const attr = element.getAttribute("data-bg");
          if (attr) return attr;
          const style = (element as HTMLElement).style?.backgroundColor;
          return style || null;
        },
        renderHTML: () => {
          return {};
        }
      },
      heightPx: {
        default: null,
        parseHTML: element => {
          const attr = element.getAttribute("data-height-px");
          if (attr) return attr;
          const styleHeight = (element as HTMLElement).style?.height;
          if (!styleHeight) return null;
          const trimmed = String(styleHeight).trim();
          if (!trimmed.endsWith("px")) return null;
          const parsed = Number(trimmed.replace(/[^0-9.]/g, ""));
          if (!Number.isFinite(parsed)) return null;
          return String(Math.max(20, Math.min(800, parsed)));
        },
        renderHTML: attributes => {
          const bg = attributes.backgroundColor as string | null;
          const rawHeight = attributes.heightPx as string | null;
          const colwidth = attributes.colwidth as number[] | null;
          const align = attributes.textAlign as string | null;
          const borderMode = attributes.borderMode as string | null;
          const borderColor = attributes.borderColor as string | null;
          const rawBorderWidth = attributes.borderWidth as string | null;

          const styleParts: string[] = [];

          if (bg) {
            styleParts.push(`background-color:${String(bg)};`);
          }

          let heightNumber: number | null = null;
          if (
            rawHeight !== null &&
            rawHeight !== undefined &&
            rawHeight !== ""
          ) {
            const parsed = Number(String(rawHeight).replace(/[^0-9.]/g, ""));
            if (Number.isFinite(parsed)) {
              heightNumber = Math.max(20, Math.min(800, parsed));
              styleParts.push(`height:${Math.round(heightNumber)}px;`);
            }
          }

          if (Array.isArray(colwidth) && colwidth.length) {
            const first = Number(colwidth[0]);
            if (Number.isFinite(first) && first > 0) {
              styleParts.push(`width:${Math.round(first)}px;`);
            }
          }

          if (align === "left" || align === "center" || align === "right") {
            styleParts.push(`text-align:${align};`);
          }

          let borderWidthNumber: number | null = null;
          if (
            rawBorderWidth !== null &&
            rawBorderWidth !== undefined &&
            rawBorderWidth !== ""
          ) {
            const parsed = Number(
              String(rawBorderWidth).replace(/[^0-9.]/g, "")
            );
            if (Number.isFinite(parsed)) {
              borderWidthNumber = Math.max(1, Math.min(12, parsed));
              styleParts.push(
                `border-width:${Math.round(borderWidthNumber)}px;`
              );
              styleParts.push("border-style:solid;");
            }
          }

          if (borderColor) {
            styleParts.push(`border-color:${String(borderColor)};`);
            styleParts.push("border-style:solid;");
          }

          if (
            !styleParts.length &&
            !bg &&
            heightNumber === null &&
            !borderColor &&
            borderWidthNumber === null
          ) {
            return {};
          }

          const out: Record<string, string> = {};
          if (styleParts.length) {
            out.style = styleParts.join("");
          }
          if (bg) {
            out["data-bg"] = String(bg);
          }
          if (heightNumber !== null) {
            out["data-height-px"] = String(Math.round(heightNumber));
          }
          if (align === "left" || align === "center" || align === "right") {
            out["data-align"] = align;
          }
          if (borderColor) {
            out["data-border-color"] = String(borderColor);
          }
          if (borderWidthNumber !== null) {
            out["data-border-width"] = String(Math.round(borderWidthNumber));
          }
          if (borderMode === "transparent") {
            out["data-border"] = "transparent";
          }

          return out;
        }
      }
    };
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      let currentNode = node;

      const dom = document.createElement("td");
      const contentDOM = document.createElement("div");
      contentDOM.style.width = "100%";
      contentDOM.style.height = "100%";

      const handle = document.createElement("div");
      handle.className = "row-resize-handle";
      handle.title = "Drag to resize row height";

      dom.appendChild(contentDOM);
      dom.appendChild(handle);

      const applyFromNode = () => {
        const attrs = currentNode.attrs as Record<string, unknown> & {
          backgroundColor?: string | null;
          heightPx?: string | null;
          colspan?: number;
          rowspan?: number;
          colwidth?: number[] | null;
          textAlign?: string | null;
          borderMode?: string | null;
          borderColor?: string | null;
          borderWidth?: string | null;
        };

        dom.colSpan = attrs.colspan ?? 1;
        dom.rowSpan = attrs.rowspan ?? 1;
        if (Array.isArray(attrs.colwidth) && attrs.colwidth.length) {
          dom.setAttribute("data-colwidth", attrs.colwidth.join(","));
        } else {
          dom.removeAttribute("data-colwidth");
        }

        if (attrs.backgroundColor) {
          dom.style.backgroundColor = String(attrs.backgroundColor);
          dom.setAttribute("data-bg", String(attrs.backgroundColor));
        } else {
          dom.style.backgroundColor = "";
          dom.removeAttribute("data-bg");
        }

        const align = attrs.textAlign;
        if (align === "left" || align === "center" || align === "right") {
          dom.style.textAlign = align;
          dom.setAttribute("data-align", align);
        } else {
          dom.style.textAlign = "";
          dom.removeAttribute("data-align");
        }

        const borderMode = attrs.borderMode;
        if (borderMode === "transparent") {
          dom.setAttribute("data-border", "transparent");
        } else {
          dom.removeAttribute("data-border");
        }

        if (attrs.borderColor) {
          dom.style.borderColor = String(attrs.borderColor);
          dom.setAttribute("data-border-color", String(attrs.borderColor));
        } else {
          dom.style.borderColor = "";
          dom.removeAttribute("data-border-color");
        }

        const rawBorderWidth = attrs.borderWidth;
        const parsedBorderWidth =
          rawBorderWidth === null ||
          rawBorderWidth === undefined ||
          rawBorderWidth === ""
            ? NaN
            : Number(String(rawBorderWidth).replace(/[^0-9.]/g, ""));
        if (Number.isFinite(parsedBorderWidth)) {
          const clamped = Math.max(1, Math.min(12, parsedBorderWidth));
          dom.style.borderWidth = `${Math.round(clamped)}px`;
          dom.style.borderStyle = "solid";
          dom.setAttribute("data-border-width", String(Math.round(clamped)));
        } else {
          dom.style.borderWidth = "";
          dom.removeAttribute("data-border-width");
        }

        const rawHeight = attrs.heightPx;
        const parsed =
          rawHeight === null || rawHeight === undefined || rawHeight === ""
            ? NaN
            : Number(String(rawHeight).replace(/[^0-9.]/g, ""));
        if (Number.isFinite(parsed)) {
          const clamped = Math.max(20, Math.min(800, parsed));
          dom.style.height = `${Math.round(clamped)}px`;
          dom.setAttribute("data-height-px", String(Math.round(clamped)));
        } else {
          dom.style.height = "";
          dom.removeAttribute("data-height-px");
        }
      };

      applyFromNode();

      let cleanupDrag: (() => void) | null = null;

      const onMouseDown = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const pos = typeof getPos === "function" ? getPos() : null;
        if (typeof pos !== "number") return;

        editor.chain().focus().setNodeSelection(pos).run();

        const startY = event.clientY;
        const startRect = dom.getBoundingClientRect();
        const startHeight = startRect.height;

        const onMove = (moveEv: MouseEvent) => {
          const dy = moveEv.clientY - startY;
          const nextPx = Math.max(20, startHeight + dy);

          const posNow = typeof getPos === "function" ? getPos() : null;
          if (typeof posNow !== "number") return;

          const baseAttrs = currentNode.attrs as Record<string, unknown>;
          const tr = editor.state.tr.setNodeMarkup(posNow, undefined, {
            ...baseAttrs,
            heightPx: String(Math.round(nextPx))
          });
          tr.setMeta("rowResize", true);
          editor.view.dispatch(tr);
        };

        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          cleanupDrag = null;
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        cleanupDrag = onUp;
      };

      handle.addEventListener("mousedown", onMouseDown);

      return {
        dom,
        contentDOM,
        update: updatedNode => {
          if (updatedNode.type.name !== "tableCell") return false;
          currentNode = updatedNode;
          applyFromNode();
          return true;
        },
        destroy: () => {
          handle.removeEventListener("mousedown", onMouseDown);
          if (cleanupDrag) cleanupDrag();
        }
      };
    };
  }
});
