import { Table } from "@tiptap/extension-table";

export const AlignedTable = Table.extend({
  addAttributes() {
    const parentAttrs = this.parent?.() ?? {};

    return {
      ...parentAttrs,
      align: {
        default: null,
        parseHTML: element => {
          const attr = element.getAttribute("data-align");
          if (attr === "left" || attr === "center" || attr === "right") {
            return attr;
          }

          const style = (element as HTMLElement).style;
          const marginLeft = style?.marginLeft?.trim();
          const marginRight = style?.marginRight?.trim();

          if (marginLeft === "auto" && marginRight === "auto") {
            return "center";
          }
          if (marginLeft === "auto") {
            return "right";
          }
          if (marginRight === "auto") {
            return "left";
          }

          return null;
        },
        renderHTML: attributes => {
          const align = attributes.align as string | null;
          if (align === "left" || align === "center" || align === "right") {
            return { "data-align": align };
          }
          return {};
        }
      }
    };
  }
});
