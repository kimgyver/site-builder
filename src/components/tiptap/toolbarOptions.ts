export const textPresetOptions = [
  { label: "Normal", value: "normal" },
  { label: "Title", value: "title" },
  { label: "Subtitle", value: "subtitle" },
  { label: "Heading 1", value: "heading1" },
  { label: "Heading 2", value: "heading2" },
  { label: "Heading 3", value: "heading3" },
  { label: "Heading 4", value: "heading4" }
] as const;

export const fontFamilyPresetOptions = [
  { label: "Default", value: "default" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: '"Trebuchet MS", sans-serif' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: '"Times New Roman", serif' },
  { label: "Courier New", value: '"Courier New", monospace' },
  { label: "Comic Sans MS", value: '"Comic Sans MS", cursive' },
  { label: "Impact", value: "Impact, Haettenschweiler, sans-serif" }
] as const;

export const fontSizePresetOptions = [
  12, 14, 16, 18, 20, 24, 28, 32, 40, 48
] as const;
