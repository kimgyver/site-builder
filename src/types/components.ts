import type { ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import type { EditableSection } from "@/types/sections";

export interface TiptapEditorProps {
  defaultValue?: string;
  defaultDoc?: JSONContent;
  placeholder?: string;
  onChangeHtml?: (html: string, doc: JSONContent) => void;
  className?: string;
  editorClassName?: string;
}

export interface RichTextEditorProps {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  onChangeHtml?: (html: string) => void;
}

export interface ConfirmSubmitButtonProps {
  message: string;
  className?: string;
  children: ReactNode;
}

export interface ToolbarButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}

export interface SectionBuilderProps {
  pageId: string;
  expectedUpdatedAt: string;
  initialSections: EditableSection[];
}
