import type { SectionType } from "@/types/sections";

export type SectionMeta = {
  type: SectionType;
  label: string;
  description?: string;
  icon?: string;
  /** keywords used for slash menu / quick search */
  keywords: string[];
  /** default props when creating a new section of this type */
  createDefaultProps: () => Record<string, unknown>;
  /** optional helper to convert from an existing props object */
  convertProps?: (from: Record<string, unknown>) => Record<string, unknown>;
};

export const SECTION_CATALOG: Record<SectionType, SectionMeta> = {
  hero: {
    type: "hero",
    label: "Hero",
    description: "Large hero with title and subtitle",
    icon: "⭐",
    keywords: ["hero", "headline", "banner"],
    createDefaultProps: () => ({
      title: "Hero title",
      subtitle: "Hero subtitle",
      backgroundColor: "#18181b",
      textColor: "#fafafa",
      subtitleColor: "#d4d4d8"
    }),
    convertProps: from => ({
      title: (from.title as string) ?? "Hero title",
      subtitle: (from.subtitle as string) ?? "Hero subtitle",
      backgroundColor: (from.backgroundColor as string) ?? "#18181b",
      textColor: (from.textColor as string) ?? "#fafafa",
      subtitleColor: (from.subtitleColor as string) ?? "#d4d4d8"
    })
  },
  text: {
    type: "text",
    label: "Text",
    description: "Simple rich text block",
    icon: "✏️",
    keywords: ["text", "paragraph", "rich"],
    createDefaultProps: () => ({ html: "<p>New text block</p>" }),
    convertProps: from => ({
      html: (from.html as string) ?? "<p>New text block</p>"
    })
  },
  richText: {
    type: "richText",
    label: "Rich Text",
    description: "Legacy rich text area",
    icon: "📝",
    keywords: ["rich", "legacy", "html"],
    createDefaultProps: () => ({ html: "<p>New text block</p>" }),
    convertProps: from => ({
      html: (from.html as string) ?? "<p>New text block</p>"
    })
  },
  image: {
    type: "image",
    label: "Image",
    description: "Standalone image block",
    icon: "🖼️",
    keywords: ["image", "photo", "picture"],
    createDefaultProps: () => ({
      url: "https://placehold.co/1200x600",
      alt: "Placeholder image"
    }),
    convertProps: from => ({
      url:
        (from.url as string) ??
        (from.src as string) ??
        "https://placehold.co/1200x600",
      alt: (from.alt as string) ?? "Placeholder image"
    })
  },
  faq: {
    type: "faq",
    label: "FAQ",
    description: "Frequently asked questions",
    icon: "❓",
    keywords: ["faq", "questions", "accordion"],
    createDefaultProps: () => ({
      title: "Frequently asked questions",
      items: [{ question: "Question", answer: "Answer" }]
    }),
    convertProps: from => ({
      title: (from.title as string) ?? "Frequently asked questions",
      items: (Array.isArray(from.items) ? from.items : undefined) ?? [
        { question: "Question", answer: "Answer" }
      ]
    })
  },
  embed: {
    type: "embed",
    label: "Embed",
    description: "YouTube, Maps, etc.",
    icon: "▶️",
    keywords: ["embed", "youtube", "map", "video"],
    createDefaultProps: () => ({
      provider: "youtube",
      url: "",
      title: ""
    }),
    convertProps: from => ({
      provider: (from.provider as string) ?? "youtube",
      url: (from.url as string) ?? "",
      title: (from.title as string) ?? ""
    })
  },
  pageStyle: {
    type: "pageStyle",
    label: "Page Style",
    description: "Background and layout styling",
    icon: "🎨",
    keywords: ["style", "background", "theme"],
    createDefaultProps: () => ({
      backgroundColor: "#f8fafc"
    }),
    convertProps: from => ({
      backgroundColor: (from.backgroundColor as string) ?? "#f8fafc"
    })
  },
  callout: {
    type: "callout",
    label: "Callout",
    description: "Highlight important information",
    icon: "📢",
    keywords: ["callout", "note", "info", "warning"],
    createDefaultProps: () => ({
      tone: "info",
      title: "Notice",
      body: "Add important note here."
    }),
    convertProps: from => ({
      tone: (from.tone as string) ?? "info",
      title: (from.title as string) ?? "Notice",
      body: (from.body as string) ?? "Add important note here."
    })
  },
  accordion: {
    type: "accordion",
    label: "Accordion",
    description: "Collapsible content list",
    icon: "📂",
    keywords: ["accordion", "toggle", "faq"],
    createDefaultProps: () => ({
      title: "Accordion",
      items: [{ question: "Accordion item", answer: "Accordion content" }]
    }),
    convertProps: from => ({
      title: (from.title as string) ?? "Accordion",
      items: (Array.isArray(from.items) ? from.items : undefined) ?? [
        { question: "Accordion item", answer: "Accordion content" }
      ]
    })
  }
};

export const SECTION_TYPES_IN_ORDER: SectionType[] = [
  "hero",
  "text",
  "image",
  "faq",
  "accordion",
  "callout",
  "embed",
  "pageStyle",
  "richText"
];
