import type { Editor } from "@tiptap/core";

export type SlashMatch = {
  from: number;
  to: number;
  query: string;
};

export type SlashCommand = {
  id: string;
  label: string;
  keywords: string[];
};

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "paragraph",
    label: "Paragraph",
    keywords: ["p", "text", "body"]
  },
  {
    id: "heading2",
    label: "Heading 2",
    keywords: ["h2", "heading", "title"]
  },
  {
    id: "heading3",
    label: "Heading 3",
    keywords: ["h3", "heading", "subtitle"]
  },
  {
    id: "bullet-list",
    label: "Bullet list",
    keywords: ["list", "bullet", "ul"]
  },
  {
    id: "ordered-list",
    label: "Ordered list",
    keywords: ["list", "ordered", "ol", "number"]
  },
  {
    id: "blockquote",
    label: "Blockquote",
    keywords: ["quote", "blockquote"]
  },
  {
    id: "code-block",
    label: "Code block",
    keywords: ["code", "pre"]
  },
  {
    id: "horizontal-rule",
    label: "Divider",
    keywords: ["divider", "rule", "hr", "line"]
  },
  {
    id: "table",
    label: "Table (3x3)",
    keywords: ["table", "grid"]
  },
  {
    id: "image",
    label: "Image",
    keywords: ["image", "img", "photo"]
  }
];

export function executeSlashCommand(editor: Editor, commandId: string) {
  if (commandId === "paragraph") {
    editor.chain().focus().setParagraph().run();
    return;
  }
  if (commandId === "heading2") {
    editor.chain().focus().toggleHeading({ level: 2 }).run();
    return;
  }
  if (commandId === "heading3") {
    editor.chain().focus().toggleHeading({ level: 3 }).run();
    return;
  }
  if (commandId === "bullet-list") {
    editor.chain().focus().toggleBulletList().run();
    return;
  }
  if (commandId === "ordered-list") {
    editor.chain().focus().toggleOrderedList().run();
    return;
  }
  if (commandId === "blockquote") {
    editor.chain().focus().toggleBlockquote().run();
    return;
  }
  if (commandId === "code-block") {
    editor.chain().focus().toggleCodeBlock().run();
    return;
  }
  if (commandId === "horizontal-rule") {
    editor.chain().focus().setHorizontalRule().run();
    return;
  }
  if (commandId === "table") {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
    return;
  }
  if (commandId === "image") {
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
}

export function getSlashMatchFromEditor(
  editor: Editor | null
): SlashMatch | null {
  if (!editor) return null;

  const { selection } = editor.state;
  if (!selection.empty) return null;

  const { $from, from } = selection;
  if (!$from.parent.isTextblock) return null;

  const textBefore = $from.parent.textBetween(0, $from.parentOffset, "", "");
  const slashIndex = textBefore.lastIndexOf("/");
  if (slashIndex < 0) return null;

  if (slashIndex > 0) {
    const beforeSlash = textBefore[slashIndex - 1];
    if (!/\s/.test(beforeSlash)) return null;
  }

  const query = textBefore.slice(slashIndex + 1);
  if (/\s/.test(query)) return null;

  const start = from - (textBefore.length - slashIndex);
  return {
    from: start,
    to: from,
    query
  };
}
