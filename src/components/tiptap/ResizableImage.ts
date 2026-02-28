import Image from "@tiptap/extension-image";

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      inTable: {
        default: null,
        parseHTML: element => {
          const raw = element.getAttribute("data-in-table");
          if (raw === "true") return true;
          if (raw === "false") return false;
          return null;
        },
        renderHTML: attributes => {
          const raw = (attributes as Record<string, unknown>).inTable;
          const val = raw === true || raw === "true";
          return val ? { "data-in-table": "true" } : {};
        }
      },
      width: {
        default: null,
        parseHTML: element => {
          const attr = element.getAttribute("data-width");
          if (attr) return attr;

          const styleWidth = (element as HTMLElement).style?.width;
          if (!styleWidth) return null;
          const trimmed = String(styleWidth).trim();
          if (!trimmed.endsWith("%")) return null;
          const parsed = Number(trimmed.replace(/[^0-9.]/g, ""));
          if (!Number.isFinite(parsed)) return null;
          return String(Math.max(5, Math.min(100, parsed)));
        },
        renderHTML: attributes => {
          const widthRaw = attributes.width;
          const inTableRaw = (attributes as Record<string, unknown>).inTable;
          const inTable = inTableRaw === true || inTableRaw === "true";

          const parsed =
            widthRaw === null || widthRaw === undefined || widthRaw === ""
              ? NaN
              : Number(String(widthRaw).replace(/[^0-9.]/g, ""));
          const hasPercent = Number.isFinite(parsed);
          const percent = hasPercent
            ? Math.max(5, Math.min(100, parsed))
            : null;

          const widthPxRaw = (attributes as Record<string, unknown>).widthPx;
          const parsedPx =
            widthPxRaw === null || widthPxRaw === undefined || widthPxRaw === ""
              ? NaN
              : Number(String(widthPxRaw).replace(/[^0-9.]/g, ""));
          const hasPx = Number.isFinite(parsedPx);
          const px = hasPx ? Math.max(20, Math.min(4000, parsedPx)) : null;

          const attrs: Record<string, string> = {};
          if (percent !== null) attrs["data-width"] = String(percent);

          if (inTable && px !== null) {
            attrs.style = `width:${Math.round(px)}px;`;
          } else if (percent !== null) {
            attrs.style = `width:${percent}%;`;
          }

          return attrs;
        }
      },
      widthPx: {
        default: null,
        parseHTML: element => {
          const attr = element.getAttribute("data-width-px");
          if (attr) return attr;
          const styleWidth = (element as HTMLElement).style?.width;
          if (!styleWidth) return null;
          const trimmed = String(styleWidth).trim();
          if (!trimmed.endsWith("px")) return null;
          const parsed = Number(trimmed.replace(/[^0-9.]/g, ""));
          if (!Number.isFinite(parsed)) return null;
          return String(Math.max(20, Math.min(4000, parsed)));
        },
        renderHTML: attributes => {
          const raw = attributes.widthPx;
          if (raw === null || raw === undefined || raw === "") return {};
          const parsed = Number(String(raw).replace(/[^0-9.]/g, ""));
          if (!Number.isFinite(parsed)) return {};
          const clamped = Math.max(20, Math.min(4000, parsed));
          return {
            "data-width-px": String(Math.round(clamped))
          };
        }
      },
      align: {
        default: "center",
        parseHTML: element => element.getAttribute("data-align") || "center",
        renderHTML: attributes => {
          const align = String(attributes.align || "center");
          if (align === "left" || align === "right" || align === "center") {
            return { "data-align": align };
          }
          return { "data-align": "center" };
        }
      }
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      let currentNode = node;
      const wrapper = document.createElement("div");
      wrapper.className = "tiptap-image-wrapper";
      wrapper.setAttribute("data-type", "image");

      const img = document.createElement("img");
      img.draggable = false;

      const handle = document.createElement("div");
      handle.className = "tiptap-image-resize-handle";
      handle.title = "Drag to resize";

      const applyFromNode = () => {
        const attrs = currentNode.attrs as Record<string, unknown>;
        const src = typeof attrs.src === "string" ? attrs.src : "";
        const alt = typeof attrs.alt === "string" ? attrs.alt : "";
        const title = typeof attrs.title === "string" ? attrs.title : "";
        const widthRaw = attrs.width;
        const widthPxRaw = attrs.widthPx;
        const alignRaw =
          typeof attrs.align === "string" ? attrs.align : "center";

        img.src = src;
        img.alt = alt;
        if (title) img.title = title;
        img.loading = "eager";
        img.referrerPolicy = "no-referrer";
        img.decoding = "async";
        img.style.display = "block";
        img.setAttribute("data-align", alignRaw);
        img.style.width = "100%";
        img.style.height = "auto";

        wrapper.style.width = "";
        const parsedPx =
          widthPxRaw === null || widthPxRaw === undefined || widthPxRaw === ""
            ? NaN
            : Number(String(widthPxRaw).replace(/[^0-9.]/g, ""));

        const parsed =
          widthRaw === null || widthRaw === undefined || widthRaw === ""
            ? NaN
            : Number(String(widthRaw).replace(/[^0-9.]/g, ""));

        const hasPercent = Number.isFinite(parsed);
        const percent = hasPercent ? Math.max(5, Math.min(100, parsed)) : null;

        const hasPx = Number.isFinite(parsedPx);
        const px = hasPx ? Math.max(20, Math.min(4000, parsedPx)) : null;

        const inTable = !!wrapper.closest("td,th");
        if (inTable && px !== null) {
          wrapper.style.width = `${Math.round(px)}px`;
        } else if (percent !== null) {
          wrapper.style.width = `${percent}%`;
        } else if (px !== null) {
          wrapper.style.width = `${Math.round(px)}px`;
        }

        wrapper.style.display = "block";
        wrapper.style.position = "relative";
        wrapper.style.marginTop = "0.75rem";
        wrapper.style.marginBottom = "0.75rem";

        if (alignRaw === "left") {
          wrapper.style.marginLeft = "0";
          wrapper.style.marginRight = "auto";
        } else if (alignRaw === "right") {
          wrapper.style.marginLeft = "auto";
          wrapper.style.marginRight = "0";
        } else {
          wrapper.style.marginLeft = "auto";
          wrapper.style.marginRight = "auto";
        }
      };

      applyFromNode();
      wrapper.appendChild(img);
      wrapper.appendChild(handle);

      requestAnimationFrame(() => {
        try {
          if (wrapper.isConnected) {
            const domInTable = !!wrapper.closest("td,th");
            const attrs = currentNode.attrs as Record<string, unknown>;
            const nodeInTable =
              attrs.inTable === true || attrs.inTable === "true";
            if (nodeInTable !== domInTable) {
              const pos = typeof getPos === "function" ? getPos() : null;
              if (typeof pos === "number") {
                const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
                  ...attrs,
                  inTable: domInTable
                });
                tr.setMeta("addToHistory", false);
                tr.setMeta("imageMetaSync", true);
                editor.view.dispatch(tr);
              }
            }
          }
          applyFromNode();
        } catch {
          // ignore
        }
      });

      let cleanupDrag: (() => void) | null = null;

      const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const pos = typeof getPos === "function" ? getPos() : null;
        if (typeof pos === "number") {
          editor.chain().focus().setNodeSelection(pos).run();
        }

        const startX = e.clientX;
        const startRect = wrapper.getBoundingClientRect();
        const startWidthPx = startRect.width;

        const editorRect = editor.view.dom.getBoundingClientRect();
        const containerWidth = Math.max(1, editorRect.width);

        const onMove = (moveEv: MouseEvent) => {
          const dx = moveEv.clientX - startX;
          const nextPx = Math.max(20, startWidthPx + dx);
          const nextPct = Math.max(
            5,
            Math.min(100, (nextPx / containerWidth) * 100)
          );

          const posNow = typeof getPos === "function" ? getPos() : null;
          if (typeof posNow !== "number") return;

          const baseAttrs = currentNode.attrs as Record<string, unknown>;
          const domInTable = !!wrapper.closest("td,th");

          const tr = editor.state.tr.setNodeMarkup(posNow, undefined, {
            ...baseAttrs,
            width: String(Math.round(nextPct)),
            widthPx: String(Math.round(nextPx)),
            inTable: domInTable
          });
          tr.setMeta("imageResize", true);
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
        dom: wrapper,
        update: updatedNode => {
          if (updatedNode.type.name !== "image") return false;
          currentNode = updatedNode;
          applyFromNode();
          return true;
        },
        selectNode: () => {
          wrapper.classList.add("ProseMirror-selectednode");
        },
        deselectNode: () => {
          wrapper.classList.remove("ProseMirror-selectednode");
        },
        destroy: () => {
          handle.removeEventListener("mousedown", onMouseDown);
          if (cleanupDrag) cleanupDrag();
        }
      };
    };
  }
});
