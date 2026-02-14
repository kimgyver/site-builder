import { Extension } from "@tiptap/core";
import { DOMParser as PMDOMParser } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";

export const WebPasteTables = Extension.create({
  name: "webPasteTables",
  addProseMirrorPlugins() {
    const editor = this.editor;

    const getPastedImageFile = (clipboard: DataTransfer) => {
      const fromFiles = Array.from(clipboard.files || []).find(file =>
        file.type.startsWith("image/")
      );
      if (fromFiles) return fromFiles;

      const fromItems = Array.from(clipboard.items || [])
        .filter(item => item.kind === "file" && item.type.startsWith("image/"))
        .map(item => item.getAsFile())
        .find((file): file is File => !!file);

      return fromItems ?? null;
    };

    const insertImageDataUrl = (dataUrl: string) => {
      editor
        .chain()
        .focus()
        .setImage({ src: dataUrl })
        .updateAttributes("image", {
          width: "100",
          widthPx: null,
          align: "center"
        })
        .run();
    };

    const removeUnsafeNodes = (doc: Document) => {
      doc
        .querySelectorAll("script,style,meta,noscript")
        .forEach(node => node.remove());
    };

    const buildTableFromTSV = (text: string): HTMLTableElement | null => {
      const normalized = String(text || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

      if (!/\t/.test(normalized)) return null;

      const lines = normalized
        .split("\n")
        .map(l => l.replace(/\s+$/g, ""))
        .filter(l => l.length > 0);
      if (!lines.length) return null;

      const rows = lines.map(line => line.split("\t"));
      const maxCells = Math.max(...rows.map(r => r.length));
      if (!Number.isFinite(maxCells) || maxCells < 1) return null;

      const table = document.createElement("table");
      const tbody = document.createElement("tbody");
      for (const row of rows) {
        const tr = document.createElement("tr");
        for (let i = 0; i < maxCells; i++) {
          const td = document.createElement("td");
          td.textContent = (row[i] ?? "").trim();
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      return table;
    };

    const insertTableElement = (table: HTMLElement) => {
      const wrapper = document.createElement("div");
      wrapper.appendChild(table);

      editor.chain().focus().clearNodes().run();

      const slice = PMDOMParser.fromSchema(editor.schema).parseSlice(wrapper, {
        preserveWhitespace: true
      });
      const tr = editor.state.tr.replaceSelection(slice).scrollIntoView();
      editor.view.dispatch(tr);
    };

    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const clipboard = event.clipboardData;
            if (!clipboard) return false;

            const imageFile = getPastedImageFile(clipboard);
            if (imageFile) {
              event.preventDefault();

              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result;
                if (typeof result !== "string") return;
                if (!result.startsWith("data:image/")) return;
                insertImageDataUrl(result);
              };
              reader.readAsDataURL(imageFile);
              return true;
            }

            const html = clipboard.getData("text/html");
            const text = clipboard.getData("text/plain");

            const hasTable = html ? /<table[\s>]/i.test(html) : false;
            const hasRow = html ? /<tr[\s>]/i.test(html) : false;

            let tableEl: HTMLTableElement | null = null;

            if (hasTable || hasRow) {
              try {
                const doc = new DOMParser().parseFromString(html, "text/html");
                removeUnsafeNodes(doc);

                const table = doc.querySelector("table");
                if (table) {
                  tableEl = table.cloneNode(true) as HTMLTableElement;
                } else if (hasRow) {
                  const rows = Array.from(doc.querySelectorAll("tr"));
                  if (rows.length) {
                    const built = doc.createElement("table");
                    const tbody = doc.createElement("tbody");
                    for (const row of rows) {
                      tbody.appendChild(row.cloneNode(true));
                    }
                    built.appendChild(tbody);
                    tableEl = built as HTMLTableElement;
                  }
                }

                if (tableEl) {
                  const directRows = Array.from(
                    tableEl.querySelectorAll(":scope > tr")
                  );
                  if (directRows.length) {
                    const tbody = document.createElement("tbody");
                    for (const row of directRows) tbody.appendChild(row);
                    tableEl.appendChild(tbody);
                  }
                }
              } catch {
                tableEl = null;
              }
            }

            if (!tableEl && text) {
              tableEl = buildTableFromTSV(text);
            }

            if (!tableEl) return false;

            try {
              insertTableElement(tableEl);
              event.preventDefault();
              return true;
            } catch {
              return false;
            }
          },
          handleDrop: (_view, event, _slice, moved) => {
            if (moved) return false;

            const transfer = event.dataTransfer;
            if (!transfer) return false;

            const imageFile = getPastedImageFile(transfer);
            if (!imageFile) return false;

            event.preventDefault();

            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result;
              if (typeof result !== "string") return;
              if (!result.startsWith("data:image/")) return;
              insertImageDataUrl(result);
            };
            reader.readAsDataURL(imageFile);
            return true;
          }
        }
      })
    ];
  }
});
