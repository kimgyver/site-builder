import Paragraph from "@tiptap/extension-paragraph";

export const StyledParagraph = Paragraph.extend({
  addAttributes() {
    return {
      styleVariant: {
        default: "body",
        parseHTML: element => element.getAttribute("data-p-style") ?? "body",
        renderHTML: attributes => {
          const styleVariant = attributes.styleVariant as string;
          if (!styleVariant || styleVariant === "body") return {};
          return { "data-p-style": styleVariant };
        }
      },
      spacingPreset: {
        default: "normal",
        parseHTML: element =>
          element.getAttribute("data-p-spacing") ?? "normal",
        renderHTML: attributes => {
          const spacingPreset = attributes.spacingPreset as string;
          if (!spacingPreset || spacingPreset === "normal") return {};
          return { "data-p-spacing": spacingPreset };
        }
      }
    };
  }
});
