export type SectionType =
  | "hero"
  | "text"
  | "rawHtml"
  | "image"
  | "faq"
  | "richText"
  | "embed"
  | "pageStyle"
  | "callout"
  | "accordion";

export interface EditableSection {
  id: string;
  type: SectionType;
  order: number;
  enabled: boolean;
  props: Record<string, unknown>;
}

export type SectionProps = Record<string, unknown>;

export type FaqItem = {
  question?: string;
  answer?: string;
};

export type RawSectionInput = Partial<EditableSection> & {
  props?: Record<string, unknown>;
};

export type IncomingRawSectionInput = {
  id?: unknown;
  type?: unknown;
  enabled?: unknown;
  props?: Record<string, unknown>;
};
