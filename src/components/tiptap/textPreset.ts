import type { Editor } from "@tiptap/core";

type TextPreset =
  | "normal"
  | "title"
  | "subtitle"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4";

function toTextPreset(value: string): TextPreset {
  if (
    value === "normal" ||
    value === "title" ||
    value === "subtitle" ||
    value === "heading1" ||
    value === "heading2" ||
    value === "heading3" ||
    value === "heading4"
  ) {
    return value;
  }
  return "normal";
}

type PresetStateSetters = {
  setFontFamilyValue: (value: string) => void;
  setFontSizeValue: (value: string) => void;
  setTextColorValue: (value: string) => void;
  setTextPresetValue: (value: string) => void;
};

export function applyTextPresetToEditor(
  editor: Editor,
  preset: string,
  setters: PresetStateSetters
) {
  const resolvedPreset = toTextPreset(preset);
  const {
    setFontFamilyValue,
    setFontSizeValue,
    setTextColorValue,
    setTextPresetValue
  } = setters;

  if (resolvedPreset === "heading1") {
    editor
      .chain()
      .focus()
      .setHeading({ level: 1 })
      .unsetFontSize()
      .unsetFontFamily()
      .unsetColor()
      .run();
    setFontFamilyValue("default");
    setFontSizeValue("16");
    setTextColorValue("#111827");
    setTextPresetValue("heading1");
    return;
  }

  if (resolvedPreset === "heading2") {
    editor
      .chain()
      .focus()
      .setHeading({ level: 2 })
      .unsetFontSize()
      .unsetFontFamily()
      .unsetColor()
      .run();
    setFontFamilyValue("default");
    setFontSizeValue("16");
    setTextColorValue("#111827");
    setTextPresetValue("heading2");
    return;
  }

  if (resolvedPreset === "heading3") {
    editor
      .chain()
      .focus()
      .setHeading({ level: 3 })
      .unsetFontSize()
      .unsetFontFamily()
      .unsetColor()
      .run();
    setFontFamilyValue("default");
    setFontSizeValue("16");
    setTextColorValue("#111827");
    setTextPresetValue("heading3");
    return;
  }

  if (resolvedPreset === "heading4") {
    editor
      .chain()
      .focus()
      .setHeading({ level: 4 })
      .unsetFontSize()
      .unsetFontFamily()
      .unsetColor()
      .run();
    setFontFamilyValue("default");
    setFontSizeValue("16");
    setTextColorValue("#111827");
    setTextPresetValue("heading4");
    return;
  }

  if (resolvedPreset === "title") {
    editor
      .chain()
      .focus()
      .setParagraph()
      .setFontFamily('"Times New Roman", serif')
      .setFontSize("40px")
      .setColor("#111827")
      .run();
    setFontFamilyValue('"Times New Roman", serif');
    setFontSizeValue("40");
    setTextColorValue("#111827");
    setTextPresetValue("title");
    return;
  }

  if (resolvedPreset === "subtitle") {
    editor
      .chain()
      .focus()
      .setParagraph()
      .setFontFamily("Arial, Helvetica, sans-serif")
      .setFontSize("28px")
      .setColor("#52525b")
      .run();
    setFontFamilyValue("Arial, Helvetica, sans-serif");
    setFontSizeValue("28");
    setTextColorValue("#52525b");
    setTextPresetValue("subtitle");
    return;
  }

  editor
    .chain()
    .focus()
    .setParagraph()
    .unsetFontSize()
    .unsetFontFamily()
    .unsetColor()
    .run();
  setFontFamilyValue("default");
  setFontSizeValue("16");
  setTextColorValue("#111827");
  setTextPresetValue("normal");
}
